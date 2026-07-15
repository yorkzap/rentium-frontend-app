// page.tsx
//
// Next 15 made `params` a Promise. This file was reading `params.id` straight off
// it, which yields `undefined` — so PropertyForm was fetching
// /api/properties/undefined/ and blowing up. The page never got a chance to
// render; the 500 was ours, not the API's.
//
// `use()` is the client-component way to unwrap it (await only works in a server
// component, and this one is "use client").

"use client";

import { use } from "react";
import PropertyForm from "@/components/dashboard/landlord/PropertyForm";

export default function EditPropertyPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  return <PropertyForm propertyId={id} />;
}