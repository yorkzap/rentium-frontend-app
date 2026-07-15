// TenantDashboard.tsx
//
// The tenant's HOME. Rent, repairs, documents. Nothing else.
//
// Three things changed, and they're all the same underlying mistake — this file was
// trying to be the whole app:
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
import {
  Home,
  CreditCard,
  FileText,
  Wrench,
  MessageSquare,
  Receipt,
  DoorOpen,
  CheckCircle,
  Download,
  Loader2,
  Users,
  Lock,
  AlertCircle,
  Calendar,
  Clock,
  CalendarDays,
  ChevronRight,
} from 'lucide-react';
import Link from 'next/link';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
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
import InspectionSignCard from './tenant/InspectionSignCard';
import TenantMaintenance from './tenant/TenantMaintenance';
import { toast } from 'sonner';
import { format, differenceInDays, parseISO } from 'date-fns';

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
  const today = new Date();

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

        {/* ================================================== OVERVIEW */}
        <TabsContent value="overview" className="mt-6 space-y-6">
          {nextDueCharge &&
            nextDueCharge.charge_status !== 'OVERDUE' &&
            daysUntilPayment !== null &&
            daysUntilPayment <= 5 &&
            daysUntilPayment >= 0 && (
              <div className="rounded-r-md border-l-4 border-amber-500 bg-amber-50 p-4">
                <div className="flex items-start">
                  <Calendar className="mr-3 mt-1 h-5 w-5 flex-shrink-0 text-amber-600" />
                  <div>
                    <h3 className="text-sm font-medium text-amber-800">
                      Payment due soon
                    </h3>
                    <p className="mt-1 text-sm text-amber-700">
                      {nextDueCharge.description} —{' '}
                      {formatCurrency(
                        nextDueCharge.outstanding ?? nextDueCharge.amount
                      )}{' '}
                      is due in {daysUntilPayment} day
                      {daysUntilPayment === 1 ? '' : 's'}.
                      {entryIsJoint(nextDueCharge) &&
                        ` This is the ${groupNoun} total — either of you can pay it.`}
                    </p>
                  </div>
                </div>
              </div>
            )}

          {nextDueCharge?.charge_status === 'OVERDUE' && (
            <div className="rounded-r-md border-l-4 border-red-500 bg-red-50 p-4">
              <div className="flex items-start">
                <AlertCircle className="mr-3 mt-1 h-5 w-5 flex-shrink-0 text-red-600" />
                <div>
                  <h3 className="text-sm font-medium text-red-800">
                    Payment overdue
                  </h3>
                  <p className="mt-1 text-sm text-red-700">
                    {nextDueCharge.description} —{' '}
                    {formatCurrency(
                      nextDueCharge.outstanding ?? nextDueCharge.amount
                    )}{' '}
                    is overdue by {Math.abs(daysUntilPayment || 0)} days.
                    {entryIsJoint(nextDueCharge) &&
                      ` This is the ${groupNoun} total — a payment from any of you settles it for everyone.`}
                  </p>
                </div>
              </div>
            </div>
          )}

          {currentLease.status !== 'ACTIVE' && leaseTenantInfo?.has_signed && (
            <div className="rounded-r-md border-l-4 border-blue-500 bg-blue-50 p-4">
              <div className="flex items-start">
                <Clock className="mr-3 mt-1 h-5 w-5 flex-shrink-0 text-blue-600" />
                <div>
                  <h3 className="text-sm font-medium text-blue-800">
                    Waiting on other signatures
                  </h3>
                  <p className="mt-1 text-sm text-blue-700">
                    You&apos;ve signed. The lease activates once your landlord
                    and any other tenants sign too.
                  </p>
                </div>
              </div>
            </div>
          )}

          <InspectionSignCard leaseId={currentLease.id} />

          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            {/* Your Place */}
            <Card className="overflow-hidden md:col-span-2">
              <CardHeader className="border-b bg-white pb-3">
                <CardTitle className="flex items-center text-lg">
                  <Home className="mr-2 h-5 w-5 text-ink-2" /> Your place
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 p-6">
                <div>
                  <h3 className="text-lg font-semibold">
                    {currentLease.property_name ||
                      currentLease.group_name ||
                      'N/A'}
                  </h3>
                  <p className="text-ink-3">
                    {currentLease.property_address ||
                      `Lease ${currentLease.lease_number}`}
                  </p>
                  <Badge
                    variant={getStatusBadgeVariant(currentLease.status)}
                    className="mt-2"
                  >
                    {currentLease.status_display}
                  </Badge>
                </div>

                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-ink-3">Landlord</p>
                    <p>{currentLease.landlord_name}</p>
                  </div>
                  <div>
                    <p className="text-ink-3">Landlord contact</p>
                    <p>
                      {currentLease.effective_landlord_contact?.daytime_phone ||
                        currentLease.effective_landlord_contact?.email ||
                        'Not provided'}
                    </p>
                  </div>
                  <div>
                    <p className="text-ink-3">Lease period</p>
                    <p>
                      {format(parseISO(currentLease.start_date), 'MMM d, yyyy')}{' '}
                      —{' '}
                      {currentLease.end_date
                        ? format(parseISO(currentLease.end_date), 'MMM d, yyyy')
                        : 'Ongoing'}
                    </p>
                  </div>
                  <div>
                    <p className="text-ink-3">
                      {hasJointCharges
                        ? `${groupLabel} monthly rent`
                        : 'Your monthly rent'}
                    </p>
                    <p className="font-semibold">
                      {formatCurrency(currentLease.total_rent)}
                    </p>
                    {hasJointCharges && (
                      <p className="text-xs text-ink-4">
                        One shared bill — any of you can pay it
                      </p>
                    )}
                  </div>
                  {leaseTenantInfo?.room_name && (
                    <div>
                      <p className="text-ink-3">Your room</p>
                      <p>{leaseTenantInfo.room_name}</p>
                    </div>
                  )}
                  <div>
                    <p className="text-ink-3">Lease type</p>
                    <p>{currentLease.lease_type_display}</p>
                  </div>
                </div>

                {currentLease.bills_summary && (
                  <div className="mt-4 border-t pt-4">
                    <p className="mb-1 text-sm font-medium">
                      Bills included in rent
                    </p>
                    <p className="text-sm text-ink-2">
                      {currentLease.bills_summary}
                    </p>
                  </div>
                )}

                {myAreas.length > 0 && (
                  <div className="mt-4 border-t pt-4">
                    <p className="mb-2 flex items-center gap-1.5 text-sm font-medium">
                      <DoorOpen className="h-4 w-4 text-ink-3" /> What&apos;s
                      included
                    </p>
                    <div className="space-y-2">
                      {privateAreas.length > 0 && (
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="mr-1 text-xs text-ink-3">
                            Just yours:
                          </span>
                          {privateAreas.map((a) => (
                            <Badge
                              key={a.id}
                              variant="outline"
                              className="text-xs font-normal"
                            >
                              <Lock className="mr-1 h-3 w-3 text-ink-4" />{' '}
                              {a.name}
                            </Badge>
                          ))}
                        </div>
                      )}
                      {sharedAreas.length > 0 && (
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="mr-1 text-xs text-ink-3">
                            {privateAreas.length > 0 ? 'Shared:' : 'Included:'}
                          </span>
                          {sharedAreas.map((a) => (
                            <Badge
                              key={a.id}
                              variant="secondary"
                              className="text-xs font-normal"
                            >
                              <Users className="mr-1 h-3 w-3 text-ink-3" />{' '}
                              {a.name}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {currentLease.lease_tenants &&
                  currentLease.lease_tenants.length > 1 && (
                    <div className="mt-4 border-t pt-4">
                      <p className="mb-2 text-sm font-medium">
                        {currentLease.lease_tenants.length === 2
                          ? 'Sharing with'
                          : 'Roommates'}
                      </p>
                      <ul className="space-y-1.5">
                        {currentLease.lease_tenants
                          .filter((lt) => lt.id !== leaseTenantInfo?.id)
                          .map((lt) => (
                            <li
                              key={lt.id}
                              className="flex items-center justify-between text-sm"
                            >
                              <span className="flex items-center gap-2">
                                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-surface-sunken text-xs font-medium text-ink-2">
                                  {(lt.tenant_name || lt.invited_email || '?')
                                    .charAt(0)
                                    .toUpperCase()}
                                </span>
                                {lt.tenant_name || lt.invited_email}
                                {lt.room_name && (
                                  <span className="text-ink-4">
                                    · {lt.room_name}
                                  </span>
                                )}
                              </span>
                              {lt.has_signed ? (
                                <span className="text-xs text-green-700">
                                  Signed
                                </span>
                              ) : lt.declined ? (
                                <span className="text-xs text-red-600">
                                  Declined
                                </span>
                              ) : (
                                <span className="text-xs text-ink-4">
                                  Pending
                                </span>
                              )}
                            </li>
                          ))}
                      </ul>
                      {/* Deliberately absent: other tenants' rent shares and emails.
                        Everyone on the lease is jointly responsible for the full rent
                        shown above; another roommate's financial split isn't this
                        tenant's business. Just enough to know who they live with. */}
                    </div>
                  )}
              </CardContent>
            </Card>

            {/* Side column */}
            <div className="space-y-6">
              <Card className="overflow-hidden">
                <CardHeader className="border-b bg-white pb-3">
                  <CardTitle className="flex items-center text-lg">
                    <CreditCard className="mr-2 h-5 w-5 text-ink-2" /> Next
                    payment
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  {nextDueCharge ? (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-ink-3">Due</p>
                          <p className="text-lg font-semibold">
                            {nextDueCharge.due_date
                              ? format(
                                  parseISO(nextDueCharge.due_date),
                                  'MMM d, yyyy'
                                )
                              : '—'}
                          </p>
                        </div>
                        <div>
                          <p className="text-ink-3">Amount</p>
                          <p className="text-lg font-semibold">
                            {formatCurrency(
                              nextDueCharge.outstanding ?? nextDueCharge.amount
                            )}
                          </p>
                        </div>
                      </div>
                      <p className="text-xs text-ink-3">
                        {nextDueCharge.description}
                        {entryIsJoint(nextDueCharge) && (
                          <span className="block text-ink-4">
                            {groupLabel} total — any roommate&apos;s payment
                            counts.
                          </span>
                        )}
                      </p>
                      {daysUntilPayment !== null && (
                        <div
                          className={cn(
                            'rounded-md p-3 text-center text-sm',
                            nextDueCharge.charge_status === 'OVERDUE'
                              ? 'bg-red-50 text-red-700'
                              : daysUntilPayment <= 5
                                ? 'bg-amber-50 text-amber-700'
                                : 'bg-green-50 text-green-700'
                          )}
                        >
                          {nextDueCharge.charge_status === 'OVERDUE'
                            ? `${Math.abs(daysUntilPayment)} days overdue`
                            : `${daysUntilPayment} days until due`}
                        </div>
                      )}
                      <Button
                        className="w-full"
                        onClick={() => setActiveTab('payments')}
                      >
                        How to pay
                      </Button>
                    </div>
                  ) : (
                    <div className="py-4 text-center text-ink-3">
                      Nothing due — you&apos;re all paid up.
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* The two things that were buried. Now they're a click away, on the
                  page a tenant actually looks at. */}
              <Card className="overflow-hidden">
                <CardHeader className="border-b bg-white pb-3">
                  <CardTitle className="text-lg">My tenancy</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <TenancyLink
                    href="/dashboard/tenancy/calendar"
                    icon={CalendarDays}
                    title="Calendar"
                    body="Rent dates, inspections and visits"
                  />
                  <TenancyLink
                    href="/dashboard/tenancy/moving-out"
                    icon={DoorOpen}
                    title="Moving out"
                    body="Give notice, or ask to end early"
                  />
                </CardContent>
              </Card>

              {currentLease.end_date && (
                <Card className="overflow-hidden">
                  <CardHeader className="border-b bg-white pb-3">
                    <CardTitle className="flex items-center text-lg">
                      <FileText className="mr-2 h-5 w-5 text-ink-2" /> Lease
                      progress
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-6">
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Completed</span>
                        <span className="font-medium">{leaseProgress}%</span>
                      </div>
                      <Progress value={leaseProgress} className="h-2" />
                      <p className="text-xs text-ink-3">
                        Ends{' '}
                        {format(parseISO(currentLease.end_date), 'MMM d, yyyy')}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <Card className="overflow-hidden">
              <CardHeader className="flex flex-row items-center justify-between border-b bg-white pb-3">
                <CardTitle className="flex items-center text-lg">
                  <Receipt className="mr-2 h-5 w-5 text-ink-2" /> Recent
                  payments
                </CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setActiveTab('payments')}
                >
                  View all
                </Button>
              </CardHeader>
              <CardContent className="p-0">
                {myPayments.length > 0 ? (
                  <ul className="divide-y divide-line">
                    {myPayments.slice(0, 3).map((entry) => (
                      <li
                        key={entry.id}
                        className="transition-colors hover:bg-canvas"
                      >
                        <div className="flex items-center justify-between p-4">
                          <div className="flex-1">
                            <div className="text-sm font-medium">
                              {format(
                                parseISO(entry.effective_date),
                                'MMM d, yyyy'
                              )}
                              {entry.entry_type === 'CREDIT' && ' (Credit)'}
                            </div>
                            <div className="text-xs text-ink-3">
                              {entry.payment_method || entry.description}
                              {entryPayerName(entry) &&
                                ` · from ${entryPayerName(entry)}`}
                            </div>
                          </div>
                          <div className="text-sm font-medium">
                            {formatCurrency(entry.amount)}
                          </div>
                          {entry.entry_type === 'PAYMENT' ? (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="ml-2 h-7 w-7"
                              title="Download receipt (PDF)"
                              disabled={receiptBusyId === entry.id}
                              onClick={() => handleDownloadReceipt(entry.id)}
                            >
                              {receiptBusyId === entry.id ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              ) : (
                                <Download className="h-3.5 w-3.5 text-ink-4" />
                              )}
                            </Button>
                          ) : (
                            <Badge variant="active" className="ml-2">
                              Credited
                            </Badge>
                          )}
                        </div>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="p-6 text-center text-sm text-ink-3">
                    No payments recorded yet.
                  </p>
                )}
              </CardContent>
            </Card>

            <Card className="overflow-hidden">
              <CardHeader className="flex flex-row items-center justify-between border-b bg-white pb-3">
                <CardTitle className="flex items-center text-lg">
                  <Wrench className="mr-2 h-5 w-5 text-ink-2" /> Maintenance
                </CardTitle>
                <Button
                  size="sm"
                  className=""
                  onClick={() => setActiveTab('maintenance')}
                >
                  New request
                </Button>
              </CardHeader>
              <CardContent className="p-6">
                <p className="text-center text-sm text-ink-3">
                  Something broken or not working? Report it and follow what
                  happens next.
                </p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ================================================== PAYMENTS */}
        <TabsContent value="payments" className="mt-6 space-y-6">
          {hasJointCharges && (
            <div className="flex items-start gap-3 rounded-md border border-line bg-surface-sunken p-4">
              <Users className="mt-0.5 h-5 w-5 flex-shrink-0 text-ink-3" />
              <p className="text-sm text-ink-2">
                Your lease bills your {groupNoun} together: rent and the deposit
                are one shared amount, and a payment from{' '}
                <span className="font-medium">any</span> roommate settles it for
                everyone. Each payment below shows who it came from.
              </p>
            </div>
          )}

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-4">
            <SummaryCard
              label="Next due"
              value={
                nextDueCharge
                  ? formatCurrency(
                      nextDueCharge.outstanding ?? nextDueCharge.amount
                    )
                  : '$0.00'
              }
              hint={
                nextDueCharge?.due_date
                  ? `Due ${format(parseISO(nextDueCharge.due_date), 'MMM d, yyyy')}`
                  : 'Nothing scheduled'
              }
              icon={<Calendar className="h-5 w-5" />}
              tone="amber"
            />
            <SummaryCard
              label={hasJointCharges ? `${groupLabel} rent` : 'Monthly rent'}
              value={formatCurrency(currentLease.total_rent)}
              hint={
                hasJointCharges
                  ? `One shared bill for everyone on ${isRoomShare ? 'this room' : 'the lease'}`
                  : 'Full rent for this lease'
              }
              extra={proratedNote}
              icon={<Home className="h-5 w-5" />}
              tone="slate"
            />
            <SummaryCard
              label="Total outstanding"
              value={formatCurrency(totalOutstanding)}
              hint={
                openCharges.length > 0
                  ? `Across ${openCharges.length} open charge${openCharges.length === 1 ? '' : 's'}`
                  : 'Nothing owing'
              }
              icon={<Clock className="h-5 w-5" />}
              tone={totalOutstanding > 0 ? 'amber' : 'green'}
            />
            <SummaryCard
              label="Total paid (lease)"
              value={formatCurrency(totalPaid)}
              hint={
                hasJointCharges
                  ? 'All roommates combined'
                  : 'Sum of recorded payments'
              }
              icon={<CheckCircle className="h-5 w-5" />}
              tone="blue"
            />
          </div>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            <Card className="md:col-span-2">
              <CardHeader className="pb-3">
                <CardTitle>Your charges</CardTitle>
                <CardDescription>
                  Rent, utility shares, deposits and fees
                </CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                {myCharges.length > 0 ? (
                  <div className="rounded-md border">
                    <div className="grid grid-cols-5 bg-canvas p-3 text-sm font-medium text-ink-2">
                      <div>Due</div>
                      <div className="col-span-2">Description</div>
                      <div>Amount</div>
                      <div>Status</div>
                    </div>
                    <div className="max-h-96 divide-y divide-line overflow-y-auto">
                      {myCharges.map((entry) => {
                        const settled = entry.settled_amount
                          ? parseFloat(entry.settled_amount)
                          : 0;
                        return (
                          <div
                            key={entry.id}
                            className="grid grid-cols-5 p-3 text-sm"
                          >
                            <div>
                              {entry.due_date
                                ? format(
                                    parseISO(entry.due_date),
                                    'MMM d, yyyy'
                                  )
                                : '—'}
                            </div>
                            <div className="col-span-2">
                              <span className="font-medium">
                                {entry.description}
                              </span>
                              <span className="block text-xs text-ink-3">
                                {entry.entry_type_display}
                                {entryIsJoint(entry) && (
                                  <span className="ml-1 text-ink-4">
                                    ·{' '}
                                    {isRoomShare
                                      ? 'Shared (room)'
                                      : 'Household'}
                                  </span>
                                )}
                              </span>
                            </div>
                            <div className="font-medium">
                              {formatCurrency(entry.amount)}
                              {settled > 0 &&
                                settled < parseFloat(entry.amount) && (
                                  <span className="block text-xs text-ink-3">
                                    Paid: {formatCurrency(settled)}
                                  </span>
                                )}
                            </div>
                            <div>
                              <Badge
                                variant={getChargeStatusBadgeVariant(
                                  entry.charge_status
                                )}
                              >
                                {chargeStatusLabel(entry.charge_status)}
                              </Badge>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  <p className="p-6 text-center text-sm text-ink-3">
                    No charges yet — they&apos;ll appear once your lease is
                    active.
                  </p>
                )}
              </CardContent>
            </Card>

            <div className="space-y-6">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle>How to pay</CardTitle>
                  <CardDescription>
                    Money doesn&apos;t move through Rentium
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {nextDueCharge ? (
                    <>
                      <div className="rounded-md bg-canvas p-4">
                        <div className="mb-2 flex justify-between">
                          <span className="text-sm text-ink-2">
                            {nextDueCharge.description}
                          </span>
                          <span className="text-sm font-medium">
                            {formatCurrency(
                              nextDueCharge.outstanding ?? nextDueCharge.amount
                            )}
                          </span>
                        </div>
                        <div className="flex justify-between border-t border-line pt-2">
                          <span className="text-sm font-medium">
                            Total outstanding
                          </span>
                          <span className="text-sm font-bold">
                            {formatCurrency(totalOutstanding)}
                          </span>
                        </div>
                      </div>
                      <p className="text-xs text-ink-3">
                        {etransferEmail ? (
                          <>
                            Send your e-transfer to{' '}
                            <span className="select-all font-medium text-ink-2">
                              {etransferEmail}
                            </span>
                            . Once your landlord records it, it appears here
                            automatically
                            {hasJointCharges
                              ? ` for the whole ${groupNoun}`
                              : ''}
                            .
                          </>
                        ) : (
                          <>
                            Send your payment as usual. Once your landlord
                            records it, it appears here automatically
                            {hasJointCharges
                              ? ` for the whole ${groupNoun}`
                              : ''}
                            .
                          </>
                        )}
                      </p>
                    </>
                  ) : (
                    <p className="py-4 text-center text-sm text-ink-3">
                      No payments currently due.
                    </p>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle>Payment history</CardTitle>
                  <CardDescription>
                    Everything your landlord has recorded
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                  {myPayments.length > 0 ? (
                    <ul className="max-h-72 divide-y divide-line overflow-y-auto">
                      {myPayments.map((entry) => (
                        <li
                          key={entry.id}
                          className="flex items-center justify-between gap-2 p-3 text-sm"
                        >
                          <div className="min-w-0">
                            <div className="font-medium">
                              {format(
                                parseISO(entry.effective_date),
                                'MMM d, yyyy'
                              )}
                            </div>
                            <div className="truncate text-xs text-ink-3">
                              {entry.entry_type === 'CREDIT'
                                ? 'Credit'
                                : entry.payment_method || 'Payment'}
                              {entryPayerName(entry)
                                ? ` · from ${entryPayerName(entry)}`
                                : ''}
                              {entry.reference_number
                                ? ` · Ref ${entry.reference_number}`
                                : ''}
                            </div>
                          </div>
                          <div className="flex flex-shrink-0 items-center gap-1">
                            <span className="font-medium">
                              {formatCurrency(entry.amount)}
                            </span>
                            {entry.entry_type === 'PAYMENT' && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7"
                                title="Download receipt (PDF)"
                                disabled={receiptBusyId === entry.id}
                                onClick={() => handleDownloadReceipt(entry.id)}
                              >
                                {receiptBusyId === entry.id ? (
                                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                ) : (
                                  <Download className="h-3.5 w-3.5 text-ink-4" />
                                )}
                              </Button>
                            )}
                          </div>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="p-6 text-center text-sm text-ink-3">
                      No payments recorded yet.
                    </p>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        {/* ================================================== MAINTENANCE */}
        <TabsContent value="maintenance" className="mt-6">
          <TenantMaintenance
            propertyId={propertyId}
            leaseId={currentLease.id}
            propertyLabel={
              currentLease.property_name || currentLease.group_name || undefined
            }
          />
        </TabsContent>

        {/* ================================================== DOCUMENTS */}
        <TabsContent value="documents" className="mt-6">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle>Documents</CardTitle>
              <CardDescription>
                Your lease and anything attached to it
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <div className="border-b">
                <div className="flex items-center justify-between p-4 hover:bg-canvas">
                  <div className="flex items-center">
                    <FileText className="mr-3 h-5 w-5 flex-shrink-0 text-ink-4" />
                    <div>
                      <span className="text-sm font-medium">
                        Your lease agreement (PDF)
                      </span>
                      <p className="text-xs text-ink-3">
                        The exact document you signed, generated on demand
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleDownloadLeasePdf}
                    disabled={isDownloadingPdf}
                  >
                    {isDownloadingPdf ? (
                      <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                    ) : (
                      <Download className="mr-1 h-4 w-4" />
                    )}
                    Download
                  </Button>
                </div>
              </div>

              {documents.length > 0 ? (
                <ul className="divide-y divide-line">
                  {documents.map((doc) => (
                    <li
                      key={doc.id}
                      className="flex items-center justify-between p-4 hover:bg-canvas"
                    >
                      <div className="flex min-w-0 items-center">
                        <FileText className="mr-3 h-5 w-5 flex-shrink-0 text-ink-4" />
                        <div className="min-w-0">
                          <span className="truncate text-sm font-medium">
                            {doc.title}
                          </span>
                          <p className="text-xs text-ink-3">
                            {doc.uploaded_at
                              ? format(parseISO(doc.uploaded_at), 'MMM d, yyyy')
                              : '—'}
                          </p>
                        </div>
                      </div>
                      <Button variant="ghost" size="icon" asChild>
                        <a
                          href={doc.document}
                          target="_blank"
                          rel="noreferrer"
                          title={`Download ${doc.title}`}
                        >
                          <Download className="h-4 w-4" />
                        </a>
                      </Button>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="p-6 text-center text-sm text-ink-3">
                  No other documents on this lease.
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ------------------------------------------------------------------ bits
function TenancyLink({
  href,
  icon: Icon,
  title,
  body,
}: {
  href: string;
  icon: React.ElementType;
  title: string;
  body: string;
}) {
  return (
    <Link
      href={href}
      className="flex items-center gap-3 border-b p-4 transition-colors last:border-0 hover:bg-canvas"
    >
      <Icon className="h-5 w-5 flex-shrink-0 text-brand" />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-ink">{title}</p>
        <p className="text-xs text-ink-3">{body}</p>
      </div>
      <ChevronRight className="h-4 w-4 flex-shrink-0 text-ink-4" />
    </Link>
  );
}

function SummaryCard({
  label,
  value,
  hint,
  extra,
  icon,
  tone,
}: {
  label: string;
  value: string;
  hint?: string;
  extra?: string | null;
  icon: React.ReactNode;
  tone: 'amber' | 'green' | 'blue' | 'slate';
}) {
  const tones: Record<string, string> = {
    amber: 'bg-amber-50 text-amber-600',
    green: 'bg-green-50 text-green-600',
    blue: 'bg-blue-50 text-blue-600',
    slate: 'bg-surface-sunken text-ink-2',
  };
  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="min-w-0">
            <p className="text-sm font-medium text-ink-3">{label}</p>
            <p className="truncate text-2xl font-semibold">{value}</p>
          </div>
          <div className={cn('flex-shrink-0 rounded-full p-2', tones[tone])}>
            {icon}
          </div>
        </div>
        {hint && <p className="mt-2 text-xs text-ink-3">{hint}</p>}
        {extra && <p className="mt-0.5 text-xs text-amber-600">{extra}</p>}
      </CardContent>
    </Card>
  );
}
