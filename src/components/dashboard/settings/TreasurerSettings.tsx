// TreasurerSettings.tsx — the finance head: consent, open questions, history.

'use client';

import { useCallback, useEffect, useState } from 'react';
import { HelpCircle, Loader2, Save, TrendingUp } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { Field } from '@/components/form/Fields';
import {
  fetchTreasurerSettings,
  updateTreasurerProfile,
  type TreasurerSettings as Settings,
} from '@/lib/ramaApi';

/**
 * Four things you need to see about a background finance agent: what it may
 * know about you, what it is still waiting on, what it has concluded, and
 * where the data it reasons over is missing.
 *
 * Nothing personal here is read unless consent is on. Withdrawing consent
 * takes effect immediately and does NOT blank the fields — the Treasurer just
 * stops reading them, so turning it back on doesn't mean typing it all again.
 *
 * Holding financials, valuations and mortgages are deliberately not editable
 * here: they go through the General's confirm-previewed tools, because the
 * agent that concludes "your equity looks strong" must not be the one that
 * types in the valuation.
 */
export default function TreasurerSettings() {
  const { token } = useAuth();
  const [data, setData] = useState<Settings | null>(null);
  const [saving, setSaving] = useState(false);
  const [rate, setRate] = useState('');
  const [band, setBand] = useState('');
  const [filing, setFiling] = useState('');

  const apply = useCallback((next: Settings) => {
    setData(next);
    setRate(next.profile.self_reported_marginal_rate ?? '');
    setBand(next.profile.employment_income_band);
    setFiling(next.profile.filing_situation);
  }, []);

  useEffect(() => {
    if (!token) return;
    fetchTreasurerSettings(token)
      .then(apply)
      .catch(() => setData(null));
  }, [token, apply]);

  const patch = async (
    payload: Parameters<typeof updateTreasurerProfile>[1]
  ) => {
    if (!token) return;
    setSaving(true);
    try {
      apply(await updateTreasurerProfile(token, payload));
      toast.success('Saved.');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't save.");
    } finally {
      setSaving(false);
    }
  };

  if (!data) {
    return (
      <section className="card p-6">
        <p className="flex items-center gap-2 text-sm text-[hsl(var(--ink-4))]">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading…
        </p>
      </section>
    );
  }

  const consented = data.profile.consented;

  return (
    <div className="space-y-6">
      <section className="card p-6">
        <div className="mb-4 flex items-start gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[hsl(var(--brand)/0.12)] text-[hsl(var(--brand))]">
            <TrendingUp className="h-5 w-5" />
          </span>
          <div>
            <h2 className="text-base font-semibold">Treasurer</h2>
            <p className="mt-0.5 text-sm text-[hsl(var(--ink-4))]">
              Your finance head. It works out where money is being lost and
              where it could be made, and it reads only — anything it recommends
              comes back to you as a plan from the General.
            </p>
          </div>
        </div>

        <label className="flex cursor-pointer items-start justify-between gap-4 rounded-xl border border-[hsl(var(--line))] px-4 py-3">
          <span>
            <span className="text-sm font-medium">
              Let it use my tax situation
            </span>
            <span className="mt-0.5 block text-xs text-[hsl(var(--ink-4))]">
              Rental income is taxed on top of your employment income, so a
              marginal rate is what turns &ldquo;this saves money&rdquo; into a
              number. Off, it leaves every tax figure out and says why. Turning
              it off later stops it reading these — it doesn&apos;t erase them.
            </span>
          </span>
          <input
            type="checkbox"
            checked={consented}
            onChange={(e) => patch({ consented: e.target.checked })}
            className="mt-0.5 h-5 w-5 shrink-0 accent-[hsl(var(--brand))]"
          />
        </label>

        {consented && (
          <div className="mt-4 space-y-4">
            <Field
              label="Your marginal tax rate (%)"
              hint="The preferred input — one number, less revealing than a salary and more accurate than guessing a rate from one. It's what an accountant would hand you."
            >
              <input
                value={rate}
                onChange={(e) => setRate(e.target.value)}
                inputMode="decimal"
                placeholder="e.g. 28.20"
                className="field"
              />
            </Field>

            <Field
              label="Employment income band"
              hint="Only used if you haven't given a rate above. Bands, never exact dollars."
            >
              <select
                value={band}
                onChange={(e) => setBand(e.target.value)}
                className="field"
              >
                <option value="">—</option>
                {data.choices.income_bands.map((b) => (
                  <option key={b.value} value={b.value}>
                    {b.label}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="How the property is held">
              <select
                value={filing}
                onChange={(e) => setFiling(e.target.value)}
                className="field"
              >
                <option value="">—</option>
                {data.choices.filing_situations.map((f) => (
                  <option key={f.value} value={f.value}>
                    {f.label}
                  </option>
                ))}
              </select>
            </Field>

            <button
              type="button"
              onClick={() =>
                patch({
                  self_reported_marginal_rate: rate,
                  employment_income_band: band,
                  filing_situation: filing,
                })
              }
              disabled={saving}
              className="flex items-center gap-2 rounded-lg bg-[hsl(var(--brand))] px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-[hsl(var(--brand-hover))] disabled:opacity-60"
            >
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              Save
            </button>
          </div>
        )}
      </section>

      {data.requests.length > 0 && (
        <section className="card p-6">
          <h3 className="flex items-center gap-2 text-sm font-semibold">
            <HelpCircle className="h-4 w-4 text-[hsl(var(--brand))]" />
            It needs these from you
          </h3>
          <p className="mt-0.5 text-xs text-[hsl(var(--ink-4))]">
            Answer any of these in chat and it picks the analysis back up.
          </p>
          <ul className="mt-4 space-y-2">
            {data.requests.map((r) => (
              <li
                key={r.id}
                className="rounded-xl border border-[hsl(var(--line))] px-4 py-3"
              >
                <p className="text-sm font-medium">{r.question}</p>
                {r.why_it_matters && (
                  <p className="mt-0.5 text-xs text-[hsl(var(--ink-4))]">
                    {r.why_it_matters}
                  </p>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}

      {data.data_gaps.length > 0 && (
        <section className="card p-6">
          <h3 className="text-sm font-semibold">
            What it can&apos;t work out yet
          </h3>
          <p className="mt-0.5 text-xs text-[hsl(var(--ink-4))]">
            Tell RAMA any of these in chat and it will record them for you.
          </p>
          <ul className="mt-4 space-y-2">
            {data.data_gaps.map((gap) => (
              <li
                key={gap.holding}
                className="rounded-xl border border-[hsl(var(--line))] px-4 py-3"
              >
                <p className="text-sm font-medium">{gap.holding}</p>
                <p className="mt-0.5 text-xs text-[hsl(var(--ink-4))]">
                  Missing: {gap.missing.join(', ')}.
                </p>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="card p-6">
        <h3 className="text-sm font-semibold">What it has looked at</h3>
        {data.deliberations.length === 0 ? (
          <p className="mt-4 rounded-xl border border-dashed border-[hsl(var(--line))] px-4 py-6 text-center text-sm text-[hsl(var(--ink-4))]">
            Nothing yet. It looks at your highest-spend property once a week, or
            you can ask it something directly from the RAMA panel.
          </p>
        ) : (
          <ul className="mt-4 space-y-2">
            {data.deliberations.map((d) => (
              <li
                key={d.id}
                className="rounded-xl border border-[hsl(var(--line))] px-4 py-3"
              >
                <p className="text-sm font-medium">{d.question}</p>
                <p className="mt-1 text-xs text-[hsl(var(--ink-5))]">
                  {d.holding ? `${d.holding} · ` : ''}
                  {d.status.toLowerCase()} ·{' '}
                  {d.trigger === 'beat' ? 'weekly check' : 'you asked'} ·{' '}
                  {new Date(d.created_at).toLocaleDateString()}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
