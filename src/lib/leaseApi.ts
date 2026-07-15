// leaseApi.ts
//
// Single client for every lease-related API call. Existing imports of
// `fetchLeases`/`signLease`/etc. from "@/lib/leaseApi" keep working unchanged —
// this is the same file, expanded, not a new path to migrate to.

import { DJANGO_API_URL } from "@/lib/config";

// ---------------------------------------------------------------------------
// Shared request helpers — one place that knows how to attach auth headers and
// unwrap DRF-shaped error bodies, instead of every caller reimplementing
// `body.detail || body.field?.join(" ") || fallback` themselves.
// ---------------------------------------------------------------------------

async function extractApiError(res: Response, fallback: string): Promise<string> {
  const body = await res.json().catch(() => ({} as Record<string, unknown>));

  if (typeof body.detail === "string") return body.detail;

  // DRF field errors come back as {"field_name": ["message", ...]}. Grab the
  // first one we find rather than requiring every caller to know which field
  // name might be relevant to their particular request.
  for (const value of Object.values(body)) {
    if (Array.isArray(value) && typeof value[0] === "string") return value[0];
    if (typeof value === "string") return value;
  }

  return fallback;
}

async function apiGet(token: string, path: string) {
  const res = await fetch(`${DJANGO_API_URL}${path}`, {
    headers: { Authorization: `Token ${token}` },
  });
  if (!res.ok) throw new Error(await extractApiError(res, `Request failed (${res.status})`));
  return res.json();
}

async function apiPost(token: string, path: string, body?: unknown) {
  const res = await fetch(`${DJANGO_API_URL}${path}`, {
    method: "POST",
    headers: {
      Authorization: `Token ${token}`,
      "Content-Type": "application/json",
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) throw new Error(await extractApiError(res, `Request failed (${res.status})`));
  // Some POST actions (e.g. resend_invite) return a plain {"detail": "..."}
  // rather than a resource — .json() handles both fine.
  return res.json();
}

async function apiPatch(token: string, path: string, body: unknown) {
  const res = await fetch(`${DJANGO_API_URL}${path}`, {
    method: "PATCH",
    headers: {
      Authorization: `Token ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(await extractApiError(res, `Request failed (${res.status})`));
  return res.json();
}

async function apiDelete(token: string, path: string) {
  const res = await fetch(`${DJANGO_API_URL}${path}`, {
    method: "DELETE",
    headers: { Authorization: `Token ${token}` },
  });
  if (!res.ok && res.status !== 204) {
    throw new Error(await extractApiError(res, `Request failed (${res.status})`));
  }
}

/** Fetches a PDF and triggers a browser download. */
async function apiDownload(token: string, path: string, filename: string) {
  const res = await fetch(`${DJANGO_API_URL}${path}`, {
    headers: { Authorization: `Token ${token}` },
  });
  if (!res.ok) throw new Error(await extractApiError(res, `Failed to download (${res.status})`));

  const blob = await res.blob();
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
}

// ---------------------------------------------------------------------------
// Leases
// ---------------------------------------------------------------------------

/** All leases this user (landlord or tenant) is party to. Returns the SUMMARY
 *  shape (LeaseListSerializer) — no lease_tenants, no bills_summary. Use it to
 *  pick WHICH lease, then fetchLeaseDetails() for the full one. */
export async function fetchLeases(token: string) {
  return apiGet(token, "/leases/");
}

/** Full detail for a single lease. */
export async function fetchLeaseDetails(token: string, leaseId: string) {
  return apiGet(token, `/leases/${leaseId}/`);
}

export async function createLease(token: string, payload: Record<string, unknown>) {
  return apiPost(token, "/leases/", payload);
}

/** Only works while the lease is still DRAFT — see LeaseViewSet.destroy(). */
export async function deleteLeaseDraft(token: string, leaseId: string) {
  return apiDelete(token, `/leases/${leaseId}/`);
}

export async function terminateLease(token: string, leaseId: string, terminationDate?: string) {
  return apiPost(
    token,
    `/leases/${leaseId}/terminate/`,
    terminationDate ? { termination_date: terminationDate } : {},
  );
}

export async function landlordSignLease(token: string, leaseId: string) {
  return apiPost(token, `/leases/${leaseId}/landlord_sign/`);
}

export async function downloadLeasePdf(token: string, leaseId: string, leaseNumber: string) {
  return apiDownload(token, `/leases/${leaseId}/pdf/`, `lease_${leaseNumber}.pdf`);
}

/** The rendered agreement as structured JSON — the SAME object the PDF renders
 *  (rentium/leases/documents.py). The sign gate displays this. They cannot
 *  disagree, because they are the same object. */
export async function fetchLeaseDocument(token: string, leaseId: string) {
  return apiGet(token, `/leases/${leaseId}/document/`);
}

export interface RentSplitRow {
  id: string | null;
  rent_amount: string | null;
  touched: boolean;
}

export interface RentSplitResultRow {
  id: string | null;
  rent_amount: string;
  touched: boolean;
  has_signed: boolean;
}

export interface RentSplitResult {
  total_rent: string;
  unallocated: string;
  rows: RentSplitResultRow[];
}

/**
 * Computes what each tenant row's rent_amount should be, given the lease's
 * total_rent and the current set of rows — the backend is the single source of
 * truth for this (leases/services.py:compute_rent_split). Call this on every edit
 * instead of recomputing the split locally in JS; `has_signed` is looked up
 * server-side, so you don't need to track/send it yourself for existing rows.
 */
export async function previewRentSplit(
  token: string,
  leaseId: string,
  rows: RentSplitRow[],
): Promise<RentSplitResult> {
  return apiPost(token, `/leases/${leaseId}/preview-split/`, { rows });
}

// ---------------------------------------------------------------------------
// Lease tenants
// ---------------------------------------------------------------------------

export async function createLeaseTenant(
  token: string,
  payload: {
    lease: string;
    invited_email: string;
    invited_name?: string;
    invited_phone?: string;
    rent_amount?: number;
    is_primary_tenant?: boolean;
  },
) {
  return apiPost(token, "/leases/tenants/", payload);
}

export async function updateLeaseTenant(
  token: string,
  leaseTenantId: string,
  payload: Partial<{ rent_amount: number; is_primary_tenant: boolean; tenant_notes: string }>,
) {
  return apiPatch(token, `/leases/tenants/${leaseTenantId}/`, payload);
}

/** All payments for a given lease, scoped to the requesting user automatically. */
export async function fetchPaymentsForLease(token: string, leaseId: string) {
  return apiGet(token, `/leases/payments/?lease=${leaseId}`);
}

/** All documents attached to a lease. */
export async function fetchDocumentsForLease(token: string, leaseId: string) {
  return apiGet(token, `/leases/documents/?lease=${leaseId}`);
}

/**
 * Sign a LeaseTenant slot. If the tenant was only invited (not yet linked to a
 * TenantProfile), the backend auto-claims the slot as part of this call — no
 * separate "claim" step needed.
 *
 * `phone` is REQUIRED unless the account already has one on file, and the backend
 * enforces that. A tenancy agreement names a phone number for each party; the
 * landlord's is on the lease, and the tenant's was never asked for anywhere in
 * this app — so it has printed blank on every agreement ever produced here.
 *
 * Signing is the right moment to ask for it, and the only moment it justifies
 * itself: it's the one point where a tenant is unambiguously supplying their
 * contact details FOR a legal document, rather than being nagged for a field on
 * a settings page they'll never open.
 */
export async function signLease(token: string, leaseTenantId: string, phone?: string) {
  return apiPost(
    token,
    `/leases/tenants/${leaseTenantId}/sign/`,
    phone ? { phone } : undefined,
  );
}

/**
 * Tenant declines to sign. The backend does not touch the parent Lease's status —
 * the landlord sees the decline on the lease detail page and decides next steps.
 */
export async function declineLease(token: string, leaseTenantId: string, reason?: string) {
  return apiPost(
    token,
    `/leases/tenants/${leaseTenantId}/decline/`,
    reason ? { reason } : undefined,
  );
}

/** Call once after signup, or whenever a tenant lands on a lease they were invited
 *  to but haven't explicitly claimed yet. Not required before signLease() — sign()
 *  auto-claims — but useful so the "LINKED" status shows immediately. */
export async function claimLeaseTenant(token: string, leaseTenantId: string) {
  return apiPost(token, `/leases/tenants/${leaseTenantId}/claim/`);
}

export async function resendInvite(token: string, leaseTenantId: string) {
  return apiPost(token, `/leases/tenants/${leaseTenantId}/resend_invite/`);
}

/** Copies an already-fetched invite_url to the clipboard — not an API call, just
 *  grouped here since every caller that has one wants to do this. */
export async function copyInviteLink(inviteUrl: string): Promise<void> {
  await navigator.clipboard.writeText(inviteUrl);
}

// --- Unauthenticated invite-acceptance flow (no token yet — the whole point is
//     creating the account) ---

export async function fetchInvitePreview(leaseTenantId: string, inviteToken: string) {
  const res = await fetch(
    `${DJANGO_API_URL}/leases/tenants/${leaseTenantId}/invite-preview/?token=${encodeURIComponent(inviteToken)}`,
  );
  if (!res.ok) {
    throw new Error(await extractApiError(res, "This invite link is invalid or has expired."));
  }
  return res.json();
}

export async function activateInviteAccount(
  leaseTenantId: string,
  payload: { token: string; password: string; name: string },
) {
  const res = await fetch(`${DJANGO_API_URL}/leases/tenants/${leaseTenantId}/activate-account/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    throw new Error(
      await extractApiError(
        res,
        "Couldn't create your account. The link may have already been used.",
      ),
    );
  }
  return res.json();
}