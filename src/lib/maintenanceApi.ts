// maintenanceApi.ts
//
// Client for the maintenance app (/api/maintenance/...).
// Mirrors WorkOrderSerializer exactly; status changes are landlord-only
// and go through /transition/ (the backend FSM is the single gatekeeper).

import { DJANGO_API_URL } from "@/lib/config";

// ---------------------------------------------------------------- types

export type WorkOrderCategory =
    | "PLUMBING" | "ELECTRICAL" | "HEATING_COOLING" | "APPLIANCE"
    | "STRUCTURAL" | "PEST" | "SAFETY" | "OTHER";

export type WorkOrderPriority = "LOW" | "MEDIUM" | "HIGH" | "EMERGENCY";

export type WorkOrderStatus =
    | "NEW" | "SCHEDULED" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED";

export interface WorkOrderImage {
    id: number;
    image: string;
    caption: string;
    created_at: string;
}

export interface WorkOrderComment {
    id: number;
    body: string;
    author_name: string;
    is_landlord: boolean;
    created_at: string;
}

export interface MaintenanceArea {
    id: number;
    name: string;
    kind: string;
    kind_display: string;
    exclusive_to: number | null;
    group: number | null;
    property: number | null;
}

export interface WorkOrder {
    id: string; // UUID
    property_name: string;
    property_address: string;
    area_name: string | null;
    reported_by_name: string;
    origin: "TENANT" | "LANDLORD" | "ROUTINE";
    origin_display: string;
    title: string;
    description: string;
    category: WorkOrderCategory;
    category_display: string;
    priority: WorkOrderPriority;
    priority_display: string;
    status: WorkOrderStatus;
    status_display: string;
    allowed_transitions: WorkOrderStatus[];
    scheduled_date: string | null;
    completed_date: string | null;
    cost: string | null;
    contractor_name: string;
    contractor_phone: string;
    sla_due_at: string | null;
    is_rta_emergency: boolean;
    sla_breached: boolean;
    images: WorkOrderImage[];
    comments: WorkOrderComment[];
    created_at: string;
    updated_at: string;
}

export interface CreateWorkOrderPayload {
    property_id: number;
    area_id?: number | null;
    lease_id?: number | null;
    title: string;
    description: string;
    category: WorkOrderCategory;
    priority: WorkOrderPriority;
}

export const WORK_ORDER_CATEGORIES: { value: WorkOrderCategory; label: string }[] = [
    { value: "PLUMBING", label: "Plumbing" },
    { value: "ELECTRICAL", label: "Electrical" },
    { value: "HEATING_COOLING", label: "Heating / Cooling" },
    { value: "APPLIANCE", label: "Appliance" },
    { value: "STRUCTURAL", label: "Structural / Doors / Windows" },
    { value: "PEST", label: "Pest Control" },
    { value: "SAFETY", label: "Safety (locks, detectors)" },
    { value: "OTHER", label: "Other" },
];

export const WORK_ORDER_PRIORITIES: { value: WorkOrderPriority; label: string; hint: string }[] = [
    { value: "LOW", label: "Low", hint: "Cosmetic or minor — whenever convenient" },
    { value: "MEDIUM", label: "Medium", hint: "Needs fixing, but livable" },
    { value: "HIGH", label: "High", hint: "Significantly affects daily use" },
    { value: "EMERGENCY", label: "Emergency", hint: "No heat/water, major leak, electrical hazard, broken lock" },
];

// -------------------------------------------------------------- fetchers

const authHeaders = (token: string) => ({
    Authorization: `Token ${token}`,
    "Content-Type": "application/json",
});

async function handle<T>(res: Response): Promise<T> {
    if (!res.ok) {
        let detail = `Request failed (${res.status})`;
        try {
            const body = await res.json();
            detail = body.detail || Object.values(body).flat().join(" ") || detail;
        } catch { /* keep default */ }
        throw new Error(detail);
    }
    return res.json();
}

// DRF may or may not paginate list endpoints; accept both shapes.
function unwrapList<T>(data: T[] | { results: T[] }): T[] {
    return Array.isArray(data) ? data : (data.results ?? []);
}

export async function fetchWorkOrders(
    token: string,
    params: { property?: number; status?: WorkOrderStatus } = {},
): Promise<WorkOrder[]> {
    const qs = new URLSearchParams();
    if (params.property) qs.set("property", String(params.property));
    if (params.status) qs.set("status", params.status);
    const res = await fetch(
        `${DJANGO_API_URL}/maintenance/work-orders/${qs.toString() ? `?${qs}` : ""}`,
        { headers: authHeaders(token) },
    );
    return unwrapList(await handle<WorkOrder[] | { results: WorkOrder[] }>(res));
}

export async function fetchWorkOrder(token: string, id: string): Promise<WorkOrder> {
    const res = await fetch(`${DJANGO_API_URL}/maintenance/work-orders/${id}/`, {
        headers: authHeaders(token),
    });
    return handle<WorkOrder>(res);
}

export async function createWorkOrder(
    token: string,
    payload: CreateWorkOrderPayload,
): Promise<WorkOrder> {
    const res = await fetch(`${DJANGO_API_URL}/maintenance/work-orders/`, {
        method: "POST",
        headers: authHeaders(token),
        body: JSON.stringify(payload),
    });
    return handle<WorkOrder>(res);
}

export async function addWorkOrderComment(
    token: string,
    workOrderId: string,
    body: string,
): Promise<WorkOrderComment> {
    const res = await fetch(
        `${DJANGO_API_URL}/maintenance/work-orders/${workOrderId}/add_comment/`,
        { method: "POST", headers: authHeaders(token), body: JSON.stringify({ body }) },
    );
    return handle<WorkOrderComment>(res);
}

export async function addWorkOrderImage(
    token: string,
    workOrderId: string,
    file: File,
    caption = "",
): Promise<WorkOrderImage> {
    const form = new FormData();
    form.append("image", file);
    if (caption) form.append("caption", caption);
    const res = await fetch(
        `${DJANGO_API_URL}/maintenance/work-orders/${workOrderId}/add_image/`,
        {
            method: "POST",
            headers: { Authorization: `Token ${token}` }, // browser sets multipart boundary
            body: form,
        },
    );
    return handle<WorkOrderImage>(res);
}

/** The areas the current user may attach a work order to on this property
 *  (tenants get exactly their room's common/exclusive/system areas). */
export async function fetchMaintenanceAreas(
    token: string,
    propertyId: number,
): Promise<MaintenanceArea[]> {
    const res = await fetch(
        `${DJANGO_API_URL}/maintenance/areas/?property=${propertyId}`,
        { headers: authHeaders(token) },
    );
    return unwrapList(await handle<MaintenanceArea[] | { results: MaintenanceArea[] }>(res));
}

/** Landlord-only: legal FSM transition (SCHEDULED, IN_PROGRESS, ...). */
export async function transitionWorkOrder(
    token: string,
    workOrderId: string,
    newStatus: WorkOrderStatus,
): Promise<WorkOrder> {
    const res = await fetch(
        `${DJANGO_API_URL}/maintenance/work-orders/${workOrderId}/transition/`,
        { method: "POST", headers: authHeaders(token), body: JSON.stringify({ status: newStatus }) },
    );
    return handle<WorkOrder>(res);
}