// page.tsx
// The landlord command center. Fixes v1's fatal flaw (one failed fetch —
// e.g. the appointments endpoint not wired yet — nuked the whole page via
// Promise.all) and goes much further:
//   - per-month money strip (expected / collected / overdue / visits)
//   - viewing REQUESTS from the public booking page, confirm/decline inline
//   - day panel shows who's renting that day (occupancy), everything due,
//     and quick actions: schedule a visit, ADD AN EXPENSE on that day, or
//     ADD A UTILITY BILL for a period picked right on the grid
//     (click day -> "extend to a period" -> click the end day)
//   - per-property public booking link with copy button
//   - dots on phones, chips on desktop; fully responsive.
'use client';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  ArrowLeft,
  CalendarClock,
  CalendarDays,
  Check,
  Copy,
  DollarSign,
  ExternalLink,
  Link2,
  Loader2,
  Plus,
  Receipt,
  UserRound,
  X,
  Zap,
} from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import {
  RentiumCalendar,
  KIND_STYLES,
  appointmentToEvent,
  chargeToEvent,
  monthKey,
  paymentToEvent,
  type CalEvent,
} from '@/components/calendar/RentiumCalendar';
import {
  fetchEntries,
  fetchLeasesLite,
  fetchProperties,
  postExpense,
  splitUtilityBill,
  fetchLeaseBillingInfo,
  EXPENSE_CATEGORIES,
  type ExpenseCategory,
  type LeaseBillingInfo,
  type LeaseLite,
  type LedgerEntry,
  type PropertyLite,
} from '@/lib/financeApi';
import {
  cancelAppointment,
  confirmAppointment,
  counterAppointment,
  createAppointment,
  declineAppointment,
  listAppointments,
  type Appointment,
  type AppointmentKind,
} from '@/lib/appointmentsApi';
import { fetchAttention, type ActionItem } from '@/lib/attentionApi';

const money = (v: number) =>
  `$${v.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
const fmtDay = (iso: string) =>
  new Date(`${iso}T00:00:00`).toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });
const fmtShort = (iso: string) =>
  new Date(`${iso}T00:00:00`).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });

const LEGEND: { kind: keyof typeof KIND_STYLES; label: string }[] = [
  { kind: 'RENT_DUE', label: 'Rent due' },
  { kind: 'CHARGE_DUE', label: 'Other charge' },
  { kind: 'PAYMENT', label: 'Payment in' },
  { kind: 'APPOINTMENT', label: 'Visit / viewing' },
  { kind: 'VIEWING_REQUEST', label: 'Viewing request' },
  { kind: 'MOVE_IN', label: 'Move-in' },
  { kind: 'MOVE_OUT', label: 'Move-out' },
  { kind: 'DEADLINE', label: 'Deadline' },
];

type PanelAction = null | 'schedule' | 'expense' | 'utility';

export default function LandlordCalendarPage() {
  const router = useRouter();
  const { token } = useAuth();
  const now = new Date();
  const [month, setMonth] = useState({
    year: now.getFullYear(),
    month: now.getMonth(),
  });
  const [properties, setProperties] = useState<PropertyLite[]>([]);
  const [leases, setLeases] = useState<LeaseLite[]>([]);
  const [entries, setEntries] = useState<LedgerEntry[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [attentionItems, setAttentionItems] = useState<ActionItem[]>([]);
  const [propertyFilter, setPropertyFilter] = useState<string>('all');
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<string | null>(null);
  const [rangeEnd, setRangeEnd] = useState<string | null>(null);
  const [pickingRange, setPickingRange] = useState(false);
  const [action, setAction] = useState<PanelAction>(null);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  // countering a viewing request with a different time
  const [counterId, setCounterId] = useState<string | null>(null);
  const [counterWhen, setCounterWhen] = useState('');
  // schedule form
  const [schedKind, setSchedKind] = useState<AppointmentKind>('VIEWING');
  const [schedTime, setSchedTime] = useState('10:00');
  const [schedProp, setSchedProp] = useState<string>('');
  const [schedWho, setSchedWho] = useState('');
  // expense form
  const [expAmount, setExpAmount] = useState('');
  const [expCategory, setExpCategory] =
    useState<ExpenseCategory>('MAINTENANCE');
  const [expDesc, setExpDesc] = useState('');
  const [expProp, setExpProp] = useState<string>('');
  // utility form
  const [utilLease, setUtilLease] = useState('');
  const [utilAmount, setUtilAmount] = useState('');
  const [utilDesc, setUtilDesc] = useState('');
  const [utilBilling, setUtilBilling] = useState<LeaseBillingInfo | null>(null);
  const [utilKey, setUtilKey] = useState('other');

  // ---- resilient loading: each source degrades independently -----------
  const load = useCallback(async () => {
    if (!token) return;
    const [props, ls, ents, appts, att] = await Promise.all([
      fetchProperties(token).catch(() => [] as PropertyLite[]),
      fetchLeasesLite(token).catch(() => [] as LeaseLite[]),
      fetchEntries(token, {}).catch(() => [] as LedgerEntry[]),
      listAppointments(token, {}).catch(() => [] as Appointment[]),
      // Action Center deadlines (inspections due, report delivery, …).
      // Endpoint ships with backend Phase B; until then this is just [].
      fetchAttention(token).catch(() => [] as ActionItem[]),
    ]);
    setProperties(props);
    setLeases(ls);
    setEntries(ents);
    setAppointments(appts);
    setAttentionItems(att);
    setLoading(false);
  }, [token]);
  useEffect(() => {
    load();
  }, [load]);

  const activeLeases = useMemo(
    () => leases.filter((l) => l.status === 'ACTIVE'),
    [leases]
  );
  const propId = propertyFilter === 'all' ? null : Number(propertyFilter);
  const propName =
    propId != null
      ? (properties.find((p) => p.id === propId)?.name ?? null)
      : null;

  // ---- events -----------------------------------------------------------
  const events: CalEvent[] = useMemo(() => {
    const evts: CalEvent[] = [];
    for (const e of entries) {
      if (propId != null && e.property !== propId) continue;
      const ce =
        e.entry_type === 'PAYMENT' ? paymentToEvent(e) : chargeToEvent(e);
      if (ce) evts.push(ce);
    }
    for (const a of appointments) {
      if (propId != null && a.property !== propId) continue;
      const ce = appointmentToEvent(a);
      if (ce) evts.push(ce);
    }
    for (const l of leases) {
      if (l.status !== 'ACTIVE' && l.status !== 'PENDING') continue;
      if (propName && l.property_name !== propName) continue;
      const who = l.primary_tenant_name || `${l.tenant_count ?? ''} tenant(s)`;
      const place = l.property_name || l.group_name || l.lease_number;
      if (l.start_date) {
        evts.push({
          id: `min-${l.id}`,
          date: l.start_date,
          kind: 'MOVE_IN',
          label: `Move-in · ${place}`,
          detail: `${who} moves into ${place} (${l.lease_number})`,
          href: `/dashboard/leases/${l.id}`,
        });
      }
      if (l.end_date && !l.is_month_to_month) {
        evts.push({
          id: `mout-${l.id}`,
          date: l.end_date,
          kind: 'MOVE_OUT',
          label: `Move-out · ${place}`,
          detail: `${who} — tenancy at ${place} ends (${l.lease_number}); vacate by 1 p.m.`,
          href: `/dashboard/leases/${l.id}`,
        });
      }
    }
    for (const item of attentionItems) {
      if (!item.due_date) continue; // undated items live on the dashboard card
      evts.push({
        id: `att-${item.key}`,
        date: item.due_date,
        kind: 'DEADLINE',
        label: item.title,
        detail: item.detail,
        href: item.url,
      });
    }
    return evts;
  }, [entries, appointments, leases, attentionItems, propId, propName]);

  // ---- month money strip --------------------------------------------------
  const mk = `${month.year}-${`${month.month + 1}`.padStart(2, '0')}`;
  const strip = useMemo(() => {
    let expected = 0,
      collected = 0,
      overdue = 0;
    for (const e of events) {
      if (monthKey(e.date) !== mk) continue;
      if (e.kind === 'RENT_DUE' || e.kind === 'CHARGE_DUE') {
        expected += e.amount ?? 0;
        if (e.status === 'OVERDUE') overdue += 1;
      } else if (e.kind === 'PAYMENT') collected += e.amount ?? 0;
    }
    return { expected, collected, overdue };
  }, [events, mk]);

  // ---- viewing requests rail ---------------------------------------------
  const requests = useMemo(
    () =>
      appointments.filter(
        (a) =>
          (a.status === 'REQUESTED' || a.status === 'AWAITING_REQUESTER') &&
          (propId == null || a.property === propId)
      ),
    [appointments, propId]
  );

  // ---- who's renting on the selected day ----------------------------------
  const occupancy = useMemo(() => {
    if (!selected) return [];
    return activeLeases.filter((l) => {
      if (propName && l.property_name !== propName) return false;
      if (l.start_date && selected < l.start_date) return false;
      if (!l.is_month_to_month && l.end_date && selected > l.end_date)
        return false;
      return true;
    });
  }, [selected, activeLeases, propName]);

  const dayEvents = selected ? events.filter((e) => e.date === selected) : [];
  const apptIdFromEvent = (id: string) =>
    id.startsWith('apt-') ? id.slice(4) : null;
  // Full appointment lookup: the landlord's day panel shows WHO is coming
  // (name, email, phone, notes) — not just "a viewing exists".
  const apptById = useMemo(
    () => new Map(appointments.map((a) => [a.id, a])),
    [appointments]
  );

  // ---- this month's visits (the clickable "Visits scheduled" tile) --------
  const [showVisits, setShowVisits] = useState(false);
  const monthVisits = useMemo(
    () =>
      appointments
        .filter(
          (a) =>
            a.status === 'SCHEDULED' &&
            monthKey(a.starts_at.slice(0, 10)) === mk &&
            (propId == null || a.property === propId)
        )
        .sort((a, b) => a.starts_at.localeCompare(b.starts_at)),
    [appointments, mk, propId]
  );

  // ---- day / range interaction --------------------------------------------
  const handleDayClick = (day: string, shift: boolean) => {
    if (!selected) {
      setSelected(day);
      setRangeEnd(null);
      setAction(null);
      return;
    }
    if (shift || (rangeEnd === null && day > selected)) {
      // extend into a range
      if (day < selected) {
        setRangeEnd(selected);
        setSelected(day);
      } else {
        setRangeEnd(day);
      }
      setAction(null);
      return;
    }
    if (day === selected && !rangeEnd) {
      setSelected(null);
      setAction(null);
      return;
    }
    setSelected(day);
    setRangeEnd(null);
    setAction(null);
  };

  const isRange = Boolean(rangeEnd && rangeEnd !== selected);
  const rangeDays =
    selected && rangeEnd
      ? Math.round(
          (new Date(rangeEnd).getTime() - new Date(selected).getTime()) /
            86400000
        ) + 1
      : 1;

  // ---- action submitters ----------------------------------------------------
  const run = async (fn: () => Promise<unknown>, okMsg: string) => {
    setBusy(true);
    try {
      await fn();
      toast.success(okMsg);
      setAction(null);
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Action failed.');
    } finally {
      setBusy(false);
    }
  };

  const quickSchedule = () =>
    run(async () => {
      const lease = activeLeases.find(
        (l) =>
          l.property_name ===
          properties.find((p) => String(p.id) === schedProp)?.name
      );
      await createAppointment(token!, {
        property: Number(schedProp),
        lease: lease?.id ?? null,
        kind: schedKind,
        starts_at: new Date(`${selected}T${schedTime}:00`).toISOString(),
        contact_name: schedWho,
      });
      setSchedWho('');
    }, 'Scheduled — tenants on the property are notified (their entry notice).');

  const quickExpense = () =>
    run(
      async () => {
        await postExpense(token!, {
          amount: expAmount,
          category: expCategory,
          description: expDesc,
          incurred_date: selected!,
          property: expProp || undefined,
        });
        setExpAmount('');
        setExpDesc('');
      },
      `Expense recorded on ${fmtShort(selected!)}.`
    );

  // load lease billing config when the utility lease changes
  useEffect(() => {
    if (!token || !utilLease) {
      setUtilBilling(null);
      setUtilKey('other');
      return;
    }
    let dead = false;
    fetchLeaseBillingInfo(token, utilLease)
      .then((info) => {
        if (dead) return;
        setUtilBilling(info);
        const keys = Object.keys(info.bills_included || {});
        setUtilKey(keys[0] ?? 'other');
        const first = keys[0] ? info.bills_included[keys[0]] : null;
        if (first?.provider) setUtilDesc(first.provider);
      })
      .catch(() => {
        if (!dead) {
          setUtilBilling(null);
          setUtilKey('other');
        }
      });
    return () => {
      dead = true;
    };
  }, [token, utilLease]);

  const quickUtility = () =>
    run(async () => {
      await splitUtilityBill(token!, {
        lease: utilLease,
        total_amount: utilAmount,
        period_start: selected!,
        period_end: rangeEnd || selected!,
        description: utilDesc || 'Utility bill',
        record_landlord_expense: true,
        ...(utilKey !== 'other' ? { bill_key: utilKey } : {}),
      });
      setUtilAmount('');
      setUtilDesc('');
      setRangeEnd(null);
    }, 'Utility bill posted for the selected period (your expense recorded too).');

  const bookingLink =
    typeof window !== 'undefined' && propId != null
      ? `${window.location.origin}/viewing/${propId}`
      : null;

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="container max-w-6xl py-4 sm:py-6 px-3 sm:px-6 space-y-4">
      {/* header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-xl sm:text-2xl font-semibold text-slate-900 flex items-center gap-2">
              <CalendarDays className="h-6 w-6 text-teal-600" /> Calendar
            </h1>
          </div>
        </div>
        <Select
          value={propertyFilter}
          onValueChange={(v) => {
            setPropertyFilter(v);
            setSelected(null);
            setRangeEnd(null);
          }}
        >
          <SelectTrigger className="w-full sm:w-64">
            <SelectValue />
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
      </div>

      {/* month money strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3">
        {[
          {
            label: 'Expected this month',
            value: money(strip.expected),
            icon: DollarSign,
            cls: 'text-slate-700',
            onClick: undefined as (() => void) | undefined,
            active: false,
          },
          {
            label: 'Collected',
            value: money(strip.collected),
            icon: Check,
            cls: 'text-teal-600',
            onClick: undefined,
            active: false,
          },
          {
            label: 'Overdue charges',
            value: String(strip.overdue),
            icon: Receipt,
            cls: strip.overdue ? 'text-red-600' : 'text-slate-700',
            onClick: undefined,
            active: false,
          },
          {
            label: 'Visits scheduled',
            value: String(monthVisits.length),
            icon: UserRound,
            cls: 'text-indigo-600',
            // The number answers "how many"; clicking answers "who, when,
            // where" — the list expands right below.
            onClick:
              monthVisits.length > 0
                ? () => setShowVisits((v) => !v)
                : undefined,
            active: showVisits,
          },
        ].map((s) => (
          <Card
            key={s.label}
            className={
              s.active ? 'ring-2 ring-indigo-300' : s.onClick ? '' : undefined
            }
          >
            <CardContent
              role={s.onClick ? 'button' : undefined}
              tabIndex={s.onClick ? 0 : undefined}
              onClick={s.onClick}
              onKeyDown={(e) => {
                if (s.onClick && (e.key === 'Enter' || e.key === ' ')) {
                  e.preventDefault();
                  s.onClick();
                }
              }}
              className={`p-3 sm:p-4 flex items-center gap-3 ${
                s.onClick
                  ? 'cursor-pointer select-none hover:bg-slate-50 transition-colors rounded-xl'
                  : ''
              }`}
            >
              <s.icon className={`h-4 w-4 flex-shrink-0 ${s.cls}`} />
              <div className="min-w-0">
                <p className={`text-lg font-semibold leading-tight ${s.cls}`}>
                  {s.value}
                </p>
                <p className="text-[11px] text-slate-500 truncate">
                  {s.label}
                  {s.onClick ? ' — tap to see who' : ''}
                </p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* who's visiting this month (opens from the tile above) */}
      {showVisits && monthVisits.length > 0 && (
        <Card className="border-indigo-200 bg-indigo-50/40">
          <CardContent className="p-3 sm:p-4 space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-indigo-800">
                {monthVisits.length} visit
                {monthVisits.length === 1 ? '' : 's'} this month
              </p>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={() => setShowVisits(false)}
              >
                <X className="h-3.5 w-3.5" />
              </Button>
            </div>
            <ul className="divide-y divide-indigo-100">
              {monthVisits.map((a) => (
                <li key={a.id}>
                  <button
                    type="button"
                    className="w-full py-2 text-left flex flex-wrap items-center justify-between gap-2 text-sm hover:bg-white/60 rounded-md px-1.5 transition-colors"
                    onClick={() => {
                      setSelected(a.starts_at.slice(0, 10));
                      setRangeEnd(null);
                      setAction(null);
                    }}
                  >
                    <span className="min-w-0">
                      <span className="font-medium text-slate-800">
                        {a.contact_name || a.kind_display}
                      </span>
                      <span className="text-slate-500">
                        {' '}
                        · {a.kind_display} at {a.property_name}
                      </span>
                    </span>
                    <span className="text-xs text-slate-500 flex-shrink-0">
                      {new Date(a.starts_at).toLocaleString('en-US', {
                        weekday: 'short',
                        month: 'short',
                        day: 'numeric',
                        hour: 'numeric',
                        minute: '2-digit',
                      })}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* viewing requests rail */}
      {requests.length > 0 && (
        <Card className="border-purple-200 bg-purple-50/50">
          <CardContent className="p-3 sm:p-4 space-y-2">
            <p className="text-sm font-medium text-purple-800">
              {requests.length} viewing request{requests.length > 1 ? 's' : ''}{' '}
              awaiting your reply
            </p>
            <ul className="space-y-2">
              {requests.map((r) => (
                <li
                  key={r.id}
                  className="rounded-md border border-purple-200 bg-white p-2.5 space-y-2 text-sm"
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-medium text-slate-800 truncate">
                        {r.contact_name || 'Someone'} wants to view{' '}
                        {r.property_name}
                      </p>
                      <p className="text-xs text-slate-500">
                        {new Date(r.starts_at).toLocaleString('en-US', {
                          weekday: 'short',
                          month: 'short',
                          day: 'numeric',
                          hour: 'numeric',
                          minute: '2-digit',
                        })}
                        {r.contact_email && ` · ${r.contact_email}`}
                        {r.contact_phone && ` · ${r.contact_phone}`}
                      </p>
                      {/* Flags that want the landlord's attention */}
                      <div className="mt-1 flex flex-wrap gap-1.5">
                        {r.status === 'AWAITING_REQUESTER' && (
                          <span className="rounded-full bg-sky-50 px-2 py-0.5 text-[11px] text-sky-700 border border-sky-200">
                            You proposed a new time — awaiting reply
                          </span>
                        )}
                        {r.time_class === 'OUT_OF_HOURS' && (
                          <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[11px] text-amber-700 border border-amber-200">
                            Outside your usual hours
                          </span>
                        )}
                        {r.tenant_consent === 'PENDING' && (
                          <span className="rounded-full bg-slate-50 px-2 py-0.5 text-[11px] text-slate-600 border border-slate-200">
                            Current tenant asked
                          </span>
                        )}
                        {r.tenant_consent === 'OK' && (
                          <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] text-emerald-700 border border-emerald-200">
                            Tenant OK
                          </span>
                        )}
                        {r.tenant_consent === 'OBJECTED' && (
                          <span className="rounded-full bg-rose-50 px-2 py-0.5 text-[11px] text-rose-700 border border-rose-200">
                            Tenant objected
                          </span>
                        )}
                      </div>
                      {r.notes && (
                        <p className="mt-1 text-xs text-slate-400 truncate">
                          &quot;{r.notes}&quot;
                        </p>
                      )}
                      {r.tenant_consent === 'OBJECTED' &&
                        r.tenant_consent_notes && (
                          <p className="mt-1 text-xs text-rose-500">
                            Tenant: &quot;{r.tenant_consent_notes}&quot;
                          </p>
                        )}
                    </div>
                    <div className="flex gap-1.5 flex-shrink-0">
                      <Button
                        size="sm"
                        className="h-7 bg-teal-600 hover:bg-teal-700"
                        disabled={busy}
                        onClick={() =>
                          run(
                            () => confirmAppointment(token!, r.id),
                            'Confirmed — the requester will be notified.'
                          )
                        }
                      >
                        <Check className="h-3.5 w-3.5 mr-1" /> Confirm
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7"
                        disabled={busy}
                        onClick={() => {
                          setCounterId(counterId === r.id ? null : r.id);
                          setCounterWhen('');
                        }}
                      >
                        <CalendarClock className="h-3.5 w-3.5 mr-1" /> Propose
                        time
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7"
                        disabled={busy}
                        onClick={() =>
                          run(
                            () => declineAppointment(token!, r.id),
                            'Declined.'
                          )
                        }
                      >
                        <X className="h-3.5 w-3.5 mr-1" /> Decline
                      </Button>
                    </div>
                  </div>
                  {counterId === r.id && (
                    <div className="flex flex-wrap items-center gap-2 border-t border-purple-100 pt-2">
                      <input
                        type="datetime-local"
                        value={counterWhen}
                        onChange={(e) => setCounterWhen(e.target.value)}
                        className="field w-auto py-1"
                      />
                      <Button
                        size="sm"
                        className="h-7 bg-sky-600 hover:bg-sky-700"
                        disabled={busy || !counterWhen}
                        onClick={() =>
                          run(
                            () =>
                              counterAppointment(
                                token!,
                                r.id,
                                new Date(counterWhen).toISOString()
                              ),
                            'Proposed — the requester will be asked to confirm.'
                          ).then(() => {
                            setCounterId(null);
                            setCounterWhen('');
                          })
                        }
                      >
                        Send proposal
                      </Button>
                      <button
                        type="button"
                        className="text-xs text-slate-400"
                        onClick={() => setCounterId(null)}
                      >
                        Cancel
                      </button>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
        {/* grid */}
        <Card className="lg:col-span-2">
          <CardContent className="pt-4 sm:pt-6">
            {pickingRange && (
              <div className="mb-2 rounded-md bg-teal-50 border border-teal-200 px-3 py-1.5 text-xs text-teal-800 flex items-center justify-between">
                <span>
                  Now click the <strong>end day</strong> of the period (
                  {selected && fmtShort(selected)} → …)
                </span>
                <button
                  className="underline"
                  onClick={() => setPickingRange(false)}
                >
                  cancel
                </button>
              </div>
            )}
            <RentiumCalendar
              events={events}
              month={month}
              onMonthChange={setMonth}
              selectedDay={selected}
              rangeEnd={rangeEnd}
              onDayClick={handleDayClick}
            />
            <div className="flex flex-wrap gap-x-4 gap-y-1 mt-4">
              {LEGEND.map((l) => (
                <span
                  key={l.kind}
                  className="flex items-center gap-1.5 text-[11px] text-slate-500"
                >
                  <span
                    className={`inline-block h-2.5 w-2.5 rounded-sm border ${KIND_STYLES[l.kind]}`}
                  />
                  {l.label}
                </span>
              ))}
            </div>
            {bookingLink && (
              <div className="mt-3 flex items-center gap-2 text-xs text-slate-500">
                <Link2 className="h-3.5 w-3.5 flex-shrink-0" />
                <span className="truncate">
                  Public booking link: {bookingLink}
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 flex-shrink-0"
                  onClick={() => {
                    navigator.clipboard.writeText(bookingLink);
                    setCopied(true);
                    setTimeout(() => setCopied(false), 1500);
                  }}
                >
                  {copied ? (
                    <Check className="h-3.5 w-3.5 text-teal-600" />
                  ) : (
                    <Copy className="h-3.5 w-3.5" />
                  )}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* day panel */}
        <Card>
          <CardContent className="pt-4 sm:pt-6 space-y-4">
            {!selected ? (
              <div className="text-sm text-slate-500 space-y-2">
                <p>Tap a day to see everything on it — and to act on it:</p>
                <ul className="list-disc pl-5 space-y-1 text-xs text-slate-400">
                  <li>schedule a viewing or contractor visit</li>
                  <li>record an expense on that date</li>
                  <li>post a utility bill for a period picked on the grid</li>
                  <li>see who&apos;s renting and what&apos;s due</li>
                </ul>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-slate-800">
                    {fmtDay(selected)}
                    {rangeEnd && rangeEnd !== selected
                      ? ` – ${fmtShort(rangeEnd)}`
                      : ''}
                  </h3>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => {
                      setSelected(null);
                      setRangeEnd(null);
                      setAction(null);
                    }}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>

                {/* who's renting */}
                {occupancy.length > 0 && (
                  <div className="rounded-md bg-slate-50 border p-2.5 text-xs space-y-1">
                    <p className="uppercase tracking-wide text-slate-400">
                      Renting on this day
                    </p>
                    {occupancy.map((l) => (
                      <Link
                        key={l.id}
                        href={`/dashboard/leases/${l.id}`}
                        className="flex items-center justify-between gap-2 hover:underline"
                      >
                        <span className="text-slate-700 truncate">
                          {l.property_name || l.group_name} —{' '}
                          {l.primary_tenant_name ||
                            `${l.tenant_count} tenant(s)`}
                        </span>
                        <span className="text-slate-400 flex-shrink-0">
                          ${Number(l.total_rent).toLocaleString()}/mo
                        </span>
                      </Link>
                    ))}
                  </div>
                )}

                {/* events */}
                {dayEvents.length === 0 ? (
                  <p className="text-sm text-slate-400">
                    Nothing scheduled or due.
                  </p>
                ) : (
                  <ul className="space-y-2 text-sm max-h-72 overflow-y-auto pr-1">
                    {dayEvents.map((e) => {
                      const apptId = apptIdFromEvent(e.id);
                      const appt = apptId ? apptById.get(apptId) : undefined;
                      return (
                        <li key={e.id} className="rounded-md border p-2.5">
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <span
                                className={`inline-block rounded border px-1.5 text-[10px] leading-4 mb-1 ${KIND_STYLES[e.kind]}`}
                              >
                                {e.label}
                              </span>
                              {appt ? (
                                // The landlord's view of a visit: WHO is
                                // coming, how to reach them, and the note
                                // they left — not just "a viewing exists".
                                <div className="space-y-0.5">
                                  <p className="text-xs sm:text-sm font-medium text-slate-800">
                                    {appt.contact_name || appt.kind_display}
                                    <span className="font-normal text-slate-500">
                                      {' '}
                                      ·{' '}
                                      {new Date(
                                        appt.starts_at
                                      ).toLocaleTimeString('en-US', {
                                        hour: 'numeric',
                                        minute: '2-digit',
                                      })}{' '}
                                      at {appt.property_name}
                                    </span>
                                  </p>
                                  {(appt.contact_email ||
                                    appt.contact_phone) && (
                                    <p className="text-xs text-slate-500 break-all">
                                      {appt.contact_email && (
                                        <a
                                          href={`mailto:${appt.contact_email}`}
                                          className="hover:underline"
                                        >
                                          {appt.contact_email}
                                        </a>
                                      )}
                                      {appt.contact_email &&
                                        appt.contact_phone &&
                                        ' · '}
                                      {appt.contact_phone && (
                                        <a
                                          href={`tel:${appt.contact_phone}`}
                                          className="hover:underline"
                                        >
                                          {appt.contact_phone}
                                        </a>
                                      )}
                                    </p>
                                  )}
                                  {appt.notes && (
                                    <p className="text-xs text-slate-400">
                                      &quot;{appt.notes}&quot;
                                    </p>
                                  )}
                                </div>
                              ) : (
                                <p className="text-slate-700 text-xs sm:text-sm">
                                  {e.detail || e.label}
                                </p>
                              )}
                            </div>
                            <div className="flex items-center gap-1 flex-shrink-0">
                              {e.status && (
                                <Badge
                                  variant="outline"
                                  className="text-[10px]"
                                >
                                  {e.status}
                                </Badge>
                              )}
                              {e.href && (
                                <Link
                                  href={e.href}
                                  className="text-slate-400 hover:text-slate-600"
                                >
                                  <ExternalLink className="h-3.5 w-3.5" />
                                </Link>
                              )}
                              {apptId && e.status === 'SCHEDULED' && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-6 w-6"
                                  title="Cancel this visit"
                                  disabled={busy}
                                  onClick={() =>
                                    run(
                                      () => cancelAppointment(token!, apptId),
                                      'Cancelled — tenants notified.'
                                    )
                                  }
                                >
                                  <X className="h-3.5 w-3.5 text-slate-400" />
                                </Button>
                              )}
                            </div>
                          </div>
                          {/* A REQUESTED viewing is actionable right here,
                              not just in the rail at the top of the page. */}
                          {appt && appt.status === 'REQUESTED' && (
                            <div className="mt-2 flex gap-1.5">
                              <Button
                                size="sm"
                                className="h-7 bg-teal-600 hover:bg-teal-700"
                                disabled={busy}
                                onClick={() =>
                                  run(
                                    () => confirmAppointment(token!, appt.id),
                                    'Confirmed — the requester will be notified.'
                                  )
                                }
                              >
                                <Check className="h-3.5 w-3.5 mr-1" /> Confirm
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7"
                                disabled={busy}
                                onClick={() =>
                                  run(
                                    () => declineAppointment(token!, appt.id),
                                    'Declined.'
                                  )
                                }
                              >
                                <X className="h-3.5 w-3.5 mr-1" /> Decline
                              </Button>
                            </div>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                )}

                {/* quick actions */}
                {!action &&
                  (isRange ? (
                    <div className="space-y-2">
                      <p className="text-xs text-slate-500">
                        {rangeDays} days selected — {fmtShort(selected!)} to{' '}
                        {fmtShort(rangeEnd!)}
                      </p>
                      <div className="grid grid-cols-1 gap-1.5">
                        <Button
                          variant="outline"
                          size="sm"
                          className="justify-start"
                          onClick={() => setAction('utility')}
                        >
                          <Zap className="mr-2 h-3.5 w-3.5" />
                          Post a utility bill for this period
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="justify-start"
                          onClick={() => {
                            setAction('expense');
                            setExpProp(propId != null ? String(propId) : '');
                          }}
                        >
                          <Receipt className="mr-2 h-3.5 w-3.5" />
                          Record an expense
                        </Button>
                      </div>
                      <button
                        className="text-xs text-slate-400 underline"
                        onClick={() => setRangeEnd(null)}
                      >
                        Just this one day instead
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <div className="grid grid-cols-3 gap-1.5">
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-auto flex-col gap-1 py-2 text-[11px]"
                          onClick={() => {
                            setAction('schedule');
                            setSchedProp(
                              propId != null
                                ? String(propId)
                                : String(properties[0]?.id ?? '')
                            );
                          }}
                        >
                          <Plus className="h-3.5 w-3.5" /> Visit
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-auto flex-col gap-1 py-2 text-[11px]"
                          onClick={() => {
                            setAction('expense');
                            setExpProp(propId != null ? String(propId) : '');
                          }}
                        >
                          <Receipt className="h-3.5 w-3.5" /> Expense
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-auto flex-col gap-1 py-2 text-[11px]"
                          onClick={() => setAction('utility')}
                        >
                          <Zap className="h-3.5 w-3.5" /> Bill
                        </Button>
                      </div>
                      <p className="text-[11px] text-slate-400">
                        Shift-click another day to select a period — useful for
                        a billing cycle.
                      </p>
                    </div>
                  ))}

                {action === 'schedule' && (
                  <div className="rounded-md border border-dashed p-3 space-y-2.5 text-sm">
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <Label className="text-xs">Type</Label>
                        <Select
                          value={schedKind}
                          onValueChange={(v) =>
                            setSchedKind(v as AppointmentKind)
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="VIEWING">Viewing</SelectItem>
                            <SelectItem value="CONTRACTOR">
                              Contractor
                            </SelectItem>
                            <SelectItem value="OTHER">Other</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Time</Label>
                        <Input
                          type="time"
                          value={schedTime}
                          onChange={(e) => setSchedTime(e.target.value)}
                        />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Property</Label>
                      <Select value={schedProp} onValueChange={setSchedProp}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select property" />
                        </SelectTrigger>
                        <SelectContent>
                          {properties.map((p) => (
                            <SelectItem key={p.id} value={String(p.id)}>
                              {p.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <Input
                      value={schedWho}
                      onChange={(e) => setSchedWho(e.target.value)}
                      placeholder="Who's coming (optional)"
                    />
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        className="bg-teal-600 hover:bg-teal-700"
                        disabled={busy || !schedProp}
                        onClick={quickSchedule}
                      >
                        {busy && (
                          <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />
                        )}{' '}
                        Schedule
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setAction(null)}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                )}

                {action === 'expense' && (
                  <div className="rounded-md border border-dashed p-3 space-y-2.5 text-sm">
                    <p className="text-xs text-slate-500">
                      Expense incurred on {fmtShort(selected)}.
                    </p>
                    <div className="grid grid-cols-2 gap-2">
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder="Amount"
                        value={expAmount}
                        onChange={(e) => setExpAmount(e.target.value)}
                      />
                      <Select
                        value={expCategory}
                        onValueChange={(v) =>
                          setExpCategory(v as ExpenseCategory)
                        }
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
                    <Input
                      placeholder="Description"
                      value={expDesc}
                      onChange={(e) => setExpDesc(e.target.value)}
                    />
                    <Select
                      value={expProp || 'none'}
                      onValueChange={(v) => setExpProp(v === 'none' ? '' : v)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Property (optional)" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">
                          No specific property
                        </SelectItem>
                        {properties.map((p) => (
                          <SelectItem key={p.id} value={String(p.id)}>
                            {p.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        className="bg-teal-600 hover:bg-teal-700"
                        disabled={busy || !expAmount || !expDesc}
                        onClick={quickExpense}
                      >
                        {busy && (
                          <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />
                        )}{' '}
                        Record expense
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setAction(null)}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                )}

                {action === 'utility' && (
                  <div className="rounded-md border border-dashed p-3 space-y-2.5 text-sm">
                    <p className="text-xs text-slate-500">
                      Bill period:{' '}
                      <strong>
                        {fmtShort(selected)} – {fmtShort(rangeEnd || selected)}
                      </strong>{' '}
                      <button
                        className="underline"
                        onClick={() => setPickingRange(true)}
                      >
                        change end
                      </button>
                    </p>
                    <Select value={utilLease} onValueChange={setUtilLease}>
                      <SelectTrigger className="[&>span]:truncate">
                        <SelectValue placeholder="Which lease?" />
                      </SelectTrigger>
                      <SelectContent className="max-w-[min(90vw,26rem)]">
                        {activeLeases
                          .filter(
                            (l) => !propName || l.property_name === propName
                          )
                          .map((l) => (
                            <SelectItem
                              key={l.id}
                              value={l.id}
                              className="whitespace-normal break-words"
                            >
                              {l.property_name || l.group_name} ·{' '}
                              {l.primary_tenant_name ||
                                `${l.tenant_count} tenant(s)`}{' '}
                              · {l.lease_number}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                    {utilLease && (
                      <Select value={utilKey} onValueChange={setUtilKey}>
                        <SelectTrigger className="[&>span]:truncate">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="max-w-[min(90vw,26rem)]">
                          {Object.entries(
                            utilBilling?.bills_included || {}
                          ).map(([key, cfg]) => (
                            <SelectItem
                              key={key}
                              value={key}
                              className="whitespace-normal break-words"
                            >
                              {cfg.provider || key} ({key})
                            </SelectItem>
                          ))}
                          <SelectItem value="other">Other / one-off</SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                    <div className="grid grid-cols-2 gap-2">
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder="Full bill amount"
                        value={utilAmount}
                        onChange={(e) => setUtilAmount(e.target.value)}
                      />
                      <Input
                        placeholder="Description"
                        value={utilDesc}
                        onChange={(e) => setUtilDesc(e.target.value)}
                      />
                    </div>
                    <p className="text-[11px] text-slate-400">
                      Tenants are charged their share per the lease terms; the
                      full amount is recorded as your expense (providers
                      auto-debit you).
                    </p>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        className="bg-teal-600 hover:bg-teal-700"
                        disabled={busy || !utilLease || !utilAmount}
                        onClick={quickUtility}
                      >
                        {busy && (
                          <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />
                        )}{' '}
                        Post bill
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setAction(null)}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
