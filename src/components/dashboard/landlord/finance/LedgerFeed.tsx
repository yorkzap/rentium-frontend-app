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
  if (e.voided) return { label: 'Voided', cls: 'text-ink-4' };
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

interface Props {
  token: string;
  properties: PropertyLite[];
  onOpenWorkOrder?: (id: string) => void;
}

export function LedgerFeed({ token, properties, onOpenWorkOrder }: Props) {
  const [rows, setRows] = useState<LedgerEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState('all');
  const [propertyFilter, setPropertyFilter] = useState('all');
  const [search, setSearch] = useState('');

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
  }, [token, typeFilter, propertyFilter, search]);

  useEffect(() => {
    const t = setTimeout(() => void load(), search ? 300 : 0);
    return () => clearTimeout(t);
  }, [load, search]);

  /** Totals for what's on screen, so a filtered view still adds up. */
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
    new Date(e.effective_date).toLocaleDateString('en-CA', {
      month: 'long',
      year: 'numeric',
    });

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
          <span>
            <span className="text-ink-4">Charged</span>{' '}
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
          ) : rows.length === 0 ? (
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
                  {rows.map((e, i) => {
                    const dir = directionOf(e);
                    const status = statusOf(e);
                    const month = monthOf(e);
                    const newMonth = i === 0 || month !== monthOf(rows[i - 1]);
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
                            {new Date(e.effective_date).toLocaleDateString(
                              'en-CA',
                              { month: 'short', day: 'numeric' }
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <span className="text-ink">
                              {e.description || e.entry_type_display}
                            </span>
                            <span className="ml-2 text-xs text-ink-4">
                              {e.entry_type_display}
                            </span>
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
                            {e.outstanding &&
                              Number(e.outstanding) > 0 &&
                              !e.voided && (
                                <span className="block text-ink-4">
                                  {money(e.outstanding)} left
                                </span>
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
