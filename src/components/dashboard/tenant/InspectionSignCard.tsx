// src/components/dashboard/tenant/InspectionSignCard.tsx
//
// Tenant side of the RTB-27 flow: when an inspection pass is waiting on this
// tenant's signature, a card appears on their dashboard. They review every
// recorded item read-only, then either AGREE or DISAGREE-with-reasons
// (Boxes Y / 1 — per the form, a disagreeing tenant still signs; the
// disagreement is recorded on the document) and sign with their typed name.
//
// Mount inside TenantDashboard's overview:  <InspectionSignCard leaseId={currentLease.id} />
// Renders nothing when there's nothing to sign.

"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { ClipboardCheck, Loader2, PenLine, ChevronDown, ChevronUp } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import {
  InspectionDetail, InspectionPass, InspectionSummary,
  fetchInspection, fetchInspections, tenantSign,
} from "@/lib/inspectionApi";

interface Props {
  leaseId: string;
}

export default function InspectionSignCard({ leaseId }: Props) {
  const { token } = useAuth();
  const [pendingSummary, setPendingSummary] = useState<InspectionSummary | null>(null);
  const [detail, setDetail] = useState<InspectionDetail | null>(null);
  const [expanded, setExpanded] = useState(false);
  const [agrees, setAgrees] = useState<"yes" | "no" | "">("");
  const [reason, setReason] = useState("");
  const [signName, setSignName] = useState("");
  const [isSigning, setIsSigning] = useState(false);

  const load = useCallback(async () => {
    if (!token) return;
    try {
      const list = await fetchInspections(token, { lease: leaseId });
      // A pass is waiting on THIS tenant when it's in progress and the
      // tenant timestamp for that pass is empty. The backend already scoped
      // the list to inspections this tenant may see.
      const summaries = list.filter(
        (i) => i.status === "MOVE_IN_IN_PROGRESS" || i.status === "MOVE_OUT_IN_PROGRESS"
      );
      for (const summary of summaries) {
        const full = await fetchInspection(token, summary.id);
        const pass: InspectionPass =
          full.status === "MOVE_OUT_IN_PROGRESS" ? "MOVE_OUT" : "MOVE_IN";
        const tenantSigned =
          pass === "MOVE_IN" ? full.tenant_signed_move_in_at : full.tenant_signed_move_out_at;
        const landlordSigned =
          pass === "MOVE_IN" ? full.landlord_signed_move_in_at : full.landlord_signed_move_out_at;
        // Only surface once the landlord has finished + signed their side —
        // before that the document is still being filled in.
        if (!tenantSigned && landlordSigned) {
          setPendingSummary(summary);
          setDetail(full);
          return;
        }
      }
      setPendingSummary(null);
      setDetail(null);
    } catch {
      // Non-fatal: the card simply doesn't render.
      setPendingSummary(null);
      setDetail(null);
    }
  }, [token, leaseId]);

  useEffect(() => { load(); }, [load]);

  const activePass: InspectionPass = useMemo(
    () => (detail?.status === "MOVE_OUT_IN_PROGRESS" ? "MOVE_OUT" : "MOVE_IN"),
    [detail]
  );

  const sections = useMemo(() => {
    if (!detail) return [] as { name: string; items: InspectionDetail["items"] }[];
    const map = new Map<string, InspectionDetail["items"]>();
    for (const item of detail.items) {
      if (!map.has(item.section)) map.set(item.section, []);
      map.get(item.section)!.push(item);
    }
    return Array.from(map.entries()).map(([name, items]) => ({ name, items }));
  }, [detail]);

  const handleSign = async () => {
    if (!token || !detail || agrees === "") return;
    if (agrees === "no" && !reason.trim()) {
      toast.error("Please explain what you disagree with — it's recorded on the report.");
      return;
    }
    setIsSigning(true);
    try {
      await tenantSign(token, detail.id, {
        inspection_pass: activePass,
        name: signName.trim(),
        agrees: agrees === "yes",
        reason: agrees === "no" ? reason.trim() : "",
      });
      toast.success(
        agrees === "yes"
          ? "Inspection signed — thank you!"
          : "Inspection signed with your disagreement recorded."
      );
      setPendingSummary(null);
      setDetail(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Signing failed.");
    } finally {
      setIsSigning(false);
    }
  };

  if (!pendingSummary || !detail) return null;

  const passLabel = activePass === "MOVE_OUT" ? "move-out" : "move-in";
  const codeOf = (item: InspectionDetail["items"][number]) =>
    activePass === "MOVE_OUT" ? item.move_out_condition_code : item.move_in_condition_code;
  const cleanOf = (item: InspectionDetail["items"][number]) =>
    activePass === "MOVE_OUT" ? item.move_out_cleanliness_code : item.move_in_cleanliness_code;
  const commentOf = (item: InspectionDetail["items"][number]) =>
    activePass === "MOVE_OUT" ? item.move_out_comment : item.move_in_comment;

  return (
    <Card className="border-blue-200 bg-blue-50/40 mb-6">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center text-lg">
          <ClipboardCheck className="h-5 w-5 mr-2 text-blue-600" />
          Your {passLabel} inspection needs your signature
        </CardTitle>
        <CardDescription>
          Your landlord recorded the condition of {pendingSummary.property_label || "your unit"}.
          Review each item — if anything doesn't match what you see, you can disagree
          and say why; your disagreement is recorded on the report itself.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Button
          variant="outline" size="sm" className="w-full"
          onClick={() => setExpanded((e) => !e)}
        >
          {expanded ? <ChevronUp className="h-4 w-4 mr-1" /> : <ChevronDown className="h-4 w-4 mr-1" />}
          {expanded ? "Hide" : "Review"} the {detail.items.length} recorded items
        </Button>

        {expanded && (
          <div className="max-h-96 overflow-y-auto rounded-md border bg-white divide-y divide-slate-100">
            {sections.map((section) => (
              <div key={section.name} className="p-3">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
                  {section.name}
                </p>
                <ul className="space-y-1">
                  {section.items.map((item) => (
                    <li key={item.id} className="flex items-start justify-between gap-3 text-sm">
                      <span>{item.label}</span>
                      <span className="text-right whitespace-nowrap">
                        <Badge variant="outline" className="text-[10px]">
                          {codeOf(item) || "—"}{cleanOf(item) ? ` · ${cleanOf(item)}` : ""}
                        </Badge>
                        {commentOf(item) && (
                          <span className="block text-xs text-slate-500 max-w-48 truncate">
                            {commentOf(item)}
                          </span>
                        )}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
            {detail.key_rows.length > 0 && (
              <div className="p-3">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Keys</p>
                <ul className="space-y-1 text-sm">
                  {detail.key_rows.map((k) => (
                    <li key={k.id} className="flex justify-between">
                      <span>{k.key_type}</span>
                      <span className="text-slate-500">
                        {k.issued_count} issued{k.returned_count !== null ? ` · ${k.returned_count} returned` : ""}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        <div className="space-y-3 rounded-md border bg-white p-4">
          <Label className="text-sm font-medium">
            Does this report fairly represent the condition of the rental unit?
          </Label>
          <RadioGroup value={agrees} onValueChange={(v) => setAgrees(v as "yes" | "no")}>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="yes" id="insp-agree" />
              <Label htmlFor="insp-agree" className="font-normal cursor-pointer">
                I agree — it fairly represents the condition
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="no" id="insp-disagree" />
              <Label htmlFor="insp-disagree" className="font-normal cursor-pointer">
                I do not agree, for the following reasons:
              </Label>
            </div>
          </RadioGroup>
          {agrees === "no" && (
            <Textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Describe what doesn't match — e.g. 'the bedroom carpet stain was already there'"
              className="min-h-[70px]"
            />
          )}
          <div className="space-y-1.5">
            <Label htmlFor="insp-sign-name" className="text-sm">Sign with your full legal name</Label>
            <Input
              id="insp-sign-name"
              value={signName}
              onChange={(e) => setSignName(e.target.value)}
              placeholder="e.g. Alex Tenant"
            />
            <p className="text-xs text-slate-500">
              Typing your name and clicking Sign records your electronic signature with a
              timestamp. Keep a copy of the report for your records.
            </p>
          </div>
          <Button
            className="w-full bg-slate-900 hover:bg-slate-800"
            onClick={handleSign}
            disabled={isSigning || agrees === "" || signName.trim().length < 3}
          >
            {isSigning ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <PenLine className="h-4 w-4 mr-1" />}
            Sign {passLabel} inspection
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
