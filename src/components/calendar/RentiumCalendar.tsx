// RentiumCalendar.tsx
// Shared month-grid calendar. Pure presentation: callers map their data
// into CalEvent[]; this renders chips (dots on phones), supports a
// selected day AND a highlighted date range (for "post a utility bill for
// this period"), and can run controlled (parent owns the month, so pages
// can show per-month money summaries) or uncontrolled (tenant card).
'use client';
import { useEffect, useMemo, useState } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ChevronLeft, ChevronRight, CalendarDays } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { fetchEntries, type LedgerEntry } from '@/lib/financeApi';
import { listAppointments, type Appointment } from '@/lib/appointmentsApi';

// ---------------------------------------------------------------- types
export type CalEventKind =
  | 'RENT_DUE'
  | 'CHARGE_DUE'
  | 'PAYMENT'
  | 'APPOINTMENT'
  | 'VIEWING_REQUEST'
  | 'MOVE_IN'
  | 'MOVE_OUT'
  | 'LEASE_END'
  | 'DEADLINE';

export interface CalEvent {
  id: string;
  date: string; // YYYY-MM-DD
  kind: CalEventKind;
  label: string;
  detail?: string;
  status?: string;
  href?: string;
  amount?: number;
}

export const KIND_STYLES: Record<CalEventKind, string> = {
  RENT_DUE: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  CHARGE_DUE: 'bg-amber-50 text-amber-700 border-amber-200',
  PAYMENT: 'bg-teal-600 text-white border-teal-600',
  APPOINTMENT: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  VIEWING_REQUEST:
    'bg-purple-50 text-purple-700 border-purple-300 border-dashed',
  MOVE_IN: 'bg-blue-50 text-blue-700 border-blue-200',
  MOVE_OUT: 'bg-rose-50 text-rose-700 border-rose-200',
  LEASE_END: 'bg-slate-100 text-slate-600 border-slate-200',
  // Compliance / attention deadlines (inspection due, report delivery, …)
  DEADLINE: 'bg-danger-soft text-danger-ink border-danger/30',
};
// solid dot colors for the phone-sized grid
const KIND_DOTS: Record<CalEventKind, string> = {
  RENT_DUE: 'bg-emerald-500',
  CHARGE_DUE: 'bg-amber-500',
  PAYMENT: 'bg-teal-600',
  APPOINTMENT: 'bg-indigo-500',
  VIEWING_REQUEST: 'bg-purple-500',
  MOVE_IN: 'bg-blue-500',
  MOVE_OUT: 'bg-rose-500',
  LEASE_END: 'bg-slate-400',
  DEADLINE: 'bg-danger',
};

// ---------------------------------------------------------------- utils
export const isoDate = (d: Date) => {
  const y = d.getFullYear(),
    m = `${d.getMonth() + 1}`.padStart(2, '0'),
    day = `${d.getDate()}`.padStart(2, '0');
  return `${y}-${m}-${day}`;
};
export const monthLabel = (year: number, month: number) =>
  new Date(year, month, 1).toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  });
export const monthKey = (dateIso: string) => dateIso.slice(0, 7); // YYYY-MM

function buildGrid(year: number, month: number): (string | null)[] {
  const first = new Date(year, month, 1);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (string | null)[] = Array(first.getDay()).fill(null);
  for (let d = 1; d <= daysInMonth; d++)
    cells.push(isoDate(new Date(year, month, d)));
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

// ------------------------------------------------------------- component
export function RentiumCalendar({
  events,
  onDayClick,
  selectedDay,
  rangeEnd,
  compact = false,
  footer,
  month: controlledMonth,
  onMonthChange,
}: {
  events: CalEvent[];
  onDayClick?: (day: string, shiftKey: boolean) => void;
  selectedDay?: string | null;
  /** When set (>= selectedDay), the whole span is highlighted — used for
   *  picking a utility-bill period straight off the grid. */
  rangeEnd?: string | null;
  compact?: boolean;
  footer?: React.ReactNode;
  month?: { year: number; month: number };
  onMonthChange?: (m: { year: number; month: number }) => void;
}) {
  const now = new Date();
  const [internal, setInternal] = useState({
    year: now.getFullYear(),
    month: now.getMonth(),
  });
  const { year, month } = controlledMonth ?? internal;
  const setMonth = (m: { year: number; month: number }) =>
    controlledMonth ? onMonthChange?.(m) : setInternal(m);
  const today = isoDate(now);
  const cells = useMemo(() => buildGrid(year, month), [year, month]);
  const byDay = useMemo(() => {
    const map = new Map<string, CalEvent[]>();
    for (const e of events) {
      if (!map.has(e.date)) map.set(e.date, []);
      map.get(e.date)!.push(e);
    }
    return map;
  }, [events]);

  const nav = (delta: number) => {
    const d = new Date(year, month + delta, 1);
    setMonth({ year: d.getFullYear(), month: d.getMonth() });
  };
  const inRange = (day: string) =>
    !!(selectedDay && rangeEnd && day >= selectedDay && day <= rangeEnd);
  const maxChips = compact ? 1 : 2;

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-slate-800">
          {monthLabel(year, month)}
        </h3>
        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="icon"
            className="h-7 w-7"
            onClick={() => nav(-1)}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="h-7 text-xs"
            onClick={() =>
              setMonth({ year: now.getFullYear(), month: now.getMonth() })
            }
          >
            Today
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="h-7 w-7"
            onClick={() => nav(1)}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
      {/* Agenda list below md: a 7-column grid with 30-odd cells doesn't fit
          a phone screen usefully — cells shrink to unreadable dots. Below
          that breakpoint, list the month's dated events instead. */}
      <div className="md:hidden">
        <AgendaList
          year={year}
          month={month}
          byDay={byDay}
          selectedDay={selectedDay}
          onDayClick={onDayClick}
        />
      </div>

      <div className="hidden md:block">
        <div className="grid grid-cols-7 text-center text-[11px] uppercase tracking-wide text-slate-400 mb-1">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
            <div key={d}>{d}</div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-px rounded-xl overflow-hidden border bg-slate-200 shadow-sm">
          {cells.map((day, i) => {
            const dayEvents = day ? byDay.get(day) || [] : [];
            const overflow = dayEvents.length - maxChips;
            const weekend = i % 7 === 0 || i % 7 === 6;
            return (
              <button
                key={i}
                type="button"
                disabled={!day}
                onClick={(e) => day && onDayClick?.(day, e.shiftKey)}
                className={cn(
                  'text-left p-1 sm:p-1.5 align-top transition-colors',
                  weekend ? 'bg-slate-50/80' : 'bg-white',
                  compact ? 'min-h-[52px]' : 'min-h-[64px] sm:min-h-[92px]',
                  day &&
                    onDayClick &&
                    'hover:bg-teal-50 active:bg-teal-100 cursor-pointer',
                  !day && 'bg-slate-100/60 cursor-default',
                  day && inRange(day) && 'bg-teal-50',
                  day === selectedDay && 'ring-2 ring-inset ring-teal-500',
                  day === rangeEnd &&
                    rangeEnd !== selectedDay &&
                    'ring-2 ring-inset ring-teal-300'
                )}
              >
                {day && (
                  <>
                    <span
                      className={cn(
                        'inline-flex h-5 w-5 items-center justify-center rounded-full text-[11px]',
                        day === today
                          ? 'bg-teal-600 text-white font-semibold'
                          : 'text-slate-500'
                      )}
                    >
                      {parseInt(day.slice(8), 10)}
                    </span>
                    {/* phones: dots; >=sm: labeled chips */}
                    {dayEvents.length > 0 && (
                      <div className="mt-0.5 flex flex-wrap gap-0.5 sm:hidden">
                        {dayEvents.slice(0, 4).map((e) => (
                          <span
                            key={e.id}
                            className={cn(
                              'h-1.5 w-1.5 rounded-full',
                              KIND_DOTS[e.kind]
                            )}
                          />
                        ))}
                        {dayEvents.length > 4 && (
                          <span className="text-[9px] text-slate-400 leading-none">
                            +{dayEvents.length - 4}
                          </span>
                        )}
                      </div>
                    )}
                    <div className="mt-0.5 space-y-0.5 hidden sm:block">
                      {dayEvents.slice(0, maxChips).map((e) => (
                        <span
                          key={e.id}
                          className={cn(
                            'block truncate rounded border px-1 text-[10px] leading-4',
                            KIND_STYLES[e.kind],
                            e.status === 'PAID' &&
                              e.kind !== 'PAYMENT' &&
                              'opacity-50 line-through',
                            e.status === 'OVERDUE' &&
                              'border-red-300 bg-red-50 text-red-700'
                          )}
                        >
                          {e.label}
                        </span>
                      ))}
                      {overflow > 0 && (
                        <span className="block text-[10px] text-slate-400 px-1">
                          +{overflow} more
                        </span>
                      )}
                    </div>
                  </>
                )}
              </button>
            );
          })}
        </div>
      </div>
      {footer}
    </div>
  );
}

// ---------------------------------------------------------- agenda (mobile)
function AgendaList({
  year,
  month,
  byDay,
  selectedDay,
  onDayClick,
}: {
  year: number;
  month: number;
  byDay: Map<string, CalEvent[]>;
  selectedDay?: string | null;
  onDayClick?: (day: string, shiftKey: boolean) => void;
}) {
  const prefix = `${year}-${`${month + 1}`.padStart(2, '0')}`;
  const days = useMemo(
    () =>
      Array.from(byDay.keys())
        .filter((d) => d.startsWith(prefix))
        .sort(),
    [byDay, prefix]
  );

  if (days.length === 0) {
    return (
      <p className="py-6 text-center text-sm text-slate-400">
        Nothing this month.
      </p>
    );
  }

  return (
    <ul className="divide-y divide-slate-100">
      {days.map((day) => {
        const dayEvents = byDay.get(day) || [];
        const label = new Date(`${day}T00:00:00`).toLocaleDateString('en-US', {
          weekday: 'short',
          month: 'short',
          day: 'numeric',
        });
        return (
          <li key={day} className="py-2.5">
            <button
              type="button"
              onClick={() => onDayClick?.(day, false)}
              className={cn(
                'mb-1.5 text-left text-xs font-medium uppercase tracking-wide',
                day === selectedDay ? 'text-teal-600' : 'text-slate-400'
              )}
            >
              {label}
            </button>
            <div className="space-y-1">
              {dayEvents.map((e) => (
                <div
                  key={e.id}
                  className={cn(
                    'flex items-center justify-between gap-2 rounded-md border px-2 py-1.5 text-sm',
                    KIND_STYLES[e.kind],
                    e.status === 'PAID' && e.kind !== 'PAYMENT' && 'opacity-60',
                    e.status === 'OVERDUE' &&
                      'border-red-300 bg-red-50 text-red-700'
                  )}
                >
                  <span className="truncate">{e.detail || e.label}</span>
                  {e.status && (
                    <Badge
                      variant="outline"
                      className="flex-shrink-0 text-[10px]"
                    >
                      {e.status}
                    </Badge>
                  )}
                </div>
              ))}
            </div>
          </li>
        );
      })}
    </ul>
  );
}

// -------------------------------------------------- event builders (shared)
export function chargeToEvent(c: LedgerEntry): CalEvent | null {
  if (!c.due_date || c.voided) return null;
  const isRent = c.entry_type === 'RENT_CHARGE';
  const amount = Number(c.amount);
  return {
    id: `chg-${c.id}`,
    date: c.due_date,
    kind: isRent ? 'RENT_DUE' : 'CHARGE_DUE',
    label: `$${Math.round(amount).toLocaleString()} ${isRent ? 'rent' : c.entry_type === 'UTILITY_CHARGE' ? 'utility' : 'due'}`,
    detail: `${c.description} — ${c.property_name || ''}`.trim(),
    status: c.charge_status || undefined,
    amount,
  };
}

export function paymentToEvent(p: LedgerEntry): CalEvent | null {
  if (p.entry_type !== 'PAYMENT' || p.voided) return null;
  return {
    id: `pay-${p.id}`,
    date: p.effective_date,
    kind: 'PAYMENT',
    label: `+$${Math.round(Number(p.amount)).toLocaleString()}`,
    detail: `Payment received${p.tenant_name ? ` from ${p.tenant_name}` : ''} — ${p.description}`,
    amount: Number(p.amount),
  };
}

export function appointmentToEvent(a: Appointment): CalEvent | null {
  if (a.status === 'CANCELLED') return null;
  const t = new Date(a.starts_at);
  const isRequest = a.status === 'REQUESTED';
  return {
    id: `apt-${a.id}`,
    date: isoDate(t),
    kind: isRequest ? 'VIEWING_REQUEST' : 'APPOINTMENT',
    label: isRequest
      ? `${t.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })} request`
      : `${t.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })} ${a.kind === 'VIEWING' ? 'viewing' : a.kind === 'CONTRACTOR' ? 'visit' : 'appt'}`,
    detail: `${a.kind_display}${a.contact_name ? ` · ${a.contact_name}` : ''} at ${a.property_name}${a.notes ? ` — ${a.notes}` : ''}`,
    status: a.status,
  };
}

// ------------------------------------------------------------ tenant card
export function TenantCalendarCard({ leaseId }: { leaseId: string }) {
  const { token } = useAuth();
  const [events, setEvents] = useState<CalEvent[]>([]);
  const [selected, setSelected] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    Promise.all([
      fetchEntries(token, { lease: leaseId }).catch(() => [] as LedgerEntry[]),
      listAppointments(token, { lease: leaseId }).catch(
        () => [] as Appointment[]
      ),
    ]).then(([entries, appts]) => {
      const evts: CalEvent[] = [];
      for (const e of entries) {
        const ce =
          e.entry_type === 'PAYMENT' ? paymentToEvent(e) : chargeToEvent(e);
        if (ce) evts.push(ce);
      }
      for (const a of appts) {
        const ce = appointmentToEvent(a);
        if (ce) evts.push(ce);
      }
      setEvents(evts);
    });
  }, [token, leaseId]);

  const dayEvents = selected ? events.filter((e) => e.date === selected) : [];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <CalendarDays className="h-4 w-4 text-slate-500" /> Your Calendar
        </CardTitle>
        <CardDescription>
          Rent and bill due dates, payments received, and scheduled visits.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <RentiumCalendar
          events={events}
          compact
          selectedDay={selected}
          onDayClick={(d) => setSelected(d === selected ? null : d)}
          footer={
            selected && dayEvents.length > 0 ? (
              <ul className="mt-3 space-y-1.5 text-sm">
                {dayEvents.map((e) => (
                  <li
                    key={e.id}
                    className="flex items-center justify-between gap-2"
                  >
                    <span className="text-slate-700 truncate">
                      {e.detail || e.label}
                    </span>
                    {e.status && (
                      <Badge
                        variant="outline"
                        className="text-xs flex-shrink-0"
                      >
                        {e.status}
                      </Badge>
                    )}
                  </li>
                ))}
              </ul>
            ) : selected ? (
              <p className="mt-3 text-sm text-slate-400">
                Nothing on {selected}.
              </p>
            ) : null
          }
        />
      </CardContent>
    </Card>
  );
}
