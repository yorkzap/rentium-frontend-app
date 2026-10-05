'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import {
  currency,
  fetchStatement,
  fetchStatements,
  fetchReviewOptions,
  uploadStatement,
  statementAction,
  financeChanged,
  type Statement,
  type StatementSummary,
  type ReviewOptions,
  type BankRow,
  type Decision,
  type BankPreview,
  type BankReceipt,
} from '@/lib/moneyApi';

const actions: Record<string, string> = {
  payment: 'Record rent / deposit received',
  pay_expense: 'Mark an existing bill paid',
  link: 'Already recorded — link evidence',
  expense: 'Record a new expense',
  exclude: 'Exclude from property records',
};
const button =
  'rounded-lg border bg-white px-3 py-2 text-sm disabled:opacity-50';

export default function BankReview() {
  const { token } = useAuth();
  const [statements, setStatements] = useState<StatementSummary[]>([]);
  const [statement, setStatement] = useState<Statement | null>(null);
  const [options, setOptions] = useState<ReviewOptions | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [account, setAccount] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [selected, setSelected] = useState<number[]>([]);
  const [preview, setPreview] = useState<BankPreview | null>(null);
  const [receipt, setReceipt] = useState<BankReceipt | null>(null);
  const [editing, setEditing] = useState<number | null>(null);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [dateFormat, setDateFormat] = useState('%Y-%m-%d');
  const [worksheet, setWorksheet] = useState('');
  const [showMapping, setShowMapping] = useState(false);
  const list = useCallback(async () => {
    if (token) setStatements((await fetchStatements(token)).statements);
  }, [token]);
  useEffect(() => {
    list().catch((e) => setError(e.message));
  }, [list]);
  const accept = (s: Statement) => {
    setStatement(s);
    setMapping(s.mapping);
    setDateFormat(s.date_format);
    setWorksheet(s.worksheet);
    setPreview(s.preview);
    setSelected(
      s.rows.filter((r) => !r.result.verified && !r.issue).map((r) => r.id)
    );
    setEditing(null);
    setShowMapping(!s.rows.length);
  };
  const preparingId =
    statement?.staging?.state === 'QUEUED' ? statement.id : null;
  useEffect(() => {
    if (!token || !preparingId) return;
    let live = true;
    const id = preparingId;
    const timer = window.setInterval(async () => {
      try {
        const next = await fetchStatement(token, id);
        if (!live) return;
        setStatement(next);
        if (next.staging?.state !== 'QUEUED') {
          accept(next);
          financeChanged();
          void list();
        }
      } catch (e) {
        if (live)
          setError(
            e instanceof Error
              ? e.message
              : 'Unable to check preparation. Reopen the saved statement to retry.'
          );
      }
    }, 2500);
    return () => {
      live = false;
      window.clearInterval(timer);
    };
  }, [token, preparingId, list]);
  const run = async (fn: () => Promise<void>) => {
    setBusy(true);
    setError('');
    try {
      await fn();
    } catch (e) {
      setError(
        e instanceof Error ? e.message : 'The review could not be saved.'
      );
    } finally {
      setBusy(false);
    }
  };
  const open = (id: string) =>
    run(async () => {
      if (!token) return;
      const [s, o] = await Promise.all([
        fetchStatement(token, id),
        fetchReviewOptions(token, id),
      ]);
      accept(s);
      setOptions(o);
      setReceipt(null);
    });
  const upload = () =>
    run(async () => {
      if (!token || !file) return;
      const s = await uploadStatement(token, file, account);
      accept(s);
      setOptions(await fetchReviewOptions(token, s.id));
      setReceipt(null);
      await list();
    });
  const chooseWorksheet = (name: string) =>
    run(async () => {
      if (!token || !statement) return;
      const columns = await statementAction<
        Pick<Statement, 'headers' | 'worksheets' | 'worksheet' | 'mapping'>
      >(token, statement.id, { action: 'columns', worksheet: name });
      setStatement({ ...statement, ...columns });
      setWorksheet(columns.worksheet);
      setMapping(columns.mapping);
    });
  const saveMapping = () =>
    run(async () => {
      if (!token || !statement) return;
      accept(
        await statementAction<Statement>(token, statement.id, {
          action: 'mapping',
          mapping,
          date_format: dateFormat,
          worksheet,
        })
      );
      await list();
      financeChanged();
    });
  const save = (id: number, decision: Decision) =>
    run(async () => {
      if (!token || !statement) return;
      accept(
        await statementAction<Statement>(token, statement.id, {
          action: 'decision',
          row_id: id,
          decision,
        })
      );
    });
  const prepare = () =>
    run(async () => {
      if (!token || !statement) return;
      setPreview(
        await statementAction<BankPreview>(token, statement.id, {
          action: 'preview',
          row_ids: selected,
        })
      );
      setReceipt(null);
    });
  const confirm = () =>
    run(async () => {
      if (!token || !statement || !preview) return;
      const result = await statementAction<BankReceipt>(token, statement.id, {
        action: 'confirm',
        preview_id: preview.id,
      });
      setReceipt(result);
      setPreview(null);
      accept(await fetchStatement(token, statement.id));
      setOptions(await fetchReviewOptions(token, statement.id));
      await list();
      financeChanged();
    });
  const cancel = () =>
    run(async () => {
      if (!token || !statement) return;
      accept(
        await statementAction<Statement>(token, statement.id, {
          action: 'cancel',
        })
      );
    });
  return (
    <div className="space-y-5">
      {statement?.staging?.state === 'QUEUED' && (
        <p role="status" className="card p-4">
          Preparing your statement in the background. You can leave and reopen
          this saved review. If it is still waiting after five minutes, press
          Prepare transactions to retry.
        </p>
      )}
      {statement?.staging?.state === 'FAILED' && (
        <p
          role="alert"
          className="rounded-lg border border-red-200 bg-red-50 p-4"
        >
          {statement.staging.message}
        </p>
      )}
      <div className="grid gap-5 lg:grid-cols-2">
        <section className="card space-y-3 p-5">
          <h2 className="font-semibold">Upload a bank statement</h2>
          <p className="text-sm text-slate-600">
            CSV or Excel export, in CAD. Use the same account name each time to
            reuse your column mapping.
          </p>
          <label className="block text-sm">
            Account name
            <input
              className="field mt-1 block w-full"
              placeholder="e.g. Property chequing"
              value={account}
              onChange={(e) => setAccount(e.target.value)}
            />
          </label>
          <label className="block text-sm">
            Statement file
            <input
              className="field mt-1 block w-full"
              type="file"
              accept=".csv,.xlsx"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
            />
          </label>
          <button
            className={button}
            disabled={busy || !file || !account.trim()}
            onClick={upload}
          >
            Upload statement
          </button>
          <p className="text-xs text-slate-500">
            Nothing posts until you approve a complete preview.{' '}
            <Link className="underline" href="/dashboard/documents">
              Upload receipt photos or PDFs in Documents.
            </Link>
          </p>
        </section>
        <section className="card p-5">
          <h2 className="font-semibold">Saved reviews</h2>
          {!statements.length ? (
            <p className="mt-3 text-sm text-slate-500">
              Your statement reviews will appear here, including unfinished
              work.
            </p>
          ) : (
            <ul className="mt-3 max-h-64 space-y-2 overflow-auto">
              {statements.map((s) => (
                <li key={s.id}>
                  <button
                    disabled={busy}
                    onClick={() => open(s.id)}
                    className={`w-full rounded-lg border p-3 text-left text-sm ${statement?.id === s.id ? 'border-slate-900 bg-slate-50' : ''}`}
                  >
                    <strong>{s.account}</strong>
                    <span className="block break-all text-slate-600">
                      {s.filename}
                    </span>
                    <span>
                      {s.status === 'COMMITTED'
                        ? 'Reviewed'
                        : `${s.pending} rows to review`}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
      {busy && (
        <p role="status" className="text-sm">
          Saving and checking records…
        </p>
      )}
      {error && (
        <div
          role="alert"
          className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm"
        >
          {error}
        </div>
      )}
      {receipt && (
        <div
          role="status"
          className="rounded-lg border border-green-200 bg-green-50 p-4"
        >
          <strong>Review saved and verified.</strong>
          <p className="text-sm">
            {receipt.affected_entry_ids.length} ledger records linked.{' '}
            {receipt.remaining} rows remain in review.
          </p>
          <p className="mt-2 flex flex-wrap gap-3">
            {receipt.affected_entry_ids.map((id, i) => (
              <Link
                key={id}
                href={`/dashboard/financial?entry=${id}`}
                className="text-sm underline"
              >
                View record {i + 1}
              </Link>
            ))}
          </p>
        </div>
      )}
      {statement && (
        <section className="card space-y-4 p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="font-semibold">{statement.account}</h2>
              <p className="break-all text-sm text-slate-500">
                {statement.filename}
              </p>
            </div>
            {statement.status === 'DRAFT' &&
              !statement.rows.some((r) => r.result.verified) && (
                <button
                  className={button}
                  onClick={() => setShowMapping((v) => !v)}
                  disabled={busy}
                >
                  Column mapping
                </button>
              )}
          </div>
          {showMapping && (
            <div className="space-y-4 rounded-lg border bg-slate-50 p-4">
              <p className="text-sm">
                Match the columns once. Signed amounts must be positive for
                money in and negative for money out. Changing the mapping
                replaces unapproved draft decisions.
              </p>
              {statement.worksheets.length > 1 && (
                <label className="block text-sm">
                  Worksheet
                  <select
                    className="field ml-3"
                    value={worksheet}
                    onChange={(e) => chooseWorksheet(e.target.value)}
                  >
                    {statement.worksheets.map((s) => (
                      <option key={s}>{s}</option>
                    ))}
                  </select>
                </label>
              )}
              <label className="block text-sm">
                Date format
                <select
                  className="field ml-3"
                  value={dateFormat}
                  onChange={(e) => setDateFormat(e.target.value)}
                >
                  {[
                    ['%Y-%m-%d', 'YYYY-MM-DD'],
                    ['%m/%d/%Y', 'MM/DD/YYYY'],
                    ['%d/%m/%Y', 'DD/MM/YYYY'],
                    ['%m/%d/%y', 'MM/DD/YY'],
                    ['%d/%m/%y', 'DD/MM/YY'],
                  ].map(([v, l]) => (
                    <option key={v} value={v}>
                      {l}
                    </option>
                  ))}
                </select>
              </label>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {statement.headers.map((h) => (
                  <label className="text-sm" key={h}>
                    {h}
                    <select
                      aria-label={`Map ${h}`}
                      className="field mt-1 block w-full"
                      value={mapping[h] || ''}
                      onChange={(e) =>
                        setMapping({ ...mapping, [h]: e.target.value })
                      }
                    >
                      <option value="">Ignore</option>
                      {[
                        'date',
                        'description',
                        'amount',
                        'debit',
                        'credit',
                        'reference',
                      ].map((v) => (
                        <option key={v} value={v}>
                          {v}
                        </option>
                      ))}
                    </select>
                  </label>
                ))}
              </div>
              <button className={button} onClick={saveMapping} disabled={busy}>
                Prepare transactions
              </button>
            </div>
          )}
          {!!statement.rows.length && (
            <>
              <div className="flex flex-wrap items-center gap-3 text-sm">
                <span>
                  {
                    statement.rows.filter((r) => !r.result.verified && r.issue)
                      .length
                  }{' '}
                  need a decision ·{' '}
                  {
                    statement.rows.filter((r) => !r.result.verified && !r.issue)
                      .length
                  }{' '}
                  ready
                </span>
                <button
                  className="underline"
                  onClick={() =>
                    setSelected(
                      statement.rows
                        .filter((r) => !r.result.verified && !r.issue)
                        .map((r) => r.id)
                    )
                  }
                  disabled={busy || !!editing}
                >
                  Select ready rows
                </button>
                <button className="underline" onClick={() => setSelected([])}>
                  Clear selection
                </button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr>
                      {[
                        'Select',
                        'Bank date',
                        'Description',
                        'Money in / out',
                        'Decision',
                      ].map((h) => (
                        <th className="p-2" key={h}>
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {statement.rows.map((row) => (
                      <tr key={row.id} className="border-t align-top">
                        <td className="p-2">
                          <input
                            aria-label={`Select row ${row.row_number}`}
                            type="checkbox"
                            checked={selected.includes(row.id)}
                            disabled={
                              busy ||
                              !!row.result.verified ||
                              !!row.issue ||
                              !!editing
                            }
                            onChange={(e) =>
                              setSelected(
                                e.target.checked
                                  ? [...selected, row.id]
                                  : selected.filter((id) => id !== row.id)
                              )
                            }
                          />
                        </td>
                        <td className="whitespace-nowrap p-2">
                          {row.date || 'Check date'}
                        </td>
                        <td className="max-w-sm p-2">
                          <p>
                            {row.description || `Source row ${row.row_number}`}
                          </p>
                          <details className="mt-1 text-xs text-slate-500">
                            <summary>Source details</summary>
                            {Object.entries(row.raw).map(([k, v]) => (
                              <p className="break-all" key={k}>
                                {k}: {v}
                              </p>
                            ))}
                          </details>
                        </td>
                        <td className="whitespace-nowrap p-2 tabular-nums">
                          {row.amount === null
                            ? 'Check amount'
                            : `${Number(row.amount) > 0 ? '+' : ''}${currency(row.amount)}`}
                        </td>
                        <td className="min-w-64 p-2">
                          {row.result.verified ? (
                            <span className="text-green-700">
                              Verified —{' '}
                              {actions[row.result.action || ''] ||
                                row.result.action}
                            </span>
                          ) : (
                            <>
                              <div>
                                {actions[row.decision.action || ''] ||
                                  'Needs your decision'}
                              </div>
                              {row.issue && (
                                <p className="mt-1 text-xs text-amber-800">
                                  {row.issue}
                                </p>
                              )}
                              <button
                                className="mt-2 underline"
                                disabled={busy}
                                onClick={() => {
                                  setEditing(row.id);
                                  setPreview(null);
                                }}
                              >
                                Review row {row.row_number}
                              </button>
                            </>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {editing &&
                options &&
                statement.rows.find((r) => r.id === editing) && (
                  <DecisionEditor
                    key={`${statement.revision}:${editing}`}
                    row={statement.rows.find((r) => r.id === editing)!}
                    options={options}
                    busy={busy}
                    save={(d) => save(editing, d)}
                    cancel={() => setEditing(null)}
                  />
                )}
              {statement.status === 'DRAFT' && (
                <button
                  className="rounded-lg bg-slate-900 px-4 py-2 text-sm text-white disabled:opacity-50"
                  disabled={busy || !selected.length || !!editing}
                  onClick={prepare}
                >
                  Preview {selected.length} selected rows
                </button>
              )}
            </>
          )}
        </section>
      )}
      {preview && (
        <section
          className="card space-y-4 border-2 border-slate-900 p-5"
          aria-label="Approval preview"
        >
          <h2 className="text-lg font-semibold">Review before approving</h2>
          <p className="text-sm">
            Selected bank amounts: {currency(preview.incoming)} in,{' '}
            {currency(preview.outgoing)} out. {preview.remaining} other rows
            remain in review. Exclusions below do not post to the ledger.
          </p>
          <ul className="space-y-3">
            {preview.effects.map((item) => (
              <li key={item.row_id} className="rounded-lg border p-3 text-sm">
                <strong>
                  {item.source.description || 'Bank row'} ·{' '}
                  {item.source.amount
                    ? currency(item.source.amount)
                    : 'No amount'}{' '}
                  · {item.source.date}
                </strong>
                <p className="mt-1">
                  {actions[item.effect.action || '']}{' '}
                  {item.effect.reason ? `(${item.effect.reason})` : ''}
                </p>
                {item.effect.allocations?.map((a) => (
                  <p key={a.entry_id}>
                    <Link
                      className="underline"
                      target="_blank"
                      rel="noopener noreferrer"
                      href={`/dashboard/financial?entry=${a.entry_id}`}
                    >
                      {a.description || a.entry_id}
                    </Link>
                    : {currency(a.amount)}
                    {' · '}
                    {
                      options?.entries.find((e) => e.id === a.entry_id)
                        ?.scope_name
                    }
                    {' · due '}
                    {
                      options?.entries.find((e) => e.id === a.entry_id)
                        ?.due_date
                    }
                  </p>
                ))}
                {item.effect.entry_id && (
                  <p>
                    <Link
                      className="underline"
                      target="_blank"
                      rel="noopener noreferrer"
                      href={`/dashboard/financial?entry=${item.effect.entry_id}`}
                    >
                      {options?.entries.find(
                        (e) => e.id === item.effect.entry_id
                      )?.description || item.effect.entry_id}
                    </Link>
                    {' · '}
                    {
                      options?.entries.find(
                        (e) => e.id === item.effect.entry_id
                      )?.scope_name
                    }
                  </p>
                )}
                {item.effect.action === 'expense' && (
                  <p>
                    {item.effect.description} ·{' '}
                    {
                      options?.categories.find(
                        (c) => c.id === item.effect.category
                      )?.name
                    }{' '}
                    ·{' '}
                    {options?.properties.find(
                      (p) => p.id === item.effect.property_id
                    )?.name ||
                      options?.holdings.find(
                        (h) => h.id === item.effect.holding_id
                      )?.name ||
                      'Portfolio'}{' '}
                    · incurred {item.effect.incurred_date}, cleared{' '}
                    {item.effect.date}
                  </p>
                )}
                {item.effect.document && (
                  <p>
                    Attach receipt:{' '}
                    {options?.documents.find(
                      (d) => d.id === item.effect.document?.id
                    )?.name || item.effect.document.id}{' '}
                    · {currency(item.effect.document.amount)}
                  </p>
                )}
              </li>
            ))}
          </ul>
          <div className="flex gap-3">
            <button
              className="rounded-lg bg-slate-900 px-4 py-2 text-white disabled:opacity-50"
              onClick={confirm}
              disabled={busy || !!editing}
            >
              Approve complete batch
            </button>
            <button className={button} onClick={cancel} disabled={busy}>
              Cancel preview
            </button>
          </div>
          <p className="text-xs text-slate-500">
            Approval expires after 30 minutes. Changed balances require a fresh
            preview.
          </p>
        </section>
      )}
    </div>
  );
}

function DecisionEditor({
  row,
  options,
  busy,
  save,
  cancel,
}: {
  row: BankRow;
  options: ReviewOptions;
  busy: boolean;
  save: (d: Decision) => void;
  cancel: () => void;
}) {
  const [decision, setDecision] = useState<Decision>(row.decision);
  const update = (patch: Partial<Decision>) =>
    setDecision({ ...decision, ...patch });
  const incoming = Number(row.amount) > 0;
  const charges = options.entries.filter(
    (e) => e.entry_type.endsWith('_CHARGE') && Number(e.outstanding) > 0
  );
  const targets = options.entries.filter((e) =>
    decision.action === 'pay_expense'
      ? e.entry_type === 'EXPENSE' && !e.paid_on
      : incoming
        ? e.entry_type === 'PAYMENT'
        : e.entry_type === 'EXPENSE' && !!e.paid_on
  );
  const allocations = decision.allocations || [];
  return (
    <div
      className="space-y-4 rounded-lg border-2 border-slate-300 bg-slate-50 p-4"
      aria-label="Edit transaction decision"
    >
      <h3 className="font-semibold">
        Review row {row.row_number}: {row.description}
      </h3>
      <p className="text-xs text-slate-600">
        Matches include up to 1,000 records, with open charges and unpaid bills
        first. Leave this row in review if its record is missing.
      </p>
      <label className="block text-sm">
        How should this be recorded?
        <select
          className="field mt-1 block w-full"
          value={decision.action || ''}
          onChange={(e) =>
            setDecision({
              action: e.target.value,
              incurred_date: row.date || '',
              description: row.description,
            })
          }
        >
          <option value="">Choose…</option>
          {Object.entries(actions)
            .filter(
              ([key]) =>
                key === 'exclude' ||
                key === 'link' ||
                (incoming
                  ? key === 'payment'
                  : key === 'expense' || key === 'pay_expense')
            )
            .map(([key, label]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
        </select>
      </label>
      {decision.action === 'payment' && (
        <div className="space-y-3">
          <p className="text-sm">
            Allocate all {currency(Math.abs(Number(row.amount)))}. Each share
            can partially settle a charge.
          </p>
          {allocations.map((a, i) => (
            <div className="flex flex-wrap gap-2" key={i}>
              <select
                aria-label={`Charge ${i + 1}`}
                className="field min-w-0 flex-1"
                value={a.entry_id}
                onChange={(e) =>
                  update({
                    allocations: allocations.map((x, j) =>
                      j === i ? { ...x, entry_id: e.target.value } : x
                    ),
                  })
                }
              >
                <option value="">Choose exact charge…</option>
                {charges.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.scope_name} · {e.description} · {e.due_date} ·{' '}
                    {currency(e.outstanding || '0')} remaining
                  </option>
                ))}
              </select>
              <input
                aria-label={`Allocation ${i + 1}`}
                type="number"
                min="0.01"
                step="0.01"
                className="field w-32"
                value={a.amount}
                onChange={(e) =>
                  update({
                    allocations: allocations.map((x, j) =>
                      j === i ? { ...x, amount: e.target.value } : x
                    ),
                  })
                }
              />
              <button
                className={button}
                onClick={() =>
                  update({ allocations: allocations.filter((_, j) => j !== i) })
                }
              >
                Remove
              </button>
            </div>
          ))}
          <button
            className={button}
            onClick={() =>
              update({
                allocations: [
                  ...allocations,
                  {
                    entry_id: '',
                    amount: allocations.length
                      ? ''
                      : String(Math.abs(Number(row.amount))),
                  },
                ],
              })
            }
          >
            Add charge allocation
          </button>
          <p className="text-xs text-slate-600">
            No matching charge?{' '}
            <Link className="underline" href="/dashboard/leases">
              Review the tenancy and charge schedule
            </Link>
            . Leave this row in review until the obligation is established.
          </p>
        </div>
      )}
      {(decision.action === 'pay_expense' || decision.action === 'link') && (
        <label className="block text-sm">
          Existing record
          <select
            className="field mt-1 block w-full"
            value={decision.entry_id || ''}
            onChange={(e) => update({ entry_id: e.target.value })}
          >
            <option value="">Choose exact record…</option>
            {targets.map((e) => (
              <option key={e.id} value={e.id}>
                {e.scope_name} · {e.description} ·{' '}
                {e.paid_on || e.effective_date} · {currency(e.amount)}
              </option>
            ))}
          </select>
        </label>
      )}
      {decision.action === 'expense' && (
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="text-sm">
            Expense description
            <input
              className="field mt-1 block w-full"
              value={decision.description || ''}
              onChange={(e) => update({ description: e.target.value })}
            />
          </label>
          <label className="text-sm">
            Vendor
            <input
              className="field mt-1 block w-full"
              value={decision.vendor || ''}
              onChange={(e) => update({ vendor: e.target.value })}
            />
          </label>
          <label className="text-sm">
            Incurred date
            <input
              type="date"
              className="field mt-1 block w-full"
              value={decision.incurred_date || ''}
              onChange={(e) => update({ incurred_date: e.target.value })}
            />
          </label>
          <label className="text-sm">
            Category
            <select
              className="field mt-1 block w-full"
              value={decision.category || ''}
              onChange={(e) => update({ category: e.target.value })}
            >
              <option value="">Choose category…</option>
              {options.categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm sm:col-span-2">
            Address or listing
            <select
              className="field mt-1 block w-full"
              value={
                decision.property_id
                  ? `property:${decision.property_id}`
                  : decision.holding_id
                    ? `holding:${decision.holding_id}`
                    : decision.portfolio_wide
                      ? 'portfolio'
                      : ''
              }
              onChange={(e) => {
                const [kind, id] = e.target.value.split(':');
                update({
                  property_id: kind === 'property' ? id : '',
                  holding_id: kind === 'holding' ? id : '',
                  portfolio_wide: kind === 'portfolio',
                });
              }}
            >
              <option value="">Choose scope…</option>
              <option value="portfolio">Portfolio-wide</option>
              {options.holdings.map((h) => (
                <option key={h.id} value={`holding:${h.id}`}>
                  {h.name}
                </option>
              ))}
              {options.properties.map((p) => (
                <option key={p.id} value={`property:${p.id}`}>
                  {p.name}
                </option>
              ))}
            </select>
          </label>
        </div>
      )}
      {['expense', 'pay_expense', 'link'].includes(decision.action || '') &&
        !incoming && (
          <label className="block text-sm">
            Receipt / bill (optional)
            <select
              className="field mt-1 block w-full"
              value={decision.document_id || ''}
              onChange={(e) => update({ document_id: e.target.value })}
            >
              <option value="">No document attached</option>
              {options.documents.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name} · {currency(d.amount)}
                  {d.entry_id ? ' · already linked' : ''}
                </option>
              ))}
            </select>
          </label>
        )}
      {decision.action === 'exclude' && (
        <label className="block text-sm">
          Reason
          <select
            className="field mt-1 block w-full"
            value={decision.reason || ''}
            onChange={(e) => update({ reason: e.target.value })}
          >
            <option value="">Choose reason…</option>
            {[
              ['transfer', 'Transfer between accounts'],
              ['personal', 'Personal spending'],
              ['duplicate', 'Duplicate statement row'],
              ['not_a_transaction', 'Not a transaction / export footer'],
            ].map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </select>
        </label>
      )}
      {decision.action && decision.action !== 'exclude' && (
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={decision.separate_transaction || false}
            onChange={(e) => update({ separate_transaction: e.target.checked })}
          />
          I checked the duplicate warning: this is a genuinely separate
          transaction.
        </label>
      )}
      <div className="flex gap-2">
        <button
          className={button}
          disabled={busy}
          onClick={() => save(decision)}
        >
          Save draft decision
        </button>
        <button className={button} disabled={busy} onClick={cancel}>
          Close without saving
        </button>
      </div>
    </div>
  );
}
