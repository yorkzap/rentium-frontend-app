// src/app/dashboard/properties/page.tsx
"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import AssetManagement from "@/components/dashboard/landlord/Properties"; // Ensure this path is correct
import { Suspense } from "react"; // Import Suspense
import { Loader2 } from "lucide-react"; // Import Loader

export default function PropertiesPage() {
  const router = useRouter();

  // Wrap AssetManagement in Suspense for loading states handled within it
  return (
     <div className="p-6"> {/* Add padding or layout container if needed */}
      <Suspense fallback={
        <div className="flex items-center justify-center min-h-[calc(100vh-200px)]">
          <div className="flex flex-col items-center gap-2">
            <Loader2 className="h-10 w-10 animate-spin text-brand" />
            <p className="text-sm text-muted-foreground">Loading dashboard...</p>
          </div>
        </div>
      }>
        <AssetManagement />
      </Suspense>
    </div>
  );
}