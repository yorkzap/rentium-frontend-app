'use client';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';

export default function DashboardPage() {
  const { user, logout, token } = useAuth();
  const [userProfile, setUserProfile] = useState(null);

  // Debug log when dashboard page renders
  useEffect(() => {
    console.log("Dashboard page rendering with:", { 
      user: user ? `${user.email}` : "no user", 
      authenticated: !!token 
    });
  }, [user, token]);

  // Fetch user data including user_type
  useEffect(() => {
    const fetchUserType = async () => {
      if (!user || !token) return;
      
      // Get the Django API URL from environment variables, defaulting to localhost:8000 if not defined
      const DJANGO_API_URL = process.env.NEXT_PUBLIC_DJANGO_API_URL || 'http://localhost:8000/api';
      
      try {
        // Try to get user data which should now include user_type
        const userResponse = await fetch(`${DJANGO_API_URL}/user/me/`, {
          headers: {
            'Authorization': `Token ${token}`
          }
        });
        
        if (userResponse.ok) {
          const userData = await userResponse.json();
          console.log("User data response:", userData);
          
          // Check if it's an array or a single object
          if (Array.isArray(userData) && userData.length > 0 && userData[0].user_type) {
            setUserProfile({ type: userData[0].user_type });
            console.log("User type from array:", userData[0].user_type);
          } else if (userData && userData.user_type) {
            // It might be a single object
            setUserProfile({ type: userData.user_type });
            console.log("User type from object:", userData.user_type);
          } else {
            // Try the profile endpoint
            try {
              const profileResponse = await fetch(`${DJANGO_API_URL}/user/profile/`, {
                headers: {
                  'Authorization': `Token ${token}`
                }
              });
              
              if (profileResponse.ok) {
                const profileData = await profileResponse.json();
                console.log("User profile response:", profileData);
                
                if (profileData && profileData.user_type) {
                  setUserProfile({ type: profileData.user_type });
                  console.log("User type from profile:", profileData.user_type);
                } else {
                  // Fallback to profile endpoints
                  checkUserProfiles();
                }
              } else {
                // Fallback to profile endpoints
                checkUserProfiles();
              }
            } catch (error) {
              console.error('Error fetching user profile:', error);
              checkUserProfiles();
            }
          }
        } else {
          // If user endpoint fails, try profile endpoints
          checkUserProfiles();
        }
      } catch (error) {
        console.error('Error fetching user data:', error);
        // Try profile endpoints as fallback
        checkUserProfiles();
      }
    };
    
    const checkUserProfiles = async () => {
      // Get the Django API URL from environment variables, defaulting to localhost:8000 if not defined
      const DJANGO_API_URL = process.env.NEXT_PUBLIC_DJANGO_API_URL || 'http://localhost:8000/api';
      
      try {
        // Try to fetch landlord profile
        const landlordResponse = await fetch(`${DJANGO_API_URL}/landlords/`, {
          headers: {
            'Authorization': `Token ${token}`
          }
        });
        
        if (landlordResponse.ok) {
          const landlordData = await landlordResponse.json();
          console.log("Landlord profile response:", landlordData);
          
          if (landlordData && Array.isArray(landlordData) && landlordData.length > 0) {
            // If we get landlord data, user is a landlord
            setUserProfile({ type: 'LANDLORD' });
            console.log("User identified as a landlord from profile");
            return;
          }
        }
        
        // Try to fetch tenant profile
        const tenantResponse = await fetch(`${DJANGO_API_URL}/tenants/`, {
          headers: {
            'Authorization': `Token ${token}`
          }
        });
        
        if (tenantResponse.ok) {
          const tenantData = await tenantResponse.json();
          console.log("Tenant profile response:", tenantData);
          
          if (tenantData && Array.isArray(tenantData) && tenantData.length > 0) {
            // If we get tenant data, user is a tenant
            setUserProfile({ type: 'TENANT' });
            console.log("User identified as a tenant from profile");
            return;
          }
        }
        
        console.log("Could not determine user type from any endpoint");
      } catch (error) {
        console.error('Error checking user profiles:', error);
      }
    };
    
    fetchUserType();
  }, [user, token]);

  const handleLogout = () => {
    console.log("Logout button clicked");
    logout();
    // The redirect is now handled inside the logout function in AuthContext
  };

  // Get user type display name
  const getUserType = () => {
    // First check userProfile state which we populated from API checks
    if (userProfile?.type) {
      return userProfile.type === 'LANDLORD' ? 'Landlord' : 'Tenant';
    }
    
    // Show loading state while we're determining the type
    return 'Loading...';
  };

  return (
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
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <Card>
            <CardHeader>
              <CardTitle>Welcome Back</CardTitle>
              <CardDescription>
                {user?.name ? `Hello, ${user.name}` : 'Hello'}! Here's your dashboard overview.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-slate-600">
                This is your secure dashboard area. You can manage your account and view your information here.
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>Account Stats</CardTitle>
              <CardDescription>Quick overview of your account activity</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-slate-100 p-4 rounded-lg">
                  <div className="text-sm text-slate-500">User Type</div>
                  <div className="text-2xl font-semibold text-slate-900">
                    {getUserType()}
                  </div>
                </div>
                <div className="bg-slate-100 p-4 rounded-lg">
                  <div className="text-sm text-slate-500">Status</div>
                  <div className="text-2xl font-semibold text-green-600">Active</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>Your recent account activity</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between items-center p-3 bg-slate-50 rounded-lg">
                <div>
                  <div className="font-medium">Account login</div>
                  <div className="text-sm text-slate-500">Just now</div>
                </div>
                <div className="text-sm text-slate-500">
                  From {typeof navigator !== 'undefined' && navigator.userAgent.includes('Windows') ? 'Windows' : 
                        typeof navigator !== 'undefined' && navigator.userAgent.includes('Mac') ? 'MacOS' : 
                        typeof navigator !== 'undefined' && navigator.userAgent.includes('Linux') ? 'Linux' : 'Unknown'} device
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}