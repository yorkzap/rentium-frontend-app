// src/components/dashboard/landlord/properties/AreaList.tsx
"use client";

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { MoreHorizontal, Edit, Trash2, Home, Users, Lock } from "lucide-react"; // Added Lock icon
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

// Updated interface matching PropertyAreaSerializer (with is_private_to_room)
export interface AreaData {
    id: number;
    property: number; // Or string depending on API
    area_type: string; // e.g., 'KITCHEN', 'BATHROOM'
    area_type_display: string; // e.g., 'Kitchen', 'Bathroom'
    count: number;
    is_shared: boolean;          // Shared with group?
    is_private_to_room: boolean; // Exclusive to this room?
    description?: string | null;
    created_at: string;
    updated_at: string;
}

interface AreaListProps {
    areas: AreaData[];
    onEdit: (area: AreaData) => void;
    onDelete: (areaId: number) => void;
    isLoading?: boolean;
    propertyCategory?: 'ROOM' | 'COMPLETE_UNIT'; // Pass category to adjust display (optional, but good practice)
}

export default function AreaList({ areas, onEdit, onDelete, isLoading = false, propertyCategory }: AreaListProps) {

    // Function to determine the display status based on flags
    const getStatusInfo = (area: AreaData): { icon: React.ElementType; text: string; tooltip: string; variant: 'outline' | 'secondary' | 'default' } => {
        if (area.is_private_to_room && propertyCategory === 'ROOM') { // Check category for clarity
            return { icon: Lock, text: "Private (Room)", tooltip: "Exclusive to this Room", variant: 'default' };
        } else if (area.is_shared && propertyCategory === 'ROOM') { // Check category for clarity
            return { icon: Users, text: "Shared (Group)", tooltip: "Shared with Group", variant: 'secondary' };
        } else {
            // Default: General private area (within unit or room, but not group-shared or room-exclusive)
            return { icon: Home, text: "Private (General)", tooltip: "General Private Area", variant: 'outline' };
        }
    };

    if (!areas || areas.length === 0) {
        return <p className="text-center text-slate-500 py-6">No specific areas defined yet.</p>;
    }

    return (
        <TooltipProvider>
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Area Type</TableHead>
                        <TableHead className="w-[60px] text-center">Count</TableHead>
                        <TableHead className="w-[140px]">Status</TableHead> {/* Increased width */}
                        <TableHead>Description</TableHead>
                        <TableHead className="w-[60px] text-right">Actions</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {areas.map((area) => {
                        const statusInfo = getStatusInfo(area);
                        return (
                            <TableRow key={area.id}>
                                <TableCell className="font-medium">{area.area_type_display}</TableCell>
                                <TableCell className="text-center">{area.count}</TableCell>
                                <TableCell>
                                    <Tooltip>
                                        <TooltipTrigger asChild>
                                             {/* Wrap Badge in span for tooltip trigger */}
                                            <span className="inline-block">
                                                <Badge variant={statusInfo.variant} className="cursor-help text-xs"> {/* Ensure text-xs */}
                                                    <statusInfo.icon className="h-3 w-3 mr-1 flex-shrink-0" />
                                                    {statusInfo.text}
                                                </Badge>
                                            </span>
                                        </TooltipTrigger>
                                        <TooltipContent><p>{statusInfo.tooltip}</p></TooltipContent>
                                    </Tooltip>
                                </TableCell>
                                <TableCell className="text-sm text-slate-600">{area.description || <span className="text-slate-400">-</span>}</TableCell>
                                <TableCell className="text-right">
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8" disabled={isLoading}><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                                        <DropdownMenuContent align="end">
                                            <DropdownMenuItem onClick={() => onEdit(area)}><Edit className="mr-2 h-4 w-4" /> Edit</DropdownMenuItem>
                                            <DropdownMenuItem className="text-red-600 focus:text-red-600" onClick={() => onDelete(area.id)}><Trash2 className="mr-2 h-4 w-4" /> Delete</DropdownMenuItem>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </TableCell>
                            </TableRow>
                        );
                    })}
                </TableBody>
            </Table>
        </TooltipProvider>
    );
}