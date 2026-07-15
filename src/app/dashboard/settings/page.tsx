// page.tsx

"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle, Check, ExternalLink, Eye, EyeOff, Globe, Image as ImageIcon,
  Loader2, X,
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { DJANGO_API_URL } from "@/lib/config";
import { PageHeader, Pill, Skeleton } from "@/components/ui/page";
import { cn } from "@/lib/utils";

interface Settings {
  is_public: boolean;
  slug: string | null;
  display_name: string;
  bio: string;
  photo: string | null;
  contact_email: string;
  effective_contact_email: string;
  public_url: string | null;
  public_property_count: number;
  hidden_property_count: number;
  blocked_properties: { id: number; name: string; reasons: string[] }[];
}

export default function SettingsPage() {
  const { token } = useAuth();
  const [s, setS] = useState<Settings | null>(null);
  const [slug, setSlug] = useState("");
  const [slugState, setSlugState] = useState<"idle" | "checking" | "ok" | "taken">("idle");
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    if (!token) return;
    const res = await fetch(`${DJANGO_API_URL}/showcase/settings/`, {
      headers: { Authorization: `Token ${token}` },
    });
    if (res.ok) {
      const data: Settings = await res.json();
      setS(data);
      setSlug(data.slug ?? "");
    }
  }, [token]);

  useEffect(() => { load(); }, [load]);

  // Live availability, debounced. A landlord shouldn't have to submit a form to
  // find out their URL is taken.
  useEffect(() => {
    if (!token || !slug || slug === s?.slug) { setSlugState("idle"); return; }
    setSlugState("checking");
    const t = setTimeout(async () => {
      const res = await fetch(
        `${DJANGO_API_URL}/showcase/settings/check_slug/?slug=${encodeURIComponent(slug)}`,
        { headers: { Authorization: `Token ${token}` } },
      );
      const body = await res.json();
      setSlugState(body.available ? "ok" : "taken");
    }, 400);
    return () => clearTimeout(t);
  }, [slug, token, s?.slug]);

  const patch = async (body: Record<string, unknown> | FormData) => {
    if (!token) return;
    setSaving(true);
    try {
      const isForm = body instanceof FormData;
      const res = await fetch(`${DJANGO_API_URL}/showcase/settings/update_settings/`, {
        method: "PATCH",
        headers: {
          Authorization: `Token ${token}`,
          ...(isForm ? {} : { "Content-Type": "application/json" }),
        },
        body: isForm ? body : JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.slug?.[0] || data.detail || "Couldn't save.");
      setS(data);
      setSlug(data.slug ?? "");
      return data as Settings;
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't save.");
    } finally {
      setSaving(false);
    }
  };

  if (!s) {
    return (
      <div className="mx-auto max-w-3xl space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full rounded-xl" />
      </div>
    );
  }

  const canGoPublic = Boolean(slug || s.slug);

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        title="Settings"
        description="Your public page, and who can see your properties."
      />

      {/* ------------------------------------------------------------------
          THE SWITCH.

          Off by default and it stays off. A landlord who never opens this page
          has no public presence at all — no page, no listings on any city page,
          nothing in the sitemap. That default is the promise, and the copy below
          is written to make the promise legible rather than making them guess
          what "public" means. Somebody deciding whether to expose their rental
          business to the open internet deserves an exact list of what appears
          and what never will.
      ------------------------------------------------------------------- */}
      <section className="card p-6">
        <div className="flex items-start justify-between gap-6">
          <div className="min-w-0">
            <h2 className="flex items-center gap-2 font-semibold">
              <Globe className="h-4 w-4 text-[hsl(var(--ink-4))]" />
              Show my properties publicly
              {s.is_public ? (
                <Pill tone="ok"><Eye className="h-3 w-3" /> Live</Pill>
              ) : (
                <Pill tone="neutral"><EyeOff className="h-3 w-3" /> Off</Pill>
              )}
            </h2>
            <p className="mt-1.5 text-sm text-[hsl(var(--ink-3))]">
              {s.is_public ? (
                <>
                  Your available properties appear on Rentium's public city pages
                  and on your own page, where anyone can find them — including
                  through Google.
                </>
              ) : (
                <>
                  Nothing of yours is public. Turn this on to get a page of your
                  own and have your available places listed where renters look.
                </>
              )}
            </p>
          </div>

          <button
            type="button"
            disabled={saving || !canGoPublic}
            onClick={() => patch({ is_public: !s.is_public })}
            className={cn(
              "relative h-6 w-11 flex-shrink-0 rounded-full transition-colors disabled:opacity-40",
              s.is_public ? "bg-[hsl(var(--brand))]" : "bg-[hsl(var(--line-strong))]",
            )}
          >
            <span className={cn(
              "absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform",
              s.is_public ? "translate-x-[22px]" : "translate-x-0.5",
            )} />
          </button>
        </div>

        {!canGoPublic && (
          <p className="mt-3 text-xs text-[hsl(var(--warn-ink))]">
            Choose your page address below first.
          </p>
        )}

        {/* The exact contract. Two columns, both true. */}
        <div className="mt-5 grid gap-4 rounded-lg bg-[hsl(var(--surface-sunken))] p-4 sm:grid-cols-2">
          <div>
            <p className="mb-2 text-xs font-medium uppercase tracking-wide text-[hsl(var(--ink-4))]">
              What people will see
            </p>
            <ul className="space-y-1 text-sm text-[hsl(var(--ink-2))]">
              {["Your photos and description", "Your asking rent",
                "The neighbourhood — not the address",
                "Whether it's furnished, and with what",
                "Your name or business name"].map((x) => (
                <li key={x} className="flex gap-2">
                  <Check className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-[hsl(var(--ok))]" />
                  {x}
                </li>
              ))}
            </ul>
          </div>
          <div>
            <p className="mb-2 text-xs font-medium uppercase tracking-wide text-[hsl(var(--ink-4))]">
              What they will never see
            </p>
            <ul className="space-y-1 text-sm text-[hsl(var(--ink-2))]">
              {["Your street address or unit number",
                "Anything about your current tenants",
                "Your leases, rent roll or finances",
                "Your email address or phone number",
                "Occupied or unavailable properties"].map((x) => (
                <li key={x} className="flex gap-2">
                  <X className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-[hsl(var(--ink-5))]" />
                  {x}
                </li>
              ))}
            </ul>
          </div>
        </div>

        {s.is_public && s.public_url && (
          <Link
            href={s.public_url} target="_blank"
            className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-[hsl(var(--brand))] hover:underline"
          >
            View your page <ExternalLink className="h-3.5 w-3.5" />
          </Link>
        )}
      </section>

      {/* --------------------------------------------------- unpublishable */}
      {s.blocked_properties.length > 0 && (
        <section className="card mt-6 border-[hsl(var(--warn))] bg-[hsl(var(--warn-soft))] p-5">
          <h2 className="flex items-center gap-2 font-semibold text-[hsl(var(--warn-ink))]">
            <AlertTriangle className="h-4 w-4" />
            {s.blocked_properties.length} propert
            {s.blocked_properties.length === 1 ? "y isn't" : "ies aren't"} showing up
          </h2>
          {/* This section exists because the old failure was SILENT. A property
              with a typo'd province just... didn't appear, anywhere, forever, and
              nothing told anyone why. */}
          <p className="mt-1 text-sm text-[hsl(var(--warn-ink))]">
            {s.is_public
              ? "These are available and not hidden, but they're missing something."
              : "Worth fixing before you go public."}
          </p>
          <ul className="mt-3 space-y-2.5">
            {s.blocked_properties.map((p) => (
              <li key={p.id} className="rounded-lg bg-white/70 p-3">
                <Link href={`/dashboard/properties/edit/${p.id}`}
                      className="text-sm font-medium hover:underline">
                  {p.name}
                </Link>
                <ul className="mt-1 space-y-0.5">
                  {p.reasons.map((r) => (
                    <li key={r} className="text-xs text-[hsl(var(--ink-3))]">— {r}</li>
                  ))}
                </ul>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* --------------------------------------------------------- your page */}
      <section className="card mt-6 p-6">
        <h2 className="font-semibold">Your page</h2>

        <div className="mt-4 space-y-4">
          <div>
            <label className="text-sm font-medium">Address</label>
            <div className="mt-1.5 flex items-center gap-0">
              <span className="rounded-l-lg border border-r-0 bg-[hsl(var(--surface-sunken))] px-3 py-2 text-sm text-[hsl(var(--ink-4))]"
                    style={{ borderColor: "hsl(var(--line))" }}>
                rentium.ca/l/
              </span>
              <input
                value={slug}
                onChange={(e) =>
                  setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-").replace(/-+/g, "-"))
                }
                onBlur={() => {
                  if (slug && slug !== s.slug && slugState === "ok") patch({ slug });
                }}
                placeholder="raj-rentals"
                className="field flex-1 rounded-l-none"
              />
            </div>
            <p className="mt-1.5 text-xs text-[hsl(var(--ink-4))]">
              {slugState === "checking" && "Checking..."}
              {slugState === "ok" && <span className="text-[hsl(var(--ok-ink))]">Available.</span>}
              {slugState === "taken" && <span className="text-[hsl(var(--danger-ink))]">Already taken.</span>}
              {slugState === "idle" &&
                "You can change this later — your old address keeps working and redirects here."}
            </p>
          </div>

          <div>
            <label className="text-sm font-medium">Display name</label>
            <input
              defaultValue={s.display_name}
              onBlur={(e) => e.target.value !== s.display_name && patch({ display_name: e.target.value })}
              placeholder={s.display_name || "e.g. McKenzie Rentals"}
              className="field mt-1.5"
            />
            <p className="mt-1 text-xs text-[hsl(var(--ink-4))]">
              Leave blank to use your account name.
            </p>
          </div>

          <div>
            <label className="text-sm font-medium">About</label>
            <textarea
              rows={4} defaultValue={s.bio} maxLength={1200}
              onBlur={(e) => e.target.value !== s.bio && patch({ bio: e.target.value })}
              placeholder="A few sentences for people considering renting from you."
              className="field mt-1.5 resize-none"
            />
          </div>

          <div>
            <label className="text-sm font-medium">Photo or logo</label>
            <div className="mt-1.5 flex items-center gap-4">
              {s.photo ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={s.photo} alt="" className="h-16 w-16 rounded-xl object-cover" />
              ) : (
                <span className="flex h-16 w-16 items-center justify-center rounded-xl bg-[hsl(var(--surface-sunken))] text-[hsl(var(--ink-5))]">
                  <ImageIcon className="h-6 w-6" />
                </span>
              )}
              <label className="cursor-pointer rounded-lg border px-3 py-2 text-sm font-medium hover:bg-[hsl(var(--surface-sunken))]"
                     style={{ borderColor: "hsl(var(--line))" }}>
                {s.photo ? "Change" : "Upload"}
                <input type="file" accept="image/*" className="hidden"
                       onChange={(e) => {
                         const f = e.target.files?.[0];
                         if (!f) return;
                         const fd = new FormData();
                         fd.append("photo", f);
                         patch(fd);
                       }} />
              </label>
            </div>
          </div>

          <div>
            <label className="text-sm font-medium">Where inquiries go</label>
            <input
              type="email" defaultValue={s.contact_email}
              onBlur={(e) => e.target.value !== s.contact_email && patch({ contact_email: e.target.value })}
              placeholder={s.effective_contact_email}
              className="field mt-1.5"
            />
            <p className="mt-1 text-xs text-[hsl(var(--ink-4))]">
              Blank sends them to {s.effective_contact_email}. This address is never
              shown publicly — people reach you through a form.
            </p>
          </div>
        </div>

        {saving && (
          <p className="mt-4 flex items-center gap-1.5 text-xs text-[hsl(var(--ink-4))]">
            <Loader2 className="h-3 w-3 animate-spin" /> Saving...
          </p>
        )}
      </section>

      <p className="mt-6 text-center text-sm text-[hsl(var(--ink-4))]">
        Looking for your name, email or password?{" "}
        <Link href="/dashboard/profile" className="text-[hsl(var(--brand))] hover:underline">
          Account settings
        </Link>
      </p>
    </div>
  );
}