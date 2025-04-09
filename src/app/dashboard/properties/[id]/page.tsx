// src/app/dashboard/properties/[id]/page.tsx
"use client";
import React, { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ArrowLeft, Edit, Trash2, Home, Bed, Bath, Square,
  MapPin, Loader2, Camera, Key, Users, Info, Group,
  ImageIcon, PackageCheck, Calendar, CircleDollarSign,
  Tag, DoorOpen
} from "lucide-react";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { DJANGO_API_URL } from "@/lib/config";

// --- Helper: Derive Base URL ---
let djangoBaseUrl = '';
try {
    if (DJANGO_API_URL && (DJANGO_API_URL.startsWith('http://') || DJANGO_API_URL.startsWith('https://'))) {
      djangoBaseUrl = new URL(DJANGO_API_URL).origin;
    } else {
        console.warn("DJANGO_API_URL is not a valid absolute URL. Relative image paths might not resolve correctly.");
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
    return relativeUrl;
};

// --- Interface for Property Data ---
interface PropertyArea {
  id: number;
  area_type: string;
  area_type_display: string;
  count: number;
  description: string;
  shared_by: any[];
  shared_by_details: any[];
  created_at: string;
  updated_at: string;
}

interface InventoryItem {
  id: number;
  name: string;
  description: string;
  quantity: number;
  condition: string;
  condition_display: string;
  location_description: string;
  created_at: string;
  updated_at: string;
}

interface PropertyGroupBasic {
  id: string;
  name: string;
}

interface PropertyDetail {
    id: number;
    landlord: number;
    landlord_name: string;
    name: string;
    description: string | null;
    address: string | null;
    city: string | null;
    province: string | null;
    postal_code: string | null;
    country: string | null;
    property_category: "COMPLETE_UNIT" | "ROOM";
    property_category_display: string | null;
    primary_image: string | null;
    additional_images: { id: number; image: string; caption: string | null; order: number }[];
    unit_type: string | null;
    unit_type_display: string | null;
    bedrooms: number | null;
    bathrooms: string | number | null;
    max_occupancy: number | null;
    square_footage: number | null;
    room_type: string | null;
    room_type_display: string | null;
    total_washrooms: number | null;
    other_rooms: string | null;
    shared_with: string | null;
    status: "AVAILABLE" | "OCCUPIED" | "MAINTENANCE" | "NOT_AVAILABLE";
    status_display: string | null;
    created_at: string;
    updated_at: string;
    group: PropertyGroupBasic | null;
    group_id?: string | null;
    group_name?: string | null;
    primary_areas?: PropertyArea[];
    shared_areas?: PropertyArea[];
    private_inventory_items?: InventoryItem[];
    shared_inventory_items?: InventoryItem[];
    area_summary?: string;
}

// ================================================================================
// PropertyDetailsPage Component
// ================================================================================
export default function PropertyDetailsPage() {
  // --- State ---
  const [property, setProperty] = useState<PropertyDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [currentTab, setCurrentTab] = useState("details");
  
  // --- Hooks ---
  const router = useRouter();
  const params = useParams();
  const { token } = useAuth();
  const propertyId = params.id;

  // --- Fetch Data ---
  useEffect(() => {
    const fetchProperty = async () => {
      if (!token) {
          setIsLoading(false);
          toast.error("Authentication required.");
          return;
      }
      if (!propertyId || typeof propertyId !== 'string') {
         setIsLoading(false);
         toast.error("Invalid Property ID.");
         router.push("/dashboard/properties");
         return;
      }
      setIsLoading(true);
      try {
        const response = await fetch(`${DJANGO_API_URL}/properties/${propertyId}/`, {
          headers: { 'Authorization': `Token ${token}` },
        });
        if (!response.ok) {
           const errorData = await response.json().catch(() => ({ detail: `HTTP error ${response.status}` }));
           throw new Error(errorData.detail || `Failed to fetch property (Status: ${response.status})`);
        }
        const data: PropertyDetail = await response.json();
        setProperty(data);
      } catch (error) {
        console.error("Error fetching property:", error);
        toast.error(`Failed to load property data: ${error instanceof Error ? error.message : 'Unknown error'}`);
        setProperty(null);
      } finally {
        setIsLoading(false);
      }
    };
    fetchProperty();
  }, [propertyId, token, router]);

  // --- Event Handlers ---
  const handleEdit = () => {
    router.push(`/dashboard/properties/edit/${propertyId}`);
  };
  
  const handleDelete = () => {
    setDeleteDialogOpen(true);
  };

  // --- Delete Action ---
  const confirmDelete = async () => {
    if (!token || !propertyId) return;
    setIsDeleting(true);
    try {
      const response = await fetch(`${DJANGO_API_URL}/properties/${propertyId}/`, {
        method: 'DELETE',
        headers: { 'Authorization': `Token ${token}` },
      });
      if (!response.ok) {
          const errorData = await response.json().catch(() => ({ detail: `HTTP error ${response.status}` }));
          throw new Error(errorData.detail || 'Failed to delete property');
      }
      toast.success("Property deleted successfully");
      router.push("/dashboard/properties");
    } catch (error) {
      console.error("Error deleting property:", error);
      toast.error(`Failed to delete property: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setIsDeleting(false);
      setDeleteDialogOpen(false);
    }
  };

  // --- Status Update Action ---
  const updatePropertyStatus = async (newStatus: PropertyDetail['status']) => {
    if (!token || !propertyId || !property || property.status === newStatus) return;
    const oldStatus = property.status;
    // Optimistic UI update
    setProperty(prev => prev ? { ...prev, status: newStatus, status_display: newStatus.charAt(0) + newStatus.slice(1).toLowerCase().replace('_', ' ') } : null);
    try {
      const response = await fetch(`${DJANGO_API_URL}/properties/${propertyId}/`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Token ${token}`,
        },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!response.ok) {
          const errorData = await response.json().catch(() => ({ detail: `HTTP error ${response.status}` }));
          throw new Error(errorData.detail || 'Failed to update property status');
      }
      const updatedPropertyData = await response.json();
      setProperty(prev => prev ? { ...prev, ...updatedPropertyData } : null);
      toast.success(`Property status updated to ${updatedPropertyData.status_display || newStatus}`);
    } catch (error) {
      console.error("Error updating property status:", error);
      toast.error(`Failed to update status: ${error instanceof Error ? error.message : 'Unknown error'}`);
      // Revert optimistic update on error
      setProperty(prev => prev ? { ...prev, status: oldStatus, status_display: oldStatus.charAt(0) + oldStatus.slice(1).toLowerCase().replace('_', ' ') } : null);
    }
  };

  // --- UI Helpers ---
  const getStatusColor = (status: PropertyDetail['status'] | null | undefined): string => {
     switch (status) {
      case "AVAILABLE": return "bg-green-100 text-green-800 border border-green-200";
      case "OCCUPIED": return "bg-blue-100 text-blue-800 border border-blue-200";
      case "MAINTENANCE": return "bg-amber-100 text-amber-800 border border-amber-200";
      case "NOT_AVAILABLE": return "bg-red-100 text-red-800 border border-red-200";
      default: return "bg-slate-100 text-slate-800 border border-slate-200";
    }
  };

  const getCategoryIcon = () => {
    if (!property) return null;
    return property.property_category === "COMPLETE_UNIT" ? 
      <Home className="h-5 w-5 text-indigo-500 mr-2" /> : 
      <DoorOpen className="h-5 w-5 text-purple-500 mr-2" />;
  };

  // --- Render Loading State ---
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-200px)]">
        <div className="flex flex-col items-center gap-2">
          <Loader2 className="h-10 w-10 animate-spin text-teal-600" />
          <p className="text-sm text-muted-foreground">Loading Property Details...</p>
        </div>
      </div>
    );
  }

  // --- Render Not Found/Error State ---
  if (!property) {
    return (
      <div className="container max-w-6xl py-6 text-center">
         <Button variant="ghost" size="sm" onClick={() => router.push("/dashboard/properties")} className="mb-4">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Properties
        </Button>
        <Card>
            <CardContent className="p-8">
                 <ImageIcon className="h-16 w-16 text-slate-300 mx-auto mb-4" />
                 <h2 className="text-xl font-semibold mb-2">Property Not Found</h2>
                 <p className="text-slate-600">The property details could not be loaded or the property does not exist.</p>
            </CardContent>
        </Card>
      </div>
    );
  }

  // --- Prepare Image URLs ---
  const primaryImageUrl = getFullImageUrl(property.primary_image);
  const additionalImageUrls = property.additional_images?.map(img => ({
      ...img,
      fullUrl: getFullImageUrl(img.image)
  })) || [];

  // --- Determine if there are areas or inventory to display ---
  const hasAreas = property.primary_areas?.length > 0 || property.shared_areas?.length > 0;
  const hasInventory = property.private_inventory_items?.length > 0 || property.shared_inventory_items?.length > 0;

  // --- Render Property Details ---
  return (
    <div className="container max-w-6xl py-6 lg:py-10 mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
         <div className="flex items-center flex-grow min-w-0">
             <Button variant="ghost" size="icon" onClick={() => router.push("/dashboard/properties")} className="mr-2 shrink-0">
                <ArrowLeft className="h-5 w-5" />
                <span className="sr-only">Back to Properties</span>
            </Button>
             <div className="flex items-center">
               {getCategoryIcon()}
               <h1 className="text-2xl md:text-3xl font-semibold truncate" title={property.name ?? ''}>{property.name ?? 'Property Details'}</h1>
             </div>
         </div>
        <div className="flex gap-2 w-full sm:w-auto justify-end">
          <Button variant="outline" size="sm" onClick={handleEdit}>
            <Edit className="mr-1.5 h-4 w-4" /> Edit
          </Button>
          <Button
            variant="outline" size="sm"
            className="text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200 hover:border-red-300"
            onClick={handleDelete}
          > 
            <Trash2 className="mr-1.5 h-4 w-4" /> Delete 
          </Button>
        </div>
      </div>

      {/* Status Badge */}
      <div className="mb-6">
        <Badge className={`text-sm px-3 py-1 ${getStatusColor(property.status)}`}>
          {property.status_display || 'Unknown Status'}
        </Badge>
        {property.group && (
          <Badge className="ml-2 text-sm px-3 py-1 bg-indigo-100 text-indigo-800 border border-indigo-200">
            <Group className="h-3.5 w-3.5 mr-1 inline" /> {property.group_name || property.group.name}
          </Badge>
        )}
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 xl:gap-8">
        {/* Left Column (Images & Tabs) */}
        <div className="lg:col-span-2 space-y-6">
          {/* Property Images */}
          <Card>
             <CardHeader className="pb-3">
               <CardTitle className="flex items-center justify-between">
                 <span>Property Images</span>
                 {(additionalImageUrls.length > 0 || primaryImageUrl) && (
                   <Button size="sm" variant="outline" onClick={handleEdit} className="flex items-center text-xs">
                     <Camera className="h-3.5 w-3.5 mr-1.5" /> Manage Photos
                   </Button>
                 )}
               </CardTitle>
             </CardHeader>
             <CardContent className="p-4 md:p-6">
                 <div className="aspect-video bg-slate-100 rounded-lg overflow-hidden mb-3 border">
                    {primaryImageUrl ? (
                      <img
                          src={primaryImageUrl}
                          alt={property.name ?? 'Primary property image'}
                          className="w-full h-full object-cover"
                          onError={(e) => { e.currentTarget.src = '/placeholder.svg'; }}
                      />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center">
                        <ImageIcon className="h-12 w-12 text-slate-300 mb-2" />
                        <p className="text-sm text-slate-400">No primary image available</p>
                      </div>
                    )}
                </div>
                 {/* Additional Image Thumbnails */}
                 {additionalImageUrls.length > 0 && (
                     <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 gap-2">
                        {additionalImageUrls.map((img) => (
                            <div key={img.id} className="aspect-square bg-slate-100 rounded-md overflow-hidden border">
                            <img
                                src={img.fullUrl ?? '/placeholder.svg'}
                                alt={img.caption || `Additional image ${img.id}`}
                                className="w-full h-full object-cover"
                                loading="lazy"
                                onError={(e) => { e.currentTarget.src = '/placeholder.svg'; }}
                            />
                            </div>
                        ))}
                    </div>
                 )}
                 {additionalImageUrls.length === 0 && !primaryImageUrl && (
                     <div className="text-center py-4 border border-dashed rounded-md">
                       <ImageIcon className="h-8 w-8 text-slate-300 mx-auto mb-2" />
                       <p className="text-sm text-slate-500">No images uploaded for this property</p>
                       <Button size="sm" variant="outline" onClick={handleEdit} className="mt-2">
                         <Camera className="h-4 w-4 mr-1.5" /> Add Images
                       </Button>
                     </div>
                 )}
             </CardContent>
          </Card>

          {/* Property Details Card - Now directly showing details without tabs */}
          <Card>
            <CardHeader>
              <CardTitle>Property Details</CardTitle>
              <CardDescription>Comprehensive information about this property</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5 pt-4">
              {/* Description */}
              {property.description && (
                <div>
                  <h3 className="text-base font-semibold mb-1">Description</h3>
                  <p className="text-sm text-slate-700 whitespace-pre-wrap">{property.description}</p>
                </div>
              )}

              {/* Features Grid */}
              <div className="space-y-3">
                <h3 className="text-base font-semibold mb-2">Features</h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {/* Conditionally show based on category */}
                  {property.property_category === "COMPLETE_UNIT" && (
                    <FeatureItem icon={Home} label="Unit Type" value={property.unit_type_display} />
                  )}
                  {property.property_category === "ROOM" && (
                    <FeatureItem icon={Key} label="Room Type" value={property.room_type_display} />
                  )}

                  {/* Common features */}
                  <FeatureItem icon={Bed} label="Bedrooms" value={property.bedrooms} />
                  <FeatureItem icon={Bath} label="Bathrooms" value={property.bathrooms} />
                  <FeatureItem icon={Square} label="Sq. Footage" value={property.square_footage ? `${property.square_footage} sq ft` : null} />
                  <FeatureItem icon={Users} label="Max Occupancy" value={property.max_occupancy} />
                    
                  {/* Room specific */}
                  {property.property_category === "ROOM" && property.total_washrooms && (
                    <FeatureItem icon={Bath} label="Shared Baths" value={property.total_washrooms}/>
                  )}
                </div>
              </div>

              {/* Area Summary */}
              {property.area_summary && property.area_summary !== "No areas defined" && (
                <> 
                  <Separator className="my-4"/>
                  <div>
                    <h3 className="text-base font-semibold mb-1 flex items-center">
                      <Info className="h-4 w-4 mr-2" /> Areas Overview
                    </h3>
                    <p className="text-sm text-slate-700">{property.area_summary}</p>
                  </div>
                </>
              )}

              {/* Other Rooms */}
              {property.other_rooms && (
                <> 
                  <Separator className="my-4"/>
                  <div>
                    <h3 className="text-base font-semibold mb-1">Other Rooms / Areas</h3>
                    <p className="text-sm text-slate-700">{property.other_rooms}</p>
                  </div>
                </>
              )}
                
              {/* Shared With (for Room category) */}
              {property.property_category === "ROOM" && property.shared_with && (
                <> 
                  <Separator className="my-4"/>
                  <div>
                    <h3 className="text-base font-semibold mb-1">Shared With</h3>
                    <p className="text-sm text-slate-700">{property.shared_with}</p>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Column (Status, Actions, Info) */}
        <div className="space-y-6">
          {/* Property Status Card */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Property Status</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-slate-600">Current Status:</span>
                <Badge className={`text-xs px-2 py-1 ${getStatusColor(property.status)}`}>
                  {property.status_display ?? '-'}
                </Badge>
              </div>
              <Separator />
              <p className="text-xs text-slate-500 pb-1">Update Status:</p>
              <div className="grid grid-cols-2 gap-2">
                {property.status !== "AVAILABLE" && (
                  <Button 
                    size="sm" 
                    variant="outline" 
                    className="bg-green-50 border-green-200 hover:bg-green-100 text-green-700"
                    onClick={() => updatePropertyStatus("AVAILABLE")}
                  >
                    Mark Available
                  </Button>
                )}
                {property.status !== "OCCUPIED" && (
                  <Button 
                    size="sm" 
                    variant="outline" 
                    className="bg-blue-50 border-blue-200 hover:bg-blue-100 text-blue-700"
                    onClick={() => updatePropertyStatus("OCCUPIED")}
                  >
                    Mark Occupied
                  </Button>
                )}
                {property.status !== "MAINTENANCE" && (
                  <Button 
                    size="sm" 
                    variant="outline" 
                    className="bg-amber-50 border-amber-200 hover:bg-amber-100 text-amber-700"
                    onClick={() => updatePropertyStatus("MAINTENANCE")}
                  >
                    Set Maintenance
                  </Button>
                )}
                {property.status !== "NOT_AVAILABLE" && (
                  <Button 
                    size="sm" 
                    variant="outline" 
                    className="bg-red-50 border-red-200 hover:bg-red-100 text-red-700"
                    onClick={() => updatePropertyStatus("NOT_AVAILABLE")}
                  >
                    Set Unavailable
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Inventory Card */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Inventory Items</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {/* Private Inventory */}
              {property.private_inventory_items && property.private_inventory_items.length > 0 ? (
                <div className="space-y-2">
                  <h3 className="text-sm font-medium text-slate-600">Private Items</h3>
                  {property.private_inventory_items.slice(0, 3).map(item => (
                    <div key={item.id} className="flex justify-between items-center p-2 bg-slate-50 rounded-md border text-sm">
                      <span className="font-medium flex items-center">
                        <PackageCheck className="h-3.5 w-3.5 mr-1.5 text-slate-500" />
                        {item.quantity > 1 ? `${item.quantity}× ` : ''}{item.name}
                      </span>
                      <Badge className={`text-xs ${
                        item.condition === 'EXCELLENT' ? 'bg-green-100 text-green-800 border-green-200' : 
                        item.condition === 'GOOD' ? 'bg-blue-100 text-blue-800 border-blue-200' :
                        item.condition === 'FAIR' ? 'bg-amber-100 text-amber-800 border-amber-200' :
                        'bg-red-100 text-red-800 border-red-200'
                      }`}>
                        {item.condition_display}
                      </Badge>
                    </div>
                  ))}
                  {property.private_inventory_items.length > 3 && (
                    <Button 
                      variant="link" 
                      className="p-0 h-auto text-sm" 
                      onClick={() => setCurrentTab("inventory")}
                    >
                      View all {property.private_inventory_items.length} items
                    </Button>
                  )}
                </div>
              ) : (
                <div className="py-3 text-center">
                  <p className="text-sm text-slate-500">No private inventory items</p>
                </div>
              )}

              {/* Shared Inventory */}
              {property.shared_inventory_items && property.shared_inventory_items.length > 0 && (
                <>
                  <Separator />
                  <div className="space-y-2">
                    <h3 className="text-sm font-medium text-slate-600">Shared Items</h3>
                    {property.shared_inventory_items.slice(0, 3).map(item => (
                      <div key={item.id} className="flex justify-between items-center p-2 bg-slate-50 rounded-md border text-sm">
                        <span className="font-medium flex items-center">
                          <PackageCheck className="h-3.5 w-3.5 mr-1.5 text-slate-500" />
                          {item.quantity > 1 ? `${item.quantity}× ` : ''}{item.name}
                        </span>
                        <Badge className="bg-blue-100 text-blue-800 border-blue-200 text-xs">Shared</Badge>
                      </div>
                    ))}
                    {property.shared_inventory_items.length > 3 && (
                      <Button 
                        variant="link" 
                        className="p-0 h-auto text-sm" 
                        onClick={() => setCurrentTab("inventory")}
                      >
                        View all {property.shared_inventory_items.length} shared items
                      </Button>
                    )}
                  </div>
                </>
              )}

              {!property.private_inventory_items?.length && !property.shared_inventory_items?.length && (
                <div className="text-center py-4">
                  <PackageCheck className="h-10 w-10 text-slate-300 mx-auto mb-2" />
                  <p className="text-sm text-slate-500">No inventory items added yet</p>
                  <Button variant="outline" size="sm" className="mt-2" onClick={handleEdit}>
                    Add Inventory
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Areas Summary Card (new) */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Areas</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {/* Primary Areas Summary */}
              {property.primary_areas && property.primary_areas.length > 0 ? (
                <div className="space-y-2">
                  <h3 className="text-sm font-medium text-slate-600">Primary Areas</h3>
                  <div className="p-2 bg-slate-50 rounded-md border">
                    <ul className="space-y-1">
                      {property.primary_areas.map(area => (
                        <li key={area.id} className="text-sm flex justify-between">
                          <span>
                            {area.count > 1 ? `${area.count}× ` : ''}{area.area_type_display}
                          </span>
                          {area.shared_by.length > 1 ? (
                            <Badge className="text-xs bg-blue-100 text-blue-800 border-blue-200">Shared</Badge>
                          ) : (
                            <Badge className="text-xs bg-green-100 text-green-800 border-green-200">Private</Badge>
                          )}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              ) : (
                <div className="py-3 text-center">
                  <p className="text-sm text-slate-500">No primary areas defined</p>
                </div>
              )}

              {/* Shared Areas Summary */}
              {property.shared_areas && property.shared_areas.length > 0 && (
                <>
                  <Separator />
                  <div className="space-y-2">
                    <h3 className="text-sm font-medium text-slate-600">Common/Shared Areas</h3>
                    <div className="p-2 bg-slate-50 rounded-md border">
                      <ul className="space-y-1">
                        {property.shared_areas.map(area => (
                          <li key={area.id} className="text-sm flex justify-between">
                            <span>
                              {area.count > 1 ? `${area.count}× ` : ''}{area.area_type_display}
                            </span>
                            <Badge className="text-xs bg-blue-100 text-blue-800 border-blue-200">Shared</Badge>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </>
              )}

              {property.primary_areas?.length || property.shared_areas?.length ? (
                <Button 
                  variant="link" 
                  className="p-0 h-auto text-sm" 
                  onClick={() => setCurrentTab("areas")}
                >
                  View detailed areas
                </Button>
              ) : (
                <Button variant="outline" size="sm" onClick={handleEdit}>
                  Add Areas
                </Button>
              )}
            </CardContent>
          </Card>

          {/* Property Info Card */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Property Information</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm">
                <InfoItem label="Category" value={property.property_category_display} />
                <InfoItem 
                  label="Type" 
                  value={property.property_category === "COMPLETE_UNIT" 
                    ? property.unit_type_display 
                    : property.room_type_display} 
                />
                {property.group && (
                  <InfoItem 
                    label="Group" 
                    value={
                      <Button 
                        variant="link" 
                        className="p-0 h-auto text-sm flex items-center hover:underline"
                        onClick={() => router.push(`/dashboard/properties/view-group/${property.group_id || property.group?.id}`)}
                      >
                        <Group className="h-3.5 w-3.5 mr-1" />
                        {property.group_name || property.group.name}
                      </Button>
                    } 
                  />
                )}
                <InfoItem 
                  label="Location" 
                  value={
                    <span className="text-right">
                      {property.address ? `${property.address}` : 'No address specified'}
                      {property.city && <span className="block">{property.city}{property.province ? `, ${property.province}` : ''} {property.postal_code || ''}</span>}
                    </span>
                  } 
                />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Deletion</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to permanently delete the property "{property?.name ?? 'this property'}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={(e) => e.stopPropagation()}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              disabled={isDeleting}
              className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
            >
              {isDeleting ? (<><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Deleting...</>) : "Yes, Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// ================================================================================
// Helper Components for Details Page
// ================================================================================
interface FeatureItemProps {
    icon: React.ElementType;
    label: string;
    value: string | number | null | undefined;
}

function FeatureItem({ icon: Icon, label, value }: FeatureItemProps) {
    if (value === null || value === undefined || value === '') return null; // Don't render if no value
    return (
        <div className="flex items-center p-2.5 bg-slate-50 rounded-md border border-slate-100">
            <Icon className="h-5 w-5 text-slate-600 flex-shrink-0" />
            <div className="ml-2.5">
                <p className="text-xs text-slate-500">{label}</p>
                <p className="font-medium text-slate-800">{String(value)}</p>
            </div>
        </div>
    );
}

interface InfoItemProps {
    label: string;
    value: React.ReactNode | string | number | null | undefined;
}

function InfoItem({ label, value }: InfoItemProps) {
     if (value === null || value === undefined || value === '') return null; // Don't render if no value
     return (
        <div className="flex justify-between items-center py-1.5 border-b border-slate-100 last:border-0">
            <span className="text-slate-500">{label}:</span>
            <span className="font-medium text-right">{value}</span>
        </div>
    );
}