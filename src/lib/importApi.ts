// importApi.ts
// Client for the historical-import API: upload a CSV, confirm column
// mapping, review/edit staged rows, commit. Mirrors financeApi.ts's
// fetch + Token-auth conventions.

import { DJANGO_API_URL } from '@/lib/config';

export interface ImportBatch {
  id: string;
  label: string;
  source_filename: string;
  status: 'DRAFT' | 'COMMITTED' | 'DISCARDED';
  column_map: Record<string, string>;
  created_at: string;
  committed_at: string | null;
  row_count: number;
  issue_count: number;
}

export interface StagedRow {
  id: string;
  row_number: number;
  entry_type: string;
  amount: string | null;
  due_date: string | null;
  effective_date: string | null;
  paid_on: string | null;
  property_id: string | null;
  property_name: string | null;
  lease_id: string | null;
  tenant_id: string | null;
  category: string;
  vendor: string;
  description: string;
  payment_method: string;
  settles_row_id: string | null;
  issues: { field: string; message: string }[];
  committed: boolean;
  raw: Record<string, string>;
}

export interface CommitReport {
  committed: number;
  errors: { row: number; error: string }[];
  blocked_by_issues: number;
  batch_status: string;
}

function authHeaders(token: string): Record<string, string> {
  return { Authorization: `Token ${token}` };
}

async function handle(res: Response) {
  if (!res.ok) {
    const body = await res.json().catch(() => ({}) as { detail?: string });
    throw new Error(body.detail || `Request failed (${res.status})`);
  }
  return res.json();
}

export async function listImportBatches(
  token: string
): Promise<{ batches: ImportBatch[] }> {
  const res = await fetch(`${DJANGO_API_URL}/ledger/import/batches/`, {
    headers: authHeaders(token),
  });
  return handle(res);
}

export async function uploadImportFile(
  token: string,
  file: File,
  label: string
): Promise<
  ImportBatch & {
    headers: string[];
    guessed_map: Record<string, string>;
    target_fields: string[];
  }
> {
  const form = new FormData();
  form.append('file', file);
  if (label) form.append('label', label);
  const res = await fetch(`${DJANGO_API_URL}/ledger/import/batches/`, {
    method: 'POST',
    headers: authHeaders(token),
    body: form,
  });
  return handle(res);
}

export async function applyColumnMapping(
  token: string,
  batchId: string,
  columnMap: Record<string, string>
): Promise<ImportBatch> {
  const res = await fetch(
    `${DJANGO_API_URL}/ledger/import/batches/${batchId}/mapping/`,
    {
      method: 'POST',
      headers: { ...authHeaders(token), 'Content-Type': 'application/json' },
      body: JSON.stringify({ column_map: columnMap }),
    }
  );
  return handle(res);
}

export async function fetchBatchRows(
  token: string,
  batchId: string
): Promise<{ batch: ImportBatch; rows: StagedRow[] }> {
  const res = await fetch(
    `${DJANGO_API_URL}/ledger/import/batches/${batchId}/rows/`,
    { headers: authHeaders(token) }
  );
  return handle(res);
}

export async function updateStagedRow(
  token: string,
  batchId: string,
  rowId: string,
  patch: Record<string, unknown>
): Promise<StagedRow> {
  const res = await fetch(
    `${DJANGO_API_URL}/ledger/import/batches/${batchId}/rows/${rowId}/`,
    {
      method: 'PATCH',
      headers: { ...authHeaders(token), 'Content-Type': 'application/json' },
      body: JSON.stringify(patch),
    }
  );
  return handle(res);
}

export async function deleteStagedRow(
  token: string,
  batchId: string,
  rowId: string
): Promise<void> {
  const res = await fetch(
    `${DJANGO_API_URL}/ledger/import/batches/${batchId}/rows/${rowId}/`,
    { method: 'DELETE', headers: authHeaders(token) }
  );
  if (!res.ok && res.status !== 204) await handle(res);
}

export async function commitImportBatch(
  token: string,
  batchId: string
): Promise<CommitReport> {
  const res = await fetch(
    `${DJANGO_API_URL}/ledger/import/batches/${batchId}/commit/`,
    { method: 'POST', headers: authHeaders(token) }
  );
  return handle(res);
}

export async function discardImportBatch(
  token: string,
  batchId: string
): Promise<ImportBatch> {
  const res = await fetch(
    `${DJANGO_API_URL}/ledger/import/batches/${batchId}/discard/`,
    { method: 'POST', headers: authHeaders(token) }
  );
  return handle(res);
}
