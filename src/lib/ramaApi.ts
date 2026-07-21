// ramaApi.ts — the read-only Q&A agent (RAMA v1).
// Preferences + optional BYOK API key are per-landlord.
import { DJANGO_API_URL } from '@/lib/config';

export interface RamaModelOption {
  id: string;
  label: string;
}

export interface RamaConfig {
  enabled: boolean;
  configured: boolean;
  provider: string;
  model: string;
  has_api_key?: boolean;
  can_override: boolean;
  providers: string[];
  models: Record<string, RamaModelOption[]>;
  platform_ready?: Record<string, boolean>;
  byok?: boolean;
}

/** A per-role (decision-layer / analysis) model override. Blank provider = use
 * the main model. Key is write-only; the server returns only has_key. */
export interface RamaRoleModel {
  provider: string;
  model: string;
  has_key: boolean;
}

export interface RamaSettings {
  enabled: boolean;
  provider: string;
  model: string;
  has_api_key: boolean;
  configured?: boolean;
  providers: string[];
  models: Record<string, RamaModelOption[]>;
  platform_ready: Record<string, boolean>;
  byok?: boolean;
  general?: RamaRoleModel;
  fsa?: RamaRoleModel;
}

/** Write shape for a per-role override. Omit a field to leave it; api_key '' keeps
 * the existing key, clear_api_key wipes it, provider '' clears the override. */
export interface RamaRoleModelPatch {
  provider?: string;
  model?: string;
  api_key?: string;
  clear_api_key?: boolean;
}

export interface RamaPlanStep {
  n: number;
  tool: string;
  target: string;
  status: string;
  requires_own_confirm: boolean;
}

export interface RamaBlockedItem {
  target: string;
  reason: string;
  detail: string;
  options?: string[];
}

// A multi-step plan awaiting the landlord's confirmation. Confirm/Cancel are
// just "yes"/"cancel" chat messages — the backend's deterministic confirm
// machine is the single authority, the buttons only make it language-proof.
export interface RamaPendingPlan {
  operation: string;
  summary: string;
  status: string;
  awaiting_own_confirm: boolean;
  steps: RamaPlanStep[];
  blocked: RamaBlockedItem[];
}

export interface RamaReply {
  conversation_id: string;
  reply: string;
  provider: string;
  model: string;
  tools_used: string[];
  pending_plan?: RamaPendingPlan | null;
}

// ----------------------------------------------------------- insights
export interface RamaInsightRow {
  id: number;
  kind: string;
  severity: 'INFO' | 'WARN' | 'URGENT';
  facts: Record<string, unknown>;
  analysis: string;
  status: 'OPEN' | 'ACKED' | 'ACTIONED' | 'DISMISSED';
  created_at: string;
}

export async function fetchInsights(
  token: string,
  status?: string
): Promise<{ insights: RamaInsightRow[] }> {
  const qs = status ? `?status=${encodeURIComponent(status)}` : '';
  const res = await fetch(`${DJANGO_API_URL}/rama/insights/${qs}`, {
    headers: headers(token),
  });
  return handle(res);
}

export async function updateInsightStatus(
  token: string,
  id: number,
  status: string
) {
  const res = await fetch(`${DJANGO_API_URL}/rama/insights/${id}/`, {
    method: 'PATCH',
    headers: headers(token),
    body: JSON.stringify({ status }),
  });
  return handle(res);
}

// ----------------------------------------------------------- holdings
export interface Holding {
  id: string;
  name: string;
  kind: string;
  address: string;
  city: string;
  listings: string[];
}

export async function fetchHoldings(
  token: string
): Promise<{ holdings: Holding[] }> {
  const res = await fetch(`${DJANGO_API_URL}/rama/holdings/`, {
    headers: headers(token),
  });
  return handle(res);
}

// -------------------------------------------------------- bank balances
export interface BankBalanceRow {
  id: number;
  holding: string | null;
  holding_id: string | null;
  label: string;
  balance: string;
  as_of: string;
  updated_via: string;
  stale: boolean;
  estimated_drift_since_reported: string;
}

export async function fetchBankBalances(
  token: string
): Promise<{ balances: BankBalanceRow[]; count: number }> {
  const res = await fetch(`${DJANGO_API_URL}/rama/bank-balances/`, {
    headers: headers(token),
  });
  return handle(res);
}

export async function setBankBalance(
  token: string,
  payload: {
    holding_id?: string;
    label?: string;
    balance: string;
    as_of?: string;
  }
): Promise<BankBalanceRow> {
  const res = await fetch(`${DJANGO_API_URL}/rama/bank-balances/`, {
    method: 'POST',
    headers: headers(token),
    body: JSON.stringify(payload),
  });
  return handle(res);
}

// -------------------------------------------------------------- comms
export interface ChannelAccount {
  id: number;
  channel_type: 'TELEGRAM' | 'EMAIL' | 'WHATSAPP';
  display_name: string;
  verified: boolean;
  is_active: boolean;
  prefs: Record<string, unknown>;
  link_code: string;
}

export interface TelegramLinkCode {
  link_code: string;
  expires_at: string;
  bot_username: string;
  instructions: string;
}

export async function fetchChannels(
  token: string
): Promise<{ channels: ChannelAccount[] }> {
  const res = await fetch(`${DJANGO_API_URL}/comms/channels/`, {
    headers: headers(token),
  });
  return handle(res);
}

export async function createTelegramLinkCode(
  token: string
): Promise<TelegramLinkCode> {
  const res = await fetch(
    `${DJANGO_API_URL}/comms/channels/telegram/link-code/`,
    { method: 'POST', headers: headers(token) }
  );
  return handle(res);
}

export async function updateChannel(
  token: string,
  id: number,
  payload: { is_active?: boolean; prefs?: Record<string, unknown> }
) {
  const res = await fetch(`${DJANGO_API_URL}/comms/channels/${id}/`, {
    method: 'PATCH',
    headers: headers(token),
    body: JSON.stringify(payload),
  });
  return handle(res);
}

export async function deleteChannel(token: string, id: number) {
  const res = await fetch(`${DJANGO_API_URL}/comms/channels/${id}/`, {
    method: 'DELETE',
    headers: headers(token),
  });
  if (!res.ok && res.status !== 204) return handle(res);
}

function headers(token: string): Record<string, string> {
  return {
    Authorization: `Token ${token}`,
    'Content-Type': 'application/json',
  };
}

async function handle(res: Response) {
  if (!res.ok) {
    const body = await res.json().catch(() => ({}) as { detail?: unknown });
    const detail = body?.detail;
    let msg =
      typeof detail === 'string' ? detail : `Request failed (${res.status})`;
    if (res.status === 429) {
      msg =
        (typeof detail === 'string' && detail) ||
        'Rate limit / free-tier quota hit. Wait a bit or enable billing on the AI provider.';
    }
    throw new Error(msg);
  }
  return res.json();
}

export async function fetchRamaConfig(token: string): Promise<RamaConfig> {
  const res = await fetch(`${DJANGO_API_URL}/rama/config/`, {
    headers: headers(token),
  });
  return handle(res);
}

export async function fetchRamaSettings(token: string): Promise<RamaSettings> {
  const res = await fetch(`${DJANGO_API_URL}/rama/settings/`, {
    headers: headers(token),
  });
  return handle(res);
}

export async function updateRamaSettings(
  token: string,
  payload: {
    enabled?: boolean;
    provider?: string;
    model?: string;
    api_key?: string;
    clear_api_key?: boolean;
    general?: RamaRoleModelPatch;
    fsa?: RamaRoleModelPatch;
  }
): Promise<RamaSettings> {
  const res = await fetch(`${DJANGO_API_URL}/rama/settings/`, {
    method: 'PATCH',
    headers: headers(token),
    body: JSON.stringify(payload),
  });
  return handle(res);
}

export type RamaRole = 'corporal' | 'general';

export interface ConstitutionSection {
  key: string;
  title: string;
  version: number;
  body_md: string;
  origin: string;
  updated: string;
}

export interface ConstitutionRule {
  id: number;
  rule_type: string;
  params: Record<string, unknown>;
  section: string | null;
}

export interface Constitution {
  sections: ConstitutionSection[];
  rules: ConstitutionRule[];
}

export async function fetchConstitution(token: string): Promise<Constitution> {
  const res = await fetch(`${DJANGO_API_URL}/rama/constitution/`, {
    headers: headers(token),
  });
  return handle(res);
}

export async function amendConstitution(
  token: string,
  payload: { key: string; title?: string; body_md?: string }
): Promise<Constitution> {
  const res = await fetch(`${DJANGO_API_URL}/rama/constitution/`, {
    method: 'POST',
    headers: headers(token),
    body: JSON.stringify(payload),
  });
  return handle(res);
}

/** Upload a photo the landlord attached in the RAMA chat; returns its staged
 * upload_id to pass back on the next message so RAMA can attach it to a listing. */
export async function uploadRamaPhoto(
  token: string,
  file: File
): Promise<string> {
  const form = new FormData();
  form.append('image', file);
  const res = await fetch(`${DJANGO_API_URL}/rama/upload/`, {
    method: 'POST',
    headers: { Authorization: `Token ${token}` }, // no Content-Type: browser sets multipart boundary
    body: form,
  });
  const data = await handle(res);
  return data.upload_id as string;
}

export async function sendRamaMessage(
  token: string,
  payload: {
    message: string;
    conversation_id?: string;
    upload_ids?: string[];
  },
  role: RamaRole = 'corporal'
): Promise<RamaReply> {
  const path = role === 'general' ? '/rama/general/chat/' : '/rama/chat/';
  try {
    // Tool loops can take a while (several provider round-trips).
    const res = await fetch(`${DJANGO_API_URL}${path}`, {
      method: 'POST',
      headers: headers(token),
      body: JSON.stringify(payload),
    });
    return await handle(res);
  } catch (err) {
    // Browser surfaces hard network failures as TypeError "Failed to fetch"
    // (tunnel down, CORS, offline, or connection reset mid-request).
    if (err instanceof TypeError) {
      throw new Error(
        'Could not reach the API (network or tunnel). Check that Docker and ' +
          'cloudflared are running, then try again. If this only happens on ' +
          'long questions, the free AI tier may have cut the connection — wait and retry.'
      );
    }
    throw err;
  }
}
