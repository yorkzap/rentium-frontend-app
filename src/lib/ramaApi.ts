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
  treasurer?: RamaRoleModel;
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
  attachments?: RamaReplyAttachment[];
}

export interface RamaPropertyMediaItem {
  handle: string;
  kind: 'primary' | 'gallery';
  id?: number;
  url: string;
  filename: string;
  caption?: string;
  selection_number: number;
}

export interface RamaPropertyMediaAttachment {
  kind: 'property_media';
  property_id: string;
  label: string;
  media: RamaPropertyMediaItem[];
}

export type RamaReplyAttachment =
  | RamaPropertyMediaAttachment
  | {
      kind: string;
      [key: string]: unknown;
    };

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
  const res = await fetch(ramaUrl(`/rama/insights/${qs}`), {
    headers: headers(token),
  });
  return handle(res);
}

export async function updateInsightStatus(
  token: string,
  id: number,
  status: string
) {
  const res = await fetch(ramaUrl(`/rama/insights/${id}/`), {
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
  const res = await fetch(ramaUrl('/rama/holdings/'), {
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
  const res = await fetch(ramaUrl('/rama/bank-balances/'), {
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
  const res = await fetch(ramaUrl('/rama/bank-balances/'), {
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

// Which portfolio RAMA acts on — set when a co-landlord picks an owner in the
// panel switcher. Appended as ?as=<owner_id> to every RAMA call so chat, config,
// constitution, insights etc. all operate on the same selected portfolio.
let _actingAs: string | null = null;
export function setActingPortfolio(ownerId: string | null) {
  _actingAs = ownerId;
}
export function getActingPortfolio(): string | null {
  return _actingAs;
}
function ramaUrl(path: string): string {
  const base = `${DJANGO_API_URL}${path}`;
  if (!_actingAs) return base;
  return (
    base +
    (path.includes('?') ? '&' : '?') +
    `as=${encodeURIComponent(_actingAs)}`
  );
}

export interface RamaPortfolio {
  owner_id: string;
  name: string;
  is_own: boolean;
  property_count: number;
}
export async function fetchPortfolios(token: string): Promise<{
  portfolios: RamaPortfolio[];
  acting_as: string;
  acting_name: string;
}> {
  const res = await fetch(`${DJANGO_API_URL}/rama/portfolios/`, {
    headers: headers(token),
  });
  return handle(res);
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
  const res = await fetch(ramaUrl('/rama/config/'), {
    headers: headers(token),
  });
  return handle(res);
}

export async function fetchRamaSettings(token: string): Promise<RamaSettings> {
  const res = await fetch(ramaUrl('/rama/settings/'), {
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
    treasurer?: RamaRoleModelPatch;
  }
): Promise<RamaSettings> {
  const res = await fetch(ramaUrl('/rama/settings/'), {
    method: 'PATCH',
    headers: headers(token),
    body: JSON.stringify(payload),
  });
  return handle(res);
}

export type RamaRole = 'corporal' | 'general' | 'fsa' | 'treasurer';

/** One row per role — the single place a role is described.
 *
 * Both the chat router and the settings cards read this, so adding a fifth
 * role is a row here rather than a new branch in each of them. `chatPath` is
 * null for roles that are only reachable through the General's delegation
 * (the FSA analyses sentinel findings; it has no chat surface of its own).
 */
export interface RamaRoleSpec {
  key: RamaRole;
  /** Backend key in RamaSettings / the PATCH payload. Corporal is the main
   * model, so it has no per-role override slot. */
  settingsKey: 'general' | 'fsa' | 'treasurer' | null;
  chatPath: string | null;
  label: string;
  /** Shown under the model card and in the chat header. */
  tagline: string;
  blurb: string;
}

export const RAMA_ROLES: readonly RamaRoleSpec[] = [
  {
    key: 'corporal',
    settingsKey: null,
    chatPath: '/rama/chat/',
    label: 'Ops',
    tagline: 'Your portfolio · asks before acting · private to you',
    blurb:
      'Does the work: lookups, edits, plans. This is your main model, set above.',
  },
  {
    key: 'general',
    settingsKey: 'general',
    chatPath: '/rama/general/chat/',
    label: 'General',
    tagline: 'Chief of staff · follows your Constitution',
    blurb:
      'Routes and plans, and relays what the other roles need from you. Give it your smartest model — it makes the decisions the others carry out.',
  },
  {
    key: 'fsa',
    settingsKey: 'fsa',
    chatPath: null,
    label: 'Analyst',
    tagline: 'Reads only · explains what the watchers found',
    blurb:
      'Turns a background finding (a low balance, a late-payment pattern) into a short explanation. Read-only, and never reachable directly.',
  },
  {
    key: 'treasurer',
    settingsKey: 'treasurer',
    chatPath: '/rama/treasurer/chat/',
    label: 'Treasurer',
    tagline: 'Finance head · reads only · never moves money',
    blurb:
      'Works out where money is being lost or could be made — retrofits, financing, rent, tax. Reads only: anything it recommends still comes to you as a plan from the General.',
  },
] as const;

export function ramaRole(key: RamaRole): RamaRoleSpec {
  const found = RAMA_ROLES.find((r) => r.key === key);
  if (!found) throw new Error(`Unknown RAMA role ${key}`);
  return found;
}

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
  const res = await fetch(ramaUrl('/rama/constitution/'), {
    headers: headers(token),
  });
  return handle(res);
}

export async function amendConstitution(
  token: string,
  payload: { key: string; title?: string; body_md?: string }
): Promise<Constitution> {
  const res = await fetch(ramaUrl('/rama/constitution/'), {
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
  const res = await fetch(ramaUrl('/rama/upload/'), {
    method: 'POST',
    headers: { Authorization: `Token ${token}` }, // no Content-Type: browser sets multipart boundary
    body: form,
  });
  const data = await handle(res);
  return data.upload_id as string;
}

export interface RamaAttachment {
  id: string;
  name: string;
  content_type: string;
  size: number;
  sequence: number;
  classification: 'UNKNOWN' | 'PROPERTY_PHOTO' | 'DOCUMENT';
  status: 'STAGED' | 'CLASSIFIED' | 'APPLIED' | 'REJECTED' | 'FAILED';
}

export interface RamaAttachmentBatch {
  batch_id: string;
  conversation_id: string;
  status: 'OPEN' | 'SEALED' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
  attachments: RamaAttachment[];
}

/** Stage one composer selection as an explicit, conversation-owned batch.
 * Additional picks append only when the same open batch_id is provided. */
export async function uploadRamaAttachmentBatch(
  token: string,
  files: File[],
  conversationId: string,
  batchId?: string
): Promise<RamaAttachmentBatch> {
  const form = new FormData();
  form.append('conversation_id', conversationId);
  if (batchId) form.append('batch_id', batchId);
  files.forEach((file) => form.append('files', file));
  const res = await fetch(ramaUrl('/rama/attachment-batches/'), {
    method: 'POST',
    headers: { Authorization: `Token ${token}` },
    body: form,
  });
  return handle(res);
}

export async function removeRamaAttachment(
  token: string,
  attachmentId: string
): Promise<RamaAttachmentBatch> {
  const res = await fetch(ramaUrl(`/rama/attachments/${attachmentId}/`), {
    method: 'DELETE',
    headers: { Authorization: `Token ${token}` },
  });
  return handle(res);
}

export interface RamaDocument {
  id: string;
  status:
    'QUEUED' | 'PROCESSING' | 'NEEDS_REVIEW' | 'READY' | 'FILED' | 'FAILED';
  kind: string;
  kind_display: string;
  title: string;
  issuer: string;
  reference_number: string;
  document_date: string | null;
  due_date: string | null;
  amount: string | null;
  currency: string;
  expense_category: string;
  payment_state: 'NOT_APPLICABLE' | 'PAID' | 'UNPAID' | 'UNKNOWN';
  holding_id: string | null;
  holding_name: string | null;
  property_id: number | null;
  property_name: string | null;
  portfolio_wide: boolean;
  clarification_question: string;
  original_filename: string;
  canonical_filename: string;
  archival_pdf: string | null;
  ledger_entry_id: string | null;
  failure_reason: string;
  created_at: string;
  filed_at: string | null;
  duplicate?: boolean;
}

export async function fetchRamaDocuments(
  token: string,
  opts?: { status?: string; page?: number; page_size?: number }
): Promise<{
  documents: RamaDocument[];
  pagination?: {
    page: number;
    page_size: number;
    total: number;
    has_next: boolean;
    has_prev: boolean;
  };
}> {
  const params = new URLSearchParams();
  if (opts?.status) params.set('status', opts.status);
  if (opts?.page) params.set('page', String(opts.page));
  if (opts?.page_size) params.set('page_size', String(opts.page_size));
  const query = params.toString() ? `?${params.toString()}` : '';
  const res = await fetch(ramaUrl(`/rama/documents/${query}`), {
    headers: headers(token),
  });
  return handle(res);
}

export async function deleteRamaDocument(
  token: string,
  id: string
): Promise<{ deleted: boolean; document_id: string }> {
  const res = await fetch(ramaUrl(`/rama/documents/${id}/`), {
    method: 'DELETE',
    headers: headers(token),
  });
  return handle(res);
}

export async function uploadRamaDocument(
  token: string,
  file: File
): Promise<RamaDocument> {
  const form = new FormData();
  form.append('file', file);
  const res = await fetch(ramaUrl('/rama/documents/'), {
    method: 'POST',
    headers: { Authorization: `Token ${token}` },
    body: form,
  });
  return handle(res);
}

export async function fileRamaDocument(
  token: string,
  id: string,
  payload: {
    holding_id?: string;
    property_id?: number;
    portfolio_wide?: boolean;
    kind?: string;
    title?: string;
    issuer?: string;
    reference_number?: string;
    document_date?: string;
    due_date?: string;
    amount?: string;
    expense_category?: string;
    payment_state?: string;
    clarification_answer?: string;
  }
): Promise<RamaDocument> {
  const res = await fetch(ramaUrl(`/rama/documents/${id}/`), {
    method: 'POST',
    headers: headers(token),
    body: JSON.stringify(payload),
  });
  return handle(res);
}

export async function downloadRamaDocument(
  token: string,
  document: RamaDocument
): Promise<void> {
  const res = await fetch(ramaUrl(`/rama/documents/${document.id}/download/`), {
    headers: { Authorization: `Token ${token}` },
  });
  if (!res.ok) await handle(res);
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const anchor = window.document.createElement('a');
  anchor.href = url;
  anchor.download = document.canonical_filename || document.original_filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

export async function sendRamaMessage(
  token: string,
  payload: {
    message: string;
    conversation_id?: string;
    upload_ids?: string[];
    document_ids?: string[];
    attachment_batch_id?: string;
  },
  role: RamaRole = 'corporal'
): Promise<RamaReply> {
  const path = ramaRole(role).chatPath;
  if (!path) {
    throw new Error(`The ${ramaRole(role).label} is not reachable directly.`);
  }
  try {
    // Tool loops can take a while (several provider round-trips).
    const res = await fetch(ramaUrl(path), {
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

// ---------------------------------------------------------------- memory
/** A durable preference RAMA holds for this landlord. Never a portfolio
 * figure — memory refuses money, dates and counts by design, because it is
 * injected into every prompt with no as-of date. */
export interface RamaMemoryRow {
  id: string;
  subject: string;
  fact: string;
  applies_to: string;
  source: string;
  personal_data: boolean;
  used: number;
  recorded: string;
}

export async function fetchRamaMemories(
  token: string,
  query = ''
): Promise<{ memories: RamaMemoryRow[] }> {
  const qs = query ? `?q=${encodeURIComponent(query)}` : '';
  const res = await fetch(ramaUrl(`/rama/memory/${qs}`), {
    headers: headers(token),
  });
  return handle(res);
}

/** Genuine erasure, not a status flag — a privacy request has to remove the
 * text. What survives in the audit is that something went, and when. */
export async function deleteRamaMemory(
  token: string,
  id: string
): Promise<{ deleted: boolean; subject: string }> {
  const res = await fetch(ramaUrl(`/rama/memory/${id}/`), {
    method: 'DELETE',
    headers: headers(token),
  });
  return handle(res);
}

// ---------------------------------------------------------- auto-actions
/** Something RAMA did without asking. An unattended write the landlord
 * cannot see is indistinguishable from a bug, so this is the receipt drawer. */
export interface RamaAutoActionRow {
  id: string;
  tool: string;
  target: string;
  status: string;
  conversation_id: string;
  undoable: boolean;
  created_at: string;
  undone_at: string | null;
}

export async function fetchRamaAutoActions(
  token: string
): Promise<{ auto_actions: RamaAutoActionRow[] }> {
  const res = await fetch(ramaUrl('/rama/auto-actions/'), {
    headers: headers(token),
  });
  return handle(res);
}

export async function undoRamaAutoAction(
  token: string,
  id: string
): Promise<{ undone?: boolean; error?: string }> {
  const res = await fetch(ramaUrl(`/rama/auto-actions/${id}/undo/`), {
    method: 'POST',
    headers: headers(token),
  });
  return handle(res);
}

// ------------------------------------------------------------- treasurer
export interface TreasurerProfile {
  consented: boolean;
  consent_scope: string;
  occupation: string;
  employment_income_band: string;
  other_income_band: string;
  filing_situation: string;
  tax_province: string;
  self_reported_marginal_rate: string | null;
}

export interface TreasurerRequestRow {
  id: string;
  question: string;
  why_it_matters: string;
  blocking: boolean;
  status: string;
  created_at: string;
}

export interface TreasurerDeliberationRow {
  id: string;
  topic: string;
  question: string;
  status: string;
  trigger: string;
  holding: string | null;
  created_at: string;
}

export interface TreasurerSettings {
  profile: TreasurerProfile;
  choices: {
    income_bands: { value: string; label: string }[];
    filing_situations: { value: string; label: string }[];
  };
  requests: TreasurerRequestRow[];
  deliberations: TreasurerDeliberationRow[];
  /** What the Treasurer cannot work out yet, named concretely — a percentage
   * would not tell you what to go and do. */
  data_gaps: { holding: string; missing: string[] }[];
}

export async function fetchTreasurerSettings(
  token: string
): Promise<TreasurerSettings> {
  const res = await fetch(ramaUrl('/rama/treasurer/'), {
    headers: headers(token),
  });
  return handle(res);
}

/** Writes only the consent gate and the personal fields behind it. Holding
 * financials, valuations and mortgages go through the General's confirmed
 * plans — the agent that concludes "your equity looks strong" must not be the
 * one that types in the valuation. */
export async function updateTreasurerProfile(
  token: string,
  payload: Partial<Omit<TreasurerProfile, 'consented' | 'consent_scope'>> & {
    consented?: boolean;
  }
): Promise<TreasurerSettings> {
  const res = await fetch(ramaUrl('/rama/treasurer/'), {
    method: 'PATCH',
    headers: headers(token),
    body: JSON.stringify(payload),
  });
  return handle(res);
}
