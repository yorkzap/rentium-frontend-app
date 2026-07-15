// layout.tsx
//
// "My tenancy" — the things a tenant has to DO that have a DATE attached, given a
// page each instead of being stacked in one long scroll.
//
// The move-out form previously lived at the BOTTOM of the Payments tab, below the
// charges table, below the payment history, below the calendar. Ending your
// tenancy is one of the two or three most consequential things a tenant will ever
// do in this app, and it was somewhere you'd only find by accident.
//
// Documents deliberately stay on the Home dashboard's own tab. Two routes for one
// thing is how a UI stops making sense.

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarDays, DoorOpen, Home } from "lucide-react";
import { cn } from "@/lib/utils";
import { PageHeader } from "@/components/ui/page";

const TABS = [
  { href: "/dashboard/tenancy", label: "Overview", icon: Home, exact: true },
  { href: "/dashboard/tenancy/calendar", label: "Calendar", icon: CalendarDays },
  { href: "/dashboard/tenancy/moving-out", label: "Moving out", icon: DoorOpen },
];

export default function TenancyLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader
        title="My tenancy"
        description="Your home, your dates, and how to end it when the time comes."
      />

      <div className="mb-6 flex gap-1 overflow-x-auto border-b" style={{ borderColor: "hsl(var(--line))" }}>
        {TABS.map((t) => {
          const active = t.exact ? pathname === t.href : pathname.startsWith(t.href);
          return (
            <Link key={t.href} href={t.href}
                  className={cn(
                    "-mb-px flex items-center gap-2 whitespace-nowrap border-b-2 px-3.5 py-2.5 text-sm font-medium transition-colors",
                    active
                      ? "border-[hsl(var(--brand))] text-[hsl(var(--brand-ink))]"
                      : "border-transparent text-[hsl(var(--ink-4))] hover:text-[hsl(var(--ink))]",
                  )}>
              <t.icon className="h-4 w-4" />
              {t.label}
            </Link>
          );
        })}
      </div>

      {children}
    </div>
  );
}