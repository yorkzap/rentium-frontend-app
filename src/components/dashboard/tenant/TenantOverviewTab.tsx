// TenantOverviewTab.tsx
//
// The tenant home's Overview tab, split out of TenantDashboard.tsx: the
// "Upcoming" strip, place/lease summary, next payment, tenancy links, lease
// progress, recent payments, and the maintenance shortcut.
'use client';
import {
  Home,
  CreditCard,
  Wrench,
  Receipt,
  DoorOpen,
  Download,
  Loader2,
  Users,
  Lock,
  CalendarDays,
  ChevronRight,
  FileText,
} from 'lucide-react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { format, parseISO } from 'date-fns';
import type { Lease, LeaseTenant } from '@/types/lease';
import type { LedgerEntry } from '@/lib/financeApi';
import type { MaintenanceArea } from '@/lib/maintenanceApi';
import InspectionSignCard from './InspectionSignCard';
import UpcomingStrip from './UpcomingStrip';
import ViewingConsentCard from './ViewingConsentCard';
import InspectionScheduleCard from './InspectionScheduleCard';

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

export default function TenantOverviewTab({
  currentLease,
  leaseTenantInfo,
  privateAreas,
  sharedAreas,
  hasJointCharges,
  groupLabel,
  nextDueCharge,
  daysUntilPayment,
  myPayments,
  receiptBusyId,
  onDownloadReceipt,
  leaseProgress,
  getStatusBadgeVariant,
  formatCurrency,
  entryPayerName,
  entryIsJoint,
  onGoToPayments,
  onGoToMaintenance,
}: {
  currentLease: Lease;
  leaseTenantInfo: LeaseTenant | null;
  privateAreas: MaintenanceArea[];
  sharedAreas: MaintenanceArea[];
  hasJointCharges: boolean;
  groupLabel: string;
  nextDueCharge: LedgerEntry | null;
  daysUntilPayment: number | null;
  myPayments: LedgerEntry[];
  receiptBusyId: string | null;
  onDownloadReceipt: (paymentId: string) => void;
  leaseProgress: number;
  getStatusBadgeVariant: (
    status: string
  ) =>
    | 'active'
    | 'pending'
    | 'secondary'
    | 'expired'
    | 'terminated'
    | 'outline'
    | 'default';
  formatCurrency: (amount: number | string | null | undefined) => string;
  entryPayerName: (e: LedgerEntry) => string | null;
  entryIsJoint: (e: LedgerEntry) => boolean;
  onGoToPayments: () => void;
  onGoToMaintenance: () => void;
}) {
  const myAreas = [...privateAreas, ...sharedAreas];

  const nextDueTone = !nextDueCharge
    ? 'green'
    : nextDueCharge.charge_status === 'OVERDUE'
      ? 'red'
      : daysUntilPayment !== null && daysUntilPayment <= 5
        ? 'amber'
        : 'slate';
  const nextDueLabel = nextDueCharge
    ? formatCurrency(nextDueCharge.outstanding ?? nextDueCharge.amount)
    : 'Nothing due';
  const nextDueHint = !nextDueCharge
    ? "You're all paid up"
    : nextDueCharge.charge_status === 'OVERDUE'
      ? `${Math.abs(daysUntilPayment ?? 0)} days overdue`
      : daysUntilPayment !== null
        ? `Due in ${daysUntilPayment} day${daysUntilPayment === 1 ? '' : 's'}`
        : 'Nothing scheduled';

  const signatureState =
    leaseTenantInfo && !leaseTenantInfo.has_signed && !leaseTenantInfo.declined
      ? { label: 'Your signature', hint: 'Needed to activate the lease' }
      : currentLease.status !== 'ACTIVE' && leaseTenantInfo?.has_signed
        ? { label: 'Waiting on others', hint: "You've signed" }
        : null;

  return (
    <div className="mt-6 space-y-6">
      <UpcomingStrip
        leaseId={currentLease.id}
        nextDueLabel={nextDueLabel}
        nextDueHint={nextDueHint}
        nextDueTone={nextDueTone}
        signatureState={signatureState}
      />

      <ViewingConsentCard leaseId={currentLease.id} />

      <InspectionScheduleCard leaseId={currentLease.id} />

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
                {currentLease.property_name || currentLease.group_name || 'N/A'}
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
                  {format(parseISO(currentLease.start_date), 'MMM d, yyyy')} —{' '}
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
                          <Lock className="mr-1 h-3 w-3 text-ink-4" /> {a.name}
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
                          <Users className="mr-1 h-3 w-3 text-ink-3" /> {a.name}
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
                            <span className="text-xs text-ink-4">Pending</span>
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
                <CreditCard className="mr-2 h-5 w-5 text-ink-2" /> Next payment
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
                        {groupLabel} total — any roommate&apos;s payment counts.
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
                  <Button className="w-full" onClick={onGoToPayments}>
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
              <Receipt className="mr-2 h-5 w-5 text-ink-2" /> Recent payments
            </CardTitle>
            <Button variant="ghost" size="sm" onClick={onGoToPayments}>
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
                          onClick={() => onDownloadReceipt(entry.id)}
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
            <Button size="sm" className="" onClick={onGoToMaintenance}>
              New request
            </Button>
          </CardHeader>
          <CardContent className="p-6">
            <p className="text-center text-sm text-ink-3">
              Something broken or not working? Report it and follow what happens
              next.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
