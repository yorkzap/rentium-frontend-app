// InspectionScheduleCard.tsx
//
// The tenant's half of scheduling a move-in / move-out condition inspection.
// The landlord proposes a walk-through time; the tenant accepts it or suggests
// another — the same negotiation as a viewing, but between the two of them
// (no third party). Only appointments awaiting the tenant's reply show here.
'use client';
import { useCallback, useEffect, useState } from 'react';
import { ClipboardCheck, Check } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import {
  listAppointments,
  respondToInspectionSchedule,
  type Appointment,
} from '@/lib/appointmentsApi';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const fmtWhen = (iso: string) =>
  new Date(iso).toLocaleString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });

export default function InspectionScheduleCard({
  leaseId,
}: {
  leaseId: string;
}) {
  const { token } = useAuth();
  const [items, setItems] = useState<Appointment[]>([]);
  const [busy, setBusy] = useState(false);
  const [counterId, setCounterId] = useState<string | null>(null);
  const [date, setDate] = useState('');
  const [time, setTime] = useState('10:00');

  const load = useCallback(() => {
    if (!token || !leaseId) return;
    listAppointments(token, { lease: leaseId })
      .then((all) =>
        setItems(
          all.filter(
            (a) => a.kind === 'INSPECTION' && a.status === 'AWAITING_REQUESTER'
          )
        )
      )
      .catch(() => setItems([]));
  }, [token, leaseId]);

  useEffect(() => {
    load();
  }, [load]);

  if (items.length === 0) return null;

  const respond = async (
    id: string,
    payload: { action: 'accept' } | { action: 'counter'; starts_at: string }
  ) => {
    setBusy(true);
    try {
      await respondToInspectionSchedule(token!, id, payload);
      toast.success(
        payload.action === 'accept'
          ? 'Confirmed — see you then.'
          : 'Sent — your landlord will confirm or reply.'
      );
      setCounterId(null);
      setDate('');
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not send that.');
    } finally {
      setBusy(false);
    }
  };

  const today = new Date().toISOString().slice(0, 10);

  return (
    <div className="rounded-lg border border-sky-200 bg-sky-50/60 p-4">
      <p className="flex items-center gap-2 text-sm font-medium text-sky-900">
        <ClipboardCheck className="h-4 w-4" />
        Confirm your inspection time
      </p>
      <ul className="mt-3 space-y-3">
        {items.map((a) => (
          <li
            key={a.id}
            className="rounded-md border border-sky-200 bg-white p-3 text-sm"
          >
            <p className="font-medium text-slate-800">
              {a.property_name} — {fmtWhen(a.starts_at)}
            </p>
            <p className="mt-0.5 text-xs text-slate-500">
              Your landlord proposed this time for the condition walk-through.
            </p>
            {counterId === a.id ? (
              <div className="mt-3 space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <Label className="text-xs">Date</Label>
                    <Input
                      type="date"
                      min={today}
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Time</Label>
                    <Input
                      type="time"
                      value={time}
                      onChange={(e) => setTime(e.target.value)}
                    />
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    className="bg-sky-600 hover:bg-sky-700"
                    disabled={busy || !date}
                    onClick={() =>
                      respond(a.id, {
                        action: 'counter',
                        starts_at: new Date(`${date}T${time}:00`).toISOString(),
                      })
                    }
                  >
                    Suggest this
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    disabled={busy}
                    onClick={() => setCounterId(null)}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <div className="mt-3 flex gap-2">
                <Button
                  size="sm"
                  className="bg-teal-600 hover:bg-teal-700"
                  disabled={busy}
                  onClick={() => respond(a.id, { action: 'accept' })}
                >
                  <Check className="mr-1 h-3.5 w-3.5" /> That works
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={busy}
                  onClick={() => setCounterId(a.id)}
                >
                  Suggest another time
                </Button>
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
