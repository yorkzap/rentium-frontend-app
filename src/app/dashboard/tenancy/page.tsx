// page.tsx
"use client";

import Link from "next/link";
import { CalendarDays, DoorOpen, FileText, Home, Wrench } from "lucide-react";
import { EmptyState, Pill, Skeleton } from "@/components/ui/page";
import { useTenancy } from "@/lib/useTenancy";

const fmt = (iso?: string | null) =>
  iso ? new Date(`${iso}T00:00:00`).toLocaleDateString("en-CA",
    { month: "long", day: "numeric", year: "numeric" }) : "—";

export default function TenancyOverviewPage() {
  const { lease, leases, leaseId, setLeaseId, loading } = useTenancy();

  if (loading) return <Skeleton className="h-64 w-full rounded-xl" />;

  if (!lease) {
    return (
      <EmptyState
        icon={Home}
        title="No tenancy yet"
        description="Once your landlord sets up your lease and you sign it, everything about your tenancy will live here."
      />
    );
  }

  return (
    <div className="space-y-6">
      {leases.length > 1 && (
        <select
          value={leaseId ?? ""}
          onChange={(e) => setLeaseId(e.target.value)}
          className="field max-w-sm"
        >
          {leases.map((l) => (
            <option key={l.id} value={l.id}>
              {l.property_name || l.group_name || l.lease_number} — {l.status_display || l.status}
            </option>
          ))}
        </select>
      )}

      <section className="card p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold">
              {lease.property_name || lease.group_name}
            </h2>
            {lease.property_address && (
              <p className="mt-0.5 text-sm text-[hsl(var(--ink-3))]">{lease.property_address}</p>
            )}
          </div>
          <Pill tone={lease.status === "ACTIVE" ? "ok" : "warn"}>
            {lease.status_display || lease.status}
          </Pill>
        </div>

        <dl className="mt-6 grid gap-x-8 gap-y-4 sm:grid-cols-3">
          <div>
            <dt className="text-xs uppercase tracking-wide text-[hsl(var(--ink-4))]">Started</dt>
            <dd className="mt-0.5 text-sm font-medium">{fmt(lease.start_date)}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wide text-[hsl(var(--ink-4))]">Ends</dt>
            <dd className="mt-0.5 text-sm font-medium">
              {lease.is_month_to_month ? "Month-to-month" : fmt(lease.end_date)}
            </dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wide text-[hsl(var(--ink-4))]">Rent</dt>
            <dd className="mt-0.5 text-sm font-medium">
              ${Number(lease.total_rent ?? 0).toLocaleString()}/mo
            </dd>
          </div>
        </dl>
      </section>

      <div className="grid gap-4 sm:grid-cols-2">
        <Tile href="/dashboard/tenancy/calendar" icon={CalendarDays}
              title="Calendar"
              body="Rent dates, inspections, recycling, everything with a date on it." />
        <Tile href="/dashboard/tenancy/moving-out" icon={DoorOpen}
              title="Moving out"
              body="Give notice, or ask to end early. It'll tell you which one you're doing." />
        <Tile href={`/dashboard/leases/${lease.id}`} icon={FileText}
              title="Your agreement"
              body="Read it, download it, see who's signed." />
        <Tile href="/dashboard/maintenance" icon={Wrench}
              title="Repairs"
              body="Report something broken and follow what happens next." />
      </div>
    </div>
  );
}

function Tile({ href, icon: Icon, title, body }: {
  href: string; icon: React.ElementType; title: string; body: string;
}) {
  return (
    <Link href={href}
          className="card p-5 transition-colors hover:border-[hsl(var(--line-strong))]">
      <Icon className="h-5 w-5 text-[hsl(var(--brand))]" />
      <p className="mt-3 font-medium">{title}</p>
      <p className="mt-1 text-sm text-[hsl(var(--ink-3))]">{body}</p>
    </Link>
  );
}