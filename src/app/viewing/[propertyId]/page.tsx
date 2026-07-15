// page.tsx
// The link landlords share with prospective tenants (copy it from the
// Calendar page). Shows a privacy-safe teaser (name, city, type, photo —
// never the street address) and a request form. Submitting creates a
// REQUESTED appointment that lands in the landlord's calendar to confirm
// or decline; the requester is told to expect an email either way.
'use client';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  CalendarCheck,
  CheckCircle2,
  Home,
  Loader2,
  MapPin,
} from 'lucide-react';
import {
  fetchPublicProperty,
  submitViewingRequest,
  type PublicProperty,
} from '@/lib/appointmentsApi';

export default function PublicViewingPage() {
  const params = useParams();
  const propertyId = params.propertyId as string;
  const [property, setProperty] = useState<PublicProperty | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<{
    reference: string;
    detail: string;
    status_token?: string;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  // form
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('17:00');
  const [message, setMessage] = useState('');

  useEffect(() => {
    fetchPublicProperty(propertyId)
      .then(setProperty)
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [propertyId]);

  const submit = async () => {
    if (!property || !name || !email || !date) return;
    setBusy(true);
    setError(null);
    try {
      const res = await submitViewingRequest({
        property: property.id,
        name,
        email,
        phone,
        requested_time: new Date(`${date}T${time}:00`).toISOString(),
        message,
      });
      setDone({
        reference: res.reference,
        detail: res.detail,
        status_token: res.status_token,
      });
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Something went wrong — try again.'
      );
    } finally {
      setBusy(false);
    }
  };

  const today = new Date().toISOString().slice(0, 10);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-teal-600" />
      </div>
    );
  }
  if (notFound || !property) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center space-y-2">
            <Home className="h-8 w-8 mx-auto text-slate-300" />
            <p className="font-medium text-slate-700">
              This listing isn&apos;t available
            </p>
            <p className="text-sm text-slate-500">
              The link may be outdated — ask the landlord for a new one.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 py-8 px-4">
      <div className="max-w-md mx-auto space-y-4">
        {/* brand */}
        <div className="flex items-center justify-center gap-2 text-slate-900">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-teal-600"
          >
            <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
            <polyline points="9 22 9 12 15 12 15 22" />
          </svg>
          <span className="font-bold">Rentium</span>
        </div>

        {/* property teaser */}
        <Card className="overflow-hidden">
          {property.image && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={property.image}
              alt={property.name}
              className="h-44 w-full object-cover"
            />
          )}
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between gap-2">
              <div>
                <CardTitle className="text-lg">{property.name}</CardTitle>
                <CardDescription className="flex items-center gap-1 mt-1">
                  <MapPin className="h-3.5 w-3.5" /> {property.city},{' '}
                  {property.province}
                </CardDescription>
              </div>
              <Badge
                variant="outline"
                className={
                  property.available
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    : 'bg-slate-100 text-slate-500 border-slate-200'
                }
              >
                {property.available ? 'Available' : 'Currently occupied'}
              </Badge>
            </div>
            <p className="text-xs text-slate-500 pt-1">
              {property.category}
              {property.room_type ? ` · ${property.room_type}` : ''}
            </p>
          </CardHeader>
        </Card>

        {done ? (
          <Card>
            <CardContent className="pt-6 text-center space-y-3">
              <CheckCircle2 className="h-10 w-10 mx-auto text-teal-600" />
              <p className="font-semibold text-slate-800">Request sent!</p>
              <p className="text-sm text-slate-600">{done.detail}</p>
              {done.status_token && (
                <p className="text-sm">
                  <a
                    href={`/viewing/status/${done.status_token}`}
                    className="font-medium text-teal-700 underline"
                  >
                    Track your request
                  </a>{' '}
                  <span className="text-slate-500">
                    — the same link is in your email.
                  </span>
                </p>
              )}
              <p className="text-xs text-slate-400">
                Reference: {done.reference}
              </p>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <CalendarCheck className="h-4 w-4 text-teal-600" /> Request a
                viewing
              </CardTitle>
              <CardDescription>
                No account needed. Pick a time that works — the landlord will
                confirm or propose another time by email.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Your name *</Label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Jane Doe"
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">Email *</Label>
                  <Input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="jane@example.com"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Phone (optional)</Label>
                  <Input
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="250-555-0100"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">Preferred date *</Label>
                  <Input
                    type="date"
                    min={today}
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Time</Label>
                  <Input
                    type="time"
                    value={time}
                    onChange={(e) => setTime(e.target.value)}
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Message (optional)</Label>
                <Textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Anything the landlord should know — move-in timeline, questions…"
                  className="min-h-[70px]"
                />
              </div>
              {error && <p className="text-sm text-red-600">{error}</p>}
              <Button
                className="w-full bg-teal-600 hover:bg-teal-700"
                disabled={busy || !name || !email || !date}
                onClick={submit}
              >
                {busy && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Request Viewing
              </Button>
              <p className="text-[11px] text-slate-400 text-center">
                Your details are shared only with this property&apos;s landlord.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
