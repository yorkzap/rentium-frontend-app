// LeaseDetail.tsx
'use client';
import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Loader2,
  AlertCircle,
  ArrowLeft,
  Mail,
  CheckCircle2,
  Clock,
  Signature,
  XCircle,
  Copy,
  UserPlus,
  Trash2,
  Ban,
  FileDown,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { DJANGO_API_URL } from '@/lib/config';
import { previewRentSplit } from '@/lib/leaseApi';
import { toast } from 'sonner';
// Condition inspections (move-in / move-out) — built in the inspections
// suite (LeaseInspections + InspectionWizard + inspectionApi); mounted as
// a section of this page below.
import LeaseInspections from './LeaseInspections';
import LeaseMoveOuts from './LeaseMoveOuts';
import LeaseAppointments from './LeaseAppointments';
interface RentAdjustment {
  id: string;
  adjustment_type: string;
  calculation_method: string;
  amount: string;
  effective_date: string;
  end_date: string | null;
  is_recurring: boolean;
  adjusted_preview: string | number | null;
}
interface LeaseTenantDetail {
  id: string;
  tenant: number | null;
  tenant_name: string | null;
  tenant_email: string | null;
  // Full legal name the landlord entered when inviting (used to pre-fill
  // the lease form, e.g. the RTB-1 parties/signature blocks) — the linked
  // account's own name takes over once the tenant registers.
  invited_name?: string;
  rent_amount: string;
  effective_rent: string;
  room_name: string | null;
  is_primary_tenant: boolean;
  has_signed: boolean;
  signed_date: string | null;
  declined: boolean;
  declined_at: string | null;
  decline_reason: string;
  invited_email: string;
  invite_status: 'LINKED' | 'ACCEPTED' | 'PENDING' | 'NOT_SENT' | 'DECLINED';
  invite_url: string | null;
  invite_sent_at: string | null;
  invite_accepted_at: string | null;
  rent_adjustments: RentAdjustment[];
}
interface LeaseDetailData {
  id: string;
  lease_number: string;
  lease_type_display: string;
  status: string;
  status_display: string;
  is_locked: boolean;
  property_name: string | null;
  property_address: string | null;
  group_name: string | null;
  landlord_signed: boolean;
  landlord_signed_date: string | null;
  start_date: string;
  end_date: string | null;
  is_month_to_month: boolean;
  move_in_date?: string | null;
  pets_allowed?: boolean;
  smoking_allowed?: boolean;
  etransfer_email?: string;
  effective_etransfer_email?: string;
  security_deposit: string;
  pet_deposit: string;
  cleaning_fee: string;
  bills_summary: string;
  special_terms: string;
  common_space_clause_text: string;
  co_hosts?: { name: string; email?: string; phone?: string }[];
  total_rent: string;
  total_monthly_rent: string;
  unallocated_rent: string;
  lease_tenants: LeaseTenantDetail[];
}
const STATUS_STYLES: Record<string, string> = {
  ACTIVE: 'bg-green-50 text-green-700',
  PENDING: 'bg-amber-50 text-amber-700',
  DRAFT: 'bg-slate-100 text-slate-700',
  EXPIRED: 'bg-red-50 text-red-700',
  TERMINATED: 'bg-red-50 text-red-700',
  RENEWED: 'bg-blue-50 text-blue-700',
};
const INVITE_STATUS_STYLES: Record<string, string> = {
  LINKED: 'bg-green-50 text-green-700',
  ACCEPTED: 'bg-blue-50 text-blue-700',
  PENDING: 'bg-amber-50 text-amber-700',
  NOT_SENT: 'bg-slate-100 text-slate-600',
  DECLINED: 'bg-red-50 text-red-700',
};
export default function LeaseDetail({ leaseId }: { leaseId: string }) {
  const router = useRouter();
  const { token } = useAuth();
  const [lease, setLease] = useState<LeaseDetailData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSigning, setIsSigning] = useState(false);
  const [resendingId, setResendingId] = useState<string | null>(null);
  const [isAddTenantOpen, setIsAddTenantOpen] = useState(false);
  interface RosterRow {
    id: string | null; // null = new, not-yet-created row
    email: string;
    // Full name (no first/last split — matches RTB-1 handling elsewhere).
    // Editable until the tenant links an account (their account name then
    // wins) or signs.
    name: string;
    linked: boolean; // tenant account attached — name comes from the account
    rentAmount: string;
    isPrimary: boolean;
    touched: boolean; // manually edited — see recomputeSplits below
    hasSigned: boolean; // signed rows are locked: shown, but never editable/recomputed
  }
  const [rosterRows, setRosterRows] = useState<RosterRow[]>([]);
  const [isAddingTenant, setIsAddingTenant] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [terminateDialogOpen, setTerminateDialogOpen] = useState(false);
  const [isTerminating, setIsTerminating] = useState(false);
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);
  const fetchLease = useCallback(async () => {
    if (!token) {
      setIsLoading(false);
      setError('Authentication required.');
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch(`${DJANGO_API_URL}/leases/${leaseId}/`, {
        headers: { Authorization: `Token ${token}` },
      });
      if (!res.ok) {
        if (res.status === 404) throw new Error('Lease not found.');
        throw new Error(`Failed to load lease (${res.status})`);
      }
      setLease(await res.json());
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : 'Unknown error loading lease';
      setError(msg);
      toast.error(msg);
    } finally {
      setIsLoading(false);
    }
  }, [token, leaseId]);
  useEffect(() => {
    fetchLease();
  }, [fetchLease]);
  const handleLandlordSign = async () => {
    if (!token) return;
    setIsSigning(true);
    try {
      const res = await fetch(
        `${DJANGO_API_URL}/leases/${leaseId}/landlord_sign/`,
        {
          method: 'POST',
          headers: { Authorization: `Token ${token}` },
        }
      );
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.detail || `Failed to sign (${res.status})`);
      }
      toast.success(
        'Lease signed. It will activate once all tenants have signed too.'
      );
      fetchLease();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to sign lease.');
    } finally {
      setIsSigning(false);
    }
  };
  const handleResendInvite = async (leaseTenantId: string) => {
    if (!token) return;
    setResendingId(leaseTenantId);
    try {
      const res = await fetch(
        `${DJANGO_API_URL}/leases/tenants/${leaseTenantId}/resend_invite/`,
        {
          method: 'POST',
          headers: { Authorization: `Token ${token}` },
        }
      );
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(
          body.detail || `Failed to resend invite (${res.status})`
        );
      }
      toast.success('Invite resent.');
      fetchLease();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : 'Failed to resend invite.'
      );
    } finally {
      setResendingId(null);
    }
  };
  const handleDownloadPdf = async () => {
    if (!token || !lease) return;
    setIsDownloadingPdf(true);
    try {
      const res = await fetch(`${DJANGO_API_URL}/leases/${lease.id}/pdf/`, {
        headers: { Authorization: `Token ${token}` },
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(
          body.detail || `Failed to generate PDF (${res.status})`
        );
      }
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `lease_${lease.lease_number}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : 'Failed to download PDF.'
      );
    } finally {
      setIsDownloadingPdf(false);
    }
  };
  const handleCopyInviteLink = async (inviteUrl: string) => {
    try {
      await navigator.clipboard.writeText(inviteUrl);
      toast.success(
        "Invite link copied — it's live until the tenant uses it to set a password."
      );
    } catch {
      toast.error("Couldn't copy automatically. Link: " + inviteUrl);
    }
  };
  // Rent-split computation now lives entirely on the backend
  // (leases/services.py:compute_rent_split, called via preview-split) —
  // this used to be a local JS reimplementation of the same algorithm
  // duplicated between here and CreateLeaseForm.tsx. `syncSplit` sends the
  // current rows to the backend and applies whatever it computes back onto
  // state; `has_signed` for existing rows is resolved server-side, so it's
  // not tracked as authoritative here anymore (still kept locally just to
  // grey out/disable the input immediately without waiting on a round trip).
  const splitDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [isSyncingSplit, setIsSyncingSplit] = useState(false);
  const syncSplit = useCallback(
    async (rows: RosterRow[]) => {
      if (!token || !lease) return;
      setIsSyncingSplit(true);
      try {
        const result = await previewRentSplit(
          token,
          lease.id,
          rows.map((r) => ({
            id: r.id,
            rent_amount: r.rentAmount || null,
            touched: r.touched,
          }))
        );
        // Zip back by position — the backend preserves request row order,
        // and null-id (not-yet-created) rows can't be matched by id since
        // there may be more than one.
        setRosterRows((prev) =>
          prev.map((row, i) => {
            const resultRow = result.rows[i];
            if (!resultRow) return row;
            return {
              ...row,
              rentAmount: resultRow.rent_amount,
              hasSigned: resultRow.has_signed,
            };
          })
        );
      } catch (err) {
        toast.error(
          err instanceof Error
            ? err.message
            : "Couldn't recalculate the rent split."
        );
      } finally {
        setIsSyncingSplit(false);
      }
    },
    [token, lease]
  );
  const openRosterEditor = () => {
    if (!lease) return;
    const existingRows: RosterRow[] = lease.lease_tenants.map((lt) => ({
      id: lt.id,
      email: lt.tenant_email || lt.invited_email,
      name: lt.tenant_name || lt.invited_name || '',
      linked: lt.tenant !== null,
      rentAmount: lt.rent_amount,
      isPrimary: lt.is_primary_tenant,
      touched: true, // existing amounts start "as-is"; editing one marks it explicitly, others recompute around it
      hasSigned: lt.has_signed,
    }));
    const withNewRow = [
      ...existingRows,
      {
        id: null,
        email: '',
        name: '',
        linked: false,
        rentAmount: '',
        isPrimary: existingRows.length === 0,
        touched: false,
        hasSigned: false,
      },
    ];
    setRosterRows(withNewRow);
    syncSplit(withNewRow);
    setIsAddTenantOpen(true);
  };
  const addRosterRow = () => {
    setRosterRows((prev) => {
      const next = [
        ...prev,
        {
          id: null,
          email: '',
          name: '',
          linked: false,
          rentAmount: '',
          isPrimary: false,
          touched: false,
          hasSigned: false,
        },
      ];
      syncSplit(next);
      return next;
    });
  };
  const removeRosterRow = (index: number) => {
    setRosterRows((prev) => {
      const row = prev[index];
      if (row.id) {
        toast.error(
          "Existing tenants can't be removed here — use Django admin, or Terminate the lease."
        );
        return prev;
      }
      const next = prev.filter((_, i) => i !== index);
      syncSplit(next);
      return next;
    });
  };
  const updateRosterEmail = (index: number, email: string) => {
    setRosterRows((prev) =>
      prev.map((row, i) => (i === index ? { ...row, email } : row))
    );
  };
  const updateRosterName = (index: number, name: string) => {
    setRosterRows((prev) =>
      prev.map((row, i) => (i === index ? { ...row, name } : row))
    );
  };
  const updateRosterRent = (index: number, value: string) => {
    setRosterRows((prev) => {
      const next = prev.map((row, i) =>
        i === index ? { ...row, rentAmount: value, touched: true } : row
      );
      // Debounced — this fires on every keystroke, and we don't want a
      // network round trip per character typed.
      if (splitDebounceRef.current) clearTimeout(splitDebounceRef.current);
      splitDebounceRef.current = setTimeout(() => syncSplit(next), 350);
      return next;
    });
  };
  const setRosterPrimary = (index: number) => {
    setRosterRows((prev) =>
      prev.map((row, i) => ({ ...row, isPrimary: i === index }))
    );
  };
  const rosterAllocatedTotal = rosterRows.reduce(
    (sum, r) => sum + (parseFloat(r.rentAmount) || 0),
    0
  );
  const rosterUnallocated = lease
    ? Math.max(Number(lease.total_rent) - rosterAllocatedTotal, 0)
    : 0;
  const handleSaveRoster = async () => {
    if (!token || !lease) return;
    const originalById = new Map(lease.lease_tenants.map((lt) => [lt.id, lt]));
    const changedExisting = rosterRows.filter(
      (r) =>
        r.id &&
        !r.hasSigned &&
        r.rentAmount !== originalById.get(r.id)?.rent_amount
    );
    const primaryChangedExisting = rosterRows.filter((r) => {
      if (!r.id) return false;
      const original = originalById.get(r.id);
      return original && original.is_primary_tenant !== r.isPrimary;
    });
    // Name edits apply to invite rows only (a linked account's own name is
    // authoritative), and never to signed rows.
    const nameChangedExisting = rosterRows.filter((r) => {
      if (!r.id || r.linked || r.hasSigned) return false;
      const original = originalById.get(r.id);
      return original && (original.invited_name || '') !== r.name.trim();
    });
    const newRows = rosterRows.filter(
      (r) => !r.id && r.email.trim() && r.rentAmount
    );
    if (
      changedExisting.length === 0 &&
      primaryChangedExisting.length === 0 &&
      nameChangedExisting.length === 0 &&
      newRows.length === 0
    ) {
      setIsAddTenantOpen(false);
      return;
    }
    setIsAddingTenant(true);
    try {
      const headers = {
        Authorization: `Token ${token}`,
        'Content-Type': 'application/json',
      };
      // Existing rows: rent, primary status and/or name changed.
      const updatesById = new Map<string, Record<string, unknown>>();
      for (const r of changedExisting) {
        updatesById.set(r.id as string, {
          ...(updatesById.get(r.id as string) || {}),
          rent_amount: Number(r.rentAmount),
        });
      }
      for (const r of primaryChangedExisting) {
        updatesById.set(r.id as string, {
          ...(updatesById.get(r.id as string) || {}),
          is_primary_tenant: r.isPrimary,
        });
      }
      for (const r of nameChangedExisting) {
        updatesById.set(r.id as string, {
          ...(updatesById.get(r.id as string) || {}),
          invited_name: r.name.trim(),
        });
      }
      const updatePromises = Array.from(updatesById.entries()).map(
        ([id, body]) =>
          fetch(`${DJANGO_API_URL}/leases/tenants/${id}/`, {
            method: 'PATCH',
            headers,
            body: JSON.stringify(body),
          })
      );
      // New rows: create — the full name goes on the invite so the lease
      // form (RTB-1 parties + signature blocks) is filled from day one.
      const createPromises = newRows.map((r) =>
        fetch(`${DJANGO_API_URL}/leases/tenants/`, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            lease: lease.id,
            invited_email: r.email.trim(),
            invited_name: r.name.trim(),
            rent_amount: Number(r.rentAmount),
            is_primary_tenant: r.isPrimary,
          }),
        })
      );
      const results = await Promise.all([...updatePromises, ...createPromises]);
      const failed = results.find((r) => !r.ok);
      if (failed) {
        const body = await failed.json().catch(() => ({}));
        const message =
          body.detail ||
          body.invited_email?.join(' ') ||
          body.invited_name?.join(' ') ||
          body.rent_amount?.join(' ') ||
          body.non_field_errors?.join(' ') ||
          `Failed to save (${failed.status})`;
        throw new Error(message);
      }
      toast.success('Tenant roster updated.');
      setIsAddTenantOpen(false);
      fetchLease();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : 'Failed to save tenant roster.'
      );
    } finally {
      setIsAddingTenant(false);
    }
  };
  const handleDeleteDraft = async () => {
    if (!token || !lease) return;
    setIsDeleting(true);
    try {
      const res = await fetch(`${DJANGO_API_URL}/leases/${lease.id}/`, {
        method: 'DELETE',
        headers: { Authorization: `Token ${token}` },
      });
      if (!res.ok && res.status !== 204) {
        const body = await res.json().catch(() => ({}));
        throw new Error(
          body.detail || `Failed to delete draft (${res.status})`
        );
      }
      toast.success('Draft deleted.');
      router.push('/dashboard/leases');
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : 'Failed to delete draft.'
      );
      setIsDeleting(false);
    }
  };
  const handleTerminate = async () => {
    if (!token || !lease) return;
    setIsTerminating(true);
    try {
      const res = await fetch(
        `${DJANGO_API_URL}/leases/${lease.id}/terminate/`,
        {
          method: 'POST',
          headers: {
            Authorization: `Token ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({}), // defaults termination_date to today on the backend
        }
      );
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(
          body.detail || `Failed to terminate lease (${res.status})`
        );
      }
      toast.success('Lease terminated.');
      setTerminateDialogOpen(false);
      fetchLease();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : 'Failed to terminate lease.'
      );
    } finally {
      setIsTerminating(false);
    }
  };
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-teal-600" />
      </div>
    );
  }
  if (error || !lease) {
    return (
      <Card className="border-destructive bg-red-50">
        <CardContent className="p-6 text-center">
          <AlertCircle className="h-10 w-10 text-destructive mx-auto mb-3" />
          <p className="text-destructive font-medium">
            {error || 'Lease not found.'}
          </p>
          <Button
            variant="outline"
            className="mt-4"
            onClick={() => router.push('/dashboard/leases')}
          >
            Back to Leases
          </Button>
        </CardContent>
      </Card>
    );
  }
  const hasDeclinedTenants = lease.lease_tenants.some((lt) => lt.declined);
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push('/dashboard/leases')}
        >
          <ArrowLeft className="h-4 w-4 mr-1" /> Back
        </Button>
      </div>
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">
            {lease.property_name || lease.group_name || lease.lease_number}
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            {lease.property_address || lease.lease_number} ·{' '}
            {lease.lease_type_display}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span
            className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-medium ${STATUS_STYLES[lease.status] || 'bg-slate-100 text-slate-700'}`}
          >
            {lease.status_display}
          </span>
          {lease.is_locked && (
            <Badge
              variant="outline"
              className="text-slate-500 cursor-help"
              title="Signed agreements can't be edited — the terms are what everyone agreed to. Use a rent adjustment for pricing changes, or contact Rentium support to amend."
            >
              Signed &amp; locked
            </Badge>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={handleDownloadPdf}
            disabled={isDownloadingPdf}
          >
            {isDownloadingPdf ? (
              <Loader2 className="h-4 w-4 mr-1 animate-spin" />
            ) : (
              <FileDown className="h-4 w-4 mr-1" />
            )}
            Download PDF
          </Button>
          {lease.status === 'DRAFT' && (
            <Button
              variant="outline"
              size="sm"
              className="text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700"
              onClick={() => setDeleteDialogOpen(true)}
            >
              <Trash2 className="h-4 w-4 mr-1" /> Delete Draft
            </Button>
          )}
          {(lease.status === 'PENDING' || lease.status === 'ACTIVE') && (
            <Button
              variant="outline"
              size="sm"
              className="text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700"
              onClick={() => setTerminateDialogOpen(true)}
            >
              <Ban className="h-4 w-4 mr-1" /> Terminate
            </Button>
          )}
        </div>
      </div>
      {hasDeclinedTenants && (
        <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-r-md flex items-start gap-3">
          <XCircle className="h-5 w-5 text-red-600 mt-0.5 flex-shrink-0" />
          <div>
            <h3 className="text-sm font-medium text-red-800">
              A tenant declined this lease
            </h3>
            <p className="text-sm text-red-700 mt-1">
              Check the reason below (if provided) and either remove that tenant
              slot to invite someone else, or terminate this lease if it&apos;s
              no longer moving forward.
            </p>
          </div>
        </div>
      )}
      {!lease.landlord_signed && !lease.is_locked && (
        <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded-r-md flex items-center justify-between gap-4">
          <div className="flex items-start">
            <Signature className="h-5 w-5 text-blue-600 mr-3 mt-0.5 flex-shrink-0" />
            <div>
              <h3 className="text-sm font-medium text-blue-800">
                Your signature is needed
              </h3>
              <p className="text-sm text-blue-700 mt-1">
                The lease activates once you and every tenant have signed.
              </p>
            </div>
          </div>
          <Button size="sm" onClick={handleLandlordSign} disabled={isSigning}>
            {isSigning ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Signature className="h-4 w-4 mr-2" />
            )}
            Sign as Landlord
          </Button>
        </div>
      )}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Lease Terms</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-slate-500">Lease Number</p>
              <p className="font-mono text-xs pt-0.5">{lease.lease_number}</p>
            </div>
            <div>
              <p className="text-slate-500">Agreement</p>
              <p>{lease.lease_type_display}</p>
            </div>
            <div>
              <p className="text-slate-500">Start Date</p>
              <p>{lease.start_date}</p>
            </div>
            <div>
              <p className="text-slate-500">End Date</p>
              <p>
                {lease.is_month_to_month
                  ? 'Month-to-month'
                  : lease.end_date || '—'}
              </p>
            </div>
            {lease.move_in_date && lease.move_in_date !== lease.start_date && (
              <div>
                <p className="text-slate-500">Move-in Date</p>
                <p>{lease.move_in_date}</p>
              </div>
            )}
            <div>
              <p className="text-slate-500">Total Monthly Rent</p>
              <p className="font-medium">${lease.total_rent}</p>
            </div>
            <div>
              <p className="text-slate-500">Security Deposit</p>
              <p>${lease.security_deposit}</p>
            </div>
            <div>
              <p className="text-slate-500">Pet Deposit</p>
              <p>${lease.pet_deposit}</p>
            </div>
            <div>
              <p className="text-slate-500">Cleaning Fee</p>
              <p>${lease.cleaning_fee}</p>
            </div>
            {Number(lease.unallocated_rent) > 0.01 && (
              <div>
                <p className="text-slate-500">Unallocated</p>
                <p className="font-medium text-amber-600">
                  ${lease.unallocated_rent}
                </p>
              </div>
            )}
            <div>
              <p className="text-slate-500">Pets</p>
              <p>{lease.pets_allowed ? 'Allowed' : 'Not allowed'}</p>
            </div>
            <div>
              <p className="text-slate-500">Smoking</p>
              <p>{lease.smoking_allowed ? 'Allowed' : 'Not allowed'}</p>
            </div>
            {(lease.effective_etransfer_email || lease.etransfer_email) && (
              <div className="col-span-2 pt-2 border-t">
                <p className="text-slate-500 mb-1">e-Transfers go to</p>
                <p className="select-all">
                  {lease.etransfer_email || lease.effective_etransfer_email}
                </p>
                {!lease.etransfer_email && (
                  <p className="text-xs text-slate-400 mt-0.5">
                    Fallback (your service/account email) — set a dedicated
                    e-transfer address when creating a lease.
                  </p>
                )}
              </div>
            )}
            {lease.bills_summary && (
              <div className="col-span-2 pt-2 border-t">
                <p className="text-slate-500 mb-1">Bills</p>
                <p>{lease.bills_summary}</p>
              </div>
            )}
            {lease.common_space_clause_text && (
              <div className="col-span-2 pt-2 border-t">
                <p className="text-slate-500 mb-1">Shared Spaces</p>
                <p>{lease.common_space_clause_text}</p>
              </div>
            )}
            {lease.special_terms && (
              <div className="col-span-2 pt-2 border-t">
                <p className="text-slate-500 mb-1">Special Terms</p>
                <p className="whitespace-pre-wrap">{lease.special_terms}</p>
              </div>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Landlord Signature</CardTitle>
          </CardHeader>
          <CardContent>
            {lease.landlord_signed ? (
              <div className="flex items-center text-green-700 text-sm">
                <CheckCircle2 className="h-4 w-4 mr-2" /> Signed{' '}
                {lease.landlord_signed_date
                  ? new Date(lease.landlord_signed_date).toLocaleDateString()
                  : ''}
              </div>
            ) : (
              <div className="flex items-center text-amber-700 text-sm">
                <Clock className="h-4 w-4 mr-2" /> Not yet signed
              </div>
            )}
            {lease.co_hosts && lease.co_hosts.length > 0 && (
              <div className="mt-3 pt-3 border-t text-sm">
                <p className="text-slate-500 mb-1">
                  Co-landlord{lease.co_hosts.length > 1 ? 's' : ''} on the
                  agreement
                </p>
                {lease.co_hosts.map((h, i) => (
                  <p key={i} className="text-slate-800">
                    {h.name}
                    {h.email ? (
                      <span className="text-slate-500"> · {h.email}</span>
                    ) : null}
                  </p>
                ))}
                <p className="text-xs text-slate-400 mt-1">
                  Named on the lease document. This is a record on the
                  agreement, not a separate signature or app login.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-4">
          <div>
            <CardTitle>Tenants</CardTitle>
            <CardDescription>
              Invite and signature status for everyone on this lease
            </CardDescription>
          </div>
          {!lease.is_locked && !isAddTenantOpen && (
            <Button variant="outline" size="sm" onClick={openRosterEditor}>
              <UserPlus className="h-4 w-4 mr-1" />{' '}
              {lease.lease_tenants.length === 0
                ? 'Add Tenant'
                : 'Manage Tenants'}
            </Button>
          )}
        </CardHeader>
        <CardContent className="space-y-3">
          {isAddTenantOpen && (
            <div className="border rounded-md p-4 bg-slate-50 space-y-3">
              <p className="text-xs text-slate-500 flex items-center gap-1.5">
                Total monthly rent is <strong>${lease.total_rent}</strong> —
                already-signed tenants (locked, greyed out) keep their agreed
                amount; editing any other row auto-adjusts the rest so the total
                stays correct. The full legal name goes on the lease form (e.g.
                the RTB-1 parties and signature blocks).
                {isSyncingSplit && (
                  <Loader2 className="h-3 w-3 animate-spin text-slate-400" />
                )}
              </p>
              {rosterRows.map((row, index) => (
                <div
                  key={index}
                  className={`flex items-end gap-2 ${row.hasSigned ? 'opacity-60' : ''}`}
                >
                  <div className="w-40 space-y-1">
                    <Label className="text-xs">Full legal name</Label>
                    <Input
                      placeholder="e.g. Jordan Lee"
                      value={row.name}
                      // A linked account's own name is authoritative;
                      // signed rows are frozen entirely.
                      disabled={row.linked || row.hasSigned}
                      onChange={(e) => updateRosterName(index, e.target.value)}
                    />
                  </div>
                  <div className="flex-1 space-y-1">
                    <Label className="text-xs">Email</Label>
                    <Input
                      type="email"
                      placeholder="tenant@example.com"
                      value={row.email}
                      disabled={!!row.id}
                      onChange={(e) => updateRosterEmail(index, e.target.value)}
                    />
                  </div>
                  <div className="w-32 space-y-1">
                    <Label className="text-xs">Rent ($)</Label>
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      value={row.rentAmount}
                      disabled={row.hasSigned}
                      onChange={(e) => updateRosterRent(index, e.target.value)}
                    />
                  </div>
                  <label className="flex items-center gap-1.5 text-xs pb-2 whitespace-nowrap cursor-pointer">
                    <input
                      type="radio"
                      name="roster-primary"
                      checked={row.isPrimary}
                      onChange={() => setRosterPrimary(index)}
                    />
                    Primary
                  </label>
                  {!row.id && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="mb-0.5"
                      onClick={() => removeRosterRow(index)}
                    >
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                  )}
                </div>
              ))}
              <Button variant="outline" size="sm" onClick={addRosterRow}>
                <UserPlus className="h-3.5 w-3.5 mr-1" /> Add Another Tenant
              </Button>
              {rosterUnallocated > 0.01 && (
                <p className="text-xs text-amber-600">
                  ${rosterUnallocated.toFixed(2)} still unassigned — the lease
                  can&apos;t be signed until this reaches $0.
                </p>
              )}
              <div className="flex justify-end gap-2 pt-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsAddTenantOpen(false)}
                  disabled={isAddingTenant}
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  onClick={handleSaveRoster}
                  disabled={isAddingTenant}
                >
                  {isAddingTenant ? (
                    <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                  ) : null}
                  Save
                </Button>
              </div>
            </div>
          )}
          {lease.lease_tenants.length === 0 && !isAddTenantOpen && (
            <p className="text-sm text-slate-500 py-4 text-center">
              No tenants added yet. Click &quot;Add Tenant&quot; above to invite
              the first one.
            </p>
          )}
          {lease.lease_tenants.map((lt) => (
            <div
              key={lt.id}
              className={`border rounded-md p-4 ${lt.declined ? 'border-red-200 bg-red-50/40' : ''}`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium text-sm flex items-center gap-2">
                    {lt.tenant_name || lt.invited_name || lt.invited_email}
                    {lt.is_primary_tenant && (
                      <Badge variant="outline" className="text-xs">
                        Primary
                      </Badge>
                    )}
                  </div>
                  <div className="text-xs text-slate-500 mt-0.5">
                    {lt.tenant_email || lt.invited_email} · ${lt.rent_amount}/mo
                    {lt.effective_rent !== lt.rent_amount && (
                      <span className="text-amber-600">
                        {' '}
                        (effective ${lt.effective_rent})
                      </span>
                    )}
                    {lt.room_name && ` · ${lt.room_name}`}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span
                    className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${INVITE_STATUS_STYLES[lt.invite_status]}`}
                  >
                    {lt.invite_status}
                  </span>
                  {lt.declined ? (
                    <span className="inline-flex items-center text-xs text-red-700">
                      <XCircle className="h-3.5 w-3.5 mr-1" /> Declined
                      {lt.declined_at &&
                        ` ${new Date(lt.declined_at).toLocaleDateString()}`}
                    </span>
                  ) : lt.has_signed ? (
                    <span className="inline-flex items-center text-xs text-green-700">
                      <CheckCircle2 className="h-3.5 w-3.5 mr-1" /> Signed
                    </span>
                  ) : (
                    <span className="inline-flex items-center text-xs text-slate-500">
                      <Clock className="h-3.5 w-3.5 mr-1" /> Not signed
                    </span>
                  )}
                  {!lt.declined && lt.invite_url && (
                    <Button
                      variant="ghost"
                      size="sm"
                      title="Copy login link — live until the tenant sets a password"
                      onClick={() =>
                        handleCopyInviteLink(lt.invite_url as string)
                      }
                    >
                      <Copy className="h-3.5 w-3.5" />
                    </Button>
                  )}
                  {!lt.declined && lt.invite_status !== 'LINKED' && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleResendInvite(lt.id)}
                      disabled={resendingId === lt.id}
                    >
                      {resendingId === lt.id ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Mail className="h-3.5 w-3.5" />
                      )}
                    </Button>
                  )}
                </div>
              </div>
              {lt.declined && lt.decline_reason && (
                <div className="mt-3 pt-3 border-t border-red-200 text-xs text-red-700">
                  <span className="font-medium">Reason given: </span>
                  {lt.decline_reason}
                </div>
              )}
            </div>
          ))}
        </CardContent>
      </Card>
      {/* Condition inspections (move-in / move-out) — the components existed
          but were never mounted anywhere; this is their home. The section
          handles its own nag banner, per-tenant vs per-unit creation, and
          opens the full InspectionWizard inline. Drafts don't need one yet. */}
      {lease.status !== 'DRAFT' && <LeaseInspections leaseId={lease.id} />}
      {/* End-of-tenancy workflow (notices + RTB-8 mutual agreements) —
          rules come from the backend's tenancy_rules registry. */}
      {lease.status !== 'DRAFT' && (
        <LeaseMoveOuts
          leaseId={lease.id}
          isActive={lease.status === 'ACTIVE'}
        />
      )}
      {/* Viewings & contractor visits; tenants on the lease see them too. */}
      {lease.status !== 'DRAFT' && (
        <LeaseAppointments
          leaseId={lease.id}
          propertyId={
            (lease as unknown as { property?: number | null }).property ?? null
          }
        />
      )}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this draft?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently deletes lease {lease.lease_number} and any tenant
              invites on it. This can&apos;t be undone. Only draft leases can be
              deleted this way — once tenants start signing, use
              &quot;Terminate&quot; instead so there&apos;s a record of what
              happened.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteDraft}
              disabled={isDeleting}
              className="bg-red-600 hover:bg-red-700"
            >
              {isDeleting ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : null}
              Delete Draft
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <AlertDialog
        open={terminateDialogOpen}
        onOpenChange={setTerminateDialogOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Terminate this lease?</AlertDialogTitle>
            <AlertDialogDescription>
              This ends lease {lease.lease_number} effective today. The record
              is kept (not deleted) so there&apos;s a history of the tenancy.
              This can&apos;t be undone from here — contact support or use
              Django admin if you need to reverse it.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isTerminating}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleTerminate}
              disabled={isTerminating}
              className="bg-red-600 hover:bg-red-700"
            >
              {isTerminating ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : null}
              Terminate Lease
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
