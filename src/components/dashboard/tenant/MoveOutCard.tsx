// MoveOutCard.tsx
// Tenant-side "Moving out?" card. ALL business rules come from the backend
// (GET /leases/<id>/moveout-rules/) — this component only presents them:
//   - date >= earliest valid date  -> standard written notice, accepted
//     automatically (no landlord approval needed);
//   - earlier date                 -> a Mutual Agreement (RTB-8 in BC)
//     request the landlord may accept & sign or decline. Until accepted,
//     rent through the full notice period stays owed.
// Also shows/handles a landlord-initiated mutual agreement awaiting the
// tenant's signature.
"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { DoorOpen, Loader2, FileSignature, CheckCircle2, XCircle, Info } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import {
  MoveOutRequest, MoveOutRules,
  acceptMoveOut, cancelMoveOut, createMoveOut, declineMoveOut,
  fetchMoveOutRules, listMoveOuts,
} from "@/lib/moveoutApi";

const fmt = (iso: string | null | undefined) =>
  iso ? new Date(`${iso}T00:00:00`).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }) : "—";

export default function MoveOutCard({ leaseId }: { leaseId: string }) {
  const { token } = useAuth();
  const [rules, setRules] = useState<MoveOutRules | null>(null);
  const [requests, setRequests] = useState<MoveOutRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [endDate, setEndDate] = useState("");
  const [reason, setReason] = useState("");
  const [declineReason, setDeclineReason] = useState("");
  const [showDecline, setShowDecline] = useState(false);

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
      /* lease may not support move-outs (e.g. not active) — hide quietly */
    } finally {
      setLoading(false);
    }
  }, [token, leaseId]);
  useEffect(() => { load(); }, [load]);

  const pending = requests.find((r) => r.status === "PENDING");
  const accepted = requests.find((r) => r.status === "ACCEPTED");
  const isMutualDate = useMemo(
    () => !!(rules && endDate && endDate < rules.earliest_tenant_end_date),
    [rules, endDate],
  );

  const submit = async () => {
    if (!token || !rules || !endDate) return;
    setBusy(true);
    try {
      const created = await createMoveOut(token, {
        lease: leaseId,
        requested_end_date: endDate,
        reason,
        request_mutual: isMutualDate,
      });
      if (created.status === "ACCEPTED") {
        toast.success(`Notice accepted — your tenancy ends ${fmt(created.effective_end_date)}.`);
      } else {
        toast.success(
          `${created.form_type || "Mutual agreement"} request sent. Your landlord can accept & sign or decline — rent stays owed until it's accepted.`,
        );
      }
      setEndDate(""); setReason("");
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to submit.");
    } finally {
      setBusy(false);
    }
  };

  const act = async (fn: () => Promise<unknown>, okMsg: string) => {
    setBusy(true);
    try { await fn(); toast.success(okMsg); setShowDecline(false); setDeclineReason(""); load(); }
    catch (err) { toast.error(err instanceof Error ? err.message : "Action failed."); }
    finally { setBusy(false); }
  };

  if (loading || !rules) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <DoorOpen className="h-4 w-4 text-slate-500" /> Moving Out?
        </CardTitle>
        <CardDescription>{rules.summary}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {accepted && (
          <div className="rounded-md border border-green-200 bg-green-50 p-3 text-sm text-green-800 flex items-start gap-2">
            <CheckCircle2 className="h-4 w-4 mt-0.5 flex-shrink-0" />
            <div>
              Your tenancy ends <strong>{fmt(accepted.effective_end_date)}</strong> (vacate by 1 p.m.).
              {accepted.kind === "MUTUAL_AGREEMENT" && (
                <> Final month's rent: {accepted.rent_handling_display.toLowerCase()}.</>
              )}
            </div>
          </div>
        )}

        {pending && pending.initiated_by === "TENANT" && (
          <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800 space-y-2">
            <p className="font-medium flex items-center gap-1.5">
              <FileSignature className="h-4 w-4" />
              {pending.form_type || "Mutual agreement"} request pending — awaiting your landlord
            </p>
            <p>
              Proposed end: <strong>{fmt(pending.requested_end_date)}</strong>. Until your landlord accepts
              and signs, rent through your full notice period is still owed. If declined, your normal
              notice rules apply.
            </p>
            <Button size="sm" variant="outline" disabled={busy}
              onClick={() => act(() => cancelMoveOut(token!, pending.id), "Request cancelled.")}>
              Cancel request
            </Button>
          </div>
        )}

        {pending && pending.initiated_by === "LANDLORD" && (
          <div className="rounded-md border border-blue-200 bg-blue-50 p-3 text-sm text-blue-900 space-y-3">
            <p className="font-medium flex items-center gap-1.5">
              <FileSignature className="h-4 w-4" />
              Your landlord proposes ending the tenancy — {pending.form_type || "Mutual Agreement"}
            </p>
            <p>
              Proposed end date: <strong>{fmt(pending.requested_end_date)}</strong> (vacate by 1 p.m.).
              {pending.reason && <> Reason: {pending.reason}.</>}
              {" "}Final month's rent if you accept: {pending.rent_handling_display.toLowerCase()}.
            </p>
            <p className="text-xs">
              This is NOT a Notice to End Tenancy — you are under no obligation to sign. By signing, both
              parties agree the tenancy ends on the date above with no further obligation between you.
              Questions? Contact the Residential Tenancy Branch (1-800-665-8779) before signing.
            </p>
            <div className="flex flex-wrap gap-2">
              <Button size="sm" className="bg-slate-900 hover:bg-slate-800" disabled={busy}
                onClick={() => act(() => acceptMoveOut(token!, pending.id), "Signed — the tenancy end date is now set.")}>
                {busy ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5 mr-1" />}
                Accept & Sign
              </Button>
              <Button size="sm" variant="outline" disabled={busy} onClick={() => setShowDecline((v) => !v)}>
                <XCircle className="h-3.5 w-3.5 mr-1" /> Decline
              </Button>
            </div>
            {showDecline && (
              <div className="space-y-2">
                <Textarea placeholder="Optional — why are you declining?" value={declineReason}
                  onChange={(e) => setDeclineReason(e.target.value)} className="min-h-[60px] bg-white" />
                <Button size="sm" variant="destructive" disabled={busy}
                  onClick={() => act(() => declineMoveOut(token!, pending.id, declineReason), "Declined. Nothing changes — your tenancy continues.")}>
                  Confirm decline
                </Button>
              </div>
            )}
          </div>
        )}

        {!pending && !accepted && (
          <div className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">I want my tenancy to end on</Label>
                <Input type="date" value={endDate} min={rules.today} onChange={(e) => setEndDate(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Reason (optional)</Label>
                <Input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. relocating for work" />
              </div>
            </div>
            <div className="rounded-md bg-slate-50 border p-3 text-xs text-slate-600 flex items-start gap-2">
              <Info className="h-3.5 w-3.5 mt-0.5 flex-shrink-0 text-slate-400" />
              <div>
                With notice given today, the earliest standard end date is{" "}
                <strong>{fmt(rules.earliest_tenant_end_date)}</strong> — pick that or later and your
                notice is <strong>accepted automatically</strong>.
                {endDate && isMutualDate && (
                  <span className="block mt-1 text-amber-700">
                    {fmt(endDate)} is earlier than your notice period allows, so this will be sent as a{" "}
                    <strong>{rules.mutual_agreement_form} Mutual Agreement request</strong>. Your landlord
                    may accept &amp; sign or decline — until accepted, rent through{" "}
                    {fmt(rules.earliest_tenant_end_date)} is still owed.
                  </span>
                )}
              </div>
            </div>
            <Button className="bg-slate-900 hover:bg-slate-800" disabled={busy || !endDate} onClick={submit}>
              {busy && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {isMutualDate ? `Request ${rules.mutual_agreement_form} Mutual Agreement` : "Give Written Notice"}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}