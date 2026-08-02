'use client';

/**
 * Editing the terms of a lease that hasn't been executed yet.
 *
 * The backend has always accepted these edits — `PATCH /leases/{id}/`, gated by
 * LeaseNotLocked (ACTIVE and beyond) — but the dashboard only ever sent one
 * field, `bills_included`. Everything else on the lease was read-only text, so
 * a landlord who typed the wrong deposit had no route but re-creating the lease
 * or asking RAMA. This is that route.
 *
 * Two things it is careful about:
 *
 * 1. A PENDING lease can already carry signatures. Saving a money or date
 *    change is allowed — the landlord owns the document until it is executed —
 *    but it is confirmed first, by name, because the person who signed agreed
 *    to different terms. The backend records the amendment either way; the
 *    tenant is not notified.
 * 2. Deposit "received on" dates are not here. They are stamped by the ledger
 *    when the money actually lands, and the date a deposit was received starts
 *    a statutory clock — it is a fact, not a field to type over.
 */

import React, { useMemo, useState } from 'react';
import { AlertTriangle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import { updateLease, type LeaseTermsPatch } from '@/lib/leaseApi';

/** Changing one of these is changing the deal — mirrors the backend's
 *  MATERIAL_LEASE_FIELDS, which is what decides whether an amendment gets
 *  recorded against anyone who already signed. */
const MATERIAL_FIELDS = new Set<keyof LeaseTermsPatch>([
  'total_rent',
  'security_deposit',
  'pet_deposit',
  'cleaning_deposit',
  'start_date',
  'end_date',
  'move_in_date',
  'move_out_date',
  'is_month_to_month',
  'rent_due_day',
  'pets_allowed',
  'smoking_allowed',
  'parking_included',
  'parking_extra_charge',
  'custom_tenant_notice_months',
]);

export interface EditableLease {
  id: string;
  start_date: string;
  end_date: string | null;
  is_month_to_month: boolean;
  move_in_date?: string | null;
  move_out_date?: string | null;
  total_rent: string;
  rent_due_day?: number | null;
  security_deposit: string;
  pet_deposit: string;
  cleaning_deposit: string;
  pets_allowed?: boolean;
  pets_terms?: string;
  smoking_allowed?: boolean;
  smoking_terms?: string;
  parking_included?: boolean;
  parking_description?: string;
  parking_extra_charge?: string | null;
  special_terms?: string;
  etransfer_email?: string;
  custom_tenant_notice_months?: number | null;
  landlord_service_address?: string;
  landlord_service_email?: string;
  landlord_daytime_phone?: string;
  landlord_other_phone?: string;
}

type Draft = Record<string, string | boolean>;

const str = (v: unknown) => (v === null || v === undefined ? '' : String(v));

function buildDraft(lease: EditableLease): Draft {
  return {
    start_date: str(lease.start_date),
    end_date: str(lease.end_date),
    is_month_to_month: Boolean(lease.is_month_to_month),
    move_in_date: str(lease.move_in_date),
    move_out_date: str(lease.move_out_date),
    total_rent: str(lease.total_rent),
    rent_due_day: str(lease.rent_due_day),
    security_deposit: str(lease.security_deposit),
    pet_deposit: str(lease.pet_deposit),
    cleaning_deposit: str(lease.cleaning_deposit),
    pets_allowed: Boolean(lease.pets_allowed),
    pets_terms: str(lease.pets_terms),
    smoking_allowed: Boolean(lease.smoking_allowed),
    smoking_terms: str(lease.smoking_terms),
    parking_included: Boolean(lease.parking_included),
    parking_description: str(lease.parking_description),
    parking_extra_charge: str(lease.parking_extra_charge),
    special_terms: str(lease.special_terms),
    etransfer_email: str(lease.etransfer_email),
    custom_tenant_notice_months: str(lease.custom_tenant_notice_months),
    landlord_service_address: str(lease.landlord_service_address),
    landlord_service_email: str(lease.landlord_service_email),
    landlord_daytime_phone: str(lease.landlord_daytime_phone),
    landlord_other_phone: str(lease.landlord_other_phone),
  };
}

/** Blank number/date fields go as null, not "" — the API distinguishes them. */
const NULLABLE = new Set([
  'end_date',
  'move_in_date',
  'move_out_date',
  'rent_due_day',
  'custom_tenant_notice_months',
  'parking_extra_charge',
]);

export function LeaseTermsEditor({
  token,
  lease,
  signedNames,
  onCancel,
  onSaved,
}: {
  token: string;
  lease: EditableLease;
  /** Who has already signed. Drives the confirmation, not the permission. */
  signedNames: string[];
  onCancel: () => void;
  onSaved: (amendedSigners: string[]) => void;
}) {
  const original = useMemo(() => buildDraft(lease), [lease]);
  const [draft, setDraft] = useState<Draft>(original);
  const [saving, setSaving] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const set = (field: string, value: string | boolean) =>
    setDraft((d) => ({ ...d, [field]: value }));

  const changed = Object.keys(draft).filter(
    (field) => draft[field] !== original[field]
  );
  const materialChanges = changed.filter((f) =>
    MATERIAL_FIELDS.has(f as keyof LeaseTermsPatch)
  );
  const amendsSignedTerms =
    signedNames.length > 0 && materialChanges.length > 0;

  const payload = () => {
    const out: Record<string, unknown> = {};
    for (const field of changed) {
      const value = draft[field];
      if (typeof value === 'boolean') {
        out[field] = value;
      } else if (value === '' && NULLABLE.has(field)) {
        out[field] = null;
      } else {
        out[field] = value;
      }
    }
    return out;
  };

  const save = async () => {
    setSaving(true);
    try {
      const result = await updateLease(token, lease.id, payload());
      onSaved(result.amended_signers ?? []);
      toast.success('Lease updated.');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not save the lease.');
    } finally {
      setSaving(false);
      setConfirmOpen(false);
    }
  };

  const text = (
    field: keyof Draft,
    label: string,
    type: 'text' | 'number' | 'date' | 'email' = 'text',
    step?: string
  ) => (
    <div>
      <Label className="text-xs text-slate-500">{label}</Label>
      <Input
        type={type}
        step={step}
        className="h-8"
        value={String(draft[field] ?? '')}
        onChange={(e) => set(field as string, e.target.value)}
      />
    </div>
  );

  const check = (field: keyof Draft, label: string) => (
    <label className="flex items-center gap-2 pt-5 text-sm">
      <input
        type="checkbox"
        checked={Boolean(draft[field])}
        onChange={(e) => set(field as string, e.target.checked)}
      />
      {label}
    </label>
  );

  return (
    <div className="col-span-2 space-y-4">
      {signedNames.length > 0 && (
        <div className="flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 p-2 text-sm text-amber-900">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <p>
            {signedNames.join(', ')} {signedNames.length === 1 ? 'has' : 'have'}{' '}
            already signed. Changing rent, deposits or dates amends the
            agreement they signed — it is recorded on the lease, and they are
            not notified.
          </p>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        {text('start_date', 'Start date', 'date')}
        {text('end_date', 'End date', 'date')}
        {check('is_month_to_month', 'Month-to-month')}
        {text('move_in_date', 'Move-in date', 'date')}
        {text('move_out_date', 'Move-out date', 'date')}
        {text('total_rent', 'Total monthly rent ($)', 'number', '0.01')}
        {text('rent_due_day', 'Rent due on day', 'number')}
        {text('security_deposit', 'Security deposit ($)', 'number', '0.01')}
        {text('pet_deposit', 'Pet deposit ($)', 'number', '0.01')}
        {text('cleaning_deposit', 'Cleaning deposit ($)', 'number', '0.01')}
        {check('pets_allowed', 'Pets allowed')}
        {check('smoking_allowed', 'Smoking allowed')}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2">
          <Label className="text-xs text-slate-500">
            Pet terms (only if pets are allowed)
          </Label>
          <Textarea
            rows={2}
            value={String(draft.pets_terms ?? '')}
            onChange={(e) => set('pets_terms', e.target.value)}
            placeholder="One cat under 15lb; not on the balcony"
          />
        </div>
        <div className="col-span-2">
          <Label className="text-xs text-slate-500">
            Smoking terms (only if smoking is allowed)
          </Label>
          <Textarea
            rows={2}
            value={String(draft.smoking_terms ?? '')}
            onChange={(e) => set('smoking_terms', e.target.value)}
          />
        </div>
        {check('parking_included', 'Parking included')}
        {text(
          'parking_extra_charge',
          'Parking charge ($/mo)',
          'number',
          '0.01'
        )}
        <div className="col-span-2">
          <Label className="text-xs text-slate-500">Parking details</Label>
          <Input
            className="h-8"
            value={String(draft.parking_description ?? '')}
            onChange={(e) => set('parking_description', e.target.value)}
            placeholder="One stall, #14, uncovered"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {text('etransfer_email', 'e-Transfers go to', 'email')}
        {text(
          'custom_tenant_notice_months',
          'Tenant notice (months)',
          'number'
        )}
      </div>

      <div>
        <Label className="text-xs text-slate-500">Special terms</Label>
        <Textarea
          rows={3}
          value={String(draft.special_terms ?? '')}
          onChange={(e) => set('special_terms', e.target.value)}
        />
      </div>

      <div className="space-y-3 border-t pt-3">
        <p className="text-xs uppercase tracking-wide text-slate-400">
          Address for service (prints on the agreement)
        </p>
        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2">
            {text('landlord_service_address', 'Service address')}
          </div>
          {text('landlord_service_email', 'Notice email', 'email')}
          {text('landlord_daytime_phone', 'Daytime phone')}
          {text('landlord_other_phone', 'Other phone')}
        </div>
      </div>

      <div className="flex items-center justify-between gap-3 border-t pt-3">
        <span className="text-sm text-slate-500">
          {changed.length === 0
            ? 'No changes'
            : `${changed.length} change${changed.length === 1 ? '' : 's'}`}
        </span>
        <div className="flex gap-2">
          <Button variant="ghost" onClick={onCancel} disabled={saving}>
            Cancel
          </Button>
          <Button
            onClick={() => (amendsSignedTerms ? setConfirmOpen(true) : save())}
            disabled={saving || changed.length === 0}
          >
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save changes
          </Button>
        </div>
      </div>

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>This amends a signed agreement</DialogTitle>
            <DialogDescription>
              {signedNames.join(', ')}{' '}
              {signedNames.length === 1 ? 'signed' : 'signed'} under the current
              terms. Saving changes {materialChanges.join(', ')} on the lease
              they signed. It will be recorded against them on this lease, and
              they will not be notified.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => setConfirmOpen(false)}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button onClick={save} disabled={saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save anyway
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
