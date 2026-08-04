// /sign/[token]
//
// Signing one document, with no account and no login. The token in the URL is a
// capability: it covers exactly one signature slot on one form, once, and stops
// working the moment it is used or expires.
//
// The document is shown as server-rendered page images rather than an embedded
// PDF viewer. That is not a shortcut — it is what lets us draw the signer's own
// boxes on top of the page at the exact coordinates the server will stamp, so
// what they see is what gets signed. It also means no PDF library ships to a
// phone on a rental Wi-Fi connection.
'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useParams } from 'next/navigation';
import {
  AlertCircle,
  CheckCircle2,
  Download,
  FileText,
  Loader2,
  ShieldCheck,
  XCircle,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import SignaturePad, {
  signatureIsReady,
  type SignatureValue,
} from '@/components/signing/SignaturePad';
import {
  declineSigning,
  fetchSigningPageImage,
  fetchSigningView,
  signingPdfUrl,
  submitSignature,
} from '@/lib/publicSigningApi';
import type { FormPlacement, PublicSigningView } from '@/types/leaseForm';

const STAGE_WORDS: Record<string, string> = {
  WITH_LEASE: 'This is signed as part of the lease.',
  ADDENDUM: 'This is an addendum to an existing tenancy.',
  MOVE_OUT: 'Signing this ends the tenancy on the date shown.',
};

export default function SignFormPage() {
  const token = useParams().token as string;

  const [view, setView] = useState<PublicSigningView | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [signature, setSignature] = useState<SignatureValue | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [showDecline, setShowDecline] = useState(false);
  const [declineReason, setDeclineReason] = useState('');

  const load = useCallback(async () => {
    try {
      setView(await fetchSigningView(token));
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleSign() {
    if (!signature || !signatureIsReady(signature)) return;
    setSubmitting(true);
    setError(null);
    try {
      setView(
        await submitSignature(token, {
          typed_name: signature.typedName.trim(),
          method: signature.method,
          signature_png: signature.signaturePng,
        })
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not sign.');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDecline() {
    setSubmitting(true);
    try {
      setView(await declineSigning(token, declineReason));
      setShowDecline(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not record that.');
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-ink-4" />
      </div>
    );
  }

  if (!view) {
    return (
      <Centered
        icon={<XCircle className="h-8 w-8 text-ink-4" />}
        title="This link isn't valid any more"
        body={
          error ??
          'It may have already been used, or the landlord may have withdrawn the document. Ask them to send a new link.'
        }
      />
    );
  }

  const done = view.signer.has_signed;
  const declined = view.signer.declined;

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-8 sm:py-12">
      <header className="mb-6">
        <p className="text-sm text-ink-4">
          {view.landlord_name} · {view.property_label}
        </p>
        <h1 className="mt-1 text-2xl font-semibold text-ink">{view.title}</h1>
        {(view.purpose || STAGE_WORDS[view.stage]) && (
          <p className="mt-2 text-sm leading-relaxed text-ink-3">
            {view.purpose || STAGE_WORDS[view.stage]}
          </p>
        )}
      </header>

      {view.blocks_activation && !done && (
        <Notice tone="warn">
          The tenancy doesn&apos;t take effect until this is signed.
        </Notice>
      )}

      {declined && (
        <Notice tone="warn">
          You declined this document. If that was a mistake, ask{' '}
          {view.landlord_name} to send it again.
        </Notice>
      )}

      {done && (
        <Notice tone="ok">
          Signed.{' '}
          {view.already_complete
            ? 'Everyone has now signed, so this document is final.'
            : 'We’re still waiting on the other party.'}
        </Notice>
      )}

      <Card className="mb-6">
        <CardHeader className="flex flex-row items-center justify-between gap-3 space-y-0">
          <div>
            <CardTitle className="text-base">The document</CardTitle>
            <CardDescription>
              {view.page_count} page{view.page_count === 1 ? '' : 's'} — read it
              before you sign.
            </CardDescription>
          </div>
          <Button asChild variant="outline" size="sm">
            <a href={signingPdfUrl(token)} target="_blank" rel="noreferrer">
              <Download className="mr-1.5 h-3.5 w-3.5" />
              PDF
            </a>
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          {Array.from({ length: view.page_count }, (_, page) => (
            <DocumentPage
              key={page}
              token={token}
              page={page}
              fields={view.my_fields.filter((field) => field.page === page)}
              highlight={!done && !declined}
            />
          ))}
        </CardContent>
      </Card>

      {!done && !declined && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              Sign as {view.signer.name}
            </CardTitle>
            <CardDescription>
              The highlighted boxes above are the ones you&apos;re signing.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <SignaturePad
              defaultName={view.signer.name}
              disabled={submitting}
              onChange={setSignature}
            />

            {error && (
              <p className="flex items-start gap-2 text-sm text-red-600">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                {error}
              </p>
            )}

            <div className="flex flex-wrap items-center gap-2">
              <Button
                onClick={handleSign}
                disabled={submitting || !signatureIsReady(signature)}
              >
                {submitting ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <FileText className="mr-2 h-4 w-4" />
                )}
                Sign this document
              </Button>
              <Button
                variant="ghost"
                onClick={() => setShowDecline((open) => !open)}
                disabled={submitting}
              >
                I don&apos;t want to sign
              </Button>
            </div>

            {showDecline && (
              <div className="space-y-2 rounded-lg border p-3">
                <Textarea
                  value={declineReason}
                  onChange={(event) => setDeclineReason(event.target.value)}
                  placeholder="Optional — tell them why, so they can fix it."
                  rows={3}
                />
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={handleDecline}
                  disabled={submitting}
                >
                  Decline
                </Button>
              </div>
            )}

            <p className="flex items-start gap-2 text-xs text-ink-4">
              <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              Signing records your name, the time, and your device details as
              evidence that you agreed to this document. This link is personal
              to you — don&apos;t forward it.
            </p>
          </CardContent>
        </Card>
      )}
    </main>
  );
}

/**
 * One page image with the signer's own boxes drawn on top.
 *
 * Boxes are positioned as percentages, which is exactly how they are stored —
 * so the outline sits on the same spot the server will stamp, at any width the
 * browser happens to render the page at.
 */
function DocumentPage({
  token,
  page,
  fields,
  highlight,
}: {
  token: string;
  page: number;
  fields: FormPlacement[];
  highlight: boolean;
}) {
  const [src, setSrc] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  const objectUrl = useRef<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchSigningPageImage(token, page)
      .then((url) => {
        if (cancelled) {
          URL.revokeObjectURL(url);
          return;
        }
        objectUrl.current = url;
        setSrc(url);
      })
      .catch(() => !cancelled && setFailed(true));
    return () => {
      cancelled = true;
      // Blob URLs leak for the life of the document otherwise.
      if (objectUrl.current) URL.revokeObjectURL(objectUrl.current);
    };
  }, [token, page]);

  if (failed) {
    return (
      <div className="rounded-lg border border-dashed p-6 text-center text-sm text-ink-4">
        This page couldn&apos;t be rendered. Use the PDF button above to read
        it.
      </div>
    );
  }

  if (!src) {
    return (
      <div className="flex h-64 items-center justify-center rounded-lg border bg-[hsl(var(--surface-sunken))]">
        <Loader2 className="h-5 w-5 animate-spin text-ink-4" />
      </div>
    );
  }

  return (
    <div className="relative overflow-hidden rounded-lg border">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt={`Page ${page + 1}`} className="block w-full" />
      {highlight &&
        fields.map((field) => (
          <span
            key={field.key}
            className="pointer-events-none absolute rounded-sm border-2 border-teal-500/70 bg-teal-400/10"
            style={{
              left: `${field.x * 100}%`,
              top: `${field.y * 100}%`,
              width: `${field.width * 100}%`,
              height: `${field.height * 100}%`,
            }}
          />
        ))}
    </div>
  );
}

function Notice({
  tone,
  children,
}: {
  tone: 'ok' | 'warn';
  children: React.ReactNode;
}) {
  const styles =
    tone === 'ok'
      ? 'border-green-200 bg-green-50 text-green-900'
      : 'border-amber-200 bg-amber-50 text-amber-900';
  const Icon = tone === 'ok' ? CheckCircle2 : AlertCircle;
  return (
    <div
      className={`mb-6 flex items-start gap-2 rounded-lg border p-3 text-sm ${styles}`}
    >
      <Icon className="mt-0.5 h-4 w-4 shrink-0" />
      <span>{children}</span>
    </div>
  );
}

function Centered({
  icon,
  title,
  body,
}: {
  icon: React.ReactNode;
  title: string;
  body: string;
}) {
  return (
    <main className="mx-auto flex min-h-[60vh] w-full max-w-md flex-col items-center justify-center px-4 text-center">
      {icon}
      <h1 className="mt-4 text-lg font-semibold text-ink">{title}</h1>
      <p className="mt-2 text-sm text-ink-4">{body}</p>
    </main>
  );
}
