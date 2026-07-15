// attentionApi.ts
// Client for the Action Center: GET /api/attention/ returns everything that
// currently needs the landlord's attention, computed server-side on read
// (no stored task rows, nothing to go stale). Contract and item sources are
// specified in docs/phase-b-spec.md (B2); the endpoint ships with the
// backend half of Phase B.
//
// Callers should expect this to THROW against a backend that doesn't have
// the endpoint yet, and fall back to their legacy behavior.

import { DJANGO_API_URL } from "@/lib/config"

export type AttentionSeverity = "urgent" | "soon" | "info"

export interface ActionItem {
  /** Stable id, e.g. "inspection.move_in.lease:42" — usable as a React key. */
  key: string
  severity: AttentionSeverity
  title: string
  detail: string
  /** Deep link into the dashboard, e.g. "/dashboard/leases/42". */
  url: string
  due_date: string | null
  source: "inspection" | "lease" | "ledger" | "maintenance" | "inquiry" | string
}

export async function fetchAttention(token: string): Promise<ActionItem[]> {
  const res = await fetch(`${DJANGO_API_URL}/attention/`, {
    headers: { Authorization: `Token ${token}` },
  })
  if (!res.ok) {
    throw new Error(`attention endpoint unavailable (${res.status})`)
  }
  const data = (await res.json()) as { items?: ActionItem[] }
  return data.items ?? []
}
