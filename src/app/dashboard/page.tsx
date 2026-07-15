// page.tsx
//
// The dashboard ROOT. Nothing else.
//
// This file used to render `<LandlordDashboard />` — which, after the
// double-navbar cleanup, became a pass-through that returns its children. No
// children were passed. So the landlord's home page rendered an empty <> and the
// page was blank, silently, with no error anywhere. The shell (nav, header, bell)
// lives in dashboard/layout.tsx; this file's only job is to pick which overview
// to show.

"use client";

import { useAuth } from "@/contexts/AuthContext";
import { USER_TYPES } from "@/lib/config";
import LandlordOverview from "@/components/dashboard/landlord/LandlordOverview";
import TenantDashboard from "@/components/dashboard/TenantDashboard";
import { Skeleton } from "@/components/ui/page";

export default function DashboardPage() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-56" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-64 w-full rounded-xl" />
      </div>
    );
  }

  const type = (user?.user_type || "").toUpperCase();

  if (type === USER_TYPES.LANDLORD) return <LandlordOverview />;
  if (type === USER_TYPES.TENANT) return <TenantDashboard />;

  // Not a silent blank. If we get here, something is genuinely wrong with the
  // account and the person deserves to be told, not shown an empty page.
  return (
    <div className="card mx-auto max-w-lg p-8 text-center">
      <h1 className="text-lg font-semibold">We couldn&apos;t work out your account type</h1>
      <p className="mt-2 text-sm text-[hsl(var(--ink-3))]">
        Your account is signed in as{" "}
        <span className="font-medium">{user?.email || "unknown"}</span> but has no
        landlord or tenant profile attached, so there&apos;s no dashboard to show
        you. This is a fault on our side — please get in touch and we&apos;ll fix it.
      </p>
    </div>
  );
}