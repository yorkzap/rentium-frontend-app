// UpcomingStrip.tsx
//
// The tenant home's at-a-glance strip: next visit to the unit, next rent
// due, and whether a signature is outstanding. Three things a tenant asks
// "do I need to do anything?" about, answered in one look instead of
// scattered across banners and side cards.
'use client';
import { useEffect, useState } from 'react';
import { CalendarClock, CreditCard, PenLine, CheckCircle2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { listAppointments, type Appointment } from '@/lib/appointmentsApi';
import { cn } from '@/lib/utils';

function Tile({
  icon: Icon,
  label,
  value,
  hint,
  tone = 'slate',
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  hint?: string;
  tone?: 'slate' | 'amber' | 'red' | 'green';
}) {
  const tones: Record<string, string> = {
    slate: 'bg-surface-sunken text-ink-2',
    amber: 'bg-amber-50 text-amber-600',
    red: 'bg-red-50 text-red-600',
    green: 'bg-green-50 text-green-600',
  };
  return (
    <div className="flex items-center gap-3 rounded-md border border-line bg-white p-3">
      <div className={cn('flex-shrink-0 rounded-full p-2', tones[tone])}>
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0">
        <p className="text-xs text-ink-3">{label}</p>
        <p className="truncate text-sm font-medium text-ink">{value}</p>
        {hint && <p className="truncate text-xs text-ink-4">{hint}</p>}
      </div>
    </div>
  );
}

export default function UpcomingStrip({
  leaseId,
  nextDueLabel,
  nextDueHint,
  nextDueTone,
  signatureState,
}: {
  leaseId: string;
  /** e.g. "$1,200.00" or "Nothing due" */
  nextDueLabel: string;
  /** e.g. "Due in 3 days" or "3 days overdue" */
  nextDueHint: string;
  nextDueTone: 'slate' | 'amber' | 'red' | 'green';
  /** null when there's nothing to sign; otherwise a short status label. */
  signatureState: { label: string; hint: string } | null;
}) {
  const { token } = useAuth();
  const [visits, setVisits] = useState<Appointment[] | null>(null);

  useEffect(() => {
    if (!token || !leaseId) return;
    listAppointments(token, { lease: leaseId, upcoming: true })
      .then((items) => setVisits(items.filter((a) => a.status === 'SCHEDULED')))
      .catch(() => setVisits([]));
  }, [token, leaseId]);

  const nextVisit = visits?.[0] ?? null;
  const visitLabel = nextVisit
    ? new Date(nextVisit.starts_at).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
      })
    : visits === null
      ? '…'
      : 'None scheduled';
  const visitHint = nextVisit
    ? `${nextVisit.kind_display}${nextVisit.contact_name ? ` · ${nextVisit.contact_name}` : ''}`
    : visits === null
      ? undefined
      : "You'll see it here as soon as it's booked";

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
      <Tile
        icon={CalendarClock}
        label="Next visit"
        value={visitLabel}
        hint={visitHint}
        tone={nextVisit ? 'amber' : 'slate'}
      />
      <Tile
        icon={CreditCard}
        label="Next rent due"
        value={nextDueLabel}
        hint={nextDueHint}
        tone={nextDueTone}
      />
      {signatureState ? (
        <Tile
          icon={PenLine}
          label="Signature"
          value={signatureState.label}
          hint={signatureState.hint}
          tone="amber"
        />
      ) : (
        <Tile
          icon={CheckCircle2}
          label="Signature"
          value="All signed"
          tone="green"
        />
      )}
    </div>
  );
}
