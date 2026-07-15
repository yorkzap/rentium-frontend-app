// src/components/dashboard/landlord/properties/GroupList.tsx
"use client";
import React from "react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Home, Plus, Users, ChevronRight, MoreHorizontal, Trash2, Edit,
  Loader2, Tag, Key, Box
} from "lucide-react";
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator
} from "@/components/ui/dropdown-menu";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

// --- Interfaces ---
interface PropertyGroupType {
  id: string;
  name: string;
  description: string | null;
  landlord: number;
  created_at: string;
  updated_at: string;
  // Added fields from API response
  grouped_properties?: GroupedPropertyDetail[];
  shared_items?: SharedInventoryItem[];
}

interface SharedInventoryItem {
  id: number;
  group_name: string;
  name: string;
  description: string | null;
  quantity: number;
  condition: string;
  condition_display: string;
  location_description: string | null;
  created_at: string;
  updated_at: string;
}

interface GroupedPropertyDetail {
  id: number;
  name: string;
  address: string | null;
  city: string | null;
  property_category: "COMPLETE_UNIT" | "ROOM";
  status: "AVAILABLE" | "OCCUPIED" | "MAINTENANCE" | "NOT_AVAILABLE";
}

interface PropertyGroupBasic {
  id: string;
  name: string;
}

interface PropertyDetailSubset {
  id: number;
  name: string;
  group?: PropertyGroupBasic | null;
  group_id?: string | null;
  group_name?: string | null;
}

interface GroupListProps {
  groups: PropertyGroupType[];
  allProperties: PropertyDetailSubset[];
  isLoading: boolean;
  handleDeleteGroup: (groupId: string) => void;
}

// ================================================================================
// GroupList Component
// ================================================================================
export function GroupList({
  groups,
  allProperties,
  isLoading,
  handleDeleteGroup,
}: GroupListProps) {
  const router = useRouter();

  const onDeleteClick = (e: React.MouseEvent, groupId: string) => {
    e.stopPropagation();
    handleDeleteGroup(groupId);
  };

  const onEditClick = (e: React.MouseEvent, groupId: string) => {
    e.stopPropagation();
    // Assuming an edit page exists at this path:
    router.push(`/dashboard/properties/create?type=group&edit=${groupId}`);
  };

  if (isLoading) {
    return (
      <div className="p-8 text-center">
        <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-ink-4" />
        <p className="text-ink-3">Loading property groups...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {groups.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="pt-6 text-center">
            <Users className="h-12 w-12 text-ink-5 mx-auto mb-2" />
            <h3 className="font-medium mb-1">No Property Groups Found</h3>
            <p className="text-sm text-ink-3 mb-4">Create groups to manage rooms with shared areas.</p>
            <Button onClick={() => router.push("/dashboard/properties/create?type=group")} variant="outline">
              <Plus className="h-4 w-4 mr-2" /> Create Your First Group
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {groups.map((group) => {
            // Use grouped_properties from API if available, otherwise filter from allProperties
            const propertiesInThisGroup = group.grouped_properties || 
              allProperties.filter(p => {
                // Check both group object and flat group_id field
                return (p.group?.id === group.id) || (p.group_id === group.id);
              });

            return (
              <Card key={group.id} className="overflow-hidden hover:shadow-md transition-shadow flex flex-col h-full">
                <CardHeader className="bg-indigo-50 pb-3">
                  <div className="flex justify-between items-start gap-2">
                    <div className="flex items-center min-w-0">
                      <Users className="h-5 w-5 text-indigo-600 mr-2 shrink-0" />
                      <CardTitle className="text-lg truncate" title={group.name}>{group.name}</CardTitle>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="h-8 w-8 p-0 shrink-0" 
                          onClick={(e) => e.stopPropagation()} 
                          aria-label={`Actions for group ${group.name}`}
                        >
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                        <DropdownMenuItem onClick={(e) => onEditClick(e, group.id)} className="cursor-pointer">
                          <Edit className="h-4 w-4 mr-2" /> Edit Group
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={(e) => onDeleteClick(e, group.id)} className="cursor-pointer text-red-600 focus:text-red-600">
                          <Trash2 className="h-4 w-4 mr-2" /> Delete Group
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                  <CardDescription className="line-clamp-2 pt-1" title={group.description ?? ''}>
                    {group.description || "No description provided"}
                  </CardDescription>
                </CardHeader>

                <CardContent className="py-3 flex-grow">
                  <div className="space-y-4">
                    {/* Properties Section */}
                    <div>
                      <h4 className="text-xs text-ink-3 font-medium mb-1">Properties ({propertiesInThisGroup.length})</h4>
                      <div className="mt-1 max-h-24 overflow-y-auto pr-1">
                        {propertiesInThisGroup.length > 0 ? (
                          propertiesInThisGroup.map((property) => (
                            <Link
                              href={`/dashboard/properties/${property.id}`}
                              key={property.id}
                              className="flex items-center p-2 rounded-md hover:bg-canvas transition-colors text-sm group/item"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <Home className="h-4 w-4 text-ink-4 mr-2 shrink-0" />
                              <span className="flex-1 font-medium truncate" title={property.name || 'Unnamed Property'}>
                                {property.name || 'Unnamed Property'}
                              </span>
                              {/* Show property category icon */}
                              {property.property_category && (
                                <span className="text-xs text-ink-4 px-1.5 mr-1">
                                  {property.property_category === "ROOM" ? 
                                    <Key className="h-3.5 w-3.5 text-ink-4" /> : 
                                    <Home className="h-3.5 w-3.5 text-ink-4" />
                                  }
                                </span>
                              )}
                              <ChevronRight className="h-4 w-4 text-ink-5 ml-1 shrink-0 opacity-0 group-hover/item:opacity-100 transition-opacity" />
                            </Link>
                          ))
                        ) : (
                          <p className="text-sm text-ink-3 p-2">No properties currently in this group.</p>
                        )}
                      </div>
                    </div>

                    {/* Shared Inventory Section - New */}
                    {group.shared_items && group.shared_items.length > 0 && (
                      <div>
                        <h4 className="text-xs text-ink-3 font-medium mb-1">Shared Items ({group.shared_items.length})</h4>
                        <div className="mt-1 max-h-24 overflow-y-auto pr-1">
                          {group.shared_items.map((item) => (
                            <div key={item.id} className="flex items-center p-2 rounded-md text-sm">
                              <Box className="h-4 w-4 text-ink-4 mr-2 shrink-0" />
                              <span className="flex-1 truncate" title={item.name}>
                                {item.name} {item.quantity > 1 ? `(${item.quantity})` : ''}
                              </span>
                              <span className="text-xs text-ink-4 px-1.5">
                                {item.condition_display}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>

                <CardFooter className="pt-0 pb-3 mt-auto">
                  <Link href={`/dashboard/properties/view-group/${group.id}`} className="w-full" onClick={(e) => e.stopPropagation()}>
                    <Button variant="outline" className="w-full" size="sm">
                      <span className="flex items-center">
                        View Group Details <ChevronRight className="h-4 w-4 ml-1" />
                      </span>
                    </Button>
                  </Link>
                </CardFooter>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}