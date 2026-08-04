'use client';

/**
 * "You also need to sign this."
 *
 * A tenant who has already signed the lease has no way of knowing a form was
 * attached afterwards — from their side nothing visibly happened. Without this
 * section the only signal is an email, and if they miss it the lease sits at
 * PENDING with neither party understanding why.
 *
 * Signing here goes through the authenticated endpoint rather than the public
 * token link, but produces the identical evidence row: same typed legal name,
 * same timestamp, same IP and user agent, same document checksums.
 */

import { useCallback, useEffect, useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  Download,
  FileText,
  Loader2,
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
import SignaturePad, {
  signatureIsReady,
  type SignatureValue,
} from '@/components/signing/SignaturePad';
import { useAuth } from '@/contexts/AuthContext';
import {
  downloadLeaseFormPdf,
  fetchLeaseForms,
  signLeaseFormInApp,
} from '@/lib/leaseFormApi';
import type { LeaseForm } from '@/types/leaseForm';

interface Props {
  leaseId: string;
  /** The signed-in tenant's name, so they rarely have to type it. */
  tenantName?: string;
  onSigned?: () => void;
}

export default function TenantLeaseForms({
  leaseId,
  tenantName = '',
  onSigned,
}: Props) {
  const { token } = useAuth();
  const [forms, setForms] = useState<LeaseForm[]>([]);
  const [loading, setLoading] = useState(true);
  const [openId, setOpenId] = useState<string | null>(null);
  const [signature, setSignature] = useState<SignatureValue | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    if (!token) return;
    try {
      setForms(await fetchLeaseForms(token, leaseId));
    } catch {
      // A tenant with no forms on their lease is the normal case; a failure
      // here must not break the rest of their dashboard.
      setForms([]);
    } finally {
      setLoading(false);
    }
  }, [token, leaseId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function sign(form: LeaseForm) {
    if (!token || !signature || !signatureIsReady(signature)) return;
    setSubmitting(true);
    try {
      await signLeaseFormInApp(token, form.id, {
        typed_name: signature.typedName.trim(),
        method: signature.method,
        signature_png: signature.signaturePng,
      });
      toast.success(`${form.title} signed.`);
      setOpenId(null);
      setSignature(null);
      await load();
      onSigned?.();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not sign that.');
    } finally {
      setSubmitting(false);
    }
  }

  if (loading || forms.length === 0) return null;

  const outstanding = forms.filter(
    (form) => form.status !== 'COMPLETED' && form.status !== 'VOID'
  );
  const signedOff = forms.filter((form) => form.status === 'COMPLETED');

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">
          {outstanding.length > 0
            ? 'Also needs your signature'
            : 'Documents on your tenancy'}
        </CardTitle>
        <CardDescription>
          Documents your landlord attached to this lease.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-3">
        {outstanding.map((form) => (
          <div key={form.id} className="rounded-lg border p-3">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="flex items-center gap-1.5 text-sm font-medium text-ink">
                  <FileText className="h-4 w-4 shrink-0 text-ink-4" />
                  {form.title}
                </p>
                {form.template.purpose && (
                  <p className="mt-1 text-xs text-ink-4">
                    {form.template.purpose}
                  </p>
                )}
                {form.blocks_activation && (
                  <p className="mt-1 flex items-center gap-1 text-xs text-amber-700">
                    <AlertCircle className="h-3 w-3" />
                    Your tenancy doesn&apos;t take effect until this is signed.
                  </p>
                )}
              </div>
              <div className="flex gap-1">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() =>
                    token && downloadLeaseFormPdf(token, form.id, form.title)
                  }
                >
                  <Download className="h-3.5 w-3.5" />
                </Button>
                <Button
                  size="sm"
                  onClick={() => {
                    setOpenId(openId === form.id ? null : form.id);
                    setSignature(null);
                  }}
                >
                  {openId === form.id ? 'Cancel' : 'Read & sign'}
                </Button>
              </div>
            </div>

            {openId === form.id && (
              <div className="mt-3 space-y-3 border-t pt-3">
                <p className="text-xs text-ink-4">
                  Download and read the document above before signing.
                </p>
                <SignaturePad
                  defaultName={tenantName}
                  disabled={submitting}
                  onChange={setSignature}
                />
                <Button
                  onClick={() => sign(form)}
                  disabled={submitting || !signatureIsReady(signature)}
                >
                  {submitting && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  Sign {form.title}
                </Button>
              </div>
            )}
          </div>
        ))}

        {signedOff.map((form) => (
          <div
            key={form.id}
            className="flex items-center justify-between gap-2 rounded-lg border p-3"
          >
            <p className="flex items-center gap-1.5 text-sm text-ink">
              <CheckCircle2 className="h-4 w-4 shrink-0 text-green-600" />
              {form.title}
            </p>
            <Button
              size="sm"
              variant="ghost"
              onClick={() =>
                token && downloadLeaseFormPdf(token, form.id, form.title)
              }
            >
              <Download className="mr-1.5 h-3.5 w-3.5" />
              Copy
            </Button>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
