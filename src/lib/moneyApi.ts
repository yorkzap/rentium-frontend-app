import { DJANGO_API_URL } from '@/lib/config';

export const FINANCE_CHANGED = 'rentium:finance-changed';
export function financeChanged() {
  window.dispatchEvent(new Event(FINANCE_CHANGED));
}
export const currency = (value: string | number) =>
  new Intl.NumberFormat('en-CA', { style: 'currency', currency: 'CAD' }).format(
    Number(value)
  );
export interface MoneyEntry {
  id: string;
  description: string;
  amount: string;
  entry_type: string;
  category: string;
  effective_date: string;
  paid_on: string | null;
  due_date: string | null;
  property: string | null;
  holding: string | null;
  scope_name: string;
  outstanding: string | null;
  link: string;
}
export interface MoneyOverview {
  start: string;
  end_exclusive: string;
  as_of: string;
  period: {
    expected_income: string;
    collected_income: string;
    expenses: string;
    expenses_cleared: string;
    mortgage_cleared: string;
    deposits_collected: string;
    deposits_returned: string;
    recorded_cash_in: string;
    recorded_cash_out: string;
    recorded_cash_movement: string;
    basis: string;
  };
  rent_overdue: string;
  deposits_held: string;
  unpaid_bills: string;
  coverage: {
    status: string;
    message: string;
    unresolved_bank_rows_portfolio: number;
  };
  rent: MoneyEntry[];
  overdue: MoneyEntry[];
  bills: MoneyEntry[];
  cash: MoneyEntry[];
}
export interface NamedRecord {
  id: string;
  name: string;
  holding_id?: string;
  unit_id?: string;
}
export interface ReviewOptions {
  holdings: NamedRecord[];
  units: NamedRecord[];
  properties: NamedRecord[];
  categories: NamedRecord[];
  entries: MoneyEntry[];
  documents: {
    id: string;
    name: string;
    amount: string;
    entry_id: string | null;
  }[];
}
export interface Decision {
  action?: string;
  allocations?: { entry_id: string; amount: string; description?: string }[];
  entry_id?: string;
  reason?: string;
  category?: string;
  property_id?: string;
  holding_id?: string;
  portfolio_wide?: boolean;
  incurred_date?: string;
  description?: string;
  vendor?: string;
  document_id?: string;
  separate_transaction?: boolean;
}
export interface BankRow {
  id: number;
  row_number: number;
  date: string | null;
  amount: string | null;
  description: string;
  reference: string;
  raw: Record<string, string>;
  decision: Decision;
  issue: string;
  result: { action?: string; verified?: boolean; entry_ids?: string[] };
}
export interface BankPreview {
  id: string;
  batch_id: string;
  revision: number;
  expires_at: string;
  incoming: string;
  outgoing: string;
  remaining: number;
  effects: {
    row_id: number;
    source: { date: string; amount: string | null; description: string };
    effect: Decision & {
      document?: { id: string; amount: string; entry_id: string | null };
      amount?: string;
      date?: string;
      allocations?: {
        entry_id: string;
        amount: string;
        description?: string;
      }[];
    };
  }[];
}
export interface BankReceipt {
  verified: boolean;
  affected_entry_ids: string[];
  remaining: number;
  results: { row_id: number; action: string; entry_ids: string[] }[];
}
export interface Statement {
  staging: { state?: 'QUEUED' | 'READY' | 'FAILED'; message?: string };
  id: string;
  account: string;
  currency: string;
  filename: string;
  status: string;
  revision: number;
  headers: string[];
  worksheets: string[];
  worksheet: string;
  date_format: string;
  mapping: Record<string, string>;
  rows: BankRow[];
  preview: BankPreview | null;
  receipt: BankReceipt | null;
}
export interface StatementSummary {
  id: string;
  account: string;
  filename: string;
  status: string;
  pending: number;
}

async function request<T>(
  token: string,
  path: string,
  init: RequestInit = {}
): Promise<T> {
  const res = await fetch(`${DJANGO_API_URL}/ledger/${path}`, {
    ...init,
    headers: {
      Authorization: `Token ${token}`,
      ...(init.body && !(init.body instanceof FormData)
        ? { 'Content-Type': 'application/json' }
        : {}),
      ...init.headers,
    },
  });
  const body = await res.json();
  if (!res.ok)
    throw new Error(
      body.detail || 'The money records could not be loaded. Please retry.'
    );
  return body as T;
}
export function fetchMoney(token: string, params: URLSearchParams) {
  return request<MoneyOverview>(token, `money-overview/?${params}`);
}
export function fetchReviewOptions(token: string, batch?: string) {
  return request<ReviewOptions>(
    token,
    `review-options/${batch ? `?batch=${batch}` : ''}`
  );
}
export function fetchStatements(token: string) {
  return request<{ statements: StatementSummary[] }>(token, 'statements/');
}
export function fetchStatement(token: string, id: string) {
  return request<Statement>(token, `statements/${id}/`);
}
export function uploadStatement(token: string, file: File, account: string) {
  const body = new FormData();
  body.append('file', file);
  body.append('account', account);
  return request<Statement>(token, 'statements/', { method: 'POST', body });
}
export function statementAction<T>(
  token: string,
  id: string,
  body: Record<string, unknown>
) {
  return request<T>(token, `statements/${id}/`, {
    method: 'POST',
    body: JSON.stringify(body),
  });
}
