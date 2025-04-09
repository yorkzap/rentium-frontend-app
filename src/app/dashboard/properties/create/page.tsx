// src/app/dashboard/properties/create/page.tsx
"use client";
import { useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Tabs, TabsContent } from "@/components/ui/tabs"; // Keep for multi-step property form
import {
    ArrowLeft, ArrowRight, Building2, Check, Home, MapPin, Save, Upload, Users, Group,
    Loader2 // Ensure Loader2 is imported
} from "lucide-react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, Controller } from "react-hook-form";
import * as z from "zod";
import { DJANGO_API_URL } from "@/lib/config";
import { Checkbox } from "@/components/ui/checkbox"; // For selecting properties
import { ScrollArea } from "@/components/ui/scroll-area"; // For property list

// --- Interfaces (Simplified for this context) ---
interface MinimalProperty {
    id: number;
    name: string;
    address: string;
    city: string;
    property_category: 'ROOM'; // Only rooms can be added to groups initially
    group: string | null; // To check if already in a group
}

// --- Zod Schemas ---
const propertySchema = z.object({
  // Step 1: Basic Information
  name: z.string().min(3, { message: "Property name must be at least 3 characters" }),
  description: z.string().optional().or(z.literal('')), // Optional description
  property_category: z.enum(["COMPLETE_UNIT", "ROOM"], { required_error: "Category required"}),

  // Step 2: Location
  address: z.string().min(5, { message: "Address must be at least 5 characters" }),
  city: z.string().min(2, { message: "City is required" }),
  province: z.string().min(2, { message: "Province/State is required" }),
  postal_code: z.string().min(5, { message: "Postal/ZIP code is required" }),
  country: z.string().min(2, { message: "Country is required" }).default("Canada"),

  // Step 3: Property Details
  unit_type: z.string().optional(),
  room_type: z.string().optional(),
  bedrooms: z.coerce.number().min(0).optional().nullable(), // Allow null for rooms
  bathrooms: z.coerce.number().min(0).step(0.5).optional().nullable(), // Allow null for rooms
  max_occupancy: z.coerce.number().min(1, { message: "Max occupancy required" }), // Make required
  square_footage: z.coerce.number().min(1, { message: "Square footage required" }), // Make required

  // Step 4: Status
  status: z.enum(["AVAILABLE", "OCCUPIED", "MAINTENANCE", "NOT_AVAILABLE"], { required_error: "Status required" }).default("AVAILABLE"),

  // For assigning to group during creation (Optional) - TODO: Needs a real group dropdown
  group: z.string().uuid().optional().nullable(), // Property Group UUID

}).refine(data => data.property_category !== "COMPLETE_UNIT" || (!!data.unit_type && data.unit_type.length > 0), {
    message: "Unit type is required for Complete Units",
    path: ["unit_type"],
}).refine(data => data.property_category !== "ROOM" || (!!data.room_type && data.room_type.length > 0), {
    message: "Room type is required for Rooms",
    path: ["room_type"],
});


const groupSchema = z.object({
  name: z.string().min(3, { message: "Group name must be at least 3 characters" }),
  description: z.string().optional().or(z.literal('')),
  property_ids: z.array(z.number()).optional(), // IDs of properties to add initially
});


// ================================================================================
// Create Page Component
// ================================================================================
export default function CreatePropertyOrGroupPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { token } = useAuth();

  const initialType = searchParams.get('type') === 'group' ? 'group' : 'property';
  const [creationType, setCreationType] = useState<'property' | 'group' | null>(null); // Start as null to show choice first
  const [currentStep, setCurrentStep] = useState(1); // For property multi-step form
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [availableRooms, setAvailableRooms] = useState<MinimalProperty[]>([]); // For group creation
  const [isLoadingRooms, setIsLoadingRooms] = useState(false);

  // --- Forms ---
  const propertyForm = useForm<z.infer<typeof propertySchema>>({
    resolver: zodResolver(propertySchema),
    defaultValues: {
      name: "", description: "", property_category: "COMPLETE_UNIT",
      address: "", city: "", province: "", postal_code: "", country: "Canada",
      unit_type: undefined, room_type: undefined, // Start undefined to avoid controlled errors if category changes
      bedrooms: undefined, bathrooms: undefined, // Start undefined
      max_occupancy: undefined, square_footage: undefined, // Start undefined
      status: "AVAILABLE", group: null,
    },
  });

  const groupForm = useForm<z.infer<typeof groupSchema>>({
    resolver: zodResolver(groupSchema),
    defaultValues: { name: "", description: "", property_ids: [] },
  });

  // --- Fetch Available Rooms (only when creating a group) ---
  useEffect(() => {
    if (creationType === 'group' && token) {
      const fetchRooms = async () => {
        setIsLoadingRooms(true);
        setAvailableRooms([]); // Clear previous results
        try {
          // Fetch *all* properties and filter client-side for simplicity now
          // For large numbers, backend filtering is better
          const response = await fetch(`${DJANGO_API_URL}/properties/?property_category=ROOM`, {
            headers: { 'Authorization': `Token ${token}` },
          });
          if (response.ok) {
            const data: MinimalProperty[] = await response.json();
            // Filter out rooms already in a group
            setAvailableRooms(data.filter(room => room.property_category === 'ROOM' && !room.group));
          } else {
            console.error("Failed to fetch available rooms");
            toast.error("Could not load available rooms for grouping.");
          }
        } catch (error) {
          console.error("Error fetching rooms:", error);
          toast.error("Error loading available rooms.");
        } finally {
          setIsLoadingRooms(false);
        }
      };
      fetchRooms();
    }
  }, [creationType, token]);

  // --- Effect to set initial type based on query param ---
  useEffect(() => {
      setCreationType(initialType);
  }, [initialType]);


  // --- Property Form Handlers ---
  const propertyCategory = propertyForm.watch("property_category");

  // Reset specific fields when category changes to avoid validation errors
   useEffect(() => {
       if (propertyCategory === "COMPLETE_UNIT") {
           propertyForm.setValue("room_type", undefined);
           propertyForm.setValue("group", null); // Cannot assign unit to group
           propertyForm.trigger(["room_type", "group"]); // Re-validate
       } else if (propertyCategory === "ROOM") {
           propertyForm.setValue("unit_type", undefined);
           propertyForm.setValue("bedrooms", undefined); // Reset unit-specific fields
           propertyForm.setValue("bathrooms", undefined);
           propertyForm.trigger(["unit_type", "bedrooms", "bathrooms"]); // Re-validate
       }
   }, [propertyCategory, propertyForm]);


  const onPropertySubmit = async (data: z.infer<typeof propertySchema>) => {
    setIsSubmitting(true);
    console.log("Submitting Property Data:", data);

    // Clean data: Remove fields not relevant to the selected category
    // Make a copy to avoid mutating original form data
    const payload = { ...data };

    if (payload.property_category === "COMPLETE_UNIT") {
        delete payload.room_type;
        delete payload.group; // Ensure group is not sent for units
        // Keep bedrooms/bathrooms for units
    } else if (payload.property_category === "ROOM") {
        delete payload.unit_type;
        // Optionally remove bedrooms/bathrooms if ONLY using PropertyArea later
        // delete payload.bedrooms;
        // delete payload.bathrooms;
    }

    // Convert empty strings to null if backend expects null for optional fields
    Object.keys(payload).forEach(key => {
        if (payload[key as keyof typeof payload] === '') {
            payload[key as keyof typeof payload] = null;
        }
    });

    // Ensure numbers are sent as numbers (Zod coerce handles this, but good practice)
    if (payload.bedrooms === null) delete payload.bedrooms; // Don't send null if not applicable
    if (payload.bathrooms === null) delete payload.bathrooms;


    try {
      const response = await fetch(`${DJANGO_API_URL}/properties/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Token ${token}`,
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error("API Error:", errorData);
        // Attempt to display specific field errors
        let errorMessage = 'Failed to create property';
        if (typeof errorData === 'object' && errorData !== null) {
             errorMessage = Object.entries(errorData)
                .map(([key, value]) => `${key}: ${Array.isArray(value) ? value.join(', ') : value}`)
                .join('; ');
        } else if (errorData?.detail) {
            errorMessage = errorData.detail;
        }
        throw new Error(errorMessage);
      }

      const result = await response.json();
      console.log("Property created:", result);
      toast.success("Property created successfully!");
      router.push("/dashboard/properties"); // Go back to the main list
    } catch (error) {
      console.error("Error creating property:", error);
      toast.error(`Creation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const nextStep = () => {
    const fieldsToValidate: (keyof z.infer<typeof propertySchema>)[] = (() => {
      switch (currentStep) {
        case 1: return ["name", "description", "property_category"];
        case 2: return ["address", "city", "province", "postal_code", "country"];
        case 3:
          const commonFields: (keyof z.infer<typeof propertySchema>)[] = ["max_occupancy", "square_footage"];
          return propertyCategory === "COMPLETE_UNIT"
            ? ["unit_type", "bedrooms", "bathrooms", ...commonFields]
            : ["room_type", "group", ...commonFields]; // Validate group field too if needed
        default: return [];
      }
    })();

    propertyForm.trigger(fieldsToValidate).then((isValid) => {
      if (isValid) {
        setCurrentStep((prev) => Math.min(prev + 1, 4));
      } else {
          console.log("Validation errors:", propertyForm.formState.errors);
          // Focus the first field with an error
          const errorKeys = Object.keys(propertyForm.formState.errors) as (keyof z.infer<typeof propertySchema>)[];
          if (errorKeys.length > 0) {
              propertyForm.setFocus(errorKeys[0]);
              toast.error("Please fix the errors before proceeding.");
          }
      }
    });
  };

  const prevStep = () => {
    setCurrentStep((prev) => Math.max(prev - 1, 1));
  };

  const getStepTabValue = () => `step-${currentStep}`;


 // --- Group Form Handler ---
  const onGroupSubmit = async (data: z.infer<typeof groupSchema>) => {
    setIsSubmitting(true);
    console.log("Submitting Group Data:", data);
    const { property_ids, ...groupData } = data; // Separate property IDs

    try {
      // 1. Create the group
      const groupResponse = await fetch(`${DJANGO_API_URL}/property-groups/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Token ${token}`,
        },
        body: JSON.stringify(groupData),
      });

      if (!groupResponse.ok) {
        const errorData = await groupResponse.json();
         console.error("Group Creation API Error:", errorData);
         let errorMessage = 'Failed to create group';
         if (typeof errorData === 'object' && errorData !== null) {
             errorMessage = Object.entries(errorData)
                .map(([key, value]) => `${key}: ${Array.isArray(value) ? value.join(', ') : value}`)
                .join('; ');
         } else if (errorData?.detail) {
            errorMessage = errorData.detail;
         }
        throw new Error(errorMessage);
      }
      const createdGroup = await groupResponse.json();
      toast.success(`Group "${createdGroup.name}" created successfully!`);

      // 2. Add selected properties to the group (if any)
      if (property_ids && property_ids.length > 0 && createdGroup.id) {
          let successCount = 0;
          const addPromises = property_ids.map(propId =>
              fetch(`${DJANGO_API_URL}/property-groups/${createdGroup.id}/add-property/`, {
                  method: 'POST',
                  headers: {
                      'Content-Type': 'application/json',
                      'Authorization': `Token ${token}`,
                  },
                  body: JSON.stringify({ property_id: propId }),
              }).then(async res => { // Make async to read error body
                  if(!res.ok) {
                       const addErrorText = await res.text();
                       console.warn(`Failed to add property ${propId} to group ${createdGroup.id} (${res.status}): ${addErrorText}`);
                       return false; // Indicate failure
                  }
                  successCount++;
                  return true; // Indicate success
              }).catch(err => {
                  console.error(`Network error adding property ${propId} to group ${createdGroup.id}:`, err);
                  return false;
              })
          );
          await Promise.all(addPromises); // Wait for all add attempts
          if (successCount > 0) {
            toast.info(`${successCount} of ${property_ids.length} properties added to the group.`);
          }
          if (successCount < property_ids.length) {
              toast.warning(`Could not add ${property_ids.length - successCount} properties. Check console for details.`);
          }
      }

      router.push("/dashboard/properties"); // Go back to the main list

    } catch (error) {
      console.error("Error creating group:", error);
      toast.error(`Failed to create group: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsSubmitting(false);
    }
  };


  // --- Initial Selection UI ---
  if (creationType === null) {
    return (
       <div className="container max-w-2xl py-10 px-4 sm:px-6 lg:px-8"> {/* Added padding */}
         <Card>
           <CardHeader>
             <CardTitle>What would you like to create?</CardTitle>
             <CardDescription>Choose whether you are adding an individual property/unit or creating a group for shared rooms.</CardDescription>
           </CardHeader>
           {/* UPDATED CardContent for better responsiveness */}
           <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Button 1: Individual Property */}
              <Button
                variant="outline"
                className="h-auto p-4 flex flex-col items-center text-center justify-start transition-colors hover:bg-slate-50" // Added hover effect
                onClick={() => setCreationType('property')}
              >
                 <Building2 className="h-8 w-8 mb-2 text-purple-600"/>
                 <span className="font-semibold mb-1">Individual Property</span>
                 <span className="text-xs text-muted-foreground">Create a listing for a complete unit (apartment, house) or a single room rental.</span>
              </Button>
              {/* Button 2: Property Group */}
              <Button
                variant="outline"
                className="h-auto p-4 flex flex-col items-center text-center justify-start transition-colors hover:bg-slate-50" // Added hover effect
                onClick={() => setCreationType('group')}
              >
                  <Users className="h-8 w-8 mb-2 text-indigo-600"/>
                  <span className="font-semibold mb-1">Property Group</span>
                  <span className="text-xs text-muted-foreground">Group multiple room properties together that share common areas (kitchen, bathroom, etc.).</span>
              </Button>
           </CardContent>
            <CardFooter>
                <Button variant="ghost" size="sm" onClick={() => router.push("/dashboard/properties")}>
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Cancel
                </Button>
            </CardFooter>
         </Card>
       </div>
    );
  }

  // --- Render Property Creation Form ---
  if (creationType === 'property') {
    return (
      <div className="container max-w-4xl py-6 px-4 sm:px-6 lg:px-8">
        {/* Back Button */}
        <div className="flex items-center mb-6">
           <Button variant="ghost" size="sm" onClick={() => setCreationType(null)} className="mr-4">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Choice
           </Button>
           <h1 className="text-2xl font-semibold">Create New Property Listing</h1>
        </div>

        {/* Stepper */}
        <div className="mb-8">
          <div className="flex justify-between mb-2">
            {[1, 2, 3, 4].map((step) => (
              <div key={step} className="flex flex-col items-center text-center" style={{ width: "25%" }}>
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center mb-1 text-sm font-medium ${
                    currentStep >= step ? "bg-teal-600 text-white" : "bg-slate-200 text-slate-500"
                  }`}
                >
                  {currentStep > step ? <Check className="h-4 w-4" /> : step}
                </div>
                <div className="text-xs text-muted-foreground px-1">
                  {step === 1 && "Basic Info"}
                  {step === 2 && "Location"}
                  {step === 3 && "Details"}
                  {step === 4 && "Status"}
                </div>
              </div>
            ))}
          </div>
          <div className="relative w-full h-1 bg-slate-200 rounded-full mt-1">
            <div
              className="absolute top-0 left-0 h-1 bg-teal-600 rounded-full transition-all duration-300 ease-in-out"
              style={{ width: `${((currentStep -1) / 3) * 100}%` }} // Corrected width calculation
            ></div>
          </div>
        </div>

        {/* Form */}
        <Form {...propertyForm}>
          <form onSubmit={propertyForm.handleSubmit(onPropertySubmit)} className="space-y-6">
            {/* Step 1 Content */}
            <div className={currentStep === 1 ? 'block' : 'hidden'}>
              <Card>
                 <CardHeader>
                    <CardTitle className="flex items-center"><Building2 className="mr-2 h-5 w-5" />Basic Information</CardTitle>
                    <CardDescription>Enter the basic details about your property.</CardDescription>
                  </CardHeader>
                <CardContent className="space-y-4">
                  <FormField control={propertyForm.control} name="name" render={({ field }) => ( <FormItem><FormLabel>Property Name*</FormLabel><FormControl><Input placeholder="e.g., Cozy Downtown Apartment" {...field} /></FormControl><FormMessage /></FormItem> )}/>
                  <FormField control={propertyForm.control} name="description" render={({ field }) => ( <FormItem><FormLabel>Description</FormLabel><FormControl><Textarea placeholder="Describe your property..." {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem> )}/>
                  <FormField control={propertyForm.control} name="property_category" render={({ field }) => ( <FormItem><FormLabel>Property Category*</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger></FormControl><SelectContent><SelectItem value="COMPLETE_UNIT">Complete Unit</SelectItem><SelectItem value="ROOM">Room</SelectItem></SelectContent></Select><FormDescription>Is this a whole unit or a single room rental?</FormDescription><FormMessage /></FormItem> )}/>
                </CardContent>
                <CardFooter className="flex justify-end">
                  <Button type="button" onClick={nextStep}>Next Step <ArrowRight className="ml-2 h-4 w-4" /></Button>
                </CardFooter>
              </Card>
            </div>

             {/* Step 2 Content */}
             <div className={currentStep === 2 ? 'block' : 'hidden'}>
               <Card>
                 <CardHeader> <CardTitle className="flex items-center"><MapPin className="mr-2 h-5 w-5" />Location</CardTitle> <CardDescription>Enter the property's address.</CardDescription> </CardHeader>
                 <CardContent className="space-y-4">
                   <FormField control={propertyForm.control} name="address" render={({ field }) => ( <FormItem><FormLabel>Street Address*</FormLabel><FormControl><Input placeholder="123 Main St, Apt 4B" {...field} /></FormControl><FormMessage /></FormItem> )}/>
                   <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                     <FormField control={propertyForm.control} name="city" render={({ field }) => ( <FormItem><FormLabel>City*</FormLabel><FormControl><Input placeholder="Vancouver" {...field} /></FormControl><FormMessage /></FormItem> )}/>
                     <FormField control={propertyForm.control} name="province" render={({ field }) => ( <FormItem><FormLabel>Province/State*</FormLabel><FormControl><Input placeholder="British Columbia" {...field} /></FormControl><FormMessage /></FormItem> )}/>
                   </div>
                   <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                     <FormField control={propertyForm.control} name="postal_code" render={({ field }) => ( <FormItem><FormLabel>Postal/ZIP Code*</FormLabel><FormControl><Input placeholder="A1B 2C3" {...field} /></FormControl><FormMessage /></FormItem> )}/>
                     <FormField control={propertyForm.control} name="country" render={({ field }) => ( <FormItem><FormLabel>Country*</FormLabel><FormControl><Input placeholder="Canada" {...field} /></FormControl><FormMessage /></FormItem> )}/>
                   </div>
                 </CardContent>
                 <CardFooter className="flex justify-between"> <Button type="button" variant="outline" onClick={prevStep}><ArrowLeft className="mr-2 h-4 w-4" /> Previous</Button> <Button type="button" onClick={nextStep}>Next Step <ArrowRight className="ml-2 h-4 w-4" /></Button> </CardFooter>
               </Card>
             </div>

             {/* Step 3 Content */}
             <div className={currentStep === 3 ? 'block' : 'hidden'}>
               <Card>
                 <CardHeader> <CardTitle className="flex items-center"><Home className="mr-2 h-5 w-5" />Property Details</CardTitle> <CardDescription>Provide specifics like size, rooms, and occupancy.</CardDescription> </CardHeader>
                 <CardContent className="space-y-4">
                   {propertyCategory === "COMPLETE_UNIT" && (
                     <>
                       <FormField control={propertyForm.control} name="unit_type" render={({ field }) => ( <FormItem><FormLabel>Unit Type*</FormLabel><Select onValueChange={field.onChange} value={field.value ?? ''}><FormControl><SelectTrigger><SelectValue placeholder="Select unit type" /></SelectTrigger></FormControl><SelectContent><SelectItem value="BASEMENT">Basement</SelectItem><SelectItem value="GARDEN_SUITE">Garden Suite</SelectItem><SelectItem value="MAIN_FLOOR">Main Floor</SelectItem><SelectItem value="APARTMENT">Apartment</SelectItem><SelectItem value="OTHER">Other</SelectItem></SelectContent></Select><FormMessage /></FormItem> )}/>
                       <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                         <FormField control={propertyForm.control} name="bedrooms" render={({ field }) => ( <FormItem><FormLabel>Bedrooms</FormLabel><FormControl><Input type="number" min="0" placeholder="e.g., 2" {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem> )}/>
                         <FormField control={propertyForm.control} name="bathrooms" render={({ field }) => ( <FormItem><FormLabel>Bathrooms</FormLabel><FormControl><Input type="number" min="0" step="0.5" placeholder="e.g., 1.5" {...field} value={field.value ?? ''}/></FormControl><FormMessage /></FormItem> )}/>
                       </div>
                     </>
                   )}
                   {propertyCategory === "ROOM" && (
                      <>
                        <FormField control={propertyForm.control} name="room_type" render={({ field }) => ( <FormItem><FormLabel>Room Type*</FormLabel><Select onValueChange={field.onChange} value={field.value ?? ''}><FormControl><SelectTrigger><SelectValue placeholder="Select room type" /></SelectTrigger></FormControl><SelectContent><SelectItem value="PRIVATE">Private Room</SelectItem><SelectItem value="SHARED">Shared Room</SelectItem><SelectItem value="OTHER">Other</SelectItem></SelectContent></Select><FormMessage /></FormItem> )}/>
                         {/* TODO: Replace input with a Select dropdown populated with user's groups */}
                        {/* <FormField control={propertyForm.control} name="group" render={({ field }) => ( <FormItem><FormLabel>Assign to Group (Optional)</FormLabel><FormControl><Input placeholder="Enter Group ID (temporary)" {...field} value={field.value ?? ''} /></FormControl><FormDescription>Assign this room to an existing property group.</FormDescription><FormMessage /></FormItem> )}/> */}
                      </>
                   )}
                   <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                     <FormField control={propertyForm.control} name="max_occupancy" render={({ field }) => ( <FormItem><FormLabel>Max Occupancy*</FormLabel><FormControl><Input type="number" min="1" placeholder="e.g., 3" {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem> )}/>
                     <FormField control={propertyForm.control} name="square_footage" render={({ field }) => ( <FormItem><FormLabel>Square Footage*</FormLabel><FormControl><Input type="number" min="1" placeholder="e.g., 850" {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem> )}/>
                   </div>
                 </CardContent>
                 <CardFooter className="flex justify-between"> <Button type="button" variant="outline" onClick={prevStep}><ArrowLeft className="mr-2 h-4 w-4" /> Previous</Button> <Button type="button" onClick={nextStep}>Next Step <ArrowRight className="ml-2 h-4 w-4" /></Button> </CardFooter>
               </Card>
             </div>

             {/* Step 4 Content */}
             <div className={currentStep === 4 ? 'block' : 'hidden'}>
               <Card>
                 <CardHeader> <CardTitle>Status & Finish</CardTitle> <CardDescription>Set the current status and save the property.</CardDescription> </CardHeader>
                 <CardContent className="space-y-6">
                   <FormField control={propertyForm.control} name="status" render={({ field }) => ( <FormItem><FormLabel>Property Status*</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Select status" /></SelectTrigger></FormControl><SelectContent><SelectItem value="AVAILABLE">Available</SelectItem><SelectItem value="OCCUPIED">Occupied</SelectItem><SelectItem value="MAINTENANCE">Under Maintenance</SelectItem><SelectItem value="NOT_AVAILABLE">Not Available</SelectItem></SelectContent></Select><FormMessage /></FormItem> )}/>
                   {/* Optional Image Upload Placeholder */}
                 </CardContent>
                 <CardFooter className="flex justify-between">
                    <Button type="button" variant="outline" onClick={prevStep}><ArrowLeft className="mr-2 h-4 w-4" /> Previous</Button>
                    <Button type="submit" disabled={isSubmitting} className="bg-teal-600 hover:bg-teal-700">
                        {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                        {isSubmitting ? 'Saving...' : 'Create Property'}
                    </Button>
                 </CardFooter>
               </Card>
             </div>
          </form>
        </Form>
      </div>
    );
  }

  // --- Render Group Creation Form ---
  if (creationType === 'group') {
    return (
       <div className="container max-w-3xl py-6 px-4 sm:px-6 lg:px-8">
            {/* Back Button */}
            <div className="flex items-center mb-6">
                <Button variant="ghost" size="sm" onClick={() => setCreationType(null)} className="mr-4">
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back to Choice
                </Button>
                <h1 className="text-2xl font-semibold">Create New Property Group</h1>
            </div>

           <Form {...groupForm}>
             <form onSubmit={groupForm.handleSubmit(onGroupSubmit)} className="space-y-6">
               <Card>
                 <CardHeader>
                   <CardTitle className="flex items-center"><Users className="mr-2 h-5 w-5 text-indigo-600"/>Group Details</CardTitle>
                   <CardDescription>Define the group name and optionally add initial properties.</CardDescription>
                 </CardHeader>
                 <CardContent className="space-y-6">
                    <FormField control={groupForm.control} name="name" render={({ field }) => ( <FormItem><FormLabel>Group Name*</FormLabel><FormControl><Input placeholder="e.g., Upstairs Shared Rooms" {...field} /></FormControl><FormMessage /></FormItem> )}/>
                    <FormField control={groupForm.control} name="description" render={({ field }) => ( <FormItem><FormLabel>Description</FormLabel><FormControl><Textarea placeholder="Describe the shared spaces or purpose of this group..." {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem> )}/>
                    <FormField
                        control={groupForm.control}
                        name="property_ids"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Add Rooms to Group (Optional)</FormLabel>
                            <FormDescription>Select existing room properties to include in this group. Only rooms not already in a group are shown.</FormDescription>
                             {isLoadingRooms ? (
                                <div className="flex items-center justify-center p-4 border rounded-md min-h-[100px]">
                                    <Loader2 className="h-5 w-5 animate-spin text-slate-400"/>
                                </div>
                             ) : availableRooms.length === 0 ? (
                                <p className="text-sm text-slate-500 p-4 border rounded-md text-center">No available rooms found to add to a group.</p>
                             ) : (
                                <ScrollArea className="h-48 w-full rounded-md border">
                                  <div className="p-4 space-y-2"> {/* Added padding inside ScrollArea */}
                                    {availableRooms.map((room) => (
                                        <FormField
                                            key={room.id}
                                            control={groupForm.control}
                                            name="property_ids"
                                            render={({ field: checkboxField }) => (
                                                <FormItem className="flex flex-row items-center space-x-3 space-y-0 p-2 rounded hover:bg-slate-50"> {/* Added hover effect */}
                                                    <FormControl>
                                                        <Checkbox
                                                            checked={checkboxField.value?.includes(room.id)}
                                                            onCheckedChange={(checked) => {
                                                                return checked
                                                                ? checkboxField.onChange([...(checkboxField.value || []), room.id])
                                                                : checkboxField.onChange(
                                                                    checkboxField.value?.filter(
                                                                        (value) => value !== room.id
                                                                    )
                                                                );
                                                            }}
                                                            id={`room-${room.id}`} // Added unique ID for label association
                                                        />
                                                    </FormControl>
                                                    <Label htmlFor={`room-${room.id}`} className="text-sm font-normal cursor-pointer flex-grow"> {/* Use Label and htmlFor */}
                                                        {room.name} <span className="text-xs text-muted-foreground">({room.address}, {room.city})</span>
                                                    </Label>
                                                </FormItem>
                                            )}
                                         />
                                    ))}
                                  </div>
                                </ScrollArea>
                             )}
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                 </CardContent>
                 <CardFooter className="flex justify-end">
                   <Button type="submit" disabled={isSubmitting} className="bg-indigo-600 hover:bg-indigo-700">
                     {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                     {isSubmitting ? 'Saving...' : 'Create Group'}
                   </Button>
                 </CardFooter>
               </Card>
             </form>
           </Form>
       </div>
    );
  }

  // Fallback if creationType is somehow invalid (shouldn't happen)
  return (
    <div className="container max-w-lg py-10 text-center">
        <p className="text-red-500">Something went wrong. Please try again.</p>
        <Button variant="outline" onClick={() => setCreationType(null)} className="mt-4">
            Go Back
        </Button>
    </div>
  );
}