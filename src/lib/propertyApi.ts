// propertyApi.ts
//
// One client for properties. The create form, the edit form, and the property
// list were each hand-rolling their own fetch + header-setting + DRF-error-
// parsing — three copies of the same code, drifting, each with its own idea of
// how to read `{"field": ["message"]}` out of a 400. Two of them got it wrong.

import { DJANGO_API_URL } from "@/lib/config";

export type PropertyCategory = "COMPLETE_UNIT" | "ROOM";
export type PropertyStatus = "AVAILABLE" | "OCCUPIED" | "MAINTENANCE" | "NOT_AVAILABLE";
export type UnitType = "BASEMENT" | "GARDEN_SUITE" | "MAIN_FLOOR" | "APARTMENT" | "OTHER";
export type RoomType = "PRIVATE" | "SHARED" | "OTHER";

export const UNIT_TYPES: { value: UnitType; label: string }[] = [
  { value: "APARTMENT", label: "Apartment" },
  { value: "BASEMENT", label: "Basement suite" },
  { value: "GARDEN_SUITE", label: "Garden suite" },
  { value: "MAIN_FLOOR", label: "Main floor" },
  { value: "OTHER", label: "Other" },
];

export const ROOM_TYPES: { value: RoomType; label: string; hint: string }[] = [
  { value: "PRIVATE", label: "Private room", hint: "The bedroom is theirs alone" },
  { value: "SHARED", label: "Shared room", hint: "Two or more people share the bedroom itself" },
  { value: "OTHER", label: "Other", hint: "" },
];

export const STATUSES: { value: PropertyStatus; label: string; hint: string }[] = [
  { value: "AVAILABLE", label: "Available", hint: "Ready to rent — this is what shows publicly" },
  { value: "OCCUPIED", label: "Occupied", hint: "Set automatically when a lease activates" },
  { value: "MAINTENANCE", label: "Under maintenance", hint: "Set automatically when work starts" },
  { value: "NOT_AVAILABLE", label: "Not available", hint: "Off the market — you're using it, or it's not ready" },
];

// Complete units only. A ROOM's shared spaces are the suite's common areas,
// which come from its property group — modelling them here too would be the
// same fact in two places, and they would eventually disagree.
export const BUILDING_AMENITIES = [
  { value: "LAUNDRY", label: "Shared laundry room" },
  { value: "PARKING", label: "Shared parking" },
  { value: "STORAGE", label: "Shared storage / locker" },
  { value: "LOBBY", label: "Shared entry / lobby" },
  { value: "YARD", label: "Shared yard / outdoor space" },
  { value: "BIKE", label: "Bike storage" },
] as const;

export interface PropertyGroupStub {
  id: string;
  name: string;
}

export interface PropertyDetail {
  id: number;
  name: string;
  description: string;
  property_category: PropertyCategory;
  property_category_display: string;

  // Location — DERIVED from the address the landlord picked. `city`,
  // `province`, `postal_code`, `neighbourhood` and the coordinates all arrive
  // together from the autocomplete; none of them are typed.
  address: string;
  city: string;
  province: string;       // "bc" — the code, not the name
  postal_code: string;
  country: string;
  neighbourhood: string;
  latitude: string | null;
  longitude: string | null;

  status: PropertyStatus;
  status_display: string;
  primary_image: string | null;

  unit_type: UnitType | null;
  bedrooms: number | null;
  bathrooms: string | null;
  max_occupancy: number | null;
  square_footage: number | null;
  building_amenities: string[];

  room_type: RoomType | null;
  group: PropertyGroupStub | null;
  group_id: string | null;

  // Public
  is_publicly_visible: boolean;
  public_slug: string | null;
  asking_rent: string | null;
  available_from: string | null;
  is_furnished: boolean;      // DERIVED from inventory. Never editable.
  publish_blockers: string[]; // why this can't appear publicly, in plain words
  can_be_published: boolean;
}

// ------------------------------------------------------------------ helpers
function headers(token: string, json = true): Record<string, string> {
  const h: Record<string, string> = { Authorization: `Token ${token}` };
  if (json) h["Content-Type"] = "application/json";
  return h;
}

/**
 * DRF errors come back as {"field": ["message"], "detail": "...", ...}. Every
 * caller was reimplementing this, badly. Returns a per-field map so a form can
 * put the message next to the input it belongs to, rather than dumping
 * JSON.stringify(err) into a toast — which is what two of the three copies did.
 */
export interface ApiErrors {
  detail?: string;
  fields: Record<string, string>;
}

async function parseError(res: Response): Promise<ApiErrors> {
  const body = await res.json().catch(() => ({}));
  const fields: Record<string, string> = {};
  let detail: string | undefined;

  for (const [key, value] of Object.entries(body)) {
    if (key === "detail" || key === "non_field_errors") {
      detail = Array.isArray(value) ? String(value[0]) : String(value);
    } else if (Array.isArray(value)) {
      fields[key] = String(value[0]);
    } else if (typeof value === "string") {
      fields[key] = value;
    }
  }
  if (!detail && Object.keys(fields).length === 0) {
    detail = `Something went wrong (${res.status}).`;
  }
  return { detail, fields };
}

export class ApiError extends Error {
  constructor(public errors: ApiErrors) {
    super(errors.detail ?? "Request failed");
  }
}

async function handle<T>(res: Response): Promise<T> {
  if (!res.ok) throw new ApiError(await parseError(res));
  if (res.status === 204) return undefined as T;
  return res.json();
}

const unwrap = <T,>(d: unknown): T[] =>
  Array.isArray(d) ? d : ((d as { results?: T[] })?.results ?? []);

// -------------------------------------------------------------------- calls
export async function fetchProperties(token: string): Promise<PropertyDetail[]> {
  const res = await fetch(`${DJANGO_API_URL}/properties/`, { headers: headers(token, false) });
  return unwrap<PropertyDetail>(await handle(res));
}

export async function fetchProperty(token: string, id: number | string): Promise<PropertyDetail> {
  const res = await fetch(`${DJANGO_API_URL}/properties/${id}/`, { headers: headers(token, false) });
  return handle(res);
}

export async function createProperty(
  token: string, body: Record<string, unknown>,
): Promise<PropertyDetail> {
  const res = await fetch(`${DJANGO_API_URL}/properties/`, {
    method: "POST", headers: headers(token), body: JSON.stringify(body),
  });
  return handle(res);
}

export async function updateProperty(
  token: string, id: number | string, body: Record<string, unknown>,
): Promise<PropertyDetail> {
  const res = await fetch(`${DJANGO_API_URL}/properties/${id}/`, {
    method: "PATCH", headers: headers(token), body: JSON.stringify(body),
  });
  return handle(res);
}

export async function uploadPrimaryImage(
  token: string, id: number | string, file: File,
): Promise<PropertyDetail> {
  const form = new FormData();
  form.append("primary_image", file);
  const res = await fetch(`${DJANGO_API_URL}/properties/${id}/`, {
    method: "PATCH", headers: headers(token, false), body: form,
  });
  return handle(res);
}

export async function addGalleryImage(
  token: string, id: number | string, file: File, caption = "",
): Promise<{ id: number; image: string; caption: string }> {
  const form = new FormData();
  form.append("image", file);
  if (caption) form.append("caption", caption);
  const res = await fetch(`${DJANGO_API_URL}/properties/${id}/images/`, {
    method: "POST", headers: headers(token, false), body: form,
  });
  return handle(res);
}

export async function deleteGalleryImage(
  token: string, propertyId: number | string, imageId: number,
): Promise<void> {
  const res = await fetch(`${DJANGO_API_URL}/properties/${propertyId}/images/${imageId}/`, {
    method: "DELETE", headers: headers(token, false),
  });
  await handle(res);
}

// NOTE the URL. Django routes groups at /api/properties/groups/ — the frontend
// was calling /api/property-groups/ everywhere, which is a 404. Group listing,
// group creation, and common-area management have all been completely dead,
// which also means the shared-with-landlord flag (the one that decides whether
// the provincial tenancy act applies to a lease) could never be set from the UI.
export async function fetchGroups(token: string): Promise<PropertyGroupStub[]> {
  const res = await fetch(`${DJANGO_API_URL}/properties/groups/`, {
    headers: headers(token, false),
  });
  return unwrap<PropertyGroupStub>(await handle(res));
}