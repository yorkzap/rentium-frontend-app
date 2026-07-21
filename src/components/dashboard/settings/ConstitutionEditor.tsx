// ConstitutionEditor.tsx
//
// The landlord's written policy — what the RAMA General reads verbatim and
// treats as authoritative. Every save creates a NEW version (append-only);
// the structured rules the sentinels enforce are shown read-only here (they
// are managed in chat with the General, always with a confirmation).

'use client';

import { useCallback, useEffect, useState } from 'react';
import { BookOpenCheck, Loader2, Save } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import {
  amendConstitution,
  fetchConstitution,
  type Constitution,
} from '@/lib/ramaApi';
import { Skeleton } from '@/components/ui/page';

const SUGGESTED_SECTIONS = [
  { key: 'balances', title: 'Balances' },
  { key: 'vendors', title: 'Vendors' },
  { key: 'tenant-policies', title: 'Tenant policies' },
  { key: 'workflows', title: 'Workflows' },
];

export default function ConstitutionEditor() {
  const { token } = useAuth();
  const [data, setData] = useState<Constitution | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    if (!token) return;
    try {
      setData(await fetchConstitution(token));
    } catch {
      setData({ sections: [], rules: [] });
    }
  }, [token]);

  useEffect(() => {
    load();
  }, [load]);

  if (!data) {
    return <Skeleton className="h-64 w-full rounded-xl" />;
  }

  const byKey = new Map(data.sections.map((s) => [s.key, s]));
  const keys = [
    ...SUGGESTED_SECTIONS,
    ...data.sections
      .filter((s) => !SUGGESTED_SECTIONS.some((x) => x.key === s.key))
      .map((s) => ({ key: s.key, title: s.title })),
  ];

  const startEdit = (key: string) => {
    setEditing(key);
    setDraft(byKey.get(key)?.body_md ?? '');
  };

  const save = async (key: string, title: string) => {
    if (!token) return;
    setSaving(true);
    try {
      const next = await amendConstitution(token, {
        key,
        title: byKey.get(key)?.title || title,
        body_md: draft,
      });
      setData(next);
      setEditing(null);
      toast.success('Saved as a new version.');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't save.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="card p-5">
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[hsl(var(--brand)/0.12)] text-[hsl(var(--brand))]">
            <BookOpenCheck className="h-5 w-5" />
          </span>
          <div>
            <h2 className="text-base font-semibold">Your Constitution</h2>
            <p className="mt-0.5 text-sm text-[hsl(var(--ink-4))]">
              Written policy the General follows and the watchers enforce. Every
              save keeps the old version in history. You can also amend it by
              talking to the General — it will always ask before changing
              anything.
            </p>
          </div>
        </div>
      </div>

      {keys.map(({ key, title }) => {
        const section = byKey.get(key);
        const isEditing = editing === key;
        return (
          <section key={key} className="card p-5">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">
                {section?.title || title}
                {section && (
                  <span className="ml-2 text-xs font-normal text-[hsl(var(--ink-4))]">
                    v{section.version} ·{' '}
                    {section.origin === 'LANDLORD' ? 'you' : 'General'}
                  </span>
                )}
              </h3>
              {!isEditing && (
                <button
                  type="button"
                  onClick={() => startEdit(key)}
                  className="text-sm font-medium text-[hsl(var(--brand))] hover:underline"
                >
                  {section ? 'Edit' : 'Write'}
                </button>
              )}
            </div>
            {isEditing ? (
              <div className="mt-3">
                <textarea
                  rows={6}
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  placeholder={`e.g. "Keep $5,000 minimum in the Wascana account."`}
                  className="field w-full resize-y font-mono text-sm"
                />
                <div className="mt-2 flex gap-2">
                  <button
                    type="button"
                    onClick={() => save(key, title)}
                    disabled={saving}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-[hsl(var(--brand))] px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50"
                  >
                    {saving ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Save className="h-3.5 w-3.5" />
                    )}
                    Save new version
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditing(null)}
                    disabled={saving}
                    className="rounded-lg px-3 py-1.5 text-sm text-[hsl(var(--ink-3))] hover:bg-[hsl(var(--surface-sunken))]"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <p className="mt-2 whitespace-pre-wrap text-sm text-[hsl(var(--ink-2))]">
                {section?.body_md || (
                  <span className="text-[hsl(var(--ink-4))]">
                    Nothing written yet.
                  </span>
                )}
              </p>
            )}
          </section>
        );
      })}

      {data.rules.length > 0 && (
        <section className="card p-5">
          <h3 className="font-semibold">Enforced rules</h3>
          <p className="mt-0.5 text-xs text-[hsl(var(--ink-4))]">
            Watched automatically. Change them by asking the General.
          </p>
          <ul className="mt-2 space-y-1">
            {data.rules.map((r) => (
              <li
                key={r.id}
                className="font-mono text-xs text-[hsl(var(--ink-2))]"
              >
                {r.rule_type}: {JSON.stringify(r.params)}
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
