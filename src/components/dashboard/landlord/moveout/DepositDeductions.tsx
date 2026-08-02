'use client';

/**
 * What the landlord proposes to keep from the deposits, costed line by line.
 *
 * It lives on the move-out inspection rather than in its own screen because
 * the RTB-27 is already the document that records the state the place was left
 * in, row by row, signed by both parties. A deduction is the price of one of
 * those rows.
 *
 * Adding lines KEEPS NOTHING. Under the BC RTA a landlord may hold deposit
 * money back only with the tenant's written agreement or an RTB order, so the
 * screen shows a running total and a single "the tenant agreed" action — and
 * once that is recorded, the lines freeze, because changing a signed agreement
 * is the thing the RTB tells you to replace with an addendum.
 */

import React, { useCallback, useEffect, useState } from 'react';
import { Loader2, Plus, Trash2, Lock } from 'lucide-react';
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
  addDeduction,
  agreeDeductions,
  deleteDeduction,
  fetchDeductions,
  DEDUCTION_BASES,
  DEPOSIT_KINDS,
  type DeductionBasis,
  type DepositDeduction,
  type DepositKind,
  type InspectionDetail,
} from '@/lib/inspectionApi';

const money = (v: string | number | null | undefined) =>
  `$${Number(v ?? 0).toFixed(2)}`;

export function DepositDeductions({
  token,
  inspection,
  onChanged,
}: {
  token: string;
  inspection: InspectionDetail;
  onChanged: () => void;
}) {
  const [lines, setLines] = useState<DepositDeduction[]>(
    inspection.deposit_deductions ?? []
  );
  const [busy, setBusy] = useState(false);
  const [agreedOn, setAgreedOn] = useState('');

  const [depositKind, setDepositKind] = useState<DepositKind>('CLEANING');
  const [basis, setBasis] = useState<DeductionBasis>('LABOUR');
  const [hours, setHours] = useState('');
  const [rate, setRate] = useState('');
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');

  const frozen = Boolean(inspection.deduction_agreed_at);

  const reload = useCallback(async () => {
    try {
      setLines(await fetchDeductions(token, inspection.id));
    } catch {
      /* the list just keeps what it had */
    }
  }, [token, inspection.id]);

  useEffect(() => {
    setLines(inspection.deposit_deductions ?? []);
  }, [inspection.deposit_deductions]);

  const totals = lines.reduce<Record<string, number>>((acc, line) => {
    acc[line.deposit_kind] =
      (acc[line.deposit_kind] ?? 0) + Number(line.amount ?? 0);
    return acc;
  }, {});
  const grandTotal = Object.values(totals).reduce((a, b) => a + b, 0);

  // Labour is priced so the arithmetic itself is on the record — a lump sum
  // for your own time isn't answerable at a hearing.
  const isLabour = basis === 'LABOUR';
  const previewAmount = isLabour
    ? Number(hours || 0) * Number(rate || 0)
    : Number(amount || 0);
  const canAdd = isLabour
    ? Number(hours) > 0 && Number(rate) > 0
    : Number(amount) > 0;

  const add = async () => {
    setBusy(true);
    try {
      await addDeduction(token, inspection.id, {
        deposit_kind: depositKind,
        basis,
        hours: isLabour ? hours : null,
        hourly_rate: isLabour ? rate : null,
        amount: isLabour ? null : amount,
        note,
      });
      setHours('');
      setRate('');
      setAmount('');
      setNote('');
      await reload();
      onChanged();
      toast.success('Deduction recorded. Nothing is kept yet.');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not add that line.');
    } finally {
      setBusy(false);
    }
  };

  const remove = async (id: string) => {
    setBusy(true);
    try {
      await deleteDeduction(token, inspection.id, id);
      await reload();
      onChanged();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not remove that.');
    } finally {
      setBusy(false);
    }
  };

  const agree = async () => {
    setBusy(true);
    try {
      await agreeDeductions(token, inspection.id, agreedOn || undefined);
      onChanged();
      toast.success('Written agreement recorded.');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not record that.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-3 rounded-md border p-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium">Deposit deductions</p>
          <p className="text-xs text-ink-3">
            What you propose to keep, and why. Recording it keeps nothing —
            deposit money needs the tenant&rsquo;s written agreement or an RTB
            order.
          </p>
        </div>
        {grandTotal > 0 && (
          <p className="shrink-0 text-sm font-medium tabular-nums">
            {money(grandTotal)}
          </p>
        )}
      </div>

      {lines.length > 0 && (
        <ul className="divide-y rounded-md border">
          {lines.map((line) => (
            <li
              key={line.id}
              className="flex items-start justify-between gap-3 p-2 text-sm"
            >
              <div className="min-w-0">
                <p>
                  <span className="font-medium">{line.basis_display}</span>
                  <span className="text-ink-3">
                    {' '}
                    — from the {line.deposit_kind_display.toLowerCase()}
                  </span>
                </p>
                {line.basis === 'LABOUR' && (
                  <p className="text-xs text-ink-3">
                    {line.hours} h × {money(line.hourly_rate)}
                  </p>
                )}
                {line.note && (
                  <p className="text-xs text-ink-3 break-words">{line.note}</p>
                )}
                {line.item_label && (
                  <p className="text-xs text-ink-4">On: {line.item_label}</p>
                )}
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <span className="tabular-nums">{money(line.amount)}</span>
                {!frozen && (
                  <button
                    type="button"
                    onClick={() => remove(line.id)}
                    disabled={busy}
                    aria-label="Remove deduction"
                    className="text-ink-4 hover:text-red-600"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      {frozen ? (
        <div className="flex items-start gap-2 rounded-md border border-green-200 bg-green-50 p-2 text-sm text-green-900">
          <Lock className="mt-0.5 h-4 w-4 shrink-0" />
          <div>
            <p className="font-medium">
              Tenant agreed in writing on{' '}
              {inspection.deduction_agreed_at?.slice(0, 10)}
            </p>
            <p className="mt-0.5 text-xs">
              These figures are now part of a signed agreement, so they
              can&rsquo;t be edited. Settle the deposit on the move-out request
              to pay the balance back.
            </p>
          </div>
        </div>
      ) : (
        <>
          <div className="space-y-2 border-t pt-3">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs text-ink-4">Taken from</Label>
                <Select
                  value={depositKind}
                  onValueChange={(v) => setDepositKind(v as DepositKind)}
                >
                  <SelectTrigger className="h-8">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {DEPOSIT_KINDS.map((d) => (
                      <SelectItem key={d.value} value={d.value}>
                        {d.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs text-ink-4">For</Label>
                <Select
                  value={basis}
                  onValueChange={(v) => setBasis(v as DeductionBasis)}
                >
                  <SelectTrigger className="h-8">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {DEDUCTION_BASES.map((b) => (
                      <SelectItem key={b.value} value={b.value}>
                        {b.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {isLabour ? (
              <div className="grid grid-cols-[1fr_1fr_auto] items-end gap-2">
                <div>
                  <Label className="text-xs text-ink-4">Hours</Label>
                  <Input
                    type="number"
                    min="0"
                    step="0.25"
                    className="h-8"
                    value={hours}
                    onChange={(e) => setHours(e.target.value)}
                  />
                </div>
                <div>
                  <Label className="text-xs text-ink-4">Rate / hour</Label>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    className="h-8"
                    value={rate}
                    onChange={(e) => setRate(e.target.value)}
                  />
                </div>
                <p className="pb-1.5 text-sm tabular-nums text-ink-2">
                  = {money(previewAmount)}
                </p>
              </div>
            ) : (
              <div>
                <Label className="text-xs text-ink-4">Amount</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  className="h-8"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                />
              </div>
            )}

            <div>
              <Label className="text-xs text-ink-4">What this covers</Label>
              <Textarea
                rows={2}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Oven, bathroom and inside the fridge; two bags to the transfer station"
              />
            </div>

            <Button
              size="sm"
              variant="outline"
              onClick={add}
              disabled={busy || !canAdd}
            >
              {busy ? (
                <Loader2 className="mr-1 h-4 w-4 animate-spin" />
              ) : (
                <Plus className="mr-1 h-4 w-4" />
              )}
              Add line
            </Button>
          </div>

          {grandTotal > 0 && (
            <div className="flex flex-wrap items-end gap-2 border-t pt-3">
              <div>
                <Label className="text-xs text-ink-4">
                  Tenant agreed in writing on
                </Label>
                <Input
                  type="date"
                  className="h-8 w-[170px]"
                  value={agreedOn}
                  onChange={(e) => setAgreedOn(e.target.value)}
                />
              </div>
              <Button size="sm" onClick={agree} disabled={busy}>
                Record their agreement
              </Button>
              <p className="w-full text-xs text-ink-4">
                Without this — or an RTB order — none of it can be kept, and the
                whole deposit is due back within 15 days.
              </p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
