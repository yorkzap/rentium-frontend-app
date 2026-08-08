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
/** What a LIVE (ACTIVE) tenancy still accepts — mirrors the backend's
 *  services.AMENDABLE_WHEN_ACTIVE. Wording may be amended by agreement; the
 *  deal may not, because rent and deposits have ledger charges posted against
 *  them and the dates drive statutory notice and deposit-return clocks. Those
 *  move through a rent adjustment or a terminate/re-issue, not a text box. */
export const AMENDABLE_WHEN_ACTIVE = new Set<string>([
  'special_terms',
  'house_rules',
  'pets_terms',
  'smoking_terms',
  'parking_description',
  'services_and_facilities',
  'occupants',
  'landlord_service_address',
  'landlord_service_email',
  'landlord_daytime_phone',
  'landlord_other_phone',
  'landlord_fax',
  'etransfer_email',
]);

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

export interface ServiceChoice {
  value: string;
  label: string;
}

export interface EditableLease {
  id: string;
  /** Enum shipped by the server so this list can never drift from the model. */
  service_choices?: ServiceChoice[];
  services_and_facilities?: string[];
  house_rules?: string;
  occupants?: string[];
  landlord_fax?: string;
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
    landlord_fax: str(lease.landlord_fax),
    house_rules: str(lease.house_rules),
    // Lists live in the draft as joined strings so a shallow !== comparison
    // still tells us whether the landlord actually changed anything.
    services_and_facilities: (lease.services_and_facilities ?? []).join(','),
    occupants: (lease.occupants ?? []).join(', '),
  };
}

/** Fields that are lists on the wire but strings in the draft. */
const LIST_FIELDS: Record<string, string> = {
  services_and_facilities: ',',
  occupants: ',',
};

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
  amendOnly = false,
  onCancel,
  onSaved,
}: {
  token: string;
  lease: EditableLease;
  /** Who has already signed. Drives the confirmation, not the permission. */
  signedNames: string[];
  /** The tenancy is LIVE: offer only what can still be amended. The backend
   *  refuses the rest either way; hiding it stops the landlord typing a new
   *  rent into a box that will be rejected. */
  amendOnly?: boolean;
  onCancel: () => void;
  onSaved: (amendedSigners: string[]) => void;
}) {
  const original = useMemo(() => buildDraft(lease), [lease]);
  const [draft, setDraft] = useState<Draft>(original);
  const [saving, setSaving] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const set = (field: string, value: string | boolean) =>
    setDraft((d) => ({ ...d, [field]: value }));

  // On a live tenancy the frozen fields are not rendered, so they cannot
  // change — but filtering here too means a stale draft or a future field
  // added to the form can never smuggle one into the PATCH and get the whole
  // amendment refused for a value the landlord never touched.
  const changed = Object.keys(draft).filter(
    (field) =>
      draft[field] !== original[field] &&
      (!amendOnly || AMENDABLE_WHEN_ACTIVE.has(field))
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
      } else if (field in LIST_FIELDS) {
        out[field] = String(value)
          .split(LIST_FIELDS[field])
          .map((part) => part.trim())
          .filter(Boolean);
      } else if (value === '' && NULLABLE.has(field)) {
        out[field] = null;
      } else {
        out[field] = value;
      }
    }
    return out;
  };

  const services = String(draft.services_and_facilities ?? '')
    .split(',')
    .filter(Boolean);
  const toggleService = (value: string, on: boolean) => {
    const next = on
      ? [...services, value]
      : services.filter((s) => s !== value);
    // Keep the server's own order so the draft compares cleanly against the
    // original regardless of the order boxes were clicked in.
    const ordered = (lease.service_choices ?? [])
      .map((c) => c.value)
      .filter((v) => next.includes(v));
    set('services_and_facilities', ordered.join(','));
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
      {amendOnly ? (
        <div className="flex items-start gap-2 rounded-md border border-sky-200 bg-sky-50 p-2 text-sm text-sky-900">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <p>
            This tenancy is live, so you can amend its <strong>wording</strong>{' '}
            — terms, rules, contact details. Rent, deposits and dates are fixed:
            charges are already posted against them and the dates run the notice
            and deposit-return clocks. To change those, use a rent adjustment or
            end this tenancy and issue a new agreement.
          </p>
        </div>
      ) : (
        signedNames.length > 0 && (
          <div className="flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 p-2 text-sm text-amber-900">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <p>
              {signedNames.join(', ')}{' '}
              {signedNames.length === 1 ? 'has' : 'have'} already signed.
              Changing rent, deposits or dates amends the agreement they signed
              — it is recorded on the lease, and they are not notified.
            </p>
          </div>
        )
      )}

      {!amendOnly && (
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
      )}

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
        {!amendOnly && check('parking_included', 'Parking included')}
        {!amendOnly &&
          text(
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

      {(lease.service_choices?.length ?? 0) > 0 && (
        <div className="space-y-2 border-t pt-3">
          <Label className="text-xs text-slate-500">Included in the rent</Label>
          <p className="text-xs text-slate-400">
            What you include here prints on the agreement, and each included
            utility gets a fair-use term with it — no leaving the water running,
            no heat on with the windows open.
          </p>
          <div className="grid grid-cols-2 gap-x-4 gap-y-1 sm:grid-cols-3">
            {lease.service_choices!.map((choice) => (
              <label
                key={choice.value}
                className="flex items-center gap-2 text-sm"
              >
                <input
                  type="checkbox"
                  checked={services.includes(choice.value)}
                  onChange={(e) =>
                    toggleService(choice.value, e.target.checked)
                  }
                />
                {choice.label}
              </label>
            ))}
          </div>
        </div>
      )}

      <div>
        <Label className="text-xs text-slate-500">
          Other occupants (not tenants on this agreement)
        </Label>
        <Input
          className="h-8"
          value={String(draft.occupants ?? '')}
          onChange={(e) => set('occupants', e.target.value)}
          placeholder="Comma-separated: a child, a partner who isn't signing"
        />
      </div>

      <div>
        <Label className="text-xs text-slate-500">House rules</Label>
        <Textarea
          rows={8}
          className="min-h-[10rem] resize-y"
          value={String(draft.house_rules ?? '')}
          onChange={(e) => set('house_rules', e.target.value)}
          placeholder="Guests, quiet hours, cleaning rota, kitchen etiquette"
        />
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
        <div className="flex items-baseline justify-between">
          <Label className="text-xs text-slate-500">Special terms</Label>
          <span className="text-[11px] tabular-nums text-slate-400">
            {String(draft.special_terms ?? '').length.toLocaleString()}{' '}
            characters
          </span>
        </div>
        {/* Sized for what is actually in here. Real leases carry the whole
            clause block in this field — 2,000 characters on a draft in this
            portfolio, 7,600 across 121 lines on another — and a rows={3} box
            meant scrolling a three-line window through a legal document.
            Editable in principle, unusable in practice, which is why the
            landlord reported it as "can't edit special terms". */}
        <Textarea
          rows={14}
          className="min-h-[16rem] resize-y font-mono text-[13px] leading-relaxed"
          value={String(draft.special_terms ?? '')}
          onChange={(e) => set('special_terms', e.target.value)}
          placeholder="Clauses that print into the agreement"
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
          {text('landlord_fax', 'Fax')}
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
