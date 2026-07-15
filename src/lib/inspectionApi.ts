// inspectionApi.ts
// Client for condition inspections (BC RTB-27 flow) — /api/leases/inspections/.
// Same fetch + Token-auth conventions as the rest of src/lib.

import { DJANGO_API_URL } from "@/lib/config"

// ---------------------------------------------------------------- types
export type ConditionCode =
  | "GOOD" | "FAIR" | "POOR" | "MISSING" | "DAMAGED" | "SCRATCHED" | "BROKEN"
export type CleanlinessCode = "DIRTY" | "STAINED"
export type InspectionPass = "MOVE_IN" | "MOVE_OUT"
export type InspectionStatus =
  | "MOVE_IN_IN_PROGRESS" | "MOVE_IN_SIGNED" | "MOVE_OUT_IN_PROGRESS" | "COMPLETED"
export type SuggestionStatus = "NONE" | "PENDING" | "APPROVED" | "DISMISSED"

// Short chip labels matching the paper form's legend.
export const CONDITION_CHIPS: { value: ConditionCode; chip: string; label: string }[] = [
  { value: "GOOD", chip: "✓", label: "Good" },
  { value: "FAIR", chip: "F", label: "Fair" },
  { value: "POOR", chip: "P", label: "Poor" },
  { value: "MISSING", chip: "M", label: "Missing" },
  { value: "DAMAGED", chip: "D", label: "Damaged" },
  { value: "SCRATCHED", chip: "S", label: "Scratched" },
  { value: "BROKEN", chip: "B", label: "Broken" },
]
export const CLEANLINESS_CHIPS: { value: CleanlinessCode; chip: string; label: string }[] = [
  { value: "DIRTY", chip: "DT", label: "Dirty" },
  { value: "STAINED", chip: "ST", label: "Stained" },
]

export interface InspectionItem {
  id: string
  section: string
  label: string
  sort_order: number
  is_custom: boolean
  area: string | null
  area_name: string | null
  inventory_item: number | null
  shared_inventory_item: number | null
  move_in_condition_code: ConditionCode | ""
  move_in_cleanliness_code: CleanlinessCode | ""
  move_in_comment: string
  move_out_condition_code: ConditionCode | ""
  move_out_cleanliness_code: CleanlinessCode | ""
  move_out_comment: string
  needs_attention: boolean
  suggestion_status: SuggestionStatus
  work_order_id: string | null
}

export interface InspectionKeyRow {
  id: string
  key_type: string
  issued_count: number
  returned_count: number | null
  sort_order: number
}

export interface InspectionSummary {
  id: string
  lease: string
  lease_number: string
  lease_tenant: string | null
  tenant_name: string | null
  property_label: string | null
  status: InspectionStatus
  status_display: string
  possession_date: string | null
  move_in_inspection_date: string | null
  move_out_date: string | null
  move_out_inspection_date: string | null
  pending_suggestions: number
  created_at: string
}

export interface InspectionDetail extends InspectionSummary {
  template: string
  tenant_agent_move_in: string
  tenant_agent_move_out: string
  repairs_required_at_start: string
  tenant_responsible_damage: string
  tenant_agrees_move_in: boolean | null
  tenant_disagreement_move_in: string
  tenant_agrees_move_out: boolean | null
  tenant_disagreement_move_out: string
  landlord_signed_move_in_at: string | null
  landlord_move_in_signature_name: string
  tenant_signed_move_in_at: string | null
  tenant_move_in_signature_name: string
  landlord_signed_move_out_at: string | null
  landlord_move_out_signature_name: string
  tenant_signed_move_out_at: string | null
  tenant_move_out_signature_name: string
  deduction_security_deposit: string | null
  deduction_pet_deposit: string | null
  deduction_agreed_at: string | null
  tenant_forwarding_address: string
  move_in_report_delivered_at: string | null
  move_out_report_delivered_at: string | null
  move_in_fully_signed: boolean
  move_out_fully_signed: boolean
  disputed_move_in: boolean
  disputed_move_out: boolean
  items: InspectionItem[]
  key_rows: InspectionKeyRow[]
}

export interface ItemPatch {
  id: string
  move_in_condition_code?: ConditionCode | ""
  move_in_cleanliness_code?: CleanlinessCode | ""
  move_in_comment?: string
  move_out_condition_code?: ConditionCode | ""
  move_out_cleanliness_code?: CleanlinessCode | ""
  move_out_comment?: string
  needs_attention?: boolean
}

export interface KeyRowPatch {
  id?: string | null
  key_type: string
  issued_count: number
  returned_count?: number | null
}

// ---------------------------------------------------------------- helpers
function authHeaders(token: string, json = true): Record<string, string> {
  const h: Record<string, string> = { Authorization: `Token ${token}` }
  if (json) h["Content-Type"] = "application/json"
  return h
}

async function handle(res: Response) {
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    const msg =
      body.detail ||
      body.non_field_errors?.join?.(" ") ||
      (typeof body === "object" && body ? Object.values(body).flat().join(" ") : "") ||
      `Request failed (${res.status})`
    throw new Error(typeof msg === "string" && msg ? msg : `Request failed (${res.status})`)
  }
  if (res.status === 204) return null
  return res.json()
}

function unwrap<T>(data: any): T[] {
  if (Array.isArray(data)) return data
  if (data && Array.isArray(data.results)) return data.results
  return []
}

const I = `${DJANGO_API_URL}/leases/inspections`

// ------------------------------------------------------------------ calls
export async function fetchInspections(
  token: string,
  opts: { lease?: string; status?: InspectionStatus } = {},
): Promise<InspectionSummary[]> {
  const params = new URLSearchParams()
  if (opts.lease) params.set("lease", opts.lease)
  if (opts.status) params.set("status", opts.status)
  const res = await fetch(`${I}/?${params}`, { headers: authHeaders(token, false) })
  return unwrap<InspectionSummary>(await handle(res))
}

export async function fetchInspection(token: string, id: string): Promise<InspectionDetail> {
  const res = await fetch(`${I}/${id}/`, { headers: authHeaders(token, false) })
  return handle(res)
}

export async function createInspection(
  token: string,
  payload: { lease: string; lease_tenant?: string | null },
): Promise<InspectionDetail> {
  const res = await fetch(`${I}/`, {
    method: "POST", headers: authHeaders(token), body: JSON.stringify(payload),
  })
  return handle(res)
}

/** Header boxes only (dates, agents, Box X/Z text, forwarding address). */
export async function patchInspection(
  token: string, id: string, changes: Record<string, unknown>,
): Promise<InspectionDetail> {
  const res = await fetch(`${I}/${id}/`, {
    method: "PATCH", headers: authHeaders(token), body: JSON.stringify(changes),
  })
  return handle(res)
}

export async function saveItems(
  token: string, id: string, rows: ItemPatch[],
): Promise<InspectionItem[]> {
  const res = await fetch(`${I}/${id}/items_bulk/`, {
    method: "POST", headers: authHeaders(token), body: JSON.stringify(rows),
  })
  return unwrap<InspectionItem>(await handle(res))
}

export async function addCustomItem(
  token: string, id: string, payload: { section: string; label: string },
): Promise<InspectionItem> {
  const res = await fetch(`${I}/${id}/add_item/`, {
    method: "POST", headers: authHeaders(token), body: JSON.stringify(payload),
  })
  return handle(res)
}

export async function saveKeys(
  token: string, id: string, rows: KeyRowPatch[],
): Promise<InspectionKeyRow[]> {
  const res = await fetch(`${I}/${id}/keys_bulk/`, {
    method: "POST", headers: authHeaders(token), body: JSON.stringify(rows),
  })
  return unwrap<InspectionKeyRow>(await handle(res))
}

export async function landlordSign(
  token: string, id: string, payload: { inspection_pass: InspectionPass; name: string },
): Promise<InspectionDetail> {
  const res = await fetch(`${I}/${id}/landlord_sign/`, {
    method: "POST", headers: authHeaders(token), body: JSON.stringify(payload),
  })
  return handle(res)
}

export async function tenantSign(
  token: string, id: string,
  payload: { inspection_pass: InspectionPass; name: string; agrees: boolean; reason?: string },
): Promise<InspectionDetail> {
  const res = await fetch(`${I}/${id}/tenant_sign/`, {
    method: "POST", headers: authHeaders(token), body: JSON.stringify(payload),
  })
  return handle(res)
}

export async function startMoveOut(
  token: string, id: string, moveOutDate?: string,
): Promise<InspectionDetail> {
  const res = await fetch(`${I}/${id}/start_move_out/`, {
    method: "POST", headers: authHeaders(token),
    body: JSON.stringify(moveOutDate ? { move_out_date: moveOutDate } : {}),
  })
  return handle(res)
}

export async function markDelivered(
  token: string, id: string, pass_: InspectionPass,
): Promise<InspectionDetail> {
  const res = await fetch(`${I}/${id}/mark_delivered/`, {
    method: "POST", headers: authHeaders(token),
    body: JSON.stringify({ inspection_pass: pass_ }),
  })
  return handle(res)
}

export async function fetchSuggestions(
  token: string, status: SuggestionStatus = "PENDING",
): Promise<InspectionItem[]> {
  const res = await fetch(`${I}/suggestions/?status=${status}`, {
    headers: authHeaders(token, false),
  })
  return unwrap<InspectionItem>(await handle(res))
}

export async function approveSuggestion(
  token: string, inspectionId: string, itemId: string,
): Promise<{ item: InspectionItem; work_order_id: string }> {
  const res = await fetch(`${I}/${inspectionId}/items/${itemId}/approve_suggestion/`, {
    method: "POST", headers: authHeaders(token),
  })
  return handle(res)
}

export async function dismissSuggestion(
  token: string, inspectionId: string, itemId: string,
): Promise<InspectionItem> {
  const res = await fetch(`${I}/${inspectionId}/items/${itemId}/dismiss_suggestion/`, {
    method: "POST", headers: authHeaders(token),
  })
  return handle(res)
}