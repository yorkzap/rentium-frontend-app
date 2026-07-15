// /viewing/status/[token]
//
// The prospective tenant's tracking page. The token is a per-appointment
// capability carried by their confirmation email — no account, no login.
// Shows exactly the privacy-safe teaser the booking page showed, plus the
// live status of their request: awaiting confirmation, confirmed (with
// the final time), or not going ahead.
'use client';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  CalendarCheck,
  CalendarClock,
  CalendarX2,
  Loader2,
  MapPin,
} from 'lucide-react';
import { fetchViewingStatus, type ViewingStatus } from '@/lib/appointmentsApi';

const fmtWhen = (iso: string) =>
  new Date(iso).toLocaleString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });

export default function ViewingStatusPage() {
  const params = useParams();
  const token = params.token as string;
  const [status, setStatus] = useState<ViewingStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    fetchViewingStatus(token)
      .then(setStatus)
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [token]);

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-neutral-400" />
      </div>
    );
  }

  if (notFound || !status) {
    return (
      <div className="mx-auto max-w-md px-4 py-16 text-center">
        <CalendarX2 className="mx-auto mb-4 h-12 w-12 text-neutral-300" />
        <h1 className="mb-2 text-xl font-semibold text-neutral-900">
          We couldn&apos;t find that viewing request
        </h1>
        <p className="text-sm text-neutral-500">
          The link may be incomplete — try opening it again from your email.
        </p>
      </div>
    );
  }

  const tone =
    status.status === 'SCHEDULED'
      ? {
          icon: CalendarCheck,
          badge: 'bg-emerald-50 text-emerald-700 border-emerald-200',
          headline: "You're confirmed",
          body: `The landlord confirmed your viewing for ${fmtWhen(status.starts_at)}.`,
        }
      : status.status === 'REQUESTED'
        ? {
            icon: CalendarClock,
            badge: 'bg-amber-50 text-amber-700 border-amber-200',
            headline: 'Waiting on the landlord',
            body: `You asked to view on ${fmtWhen(status.starts_at)}. You'll get an email as soon as the landlord confirms or proposes another time.`,
          }
        : status.status === 'COMPLETED'
          ? {
              icon: CalendarCheck,
              badge: 'bg-neutral-100 text-neutral-600 border-neutral-200',
              headline: 'This viewing already happened',
              body: `It took place on ${fmtWhen(status.starts_at)}. Thanks for coming by.`,
            }
          : {
              icon: CalendarX2,
              badge: 'bg-rose-50 text-rose-700 border-rose-200',
              headline: "This time won't work",
              body: `The viewing requested for ${fmtWhen(status.starts_at)} isn't going ahead. If the place is still listed, you're welcome to request another slot.`,
            };
  const Icon = tone.icon;

  return (
    <div className="mx-auto max-w-lg px-4 py-12">
      <Card>
        <CardHeader>
          <div
            className={`mb-3 inline-flex w-fit items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium ${tone.badge}`}
          >
            <Icon className="h-3.5 w-3.5" /> {status.status_display}
          </div>
          <CardTitle className="text-xl">{tone.headline}</CardTitle>
          <CardDescription>{tone.body}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-4">
            <p className="font-medium text-neutral-900">
              {status.property.name}
            </p>
            <p className="mt-1 flex items-center gap-1 text-sm text-neutral-500">
              <MapPin className="h-3.5 w-3.5" />
              {status.property.location || status.property.city},{' '}
              {status.property.province?.toUpperCase()}
            </p>
            <p className="mt-1 text-sm text-neutral-500">
              {status.property.type_label}
            </p>
          </div>
          <p className="text-xs text-neutral-400">
            The exact address isn&apos;t shown here — the landlord shares it
            with you directly once your viewing is confirmed. Requested by{' '}
            {status.requested_by}.
          </p>
          <p className="text-xs text-neutral-400">
            Looking for other places?{' '}
            <Link href="/" className="text-teal-700 underline">
              Browse Rentium
            </Link>
            .
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
