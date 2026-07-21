// ViewingConsentCard.tsx
//
// When someone asks to view the unit you live in, that showing is your notice
// of entry — and you get a say. This card surfaces any viewing at your home
// that's awaiting your input, and lets you tell the landlord it's fine, raise a
// concern, or suggest a better time. It's advisory: the landlord makes the
// final call (they may have already sorted it out with you directly), but your
// response is recorded.
'use client';
import { useCallback, useEffect, useState } from 'react';
import { CalendarClock, Check, MessageSquareWarning } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import {
  listAppointments,
  tenantRespondAppointment,
  type Appointment,
} from '@/lib/appointmentsApi';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

const fmtWhen = (iso: string) =>
  new Date(iso).toLocaleString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });

export default function ViewingConsentCard({ leaseId }: { leaseId: string }) {
  const { token } = useAuth();
  const [items, setItems] = useState<Appointment[]>([]);
  const [busy, setBusy] = useState(false);
  const [objectingId, setObjectingId] = useState<string | null>(null);
  const [notes, setNotes] = useState('');
  const [altDate, setAltDate] = useState('');
  const [altTime, setAltTime] = useState('17:00');

  const load = useCallback(() => {
    if (!token || !leaseId) return;
    listAppointments(token, { lease: leaseId })
      .then((all) =>
        setItems(all.filter((a) => a.tenant_consent === 'PENDING'))
      )
      .catch(() => setItems([]));
  }, [token, leaseId]);

  useEffect(() => {
    load();
  }, [load]);

  if (items.length === 0) return null;

  const respond = async (
    id: string,
    consent: 'OK' | 'OBJECTED',
    withAlt = false
  ) => {
    setBusy(true);
    try {
      await tenantRespondAppointment(token!, id, {
        consent,
        notes: notes || undefined,
        starts_at:
          withAlt && altDate
            ? new Date(`${altDate}T${altTime}:00`).toISOString()
            : undefined,
      });
      toast.success(
        consent === 'OK'
          ? 'Thanks — your landlord was told.'
          : 'Your concern was sent to your landlord.'
      );
      setObjectingId(null);
      setNotes('');
      setAltDate('');
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not send that.');
    } finally {
      setBusy(false);
    }
  };

  const today = new Date().toISOString().slice(0, 10);

  return (
    <div className="rounded-lg border border-amber-200 bg-amber-50/60 p-4">
      <p className="flex items-center gap-2 text-sm font-medium text-amber-900">
        <CalendarClock className="h-4 w-4" />
        {items.length === 1
          ? 'A viewing at your home needs your input'
          : `${items.length} viewings at your home need your input`}
      </p>
      <ul className="mt-3 space-y-3">
        {items.map((a) => (
          <li
            key={a.id}
            className="rounded-md border border-amber-200 bg-white p-3 text-sm"
          >
            <p className="font-medium text-slate-800">
              {a.property_name} — {fmtWhen(a.starts_at)}
            </p>
            <p className="mt-0.5 text-xs text-slate-500">
              This is your written notice of entry. Let your landlord know if it
              works — they make the final call.
            </p>

            {objectingId === a.id ? (
              <div className="mt-3 space-y-2">
                <div className="space-y-1">
                  <Label className="text-xs">
                    What&apos;s the concern? (optional)
                  </Label>
                  <Textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="e.g. I work nights and sleep during the day"
                    className="min-h-[60px]"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <Label className="text-xs">Suggest a date (optional)</Label>
                    <Input
                      type="date"
                      min={today}
                      value={altDate}
                      onChange={(e) => setAltDate(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Time</Label>
                    <Input
                      type="time"
                      value={altTime}
                      onChange={(e) => setAltTime(e.target.value)}
                    />
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    className="bg-amber-600 hover:bg-amber-700"
                    disabled={busy}
                    onClick={() => respond(a.id, 'OBJECTED', true)}
                  >
                    Send concern
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    disabled={busy}
                    onClick={() => {
                      setObjectingId(null);
                      setNotes('');
                    }}
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
                  onClick={() => respond(a.id, 'OK')}
                >
                  <Check className="mr-1 h-3.5 w-3.5" /> That works
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={busy}
                  onClick={() => setObjectingId(a.id)}
                >
                  <MessageSquareWarning className="mr-1 h-3.5 w-3.5" /> Raise a
                  concern
                </Button>
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
