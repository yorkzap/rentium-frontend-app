// page.tsx
//
// Next 15 made `params` a Promise. Reading `.id` straight off it yields undefined,
// which the child then puts in a URL — so the fetch goes to /api/leases/undefined/
// and the page 500s. `use()` unwraps it in a client component; `await` only works
// in a server one.

"use client";

import { use } from "react";
import LeaseDetail from "@/components/dashboard/landlord/LeaseDetail";

export default function LeaseDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);

  return (
    <div className="container mx-auto py-6">
      <LeaseDetail leaseId={id} />
    </div>
  );
}