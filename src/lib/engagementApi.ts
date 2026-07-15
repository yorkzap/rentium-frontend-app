// src/lib/engagementApi.ts
// Client for notifications, messaging, and the calendar/agenda feed.

import { DJANGO_API_URL } from "@/lib/config"

function authHeaders(token: string, json = true): Record<string, string> {
  const h: Record<string, string> = { Authorization: `Token ${token}` }
  if (json) h["Content-Type"] = "application/json"
  return h
}

async function handle(res: Response) {
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    const msg =
      body.detail ||
      body.non_field_errors?.join?.(" ") ||
      (typeof body === "object" && body ? Object.values(body).flat().join(" ") : "") ||
      `Request failed (${res.status})`
    throw new Error(typeof msg === "string" && msg ? msg : `Request failed (${res.status})`)
  }
  if (res.status === 204) return null
  return res.json()
}

function unwrap<T>(data: any): T[] {
  if (Array.isArray(data)) return data
  if (data && Array.isArray(data.results)) return data.results
  return []
}

// ---------------------------------------------------------------- notifications
export type NotificationCategory = "MAINTENANCE" | "PAYMENT" | "LEASE" | "MESSAGE" | "SYSTEM"

export interface AppNotification {
  id: string
  category: NotificationCategory
  title: string
  body: string
  url: string
  is_read: boolean
  read_at: string | null
  created_at: string
}

const N = `${DJANGO_API_URL}/notifications`

export async function fetchNotifications(token: string, unreadOnly = false): Promise<AppNotification[]> {
  const path = unreadOnly ? `${N}/unread/` : `${N}/`
  const res = await fetch(path, { headers: authHeaders(token, false) })
  return unwrap<AppNotification>(await handle(res))
}

export async function fetchUnreadCount(token: string): Promise<number> {
  const res = await fetch(`${N}/unread_count/`, { headers: authHeaders(token, false) })
  const data = await handle(res)
  return data?.count ?? 0
}

export async function markNotificationRead(token: string, id: string): Promise<AppNotification> {
  const res = await fetch(`${N}/${id}/read/`, { method: "POST", headers: authHeaders(token) })
  return handle(res)
}

export async function markAllNotificationsRead(token: string): Promise<number> {
  const res = await fetch(`${N}/read_all/`, { method: "POST", headers: authHeaders(token) })
  const data = await handle(res)
  return data?.marked_read ?? 0
}

// ---------------------------------------------------------------- messaging
export interface ConversationSummary {
  id: string
  subject: string
  lease: string | null
  other_party: string
  last_message: { body: string; created_at: string } | null
  unread_count: number
  updated_at: string
}

export interface ChatMessage {
  id: string
  body: string
  sender_name: string
  is_mine: boolean
  read_at: string | null
  created_at: string
}

const MSG = `${DJANGO_API_URL}/messaging`

export async function fetchConversations(token: string): Promise<ConversationSummary[]> {
  const res = await fetch(`${MSG}/conversations/`, { headers: authHeaders(token, false) })
  return unwrap<ConversationSummary>(await handle(res))
}

export async function fetchMessages(token: string, conversationId: string): Promise<ChatMessage[]> {
  const res = await fetch(`${MSG}/conversations/${conversationId}/messages/`, { headers: authHeaders(token, false) })
  return unwrap<ChatMessage>(await handle(res))
}

export async function sendMessage(token: string, conversationId: string, body: string): Promise<ChatMessage> {
  const res = await fetch(`${MSG}/conversations/${conversationId}/send/`, {
    method: "POST", headers: authHeaders(token), body: JSON.stringify({ body }),
  })
  return handle(res)
}

export async function startConversation(
  token: string,
  payload: { tenant?: number | string; landlord?: number | string; lease?: string; subject?: string },
): Promise<ConversationSummary> {
  const res = await fetch(`${MSG}/conversations/`, {
    method: "POST", headers: authHeaders(token), body: JSON.stringify(payload),
  })
  return handle(res)
}

// ---------------------------------------------------------------- agenda
export type AgendaType =
  | "custom" | "inspection" | "reminder" | "move"
  | "lease_start" | "lease_end" | "charge_due" | "work_order"

export interface AgendaItem {
  date: string
  type: AgendaType
  title: string
  subtitle: string
  ref_id: string
  url: string
}

export interface AgendaEventInput {
  title: string
  notes?: string
  kind?: "CUSTOM" | "INSPECTION" | "REMINDER" | "MOVE"
  start_date: string
  end_date?: string | null
  property?: number | string | null
  lease?: string | null
}

const AG = `${DJANGO_API_URL}/agenda`

export async function fetchAgenda(
  token: string,
  opts: { start: string; end: string; property?: number | string },
): Promise<AgendaItem[]> {
  const params = new URLSearchParams({ start: opts.start, end: opts.end })
  if (opts.property) params.set("property", String(opts.property))
  const res = await fetch(`${AG}/?${params}`, { headers: authHeaders(token, false) })
  const data = await handle(res)
  return (data?.items ?? []) as AgendaItem[]
}

export async function createAgendaEvent(token: string, payload: AgendaEventInput) {
  const res = await fetch(`${AG}/events/`, {
    method: "POST", headers: authHeaders(token), body: JSON.stringify(payload),
  })
  return handle(res)
}

export async function deleteAgendaEvent(token: string, id: string) {
  const res = await fetch(`${AG}/events/${id}/`, { method: "DELETE", headers: authHeaders(token, false) })
  return handle(res)
}
