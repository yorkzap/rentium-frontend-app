// page.tsx
//
// The calendar, at a URL. It has always existed as a component (TenantCalendarCard)
// and it has always been rendered — at the bottom of the Payments tab, under two
// tables. Nobody was ever going to find it there.

"use client";

import Link from "next/link";
import { CalendarDays } from "lucide-react";
import { TenantCalendarCard } from "@/components/calendar/RentiumCalendar";
import { UpcomingVisitsCard } from "@/components/dashboard/landlord/LeaseAppointments";
import { EmptyState, Skeleton } from "@/components/ui/page";
import { useTenancy } from "@/lib/useTenancy";

export default function TenancyCalendarPage() {
  const { lease, loading, error } = useTenancy();

  if (loading) return <Skeleton className="h-96 w-full rounded-xl" />;

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
        icon={CalendarDays}
        title="Nothing to show yet"
        description="Once you're on an active lease, your rent dates, inspections and any scheduled visits will appear here."
      />
    );
  }

  return (
    <div className="space-y-5">
      <p className="text-sm text-[hsl(var(--ink-3))]">
        Everything dated for{" "}
        <Link href={`/dashboard/leases/${lease.id}`}
              className="font-medium text-[hsl(var(--brand))] hover:underline">
          {lease.property_name || lease.group_name || lease.lease_number}
        </Link>
        .
      </p>

      <TenantCalendarCard leaseId={lease.id} />
      <UpcomingVisitsCard leaseId={lease.id} />
    </div>
  );
}