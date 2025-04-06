"use client";

import { useAuth } from "@/contexts/AuthContext";
import LandlordDashboard from "@/components/dashboard/LandlordDashboard";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function ProfileLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isAuthenticated } = useAuth();
  const router = useRouter();

  // Check if user is authenticated
  useEffect(() => {
    if (!isAuthenticated) {
      router.push("/auth/login");
    }
  }, [isAuthenticated, router]);

  // We wrap the children in the LandlordDashboard component
  // This ensures consistent layout/styling with the main dashboard
  return <LandlordDashboard>{children}</LandlordDashboard>;
}