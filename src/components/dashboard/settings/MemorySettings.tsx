// MemorySettings.tsx — what RAMA durably remembers about how you work.

'use client';

import { useCallback, useEffect, useState } from 'react';
import { Brain, Loader2, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import {
  deleteRamaMemory,
  fetchRamaMemories,
  type RamaMemoryRow,
} from '@/lib/ramaApi';

/**
 * Memories are standing preferences — "always use Al's Plumbing", "I prefer
 * month-to-month". They are deliberately NOT portfolio facts: money, dates and
 * counts are refused at write time, because a memory is injected into every
 * prompt forever with no as-of date, and a stale number stated confidently is
 * worse than no number.
 *
 * Deletion here is genuine erasure, not a status flag.
 */
export default function MemorySettings() {
  const { token } = useAuth();
  const [rows, setRows] = useState<RamaMemoryRow[] | null>(null);
  const [query, setQuery] = useState('');
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(
    async (q: string) => {
      if (!token) return;
      try {
        const body = await fetchRamaMemories(token, q);
        setRows(body.memories);
      } catch {
        setRows([]);
      }
    },
    [token]
  );

  useEffect(() => {
    load('');
  }, [load]);

  const remove = async (row: RamaMemoryRow) => {
    if (!token) return;
    setBusy(row.id);
    try {
      await deleteRamaMemory(token, row.id);
      setRows((current) => (current ?? []).filter((r) => r.id !== row.id));
      toast.success(`Forgot "${row.subject}".`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't forget that.");
    } finally {
      setBusy(null);
    }
  };

  return (
    <section className="card p-6">
      <div className="mb-4 flex items-start gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[hsl(var(--brand)/0.12)] text-[hsl(var(--brand))]">
          <Brain className="h-5 w-5" />
        </span>
        <div>
          <h2 className="text-base font-semibold">What RAMA remembers</h2>
          <p className="mt-0.5 text-sm text-[hsl(var(--ink-4))]">
            Standing preferences it carries between conversations, so you
            don&apos;t repeat yourself. It never stores portfolio numbers here —
            those are read live from your books every time.
          </p>
        </div>
      </div>

      <input
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          load(e.target.value);
        }}
        placeholder="Search what it remembers…"
        className="field mb-4"
      />

      {rows === null && (
        <p className="flex items-center gap-2 text-sm text-[hsl(var(--ink-4))]">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading…
        </p>
      )}

      {rows !== null && rows.length === 0 && (
        <p className="rounded-xl border border-dashed border-[hsl(var(--line))] px-4 py-6 text-center text-sm text-[hsl(var(--ink-4))]">
          {query
            ? 'Nothing matches that.'
            : 'Nothing yet. Tell RAMA a preference in passing and it will offer to remember it.'}
        </p>
      )}

      <ul className="space-y-2">
        {(rows ?? []).map((row) => (
          <li
            key={row.id}
            className="flex items-start justify-between gap-4 rounded-xl border border-[hsl(var(--line))] px-4 py-3"
          >
            <div className="min-w-0">
              <p className="text-sm font-medium">{row.subject}</p>
              <p className="mt-0.5 text-sm text-[hsl(var(--ink-3))]">
                {row.fact}
              </p>
              <p className="mt-1 text-xs text-[hsl(var(--ink-5))]">
                {row.applies_to ? `${row.applies_to} · ` : ''}
                noted {row.recorded} · used {row.used}×
                {row.personal_data ? ' · contains personal data' : ''}
              </p>
            </div>
            <button
              type="button"
              onClick={() => remove(row)}
              disabled={busy === row.id}
              title="Forget this — erased, not hidden"
              className="shrink-0 rounded-lg p-2 text-[hsl(var(--ink-5))] transition-colors hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
            >
              {busy === row.id ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Trash2 className="h-4 w-4" />
              )}
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
