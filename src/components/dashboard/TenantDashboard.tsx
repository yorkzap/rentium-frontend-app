// src/components/dashboard/TenantDashboard.tsx
"use client";
import { useState, useEffect, useMemo } from "react"; // Added useMemo import
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Home, CreditCard, FileText, Wrench, MessageSquare, Receipt, Bolt, Droplet,
  Flame, Wifi, Bell, User, ChevronRight, Settings, Download, CreditCardIcon,
  CheckCircle, Upload, Search, Filter, Plus, Shield, Building, AlertCircle,
  Calendar, Clock, MoreHorizontal, Loader2, Signature // Added Signature icon
} from "lucide-react";
import { useMediaQuery } from "@/hooks/use-media-query";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge"; // Import Badge
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import ProfileSettings from "./profile/ProfileSettings";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Lease, LeaseTenant, Payment, LeaseDocument } from "@/types/lease"; // Adjust path
// Mock API functions since real API is unavailable
// These functions return hardcoded data for testing purposes
const fetchLeases = async (token) => {
  console.log("Mock fetchLeases called with token:", token);
  return [
    {
      id: "lease-123",
      lease_number: "L-2025-001",
      property_name: "Sunset Apartments",
      property_address: "123 Main St, Anytown, CA 94105",
      group_name: "Unit 203",
      status: "ACTIVE",
      status_display: "Active",
      landlord_name: "Property Management Inc.",
      start_date: "2025-01-01",
      end_date: "2025-12-31",
      lease_type: "RESIDENTIAL",
      lease_type_display: "Residential",
      bills_summary: "Water, electricity, and internet included",
      lease_tenants: [
        {
          id: "lt-123",
          tenant_id: "user-123", // This should match the current user.id
          has_signed: true,
          rent_amount: 1500,
          room_name: "Master Bedroom"
        }
      ]
    }
  ];
};

const fetchPaymentsForLease = async (token, leaseId) => {
  console.log("Mock fetchPaymentsForLease called:", token, leaseId);
  return [
    {
      id: "payment-001",
      lease_id: leaseId,
      payment_type: "RENT",
      payment_type_display: "Monthly Rent",
      amount_due: 1500,
      amount_paid: 1500,
      due_date: "2025-01-05",
      payment_date: "2025-01-03",
      status: "COMPLETED",
      status_display: "Completed",
      payment_method: "CREDIT_CARD",
      payment_method_display: "Credit Card"
    },
    {
      id: "payment-002",
      lease_id: leaseId,
      payment_type: "RENT",
      payment_type_display: "Monthly Rent",
      amount_due: 1500,
      amount_paid: 1500,
      due_date: "2025-02-05",
      payment_date: "2025-02-02",
      status: "COMPLETED",
      status_display: "Completed",
      payment_method: "BANK_TRANSFER",
      payment_method_display: "Bank Transfer"
    },
    {
      id: "payment-003",
      lease_id: leaseId,
      payment_type: "RENT",
      payment_type_display: "Monthly Rent",
      amount_due: 1500,
      due_date: "2025-05-01",
      status: "PENDING",
      status_display: "Pending"
    }
  ];
};

const fetchDocumentsForLease = async (token, leaseId) => {
  console.log("Mock fetchDocumentsForLease called:", token, leaseId);
  return [
    {
      id: "doc-001",
      document_name: "Lease Agreement",
      document_type: "LEASE",
      document_type_display: "Lease Agreement",
      file: "#" // Would be a URL in real implementation
    },
    {
      id: "doc-002",
      document_name: "Property Rules",
      document_type: "RULES",
      document_type_display: "Property Rules",
      file: "#"
    }
  ];
};

const signLease = async (token, leaseTenantId) => {
  console.log("Mock signLease called:", token, leaseTenantId);
  // Return the updated lease tenant object
  return {
    id: leaseTenantId,
    tenant_id: "user-123",
    has_signed: true,
    rent_amount: 1500,
    room_name: "Master Bedroom"
  };
};

const fetchLeaseDetails = async (token, leaseId) => {
  console.log("Mock fetchLeaseDetails called:", token, leaseId);
  // Return the same data structure as fetchLeases but for a single lease
  return {
    id: leaseId,
    lease_number: "L-2025-001",
    property_name: "Sunset Apartments",
    property_address: "34 Main St, Regina, CA S4W 0P4",
    group_name: "Unit 203",
    status: "ACTIVE",
    status_display: "Active",
    landlord_name: "Anna M.",
    start_date: "2025-01-01",
    end_date: "2025-12-31",
    lease_type: "RESIDENTIAL",
    lease_type_display: "Residential",
    bills_summary: "Water, electricity, and internet included",
    lease_tenants: [
      {
        id: "lt-123",
        tenant_id: "user-123",
        has_signed: true,
        rent_amount: 1500,
        room_name: "Master Bedroom"
      }
    ]
  };
};
import { toast } from "sonner";
import { format, differenceInDays, parseISO } from 'date-fns';

// Improved formatCurrency helper function to better handle edge cases
const formatCurrency = (amount: number | string | null | undefined): string => {
  // If amount is null or undefined, return $0.00 instead of N/A
  if (amount === null || amount === undefined) return "$0.00";
  
  let numericAmount: number;
  
  // Handle string conversion more robustly
  if (typeof amount === 'string') {
    // Remove any non-numeric characters except decimal point
    const cleanedString = amount.replace(/[^0-9.]/g, '');
    numericAmount = parseFloat(cleanedString);
  } else {
    numericAmount = amount;
  }
  
  // If conversion failed and resulted in NaN, return $0.00 instead of N/A
  if (isNaN(numericAmount)) return "$0.00";
  
  // Format the currency
  return numericAmount.toLocaleString("en-US", { 
    style: "currency", 
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
};

// Helper function to get status badge color (reuse from LeaseManagement)
const getStatusBadgeVariant = (status: string): "default" | "secondary" | "destructive" | "outline" | "pending" | "active" | "expired" | "terminated" => {
    // ... (same implementation as in LeaseManagement)
    switch (status?.toUpperCase()) {
        case 'ACTIVE': return 'active';
        case 'PENDING_SIGNATURES': return 'pending';
        case 'DRAFT': return 'secondary'; // Should not be visible to tenant ideally
        case 'EXPIRED': return 'expired';
        case 'TERMINATED': return 'terminated';
        case 'RENEWED': return 'outline';
        default: return 'default';
    }
};


export default function TenantDashboard() {
  const { user, token, logout } = useAuth();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("overview");
  const [notifications, setNotifications] = useState(0); // Keep mock or implement later
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState("credit-card"); // Mock
  const isMobile = useMediaQuery("(max-width: 768px)");

  const [leases, setLeases] = useState<Lease[]>([]);
  const [currentLease, setCurrentLease] = useState<Lease | null>(null);
  const [leaseTenantInfo, setLeaseTenantInfo] = useState<LeaseTenant | null>(null);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [documents, setDocuments] = useState<LeaseDocument[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSigning, setIsSigning] = useState(false);

  // Fetch tenant's leases on mount
  useEffect(() => {
    const loadInitialData = async () => {
      if (!token || !user?.id) {
         setError("User or authentication token not available.");
         setIsLoading(false);
         return;
      }
      setIsLoading(true);
      setError(null);
      try {
        const fetchedLeases = await fetchLeases(token);
        setLeases(fetchedLeases);

        // Find the most relevant lease (e.g., Active or Pending Signature)
        const active = fetchedLeases.find(l => l.status === 'ACTIVE');
        const pending = fetchedLeases.find(l => l.status === 'PENDING_SIGNATURES');
        const relevantLease = active || pending || (fetchedLeases.length > 0 ? fetchedLeases[0] : null);

        if (relevantLease) {
          setCurrentLease(relevantLease);
          // Find the current user's lease tenant info within this lease
          // Default to first tenant if user ID doesn't match (for demo purposes)
          const currentUserLeaseTenant = relevantLease.lease_tenants.find(lt => lt.tenant_id === user.id) || 
                                         (relevantLease.lease_tenants.length > 0 ? relevantLease.lease_tenants[0] : null);
           
          setLeaseTenantInfo(currentUserLeaseTenant || null);

          // Fetch related data for the current lease
          const [fetchedPayments, fetchedDocs] = await Promise.all([
              fetchPaymentsForLease(token, relevantLease.id),
              fetchDocumentsForLease(token, relevantLease.id)
          ]);
          setPayments(fetchedPayments);
          setDocuments(fetchedDocs);

          // Basic notification logic (can be enhanced)
          const overdue = fetchedPayments.some(p => p.status === 'OVERDUE');
          const needsSigning = currentUserLeaseTenant && !currentUserLeaseTenant.has_signed && relevantLease.status === 'PENDING_SIGNATURES';
          setNotifications((overdue ? 1 : 0) + (needsSigning ? 1 : 0));

        } else {
           console.log("No active or pending leases found for this tenant.");
        }

      } catch (err) {
        console.error("Error loading tenant data:", err);
        setError(err instanceof Error ? err.message : "Failed to load dashboard data.");
        toast.error("Failed to load your rental information.");
      } finally {
        setIsLoading(false);
      }
    };

    loadInitialData();
  }, [token, user?.id]); // Depend on token and user ID

   const handleSignLease = async () => {
        if (!token || !leaseTenantInfo?.id) {
            toast.error("Cannot sign lease. Missing information.");
            return;
        }
        setIsSigning(true);
        try {
            const updatedLeaseTenant = await signLease(token, leaseTenantInfo.id);
            setLeaseTenantInfo(updatedLeaseTenant); // Update local state
            // Optionally update the main lease state if status changes (e.g., to ACTIVE)
             if (currentLease) {
                 const updatedLease = await fetchLeaseDetails(token, currentLease.id); // Refetch details
                 setCurrentLease(updatedLease);
             }

            toast.success("Lease signed successfully!");
        } catch (err) {
            console.error("Error signing lease:", err);
            toast.error(err instanceof Error ? `Failed to sign lease: ${err.message}`: "Failed to sign lease.");
        } finally {
             setIsSigning(false);
        }
    };


  // --- Calculations based on fetched data ---
  const today = new Date();
  const nextRentPayment = useMemo(() => {
      return payments
          .filter(p => p.payment_type === 'RENT' && ['SCHEDULED', 'PENDING', 'OVERDUE'].includes(p.status))
          .sort((a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime())[0]; // Get the soonest upcoming/overdue rent
  }, [payments]);

  const daysUntilPayment = nextRentPayment ? differenceInDays(parseISO(nextRentPayment.due_date), today) : null;
  const nextPaymentAmount = nextRentPayment ? parseFloat(nextRentPayment.amount_due.toString()) : 0; // Assuming amount_due exists

  const leaseProgress = useMemo(() => {
      if (!currentLease?.start_date || !currentLease?.end_date) return 0;
      try {
          const startDate = parseISO(currentLease.start_date);
          const endDate = parseISO(currentLease.end_date);
          const totalDays = differenceInDays(endDate, startDate);
          if (totalDays <= 0) return 100; // Handle same day or past end date
          const elapsedDays = differenceInDays(today, startDate);
          return Math.max(0, Math.min(100, Math.round((elapsedDays / totalDays) * 100)));
      } catch (e) {
          console.error("Error calculating lease progress:", e);
          return 0;
      }
  }, [currentLease, today]);

  // Placeholder for utilities - needs API integration if available separately
  const totalUtilities = 0; // Replace with actual data if applicable


  // Get user initials for avatar
  const getUserInitials = () => {
    if (!user || !user.name) return user?.email?.[0].toUpperCase() ?? "U";
    const nameParts = user.name.split(" ");
    if (nameParts.length >= 2) return `${nameParts[0][0]}${nameParts[1][0]}`.toUpperCase();
    return nameParts[0][0].toUpperCase();
  };

  const handleLogout = () => {
    logout();
    // Router push is handled by AuthProvider/DashboardLayout now
  };

  // --- Render Logic ---
  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50">
        <Loader2 className="h-8 w-8 mr-3 animate-spin text-slate-600" />
        <span className="text-slate-600">Loading your dashboard...</span>
      </div>
    );
  }

  if (error) {
     return (
      <div className="flex h-screen items-center justify-center bg-red-50 p-8">
        <div className="text-center text-red-700">
            <AlertCircle className="h-12 w-12 mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Error Loading Dashboard</h2>
            <p className="mb-4">{error}</p>
            <Button onClick={() => window.location.reload()}>Try Again</Button>
            <Button variant="link" onClick={handleLogout} className="ml-2 text-red-700">Logout</Button>
        </div>
      </div>
    );
  }

 if (!currentLease) {
    return (
        <div className="min-h-screen bg-slate-50 flex flex-col">
             {/* Simplified Header for No Lease */}
             <header className="bg-white border-b border-slate-200 sticky top-0 z-10 shadow-sm">
                <div className="max-w-screen-2xl mx-auto px-4">
                <div className="flex items-center justify-between h-16">
                    <div className="flex items-center">
                    <h1 className="text-xl font-semibold text-slate-900 mr-2">Rentium</h1>
                    <span className="hidden md:inline-flex px-2 py-1 bg-slate-100 text-xs rounded-md text-slate-700">Tenant</span>
                    </div>
                    <DropdownMenu>
                        {/* ... (User Menu Dropdown - same as below) ... */}
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="rounded-full p-0 h-8 w-8">
                                <Avatar className="h-8 w-8 bg-slate-900 text-white"><AvatarFallback>{getUserInitials()}</AvatarFallback></Avatar>
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <div className="px-4 py-2 text-sm">
                                <p className="font-medium">{user?.name || user?.email || "User"}</p>
                                <p className="text-xs text-slate-500">Tenant</p>
                            </div>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={handleLogout}>Logout</DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
                </div>
            </header>
             <main className="flex-1 overflow-auto bg-slate-50 flex items-center justify-center">
                 <div className="text-center p-8 max-w-md">
                     <Home className="h-16 w-16 text-slate-300 mx-auto mb-4" />
                    <h2 className="text-2xl font-semibold text-slate-800 mb-2">No Active Lease Found</h2>
                    <p className="text-slate-500 mb-6">
                        It looks like you aren't currently assigned to an active lease. If you believe this is an error, please contact your landlord.
                    </p>
                    {/* Optionally show past leases if available in `leases` state */}
                    {leases.length > 0 && (
                         <div className="mt-6 text-left">
                             <h3 className="text-sm font-medium text-slate-600 mb-2">Past Leases:</h3>
                             <ul className="text-sm text-slate-500 list-disc list-inside">
                                 {leases.map(l => <li key={l.id}>{l.property_name || l.group_name || l.lease_number} ({l.status_display})</li>)}
                             </ul>
                         </div>
                    )}
                 </div>
             </main>
        </div>
    );
  }


  // --- Main Dashboard Render (when lease exists) ---
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Top Navigation (Consider abstracting to a TenantHeader component) */}
       <header className="bg-white border-b border-slate-200 sticky top-0 z-10 shadow-sm">
        <div className="max-w-screen-2xl mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
             <div className="flex items-center">
              <h1 className="text-xl font-semibold text-slate-900 mr-2">Rentium</h1>
              <span className="hidden md:inline-flex px-2 py-1 bg-slate-100 text-xs rounded-md text-slate-700">Tenant</span>
            </div>
             {/* Navigation */}
             <nav className="hidden md:flex items-center space-x-1">
               {/* Tabs for navigation */}
                <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                    <TabsList className="bg-transparent p-0 h-auto">
                        <TabsTrigger value="overview" className={cn("h-9 px-4 text-sm font-medium transition-colors", activeTab === "overview" ? "bg-slate-900 text-white" : "bg-transparent text-slate-600 hover:text-slate-900")}>Overview</TabsTrigger>
                        <TabsTrigger value="payments" className={cn("h-9 px-4 text-sm font-medium transition-colors", activeTab === "payments" ? "bg-slate-900 text-white" : "bg-transparent text-slate-600 hover:text-slate-900")}>Payments</TabsTrigger>
                        <TabsTrigger value="maintenance" className={cn("h-9 px-4 text-sm font-medium transition-colors", activeTab === "maintenance" ? "bg-slate-900 text-white" : "bg-transparent text-slate-600 hover:text-slate-900")}>Maintenance</TabsTrigger>
                        <TabsTrigger value="documents" className={cn("h-9 px-4 text-sm font-medium transition-colors", activeTab === "documents" ? "bg-slate-900 text-white" : "bg-transparent text-slate-600 hover:text-slate-900")}>Documents</TabsTrigger>
                    </TabsList>
                </Tabs>
             </nav>
             {/* User Menu & Actions */}
             <div className="flex items-center space-x-4">
                 <Button variant="outline" size="sm" className="hidden md:flex">
                     <MessageSquare className="h-4 w-4 mr-1" /> Contact Landlord
                 </Button>
                 {/* Notifications Dropdown (can be enhanced) */}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm" className="relative">
                        <Bell className="h-5 w-5 text-slate-600" />
                        {notifications > 0 && (
                          <Badge variant="destructive" className="absolute -top-1 -right-1 h-4 w-4 p-0 flex items-center justify-center text-[10px]">{notifications}</Badge>
                        )}
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-80">
                      {/* ... Notification Content ... */}
                       <div className="p-4 text-sm text-slate-500">Notifications not fully implemented.</div>
                    </DropdownMenuContent>
                  </DropdownMenu>
                 {/* User Menu Dropdown */}
                  <DropdownMenu>
                     <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm" className="rounded-full p-0 h-8 w-8">
                        <Avatar className="h-8 w-8 bg-slate-900 text-white">
                          <AvatarImage src={user?.profileImage || ""} alt={user?.name || "User"} />
                          <AvatarFallback>{getUserInitials()}</AvatarFallback>
                        </Avatar>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                        <div className="px-4 py-2 text-sm">
                            <p className="font-medium">{user?.name || user?.email || "User"}</p>
                            <p className="text-xs text-slate-500">Tenant</p>
                        </div>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => setActiveTab("profile")}>
                            <User className="h-4 w-4 mr-2" /> My Account
                        </DropdownMenuItem>
                         {/* <DropdownMenuItem><Settings className="h-4 w-4 mr-2" /> Settings</DropdownMenuItem> */}
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={handleLogout}>Logout</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
             </div>
          </div>
           {/* Mobile Navigation */}
           <div className="md:hidden py-2 overflow-x-auto">
                <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                    <TabsList className="w-full justify-start">
                        <TabsTrigger value="overview">Overview</TabsTrigger>
                        <TabsTrigger value="payments">Payments</TabsTrigger>
                        <TabsTrigger value="maintenance">Maintenance</TabsTrigger>
                        <TabsTrigger value="documents">Documents</TabsTrigger>
                    </TabsList>
                </Tabs>
            </div>
        </div>
      </header>

      {/* Main Content */}
       <main className="flex-1 overflow-auto bg-slate-50">
        <div className="max-w-screen-2xl mx-auto px-4 py-6">
          {activeTab === "profile" ? (
            <ProfileSettings />
          ) : (
            <Tabs value={activeTab} className="mt-0">
              {/* Headers for each Tab */}
              {activeTab === "overview" && ( <div className="mb-6"> <h1 className="text-3xl font-semibold text-slate-900">Welcome{user?.name ? `, ${user.name.split(" ")[0]}` : ""}</h1> <p className="text-slate-500 mt-1">Overview of your lease: {currentLease.lease_number}</p> </div> )}
              {activeTab === "payments" && ( <div className="mb-6"> <h1 className="text-3xl font-semibold text-slate-900">Payments</h1> <p className="text-slate-500 mt-1">Manage your payments for lease: {currentLease.lease_number}</p> </div> )}
              {activeTab === "maintenance" && ( <div className="mb-6"> <h1 className="text-3xl font-semibold text-slate-900">Maintenance</h1> <p className="text-slate-500 mt-1">Submit and track requests for {currentLease.property_name || currentLease.group_name}</p> </div> )}
              {activeTab === "documents" && ( <div className="mb-6"> <h1 className="text-3xl font-semibold text-slate-900">Documents</h1> <p className="text-slate-500 mt-1">Important documents for lease: {currentLease.lease_number}</p> </div> )}


              {/* Lease Signing Banner */}
              {currentLease.status === 'PENDING_SIGNATURES' && leaseTenantInfo && !leaseTenantInfo.has_signed && (
                  <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded-r-md mb-6 flex items-center justify-between gap-4">
                      <div className="flex items-start">
                          <Signature className="h-6 w-6 text-blue-600 mr-3 flex-shrink-0 mt-1" />
                          <div>
                              <h3 className="text-sm font-medium text-blue-800">Action Required: Sign Your Lease</h3>
                              <p className="mt-1 text-sm text-blue-700">
                                  Your lease agreement is ready for your signature. Please review and sign to activate your lease.
                              </p>
                          </div>
                      </div>
                      <Button
                          size="sm"
                          className="bg-blue-600 hover:bg-blue-700 whitespace-nowrap"
                          onClick={handleSignLease}
                          disabled={isSigning}
                      >
                          {isSigning ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Signature className="mr-2 h-4 w-4" />}
                           Sign Lease
                      </Button>
                  </div>
              )}

               {/* OVERVIEW TAB */}
                <TabsContent value="overview" className="mt-0 space-y-6">
                    {/* Payment Alert */}
                    {daysUntilPayment !== null && daysUntilPayment <= 5 && daysUntilPayment >= 0 && (
                         <div className="bg-amber-50 border-l-4 border-amber-500 p-4 rounded-r-md mb-6">
                            <div className="flex items-start">
                                <Calendar className="h-5 w-5 text-amber-600 mr-3 flex-shrink-0 mt-1" />
                                <div>
                                    <h3 className="text-sm font-medium text-amber-800">Upcoming Payment Due</h3>
                                    <p className="mt-1 text-sm text-amber-700">
                                        Your rent payment of {formatCurrency(nextRentPayment?.amount_due)} is due in {daysUntilPayment} days.
                                    </p>
                                </div>
                            </div>
                         </div>
                    )}
                    {nextRentPayment?.status === 'OVERDUE' && (
                         <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-r-md mb-6">
                            <div className="flex items-start">
                                <AlertCircle className="h-5 w-5 text-red-600 mr-3 flex-shrink-0 mt-1" />
                                <div>
                                    <h3 className="text-sm font-medium text-red-800">Payment Overdue</h3>
                                    <p className="mt-1 text-sm text-red-700">
                                        Your rent payment of {formatCurrency(nextRentPayment?.amount_due)} is overdue by {Math.abs(daysUntilPayment || 0)} days.
                                        Please make your payment as soon as possible.
                                    </p>
                                </div>
                            </div>
                         </div>
                    )}


                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {/* Property Info Card */}
                         <Card className="md:col-span-2 overflow-hidden border-transparent shadow-sm hover:shadow-md transition-all">
                             <CardHeader className="bg-white border-b pb-3">
                                 <CardTitle className="flex items-center text-lg"><Home className="mr-2 h-5 w-5 text-slate-600" /> Your Rental Property</CardTitle>
                             </CardHeader>
                             <CardContent className="p-0">
                                 {/* Add placeholder image if property has one? API doesn't specify */}
                                 {/* <div className="aspect-video relative bg-slate-100"><img src={"/placeholder.svg"} alt="Property" className="w-full h-full object-cover" /></div> */}
                                 <div className="p-6 space-y-4">
                                     <div>
                                         <h3 className="font-semibold text-lg">{currentLease.property_name || currentLease.group_name || 'N/A'}</h3>
                                         <p className="text-slate-500">{currentLease.property_address || `Lease Number: ${currentLease.lease_number}`}</p>
                                          <Badge variant={getStatusBadgeVariant(currentLease.status)} className="mt-2">{currentLease.status_display}</Badge>
                                     </div>
                                     <div className="grid grid-cols-2 gap-4 text-sm">
                                         <div><p className="text-slate-500">Landlord</p><p>{currentLease.landlord_name}</p></div>
                                         <div><p className="text-slate-500">Landlord Contact</p><p>{"(Not Available)"}</p></div> {/* Add if API provides */}
                                          <div><p className="text-slate-500">Lease Period</p><p>{format(parseISO(currentLease.start_date), 'MMM d, yyyy')} - {currentLease.end_date ? format(parseISO(currentLease.end_date), 'MMM d, yyyy') : 'Ongoing'}</p></div>
                                          <div><p className="text-slate-500">Your Monthly Rent</p><p className="font-semibold">{formatCurrency(leaseTenantInfo?.rent_amount || 1500)}</p></div>
                                          {leaseTenantInfo?.room_name && (<div><p className="text-slate-500">Your Assigned Room</p><p>{leaseTenantInfo.room_name}</p></div>)}
                                          <div><p className="text-slate-500">Lease Type</p><p>{currentLease.lease_type_display}</p></div>
                                     </div>
                                      {currentLease.bills_summary && (
                                         <div className="mt-4 pt-4 border-t">
                                             <p className="text-sm font-medium mb-1">Bills Included in Lease Rent:</p>
                                             <p className="text-sm text-slate-600">{currentLease.bills_summary}</p>
                                         </div>
                                     )}
                                 </div>
                             </CardContent>
                         </Card>

                        {/* Side Cards */}
                        <div className="space-y-6">
                           {/* Next Payment Card */}
                           <Card className="overflow-hidden border-transparent shadow-sm hover:shadow-md transition-all">
                             <CardHeader className="bg-white border-b pb-3"><CardTitle className="flex items-center text-lg"><CreditCard className="mr-2 h-5 w-5 text-slate-600" /> Next Payment</CardTitle></CardHeader>
                             <CardContent className="p-6">
                                {nextRentPayment ? (
                                     <div className="space-y-4">
                                        <div className="flex justify-between items-center">
                                            <div><p className="text-slate-500">Due Date</p><p className="text-lg font-semibold">{format(parseISO(nextRentPayment.due_date), 'MMM d, yyyy')}</p></div>
                                            <div><p className="text-slate-500">Amount</p><p className="text-lg font-semibold">{formatCurrency(nextRentPayment.amount_due)}</p></div>
                                        </div>
                                         {daysUntilPayment !== null && (
                                             <div className={`text-center p-3 rounded-md text-sm ${nextRentPayment.status === 'OVERDUE' ? 'bg-red-50 text-red-700' : daysUntilPayment <= 5 ? 'bg-amber-50 text-amber-700' : 'bg-green-50 text-green-700'}`}>
                                                {nextRentPayment.status === 'OVERDUE' ? `${Math.abs(daysUntilPayment)} days Overdue` : `${daysUntilPayment} days until due`}
                                             </div>
                                         )}
                                        <Button className="w-full bg-slate-900 hover:bg-slate-800" onClick={() => setActiveTab("payments")}>Make Payment</Button>
                                    </div>
                                ) : (
                                     <div className="text-center text-slate-500 py-4">No upcoming rent payments found.</div>
                                )}
                             </CardContent>
                            </Card>

                             {/* Lease Progress Card */}
                             {currentLease.end_date && ( // Only show progress if there's an end date
                                 <Card className="overflow-hidden border-transparent shadow-sm hover:shadow-md transition-all">
                                    <CardHeader className="bg-white border-b pb-3"><CardTitle className="flex items-center text-lg"><FileText className="mr-2 h-5 w-5 text-slate-600" /> Lease Progress</CardTitle></CardHeader>
                                    <CardContent className="p-6">
                                        <div className="space-y-2">
                                        <div className="flex justify-between text-sm"><span>Lease completion</span><span className="font-medium">{leaseProgress}%</span></div>
                                        <Progress value={leaseProgress} className="h-2" />
                                        <p className="text-xs text-slate-500">Your lease ends on {format(parseISO(currentLease.end_date), 'MMM d, yyyy')}</p>
                                        </div>
                                    </CardContent>
                                 </Card>
                             )}
                        </div>
                    </div>

                    {/* Lower Row Cards (Recent Payments, Maintenance) */}
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                         {/* Recent Payments */}
                         <Card className="overflow-hidden border-transparent shadow-sm hover:shadow-md transition-all">
                            <CardHeader className="bg-white border-b pb-3 flex flex-row items-center justify-between">
                                <CardTitle className="flex items-center text-lg"><Receipt className="mr-2 h-5 w-5 text-slate-600" /> Recent Payments</CardTitle>
                                <Button variant="ghost" size="sm" onClick={() => setActiveTab("payments")}>View All</Button>
                            </CardHeader>
                            <CardContent className="p-0">
                                {payments.length > 0 ? (
                                    <ul className="divide-y divide-slate-100">
                                        {payments.slice(0, 3).map((payment) => (
                                            <li key={payment.id} className="hover:bg-slate-50 transition-colors">
                                            <div className="flex justify-between items-center p-4">
                                                <div className="flex-1">
                                                    <div className="text-sm font-medium">{format(parseISO(payment.payment_date || payment.due_date), 'MMM d, yyyy')} ({payment.payment_type_display})</div>
                                                    <div className="text-xs text-slate-500">{payment.payment_method_display}</div>
                                                </div>
                                                <div className="text-sm font-medium">{formatCurrency(payment.amount_paid || payment.amount_due)}</div>
                                                <Badge variant={payment.status === 'COMPLETED' ? 'active' : payment.status === 'PENDING' ? 'pending' : 'default'} className="ml-4">{payment.status_display}</Badge>
                                            </div>
                                            </li>
                                        ))}
                                    </ul>
                                ) : (
                                    <p className="p-6 text-center text-slate-500 text-sm">No payment history found.</p>
                                )}
                            </CardContent>
                        </Card>
                        {/* Maintenance Preview */}
                         <Card className="overflow-hidden border-transparent shadow-sm hover:shadow-md transition-all">
                            <CardHeader className="flex flex-row items-center justify-between bg-white border-b pb-3">
                                <CardTitle className="flex items-center text-lg"><Wrench className="mr-2 h-5 w-5 text-slate-600" /> Maintenance</CardTitle>
                                <Button size="sm" className="bg-slate-900 hover:bg-slate-800" onClick={() => setActiveTab("maintenance")}>New Request</Button>
                            </CardHeader>
                            <CardContent className="p-6">
                                 <p className="text-center text-slate-500 text-sm">Maintenance requests section not yet implemented.</p>
                                 {/* Add preview list here when implemented */}
                            </CardContent>
                        </Card>
                    </div>
                </TabsContent>


               {/* PAYMENTS TAB */}
                <TabsContent value="payments" className="mt-0 space-y-6">
                    {/* Payment summary cards */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                         <Card> <CardContent className="p-6"> <div className="flex items-center justify-between"> <div><p className="text-sm font-medium text-slate-500">Next Due</p><p className="text-2xl font-semibold">{nextRentPayment ? formatCurrency(nextRentPayment.amount_due) : '$0.00'}</p></div> <div className="p-2 rounded-full bg-amber-50 text-amber-600"><Calendar className="h-5 w-5" /></div> </div> <p className="text-xs text-slate-500 mt-2">Due {nextRentPayment ? format(parseISO(nextRentPayment.due_date), 'MMM d, yyyy') : '-'}</p> </CardContent> </Card>
                         <Card> <CardContent className="p-6"> <div className="flex items-center justify-between"> <div><p className="text-sm font-medium text-slate-500">Your Rent</p><p className="text-2xl font-semibold">{formatCurrency(leaseTenantInfo?.rent_amount || 1500)}</p></div> <div className="p-2 rounded-full bg-slate-100 text-slate-600"><Home className="h-5 w-5" /></div> </div> <p className="text-xs text-slate-500 mt-2">Your monthly portion</p> </CardContent> </Card>
                         {/* Add utilities card if applicable */}
                         <Card> <CardContent className="p-6"> <div className="flex items-center justify-between"> <div><p className="text-sm font-medium text-slate-500">Days Until Due</p><p className="text-2xl font-semibold">{daysUntilPayment !== null ? (daysUntilPayment >= 0 ? daysUntilPayment : 'Overdue') : '-'}</p></div> <div className={`p-2 rounded-full ${daysUntilPayment !== null && daysUntilPayment < 0 ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-600'}`}><Clock className="h-5 w-5" /></div> </div> <p className="text-xs text-slate-500 mt-2">{daysUntilPayment !== null && daysUntilPayment < 0 ? 'Payment is late' : 'Time remaining'}</p> </CardContent> </Card>
                          <Card> <CardContent className="p-6"> <div className="flex items-center justify-between"> <div><p className="text-sm font-medium text-slate-500">Total Paid (Lease)</p><p className="text-2xl font-semibold">{formatCurrency(payments.reduce((sum, p) => sum + (p.status === 'COMPLETED' && p.amount_paid ? parseFloat(p.amount_paid.toString()) : 0), 0))}</p></div> <div className="p-2 rounded-full bg-blue-50 text-blue-600"><CheckCircle className="h-5 w-5" /></div> </div> <p className="text-xs text-slate-500 mt-2">Sum of completed payments</p> </CardContent> </Card>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                         {/* Payment History */}
                          <Card className="md:col-span-2">
                             <CardHeader className="pb-3"> <CardTitle>Payment History</CardTitle> <CardDescription>Your payment records for this lease</CardDescription> </CardHeader>
                             <CardContent className="p-0">
                                {payments.length > 0 ? (
                                    <div className="rounded-md border">
                                    <div className="grid grid-cols-5 bg-slate-50 p-3 text-sm font-medium text-slate-600"> <div>Due Date</div> <div>Amount</div> <div>Type</div> <div>Status</div> <div></div> </div>
                                    <div className="divide-y divide-slate-100 max-h-96 overflow-y-auto">
                                        {payments.map((payment) => (
                                        <div key={payment.id} className="grid grid-cols-5 p-3 text-sm">
                                            <div>{format(parseISO(payment.due_date), 'MMM d, yyyy')}</div>
                                            <div className="font-medium">{formatCurrency(payment.amount_due)} {payment.amount_paid && payment.amount_paid !== payment.amount_due ? `(Paid: ${formatCurrency(payment.amount_paid)})` : ''}</div>
                                            <div>{payment.payment_type_display}</div>
                                            <div><Badge variant={getStatusBadgeVariant(payment.status)}>{payment.status_display}</Badge></div>
                                            <div className="text-right"> {payment.receipt_file && (<Button variant="ghost" size="icon" asChild><a href={payment.receipt_file} target="_blank" rel="noreferrer"><Download className="h-4 w-4" /></a></Button>)} </div>
                                        </div>
                                        ))}
                                    </div>
                                    </div>
                                ) : (
                                     <p className="p-6 text-center text-slate-500 text-sm">No payment history found.</p>
                                )}
                             </CardContent>
                         </Card>

                         {/* Make Payment / Utilities (Mockup) */}
                          <div className="space-y-6">
                             <Card>
                                <CardHeader className="pb-3"> <CardTitle>Make a Payment</CardTitle> <CardDescription>Pay your upcoming dues</CardDescription> </CardHeader>
                                <CardContent className="space-y-4">
                                   {nextRentPayment ? (
                                        <>
                                        <div className="p-4 bg-slate-50 rounded-md">
                                             <div className="flex justify-between mb-2"><span className="text-sm text-slate-600">{nextRentPayment.payment_type_display}</span><span className="text-sm font-medium">{formatCurrency(nextRentPayment.amount_due)}</span></div>
                                            {/* Add utilities line if needed */}
                                             <div className="flex justify-between pt-2 border-t border-slate-200"><span className="text-sm font-medium">Total Due</span><span className="text-sm font-bold">{formatCurrency(nextRentPayment.amount_due)}</span></div>
                                        </div>
                                         {/* Mock Payment Method Selection */}
                                         <div className="space-y-2"> <Label>Payment Method</Label> <div className="space-y-2"> {/* ... Radio buttons ... */} </div> </div>
                                        <Button className="w-full bg-slate-900 hover:bg-slate-800" disabled>Pay {formatCurrency(nextRentPayment.amount_due)} (Disabled)</Button>
                                         <div className="text-center"><Button variant="link" size="sm" className="text-slate-500" disabled><Plus className="h-3 w-3 mr-1" /> Add Method (Disabled)</Button></div>
                                        </>
                                   ) : (
                                        <p className="text-center text-slate-500 text-sm py-4">No payments currently due.</p>
                                   )}

                                </CardContent>
                            </Card>
                            {/* Utilities Breakdown (Mockup or from Lease Detail if available) */}
                          </div>
                    </div>
                </TabsContent>

                {/* MAINTENANCE TAB (Placeholder) */}
                <TabsContent value="maintenance" className="mt-0 space-y-6">
                     <div className="text-center p-10 border border-dashed rounded-lg">
                         <Wrench className="h-12 w-12 text-slate-300 mx-auto mb-4" />
                         <h2 className="text-xl font-semibold text-slate-700 mb-2">Maintenance Section</h2>
                         <p className="text-slate-500">This feature (submitting and tracking maintenance requests) is not yet implemented.</p>
                     </div>
                 </TabsContent>

                {/* DOCUMENTS TAB */}
                <TabsContent value="documents" className="mt-0 space-y-6">
                     <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                         <Card className="md:col-span-2">
                             <CardHeader className="pb-3 flex flex-row items-center justify-between">
                                <div><CardTitle>Documents</CardTitle><CardDescription>Your lease-related documents</CardDescription></div>
                                {/* <Button variant="outline" size="sm"><Upload className="h-4 w-4 mr-1" /> Upload (Optional)</Button> */}
                             </CardHeader>
                             <CardContent className="p-0">
                                 {documents.length > 0 ? (
                                      <div className="rounded-md border">
                                        <div className="grid grid-cols-4 bg-slate-50 p-3 text-sm font-medium text-slate-600"> <div className="col-span-2">Name</div> <div>Type</div> <div>Actions</div> </div>
                                        <div className="divide-y divide-slate-100 max-h-96 overflow-y-auto">
                                            {documents.map((doc) => (
                                            <div key={doc.id} className="grid grid-cols-4 p-3 text-sm hover:bg-slate-50 items-center">
                                                <div className="col-span-2 flex items-center"><FileText className="h-5 w-5 mr-2 text-slate-400 flex-shrink-0" /><span className="font-medium truncate">{doc.document_name}</span></div>
                                                <div>{doc.document_type_display}</div>
                                                <div className="flex space-x-1"> <Button variant="ghost" size="icon" asChild><a href={doc.file} target="_blank" rel="noreferrer" title={`Download ${doc.document_name}`}><Download className="h-4 w-4" /></a></Button> </div>
                                            </div>
                                            ))}
                                        </div>
                                    </div>
                                 ) : (
                                     <p className="p-6 text-center text-slate-500 text-sm">No documents found for this lease.</p>
                                 )}
                             </CardContent>
                         </Card>
                          {/* Add Recently Viewed or Categories if needed */}
                     </div>
                 </TabsContent>


            </Tabs>
          )}
        </div>
      </main>
    </div>
  );
}