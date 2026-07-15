// TenantDashboard.tsx
//
// The tenant's HOME. Rent, repairs, documents. Nothing else.
//
// This file owns data loading, the handlers, and the derived numbers; the
// three tabs are split into src/components/dashboard/tenant/Tenant*Tab.tsx
// so each stays readable on its own. Three things changed here, and they're
// all the same underlying mistake — this file was trying to be the whole app:
//
// 1. IT RENDERED A SECOND HEADER. dashboard/layout.tsx's tenant shell already draws
//    the brand, the notification bell, the avatar and the logout button. This file
//    drew all four again, inside it. The landlord side had exactly this bug and it
//    was fixed; the tenant side was never touched.
//
// 2. THE MOVE-OUT FORM AND THE CALENDAR LIVED AT THE BOTTOM OF THE PAYMENTS TAB.
//    Below the charges table. Below the payment history. To end their tenancy, a
//    tenant had to click "Payments" — which they would have no reason to do — and
//    then scroll past two tables. They now have their own pages under /dashboard/
//    tenancy, and this page links to them prominently.
//
// 3. "CONTACT LANDLORD" WAS A BUTTON WITH NO onClick. Not broken in some subtle
//    way — it had no handler at all. It now opens a real conversation.
'use client';
import { useState, useEffect, useMemo } from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Home, MessageSquare, Loader2, AlertCircle } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { Lease, LeaseTenant, LeaseDocument } from '@/types/lease';
import {
  fetchLeases,
  fetchDocumentsForLease,
  signLease,
  declineLease,
  fetchLeaseDetails,
} from '@/lib/leaseApi';
// The tenant's financial view is the LEDGER. /api/ledger/entries/ is scoped by the
// backend to this tenant: their OWN entries PLUS the household's JOINT charges
// (tenant=null on a roommate lease) and every payment any roommate made toward
// those joint charges — so when one roommate pays, the balance clears for everyone.
import {
  fetchEntries,
  downloadReceipt,
  LedgerEntry,
  ChargeStatus,
  CHARGE_TYPES as LEDGER_CHARGE_TYPES,
} from '@/lib/financeApi';
import { startConversation } from '@/lib/engagementApi';
import { fetchMaintenanceAreas, MaintenanceArea } from '@/lib/maintenanceApi';
import { DJANGO_API_URL } from '@/lib/config';
import LeaseSignGate from './tenant/LeaseSignGate';
import TenantMaintenance from './tenant/TenantMaintenance';
import TenantOverviewTab from './tenant/TenantOverviewTab';
import TenantPaymentsTab from './tenant/TenantPaymentsTab';
import TenantDocumentsTab from './tenant/TenantDocumentsTab';
import { toast } from 'sonner';
import { differenceInDays, parseISO } from 'date-fns';

const formatCurrency = (amount: number | string | null | undefined): string => {
  if (amount === null || amount === undefined) return '$0.00';
  const numeric =
    typeof amount === 'string'
      ? parseFloat(amount.replace(/[^0-9.\-]/g, ''))
      : amount;
  if (isNaN(numeric)) return '$0.00';
  return numeric.toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};

const entryPayerName = (e: LedgerEntry): string | null =>
  (e as LedgerEntry & { tenant_name?: string | null }).tenant_name ?? null;
const entryIsJoint = (e: LedgerEntry): boolean =>
  Boolean((e as LedgerEntry & { is_joint?: boolean }).is_joint);

// The backend status code for "pending signatures" is 'PENDING'
// (Lease.LeaseStatus.PENDING_SIGNATURES = "PENDING"), not the label string.
const getStatusBadgeVariant = (status: string) => {
  switch (status?.toUpperCase()) {
    case 'ACTIVE':
      return 'active' as const;
    case 'PENDING':
      return 'pending' as const;
    case 'DRAFT':
      return 'secondary' as const;
    case 'EXPIRED':
      return 'expired' as const;
    case 'TERMINATED':
      return 'terminated' as const;
    case 'RENEWED':
      return 'outline' as const;
    default:
      return 'default' as const;
  }
};
const getChargeStatusBadgeVariant = (status: ChargeStatus | null) => {
  switch (status) {
    case 'PAID':
      return 'active' as const;
    case 'PARTIALLY_PAID':
      return 'pending' as const;
    case 'DUE':
      return 'pending' as const;
    case 'OVERDUE':
      return 'destructive' as const;
    case 'SCHEDULED':
      return 'secondary' as const;
    case 'VOIDED':
      return 'outline' as const;
    default:
      return 'default' as const;
  }
};
const chargeStatusLabel = (status: ChargeStatus | null): string => {
  switch (status) {
    case 'PAID':
      return 'Paid';
    case 'PARTIALLY_PAID':
      return 'Partially Paid';
    case 'DUE':
      return 'Due Today';
    case 'OVERDUE':
      return 'Overdue';
    case 'SCHEDULED':
      return 'Scheduled';
    case 'VOIDED':
      return 'Voided';
    default:
      return status ?? '—';
  }
};
const OPEN_CHARGE_STATUSES: ChargeStatus[] = [
  'SCHEDULED',
  'DUE',
  'OVERDUE',
  'PARTIALLY_PAID',
];

export default function TenantDashboard() {
  const { user, token } = useAuth();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('overview');
  const [leases, setLeases] = useState<Lease[]>([]);
  const [currentLease, setCurrentLease] = useState<Lease | null>(null);
  const [leaseTenantInfo, setLeaseTenantInfo] = useState<LeaseTenant | null>(
    null
  );
  const [ledgerEntries, setLedgerEntries] = useState<LedgerEntry[]>([]);
  const [documents, setDocuments] = useState<LeaseDocument[]>([]);
  const [myAreas, setMyAreas] = useState<MaintenanceArea[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);
  const [contacting, setContacting] = useState(false);

  const propertyId: number | null = useMemo(() => {
    const fromLease = (
      currentLease as (Lease & { property?: number | null }) | null
    )?.property;
    const fromRoom = (
      leaseTenantInfo as (LeaseTenant & { room?: number | null }) | null
    )?.room;
    const id = fromRoom ?? fromLease ?? null;
    return typeof id === 'number' ? id : id ? Number(id) : null;
  }, [currentLease, leaseTenantInfo]);

  useEffect(() => {
    const loadInitialData = async () => {
      if (!token || !user?.id) {
        setError('User or authentication token not available.');
        setIsLoading(false);
        return;
      }
      setIsLoading(true);
      setError(null);
      try {
        // GET /leases/ returns LeaseListSerializer — a SUMMARY that does not
        // include lease_tenants. Use it only to pick WHICH lease is relevant,
        // then fetch that lease's full detail.
        const fetchedLeases = await fetchLeases(token);
        setLeases(fetchedLeases);

        const active = fetchedLeases.find((l) => l.status === 'ACTIVE');
        const pending = fetchedLeases.find((l) => l.status === 'PENDING');
        const summary = active || pending || fetchedLeases[0] || null;

        if (summary) {
          const relevantLease = await fetchLeaseDetails(token, summary.id);
          setCurrentLease(relevantLease);

          // Matched by EMAIL, not by index — "the first tenant" would misattribute
          // another roommate's rent and sign-status on a shared lease.
          const mine =
            (relevantLease.lease_tenants || []).find(
              (lt) =>
                lt.tenant_email?.toLowerCase() === user.email?.toLowerCase() ||
                lt.invited_email?.toLowerCase() === user.email?.toLowerCase()
            ) || null;
          setLeaseTenantInfo(mine);

          const [entries, docs] = await Promise.all([
            fetchEntries(token, {
              lease: relevantLease.id,
              ordering: 'due_date',
            }),
            fetchDocumentsForLease(token, relevantLease.id),
          ]);
          setLedgerEntries(entries);
          setDocuments(docs);
        }
      } catch (err) {
        setError(
          err instanceof Error ? err.message : 'Failed to load dashboard data.'
        );
        toast.error('Failed to load your rental information.');
      } finally {
        setIsLoading(false);
      }
    };
    loadInitialData();
  }, [token, user?.id, user?.email]);

  useEffect(() => {
    const loadAreas = async () => {
      if (!token || !propertyId) return;
      try {
        setMyAreas(await fetchMaintenanceAreas(token, propertyId));
      } catch {
        setMyAreas([]);
      }
    };
    loadAreas();
  }, [token, propertyId]);

  // --- The button that did nothing. ---
  //
  // It was `<Button variant="outline">Contact Landlord</Button>` — no onClick, no
  // href, nothing. It looked exactly like a working button and had never once done
  // anything. Now it opens a real conversation on the messaging backend (which is
  // fully built and, until recently, unreachable) and takes them to it.
  const handleContactLandlord = async () => {
    if (!token || !currentLease) return;
    const landlordId = (
      currentLease as unknown as { landlord?: number | string }
    ).landlord;
    if (!landlordId) {
      toast.error("We can't work out who your landlord is on this lease.");
      return;
    }
    setContacting(true);
    try {
      const convo = await startConversation(token, {
        landlord: landlordId,
        lease: currentLease.id,
        subject: `${currentLease.property_name || currentLease.group_name || currentLease.lease_number}`,
      });
      router.push(`/dashboard/messages?c=${convo.id}`);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Couldn't open a conversation."
      );
      setContacting(false);
    }
  };

  const handleSignLease = async (phone: string) => {
    if (!token || !leaseTenantInfo?.id) {
      toast.error('Cannot sign lease. Missing information.');
      return;
    }
    try {
      const updated = await signLease(token, leaseTenantInfo.id, phone);
      setLeaseTenantInfo(updated);
      if (currentLease) {
        // Signing can ACTIVATE the lease, which generates the deposit, fee and
        // rent charges — so the ledger must be refetched, not just the lease.
        const refreshedLease = await fetchLeaseDetails(token, currentLease.id);
        setCurrentLease(refreshedLease);
        try {
          setLedgerEntries(
            await fetchEntries(token, {
              lease: currentLease.id,
              ordering: 'due_date',
            })
          );
        } catch {
          /* the lease is signed either way; the ledger will catch up */
        }
      }
      toast.success('Lease signed.');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to sign lease.');
      throw err; // let the gate surface field-level errors (e.g. the phone)
    }
  };

  const handleDeclineLease = async (reason: string) => {
    if (!token || !leaseTenantInfo?.id) {
      toast.error('Cannot decline lease. Missing information.');
      return;
    }
    try {
      setLeaseTenantInfo(await declineLease(token, leaseTenantInfo.id, reason));
      toast.success("You've declined this lease.");
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : 'Failed to decline lease.'
      );
      throw err;
    }
  };

  const handleDownloadLeasePdf = async () => {
    if (!token || !currentLease) return;
    setIsDownloadingPdf(true);
    try {
      const res = await fetch(
        `${DJANGO_API_URL}/leases/${currentLease.id}/pdf/`,
        {
          headers: { Authorization: `Token ${token}` },
        }
      );
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
      link.download = `lease_${currentLease.lease_number}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : 'Failed to download lease PDF.'
      );
    } finally {
      setIsDownloadingPdf(false);
    }
  };

  // ------------------------------------------------------------- derived
  const today = useMemo(() => new Date(), []);

  const myCharges = useMemo(
    () =>
      ledgerEntries.filter(
        (e) =>
          (LEDGER_CHARGE_TYPES as string[]).includes(e.entry_type) &&
          e.charge_status !== 'VOIDED'
      ),
    [ledgerEntries]
  );

  const myPayments = useMemo(
    () =>
      ledgerEntries
        .filter(
          (e) =>
            (e.entry_type === 'PAYMENT' || e.entry_type === 'CREDIT') &&
            !e.voided
        )
        .sort(
          (a, b) =>
            new Date(b.effective_date).getTime() -
            new Date(a.effective_date).getTime()
        ),
    [ledgerEntries]
  );

  const openCharges = useMemo(
    () =>
      myCharges
        .filter(
          (e) =>
            e.charge_status !== null &&
            OPEN_CHARGE_STATUSES.includes(e.charge_status)
        )
        .sort(
          (a, b) =>
            new Date(a.due_date || a.effective_date).getTime() -
            new Date(b.due_date || b.effective_date).getTime()
        ),
    [myCharges]
  );

  const nextDueCharge = openCharges[0] ?? null;
  const daysUntilPayment = nextDueCharge?.due_date
    ? differenceInDays(parseISO(nextDueCharge.due_date), today)
    : null;

  const totalOutstanding = useMemo(
    () =>
      openCharges.reduce(
        (s, e) => s + (e.outstanding ? parseFloat(e.outstanding) : 0),
        0
      ),
    [openCharges]
  );
  const totalPaid = useMemo(
    () =>
      myPayments
        .filter((e) => e.entry_type === 'PAYMENT')
        .reduce((s, e) => s + parseFloat(e.amount), 0),
    [myPayments]
  );

  const leaseProgress = useMemo(() => {
    if (!currentLease?.start_date || !currentLease?.end_date) return 0;
    try {
      const start = parseISO(currentLease.start_date);
      const end = parseISO(currentLease.end_date);
      const total = differenceInDays(end, start);
      if (total <= 0) return 100;
      return Math.max(
        0,
        Math.min(
          100,
          Math.round((differenceInDays(today, start) / total) * 100)
        )
      );
    } catch {
      return 0;
    }
  }, [currentLease, today]);

  const hasJointCharges = useMemo(
    () => myCharges.some(entryIsJoint),
    [myCharges]
  );

  // "your room" vs "your household": a roommate lease shares ONE ROOM in a bigger
  // place, so calling that "the household" over-claims — but a joint full-suite
  // lease genuinely is the household.
  const isRoomShare = useMemo(() => {
    const t =
      `${(currentLease as unknown as { lease_type?: string })?.lease_type ?? ''} ${currentLease?.lease_type_display ?? ''}`.toUpperCase();
    return t.includes('ROOMMATE');
  }, [currentLease]);
  const groupNoun = isRoomShare ? 'room' : 'household';
  const groupLabel = isRoomShare ? 'Room' : 'Household';

  // Prorated awareness: a mid-month move-in produces a rent charge smaller than
  // the monthly rent, and the stat card would otherwise imply the full month is
  // owed — which confuses every new tenant who sees it.
  const proratedNote = useMemo(() => {
    if (!currentLease) return null;
    const monthly = Number(currentLease.total_rent || 0);
    if (!monthly) return null;
    const openRent = myCharges.find(
      (c) =>
        c.entry_type === 'RENT_CHARGE' &&
        !c.voided &&
        c.charge_status !== 'PAID' &&
        Number(c.outstanding ?? c.amount) > 0
    );
    if (!openRent) return null;
    const amt = Number(openRent.amount);
    if (amt > 0 && amt < monthly - 0.01) {
      return `This period is prorated: ${formatCurrency(openRent.amount)} (partial month).`;
    }
    return null;
  }, [currentLease, myCharges]);

  const etransferEmail =
    (currentLease as unknown as { effective_etransfer_email?: string })
      ?.effective_etransfer_email || null;

  const [receiptBusyId, setReceiptBusyId] = useState<string | null>(null);
  const handleDownloadReceipt = async (paymentId: string) => {
    if (!token) return;
    setReceiptBusyId(paymentId);
    try {
      await downloadReceipt(token, paymentId);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : 'Failed to download the receipt.'
      );
    } finally {
      setReceiptBusyId(null);
    }
  };

  const privateAreas = useMemo(
    () => myAreas.filter((a) => a.exclusive_to !== null),
    [myAreas]
  );
  const sharedAreas = useMemo(
    () => myAreas.filter((a) => a.exclusive_to === null),
    [myAreas]
  );

  // ---------------------------------------------------------------- render
  if (isLoading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="mr-3 h-8 w-8 animate-spin text-ink-3" />
        <span className="text-ink-2">Loading your dashboard…</span>
      </div>
    );
  }

  if (error) {
    return (
      <Card className="mx-auto max-w-lg border-red-200 bg-red-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-red-800">
            <AlertCircle className="h-5 w-5" /> Couldn&apos;t load your
            dashboard
          </CardTitle>
          <CardDescription className="text-red-700">{error}</CardDescription>
        </CardHeader>
        <CardContent>
          <Button variant="outline" onClick={() => window.location.reload()}>
            Try again
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (!currentLease) {
    return (
      <div className="mx-auto max-w-md py-16 text-center">
        <Home className="mx-auto mb-4 h-14 w-14 text-ink-5" />
        <h2 className="mb-2 text-2xl font-semibold text-ink">
          No active lease
        </h2>
        <p className="mb-6 text-ink-3">
          You aren&apos;t currently on an active lease. If you think that&apos;s
          wrong, your landlord may not have finished setting it up — talk to
          them directly.
        </p>
        {leases.length > 0 && (
          <div className="mt-6 text-left">
            <h3 className="mb-2 text-sm font-medium text-ink-2">Past leases</h3>
            <ul className="list-inside list-disc text-sm text-ink-3">
              {leases.map((l) => (
                <li key={l.id}>
                  {l.property_name || l.group_name || l.lease_number} (
                  {l.status_display})
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    );
  }

  // The sign gate.
  //
  // Previously this only gated while the lease wasn't ACTIVE — which meant that on
  // a roommate lease, the moment the FIRST tenant's signature activated the lease,
  // every OTHER tenant's sign prompt silently disappeared and they were never asked
  // to sign at all. Declined OR not-yet-signed now always shows the gate, whatever
  // the lease's status.
  if (
    leaseTenantInfo &&
    (leaseTenantInfo.declined || !leaseTenantInfo.has_signed)
  ) {
    return (
      <LeaseSignGate
        leaseId={currentLease.id}
        leaseNumber={currentLease.lease_number}
        propertyLabel={
          currentLease.property_name ||
          currentLease.group_name ||
          currentLease.lease_number
        }
        declined={leaseTenantInfo.declined}
        currentPhone={(user as { phone?: string } | null)?.phone ?? null}
        onSign={handleSignLease}
        onDecline={handleDeclineLease}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Page head. NOT an app header — the shell in dashboard/layout.tsx owns that. */}
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-ink">
            Welcome{user?.name ? `, ${user.name.split(' ')[0]}` : ''}
          </h1>
          <p className="mt-1 text-sm text-ink-3">
            {currentLease.property_name || currentLease.group_name} ·{' '}
            {currentLease.lease_number}
          </p>
        </div>
        <Button
          variant="outline"
          onClick={handleContactLandlord}
          disabled={contacting}
        >
          {contacting ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <MessageSquare className="mr-2 h-4 w-4" />
          )}
          Contact landlord
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="w-full justify-start overflow-x-auto">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="payments">Payments</TabsTrigger>
          <TabsTrigger value="maintenance">Maintenance</TabsTrigger>
          <TabsTrigger value="documents">Documents</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <TenantOverviewTab
            currentLease={currentLease}
            leaseTenantInfo={leaseTenantInfo}
            privateAreas={privateAreas}
            sharedAreas={sharedAreas}
            hasJointCharges={hasJointCharges}
            groupLabel={groupLabel}
            nextDueCharge={nextDueCharge}
            daysUntilPayment={daysUntilPayment}
            myPayments={myPayments}
            receiptBusyId={receiptBusyId}
            onDownloadReceipt={handleDownloadReceipt}
            leaseProgress={leaseProgress}
            getStatusBadgeVariant={getStatusBadgeVariant}
            formatCurrency={formatCurrency}
            entryPayerName={entryPayerName}
            entryIsJoint={entryIsJoint}
            onGoToPayments={() => setActiveTab('payments')}
            onGoToMaintenance={() => setActiveTab('maintenance')}
          />
        </TabsContent>

        <TabsContent value="payments">
          <TenantPaymentsTab
            currentLease={currentLease}
            hasJointCharges={hasJointCharges}
            isRoomShare={isRoomShare}
            groupNoun={groupNoun}
            groupLabel={groupLabel}
            nextDueCharge={nextDueCharge}
            proratedNote={proratedNote}
            totalOutstanding={totalOutstanding}
            totalPaid={totalPaid}
            openCharges={openCharges}
            myCharges={myCharges}
            myPayments={myPayments}
            receiptBusyId={receiptBusyId}
            onDownloadReceipt={handleDownloadReceipt}
            etransferEmail={etransferEmail}
            formatCurrency={formatCurrency}
            entryPayerName={entryPayerName}
            entryIsJoint={entryIsJoint}
            getChargeStatusBadgeVariant={getChargeStatusBadgeVariant}
            chargeStatusLabel={chargeStatusLabel}
          />
        </TabsContent>

        <TabsContent value="maintenance" className="mt-6">
          <TenantMaintenance
            propertyId={propertyId}
            leaseId={currentLease.id}
            propertyLabel={
              currentLease.property_name || currentLease.group_name || undefined
            }
          />
        </TabsContent>

        <TabsContent value="documents">
          <TenantDocumentsTab
            documents={documents}
            isDownloadingPdf={isDownloadingPdf}
            onDownloadLeasePdf={handleDownloadLeasePdf}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
