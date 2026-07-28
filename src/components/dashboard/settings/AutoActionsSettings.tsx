// AutoActionsSettings.tsx — the receipt drawer for anything RAMA did unasked.

'use client';

import { useCallback, useEffect, useState } from 'react';
import { Loader2, RotateCcw, Zap } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import {
  fetchRamaAutoActions,
  undoRamaAutoAction,
  type RamaAutoActionRow,
} from '@/lib/ramaApi';

/**
 * An unattended write the landlord cannot see is indistinguishable from a bug,
 * so everything RAMA does without asking lands here with an undo.
 *
 * Only a small, deliberately narrow set of tools can ever run this way — each
 * one has to declare an exact inverse before it is allowed into the tier. If
 * this list is empty, that is the expected state: autonomy is off until you
 * grant it, and it is never granted by omission.
 */
export default function AutoActionsSettings() {
  const { token } = useAuth();
  const [rows, setRows] = useState<RamaAutoActionRow[] | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!token) return;
    try {
      const body = await fetchRamaAutoActions(token);
      setRows(body.auto_actions);
    } catch {
      setRows([]);
    }
  }, [token]);

  useEffect(() => {
    load();
  }, [load]);

  const undo = async (row: RamaAutoActionRow) => {
    if (!token) return;
    setBusy(row.id);
    try {
      const result = await undoRamaAutoAction(token, row.id);
      if (result.error) throw new Error(result.error);
      toast.success('Undone.');
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't undo that.");
    } finally {
      setBusy(null);
    }
  };

  return (
    <section className="card p-6">
      <div className="mb-4 flex items-start gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[hsl(var(--brand)/0.12)] text-[hsl(var(--brand))]">
          <Zap className="h-5 w-5" />
        </span>
        <div>
          <h2 className="text-base font-semibold">Done automatically</h2>
          <p className="mt-0.5 text-sm text-[hsl(var(--ink-4))]">
            Everything RAMA did without stopping to ask. Only a handful of
            reversible actions can ever run this way, and each is undoable here.
            Grant or revoke the permission itself in your Constitution.
          </p>
        </div>
      </div>

      {rows === null && (
        <p className="flex items-center gap-2 text-sm text-[hsl(var(--ink-4))]">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading…
        </p>
      )}

      {rows !== null && rows.length === 0 && (
        <p className="rounded-xl border border-dashed border-[hsl(var(--line))] px-4 py-6 text-center text-sm text-[hsl(var(--ink-4))]">
          Nothing has run unattended. RAMA asks before every change until you
          say otherwise.
        </p>
      )}

      <ul className="space-y-2">
        {(rows ?? []).map((row) => (
          <li
            key={row.id}
            className="flex items-start justify-between gap-4 rounded-xl border border-[hsl(var(--line))] px-4 py-3"
          >
            <div className="min-w-0">
              <p className="text-sm font-medium">
                {row.tool.replace(/_/g, ' ')}
                {row.target ? ` — ${row.target}` : ''}
              </p>
              <p className="mt-1 text-xs text-[hsl(var(--ink-5))]">
                {new Date(row.created_at).toLocaleString()}
                {row.undone_at
                  ? ` · undone ${new Date(row.undone_at).toLocaleString()}`
                  : ''}
              </p>
            </div>
            {row.undoable && (
              <button
                type="button"
                onClick={() => undo(row)}
                disabled={busy === row.id}
                className="flex shrink-0 items-center gap-1.5 rounded-lg border border-[hsl(var(--line))] px-3 py-1.5 text-xs font-medium transition-colors hover:bg-[hsl(var(--surface-sunken))] disabled:opacity-50"
              >
                {busy === row.id ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <RotateCcw className="h-3.5 w-3.5" />
                )}
                Undo
              </button>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
