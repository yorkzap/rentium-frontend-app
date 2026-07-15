// src/components/dashboard/landlord/LeaseInspections.tsx
//
// Landlord entry point for condition inspections, designed to mount as a
// tab/section inside LeaseDetail:
//
//   import LeaseInspections from "./LeaseInspections";
//   ...
//   <LeaseInspections leaseId={lease.id} />
//
// Behavior:
//  - Lists this lease's inspections with status badges.
//  - NAG (not gate): an ACTIVE lease with a tenant who has no inspection
//    shows a warning banner — per BC RTB practice the move-in inspection
//    protects the deposit claim — but nothing is ever blocked.
//  - Room/group leases create one inspection PER TENANT; complete units
//    create one for the lease. The buttons reflect that automatically.
//  - Clicking an inspection opens the full InspectionWizard inline.

'use client';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import {
  AlertTriangle,
  ClipboardCheck,
  Loader2,
  Plus,
  ChevronLeft,
} from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { fetchLeaseDetails } from '@/lib/leaseApi';
import {
  InspectionSummary,
  createInspection,
  fetchInspections,
} from '@/lib/inspectionApi';
import InspectionWizard from './InspectionWizard';

interface LeaseTenantLite {
  id: string;
  tenant: number | null;
  tenant_name: string | null;
  invited_email?: string | null;
  declined?: boolean;
  room_name?: string | null;
}

interface Props {
  leaseId: string;
}

const STATUS_BADGE: Record<string, string> = {
  MOVE_IN_IN_PROGRESS: 'bg-amber-50 text-amber-700 border-amber-200',
  MOVE_IN_SIGNED: 'bg-green-50 text-green-700 border-green-200',
  MOVE_OUT_IN_PROGRESS: 'bg-blue-50 text-blue-700 border-blue-200',
  COMPLETED: 'bg-slate-100 text-slate-700 border-slate-200',
};

export default function LeaseInspections({ leaseId }: Props) {
  const { token } = useAuth();
  const [inspections, setInspections] = useState<InspectionSummary[]>([]);
  const [leaseTenants, setLeaseTenants] = useState<LeaseTenantLite[]>([]);
  const [leaseStatus, setLeaseStatus] = useState<string>('');
  const [isRoomScope, setIsRoomScope] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState<string | null>(null); // lease_tenant id or "__unit"
  const [openInspectionId, setOpenInspectionId] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!token) return;
    setIsLoading(true);
    try {
      const [list, lease] = await Promise.all([
        fetchInspections(token, { lease: leaseId }),
        fetchLeaseDetails(token, leaseId),
      ]);
      setInspections(list);
      setLeaseTenants((lease.lease_tenants || []) as LeaseTenantLite[]);
      setLeaseStatus(lease.status);
      // Room-scoped = roommate lease type or group-linked; complete units get
      // a single lease-level inspection. (The backend applies the same rule
      // and would reject a mismatch anyway — this just shapes the buttons.)
      setIsRoomScope(
        String(lease.lease_type || '').includes('ROOMMATE') ||
          !!lease.group_name
      );
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : 'Failed to load inspections.'
      );
    } finally {
      setIsLoading(false);
    }
  }, [token, leaseId]);

  useEffect(() => {
    load();
  }, [load]);

  // Tenants (linked, not declined) who don't have an inspection yet — the
  // creation candidates AND the nag condition.
  const missingTenants = useMemo(() => {
    if (!isRoomScope) return [];
    const covered = new Set(inspections.map((i) => i.lease_tenant));
    return leaseTenants.filter(
      (lt) => lt.tenant && !lt.declined && !covered.has(lt.id)
    );
  }, [isRoomScope, inspections, leaseTenants]);

  const missingUnitInspection = !isRoomScope && inspections.length === 0;
  const showNag =
    leaseStatus === 'ACTIVE' &&
    (missingTenants.length > 0 || missingUnitInspection);

  const handleCreate = async (leaseTenantId: string | null) => {
    if (!token) return;
    setIsCreating(leaseTenantId ?? '__unit');
    try {
      const created = await createInspection(token, {
        lease: leaseId,
        lease_tenant: leaseTenantId,
      });
      toast.success('Inspection created — walk through and record each item.');
      await load();
      setOpenInspectionId(created.id);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Couldn't create inspection."
      );
    } finally {
      setIsCreating(null);
    }
  };

  if (openInspectionId) {
    return (
      <div className="space-y-3">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            setOpenInspectionId(null);
            load();
          }}
        >
          <ChevronLeft className="h-4 w-4 mr-1" /> Back to inspections
        </Button>
        <InspectionWizard inspectionId={openInspectionId} onChanged={load} />
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-10 text-slate-500">
        <Loader2 className="h-5 w-5 animate-spin mr-2" /> Loading inspections…
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {showNag && (
        <div className="bg-amber-50 border-l-4 border-amber-500 p-4 rounded-r-md">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-amber-800">
              <p className="font-medium">
                Move-in condition inspection missing
              </p>
              <p className="mt-0.5">
                {isRoomScope
                  ? `${missingTenants.length} tenant(s) on this active lease have no condition inspection yet.`
                  : 'This active lease has no condition inspection yet.'}{' '}
                In BC, doing a joint walk-through on the possession day and
                recording it (RTB-27) is what preserves your right to claim
                against the deposit for damage. Nothing is blocked — but
                it&apos;s strongly recommended.
              </p>
            </div>
          </div>
        </div>
      )}

      <Card>
        <CardHeader className="pb-3 flex flex-row items-start justify-between flex-wrap gap-2">
          <div>
            <CardTitle className="flex items-center text-lg">
              <ClipboardCheck className="h-5 w-5 mr-2 text-slate-600" />{' '}
              Condition Inspections
            </CardTitle>
            <CardDescription>
              Move-in / move-out condition reports (RTB-27 style)
            </CardDescription>
          </div>
          <div className="flex gap-2 flex-wrap">
            {isRoomScope ? (
              missingTenants.map((lt) => (
                <Button
                  key={lt.id}
                  size="sm"
                  variant="outline"
                  disabled={isCreating !== null}
                  onClick={() => handleCreate(lt.id)}
                >
                  {isCreating === lt.id ? (
                    <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                  ) : (
                    <Plus className="h-4 w-4 mr-1" />
                  )}
                  Inspection for {lt.tenant_name || lt.invited_email}
                </Button>
              ))
            ) : missingUnitInspection ? (
              <Button
                size="sm"
                disabled={isCreating !== null}
                onClick={() => handleCreate(null)}
              >
                {isCreating === '__unit' ? (
                  <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                ) : (
                  <Plus className="h-4 w-4 mr-1" />
                )}
                Start Move-in Inspection
              </Button>
            ) : null}
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {inspections.length === 0 ? (
            <p className="p-6 text-center text-sm text-slate-500">
              No inspections yet. Create one above and walk the unit together on
              the possession day.
            </p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {inspections.map((insp) => (
                <li key={insp.id}>
                  <button
                    type="button"
                    onClick={() => setOpenInspectionId(insp.id)}
                    className="w-full flex items-center justify-between gap-3 p-4 text-left hover:bg-slate-50 transition-colors"
                  >
                    <div>
                      <p className="text-sm font-medium">
                        {insp.property_label || insp.lease_number}
                        {insp.tenant_name ? ` — ${insp.tenant_name}` : ''}
                      </p>
                      <p className="text-xs text-slate-500">
                        Possession {insp.possession_date || '—'}
                        {insp.move_in_inspection_date
                          ? ` · Move-in inspected ${insp.move_in_inspection_date}`
                          : ''}
                        {insp.move_out_inspection_date
                          ? ` · Move-out inspected ${insp.move_out_inspection_date}`
                          : ''}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {insp.pending_suggestions > 0 && (
                        <Badge
                          variant="outline"
                          className="bg-amber-50 text-amber-700 border-amber-200"
                        >
                          {insp.pending_suggestions} to review
                        </Badge>
                      )}
                      <span
                        className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${STATUS_BADGE[insp.status] || 'bg-slate-100 text-slate-700'}`}
                      >
                        {insp.status_display}
                      </span>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
