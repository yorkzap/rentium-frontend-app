// chatApi.ts
//
// The prospect's tokenized chat thread. The token is a per-conversation
// capability carried by their emailed link — no account, no login. The backend
// payload is PII-minimized (listing name + landlord name + messages only).
import { DJANGO_API_URL } from '@/lib/config';

export interface ChatMessage {
  body: string;
  from_landlord: boolean;
  created_at: string;
}

export interface ChatThread {
  subject: string;
  listing: string;
  landlord_name: string;
  prospect_name: string;
  messages: ChatMessage[];
}

async function handle(res: Response) {
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    const msg =
      body.detail ||
      (typeof body === 'object' && body
        ? Object.values(body).flat().join(' ')
        : '') ||
      `Request failed (${res.status})`;
    throw new Error(
      typeof msg === 'string' ? msg : `Request failed (${res.status})`
    );
  }
  return res.json();
}

export async function fetchChatThread(token: string): Promise<ChatThread> {
  const res = await fetch(`${DJANGO_API_URL}/public/chat/${token}/`);
  return handle(res);
}

export async function sendChatMessage(
  token: string,
  body: string
): Promise<ChatThread> {
  const res = await fetch(`${DJANGO_API_URL}/public/chat/${token}/send/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ body }),
  });
  return handle(res);
}
