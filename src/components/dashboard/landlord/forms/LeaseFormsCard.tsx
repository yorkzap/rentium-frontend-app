'use client';

/**
 * The form pack on one lease: what's attached, who still owes a signature,
 * and — when it applies — why the lease hasn't gone active yet.
 *
 * That last part is the reason this card is worth its space. Before form packs,
 * a lease with an unsigned addendum simply sat at PENDING with nothing on screen
 * explaining it, which reads as a bug rather than as outstanding paperwork.
 */

import { useCallback, useEffect, useState } from 'react';
import {
  AlertCircle,
  BellRing,
  CheckCircle2,
  Clock,
  Copy,
  Download,
  FilePlus2,
  FileText,
  Loader2,
  PenLine,
  Send,
  Settings2,
  XCircle,
} from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/contexts/AuthContext';
import {
  attachLeaseForm,
  downloadLeaseFormPdf,
  fetchActivationStatus,
  fetchLeaseForms,
  remindLeaseForm,
  sendLeaseForm,
  setLeaseFormValues,
  signLeaseFormInApp,
  voidLeaseForm,
} from '@/lib/leaseFormApi';
import type {
  ActivationStatus,
  FormPlacement,
  LeaseForm,
  LeaseFormTemplate,
} from '@/types/leaseForm';

import SignaturePad, {
  signatureIsReady,
  type SignatureValue,
} from '@/components/signing/SignaturePad';

import FormFieldPlacer from './FormFieldPlacer';
import FormPicker from './FormPicker';

const STATUS_LABEL: Record<string, string> = {
  DRAFT: 'Not sent yet',
  SENT: 'Waiting for signatures',
  PARTIAL: 'Partly signed',
  COMPLETED: 'Signed',
  VOID: 'Withdrawn',
};

interface Props {
  leaseId: string;
  leaseStatus?: string;
  onChanged?: () => void;
}

export default function LeaseFormsCard({
  leaseId,
  leaseStatus,
  onChanged,
}: Props) {
  const { token } = useAuth();
  const [forms, setForms] = useState<LeaseForm[]>([]);
  const [activation, setActivation] = useState<ActivationStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [placing, setPlacing] = useState<LeaseFormTemplate | null>(null);
  const [sendTarget, setSendTarget] = useState<LeaseForm | null>(null);
  const [fillTarget, setFillTarget] = useState<LeaseForm | null>(null);
  const [signTarget, setSignTarget] = useState<LeaseForm | null>(null);

  const load = useCallback(async () => {
    if (!token) return;
    try {
      const [rows, status] = await Promise.all([
        fetchLeaseForms(token, leaseId),
        fetchActivationStatus(token, leaseId).catch(() => null),
      ]);
      setForms(rows);
      setActivation(status);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not load forms.');
    } finally {
      setLoading(false);
    }
  }, [token, leaseId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function attach(template: LeaseFormTemplate) {
    if (!token) return;
    setPickerOpen(false);

    // A form with no boxes on it can be attached but never signed, so send the
    // landlord to place them instead of letting them discover that at send time.
    if (template.placement_count === 0) {
      setPlacing(template);
      return;
    }
    try {
      await attachLeaseForm(token, { lease: leaseId, template: template.id });
      toast.success(`${template.name} added to this lease.`);
      await load();
      onChanged?.();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : 'Could not attach that.'
      );
    }
  }

  async function handleVoid(form: LeaseForm) {
    if (!token) return;
    setBusyId(form.id);
    try {
      await voidLeaseForm(token, form.id, 'Withdrawn by the landlord');
      toast.success(`${form.title} withdrawn.`);
      await load();
      onChanged?.();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : 'Could not withdraw it.'
      );
    } finally {
      setBusyId(null);
    }
  }

  async function handleRemind(form: LeaseForm) {
    if (!token) return;
    setBusyId(form.id);
    try {
      const { reminded } = await remindLeaseForm(token, form.id);
      toast.success(
        reminded ? `Reminded ${reminded} signer(s).` : 'Nobody left to remind.'
      );
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not send that.');
    } finally {
      setBusyId(null);
    }
  }

  const blockers = activation?.blocking_forms ?? [];

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0">
        <div>
          <CardTitle className="text-base">Forms &amp; documents</CardTitle>
          <CardDescription>
            Extra documents signed alongside this lease — RTB-8, addendums, or
            your own PDFs.
          </CardDescription>
        </div>
        <Button size="sm" variant="outline" onClick={() => setPickerOpen(true)}>
          <FilePlus2 className="mr-1.5 h-3.5 w-3.5" />
          Add form
        </Button>
      </CardHeader>

      <CardContent className="space-y-3">
        {blockers.length > 0 && (
          <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <div>
              <p className="font-medium">
                This lease can&apos;t activate until{' '}
                {blockers.map((form) => form.title).join(' and ')}{' '}
                {blockers.length === 1 ? 'is' : 'are'} signed.
              </p>
              {activation && activation.blockers.length > 1 && (
                <ul className="mt-1 list-disc pl-4 text-xs">
                  {activation.blockers.map((reason) => (
                    <li key={reason}>{reason}</li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        )}

        {loading ? (
          <div className="flex justify-center py-6">
            <Loader2 className="h-5 w-5 animate-spin text-ink-4" />
          </div>
        ) : forms.length === 0 ? (
          <p className="rounded-lg border border-dashed p-4 text-sm text-ink-4">
            No extra documents on this lease.
            {leaseStatus === 'ACTIVE'
              ? ' You can still add one — an RTB-8 to end the tenancy, for example.'
              : ' Add a pet addendum or a guarantor form if this tenancy needs one.'}
          </p>
        ) : (
          forms.map((form) => (
            <FormRow
              key={form.id}
              form={form}
              busy={busyId === form.id}
              onSend={() => setSendTarget(form)}
              onFill={() => setFillTarget(form)}
              onSign={() => setSignTarget(form)}
              onRemind={() => handleRemind(form)}
              onVoid={() => handleVoid(form)}
              onDownload={() =>
                token && downloadLeaseFormPdf(token, form.id, form.title)
              }
            />
          ))
        )}
      </CardContent>

      <FormPicker
        open={pickerOpen}
        onOpenChange={setPickerOpen}
        onPick={attach}
      />

      {placing && (
        <Dialog open onOpenChange={() => setPlacing(null)}>
          <DialogContent className="max-h-[90vh] max-w-5xl overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Place the fields on {placing.name}</DialogTitle>
              <DialogDescription>
                Drag a signature box onto the page where each person signs. You
                only have to do this once per form.
              </DialogDescription>
            </DialogHeader>
            <FormFieldPlacer
              template={placing}
              onSaved={async (count) => {
                toast.success(`${count} field(s) saved.`);
                const template = { ...placing, placement_count: count };
                setPlacing(null);
                await attach(template);
              }}
            />
          </DialogContent>
        </Dialog>
      )}

      {fillTarget && (
        <FillDialog
          form={fillTarget}
          onClose={() => setFillTarget(null)}
          onSaved={async () => {
            setFillTarget(null);
            await load();
          }}
        />
      )}

      {signTarget && (
        <SignDialog
          form={signTarget}
          onClose={() => setSignTarget(null)}
          onSigned={async () => {
            setSignTarget(null);
            await load();
            onChanged?.();
          }}
        />
      )}

      {sendTarget && (
        <SendDialog
          form={sendTarget}
          onClose={() => setSendTarget(null)}
          onSent={async () => {
            setSendTarget(null);
            await load();
            onChanged?.();
          }}
        />
      )}
    </Card>
  );
}

function FormRow({
  form,
  busy,
  onSend,
  onFill,
  onSign,
  onRemind,
  onVoid,
  onDownload,
}: {
  form: LeaseForm;
  busy: boolean;
  onSend: () => void;
  onFill: () => void;
  onSign: () => void;
  onRemind: () => void;
  onVoid: () => void;
  onDownload: () => void;
}) {
  const done = form.status === 'COMPLETED';
  const voided = form.status === 'VOID';
  // The backend locks the contents at the FIRST signature, not at send — so a
  // typo can still be corrected after the link has gone out, as long as nobody
  // has put their name to it yet.
  const editable =
    !done && !voided && !form.signers.some((signer) => signer.has_signed);

  return (
    <div className="rounded-lg border p-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="flex items-center gap-1.5 text-sm font-medium text-ink">
            {done ? (
              <CheckCircle2 className="h-4 w-4 shrink-0 text-green-600" />
            ) : voided ? (
              <XCircle className="h-4 w-4 shrink-0 text-ink-4" />
            ) : (
              <FileText className="h-4 w-4 shrink-0 text-ink-4" />
            )}
            {form.title}
            {form.blocks_activation && (
              <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-amber-800">
                Blocking
              </span>
            )}
          </p>
          <p className="mt-0.5 text-xs text-ink-4">
            {STATUS_LABEL[form.status] ?? form.status}
            {form.outstanding.length > 0 &&
              ` · waiting on ${form.outstanding.join(', ')}`}
          </p>
          {form.needs_filling?.length > 0 && (
            <p className="mt-1 flex items-start gap-1 text-xs text-amber-700">
              <AlertCircle className="mt-0.5 h-3 w-3 shrink-0" />
              Still blank: {form.needs_filling.join(', ')}
            </p>
          )}
        </div>

        <div className="flex flex-wrap gap-1">
          {editable && (
            <Button
              size="sm"
              variant="outline"
              onClick={onFill}
              disabled={busy}
            >
              <Settings2 className="mr-1.5 h-3.5 w-3.5" />
              {form.needs_filling?.length > 0 ? 'Fill in' : 'Edit details'}
            </Button>
          )}
          {!done && !voided && form.status === 'DRAFT' && (
            <Button
              size="sm"
              variant="outline"
              onClick={onSend}
              disabled={busy || form.needs_filling?.length > 0}
            >
              <Send className="mr-1.5 h-3.5 w-3.5" />
              Send
            </Button>
          )}
          {form.my_signature?.can_sign && (
            <Button size="sm" onClick={onSign} disabled={busy}>
              <PenLine className="mr-1.5 h-3.5 w-3.5" />
              Sign
            </Button>
          )}
          {!done && !voided && form.status !== 'DRAFT' && (
            <Button
              size="sm"
              variant="ghost"
              onClick={onRemind}
              disabled={busy}
            >
              <BellRing className="mr-1.5 h-3.5 w-3.5" />
              Remind
            </Button>
          )}
          <Button
            size="sm"
            variant="ghost"
            onClick={onDownload}
            disabled={busy}
          >
            <Download className="h-3.5 w-3.5" />
          </Button>
          {!done && !voided && (
            <Button size="sm" variant="ghost" onClick={onVoid} disabled={busy}>
              {busy ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <XCircle className="h-3.5 w-3.5" />
              )}
            </Button>
          )}
        </div>
      </div>

      {form.signers.length > 0 && (
        <ul className="mt-2 space-y-1 border-t pt-2">
          {form.signers.map((signer) => (
            <li
              key={signer.id}
              className="flex items-center gap-1.5 text-xs text-ink-4"
            >
              {signer.has_signed ? (
                <CheckCircle2 className="h-3 w-3 text-green-600" />
              ) : signer.declined_at ? (
                <XCircle className="h-3 w-3 text-red-500" />
              ) : (
                <Clock className="h-3 w-3" />
              )}
              <span className="text-ink-3">{signer.display_name}</span>
              <span>
                {signer.has_signed
                  ? `signed ${new Date(signer.signed_at!).toLocaleDateString()}`
                  : signer.declined_at
                    ? `declined${signer.decline_reason ? ` — ${signer.decline_reason}` : ''}`
                    : signer.opened_at
                      ? 'opened the link, not signed'
                      : 'not opened yet'}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/**
 * The landlord signing their own form, in the dashboard.
 *
 * They get an emailed link like everybody else, but making the person who
 * created the document go and find their own email to sign it is a round trip
 * for nothing. This calls the authenticated endpoint, which produces the
 * identical evidence row — same typed legal name, timestamp, IP, user agent and
 * document checksums as the public link.
 */
function SignDialog({
  form,
  onClose,
  onSigned,
}: {
  form: LeaseForm;
  onClose: () => void;
  onSigned: () => void;
}) {
  const { token } = useAuth();
  const [signature, setSignature] = useState<SignatureValue | null>(null);
  const [saving, setSaving] = useState(false);

  async function sign() {
    if (!token || !signature || !signatureIsReady(signature)) return;
    setSaving(true);
    try {
      await signLeaseFormInApp(token, form.id, {
        typed_name: signature.typedName.trim(),
        method: signature.method,
        signature_png: signature.signaturePng,
      });
      toast.success(`${form.title} signed.`);
      onSigned();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not sign that.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Sign {form.title}</DialogTitle>
          <DialogDescription>
            Signing as {form.my_signature?.name}. Read the document first — the
            download button on the form has it.
          </DialogDescription>
        </DialogHeader>

        {form.needs_filling?.length > 0 && (
          <p className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            Still blank: {form.needs_filling.join(', ')}. Fill those in before
            signing — once anyone signs, the contents are fixed.
          </p>
        )}

        <SignaturePad
          defaultName={form.my_signature?.name ?? ''}
          disabled={saving}
          onChange={setSignature}
        />

        <Button
          onClick={sign}
          disabled={saving || !signatureIsReady(signature)}
          className="w-full"
        >
          {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Sign this document
        </Button>
      </DialogContent>
    </Dialog>
  );
}

/**
 * Type in the boxes the form insists on before it can go out.
 *
 * Only the blank required ones. Everything the lease already knows — the
 * address, the parties' names — is prefilled and not re-asked, so this stays a
 * short list of the things Rentium genuinely cannot know: the day and time the
 * tenant vacates, for an RTB-8.
 */
function FillDialog({
  form,
  onClose,
  onSaved,
}: {
  form: LeaseForm;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { token } = useAuth();
  const [values, setValues] = useState<Record<string, string>>(() => ({
    ...form.values,
  }));
  const [saving, setSaving] = useState(false);

  // Match the labels the API reported back to the placements they came from.
  // Every box a person types into, not just the blank required ones. Limiting
  // it to those meant a prefilled name could not be corrected and an optional
  // address could not be entered at all — the landlord's own address block on
  // RTB-8 was unreachable from the UI.
  const rows = form.placements.filter(
    (placement) =>
      placement.kind !== 'SIGNATURE' &&
      placement.kind !== 'INITIALS' &&
      !(placement.kind === 'DATE' && placement.auto_source === 'today')
  );

  // A form's labels are not unique. RTB-8 prints "first and middle name(s)"
  // over BOTH its landlord block and its tenant block, so an unqualified list
  // gave the landlord two identical fields and no way to tell them apart —
  // which is how their own name ended up in the tenant's block. Same rule the
  // backend applies to its error message: qualify only what repeats.
  const seen = new Map<string, number>();
  for (const placement of form.placements) {
    const label = placement.label || placement.key;
    seen.set(label, (seen.get(label) ?? 0) + 1);
  }
  const WHOSE: Record<string, string> = {
    LANDLORD: "Landlord's",
    CO_LANDLORD: "Co-landlord's",
    TENANT: "Tenant's",
  };
  const labelFor = (placement: FormPlacement) => {
    const label = placement.label || placement.key;
    if ((seen.get(label) ?? 0) < 2) return label;
    return `${WHOSE[placement.signer_role] ?? ''} ${label}`.trim();
  };

  // Only what the landlord actually altered. The editor is seeded with the
  // form's current values so it reads as editing rather than re-entry, which
  // means "did anything change" has to be asked explicitly.
  const changed = Object.fromEntries(
    Object.entries(values).filter(
      ([key, value]) => value !== (form.values[key] ?? '')
    )
  );

  async function save() {
    if (!token) return;
    setSaving(true);
    try {
      await setLeaseFormValues(token, form.id, changed);
      toast.success('Saved.');
      onSaved();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not save that.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{form.title} — details</DialogTitle>
          <DialogDescription>
            Everything that prints on the document. Names and addresses come off
            the lease where Rentium knows them; correct anything that is wrong,
            and fill in what it cannot know. Locked once anyone has signed.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          {rows.map((placement) => (
            <div key={placement.key}>
              <Label htmlFor={placement.key} className="text-xs">
                {labelFor(placement)}
                {placement.kind === 'DATE' && ' (DD/MM/YYYY)'}
              </Label>
              <Input
                id={placement.key}
                value={values[placement.key] ?? ''}
                placeholder={placement.kind === 'DATE' ? '31/08/2026' : ''}
                onChange={(event) =>
                  setValues((current) => ({
                    ...current,
                    [placement.key]: event.target.value,
                  }))
                }
              />
            </div>
          ))}

          <Button
            onClick={save}
            disabled={saving || Object.keys(changed).length === 0}
            className="w-full"
          >
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/**
 * Send for signature — including to somebody the lease doesn't know about.
 *
 * Every slot with a person on the lease is filled automatically. What this
 * dialog exists for is the slot with nobody in it: a unit with no invitee yet,
 * or a guarantor who will never be a tenant. Their name and email are collected
 * here, at the moment the link is created.
 */
function SendDialog({
  form,
  onClose,
  onSent,
}: {
  form: LeaseForm;
  onClose: () => void;
  onSent: () => void;
}) {
  const { token } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [sending, setSending] = useState(false);
  const [links, setLinks] = useState<Record<string, string> | null>(null);

  // Slots that have a required signature box but nobody on the lease to fill it.
  const unfilledTenantSlot = !form.signers.some(
    (signer) => signer.role === 'TENANT' && signer.email
  );

  async function send() {
    if (!token) return;
    setSending(true);
    try {
      const result = await sendLeaseForm(
        token,
        form.id,
        email ? { 'TENANT:0': { name, email } } : undefined
      );
      setLinks(result.links);
      toast.success('Signing links sent.');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not send it.');
    } finally {
      setSending(false);
    }
  }

  return (
    <Dialog
      open
      onOpenChange={(open) => !open && (links ? onSent() : onClose())}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Send {form.title} for signature</DialogTitle>
          <DialogDescription>
            Everyone gets a personal link. They don&apos;t need a Rentium
            account to sign.
          </DialogDescription>
        </DialogHeader>

        {links ? (
          <div className="space-y-2">
            <p className="text-sm text-ink-3">
              Sent. You can also share these links directly:
            </p>
            {Object.entries(links).map(([slot, url]) => (
              <div key={slot} className="flex items-center gap-2">
                <code className="min-w-0 flex-1 truncate rounded bg-[hsl(var(--surface-sunken))] px-2 py-1 text-xs">
                  {url}
                </code>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    void navigator.clipboard.writeText(url);
                    toast.success('Link copied.');
                  }}
                >
                  <Copy className="h-3.5 w-3.5" />
                </Button>
              </div>
            ))}
            <Button className="w-full" onClick={onSent}>
              Done
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {unfilledTenantSlot && (
              <div className="space-y-2 rounded-lg border p-3">
                <p className="flex items-start gap-2 text-xs text-ink-4">
                  <Settings2 className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                  Nobody on this lease is filling the tenant signature yet. Give
                  their name and email and we&apos;ll send them a link.
                </p>
                <div>
                  <Label htmlFor="signer-name" className="text-xs">
                    Name
                  </Label>
                  <Input
                    id="signer-name"
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    placeholder="Sarah Chen"
                  />
                </div>
                <div>
                  <Label htmlFor="signer-email" className="text-xs">
                    Email
                  </Label>
                  <Input
                    id="signer-email"
                    type="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder="sarah@example.com"
                  />
                </div>
              </div>
            )}

            <Button onClick={send} disabled={sending} className="w-full">
              {sending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Send for signature
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
