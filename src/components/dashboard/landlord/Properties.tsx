// Properties.tsx
"use client";
import React, { useState, useEffect, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Building2, Plus, Search, Home, Users, Loader2, Edit, Trash2
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { useRouter, useSearchParams } from "next/navigation";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { DJANGO_API_URL } from "@/lib/config";
import { capitalize, formatStatus } from "@/lib/utils"; // Assuming utility functions

// --- CORRECTED IMPORTS ---
import { PropertyList } from "./properties/PropertyList"; // Named import for named export
import { GroupList } from "./properties/GroupList";       // Named import for named export
// -------------------------

// --- Interfaces (Assuming these match your latest backend structure) ---
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
    primary_image: string | null;
    additional_images: any[];
    unit_type: string | null;
    bedrooms: number | null;
    bathrooms: string | number | null;
    max_occupancy: number | null;
    square_footage: number | null;
    room_type: string | null;
    total_washrooms: number | null;
    other_rooms: string | null;
    shared_with: string | null;
    status: "AVAILABLE" | "OCCUPIED" | "MAINTENANCE" | "NOT_AVAILABLE";
    created_at: string;
    updated_at: string;
    group: PropertyGroupBasic | null;
}

interface PropertyGroupListData {
  id: string;
  name: string;
  description: string | null;
  landlord: number;
  created_at: string;
  updated_at: string;
}


// ================================================================================
// AssetManagement Component (Main Page)
// ================================================================================
export default function AssetManagement() {
  // --- State ---
  const router = useRouter();
  const searchParams = useSearchParams();
  const { token } = useAuth();

  const [searchTerm, setSearchTerm] = useState("");
  const [deletePropDialogOpen, setDeletePropDialogOpen] = useState(false);
  const [deleteGroupDialogOpen, setDeleteGroupDialogOpen] = useState(false);
  const [propertyToDelete, setPropertyToDelete] = useState<PropertyDetail | null>(null);
  const [groupToDeleteId, setGroupToDeleteId] = useState<string | null>(null);
  const [properties, setProperties] = useState<PropertyDetail[]>([]);
  const [groups, setGroups] = useState<PropertyGroupListData[]>([]);
  const [isLoadingProps, setIsLoadingProps] = useState(true);
  const [isLoadingGroups, setIsLoadingGroups] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const initialViewMode = searchParams.get('view') === 'groups' ? 'groups' : 'properties';
  const [viewMode, setViewMode] = useState<"properties" | "groups">(initialViewMode);
  const [categoryTab, setCategoryTab] = useState("all");

  // --- Utility Functions ---
  const getStatusColor = (status?: PropertyDetail['status']): string => {
    switch (status) {
      case "AVAILABLE": return "bg-green-100 text-green-800 border-green-200";
      case "OCCUPIED": return "bg-blue-100 text-blue-800 border-blue-200";
      case "MAINTENANCE": return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "NOT_AVAILABLE": return "bg-red-100 text-red-800 border-red-200";
      default: return "bg-slate-100 text-slate-800 border-slate-200";
    }
  };

  const getCategoryColor = (category?: PropertyDetail['property_category']): string => {
    switch (category) {
      case "COMPLETE_UNIT": return "bg-purple-100 text-purple-800 border-purple-200";
      case "ROOM": return "bg-cyan-100 text-cyan-800 border-cyan-200";
      default: return "bg-slate-100 text-slate-800 border-slate-200";
    }
  };

  const formatCategory = (category?: PropertyDetail['property_category']): string => {
    if (!category) return '-';
    return category === 'COMPLETE_UNIT' ? 'Complete Unit' : 'Room';
  };

  // --- Fetch Data ---
  const fetchData = useCallback(async () => {
      if (!token) {
          setIsLoadingProps(false); setIsLoadingGroups(false); setError("Authentication token missing."); return;
      }
      setIsLoadingProps(true); setIsLoadingGroups(true); setError(null);
      console.log("Starting data fetch...");

      try {
          const propPromise = fetch(`${DJANGO_API_URL}/properties/`, { headers: { 'Authorization': `Token ${token}` } });
          const groupPromise = fetch(`${DJANGO_API_URL}/properties/groups/`, { headers: { 'Authorization': `Token ${token}` } });

          const [propResponse, groupResponse] = await Promise.all([propPromise, groupPromise]);

          // Process Properties
          if (!propResponse.ok) throw new Error(`Failed property fetch (${propResponse.status})`);
          const propsData: PropertyDetail[] = await propResponse.json();
          setProperties(propsData);
          console.log(`Fetched ${propsData.length} properties.`);
          setIsLoadingProps(false);

          // Process Groups
          if (!groupResponse.ok) throw new Error(`Failed group fetch (${groupResponse.status})`);
          const groupsData: PropertyGroupListData[] = await groupResponse.json();
          setGroups(groupsData);
          console.log(`Fetched ${groupsData.length} groups.`);
          setIsLoadingGroups(false);

      } catch (fetchError) {
          const msg = fetchError instanceof Error ? fetchError.message : 'Unknown data fetch error';
          setError(msg); toast.error(`Data Load Error: ${msg}`);
          setProperties([]); setGroups([]); setIsLoadingProps(false); setIsLoadingGroups(false);
      }
  }, [token]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // --- Filtering Logic ---
  const getFilteredProperties = useCallback(() => {
      if (!Array.isArray(properties)) return [];
      const lowerSearch = searchTerm.toLowerCase();
      let searched = properties.filter(p => p && (
          p.name?.toLowerCase().includes(lowerSearch) ||
          p.address?.toLowerCase().includes(lowerSearch) ||
          p.city?.toLowerCase().includes(lowerSearch) ||
          p.group?.name?.toLowerCase().includes(lowerSearch)
      ));
      switch (categoryTab) {
          case "units": return searched.filter(p => p.property_category === "COMPLETE_UNIT");
          case "rooms": return searched.filter(p => p.property_category === "ROOM");
          case "available": return searched.filter(p => p.status === "AVAILABLE");
          case "occupied": return searched.filter(p => p.status === "OCCUPIED");
          case "maintenance": return searched.filter(p => p.status === "MAINTENANCE");
          case "not_available": return searched.filter(p => p.status === "NOT_AVAILABLE");
          default: return searched;
      }
  }, [properties, searchTerm, categoryTab]);
  const filteredProperties = getFilteredProperties();
  const filteredGroups = groups.filter(g => g.name?.toLowerCase().includes(searchTerm.toLowerCase()));

  // --- Counts ---
  const categoryCounts = React.useMemo(() => ({
      all: properties?.length ?? 0,
      units: properties?.filter(p => p.property_category === "COMPLETE_UNIT").length ?? 0,
      rooms: properties?.filter(p => p.property_category === "ROOM").length ?? 0,
      available: properties?.filter(p => p.status === "AVAILABLE").length ?? 0,
      occupied: properties?.filter(p => p.status === "OCCUPIED").length ?? 0,
      maintenance: properties?.filter(p => p.status === "MAINTENANCE").length ?? 0,
      not_available: properties?.filter(p => p.status === "NOT_AVAILABLE").length ?? 0,
  }), [properties]);

  // --- Event Handlers ---
  const handleCreate = () => router.push(`/dashboard/properties/create?type=${viewMode === 'groups' ? 'group' : 'property'}`);
  const handleEditProperty = (e: React.MouseEvent, id: number) => { e.stopPropagation(); router.push(`/dashboard/properties/edit/${id}`); };
  const handleDeletePropertyRequest = (e: React.MouseEvent, prop: PropertyDetail) => { e.stopPropagation(); setPropertyToDelete(prop); setDeletePropDialogOpen(true); };
  const handleDeleteGroupRequest = (id: string) => { setGroupToDeleteId(id); setDeleteGroupDialogOpen(true); };

  // --- Delete Confirmations ---
  const confirmDeleteProperty = async () => {
      if (!propertyToDelete || !token) return;
      const { id, name } = propertyToDelete;
      setIsDeleting(true);
      try {
          const res = await fetch(`${DJANGO_API_URL}/properties/${id}/`, { method: 'DELETE', headers: { 'Authorization': `Token ${token}` } });
          if (!res.ok && res.status !== 204) throw new Error(`Delete failed (${res.status})`);
          setProperties(prev => prev.filter(p => p.id !== id)); toast.success(`Property "${name}" deleted.`);
          setDeletePropDialogOpen(false);
      } catch (err) { toast.error(`Error deleting property: ${err instanceof Error ? err.message : 'Unknown'}`); }
      finally { setIsDeleting(false); setPropertyToDelete(null); }
  };

  const confirmDeleteGroup = async () => {
      if (!groupToDeleteId || !token) return;
      const name = groups.find(g => g.id === groupToDeleteId)?.name ?? 'Unknown Group';
      setIsDeleting(true);
      try {
          const res = await fetch(`{DJANGO_API_URL}/property-groups/${groupToDeleteId}/`, { method: 'DELETE', headers: { 'Authorization': `Token ${token}` } });
           if (!res.ok && res.status !== 204) throw new Error(`Delete failed (${res.status})`);
          setGroups(prev => prev.filter(g => g.id !== groupToDeleteId)); toast.success(`Group "${name}" deleted.`);
          setProperties(prev => prev.map(p => p.group?.id === groupToDeleteId ? { ...p, group: null } : p));
          setDeleteGroupDialogOpen(false);
      } catch (err) { toast.error(`Error deleting group: ${err instanceof Error ? err.message : 'Unknown'}`); }
      finally { setIsDeleting(false); setGroupToDeleteId(null); }
  };

  // --- Render Loading/Error ---
  const isLoading = isLoadingProps || isLoadingGroups;
  if (isLoading) {
     return (
      <div className="flex items-center justify-center min-h-[calc(100vh-200px)]">
        <div className="flex flex-col items-center gap-2">
          <Loader2 className="h-10 w-10 animate-spin text-teal-600" />
          <p className="text-sm text-muted-foreground">Loading Properties & Groups...</p>
        </div>
      </div>
    );
   }
  if (error && properties.length === 0 && groups.length === 0) {
      return (
        <div className="space-y-6">
          <Card className="border-destructive/50 bg-destructive/5">
            <CardContent className="p-6 text-center">
              <Building2 className="h-12 w-12 text-destructive mx-auto mb-3" />
              <h3 className="text-lg font-semibold text-destructive">Error Loading Data</h3>
              <p className="text-sm text-destructive/90 mt-1 mb-4">{error}</p>
              <Button variant="outline" onClick={fetchData}> Retry </Button>
            </CardContent>
          </Card>
        </div>
      );
   }

  // --- Render Main Page ---
  return (
    <div className="space-y-6 lg:space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-semibold text-slate-900">Your Properties</h1>
          <p className="text-slate-600 text-sm mt-1">Overview and manage your property listings and groups.</p>
        </div>
        <div className="flex w-full sm:w-auto items-center space-x-2">
          <div className="relative flex-grow sm:flex-grow-0">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
            <Input type="search" placeholder="Search properties or groups..." className="pl-9 w-full sm:w-64" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} aria-label="Search properties or groups"/>
          </div>
          <Button className="bg-slate-900 hover:bg-slate-800 whitespace-nowrap shrink-0" onClick={handleCreate}>
            <Plus className="h-4 w-4 mr-1.5" /> {viewMode === 'groups' ? 'Create Group' : 'Add Property'}
          </Button>
        </div>
      </div>

      {/* Main Tabs: Properties vs Groups */}
      <Tabs defaultValue={initialViewMode} value={viewMode} onValueChange={(value) => setViewMode(value as "properties" | "groups")}>
        <TabsList className="w-full md:w-auto inline-flex h-10 items-center justify-center rounded-md bg-muted p-1 text-muted-foreground overflow-x-auto">
           <TabsTrigger value="properties" className="inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm">
              <Home className="h-4 w-4 mr-2 shrink-0" /> Properties ({categoryCounts.all})
            </TabsTrigger>
            <TabsTrigger value="groups" className="inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm">
              <Users className="h-4 w-4 mr-2 shrink-0" /> Property Groups ({groups?.length ?? 0})
            </TabsTrigger>
        </TabsList>

        {/* Properties Tab Content */}
        <TabsContent value="properties" className="mt-6">
          {/* FIXED: Restructured the nested tabs to avoid potential React.Children.only issues */}
          <div className="space-y-4">
            {/* Category Tabs */}
            <div className="overflow-x-auto pb-2">
              <Tabs defaultValue="all" value={categoryTab} onValueChange={setCategoryTab}>
                <TabsList className="inline-flex h-9 items-center justify-center rounded-lg bg-muted p-1 text-muted-foreground w-max">
                  <TabsTrigger value="all" className="inline-flex items-center justify-center whitespace-nowrap rounded-md px-3 py-1 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow">All ({categoryCounts.all})</TabsTrigger>
                  <TabsTrigger value="units" className="inline-flex items-center justify-center whitespace-nowrap rounded-md px-3 py-1 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow">Units ({categoryCounts.units})</TabsTrigger>
                  <TabsTrigger value="rooms" className="inline-flex items-center justify-center whitespace-nowrap rounded-md px-3 py-1 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow">Rooms ({categoryCounts.rooms})</TabsTrigger>
                  <TabsTrigger value="available" className="inline-flex items-center justify-center whitespace-nowrap rounded-md px-3 py-1 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow">Available ({categoryCounts.available})</TabsTrigger>
                  <TabsTrigger value="occupied" className="inline-flex items-center justify-center whitespace-nowrap rounded-md px-3 py-1 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow">Occupied ({categoryCounts.occupied})</TabsTrigger>
                  <TabsTrigger value="maintenance" className="inline-flex items-center justify-center whitespace-nowrap rounded-md px-3 py-1 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow">Maintenance ({categoryCounts.maintenance})</TabsTrigger>
                  <TabsTrigger value="not_available" className="inline-flex items-center justify-center whitespace-nowrap rounded-md px-3 py-1 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow">Unavailable ({categoryCounts.not_available})</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
            
            {/* Property List */}
            <PropertyList
              properties={filteredProperties}
              handleEditProperty={handleEditProperty}
              handleDeleteRequest={handleDeletePropertyRequest}
              handleCreateListing={handleCreate}
              getStatusColor={getStatusColor}
              getCategoryColor={getCategoryColor}
              formatStatus={formatStatus}
              formatCategory={formatCategory}
              searchTerm={searchTerm}
              tabType={categoryTab}
            />
          </div>
        </TabsContent>

        {/* Groups Tab Content */}
        <TabsContent value="groups" className="mt-6">
          {/* Pass groups AND the full properties list down */}
          <GroupList
            groups={filteredGroups}
            allProperties={properties} // Pass the updated properties array
            isLoading={isLoadingGroups}
            handleDeleteGroup={handleDeleteGroupRequest}
          />
        </TabsContent>
      </Tabs>

      {/* Delete Property Dialog */}
      <AlertDialog open={deletePropDialogOpen} onOpenChange={setDeletePropDialogOpen}>
         <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Deletion</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete property <strong className="mx-1 break-words">"{propertyToDelete?.name}"</strong>? This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeletePropDialogOpen(false)} disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteProperty} disabled={isDeleting} className="bg-red-600 hover:bg-red-700">
               {isDeleting ? <Loader2 className="h-4 w-4 mr-2 animate-spin"/> : null} Delete Property
            </AlertDialogAction>
          </AlertDialogFooter>
         </AlertDialogContent>
      </AlertDialog>

       {/* Delete Group Dialog */}
       <AlertDialog open={deleteGroupDialogOpen} onOpenChange={setDeleteGroupDialogOpen}>
         <AlertDialogContent>
           <AlertDialogHeader>
             <AlertDialogTitle>Confirm Group Deletion</AlertDialogTitle>
             <AlertDialogDescription>
               Are you sure you want to delete group <strong className="mx-1 break-words">"{groups?.find(g => g.id === groupToDeleteId)?.name}"</strong>? Properties within this group will become ungrouped. This cannot be undone.
             </AlertDialogDescription>
           </AlertDialogHeader>
           <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeleteGroupDialogOpen(false)} disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteGroup} disabled={isDeleting} className="bg-red-600 hover:bg-red-700">
               {isDeleting ? <Loader2 className="h-4 w-4 mr-2 animate-spin"/> : null} Delete Group
            </AlertDialogAction>
           </AlertDialogFooter>
         </AlertDialogContent>
       </AlertDialog>
    </div>
  );
}