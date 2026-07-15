// TenantPaymentsTab.tsx
//
// The tenant home's Payments tab, split out of TenantDashboard.tsx: summary
// cards, the charges table, how-to-pay, and payment history.
'use client';
import {
  Calendar,
  Home,
  Clock,
  CheckCircle,
  Users,
  Download,
  Loader2,
} from 'lucide-react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge, type BadgeProps } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { format, parseISO } from 'date-fns';
import type { Lease } from '@/types/lease';
import type { ChargeStatus, LedgerEntry } from '@/lib/financeApi';

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

export default function TenantPaymentsTab({
  currentLease,
  hasJointCharges,
  isRoomShare,
  groupNoun,
  groupLabel,
  nextDueCharge,
  proratedNote,
  totalOutstanding,
  totalPaid,
  openCharges,
  myCharges,
  myPayments,
  receiptBusyId,
  onDownloadReceipt,
  etransferEmail,
  formatCurrency,
  entryPayerName,
  entryIsJoint,
  getChargeStatusBadgeVariant,
  chargeStatusLabel,
}: {
  currentLease: Lease;
  hasJointCharges: boolean;
  isRoomShare: boolean;
  groupNoun: string;
  groupLabel: string;
  nextDueCharge: LedgerEntry | null;
  proratedNote: string | null;
  totalOutstanding: number;
  totalPaid: number;
  openCharges: LedgerEntry[];
  myCharges: LedgerEntry[];
  myPayments: LedgerEntry[];
  receiptBusyId: string | null;
  onDownloadReceipt: (paymentId: string) => void;
  etransferEmail: string | null;
  formatCurrency: (amount: number | string | null | undefined) => string;
  entryPayerName: (e: LedgerEntry) => string | null;
  entryIsJoint: (e: LedgerEntry) => boolean;
  getChargeStatusBadgeVariant: (
    status: ChargeStatus | null
  ) => BadgeProps['variant'];
  chargeStatusLabel: (status: ChargeStatus | null) => string;
}) {
  return (
    <div className="mt-6 space-y-6">
      {hasJointCharges && (
        <div className="flex items-start gap-3 rounded-md border border-line bg-surface-sunken p-4">
          <Users className="mt-0.5 h-5 w-5 flex-shrink-0 text-ink-3" />
          <p className="text-sm text-ink-2">
            Your lease bills your {groupNoun} together: rent and the deposit are
            one shared amount, and a payment from{' '}
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
                            ? format(parseISO(entry.due_date), 'MMM d, yyyy')
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
                                · {isRoomShare ? 'Shared (room)' : 'Household'}
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
                No charges yet — they&apos;ll appear once your lease is active.
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
                        {hasJointCharges ? ` for the whole ${groupNoun}` : ''}.
                      </>
                    ) : (
                      <>
                        Send your payment as usual. Once your landlord records
                        it, it appears here automatically
                        {hasJointCharges ? ` for the whole ${groupNoun}` : ''}.
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
                            onClick={() => onDownloadReceipt(entry.id)}
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
    </div>
  );
}
