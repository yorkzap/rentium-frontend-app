"use client";
import React, { useState, useEffect } from "react"; // Import React
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Building2, Users, DollarSign, Plus, Wrench, FileText, ChevronRight, Loader2, AlertCircle, ImageIcon } from "lucide-react"; // Added Loader2, AlertCircle, ImageIcon
import { useMediaQuery } from "@/hooks/use-media-query";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation"; // Import useRouter
import { DJANGO_API_URL } from "@/lib/config"; // Import API URL
import { toast } from "sonner"; // Import toast for errors

// --- Helper: Derive Base URL ---
let djangoBaseUrl = '';
try {
    if (DJANGO_API_URL && (DJANGO_API_URL.startsWith('http://') || DJANGO_API_URL.startsWith('https://'))) {
      djangoBaseUrl = new URL(DJANGO_API_URL).origin;
    } else {
        console.warn("DJANGO_API_URL ('", DJANGO_API_URL, "') is not a valid absolute URL. Relative image paths might not resolve correctly.");
    }
} catch (e) {
    console.error("Error parsing DJANGO_API_URL:", e);
}

// --- Helper: Get Full Image URL ---
const getFullImageUrl = (relativeUrl: string | null | undefined): string | null => {
    if (!relativeUrl) return null;
    if (relativeUrl.startsWith('http://') || relativeUrl.startsWith('https://') || relativeUrl.startsWith('blob:')) {
        return relativeUrl;
    }
    if (djangoBaseUrl) {
        try {
             if (relativeUrl.startsWith('/media/')) {
                 return `${djangoBaseUrl}${relativeUrl}`;
             }
             return new URL(relativeUrl, djangoBaseUrl).href;
        } catch (e) {
            console.error(`Error constructing URL for ${relativeUrl} with base ${djangoBaseUrl}:`, e);
            return null;
        }
    }
    console.warn("Cannot construct full image URL: djangoBaseUrl is not set.");
    return relativeUrl;
};

// --- Interface for Property List Summary Data (from API) ---
interface PropertyListSummary {
    id: number;
    name: string;
    address: string;
    city: string;
    property_category: "COMPLETE_UNIT" | "ROOM";
    type_display: string; // API field name seems to be this
    bedrooms?: number | null;
    primary_image: string | null;
    status: "AVAILABLE" | "OCCUPIED" | "MAINTENANCE" | "NOT_AVAILABLE";
    status_display: string;
    landlord_name?: string;
}

// --- Mock Data Structure (for hardcoded fields) ---
const mockListingsData = [
    { id: 1, rent: "$1,800", leaseEnd: "Dec 31, 2024" },
    { id: 2, rent: "$2,200", leaseEnd: "Mar 15, 2025" },
    { id: 3, rent: "$1,600", leaseEnd: "N/A" }, // Vacant
    { id: 4, rent: "$850", leaseEnd: "Jun 30, 2024" },
    { id: 5, rent: "$550", leaseEnd: "Aug 15, 2024" },
    // Add mock entries corresponding to ALL potential property IDs from your API
    // If ID 6 exists in API, add: { id: 6, rent: "$XXXX", leaseEnd: "YYYY-MM-DD" }, etc.
];

// ================================================================================
// LandlordOverview Component
// ================================================================================
export default function LandlordOverview({ onNavigate }: { onNavigate: (section: string) => void }) {
  const isMobile = useMediaQuery("(max-width: 768px)");
  const [hoveredListing, setHoveredListing] = useState<number | null>(null);
  const { user, token } = useAuth();
  const router = useRouter();

  // --- State for Fetched Data ---
  const [properties, setProperties] = useState<PropertyListSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // --- Fetch Property List Data ---
  useEffect(() => {
    if (!token) {
      setIsLoading(false);
      setError("Authentication required to load data.");
      return;
    }
    const fetchPropertyList = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const response = await fetch(`${DJANGO_API_URL}/properties/`, {
          headers: { 'Authorization': `Token ${token}` },
        });
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.detail || `Failed to fetch properties (Status: ${response.status})`);
        }
        const data: PropertyListSummary[] = await response.json();
        setProperties(data);
      } catch (fetchError) {
        console.error("Error fetching property list:", fetchError);
        const message = fetchError instanceof Error ? fetchError.message : "An unknown error occurred";
        setError(message);
        toast.error(`Failed to load properties: ${message}`);
      } finally {
        setIsLoading(false);
      }
    };
    fetchPropertyList();
  }, [token]);

  // --- Dynamic Stats Calculation ---
  const totalListings = properties.length;
  const unitCount = properties.filter(p => p.property_category === "COMPLETE_UNIT").length;
  const roomCount = properties.filter(p => p.property_category === "ROOM").length;

  // --- Stats Data (Partially Dynamic) ---
  const stats = [
    {
      title: "Total Listings",
      value: isLoading && totalListings === 0 ? <Loader2 className="h-6 w-6 animate-spin" /> : totalListings.toString(), // Show loader only if still loading AND no data yet
      details: isLoading && totalListings === 0 ? "Loading..." : `${unitCount} Full Units, ${roomCount} Rooms`,
      icon: Building2, color: "bg-blue-50 text-blue-600", navigate: "properties",
    },
    { // Hardcoded
      title: "Occupants", value: "12", details: "8 Tenants, 4 Roommates",
      icon: Users, color: "bg-green-50 text-green-600", navigate: "leases",
    },
    { // Hardcoded
      title: "Est. Monthly Income", value: "$8,450", details: "Based on occupied units",
      icon: DollarSign, color: "bg-amber-50 text-amber-600", navigate: "financial",
    },
  ];

  // --- Dynamic Occupancy Calculation ---
  const totalUnits = properties.length;
  const occupiedUnits = properties.filter((p) => p.status === "OCCUPIED").length;
  const overallOccupancyRate = totalUnits > 0 ? Math.round((occupiedUnits / totalUnits) * 100) : 0;
  const totalCompleteUnits = properties.filter(l => l.property_category === "COMPLETE_UNIT").length;
  const occupiedCompleteUnits = properties.filter(l => l.property_category === "COMPLETE_UNIT" && l.status === "OCCUPIED").length;
  const unitOccupancyRate = totalCompleteUnits > 0 ? Math.round((occupiedCompleteUnits / totalCompleteUnits) * 100) : 0;
  const totalRooms = properties.filter(l => l.property_category === "ROOM").length;
  const occupiedRooms = properties.filter(l => l.property_category === "ROOM" && l.status === "OCCUPIED").length;
  const roomOccupancyRate = totalRooms > 0 ? Math.round((occupiedRooms / totalRooms) * 100) : 0;

  // Urgent tasks (Hardcoded)
  const urgentTasks = [
    { id: 1, title: "Lease renewal needed soon", dueDate: "Due in 5 days", type: "lease", navigate: "leases" },
    { id: 2, title: "Maintenance: Leaking faucet reported", dueDate: "Reported 2 days ago", type: "maintenance", navigate: "maintenance" },
    { id: 3, title: "Schedule move-out inspection", dueDate: "Action required", type: "lease", navigate: "leases" },
  ];

  // --- Render Loading State ---
   if (isLoading && properties.length === 0) { // Show full page loader only on initial load
     return (
       // FIXED: Added actual JSX for loading spinner
       <div className="flex items-center justify-center min-h-[calc(100vh-200px)]">
            <Loader2 className="h-12 w-12 animate-spin text-teal-600" />
       </div>
     );
   }

  // --- Render Error State ---
  if (error) {
    return (
       // FIXED: Added actual JSX for error card
       <Card className="border-destructive bg-red-50">
            <CardHeader>
                <CardTitle className="flex items-center gap-2 text-destructive">
                    <AlertCircle className="h-5 w-5"/> Error Loading Dashboard Data
                </CardTitle>
                <CardDescription className="text-red-700">{error}</CardDescription>
            </CardHeader>
            <CardContent>
                <Button variant="outline" onClick={() => window.location.reload()}>Retry</Button>
            </CardContent>
      </Card>
    );
  }

  // --- Render Dashboard ---
  return (
    <div className="space-y-8">
      {/* Welcome Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-semibold text-slate-900">
            Welcome{user?.name ? `, ${user.name.split(" ")[0]}` : ""}!
          </h1>
          <p className="text-slate-500 mt-1">Here's what's happening with your properties today.</p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
        {stats.map((stat, index) => (
          <Card
            key={index}
            className="hover:shadow-md transition-all cursor-pointer border-l-4 border-transparent hover:border-l-blue-500"
            onClick={() => onNavigate(stat.navigate)}
          >
             <CardContent className="p-5 md:p-6">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <p className="text-sm font-medium text-slate-500">{stat.title}</p>
                  <div className="text-2xl md:text-3xl font-semibold h-8 flex items-center">{stat.value}</div> {/* Fixed height */}
                  <p className="text-xs text-slate-500 pt-0.5">{stat.details}</p>
                </div>
                <div className={`p-3 rounded-lg ${stat.color}`}>
                  <stat.icon className="h-5 w-5 md:h-6 md:w-6" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 xl:gap-8">
        {/* Left Column: Listings */}
        <div className="lg:col-span-2">
          <Card className="h-full shadow-sm border">
            <CardHeader className="flex flex-row justify-between items-center bg-slate-50/50 border-b px-4 py-3 md:px-6 md:py-4">
               <div>
                <CardTitle className="text-lg">Your Listings</CardTitle>
                <CardDescription className="text-xs md:text-sm">Quick overview of your properties.</CardDescription>
              </div>
              <Button variant="outline" size="sm" onClick={() => onNavigate("properties")}>
                <Building2 className="h-4 w-4 mr-1.5" /> View All
              </Button>
            </CardHeader>
            <CardContent className="p-0">
               {properties.length > 0 ? (
                    <ul className="divide-y divide-slate-100">
                        {properties.slice(0, 5).map((listing) => {
                            const mockData = mockListingsData.find(mock => mock.id === listing.id) || { rent: "N/A", leaseEnd: "N/A" };
                            const imageUrl = getFullImageUrl(listing.primary_image);
                            const handleListingClick = () => router.push(`/dashboard/properties/${listing.id}`);

                            return (
                            <li
                                key={listing.id}
                                className={cn( "hover:bg-slate-50 cursor-pointer transition-colors", hoveredListing === listing.id && "bg-slate-50" )}
                                onClick={handleListingClick}
                                onMouseEnter={() => setHoveredListing(listing.id)}
                                onMouseLeave={() => setHoveredListing(null)}
                                role="link" aria-label={`View details for ${listing.name}`} tabIndex={0}
                                onKeyDown={(e) => { if(e.key === 'Enter' || e.key === ' ') handleListingClick()}}
                            >
                                <div className="flex items-center justify-between p-3 md:p-4 space-x-3">
                                    {/* Thumbnail */}
                                    <div className="flex-shrink-0 w-12 h-12 md:w-16 md:h-16 bg-slate-100 rounded-md overflow-hidden border">
                                        {imageUrl ? (
                                            <img src={imageUrl} alt={listing.name ?? 'Property image'} className="w-full h-full object-cover" onError={(e) => { e.currentTarget.src = '/placeholder.svg'; }} loading="lazy" />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center text-slate-400"> <ImageIcon className="w-6 h-6" /> </div>
                                        )}
                                    </div>
                                    {/* Details */}
                                    <div className="flex-1 min-w-0">
                                        <h3 className="text-sm font-medium text-slate-900 truncate" title={listing.name ?? ''}>{listing.name ?? 'Unnamed Property'}</h3>
                                        <p className="text-xs text-slate-500 truncate" title={`${listing.address}, ${listing.city}`}>{listing.address}, {listing.city}</p>
                                        <div className="flex items-center mt-1.5 space-x-2 flex-wrap gap-y-1">
                                            <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${listing.property_category === 'COMPLETE_UNIT' ? 'bg-purple-100 text-purple-800' : 'bg-cyan-100 text-cyan-800'}`}>
                                                {listing.type_display || listing.property_category_display || '-'}
                                            </span>
                                            <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${listing.status === 'OCCUPIED' ? 'bg-green-100 text-green-800' : listing.status === 'AVAILABLE' ? 'bg-blue-100 text-blue-800' : 'bg-amber-100 text-amber-800'}`}>
                                                {listing.status_display || '-'}
                                            </span>
                                            {/* Hardcoded Rent */}
                                            <span className="text-xs font-medium text-slate-700">{mockData.rent}/mo</span>
                                        </div>
                                    </div>
                                    {/* Lease End & Chevron */}
                                    <div className="ml-2 text-right flex items-center shrink-0">
                                        <div className="hidden sm:block mr-2">
                                            {mockData.leaseEnd !== "N/A" ? (
                                            <div> <div className="text-xs text-slate-500">Lease End</div> <div className="text-sm font-medium">{mockData.leaseEnd}</div> </div>
                                            ) : ( <div className="text-xs text-slate-500 mt-2">No Lease</div> )}
                                        </div>
                                         <ChevronRight className={cn( "h-5 w-5 text-slate-400 transition-transform duration-150", hoveredListing === listing.id ? "translate-x-0.5" : "" )} />
                                    </div>
                                </div>
                            </li>
                            );
                        })}
                    </ul>
               ) : (
                    <div className="p-6 text-center text-slate-500">
                        <p>No properties added yet.</p>
                        <Button variant="link" size="sm" className="mt-2 h-auto p-0" onClick={() => onNavigate("properties")}>Add your first property</Button>
                    </div>
               )}
              {properties.length > 5 && (
                <div className="p-3 text-center border-t">
                  <Button variant="ghost" size="sm" onClick={() => onNavigate("properties")} className="text-slate-600 hover:text-slate-900"> View all properties <ChevronRight className="h-4 w-4 ml-1" /> </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Occupancy & Tasks */}
        <div className="space-y-6 xl:space-y-8">
            {/* Occupancy Card */}
            <Card className="shadow-sm border">
                 <CardHeader className="bg-slate-50/50 border-b px-4 py-3 md:px-6 md:py-4"> <CardTitle className="text-lg">Occupancy Rate</CardTitle> </CardHeader>
                 <CardContent className="p-5 md:p-6">
                    {totalUnits > 0 ? (
                        <div className="flex flex-col items-center">
                            <div className="relative h-28 w-28 md:h-32 md:w-32 flex items-center justify-center mb-4">
                                <svg className="h-full w-full" viewBox="0 0 100 100">
                                    <circle className="text-slate-100" strokeWidth="10" stroke="currentColor" fill="transparent" r="40" cx="50" cy="50" />
                                    <circle className="text-blue-600" strokeWidth="10" strokeDasharray={`${overallOccupancyRate * 2.512} 251.2`} strokeLinecap="round" stroke="currentColor" fill="transparent" r="40" cx="50" cy="50" transform="rotate(-90 50 50)" />
                                </svg>
                                <div className="absolute text-center"> <div className="text-3xl font-bold">{overallOccupancyRate}%</div> <div className="text-xs text-slate-500">Overall</div> </div>
                            </div>
                            <div className="mt-4 w-full space-y-4">
                                {totalCompleteUnits > 0 && ( <div className="space-y-1"> <div className="flex justify-between text-xs md:text-sm"><span className="text-slate-600">Full Units</span><span className="font-medium">{unitOccupancyRate}%</span></div> <Progress value={unitOccupancyRate} className="h-2" /> </div> )}
                                {totalRooms > 0 && ( <div className="space-y-1"> <div className="flex justify-between text-xs md:text-sm"><span className="text-slate-600">Rooms</span><span className="font-medium">{roomOccupancyRate}%</span></div> <Progress value={roomOccupancyRate} className="h-2 bg-cyan-100 [&>div]:bg-cyan-500" /> </div> )}
                            </div>
                        </div>
                    ) : ( <p className="text-center text-sm text-slate-500 py-8">No occupancy data available yet.</p> )}
                 </CardContent>
            </Card>

            {/* Urgent Tasks (Hardcoded) */}
            <Card className="shadow-sm border">
                 <CardHeader className="bg-slate-50/50 border-b px-4 py-3 md:px-6 md:py-4"> <CardTitle className="text-lg">Upcoming Tasks</CardTitle> </CardHeader>
                 <CardContent className="p-0">
                    {urgentTasks.length > 0 ? (
                        <ul className="divide-y divide-slate-100">
                            {urgentTasks.slice(0, 3).map((task) => (
                                <li key={task.id} className="hover:bg-slate-50 cursor-pointer transition-colors" onClick={() => onNavigate(task.navigate)} role="link" aria-label={`View task: ${task.title}`} tabIndex={0} onKeyDown={(e) => { if(e.key === 'Enter' || e.key === ' ') onNavigate(task.navigate)}}>
                                    <div className="flex items-center p-3 md:p-4">
                                        <div className={`p-2 rounded-lg mr-3 ${task.type === "lease" ? "bg-blue-100 text-blue-700" : "bg-amber-100 text-amber-700"}`}>
                                            {task.type === "lease" && <FileText className="h-4 w-4" />} {task.type === "maintenance" && <Wrench className="h-4 w-4" />}
                                        </div>
                                        <div className="flex-1 min-w-0"> <p className="text-sm font-medium text-slate-900 truncate">{task.title}</p> <p className="text-xs text-slate-500">{task.dueDate}</p> </div>
                                        <ChevronRight className="h-5 w-5 text-slate-400 ml-2 shrink-0" />
                                    </div>
                                </li>
                            ))}
                        </ul>
                    ) : ( <p className="p-6 text-center text-sm text-slate-500">No upcoming tasks.</p> )}
                 </CardContent>
                 {urgentTasks.length > 3 && ( <div className="p-3 text-center border-t"> <Button variant="ghost" size="sm" onClick={() => onNavigate("tasks")} className="text-slate-600 hover:text-slate-900"> View all tasks <ChevronRight className="h-4 w-4 ml-1" /> </Button> </div> )}
            </Card>
        </div>
      </div>
    </div>
  );
}

// Placeholder SVG definition (ensure /public/placeholder.svg exists)
// ...