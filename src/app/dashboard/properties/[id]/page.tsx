// page.tsx

"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  AlertTriangle, Bath, Bed, Camera, DoorOpen, ExternalLink, Eye, EyeOff,
  Home, ImageIcon, Loader2, MapPin, Package, Pencil, Sofa, Square,
  Trash2, Users, Wrench,
} from "lucide-react";
import { toast } from "sonner";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useAuth } from "@/contexts/AuthContext";
import { DJANGO_API_URL } from "@/lib/config";
import {
  PropertyDetail, STATUSES, fetchProperty, updateProperty,
} from "@/lib/propertyApi";
import { EmptyState, PageHeader, Pill, Skeleton } from "@/components/ui/page";
import { cn } from "@/lib/utils";

// Images come back as relative /media/ paths; the API and the app are on
// different origins in dev.
const ORIGIN = (() => {
  try {
    return new URL(DJANGO_API_URL).origin;
  } catch {
    return "";
  }
})();

const img = (u: string | null): string | null => {
  if (!u) return null;
  if (u.startsWith("http") || u.startsWith("blob:")) return u;
  return ORIGIN ? `${ORIGIN}${u.startsWith("/") ? "" : "/"}${u}` : u;
};

const money = (v: string | null) =>
  v ? `$${Number(v).toLocaleString("en-CA")}` : "Not set";

const STATUS_TONE = {
  AVAILABLE: "ok",
  OCCUPIED: "info",
  MAINTENANCE: "warn",
  NOT_AVAILABLE: "neutral",
} as const;

interface InventoryItem {
  id: number;
  name: string;
  quantity: number;
  condition_display: string | null;
}

interface FullProperty extends PropertyDetail {
  landlord_name: string;
  additional_images: { id: number; image: string; caption: string | null }[];
  private_inventory_items: InventoryItem[];
  shared_inventory_items: InventoryItem[];
  group_name: string | null;
  unit_type_display: string | null;
  room_type_display: string | null;
}

export default function PropertyDetailPage() {
  const router = useRouter();
  const params = useParams();
  const { token } = useAuth();
  const id = params.id as string;

  const [p, setP] = useState<FullProperty | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const load = useCallback(async () => {
    if (!token) return;
    try {
      setP((await fetchProperty(token, id)) as FullProperty);
    } catch {
      toast.error("Couldn't load that property.");
      setP(null);
    } finally {
      setLoading(false);
    }
  }, [token, id]);

  useEffect(() => { load(); }, [load]);

  const patch = async (body: Record<string, unknown>, msg: string) => {
    if (!token) return;
    setBusy(true);
    try {
      setP((await updateProperty(token, id, body)) as FullProperty);
      toast.success(msg);
    } catch {
      toast.error("Couldn't save.");
      load();
    } finally {
      setBusy(false);
    }
  };

  const doDelete = async () => {
    if (!token) return;
    setBusy(true);
    const res = await fetch(`${DJANGO_API_URL}/properties/${id}/`, {
      method: "DELETE",
      headers: { Authorization: `Token ${token}` },
    });
    if (!res.ok && res.status !== 204) {
      toast.error("Couldn't delete — it may have leases attached.");
      setBusy(false);
      setConfirmDelete(false);
      return;
    }
    toast.success("Property deleted.");
    router.push("/dashboard/properties");
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-5xl space-y-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="aspect-[16/9] w-full rounded-xl" />
      </div>
    );
  }

  if (!p) {
    return (
      <div className="mx-auto max-w-2xl">
        <EmptyState
          icon={ImageIcon}
          title="Property not found"
          description="It may have been deleted, or the link is wrong."
          action={
            <Link href="/dashboard/properties"
                  className="rounded-lg bg-[hsl(var(--brand))] px-4 py-2 text-sm font-medium text-white">
              Back to properties
            </Link>
          }
        />
      </div>
    );
  }

  const isRoom = p.property_category === "ROOM";
  const typeLabel = isRoom ? p.room_type_display : p.unit_type_display;
  const gallery = (p.additional_images ?? []).map((i) => ({ ...i, url: img(i.image) }));
  const inventory = p.private_inventory_items ?? [];
  const sharedInventory = p.shared_inventory_items ?? [];

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader
        title={p.name}
        breadcrumbs={[
          { label: "Properties", href: "/dashboard/properties" },
          { label: p.name },
        ]}
        actions={
          <>
            <Link
              href={`/dashboard/properties/edit/${id}`}
              className="flex items-center gap-1.5 rounded-lg border px-3 py-2 text-sm font-medium hover:bg-[hsl(var(--surface-sunken))]"
              style={{ borderColor: "hsl(var(--line))" }}
            >
              <Pencil className="h-4 w-4" /> Edit
            </Link>
            <button
              onClick={() => setConfirmDelete(true)}
              className="flex items-center gap-1.5 rounded-lg border px-3 py-2 text-sm font-medium text-[hsl(var(--danger-ink))] hover:bg-[hsl(var(--danger-soft))]"
              style={{ borderColor: "hsl(var(--danger-soft))" }}
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </>
        }
      />

      <div className="mb-5 flex flex-wrap items-center gap-2">
        <Pill tone={STATUS_TONE[p.status]}>{p.status_display}</Pill>
        <Pill tone="neutral">
          {isRoom ? <DoorOpen className="h-3 w-3" /> : <Home className="h-3 w-3" />}
          {typeLabel ?? p.property_category_display}
        </Pill>
        {p.is_furnished && (
          <Pill tone="brand"><Sofa className="h-3 w-3" /> Furnished</Pill>
        )}
        {p.group_name && (
          <Link href={`/dashboard/properties/edit-group/${p.group_id}`}>
            <Pill tone="info"><Users className="h-3 w-3" /> {p.group_name}</Pill>
          </Link>
        )}
      </div>

      {/* --------------------------------------------------------------------
          Why this isn't public — stated, at the top, where the landlord can act
          on it. The old failure was silent: a property with a bad address or no
          price simply never appeared anywhere, and nothing ever said so.
      -------------------------------------------------------------------- */}
      {p.publish_blockers.length > 0 && (
        <div className="card mb-6 border-[hsl(var(--warn))] bg-[hsl(var(--warn-soft))] p-4">
          <p className="flex items-center gap-2 text-sm font-medium text-[hsl(var(--warn-ink))]">
            <AlertTriangle className="h-4 w-4" /> This won't show up publicly
          </p>
          <ul className="mt-2 space-y-1">
            {p.publish_blockers.map((b) => (
              <li key={b} className="text-xs text-[hsl(var(--warn-ink))]">— {b}</li>
            ))}
          </ul>
          <Link
            href={`/dashboard/properties/edit/${id}`}
            className="mt-3 inline-block text-xs font-medium text-[hsl(var(--warn-ink))] underline"
          >
            Fix it
          </Link>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="space-y-6">
          {/* photos */}
          <section className="card overflow-hidden">
            <div className="relative aspect-[16/9] bg-[hsl(var(--surface-sunken))]">
              {img(p.primary_image) ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={img(p.primary_image)!} alt={p.name} className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full flex-col items-center justify-center text-[hsl(var(--ink-5))]">
                  <Camera className="mb-2 h-8 w-8" />
                  <p className="text-sm">No photo — nobody enquires about a grey box</p>
                  <Link href={`/dashboard/properties/edit/${id}`}
                        className="mt-2 text-sm font-medium text-[hsl(var(--brand))] hover:underline">
                    Add one
                  </Link>
                </div>
              )}
            </div>
            {gallery.length > 0 && (
              <div className="flex gap-2 overflow-x-auto p-3">
                {gallery.map((g) => (
                  <div key={g.id} className="h-16 w-24 flex-shrink-0 overflow-hidden rounded-lg bg-[hsl(var(--surface-sunken))]">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={g.url ?? ""} alt={g.caption ?? ""} className="h-full w-full object-cover" />
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* details */}
          <section className="card p-5">
            <h2 className="font-semibold">Details</h2>

            {p.description && (
              <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-[hsl(var(--ink-2))]">
                {p.description}
              </p>
            )}

            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
              {p.bedrooms != null && <Stat icon={Bed} label="Bedrooms" value={p.bedrooms} />}
              {p.bathrooms && <Stat icon={Bath} label="Bathrooms" value={p.bathrooms} />}
              {p.square_footage && <Stat icon={Square} label="Size" value={`${p.square_footage} ft²`} />}
              {p.max_occupancy && <Stat icon={Users} label="Max people" value={p.max_occupancy} />}
            </div>

            {/* The full street address. This is the landlord's own page — the
                PUBLIC page shows only the neighbourhood, and never this. */}
            <div className="mt-4 flex items-start gap-2 border-t pt-4 text-sm"
                 style={{ borderColor: "hsl(var(--line))" }}>
              <MapPin className="mt-0.5 h-4 w-4 flex-shrink-0 text-[hsl(var(--ink-5))]" />
              <div>
                <p>{p.address}</p>
                <p className="text-[hsl(var(--ink-4))]">
                  {[p.city, p.province?.toUpperCase(), p.postal_code].filter(Boolean).join(", ")}
                </p>
                {p.neighbourhood && (
                  <p className="mt-1 text-xs text-[hsl(var(--ink-4))]">
                    Shown publicly as <strong>{p.neighbourhood}, {p.city}</strong> — never the
                    street address.
                  </p>
                )}
              </div>
            </div>
          </section>

          {/* inventory */}
          <section className="card p-5">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold">What's in it</h2>
              <Link href="/dashboard/inventory"
                    className="text-sm font-medium text-[hsl(var(--brand))] hover:underline">
                Manage
              </Link>
            </div>
            <p className="mb-3 mt-1 text-xs text-[hsl(var(--ink-4))]">
              This is what decides whether it's listed as furnished, and it's what
              prints on the roommate agreement and the condition inspection.
            </p>

            {inventory.length === 0 && sharedInventory.length === 0 ? (
              <p className="py-2 text-sm text-[hsl(var(--ink-4))]">Nothing recorded yet.</p>
            ) : (
              <div className="space-y-3">
                {inventory.length > 0 && (
                  <ul className="flex flex-wrap gap-1.5">
                    {inventory.map((i) => (
                      <li key={i.id}
                          className="rounded-full border px-2.5 py-1 text-xs"
                          style={{ borderColor: "hsl(var(--line))" }}>
                        {i.quantity > 1 ? `${i.quantity}× ` : ""}{i.name}
                      </li>
                    ))}
                  </ul>
                )}
                {sharedInventory.length > 0 && (
                  <div>
                    <p className="mb-1.5 text-xs font-medium uppercase tracking-wide text-[hsl(var(--ink-4))]">
                      Shared with the rest of the home
                    </p>
                    <ul className="flex flex-wrap gap-1.5">
                      {sharedInventory.map((i) => (
                        <li key={i.id}
                            className="rounded-full bg-[hsl(var(--surface-sunken))] px-2.5 py-1 text-xs">
                          {i.quantity > 1 ? `${i.quantity}× ` : ""}{i.name}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </section>
        </div>

        {/* ------------------------------------------------------------ side */}
        <aside className="space-y-6">
          <section className="card p-5">
            <h2 className="font-semibold">Renting it out</h2>
            <dl className="mt-3 space-y-2.5 text-sm">
              <div className="flex justify-between">
                <dt className="text-[hsl(var(--ink-4))]">Asking rent</dt>
                <dd className={cn("font-medium", !p.asking_rent && "text-[hsl(var(--warn-ink))]")}>
                  {money(p.asking_rent)}
                  {p.asking_rent && <span className="font-normal text-[hsl(var(--ink-4))]">/mo</span>}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-[hsl(var(--ink-4))]">Available</dt>
                <dd className="font-medium">
                  {p.available_from
                    ? new Date(`${p.available_from}T00:00:00`).toLocaleDateString("en-CA", {
                        month: "short", day: "numeric",
                      })
                    : "Now"}
                </dd>
              </div>
            </dl>
          </section>

          <section className="card p-5">
            <h2 className="font-semibold">Status</h2>
            <p className="mb-3 mt-1 text-xs text-[hsl(var(--ink-4))]">
              Looks after itself when a lease activates or maintenance starts — but
              what you set by hand always wins.
            </p>
            <div className="space-y-1.5">
              {STATUSES.map((s) => (
                <button
                  key={s.value}
                  type="button"
                  disabled={busy || s.value === p.status}
                  onClick={() => patch({ status: s.value }, `Marked ${s.label.toLowerCase()}.`)}
                  className={cn(
                    "w-full rounded-lg border px-3 py-2 text-left text-sm transition-colors disabled:cursor-default",
                    s.value === p.status
                      ? "border-[hsl(var(--brand))] bg-[hsl(var(--brand-soft))] font-medium"
                      : "border-[hsl(var(--line))] hover:bg-[hsl(var(--surface-sunken))]",
                  )}
                >
                  {s.label}
                  {s.value === p.status && (
                    <span className="ml-1.5 text-xs font-normal text-[hsl(var(--ink-4))]">
                      — current
                    </span>
                  )}
                </button>
              ))}
            </div>
          </section>

          <section className="card p-5">
            <h2 className="font-semibold">Public listing</h2>
            <div className="mt-3 flex items-start justify-between gap-3">
              <p className="text-sm text-[hsl(var(--ink-3))]">
                {p.is_publicly_visible
                  ? "Included on your public page — if you've turned it on."
                  : "Hidden, whatever your other settings say."}
              </p>
              <button
                type="button"
                disabled={busy}
                onClick={() =>
                  patch(
                    { is_publicly_visible: !p.is_publicly_visible },
                    p.is_publicly_visible ? "Hidden from your public page." : "Now included.",
                  )
                }
                className={cn(
                  "relative h-6 w-11 flex-shrink-0 rounded-full transition-colors",
                  p.is_publicly_visible
                    ? "bg-[hsl(var(--brand))]"
                    : "bg-[hsl(var(--line-strong))]",
                )}
              >
                <span className={cn(
                  "absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform",
                  p.is_publicly_visible ? "translate-x-[22px]" : "translate-x-0.5",
                )} />
              </button>
            </div>

            {p.is_publicly_visible && p.can_be_published && p.public_slug && (
              <Link
                href={`/${p.province}/${p.city.toLowerCase().replace(/\s+/g, "-")}/${p.public_slug}`}
                target="_blank"
                className="mt-3 flex items-center gap-1.5 text-sm font-medium text-[hsl(var(--brand))] hover:underline"
              >
                <Eye className="h-3.5 w-3.5" /> See how it looks
                <ExternalLink className="h-3 w-3" />
              </Link>
            )}

            <Link
              href="/dashboard/settings"
              className="mt-3 block text-xs text-[hsl(var(--ink-4))] hover:underline"
            >
              Public page settings →
            </Link>
          </section>

          <section className="card p-5">
            <h2 className="mb-3 font-semibold">Shortcuts</h2>
            <div className="space-y-1.5 text-sm">
              <Shortcut href={`/dashboard/maintenance?property=${id}`} icon={Wrench} label="Maintenance" />
              <Shortcut href={`/dashboard/leases?property=${id}`} icon={Package} label="Leases" />
              <Shortcut href="/dashboard/inventory" icon={Package} label="Inventory" />
            </div>
          </section>
        </aside>
      </div>

      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {p.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              This can't be undone. If it has leases attached, deletion is blocked —
              terminate those first so the tenancy record survives.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={doDelete} disabled={busy}
                               className="bg-[hsl(var(--danger))] hover:opacity-90">
              {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function Stat({
  icon: Icon, label, value,
}: { icon: React.ElementType; label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-lg bg-[hsl(var(--surface-sunken))] p-3">
      <Icon className="mb-1.5 h-4 w-4 text-[hsl(var(--ink-4))]" />
      <p className="text-sm font-medium">{value}</p>
      <p className="text-xs text-[hsl(var(--ink-4))]">{label}</p>
    </div>
  );
}

function Shortcut({
  href, icon: Icon, label,
}: { href: string; icon: React.ElementType; label: string }) {
  return (
    <Link href={href}
          className="flex items-center gap-2.5 rounded-lg px-2 py-1.5 text-[hsl(var(--ink-2))] transition-colors hover:bg-[hsl(var(--surface-sunken))]">
      <Icon className="h-4 w-4 text-[hsl(var(--ink-5))]" />
      {label}
    </Link>
  );
}