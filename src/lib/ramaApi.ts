// ramaApi.ts — the read-only Q&A agent (RAMA v1).
// Preferences are per-landlord; platform API keys stay on the server.
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
  can_override: boolean;
  providers: string[];
  models: Record<string, RamaModelOption[]>;
  platform_ready?: Record<string, boolean>;
}

export interface RamaSettings {
  enabled: boolean;
  provider: string;
  model: string;
  providers: string[];
  models: Record<string, RamaModelOption[]>;
  platform_ready: Record<string, boolean>;
  configured?: boolean;
}

export interface RamaReply {
  conversation_id: string;
  reply: string;
  provider: string;
  model: string;
  tools_used: string[];
}

function headers(token: string): Record<string, string> {
  return {
    Authorization: `Token ${token}`,
    'Content-Type': 'application/json',
  };
}

async function handle(res: Response) {
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    const msg =
      typeof body.detail === 'string'
        ? body.detail
        : `Request failed (${res.status})`;
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
  payload: Partial<Pick<RamaSettings, 'enabled' | 'provider' | 'model'>>
): Promise<RamaSettings> {
  const res = await fetch(`${DJANGO_API_URL}/rama/settings/`, {
    method: 'PATCH',
    headers: headers(token),
    body: JSON.stringify(payload),
  });
  return handle(res);
}

export async function sendRamaMessage(
  token: string,
  payload: {
    message: string;
    conversation_id?: string;
  }
): Promise<RamaReply> {
  const res = await fetch(`${DJANGO_API_URL}/rama/chat/`, {
    method: 'POST',
    headers: headers(token),
    body: JSON.stringify(payload),
  });
  return handle(res);
}
