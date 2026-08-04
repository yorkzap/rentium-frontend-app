'use client';

/**
 * Drag signature, date and name boxes onto a blank form.
 *
 * Built on the `motion` package that's already a dependency (drag +
 * dragConstraints) rather than adding a DnD library, and on server-rendered
 * page images rather than pdf.js. That second choice is the load-bearing one:
 * the server rasterises each page at a known DPI, so a box at 24% across the
 * image is at 24% across the PDF, and the same fraction the landlord dropped is
 * the fraction the stamper uses. No coordinate translation, nothing to get out
 * of sync, and no PDF engine shipped to the browser.
 *
 * Everything is stored in page fractions (0..1, top-left origin) — see
 * leases/lease_forms.py for why that is the only representation that survives a
 * browser at an arbitrary zoom.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { motion } from 'motion/react';
import {
  AlertCircle,
  CalendarDays,
  Check,
  Loader2,
  PenLine,
  Plus,
  Trash2,
  Type,
  User,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useAuth } from '@/contexts/AuthContext';
import {
  fetchPrefillSources,
  fetchTemplatePageImage,
  fetchTemplatePlacements,
  saveTemplatePlacements,
} from '@/lib/leaseFormApi';
import type {
  FormFieldKind,
  FormPlacement,
  LeaseFormTemplate,
  SignerRole,
} from '@/types/leaseForm';

/** Default box size as a fraction of the page — roughly a signature line. */
const DEFAULT_SIZE: Record<FormFieldKind, { width: number; height: number }> = {
  SIGNATURE: { width: 0.24, height: 0.04 },
  INITIALS: { width: 0.08, height: 0.035 },
  DATE: { width: 0.16, height: 0.03 },
  NAME: { width: 0.28, height: 0.03 },
  TEXT: { width: 0.28, height: 0.03 },
  CHECKBOX: { width: 0.03, height: 0.025 },
};

const KIND_ICON: Record<FormFieldKind, typeof PenLine> = {
  SIGNATURE: PenLine,
  INITIALS: PenLine,
  DATE: CalendarDays,
  NAME: User,
  TEXT: Type,
  CHECKBOX: Check,
};

const KINDS: FormFieldKind[] = [
  'SIGNATURE',
  'INITIALS',
  'DATE',
  'NAME',
  'TEXT',
  'CHECKBOX',
];

const ROLES: { value: SignerRole; label: string }[] = [
  { value: 'LANDLORD', label: 'Landlord' },
  { value: 'CO_LANDLORD', label: 'Co-landlord' },
  { value: 'TENANT', label: 'Tenant' },
  { value: 'OTHER', label: 'Other party' },
];

const ROLE_TINT: Record<SignerRole, string> = {
  LANDLORD: 'border-teal-500 bg-teal-400/15',
  CO_LANDLORD: 'border-sky-500 bg-sky-400/15',
  TENANT: 'border-violet-500 bg-violet-400/15',
  OTHER: 'border-amber-500 bg-amber-400/15',
};

interface Props {
  template: LeaseFormTemplate;
  onSaved?: (count: number) => void;
}

export default function FormFieldPlacer({ template, onSaved }: Props) {
  const { token } = useAuth();
  const [placements, setPlacements] = useState<FormPlacement[]>([]);
  const [sources, setSources] = useState<string[]>([]);
  const [page, setPage] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    setLoading(true);
    Promise.all([
      fetchTemplatePlacements(token, template.id),
      fetchPrefillSources(token).catch(() => []),
    ])
      .then(([rows, prefills]) => {
        setPlacements(rows);
        setSources(prefills);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [token, template.id]);

  const update = useCallback((key: string, patch: Partial<FormPlacement>) => {
    setPlacements((rows) =>
      rows.map((row) => (row.key === key ? { ...row, ...patch } : row))
    );
    setDirty(true);
  }, []);

  function addField(kind: FormFieldKind) {
    const size = DEFAULT_SIZE[kind];
    // A unique-enough key that reads as itself in the stamped output and in
    // the audit trail, rather than a uuid nobody can trace back to a box.
    const key = `${kind.toLowerCase()}_${Date.now().toString(36)}`;
    const field: FormPlacement = {
      key,
      label: kind[0] + kind.slice(1).toLowerCase(),
      page,
      x: 0.1,
      y: 0.1,
      ...size,
      kind,
      signer_role: 'TENANT',
      signer_index: 0,
      auto_source: '',
      required: kind === 'SIGNATURE' || kind === 'DATE',
      font_size: 10,
      order: placements.length,
    };
    setPlacements((rows) => [...rows, field]);
    setSelected(key);
    setDirty(true);
  }

  function removeField(key: string) {
    setPlacements((rows) => rows.filter((row) => row.key !== key));
    if (selected === key) setSelected(null);
    setDirty(true);
  }

  async function save() {
    if (!token) return;
    setSaving(true);
    setError(null);
    try {
      const result = await saveTemplatePlacements(
        token,
        template.id,
        placements
      );
      setDirty(false);
      onSaved?.(result.placements);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Could not save the fields.'
      );
    } finally {
      setSaving(false);
    }
  }

  const onThisPage = placements.filter((row) => row.page === page);
  const active = placements.find((row) => row.key === selected) ?? null;

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-ink-4" />
      </div>
    );
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_260px]">
      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          {KINDS.map((kind) => {
            const Icon = KIND_ICON[kind];
            return (
              <Button
                key={kind}
                type="button"
                variant="outline"
                size="sm"
                onClick={() => addField(kind)}
              >
                <Icon className="mr-1.5 h-3.5 w-3.5" />
                {kind[0] + kind.slice(1).toLowerCase()}
              </Button>
            );
          })}
          <span className="text-xs text-ink-4">
            <Plus className="mr-1 inline h-3 w-3" />
            adds to page {page + 1}; drag to position
          </span>
        </div>

        <PageCanvas
          templateId={template.id}
          page={page}
          fields={onThisPage}
          selected={selected}
          onSelect={setSelected}
          onMove={update}
        />

        {template.page_count > 1 && (
          <div className="flex flex-wrap gap-1">
            {Array.from({ length: template.page_count }, (_, index) => (
              <Button
                key={index}
                type="button"
                size="sm"
                variant={index === page ? 'default' : 'outline'}
                onClick={() => setPage(index)}
              >
                {index + 1}
              </Button>
            ))}
          </div>
        )}
      </div>

      <aside className="space-y-4">
        {active ? (
          <FieldSettings
            field={active}
            sources={sources}
            onChange={(patch) => update(active.key, patch)}
            onRemove={() => removeField(active.key)}
          />
        ) : (
          <p className="rounded-lg border border-dashed p-4 text-sm text-ink-4">
            Add a field, or click one on the page to change who signs it.
          </p>
        )}

        {error && (
          <p className="flex items-start gap-2 text-sm text-red-600">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            {error}
          </p>
        )}

        <Button onClick={save} disabled={saving || !dirty} className="w-full">
          {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {dirty ? 'Save field layout' : 'Saved'}
        </Button>
        <p className="text-xs text-ink-4">
          Saved fields apply to every lease that uses this form from now on.
          Forms already attached to a lease keep the layout they were attached
          with.
        </p>
      </aside>
    </div>
  );
}

function PageCanvas({
  templateId,
  page,
  fields,
  selected,
  onSelect,
  onMove,
}: {
  templateId: string;
  page: number;
  fields: FormPlacement[];
  selected: string | null;
  onSelect: (key: string) => void;
  onMove: (key: string, patch: Partial<FormPlacement>) => void;
}) {
  const { token } = useAuth();
  const [src, setSrc] = useState<string | null>(null);
  const frame = useRef<HTMLDivElement | null>(null);
  const objectUrl = useRef<string | null>(null);

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    fetchTemplatePageImage(token, templateId, page)
      .then((url) => {
        if (cancelled) {
          URL.revokeObjectURL(url);
          return;
        }
        objectUrl.current = url;
        setSrc(url);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
      if (objectUrl.current) URL.revokeObjectURL(objectUrl.current);
    };
  }, [token, templateId, page]);

  if (!src) {
    return (
      <div className="flex h-96 items-center justify-center rounded-lg border bg-[hsl(var(--surface-sunken))]">
        <Loader2 className="h-5 w-5 animate-spin text-ink-4" />
      </div>
    );
  }

  return (
    <div
      ref={frame}
      className="relative overflow-hidden rounded-lg border bg-white"
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={`Page ${page + 1}`}
        className="block w-full select-none"
      />
      {fields.map((field) => {
        const Icon = KIND_ICON[field.kind];
        return (
          <motion.div
            key={field.key}
            drag
            dragMomentum={false}
            dragElastic={0}
            dragConstraints={frame}
            onPointerDown={() => onSelect(field.key)}
            onDragEnd={(_, info) => {
              const box = frame.current?.getBoundingClientRect();
              if (!box) return;
              // Convert the pixel delta straight back into page fractions, and
              // clamp so a box can never be dropped off the page.
              const nextX = field.x + info.offset.x / box.width;
              const nextY = field.y + info.offset.y / box.height;
              onMove(field.key, {
                x: Math.min(Math.max(nextX, 0), 1 - field.width),
                y: Math.min(Math.max(nextY, 0), 1 - field.height),
              });
            }}
            className={`absolute flex cursor-grab items-center justify-center gap-1 rounded-sm border-2 text-[10px] font-medium active:cursor-grabbing ${
              ROLE_TINT[field.signer_role]
            } ${selected === field.key ? 'ring-2 ring-ink ring-offset-1' : ''}`}
            style={{
              left: `${field.x * 100}%`,
              top: `${field.y * 100}%`,
              width: `${field.width * 100}%`,
              height: `${field.height * 100}%`,
            }}
          >
            <Icon className="h-3 w-3 shrink-0" />
            <span className="truncate px-0.5">
              {field.signer_role === 'TENANT' ? 'T' : 'L'}
              {field.signer_index + 1}
            </span>
          </motion.div>
        );
      })}
    </div>
  );
}

function FieldSettings({
  field,
  sources,
  onChange,
  onRemove,
}: {
  field: FormPlacement;
  sources: string[];
  onChange: (patch: Partial<FormPlacement>) => void;
  onRemove: () => void;
}) {
  const signable = field.kind === 'SIGNATURE' || field.kind === 'INITIALS';
  return (
    <div className="space-y-3 rounded-lg border p-3">
      <div>
        <Label className="text-xs">Field type</Label>
        <Select
          value={field.kind}
          onValueChange={(value) => onChange({ kind: value as FormFieldKind })}
        >
          <SelectTrigger className="mt-1">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {KINDS.map((kind) => (
              <SelectItem key={kind} value={kind}>
                {kind[0] + kind.slice(1).toLowerCase()}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label className="text-xs">Who fills it</Label>
        <Select
          value={field.signer_role}
          onValueChange={(value) =>
            onChange({ signer_role: value as SignerRole })
          }
        >
          <SelectTrigger className="mt-1">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {ROLES.map((role) => (
              <SelectItem key={role.value} value={role.value}>
                {role.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label className="text-xs">Which one</Label>
        <Select
          value={String(field.signer_index)}
          onValueChange={(value) => onChange({ signer_index: Number(value) })}
        >
          <SelectTrigger className="mt-1">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {[0, 1, 2, 3].map((index) => (
              <SelectItem key={index} value={String(index)}>
                #{index + 1}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="mt-1 text-xs text-ink-4">
          You can place a box for a second tenant before anyone is invited — the
          person is attached when you send the form.
        </p>
      </div>

      {!signable && (
        <div>
          <Label className="text-xs">Fill automatically from</Label>
          <Select
            value={field.auto_source || 'none'}
            onValueChange={(value) =>
              onChange({ auto_source: value === 'none' ? '' : value })
            }
          >
            <SelectTrigger className="mt-1">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Leave blank / type it in</SelectItem>
              {sources.map((source) => (
                <SelectItem key={source} value={source}>
                  {source}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={field.required}
          onChange={(event) => onChange({ required: event.target.checked })}
        />
        Required
        {signable && (
          <span className="text-xs text-ink-4">
            (the form isn&apos;t finished until this is signed)
          </span>
        )}
      </label>

      <Button variant="ghost" size="sm" onClick={onRemove} className="w-full">
        <Trash2 className="mr-1.5 h-3.5 w-3.5" />
        Remove this field
      </Button>
    </div>
  );
}
