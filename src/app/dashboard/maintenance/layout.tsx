"use client";

import { useAuth } from "@/contexts/AuthContext";
import { USER_TYPES } from "@/lib/config";
import LandlordDashboard from "@/components/dashboard/LandlordDashboard";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function MaintenanceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, isAuthenticated } = useAuth();
  const router = useRouter();

  // Check if user is a landlord
  useEffect(() => {
    if (isAuthenticated && user && user.user_type !== USER_TYPES.LANDLORD) {
      // Redirect non-landlord users away from this section
      router.push("/dashboard");
    }
  }, [user, isAuthenticated, router]);

  // We wrap the children in the LandlordDashboard component
  // This ensures consistent layout/styling with the main dashboard
  return <LandlordDashboard>{children}</LandlordDashboard>;
}