// publicSigningApi.ts
//
// The signing page for somebody with no Rentium account. No Authorization
// header anywhere in this file — the token in the URL IS the credential, and it
// is good for exactly one signature slot on one form, once.
//
// Shaped after chatApi.ts, which does the same job for a prospect's tokenized
// message thread.

import { DJANGO_API_URL } from '@/lib/config';
import type { PublicSigningView, SignatureMethod } from '@/types/leaseForm';

async function handle<T>(res: Response, fallback: string): Promise<T> {
  if (!res.ok) {
    const body = await res.json().catch(() => ({}) as Record<string, unknown>);
    const detail =
      typeof body.detail === 'string'
        ? body.detail
        : Object.values(body)
            .flat()
            .filter((value) => typeof value === 'string')
            .join(' ');
    throw new Error(detail || fallback);
  }
  return res.json();
}

const base = (token: string) => `${DJANGO_API_URL}/public/lease-forms/${token}`;

export async function fetchSigningView(token: string) {
  return handle<PublicSigningView>(
    await fetch(`${base(token)}/`),
    'This signing link is no longer valid.'
  );
}

/** A page of the document, with everything filled in so far, as an object URL. */
export async function fetchSigningPageImage(
  token: string,
  page: number,
  dpi = 150
) {
  const res = await fetch(`${base(token)}/page/${page}/?dpi=${dpi}`);
  if (!res.ok) throw new Error('Could not render that page.');
  return URL.createObjectURL(await res.blob());
}

export function signingPdfUrl(token: string) {
  return `${base(token)}/pdf/`;
}

export async function submitSignature(
  token: string,
  payload: {
    typed_name: string;
    method: SignatureMethod;
    /** PNG data URL from the canvas, when the signature was drawn. */
    signature_png?: string;
  }
) {
  return handle<PublicSigningView>(
    await fetch(`${base(token)}/sign/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    }),
    'That signature could not be recorded.'
  );
}

export async function declineSigning(token: string, reason: string) {
  return handle<PublicSigningView>(
    await fetch(`${base(token)}/decline/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason }),
    }),
    'That could not be recorded.'
  );
}
