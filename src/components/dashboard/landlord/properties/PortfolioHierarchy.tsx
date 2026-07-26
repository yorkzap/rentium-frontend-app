'use client';

/**
 * The portfolio as it physically is: address -> unit -> what's on the market.
 *
 * The flat listing view was the visible half of a modelling bug. A floor let as
 * one home and a floor let room by room were both stored as a group of room
 * listings, so nine physical units displayed as fourteen rooms and there was no
 * way to see that three of those "rooms" were one house.
 *
 * Two rules this view exists to honour:
 *   - a bedroom inside a whole unit is layout, not something on the market;
 *   - "not recorded" is shown as not recorded, never as zero.
 */

import React, { useCallback, useEffect, useState } from 'react';
import {
  Building2,
  ChevronDown,
  ChevronRight,
  DoorOpen,
  Home,
  Info,
  Loader2,
  Lock,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
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
import { toast } from 'sonner';
import {
  fetchHierarchy,
  previewRentalMode,
  setRentalMode,
  type HoldingHierarchy,
  type PropertyUnit,
  type RentalMode,
  type RentalModeSwitchPreview,
} from '@/lib/propertyApi';

interface Props {
  token: string;
  searchTerm?: string;
  onOpenListing?: (id: number) => void;
}

/** `null` means the layout was never recorded — say so rather than showing 0. */
function countLabel(n: number | null, singular: string): string {
  if (n === null) return `${singular} not recorded`;
  return `${n} ${singular}${n === 1 ? '' : 's'}`;
}

function LayoutLine({ unit }: { unit: PropertyUnit }) {
  const { layout_summary: s } = unit;
  return (
    <p className="text-sm text-muted-foreground">
      {countLabel(s.bedrooms, 'bedroom')} &middot;{' '}
      {countLabel(s.bathrooms, 'bathroom')}
      {s.recorded_space_count > 0 && (
        <>
          {' '}
          &middot; {s.recorded_space_count} recorded space
          {s.recorded_space_count === 1 ? '' : 's'}
        </>
      )}
    </p>
  );
}

function UnitCard({
  unit,
  onSwitch,
  onOpenListing,
}: {
  unit: PropertyUnit;
  onSwitch: (unit: PropertyUnit, to: RentalMode) => void;
  onOpenListing?: (id: number) => void;
}) {
  const [open, setOpen] = useState(false);
  const isWhole = unit.rental_mode === 'WHOLE_UNIT';
  const target: RentalMode = isWhole ? 'BY_ROOM' : 'WHOLE_UNIT';

  return (
    <Card
      className="border-l-4"
      style={{ borderLeftColor: isWhole ? '#2563eb' : '#7c3aed' }}
    >
      <CardContent className="p-4 space-y-3">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              {isWhole ? (
                <Home className="h-4 w-4 shrink-0 text-blue-600" />
              ) : (
                <DoorOpen className="h-4 w-4 shrink-0 text-purple-600" />
              )}
              <span className="font-medium truncate">{unit.name}</span>
              <Badge variant="outline" className="shrink-0">
                {unit.rental_mode_display}
              </Badge>
            </div>
            <LayoutLine unit={unit} />
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => onSwitch(unit, target)}
            className="shrink-0"
          >
            Change how this unit is rented
          </Button>
        </div>

        {!unit.layout_complete && (
          <div className="flex items-start gap-2 rounded-md bg-amber-50 border border-amber-200 p-2 text-sm text-amber-900">
            <Info className="h-4 w-4 mt-0.5 shrink-0" />
            <span>
              {unit.missing_layout_notes ||
                'Some of this unit&rsquo;s layout has not been recorded yet.'}
            </span>
          </div>
        )}

        <div className="space-y-1">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {isWhole ? 'On the market' : 'Rooms on the market'}
          </p>
          {unit.offerings.length === 0 ? (
            <p className="text-sm text-muted-foreground italic">
              Nothing listed for this unit yet.
            </p>
          ) : (
            <ul className="space-y-1">
              {unit.offerings.map((o) => (
                <li key={o.id}>
                  <button
                    type="button"
                    onClick={() => onOpenListing?.(o.id)}
                    className="w-full text-left flex flex-wrap items-center gap-2 rounded px-2 py-1 hover:bg-muted"
                  >
                    <span className="truncate">{o.name}</span>
                    <Badge variant="secondary" className="shrink-0">
                      {o.status_display}
                    </Badge>
                    {!o.is_publicly_visible && (
                      <Badge variant="outline" className="shrink-0">
                        Hidden
                      </Badge>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {unit.layout.length > 0 && (
          <div>
            <button
              type="button"
              onClick={() => setOpen((v) => !v)}
              className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
            >
              {open ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
              What&rsquo;s inside ({unit.layout.length})
            </button>
            {open && (
              <ul className="mt-2 space-y-1 pl-5">
                {unit.layout.map((a) => (
                  <li key={a.id} className="text-sm">
                    <span className="font-medium">{a.label}</span>
                    <span className="text-muted-foreground">
                      {' '}
                      &middot; {a.kind_display}
                    </span>
                    {a.serves.length > 0 && (
                      <span className="text-muted-foreground">
                        {' '}
                        &middot; for {a.serves.map((s) => s.label).join(', ')}
                      </span>
                    )}
                    {a.shared_with_landlord && (
                      <Badge variant="outline" className="ml-2">
                        Shared with landlord
                      </Badge>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function PortfolioHierarchy({
  token,
  searchTerm = '',
  onOpenListing,
}: Props) {
  const [holdings, setHoldings] = useState<HoldingHierarchy[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [pending, setPending] = useState<{
    unit: PropertyUnit;
    to: RentalMode;
    preview: RentalModeSwitchPreview;
  } | null>(null);
  const [switching, setSwitching] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchHierarchy(token);
      setHoldings(data.holdings);
      setError(null);
    } catch {
      setError('Could not load your portfolio.');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    void load();
  }, [load]);

  // Always preview before switching: the landlord needs to see which listings
  // get parked, and a switch is refused outright while a lease is live.
  const askToSwitch = async (unit: PropertyUnit, to: RentalMode) => {
    try {
      const preview = await previewRentalMode(token, unit.id, to);
      setPending({ unit, to, preview });
    } catch {
      toast.error(`Could not work out what changing ${unit.name} would do.`);
    }
  };

  const confirmSwitch = async () => {
    if (!pending) return;
    setSwitching(true);
    try {
      const res = await setRentalMode(token, pending.unit.id, pending.to);
      toast.success(
        res.needs_new_listing
          ? `${pending.unit.name} switched — you'll need to add a listing for it.`
          : `${pending.unit.name} switched.`
      );
      setPending(null);
      await load();
    } catch {
      toast.error(`${pending.unit.name} could not be switched.`);
    } finally {
      setSwitching(false);
    }
  };

  const term = searchTerm.trim().toLowerCase();
  const visible = holdings
    .map((h) => ({
      ...h,
      units: term
        ? h.units.filter(
            (u) =>
              u.name.toLowerCase().includes(term) ||
              h.name.toLowerCase().includes(term) ||
              u.offerings.some((o) => o.name.toLowerCase().includes(term))
          )
        : h.units,
    }))
    .filter((h) => h.units.length > 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }
  if (error) {
    return <p className="py-8 text-center text-destructive">{error}</p>;
  }
  if (visible.length === 0) {
    return (
      <p className="py-8 text-center text-muted-foreground">
        {term ? 'Nothing matches that.' : 'No addresses yet.'}
      </p>
    );
  }

  const blocked = pending?.preview.blocked_by ?? [];

  return (
    <div className="space-y-8">
      {visible.map((holding) => (
        <section key={holding.id} className="space-y-3">
          <header className="flex items-center gap-2 border-b pb-2">
            <Building2 className="h-5 w-5 shrink-0 text-muted-foreground" />
            <div className="min-w-0">
              <h3 className="font-semibold truncate">{holding.name}</h3>
              <p className="text-sm text-muted-foreground truncate">
                {holding.address}
                {holding.city ? `, ${holding.city}` : ''} &middot;{' '}
                {holding.units.length} unit
                {holding.units.length === 1 ? '' : 's'}
              </p>
            </div>
          </header>
          <div className="grid gap-3 md:grid-cols-2">
            {holding.units.map((unit) => (
              <UnitCard
                key={unit.id}
                unit={unit}
                onSwitch={askToSwitch}
                onOpenListing={onOpenListing}
              />
            ))}
          </div>
        </section>
      ))}

      <AlertDialog
        open={pending !== null}
        onOpenChange={(o) => !o && setPending(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {blocked.length > 0
                ? `${pending?.unit.name} can't be changed yet`
                : `Change how ${pending?.unit.name} is rented?`}
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3 text-sm">
                {blocked.length > 0 ? (
                  <>
                    <p className="flex items-start gap-2">
                      <Lock className="h-4 w-4 mt-0.5 shrink-0" />
                      <span>
                        How a unit is rented can&rsquo;t change underneath a
                        signed or pending agreement. End these first:
                      </span>
                    </p>
                    <ul className="list-disc pl-6">
                      {blocked.map((b) => (
                        <li key={b.lease_number}>
                          {b.lease_number} ({b.status})
                          {b.listing ? ` — ${b.listing}` : ''}
                        </li>
                      ))}
                    </ul>
                  </>
                ) : (
                  <>
                    {pending?.preview.will_park.length ? (
                      <p>
                        <strong>Taken off the market:</strong>{' '}
                        {pending.preview.will_park.join(', ')}
                      </p>
                    ) : null}
                    {pending?.preview.will_reactivate.length ? (
                      <p>
                        <strong>Put back on:</strong>{' '}
                        {pending.preview.will_reactivate.join(', ')}
                      </p>
                    ) : null}
                    {pending?.preview.needs_new_listing && (
                      <p>
                        You&rsquo;ll need to add a listing for the new
                        arrangement.
                      </p>
                    )}
                    <p className="text-muted-foreground">
                      {pending?.preview.note}
                    </p>
                  </>
                )}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>
              {blocked.length > 0 ? 'Close' : 'Cancel'}
            </AlertDialogCancel>
            {blocked.length === 0 && (
              <AlertDialogAction onClick={confirmSwitch} disabled={switching}>
                {switching ? 'Switching…' : 'Yes, change it'}
              </AlertDialogAction>
            )}
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
