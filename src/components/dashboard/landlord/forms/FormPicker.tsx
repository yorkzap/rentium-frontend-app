'use client';

/**
 * Pick a form to attach, or upload your own.
 *
 * Forms we know about but haven't shipped are shown greyed rather than hidden.
 * A landlord who can't find RTB-26 needs to know we know it exists and haven't
 * built it — that is a different message from an empty list, and it stops them
 * assuming Rentium can't do forms at all.
 *
 * An uploaded PDF is never attached straight away. The backend reads it and
 * proposes what it is for; a human confirms that before it can go on a lease,
 * because the answer decides whether an unsigned document holds up a tenancy.
 */

import { useEffect, useRef, useState } from 'react';
import {
  AlertCircle,
  Check,
  FileText,
  Loader2,
  Lock,
  Sparkles,
  Upload,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/contexts/AuthContext';
import {
  fetchFormCatalogue,
  updateFormTemplate,
  uploadFormTemplate,
} from '@/lib/leaseFormApi';
import type { FormStage, LeaseFormTemplate } from '@/types/leaseForm';

const STAGE_CHOICES: { value: FormStage; label: string; hint: string }[] = [
  {
    value: 'WITH_LEASE',
    label: 'Signed with the lease',
    hint: "The lease can't become active until it's signed.",
  },
  {
    value: 'ADDENDUM',
    label: 'Signed any time during the tenancy',
    hint: 'Tracked and chased, but never blocks anything.',
  },
  {
    value: 'MOVE_OUT',
    label: 'Signed to end the tenancy',
    hint: 'Like RTB-8 — completing it ends the tenancy on the agreed date.',
  },
];

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Called with the chosen template once it is ready to attach. */
  onPick: (template: LeaseFormTemplate) => void;
}

export default function FormPicker({ open, onOpenChange, onPick }: Props) {
  const { token } = useAuth();
  const [templates, setTemplates] = useState<LeaseFormTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  /** Set when an upload came back UNCLASSIFIED and needs a human answer. */
  const [needsPurpose, setNeedsPurpose] = useState<LeaseFormTemplate | null>(
    null
  );
  const [name, setName] = useState('');
  const picker = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!open || !token) return;
    setLoading(true);
    fetchFormCatalogue(token)
      .then(setTemplates)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [open, token]);

  async function handleUpload(file?: File | null) {
    if (!file || !token) return;
    setBusy(true);
    setError(null);
    try {
      const template = await uploadFormTemplate(token, file, { name });
      setTemplates((rows) => [
        template,
        ...rows.filter((r) => r.id !== template.id),
      ]);
      if (template.stage === 'UNCLASSIFIED') {
        setNeedsPurpose(template);
      } else {
        onPick(template);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'That upload failed.');
    } finally {
      setBusy(false);
      if (picker.current) picker.current.value = '';
    }
  }

  async function confirmPurpose(stage: FormStage) {
    if (!needsPurpose || !token) return;
    setBusy(true);
    try {
      const updated = await updateFormTemplate(token, needsPurpose.id, {
        stage,
      });
      setNeedsPurpose(null);
      setTemplates((rows) =>
        rows.map((r) => (r.id === updated.id ? updated : r))
      );
      onPick(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save that.');
    } finally {
      setBusy(false);
    }
  }

  // --- Second step: we read the file, now say what it's for -----------------
  if (needsPurpose) {
    const suggestion = needsPurpose.suggestion;
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>What is {needsPurpose.name} for?</DialogTitle>
            <DialogDescription>
              This decides how Rentium treats it — whether it holds up the
              lease, or ends a tenancy. Nothing is sent to anyone yet.
            </DialogDescription>
          </DialogHeader>

          {suggestion && (
            <div className="flex items-start gap-2 rounded-lg border border-teal-200 bg-teal-50 p-3 text-sm text-teal-900">
              <Sparkles className="mt-0.5 h-4 w-4 shrink-0" />
              <div>
                <p className="font-medium">
                  Reading the document, it looks like{' '}
                  {STAGE_CHOICES.find(
                    (c) => c.value === suggestion.stage
                  )?.label.toLowerCase()}
                  .
                </p>
                {suggestion.purpose && (
                  <p className="mt-1 text-teal-800">{suggestion.purpose}</p>
                )}
                {suggestion.signals.length > 0 && (
                  <p className="mt-1 text-xs text-teal-700">
                    Based on: {suggestion.signals.filter(Boolean).join(', ')}
                  </p>
                )}
              </div>
            </div>
          )}

          <div className="space-y-2">
            {STAGE_CHOICES.map((choice) => (
              <button
                key={choice.value}
                type="button"
                disabled={busy}
                onClick={() => confirmPurpose(choice.value)}
                className="flex w-full items-start gap-3 rounded-lg border p-3 text-left transition-colors hover:bg-[hsl(var(--surface-sunken))] disabled:opacity-50"
              >
                <div className="flex-1">
                  <p className="text-sm font-medium text-ink">{choice.label}</p>
                  <p className="mt-0.5 text-xs text-ink-4">{choice.hint}</p>
                </div>
                {suggestion?.stage === choice.value && (
                  <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-teal-600" />
                )}
              </button>
            ))}
          </div>

          {error && <ErrorLine message={error} />}
        </DialogContent>
      </Dialog>
    );
  }

  // --- First step: the catalogue -------------------------------------------
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Add a form to this lease</DialogTitle>
          <DialogDescription>
            Pick a standard form, or upload your own PDF and place the signature
            boxes yourself.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex justify-center py-10">
            <Loader2 className="h-5 w-5 animate-spin text-ink-4" />
          </div>
        ) : (
          <div className="space-y-2">
            <label className="flex cursor-pointer items-center gap-3 rounded-lg border-2 border-dashed p-4 transition-colors hover:bg-[hsl(var(--surface-sunken))]">
              {busy ? (
                <Loader2 className="h-5 w-5 animate-spin text-ink-4" />
              ) : (
                <Upload className="h-5 w-5 text-ink-4" />
              )}
              <div className="flex-1">
                <p className="text-sm font-medium text-ink">
                  Upload your own PDF
                </p>
                <p className="text-xs text-ink-4">
                  Rentium reads it, then asks what it&apos;s for.
                </p>
              </div>
              <input
                ref={picker}
                type="file"
                accept="application/pdf,.pdf"
                className="hidden"
                disabled={busy}
                onChange={(event) => handleUpload(event.target.files?.[0])}
              />
            </label>

            <div className="pt-1">
              <Label htmlFor="form-name" className="text-xs text-ink-4">
                Name for the uploaded form (optional)
              </Label>
              <Input
                id="form-name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="e.g. Pet Addendum"
                className="mt-1"
              />
            </div>

            <div className="pt-3">
              <p className="mb-2 text-xs font-medium uppercase tracking-wide text-ink-4">
                Standard forms
              </p>
              <div className="space-y-2">
                {templates.map((template) => (
                  <TemplateRow
                    key={template.id}
                    template={template}
                    onPick={() => {
                      if (template.stage === 'UNCLASSIFIED') {
                        setNeedsPurpose(template);
                        return;
                      }
                      onPick(template);
                    }}
                  />
                ))}
              </div>
            </div>
          </div>
        )}

        {error && <ErrorLine message={error} />}

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function TemplateRow({
  template,
  onPick,
}: {
  template: LeaseFormTemplate;
  onPick: () => void;
}) {
  const usable = template.available || template.stage === 'UNCLASSIFIED';
  return (
    <button
      type="button"
      disabled={!usable}
      onClick={onPick}
      className="flex w-full items-start gap-3 rounded-lg border p-3 text-left transition-colors enabled:hover:bg-[hsl(var(--surface-sunken))] disabled:cursor-not-allowed disabled:opacity-55"
    >
      {usable ? (
        <FileText className="mt-0.5 h-4 w-4 shrink-0 text-ink-4" />
      ) : (
        <Lock className="mt-0.5 h-4 w-4 shrink-0 text-ink-4" />
      )}
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-sm font-medium text-ink">{template.name}</p>
          {!template.available && (
            <span className="rounded-full bg-[hsl(var(--surface-sunken))] px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-ink-4">
              Coming soon
            </span>
          )}
          {template.jurisdiction && (
            <span className="text-[10px] uppercase tracking-wide text-ink-4">
              {template.jurisdiction}
            </span>
          )}
        </div>
        {template.purpose && (
          <p className="mt-1 line-clamp-2 text-xs text-ink-4">
            {template.purpose}
          </p>
        )}
        {template.available && template.placement_count === 0 && (
          <p className="mt-1 flex items-center gap-1 text-xs text-amber-700">
            <AlertCircle className="h-3 w-3" />
            No signature boxes placed yet
          </p>
        )}
      </div>
      {usable && <Check className="mt-0.5 h-4 w-4 shrink-0 text-ink-4" />}
    </button>
  );
}

function ErrorLine({ message }: { message: string }) {
  return (
    <p className="flex items-start gap-2 text-sm text-red-600">
      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
      {message}
    </p>
  );
}
