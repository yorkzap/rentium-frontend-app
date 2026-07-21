// appointmentsApi.ts
import { DJANGO_API_URL } from '@/lib/config';

export type AppointmentKind = 'VIEWING' | 'INSPECTION' | 'CONTRACTOR' | 'OTHER';
export type AppointmentStatus =
  'REQUESTED' | 'AWAITING_REQUESTER' | 'SCHEDULED' | 'COMPLETED' | 'CANCELLED';
export type TimeClass = 'UNSET' | 'IN_HOURS' | 'OUT_OF_HOURS';
export type TenantConsent = 'NOT_APPLICABLE' | 'PENDING' | 'OK' | 'OBJECTED';

export interface AppointmentProposal {
  id: number;
  proposed_by: 'LANDLORD' | 'REQUESTER' | 'TENANT';
  proposed_by_display: string;
  starts_at: string;
  message: string;
  created_at: string;
}

export interface Appointment {
  id: string;
  property: number;
  property_name: string;
  lease: string | null;
  lease_number: string | null;
  work_order: string | null;
  work_order_title: string | null;
  kind: AppointmentKind;
  kind_display: string;
  status: AppointmentStatus;
  status_display: string;
  starts_at: string;
  ends_at: string | null;
  time_class: TimeClass;
  time_class_display: string;
  tenant_consent: TenantConsent;
  tenant_consent_display: string;
  tenant_consent_notes: string;
  contact_name: string;
  contact_email: string;
  contact_phone: string;
  notes: string;
  proposals: AppointmentProposal[];
}

function headers(token: string, json = true): Record<string, string> {
  const h: Record<string, string> = { Authorization: `Token ${token}` };
  if (json) h['Content-Type'] = 'application/json';
  return h;
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
  if (res.status === 204) return null;
  return res.json();
}

const unwrap = <T>(d: T[] | { results?: T[] } | null): T[] =>
  Array.isArray(d) ? d : (d?.results ?? []);

export async function listAppointments(
  token: string,
  opts: { lease?: string; property?: number | string; upcoming?: boolean } = {}
): Promise<Appointment[]> {
  const params = new URLSearchParams();
  if (opts.lease) params.set('lease', opts.lease);
  if (opts.property) params.set('property', String(opts.property));
  if (opts.upcoming) params.set('upcoming', '1');
  const res = await fetch(`${DJANGO_API_URL}/appointments/?${params}`, {
    headers: headers(token, false),
  });
  return unwrap<Appointment>(await handle(res));
}

export interface CreateAppointmentPayload {
  property: number;
  lease?: string | null;
  work_order?: string | null;
  kind: AppointmentKind;
  starts_at: string; // ISO datetime
  ends_at?: string | null;
  contact_name?: string;
  contact_phone?: string;
  notes?: string;
}

export async function createAppointment(
  token: string,
  payload: CreateAppointmentPayload
): Promise<Appointment> {
  const res = await fetch(`${DJANGO_API_URL}/appointments/`, {
    method: 'POST',
    headers: headers(token),
    body: JSON.stringify(payload),
  });
  return handle(res);
}

export async function confirmAppointment(
  token: string,
  id: string,
  startsAt?: string
): Promise<Appointment> {
  const res = await fetch(`${DJANGO_API_URL}/appointments/${id}/confirm/`, {
    method: 'POST',
    headers: headers(token),
    body: JSON.stringify(startsAt ? { starts_at: startsAt } : {}),
  });
  return handle(res);
}

export async function declineAppointment(
  token: string,
  id: string,
  reason = ''
): Promise<Appointment> {
  const res = await fetch(`${DJANGO_API_URL}/appointments/${id}/decline/`, {
    method: 'POST',
    headers: headers(token),
    body: JSON.stringify({ reason }),
  });
  return handle(res);
}

/** Landlord proposes a different time → AWAITING_REQUESTER. */
export async function counterAppointment(
  token: string,
  id: string,
  startsAt: string,
  message = ''
): Promise<Appointment> {
  const res = await fetch(`${DJANGO_API_URL}/appointments/${id}/counter/`, {
    method: 'POST',
    headers: headers(token),
    body: JSON.stringify({ starts_at: startsAt, message }),
  });
  return handle(res);
}

/** Current tenant records consent (advisory) for a showing at their unit. */
export async function tenantRespondAppointment(
  token: string,
  id: string,
  payload: { consent: 'OK' | 'OBJECTED'; notes?: string; starts_at?: string }
): Promise<Appointment> {
  const res = await fetch(
    `${DJANGO_API_URL}/appointments/${id}/tenant_respond/`,
    {
      method: 'POST',
      headers: headers(token),
      body: JSON.stringify(payload),
    }
  );
  return handle(res);
}

/** Landlord opens an inspection-walkthrough negotiation with the tenant. */
export async function proposeInspection(
  token: string,
  inspectionId: string,
  startsAt: string
): Promise<Appointment> {
  const res = await fetch(
    `${DJANGO_API_URL}/appointments/propose_inspection/`,
    {
      method: 'POST',
      headers: headers(token),
      body: JSON.stringify({ inspection: inspectionId, starts_at: startsAt }),
    }
  );
  return handle(res);
}

/** Tenant's half of an inspection negotiation: accept or counter the time. */
export async function respondToInspectionSchedule(
  token: string,
  id: string,
  payload: { action: 'accept' } | { action: 'counter'; starts_at: string }
): Promise<Appointment> {
  const res = await fetch(
    `${DJANGO_API_URL}/appointments/${id}/schedule_respond/`,
    {
      method: 'POST',
      headers: headers(token),
      body: JSON.stringify(payload),
    }
  );
  return handle(res);
}

// ------------------------------------------------- preferred viewing hours
export interface AvailabilityWindow {
  id: number;
  property: number | null;
  weekday: number; // 0=Mon … 6=Sun
  weekday_display: string;
  start_time: string; // "HH:MM[:SS]"
  end_time: string;
}

export async function listAvailability(
  token: string,
  property?: number | string
): Promise<AvailabilityWindow[]> {
  const qs = property ? `?property=${property}` : '';
  const res = await fetch(`${DJANGO_API_URL}/appointments/availability/${qs}`, {
    headers: headers(token, false),
  });
  return unwrap<AvailabilityWindow>(await handle(res));
}

export async function createAvailability(
  token: string,
  payload: {
    weekday: number;
    start_time: string;
    end_time: string;
    property?: number | null;
  }
): Promise<AvailabilityWindow> {
  const res = await fetch(`${DJANGO_API_URL}/appointments/availability/`, {
    method: 'POST',
    headers: headers(token),
    body: JSON.stringify(payload),
  });
  return handle(res);
}

export async function deleteAvailability(
  token: string,
  id: number
): Promise<void> {
  const res = await fetch(
    `${DJANGO_API_URL}/appointments/availability/${id}/`,
    { method: 'DELETE', headers: headers(token, false) }
  );
  await handle(res);
}

// ---- public (no-auth) endpoints for the /viewing/[propertyId] page ----
export interface PublicProperty {
  id: number;
  name: string;
  city: string;
  province: string;
  category: string;
  room_type: string | null;
  available: boolean;
  image: string | null;
}

export async function fetchPublicProperty(
  propertyId: string | number
): Promise<PublicProperty> {
  const res = await fetch(`${DJANGO_API_URL}/public/properties/${propertyId}/`);
  return handle(res);
}

/** Suggested in-hours slots to steer the picker. hours_set=false → the
 * landlord hasn't set preferred hours; the picker offers a free time input. */
export async function fetchViewingSlots(
  propertyId: string | number
): Promise<{ hours_set: boolean; slots: string[] }> {
  const res = await fetch(
    `${DJANGO_API_URL}/public/properties/${propertyId}/slots/`
  );
  return handle(res);
}

export async function submitViewingRequest(payload: {
  property: number;
  name: string;
  email: string;
  phone?: string;
  requested_time: string;
  message?: string;
}): Promise<{
  ok: boolean;
  reference: string;
  status_token: string;
  detail: string;
}> {
  const res = await fetch(`${DJANGO_API_URL}/public/viewing-requests/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return handle(res);
}

// The requester's tracking page (/viewing/status/[token]) — a per-appointment
// capability link carried by their confirmation email, no account needed.
export interface ViewingStatus {
  status: AppointmentStatus;
  status_display: string;
  starts_at: string;
  requested_by: string;
  property: {
    name: string;
    location: string;
    city: string;
    province: string;
    type_label: string;
  };
}

export async function fetchViewingStatus(
  token: string
): Promise<ViewingStatus> {
  const res = await fetch(`${DJANGO_API_URL}/public/viewing-status/${token}/`);
  return handle(res);
}

/** The requester's half of the negotiation, no account — capability token only.
 * accept the landlord's proposed time, counter with another, or withdraw. */
export async function submitViewingResponse(
  token: string,
  payload:
    | { action: 'accept' }
    | { action: 'withdraw' }
    | { action: 'counter'; requested_time: string; message?: string }
): Promise<{ ok: boolean; status: AppointmentStatus }> {
  const res = await fetch(
    `${DJANGO_API_URL}/public/viewing-respond/${token}/`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    }
  );
  return handle(res);
}

export async function cancelAppointment(
  token: string,
  id: string
): Promise<void> {
  const res = await fetch(`${DJANGO_API_URL}/appointments/${id}/`, {
    method: 'DELETE',
    headers: headers(token, false),
  });
  await handle(res);
}
