// GroupForm.tsx

"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft, Check, Home, Info, Loader2, Plus, Trash2, UserCheck, Users,
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { DJANGO_API_URL } from "@/lib/config";
import { Field, TextArea, TextInput } from "@/components/form/Fields";
import { EmptyState, PageHeader, Pill, Skeleton } from "@/components/ui/page";
import { cn } from "@/lib/utils";

/**
 * The shared parts of one home.
 *
 * This entire feature has been UNREACHABLE. The frontend called
 * /api/property-groups/ and Django routes groups at /api/properties/groups/, so
 * every request 404'd: no group could be listed, created, or edited, and no
 * common area could be added.
 *
 * Which means the `shared_with_landlord` flag — the flag that decides whether
 * the provincial tenancy act applies to a lease at all — had no way to be set
 * from the UI. tenancy_rules.py reads it to determine the notice period, the
 * lease document prints a clause about it, and the move-out screen enforces it.
 * All of that machinery has been reading a value that no landlord could ever
 * turn on.
 */

const AREA_TYPES = [
  { value: "KITCHEN", label: "Kitchen" },
  { value: "BATHROOM", label: "Bathroom" },
  { value: "LIVING_ROOM", label: "Living room" },
  { value: "DINING_ROOM", label: "Dining room" },
  { value: "LAUNDRY", label: "Laundry" },
  { value: "HALLWAY", label: "Entry / hallway" },
  { value: "BALCONY", label: "Balcony / patio" },
  { value: "GARDEN", label: "Yard / garden" },
  { value: "STORAGE", label: "Storage" },
  { value: "OTHER", label: "Other" },
];

interface CommonArea {
  id: number;
  area_type: string;
  area_type_display: string;
  count: number;
  description: string;
  shared_with_landlord: boolean;
  shared_by_count: number;
}

interface RoomStub {
  id: number;
  name: string;
  address: string;
  group_name: string | null;
  property_category: string;
}

interface Props {
  groupId?: string; // absent = create
}

export default function GroupForm({ groupId }: Props) {
  const router = useRouter();
  const { token } = useAuth();
  const isEdit = Boolean(groupId);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [rooms, setRooms] = useState<RoomStub[]>([]);        // in this group
  const [available, setAvailable] = useState<RoomStub[]>([]); // ungrouped
  const [areas, setAreas] = useState<CommonArea[]>([]);
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);

  const [newArea, setNewArea] = useState("KITCHEN");
  const [newAreaCount, setNewAreaCount] = useState("1");
  const [newAreaShared, setNewAreaShared] = useState(false);

  const auth = useCallback(
    (json = true) => {
      const h: Record<string, string> = { Authorization: `Token ${token}` };
      if (json) h["Content-Type"] = "application/json";
      return h;
    },
    [token],
  );

  const load = useCallback(async () => {
    if (!token) return;
    try {
      // NOTE the URLs. /properties/groups/ and /properties/property-groups/<id>/
      // — this is what Django actually routes.
      const [propsRes, groupRes, areasRes] = await Promise.all([
        fetch(`${DJANGO_API_URL}/properties/?property_category=ROOM`, { headers: auth(false) }),
        isEdit
          ? fetch(`${DJANGO_API_URL}/properties/groups/${groupId}/`, { headers: auth(false) })
          : Promise.resolve(null),
        isEdit
          ? fetch(`${DJANGO_API_URL}/properties/property-groups/${groupId}/common-areas/`, {
              headers: auth(false),
            })
          : Promise.resolve(null),
      ]);

      const allRooms: RoomStub[] = propsRes.ok ? await propsRes.json() : [];
      setAvailable(allRooms.filter((r) => r.property_category === "ROOM" && !r.group_name));

      if (groupRes?.ok) {
        const g = await groupRes.json();
        setName(g.name);
        setDescription(g.description ?? "");
        setRooms(g.grouped_properties ?? []);
      }
      if (areasRes?.ok) setAreas(await areasRes.json());
    } catch {
      toast.error("Couldn't load that group.");
    } finally {
      setLoading(false);
    }
  }, [token, groupId, isEdit, auth]);

  useEffect(() => { load(); }, [load]);

  const saveDetails = async () => {
    if (!token || name.trim().length < 3) {
      toast.error("Give the group a name.");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(
        isEdit
          ? `${DJANGO_API_URL}/properties/groups/${groupId}/`
          : `${DJANGO_API_URL}/properties/groups/`,
        {
          method: isEdit ? "PATCH" : "POST",
          headers: auth(),
          body: JSON.stringify({ name: name.trim(), description: description.trim() }),
        },
      );
      if (!res.ok) throw new Error();
      const g = await res.json();
      toast.success(isEdit ? "Saved." : "Group created — now describe the shared spaces.");
      if (!isEdit) router.push(`/dashboard/properties/edit-group/${g.id}`);
    } catch {
      toast.error("Couldn't save.");
    } finally {
      setSaving(false);
    }
  };

  const addRoom = async (roomId: number) => {
    const res = await fetch(`${DJANGO_API_URL}/properties/groups/${groupId}/add-property/`, {
      method: "POST", headers: auth(), body: JSON.stringify({ property_id: roomId }),
    });
    if (!res.ok) { toast.error("Couldn't add that room."); return; }
    load();
  };

  const removeRoom = async (roomId: number) => {
    const res = await fetch(`${DJANGO_API_URL}/properties/groups/${groupId}/remove-property/`, {
      method: "POST", headers: auth(), body: JSON.stringify({ property_id: roomId }),
    });
    if (!res.ok) { toast.error("Couldn't remove that room."); return; }
    load();
  };

  const addArea = async () => {
    const res = await fetch(
      `${DJANGO_API_URL}/properties/property-groups/${groupId}/common-areas/`,
      {
        method: "POST",
        headers: auth(),
        body: JSON.stringify({
          area_type: newArea,
          count: Number(newAreaCount) || 1,
          shared_with_landlord: newAreaShared,
        }),
      },
    );
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      toast.error(body.detail ?? "Couldn't add that.");
      return;
    }
    setNewAreaCount("1");
    setNewAreaShared(false);
    load();
  };

  const toggleLandlord = async (area: CommonArea, value: boolean) => {
    // Optimistic — this is a switch, and a switch that lags feels broken.
    setAreas((a) => a.map((x) => (x.id === area.id ? { ...x, shared_with_landlord: value } : x)));
    const res = await fetch(
      `${DJANGO_API_URL}/properties/property-groups/${groupId}/common-areas/${area.id}/`,
      { method: "PATCH", headers: auth(), body: JSON.stringify({ shared_with_landlord: value }) },
    );
    if (!res.ok) {
      setAreas((a) => a.map((x) => (x.id === area.id ? { ...x, shared_with_landlord: !value } : x)));
      toast.error("Couldn't update that.");
      return;
    }
    toast.success(
      value
        ? `Recorded. Leases on these rooms now fall outside the tenancy act — your own notice terms apply.`
        : `Recorded. The tenancy act applies to leases on these rooms as normal.`,
    );
  };

  const deleteArea = async (area: CommonArea) => {
    if (!confirm(`Remove the shared ${area.area_type_display.toLowerCase()}?`)) return;
    await fetch(
      `${DJANGO_API_URL}/properties/property-groups/${groupId}/common-areas/${area.id}/`,
      { method: "DELETE", headers: auth(false) },
    );
    load();
  };

  const landlordShares = areas.some((a) => a.shared_with_landlord);

  if (loading) {
    return (
      <div className="mx-auto max-w-2xl space-y-6">
        <Skeleton className="h-8 w-56" />
        <Skeleton className="h-48 w-full rounded-xl" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl pb-12">
      <PageHeader
        title={isEdit ? name || "Edit group" : "New property group"}
        description="The shared parts of one home — the kitchen, bathroom and living room that several rooms have in common."
        breadcrumbs={[
          { label: "Properties", href: "/dashboard/properties" },
          { label: isEdit ? "Edit group" : "New group" },
        ]}
        actions={
          <Link
            href="/dashboard/properties?view=groups"
            className="flex items-center gap-1.5 rounded-lg border px-3 py-2 text-sm hover:bg-[hsl(var(--surface-sunken))]"
            style={{ borderColor: "hsl(var(--line))" }}
          >
            <ArrowLeft className="h-4 w-4" /> Back
          </Link>
        }
      />

      <div className="space-y-6">
        <section className="card p-5">
          <h2 className="mb-4 font-semibold">The home</h2>
          <div className="space-y-4">
            <Field label="Name" required hint="Just for you — e.g. 'Upstairs at McKenzie'">
              <TextInput value={name} onChange={setName} placeholder="Upstairs at McKenzie" />
            </Field>
            <Field label="Description">
              <TextArea value={description} onChange={setDescription} rows={3}
                        placeholder="Three bedrooms upstairs, sharing the kitchen and one bathroom." />
            </Field>
          </div>
          <button
            type="button"
            onClick={saveDetails}
            disabled={saving}
            className="mt-4 flex items-center gap-2 rounded-lg bg-[hsl(var(--brand))] px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
          >
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            {isEdit ? "Save" : "Create group"}
          </button>
        </section>

        {isEdit && (
          <>
            {/* ---------------------------------------------------- rooms */}
            <section className="card p-5">
              <h2 className="font-semibold">Rooms in this home</h2>
              <p className="mb-4 mt-1 text-sm text-[hsl(var(--ink-4))]">
                Everyone renting one of these rooms shares the spaces below.
              </p>

              {rooms.length === 0 ? (
                <p className="py-3 text-sm text-[hsl(var(--ink-4))]">No rooms yet.</p>
              ) : (
                <ul className="space-y-2">
                  {rooms.map((r) => (
                    <li key={r.id}
                        className="flex items-center justify-between rounded-lg border p-3"
                        style={{ borderColor: "hsl(var(--line))" }}>
                      <Link href={`/dashboard/properties/${r.id}`}
                            className="flex items-center gap-2 text-sm font-medium hover:underline">
                        <Home className="h-4 w-4 text-[hsl(var(--ink-5))]" />
                        {r.name}
                      </Link>
                      <button type="button" onClick={() => removeRoom(r.id)}
                              className="text-[hsl(var(--ink-5))] hover:text-[hsl(var(--danger))]">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}

              {available.length > 0 && (
                <div className="mt-4 border-t pt-4" style={{ borderColor: "hsl(var(--line))" }}>
                  <p className="mb-2 text-xs font-medium uppercase tracking-wide text-[hsl(var(--ink-4))]">
                    Add a room
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {available.map((r) => (
                      <button key={r.id} type="button" onClick={() => addRoom(r.id)}
                              className="flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm hover:bg-[hsl(var(--surface-sunken))]"
                              style={{ borderColor: "hsl(var(--line))" }}>
                        <Plus className="h-3.5 w-3.5" /> {r.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </section>

            {/* -------------------------------------------- shared spaces */}
            <section className="card p-5">
              <h2 className="font-semibold">Shared spaces</h2>
              <p className="mb-4 mt-1 text-sm text-[hsl(var(--ink-4))]">
                What everyone in this home shares. These show up on the roommate
                agreement, on the public listing, and on the condition inspection.
              </p>

              {areas.length === 0 ? (
                <p className="py-2 text-sm text-[hsl(var(--ink-4))]">
                  {rooms.length < 2
                    ? "Add at least two rooms first."
                    : "No shared spaces yet — add the kitchen and bathroom below."}
                </p>
              ) : (
                <ul className="space-y-2">
                  {areas.map((a) => (
                    <li key={a.id} className="rounded-lg border p-3" style={{ borderColor: "hsl(var(--line))" }}>
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <p className="text-sm font-medium">
                          {a.area_type_display}
                          {a.count > 1 && (
                            <span className="font-normal text-[hsl(var(--ink-4))]"> × {a.count}</span>
                          )}
                          <span className="ml-2 text-xs font-normal text-[hsl(var(--ink-4))]">
                            shared by {a.shared_by_count} rooms
                          </span>
                        </p>

                        <div className="flex items-center gap-3">
                          <label className="flex cursor-pointer items-center gap-2 text-xs">
                            <button
                              type="button"
                              onClick={() => toggleLandlord(a, !a.shared_with_landlord)}
                              className={cn(
                                "relative h-5 w-9 rounded-full transition-colors",
                                a.shared_with_landlord
                                  ? "bg-[hsl(var(--brand))]"
                                  : "bg-[hsl(var(--line-strong))]",
                              )}
                            >
                              <span className={cn(
                                "absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform",
                                a.shared_with_landlord ? "translate-x-[18px]" : "translate-x-0.5",
                              )} />
                            </button>
                            <span className="flex items-center gap-1 whitespace-nowrap text-[hsl(var(--ink-3))]">
                              <UserCheck className="h-3.5 w-3.5" /> I use this too
                            </span>
                          </label>

                          <button type="button" onClick={() => deleteArea(a)}
                                  className="text-[hsl(var(--ink-5))] hover:text-[hsl(var(--danger))]">
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}

              {/* This is the single most consequential toggle in the entire
                  application, and until now it was physically impossible to
                  reach it. Whether the owner shares the kitchen changes which
                  LAW applies — it isn't a preference. */}
              {landlordShares && (
                <div className="mt-4 flex items-start gap-2.5 rounded-lg bg-[hsl(var(--warn-soft))] p-3">
                  <Info className="mt-0.5 h-4 w-4 flex-shrink-0 text-[hsl(var(--warn))]" />
                  <div className="text-xs text-[hsl(var(--warn-ink))]">
                    <p className="font-medium">
                      You live here and share these spaces with your tenants.
                    </p>
                    <p className="mt-1 leading-relaxed">
                      That takes leases on these rooms outside the provincial tenancy
                      act — when the owner shares a kitchen or bathroom with a tenant,
                      the Act generally doesn't apply, and your lease's own terms
                      govern instead, including how much notice either side has to
                      give. Rentium already handles this: the notice periods on these
                      leases come from the lease, not the Act, and it's stated plainly
                      in the roommate agreement your tenant signs.
                    </p>
                  </div>
                </div>
              )}

              {rooms.length >= 2 && (
                <div className="mt-4 rounded-lg border border-dashed p-3"
                     style={{ borderColor: "hsl(var(--line-strong))" }}>
                  <p className="mb-2.5 text-xs font-medium uppercase tracking-wide text-[hsl(var(--ink-4))]">
                    Add a shared space
                  </p>
                  <div className="flex flex-wrap items-end gap-2">
                    <select value={newArea} onChange={(e) => setNewArea(e.target.value)}
                            className="field w-auto flex-1">
                      {AREA_TYPES.map((t) => (
                        <option key={t.value} value={t.value}>{t.label}</option>
                      ))}
                    </select>
                    <input type="number" min="1" value={newAreaCount}
                           onChange={(e) => setNewAreaCount(e.target.value)}
                           className="field w-16" />
                    <button type="button" onClick={addArea}
                            className="rounded-lg bg-[hsl(var(--brand))] px-3 py-2 text-sm font-medium text-white">
                      Add
                    </button>
                  </div>
                  <label className="mt-2.5 flex cursor-pointer items-center gap-2 text-xs text-[hsl(var(--ink-3))]">
                    <input type="checkbox" checked={newAreaShared}
                           onChange={(e) => setNewAreaShared(e.target.checked)} />
                    I (or my family) live here and use this space too
                  </label>
                </div>
              )}
            </section>
          </>
        )}
      </div>
    </div>
  );
}