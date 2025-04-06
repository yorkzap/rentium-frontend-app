"use client";
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import LandlordDashboard from '@/components/dashboard/LandlordDashboard';
import TenantDashboard from '@/components/dashboard/TenantDashboard';
import { USER_TYPES } from '@/lib/config';

export default function DashboardPage() {
  const { user, logout, token } = useAuth();
  const [userType, setUserType] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Debug log when dashboard page renders
  useEffect(() => {
    console.log("Dashboard page rendering with:", { 
      user: user ? `${user.email}` : "no user", 
      authenticated: !!token,
      userType: user?.user_type || 'not set'
    });
    
    // Set user type from user object if available
    if (user?.user_type) {
      setUserType(user.user_type);
      setLoading(false);
    } else {
      setLoading(false);
    }
  }, [user, token]);

  const handleLogout = () => {
    console.log("Logout button clicked");
    logout();
  };

  // Loading state
  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-teal-600 border-t-transparent"></div>
        <span className="ml-3 text-slate-600">Loading dashboard...</span>
      </div>
    );
  }
  
  return (
    <>
      {/* Render different dashboard based on user type */}
      {userType === USER_TYPES.LANDLORD && <LandlordDashboard />}
      {userType === USER_TYPES.TENANT && <TenantDashboard />}
      
      {/* Fallback if user type is not recognized */}
      {userType !== USER_TYPES.LANDLORD && userType !== USER_TYPES.TENANT && (
        <div className="min-h-screen bg-slate-50 p-8">
          <div className="mx-auto max-w-5xl">
            <div className="flex justify-between items-center mb-8">
              <h1 className="text-3xl font-bold text-slate-900">Dashboard</h1>
              <div className="flex items-center gap-4">
                <div className="text-sm text-slate-600">
                  Logged in as <span className="font-medium">{user?.email || 'User'}</span>
                </div>
                <Button 
                  variant="outline" 
                  className="border-slate-200 hover:bg-slate-50"
                  onClick={handleLogout}
                >
                  Logout
                </Button>
              </div>
            </div>
            
            <div className="text-center py-12">
              <h2 className="text-2xl font-bold text-slate-800 mb-2">Welcome to Rentium</h2>
              <p className="text-slate-600 mb-6">
                Your user type ({userType || 'unknown'}) is not recognized. 
                Please contact support for assistance.
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}