'use client';

import { useState } from 'react';
import { Loader2 } from 'lucide-react';

// The bill categories the backend accepts (leases serializer validate_bills_included).
const CATEGORIES: { key: string; label: string }[] = [
  { key: 'electricity', label: 'Electricity' },
  { key: 'water', label: 'Water' },
  { key: 'heat', label: 'Heat' },
  { key: 'gas', label: 'Gas' },
  { key: 'internet', label: 'Internet' },
  { key: 'cable', label: 'Cable / TV' },
  { key: 'waste', label: 'Garbage / Recycling' },
  { key: 'sewer', label: 'Sewer' },
];

type BillEntry = {
  included: boolean;
  provider: string;
  category: string;
  tenant_responsibility?: {
    type?: string;
    value?: number;
    distribution?: string;
  };
  notes?: string;
};

export type BillsMap = Record<string, BillEntry>;

type RowStatus = 'unset' | 'included' | 'tenant';

interface RowState {
  status: RowStatus;
  provider: string;
  percent: number;
}

function toRows(value: BillsMap): Record<string, RowState> {
  const rows: Record<string, RowState> = {};
  for (const { key } of CATEGORIES) {
    const e = value?.[key];
    if (!e) {
      rows[key] = { status: 'unset', provider: '', percent: 100 };
    } else if (e.included) {
      rows[key] = {
        status: 'included',
        provider: e.provider || '',
        percent: 100,
      };
    } else {
      rows[key] = {
        status: 'tenant',
        provider: e.provider || '',
        percent:
          typeof e.tenant_responsibility?.value === 'number'
            ? e.tenant_responsibility.value
            : 100,
      };
    }
  }
  return rows;
}

function toBills(rows: Record<string, RowState>): BillsMap {
  const out: BillsMap = {};
  for (const { key } of CATEGORIES) {
    const r = rows[key];
    if (!r || r.status === 'unset') continue;
    if (r.status === 'included') {
      out[key] = {
        included: true,
        provider: r.provider,
        category: key,
        tenant_responsibility: {},
        notes: '',
      };
    } else {
      out[key] = {
        included: false,
        provider: r.provider,
        category: key,
        tenant_responsibility: {
          type: 'percentage',
          value: r.percent,
          distribution: 'equal',
        },
        notes: '',
      };
    }
  }
  return out;
}

/** Read-only list of utilities for lease detail / tenant overview. */
export function BillsSummaryList({
  bills,
  fallback,
  className = '',
}: {
  bills?: BillsMap | Record<string, BillEntry> | null;
  fallback?: string | null;
  className?: string;
}) {
  const rows = CATEGORIES.map(({ key, label }) => {
    const e = bills?.[key] as BillEntry | undefined;
    if (!e) return null;
    const provider = (e.provider || '').trim();
    const name = provider ? `${label} (${provider})` : label;
    let status: string;
    if (e.included) {
      status = 'Included in rent';
    } else {
      const resp = e.tenant_responsibility || {};
      if (resp.type === 'full') status = 'Tenant pays 100%';
      else if (resp.type === 'percentage')
        status = `Tenant pays ${resp.value ?? 100}%`;
      else if (resp.type === 'fixed')
        status = `Tenant pays $${resp.value ?? 0}/month`;
      else status = e.notes?.trim() || 'Tenant-paid';
    }
    return { key, name, status };
  }).filter(Boolean) as { key: string; name: string; status: string }[];

  // Any non-standard keys from the API.
  if (bills) {
    for (const [key, e] of Object.entries(bills)) {
      if (CATEGORIES.some((c) => c.key === key)) continue;
      if (!e || typeof e !== 'object') continue;
      const label = key
        .replace(/_/g, ' ')
        .replace(/\b\w/g, (c) => c.toUpperCase());
      const provider = (e.provider || '').trim();
      const name = provider ? `${label} (${provider})` : label;
      rows.push({
        key,
        name,
        status: e.included
          ? 'Included in rent'
          : e.notes?.trim() || 'Tenant-paid',
      });
    }
  }

  if (rows.length === 0) {
    if (fallback && !fallback.toLowerCase().includes('no bills')) {
      return (
        <p className={`text-sm text-slate-700 ${className}`}>{fallback}</p>
      );
    }
    return (
      <p className={`text-sm text-slate-500 ${className}`}>
        No utilities recorded on this lease.
      </p>
    );
  }

  return (
    <ul className={`space-y-1 text-sm text-slate-800 ${className}`}>
      {rows.map((r) => (
        <li key={r.key} className="flex flex-wrap gap-x-2">
          <span className="font-medium">{r.name}</span>
          <span className="text-slate-500">— {r.status}</span>
        </li>
      ))}
    </ul>
  );
}

export default function BillsEditor({
  value,
  onSave,
  saving,
  title = 'Bills & Utilities',
  hint,
}: {
  value: BillsMap;
  onSave: (bills: BillsMap) => Promise<void> | void;
  saving?: boolean;
  title?: string;
  hint?: string;
}) {
  const [rows, setRows] = useState<Record<string, RowState>>(() =>
    toRows(value)
  );
  const [dirty, setDirty] = useState(false);

  const update = (key: string, patch: Partial<RowState>) => {
    setRows((prev) => ({ ...prev, [key]: { ...prev[key], ...patch } }));
    setDirty(true);
  };

  return (
    <div className="space-y-3">
      <div>
        <p className="text-sm font-medium">{title}</p>
        {hint && <p className="text-xs text-slate-500">{hint}</p>}
      </div>
      <div className="space-y-2">
        {CATEGORIES.map(({ key, label }) => {
          const r = rows[key];
          return (
            <div
              key={key}
              className="flex flex-wrap items-center gap-2 text-sm"
            >
              <span className="w-36 shrink-0 text-slate-700">{label}</span>
              <select
                value={r.status}
                onChange={(e) =>
                  update(key, { status: e.target.value as RowStatus })
                }
                className="rounded-md border px-2 py-1"
                style={{ borderColor: 'hsl(var(--line))' }}
              >
                <option value="unset">Not applicable</option>
                <option value="included">Included in rent</option>
                <option value="tenant">Tenant pays</option>
              </select>
              {r.status !== 'unset' && (
                <input
                  placeholder="Provider (optional)"
                  value={r.provider}
                  onChange={(e) => update(key, { provider: e.target.value })}
                  className="min-w-0 flex-1 rounded-md border px-2 py-1"
                  style={{ borderColor: 'hsl(var(--line))' }}
                />
              )}
              {r.status === 'tenant' && (
                <span className="flex items-center gap-1">
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={r.percent}
                    onChange={(e) =>
                      update(key, { percent: Number(e.target.value) })
                    }
                    className="w-16 rounded-md border px-2 py-1"
                    style={{ borderColor: 'hsl(var(--line))' }}
                  />
                  <span className="text-slate-500">%</span>
                </span>
              )}
            </div>
          );
        })}
      </div>
      <button
        onClick={async () => {
          await onSave(toBills(rows));
          setDirty(false);
        }}
        disabled={!dirty || saving}
        className="inline-flex items-center gap-1.5 rounded-lg bg-[hsl(var(--brand))] px-3 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
      >
        {saving && <Loader2 className="h-4 w-4 animate-spin" />}
        Save bills
      </button>
    </div>
  );
}
