// LeaseMoveOuts.tsx
// Landlord-side move-out management for one lease. Presents backend
// decisions (leases/tenancy_rules.py); never computes rules itself.
'use client';
import { useCallback, useEffect, useState } from 'react';
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DoorOpen,
  Loader2,
  FileSignature,
  CheckCircle2,
  XCircle,
  Plus,
  Info,
} from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import {
  MoveOutRequest,
  MoveOutRules,
  RentHandling,
  acceptMoveOut,
  cancelMoveOut,
  createMoveOut,
  declineMoveOut,
  fetchMoveOutRules,
  listMoveOuts,
} from '@/lib/moveoutApi';

const fmt = (iso: string | null | undefined) =>
  iso
    ? new Date(`${iso}T00:00:00`).toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      })
    : '—';

const RENT_OPTIONS: { value: RentHandling; label: string }[] = [
  { value: 'NONE', label: 'Keep final month as billed' },
  { value: 'PRORATE_FINAL', label: 'Prorate final month (credit unused days)' },
  { value: 'VOID_FINAL', label: "Void the final month's rent" },
];

const statusBadge = (s: string) =>
  s === 'ACCEPTED'
    ? 'bg-green-50 text-green-700 border-green-200'
    : s === 'PENDING'
      ? 'bg-amber-50 text-amber-700 border-amber-200'
      : s === 'DECLINED'
        ? 'bg-red-50 text-red-600 border-red-200'
        : 'bg-slate-50 text-slate-500 border-slate-200';

export default function LeaseMoveOuts({
  leaseId,
  isActive,
}: {
  leaseId: string;
  isActive: boolean;
}) {
  const { token } = useAuth();
  const [rules, setRules] = useState<MoveOutRules | null>(null);
  const [requests, setRequests] = useState<MoveOutRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  // accept panel state
  const [rentHandling, setRentHandling] = useState<RentHandling>('NONE');
  const [declineReason, setDeclineReason] = useState('');
  const [showDecline, setShowDecline] = useState(false);
  // initiate panel state
  const [showInitiate, setShowInitiate] = useState(false);
  const [initKind, setInitKind] = useState<
    'MUTUAL_AGREEMENT' | 'LANDLORD_NOTICE'
  >('MUTUAL_AGREEMENT');
  const [initDate, setInitDate] = useState('');
  const [initReason, setInitReason] = useState('');
  const [initRent, setInitRent] = useState<RentHandling>('NONE');

  const load = useCallback(async () => {
    if (!token) return;
    try {
      const [r, reqs] = await Promise.all([
        fetchMoveOutRules(token, leaseId),
        listMoveOuts(token, leaseId),
      ]);
      setRules(r);
      setRequests(reqs);
    } catch {
      /* non-active lease etc. */
    } finally {
      setLoading(false);
    }
  }, [token, leaseId]);
  useEffect(() => {
    load();
  }, [load]);

  const act = async (fn: () => Promise<unknown>, okMsg: string) => {
    setBusy(true);
    try {
      await fn();
      toast.success(okMsg);
      setShowDecline(false);
      setShowInitiate(false);
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Action failed.');
    } finally {
      setBusy(false);
    }
  };

  if (loading || !rules) return null;
  const pending = requests.find((r) => r.status === 'PENDING');
  const history = requests.filter((r) => r.status !== 'PENDING');
  if (!isActive && requests.length === 0) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <DoorOpen className="h-4 w-4 text-slate-500" /> End of Tenancy
        </CardTitle>
        <CardDescription>{rules.summary}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* ---- Pending request awaiting the landlord ---- */}
        {pending && pending.initiated_by === 'TENANT' && (
          <div className="rounded-md border border-amber-200 bg-amber-50 p-4 space-y-3 text-sm text-amber-900">
            <p className="font-medium flex items-center gap-1.5">
              <FileSignature className="h-4 w-4" />
              {pending.tenant_name || 'Tenant'} requests a{' '}
              {pending.form_type || 'mutual agreement'} — your signature decides
            </p>
            <div className="rounded border bg-white p-3 space-y-1 text-slate-700">
              <p className="text-xs uppercase tracking-wide text-slate-400">
                Mutual Agreement to End a Tenancy{' '}
                {pending.form_type && `· ${pending.form_type}`}
              </p>
              <p>
                The tenant(s) agree to vacate the premises at{' '}
                <strong>1:00 PM</strong> on{' '}
                <strong>{fmt(pending.requested_end_date)}</strong>.
              </p>
              {pending.reason && (
                <p className="text-slate-500">
                  Tenant&apos;s reason: {pending.reason}
                </p>
              )}
              <p className="text-xs text-slate-500 pt-1">
                Note: this is NOT a Notice to End Tenancy. Neither party is
                obliged to sign. By signing, both parties agree the tenancy ends
                on the date above with no further obligation between landlord
                and tenant. Signed by tenant{' '}
                {pending.tenant_signed_at
                  ? new Date(pending.tenant_signed_at).toLocaleDateString()
                  : ''}
                .
              </p>
            </div>
            <p className="text-xs">
              If you decline, nothing changes — the tenant owes rent through
              their full notice period (earliest standard end:{' '}
              {fmt(rules.earliest_tenant_end_date)}).
            </p>
            <div className="space-y-2">
              <Label className="text-xs">
                If you accept — the final month&apos;s rent:
              </Label>
              <Select
                value={rentHandling}
                onValueChange={(v) => setRentHandling(v as RentHandling)}
              >
                <SelectTrigger className="bg-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {RENT_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                className="bg-slate-900 hover:bg-slate-800"
                disabled={busy}
                onClick={() =>
                  act(
                    () =>
                      acceptMoveOut(token!, pending.id, {
                        rent_handling: rentHandling,
                      }),
                    'Signed. Tenancy end date set; future charges beyond it were voided.'
                  )
                }
              >
                {busy ? (
                  <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />
                ) : (
                  <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
                )}
                Accept & Sign
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={busy}
                onClick={() => setShowDecline((v) => !v)}
              >
                <XCircle className="h-3.5 w-3.5 mr-1" /> Decline
              </Button>
            </div>
            {showDecline && (
              <div className="space-y-2">
                <Textarea
                  placeholder="Optional — reason shown to the tenant"
                  value={declineReason}
                  onChange={(e) => setDeclineReason(e.target.value)}
                  className="min-h-[60px] bg-white"
                />
                <Button
                  size="sm"
                  variant="destructive"
                  disabled={busy}
                  onClick={() =>
                    act(
                      () => declineMoveOut(token!, pending.id, declineReason),
                      'Declined — the tenancy continues under its normal notice rules.'
                    )
                  }
                >
                  Confirm decline
                </Button>
              </div>
            )}
          </div>
        )}

        {pending && pending.initiated_by === 'LANDLORD' && (
          <div className="rounded-md border border-blue-200 bg-blue-50 p-3 text-sm text-blue-900 space-y-2">
            <p className="font-medium">
              Your {pending.kind_display.toLowerCase()} is awaiting the
              tenant&apos;s signature
            </p>
            <p>
              Proposed end: <strong>{fmt(pending.requested_end_date)}</strong> ·
              Final month: {pending.rent_handling_display.toLowerCase()}.
            </p>
            <Button
              size="sm"
              variant="outline"
              disabled={busy}
              onClick={() =>
                act(
                  () => cancelMoveOut(token!, pending.id),
                  'Proposal withdrawn.'
                )
              }
            >
              Withdraw proposal
            </Button>
          </div>
        )}

        {/* ---- Initiate (landlord) ---- */}
        {!pending &&
          isActive &&
          (!showInitiate ? (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowInitiate(true)}
            >
              <Plus className="h-3.5 w-3.5 mr-1" /> End this tenancy…
            </Button>
          ) : (
            <div className="rounded-md border p-4 space-y-3 text-sm">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">How</Label>
                  <Select
                    value={initKind}
                    onValueChange={(v) => setInitKind(v as typeof initKind)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="MUTUAL_AGREEMENT">
                        Propose a {rules.mutual_agreement_form} mutual agreement
                        (tenant must sign)
                      </SelectItem>
                      <SelectItem value="LANDLORD_NOTICE">
                        Serve notice for landlord use (e.g. moving in)
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Tenancy ends on</Label>
                  <Input
                    type="date"
                    value={initDate}
                    onChange={(e) => setInitDate(e.target.value)}
                    min={
                      initKind === 'LANDLORD_NOTICE'
                        ? rules.earliest_landlord_end_date
                        : rules.today
                    }
                  />
                </div>
              </div>
              {initKind === 'LANDLORD_NOTICE' && (
                <p className="text-xs text-slate-500 flex items-start gap-1.5">
                  <Info className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" />
                  {rules.landlord_notice_months
                    ? `Statutory minimum applies: with notice served today, the earliest end date is ${fmt(rules.earliest_landlord_end_date)} (${rules.landlord_notice_months} clear months). For an earlier date, propose a ${rules.mutual_agreement_form} instead.`
                    : "You share common areas with this tenancy, so no statutory minimum applies — the lease's own terms govern. Pick any date."}
                </p>
              )}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">Reason</Label>
                  <Input
                    value={initReason}
                    onChange={(e) => setInitReason(e.target.value)}
                    placeholder="e.g. landlord moving in"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Final month&apos;s rent</Label>
                  <Select
                    value={initRent}
                    onValueChange={(v) => setInitRent(v as RentHandling)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {RENT_OPTIONS.map((o) => (
                        <SelectItem key={o.value} value={o.value}>
                          {o.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  className="bg-slate-900 hover:bg-slate-800"
                  disabled={busy || !initDate}
                  onClick={() =>
                    act(
                      () =>
                        createMoveOut(token!, {
                          lease: leaseId,
                          kind: initKind,
                          requested_end_date: initDate,
                          reason: initReason,
                          rent_handling: initRent,
                        }),
                      initKind === 'LANDLORD_NOTICE'
                        ? 'Notice served — tenancy end date set.'
                        : 'Proposal sent — the tenant will be asked to sign.'
                    )
                  }
                >
                  {busy && (
                    <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />
                  )}
                  {initKind === 'LANDLORD_NOTICE'
                    ? 'Serve Notice'
                    : 'Send Proposal'}
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setShowInitiate(false)}
                >
                  Cancel
                </Button>
              </div>
            </div>
          ))}

        {/* ---- History ---- */}
        {history.length > 0 && (
          <ul className="divide-y border rounded-md text-sm">
            {history.map((r) => (
              <li
                key={r.id}
                className="p-3 flex flex-wrap items-center justify-between gap-2"
              >
                <div>
                  <p className="font-medium text-slate-700">{r.kind_display}</p>
                  <p className="text-xs text-slate-500">
                    {r.status === 'ACCEPTED' ? (
                      <>
                        Tenancy ends {fmt(r.effective_end_date)} · final month:{' '}
                        {r.rent_handling_display.toLowerCase()}
                      </>
                    ) : r.status === 'DECLINED' ? (
                      <>
                        Requested {fmt(r.requested_end_date)}
                        {r.decline_reason ? ` · "${r.decline_reason}"` : ''}
                      </>
                    ) : (
                      <>Requested {fmt(r.requested_end_date)}</>
                    )}
                  </p>
                </div>
                <Badge variant="outline" className={statusBadge(r.status)}>
                  {r.status_display}
                </Badge>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
