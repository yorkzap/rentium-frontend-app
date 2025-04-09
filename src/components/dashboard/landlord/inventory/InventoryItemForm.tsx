// src/components/dashboard/landlord/inventory/InventoryItemForm.tsx
"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
// Checkbox removed
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogClose } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"; // Removed FormDescription for checkbox
import { Loader2 } from "lucide-react";
import { DisplayInventoryItem } from "./InventoryItemsTable"; // Use the combined display type

// Zod schema - Remove is_shared, Add group/property later based on context
const itemSchemaBase = z.object({
    name: z.string().min(2, { message: "Item name is required (min 2 chars)." }),
    description: z.string().optional().or(z.literal('')),
    quantity: z.coerce.number().int().min(1, { message: "Quantity must be at least 1." }),
    condition: z.enum(['NEW', 'GOOD', 'FAIR', 'POOR', 'DAMAGED', 'MISSING']).nullable().optional(),
    location_description: z.string().optional().or(z.literal('')),
});

// Define final data structure needed for API submission (may include property or group)
// Omit fields not sent to backend or handled separately
type ItemApiPayload = Omit<z.infer<typeof itemSchemaBase>, 'property' | 'group'> & {
    property?: number; // For private items
    group?: string; // For shared items
};


interface InventoryItemFormProps {
    isOpen: boolean;
    onClose: () => void;
    // onSubmit now includes itemType to determine the endpoint
    onSubmit: (data: ItemApiPayload, itemType: 'private' | 'shared', itemId?: number) => Promise<boolean>;
    itemToEdit: DisplayInventoryItem | null; // Use the display type which includes itemType
    // We need propertyId for private, groupId for shared
    propertyId: number | null;
    groupId: string | null;
    // The type being added/edited (determined by caller)
    itemTypeToAddOrEdit: 'private' | 'shared';
}

export default function InventoryItemForm({
    isOpen,
    onClose,
    onSubmit,
    itemToEdit,
    propertyId,
    groupId,
    itemTypeToAddOrEdit // Receive the type from the parent
}: InventoryItemFormProps) {
    const [isSubmitting, setIsSubmitting] = useState(false);
    // Determine edit mode based on itemToEdit having a valid ID
    const isEditMode = !!itemToEdit && itemToEdit.id > 0;

    const form = useForm<z.infer<typeof itemSchemaBase>>({ // Use base schema for form fields
        resolver: zodResolver(itemSchemaBase),
        defaultValues: {
            name: "", description: "", quantity: 1, condition: null, location_description: "",
        },
    });

    useEffect(() => {
        // Pre-fill form when editing OR quick adding
        form.reset({
            name: itemToEdit?.name ?? "",
            description: itemToEdit?.description ?? "",
            quantity: itemToEdit?.quantity ?? 1,
            condition: itemToEdit?.condition ?? null,
            location_description: itemToEdit?.location_description ?? "",
        });
    }, [itemToEdit, isOpen, form]); // Reset when itemToEdit changes or modal opens

    const handleFormSubmit = async (data: z.infer<typeof itemSchemaBase>) => {
        // Determine target property or group based on the mode
        const targetId = itemTypeToAddOrEdit === 'private' ? propertyId : groupId;
        if (!targetId) {
            console.error(`Missing ${itemTypeToAddOrEdit === 'private' ? 'Property' : 'Group'} ID`);
            toast.error(`Cannot save item: Missing target ${itemTypeToAddOrEdit} ID.`);
            return;
        }

        setIsSubmitting(true);

        // Construct payload including property or group ID
        const payload: ItemApiPayload = { ...data };
        if (itemTypeToAddOrEdit === 'private') {
            payload.property = targetId as number;
        } else {
            payload.group = targetId as string;
        }

        // Use the passed itemTypeToAddOrEdit to call onSubmit
        const success = await onSubmit(payload, itemTypeToAddOrEdit, isEditMode ? itemToEdit?.id : undefined);
        setIsSubmitting(false);
        if (success) {
            form.reset(); // Reset form on successful submit
            onClose(); // Close modal
        }
    };

    const handleOpenChange = (open: boolean) => { if (!isSubmitting) { onClose(); } }

    return (
        <Dialog open={isOpen} onOpenChange={handleOpenChange}>
            <DialogContent className="sm:max-w-[480px]">
                <DialogHeader>
                    <DialogTitle>{isEditMode ? `Edit ${itemTypeToAddOrEdit}` : `Add New ${itemTypeToAddOrEdit}`} Item</DialogTitle>
                    <DialogDescription>
                        {isEditMode ? "Update the details for this item." : `Enter details for the new ${itemTypeToAddOrEdit} item.`}
                    </DialogDescription>
                </DialogHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-4 py-2">
                        {/* Fields common to both private and shared */}
                        <FormField control={form.control} name="name" render={({ field }) => (<FormItem><FormLabel>Item Name*</FormLabel><FormControl><Input placeholder="e.g., Kettle, Bedside Lamp" {...field} /></FormControl><FormMessage /></FormItem>)}/>
                        <FormField control={form.control} name="quantity" render={({ field }) => (<FormItem><FormLabel>Quantity*</FormLabel><FormControl><Input type="number" min="1" {...field} /></FormControl><FormMessage /></FormItem>)}/>
                        <FormField control={form.control} name="condition" render={({ field }) => (
                            <FormItem><FormLabel>Condition</FormLabel><Select onValueChange={field.onChange} value={field.value ?? ""}><FormControl><SelectTrigger><SelectValue placeholder="Select condition (optional)" /></SelectTrigger></FormControl><SelectContent><SelectItem value="NEW">New</SelectItem><SelectItem value="GOOD">Good</SelectItem><SelectItem value="FAIR">Fair</SelectItem><SelectItem value="POOR">Poor</SelectItem><SelectItem value="DAMAGED">Damaged</SelectItem><SelectItem value="MISSING">Missing</SelectItem></SelectContent></Select><FormMessage /></FormItem>
                        )}/>
                        <FormField control={form.control} name="location_description" render={({ field }) => (<FormItem><FormLabel>Location</FormLabel><FormControl><Input placeholder={itemTypeToAddOrEdit === 'shared' ? 'e.g., Shared Kitchen Counter' : 'e.g., Bedroom 1 Closet'} {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>)}/>
                        <FormField control={form.control} name="description" render={({ field }) => (<FormItem><FormLabel>Description / Notes</FormLabel><FormControl><Textarea placeholder="e.g., Model #, purchase date, notes..." {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>)}/>

                        {/* is_shared Checkbox REMOVED */}

                        <DialogFooter>
                           <DialogClose asChild><Button type="button" variant="outline" disabled={isSubmitting}>Cancel</Button></DialogClose>
                            <Button type="submit" disabled={isSubmitting}>
                                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                {isEditMode ? "Save Changes" : "Add Item"}
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}