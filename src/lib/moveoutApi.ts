// moveoutApi.ts
// Client for the move-out / end-of-tenancy API. The RULES live on the
// backend (leases/tenancy_rules.py) — this file only fetches and submits.
import { DJANGO_API_URL } from '@/lib/config';

export interface MoveOutRules {
  code: string;
  jurisdiction: string;
  rta_applies: boolean;
  tenant_notice_months: number;
  landlord_notice_months: number | null;
  mutual_agreement_form: string; // "RTB-8" in BC
  summary: string;
  today: string;
  earliest_tenant_end_date: string;
  earliest_landlord_end_date: string;
  landlord_shares_common_areas: boolean;
}

export type MoveOutKind =
  'TENANT_NOTICE' | 'LANDLORD_NOTICE' | 'MUTUAL_AGREEMENT';
export type MoveOutStatus = 'PENDING' | 'ACCEPTED' | 'DECLINED' | 'CANCELLED';
export type RentHandling = 'NONE' | 'VOID_FINAL' | 'PRORATE_FINAL';

export interface MoveOutRequest {
  id: string;
  lease: string;
  lease_number: string;
  lease_tenant: string | null;
  tenant_name: string | null;
  initiated_by: 'TENANT' | 'LANDLORD';
  kind: MoveOutKind;
  kind_display: string;
  status: MoveOutStatus;
  status_display: string;
  requested_end_date: string;
  effective_end_date: string | null;
  reason: string;
  decline_reason: string;
  form_type: string;
  rent_handling: RentHandling;
  rent_handling_display: string;
  tenant_signed: boolean;
  tenant_signed_at: string | null;
  landlord_signed: boolean;
  landlord_signed_at: string | null;
  rules_snapshot: Partial<MoveOutRules>;

  // --- deposit settlement -------------------------------------------------
  forwarding_address: string;
  forwarding_address_received_on: string | null;
  deposit_settlement: DepositSettlement;
  settlement_display: string;
  tenant_agreement_signed_on: string | null;
  rtb_file_number: string;
  deposit_status: DepositStatus;

  created_at: string;
}

export type DepositSettlement = 'PENDING' | 'RETURNED' | 'AGREED' | 'RTB';

/**
 * The 15-day clock, computed server-side. `deadline` is null until the clock
 * has genuinely STARTED — it runs from the later of the tenancy ending and
 * the forwarding address arriving in writing. Showing a date derived from the
 * end date alone would name a deadline that hasn't begun, which is worse than
 * showing none because the landlord would act on it.
 */
export interface DepositStatus {
  settlement: DepositSettlement;
  settled: boolean;
  forwarding_address_received: string | null;
  clock_starts: string | null;
  deadline: string | null;
  days_left: number | null;
  overdue: boolean;
  /** Why the clock hasn't started, when it hasn't. */
  blocked_on: string | null;
  what_must_happen: string | null;
  if_missed: string;
}

export interface SettleDepositPayload {
  forwarding_address?: string;
  forwarding_address_received_on?: string;
  deposit_settlement?: DepositSettlement;
  /** Required when settling as AGREED — a written agreement has a date. */
  tenant_agreement_signed_on?: string;
  /** Required when settling as RTB — an application has a file number. */
  rtb_file_number?: string;
  /** Required whenever deposit money actually moves (RETURNED or AGREED). */
  deposit_return_method?: 'ETRANSFER' | 'CASH' | 'CHEQUE' | 'OTHER';
  deposit_return_date?: string;
}

/**
 * One held deposit, and what a settlement would do to it.
 *
 * Deposits are separate charges precisely so they can be returned separately —
 * a single "deposit held" figure is what makes a landlord hand back the
 * cleaning deposit they meant to keep part of.
 */
export interface DepositBalance {
  charge_id: string;
  kind: string;
  label: string;
  held: string;
  proposed_deduction: string;
  returning: string;
  tenant: string | null;
}

export interface DepositBalances {
  /** Set when the ledger can't compute cleanly — show it, don't work around it. */
  blocked: string | null;
  deposits: DepositBalance[];
  deductions_agreed: boolean;
  total_held: string;
}

export async function fetchDepositBalances(
  token: string,
  id: string
): Promise<DepositBalances> {
  const res = await fetch(
    `${DJANGO_API_URL}/leases/moveouts/${id}/deposit_balances/`,
    { headers: headers(token) }
  );
  return handle(res);
}

export async function settleDeposit(
  token: string,
  id: string,
  payload: SettleDepositPayload
): Promise<MoveOutRequest> {
  const res = await fetch(
    `${DJANGO_API_URL}/leases/moveouts/${id}/settle_deposit/`,
    {
      method: 'POST',
      headers: headers(token),
      body: JSON.stringify(payload),
    }
  );
  return handle(res);
}

function headers(token: string, json = true): Record<string, string> {
  const h: Record<string, string> = { Authorization: `Token ${token}` };
  if (json) h['Content-Type'] = 'application/json';
  return h;
}

async function handle(res: Response) {
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    const msg =
      body.detail ||
      body.requested_end_date ||
      (typeof body === 'object' && body
        ? Object.values(body).flat().join(' ')
        : '') ||
      `Request failed (${res.status})`;
    const err = new Error(
      typeof msg === 'string' ? msg : `Request failed (${res.status})`
    ) as Error & {
      earliest_end_date?: string;
    };
    if (body.earliest_end_date) err.earliest_end_date = body.earliest_end_date;
    throw err;
  }
  if (res.status === 204) return null;
  return res.json();
}

const unwrap = <T>(d: T[] | { results?: T[] } | null): T[] =>
  Array.isArray(d) ? d : (d?.results ?? []);

export async function fetchMoveOutRules(
  token: string,
  leaseId: string
): Promise<MoveOutRules> {
  const res = await fetch(
    `${DJANGO_API_URL}/leases/${leaseId}/moveout-rules/`,
    {
      headers: headers(token, false),
    }
  );
  return handle(res);
}

export async function listMoveOuts(
  token: string,
  leaseId?: string
): Promise<MoveOutRequest[]> {
  const qs = leaseId ? `?lease=${leaseId}` : '';
  const res = await fetch(`${DJANGO_API_URL}/leases/moveouts/${qs}`, {
    headers: headers(token, false),
  });
  return unwrap<MoveOutRequest>(await handle(res));
}

export interface CreateMoveOutPayload {
  lease: string;
  requested_end_date: string;
  reason?: string;
  /** Tenant: request a mutual agreement (RTB-8) when the date is inside
   *  the notice period. */
  request_mutual?: boolean;
  /** Landlord only. */
  kind?: 'LANDLORD_NOTICE' | 'MUTUAL_AGREEMENT';
  rent_handling?: RentHandling;
}

export async function createMoveOut(
  token: string,
  payload: CreateMoveOutPayload
): Promise<MoveOutRequest> {
  const res = await fetch(`${DJANGO_API_URL}/leases/moveouts/`, {
    method: 'POST',
    headers: headers(token),
    body: JSON.stringify(payload),
  });
  return handle(res);
}

export async function acceptMoveOut(
  token: string,
  id: string,
  opts: { rent_handling?: RentHandling; effective_end_date?: string } = {}
): Promise<MoveOutRequest> {
  const res = await fetch(`${DJANGO_API_URL}/leases/moveouts/${id}/accept/`, {
    method: 'POST',
    headers: headers(token),
    body: JSON.stringify(opts),
  });
  return handle(res);
}

export async function declineMoveOut(
  token: string,
  id: string,
  reason: string
): Promise<MoveOutRequest> {
  const res = await fetch(`${DJANGO_API_URL}/leases/moveouts/${id}/decline/`, {
    method: 'POST',
    headers: headers(token),
    body: JSON.stringify({ reason }),
  });
  return handle(res);
}

export async function cancelMoveOut(
  token: string,
  id: string
): Promise<MoveOutRequest> {
  const res = await fetch(`${DJANGO_API_URL}/leases/moveouts/${id}/cancel/`, {
    method: 'POST',
    headers: headers(token),
    body: JSON.stringify({}),
  });
  return handle(res);
}
