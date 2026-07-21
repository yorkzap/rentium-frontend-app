// RamaInsights.tsx
//
// What the Sergeants found and the FSA made of it, plus the bank balances
// that feed the min-balance/surplus watchers. Facts come from Python
// (Sergeants); the recommendation text comes from a bounded FSA turn
// grounded in those facts — this page is read + acknowledge, not a chat.

'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  AlertTriangle,
  Building2,
  Check,
  Info,
  Loader2,
  Plus,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import { EmptyState, PageHeader, Pill, Skeleton } from '@/components/ui/page';
import {
  fetchBankBalances,
  fetchHoldings,
  fetchInsights,
  setBankBalance,
  updateInsightStatus,
  type BankBalanceRow,
  type Holding,
  type RamaInsightRow,
} from '@/lib/ramaApi';

const SEVERITY_TONE = {
  URGENT: 'danger',
  WARN: 'warn',
  INFO: 'info',
} as const;

const KIND_LABEL: Record<string, string> = {
  'rama.sentinel.min_balance': 'Balance',
  'rama.sentinel.deposit_deadline': 'Deposit deadline',
  'rama.sentinel.late_pattern': 'Payment pattern',
  'rama.sentinel.expense_anomaly': 'Expense anomaly',
  'rama.sentinel.surplus': 'Cash surplus',
};

function InsightsList() {
  const { token } = useAuth();
  const [insights, setInsights] = useState<RamaInsightRow[] | null>(null);
  const [showResolved, setShowResolved] = useState(false);

  const load = useCallback(async () => {
    if (!token) return;
    try {
      const { insights } = await fetchInsights(
        token,
        showResolved ? undefined : 'OPEN'
      );
      setInsights(insights);
    } catch {
      setInsights([]);
    }
  }, [token, showResolved]);

  useEffect(() => {
    load();
  }, [load]);

  const act = async (row: RamaInsightRow, status: string) => {
    if (!token) return;
    try {
      await updateInsightStatus(token, row.id, status);
      setInsights((prev) => (prev ?? []).filter((i) => i.id !== row.id));
      toast.success(status === 'DISMISSED' ? 'Dismissed.' : 'Acknowledged.');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't update.");
    }
  };

  if (!insights) return <Skeleton className="h-40 w-full rounded-xl" />;

  return (
    <section>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="font-semibold">Insights</h2>
        <button
          type="button"
          onClick={() => setShowResolved((v) => !v)}
          className="text-xs font-medium text-[hsl(var(--brand))] hover:underline"
        >
          {showResolved ? 'Show open only' : 'Show all'}
        </button>
      </div>
      {insights.length === 0 ? (
        <EmptyState
          icon={Info}
          title="Nothing flagged"
          description="Your Sergeants (min balances, deposit deadlines, payment patterns, expense anomalies, surplus) run daily and report here."
        />
      ) : (
        <ul className="space-y-3">
          {insights.map((row) => (
            <li key={row.id} className="card p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <Pill tone={SEVERITY_TONE[row.severity]}>
                      {row.severity}
                    </Pill>
                    <span className="text-xs text-[hsl(var(--ink-4))]">
                      {KIND_LABEL[row.kind] || row.kind}
                    </span>
                  </div>
                  <p className="mt-1.5 whitespace-pre-wrap text-sm">
                    {row.analysis}
                  </p>
                </div>
                {row.status === 'OPEN' && (
                  <div className="flex shrink-0 gap-1">
                    <button
                      type="button"
                      onClick={() => act(row, 'ACKED')}
                      title="Acknowledge"
                      className="rounded-lg p-1.5 text-[hsl(var(--ink-4))] hover:bg-[hsl(var(--surface-sunken))] hover:text-[hsl(var(--ok-ink))]"
                    >
                      <Check className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => act(row, 'DISMISSED')}
                      title="Dismiss"
                      className="rounded-lg p-1.5 text-[hsl(var(--ink-4))] hover:bg-[hsl(var(--surface-sunken))] hover:text-red-600"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                )}
                {row.status !== 'OPEN' && (
                  <Pill tone="neutral">{row.status.toLowerCase()}</Pill>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function BalancesCard() {
  const { token } = useAuth();
  const [balances, setBalances] = useState<BankBalanceRow[] | null>(null);
  const [holdings, setHoldings] = useState<Holding[]>([]);
  const [adding, setAdding] = useState(false);
  const [holdingId, setHoldingId] = useState('');
  const [amount, setAmount] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    if (!token) return;
    try {
      const [b, h] = await Promise.all([
        fetchBankBalances(token),
        fetchHoldings(token),
      ]);
      setBalances(b.balances);
      setHoldings(h.holdings);
    } catch {
      setBalances([]);
    }
  }, [token]);

  useEffect(() => {
    load();
  }, [load]);

  const save = async () => {
    if (!token || !amount.trim()) return;
    setSaving(true);
    try {
      await setBankBalance(token, {
        holding_id: holdingId || undefined,
        balance: amount.trim(),
      });
      setAmount('');
      setAdding(false);
      await load();
      toast.success('Balance recorded.');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't save.");
    } finally {
      setSaving(false);
    }
  };

  if (!balances) return <Skeleton className="h-32 w-full rounded-xl" />;

  return (
    <section className="card p-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Building2 className="h-4 w-4 text-[hsl(var(--ink-4))]" />
          <h2 className="font-semibold">Bank balances</h2>
        </div>
        {!adding && (
          <button
            type="button"
            onClick={() => setAdding(true)}
            className="inline-flex items-center gap-1 text-sm font-medium text-[hsl(var(--brand))] hover:underline"
          >
            <Plus className="h-3.5 w-3.5" />
            Record balance
          </button>
        )}
      </div>
      <p className="mt-1 text-xs text-[hsl(var(--ink-4))]">
        What you report — not a live bank feed. Set a per-house minimum in your
        Constitution and the Sergeants will flag it if this drifts below.
      </p>

      {adding && (
        <div className="mt-3 flex flex-wrap items-end gap-2 rounded-lg bg-[hsl(var(--surface-sunken))] p-3">
          <div>
            <label className="text-xs font-medium">House</label>
            <select
              value={holdingId}
              onChange={(e) => setHoldingId(e.target.value)}
              className="field mt-1"
            >
              <option value="">Portfolio-wide</option>
              {holdings.map((h) => (
                <option key={h.id} value={h.id}>
                  {h.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs font-medium">Balance</label>
            <input
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="5230.00"
              className="field mt-1 w-32"
            />
          </div>
          <button
            type="button"
            onClick={save}
            disabled={saving}
            className="rounded-lg bg-[hsl(var(--brand))] px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
          >
            {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Save'}
          </button>
          <button
            type="button"
            onClick={() => setAdding(false)}
            className="rounded-lg px-3 py-2 text-sm text-[hsl(var(--ink-3))]"
          >
            Cancel
          </button>
        </div>
      )}

      {balances.length === 0 ? (
        <p className="mt-3 text-sm text-[hsl(var(--ink-4))]">
          No balances recorded yet.
        </p>
      ) : (
        <ul
          className="mt-3 divide-y"
          style={{ borderColor: 'hsl(var(--line))' }}
        >
          {balances.map((b) => (
            <li key={b.id} className="flex items-center justify-between py-2.5">
              <div>
                <p className="text-sm font-medium">
                  {b.holding || 'Portfolio-wide'}
                </p>
                <p className="text-xs text-[hsl(var(--ink-4))]">
                  As of {b.as_of}
                  {b.stale && (
                    <span className="ml-1.5 inline-flex items-center gap-1 text-[hsl(var(--warn-ink))]">
                      <AlertTriangle className="h-3 w-3" /> stale
                    </span>
                  )}
                </p>
              </div>
              <span
                className={cn(
                  'text-sm font-semibold',
                  b.stale && 'text-[hsl(var(--ink-4))]'
                )}
              >
                ${b.balance}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export default function RamaInsights() {
  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        title="Insights"
        description="What your Sergeants are watching, and what the Financial Services Administrator recommends."
      />
      <div className="space-y-6">
        <BalancesCard />
        <InsightsList />
      </div>
    </div>
  );
}
