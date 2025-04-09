// src/components/dashboard/landlord/properties/AreaForm.tsx
"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"; // Use RadioGroup
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogClose } from "@/components/ui/dialog";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Loader2 } from "lucide-react";
import { AreaData } from "./AreaList";
import { AREA_TYPE_CHOICES, AREA_STATUS_OPTIONS, AreaStatusValue } from "./constants"; // Import constants

// Zod Schema using AreaStatusValue
const areaFormSchema = z.object({
    area_type: z.string({ required_error: "Area type required." }).min(1),
    count: z.coerce.number().int().min(1, { message: "Count must be >= 1." }),
    description: z.string().optional().or(z.literal('')),
    status: z.custom<AreaStatusValue>(val => AREA_STATUS_OPTIONS.some(opt => opt.value === val), {
        message: "Please select an area status.",
    }),
});

type AreaFormData = z.infer<typeof areaFormSchema>;

// API Payload needs the boolean flags
interface AreaApiPayload {
    area_type: string;
    count: number;
    description?: string | null;
    is_shared: boolean;
    is_private_to_room: boolean;
}

interface AreaFormProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (data: AreaApiPayload, areaId?: number) => Promise<boolean>;
    areaToEdit: AreaData | null;
    propertyCategory: 'COMPLETE_UNIT' | 'ROOM' | undefined | null;
}

export default function AreaForm({ isOpen, onClose, onSubmit, areaToEdit, propertyCategory }: AreaFormProps) {
    const [isSubmitting, setIsSubmitting] = useState(false);
    const isEditMode = !!areaToEdit;
    const isRoom = propertyCategory === 'ROOM';

    const form = useForm<AreaFormData>({
        resolver: zodResolver(areaFormSchema),
        defaultValues: {
            area_type: "", count: 1, description: "",
            // Default status depends on category
            status: 'private_general',
        },
    });

    // Helper to determine status value from boolean flags
    const getStatusValue = (isShared: boolean, isPrivateToRoom: boolean): AreaStatusValue => {
        if (isPrivateToRoom) return 'private_specific';
        if (isShared) return 'shared_group';
        return 'private_general';
    };

    useEffect(() => {
        if (isOpen) {
            const defaultStatus = getStatusValue(areaToEdit?.is_shared ?? false, areaToEdit?.is_private_to_room ?? false);
            form.reset({
                area_type: areaToEdit?.area_type ?? "",
                count: areaToEdit?.count ?? 1,
                description: areaToEdit?.description ?? "",
                // Set status ensuring it's valid for the category
                status: !isRoom && defaultStatus !== 'private_general' ? 'private_general' : defaultStatus,
            });
        } else {
            // Optionally reset to absolute defaults when closing
            // form.reset({ area_type: "", count: 1, description: "", status: 'private_general' });
        }
    }, [areaToEdit, isOpen, form, isRoom]); // Reset when modal opens or data changes

    const handleFormSubmit = async (data: AreaFormData) => {
        const payload: AreaApiPayload = {
            area_type: data.area_type,
            count: data.count,
            description: data.description || null,
            is_shared: data.status === 'shared_group',
            is_private_to_room: data.status === 'private_specific',
        };

        // Final validation check before API call
        if (propertyCategory === 'COMPLETE_UNIT' && (payload.is_shared || payload.is_private_to_room)) {
            toast.error("Invalid status for Complete Unit."); return;
        }
        if (propertyCategory !== 'ROOM' && payload.is_private_to_room) {
             toast.error("'Private to Room' status requires property category 'ROOM'."); return;
        }

        setIsSubmitting(true);
        const success = await onSubmit(payload, areaToEdit?.id);
        setIsSubmitting(false);
        if (success) {
            form.reset(); onClose();
        }
    };

    const handleOpenChange = (open: boolean) => { if (!isSubmitting) { onClose(); } }

    return (
        <Dialog open={isOpen} onOpenChange={handleOpenChange}>
            <DialogContent className="sm:max-w-[480px]">
                <DialogHeader>
                    <DialogTitle>{isEditMode ? "Edit Area" : "Add New Area"}</DialogTitle>
                    <DialogDescription>{isEditMode ? "Update details." : "Define area."}</DialogDescription>
                </DialogHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-4 py-2">
                        <FormField control={form.control} name="area_type" render={({ field }) => ( <FormItem> <FormLabel>Area Type*</FormLabel> <Select onValueChange={field.onChange} value={field.value ?? ""} required> <FormControl><SelectTrigger><SelectValue placeholder="Select area type..." /></SelectTrigger></FormControl> <SelectContent> {AREA_TYPE_CHOICES.map(choice => ( <SelectItem key={choice.value} value={choice.value}>{choice.label}</SelectItem> ))} </SelectContent> </Select> <FormMessage /> </FormItem> )}/>
                        <FormField control={form.control} name="count" render={({ field }) => ( <FormItem> <FormLabel>Count*</FormLabel> <FormControl><Input type="number" min="1" {...field} /></FormControl> <FormDescription>How many?</FormDescription> <FormMessage /> </FormItem> )}/>
                        <FormField control={form.control} name="description" render={({ field }) => ( <FormItem> <FormLabel>Description</FormLabel> <FormControl><Textarea placeholder="Optional details..." {...field} value={field.value ?? ''} /></FormControl> <FormMessage /> </FormItem> )}/>

                        {/* --- Status Radio Group --- */}
                        <FormField control={form.control} name="status" render={({ field }) => (
                            <FormItem className="space-y-3">
                                <FormLabel>Area Status*</FormLabel>
                                <FormControl>
                                    <RadioGroup onValueChange={field.onChange} value={field.value} className="space-y-1" >
                                        {AREA_STATUS_OPTIONS.map(option => {
                                            // Determine if the option should be disabled
                                            const isDisabled = (propertyCategory === 'COMPLETE_UNIT' && option.value !== 'private_general') || // Only allow general private for units
                                                               (propertyCategory !== 'ROOM' && (option.value === 'private_specific' || option.value === 'shared_group')); // Only allow general private if not a room

                                            return (
                                                <FormItem key={option.value} className={`flex items-start space-x-3 space-y-0 border p-3 rounded-md ${isDisabled ? 'opacity-50 cursor-not-allowed' : ''}`}>
                                                    <FormControl> <RadioGroupItem value={option.value} disabled={isDisabled} id={`status-${option.value}`} /> </FormControl>
                                                    <div className="grid gap-1.5 leading-none">
                                                        <Label htmlFor={`status-${option.value}`} className={`font-medium ${isDisabled ? 'cursor-not-allowed' : 'cursor-pointer'}`}> {option.label} </Label>
                                                        <p className={`text-xs text-muted-foreground ${isDisabled ? 'cursor-not-allowed' : ''}`}> {option.description} </p>
                                                    </div>
                                                </FormItem>
                                            );
                                        })}
                                    </RadioGroup>
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}/>

                        <DialogFooter>
                           <DialogClose asChild><Button type="button" variant="outline" disabled={isSubmitting}>Cancel</Button></DialogClose>
                            <Button type="submit" disabled={isSubmitting}> {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} {isEditMode ? "Save Changes" : "Add Area"} </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}