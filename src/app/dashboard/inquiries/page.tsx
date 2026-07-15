// page.tsx

"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  CalendarPlus, CheckCircle2, Inbox, Mail, Phone, Reply,
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { DJANGO_API_URL } from "@/lib/config";
import { EmptyState, PageHeader, Pill, TableSkeleton } from "@/components/ui/page";
import { cn } from "@/lib/utils";

interface Inquiry {
  id: string;
  property: number;
  property_name: string;
  property_slug: string;
  name: string;
  email: string;
  phone: string;
  message: string;
  move_in_target: string | null;
  status: "NEW" | "REPLIED" | "ARCHIVED" | "SPAM";
  status_display: string;
  created_at: string;
  appointment: string | null;
}

const TONE = { NEW: "brand", REPLIED: "ok", ARCHIVED: "neutral", SPAM: "danger" } as const;

export default function InquiriesPage() {
  const { token } = useAuth();
  const [items, setItems] = useState<Inquiry[] | null>(null);
  const [filter, setFilter] = useState<string>("");
  const [scheduling, setScheduling] = useState<string | null>(null);
  const [when, setWhen] = useState("");

  const load = useCallback(async () => {
    if (!token) return;
    const qs = filter ? `?status=${filter}` : "";
    const res = await fetch(`${DJANGO_API_URL}/showcase/inquiries/${qs}`, {
      headers: { Authorization: `Token ${token}` },
    });
    const data = await res.json();
    setItems(Array.isArray(data) ? data : data.results ?? []);
  }, [token, filter]);

  useEffect(() => { load(); }, [load]);

  const act = async (id: string, path: string, body?: object) => {
    const res = await fetch(`${DJANGO_API_URL}/showcase/inquiries/${id}/${path}/`, {
      method: "POST",
      headers: { Authorization: `Token ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify(body ?? {}),
    });
    if (!res.ok) {
      toast.error("Couldn't do that.");
      return;
    }
    load();
  };

  const newCount = items?.filter((i) => i.status === "NEW").length ?? 0;

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader
        title="Inquiries"
        description="People who found your listings and got in touch."
      />

      <div className="mb-5 flex gap-1.5">
        {[["", "All"], ["NEW", "New"], ["REPLIED", "Replied"], ["ARCHIVED", "Archived"]].map(
          ([v, label]) => (
            <button key={v} type="button" onClick={() => setFilter(v)}
              className={cn(
                "rounded-full px-3 py-1.5 text-sm transition-colors",
                filter === v
                  ? "bg-[hsl(var(--brand))] text-white"
                  : "bg-white text-[hsl(var(--ink-3))] hover:text-[hsl(var(--ink))]",
              )}>
              {label}
              {v === "NEW" && newCount > 0 && (
                <span className="ml-1.5 opacity-80">{newCount}</span>
              )}
            </button>
          ),
        )}
      </div>

      {items === null ? (
        <TableSkeleton rows={3} cols={3} />
      ) : items.length === 0 ? (
        <EmptyState
          icon={Inbox}
          title="No inquiries yet"
          description="When someone finds one of your public listings and messages you, it lands here — and in your email."
          action={
            <Link href="/dashboard/settings"
                  className="rounded-lg bg-[hsl(var(--brand))] px-4 py-2 text-sm font-medium text-white">
              Check your public page
            </Link>
          }
        />
      ) : (
        <ul className="space-y-3">
          {items.map((i) => (
            <li key={i.id} className={cn("card p-5", i.status === "NEW" && "border-[hsl(var(--brand))]")}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="flex items-center gap-2 font-medium">
                    {i.name}
                    <Pill tone={TONE[i.status]}>{i.status_display}</Pill>
                  </p>
                  <p className="mt-0.5 text-sm text-[hsl(var(--ink-4))]">
                    about{" "}
                    <Link href={`/dashboard/properties/${i.property}`}
                          className="text-[hsl(var(--ink-2))] hover:underline">
                      {i.property_name}
                    </Link>
                    {" · "}
                    {new Date(i.created_at).toLocaleDateString("en-CA", {
                      month: "short", day: "numeric",
                    })}
                  </p>
                </div>
                <div className="flex flex-wrap gap-3 text-sm">
                  <a href={`mailto:${i.email}`}
                     className="flex items-center gap-1.5 text-[hsl(var(--brand))] hover:underline">
                    <Mail className="h-3.5 w-3.5" /> {i.email}
                  </a>
                  {i.phone && (
                    <a href={`tel:${i.phone}`}
                       className="flex items-center gap-1.5 text-[hsl(var(--ink-3))]">
                      <Phone className="h-3.5 w-3.5" /> {i.phone}
                    </a>
                  )}
                </div>
              </div>

              <p className="mt-3 whitespace-pre-wrap rounded-lg bg-[hsl(var(--surface-sunken))] p-3 text-sm">
                {i.message}
              </p>

              {i.move_in_target && (
                <p className="mt-2 text-xs text-[hsl(var(--ink-4))]">
                  Hoping to move in{" "}
                  {new Date(`${i.move_in_target}T00:00:00`).toLocaleDateString("en-CA", {
                    month: "long", day: "numeric",
                  })}
                </p>
              )}

              <div className="mt-4 flex flex-wrap gap-2">
                {/* Reply is just mailto — the inquiry email already set reply-to
                    to this person, so hitting Reply in their inbox works too.
                    There's no in-app relay to build and no message the tenant
                    can't see. An inquiry is a lead, not a chat thread. */}
                <a href={`mailto:${i.email}?subject=Re: ${i.property_name}`}
                   onClick={() => i.status === "NEW" && act(i.id, "mark_replied")}
                   className="flex items-center gap-1.5 rounded-lg bg-[hsl(var(--brand))] px-3 py-1.5 text-sm font-medium text-white hover:bg-[hsl(var(--brand-hover))]">
                  <Reply className="h-3.5 w-3.5" /> Reply
                </a>

                {i.appointment ? (
                  <span className="flex items-center gap-1.5 rounded-lg bg-[hsl(var(--ok-soft))] px-3 py-1.5 text-sm text-[hsl(var(--ok-ink))]">
                    <CheckCircle2 className="h-3.5 w-3.5" /> Viewing booked
                  </span>
                ) : scheduling === i.id ? (
                  <span className="flex items-center gap-2">
                    <input type="datetime-local" value={when}
                           onChange={(e) => setWhen(e.target.value)}
                           className="field w-auto py-1.5" />
                    <button type="button" disabled={!when}
                            onClick={() => {
                              act(i.id, "to_appointment", { starts_at: new Date(when).toISOString() });
                              setScheduling(null);
                              setWhen("");
                              toast.success("Viewing booked — their details carried over.");
                            }}
                            className="rounded-lg bg-[hsl(var(--brand))] px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50">
                      Book
                    </button>
                    <button type="button" onClick={() => setScheduling(null)}
                            className="text-sm text-[hsl(var(--ink-4))]">
                      Cancel
                    </button>
                  </span>
                ) : (
                  <button type="button" onClick={() => setScheduling(i.id)}
                          className="flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm font-medium hover:bg-[hsl(var(--surface-sunken))]"
                          style={{ borderColor: "hsl(var(--line))" }}>
                    <CalendarPlus className="h-3.5 w-3.5" /> Schedule a viewing
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}