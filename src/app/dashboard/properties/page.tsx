"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import AssetManagement from "@/components/dashboard/landlord/Properties";

export default function PropertiesPage() {
  const router = useRouter();

  // Since the dashboard layout already includes the parent container and navigation,
  // we simply need to render the AssetManagement component here
  return <AssetManagement />;
}