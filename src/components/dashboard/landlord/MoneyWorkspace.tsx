'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import {
  currency,
  fetchMoney,
  fetchReviewOptions,
  FINANCE_CHANGED,
  type MoneyOverview,
  type MoneyEntry,
  type ReviewOptions,
} from '@/lib/moneyApi';
import BankReview from './finance/BankReview';
import FinancialManagement from './FinancialManagement';

export default function MoneyWorkspace() {
  const { token } = useAuth();
  const searchParams = useSearchParams();
  const now = new Date();
  const [month, setMonth] = useState(
    `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  );
  const [scope, setScope] = useState('');
  const [options, setOptions] = useState<ReviewOptions | null>(null);
  const [data, setData] = useState<MoneyOverview | null>(null);
  const [tab, setTab] = useState('overview');
  useEffect(() => {
    if (searchParams.has('entry')) setTab('ledger');
  }, [searchParams]);
  const [detail, setDetail] = useState<'rent' | 'overdue' | 'bills' | 'cash'>(
    'rent'
  );
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [version, setVersion] = useState(0);
  const refresh = useCallback(() => setVersion((v) => v + 1), []);
  useEffect(() => {
    window.addEventListener(FINANCE_CHANGED, refresh);
    return () => window.removeEventListener(FINANCE_CHANGED, refresh);
  }, [refresh]);
  useEffect(() => {
    if (!token || !/^\d{4}-\d{2}$/.test(month)) return;
    let live = true;
    const [y, m] = month.split('-').map(Number);
    const params = new URLSearchParams({
      start: `${month}-01`,
      end: `${m === 12 ? y + 1 : y}-${String(m === 12 ? 1 : m + 1).padStart(2, '0')}-01`,
    });
    if (scope) {
      const [kind, id] = scope.split(':');
      params.set(kind, id);
    }
    setLoading(true);
    setError('');
    setData(null);
    Promise.all([fetchMoney(token, params), fetchReviewOptions(token)])
      .then(([money, choices]) => {
        if (live) {
          setData(money);
          setOptions(choices);
        }
      })
      .catch((e) => {
        if (live)
          setError(
            e instanceof Error ? e.message : 'Unable to load money records.'
          );
      })
      .finally(() => {
        if (live) setLoading(false);
      });
    return () => {
      live = false;
    };
  }, [token, month, scope, version]);
  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Money</h1>
          <p className="mt-1 text-sm text-slate-600">
            Rent, bills, and the work ready for your review.
          </p>
        </div>
        <Link
          className="rounded-lg border px-4 py-2 text-sm"
          href="/dashboard/documents"
        >
          Add bills & receipts
        </Link>
      </div>
      <nav aria-label="Money views" className="flex flex-wrap gap-2">
        {[
          ['overview', 'Monthly overview'],
          ['review', 'Review statements'],
          ['ledger', 'All ledger tools'],
        ].map(([id, label]) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`rounded-lg px-4 py-2 text-sm ${tab === id ? 'bg-slate-900 text-white' : 'border bg-white'}`}
            aria-pressed={tab === id}
          >
            {label}
          </button>
        ))}
      </nav>
      {tab === 'review' && <BankReview />}
      {tab === 'ledger' && <FinancialManagement />}
      {tab === 'overview' && (
        <>
          <div className="flex flex-wrap gap-3">
            <label className="text-sm">
              Month
              <input
                aria-label="Month"
                className="field mt-1 block"
                type="month"
                value={month}
                onChange={(e) => setMonth(e.target.value)}
              />
            </label>
            <label className="text-sm">
              Address or unit
              <select
                aria-label="Financial scope"
                className="field mt-1 block min-w-56"
                value={scope}
                onChange={(e) => setScope(e.target.value)}
              >
                <option value="">Whole portfolio</option>
                {options?.holdings.map((h) => (
                  <option key={h.id} value={`holding:${h.id}`}>
                    {h.name}
                  </option>
                ))}
                {options?.units.map((u) => (
                  <option key={u.id} value={`unit:${u.id}`}>
                    {options.holdings.find((h) => h.id === u.holding_id)?.name}{' '}
                    / {u.name}
                  </option>
                ))}
                {options?.properties.map((p) => (
                  <option key={p.id} value={`property:${p.id}`}>
                    Listing: {p.name}
                  </option>
                ))}
              </select>
            </label>
            <button
              className="self-end rounded-lg border px-4 py-2 text-sm"
              onClick={refresh}
            >
              Refresh
            </button>
          </div>
          {loading && <p role="status">Loading money records…</p>}
          {error && (
            <div
              role="alert"
              className="rounded-lg border border-red-200 bg-red-50 p-4"
            >
              {error}{' '}
              <button onClick={refresh} className="underline">
                Retry
              </button>
            </div>
          )}
          {data && (
            <>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {[
                  [
                    'Rent & income expected',
                    data.period.expected_income,
                    'rent',
                  ],
                  ['Income received', data.period.collected_income, 'cash'],
                  ['Rent & income overdue', data.rent_overdue, 'overdue'],
                  ['Bills not yet paid', data.unpaid_bills, 'bills'],
                ].map(([label, value, section]) => (
                  <button
                    key={label}
                    onClick={() => setDetail(section as typeof detail)}
                    className="card p-5 text-left"
                  >
                    <div className="text-sm text-slate-600">{label}</div>
                    <div className="mt-2 text-2xl font-semibold tabular-nums">
                      {currency(value)}
                    </div>
                    <div className="mt-2 text-xs text-slate-500">
                      {section === 'overdue' || section === 'bills'
                        ? 'Across recorded periods · view records'
                        : 'Selected month · view records'}
                    </div>
                  </button>
                ))}
              </div>
              <div className="card p-5">
                <h2 className="font-semibold">Recorded cash movement</h2>
                <div className="mt-3 grid gap-4 sm:grid-cols-3">
                  <div>
                    <p className="text-sm text-slate-600">
                      Money received, including deposits
                    </p>
                    <strong className="text-xl">
                      {currency(data.period.recorded_cash_in)}
                    </strong>
                  </div>
                  <div>
                    <p className="text-sm text-slate-600">
                      Expenses cleared & deposits returned
                    </p>
                    <strong className="text-xl">
                      {currency(data.period.recorded_cash_out)}
                    </strong>
                  </div>
                  <div>
                    <p className="text-sm text-slate-600">Net movement</p>
                    <strong className="text-xl">
                      {currency(data.period.recorded_cash_movement)}
                    </strong>
                  </div>
                </div>
                <p className="mt-4 text-sm text-slate-600">
                  Deposits held: {currency(data.deposits_held)}. Mortgage
                  payments cleared this month:{' '}
                  {currency(data.period.mortgage_cleared)}. Expenses recorded
                  this month: {currency(data.period.expenses)}.
                </p>
                <p className="mt-2 text-sm text-slate-500">
                  {data.coverage.message}
                </p>
                <button
                  onClick={() => setDetail('cash')}
                  className="mt-3 text-sm underline"
                >
                  View cash records
                </button>
              </div>
              <div className="rounded-lg border bg-amber-50 p-4 text-sm">
                <button
                  onClick={() => setTab('review')}
                  className="font-medium underline"
                >
                  {data.coverage.unresolved_bank_rows_portfolio} bank rows
                  awaiting review across your portfolio
                </button>
                <span className="ml-2">
                  Upload a statement to match received rent and paid bills.
                </span>
              </div>
              {!options?.properties.length && (
                <p className="card p-4 text-sm">
                  Start by{' '}
                  <Link href="/dashboard/properties" className="underline">
                    adding your properties
                  </Link>
                  , then{' '}
                  <Link href="/dashboard/leases" className="underline">
                    review existing tenancies and charges
                  </Link>
                  . Bank imports do not create or activate leases.
                </p>
              )}
              <section className="card overflow-hidden">
                <div className="flex flex-wrap gap-2 border-b p-4">
                  {[
                    ['rent', 'Income due this month'],
                    ['overdue', 'Overdue'],
                    ['bills', 'Unpaid bills'],
                    ['cash', 'Cash records'],
                  ].map(([key, label]) => (
                    <button
                      key={key}
                      onClick={() => setDetail(key as typeof detail)}
                      className={`rounded px-3 py-1 text-sm ${detail === key ? 'bg-slate-900 text-white' : 'bg-slate-100'}`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
                <MoneyRows rows={data[detail]} />
              </section>
            </>
          )}
        </>
      )}
    </div>
  );
}

function MoneyRows({ rows }: { rows: MoneyEntry[] }) {
  if (!rows.length)
    return (
      <p className="p-5 text-sm text-slate-500">
        No recorded entries in this view.
      </p>
    );
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead className="bg-slate-50">
          <tr>
            {['Record', 'Address / listing', 'Date', 'Amount', 'Remaining'].map(
              (h) => (
                <th className="p-3" key={h}>
                  {h}
                </th>
              )
            )}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id} className="border-t">
              <td className="p-3">
                <Link href={r.link} className="underline">
                  {r.description}
                </Link>
              </td>
              <td className="p-3">{r.scope_name}</td>
              <td className="whitespace-nowrap p-3">
                {r.paid_on || r.due_date || r.effective_date}
              </td>
              <td className="p-3 tabular-nums">{currency(r.amount)}</td>
              <td className="p-3 tabular-nums">
                {r.outstanding === null ? '—' : currency(r.outstanding)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
