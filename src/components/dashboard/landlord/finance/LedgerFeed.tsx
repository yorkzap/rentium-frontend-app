'use client';

/**
 * One continuous ledger.
 *
 * The financial page used to split money into a "Charges" tab and an
 * "Expenses" tab, which is the accountant's filing cabinet rather than the
 * question a landlord actually asks — "what happened with my money?". Rent
 * charged in July and the $19.78 knob that fixed the shower are the same
 * story and belong on the same timeline.
 *
 * Every row is a LedgerEntry; the type is a column, not a separate screen.
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ArrowDownLeft,
  ArrowUpRight,
  Clock,
  Loader2,
  Search,
  Wrench,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
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

function StatusChip({ entry }: { entry: LedgerEntry }) {
  if (entry.voided) return <Badge variant="outline">Voided</Badge>;
  if (entry.entry_type === 'EXPENSE') {
    return entry.bank_status === 'PAID' ? (
      <Badge variant="secondary">Left the bank</Badge>
    ) : (
      <Badge variant="outline">Not yet taken</Badge>
    );
  }
  if (!entry.charge_status) return null;
  const tone: Record<string, string> = {
    OVERDUE: 'bg-red-100 text-red-800 border-red-200',
    DUE: 'bg-amber-100 text-amber-900 border-amber-200',
    PARTIALLY_PAID: 'bg-amber-100 text-amber-900 border-amber-200',
    PAID: 'bg-green-100 text-green-800 border-green-200',
    SCHEDULED: 'bg-slate-100 text-slate-700 border-slate-200',
  };
  const label = entry.charge_status.replace('_', ' ').toLowerCase();
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs capitalize ${
        tone[entry.charge_status] ?? ''
      }`}
    >
      {label}
    </span>
  );
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

  /** Group by month so a long timeline stays readable. */
  const months = useMemo(() => {
    const out: { key: string; label: string; entries: LedgerEntry[] }[] = [];
    for (const e of rows) {
      const d = new Date(e.effective_date);
      const key = `${d.getFullYear()}-${d.getMonth()}`;
      const label = d.toLocaleDateString('en-CA', {
        month: 'long',
        year: 'numeric',
      });
      const last = out[out.length - 1];
      if (last && last.key === key) last.entries.push(e);
      else out.push({ key, label, entries: [e] });
    }
    return out;
  }, [rows]);

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

  return (
    <div className="space-y-4">
      <div className="flex w-full flex-wrap gap-2">
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-[170px]">
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

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Card>
          <CardContent className="p-3">
            <p className="text-xs text-ink-4">Money in</p>
            <p className="text-lg font-semibold text-green-700">
              {money(totals.inn)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3">
            <p className="text-xs text-ink-4">Money out</p>
            <p className="text-lg font-semibold text-red-700">
              {money(totals.out)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3">
            <p className="text-xs text-ink-4">Net</p>
            <p className="text-lg font-semibold">{money(totals.net)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3">
            <p className="text-xs text-ink-4">Charged (expected)</p>
            <p className="text-lg font-semibold text-ink-2">
              {money(totals.expected)}
            </p>
          </CardContent>
        </Card>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-ink-4" />
        </div>
      ) : rows.length === 0 ? (
        <p className="py-12 text-center text-ink-4">
          Nothing in the ledger for this view yet.
        </p>
      ) : (
        <div className="space-y-6">
          {months.map((m) => (
            <section key={m.key}>
              <h3 className="mb-2 text-sm font-medium text-ink-4">{m.label}</h3>
              <Card>
                <CardContent className="p-0">
                  <ul className="divide-y">
                    {m.entries.map((e) => {
                      const dir = directionOf(e);
                      return (
                        <li
                          key={e.id}
                          className="flex flex-wrap items-start gap-3 px-4 py-3"
                        >
                          <div className="mt-0.5 shrink-0">
                            {dir === 'in' && (
                              <ArrowDownLeft className="h-4 w-4 text-green-600" />
                            )}
                            {dir === 'out' && (
                              <ArrowUpRight className="h-4 w-4 text-red-600" />
                            )}
                            {dir === 'expected' && (
                              <Clock className="h-4 w-4 text-ink-4" />
                            )}
                          </div>

                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="font-medium">
                                {e.description || e.entry_type_display}
                              </span>
                              <Badge variant="outline" className="shrink-0">
                                {e.entry_type_display}
                              </Badge>
                              <StatusChip entry={e} />
                            </div>
                            <p className="text-sm text-ink-4">
                              {new Date(e.effective_date).toLocaleDateString(
                                'en-CA'
                              )}{' '}
                              &middot; {placeOf(e)}
                              {e.tenant_name ? ` · ${e.tenant_name}` : ''}
                              {e.lease_number ? ` · ${e.lease_number}` : ''}
                              {e.vendor ? ` · ${e.vendor}` : ''}
                            </p>
                            {e.work_order && (
                              <button
                                type="button"
                                onClick={() => onOpenWorkOrder?.(e.work_order!)}
                                className="mt-1 inline-flex items-center gap-1 text-xs text-ink-4 hover:text-ink-1"
                              >
                                <Wrench className="h-3 w-3" />
                                From a maintenance job
                              </button>
                            )}
                          </div>

                          <div className="shrink-0 text-right">
                            <p
                              className={`font-semibold ${
                                dir === 'in'
                                  ? 'text-green-700'
                                  : dir === 'out'
                                    ? 'text-red-700'
                                    : ''
                              } ${e.voided ? 'line-through opacity-60' : ''}`}
                            >
                              {dir === 'out' ? '−' : dir === 'in' ? '+' : ''}
                              {money(e.amount)}
                            </p>
                            {e.outstanding &&
                              Number(e.outstanding) > 0 &&
                              !e.voided && (
                                <p className="text-xs text-ink-4">
                                  {money(e.outstanding)} outstanding
                                </p>
                              )}
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                </CardContent>
              </Card>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
