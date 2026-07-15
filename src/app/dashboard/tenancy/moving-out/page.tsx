// page.tsx
//
// Its own page, at its own URL, reachable in two clicks. Ending a tenancy is a
// consequential, legally-timed decision — it does not belong three screens down
// a dashboard between a maintenance card and a payment table.

"use client";

import Link from "next/link";
import { DoorOpen } from "lucide-react";
import MoveOutCard from "@/components/dashboard/tenant/MoveOutCard";
import { EmptyState, Skeleton } from "@/components/ui/page";
import { useTenancy } from "@/lib/useTenancy";

export default function MovingOutPage() {
  const { lease, loading, error } = useTenancy();

  if (loading) return <Skeleton className="h-72 w-full rounded-xl" />;

  if (error) {
    return (
      <div className="card border-[hsl(var(--danger))] bg-[hsl(var(--danger-soft))] p-5 text-sm text-[hsl(var(--danger-ink))]">
        {error}
      </div>
    );
  }

  if (!lease) {
    return (
      <EmptyState
        icon={DoorOpen}
        title="You're not on a tenancy right now"
        description="There's nothing to give notice on. If you think that's wrong, your landlord may not have finished setting up your lease yet."
      />
    );
  }

  return (
    <div className="space-y-5">
      <p className="text-sm text-[hsl(var(--ink-3))]">
        For <span className="font-medium text-[hsl(var(--ink))]">
          {lease.property_name || lease.group_name || lease.lease_number}
        </span>{" "}
        <Link href={`/dashboard/leases/${lease.id}`}
              className="text-[hsl(var(--brand))] hover:underline">
          view your agreement
        </Link>
      </p>

      <MoveOutCard leaseId={lease.id} />

      <div className="card bg-[hsl(var(--surface-sunken))] p-4 text-xs leading-relaxed text-[hsl(var(--ink-3))]">
        Giving notice is not the same as asking to leave early. Valid notice needs
        nobody&apos;s permission — it takes effect on its own. A date inside your
        notice period is a <em>request</em> your landlord is free to decline, and
        rent keeps running until they accept it. The form above tells you which one
        you&apos;re about to send, before you send it.
      </div>
    </div>
  );
}