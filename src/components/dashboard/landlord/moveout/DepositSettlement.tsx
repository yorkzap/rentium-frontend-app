'use client';

/**
 * Settling a deposit — the 15-day clock, and the only three lawful ways out.
 *
 * Under the BC RTA a landlord may keep deposit money only with the tenant's
 * WRITTEN agreement, or by applying to the RTB — and either must happen within
 * 15 days of the later of the tenancy ending and the forwarding address
 * arriving in writing. Miss it and the claim is lost AND double the deposit
 * becomes payable.
 *
 * So this screen never offers "deduct". It shows the deadline, what is claimed,
 * and the three routes that actually close it.
 */

import React, { useCallback, useEffect, useState } from 'react';
import { AlertTriangle, CalendarClock, Check, Loader2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import {
  fetchDepositBalances,
  settleDeposit,
  type DepositBalances,
  type DepositSettlement as Settlement,
  type MoveOutRequest,
} from '@/lib/moveoutApi';

const ROUTES: { value: Settlement; label: string; needs?: 'date' | 'file' }[] =
  [
    { value: 'RETURNED', label: 'Returned the deposit in full' },
    {
      value: 'AGREED',
      label: 'Tenant agreed in writing to a deduction',
      needs: 'date',
    },
    { value: 'RTB', label: 'Applied to the RTB', needs: 'file' },
  ];

// The two routes that actually move money. RTB doesn't — the arbitrator
// hasn't ruled yet.
const PAYS_OUT: Settlement[] = ['RETURNED', 'AGREED'];

const RETURN_METHODS = [
  { value: 'ETRANSFER', label: 'e-Transfer' },
  { value: 'CASH', label: 'Cash' },
  { value: 'CHEQUE', label: 'Cheque' },
  { value: 'OTHER', label: 'Other' },
] as const;

const money = (v: string | number) => `$${Number(v ?? 0).toFixed(2)}`;

export function DepositSettlement({
  token,
  request,
  onChanged,
}: {
  token: string;
  request: MoveOutRequest;
  onChanged: (updated: MoveOutRequest) => void;
}) {
  const status = request.deposit_status;
  const [address, setAddress] = useState(request.forwarding_address ?? '');
  const [receivedOn, setReceivedOn] = useState(
    request.forwarding_address_received_on ?? ''
  );
  const [route, setRoute] = useState<Settlement | ''>('');
  const [agreedOn, setAgreedOn] = useState('');
  const [fileNo, setFileNo] = useState('');
  const [saving, setSaving] = useState(false);

  // Each deposit is its own charge and goes back as its own transfer, so the
  // screen that settles them has to show them apart. One "deposit held"
  // number is how a landlord returns the cleaning deposit by accident.
  const [balances, setBalances] = useState<DepositBalances | null>(null);
  const [method, setMethod] =
    useState<(typeof RETURN_METHODS)[number]['value']>('ETRANSFER');
  const [returnDate, setReturnDate] = useState('');

  const loadBalances = useCallback(() => {
    fetchDepositBalances(token, request.id)
      .then(setBalances)
      .catch(() => setBalances(null));
  }, [token, request.id]);

  useEffect(loadBalances, [loadBalances]);

  const needs = ROUTES.find((r) => r.value === route)?.needs;
  const paysOut = route !== '' && PAYS_OUT.includes(route);
  const holdsMoney = (balances?.deposits.length ?? 0) > 0;

  const save = async (payload: Parameters<typeof settleDeposit>[2]) => {
    setSaving(true);
    try {
      onChanged(await settleDeposit(token, request.id, payload));
      toast.success('Saved.');
    } catch (e) {
      toast.error(
        e instanceof Error
          ? e.message
          : 'Could not save that — check the fields.'
      );
    } finally {
      setSaving(false);
    }
  };

  if (status.settled) {
    return (
      <div className="rounded-md border border-green-200 bg-green-50 p-3 text-sm">
        <p className="flex items-center gap-2 font-medium text-green-900">
          <Check className="h-4 w-4 shrink-0" />
          Deposit settled — {request.settlement_display}
        </p>
        {request.rtb_file_number && (
          <p className="mt-1 text-green-800">
            RTB file {request.rtb_file_number}
          </p>
        )}
        {request.tenant_agreement_signed_on && (
          <p className="mt-1 text-green-800">
            Tenant signed {request.tenant_agreement_signed_on}
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-3 rounded-md border p-3">
      {/* The deadline, or plainly why there isn't one yet. */}
      {status.deadline ? (
        <div
          className={`flex items-start gap-2 rounded-md p-2 text-sm ${
            status.overdue
              ? 'border border-red-200 bg-red-50 text-red-900'
              : (status.days_left ?? 99) <= 5
                ? 'border border-amber-200 bg-amber-50 text-amber-900'
                : 'bg-canvas text-ink-2'
          }`}
        >
          {status.overdue ? (
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          ) : (
            <CalendarClock className="mt-0.5 h-4 w-4 shrink-0" />
          )}
          <div>
            <p className="font-medium">
              {status.overdue
                ? `Deadline passed — it was ${status.deadline}`
                : `${status.days_left} day(s) left — deadline ${status.deadline}`}
            </p>
            <p className="mt-0.5">
              {status.overdue ? status.if_missed : status.what_must_happen}
            </p>
          </div>
        </div>
      ) : (
        <div className="rounded-md bg-canvas p-2 text-sm text-ink-2">
          <p className="font-medium">The 15-day clock hasn&rsquo;t started</p>
          <p className="mt-0.5">
            {status.blocked_on ??
              'It starts when the tenancy ends and you have their forwarding address in writing.'}
          </p>
        </div>
      )}

      {/* Step one: the address, because the clock runs from it. */}
      <div className="space-y-2">
        <Label className="text-xs uppercase tracking-wide text-ink-4">
          Forwarding address (in writing)
        </Label>
        <Textarea
          rows={2}
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          placeholder="Where the deposit is to be sent"
        />
        <div className="flex flex-wrap items-end gap-2">
          <div>
            <Label className="text-xs text-ink-4">Received on</Label>
            <Input
              type="date"
              value={receivedOn}
              onChange={(e) => setReceivedOn(e.target.value)}
              className="w-[170px]"
            />
          </div>
          <Button
            variant="outline"
            size="sm"
            disabled={saving || !address.trim()}
            onClick={() =>
              save({
                forwarding_address: address,
                forwarding_address_received_on: receivedOn || undefined,
              })
            }
          >
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              'Save address'
            )}
          </Button>
        </div>
      </div>

      {/* What is actually held, deposit by deposit. */}
      {balances?.blocked && (
        <div className="rounded-md border border-amber-200 bg-amber-50 p-2 text-sm text-amber-900">
          {balances.blocked}
        </div>
      )}
      {holdsMoney && (
        <div className="space-y-1 border-t pt-3">
          <Label className="text-xs uppercase tracking-wide text-ink-4">
            Deposits held
          </Label>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-xs text-ink-4">
                <tr>
                  <th className="py-1 text-left font-normal">Deposit</th>
                  <th className="py-1 text-right font-normal">Held</th>
                  <th className="py-1 text-right font-normal">Keeping</th>
                  <th className="py-1 text-right font-normal">Returning</th>
                </tr>
              </thead>
              <tbody>
                {balances!.deposits.map((d) => (
                  <tr key={d.charge_id} className="border-t">
                    <td className="py-1">
                      {d.label}
                      {d.tenant && (
                        <span className="text-xs text-ink-4">
                          {' '}
                          · {d.tenant}
                        </span>
                      )}
                    </td>
                    <td className="py-1 text-right tabular-nums">
                      {money(d.held)}
                    </td>
                    <td className="py-1 text-right tabular-nums">
                      {money(d.proposed_deduction)}
                    </td>
                    <td className="py-1 text-right font-medium tabular-nums">
                      {money(d.returning)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-ink-4">
            {balances!.deductions_agreed
              ? 'The “keeping” column is what the tenant agreed to in writing on the move-out inspection. Each deposit goes back as its own transfer.'
              : 'Nothing can be kept until the tenant agrees in writing — record the deductions on the move-out inspection first. Each deposit goes back as its own transfer.'}
          </p>
        </div>
      )}

      {/* Step two: close it, one of three lawful ways. */}
      <div className="space-y-2 border-t pt-3">
        <Label className="text-xs uppercase tracking-wide text-ink-4">
          How was it settled?
        </Label>
        <div className="flex flex-wrap items-end gap-2">
          <Select
            value={route}
            onValueChange={(v) => setRoute(v as Settlement)}
          >
            <SelectTrigger className="w-[290px]">
              <SelectValue placeholder="Choose one" />
            </SelectTrigger>
            <SelectContent>
              {ROUTES.map((r) => (
                <SelectItem key={r.value} value={r.value}>
                  {r.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Each route has to be evidenced — "settled" with nothing behind it
              is the record that loses a dispute. */}
          {needs === 'date' && (
            <div>
              <Label className="text-xs text-ink-4">Tenant signed on</Label>
              <Input
                type="date"
                value={agreedOn}
                onChange={(e) => setAgreedOn(e.target.value)}
                className="w-[170px]"
              />
            </div>
          )}
          {needs === 'file' && (
            <div>
              <Label className="text-xs text-ink-4">RTB file number</Label>
              <Input
                value={fileNo}
                onChange={(e) => setFileNo(e.target.value)}
                placeholder="e.g. 123456"
                className="w-[170px]"
              />
            </div>
          )}

          {/* Money going back needs to say how and when — that is the record
              that the 15-day obligation was met. */}
          {paysOut && holdsMoney && (
            <>
              <div>
                <Label className="text-xs text-ink-4">Returned by</Label>
                <Select
                  value={method}
                  onValueChange={(v) =>
                    setMethod(v as (typeof RETURN_METHODS)[number]['value'])
                  }
                >
                  <SelectTrigger className="w-[150px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {RETURN_METHODS.map((m) => (
                      <SelectItem key={m.value} value={m.value}>
                        {m.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs text-ink-4">On</Label>
                <Input
                  type="date"
                  value={returnDate}
                  onChange={(e) => setReturnDate(e.target.value)}
                  className="w-[170px]"
                />
              </div>
            </>
          )}

          <Button
            size="sm"
            disabled={
              saving ||
              !route ||
              (needs === 'date' && !agreedOn) ||
              (needs === 'file' && !fileNo.trim())
            }
            onClick={() =>
              save({
                deposit_settlement: route as Settlement,
                tenant_agreement_signed_on: agreedOn || undefined,
                rtb_file_number: fileNo || undefined,
                ...(paysOut && holdsMoney
                  ? {
                      deposit_return_method: method,
                      deposit_return_date: returnDate || undefined,
                    }
                  : {}),
              })
            }
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Record'}
          </Button>
        </div>
        <p className="text-xs text-ink-4">
          There is no fourth option. Keeping any of the deposit without the
          tenant&rsquo;s written agreement or an RTB application means the claim
          is lost and double the deposit becomes payable.
        </p>
      </div>
    </div>
  );
}

export function DepositBadge({ request }: { request: MoveOutRequest }) {
  const s = request.deposit_status;
  if (s.settled)
    return (
      <Badge variant="outline" className="border-green-200 text-green-800">
        Deposit settled
      </Badge>
    );
  if (s.overdue)
    return (
      <Badge variant="outline" className="border-red-200 text-red-800">
        Deposit deadline passed
      </Badge>
    );
  if (s.days_left !== null)
    return (
      <Badge variant="outline" className="border-amber-200 text-amber-900">
        Deposit: {s.days_left}d left
      </Badge>
    );
  return null;
}
