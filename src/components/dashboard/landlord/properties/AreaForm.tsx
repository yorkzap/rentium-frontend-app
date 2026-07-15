// AreaForm.tsx
"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { toast } from "sonner"; // was missing before — adjust import to your toast lib
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogClose } from "@/components/ui/dialog";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Loader2, Users } from "lucide-react";
import { AreaData } from "./AreaList";
import { AREA_TYPE_CHOICES } from "./constants";

// Sibling ROOM property in the same group (candidates for sharing)
export interface GroupSibling {
    id: number;
    name: string;
}

// Zod schema — status radio replaced by a list of property IDs to share with
const areaFormSchema = z.object({
    area_type: z.string({ required_error: "Area type required." }).min(1),
    count: z.coerce.number().int().min(1, { message: "Count must be >= 1." }),
    description: z.string().optional().or(z.literal("")),
    shared_with_ids: z.array(z.number()).default([]),
});

type AreaFormData = z.infer<typeof areaFormSchema>;

// Matches the refactored PropertyAreaSerializer write contract
export interface AreaApiPayload {
    area_type: string;
    count: number;
    description?: string | null;
    shared_by: number[]; // [] = private; [primaryId, ...siblingIds] = shared
}

interface AreaFormProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (data: AreaApiPayload, areaId?: number) => Promise<boolean>;
    areaToEdit: AreaData | null;
    propertyCategory: "COMPLETE_UNIT" | "ROOM" | undefined | null;
    /** ID of the property this form is nested under (/properties/{id}/areas/). */
    propertyId: number;
    /** Other ROOM properties in the same group that this area could be shared with.
     *  Pass [] (or omit) for COMPLETE_UNIT or ungrouped rooms — sharing UI hides itself. */
    groupSiblings?: GroupSibling[];
}

export default function AreaForm({
    isOpen,
    onClose,
    onSubmit,
    areaToEdit,
    propertyCategory,
    propertyId,
    groupSiblings = [],
}: AreaFormProps) {
    const [isSubmitting, setIsSubmitting] = useState(false);
    const isEditMode = !!areaToEdit;
    const isRoom = propertyCategory === "ROOM";
    // Sharing only makes sense for a ROOM that actually has grouped siblings
    const canShare = isRoom && groupSiblings.length > 0;

    const form = useForm<AreaFormData>({
        resolver: zodResolver(areaFormSchema),
        defaultValues: { area_type: "", count: 1, description: "", shared_with_ids: [] },
    });

    useEffect(() => {
        if (isOpen) {
            // Pre-select siblings already in shared_by (excluding this property itself)
            const existingShared = (areaToEdit?.shared_by ?? []).filter((id) => id !== propertyId);
            form.reset({
                area_type: areaToEdit?.area_type ?? "",
                count: areaToEdit?.count ?? 1,
                description: areaToEdit?.description ?? "",
                shared_with_ids: canShare ? existingShared : [],
            });
        }
    }, [areaToEdit, isOpen, form, canShare, propertyId]);

    const handleFormSubmit = async (data: AreaFormData) => {
        // Guard: sharing is only valid for grouped ROOMs
        if (!canShare && data.shared_with_ids.length > 0) {
            toast.error(
                propertyCategory === "COMPLETE_UNIT"
                    ? "Areas in a Complete Unit cannot be shared."
                    : "This room must belong to a group before areas can be shared.",
            );
            return;
        }

        // Backend convention: shared_by includes the primary property + the sharing
        // siblings when shared, and is empty when private.
        const shared_by =
            data.shared_with_ids.length > 0 ? [propertyId, ...data.shared_with_ids] : [];

        const payload: AreaApiPayload = {
            area_type: data.area_type,
            count: data.count,
            description: data.description || null,
            shared_by,
        };

        setIsSubmitting(true);
        const success = await onSubmit(payload, areaToEdit?.id);
        setIsSubmitting(false);
        if (success) {
            form.reset();
            onClose();
        }
    };

    const handleOpenChange = (open: boolean) => {
        if (!isSubmitting && !open) onClose();
    };

    return (
        <Dialog open={isOpen} onOpenChange={handleOpenChange}>
            <DialogContent className="sm:max-w-[480px]">
                <DialogHeader>
                    <DialogTitle>{isEditMode ? "Edit Area" : "Add New Area"}</DialogTitle>
                    <DialogDescription>
                        {isEditMode ? "Update details." : "Define an area for this property."}
                    </DialogDescription>
                </DialogHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-4 py-2">
                        <FormField control={form.control} name="area_type" render={({ field }) => (
                            <FormItem>
                                <FormLabel>Area Type*</FormLabel>
                                <Select onValueChange={field.onChange} value={field.value ?? ""} required>
                                    <FormControl>
                                        <SelectTrigger><SelectValue placeholder="Select area type..." /></SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                        {AREA_TYPE_CHOICES.map((choice) => (
                                            <SelectItem key={choice.value} value={choice.value}>{choice.label}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <FormMessage />
                            </FormItem>
                        )} />

                        <FormField control={form.control} name="count" render={({ field }) => (
                            <FormItem>
                                <FormLabel>Count*</FormLabel>
                                <FormControl><Input type="number" min="1" {...field} /></FormControl>
                                <FormDescription>How many?</FormDescription>
                                <FormMessage />
                            </FormItem>
                        )} />

                        <FormField control={form.control} name="description" render={({ field }) => (
                            <FormItem>
                                <FormLabel>Description</FormLabel>
                                <FormControl>
                                    <Textarea placeholder="Optional details..." {...field} value={field.value ?? ""} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )} />

                        {/* --- Sharing (replaces the old 3-way status radio) --- */}
                        {canShare && (
                            <FormField control={form.control} name="shared_with_ids" render={({ field }) => (
                                <FormItem className="space-y-2">
                                    <FormLabel className="flex items-center gap-1.5">
                                        <Users className="h-4 w-4" /> Share with rooms in this group
                                    </FormLabel>
                                    <FormDescription>
                                        Leave all unchecked to keep this area private to this room.
                                    </FormDescription>
                                    <FormControl>
                                        <div className="space-y-1 rounded-md border p-3">
                                            {groupSiblings.map((sibling) => {
                                                const checked = field.value.includes(sibling.id);
                                                return (
                                                    <div key={sibling.id} className="flex items-center space-x-3 py-1">
                                                        <Checkbox
                                                            id={`share-${sibling.id}`}
                                                            checked={checked}
                                                            onCheckedChange={(isChecked) => {
                                                                field.onChange(
                                                                    isChecked
                                                                        ? [...field.value, sibling.id]
                                                                        : field.value.filter((id) => id !== sibling.id),
                                                                );
                                                            }}
                                                        />
                                                        <Label htmlFor={`share-${sibling.id}`} className="cursor-pointer font-normal">
                                                            {sibling.name}
                                                        </Label>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )} />
                        )}

                        {!canShare && isRoom && (
                            <p className="text-xs text-muted-foreground border rounded-md p-3">
                                This room is not in a group (or has no grouped siblings), so this
                                area will be private to this room.
                            </p>
                        )}

                        <DialogFooter>
                            <DialogClose asChild>
                                <Button type="button" variant="outline" disabled={isSubmitting}>Cancel</Button>
                            </DialogClose>
                            <Button type="submit" disabled={isSubmitting}>
                                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                {isEditMode ? "Save Changes" : "Add Area"}
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}