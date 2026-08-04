// Form packs: extra PDFs signed alongside (or after) the lease itself.
//
// Mirrors rentium/leases/api/form_serializers.py. Note what is NOT here: file
// URLs. The backend never serialises a FileField for these, because production
// media is served from public URLs and a signed tenancy document must not be
// one. Bytes come from the download endpoints, authenticated.

/** WHEN in a tenancy a form is signed — and therefore what it does. */
export type FormStage =
  /** Part of executing the lease. Unsigned, it holds up activation. */
  | 'WITH_LEASE'
  /** Signed at any point during a live tenancy. Never blocks anything. */
  | 'ADDENDUM'
  /** Signed to END a tenancy — RTB-8 and friends. Drives the move-out. */
  | 'MOVE_OUT'
  /** Uploaded, read, but nobody has said what it is for yet. */
  | 'UNCLASSIFIED';

export type FormFieldKind =
  'SIGNATURE' | 'INITIALS' | 'DATE' | 'NAME' | 'TEXT' | 'CHECKBOX';

export type SignerRole = 'LANDLORD' | 'CO_LANDLORD' | 'TENANT' | 'OTHER';

export type LeaseFormStatus =
  'DRAFT' | 'SENT' | 'PARTIAL' | 'COMPLETED' | 'VOID';

/**
 * One field box, in FRACTIONS of the page (0..1), origin top-left.
 *
 * Not pixels and not PDF points: the landlord places boxes on a server-rendered
 * page image at whatever size their screen happened to use, and the server
 * stamps onto the real PDF. Fractions are the only representation that survives
 * that trip unchanged.
 */
export interface FormPlacement {
  id?: string;
  key: string;
  label: string;
  page: number;
  x: number;
  y: number;
  width: number;
  height: number;
  kind: FormFieldKind;
  signer_role: SignerRole;
  signer_index: number;
  /** Whitelisted lease field to prefill from, e.g. `tenant.display_name`. */
  auto_source: string;
  required: boolean;
  font_size: number;
  order?: number;
}

/** What OCR thinks a form is. Always rendered as a proposal, never a fact. */
export interface FormSuggestion {
  stage: FormStage;
  purpose: string;
  confidence: 'low' | 'medium' | 'high';
  signals: string[];
}

export interface LeaseFormTemplate {
  id: string;
  code: string;
  name: string;
  purpose: string;
  jurisdiction: string;
  source: 'SYSTEM' | 'CUSTOM';
  stage: FormStage;
  availability: 'AVAILABLE' | 'COMING_SOON';
  /** Whether it can actually be attached right now. */
  available: boolean;
  is_system: boolean;
  binds_to: string;
  page_count: number;
  page_sizes: { width: number; height: number }[];
  placement_count: number;
  suggestion: FormSuggestion | null;
  original_filename: string;
  created_at: string;
}

export interface FormSigner {
  id: string;
  role: SignerRole;
  order: number;
  display_name: string;
  email: string;
  required: boolean;
  has_signed: boolean;
  sent_at: string | null;
  opened_at: string | null;
  signed_at: string | null;
  declined_at: string | null;
  decline_reason: string;
}

export interface LeaseForm {
  id: string;
  lease: string;
  template: LeaseFormTemplate;
  title: string;
  stage: FormStage;
  status: LeaseFormStatus;
  required: boolean;
  /** True only while this form is what stands between a lease and ACTIVE. */
  blocks_activation: boolean;
  moveout_request: string | null;
  placements: FormPlacement[];
  values: Record<string, string>;
  signers: FormSigner[];
  outstanding: string[];
  /**
   * Content the form insists on that is still blank — a vacate date, a name.
   * The backend refuses to send while this is non-empty, so the UI collects it
   * up front instead of letting the landlord discover it by pressing Send.
   */
  needs_filling: string[];
  executed_sha256: string;
  completed_at: string | null;
  created_via: string;
  created_at: string;
}

export interface LeaseFormEvent {
  id: string;
  kind: string;
  actor_name: string;
  signer_name: string;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface ActivationStatus {
  status: string;
  can_activate: boolean;
  /** Plain sentences: "The landlord hasn't signed yet.", "X still needs signing." */
  blockers: string[];
  blocking_forms: LeaseForm[];
}

// --- The public signing page (no account) ----------------------------------

export interface PublicSigningView {
  form_id: string;
  title: string;
  purpose: string;
  stage: FormStage;
  status: LeaseFormStatus;
  page_count: number;
  page_sizes: { width: number; height: number }[];
  landlord_name: string;
  property_label: string;
  signer: {
    name: string;
    role: SignerRole;
    email: string;
    has_signed: boolean;
    declined: boolean;
  };
  /** Only this signer's boxes — never anyone else's. */
  my_fields: FormPlacement[];
  values: Record<string, string>;
  blocks_activation: boolean;
  expires_at: string | null;
  already_complete: boolean;
}

export type SignatureMethod = 'TYPED' | 'DRAWN';
