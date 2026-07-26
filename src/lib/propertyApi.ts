// propertyApi.ts
//
// One client for properties. The create form, the edit form, and the property
// list were each hand-rolling their own fetch + header-setting + DRF-error-
// parsing — three copies of the same code, drifting, each with its own idea of
// how to read `{"field": ["message"]}` out of a 400. Two of them got it wrong.

import { DJANGO_API_URL } from '@/lib/config';

export type PropertyCategory = 'COMPLETE_UNIT' | 'ROOM';
export type PropertyStatus =
  'AVAILABLE' | 'OCCUPIED' | 'MAINTENANCE' | 'NOT_AVAILABLE';
export type UnitType =
  'BASEMENT' | 'GARDEN_SUITE' | 'MAIN_FLOOR' | 'APARTMENT' | 'OTHER';
export type RoomType = 'PRIVATE' | 'SHARED' | 'OTHER';

export const UNIT_TYPES: { value: UnitType; label: string }[] = [
  { value: 'APARTMENT', label: 'Apartment' },
  { value: 'BASEMENT', label: 'Basement suite' },
  { value: 'GARDEN_SUITE', label: 'Garden suite' },
  { value: 'MAIN_FLOOR', label: 'Main floor' },
  { value: 'OTHER', label: 'Other' },
];

export const ROOM_TYPES: { value: RoomType; label: string; hint: string }[] = [
  {
    value: 'PRIVATE',
    label: 'Private room',
    hint: 'The bedroom is theirs alone',
  },
  {
    value: 'SHARED',
    label: 'Shared room',
    hint: 'Two or more people share the bedroom itself',
  },
  { value: 'OTHER', label: 'Other', hint: '' },
];

export const STATUSES: {
  value: PropertyStatus;
  label: string;
  hint: string;
}[] = [
  {
    value: 'AVAILABLE',
    label: 'Available',
    hint: 'Ready to rent — this is what shows publicly',
  },
  {
    value: 'OCCUPIED',
    label: 'Occupied',
    hint: 'Set automatically when a lease activates',
  },
  {
    value: 'MAINTENANCE',
    label: 'Under maintenance',
    hint: 'Set automatically when work starts',
  },
  {
    value: 'NOT_AVAILABLE',
    label: 'Not available',
    hint: "Off the market — you're using it, or it's not ready",
  },
];

// Complete units only. A ROOM's shared spaces are the suite's common areas,
// which come from its property group — modelling them here too would be the
// same fact in two places, and they would eventually disagree.
export const BUILDING_AMENITIES = [
  { value: 'LAUNDRY', label: 'Shared laundry room' },
  { value: 'PARKING', label: 'Shared parking' },
  { value: 'STORAGE', label: 'Shared storage / locker' },
  { value: 'LOBBY', label: 'Shared entry / lobby' },
  { value: 'YARD', label: 'Shared yard / outdoor space' },
  { value: 'BIKE', label: 'Bike storage' },
] as const;

export type RentalMode = 'WHOLE_UNIT' | 'BY_ROOM';

export const RENTAL_MODES: {
  value: RentalMode;
  label: string;
  hint: string;
}[] = [
  {
    value: 'WHOLE_UNIT',
    label: 'Rented as one whole unit',
    hint: 'One lease covers the entire floor or suite, bedrooms included',
  },
  {
    value: 'BY_ROOM',
    label: 'Rented room by room',
    hint: 'Each bedroom is let separately, to different people',
  },
];

/**
 * A named space inside a unit — a bedroom, a bathroom, the kitchen.
 *
 * These are NOT listings. A floor rented whole still records that it has three
 * bedrooms; that is the distinction the old model could not express, which is
 * why a 9-unit portfolio displayed as 14 rooms.
 */
export interface UnitArea {
  id: number;
  name: string;
  label: string; // the landlord's name, else the area type
  area_type: string;
  area_type_display: string;
  kind: string;
  kind_display: string;
  count: number;
  description: string;
  shared_with_landlord: boolean;
  is_seeded_default: boolean;
  serves: { id: number; label: string }[]; // which bedrooms this bathroom is for
}

export interface UnitOffering {
  id: number;
  name: string;
  property_category: PropertyCategory;
  property_category_display: string;
  status: PropertyStatus;
  status_display: string;
  is_active_offering: boolean;
  is_publicly_visible: boolean;
  bedrooms: number | null;
  bathrooms: string | null;
  primary_image: string | null;
}

/**
 * `bedrooms: null` means NOT RECORDED — never "no bedrooms". Anything showing
 * this must say "not recorded" rather than 0, or a gap in our knowledge reads
 * as a fact about the building.
 */
export interface UnitLayoutSummary {
  bedrooms: number | null;
  bathrooms: number | null;
  recorded_space_count: number;
  complete: boolean;
  unknown: string;
}

export interface PropertyUnit {
  id: string;
  holding: string;
  holding_name: string;
  name: string;
  unit_type: UnitType | null;
  unit_type_display: string;
  rental_mode: RentalMode;
  rental_mode_display: string;
  layout_complete: boolean;
  missing_layout_notes: string;
  offerings: UnitOffering[];
  layout: UnitArea[];
  layout_summary: UnitLayoutSummary;
  created_at: string;
  updated_at: string;
}

export interface HoldingHierarchy {
  id: string;
  name: string;
  kind: string;
  address: string;
  city: string;
  units: PropertyUnit[];
}

export interface PropertyHierarchy {
  holdings: HoldingHierarchy[];
  unassigned_listings: PropertyDetail[];
}

export interface RentalModeSwitchPreview {
  ok: boolean;
  unit: string;
  from_mode: RentalMode;
  to_mode: RentalMode;
  blocked_by: {
    lease_number: string;
    status: string;
    listing: string | null;
  }[];
  will_park: string[];
  will_reactivate: string[];
  needs_new_listing: boolean;
  note: string;
}

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
  province: string; // "bc" — the code, not the name
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

  // Which physical space this listing is an offer on. `is_active_offering` is
  // false for listings parked by a rental-mode switch — kept with all their
  // history, but not on the market.
  unit_id: string | null;
  unit_name: string | null;
  rental_mode: RentalMode | null;
  holding_name: string | null;
  is_active_offering: boolean;

  // Public
  is_publicly_visible: boolean;
  public_slug: string | null;
  asking_rent: string | null;
  available_from: string | null;
  is_furnished: boolean; // DERIVED from inventory. Never editable.
  publish_blockers: string[]; // why this can't appear publicly, in plain words
  can_be_published: boolean;
}

// ------------------------------------------------------------------ helpers
function headers(token: string, json = true): Record<string, string> {
  const h: Record<string, string> = { Authorization: `Token ${token}` };
  if (json) h['Content-Type'] = 'application/json';
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
    if (key === 'detail' || key === 'non_field_errors') {
      detail = Array.isArray(value) ? String(value[0]) : String(value);
    } else if (Array.isArray(value)) {
      fields[key] = String(value[0]);
    } else if (typeof value === 'string') {
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
    super(errors.detail ?? 'Request failed');
  }
}

async function handle<T>(res: Response): Promise<T> {
  if (!res.ok) throw new ApiError(await parseError(res));
  if (res.status === 204) return undefined as T;
  return res.json();
}

const unwrap = <T>(d: unknown): T[] =>
  Array.isArray(d) ? d : ((d as { results?: T[] })?.results ?? []);

// -------------------------------------------------------------------- calls
export async function fetchProperties(
  token: string
): Promise<PropertyDetail[]> {
  const res = await fetch(`${DJANGO_API_URL}/properties/`, {
    headers: headers(token, false),
  });
  return unwrap<PropertyDetail>(await handle(res));
}

export async function fetchProperty(
  token: string,
  id: number | string
): Promise<PropertyDetail> {
  const res = await fetch(`${DJANGO_API_URL}/properties/${id}/`, {
    headers: headers(token, false),
  });
  return handle(res);
}

export async function createProperty(
  token: string,
  body: Record<string, unknown>
): Promise<PropertyDetail> {
  const res = await fetch(`${DJANGO_API_URL}/properties/`, {
    method: 'POST',
    headers: headers(token),
    body: JSON.stringify(body),
  });
  return handle(res);
}

export async function updateProperty(
  token: string,
  id: number | string,
  body: Record<string, unknown>
): Promise<PropertyDetail> {
  const res = await fetch(`${DJANGO_API_URL}/properties/${id}/`, {
    method: 'PATCH',
    headers: headers(token),
    body: JSON.stringify(body),
  });
  return handle(res);
}

export async function uploadPrimaryImage(
  token: string,
  id: number | string,
  file: File
): Promise<PropertyDetail> {
  const form = new FormData();
  form.append('primary_image', file);
  const res = await fetch(`${DJANGO_API_URL}/properties/${id}/`, {
    method: 'PATCH',
    headers: headers(token, false),
    body: form,
  });
  return handle(res);
}

export async function addGalleryImage(
  token: string,
  id: number | string,
  file: File,
  caption = ''
): Promise<{ id: number; image: string; caption: string }> {
  const form = new FormData();
  form.append('image', file);
  if (caption) form.append('caption', caption);
  const res = await fetch(`${DJANGO_API_URL}/properties/${id}/images/`, {
    method: 'POST',
    headers: headers(token, false),
    body: form,
  });
  return handle(res);
}

export async function deleteGalleryImage(
  token: string,
  propertyId: number | string,
  imageId: number
): Promise<void> {
  const res = await fetch(
    `${DJANGO_API_URL}/properties/${propertyId}/images/${imageId}/`,
    {
      method: 'DELETE',
      headers: headers(token, false),
    }
  );
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

// ------------------------------------------------------ units & hierarchy
/**
 * Address -> unit -> live offerings. This is the shape the portfolio actually
 * has; reading the flat listing list is what made nine units look like
 * fourteen rooms.
 */
export async function fetchHierarchy(
  token: string,
  opts: { includeInactive?: boolean } = {}
): Promise<PropertyHierarchy> {
  const q = opts.includeInactive ? '?include_inactive=true' : '';
  const res = await fetch(`${DJANGO_API_URL}/properties/hierarchy/${q}`, {
    headers: headers(token, false),
  });
  return handle(res);
}

export async function fetchUnits(token: string): Promise<PropertyUnit[]> {
  const res = await fetch(`${DJANGO_API_URL}/properties/units/`, {
    headers: headers(token, false),
  });
  return unwrap<PropertyUnit>(await handle(res));
}

export async function updateUnit(
  token: string,
  id: string,
  body: Record<string, unknown>
): Promise<PropertyUnit> {
  const res = await fetch(`${DJANGO_API_URL}/properties/units/${id}/`, {
    method: 'PATCH',
    headers: headers(token),
    body: JSON.stringify(body),
  });
  return handle(res);
}

/** What a rental-mode switch WOULD do. Writes nothing — always show this first. */
export async function previewRentalMode(
  token: string,
  id: string,
  rentalMode: RentalMode
): Promise<RentalModeSwitchPreview> {
  const res = await fetch(
    `${DJANGO_API_URL}/properties/units/${id}/rental_mode_preview/`,
    {
      method: 'POST',
      headers: headers(token),
      body: JSON.stringify({ rental_mode: rentalMode }),
    }
  );
  return handle(res);
}

/**
 * Perform the switch. Nothing is deleted — the other mode's listings are
 * parked and return if you switch back. Throws (409) while any lease is live
 * in the unit.
 */
export async function setRentalMode(
  token: string,
  id: string,
  rentalMode: RentalMode
): Promise<{
  ok: boolean;
  parked: string[];
  reactivated: string[];
  needs_new_listing: boolean;
}> {
  const res = await fetch(
    `${DJANGO_API_URL}/properties/units/${id}/set_rental_mode/`,
    {
      method: 'POST',
      headers: headers(token),
      body: JSON.stringify({ rental_mode: rentalMode }),
    }
  );
  return handle(res);
}
