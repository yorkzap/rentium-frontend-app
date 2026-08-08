'use client';

/**
 * One continuous ledger.
 *
 * The financial page used to split money into a "Charges" tab and an
 * "Expenses" tab, which is the accountant's filing cabinet rather than the
 * question a landlord asks — "what happened with my money?". Rent charged in
 * July and the $19.78 knob that fixed the shower are the same story and belong
 * on one timeline.
 *
 * Presentation is deliberately plain: one table, one muted header, a quiet
 * month separator. An earlier version gave every row an icon, a type badge and
 * its own card, which turned a list you scan into a wall you read.
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Loader2, Search, Wrench } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { dateLabel } from '@/lib/utils';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  CHARGE_TYPES,
  fetchEntries,
  type EntryType,
  type LedgerEntry,
  type PropertyLite,
} from '@/lib/financeApi';

const money = (v: string | number | null | undefined) =>
  `$${Number(v ?? 0).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

/** Money that has actually moved, versus money merely expected. */
type Direction = 'in' | 'out' | 'expected' | 'none';

function directionOf(e: LedgerEntry): Direction {
  if (e.voided) return 'none';
  if (e.entry_type === 'PAYMENT') return 'in';
  if (e.entry_type === 'EXPENSE' || e.entry_type === 'DEPOSIT_RETURN')
    return 'out';
  if ((CHARGE_TYPES as string[]).includes(e.entry_type)) return 'expected';
  return 'none';
}

/**
 * Where the money belongs. A shared-space repair has no listing to charge —
 * the shower serves three rooms — so it is booked against the address. Falling
 * back to holding_name is what stops those entries reading as belonging
 * nowhere.
 */
function placeOf(e: LedgerEntry): string {
  return e.property_name || e.holding_name || 'Portfolio-wide';
}

function statusOf(e: LedgerEntry): { label: string; cls: string } | null {
  if (e.voided) {
    // The strike-through has to explain itself, or hiding the REVERSAL row
    // just turns a confusing three-row correction into a silent one.
    const when = e.voided_on
      ? ` ${dateLabel(e.voided_on, { month: 'short', day: 'numeric' })}`
      : '';
    return { label: `Voided${when}`, cls: 'text-ink-4' };
  }
  // A reversal only surfaces with "Show corrections" on. Unlabelled, it read as
  // a third copy of the same amount sitting next to the entry it cancelled.
  if (e.entry_type === 'REVERSAL')
    return { label: 'Correction', cls: 'text-ink-4' };
  if (e.entry_type === 'EXPENSE')
    return e.bank_status === 'PAID'
      ? { label: 'Paid', cls: 'text-ink-3' }
      : { label: 'Not yet taken', cls: 'text-amber-700' };
  if (!e.charge_status) return null;
  const cls: Record<string, string> = {
    OVERDUE: 'text-red-700',
    DUE: 'text-amber-700',
    PARTIALLY_PAID: 'text-amber-700',
    PAID: 'text-green-700',
    SCHEDULED: 'text-ink-4',
  };
  return {
    label: e.charge_status.replace('_', ' ').toLowerCase(),
    cls: cls[e.charge_status] ?? 'text-ink-3',
  };
}

const TYPE_FILTERS: { value: string; label: string }[] = [
  { value: 'all', label: 'Everything' },
  { value: 'charges', label: 'Charges' },
  { value: 'PAYMENT', label: 'Payments in' },
  { value: 'EXPENSE', label: 'Expenses out' },
  { value: 'CREDIT', label: 'Credits' },
  { value: 'DEPOSIT_RETURN', label: 'Deposit returns' },
];

/** A charge with money still on it, which the landlord can settle from here. */
function isSettleable(e: LedgerEntry): boolean {
  return (
    !e.voided &&
    (CHARGE_TYPES as string[]).includes(e.entry_type) &&
    Number(e.outstanding ?? 0) > 0
  );
}

interface Props {
  token: string;
  properties: PropertyLite[];
  onOpenWorkOrder?: (id: string) => void;
  /** Open the record-payment dialog for this charge.
   *
   *  The Ledger tab is the default view and the one a landlord is looking at
   *  when they see a deposit sitting OVERDUE — but the only way to settle it
   *  was the Charges tab, or asking RAMA. The dialog itself is not rebuilt
   *  here: it lives in FinancialManagement (deposit splitting, payer picker,
   *  idempotency key and all) and this hands it the row. */
  onRecordPayment?: (charge: LedgerEntry) => void;
  /** Bumped by the parent after a write lands. The feed owns its own rows, so
   *  without this a payment recorded from here leaves the charge reading
   *  OVERDUE until the landlord navigates away and back — which looks exactly
   *  like the payment not having been recorded. */
  refreshKey?: number;
}

export function LedgerFeed({
  token,
  properties,
  onOpenWorkOrder,
  onRecordPayment,
  refreshKey = 0,
}: Props) {
  const [rows, setRows] = useState<LedgerEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState('all');
  const [propertyFilter, setPropertyFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [showCorrections, setShowCorrections] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const filters: Parameters<typeof fetchEntries>[1] = {
        ordering: '-effective_date',
      };
      if (typeFilter === 'charges') filters.entry_type__in = CHARGE_TYPES;
      else if (typeFilter !== 'all')
        filters.entry_type = typeFilter as EntryType;
      if (propertyFilter !== 'all') filters.property = propertyFilter;
      if (search.trim()) filters.search = search.trim();
      setRows(await fetchEntries(token, filters));
    } catch {
      setRows([]);
    } finally {
      setLoading(false);
    }
    // refreshKey is not read inside this callback — it is here on purpose, so
    // that bumping it produces a new `load` and re-runs the effect below. That
    // is the whole mechanism for picking up a payment recorded from this feed.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, typeFilter, propertyFilter, search, refreshKey]);

  useEffect(() => {
    const t = setTimeout(() => void load(), search ? 300 : 0);
    return () => clearTimeout(t);
  }, [load, search]);

  /**
   * A void is one event, not two rows. The entry it voided already says so —
   * struck through, "Voided <date> — <reason>" — so the REVERSAL underneath it
   * is duplicate bookkeeping on screen: a $19.78 repair read as three separate
   * $19.78 lines. It stays one click away rather than gone.
   */
  const reversalCount = useMemo(
    () => rows.filter((e) => e.entry_type === 'REVERSAL').length,
    [rows]
  );
  const visible = useMemo(
    () =>
      showCorrections ? rows : rows.filter((e) => e.entry_type !== 'REVERSAL'),
    [rows, showCorrections]
  );

  /**
   * Totals for what's on screen, so a filtered view still adds up.
   * Deliberately over `rows`, not `visible`: hiding a correction must not
   * change a number. It happens to be a no-op either way — directionOf()
   * returns 'none' for REVERSAL and for anything voided — but that is a
   * property of directionOf, not something the totals should rely on.
   */
  const totals = useMemo(() => {
    let inn = 0;
    let out = 0;
    let expected = 0;
    for (const e of rows) {
      const amount = Number(e.amount ?? 0);
      const dir = directionOf(e);
      if (dir === 'in') inn += amount;
      else if (dir === 'out') out += amount;
      else if (dir === 'expected') expected += amount;
    }
    return { inn, out, expected, net: inn - out };
  }, [rows]);

  /** A quiet month label before the first row of each month. */
  const monthOf = (e: LedgerEntry) =>
    dateLabel(e.effective_date, { month: 'long', year: 'numeric' });

  return (
    <div className="space-y-4">
      <div className="flex w-full flex-wrap gap-2">
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-[160px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {TYPE_FILTERS.map((t) => (
              <SelectItem key={t.value} value={t.value}>
                {t.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={propertyFilter} onValueChange={setPropertyFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="All properties" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All properties</SelectItem>
            {properties.map((p) => (
              <SelectItem key={p.id} value={String(p.id)}>
                {p.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="relative flex-1 md:flex-initial">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-ink-4" />
          <Input
            placeholder="Search the ledger…"
            className="pl-8"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        {reversalCount > 0 && (
          <button
            type="button"
            onClick={() => setShowCorrections((v) => !v)}
            className="whitespace-nowrap px-2 text-sm text-ink-4 underline-offset-4 hover:text-ink hover:underline"
          >
            {showCorrections ? 'Hide' : 'Show'} corrections ({reversalCount})
          </button>
        )}
      </div>

      {/* One quiet summary line rather than four competing tiles. */}
      <Card>
        <CardContent className="flex flex-wrap gap-x-8 gap-y-2 p-4 text-sm">
          <span>
            <span className="text-ink-4">In</span>{' '}
            <span className="font-medium text-green-700">
              {money(totals.inn)}
            </span>
          </span>
          <span>
            <span className="text-ink-4">Out</span>{' '}
            <span className="font-medium text-red-700">
              {money(totals.out)}
            </span>
          </span>
          <span>
            <span className="text-ink-4">Net</span>{' '}
            <span className="font-medium">{money(totals.net)}</span>
          </span>
          <span title="Face value of all charge lines in this filtered ledger, including scheduled and overdue charges. Payments received are shown under In.">
            <span className="text-ink-4">Charges shown</span>{' '}
            <span className="font-medium text-ink-2">
              {money(totals.expected)}
            </span>
          </span>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-5 w-5 animate-spin text-ink-4" />
            </div>
          ) : visible.length === 0 ? (
            <p className="py-12 text-center text-sm text-ink-4">
              Nothing in the ledger for this view yet.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-line text-sm">
                <thead className="bg-canvas text-xs uppercase tracking-wider text-ink-3">
                  <tr>
                    <th className="px-4 py-3 text-left">Date</th>
                    <th className="px-4 py-3 text-left">Description</th>
                    <th className="hidden px-4 py-3 text-left md:table-cell">
                      Where
                    </th>
                    <th className="px-4 py-3 text-right">Amount</th>
                    <th className="px-4 py-3 text-left">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {visible.map((e, i) => {
                    const dir = directionOf(e);
                    const status = statusOf(e);
                    const month = monthOf(e);
                    // Grouped over the rendered array, so a month whose only
                    // entry was a hidden correction leaves no orphan heading.
                    const newMonth =
                      i === 0 || month !== monthOf(visible[i - 1]);
                    return (
                      <React.Fragment key={e.id}>
                        {newMonth && (
                          <tr className="bg-canvas/60">
                            <td
                              colSpan={5}
                              className="px-4 py-1.5 text-xs font-medium text-ink-4"
                            >
                              {month}
                            </td>
                          </tr>
                        )}
                        <tr className="hover:bg-canvas">
                          <td className="whitespace-nowrap px-4 py-3 text-ink-3">
                            {dateLabel(e.effective_date, {
                              month: 'short',
                              day: 'numeric',
                            })}
                          </td>
                          <td className="px-4 py-3">
                            <span className="text-ink">
                              {e.description || e.entry_type_display}
                            </span>
                            <span className="ml-2 text-xs text-ink-4">
                              {e.entry_type_display}
                            </span>
                            {e.entry_type === 'REVERSAL' &&
                              e.reverses_effective_date && (
                                <span className="ml-2 text-xs text-ink-4">
                                  · voids the{' '}
                                  {dateLabel(e.reverses_effective_date, {
                                    month: 'short',
                                    day: 'numeric',
                                  })}{' '}
                                  entry
                                </span>
                              )}
                            {e.work_order && (
                              <button
                                type="button"
                                onClick={() => onOpenWorkOrder?.(e.work_order!)}
                                className="ml-2 inline-flex items-center gap-1 align-middle text-xs text-ink-4 hover:text-ink"
                                title="From a maintenance job"
                              >
                                <Wrench className="h-3 w-3" />
                              </button>
                            )}
                            {e.voided && e.void_reason && (
                              <span className="block text-xs text-ink-4">
                                {e.void_reason}
                              </span>
                            )}
                            <span className="block text-xs text-ink-4 md:hidden">
                              {placeOf(e)}
                            </span>
                          </td>
                          <td className="hidden px-4 py-3 text-ink-3 md:table-cell">
                            {placeOf(e)}
                            {e.tenant_name && (
                              <span className="block text-xs text-ink-4">
                                {e.tenant_name}
                              </span>
                            )}
                          </td>
                          <td
                            className={`whitespace-nowrap px-4 py-3 text-right font-medium ${
                              dir === 'in'
                                ? 'text-green-700'
                                : dir === 'out'
                                  ? 'text-red-700'
                                  : 'text-ink'
                            } ${e.voided ? 'line-through opacity-60' : ''}`}
                          >
                            {dir === 'out' ? '−' : dir === 'in' ? '+' : ''}
                            {money(e.amount)}
                          </td>
                          <td
                            className={`whitespace-nowrap px-4 py-3 text-xs capitalize ${
                              status?.cls ?? 'text-ink-4'
                            }`}
                          >
                            {status?.label ?? '—'}
                            {/* "left" is a charge concept. An expense or a
                                payment has no balance to still owe, so the
                                type guard belongs here as well as in the
                                annotation that feeds it. */}
                            {(CHARGE_TYPES as string[]).includes(
                              e.entry_type
                            ) &&
                              e.outstanding &&
                              Number(e.outstanding) > 0 &&
                              !e.voided && (
                                <span className="block text-ink-4">
                                  {money(e.outstanding)} left
                                </span>
                              )}
                            {/* Where the landlord is already looking when they
                                see a deposit reading OVERDUE. */}
                            {onRecordPayment && isSettleable(e) && (
                              <button
                                type="button"
                                onClick={() => onRecordPayment(e)}
                                className="mt-0.5 block font-medium normal-case text-[hsl(var(--brand))] hover:underline"
                              >
                                Record payment
                              </button>
                            )}
                          </td>
                        </tr>
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
