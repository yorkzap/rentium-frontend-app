// financeApi.ts
// Client for the append-only ledger API (single source of financial truth).
// Mirrors the app's existing fetch + Token-auth conventions (see leaseApi.ts).

import { DJANGO_API_URL } from '@/lib/config';

// ---------------------------------------------------------------- types
export type EntryType =
  | 'RENT_CHARGE'
  | 'UTILITY_CHARGE'
  | 'DEPOSIT_CHARGE'
  | 'FEE_CHARGE'
  | 'OTHER_CHARGE'
  | 'PAYMENT'
  | 'CREDIT'
  | 'EXPENSE'
  | 'DEPOSIT_RETURN'
  | 'REVERSAL';

export type ChargeStatus =
  | 'VOIDED'
  | 'PAID'
  | 'PARTIALLY_PAID'
  | 'OVERDUE'
  | 'DUE'
  | 'SCHEDULED';

export type PaymentMethod = 'ETRANSFER' | 'CASH' | 'CHEQUE' | 'OTHER';

export type ExpenseCategory =
  | 'MAINTENANCE'
  | 'UTILITIES'
  | 'INSURANCE'
  | 'PROPERTY_TAX'
  | 'MORTGAGE'
  | 'STRATA'
  | 'MANAGEMENT'
  | 'SUPPLIES'
  | 'ADVERTISING'
  | 'OTHER';

/** Expenses only. Anything else reports "". */
export type BankStatus = 'PAID' | 'NOT_YET_TAKEN' | '';

export const CHARGE_TYPES: EntryType[] = [
  'RENT_CHARGE',
  'UTILITY_CHARGE',
  'DEPOSIT_CHARGE',
  'FEE_CHARGE',
  'OTHER_CHARGE',
];

export const PAYMENT_METHODS: { value: PaymentMethod; label: string }[] = [
  { value: 'ETRANSFER', label: 'e-Transfer' },
  { value: 'CASH', label: 'Cash' },
  { value: 'CHEQUE', label: 'Cheque' },
  { value: 'OTHER', label: 'Other' },
];

export const EXPENSE_CATEGORIES: { value: ExpenseCategory; label: string }[] = [
  { value: 'MAINTENANCE', label: 'Maintenance / Repairs' },
  { value: 'UTILITIES', label: 'Utilities (landlord-paid)' },
  { value: 'INSURANCE', label: 'Insurance' },
  { value: 'PROPERTY_TAX', label: 'Property Tax' },
  { value: 'MORTGAGE', label: 'Mortgage / Financing' },
  { value: 'STRATA', label: 'Strata / HOA Fees' },
  { value: 'MANAGEMENT', label: 'Management / Professional Fees' },
  { value: 'SUPPLIES', label: 'Supplies / Furnishings' },
  { value: 'ADVERTISING', label: 'Advertising / Listing' },
  { value: 'OTHER', label: 'Other' },
];

export interface LedgerAttachment {
  id: number;
  file: string;
  label: string;
  created_at: string;
}

export interface LedgerEntry {
  id: string;
  entry_type: EntryType;
  entry_type_display: string;
  amount: string;
  due_date: string | null;
  effective_date: string;
  description: string;

  property: number | null;
  property_name: string | null;
  /** "ROOM" | "COMPLETE_UNIT" — what kind of space this charge is for. */
  property_category: string | null;

  lease: string | null;
  /** Human-readable lease number (e.g. RMT298895-5FCA) for display/links. */
  lease_number: string | null;

  tenant: number | null;
  tenant_name: string | null;
  /** Household charge on a joint (roommate) lease — everyone owes it
   *  together and any tenant's payment settles it. */
  is_joint: boolean;

  settles: string | null;
  reverses: string | null;
  work_order: string | null;

  payment_method: string;
  reference_number: string;
  category: string;
  category_display: string | null;
  vendor: string;

  /** EXPENSES ONLY. null = recorded, but the money hasn't actually left the
   *  bank yet. This is the one field on a ledger entry that can change after
   *  it's posted — see LedgerEntry.save() on the backend for why that isn't a
   *  violation of the append-only rule. */
  paid_on: string | null;
  /** Derived from paid_on, so the UI never reimplements the null-check. */
  bank_status: BankStatus;

  settled_amount: string | null;
  outstanding: string | null;
  charge_status: ChargeStatus | null;
  voided: boolean;

  metadata: Record<string, unknown>;
  attachments: LedgerAttachment[];
  created_at: string;
}

export interface MonthlyRow {
  month: string;
  label: string;
  expected_income: string;
  collected_income: string;
  expenses: string;
  net: string;
  /**
   * Deposit payments received this month. Deposits stay excluded from
   * income (they're a refundable liability) — this exists so the UI can
   * say what actually hit the bank. Optional until the backend ships it
   * (docs/phase-b-spec.md, B1); absent means "not reported", treated as 0.
   */
  deposits_collected?: string;
}

export interface LedgerSummary {
  monthly: MonthlyRow[];
  outstanding_total: string;
  outstanding_count: number;
  overdue_count: number;
  deposits_held: string;
  /** Expenses you've recorded but that haven't cleared your bank yet. */
  expenses_not_yet_paid: string;
  expenses_not_yet_paid_count: number;
  /** Income + deposit payments received in the current month (B1). */
  collected_this_month_total?: string;
  /** Earliest unpaid charge with a future due date, if any (B1). */
  next_charge?: {
    due_date: string;
    amount: string;
    entry_type: string;
    lease_id: number;
    property_name: string;
  } | null;
}

export interface PropertyLite {
  id: number;
  name: string;
  address?: string;
  city?: string;
}

// Mirrors LeaseListSerializer — GET /leases/ has always returned these extra
// fields; the type previously just didn't declare them, which is why the lease
// dropdown label couldn't show dates or the tenant's name.
export interface LeaseLite {
  id: string;
  lease_number: string;
  status: string;
  status_display?: string;
  property_name?: string | null;
  group_name?: string | null;
  start_date?: string;
  end_date?: string | null;
  is_month_to_month?: boolean;
  primary_tenant_name?: string | null;
  tenant_count?: number;
  total_rent?: string | number;
}

/**
 * Human-friendly label for a lease in dropdowns/selectors, e.g.
 *   "McKenzie Room A · Raja S. · Jan 1, 2026 – Month-to-month"
 *   "12 Oak St · Jane D. · Sep 1, 2025 – Aug 31, 2026"
 * Falls back gracefully when fields are missing (old cached payloads).
 */
export function leaseLabel(l: LeaseLite): string {
  const place = l.property_name || l.group_name || l.lease_number;
  const parts: string[] = [place];
  if (l.primary_tenant_name) parts.push(l.primary_tenant_name);

  const fmt = (iso: string) => {
    const d = new Date(`${iso}T00:00:00`);
    return isNaN(d.getTime())
      ? iso
      : d.toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        });
  };

  if (l.start_date) {
    const end = l.is_month_to_month
      ? 'Month-to-month'
      : l.end_date
        ? fmt(l.end_date)
        : 'Ongoing';
    parts.push(`${fmt(l.start_date)} – ${end}`);
  }
  return parts.join(' · ');
}

export interface LeaseTenantLite {
  id: string;
  tenant: number | null;
  tenant_name: string | null;
  tenant_email: string | null;
  /** Full legal name the landlord entered on the invite (pre-registration). */
  invited_name?: string;
  invited_email?: string;
  has_signed?: boolean;
  declined?: boolean;
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

// DRF endpoints may or may not paginate; normalise to a plain array.
function unwrap<T>(data: unknown): T[] {
  if (Array.isArray(data)) return data;
  if (
    data &&
    typeof data === 'object' &&
    Array.isArray((data as { results?: unknown }).results)
  ) {
    return (data as { results: T[] }).results;
  }
  return [];
}

export function newIdempotencyKey(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto)
    return crypto.randomUUID();
  return `k-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

const LEDGER = `${DJANGO_API_URL}/ledger`;

// ---------------------------------------------------------------- reads
export async function fetchSummary(
  token: string,
  opts: { months?: number; property?: number | string } = {}
): Promise<LedgerSummary> {
  const params = new URLSearchParams();
  params.set('months', String(opts.months ?? 6));
  if (opts.property) params.set('property', String(opts.property));
  const res = await fetch(`${LEDGER}/summary/?${params}`, {
    headers: authHeaders(token, false),
  });
  return handle(res);
}

export interface EntryFilters {
  property?: number | string;
  lease?: string;
  tenant?: number | string;
  entry_type?: EntryType;
  entry_type__in?: EntryType[];
  category?: ExpenseCategory;
  /** true -> only expenses that haven't cleared the bank yet. */
  unpaid_only?: boolean;
  search?: string;
  ordering?: string;
}

export async function fetchEntries(
  token: string,
  filters: EntryFilters = {}
): Promise<LedgerEntry[]> {
  const params = new URLSearchParams();
  if (filters.property) params.set('property', String(filters.property));
  if (filters.lease) params.set('lease', filters.lease);
  if (filters.tenant) params.set('tenant', String(filters.tenant));
  if (filters.entry_type) params.set('entry_type', filters.entry_type);
  if (filters.entry_type__in)
    params.set('entry_type__in', filters.entry_type__in.join(','));
  if (filters.category) params.set('category', filters.category);
  if (filters.unpaid_only) params.set('paid_on__isnull', 'true');
  if (filters.search) params.set('search', filters.search);
  if (filters.ordering) params.set('ordering', filters.ordering);

  const res = await fetch(`${LEDGER}/entries/?${params}`, {
    headers: authHeaders(token, false),
  });
  return unwrap<LedgerEntry>(await handle(res));
}

export async function fetchCharges(
  token: string,
  opts: {
    property?: number | string;
    status?: ChargeStatus;
    search?: string;
  } = {}
): Promise<LedgerEntry[]> {
  const params = new URLSearchParams();
  if (opts.property) params.set('property', String(opts.property));
  if (opts.status) params.set('status', opts.status);
  if (opts.search) params.set('search', opts.search);

  const res = await fetch(`${LEDGER}/entries/charges/?${params}`, {
    headers: authHeaders(token, false),
  });
  return unwrap<LedgerEntry>(await handle(res));
}

export function fetchExpenses(
  token: string,
  opts: {
    property?: number | string;
    search?: string;
    unpaid_only?: boolean;
  } = {}
): Promise<LedgerEntry[]> {
  return fetchEntries(token, {
    entry_type: 'EXPENSE',
    ...opts,
    ordering: '-effective_date',
  });
}

/**
 * Download the printable PDF receipt for a PAYMENT entry. Works for the
 * landlord and for any tenant on the payment's lease (roommates share the
 * household ledger). Triggers a browser download.
 */
export async function downloadReceipt(
  token: string,
  paymentId: string
): Promise<void> {
  const res = await fetch(`${LEDGER}/entries/${paymentId}/receipt/`, {
    headers: authHeaders(token, false),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.detail || `Failed to fetch receipt (${res.status})`);
  }
  const blob = await res.blob();
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `receipt_${paymentId.slice(0, 8)}.pdf`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
}

// ---------------------------------------------------------------- writes
export interface RecordPaymentPayload {
  amount: string | number;
  payment_method: PaymentMethod;
  payment_date?: string;
  reference_number?: string;
  notes?: string;
  idempotency_key: string;
  /** Who the money came from (TenantProfile id). Matters on joint household
   *  charges where any roommate can pay; optional elsewhere. */
  tenant?: number | string;
}

export async function recordPayment(
  token: string,
  chargeId: string,
  payload: RecordPaymentPayload
): Promise<LedgerEntry> {
  const res = await fetch(`${LEDGER}/entries/${chargeId}/record_payment/`, {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify(payload),
  });
  return handle(res);
}

export async function postCredit(
  token: string,
  chargeId: string,
  payload: { amount: string | number; reason: string; idempotency_key?: string }
): Promise<LedgerEntry> {
  const res = await fetch(`${LEDGER}/entries/${chargeId}/credit/`, {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify(payload),
  });
  return handle(res);
}

export async function voidEntry(
  token: string,
  id: string,
  reason: string
): Promise<LedgerEntry> {
  const res = await fetch(`${LEDGER}/entries/${id}/void/`, {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify({ reason }),
  });
  return handle(res);
}

export interface CorrectPayload {
  amount?: string | number;
  description?: string;
  due_date?: string;
  effective_date?: string;
  category?: ExpenseCategory;
  vendor?: string;
  reference_number?: string;
  reason?: string;
}

export async function correctEntry(
  token: string,
  id: string,
  changes: CorrectPayload
): Promise<LedgerEntry> {
  const res = await fetch(`${LEDGER}/entries/${id}/correct/`, {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify(changes),
  });
  return handle(res);
}

/**
 * "The money has now actually left my account."
 *
 * EXPENSES ONLY. Pass a date to record when it cleared; pass null to put it back
 * to "not yet taken from bank" (a mis-click is a mis-click, not a void).
 *
 * This is the ONE call in the whole finance client that updates a ledger row
 * rather than posting a new one. It's allowed because it isn't changing what
 * happened — the amount, the payee and the date incurred stay frozen — it's
 * answering a question that had no answer at the moment the entry was written.
 * The backend enforces the whitelist; this can't be widened from here.
 */
export async function markExpensePaid(
  token: string,
  id: string,
  paidOn: string | null
): Promise<LedgerEntry> {
  const res = await fetch(`${LEDGER}/entries/${id}/mark_paid/`, {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify({ paid_on: paidOn }),
  });
  return handle(res);
}

export interface ExpensePayload {
  amount: string | number;
  category: ExpenseCategory;
  description: string;
  /** When the cost was incurred — the work was done, the bill was issued. */
  incurred_date?: string;
  /** When the money left the bank. A DIFFERENT date. Omit if it hasn't yet. */
  paid_on?: string | null;
  property?: number | string;
  vendor?: string;
  idempotency_key?: string;
}

export async function postExpense(
  token: string,
  payload: ExpensePayload
): Promise<LedgerEntry> {
  const res = await fetch(`${LEDGER}/entries/expense/`, {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify(payload),
  });
  return handle(res);
}

export interface ChargePayload {
  lease: string;
  /** Omit on joint (roommate) leases to post a household charge everyone owes
   *  together; required on split leases. */
  tenant?: number | string;
  amount: string | number;
  due_date: string;
  description: string;
  entry_type?: EntryType;
  idempotency_key?: string;
}

export async function postCharge(
  token: string,
  payload: ChargePayload
): Promise<LedgerEntry> {
  const res = await fetch(`${LEDGER}/entries/charge/`, {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify(payload),
  });
  return handle(res);
}

export interface UtilityBillPayload {
  lease: string;
  total_amount: string | number;
  period_start: string;
  period_end: string;
  description: string;
  /** Key of a configured lease bill (e.g. "electricity"). When set, the tenants
   *  are charged only their share per the lease's tenant_responsibility config
   *  (included -> $0, percentage, fixed, full). Omit for a one-off billed in full. */
  bill_key?: string;
  due_date?: string;
  record_landlord_expense?: boolean;
  vendor?: string;
}

export async function splitUtilityBill(
  token: string,
  payload: UtilityBillPayload
): Promise<LedgerEntry[]> {
  const res = await fetch(`${LEDGER}/utility-bills/`, {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify(payload),
  });
  return unwrap<LedgerEntry>(await handle(res));
}

export async function addAttachment(
  token: string,
  id: string,
  file: File,
  label = ''
): Promise<LedgerAttachment> {
  const form = new FormData();
  form.append('file', file);
  if (label) form.append('label', label);
  const res = await fetch(`${LEDGER}/entries/${id}/add_attachment/`, {
    method: 'POST',
    headers: authHeaders(token, false),
    body: form,
  });
  return handle(res);
}

// -------------------------------------------------- supporting lookups
export async function fetchProperties(token: string): Promise<PropertyLite[]> {
  const res = await fetch(`${DJANGO_API_URL}/properties/`, {
    headers: authHeaders(token, false),
  });
  return unwrap<PropertyLite>(await handle(res));
}

export async function fetchLeasesLite(token: string): Promise<LeaseLite[]> {
  const res = await fetch(`${DJANGO_API_URL}/leases/`, {
    headers: authHeaders(token, false),
  });
  return unwrap<LeaseLite>(await handle(res));
}

export async function fetchLeaseTenants(
  token: string,
  leaseId: string
): Promise<LeaseTenantLite[]> {
  const res = await fetch(`${DJANGO_API_URL}/leases/${leaseId}/`, {
    headers: authHeaders(token, false),
  });
  const data = await handle(res);
  return (data?.lease_tenants || []) as LeaseTenantLite[];
}

// Minimal lease-detail view for the utility-bill sheet: which bills the lease has
// configured (and how responsibility is set up) without pulling a second full type
// into every component.
export interface LeaseBillConfig {
  included: boolean;
  provider?: string;
  category?: string;
  tenant_responsibility?: {
    type: 'none' | 'percentage' | 'fixed' | 'full';
    value?: number;
    distribution?: string;
  };
  notes?: string;
}

export interface LeaseBillingInfo {
  id: string;
  lease_number: string;
  bills_included: Record<string, LeaseBillConfig>;
  lease_tenants: LeaseTenantLite[];
}

export async function fetchLeaseBillingInfo(
  token: string,
  leaseId: string
): Promise<LeaseBillingInfo> {
  const res = await fetch(`${DJANGO_API_URL}/leases/${leaseId}/`, {
    headers: authHeaders(token, false),
  });
  const data = await handle(res);
  return {
    id: data.id,
    lease_number: data.lease_number,
    bills_included: data.bills_included || {},
    lease_tenants: data.lease_tenants || [],
  };
}
