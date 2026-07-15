// src/components/dashboard/landlord/InspectionWizard.tsx
//
// Landlord's RTB-27 walkthrough: fill both columns of the condition report,
// manage keys, sign, start the move-out pass, approve/dismiss maintenance
// suggestions, and stamp the delivery-compliance clock. Phone-first — this
// gets filled standing in a hallway.
//
// Pass-awareness: the ACTIVE pass (derived from status) is editable; a
// fully-signed pass renders read-only (corrections = addendum, not edits —
// the backend enforces the same rule).

'use client';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Loader2,
  PenLine,
  Save,
  AlertTriangle,
  CheckCircle,
  Wrench,
  XCircle,
  Send,
  Plus,
} from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import {
  CONDITION_CHIPS,
  CLEANLINESS_CHIPS,
  InspectionDetail,
  InspectionItem,
  InspectionPass,
  ItemPatch,
  addCustomItem,
  approveSuggestion,
  dismissSuggestion,
  fetchInspection,
  landlordSign,
  markDelivered,
  patchInspection,
  saveItems,
  saveKeys,
  startMoveOut,
} from '@/lib/inspectionApi';

interface Props {
  inspectionId: string;
  onChanged?: () => void; // parent list refresh hook
}

export default function InspectionWizard({ inspectionId, onChanged }: Props) {
  const { token } = useAuth();
  const [inspection, setInspection] = useState<InspectionDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [dirty, setDirty] = useState<Record<string, ItemPatch>>({});
  const [signOpen, setSignOpen] = useState(false);
  const [signName, setSignName] = useState('');
  const [isSigning, setIsSigning] = useState(false);
  const [customSection, setCustomSection] = useState('');
  const [customLabel, setCustomLabel] = useState('');
  const dirtyRef = useRef(dirty);
  dirtyRef.current = dirty;

  const load = useCallback(async () => {
    if (!token) return;
    setIsLoading(true);
    try {
      setInspection(await fetchInspection(token, inspectionId));
      setDirty({});
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : 'Failed to load inspection.'
      );
    } finally {
      setIsLoading(false);
    }
  }, [token, inspectionId]);

  useEffect(() => {
    load();
  }, [load]);

  // Which pass is currently editable?
  const activePass: InspectionPass | null = useMemo(() => {
    if (!inspection) return null;
    if (inspection.status === 'MOVE_IN_IN_PROGRESS') return 'MOVE_IN';
    if (inspection.status === 'MOVE_OUT_IN_PROGRESS') return 'MOVE_OUT';
    return null; // MOVE_IN_SIGNED / COMPLETED — read-only
  }, [inspection]);

  const sections = useMemo(() => {
    if (!inspection) return [] as { name: string; items: InspectionItem[] }[];
    const map = new Map<string, InspectionItem[]>();
    for (const item of inspection.items) {
      if (!map.has(item.section)) map.set(item.section, []);
      map.get(item.section)!.push(item);
    }
    return Array.from(map.entries()).map(([name, items]) => ({ name, items }));
  }, [inspection]);

  const fieldPrefix = activePass === 'MOVE_OUT' ? 'move_out' : 'move_in';

  const getValue = (item: InspectionItem, field: string): string => {
    const patch = dirty[item.id] as unknown as
      | Record<string, unknown>
      | undefined;
    if (patch && field in patch) return String(patch[field] ?? '');
    return String((item as unknown as Record<string, unknown>)[field] ?? '');
  };

  const setValue = (item: InspectionItem, field: string, value: string) => {
    setDirty((prev) => ({
      ...prev,
      [item.id]: { ...(prev[item.id] || { id: item.id }), [field]: value },
    }));
  };

  const dirtyCount = Object.keys(dirty).length;

  const handleSave = async () => {
    if (!token || !inspection || dirtyCount === 0) return;
    setIsSaving(true);
    try {
      const items = await saveItems(
        token,
        inspection.id,
        Object.values(dirtyRef.current)
      );
      setInspection((prev) => (prev ? { ...prev, items } : prev));
      setDirty({});
      toast.success('Inspection saved.');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Save failed.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSign = async () => {
    if (!token || !inspection || !activePass) return;
    if (dirtyCount > 0) {
      toast.error('Save your changes before signing.');
      return;
    }
    setIsSigning(true);
    try {
      const updated = await landlordSign(token, inspection.id, {
        inspection_pass: activePass,
        name: signName.trim(),
      });
      setInspection(updated);
      setSignOpen(false);
      setSignName('');
      onChanged?.();
      toast.success('Signed. The tenant has been notified to review and sign.');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Signing failed.');
    } finally {
      setIsSigning(false);
    }
  };

  const handleStartMoveOut = async () => {
    if (!token || !inspection) return;
    try {
      setInspection(await startMoveOut(token, inspection.id));
      onChanged?.();
      toast.success(
        'Move-out pass started — end-of-tenancy columns are now editable.'
      );
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Couldn't start move-out."
      );
    }
  };

  const handleMarkDelivered = async (pass_: InspectionPass) => {
    if (!token || !inspection) return;
    try {
      setInspection(await markDelivered(token, inspection.id, pass_));
      toast.success('Marked delivered — compliance clock stopped.');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed.');
    }
  };

  const handleSuggestion = async (item: InspectionItem, approve: boolean) => {
    if (!token || !inspection) return;
    try {
      if (approve) {
        const { work_order_id } = await approveSuggestion(
          token,
          inspection.id,
          item.id
        );
        toast.success(`Work order created (${work_order_id.slice(0, 8)}…).`);
      } else {
        await dismissSuggestion(token, inspection.id, item.id);
        toast.success('Dismissed — condition stays on record, no work order.');
      }
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed.');
    }
  };

  const handleAddCustom = async () => {
    if (!token || !inspection || !customSection.trim() || !customLabel.trim())
      return;
    try {
      await addCustomItem(token, inspection.id, {
        section: customSection.trim(),
        label: customLabel.trim(),
      });
      setCustomSection('');
      setCustomLabel('');
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't add item.");
    }
  };

  const handleKeysChange = async (
    rowId: string,
    field: 'issued_count' | 'returned_count',
    value: string
  ) => {
    if (!token || !inspection) return;
    const row = inspection.key_rows.find((k) => k.id === rowId);
    if (!row) return;
    const parsed = value === '' ? null : Math.max(0, parseInt(value, 10) || 0);
    try {
      const rows = await saveKeys(token, inspection.id, [
        {
          id: row.id,
          key_type: row.key_type,
          issued_count:
            field === 'issued_count' ? (parsed ?? 0) : row.issued_count,
          returned_count:
            field === 'returned_count' ? parsed : row.returned_count,
        },
      ]);
      setInspection((prev) =>
        prev
          ? {
              ...prev,
              key_rows: prev.key_rows.map(
                (k) => rows.find((r) => r.id === k.id) || k
              ),
            }
          : prev
      );
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Key update failed.');
    }
  };

  if (isLoading || !inspection) {
    return (
      <div className="flex items-center justify-center py-16 text-slate-500">
        <Loader2 className="h-6 w-6 animate-spin mr-2" /> Loading inspection…
      </div>
    );
  }

  const signedBanner = (pass_: InspectionPass) => {
    const isMoveIn = pass_ === 'MOVE_IN';
    const fully = isMoveIn
      ? inspection.move_in_fully_signed
      : inspection.move_out_fully_signed;
    if (!fully) return null;
    const disputed = isMoveIn
      ? inspection.disputed_move_in
      : inspection.disputed_move_out;
    const delivered = isMoveIn
      ? inspection.move_in_report_delivered_at
      : inspection.move_out_report_delivered_at;
    return (
      <div
        className={cn(
          'p-3 rounded-md text-sm flex items-center justify-between gap-3',
          disputed ? 'bg-amber-50 text-amber-800' : 'bg-green-50 text-green-800'
        )}
      >
        <span className="flex items-center gap-2">
          {disputed ? (
            <AlertTriangle className="h-4 w-4" />
          ) : (
            <CheckCircle className="h-4 w-4" />
          )}
          {isMoveIn ? 'Move-in' : 'Move-out'} pass fully signed
          {disputed ? ' — tenant noted disagreements' : ''}.
        </span>
        {!delivered ? (
          <Button
            size="sm"
            variant="outline"
            onClick={() => handleMarkDelivered(pass_)}
          >
            <Send className="h-3.5 w-3.5 mr-1" /> Mark copy delivered
          </Button>
        ) : (
          <span className="text-xs text-slate-500">Copy delivered ✓</span>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div>
              <CardTitle className="text-lg">
                Condition Inspection —{' '}
                {inspection.property_label || inspection.lease_number}
              </CardTitle>
              <CardDescription>
                {inspection.tenant_name
                  ? `Tenant: ${inspection.tenant_name} · `
                  : ''}
                Lease {inspection.lease_number}
              </CardDescription>
            </div>
            <Badge variant="outline">{inspection.status_display}</Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {signedBanner('MOVE_IN')}
          {inspection.status === 'COMPLETED' && signedBanner('MOVE_OUT')}
          {inspection.status === 'MOVE_IN_SIGNED' && (
            <div className="flex items-center justify-between p-3 bg-slate-50 rounded-md text-sm">
              <span>
                Tenancy in progress. When the tenant is leaving, start the
                move-out walkthrough.
              </span>
              <Button size="sm" onClick={handleStartMoveOut}>
                Start Move-out Inspection
              </Button>
            </div>
          )}
          {activePass && (
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <Label className="text-xs">Possession Date</Label>
                <Input
                  type="date"
                  value={inspection.possession_date || ''}
                  onChange={async (e) => {
                    if (!token) return;
                    try {
                      setInspection(
                        await patchInspection(token, inspection.id, {
                          possession_date: e.target.value || null,
                        })
                      );
                    } catch (err) {
                      toast.error(
                        err instanceof Error ? err.message : 'Failed.'
                      );
                    }
                  }}
                />
              </div>
              <div>
                <Label className="text-xs">
                  {activePass === 'MOVE_IN' ? 'Move-in' : 'Move-out'} Inspection
                  Date
                </Label>
                <Input
                  type="date"
                  value={
                    (activePass === 'MOVE_IN'
                      ? inspection.move_in_inspection_date
                      : inspection.move_out_inspection_date) || ''
                  }
                  onChange={async (e) => {
                    if (!token) return;
                    const field =
                      activePass === 'MOVE_IN'
                        ? 'move_in_inspection_date'
                        : 'move_out_inspection_date';
                    try {
                      setInspection(
                        await patchInspection(token, inspection.id, {
                          [field]: e.target.value || null,
                        })
                      );
                    } catch (err) {
                      toast.error(
                        err instanceof Error ? err.message : 'Failed.'
                      );
                    }
                  }}
                />
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Items by section */}
      <Accordion
        type="multiple"
        defaultValue={sections.slice(0, 1).map((s) => s.name)}
        className="space-y-2"
      >
        {sections.map((section) => (
          <AccordionItem
            key={section.name}
            value={section.name}
            className="border rounded-md px-3 bg-white"
          >
            <AccordionTrigger className="text-sm font-medium hover:no-underline">
              <span className="flex items-center gap-2">
                {section.name}
                {section.items.some(
                  (i) => i.suggestion_status === 'PENDING'
                ) && (
                  <Badge
                    variant="outline"
                    className="bg-amber-50 text-amber-700 border-amber-200 text-[10px]"
                  >
                    needs review
                  </Badge>
                )}
              </span>
            </AccordionTrigger>
            <AccordionContent className="space-y-4 pb-4">
              {section.items.map((item) => {
                const code = getValue(item, `${fieldPrefix}_condition_code`);
                const clean = getValue(item, `${fieldPrefix}_cleanliness_code`);
                const comment = getValue(item, `${fieldPrefix}_comment`);
                const editable = activePass !== null;
                return (
                  <div
                    key={item.id}
                    className="space-y-1.5 border-b border-slate-100 pb-3 last:border-0"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-medium">
                        {item.label}
                        {item.is_custom && (
                          <span className="text-xs text-slate-400 ml-1">
                            (added)
                          </span>
                        )}
                      </span>
                      {/* Move-out pass: show the move-in value for comparison */}
                      {activePass === 'MOVE_OUT' &&
                        item.move_in_condition_code && (
                          <span className="text-xs text-slate-400 whitespace-nowrap">
                            at move-in: {item.move_in_condition_code}
                          </span>
                        )}
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {CONDITION_CHIPS.map((c) => (
                        <button
                          key={c.value}
                          type="button"
                          disabled={!editable}
                          title={c.label}
                          onClick={() =>
                            setValue(
                              item,
                              `${fieldPrefix}_condition_code`,
                              code === c.value ? '' : c.value
                            )
                          }
                          className={cn(
                            'h-8 min-w-8 px-2 rounded-md border text-xs font-semibold transition-colors',
                            code === c.value
                              ? c.value === 'GOOD'
                                ? 'bg-green-600 border-green-600 text-white'
                                : 'bg-amber-500 border-amber-500 text-white'
                              : 'bg-white border-slate-200 text-slate-600 hover:border-slate-400',
                            !editable && 'opacity-60 cursor-default'
                          )}
                        >
                          {c.chip}
                        </button>
                      ))}
                      <span className="w-2" />
                      {CLEANLINESS_CHIPS.map((c) => (
                        <button
                          key={c.value}
                          type="button"
                          disabled={!editable}
                          title={c.label}
                          onClick={() =>
                            setValue(
                              item,
                              `${fieldPrefix}_cleanliness_code`,
                              clean === c.value ? '' : c.value
                            )
                          }
                          className={cn(
                            'h-8 min-w-8 px-2 rounded-md border text-xs font-semibold transition-colors',
                            clean === c.value
                              ? 'bg-slate-700 border-slate-700 text-white'
                              : 'bg-white border-slate-200 text-slate-500 hover:border-slate-400',
                            !editable && 'opacity-60 cursor-default'
                          )}
                        >
                          {c.chip}
                        </button>
                      ))}
                    </div>
                    {(editable || comment) && (
                      <Input
                        placeholder="Comment (e.g. 'small dent left of door')"
                        value={comment}
                        disabled={!editable}
                        onChange={(e) =>
                          setValue(
                            item,
                            `${fieldPrefix}_comment`,
                            e.target.value
                          )
                        }
                        className="h-8 text-sm"
                      />
                    )}
                    {item.suggestion_status === 'PENDING' && (
                      <div className="flex items-center gap-2 p-2 bg-amber-50 rounded-md">
                        <Wrench className="h-4 w-4 text-amber-600 flex-shrink-0" />
                        <span className="text-xs text-amber-800 flex-1">
                          Flagged for maintenance — create a work order?
                        </span>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-xs"
                          onClick={() => handleSuggestion(item, true)}
                        >
                          <CheckCircle className="h-3 w-3 mr-1" /> Approve
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 text-xs text-slate-500"
                          onClick={() => handleSuggestion(item, false)}
                        >
                          <XCircle className="h-3 w-3 mr-1" /> Dismiss
                        </Button>
                      </div>
                    )}
                    {item.suggestion_status === 'APPROVED' && (
                      <p className="text-xs text-green-700">
                        Work order created for this item.
                      </p>
                    )}
                  </div>
                );
              })}
            </AccordionContent>
          </AccordionItem>
        ))}

        {/* Keys — Box W */}
        <AccordionItem
          value="__keys"
          className="border rounded-md px-3 bg-white"
        >
          <AccordionTrigger className="text-sm font-medium hover:no-underline">
            Keys and Controls
          </AccordionTrigger>
          <AccordionContent className="space-y-2 pb-4">
            {inspection.key_rows.map((row) => (
              <div
                key={row.id}
                className="grid grid-cols-[1fr_90px_90px] gap-2 items-center text-sm"
              >
                <span>{row.key_type}</span>
                <Input
                  type="number"
                  min="0"
                  className="h-8"
                  placeholder="Issued"
                  defaultValue={row.issued_count}
                  disabled={inspection.move_in_fully_signed}
                  onBlur={(e) =>
                    handleKeysChange(row.id, 'issued_count', e.target.value)
                  }
                />
                <Input
                  type="number"
                  min="0"
                  className="h-8"
                  placeholder="Returned"
                  defaultValue={row.returned_count ?? ''}
                  disabled={activePass !== 'MOVE_OUT'}
                  onBlur={(e) =>
                    handleKeysChange(row.id, 'returned_count', e.target.value)
                  }
                />
              </div>
            ))}
            <p className="text-xs text-slate-400">
              Issued counts lock with move-in; returned counts open during
              move-out.
            </p>
          </AccordionContent>
        </AccordionItem>
      </Accordion>

      {/* Add custom row */}
      {activePass && (
        <div className="flex gap-2 items-end">
          <div className="flex-1">
            <Label className="text-xs">Section</Label>
            <Input
              value={customSection}
              onChange={(e) => setCustomSection(e.target.value)}
              placeholder="e.g. Kitchen"
              className="h-8"
            />
          </div>
          <div className="flex-1">
            <Label className="text-xs">Item</Label>
            <Input
              value={customLabel}
              onChange={(e) => setCustomLabel(e.target.value)}
              placeholder="e.g. Wine fridge"
              className="h-8"
            />
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleAddCustom}
            disabled={!customSection.trim() || !customLabel.trim()}
          >
            <Plus className="h-4 w-4 mr-1" /> Add
          </Button>
        </div>
      )}

      {/* Sticky action bar */}
      {activePass && (
        <div className="sticky bottom-0 bg-white border rounded-md p-3 flex items-center justify-between gap-3 shadow-sm">
          <span className="text-sm text-slate-500">
            {dirtyCount > 0
              ? `${dirtyCount} unsaved item${dirtyCount === 1 ? '' : 's'}`
              : 'All changes saved'}
          </span>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={handleSave}
              disabled={isSaving || dirtyCount === 0}
            >
              {isSaving ? (
                <Loader2 className="h-4 w-4 mr-1 animate-spin" />
              ) : (
                <Save className="h-4 w-4 mr-1" />
              )}{' '}
              Save
            </Button>
            <Button
              onClick={() => setSignOpen(true)}
              disabled={
                (activePass === 'MOVE_IN' &&
                  !!inspection.landlord_signed_move_in_at) ||
                (activePass === 'MOVE_OUT' &&
                  !!inspection.landlord_signed_move_out_at)
              }
            >
              <PenLine className="h-4 w-4 mr-1" />
              {(
                activePass === 'MOVE_IN'
                  ? inspection.landlord_signed_move_in_at
                  : inspection.landlord_signed_move_out_at
              )
                ? "You've signed — waiting on tenant"
                : 'Sign as Landlord'}
            </Button>
          </div>
        </div>
      )}

      {/* Sign dialog */}
      <Dialog open={signOpen} onOpenChange={setSignOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Sign {activePass === 'MOVE_OUT' ? 'move-out' : 'move-in'}{' '}
              inspection
            </DialogTitle>
            <DialogDescription>
              Typing your full legal name below and clicking Sign records your
              electronic signature with a timestamp. Once both parties have
              signed, this pass becomes permanent — corrections require an
              addendum. Both parties should retain a copy.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="sign-name">Full legal name</Label>
            <Input
              id="sign-name"
              value={signName}
              onChange={(e) => setSignName(e.target.value)}
              placeholder="e.g. Raj Singh"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSignOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSign}
              disabled={isSigning || signName.trim().length < 3}
            >
              {isSigning ? (
                <Loader2 className="h-4 w-4 mr-1 animate-spin" />
              ) : (
                <PenLine className="h-4 w-4 mr-1" />
              )}{' '}
              Sign
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
