// moveoutApi.ts
// Client for the move-out / end-of-tenancy API. The RULES live on the
// backend (leases/tenancy_rules.py) — this file only fetches and submits.
import { DJANGO_API_URL } from "@/lib/config"

export interface MoveOutRules {
  code: string
  jurisdiction: string
  rta_applies: boolean
  tenant_notice_months: number
  landlord_notice_months: number | null
  mutual_agreement_form: string // "RTB-8" in BC
  summary: string
  today: string
  earliest_tenant_end_date: string
  earliest_landlord_end_date: string
  landlord_shares_common_areas: boolean
}

export type MoveOutKind = "TENANT_NOTICE" | "LANDLORD_NOTICE" | "MUTUAL_AGREEMENT"
export type MoveOutStatus = "PENDING" | "ACCEPTED" | "DECLINED" | "CANCELLED"
export type RentHandling = "NONE" | "VOID_FINAL" | "PRORATE_FINAL"

export interface MoveOutRequest {
  id: string
  lease: string
  lease_number: string
  lease_tenant: string | null
  tenant_name: string | null
  initiated_by: "TENANT" | "LANDLORD"
  kind: MoveOutKind
  kind_display: string
  status: MoveOutStatus
  status_display: string
  requested_end_date: string
  effective_end_date: string | null
  reason: string
  decline_reason: string
  form_type: string
  rent_handling: RentHandling
  rent_handling_display: string
  tenant_signed: boolean
  tenant_signed_at: string | null
  landlord_signed: boolean
  landlord_signed_at: string | null
  rules_snapshot: Partial<MoveOutRules>
  created_at: string
}

function headers(token: string, json = true): Record<string, string> {
  const h: Record<string, string> = { Authorization: `Token ${token}` }
  if (json) h["Content-Type"] = "application/json"
  return h
}

async function handle(res: Response) {
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    const msg =
      body.detail ||
      body.requested_end_date ||
      (typeof body === "object" && body ? Object.values(body).flat().join(" ") : "") ||
      `Request failed (${res.status})`
    const err = new Error(typeof msg === "string" ? msg : `Request failed (${res.status})`) as Error & {
      earliest_end_date?: string
    }
    if (body.earliest_end_date) err.earliest_end_date = body.earliest_end_date
    throw err
  }
  if (res.status === 204) return null
  return res.json()
}

const unwrap = <T,>(d: any): T[] => (Array.isArray(d) ? d : d?.results ?? [])

export async function fetchMoveOutRules(token: string, leaseId: string): Promise<MoveOutRules> {
  const res = await fetch(`${DJANGO_API_URL}/leases/${leaseId}/moveout-rules/`, {
    headers: headers(token, false),
  })
  return handle(res)
}

export async function listMoveOuts(token: string, leaseId?: string): Promise<MoveOutRequest[]> {
  const qs = leaseId ? `?lease=${leaseId}` : ""
  const res = await fetch(`${DJANGO_API_URL}/leases/moveouts/${qs}`, { headers: headers(token, false) })
  return unwrap<MoveOutRequest>(await handle(res))
}

export interface CreateMoveOutPayload {
  lease: string
  requested_end_date: string
  reason?: string
  /** Tenant: request a mutual agreement (RTB-8) when the date is inside
   *  the notice period. */
  request_mutual?: boolean
  /** Landlord only. */
  kind?: "LANDLORD_NOTICE" | "MUTUAL_AGREEMENT"
  rent_handling?: RentHandling
}

export async function createMoveOut(token: string, payload: CreateMoveOutPayload): Promise<MoveOutRequest> {
  const res = await fetch(`${DJANGO_API_URL}/leases/moveouts/`, {
    method: "POST", headers: headers(token), body: JSON.stringify(payload),
  })
  return handle(res)
}

export async function acceptMoveOut(
  token: string, id: string,
  opts: { rent_handling?: RentHandling; effective_end_date?: string } = {},
): Promise<MoveOutRequest> {
  const res = await fetch(`${DJANGO_API_URL}/leases/moveouts/${id}/accept/`, {
    method: "POST", headers: headers(token), body: JSON.stringify(opts),
  })
  return handle(res)
}

export async function declineMoveOut(token: string, id: string, reason: string): Promise<MoveOutRequest> {
  const res = await fetch(`${DJANGO_API_URL}/leases/moveouts/${id}/decline/`, {
    method: "POST", headers: headers(token), body: JSON.stringify({ reason }),
  })
  return handle(res)
}

export async function cancelMoveOut(token: string, id: string): Promise<MoveOutRequest> {
  const res = await fetch(`${DJANGO_API_URL}/leases/moveouts/${id}/cancel/`, {
    method: "POST", headers: headers(token), body: JSON.stringify({}),
  })
  return handle(res)
}