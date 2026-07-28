// RamaRoleModelCard.tsx

'use client';

import { Field } from '@/components/form/Fields';
import type {
  RamaRoleSpec,
  RamaSettings,
  RamaRoleModelPatch,
} from '@/lib/ramaApi';

/**
 * One role's optional model override, rendered from its RAMA_ROLES row.
 *
 * Every role that can have its own model gets the same card, so adding a role
 * is a row in RAMA_ROLES rather than another copy of this JSX. Off means the
 * role falls back to the main model above — which is the honest default, since
 * RAMA is built to work on a weak model.
 */

export interface RoleDraft {
  provider: string;
  model: string;
  apiKey: string;
  hasKey: boolean;
}

export const emptyDraft: RoleDraft = {
  provider: '',
  model: '',
  apiKey: '',
  hasKey: false,
};

/** Turn a draft into the PATCH shape. Blank provider clears the override. */
export function draftToPatch(draft: RoleDraft): RamaRoleModelPatch {
  const patch: RamaRoleModelPatch = {
    provider: draft.provider,
    model: draft.provider ? draft.model : '',
  };
  if (draft.provider && draft.apiKey.trim()) {
    patch.api_key = draft.apiKey.trim();
  }
  return patch;
}

export default function RamaRoleModelCard({
  role,
  settings,
  providerLabels,
  mainProvider,
  ramaEnabled,
  draft,
  onChange,
}: {
  role: RamaRoleSpec;
  settings: RamaSettings;
  providerLabels: Record<string, string>;
  mainProvider: string;
  ramaEnabled: boolean;
  draft: RoleDraft;
  onChange: (next: RoleDraft) => void;
}) {
  const models = settings.models?.[draft.provider] ?? [];
  const set = (patch: Partial<RoleDraft>) => onChange({ ...draft, ...patch });

  // A different provider than the main model needs its own key, unless the
  // platform already has one for it.
  const needsOwnKey =
    Boolean(draft.provider) && draft.provider !== mainProvider;
  const ready =
    !draft.provider ||
    !needsOwnKey ||
    draft.hasKey ||
    Boolean(draft.apiKey.trim()) ||
    Boolean(settings.platform_ready?.[draft.provider]);

  return (
    <div className="mt-4 rounded-xl border border-[hsl(var(--line))] p-4">
      <label className="flex items-start gap-3">
        <input
          type="checkbox"
          checked={Boolean(draft.provider)}
          onChange={(e) => {
            if (e.target.checked) {
              const provider =
                mainProvider || settings.providers?.[0] || 'anthropic';
              set({
                provider,
                model: settings.models?.[provider]?.[0]?.id ?? '',
              });
            } else {
              set({ provider: '', model: '' });
            }
          }}
          className="mt-0.5 h-4 w-4 accent-[hsl(var(--brand))]"
        />
        <span>
          <span className="text-sm font-medium">
            Give the {role.label} its own model
          </span>
          <span className="mt-0.5 block text-xs text-[hsl(var(--ink-4))]">
            {role.blurb} Off = it uses your main model.
          </span>
        </span>
      </label>

      {draft.provider && (
        <div className="mt-4 space-y-4">
          <Field label={`${role.label} provider`}>
            <select
              value={draft.provider}
              onChange={(e) => {
                const provider = e.target.value;
                set({
                  provider,
                  model: settings.models?.[provider]?.[0]?.id ?? '',
                });
              }}
              className="field"
            >
              {(settings.providers ?? []).map((p) => (
                <option key={p} value={p}>
                  {providerLabels[p] ?? p}
                </option>
              ))}
            </select>
          </Field>

          <Field label={`${role.label} model`}>
            <select
              value={draft.model}
              onChange={(e) => set({ model: e.target.value })}
              className="field"
            >
              {models.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.label}
                </option>
              ))}
            </select>
          </Field>

          {needsOwnKey && (
            <Field
              label={`${role.label} API key`}
              hint={
                draft.hasKey
                  ? 'A key is saved for this provider. Leave blank to keep it.'
                  : 'This role uses a different provider than your main model, so it needs its own key (or the platform’s, if available).'
              }
            >
              <input
                type="password"
                autoComplete="off"
                value={draft.apiKey}
                onChange={(e) => set({ apiKey: e.target.value })}
                placeholder={
                  draft.hasKey
                    ? '••••••••  (saved — leave blank to keep)'
                    : 'Paste this provider’s key'
                }
                className="field font-mono text-sm"
              />
            </Field>
          )}

          {ramaEnabled && !ready && (
            <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-900">
              Add a key for this provider, or the {role.label} will fall back to
              your main model.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
