// page.tsx
//
// This is the page a stranger lands on with a link from their email, before they
// have an account. It is the single least forgiving page in the app: if it fails,
// there is no "log in and try again" — they simply cannot become a tenant. So the
// params bug matters more here than anywhere else.

"use client";

import { use } from "react";
import { useSearchParams } from "next/navigation";
import AcceptInvite from "@/components/invite/AcceptInvite";

export default function InvitePage({
  params,
}: {
  params: Promise<{ leaseTenantId: string }>;
}) {
  const { leaseTenantId } = use(params);
  const searchParams = useSearchParams();
  const token = searchParams.get("token") || "";

  if (!token) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 p-6">
        <div className="text-center text-slate-600">
          <p className="font-medium">This invite link is missing its token.</p>
          <p className="mt-1 text-sm">
            Please use the full link your landlord sent you — the part after{" "}
            <code className="rounded bg-slate-100 px-1">?token=</code> matters.
          </p>
        </div>
      </div>
    );
  }

  return <AcceptInvite leaseTenantId={leaseTenantId} token={token} />;
}