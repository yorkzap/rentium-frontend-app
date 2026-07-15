// LeaseAppointments.tsx
// Landlord: schedule/cancel viewings & contractor visits for a lease's
// property. Tenants on the lease see these automatically (their entry
// notice) — export UpcomingVisitsCard below for the tenant dashboard.
"use client";
import { useCallback, useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { CalendarClock, Loader2, Plus, X } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import {
  Appointment, AppointmentKind,
  cancelAppointment, createAppointment, listAppointments,
} from "@/lib/appointmentsApi";

const fmtDT = (iso: string) =>
  new Date(iso).toLocaleString("en-US", {
    month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit",
  });

const kindBadge = (k: string) =>
  k === "VIEWING" ? "bg-indigo-50 text-indigo-700 border-indigo-200"
  : k === "CONTRACTOR" ? "bg-teal-50 text-teal-700 border-teal-200"
  : "bg-slate-50 text-slate-600 border-slate-200";

export default function LeaseAppointments({
  leaseId, propertyId,
}: { leaseId: string; propertyId: number | null }) {
  const { token } = useAuth();
  const [items, setItems] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [kind, setKind] = useState<AppointmentKind>("VIEWING");
  const [when, setWhen] = useState("");
  const [who, setWho] = useState("");
  const [phone, setPhone] = useState("");
  const [notes, setNotes] = useState("");

  const load = useCallback(async () => {
    if (!token) return;
    try { setItems(await listAppointments(token, { lease: leaseId })); }
    catch { /* appointments app may not be wired yet */ }
    finally { setLoading(false); }
  }, [token, leaseId]);
  useEffect(() => { load(); }, [load]);

  const create = async () => {
    if (!token || !propertyId || !when) return;
    setBusy(true);
    try {
      await createAppointment(token, {
        property: propertyId, lease: leaseId, kind,
        starts_at: new Date(when).toISOString(),
        contact_name: who, contact_phone: phone, notes,
      });
      toast.success("Scheduled — the tenant(s) are notified. In BC, entry needs 24h written notice; this record is that notice.");
      setShowForm(false); setWhen(""); setWho(""); setPhone(""); setNotes("");
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to schedule.");
    } finally { setBusy(false); }
  };

  const cancel = async (id: string) => {
    if (!token) return;
    setBusy(true);
    try { await cancelAppointment(token, id); toast.success("Cancelled — the tenant(s) are notified."); load(); }
    catch (err) { toast.error(err instanceof Error ? err.message : "Failed to cancel."); }
    finally { setBusy(false); }
  };

  if (loading) return null;
  const upcoming = items.filter((a) => a.status === "SCHEDULED");
  const past = items.filter((a) => a.status !== "SCHEDULED").slice(0, 5);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <CalendarClock className="h-4 w-4 text-slate-500" /> Appointments & Viewings
        </CardTitle>
        <CardDescription>
          Showings for the next tenant and contractor visits. Tenants on this lease see every
          scheduled visit — that's their written entry notice (24h in BC).
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {upcoming.length === 0 && !showForm && (
          <p className="text-sm text-slate-500">Nothing scheduled.</p>
        )}
        {upcoming.length > 0 && (
          <ul className="divide-y border rounded-md text-sm">
            {upcoming.map((a) => (
              <li key={a.id} className="p-3 flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-medium text-slate-700">
                    {fmtDT(a.starts_at)}
                    {a.contact_name && <span className="text-slate-500 font-normal"> · {a.contact_name}</span>}
                  </p>
                  {a.notes && <p className="text-xs text-slate-500 truncate">{a.notes}</p>}
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <Badge variant="outline" className={kindBadge(a.kind)}>{a.kind_display}</Badge>
                  <Button variant="ghost" size="icon" className="h-7 w-7" title="Cancel"
                    disabled={busy} onClick={() => cancel(a.id)}>
                    <X className="h-3.5 w-3.5 text-slate-400" />
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
        {!showForm ? (
          <Button variant="outline" size="sm" onClick={() => setShowForm(true)} disabled={!propertyId}>
            <Plus className="h-3.5 w-3.5 mr-1" /> Schedule
          </Button>
        ) : (
          <div className="rounded-md border p-3 space-y-3 text-sm">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Type</Label>
                <Select value={kind} onValueChange={(v) => setKind(v as AppointmentKind)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="VIEWING">Viewing / showing</SelectItem>
                    <SelectItem value="CONTRACTOR">Contractor / maintenance visit</SelectItem>
                    <SelectItem value="OTHER">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">When</Label>
                <Input type="datetime-local" value={when} onChange={(e) => setWhen(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Who's coming (optional)</Label>
                <Input value={who} onChange={(e) => setWho(e.target.value)} placeholder="Prospective tenant / ABC Plumbing" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Contact phone (optional)</Label>
                <Input value={phone} onChange={(e) => setPhone(e.target.value)} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Notes (optional)</Label>
              <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="e.g. accessing the kitchen and bathroom only" />
            </div>
            <div className="flex gap-2">
              <Button size="sm" className="bg-slate-900 hover:bg-slate-800" disabled={busy || !when} onClick={create}>
                {busy && <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />} Schedule
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setShowForm(false)}>Cancel</Button>
            </div>
          </div>
        )}
        {past.length > 0 && (
          <p className="text-xs text-slate-400">
            Past: {past.map((a) => `${a.kind_display} ${fmtDT(a.starts_at)} (${a.status_display})`).join(" · ")}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------- tenant
// Small read-only card for the tenant dashboard: upcoming visits to their
// place. Rendering nothing when empty keeps the overview clean.
export function UpcomingVisitsCard({ leaseId }: { leaseId: string }) {
  const { token } = useAuth();
  const [items, setItems] = useState<Appointment[]>([]);
  useEffect(() => {
    if (!token) return;
    listAppointments(token, { lease: leaseId, upcoming: true })
      .then(setItems)
      .catch(() => setItems([]));
  }, [token, leaseId]);
  const upcoming = items.filter((a) => a.status === "SCHEDULED");
  if (upcoming.length === 0) return null;
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <CalendarClock className="h-4 w-4 text-slate-500" /> Upcoming Visits
        </CardTitle>
        <CardDescription>
          Your landlord has scheduled the following — this listing is your written notice of entry.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ul className="divide-y text-sm">
          {upcoming.map((a) => (
            <li key={a.id} className="py-2 flex items-center justify-between gap-2">
              <div>
                <p className="font-medium">{fmtDT(a.starts_at)}</p>
                <p className="text-xs text-slate-500">
                  {a.kind_display}{a.contact_name ? ` · ${a.contact_name}` : ""}{a.notes ? ` · ${a.notes}` : ""}
                </p>
              </div>
              <Badge variant="outline" className={kindBadge(a.kind)}>{a.kind_display}</Badge>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}