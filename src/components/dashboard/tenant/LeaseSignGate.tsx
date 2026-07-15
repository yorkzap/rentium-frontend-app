// LeaseSignGate.tsx

"use client";

import { useEffect, useState } from "react";
import {
  AlertCircle, Download, FileText, Loader2, Phone, Signature, XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/page";
import { useAuth } from "@/contexts/AuthContext";
import { DJANGO_API_URL } from "@/lib/config";

/**
 * The tenant signs THE DOCUMENT, not a summary of it.
 *
 * One renderer (rentium/leases/documents.py). This fetches its output and displays
 * it. The PDF renders the same object. They cannot disagree, because they are the
 * same object.
 *
 * NEW: the phone number. A tenancy agreement names a phone number for each party.
 * The field has existed on the model since the beginning and nothing has ever asked
 * for it, so it has printed blank on every agreement this app has produced. It's
 * asked for HERE rather than on a profile page because this is the one moment where
 * a tenant is unambiguously providing their details FOR a legal document — the ask
 * explains itself, and refusing to sign without it is defensible.
 */

interface Row { label: string; value: string; block: boolean }
interface Section { id: string; title: string; note: string; rows: Row[]; clauses: string[] }
interface LeaseDocument {
  format_id: string;
  name: string;
  subtitle: string;
  legal_note: string;
  official_text_loaded: boolean;
  sections: Section[];
}

interface Props {
  leaseId: string;
  leaseNumber: string;
  propertyLabel: string;
  declined: boolean;
  /** Existing account phone, if any. When present we don't ask again. */
  currentPhone?: string | null;
  onSign: (phone: string) => Promise<void>;
  onDecline: (reason: string) => Promise<void>;
}

export default function LeaseSignGate({
  leaseId, leaseNumber, propertyLabel, declined, currentPhone, onSign, onDecline,
}: Props) {
  const { token } = useAuth();
  const [doc, setDoc] = useState<LeaseDocument | null>(null);
  const [signing, setSigning] = useState(false);
  const [declining, setDeclining] = useState(false);
  const [showDecline, setShowDecline] = useState(false);
  const [reason, setReason] = useState("");
  const [pdfBusy, setPdfBusy] = useState(false);

  const [phone, setPhone] = useState(currentPhone ?? "");
  const [phoneError, setPhoneError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    fetch(`${DJANGO_API_URL}/leases/${leaseId}/document/`, {
      headers: { Authorization: `Token ${token}` },
    })
      .then((r) => (r.ok ? r.json() : null))
      .then(setDoc)
      .catch(() => setDoc(null));
  }, [token, leaseId]);

  const downloadPdf = async () => {
    if (!token) return;
    setPdfBusy(true);
    try {
      const res = await fetch(`${DJANGO_API_URL}/leases/${leaseId}/pdf/`, {
        headers: { Authorization: `Token ${token}` },
      });
      if (!res.ok) throw new Error();
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `lease_${leaseNumber}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setPdfBusy(false);
    }
  };

  // Deliberately loose: E.164 canonicalisation happens on the backend, which is
  // the only place that can do it correctly. This just catches obvious typos
  // before a round trip.
  const phoneLooksOk = (v: string) => v.replace(/\D/g, "").length >= 10;

  const handleSign = async () => {
    const value = phone.trim();
    if (!value) {
      setPhoneError("Your phone number goes on the agreement — please add it.");
      return;
    }
    if (!phoneLooksOk(value)) {
      setPhoneError("That doesn't look like a complete phone number.");
      return;
    }
    setPhoneError(null);
    setSigning(true);
    try {
      await onSign(value);
    } catch (err) {
      // The backend is the authority on phone validity; surface its complaint on
      // the field it belongs to rather than in a toast the user has to correlate.
      const msg = err instanceof Error ? err.message : "";
      if (msg.toLowerCase().includes("phone")) setPhoneError(msg);
    } finally {
      setSigning(false);
    }
  };

  if (declined) {
    return (
      <div className="flex min-h-screen items-center justify-center p-6">
        <Card className="w-full max-w-md text-center">
          <CardHeader>
            <XCircle className="mx-auto h-9 w-9 text-[hsl(var(--ink-4))]" />
            <CardTitle className="mt-2">Lease declined</CardTitle>
            <CardDescription>You declined the lease for {propertyLabel}.</CardDescription>
          </CardHeader>
          <CardContent className="text-sm text-[hsl(var(--ink-4))]">
            Your landlord has been told. If that was a mistake, or your situation has
            changed, talk to them directly.
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-start justify-center p-4 sm:p-6">
      <Card className="my-6 w-full max-w-3xl">
        <CardHeader className="border-b text-center" style={{ borderColor: "hsl(var(--line))" }}>
          <FileText className="mx-auto h-8 w-8 text-[hsl(var(--brand))]" />
          <CardTitle className="mt-2 text-xl">{doc?.name ?? "Lease Agreement"}</CardTitle>
          {doc?.subtitle && (
            <p className="text-xs uppercase tracking-wide text-[hsl(var(--ink-4))]">
              {doc.subtitle}
            </p>
          )}
          <CardDescription>
            {leaseNumber} · {propertyLabel}
            <span className="mt-1 block">Read it, then sign or decline.</span>
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-5 pt-5">
          {!doc ? (
            <div className="space-y-3">
              {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}
            </div>
          ) : (
            <>
              {!doc.official_text_loaded && (
                <div className="rounded-lg bg-[hsl(var(--warn-soft))] p-3 text-xs text-[hsl(var(--warn-ink))]">
                  <strong>Draft standing terms.</strong> The numbered clauses below
                  are a plain-language statement of the standard terms, not the
                  official form&apos;s exact wording. Where they differ, the Act prevails.
                </div>
              )}

              <div className="max-h-[46vh] divide-y overflow-y-auto rounded-lg border bg-white"
                   style={{ borderColor: "hsl(var(--line))" }}>
                {doc.sections.map((s) => (
                  <div key={s.id} className="p-4">
                    <h3 className="text-sm font-semibold">{s.title}</h3>
                    {s.note && (
                      <p className="mt-1 text-xs text-[hsl(var(--ink-4))]">{s.note}</p>
                    )}

                    {s.rows.length > 0 && (
                      <dl className="mt-2.5 space-y-2">
                        {s.rows.map((r, i) =>
                          r.block ? (
                            <div key={i}>
                              <dt className="text-xs text-[hsl(var(--ink-4))]">{r.label}</dt>
                              <dd className="mt-0.5 whitespace-pre-wrap text-sm text-[hsl(var(--ink-2))]">
                                {r.value}
                              </dd>
                            </div>
                          ) : (
                            <div key={i} className="flex items-baseline justify-between gap-4">
                              <dt className="flex-shrink-0 text-xs text-[hsl(var(--ink-4))]">
                                {r.label}
                              </dt>
                              <dd className="text-right text-sm font-medium">{r.value}</dd>
                            </div>
                          ),
                        )}
                      </dl>
                    )}

                    {s.clauses.length > 0 && (
                      <div className="mt-3 space-y-2">
                        {s.clauses.map((c, i) => (
                          <p key={i} className="text-sm leading-relaxed text-[hsl(var(--ink-2))]">
                            {c}
                          </p>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>

              <Button variant="outline" size="sm" className="w-full"
                      onClick={downloadPdf} disabled={pdfBusy}>
                {pdfBusy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
                Download this agreement as a PDF
              </Button>

              {doc.legal_note && (
                <div className="flex items-start gap-2 rounded-lg bg-[hsl(var(--warn-soft))] p-3">
                  <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-[hsl(var(--warn))]" />
                  <p className="text-xs text-[hsl(var(--warn-ink))]">{doc.legal_note}</p>
                </div>
              )}
            </>
          )}

          {!showDecline ? (
            <>
              {/* The one thing we ask you for, at the one moment it makes sense. */}
              <div className="rounded-lg border p-4" style={{ borderColor: "hsl(var(--line))" }}>
                <Label htmlFor="tenant-phone" className="flex items-center gap-1.5 text-sm">
                  <Phone className="h-3.5 w-3.5 text-[hsl(var(--ink-4))]" />
                  Your phone number
                </Label>
                <Input
                  id="tenant-phone"
                  type="tel"
                  inputMode="tel"
                  autoComplete="tel"
                  placeholder="(250) 555-0134"
                  value={phone}
                  onChange={(e) => { setPhone(e.target.value); setPhoneError(null); }}
                  disabled={signing || !doc}
                  className="mt-1.5"
                  aria-invalid={Boolean(phoneError)}
                />
                <p className={`mt-1.5 text-xs ${
                  phoneError ? "text-[hsl(var(--danger-ink))]" : "text-[hsl(var(--ink-4))]"
                }`}>
                  {phoneError ??
                    "This goes on the agreement as your contact details, alongside your landlord's. It isn't shown publicly anywhere."}
                </p>
              </div>

              <div className="flex gap-3 pt-1">
                <Button variant="outline" className="flex-1"
                        onClick={() => setShowDecline(true)} disabled={signing || !doc}>
                  <XCircle className="mr-2 h-4 w-4" /> Decline
                </Button>
                <Button className="flex-1 bg-[hsl(var(--brand))] hover:bg-[hsl(var(--brand-hover))]"
                        disabled={signing || !doc}
                        onClick={handleSign}>
                  {signing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Signature className="mr-2 h-4 w-4" />}
                  Sign this lease
                </Button>
              </div>
            </>
          ) : (
            <div className="space-y-3 pt-1">
              <Textarea rows={3} value={reason} onChange={(e) => setReason(e.target.value)}
                        placeholder="Optional — let your landlord know why." />
              <div className="flex gap-3">
                <Button variant="ghost" className="flex-1"
                        onClick={() => setShowDecline(false)} disabled={declining}>
                  Back
                </Button>
                <Button variant="destructive" className="flex-1" disabled={declining}
                        onClick={async () => {
                          setDeclining(true);
                          try { await onDecline(reason); } finally { setDeclining(false); }
                        }}>
                  {declining && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Confirm decline
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}