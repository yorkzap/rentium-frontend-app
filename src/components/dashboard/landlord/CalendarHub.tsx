// src/components/dashboard/landlord/CalendarHub.tsx
'use client';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
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
  Plus,
  ChevronLeft,
  ChevronRight,
  FileText,
  DollarSign,
  Wrench,
  Home,
  CalendarClock,
  Loader2,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import {
  fetchAgenda,
  createAgendaEvent,
  type AgendaItem,
  type AgendaType,
} from '@/lib/engagementApi';

const TYPE_STYLE: Record<
  AgendaType,
  { cls: string; icon: React.ReactNode; label: string }
> = {
  lease_start: {
    cls: 'bg-blue-100 text-blue-700',
    icon: <FileText className="h-3 w-3" />,
    label: 'Lease start',
  },
  lease_end: {
    cls: 'bg-purple-100 text-purple-700',
    icon: <FileText className="h-3 w-3" />,
    label: 'Lease end',
  },
  charge_due: {
    cls: 'bg-green-100 text-green-700',
    icon: <DollarSign className="h-3 w-3" />,
    label: 'Payment due',
  },
  work_order: {
    cls: 'bg-amber-100 text-amber-700',
    icon: <Wrench className="h-3 w-3" />,
    label: 'Work order',
  },
  move: {
    cls: 'bg-cyan-100 text-cyan-700',
    icon: <Home className="h-3 w-3" />,
    label: 'Move in/out',
  },
  inspection: {
    cls: 'bg-rose-100 text-rose-700',
    icon: <CalendarClock className="h-3 w-3" />,
    label: 'Inspection',
  },
  reminder: {
    cls: 'bg-surface-sunken text-ink-2',
    icon: <CalendarClock className="h-3 w-3" />,
    label: 'Reminder',
  },
  custom: {
    cls: 'bg-surface-sunken text-ink-2',
    icon: <CalendarClock className="h-3 w-3" />,
    label: 'Custom',
  },
};

const iso = (d: Date) => d.toISOString().slice(0, 10);
const monthName = (d: Date) =>
  d.toLocaleDateString([], { month: 'long', year: 'numeric' });

export default function CalendarHub() {
  const { token } = useAuth();
  const router = useRouter();
  const [cursor, setCursor] = useState(() => {
    const d = new Date();
    d.setDate(1);
    return d;
  });
  const [items, setItems] = useState<AgendaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('all');
  const [addOpen, setAddOpen] = useState(false);

  const monthStart = useMemo(
    () => new Date(cursor.getFullYear(), cursor.getMonth(), 1),
    [cursor]
  );
  const monthEnd = useMemo(
    () => new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0),
    [cursor]
  );

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      setItems(
        await fetchAgenda(token, { start: iso(monthStart), end: iso(monthEnd) })
      );
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : 'Failed to load calendar.'
      );
    } finally {
      setLoading(false);
    }
  }, [token, monthStart, monthEnd]);

  useEffect(() => {
    load();
  }, [load]);

  const filtered =
    filter === 'all' ? items : items.filter((i) => i.type === filter);

  // group by day for the grid
  const byDay = useMemo(() => {
    const map: Record<string, AgendaItem[]> = {};
    for (const i of filtered) (map[i.date] ||= []).push(i);
    return map;
  }, [filtered]);

  // build the month grid (weeks x 7)
  const cells = useMemo(() => {
    const firstWeekday = monthStart.getDay();
    const daysInMonth = monthEnd.getDate();
    const out: (Date | null)[] = [];
    for (let i = 0; i < firstWeekday; i++) out.push(null);
    for (let d = 1; d <= daysInMonth; d++)
      out.push(new Date(cursor.getFullYear(), cursor.getMonth(), d));
    while (out.length % 7 !== 0) out.push(null);
    return out;
  }, [cursor, monthStart, monthEnd]);

  const todayStr = iso(new Date());

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-semibold text-ink">Calendar</h1>
          <p className="text-ink-3 text-sm mt-1">
            Lease dates, rent, scheduled work, and your own events.
          </p>
        </div>
        <Button className="" onClick={() => setAddOpen(true)}>
          <Plus className="h-4 w-4 mr-1" /> Add Event
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* month grid */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader className="flex-row items-center justify-between space-y-0">
              <CardTitle className="text-lg">{monthName(cursor)}</CardTitle>
              <div className="flex items-center gap-2">
                {loading && (
                  <Loader2 className="h-4 w-4 animate-spin text-ink-4" />
                )}
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() =>
                    setCursor(
                      new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1)
                    )
                  }
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const d = new Date();
                    d.setDate(1);
                    setCursor(d);
                  }}
                >
                  Today
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() =>
                    setCursor(
                      new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1)
                    )
                  }
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-7 text-xs font-medium text-ink-4 mb-1">
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
                  <div key={d} className="px-2 py-1 text-center">
                    {d}
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-1">
                {cells.map((d, idx) => {
                  if (!d)
                    return (
                      <div
                        key={idx}
                        className="min-h-[84px] rounded-md bg-canvas/60"
                      />
                    );
                  const key = iso(d);
                  const dayItems = byDay[key] || [];
                  const isToday = key === todayStr;
                  return (
                    <div
                      key={idx}
                      className={`min-h-[84px] rounded-md border p-1 ${isToday ? 'border-ink' : 'border-line'}`}
                    >
                      <div
                        className={`text-xs px-1 ${isToday ? 'font-semibold text-ink' : 'text-ink-4'}`}
                      >
                        {d.getDate()}
                      </div>
                      <div className="space-y-0.5 mt-0.5">
                        {dayItems.slice(0, 3).map((i, k) => (
                          <button
                            key={k}
                            onClick={() => i.url && router.push(i.url)}
                            className={`w-full text-left truncate rounded px-1 py-0.5 text-[11px] ${TYPE_STYLE[i.type].cls}`}
                            title={`${i.title} — ${i.subtitle}`}
                          >
                            {i.title}
                          </button>
                        ))}
                        {dayItems.length > 3 && (
                          <div className="text-[10px] text-ink-4 px-1">
                            +{dayItems.length - 3} more
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* upcoming list + filter */}
        <div className="space-y-4">
          <Select value={filter} onValueChange={setFilter}>
            <SelectTrigger>
              <SelectValue placeholder="All events" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All events</SelectItem>
              <SelectItem value="charge_due">Payments due</SelectItem>
              <SelectItem value="work_order">Work orders</SelectItem>
              <SelectItem value="lease_start">Lease starts</SelectItem>
              <SelectItem value="lease_end">Lease ends</SelectItem>
              <SelectItem value="custom">My events</SelectItem>
            </SelectContent>
          </Select>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">This month</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {filtered.length === 0 ? (
                <p className="p-6 text-center text-sm text-ink-3">
                  Nothing scheduled.
                </p>
              ) : (
                <div className="divide-y divide-line max-h-[440px] overflow-y-auto">
                  {filtered.map((i, k) => {
                    const s = TYPE_STYLE[i.type];
                    return (
                      <button
                        key={k}
                        onClick={() => i.url && router.push(i.url)}
                        className="w-full text-left flex items-start gap-3 p-3 hover:bg-canvas"
                      >
                        <div className={`p-1.5 rounded-full shrink-0 ${s.cls}`}>
                          {s.icon}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-ink truncate">
                            {i.title}
                          </p>
                          <p className="text-xs text-ink-3">
                            {new Date(i.date).toLocaleDateString([], {
                              month: 'short',
                              day: 'numeric',
                            })}
                            {i.subtitle ? ` · ${i.subtitle}` : ''}
                          </p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <AddEventDialog
        open={addOpen}
        token={token!}
        defaultMonth={cursor}
        onClose={() => setAddOpen(false)}
        onDone={() => {
          setAddOpen(false);
          load();
        }}
      />
    </div>
  );
}

function AddEventDialog({
  open,
  token,
  defaultMonth,
  onClose,
  onDone,
}: {
  open: boolean;
  token: string;
  defaultMonth: Date;
  onClose: () => void;
  onDone: () => void;
}) {
  const [title, setTitle] = useState('');
  const [kind, setKind] = useState<
    'CUSTOM' | 'INSPECTION' | 'REMINDER' | 'MOVE'
  >('CUSTOM');
  const [startDate, setStartDate] = useState(iso(defaultMonth));
  const [notes, setNotes] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (open) {
      setTitle('');
      setKind('CUSTOM');
      setStartDate(iso(new Date()));
      setNotes('');
    }
  }, [open]);

  const submit = async () => {
    setBusy(true);
    try {
      await createAgendaEvent(token, {
        title,
        kind,
        start_date: startDate,
        notes,
      });
      toast.success('Event added.');
      onDone();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to add event.');
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add event</DialogTitle>
          <DialogDescription>
            A reminder, inspection, or note on your calendar.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Title</Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Annual furnace inspection"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Type</Label>
              <Select
                value={kind}
                onValueChange={(v) => setKind(v as typeof kind)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="CUSTOM">Custom</SelectItem>
                  <SelectItem value="INSPECTION">Inspection</SelectItem>
                  <SelectItem value="REMINDER">Reminder</SelectItem>
                  <SelectItem value="MOVE">Move in/out</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Date</Label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Notes (optional)</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button
            className=""
            onClick={submit}
            disabled={busy || !title || !startDate}
          >
            {busy && <Loader2 className="h-4 w-4 mr-2 animate-spin" />} Add
            event
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
