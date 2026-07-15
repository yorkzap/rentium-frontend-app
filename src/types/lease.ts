// src/types/lease.ts
//
// Shared Lease/LeaseTenant/LeaseDocument shapes, mirroring
// rentium/leases/api/serializers.py (LeaseSerializer, LeaseListSerializer,
// LeaseTenantSerializer, LeaseDocumentSerializer) on the backend.
//
// `Lease` covers both the list shape (GET /leases/, LeaseListSerializer) and
// the detail shape (GET /leases/:id/, LeaseSerializer) — fields only present
// on the detail response are optional so a single type can describe both.

export type LeaseStatus =
  | 'DRAFT'
  | 'PENDING'
  | 'ACTIVE'
  | 'EXPIRED'
  | 'TERMINATED'
  | 'RENEWED';

export type LeaseType =
  | 'BC_ROOMMATE'
  | 'SK_ROOMMATE'
  | 'BC_RESIDENTIAL'
  | 'SK_RESIDENTIAL'
  | 'GENERIC_RESIDENTIAL'
  | string;

export interface EffectiveLandlordContact {
  address: string;
  daytime_phone: string | null;
  other_phone: string | null;
  fax: string | null;
  email: string;
}

export interface LeaseTenant {
  id: string;
  lease?: string;
  tenant?: number | null;
  tenant_name: string | null;
  tenant_email: string | null;
  rent_amount: string | null;
  effective_rent?: string | null;
  room?: number | null;
  room_name: string | null;
  cleaning_fee?: string | null;
  cleaning_fee_paid?: boolean;
  is_primary_tenant?: boolean;
  has_signed: boolean;
  signed_date?: string | null;
  declined: boolean;
  declined_at?: string | null;
  decline_reason?: string | null;
  individual_start_date?: string | null;
  individual_end_date?: string | null;
  invited_email: string | null;
  invited_name?: string | null;
  invited_phone?: string | null;
  invite_status?: 'NOT_SENT' | 'PENDING' | 'ACCEPTED' | 'LINKED' | 'DECLINED';
  invite_url?: string | null;
  invite_sent_at?: string | null;
  invite_accepted_at?: string | null;
  tenant_notes?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface LeaseDocument {
  id: string;
  lease?: string;
  lease_number?: string;
  title: string;
  document: string;
  description?: string | null;
  is_signed?: boolean;
  uploaded_at: string | null;
}

export interface Lease {
  id: string;
  lease_type: LeaseType;
  lease_type_display: string;
  property?: number | null;
  property_name: string | null;
  property_address: string | null;
  group?: number | null;
  group_name: string | null;
  landlord?: number | string;
  landlord_name: string;
  lease_number: string;
  status: LeaseStatus;
  status_display: string;
  is_locked?: boolean;
  start_date: string;
  end_date: string | null;
  is_month_to_month?: boolean;
  move_in_date?: string | null;
  move_out_date?: string | null;
  security_deposit?: string | null;
  pet_deposit?: string | null;
  cleaning_fee?: string | null;
  pets_allowed?: boolean;
  smoking_allowed?: boolean;
  bills_included?: Record<string, unknown> | null;
  bills_summary?: string | null;
  special_terms?: string | null;
  common_space_shared_with?: string[] | null;
  common_space_clause_text?: string;
  landlord_service_address?: string | null;
  landlord_daytime_phone?: string | null;
  landlord_other_phone?: string | null;
  landlord_fax?: string | null;
  landlord_service_email?: string | null;
  etransfer_email?: string | null;
  effective_etransfer_email?: string | null;
  effective_landlord_contact?: EffectiveLandlordContact;
  fixed_term_end_reason?: string | null;
  fixed_term_end_regulation_section?: string | null;
  custom_tenant_notice_months?: number | null;
  landlord_signed?: boolean;
  landlord_signed_date?: string | null;
  document_file?: string | null;
  previous_lease?: string | null;
  created_at?: string;
  updated_at?: string;
  lease_tenants?: LeaseTenant[];
  additional_documents?: LeaseDocument[];
  total_rent: string;
  total_monthly_rent?: string;
  unallocated_rent?: string;
  current_tenant_count?: number;
  tenant_count?: number;
  max_occupancy?: number;
  primary_tenant_name?: string | null;
  tenant_names?: string[];
}
