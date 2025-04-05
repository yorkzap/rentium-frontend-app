'use client';
import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter, usePathname } from 'next/navigation';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isAuthenticated, loading, token } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [initialCheck, setInitialCheck] = useState(false);

  // Log the current state for debugging
  useEffect(() => {
    console.log("Dashboard Layout - Auth state:", { 
      isAuthenticated, 
      loading, 
      token: token ? "exists" : "none",
      pathname
    });
  }, [isAuthenticated, loading, token, pathname]);

  // Add a check to prevent immediate redirect loops
  useEffect(() => {
    // Only do this check once after initial loading is complete
    if (!loading && !initialCheck) {
      console.log("Dashboard: Initial auth check completed");
      setInitialCheck(true);
      
      if (!isAuthenticated && !token) {
        console.log('Dashboard: Not authenticated, redirecting to login...');
        router.push('/auth/login');
      } else {
        console.log('Dashboard: User is authenticated, showing dashboard');
      }
    }
  }, [loading, isAuthenticated, token, router, initialCheck]);

  // Show loading spinner while checking authentication
  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-teal-600 border-t-transparent"></div>
        <span className="ml-3 text-slate-600">Loading authentication...</span>
      </div>
    );
  }

  // After initial check, if we determined user is not authenticated
  if (initialCheck && !isAuthenticated) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50">
        <p className="text-slate-600">Redirecting to login...</p>
      </div>
    );
  }

  // User is authenticated, show the dashboard content
  return <>{children}</>;
}