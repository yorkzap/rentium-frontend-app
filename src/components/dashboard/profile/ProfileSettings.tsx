// ProfileSettings.tsx

'use client';

import { useEffect, useState } from 'react';
import { Loader2, Save, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { DJANGO_API_URL } from '@/lib/config';
import PhoneInput from '@/components/form/PhoneInput';
import { Field, TextInput } from '@/components/form/Fields';
import {
  fetchRamaSettings,
  updateRamaSettings,
  type RamaSettings,
} from '@/lib/ramaApi';

/**
 * Account settings — profile fields that write to the API, plus (for
 * landlords) per-account RAMA preferences: enable, provider, model.
 * Memory stays on the server, scoped to this landlord only.
 * Rendered as the "Account & RAMA" tab of /dashboard/settings.
 */

const PROVIDER_LABELS: Record<string, string> = {
  xai: 'xAI (Grok)',
  gemini: 'Google Gemini',
  mistral: 'Mistral AI',
  anthropic: 'Anthropic (Claude)',
  openai: 'OpenAI',
};

export default function ProfileSettings() {
  const { user, token } = useAuth();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string>();

  const [rama, setRama] = useState<RamaSettings | null>(null);
  const [ramaEnabled, setRamaEnabled] = useState(false);
  const [ramaProvider, setRamaProvider] = useState('xai');
  const [ramaModel, setRamaModel] = useState('');
  const [ramaApiKey, setRamaApiKey] = useState('');
  const [ramaSaving, setRamaSaving] = useState(false);
  // Optional decision-layer (General) model — blank provider = use main model.
  const [genProvider, setGenProvider] = useState('');
  const [genModel, setGenModel] = useState('');
  const [genApiKey, setGenApiKey] = useState('');
  const [genHasKey, setGenHasKey] = useState(false);
  const isLandlord =
    (user as { user_type?: string } | null)?.user_type === 'LANDLORD';

  useEffect(() => {
    setName(user?.name ?? '');
    setPhone((user as { phone?: string })?.phone ?? '');
  }, [user]);

  useEffect(() => {
    if (!token || !isLandlord) return;
    fetchRamaSettings(token)
      .then((s) => {
        setRama(s);
        setRamaEnabled(s.enabled);
        setRamaProvider(s.provider);
        setRamaModel(s.model);
        setRamaApiKey('');
        setGenProvider(s.general?.provider ?? '');
        setGenModel(s.general?.model ?? '');
        setGenHasKey(Boolean(s.general?.has_key));
        setGenApiKey('');
      })
      .catch(() => setRama(null));
  }, [token, isLandlord]);

  const save = async () => {
    if (!token) return;
    setSaving(true);
    setError(undefined);
    try {
      const res = await fetch(`${DJANGO_API_URL}/users/me/`, {
        method: 'PATCH',
        headers: {
          Authorization: `Token ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name, phone }),
      });
      const body = await res.json();
      if (!res.ok) {
        setError(body.phone?.[0]);
        throw new Error(body.detail ?? body.name?.[0] ?? "Couldn't save.");
      }
      toast.success('Saved.');
    } catch (e) {
      if (!error)
        toast.error(e instanceof Error ? e.message : "Couldn't save.");
    } finally {
      setSaving(false);
    }
  };

  const saveRama = async () => {
    if (!token) return;
    setRamaSaving(true);
    try {
      const payload: {
        enabled: boolean;
        provider: string;
        model: string;
        api_key?: string;
        general?: {
          provider: string;
          model?: string;
          api_key?: string;
        };
      } = {
        enabled: ramaEnabled,
        provider: ramaProvider,
        model: ramaModel,
      };
      if (ramaApiKey.trim()) {
        payload.api_key = ramaApiKey.trim();
      }
      // Decision layer: blank provider clears the override (General uses main).
      payload.general = {
        provider: genProvider,
        model: genProvider ? genModel : '',
      };
      if (genProvider && genApiKey.trim()) {
        payload.general.api_key = genApiKey.trim();
      }
      const next = await updateRamaSettings(token, payload);
      setRama(next);
      setRamaModel(next.model);
      setRamaApiKey('');
      if (next.enabled && !next.configured) {
        toast.warning('Saved — paste an API key to finish enabling chat.');
      } else {
        toast.success(
          next.enabled
            ? 'RAMA is on for your account.'
            : 'RAMA is off for your account.'
        );
      }
    } catch (e) {
      toast.error(
        e instanceof Error ? e.message : "Couldn't save RAMA settings."
      );
    } finally {
      setRamaSaving(false);
    }
  };

  const modelsForProvider = rama?.models?.[ramaProvider] ?? [];
  const modelsForGen = rama?.models?.[genProvider] ?? [];
  const hasKey = Boolean(rama?.has_api_key) || Boolean(ramaApiKey.trim());
  const genReady =
    !genProvider ||
    genHasKey ||
    Boolean(genApiKey.trim()) ||
    genProvider === ramaProvider ||
    Boolean(rama?.platform_ready?.[genProvider]);

  const initials = (user?.name || user?.email || '?')
    .split(/[\s@.]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((s) => s[0]?.toUpperCase())
    .join('');

  return (
    <div>
      <section className="card p-6">
        <div className="mb-6 flex items-center gap-4">
          <span className="flex h-14 w-14 items-center justify-center rounded-full bg-[hsl(var(--brand))] text-lg font-semibold text-white">
            {initials}
          </span>
          <div>
            <p className="font-medium">{user?.name || user?.email}</p>
            <p className="text-sm text-[hsl(var(--ink-4))]">{user?.email}</p>
          </div>
        </div>

        <div className="space-y-4">
          <Field
            label="Full name"
            hint="This appears on the leases you send out."
          >
            <TextInput
              value={name}
              onChange={setName}
              placeholder="Raj Singh"
            />
          </Field>

          <PhoneInput
            value={phone}
            onChange={setPhone}
            label="Phone"
            error={error}
          />

          <Field
            label="Email"
            hint="Changing your email needs re-verification — talk to us if you need to."
          >
            <input
              value={user?.email ?? ''}
              disabled
              className="field cursor-not-allowed bg-[hsl(var(--surface-sunken))] text-[hsl(var(--ink-4))]"
            />
          </Field>
        </div>

        <button
          type="button"
          onClick={save}
          disabled={saving}
          className="mt-6 flex items-center gap-2 rounded-lg bg-[hsl(var(--brand))] px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-[hsl(var(--brand-hover))] disabled:opacity-60"
        >
          {saving ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Save className="h-4 w-4" />
          )}
          Save
        </button>
      </section>

      {isLandlord && rama && (
        <section className="card mt-6 p-6">
          <div className="mb-4 flex items-start gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[hsl(var(--brand)/0.12)] text-[hsl(var(--brand))]">
              <Sparkles className="h-5 w-5" />
            </span>
            <div>
              <h2 className="text-base font-semibold">RAMA</h2>
              <p className="mt-0.5 text-sm text-[hsl(var(--ink-4))]">
                Your private portfolio assistant. Chat history stays on your
                account only — never mixed with other landlords.
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <label className="flex cursor-pointer items-center justify-between gap-4 rounded-xl border px-4 py-3">
              <div>
                <p className="text-sm font-medium">Enable RAMA</p>
                <p className="text-xs text-[hsl(var(--ink-4))]">
                  Shows the Ask RAMA button on your dashboard when on.
                </p>
              </div>
              <input
                type="checkbox"
                checked={ramaEnabled}
                onChange={(e) => setRamaEnabled(e.target.checked)}
                className="h-5 w-5 accent-[hsl(var(--brand))]"
              />
            </label>

            <Field
              label="Provider"
              hint="Any provider works with your own key — small models are fine; RAMA is built for them."
            >
              <select
                value={ramaProvider}
                onChange={(e) => {
                  const p = e.target.value;
                  setRamaProvider(p);
                  const first = rama.models?.[p]?.[0]?.id;
                  if (first) setRamaModel(first);
                }}
                className="field"
              >
                {(rama.providers ?? []).map((p) => (
                  <option key={p} value={p}>
                    {PROVIDER_LABELS[p] ?? p}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Model">
              <select
                value={ramaModel}
                onChange={(e) => setRamaModel(e.target.value)}
                className="field"
              >
                {modelsForProvider.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.label}
                  </option>
                ))}
              </select>
            </Field>

            <Field
              label="API key"
              hint={
                rama?.has_api_key
                  ? 'A key is already saved. Leave blank to keep it, or paste a new one to rotate.'
                  : 'Paste your key (Gemini AI Studio, console.x.ai, etc.). Stored on your account only.'
              }
            >
              <input
                type="password"
                autoComplete="off"
                value={ramaApiKey}
                onChange={(e) => setRamaApiKey(e.target.value)}
                placeholder={
                  rama?.has_api_key
                    ? '••••••••  (saved — leave blank to keep)'
                    : ramaProvider === 'xai'
                      ? 'xai-...'
                      : ramaProvider === 'gemini'
                        ? 'Gemini API key from AI Studio'
                        : ramaProvider === 'mistral'
                          ? 'Mistral API key from console.mistral.ai'
                          : 'sk-...'
                }
                className="field font-mono text-sm"
              />
            </Field>

            {ramaEnabled && !hasKey && (
              <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-900">
                Add an API key to use chat.{' '}
                {ramaProvider === 'gemini' ? (
                  <>
                    Gemini:{' '}
                    <a
                      href="https://aistudio.google.com/apikey"
                      target="_blank"
                      rel="noreferrer"
                      className="underline"
                    >
                      Google AI Studio
                    </a>
                    . Project name/number not needed — only the key.
                  </>
                ) : ramaProvider === 'xai' ? (
                  <>
                    Grok:{' '}
                    <a
                      href="https://console.x.ai/"
                      target="_blank"
                      rel="noreferrer"
                      className="underline"
                    >
                      console.x.ai
                    </a>{' '}
                    (needs credits on the team).
                  </>
                ) : ramaProvider === 'mistral' ? (
                  <>
                    Mistral:{' '}
                    <a
                      href="https://console.mistral.ai/"
                      target="_blank"
                      rel="noreferrer"
                      className="underline"
                    >
                      console.mistral.ai
                    </a>
                    .
                  </>
                ) : (
                  <>Paste a key from your provider console.</>
                )}
              </p>
            )}
          </div>

          {/* Decision layer — an optional smarter model for the General. */}
          <div className="mt-6 rounded-xl border border-[hsl(var(--line))] p-4">
            <label className="flex items-start gap-3">
              <input
                type="checkbox"
                checked={Boolean(genProvider)}
                onChange={(e) => {
                  if (e.target.checked) {
                    const p =
                      ramaProvider || rama.providers?.[0] || 'anthropic';
                    setGenProvider(p);
                    setGenModel(rama.models?.[p]?.[0]?.id ?? '');
                  } else {
                    setGenProvider('');
                    setGenModel('');
                  }
                }}
                className="mt-0.5 h-4 w-4 accent-[hsl(var(--brand))]"
              />
              <span>
                <span className="text-sm font-medium">
                  Use a smarter model for the General (decision layer)
                </span>
                <span className="mt-0.5 block text-xs text-[hsl(var(--ink-4))]">
                  The General routes and plans; the Corporal (your main model
                  above) does the work. Any provider — Claude, Grok, OpenAI,
                  Gemini, Mistral. Off = the General uses your main model.
                </span>
              </span>
            </label>

            {genProvider && (
              <div className="mt-4 space-y-4">
                <Field label="Decision-layer provider">
                  <select
                    value={genProvider}
                    onChange={(e) => {
                      const p = e.target.value;
                      setGenProvider(p);
                      setGenModel(rama.models?.[p]?.[0]?.id ?? '');
                    }}
                    className="field"
                  >
                    {(rama.providers ?? []).map((p) => (
                      <option key={p} value={p}>
                        {PROVIDER_LABELS[p] ?? p}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Decision-layer model">
                  <select
                    value={genModel}
                    onChange={(e) => setGenModel(e.target.value)}
                    className="field"
                  >
                    {modelsForGen.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.label}
                      </option>
                    ))}
                  </select>
                </Field>
                {genProvider !== ramaProvider && (
                  <Field
                    label="Decision-layer API key"
                    hint={
                      genHasKey
                        ? 'A key is saved for this provider. Leave blank to keep it.'
                        : "This layer uses a different provider than your main model, so it needs its own key (or the platform's, if available)."
                    }
                  >
                    <input
                      type="password"
                      autoComplete="off"
                      value={genApiKey}
                      onChange={(e) => setGenApiKey(e.target.value)}
                      placeholder={
                        genHasKey
                          ? '••••••••  (saved — leave blank to keep)'
                          : 'Paste this provider’s key'
                      }
                      className="field font-mono text-sm"
                    />
                  </Field>
                )}
                {ramaEnabled && !genReady && (
                  <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-900">
                    Add a key for this provider, or the General will fall back
                    to your main model.
                  </p>
                )}
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={saveRama}
            disabled={ramaSaving}
            className="mt-6 flex items-center gap-2 rounded-lg bg-[hsl(var(--brand))] px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-[hsl(var(--brand-hover))] disabled:opacity-60"
          >
            {ramaSaving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            Save RAMA settings
          </button>
        </section>
      )}
    </div>
  );
}
