// inspectionApi.ts
// Client for condition inspections (BC RTB-27 flow) — /api/leases/inspections/.
// Same fetch + Token-auth conventions as the rest of src/lib.

import { DJANGO_API_URL } from '@/lib/config';

// ---------------------------------------------------------------- types
export type ConditionCode =
  'GOOD' | 'FAIR' | 'POOR' | 'MISSING' | 'DAMAGED' | 'SCRATCHED' | 'BROKEN';
export type CleanlinessCode = 'DIRTY' | 'STAINED';
export type InspectionPass = 'MOVE_IN' | 'MOVE_OUT';
export type InspectionStatus =
  | 'MOVE_IN_IN_PROGRESS'
  | 'MOVE_IN_SIGNED'
  | 'MOVE_OUT_IN_PROGRESS'
  | 'COMPLETED';
export type SuggestionStatus = 'NONE' | 'PENDING' | 'APPROVED' | 'DISMISSED';

// Short chip labels matching the paper form's legend.
export const CONDITION_CHIPS: {
  value: ConditionCode;
  chip: string;
  label: string;
}[] = [
  { value: 'GOOD', chip: '✓', label: 'Good' },
  { value: 'FAIR', chip: 'F', label: 'Fair' },
  { value: 'POOR', chip: 'P', label: 'Poor' },
  { value: 'MISSING', chip: 'M', label: 'Missing' },
  { value: 'DAMAGED', chip: 'D', label: 'Damaged' },
  { value: 'SCRATCHED', chip: 'S', label: 'Scratched' },
  { value: 'BROKEN', chip: 'B', label: 'Broken' },
];
export const CLEANLINESS_CHIPS: {
  value: CleanlinessCode;
  chip: string;
  label: string;
}[] = [
  { value: 'DIRTY', chip: 'DT', label: 'Dirty' },
  { value: 'STAINED', chip: 'ST', label: 'Stained' },
];

export interface InspectionItem {
  id: string;
  section: string;
  label: string;
  sort_order: number;
  is_custom: boolean;
  area: string | null;
  area_name: string | null;
  inventory_item: number | null;
  shared_inventory_item: number | null;
  move_in_condition_code: ConditionCode | '';
  move_in_cleanliness_code: CleanlinessCode | '';
  move_in_comment: string;
  move_out_condition_code: ConditionCode | '';
  move_out_cleanliness_code: CleanlinessCode | '';
  move_out_comment: string;
  needs_attention: boolean;
  suggestion_status: SuggestionStatus;
  work_order_id: string | null;
}

export interface InspectionKeyRow {
  id: string;
  key_type: string;
  issued_count: number;
  returned_count: number | null;
  sort_order: number;
}

export interface InspectionSummary {
  id: string;
  lease: string;
  lease_number: string;
  lease_tenant: string | null;
  tenant_name: string | null;
  property_label: string | null;
  status: InspectionStatus;
  status_display: string;
  possession_date: string | null;
  move_in_inspection_date: string | null;
  move_out_date: string | null;
  move_out_inspection_date: string | null;
  pending_suggestions: number;
  created_at: string;
}

export interface InspectionDetail extends InspectionSummary {
  template: string;
  tenant_agent_move_in: string;
  tenant_agent_move_out: string;
  repairs_required_at_start: string;
  tenant_responsible_damage: string;
  tenant_agrees_move_in: boolean | null;
  tenant_disagreement_move_in: string;
  tenant_agrees_move_out: boolean | null;
  tenant_disagreement_move_out: string;
  landlord_signed_move_in_at: string | null;
  landlord_move_in_signature_name: string;
  tenant_signed_move_in_at: string | null;
  tenant_move_in_signature_name: string;
  landlord_signed_move_out_at: string | null;
  landlord_move_out_signature_name: string;
  tenant_signed_move_out_at: string | null;
  tenant_move_out_signature_name: string;
  deduction_security_deposit: string | null;
  deduction_pet_deposit: string | null;
  deduction_cleaning_deposit: string | null;
  /** Set once the tenant agreed IN WRITING — until then nothing is kept. */
  deduction_agreed_at: string | null;
  deposit_deductions: DepositDeduction[];
  /** Live sum of the lines, per deposit. Compare with the deduction_* fields
   *  above to see whether the signed agreement still covers the claim. */
  deduction_totals: Record<DepositKind, string>;
  tenant_forwarding_address: string;
  move_in_report_delivered_at: string | null;
  move_out_report_delivered_at: string | null;
  move_in_fully_signed: boolean;
  move_out_fully_signed: boolean;
  disputed_move_in: boolean;
  disputed_move_out: boolean;
  items: InspectionItem[];
  key_rows: InspectionKeyRow[];
}

/** Which deposit a deduction comes out of. They are held and returned
 *  separately, so this is never inferred. */
export type DepositKind = 'SECURITY' | 'PET' | 'CLEANING';

export type DeductionBasis =
  'LABOUR' | 'SUPPLIES' | 'CLEANER' | 'GARBAGE' | 'OTHER';

export const DEDUCTION_BASES: { value: DeductionBasis; label: string }[] = [
  { value: 'LABOUR', label: 'Own labour (hours × rate)' },
  { value: 'SUPPLIES', label: 'Cleaning supplies / materials' },
  { value: 'CLEANER', label: 'Professional cleaners' },
  { value: 'GARBAGE', label: 'Garbage removal / dumping fees' },
  { value: 'OTHER', label: 'Other' },
];

export const DEPOSIT_KINDS: { value: DepositKind; label: string }[] = [
  { value: 'SECURITY', label: 'Security deposit' },
  { value: 'PET', label: 'Pet damage deposit' },
  { value: 'CLEANING', label: 'Cleaning deposit' },
];

/** One costed line of what the landlord proposes to keep, and why. */
export interface DepositDeduction {
  id: string;
  inspection: string;
  inspection_item: string | null;
  item_label: string | null;
  work_order: string | null;
  deposit_kind: DepositKind;
  deposit_kind_display: string;
  basis: DeductionBasis;
  basis_display: string;
  hours: string | null;
  hourly_rate: string | null;
  /** Server-computed for LABOUR (hours × rate); entered for everything else. */
  amount: string | null;
  note: string;
  created_at: string;
  updated_at: string;
}

export interface DeductionPayload {
  deposit_kind: DepositKind;
  basis: DeductionBasis;
  hours?: string | null;
  hourly_rate?: string | null;
  amount?: string | null;
  note?: string;
  inspection_item?: string | null;
}

export interface ItemPatch {
  id: string;
  move_in_condition_code?: ConditionCode | '';
  move_in_cleanliness_code?: CleanlinessCode | '';
  move_in_comment?: string;
  move_out_condition_code?: ConditionCode | '';
  move_out_cleanliness_code?: CleanlinessCode | '';
  move_out_comment?: string;
  needs_attention?: boolean;
}

export interface KeyRowPatch {
  id?: string | null;
  key_type: string;
  issued_count: number;
  returned_count?: number | null;
}

// ---------------------------------------------------------------- helpers
function authHeaders(token: string, json = true): Record<string, string> {
  const h: Record<string, string> = { Authorization: `Token ${token}` };
  if (json) h['Content-Type'] = 'application/json';
  return h;
}

async function handle(res: Response) {
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    const msg =
      body.detail ||
      body.non_field_errors?.join?.(' ') ||
      (typeof body === 'object' && body
        ? Object.values(body).flat().join(' ')
        : '') ||
      `Request failed (${res.status})`;
    throw new Error(
      typeof msg === 'string' && msg ? msg : `Request failed (${res.status})`
    );
  }
  if (res.status === 204) return null;
  return res.json();
}

function unwrap<T>(data: T[] | { results?: T[] } | null): T[] {
  if (Array.isArray(data)) return data;
  if (data && !Array.isArray(data) && Array.isArray(data.results))
    return data.results;
  return [];
}

const I = `${DJANGO_API_URL}/leases/inspections`;

// ------------------------------------------------------------------ calls
export async function fetchInspections(
  token: string,
  opts: { lease?: string; status?: InspectionStatus } = {}
): Promise<InspectionSummary[]> {
  const params = new URLSearchParams();
  if (opts.lease) params.set('lease', opts.lease);
  if (opts.status) params.set('status', opts.status);
  const res = await fetch(`${I}/?${params}`, {
    headers: authHeaders(token, false),
  });
  return unwrap<InspectionSummary>(await handle(res));
}

export async function fetchInspection(
  token: string,
  id: string
): Promise<InspectionDetail> {
  const res = await fetch(`${I}/${id}/`, {
    headers: authHeaders(token, false),
  });
  return handle(res);
}

export async function createInspection(
  token: string,
  payload: { lease: string; lease_tenant?: string | null }
): Promise<InspectionDetail> {
  const res = await fetch(`${I}/`, {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify(payload),
  });
  return handle(res);
}

/** Header boxes only (dates, agents, Box X/Z text, forwarding address). */
export async function patchInspection(
  token: string,
  id: string,
  changes: Record<string, unknown>
): Promise<InspectionDetail> {
  const res = await fetch(`${I}/${id}/`, {
    method: 'PATCH',
    headers: authHeaders(token),
    body: JSON.stringify(changes),
  });
  return handle(res);
}

export async function saveItems(
  token: string,
  id: string,
  rows: ItemPatch[]
): Promise<InspectionItem[]> {
  const res = await fetch(`${I}/${id}/items_bulk/`, {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify(rows),
  });
  return unwrap<InspectionItem>(await handle(res));
}

export async function addCustomItem(
  token: string,
  id: string,
  payload: { section: string; label: string }
): Promise<InspectionItem> {
  const res = await fetch(`${I}/${id}/add_item/`, {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify(payload),
  });
  return handle(res);
}

export async function saveKeys(
  token: string,
  id: string,
  rows: KeyRowPatch[]
): Promise<InspectionKeyRow[]> {
  const res = await fetch(`${I}/${id}/keys_bulk/`, {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify(rows),
  });
  return unwrap<InspectionKeyRow>(await handle(res));
}

export async function landlordSign(
  token: string,
  id: string,
  payload: { inspection_pass: InspectionPass; name: string }
): Promise<InspectionDetail> {
  const res = await fetch(`${I}/${id}/landlord_sign/`, {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify(payload),
  });
  return handle(res);
}

export async function tenantSign(
  token: string,
  id: string,
  payload: {
    inspection_pass: InspectionPass;
    name: string;
    agrees: boolean;
    reason?: string;
  }
): Promise<InspectionDetail> {
  const res = await fetch(`${I}/${id}/tenant_sign/`, {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify(payload),
  });
  return handle(res);
}

export async function startMoveOut(
  token: string,
  id: string,
  moveOutDate?: string
): Promise<InspectionDetail> {
  const res = await fetch(`${I}/${id}/start_move_out/`, {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify(moveOutDate ? { move_out_date: moveOutDate } : {}),
  });
  return handle(res);
}

export async function markDelivered(
  token: string,
  id: string,
  pass_: InspectionPass
): Promise<InspectionDetail> {
  const res = await fetch(`${I}/${id}/mark_delivered/`, {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify({ inspection_pass: pass_ }),
  });
  return handle(res);
}

export async function fetchSuggestions(
  token: string,
  status: SuggestionStatus = 'PENDING'
): Promise<InspectionItem[]> {
  const res = await fetch(`${I}/suggestions/?status=${status}`, {
    headers: authHeaders(token, false),
  });
  return unwrap<InspectionItem>(await handle(res));
}

export async function approveSuggestion(
  token: string,
  inspectionId: string,
  itemId: string
): Promise<{ item: InspectionItem; work_order_id: string }> {
  const res = await fetch(
    `${I}/${inspectionId}/items/${itemId}/approve_suggestion/`,
    {
      method: 'POST',
      headers: authHeaders(token),
    }
  );
  return handle(res);
}

export async function dismissSuggestion(
  token: string,
  inspectionId: string,
  itemId: string
): Promise<InspectionItem> {
  const res = await fetch(
    `${I}/${inspectionId}/items/${itemId}/dismiss_suggestion/`,
    {
      method: 'POST',
      headers: authHeaders(token),
    }
  );
  return handle(res);
}

// ------------------------------------------------------- deposit deductions
//
// Adding lines KEEPS NOTHING. Under the BC RTA a landlord may hold back
// deposit money only with the tenant's written agreement (agreeDeductions
// below) or an RTB order. Lines freeze once agreed — the RTB's answer to a
// correction is an addendum, never a silent edit.
export async function fetchDeductions(
  token: string,
  inspectionId: string
): Promise<DepositDeduction[]> {
  const res = await fetch(`${I}/${inspectionId}/deductions/`, {
    headers: authHeaders(token),
  });
  return unwrap(await handle(res));
}

export async function addDeduction(
  token: string,
  inspectionId: string,
  payload: DeductionPayload
): Promise<DepositDeduction> {
  const res = await fetch(`${I}/${inspectionId}/deductions/`, {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify(payload),
  });
  return handle(res);
}

export async function updateDeduction(
  token: string,
  inspectionId: string,
  lineId: string,
  payload: Partial<DeductionPayload>
): Promise<DepositDeduction> {
  const res = await fetch(`${I}/${inspectionId}/deductions/${lineId}/`, {
    method: 'PATCH',
    headers: authHeaders(token),
    body: JSON.stringify(payload),
  });
  return handle(res);
}

export async function deleteDeduction(
  token: string,
  inspectionId: string,
  lineId: string
): Promise<void> {
  const res = await fetch(`${I}/${inspectionId}/deductions/${lineId}/`, {
    method: 'DELETE',
    headers: authHeaders(token, false),
  });
  await handle(res);
}

/** Record the tenant's written agreement to these deductions. This is the
 *  consent that lets any deposit money be kept at all. */
export async function agreeDeductions(
  token: string,
  inspectionId: string,
  signedOn?: string
): Promise<InspectionDetail> {
  const res = await fetch(`${I}/${inspectionId}/agree_deductions/`, {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify(signedOn ? { signed_on: signedOn } : {}),
  });
  return handle(res);
}
