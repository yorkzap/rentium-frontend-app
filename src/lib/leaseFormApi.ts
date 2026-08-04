// leaseFormApi.ts
//
// Client for lease form packs. Same helper shape as leaseApi.ts, plus the
// multipart helper that file has never needed — uploading a blank form is the
// first thing in the lease domain that sends a file.
//
// Page images are fetched as blobs through the authenticated endpoint rather
// than pointed at with <img src>, because these pages carry names, addresses and
// phone numbers and the backend deliberately refuses to hand out media URLs.

import { DJANGO_API_URL } from '@/lib/config';
import type {
  ActivationStatus,
  FormPlacement,
  LeaseForm,
  LeaseFormEvent,
  LeaseFormTemplate,
  SignatureMethod,
} from '@/types/leaseForm';

async function extractApiError(
  res: Response,
  fallback: string
): Promise<string> {
  const body = await res.json().catch(() => ({}) as Record<string, unknown>);
  if (typeof body.detail === 'string') return body.detail;
  for (const value of Object.values(body)) {
    if (Array.isArray(value) && typeof value[0] === 'string') return value[0];
    if (typeof value === 'string') return value;
  }
  return fallback;
}

async function handle<T>(res: Response, fallback: string): Promise<T> {
  if (!res.ok) throw new Error(await extractApiError(res, fallback));
  return res.status === 204 ? (undefined as T) : res.json();
}

function authHeaders(token: string) {
  return { Authorization: `Token ${token}` };
}

async function apiGet<T>(token: string, path: string): Promise<T> {
  return handle<T>(
    await fetch(`${DJANGO_API_URL}${path}`, { headers: authHeaders(token) }),
    'Could not load that.'
  );
}

async function apiSend<T>(
  token: string,
  path: string,
  method: 'POST' | 'PATCH' | 'PUT',
  body?: unknown
): Promise<T> {
  return handle<T>(
    await fetch(`${DJANGO_API_URL}${path}`, {
      method,
      headers: { ...authHeaders(token), 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
    }),
    'That request failed.'
  );
}

/** Multipart upload. No Content-Type — the browser sets the boundary itself. */
async function apiUpload<T>(
  token: string,
  path: string,
  form: FormData
): Promise<T> {
  return handle<T>(
    await fetch(`${DJANGO_API_URL}${path}`, {
      method: 'POST',
      headers: authHeaders(token),
      body: form,
    }),
    'That upload failed.'
  );
}

/** A page image as an object URL. Callers must revoke it when they unmount. */
async function apiImage(token: string, path: string): Promise<string> {
  const res = await fetch(`${DJANGO_API_URL}${path}`, {
    headers: authHeaders(token),
  });
  if (!res.ok)
    throw new Error(await extractApiError(res, 'Could not render that page.'));
  return URL.createObjectURL(await res.blob());
}

// ---------------------------------------------------------------------------
// The catalogue
// ---------------------------------------------------------------------------

/** System forms plus this landlord's own uploads, including COMING_SOON rows. */
export async function fetchFormCatalogue(token: string, jurisdiction = '') {
  const query = jurisdiction
    ? `?jurisdiction=${encodeURIComponent(jurisdiction)}`
    : '';
  return apiGet<LeaseFormTemplate[]>(token, `/leases/form-templates/${query}`);
}

export async function uploadFormTemplate(
  token: string,
  file: File,
  options: { name?: string; purpose?: string; stage?: string } = {}
) {
  const form = new FormData();
  form.append('file', file);
  if (options.name) form.append('name', options.name);
  if (options.purpose) form.append('purpose', options.purpose);
  if (options.stage) form.append('stage', options.stage);
  return apiUpload<LeaseFormTemplate>(token, '/leases/form-templates/', form);
}

/** Confirm what an uploaded form is for, or rename it. */
export async function updateFormTemplate(
  token: string,
  templateId: string,
  payload: { name?: string; purpose?: string; stage?: string }
) {
  return apiSend<LeaseFormTemplate>(
    token,
    `/leases/form-templates/${templateId}/`,
    'PATCH',
    payload
  );
}

export async function fetchTemplatePlacements(
  token: string,
  templateId: string
) {
  return apiGet<FormPlacement[]>(
    token,
    `/leases/form-templates/${templateId}/placements/`
  );
}

/** Replaces the WHOLE placement set — the editor's mental model is a canvas. */
export async function saveTemplatePlacements(
  token: string,
  templateId: string,
  placements: FormPlacement[]
) {
  return apiSend<{ placements: number }>(
    token,
    `/leases/form-templates/${templateId}/placements/`,
    'PUT',
    placements
  );
}

export async function fetchTemplatePageImage(
  token: string,
  templateId: string,
  page: number,
  dpi = 150
) {
  return apiImage(
    token,
    `/leases/form-templates/${templateId}/page/${page}/?dpi=${dpi}`
  );
}

/** The whitelist of lease fields a box can prefill from. */
export async function fetchPrefillSources(token: string) {
  return apiGet<string[]>(token, '/leases/form-templates/prefill_sources/');
}

export async function deleteFormTemplate(token: string, templateId: string) {
  const res = await fetch(
    `${DJANGO_API_URL}/leases/form-templates/${templateId}/`,
    {
      method: 'DELETE',
      headers: authHeaders(token),
    }
  );
  if (!res.ok && res.status !== 204)
    throw new Error(await extractApiError(res, 'Could not remove that form.'));
}

// ---------------------------------------------------------------------------
// Forms on a lease
// ---------------------------------------------------------------------------

export async function fetchLeaseForms(token: string, leaseId: string) {
  return apiGet<LeaseForm[]>(token, `/leases/forms/?lease=${leaseId}`);
}

export async function attachLeaseForm(
  token: string,
  payload: {
    lease: string;
    template: string;
    title?: string;
    required?: boolean;
  }
) {
  return apiSend<LeaseForm>(token, '/leases/forms/', 'POST', payload);
}

/**
 * Binds each signature slot to a real person and emails them a link.
 *
 * `signers` covers the case the lease can't: a slot for somebody who isn't on
 * the lease yet, keyed "ROLE:index" (e.g. "TENANT:0"). Anyone the lease already
 * knows about wins over a typed name for the same slot.
 */
export async function sendLeaseForm(
  token: string,
  formId: string,
  signers?: Record<string, { name: string; email: string }>
) {
  return apiSend<{ form: LeaseForm; links: Record<string, string> }>(
    token,
    `/leases/forms/${formId}/send/`,
    'POST',
    signers ? { signers } : {}
  );
}

export async function remindLeaseForm(token: string, formId: string) {
  return apiSend<{ reminded: number }>(
    token,
    `/leases/forms/${formId}/remind/`,
    'POST'
  );
}

/** In-app signing, for a party who is logged in. */
export async function signLeaseFormInApp(
  token: string,
  formId: string,
  payload: {
    typed_name: string;
    method: SignatureMethod;
    signature_png?: string;
  }
) {
  return apiSend<LeaseForm>(
    token,
    `/leases/forms/${formId}/sign/`,
    'POST',
    payload
  );
}

export async function voidLeaseForm(
  token: string,
  formId: string,
  reason = ''
) {
  return apiSend<LeaseForm>(token, `/leases/forms/${formId}/void/`, 'POST', {
    reason,
  });
}

/** Type into the non-signature boxes. Refused once anybody has signed. */
export async function setLeaseFormValues(
  token: string,
  formId: string,
  values: Record<string, string>
) {
  return apiSend<LeaseForm>(token, `/leases/forms/${formId}/values/`, 'PATCH', {
    values,
  });
}

export async function fetchLeaseFormEvents(token: string, formId: string) {
  return apiGet<LeaseFormEvent[]>(token, `/leases/forms/${formId}/events/`);
}

export async function fetchLeaseFormPageImage(
  token: string,
  formId: string,
  page: number,
  dpi = 150
) {
  return apiImage(token, `/leases/forms/${formId}/page/${page}/?dpi=${dpi}`);
}

export async function downloadLeaseFormPdf(
  token: string,
  formId: string,
  title: string
) {
  const res = await fetch(`${DJANGO_API_URL}/leases/forms/${formId}/pdf/`, {
    headers: authHeaders(token),
  });
  if (!res.ok)
    throw new Error(
      await extractApiError(res, 'Could not download that form.')
    );

  const url = URL.createObjectURL(await res.blob());
  const link = document.createElement('a');
  link.href = url;
  link.download = `${title.replace(/[^\w\-. ]+/g, '')}.pdf`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

/** Why hasn't this lease activated? Forms included. */
export async function fetchActivationStatus(token: string, leaseId: string) {
  return apiGet<ActivationStatus>(
    token,
    `/leases/${leaseId}/activation-status/`
  );
}
