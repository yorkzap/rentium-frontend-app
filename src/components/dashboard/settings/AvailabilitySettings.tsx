// AvailabilitySettings.tsx
//
// The landlord's default viewing hours. These never BLOCK a request — a
// prospect can still ask for any time and the landlord always confirms — but
// they steer the public picker toward times that are likely to be accepted and
// flag out-of-hours requests so the landlord notices them. Per-property
// overrides exist in the API; this screen manages the sensible default.
'use client';
import { useCallback, useEffect, useState } from 'react';
import { Clock, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import {
  createAvailability,
  deleteAvailability,
  listAvailability,
  type AvailabilityWindow,
} from '@/lib/appointmentsApi';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

// Model weekday: Monday is 0 … Sunday is 6 (matches Python's date.weekday()).
const DAYS = [
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
  'Sunday',
];

const fmtTime = (t: string) => {
  const [h, m] = t.split(':');
  const d = new Date();
  d.setHours(Number(h), Number(m));
  return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
};

export default function AvailabilitySettings() {
  const { token } = useAuth();
  const [windows, setWindows] = useState<AvailabilityWindow[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [weekday, setWeekday] = useState(1); // Tuesday
  const [start, setStart] = useState('17:00');
  const [end, setEnd] = useState('19:00');

  const load = useCallback(() => {
    if (!token) return;
    listAvailability(token)
      // default hours only (property === null); overrides are managed per-property
      .then((all) => setWindows(all.filter((w) => w.property === null)))
      .catch(() => setWindows([]));
  }, [token]);

  useEffect(() => {
    load();
  }, [load]);

  const add = async () => {
    if (end <= start) {
      toast.error('End time must be after the start time.');
      return;
    }
    setBusy(true);
    try {
      await createAvailability(token!, {
        weekday,
        start_time: start,
        end_time: end,
      });
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not add that.');
    } finally {
      setBusy(false);
    }
  };

  const remove = async (id: number) => {
    setBusy(true);
    try {
      await deleteAvailability(token!, id);
      load();
    } catch {
      toast.error('Could not remove that.');
    } finally {
      setBusy(false);
    }
  };

  const byDay = (windows ?? []).reduce<Record<number, AvailabilityWindow[]>>(
    (acc, w) => {
      (acc[w.weekday] ??= []).push(w);
      return acc;
    },
    {}
  );

  return (
    <div className="space-y-6">
      <div>
        <h2 className="flex items-center gap-2 text-lg font-semibold text-ink">
          <Clock className="h-5 w-5 text-[hsl(var(--brand))]" /> Viewing hours
        </h2>
        <p className="mt-1 text-sm text-ink-3">
          When you usually do showings. Prospects see these as suggested times;
          requests outside them get flagged so you notice. You can still confirm
          any time — nothing here blocks a booking.
        </p>
      </div>

      {windows === null ? (
        <p className="text-sm text-ink-4">Loading…</p>
      ) : windows.length === 0 ? (
        <p
          className="rounded-lg border border-dashed px-4 py-6 text-center text-sm text-ink-4"
          style={{ borderColor: 'hsl(var(--line))' }}
        >
          No hours set yet. Add a window below and your public listings will
          start suggesting times.
        </p>
      ) : (
        <ul className="space-y-1.5">
          {DAYS.map((day, idx) =>
            byDay[idx]?.length ? (
              <li key={idx} className="flex items-center gap-3 text-sm">
                <span className="w-24 font-medium text-ink-2">{day}</span>
                <div className="flex flex-wrap gap-1.5">
                  {byDay[idx]
                    .sort((a, b) => a.start_time.localeCompare(b.start_time))
                    .map((w) => (
                      <span
                        key={w.id}
                        className="inline-flex items-center gap-1.5 rounded-full border bg-white px-2.5 py-0.5 text-xs text-ink-2"
                        style={{ borderColor: 'hsl(var(--line))' }}
                      >
                        {fmtTime(w.start_time)}–{fmtTime(w.end_time)}
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => remove(w.id)}
                          className="text-ink-5 hover:text-red-600"
                          aria-label="Remove"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </span>
                    ))}
                </div>
              </li>
            ) : null
          )}
        </ul>
      )}

      <div
        className="flex flex-wrap items-end gap-3 rounded-lg border p-4"
        style={{ borderColor: 'hsl(var(--line))' }}
      >
        <div className="space-y-1">
          <Label className="text-xs">Day</Label>
          <select
            value={weekday}
            onChange={(e) => setWeekday(Number(e.target.value))}
            className="field w-36 py-2"
          >
            {DAYS.map((d, i) => (
              <option key={i} value={i}>
                {d}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1">
          <Label className="text-xs">From</Label>
          <Input
            type="time"
            value={start}
            onChange={(e) => setStart(e.target.value)}
            className="w-32"
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">To</Label>
          <Input
            type="time"
            value={end}
            onChange={(e) => setEnd(e.target.value)}
            className="w-32"
          />
        </div>
        <Button
          className="bg-[hsl(var(--brand))] hover:bg-[hsl(var(--brand-hover))]"
          disabled={busy}
          onClick={add}
        >
          <Plus className="mr-1 h-4 w-4" /> Add
        </Button>
      </div>
    </div>
  );
}
