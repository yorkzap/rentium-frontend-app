// FinancialManagement.tsx
'use client';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  ArrowUpRight,
  ArrowDownRight,
  Wallet,
  ShieldCheck,
  Plus,
  Search,
  Loader2,
  MoreHorizontal,
  Receipt,
  Ban,
  Pencil,
  HandCoins,
  Percent,
  Zap,
  Users,
  ExternalLink,
  FileText,
  UserRound,
  ChevronDown,
  ChevronRight,
  Home,
  CalendarDays,
  CheckCircle2,
  Landmark,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { DJANGO_API_URL } from '@/lib/config';
import {
  fetchSummary,
  fetchCharges,
  fetchExpenses,
  fetchProperties,
  fetchLeasesLite,
  fetchLeaseBillingInfo,
  leaseLabel,
  recordPayment,
  postCredit,
  voidEntry,
  correctEntry,
  postExpense,
  splitUtilityBill,
  markExpensePaid,
  newIdempotencyKey,
  PAYMENT_METHODS,
  EXPENSE_CATEGORIES,
  type LedgerEntry,
  type LedgerSummary,
  type ChargeStatus,
  type PropertyLite,
  type LeaseLite,
  type PaymentMethod,
  type ExpenseCategory,
  type LeaseBillingInfo,
} from '@/lib/financeApi';

const money = (v: string | number | null | undefined) =>
  `$${Number(v ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const today = () => new Date().toISOString().slice(0, 10);
const prettyDate = (iso: string | null | undefined) => {
  if (!iso) return '—';
  const d = new Date(`${iso}T00:00:00`);
  return isNaN(d.getTime())
    ? iso
    : d.toLocaleDateString('en-CA', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
};

// The serializer returns lease, lease_number, tenant, tenant_name, is_joint,
// property_category and paid_on. The local LedgerEntry type may lag behind, so
// read them through this widened view.
type EntryExtras = {
  lease?: string | null;
  lease_number?: string | null;
  tenant?: number | string | null;
  tenant_name?: string | null;
  is_joint?: boolean;
  property_category?: string | null;
  paid_on?: string | null;
};
const ex = (e: LedgerEntry) => e as LedgerEntry & EntryExtras;

const propertyKindLabel = (category?: string | null, joint?: boolean) => {
  if (!category) return null;
  if (category === 'ROOM') return joint ? 'Room (shared)' : 'Room';
  if (category === 'COMPLETE_UNIT') return 'Full suite';
  return category;
};

const STATUS_PILL: Record<ChargeStatus, string> = {
  PAID: 'bg-green-50 text-green-700',
  PARTIALLY_PAID: 'bg-amber-50 text-amber-700',
  DUE: 'bg-blue-50 text-blue-700',
  SCHEDULED: 'bg-surface-sunken text-ink-2',
  OVERDUE: 'bg-red-50 text-red-700',
  VOIDED: 'bg-surface-sunken text-ink-4 line-through',
};
const STATUS_LABEL: Record<ChargeStatus, string> = {
  PAID: 'Paid',
  PARTIALLY_PAID: 'Partial',
  DUE: 'Due today',
  SCHEDULED: 'Scheduled',
  OVERDUE: 'Overdue',
  VOIDED: 'Voided',
};
function Pill({ status }: { status: ChargeStatus }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_PILL[status]}`}
    >
      {STATUS_LABEL[status]}
    </span>
  );
}

interface LeaseTenantOption {
  id: string;
  tenant: number | null;
  tenant_name: string | null;
  invited_name?: string;
  invited_email?: string;
  has_signed?: boolean;
  declined?: boolean;
}

async function fetchLeaseTenants(
  token: string,
  leaseId: string
): Promise<LeaseTenantOption[]> {
  const res = await fetch(`${DJANGO_API_URL}/leases/${leaseId}/`, {
    headers: { Authorization: `Token ${token}` },
  });
  if (!res.ok) throw new Error(`Failed to load lease tenants (${res.status})`);
  const data = await res.json();
  return (data.lease_tenants ?? []) as LeaseTenantOption[];
}

// ==========================================================================
export default function FinancialManagement() {
  const { token } = useAuth();
  const router = useRouter();

  const [summary, setSummary] = useState<LedgerSummary | null>(null);
  const [charges, setCharges] = useState<LedgerEntry[]>([]);
  const [expenses, setExpenses] = useState<LedgerEntry[]>([]);
  const [properties, setProperties] = useState<PropertyLite[]>([]);
  const [leases, setLeases] = useState<LeaseLite[]>([]);
  const [tab, setTab] = useState<'charges' | 'expenses'>('charges');
  const [propertyFilter, setPropertyFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  const [payTarget, setPayTarget] = useState<LedgerEntry | null>(null);
  const [creditTarget, setCreditTarget] = useState<LedgerEntry | null>(null);
  const [voidTarget, setVoidTarget] = useState<LedgerEntry | null>(null);
  const [correctTarget, setCorrectTarget] = useState<LedgerEntry | null>(null);
  const [markPaidTarget, setMarkPaidTarget] = useState<LedgerEntry | null>(
    null
  );
  const [expenseOpen, setExpenseOpen] = useState(false);
  const [utilityOpen, setUtilityOpen] = useState(false);
  const [tenantView, setTenantView] = useState<{
    id: number | string;
    name: string;
  } | null>(null);

  const openLease = useCallback(
    (leaseId: string) => {
      router.push(`/dashboard/leases/${leaseId}`);
    },
    [router]
  );

  const reloadAll = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const prop = propertyFilter === 'all' ? undefined : propertyFilter;
      const [sum, ch, exps] = await Promise.all([
        fetchSummary(token, { months: 6, property: prop }),
        fetchCharges(token, {
          property: prop,
          status:
            statusFilter === 'all' ? undefined : (statusFilter as ChargeStatus),
          search: search || undefined,
        }),
        fetchExpenses(token, { property: prop, search: search || undefined }),
      ]);
      setSummary(sum);
      setCharges(ch);
      setExpenses(exps);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : 'Failed to load financial data.'
      );
    } finally {
      setLoading(false);
    }
  }, [token, propertyFilter, statusFilter, search]);

  useEffect(() => {
    reloadAll();
  }, [reloadAll]);

  useEffect(() => {
    if (!token) return;
    fetchProperties(token)
      .then(setProperties)
      .catch(() => {});
    fetchLeasesLite(token)
      .then(setLeases)
      .catch(() => {});
  }, [token]);

  const thisMonth = summary?.monthly?.[summary.monthly.length - 1];

  // How much have you recorded but not actually paid yet? The difference between
  // "what I spent" and "what has left my account" is a real number a landlord
  // needs, and until paid_on existed the app couldn't tell them.
  const unpaidExpenses = useMemo(
    () => expenses.filter((e) => !e.voided && !ex(e).paid_on),
    [expenses]
  );
  const unpaidTotal = useMemo(
    () => unpaidExpenses.reduce((s, e) => s + Number(e.amount), 0),
    [unpaidExpenses]
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col items-start justify-between gap-4 md:flex-row md:items-center">
        <div>
          <h1 className="text-2xl font-semibold text-ink">Financial</h1>
          <p className="mt-1 text-sm text-ink-3">
            Your property ledger — every charge, payment, and expense.
          </p>
        </div>
        <div className="flex w-full flex-wrap gap-2 md:w-auto">
          <Button
            variant="outline"
            onClick={() => router.push('/dashboard/calendar')}
          >
            <CalendarDays className="mr-1 h-4 w-4" /> Calendar
          </Button>
          <Button variant="outline" onClick={() => setUtilityOpen(true)}>
            <Zap className="mr-1 h-4 w-4" /> Add utility bill
          </Button>
          <Button className="" onClick={() => setExpenseOpen(true)}>
            <Plus className="mr-1 h-4 w-4" /> Add expense
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Collected this month"
          value={money(thisMonth?.collected_income)}
          hint={
            thisMonth ? `of ${money(thisMonth.expected_income)} expected` : ''
          }
          icon={<ArrowUpRight className="h-5 w-5" />}
          tone="green"
        />
        <StatCard
          label="Outstanding"
          value={money(summary?.outstanding_total)}
          hint={summary ? `${summary.outstanding_count} charge(s) owed` : ''}
          icon={<Wallet className="h-5 w-5" />}
          tone="amber"
        />
        <StatCard
          label="Overdue"
          value={summary ? String(summary.overdue_count) : '—'}
          hint="past due, unpaid"
          icon={<ArrowDownRight className="h-5 w-5" />}
          tone="red"
        />
        <StatCard
          label="Deposits held"
          value={money(summary?.deposits_held)}
          hint="refundable liability"
          icon={<ShieldCheck className="h-5 w-5" />}
          tone="blue"
        />
      </div>

      {unpaidTotal > 0 && (
        <button
          type="button"
          onClick={() => setTab('expenses')}
          className="flex w-full items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-left transition-colors hover:bg-amber-100"
        >
          <Landmark className="h-4 w-4 flex-shrink-0 text-amber-600" />
          <p className="text-sm text-amber-900">
            <strong>{money(unpaidTotal)}</strong> across {unpaidExpenses.length}{' '}
            expense
            {unpaidExpenses.length === 1 ? '' : 's'} hasn&apos;t left your bank
            account yet.
          </p>
          <ChevronRight className="ml-auto h-4 w-4 flex-shrink-0 text-amber-600" />
        </button>
      )}

      <Card>
        <CardContent className="p-0">
          <div className="flex items-center justify-between border-b px-4 py-3">
            <h2 className="text-sm font-medium text-ink-2">Last 6 months</h2>
            {loading && <Loader2 className="h-4 w-4 animate-spin text-ink-4" />}
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-line text-sm">
              <thead className="bg-canvas text-xs uppercase tracking-wider text-ink-3">
                <tr>
                  <th className="px-4 py-2.5 text-left">Month</th>
                  <th className="px-4 py-2.5 text-right">Expected</th>
                  <th className="px-4 py-2.5 text-right">Collected</th>
                  <th className="px-4 py-2.5 text-right">Expenses</th>
                  <th className="px-4 py-2.5 text-right">Net</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {summary?.monthly.map((m) => (
                  <tr key={m.month} className="hover:bg-canvas">
                    <td className="px-4 py-2.5 font-medium text-ink">
                      {m.label}
                    </td>
                    <td className="px-4 py-2.5 text-right text-ink-3">
                      {money(m.expected_income)}
                    </td>
                    <td className="px-4 py-2.5 text-right text-green-600">
                      {money(m.collected_income)}
                    </td>
                    <td className="px-4 py-2.5 text-right text-red-600">
                      {money(m.expenses)}
                    </td>
                    <td
                      className={`px-4 py-2.5 text-right font-medium ${Number(m.net) >= 0 ? 'text-ink' : 'text-red-600'}`}
                    >
                      {money(m.net)}
                    </td>
                  </tr>
                ))}
                {!loading && !summary?.monthly.length && (
                  <tr>
                    <td
                      colSpan={5}
                      className="px-4 py-6 text-center text-ink-4"
                    >
                      No data yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <div className="flex flex-col items-start justify-between gap-3 md:flex-row md:items-center">
        <Tabs
          value={tab}
          onValueChange={(v) => setTab(v as 'charges' | 'expenses')}
        >
          <TabsList>
            <TabsTrigger value="charges">Charges</TabsTrigger>
            <TabsTrigger value="expenses">Expenses</TabsTrigger>
          </TabsList>
        </Tabs>
        <div className="flex w-full flex-wrap gap-2 md:w-auto">
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
          {tab === 'charges' && (
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Any status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Any status</SelectItem>
                <SelectItem value="OVERDUE">Overdue</SelectItem>
                <SelectItem value="DUE">Due today</SelectItem>
                <SelectItem value="PARTIALLY_PAID">Partial</SelectItem>
                <SelectItem value="SCHEDULED">Scheduled</SelectItem>
                <SelectItem value="PAID">Paid</SelectItem>
              </SelectContent>
            </Select>
          )}
          <div className="relative flex-1 md:flex-initial">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-ink-4" />
            <Input
              placeholder="Search…"
              className="pl-8"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>
      </div>

      {tab === 'charges' ? (
        <ChargesTable
          rows={charges}
          loading={loading}
          properties={properties}
          onPay={setPayTarget}
          onCredit={setCreditTarget}
          onVoid={setVoidTarget}
          onCorrect={setCorrectTarget}
          onTenant={(id, name) => setTenantView({ id, name })}
          onOpenLease={openLease}
        />
      ) : (
        <ExpensesTable
          rows={expenses}
          loading={loading}
          onVoid={setVoidTarget}
          onCorrect={setCorrectTarget}
          onMarkPaid={setMarkPaidTarget}
        />
      )}

      {payTarget && (
        <RecordPaymentDialog
          charge={payTarget}
          token={token!}
          onClose={() => setPayTarget(null)}
          onDone={() => {
            setPayTarget(null);
            reloadAll();
          }}
        />
      )}
      {creditTarget && (
        <CreditDialog
          charge={creditTarget}
          token={token!}
          onClose={() => setCreditTarget(null)}
          onDone={() => {
            setCreditTarget(null);
            reloadAll();
          }}
        />
      )}
      {voidTarget && (
        <VoidDialog
          entry={voidTarget}
          token={token!}
          onClose={() => setVoidTarget(null)}
          onDone={() => {
            setVoidTarget(null);
            reloadAll();
          }}
        />
      )}
      {correctTarget && (
        <CorrectDialog
          entry={correctTarget}
          token={token!}
          onClose={() => setCorrectTarget(null)}
          onDone={() => {
            setCorrectTarget(null);
            reloadAll();
          }}
        />
      )}
      {markPaidTarget && (
        <MarkPaidDialog
          entry={markPaidTarget}
          token={token!}
          onClose={() => setMarkPaidTarget(null)}
          onDone={() => {
            setMarkPaidTarget(null);
            reloadAll();
          }}
        />
      )}
      {tenantView && (
        <TenantQuickViewDialog
          tenantId={tenantView.id}
          tenantName={tenantView.name}
          token={token!}
          leases={leases}
          onOpenLease={(id) => {
            setTenantView(null);
            openLease(id);
          }}
          onClose={() => setTenantView(null)}
        />
      )}

      <ExpenseDialog
        open={expenseOpen}
        token={token!}
        properties={properties}
        onClose={() => setExpenseOpen(false)}
        onDone={() => {
          setExpenseOpen(false);
          reloadAll();
        }}
      />
      <UtilityBillSheet
        open={utilityOpen}
        token={token!}
        leases={leases}
        onClose={() => setUtilityOpen(false)}
        onDone={() => {
          setUtilityOpen(false);
          reloadAll();
        }}
      />
    </div>
  );
}

// ------------------------------------------------------------------ cards
function StatCard({
  label,
  value,
  hint,
  icon,
  tone,
}: {
  label: string;
  value: string;
  hint?: string;
  icon: React.ReactNode;
  tone: 'green' | 'amber' | 'red' | 'blue';
}) {
  const tones: Record<string, string> = {
    green: 'bg-green-50 text-green-600',
    amber: 'bg-amber-50 text-amber-600',
    red: 'bg-red-50 text-red-600',
    blue: 'bg-blue-50 text-blue-600',
  };
  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div className="min-w-0">
            <p className="text-sm font-medium text-ink-3">{label}</p>
            <p className="truncate text-2xl font-semibold">{value}</p>
            {hint && <p className="mt-0.5 text-xs text-ink-4">{hint}</p>}
          </div>
          <div className={`shrink-0 rounded-full p-2 ${tones[tone]}`}>
            {icon}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------- tables
function ChargesTable({
  rows,
  loading,
  properties,
  onPay,
  onCredit,
  onVoid,
  onCorrect,
  onTenant,
  onOpenLease,
}: {
  rows: LedgerEntry[];
  loading: boolean;
  properties: PropertyLite[];
  onPay: (e: LedgerEntry) => void;
  onCredit: (e: LedgerEntry) => void;
  onVoid: (e: LedgerEntry) => void;
  onCorrect: (e: LedgerEntry) => void;
  onTenant: (id: number | string, name: string) => void;
  onOpenLease: (leaseId: string) => void;
}) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const propertyById = new Map(properties.map((p) => [p.id, p]));

  return (
    <Card>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-line text-sm">
            <thead className="bg-canvas text-xs uppercase tracking-wider text-ink-3">
              <tr>
                <th className="w-8 px-2 py-3">
                  <span className="sr-only">Details</span>
                </th>
                <th className="px-2 py-3 text-left">Due</th>
                <th className="px-4 py-3 text-left">Description</th>
                <th className="hidden px-4 py-3 text-left sm:table-cell">
                  Tenant
                </th>
                <th className="px-4 py-3 text-right">Amount</th>
                <th className="hidden px-4 py-3 text-right md:table-cell">
                  Outstanding
                </th>
                <th className="px-4 py-3 text-left">Status</th>
                <th className="px-4 py-3">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {rows.map((c) => {
                const st = (c.charge_status ?? 'SCHEDULED') as ChargeStatus;
                const settleable = st !== 'PAID' && st !== 'VOIDED';
                const extra = ex(c);
                const leaseId = extra.lease ?? null;
                const isOpen = expandedId === c.id;
                const prop =
                  c.property != null ? propertyById.get(c.property) : undefined;
                const kind = propertyKindLabel(
                  extra.property_category,
                  extra.is_joint
                );

                return (
                  <React.Fragment key={c.id}>
                    <tr className="hover:bg-canvas">
                      <td className="px-2 py-3">
                        <button
                          type="button"
                          className="rounded p-1 text-ink-4 hover:bg-surface-sunken"
                          title={isOpen ? 'Hide details' : 'Show details'}
                          onClick={() => setExpandedId(isOpen ? null : c.id)}
                        >
                          {isOpen ? (
                            <ChevronDown className="h-4 w-4" />
                          ) : (
                            <ChevronRight className="h-4 w-4" />
                          )}
                        </button>
                      </td>
                      <td className="whitespace-nowrap px-2 py-3 text-ink-3">
                        {c.due_date}
                      </td>
                      <td className="px-4 py-3 font-medium text-ink">
                        {leaseId ? (
                          <button
                            type="button"
                            className="text-left decoration-ink-5 underline-offset-2 hover:underline"
                            title="Open the lease this charge belongs to"
                            onClick={() => onOpenLease(leaseId)}
                          >
                            {c.description}
                          </button>
                        ) : (
                          c.description
                        )}
                        <span className="mt-0.5 block text-xs font-normal text-ink-4 sm:hidden">
                          {extra.is_joint
                            ? 'Household'
                            : c.tenant_name || extra.tenant_name || ''}
                          {c.property_name ? ` · ${c.property_name}` : ''}
                        </span>
                      </td>
                      <td className="hidden px-4 py-3 text-ink-3 sm:table-cell">
                        {extra.is_joint ? (
                          <span className="inline-flex flex-col items-start gap-0.5">
                            <Badge
                              variant="outline"
                              className="bg-canvas text-xs font-normal"
                            >
                              <Users className="mr-1 h-3 w-3 text-ink-4" />{' '}
                              Household
                            </Badge>
                            {c.property_name && (
                              <span className="text-xs text-ink-4">
                                {c.property_name}
                              </span>
                            )}
                          </span>
                        ) : extra.tenant &&
                          (c.tenant_name || extra.tenant_name) ? (
                          <button
                            type="button"
                            className="inline-flex items-center gap-1 text-ink-2 underline-offset-2 hover:text-ink hover:underline"
                            title="View this tenant's profile"
                            onClick={() =>
                              onTenant(
                                extra.tenant as number | string,
                                (c.tenant_name || extra.tenant_name) as string
                              )
                            }
                          >
                            <UserRound className="h-3.5 w-3.5 text-ink-4" />
                            {c.tenant_name || extra.tenant_name}
                          </button>
                        ) : (
                          c.tenant_name || '—'
                        )}
                      </td>
                      <td className="px-4 py-3 text-right font-medium">
                        {money(c.amount)}
                      </td>
                      <td className="hidden px-4 py-3 text-right text-ink-3 md:table-cell">
                        {money(c.outstanding)}
                      </td>
                      <td className="px-4 py-3">
                        <Pill status={st} />
                      </td>
                      <td className="px-4 py-3 text-right">
                        {!c.voided && (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              {settleable && (
                                <DropdownMenuItem onClick={() => onPay(c)}>
                                  <HandCoins className="mr-2 h-4 w-4" /> Record
                                  payment
                                </DropdownMenuItem>
                              )}
                              {settleable && (
                                <DropdownMenuItem onClick={() => onCredit(c)}>
                                  <Percent className="mr-2 h-4 w-4" /> Credit /
                                  discount
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuItem onClick={() => onCorrect(c)}>
                                <Pencil className="mr-2 h-4 w-4" /> Edit
                                (correct)
                              </DropdownMenuItem>
                              {leaseId && (
                                <>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem
                                    onClick={() => onOpenLease(leaseId)}
                                  >
                                    <FileText className="mr-2 h-4 w-4" /> Open
                                    lease
                                  </DropdownMenuItem>
                                </>
                              )}
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                className="text-red-600"
                                onClick={() => onVoid(c)}
                              >
                                <Ban className="mr-2 h-4 w-4" /> Void
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        )}
                      </td>
                    </tr>

                    {isOpen && (
                      <tr className="bg-canvas/60">
                        <td colSpan={8} className="px-4 py-3 sm:px-12">
                          <div className="flex flex-wrap gap-x-8 gap-y-2 text-xs">
                            {extra.lease_number && (
                              <div>
                                <p className="uppercase tracking-wide text-ink-4">
                                  Lease
                                </p>
                                {leaseId ? (
                                  <button
                                    type="button"
                                    className="inline-flex items-center gap-1 font-medium text-ink-2 underline-offset-2 hover:underline"
                                    onClick={() => onOpenLease(leaseId)}
                                  >
                                    {extra.lease_number}{' '}
                                    <ExternalLink className="h-3 w-3 text-ink-4" />
                                  </button>
                                ) : (
                                  <p className="font-medium text-ink-2">
                                    {extra.lease_number}
                                  </p>
                                )}
                              </div>
                            )}
                            {(c.property_name || kind) && (
                              <div>
                                <p className="uppercase tracking-wide text-ink-4">
                                  Property
                                </p>
                                <p className="inline-flex items-center gap-1 font-medium text-ink-2">
                                  <Home className="h-3 w-3 text-ink-4" />
                                  {c.property_name || '—'}
                                  {kind ? ` · ${kind}` : ''}
                                </p>
                                {prop?.address && (
                                  <p className="text-ink-3">{prop.address}</p>
                                )}
                              </div>
                            )}
                            <div>
                              <p className="uppercase tracking-wide text-ink-4">
                                Billed to
                              </p>
                              <p className="font-medium text-ink-2">
                                {extra.is_joint
                                  ? 'The whole household jointly — any tenant on the lease can pay it'
                                  : c.tenant_name || extra.tenant_name || '—'}
                              </p>
                            </div>
                            <div>
                              <p className="uppercase tracking-wide text-ink-4">
                                Posted
                              </p>
                              <p className="font-medium text-ink-2">
                                {c.created_at
                                  ? new Date(c.created_at).toLocaleDateString()
                                  : '—'}
                              </p>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
        {!loading && rows.length === 0 && (
          <EmptyState label="No charges match your filters." />
        )}
      </CardContent>
    </Card>
  );
}

function ExpensesTable({
  rows,
  loading,
  onVoid,
  onCorrect,
  onMarkPaid,
}: {
  rows: LedgerEntry[];
  loading: boolean;
  onVoid: (e: LedgerEntry) => void;
  onCorrect: (e: LedgerEntry) => void;
  onMarkPaid: (e: LedgerEntry) => void;
}) {
  return (
    <Card>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-line text-sm">
            <thead className="bg-canvas text-xs uppercase tracking-wider text-ink-3">
              <tr>
                <th className="px-4 py-3 text-left">Date</th>
                <th className="px-4 py-3 text-left">Category</th>
                <th className="px-4 py-3 text-left">Description</th>
                <th className="hidden px-4 py-3 text-left lg:table-cell">
                  Vendor
                </th>
                <th className="px-4 py-3 text-left">Bank</th>
                <th className="hidden px-4 py-3 text-left md:table-cell">
                  Property
                </th>
                <th className="px-4 py-3 text-right">Amount</th>
                <th className="px-4 py-3">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {rows.map((e) => {
                const paidOn = ex(e).paid_on;
                return (
                  <tr
                    key={e.id}
                    className={`hover:bg-canvas ${e.voided ? 'opacity-50' : ''}`}
                  >
                    <td className="whitespace-nowrap px-4 py-3 text-ink-3">
                      {e.effective_date}
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center rounded-full bg-surface-sunken px-2.5 py-0.5 text-xs font-medium text-ink-2">
                        {e.category_display || e.category}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-medium text-ink">
                      {e.description}
                    </td>
                    <td className="hidden px-4 py-3 text-ink-3 lg:table-cell">
                      {e.vendor || '—'}
                    </td>

                    {/* Has the money actually gone? Until paid_on existed, the app
                        conflated "I recorded this bill" with "I paid this bill", which
                        are days or weeks apart in real life. */}
                    <td className="px-4 py-3">
                      {e.voided ? (
                        <span className="text-xs text-ink-4">—</span>
                      ) : paidOn ? (
                        <button
                          type="button"
                          onClick={() => onMarkPaid(e)}
                          title="Change the date it cleared"
                          className="inline-flex items-center gap-1 whitespace-nowrap text-xs text-green-700 hover:underline"
                        >
                          <CheckCircle2 className="h-3.5 w-3.5" /> Paid{' '}
                          {prettyDate(paidOn)}
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => onMarkPaid(e)}
                          title="Mark this as taken from your bank account"
                          className="inline-flex items-center gap-1 whitespace-nowrap rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-medium text-amber-700 hover:bg-amber-100"
                        >
                          <Landmark className="h-3 w-3" /> Not yet taken
                        </button>
                      )}
                    </td>

                    <td className="hidden px-4 py-3 text-ink-3 md:table-cell">
                      {e.property_name || 'Portfolio'}
                    </td>
                    <td className="px-4 py-3 text-right font-medium text-red-600">
                      {money(e.amount)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {!e.voided && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => onMarkPaid(e)}>
                              <Landmark className="mr-2 h-4 w-4" />
                              {paidOn ? 'Change payment date' : 'Mark as paid'}
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => onCorrect(e)}>
                              <Pencil className="mr-2 h-4 w-4" /> Edit (correct)
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="text-red-600"
                              onClick={() => onVoid(e)}
                            >
                              <Ban className="mr-2 h-4 w-4" /> Void
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {!loading && rows.length === 0 && (
          <EmptyState label="No expenses recorded yet." />
        )}
      </CardContent>
    </Card>
  );
}

function EmptyState({ label }: { label: string }) {
  return (
    <div className="p-10 text-center">
      <Receipt className="mx-auto mb-3 h-10 w-10 text-ink-5" />
      <p className="text-sm text-ink-3">{label}</p>
    </div>
  );
}

// --------------------------------------------------------------- dialogs
function RecordPaymentDialog({
  charge,
  token,
  onClose,
  onDone,
}: {
  charge: LedgerEntry;
  token: string;
  onClose: () => void;
  onDone: () => void;
}) {
  const outstanding = charge.outstanding ?? charge.amount;
  const extra = ex(charge);
  const isJoint = Boolean(extra.is_joint);
  const leaseId = extra.lease ?? null;

  const [amount, setAmount] = useState(outstanding);
  const [method, setMethod] = useState<PaymentMethod>('ETRANSFER');
  const [reference, setReference] = useState('');
  const [date, setDate] = useState(today());
  const [busy, setBusy] = useState(false);

  const [leaseTenants, setLeaseTenants] = useState<LeaseTenantOption[]>([]);
  const [paidBy, setPaidBy] = useState<string>(
    extra.tenant ? String(extra.tenant) : ''
  );

  useEffect(() => {
    if (!leaseId) return;
    fetchLeaseTenants(token, leaseId)
      .then((all) =>
        setLeaseTenants(all.filter((lt) => lt.tenant !== null && !lt.declined))
      )
      .catch(() => {
        /* the picker just stays hidden */
      });
  }, [token, leaseId]);

  const showPayerPicker =
    leaseTenants.length > 0 && (isJoint || leaseTenants.length > 1);
  const [key] = useState(() => newIdempotencyKey());

  const submit = async () => {
    setBusy(true);
    try {
      await recordPayment(token, charge.id, {
        amount,
        payment_method: method,
        payment_date: date,
        reference_number: reference,
        idempotency_key: key,
        ...(paidBy ? { tenant: paidBy } : {}),
      } as Parameters<typeof recordPayment>[2]);
      toast.success('Payment recorded.');
      onDone();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : 'Failed to record payment.'
      );
      setBusy(false);
    }
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Record payment</DialogTitle>
          <DialogDescription>
            {charge.description} — {money(charge.amount)} charged,{' '}
            {money(outstanding)} outstanding.
            {isJoint &&
              ' This is a joint household charge: any tenant on the lease can pay toward it, and it clears for everyone once the total is covered.'}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Amount received</Label>
            <Input
              type="number"
              min="0"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </div>
          {showPayerPicker && (
            <div className="space-y-2">
              <Label>Paid by</Label>
              <Select value={paidBy} onValueChange={setPaidBy}>
                <SelectTrigger>
                  <SelectValue placeholder="Which tenant sent this money?" />
                </SelectTrigger>
                <SelectContent>
                  {leaseTenants.map((lt) => (
                    <SelectItem key={lt.id} value={String(lt.tenant)}>
                      {lt.tenant_name || lt.invited_name || lt.invited_email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {isJoint && (
                <p className="text-xs text-ink-3">
                  Recording the payer keeps who-paid-what on the
                  household&apos;s record.
                </p>
              )}
            </div>
          )}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Method</Label>
              <Select
                value={method}
                onValueChange={(v) => setMethod(v as PaymentMethod)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PAYMENT_METHODS.map((m) => (
                    <SelectItem key={m.value} value={m.value}>
                      {m.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Date</Label>
              <Input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Reference (optional)</Label>
            <Input
              placeholder="e-transfer ref, cheque #…"
              value={reference}
              onChange={(e) => setReference(e.target.value)}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button className="" onClick={submit} disabled={busy}>
            {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Record{' '}
            {money(amount)}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// "The hydro bill has now actually left my account."
//
// This is the one thing in the ledger that updates a row instead of posting a new
// one — see LedgerEntry.save() on the backend for the reasoning. It is not an edit
// of what happened; it's the answer to a question that had no answer at the moment
// the entry was written.
function MarkPaidDialog({
  entry,
  token,
  onClose,
  onDone,
}: {
  entry: LedgerEntry;
  token: string;
  onClose: () => void;
  onDone: () => void;
}) {
  const existing = ex(entry).paid_on;
  const [date, setDate] = useState(existing || today());
  const [busy, setBusy] = useState(false);

  const save = async (value: string | null) => {
    setBusy(true);
    try {
      await markExpensePaid(token, entry.id, value);
      toast.success(
        value ? `Marked paid on ${prettyDate(value)}.` : 'Back to unpaid.'
      );
      onDone();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't save that.");
      setBusy(false);
    }
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>When did this leave your account?</DialogTitle>
          <DialogDescription>
            {entry.description} — {money(entry.amount)}.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          <Label className="flex items-center gap-1.5 text-xs">
            <Landmark className="h-3.5 w-3.5 text-ink-4" /> Taken from my
            account on
          </Label>
          <Input
            type="date"
            max={today()}
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
          <p className="text-xs text-ink-3">
            Only this date changes. The amount, the payee and the date you
            incurred it stay exactly as recorded.
          </p>
        </div>

        <DialogFooter className="flex-col-reverse gap-2 sm:flex-row sm:justify-between">
          {existing ? (
            <Button
              variant="ghost"
              className="text-amber-700"
              disabled={busy}
              onClick={() => save(null)}
            >
              Not paid after all
            </Button>
          ) : (
            <span />
          )}
          <div className="flex gap-2">
            <Button variant="ghost" onClick={onClose} disabled={busy}>
              Cancel
            </Button>
            <Button
              className=""
              disabled={busy || !date}
              onClick={() => save(date)}
            >
              {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Save
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function TenantQuickViewDialog({
  tenantId,
  tenantName,
  token,
  leases,
  onOpenLease,
  onClose,
}: {
  tenantId: number | string;
  tenantName: string;
  token: string;
  leases: LeaseLite[];
  onOpenLease: (leaseId: string) => void;
  onClose: () => void;
}) {
  const [entries, setEntries] = useState<LedgerEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      try {
        const res = await fetch(
          `${DJANGO_API_URL}/ledger/entries/?tenant=${tenantId}`,
          {
            headers: { Authorization: `Token ${token}` },
          }
        );
        if (!res.ok)
          throw new Error(`Failed to load tenant ledger (${res.status})`);
        const data = await res.json();
        const list: LedgerEntry[] = Array.isArray(data)
          ? data
          : (data.results ?? []);
        if (!cancelled) setEntries(list);
      } catch (err) {
        if (!cancelled)
          toast.error(
            err instanceof Error
              ? err.message
              : 'Failed to load tenant details.'
          );
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [token, tenantId]);

  const openStatuses: ChargeStatus[] = [
    'SCHEDULED',
    'DUE',
    'OVERDUE',
    'PARTIALLY_PAID',
  ];
  const openCharges = entries.filter(
    (e) =>
      e.charge_status && openStatuses.includes(e.charge_status as ChargeStatus)
  );
  const outstanding = openCharges.reduce(
    (s, e) => s + Number(e.outstanding ?? 0),
    0
  );
  const overdueCount = openCharges.filter(
    (e) => e.charge_status === 'OVERDUE'
  ).length;
  const payments = entries
    .filter((e) => e.entry_type === 'PAYMENT' && !e.voided)
    .sort((a, b) => (a.effective_date < b.effective_date ? 1 : -1));
  const properties = Array.from(
    new Set(entries.map((e) => e.property_name).filter(Boolean))
  ) as string[];
  const leaseIds = Array.from(
    new Set(entries.map((e) => ex(e).lease).filter(Boolean))
  ) as string[];
  const leaseById = new Map(leases.map((l) => [String(l.id), l]));

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand text-sm text-white">
              {tenantName.charAt(0).toUpperCase()}
            </span>
            {tenantName}
          </DialogTitle>
          <DialogDescription>
            {properties.length > 0
              ? `Lives at ${properties.join(', ')}`
              : 'Tenant on your ledger'}
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin text-ink-4" />
          </div>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-md border p-3">
                <p className="text-xs text-ink-3">Outstanding</p>
                <p
                  className={`text-lg font-semibold ${outstanding > 0 ? 'text-amber-600' : 'text-green-600'}`}
                >
                  {money(outstanding)}
                </p>
                <p className="text-xs text-ink-4">
                  {openCharges.length} open charge(s)
                  {overdueCount > 0 ? ` · ${overdueCount} overdue` : ''}
                </p>
              </div>
              <div className="rounded-md border p-3">
                <p className="text-xs text-ink-3">Payments recorded</p>
                <p className="text-lg font-semibold">{payments.length}</p>
                <p className="text-xs text-ink-4">
                  {payments[0]
                    ? `last on ${payments[0].effective_date}`
                    : 'none yet'}
                </p>
              </div>
            </div>

            {leaseIds.length > 0 && (
              <div>
                <p className="mb-1.5 text-xs font-medium text-ink-3">Leases</p>
                <div className="space-y-1.5">
                  {leaseIds.map((id) => {
                    const l = leaseById.get(String(id));
                    return (
                      <button
                        key={id}
                        type="button"
                        onClick={() => onOpenLease(id)}
                        className="flex w-full items-center justify-between rounded-md border p-2.5 text-left text-sm hover:bg-canvas"
                      >
                        <span className="min-w-0 truncate">
                          <span className="font-medium">
                            {l
                              ? l.property_name ||
                                l.group_name ||
                                l.lease_number
                              : 'Lease'}
                          </span>
                          {l && (
                            <span className="text-ink-4">
                              {' '}
                              · {l.lease_number}
                              {l.status ? ` · ${l.status}` : ''}
                            </span>
                          )}
                        </span>
                        <ExternalLink className="ml-2 h-3.5 w-3.5 flex-shrink-0 text-ink-4" />
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            <div>
              <p className="mb-1.5 text-xs font-medium text-ink-3">
                Recent payments
              </p>
              {payments.length === 0 ? (
                <p className="text-sm text-ink-4">No payments recorded yet.</p>
              ) : (
                <ul className="divide-y rounded-md border">
                  {payments.slice(0, 5).map((p) => (
                    <li
                      key={p.id}
                      className="flex items-center justify-between p-2.5 text-sm"
                    >
                      <span className="text-ink-2">
                        {p.effective_date}
                        <span className="text-ink-4">
                          {' '}
                          · {p.payment_method || 'Payment'}
                        </span>
                      </span>
                      <span className="font-medium">{money(p.amount)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function CreditDialog({
  charge,
  token,
  onClose,
  onDone,
}: {
  charge: LedgerEntry;
  token: string;
  onClose: () => void;
  onDone: () => void;
}) {
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [key] = useState(() => newIdempotencyKey());

  const submit = async () => {
    setBusy(true);
    try {
      await postCredit(token, charge.id, {
        amount,
        reason,
        idempotency_key: key,
      });
      toast.success('Credit applied.');
      onDone();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : 'Failed to apply credit.'
      );
      setBusy(false);
    }
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Credit / discount</DialogTitle>
          <DialogDescription>
            Applies a credit against “{charge.description}”. The original{' '}
            {money(charge.amount)} charge stays on record — that&apos;s the
            audit truth: rent was X, you credited Y.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Credit amount</Label>
            <Input
              type="number"
              min="0"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Reason</Label>
            <Input
              placeholder="e.g. goodwill, referral discount"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button className="" onClick={submit} disabled={busy || !amount}>
            {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Apply
            credit
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function VoidDialog({
  entry,
  token,
  onClose,
  onDone,
}: {
  entry: LedgerEntry;
  token: string;
  onClose: () => void;
  onDone: () => void;
}) {
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setBusy(true);
    try {
      await voidEntry(token, entry.id, reason);
      toast.success('Entry voided.');
      onDone();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to void entry.');
      setBusy(false);
    }
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Void this entry?</DialogTitle>
          <DialogDescription>
            This posts a reversing entry for “{entry.description}” (
            {money(entry.amount)}). Nothing is deleted — the original and the
            reversal both stay on the ledger.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          <Label>Reason (goes on the record)</Label>
          <Textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="e.g. duplicate, entered in error"
          />
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button
            className="bg-red-600 hover:bg-red-700"
            onClick={submit}
            disabled={busy || !reason.trim()}
          >
            {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Void
            entry
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function CorrectDialog({
  entry,
  token,
  onClose,
  onDone,
}: {
  entry: LedgerEntry;
  token: string;
  onClose: () => void;
  onDone: () => void;
}) {
  const isExpense = entry.entry_type === 'EXPENSE';
  const [amount, setAmount] = useState(entry.amount);
  const [description, setDescription] = useState(entry.description);
  const [vendor, setVendor] = useState(entry.vendor);
  const [dueDate, setDueDate] = useState(entry.due_date ?? '');
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setBusy(true);
    try {
      await correctEntry(token, entry.id, {
        amount,
        description,
        ...(isExpense ? { vendor } : {}),
        ...(entry.due_date ? { due_date: dueDate } : {}),
        reason: 'Edited by landlord',
      });
      toast.success('Entry corrected.');
      onDone();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : 'Failed to correct entry.'
      );
      setBusy(false);
    }
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit entry</DialogTitle>
          <DialogDescription>
            Behind the scenes this voids the old entry and posts a corrected
            one, so the history stays intact.{' '}
            {isExpense && "If you'd already marked it as paid, it stays paid."}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Amount</Label>
            <Input
              type="number"
              min="0"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Description</Label>
            <Input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
          {isExpense && (
            <div className="space-y-2">
              <Label>Vendor</Label>
              <Input
                value={vendor}
                onChange={(e) => setVendor(e.target.value)}
              />
            </div>
          )}
          {entry.due_date && (
            <div className="space-y-2">
              <Label>Due date</Label>
              <Input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
              />
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button className="" onClick={submit} disabled={busy}>
            {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Save
            changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ExpenseDialog({
  open,
  token,
  properties,
  onClose,
  onDone,
}: {
  open: boolean;
  token: string;
  properties: PropertyLite[];
  onClose: () => void;
  onDone: () => void;
}) {
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState<ExpenseCategory>('MAINTENANCE');
  const [description, setDescription] = useState('');
  const [vendor, setVendor] = useState('');
  const [property, setProperty] = useState<string>('portfolio');
  const [date, setDate] = useState(today());
  const [paidOn, setPaidOn] = useState<string>('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    setAmount('');
    setCategory('MAINTENANCE');
    setDescription('');
    setVendor('');
    setProperty('portfolio');
    setDate(today());
    setPaidOn('');
  }, [open]);

  const submit = async () => {
    setBusy(true);
    try {
      await postExpense(token, {
        amount,
        category,
        description,
        vendor,
        incurred_date: date,
        property: property === 'portfolio' ? undefined : property,
        paid_on: paidOn || null,
        idempotency_key: newIdempotencyKey(),
      });
      toast.success(
        paidOn ? 'Expense recorded and marked paid.' : 'Expense recorded.'
      );
      onDone();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : 'Failed to record expense.'
      );
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add expense</DialogTitle>
          <DialogDescription>
            Money out — books an expense entry on the ledger.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Amount</Label>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Date incurred</Label>
              <Input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Category</Label>
            <Select
              value={category}
              onValueChange={(v) => setCategory(v as ExpenseCategory)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {EXPENSE_CATEGORIES.map((c) => (
                  <SelectItem key={c.value} value={c.value}>
                    {c.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Description</Label>
            <Input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. Furnace annual service"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Vendor (optional)</Label>
              <Input
                value={vendor}
                onChange={(e) => setVendor(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Property</Label>
              <Select value={property} onValueChange={setProperty}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="portfolio">Portfolio-wide</SelectItem>
                  {properties.map((p) => (
                    <SelectItem key={p.id} value={String(p.id)}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Two different dates, and they are genuinely different: the date you
              incurred the cost is when the work was done or the bill was issued; this
              is when the money actually left. Conflating them is how a landlord ends
              up unable to reconcile against a bank statement. */}
          <div
            className="space-y-2 rounded-lg border p-3.5"
            style={{ borderColor: 'hsl(var(--line))' }}
          >
            <Label className="flex items-center gap-1.5 text-xs">
              <Landmark className="h-3.5 w-3.5 text-ink-4" /> Taken from my
              account on
            </Label>
            <Input
              type="date"
              max={today()}
              value={paidOn}
              onChange={(e) => setPaidOn(e.target.value)}
            />
            <p className="text-xs text-ink-3">
              {paidOn
                ? `Recorded as paid on ${prettyDate(paidOn)}.`
                : 'Leave blank if it hasn\'t cleared yet — it\'ll show as "Not yet taken", and you can mark it paid later.'}
            </p>
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button
            className=""
            onClick={submit}
            disabled={busy || !amount || !description}
          >
            {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Record
            expense
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// A SIDE SHEET, not a modal.
//
// The old dialog's contents genuinely broke out of it, and no amount of
// max-height patching would have fixed that, because the cause is structural: a
// centred modal sizes itself to its content, so a form with two Selects (whose
// items are long lease labels), a live preview panel, four date fields and a
// nested expense block has nowhere to go but out.
//
// A sheet is a fixed-height column — header, scrolling body, pinned footer. The
// body scrolls; the Post button never moves. It keeps the one thing that was
// actually good about the modal: open it, add the bill, close it, no page reload.
function UtilityBillSheet({
  open,
  token,
  leases,
  onClose,
  onDone,
}: {
  open: boolean;
  token: string;
  leases: LeaseLite[];
  onClose: () => void;
  onDone: () => void;
}) {
  const activeLeases = useMemo(
    () => leases.filter((l) => l.status === 'ACTIVE'),
    [leases]
  );

  const [lease, setLease] = useState('');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [periodStart, setPeriodStart] = useState('');
  const [periodEnd, setPeriodEnd] = useState('');
  const [recordExpense, setRecordExpense] = useState(true);
  const [vendor, setVendor] = useState('');
  const [paidOn, setPaidOn] = useState('');
  const [busy, setBusy] = useState(false);

  const [billing, setBilling] = useState<LeaseBillingInfo | null>(null);
  const [billKey, setBillKey] = useState<string>('other');
  const [loadingBills, setLoadingBills] = useState(false);

  useEffect(() => {
    if (!open) return;
    setLease('');
    setAmount('');
    setDescription('');
    setPeriodStart('');
    setPeriodEnd('');
    setRecordExpense(true);
    setVendor('');
    setPaidOn('');
    setBilling(null);
    setBillKey('other');
  }, [open]);

  useEffect(() => {
    if (!lease) {
      setBilling(null);
      setBillKey('other');
      return;
    }
    let cancelled = false;
    setLoadingBills(true);
    fetchLeaseBillingInfo(token, lease)
      .then((info) => {
        if (cancelled) return;
        setBilling(info);
        const keys = Object.keys(info.bills_included || {});
        setBillKey(keys.length > 0 ? keys[0] : 'other');
      })
      .catch(() => {
        if (!cancelled) {
          setBilling(null);
          setBillKey('other');
        }
      })
      .finally(() => {
        if (!cancelled) setLoadingBills(false);
      });
    return () => {
      cancelled = true;
    };
  }, [token, lease]);

  const selectedBill =
    billKey !== 'other' ? billing?.bills_included?.[billKey] : undefined;

  useEffect(() => {
    if (selectedBill?.provider) {
      setDescription(selectedBill.provider);
      setVendor((v) => v || selectedBill.provider || '');
    }
  }, [billKey]); // eslint-disable-line react-hooks/exhaustive-deps

  const responsibilitySummary = (
    cfg: NonNullable<typeof selectedBill>
  ): string => {
    if (cfg.included) return 'included in rent — tenants owe $0';
    const r = cfg.tenant_responsibility;
    if (!r || r.type === 'none')
      return 'no tenant responsibility — tenants owe $0';
    if (r.type === 'full') return 'tenants pay 100%';
    if (r.type === 'percentage') return `tenants pay ${r.value ?? 0}%`;
    if (r.type === 'fixed') return `tenants pay $${r.value ?? 0} fixed`;
    return '';
  };

  const total = parseFloat(amount);
  const tenantShare = (() => {
    if (!amount || isNaN(total)) return null;
    if (billKey === 'other' || !selectedBill) return total;
    if (selectedBill.included) return 0;
    const r = selectedBill.tenant_responsibility;
    if (!r || r.type === 'none') return 0;
    if (r.type === 'full') return total;
    if (r.type === 'percentage')
      return Math.round(total * (r.value ?? 0)) / 100;
    if (r.type === 'fixed') return Math.min(r.value ?? 0, total);
    return total;
  })();

  const submit = async () => {
    setBusy(true);
    try {
      const entries = await splitUtilityBill(token, {
        lease,
        total_amount: amount,
        period_start: periodStart,
        period_end: periodEnd,
        description,
        record_landlord_expense: recordExpense,
        vendor,
        ...(billKey !== 'other' ? { bill_key: billKey } : {}),
      });

      // splitUtilityBill posts the expense as part of the same call, so the
      // paid_on stamp is a follow-up. If it fails, the bill is still posted —
      // say so precisely rather than implying nothing happened.
      if (recordExpense && paidOn) {
        const expense = entries.find((e) => e.entry_type === 'EXPENSE');
        if (expense) {
          try {
            await markExpensePaid(token, expense.id, paidOn);
          } catch {
            toast.warning(
              "Bill posted, but the payment date didn't save. Set it from the Expenses tab."
            );
          }
        }
      }

      const charges = entries.filter((e) => e.entry_type !== 'EXPENSE');
      if (charges.length === 0) {
        toast.success(
          'No tenant charge — under this lease the bill is your cost. ' +
            (recordExpense
              ? 'Your expense was recorded.'
              : 'Nothing was recorded.')
        );
      } else if (charges.length === 1 && ex(charges[0]).is_joint) {
        toast.success(
          `Tenant share ${money(charges[0].amount)} posted as one household charge — any tenant on the lease can pay it.`
        );
      } else {
        toast.success(
          `Tenant share split across ${charges.length} tenant(s) by days occupied.`
        );
      }
      onDone();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : 'Failed to post utility bill.'
      );
      setBusy(false);
    }
  };

  const valid = lease && amount && periodStart && periodEnd && description;

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent
        side="right"
        className="flex w-full flex-col gap-0 p-0 sm:max-w-md"
      >
        <SheetHeader
          className="border-b px-6 py-4 text-left"
          style={{ borderColor: 'hsl(var(--line))' }}
        >
          <SheetTitle className="flex items-center gap-2">
            <Zap className="h-4 w-4 text-brand" /> Add utility bill
          </SheetTitle>
          <SheetDescription>
            Enter the <strong>full</strong> bill amount. Tenants are charged
            only their share per the lease&apos;s own terms — the rest is your
            cost.
          </SheetDescription>
        </SheetHeader>

        {/* The body. The only thing that scrolls. */}
        <div className="flex-1 space-y-5 overflow-y-auto px-6 py-5">
          <div className="space-y-2">
            <Label>Lease</Label>
            <Select value={lease} onValueChange={setLease}>
              <SelectTrigger className="w-full [&>span]:truncate [&>span]:text-left">
                <SelectValue placeholder="Select an active lease" />
              </SelectTrigger>
              <SelectContent className="max-w-[min(90vw,24rem)]">
                {activeLeases.length === 0 && (
                  <div className="px-2 py-3 text-sm text-ink-4">
                    No active leases.
                  </div>
                )}
                {activeLeases.map((l) => (
                  <SelectItem
                    key={l.id}
                    value={l.id}
                    className="whitespace-normal break-words"
                  >
                    {leaseLabel(l)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {lease && (
            <div className="space-y-2">
              <Label className="flex items-center gap-1.5">
                Which utility?
                {loadingBills && (
                  <Loader2 className="h-3 w-3 animate-spin text-ink-4" />
                )}
              </Label>
              <Select value={billKey} onValueChange={setBillKey}>
                <SelectTrigger className="w-full [&>span]:truncate [&>span]:text-left">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="max-w-[min(90vw,24rem)]">
                  {Object.entries(billing?.bills_included || {}).map(
                    ([key, cfg]) => (
                      <SelectItem
                        key={key}
                        value={key}
                        className="whitespace-normal break-words"
                      >
                        {cfg.provider || key} — {responsibilitySummary(cfg)}
                      </SelectItem>
                    )
                  )}
                  <SelectItem value="other">
                    Other / one-off (tenants billed in full)
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-2">
            <Label>Total bill amount</Label>
            <Input
              type="number"
              min="0"
              step="0.01"
              inputMode="decimal"
              placeholder="0.00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </div>

          {tenantShare !== null && !isNaN(total) && (
            <div
              className={`rounded-lg border p-3 text-sm ${
                tenantShare === 0
                  ? 'border-blue-200 bg-blue-50 text-blue-800'
                  : 'border-line bg-canvas text-ink-2'
              }`}
            >
              {tenantShare === 0 ? (
                <>
                  Tenants will be charged <strong>$0.00</strong> — under this
                  lease the bill is your cost
                  {recordExpense ? '; only your expense is recorded' : ''}.
                </>
              ) : (
                <>
                  Tenants will be charged <strong>{money(tenantShare)}</strong>
                  {Number(tenantShare) < total && (
                    <>
                      {' '}
                      — you cover the remaining{' '}
                      <strong>{money(total - Number(tenantShare))}</strong>
                    </>
                  )}
                  .
                </>
              )}
            </div>
          )}

          <div className="space-y-2">
            <Label>Description</Label>
            <Input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. BC Hydro"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Period start</Label>
              <Input
                type="date"
                value={periodStart}
                onChange={(e) => setPeriodStart(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Period end</Label>
              <Input
                type="date"
                value={periodEnd}
                onChange={(e) => setPeriodEnd(e.target.value)}
              />
            </div>
          </div>

          <div
            className="rounded-lg border p-3.5"
            style={{ borderColor: 'hsl(var(--line))' }}
          >
            <label className="flex cursor-pointer items-start gap-2.5 text-sm">
              <input
                type="checkbox"
                className="mt-0.5 accent-[hsl(var(--brand))]"
                checked={recordExpense}
                onChange={(e) => setRecordExpense(e.target.checked)}
              />
              <span>
                <span className="font-medium text-ink">
                  Record the full amount as my expense
                </span>
                <span className="mt-0.5 block text-xs text-ink-3">
                  Providers usually auto-debit you, and the tenants send you
                  their share afterwards. Uncheck only if this bill isn&apos;t
                  yours to pay.
                </span>
              </span>
            </label>

            {recordExpense && (
              <div
                className="mt-4 space-y-3 border-t pt-3.5"
                style={{ borderColor: 'hsl(var(--line))' }}
              >
                <div className="space-y-2">
                  <Label className="flex items-center gap-1.5 text-xs">
                    <Landmark className="h-3.5 w-3.5 text-ink-4" /> Taken from
                    my account on
                  </Label>
                  <Input
                    type="date"
                    max={today()}
                    value={paidOn}
                    onChange={(e) => setPaidOn(e.target.value)}
                  />
                  <p className="text-xs text-ink-3">
                    {paidOn
                      ? `Recorded as paid on ${prettyDate(paidOn)}.`
                      : 'Leave blank if it hasn\'t cleared yet — it\'ll show as "Not yet taken", and you can mark it paid later.'}
                  </p>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">Vendor (optional)</Label>
                  <Input
                    value={vendor}
                    onChange={(e) => setVendor(e.target.value)}
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        <SheetFooter
          className="flex-row justify-end gap-2 border-t px-6 py-4"
          style={{ borderColor: 'hsl(var(--line))' }}
        >
          <Button variant="ghost" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button className="" onClick={submit} disabled={busy || !valid}>
            {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Post
            bill
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
