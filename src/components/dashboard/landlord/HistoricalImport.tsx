// HistoricalImport.tsx
//
// Port pre-Rentium history (bank statements, spreadsheets) in carefully:
// upload -> confirm what each column means -> review every row (edit or
// delete anything wrong) -> commit. Nothing becomes a real, permanent
// ledger entry until Commit — everything before that is freely mutable.

'use client';

import { useCallback, useState } from 'react';
import { AlertTriangle, Check, Loader2, Trash2, Upload } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { PageHeader, Pill } from '@/components/ui/page';
import {
  applyColumnMapping,
  commitImportBatch,
  deleteStagedRow,
  fetchBatchRows,
  updateStagedRow,
  uploadImportFile,
  type CommitReport,
  type ImportBatch,
  type StagedRow,
} from '@/lib/importApi';

const ENTRY_TYPES = [
  'RENT_CHARGE',
  'UTILITY_CHARGE',
  'DEPOSIT_CHARGE',
  'FEE_CHARGE',
  'OTHER_CHARGE',
  'PAYMENT',
  'CREDIT',
  'EXPENSE',
];

type Step = 'upload' | 'mapping' | 'review';

export default function HistoricalImport() {
  const { token } = useAuth();
  const [step, setStep] = useState<Step>('upload');
  const [label, setLabel] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  const [batch, setBatch] = useState<ImportBatch | null>(null);
  const [headers, setHeaders] = useState<string[]>([]);
  const [columnMap, setColumnMap] = useState<Record<string, string>>({});
  const [targetFields, setTargetFields] = useState<string[]>([]);

  const [rows, setRows] = useState<StagedRow[]>([]);
  const [committing, setCommitting] = useState(false);
  const [report, setReport] = useState<CommitReport | null>(null);

  const upload = async () => {
    if (!token || !file) return;
    setUploading(true);
    try {
      const result = await uploadImportFile(token, file, label);
      setBatch(result);
      setHeaders(result.headers);
      setColumnMap(result.guessed_map);
      setTargetFields(result.target_fields);
      setStep('mapping');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't upload.");
    } finally {
      setUploading(false);
    }
  };

  const confirmMapping = async () => {
    if (!token || !batch) return;
    try {
      const updated = await applyColumnMapping(token, batch.id, columnMap);
      setBatch(updated);
      await loadRows(updated.id);
      setStep('review');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't apply mapping.");
    }
  };

  const loadRows = useCallback(
    async (batchId: string) => {
      if (!token) return;
      const { batch: b, rows } = await fetchBatchRows(token, batchId);
      setBatch(b);
      setRows(rows);
    },
    [token]
  );

  const editRow = async (row: StagedRow, patch: Record<string, unknown>) => {
    if (!token || !batch) return;
    try {
      const updated = await updateStagedRow(token, batch.id, row.id, patch);
      setRows((prev) => prev.map((r) => (r.id === row.id ? updated : r)));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't save row.");
    }
  };

  const removeRow = async (row: StagedRow) => {
    if (!token || !batch) return;
    await deleteStagedRow(token, batch.id, row.id);
    setRows((prev) => prev.filter((r) => r.id !== row.id));
  };

  const commit = async () => {
    if (!token || !batch) return;
    setCommitting(true);
    try {
      const rep = await commitImportBatch(token, batch.id);
      setReport(rep);
      await loadRows(batch.id);
      toast.success(`Committed ${rep.committed} row(s).`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't commit.");
    } finally {
      setCommitting(false);
    }
  };

  const chargeRows = rows.filter((r) =>
    [
      'RENT_CHARGE',
      'UTILITY_CHARGE',
      'DEPOSIT_CHARGE',
      'FEE_CHARGE',
      'OTHER_CHARGE',
    ].includes(r.entry_type)
  );
  const cleanCount = rows.filter(
    (r) => r.issues.length === 0 && !r.committed
  ).length;

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader
        title="Import history"
        description="Bring in pre-Rentium bank statements or spreadsheets. Nothing is permanent until you commit — review and fix anything first."
      />

      {step === 'upload' && (
        <div className="card max-w-md p-6">
          <label className="text-sm font-medium">Label (optional)</label>
          <input
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="e.g. 2025 bank history"
            className="field mt-1.5"
          />
          <label className="mt-4 block text-sm font-medium">CSV file</label>
          <input
            type="file"
            accept=".csv,text/csv"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            className="field mt-1.5"
          />
          <p className="mt-2 text-xs text-[hsl(var(--ink-4))]">
            CSV only for now — export your bank statement or spreadsheet as CSV
            first.
          </p>
          <button
            type="button"
            onClick={upload}
            disabled={!file || uploading}
            className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-[hsl(var(--brand))] px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
          >
            {uploading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Upload className="h-4 w-4" />
            )}
            Upload
          </button>
        </div>
      )}

      {step === 'mapping' && batch && (
        <div className="card max-w-2xl p-6">
          <h2 className="font-semibold">What does each column mean?</h2>
          <p className="mt-1 text-sm text-[hsl(var(--ink-4))]">
            {batch.source_filename} — {headers.length} column(s). We guessed
            some; confirm or fix the rest. Leave a column as &quot;— ignore
            —&quot; to skip it.
          </p>
          <div className="mt-4 space-y-2">
            {headers.map((h) => (
              <div key={h} className="flex items-center gap-3">
                <span className="w-40 truncate text-sm font-medium">{h}</span>
                <select
                  value={columnMap[h] || ''}
                  onChange={(e) =>
                    setColumnMap((prev) => ({ ...prev, [h]: e.target.value }))
                  }
                  className="field flex-1"
                >
                  <option value="">— ignore —</option>
                  {targetFields.map((f) => (
                    <option key={f} value={f}>
                      {f}
                    </option>
                  ))}
                </select>
              </div>
            ))}
          </div>
          <button
            type="button"
            onClick={confirmMapping}
            className="mt-5 rounded-lg bg-[hsl(var(--brand))] px-4 py-2 text-sm font-medium text-white"
          >
            Stage rows
          </button>
        </div>
      )}

      {step === 'review' && batch && (
        <div>
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm">
              <Pill tone={batch.status === 'COMMITTED' ? 'ok' : 'neutral'}>
                {batch.status}
              </Pill>
              <span className="text-[hsl(var(--ink-4))]">
                {rows.length} row(s),{' '}
                {rows.filter((r) => r.issues.length).length} with issues
              </span>
            </div>
            <button
              type="button"
              onClick={commit}
              disabled={committing || cleanCount === 0}
              className="inline-flex items-center gap-1.5 rounded-lg bg-[hsl(var(--brand))] px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
            >
              {committing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Check className="h-4 w-4" />
              )}
              Commit {cleanCount} clean row(s)
            </button>
          </div>

          {report && (
            <div className="mb-4 rounded-lg bg-[hsl(var(--surface-sunken))] p-3 text-sm">
              Committed {report.committed}. {report.blocked_by_issues} still
              have issues.
              {report.errors.length > 0 && (
                <ul className="mt-1 list-disc pl-5 text-red-700">
                  {report.errors.map((e, i) => (
                    <li key={i}>
                      Row {e.row}: {e.error}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          <div
            className="overflow-x-auto rounded-xl border"
            style={{ borderColor: 'hsl(var(--line))' }}
          >
            <table className="w-full min-w-[900px] text-sm">
              <thead className="bg-[hsl(var(--surface-sunken))] text-left text-xs text-[hsl(var(--ink-4))]">
                <tr>
                  <th className="px-3 py-2">#</th>
                  <th className="px-3 py-2">Type</th>
                  <th className="px-3 py-2">Amount</th>
                  <th className="px-3 py-2">Date</th>
                  <th className="px-3 py-2">Property</th>
                  <th className="px-3 py-2">Description</th>
                  <th className="px-3 py-2">Settles</th>
                  <th className="px-3 py-2">Issues</th>
                  <th className="px-3 py-2" />
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr
                    key={row.id}
                    className="border-t"
                    style={{ borderColor: 'hsl(var(--line))' }}
                  >
                    <td className="px-3 py-2 text-[hsl(var(--ink-4))]">
                      {row.row_number}
                    </td>
                    <td className="px-3 py-2">
                      <select
                        value={row.entry_type}
                        disabled={row.committed}
                        onChange={(e) =>
                          editRow(row, { entry_type: e.target.value })
                        }
                        className="field"
                      >
                        {ENTRY_TYPES.map((t) => (
                          <option key={t} value={t}>
                            {t}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-3 py-2">
                      <input
                        defaultValue={row.amount ?? ''}
                        disabled={row.committed}
                        onBlur={(e) => editRow(row, { amount: e.target.value })}
                        className="field w-24"
                      />
                    </td>
                    <td className="px-3 py-2">
                      <input
                        type="date"
                        defaultValue={row.effective_date ?? row.due_date ?? ''}
                        disabled={row.committed}
                        onBlur={(e) =>
                          editRow(row, {
                            effective_date: e.target.value,
                            due_date: e.target.value,
                          })
                        }
                        className="field w-36"
                      />
                    </td>
                    <td className="px-3 py-2">{row.property_name || '—'}</td>
                    <td className="px-3 py-2">
                      <input
                        defaultValue={row.description}
                        disabled={row.committed}
                        onBlur={(e) =>
                          editRow(row, { description: e.target.value })
                        }
                        className="field w-40"
                      />
                    </td>
                    <td className="px-3 py-2">
                      {row.entry_type === 'PAYMENT' ||
                      row.entry_type === 'CREDIT' ? (
                        <select
                          value={row.settles_row_id ?? ''}
                          disabled={row.committed}
                          onChange={(e) =>
                            editRow(row, {
                              settles_row_id: e.target.value || null,
                            })
                          }
                          className="field w-40"
                        >
                          <option value="">— pick a charge —</option>
                          {chargeRows.map((c) => (
                            <option key={c.id} value={c.id}>
                              #{c.row_number} {c.entry_type} ${c.amount}
                            </option>
                          ))}
                        </select>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td className="px-3 py-2">
                      {row.committed ? (
                        <Pill tone="ok">committed</Pill>
                      ) : row.issues.length ? (
                        <span className="flex items-center gap-1 text-xs text-[hsl(var(--warn-ink))]">
                          <AlertTriangle className="h-3.5 w-3.5" />
                          {row.issues.map((i) => i.message).join('; ')}
                        </span>
                      ) : (
                        <Pill tone="neutral">ready</Pill>
                      )}
                    </td>
                    <td className="px-3 py-2">
                      {!row.committed && (
                        <button
                          type="button"
                          onClick={() => removeRow(row)}
                          className="text-[hsl(var(--ink-4))] hover:text-red-600"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
