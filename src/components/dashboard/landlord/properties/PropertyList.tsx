// src/components/dashboard/landlord/properties/PropertyList.tsx
"use client";
import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Building2, Plus, Edit, Trash2, Home, Bed, Bath, Users, Square,
  MapPin, ImageIcon, MoreHorizontal, Tag, Group, Key, Info
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useRouter } from "next/navigation";
// Removed DJANGO_API_URL import as base URL is derived from env var
import { cn, formatStatus, capitalize } from "@/lib/utils"; // Import utils

// --- Derive Base URL from Environment Variable (Available Server & Client) ---
let djangoBaseUrl = '';
try {
    const apiUrl = process.env.NEXT_PUBLIC_DJANGO_API_URL;
    if (apiUrl && (apiUrl.startsWith('http://') || apiUrl.startsWith('https://'))) {
      djangoBaseUrl = new URL(apiUrl).origin;
    } else {
       console.warn("NEXT_PUBLIC_DJANGO_API_URL is not set or invalid in PropertyList. Image URLs might be incorrect.");
    }
} catch (e) {
    console.error("Error parsing NEXT_PUBLIC_DJANGO_API_URL in PropertyList:", e);
}
// ---------------------------------------------------------------------------

// --- Helper: Get Full Image URL ---
const getFullImageUrl = (relativeUrl: string | null | undefined): string | null => {
    if (!relativeUrl) return null;
    if (relativeUrl.startsWith('http://') || relativeUrl.startsWith('https://') || relativeUrl.startsWith('blob:')) {
        return relativeUrl;
    }
    if (djangoBaseUrl) {
        try {
             const path = relativeUrl.startsWith('/') ? relativeUrl.substring(1) : relativeUrl;
             return new URL(path, djangoBaseUrl).href;
        } catch (e) {
            console.error(`Error constructing URL for ${relativeUrl} with base ${djangoBaseUrl}:`, e);
            return null;
        }
    }
    console.warn("Cannot construct full image URL in PropertyList: djangoBaseUrl could not be derived.");
    return relativeUrl;
};

// --- Interface for Property Data ---
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
    property_category_display?: string;
    primary_image: string | null;
    additional_images: any[];
    unit_type: string | null;
    unit_type_display?: string | null;
    bedrooms: number | null;
    bathrooms: string | number | null;
    max_occupancy: number | null;
    square_footage: number | null;
    room_type: string | null;
    room_type_display?: string | null;
    total_washrooms: number | null;
    other_rooms: string | null;
    shared_with: string | null;
    status: "AVAILABLE" | "OCCUPIED" | "MAINTENANCE" | "NOT_AVAILABLE";
    status_display?: string;
    created_at: string;
    updated_at: string;
    group: PropertyGroupBasic | null;
    group_id?: string | null;
    group_name?: string | null;
    area_summary?: string;
    type_display?: string;
}

interface PropertyListProps {
    properties: PropertyDetail[];
    handleEditProperty: (e: React.MouseEvent, id: number) => void;
    handleDeleteRequest: (e: React.MouseEvent, property: PropertyDetail) => void;
    handleCreateListing: () => void;
    getStatusColor: (status?: PropertyDetail['status']) => string;
    getCategoryColor: (category?: PropertyDetail['property_category']) => string;
    formatStatus: (status?: PropertyDetail['status']) => string;
    formatCategory: (category?: PropertyDetail['property_category']) => string;
    searchTerm: string;
    tabType: string;
}

// --- DetailItem Helper ---
interface DetailItemProps {
    icon: React.ElementType;
    value: string | number | null | undefined;
    label?: string;
}

function DetailItem({ icon: Icon, value, label }: DetailItemProps) {
    const displayValue = (value === null || value === undefined || value === '') ? '-' : String(value);
    const title = label ? `${label}: ${displayValue}` : displayValue;
    if (displayValue === '-' && value !== 0) return null;
    return (
        <div className="flex items-center space-x-1.5" title={title}>
            <Icon className="h-4 w-4 text-slate-500 flex-shrink-0" aria-hidden="true" />
            <span className="truncate text-slate-800 text-sm">{displayValue}</span>
        </div>
    );
}

// ================================================================================
// PropertyList Component (Main Export)
// ================================================================================
export function PropertyList({
  properties,
  handleEditProperty,
  handleDeleteRequest,
  handleCreateListing,
  getStatusColor,
  getCategoryColor,
  formatStatus,
  formatCategory,
  searchTerm,
  tabType
}: PropertyListProps) {
  const router = useRouter();

  // --- Sorting Logic ---
  const sortedProperties = React.useMemo(() => {
    if (!properties) return [];
    return [...properties].sort((a, b) => {
      const groupA = a.group?.name ?? a.group_name ?? null;
      const groupB = b.group?.name ?? b.group_name ?? null;
      if (groupA === null && groupB !== null) return 1;
      if (groupA !== null && groupB === null) return -1;
      if (groupA !== null && groupB !== null) {
        const groupCompare = groupA.localeCompare(groupB);
        if (groupCompare !== 0) return groupCompare;
      }
      return (a.name ?? '').localeCompare(b.name ?? '');
    });
  }, [properties]);

  // --- Empty State ---
  if (!sortedProperties || sortedProperties.length === 0) {
     let emptyMessage = "You haven't added any properties yet.";
     let actionText = "Add Your First Property";
     if (searchTerm) {
         emptyMessage = `No properties match "${searchTerm}". Try refining your search.`;
         actionText = "Add Property";
     } else if (tabType !== "all") {
         emptyMessage = `No properties found for the "${tabType}" filter.`;
         const actionType = tabType === 'units' ? 'Unit' : tabType === 'rooms' ? 'Room' : 'Property';
         actionText = `Add ${actionType}`;
     }
     return (
         <Card className="mt-4 border-dashed border-slate-300 bg-slate-50/50 col-span-1 md:col-span-2 xl:col-span-3">
            <CardContent className="p-8 text-center flex flex-col items-center">
                <Building2 className="h-16 w-16 text-slate-300 mb-4" />
                <h3 className="text-xl font-medium text-slate-700 mb-1">No Properties Found</h3>
                <p className="text-sm text-slate-500 mb-5 max-w-sm">{emptyMessage}</p>
                <Button className="bg-slate-900 hover:bg-slate-800" onClick={handleCreateListing}>
                    <Plus className="h-4 w-4 mr-1.5" /> {actionText}
                </Button>
            </CardContent>
        </Card>
     );
  }

  // --- Group Headers Logic (IMPROVED) ---
  // Map groups to arrays of properties
  const propertiesByGroup = React.useMemo(() => {
    const grouped = new Map<string | null, PropertyDetail[]>();
    
    // Initialize with an empty array for properties with no group
    grouped.set(null, []);
    
    // Group properties
    sortedProperties.forEach(property => {
      const groupId = property.group?.id ?? property.group_id ?? null;
      const groupName = property.group?.name ?? property.group_name ?? null;
      
      // Use group ID as the key if available, otherwise use group name
      const key = groupId || groupName;
      
      if (!grouped.has(key)) {
        grouped.set(key, []);
      }
      
      grouped.get(key)!.push(property);
    });
    
    return grouped;
  }, [sortedProperties]);

  return (
    <div className="space-y-6">
      {/* Render ungrouped properties first */}
      {propertiesByGroup.get(null)?.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 lg:gap-6">
          {propertiesByGroup.get(null)!.map(property => renderPropertyCard(property))}
        </div>
      )}
      
      {/* Then render each group with a header */}
      {Array.from(propertiesByGroup.entries())
        .filter(([key]) => key !== null)
        .map(([key, properties]) => {
          const groupName = properties[0]?.group?.name ?? properties[0]?.group_name;
          if (!groupName) return null;
          
          return (
            <div key={`group-${key}`} className="space-y-4">
              {/* Group Header */}
              <div className="border-b border-slate-200 pb-2">
                <h2 className="text-lg font-semibold text-indigo-700 flex items-center">
                  <Group className="mr-2 h-5 w-5" /> {groupName}
                </h2>
              </div>
              
              {/* Properties in this group */}
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 lg:gap-6">
                {properties.map(property => renderPropertyCard(property))}
              </div>
            </div>
          );
        })}
    </div>
  );

  // Helper function to render a property card
  function renderPropertyCard(property: PropertyDetail) {
    if (!property || typeof property !== 'object' || !property.id) {
      console.warn("Skipping invalid property data:", property);
      return null;
    }
    
    const imageUrl = getFullImageUrl(property.primary_image);
    
    // Use display values from API directly when available
    const categoryDisplay = property.property_category_display || formatCategory(property.property_category);
    const statusDisplay = property.status_display || formatStatus(property.status);
    
    // Support both type_display directly from API and derived values from type fields
    const typeDetailDisplay = property.type_display || 
      (property.property_category === 'COMPLETE_UNIT' ? 
        (property.unit_type_display || (property.unit_type ? capitalize(property.unit_type.replace('_', ' ')) : '-')) : 
        (property.room_type_display || (property.room_type ? capitalize(property.room_type.replace('_', ' ')) : '-')));

    return (
      <div
        key={`property-${property.id}`}
        className={cn("cursor-pointer group rounded-lg border bg-card text-card-foreground shadow-sm hover:shadow-md transition-shadow duration-200 flex flex-col overflow-hidden h-full")}
        onClick={() => router.push(`/dashboard/properties/${property.id}`)}
        role="link" 
        aria-label={`View details for ${property.name || 'Unnamed Property'}`} 
        tabIndex={0}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') router.push(`/dashboard/properties/${property.id}`) }}
      >
        <div className="relative bg-slate-100 border-b w-full h-80 overflow-hidden">
          {imageUrl ? ( 
            <img 
              src={imageUrl} 
              alt={`Image of ${property.name || 'Property'}`} 
              className="w-full h-full object-cover" 
              loading="lazy" 
              onError={(e) => { 
                const target = e.target as HTMLImageElement;
                if (target.src !== '/placeholder.svg') { 
                  target.src = '/placeholder.svg'; 
                } 
              }} 
            />
          ) : ( 
            <div className="w-full h-full flex items-center justify-center text-slate-400 bg-slate-200"> 
              <ImageIcon className="h-12 w-12" /> 
            </div> 
          )}
          <div className="absolute top-2 left-2 flex flex-col gap-1.5 items-start z-10">
             <Badge variant="outline" className={`text-xs px-1.5 py-0.5 ${getCategoryColor(property.property_category)} backdrop-blur-sm bg-white/70 shadow-sm`}> {categoryDisplay} </Badge>
             <Badge variant="outline" className={`text-xs px-1.5 py-0.5 ${getStatusColor(property.status)} backdrop-blur-sm bg-white/70 shadow-sm`}> {statusDisplay} </Badge>
          </div>
        </div>
        <div className="p-4 flex-1 flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-start mb-1">
              <h3 className="font-semibold text-lg leading-tight truncate pr-2" title={property.name || ''}> {property.name || '-'} </h3>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-8 w-8 shrink-0 text-slate-500 hover:text-slate-900 focus-visible:ring-1 focus-visible:ring-ring" 
                    onClick={(e) => e.stopPropagation()} 
                    aria-label="Property Actions"
                  >
                    <MoreHorizontal className="h-5 w-5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                  <DropdownMenuItem onClick={(e) => handleEditProperty(e, property.id)}>
                    <Edit className="mr-2 h-4 w-4" /> Edit
                  </DropdownMenuItem>
                  <DropdownMenuItem className="text-red-600 focus:text-red-700 focus:bg-red-50" onClick={(e) => handleDeleteRequest(e, property)}>
                    <Trash2 className="mr-2 h-4 w-4" /> Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
            <div className="flex items-center text-sm text-slate-500 mb-4">
              <MapPin className="h-4 w-4 mr-1.5 flex-shrink-0" />
              <span className="truncate" title={`${property.address || ''}, ${property.city || ''}`}> 
                {property.address || '-'}, {property.city || '-'} 
              </span>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-x-4 gap-y-2 mt-auto pt-3 border-t border-slate-100">
            <DetailItem 
              icon={property.property_category === 'COMPLETE_UNIT' ? Home : Key} 
              value={typeDetailDisplay} 
              label={property.property_category === 'COMPLETE_UNIT' ? "Unit Type" : "Room Type"} 
            />
            {property.property_category === 'COMPLETE_UNIT' && (
              <>
                <DetailItem icon={Bed} value={property.bedrooms} label="Bedrooms" />
                <DetailItem icon={Bath} value={property.bathrooms} label="Bathrooms"/> 
              </>
            )}
            <DetailItem icon={Square} value={property.square_footage ? `${property.square_footage} sq ft` : null} label="Size" />
            <DetailItem icon={Users} value={property.max_occupancy} label="Max Occupancy"/>
            
            {/* Added area_summary display */}
            {property.area_summary && property.area_summary !== "No areas defined" && (
              <div className="col-span-2 mt-1">
                <DetailItem icon={Info} value={property.area_summary} label="Areas" />
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }
}