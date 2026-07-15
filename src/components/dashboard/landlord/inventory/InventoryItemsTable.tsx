// src/components/dashboard/landlord/inventory/InventoryItemsTable.tsx
"use client";

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { MoreHorizontal, Edit, Trash2, Users, Home } from "lucide-react"; // Using Users/Home for Type

// *** UPDATED Interface for combined display ***
export interface DisplayInventoryItem {
    id: number;
    itemType: 'private' | 'shared'; // Distinguish item origin
    name: string;
    description?: string | null;
    quantity: number;
    condition?: 'NEW' | 'GOOD' | 'FAIR' | 'POOR' | 'DAMAGED' | 'MISSING' | null;
    condition_display?: string | null;
    location_description?: string | null;
    created_at: string;
    updated_at: string;
    // Original linking fields (might be useful for debugging/context)
    property?: number; // Only for private items
    group?: string; // Only for shared items
}

interface InventoryItemsTableProps {
    items: DisplayInventoryItem[]; // Expect combined list
    onEdit: (item: DisplayInventoryItem) => void; // Pass the whole item with type
    onDelete: (itemId: number, itemType: 'private' | 'shared') => void; // Pass type for delete endpoint
    isLoading: boolean;
}

export default function InventoryItemsTable({ items, onEdit, onDelete, isLoading }: InventoryItemsTableProps) {

    const getConditionBadgeVariant = (condition?: DisplayInventoryItem['condition']): "default" | "secondary" | "destructive" | "outline" => {
        switch (condition) {
            case 'NEW': case 'GOOD': return "default";
            case 'FAIR': return "secondary";
            case 'POOR': case 'DAMAGED': case 'MISSING': return "destructive";
            default: return "outline";
        }
    };

    // No changes needed for the empty state rendering
    if (!items || items.length === 0) {
        return <p className="text-center text-ink-3 py-6">No inventory items found.</p>;
    }

    return (
        // Ensure no whitespace between Table tags if they exist
        <Table>
            <TableHeader>
                <TableRow>
                    <TableHead>Item Name</TableHead><TableHead className="w-[60px] text-center">Qty</TableHead><TableHead className="w-[100px]">Condition</TableHead><TableHead>Location</TableHead><TableHead className="w-[90px]">Type</TableHead><TableHead className="w-[60px] text-right">Actions</TableHead>
                </TableRow>
            </TableHeader>
            {/* Ensure no whitespace between TableHeader and TableBody */}
            <TableBody>
                {items.map((item) => (
                    <TableRow key={`${item.itemType}-${item.id}`}>
                        <TableCell className="font-medium">{item.name}</TableCell>
                        <TableCell className="text-center">{item.quantity}</TableCell>
                        <TableCell>
                            {item.condition_display ? (
                                <Badge variant={getConditionBadgeVariant(item.condition)} className="whitespace-nowrap">{item.condition_display}</Badge>
                            ) : <span className="text-ink-4">-</span>}
                        </TableCell>
                        <TableCell className="text-sm text-ink-2">{item.location_description || <span className="text-ink-4">-</span>}</TableCell>
                        <TableCell>
                            <Badge variant={item.itemType === 'shared' ? 'secondary' : 'outline'} className="text-xs">
                                {item.itemType === 'shared' ? <Users className="h-3 w-3 mr-1" /> : <Home className="h-3 w-3 mr-1" />}
                                {item.itemType === 'shared' ? 'Shared' : 'Private'}
                            </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="icon" className="h-8 w-8" disabled={isLoading}><MoreHorizontal className="h-4 w-4" /></Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                    <DropdownMenuItem onClick={() => onEdit(item)}><Edit className="mr-2 h-4 w-4" /> Edit</DropdownMenuItem>
                                    <DropdownMenuItem className="text-red-600 focus:text-red-600" onClick={() => onDelete(item.id, item.itemType)}><Trash2 className="mr-2 h-4 w-4" /> Delete</DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </TableCell>
                    </TableRow>
                ))}
            </TableBody>
        </Table>
    );
}