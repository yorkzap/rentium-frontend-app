// src/app/dashboard/properties/edit/[id]/page.tsx
"use client"
import { useState, useEffect, useRef } from "react"
import { useRouter, useParams } from "next/navigation"
import { useAuth } from "@/contexts/AuthContext"
import { toast } from "sonner"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
    ArrowLeft, Building2, Home, MapPin, Save, Upload, Loader2, X,
    Image as ImageIcon, Plus, Trash2, Edit, Check, Key, Info, Users // Added Users icon
} from "lucide-react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm, useFieldArray } from "react-hook-form"
import * as z from "zod"
import { DJANGO_API_URL } from "@/lib/config"
import { Badge } from "@/components/ui/badge"
// Removed Separator import as it wasn't used
import {
    Dialog, DialogContent, DialogDescription, DialogFooter,
    DialogHeader, DialogTitle // Removed DialogTrigger as it wasn't used directly
} from "@/components/ui/dialog"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"

// Area constants
const AREA_TYPE_CHOICES = [
    { value: "KITCHEN", label: "Kitchen" },
    { value: "BATHROOM", label: "Bathroom" },
    { value: "LIVING_ROOM", label: "Living Room" },
    { value: "DINING_ROOM", label: "Dining Room" },
    { value: "BEDROOM", label: "Bedroom" },
    { value: "LAUNDRY", label: "Laundry Area" },
    { value: "OFFICE", label: "Office/Den" },
    { value: "BALCONY", label: "Balcony/Patio" },
    { value: "HALLWAY", label: "Hallway/Entryway" },
    { value: "STORAGE", label: "Storage Area" },
    { value: "GARAGE", label: "Garage" },
    { value: "GARDEN", label: "Garden/Yard" },
    { value: "OTHER", label: "Other" },
] as const;

// Define Area Status options for the form
const AREA_STATUS_OPTIONS = [
    {
        value: 'private_specific',
        label: 'Private (Exclusive to this Room)',
        description: 'e.g., Ensuite Bathroom. Only applicable to Room properties.'
    },
    {
        value: 'private_general',
        label: 'Private (General Area)',
        description: 'e.g., Closet within the room, or any area in a Complete Unit.'
    },
    {
        value: 'shared_group',
        label: 'Shared (With Group)',
        description: 'Shared with all rooms in the group. Only applicable to Room properties.'
    },
] as const;

// Helper type for form status values
type AreaStatusValue = typeof AREA_STATUS_OPTIONS[number]['value'];

// Derive the base URL from the API URL
let djangoBaseUrl = '';
try {
    if (DJANGO_API_URL && (DJANGO_API_URL.startsWith('http://') || DJANGO_API_URL.startsWith('https://'))) {
        djangoBaseUrl = new URL(DJANGO_API_URL).origin;
    } else {
        console.warn("DJANGO_API_URL is not a valid absolute URL. Image URLs might be incorrect.");
    }
} catch (e) {
    console.error("Error parsing DJANGO_API_URL:", e);
}

// Area forms schema
const areaSchema = z.object({
    id: z.number().optional(), // Will be present for existing areas
    area_type: z.string({
        required_error: "Please select an area type",
    }),
    count: z.coerce.number().int().min(1, "Must have at least 1"),
    description: z.string().optional().nullable(),
    status: z.enum(['private_specific', 'private_general', 'shared_group']),
    shared_by: z.array(z.string()).optional(), // Keep for consistency, populated in processing
    isDeleted: z.boolean().optional(),
    isNew: z.boolean().optional(),
});

// Form validation schema
const propertySchema = z.object({
    name: z.string().min(3, { message: "Property name must be at least 3 characters" }),
    description: z.string().optional().or(z.literal('')).nullable(), // Allow empty string or null
    property_category: z.enum(["COMPLETE_UNIT", "ROOM"], {
        required_error: "Please select a property category",
    }),
    address: z.string().min(5, { message: "Address must be at least 5 characters" }),
    city: z.string().min(2, { message: "City is required" }),
    province: z.string().min(2, { message: "Province/State is required" }),
    postal_code: z.string().min(5, { message: "Postal/ZIP code is required" }),
    country: z.string().min(2, { message: "Country is required" }),
    unit_type: z.string().optional().nullable(), // Allow null or empty string
    room_type: z.string().optional().nullable(), // Allow null or empty string
    bedrooms: z.coerce.number().min(0).optional().nullable(), // Allow null
    bathrooms: z.coerce.number().min(0).step(0.5).optional().nullable(), // Allow null and step 0.5
    max_occupancy: z.coerce.number().min(1, { message: "Maximum occupancy must be at least 1" }),
    square_footage: z.coerce.number().min(1, { message: "Square footage must be at least 1" }).optional().nullable(), // Allow null
    status: z.enum(["AVAILABLE", "OCCUPIED", "MAINTENANCE", "NOT_AVAILABLE"], {
        required_error: "Please select a status",
    }),
    group: z.string().uuid().optional().nullable(), // Read-only/informational in edit form
    areas: z.array(areaSchema).optional(),
})

// Interface for existing images for better type safety
interface ExistingImage {
    id: number;
    image: string; // This is the potentially relative URL from the backend
    caption: string | null;
    order: number | null;
}

// Interface for area from API
interface PropertyArea {
    id: number;
    area_type: string;
    area_type_display: string;
    count: number;
    description: string | null;
    shared_by: number[]; // Changed to number array
    shared_by_details: any[];
    created_at: string;
    updated_at: string;
}

// Helper function to format DRF error messages
const formatApiError = (errorBody: any, defaultMessage: string = "Operation failed"): string => {
  console.debug("Parsing API error body:", errorBody); // Log the raw error body

  if (typeof errorBody === 'string') {
       // Sometimes the body might just be a plain string
       return errorBody;
  }

  if (typeof errorBody === 'object' && errorBody !== null) {
      // 1. Check for 'detail' (common for authentication, permission errors)
      if (typeof errorBody.detail === 'string') {
          return errorBody.detail;
      }

      // 2. Check for 'non_field_errors'
      if (Array.isArray(errorBody.non_field_errors) && errorBody.non_field_errors.length > 0 && typeof errorBody.non_field_errors[0] === 'string') {
          return `Validation Error: ${errorBody.non_field_errors[0]}`;
      }

      // 3. Check for field-specific errors
      const keys = Object.keys(errorBody);
      if (keys.length > 0) {
          const fieldName = keys[0]; // Focus on the first field with an error for simplicity
          const fieldErrors = errorBody[fieldName];

          if (Array.isArray(fieldErrors) && fieldErrors.length > 0) {
               // Try to join multiple errors or just take the first one
               const errorMessages = fieldErrors.filter(e => typeof e === 'string');
               if (errorMessages.length > 0) {
                   const formattedFieldName = fieldName.replace(/_/g, ' ').replace(/^\w/, c => c.toUpperCase());
                   return `${formattedFieldName}: ${errorMessages.join(' ')}`; // Join multiple errors if present
               }
          } else if (typeof fieldErrors === 'string') {
               // Handle cases where the error might be a direct string under the field name
               const formattedFieldName = fieldName.replace(/_/g, ' ').replace(/^\w/, c => c.toUpperCase());
               return `${formattedFieldName}: ${fieldErrors}`;
          }
      }

      // 4. Fallback: Stringify the object if structure is unknown/unhandled
      try {
          const jsonString = JSON.stringify(errorBody);
          // Avoid showing just "{}" or "[]"
          if (jsonString !== '{}' && jsonString !== '[]') {
              return `Unknown error structure: ${jsonString}`;
          }
      } catch (e) { /* Ignore stringify errors */ }
  }

  // Return default if no specific message found or body is not an object/string
  return defaultMessage;
};


export default function EditPropertyPage() {
    const [activeTab, setActiveTab] = useState("basic")
    const [isLoading, setIsLoading] = useState(true)
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [isProcessingImages, setIsProcessingImages] = useState(false);
    const [isProcessingAreas, setIsProcessingAreas] = useState(false);
    const [primaryImage, setPrimaryImage] = useState<File | null>(null)
    const [primaryImagePreview, setPrimaryImagePreview] = useState<string | null>(null)
    const [initialPrimaryImageUrl, setInitialPrimaryImageUrl] = useState<string | null>(null);
    const [additionalImages, setAdditionalImages] = useState<{ file: File; caption: string; order: number; previewUrl: string }[]>([])
    const [existingImages, setExistingImages] = useState<ExistingImage[]>([])
    const [initialExistingImages, setInitialExistingImages] = useState<ExistingImage[]>([]);
    const [imagesToDelete, setImagesToDelete] = useState<number[]>([])
    const [originalAreas, setOriginalAreas] = useState<PropertyArea[]>([])
    const [roomsInGroup, setRoomsInGroup] = useState<{ id: number, name: string }[]>([])
    const [showAreaDialog, setShowAreaDialog] = useState(false)
    const [editingAreaIndex, setEditingAreaIndex] = useState<number | null>(null)
    const primaryImageInputRef = useRef<HTMLInputElement>(null)
    const additionalImageInputRef = useRef<HTMLInputElement>(null)

    const router = useRouter()
    const params = useParams()
    const { token } = useAuth()
    const propertyId = params.id as string;

    const form = useForm<z.infer<typeof propertySchema>>({
        resolver: zodResolver(propertySchema),
        defaultValues: { // Initial defaults, will be overwritten by fetched data
            name: "",
            description: "",
            property_category: undefined, // Start undefined
            address: "",
            city: "",
            province: "",
            postal_code: "",
            country: "Canada",
            unit_type: null,
            room_type: null,
            bedrooms: null,
            bathrooms: null,
            max_occupancy: 1,
            square_footage: null,
            status: "AVAILABLE",
            group: null,
            areas: [],
        },
    })

    // Set up field array for areas
    const { fields: areaFields, append: appendArea, remove: removeArea, update: updateArea } =
        useFieldArray({
            control: form.control,
            name: "areas",
        });

    // Set up form for area dialog
    const areaForm = useForm<z.infer<typeof areaSchema>>({
        resolver: zodResolver(areaSchema),
        defaultValues: {
            area_type: undefined,
            count: 1,
            description: "",
            status: "private_general",
            shared_by: [],
            isDeleted: false,
            isNew: true,
        }
    });

    const propertyCategory = form.watch("property_category")
    const propertyGroup = form.watch("group")

    // Helper function to construct full image URL
    const getFullImageUrl = (relativeUrl: string | null | undefined): string | null => {
        if (!relativeUrl) return null;
        if (relativeUrl.startsWith('http://') || relativeUrl.startsWith('https://') || relativeUrl.startsWith('blob:')) {
            return relativeUrl;
        }
        if (djangoBaseUrl) {
            try {
                // Handle potential leading slash from backend
                const path = relativeUrl.startsWith('/') ? relativeUrl.substring(1) : relativeUrl;
                return new URL(path, djangoBaseUrl).href;
            } catch (e) {
                console.error(`Error constructing URL for ${relativeUrl} with base ${djangoBaseUrl}:`, e);
                return null;
            }
        }
        console.warn("Cannot construct full image URL: djangoBaseUrl is not set.");
        return relativeUrl; // Return original as fallback
    };

    // Fetch rooms in group if property is in a group
    useEffect(() => {
        if (!token || !propertyGroup) {
            setRoomsInGroup([]); // Clear if no token or group
            return;
        }

        const fetchRoomsInGroup = async () => {
            try {
                const response = await fetch(`${DJANGO_API_URL}/property-groups/${propertyGroup}/`, {
                    headers: { 'Authorization': `Token ${token}` },
                });

                if (response.ok) {
                    const groupData = await response.json();
                    if (groupData.grouped_properties && Array.isArray(groupData.grouped_properties)) {
                        setRoomsInGroup(groupData.grouped_properties.map(p => ({
                            id: p.id,
                            name: p.name
                        })));
                    } else {
                        setRoomsInGroup([]); // Handle case where data is not as expected
                    }
                } else {
                    console.warn("Failed to fetch group data, status:", response.status);
                    setRoomsInGroup([]);
                }
            } catch (error) {
                console.error("Error fetching rooms in group:", error);
                setRoomsInGroup([]);
            }
        };

        fetchRoomsInGroup();
    }, [token, propertyGroup]);

    // Fetch property data and images
    useEffect(() => {
        if (!token || !propertyId) {
            setIsLoading(false); // Don't show loading if we can't fetch
            toast.error("Authentication token or Property ID is missing.");
            return;
        }

        const fetchProperty = async () => {
            setIsLoading(true);
            try {
                const response = await fetch(`${DJANGO_API_URL}/properties/${propertyId}/`, {
                    headers: { 'Authorization': `Token ${token}` },
                });

                if (!response.ok) {
                    const errorData = await response.json().catch(() => ({ detail: 'Failed to fetch property, invalid response.' }));
                    throw new Error(errorData.detail || `Failed to fetch property (${response.status})`);
                }

                const propertyData = await response.json();

                // Get full URL for primary image preview
                const fullPrimaryUrl = getFullImageUrl(propertyData.primary_image);
                setPrimaryImagePreview(fullPrimaryUrl);
                setInitialPrimaryImageUrl(fullPrimaryUrl);

                // Fetch additional images first to make sorting easier
                let fetchedImages: ExistingImage[] = [];
                try {
                    const imagesResponse = await fetch(`${DJANGO_API_URL}/properties/${propertyId}/images/`, {
                        headers: { 'Authorization': `Token ${token}` },
                    });

                    if (imagesResponse.ok) {
                        fetchedImages = await imagesResponse.json();
                        fetchedImages.sort((a, b) => (a.order ?? Infinity) - (b.order ?? Infinity));
                        setExistingImages(fetchedImages);
                        // Deep copy for initial state comparison
                        setInitialExistingImages(JSON.parse(JSON.stringify(fetchedImages)));
                    } else {
                        console.warn("Could not fetch additional images.");
                    }
                } catch (imgError) {
                    console.error("Error fetching additional images:", imgError);
                    toast.warning("Could not fetch additional images.");
                }


                // Process areas data if available
                let formattedAreas: z.infer<typeof areaSchema>[] = [];
                if (propertyData.primary_areas && Array.isArray(propertyData.primary_areas)) {
                    setOriginalAreas(propertyData.primary_areas);

                    // Convert API areas to form format
                    formattedAreas = propertyData.primary_areas.map((area: PropertyArea) => {
                        let statusValue: AreaStatusValue = 'private_general'; // Default status

                        // Determine status based on shared_by
                        if (Array.isArray(area.shared_by)) {
                            if (area.shared_by.length === 0) {
                                statusValue = 'private_general';
                            } else if (area.shared_by.length === 1 && area.shared_by[0] === propertyData.id) {
                                statusValue = 'private_specific';
                            } else if (area.shared_by.length > 0) {
                                // If shared_by has any IDs, consider it group shared for form purposes
                                statusValue = 'shared_group';
                            }
                        }

                        return {
                            id: area.id,
                            area_type: area.area_type,
                            count: area.count,
                            description: area.description || "",
                            status: statusValue,
                            shared_by: area.shared_by.map(String), // Keep as strings for now
                            isDeleted: false,
                            isNew: false,
                        };
                    });
                }

                // Reset form with fetched data, including the formatted areas
                const defaultValues = {
                    name: propertyData.name || "",
                    description: propertyData.description || "",
                    property_category: propertyData.property_category,
                    address: propertyData.address || "",
                    city: propertyData.city || "",
                    province: propertyData.province || "",
                    postal_code: propertyData.postal_code || "",
                    country: propertyData.country || "Canada",
                    unit_type: propertyData.unit_type || null,
                    room_type: propertyData.room_type || null,
                    bedrooms: propertyData.bedrooms !== null ? Number(propertyData.bedrooms) : null,
                    bathrooms: propertyData.bathrooms !== null ? Number(propertyData.bathrooms) : null,
                    max_occupancy: propertyData.max_occupancy !== null ? Number(propertyData.max_occupancy) : 1,
                    square_footage: propertyData.square_footage !== null ? Number(propertyData.square_footage) : null,
                    status: propertyData.status || "AVAILABLE",
                    group: propertyData.group_id || null, // Use group_id from backend
                    areas: formattedAreas, // Use the processed areas
                };
                form.reset(defaultValues);

            } catch (error) {
                console.error("Error fetching property:", error);
                toast.error(`Failed to load property data: ${error instanceof Error ? error.message : 'Unknown error'}`);
                router.push("/dashboard/properties"); // Redirect if load fails
            } finally {
                setIsLoading(false);
            }
        }

        fetchProperty();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [propertyId, token]); // Removed router from dependencies to prevent potential loops on redirect

    // Clean up object URLs when component unmounts or additionalImages changes
    useEffect(() => {
        const urlsToRevoke = additionalImages.map(img => img.previewUrl);
        return () => {
            urlsToRevoke.forEach(url => {
                if (url.startsWith('blob:')) {
                    URL.revokeObjectURL(url);
                }
            });
        };
    }, [additionalImages]);

    // Image handling functions
    const handlePrimaryImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            if (!file.type.startsWith("image/")) {
                toast.error("Please select a valid image file.");
                if (e.target) e.target.value = ''; // Clear the input
                return;
            }
            setPrimaryImage(file);
            const previewUrl = URL.createObjectURL(file);

            // Clean up previous blob URL if it exists
            if (primaryImagePreview && primaryImagePreview.startsWith('blob:')) {
                URL.revokeObjectURL(primaryImagePreview);
            }
            setPrimaryImagePreview(previewUrl);
        }
        // Always clear the input value to allow re-selecting the same file
        if (e.target) e.target.value = '';
    };

    const handleAdditionalImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            const currentImageCount = existingImages.length + additionalImages.length;
            const newImages = Array.from(e.target.files)
                .filter(file => {
                    if (!file.type.startsWith("image/")) {
                        toast.warning(`Ignoring non-image file: ${file.name}`);
                        return false;
                    }
                    return true;
                })
                .map((file, index) => {
                    const previewUrl = URL.createObjectURL(file);
                    return {
                        file,
                        caption: file.name.split('.').slice(0, -1).join('.') || file.name,
                        order: currentImageCount + index + 1, // Simple ordering for now
                        previewUrl: previewUrl
                    };
                });

            if (newImages.length > 0) {
                 setAdditionalImages(prev => [...prev, ...newImages]);
            }
        }
        // Always clear the input value to allow re-selecting the same files
        if (e.target) e.target.value = '';
    };

    const removeAdditionalImage = (index: number) => {
        const imageToRemove = additionalImages[index];
        if (imageToRemove?.previewUrl && imageToRemove.previewUrl.startsWith('blob:')) {
            URL.revokeObjectURL(imageToRemove.previewUrl);
        }
        setAdditionalImages(prev => prev.filter((_, i) => i !== index));
    };

    const removeExistingImage = (imageId: number) => {
        setExistingImages(prev => prev.filter(img => img.id !== imageId));
        if (!imagesToDelete.includes(imageId)) {
            setImagesToDelete(prev => [...prev, imageId]);
        }
    };

    const updateImageCaption = (index: number, caption: string) => {
        setAdditionalImages(prev => prev.map((img, i) => i === index ? { ...img, caption } : img));
    };

    const updateExistingImageCaption = (imageId: number, caption: string) => {
        setExistingImages(prev => prev.map(img =>
            img.id === imageId ? { ...img, caption: caption || null } : img
        ));
    };

    // Area handling functions
    const handleAddArea = () => {
        areaForm.reset({
            area_type: undefined,
            count: 1,
            description: "",
            // Set default status based on property type and group status
            status: propertyCategory === "ROOM" && propertyGroup ? 'shared_group' : 'private_general',
            shared_by: [],
            isDeleted: false,
            isNew: true,
        });
        setEditingAreaIndex(null);
        setShowAreaDialog(true);
    };

    const handleEditArea = (index: number) => {
        const area = areaFields[index];
        areaForm.reset({
            ...area,
            description: area.description || "",
        });
        setEditingAreaIndex(index);
        setShowAreaDialog(true);
    };

    const handleDeleteArea = (index: number) => {
        const area = areaFields[index];
        if (area.id) {
            // Mark existing area for deletion (will be handled during submission)
            updateArea(index, {
                ...area,
                isDeleted: true,
            });
            toast.info(`Area "${getAreaTypeLabel(area.area_type as string)}" marked for deletion.`);
        } else {
            // Remove new area directly from the form
            removeArea(index);
            toast.info(`New area removed.`);
        }
    };

    const handleSaveArea = (data: z.infer<typeof areaSchema>) => {
        if (editingAreaIndex !== null) {
            // Update existing area in the form
            updateArea(editingAreaIndex, {
                ...data,
                isNew: areaFields[editingAreaIndex].isNew, // Preserve isNew flag
                isDeleted: false, // Ensure it's not marked deleted if edited
            });
            toast.success("Area updated in list.");
        } else {
            // Add new area to the form
            appendArea({
                ...data,
                isNew: true, // Mark as new
                isDeleted: false,
            });
            toast.success("Area added to list.");
        }
        setShowAreaDialog(false);
    };

    // Function to check if existing images have changed (caption or order)
    // Deletions are handled separately by imagesToDelete state
    const haveExistingImagesChanged = () => {
        if (existingImages.length !== initialExistingImages.length) return true; // Covers direct removal case, though imagesToDelete is primary
        for (const currentImg of existingImages) {
            const initialImg = initialExistingImages.find(img => img.id === currentImg.id);
            if (!initialImg) return true; // Should not happen if lengths match, but safe check
            // Add checks for null/undefined captions appropriately
            const currentCaption = currentImg.caption || ''; // Treat null/undefined as empty string
            const initialCaption = initialImg.caption || ''; // Treat null/undefined as empty string
            if (currentCaption !== initialCaption) return true;
             // Order change check might need refinement if order isn't explicitly managed/updated by user yet
            // const currentOrder = currentImg.order ?? null;
            // const initialOrder = initialImg.order ?? null;
            // if (currentOrder !== initialOrder) return true;
        }
        return false;
    };

    // Function to get area type display name
    const getAreaTypeLabel = (type: string | undefined) => {
        if (!type) return "Unknown Area";
        const areaType = AREA_TYPE_CHOICES.find(choice => choice.value === type);
        return areaType ? areaType.label : type;
    };

    // Function to get area status display name and badge color
    const getAreaStatusInfo = (status: AreaStatusValue | undefined) => {
        switch (status) {
            case 'private_specific':
                return { label: 'Private (Room)', color: 'bg-green-100 text-green-800 border border-green-200' };
            case 'private_general':
                return { label: 'Private', color: 'bg-blue-100 text-blue-800 border border-blue-200' };
            case 'shared_group':
                return { label: 'Shared', color: 'bg-purple-100 text-purple-800 border border-purple-200' };
            default:
                return { label: 'Unknown', color: 'bg-gray-100 text-gray-800 border border-gray-200' };
        }
    };

    // --- onSubmit: Handle form submission ---
    const onSubmit = async (data: z.infer<typeof propertySchema>) => {
      if (!token || !propertyId) {
          toast.error("Authentication error or missing property ID.");
          return;
      }
      setIsSubmitting(true);
      setIsProcessingImages(false); // Reset these flags
      setIsProcessingAreas(false);

      const mainFormData = new FormData();
      const propertyCategoryValue = data.property_category; // Get the category

      console.log(`Submitting property data (PATCH) for category: ${propertyCategoryValue}`); // Log category

      // Append all simple form fields to FormData conditionally
      Object.entries(data).forEach(([key, value]) => {
          // Skip complex fields handled separately
          if (key === 'areas' || key === 'group') {
              // console.log(`Explicitly skipping field: ${key}`);
              return;
          }

          // --- START CONDITIONAL LOGIC ---
          // Skip unit_type if category is ROOM
          if (key === 'unit_type' && propertyCategoryValue === 'ROOM') {
              console.log(`>>> Skipping field '${key}' because category is ROOM.`);
              return; // DO NOT APPEND
          }
          // Skip room_type if category is COMPLETE_UNIT
          if (key === 'room_type' && propertyCategoryValue === 'COMPLETE_UNIT') {
              console.log(`>>> Skipping field '${key}' because category is COMPLETE_UNIT.`);
              return; // DO NOT APPEND
          }
          // Skip bedrooms/bathrooms if category is ROOM (optional but cleaner)
           if ((key === 'bedrooms' || key === 'bathrooms') && propertyCategoryValue === 'ROOM') {
              console.log(`>>> Skipping field '${key}' because category is ROOM.`);
              return; // DO NOT APPEND
           }
          // --- END CONDITIONAL LOGIC ---

          // Handle appending valid fields based on type and nullability
          // console.log(`Processing field: ${key}, Value:`, value); // Debugging form data
          if (key === 'description' || key === 'square_footage') {
              // Send empty string if null for these specific fields
              mainFormData.append(key, value === null ? '' : String(value));
              // console.log(` Appending ${key}: ${value === null ? '' : String(value)}`);
          } else if (value !== null && value !== undefined && value !== '') {
              // Append other non-null, non-empty values directly
              mainFormData.append(key, String(value));
              // console.log(` Appending ${key}: ${String(value)}`);
          } else if (value === null && (key === 'bedrooms' || key === 'bathrooms' || key === 'unit_type' || key === 'room_type')) {
               // If these fields ARE relevant (passed conditional checks) AND are null, send empty string
               mainFormData.append(key, '');
               // console.log(` Appending ${key}: '' (explicit null case)`);
          } else {
               // Log fields that are skipped due to being null/undefined/empty and not handled above
               // console.log(` Not appending field '${key}' (Value: ${value})`);
          }
      });


      // Handle primary image update logic
      if (primaryImage) {
           console.log("Appending new primary image file.");
          mainFormData.append('primary_image', primaryImage, primaryImage.name);
      } else if (!primaryImage && !primaryImagePreview && initialPrimaryImageUrl) {
           console.log("Signalling primary image removal (empty value).");
          mainFormData.append('primary_image', '');
      } else {
           console.log("No change to primary image detected.");
      }
      // If no change, 'primary_image' is not appended.

      // ----- DEBUG: Log FormData Content -----
       console.log("--- FormData prepared for PATCH ---");
       for (let [key, val] of mainFormData.entries()) {
           if (val instanceof File) {
                console.log(`  ${key}: File(${val.name}, ${val.size} bytes)`);
           } else {
                console.log(`  ${key}: ${val}`);
           }
       }
       console.log("---------------------------------");
       // ----- END DEBUG -----

      let propertyUpdateSuccessful = false;
      try {

          const response = await fetch(`${DJANGO_API_URL}/properties/${propertyId}/`, {
              method: 'PATCH',
              headers: { 'Authorization': `Token ${token}` }, // No Content-Type for FormData
              body: mainFormData,
          });

          if (!response.ok) {
              const errorBody = await response.json().catch(() => ({ detail: `Failed to update property (${response.status}), invalid JSON response.` }));
              const errorMessage = formatApiError(errorBody, `Failed to update property (${response.status})`);
              throw new Error(errorMessage); // Throw the formatted error
          }

          const result = await response.json();
          console.log("Property details updated successfully.");
          propertyUpdateSuccessful = true;

          // Process areas after successful property update
          // Pass the current state of areas from the form
          await handleAreaProcessing(form.getValues('areas') || []);

          // Process additional images after successful property update
          await handleAdditionalImageProcessing();

          // Only show success and redirect if everything succeeded without early exit
          toast.success("Property updated successfully!");
          setTimeout(() => {
              router.push("/dashboard/properties");
              router.refresh(); // Force refresh data on the target page
          }, 1500);

      } catch (error) {
          console.error("Error during property update process:", error);
          // Error message should now be the formatted one from formatApiError
          toast.error(`Update failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
          // Don't redirect on failure
      } finally {
           // Ensure loading states are reset regardless of success/failure
          setIsSubmitting(false);
          setIsProcessingImages(false);
          setIsProcessingAreas(false);
      }
  }; // --- End of onSubmit ---

    // --- Handle area processing with Improved Error Handling ---
    const handleAreaProcessing = async (areas: z.infer<typeof areaSchema>[]) => {
        const areasToProcess = areas.filter(area => area.isNew || area.id); // Process new, existing, and deleted-existing

        if (areasToProcess.length === 0) {
            console.log("No area changes to process.");
            return;
        }

        setIsProcessingAreas(true);
        console.log(`Processing ${areasToProcess.length} area operations...`);

        const promises: Promise<any>[] = [];
        const currentNumericPropertyId = Number(propertyId);

        for (const area of areasToProcess) {
            let apiData: any = {
                area_type: area.area_type,
                count: area.count,
                description: area.description || "",
                shared_by: []
            };

            switch (area.status) {
                case 'private_specific':
                    apiData.shared_by = propertyCategory === "ROOM" ? [currentNumericPropertyId] : [];
                    break;
                case 'private_general':
                    apiData.shared_by = [];
                    break;
                case 'shared_group':
                    apiData.shared_by = propertyCategory === "ROOM" && propertyGroup && roomsInGroup.length > 0
                        ? roomsInGroup.map(room => room.id)
                        : [];
                    break;
            }

            // Determine operation and endpoint
            let method = '';
            let url = '';
            let operation: 'create' | 'update' | 'delete' | '' = '';
            let identifier: string | number = '';

            if (area.isDeleted && area.id) {
                operation = 'delete';
                identifier = area.id;
                method = 'DELETE';
                url = `${DJANGO_API_URL}/properties/${propertyId}/areas/${area.id}/`;
                console.log(`Scheduling ${operation} for area ID: ${identifier}`);
            } else if (area.id && !area.isDeleted) {
                 operation = 'update';
                 identifier = area.id;
                 method = 'PATCH';
                 url = `${DJANGO_API_URL}/properties/${propertyId}/areas/${area.id}/`;
                 console.log(`Scheduling ${operation} for area ID: ${identifier}`, apiData);
            } else if (area.isNew && !area.isDeleted) {
                 operation = 'create';
                 identifier = area.area_type;
                 method = 'POST';
                 url = `${DJANGO_API_URL}/properties/${propertyId}/areas/`;
                 console.log(`Scheduling ${operation} for new area (${identifier})`, apiData);
            } else {
                continue; // Skip areas that are new and deleted (no-op)
            }

            promises.push(
                fetch(url, {
                    method: method,
                    headers: {
                        'Authorization': `Token ${token}`,
                        // Only add Content-Type for methods with a body
                        ...(method === 'POST' || method === 'PATCH' ? { 'Content-Type': 'application/json' } : {})
                    },
                    // Only add body for methods that need it
                    ...(method === 'POST' || method === 'PATCH' ? { body: JSON.stringify(apiData) } : {})
                })
                .then(async res => {
                    if (!res.ok) {
                        const errorBody = await res.json().catch(() => ({ detail: `Operation failed (${res.status}), invalid JSON response.` }));
                        console.error(`Failed ${operation} for area ${identifier}: ${res.status}`, errorBody);
                        // Use the helper function to format error
                        const errorMessage = formatApiError(errorBody, `Failed ${operation} area ${identifier} (${res.status})`);
                        return { error: errorMessage, status: operation, identifier };
                    }

                    // Handle success (including DELETE 204)
                    console.log(`Successfully ${operation}d area ${identifier}`);
                    if (res.status === 204) { // No content for DELETE
                        return { success: true, status: operation, identifier, data: null };
                    }
                    // Try parsing JSON for POST/PATCH success
                    const data = await res.json().catch(() => null);
                    return { success: true, status: operation, identifier, data };
                })
                .catch(err => {
                    // Handle network errors
                    console.error(`Network error during ${operation} for area ${identifier}:`, err);
                    return { error: `Network error during ${operation}`, status: operation, identifier, details: err };
                })
            );
        } // End for loop

        try {
            const results = await Promise.allSettled(promises);

            const errors = results.filter(res =>
                res.status === 'rejected' ||
                (res.status === 'fulfilled' && res.value?.error)
            );
            const successes = results.filter(res => res.status === 'fulfilled' && !res.value?.error);

            console.log(`Area Processing Results: ${successes.length} succeeded, ${errors.length} failed.`);

            if (errors.length > 0) {
                // Log the structured errors
                console.error("Detailed errors processing areas:", errors.map(e => e.status === 'rejected' ? e.reason : e.value));

                // Show user-friendly summary in toast
                const errorSummary = errors.map(e => {
                    if (e.status === 'rejected') {
                        return `Operation failed: ${e.reason?.message || 'Unknown network reason'}`;
                    }
                    // e.value.error should now be the formatted string
                    return e.value.error || 'Unknown operation error';
                }).join('; ');

                toast.error(`Some area operations failed: ${errorSummary}`, { duration: 6000 });
            } else {
                 console.log("All area operations completed successfully.");
            }

        } catch (error) {
            console.error("Unexpected error during bulk area processing:", error);
            toast.error("An unexpected error occurred while processing areas.");
        } finally {
             setIsProcessingAreas(false);
        }
    };


    // --- handleAdditionalImageProcessing: Handle image operations ---
    const handleAdditionalImageProcessing = async () => {
        const hasExistingChanged = haveExistingImagesChanged();
        const hasDeletions = imagesToDelete.length > 0;
        const hasAdditions = additionalImages.length > 0;

        // Determine if any image operations are needed
        if (!hasDeletions && !hasAdditions && !hasExistingChanged) {
            console.log("No additional image changes to process.");
            return;
        }

        if (!token || !propertyId) {
            toast.error("Cannot process images: Auth token or Property ID missing.");
            return;
        }

        setIsProcessingImages(true);

        console.log(`Processing images: ${imagesToDelete.length} deletes, ${additionalImages.length} additions, existing changed: ${hasExistingChanged}`);

        const promises: Promise<any>[] = [];

        // 1. Delete images
        imagesToDelete.forEach(imageId => {
            const operation = 'delete';
            const identifier = imageId;
            console.log(`Scheduling ${operation} for image ID: ${identifier}`);
            promises.push(
                fetch(`${DJANGO_API_URL}/properties/${propertyId}/images/${identifier}/`, {
                    method: 'DELETE',
                    headers: { 'Authorization': `Token ${token}` },
                }).then(async res => {
                    if (!res.ok && res.status !== 204) {
                        const errorBody = await res.text().catch(() => `Operation failed (${res.status}), non-JSON response.`);
                        console.error(`Failed ${operation} for image ${identifier}: ${res.status}`, errorBody);
                        const errorMessage = formatApiError(errorBody, `Failed to ${operation} image ${identifier} (${res.status})`);
                        return { error: errorMessage, status: operation, identifier };
                    }
                    console.log(`Successfully ${operation}d image ID: ${identifier}`);
                    return { success: true, status: operation, identifier };
                }).catch(err => {
                    console.error(`Network error during ${operation} for image ${identifier}:`, err);
                    return { error: `Network error deleting image ${identifier}`, status: operation, identifier, details: err };
                })
            );
        });

        // 2. Update existing images (captions/order) - Only if changes detected
        if (hasExistingChanged) {
            existingImages.forEach((image, index) => {
                const initialImg = initialExistingImages.find(img => img.id === image.id);
                const currentCaption = image.caption || '';
                const initialCaption = initialImg ? (initialImg.caption || '') : null;
                const orderChanged = false; // Add logic if order changes

                if (initialImg && (currentCaption !== initialCaption || orderChanged)) {
                     const operation = 'update';
                     const identifier = image.id;
                    console.log(`Scheduling ${operation} for image ID: ${identifier}`, { caption: image.caption, order: image.order });
                    promises.push(
                        fetch(`${DJANGO_API_URL}/properties/${propertyId}/images/${identifier}/`, {
                            method: 'PATCH',
                            headers: { 'Content-Type': 'application/json', 'Authorization': `Token ${token}` },
                            body: JSON.stringify({
                                caption: image.caption || '',
                                order: image.order ?? index,
                            }),
                        }).then(async res => {
                             if (!res.ok) {
                                 const errorBody = await res.json().catch(() => ({ detail: `Failed update image ${identifier} (${res.status})`}));
                                console.error(`Failed ${operation} for image ${identifier}: ${res.status}`, errorBody);
                                const errorMessage = formatApiError(errorBody, `Failed to ${operation} image ${identifier} (${res.status})`);
                                return { error: errorMessage, status: operation, identifier };
                            }
                            const data = await res.json();
                            console.log(`Successfully ${operation}d image ID: ${identifier}`);
                            return { success: true, status: operation, identifier, data };
                        }).catch(err => {
                             console.error(`Network error during ${operation} for image ${identifier}:`, err);
                            return { error: `Network error updating image ${identifier}`, status: operation, identifier, details: err };
                        })
                    );
                }
            });
        }

        // 3. Upload new additional images
        additionalImages.forEach((imageInfo, index) => {
             const operation = 'upload';
             const identifier = imageInfo.file.name;
            console.log(`Scheduling ${operation} for image: ${identifier}`);
            const imgFormData = new FormData();
            imgFormData.append('image', imageInfo.file, imageInfo.file.name);
            imgFormData.append('caption', imageInfo.caption || '');
            const order = (initialExistingImages.length - imagesToDelete.length) + index;
            imgFormData.append('order', String(order));
            promises.push(
                fetch(`${DJANGO_API_URL}/properties/${propertyId}/images/`, {
                    method: 'POST',
                    headers: { 'Authorization': `Token ${token}` },
                    body: imgFormData,
                }).then(async res => {
                    if (!res.ok) {
                         const errorBody = await res.json().catch(() => ({ detail: `Failed upload image ${identifier} (${res.status})`}));
                        console.error(`Failed ${operation} for image ${identifier}: ${res.status}`, errorBody);
                        const errorMessage = formatApiError(errorBody, `Failed to ${operation} image ${identifier} (${res.status})`);
                        return { error: errorMessage, status: operation, identifier };
                    }
                    const data = await res.json();
                    console.log(`Successfully ${operation}ed image: ${identifier} (ID: ${data.id})`);
                    return { success: true, status: operation, identifier, data };
                }).catch(err => {
                     console.error(`Network error during ${operation} for image ${identifier}:`, err);
                    return { error: `Network error uploading image ${identifier}`, status: operation, identifier, details: err };
                })
            );
        });

        try {
            const results = await Promise.allSettled(promises);

            const errors = results.filter(res => res.status === 'rejected' || (res.status === 'fulfilled' && res.value?.error));
            const successes = results.filter(res => res.status === 'fulfilled' && !res.value?.error);

            console.log(`Image Processing Results: ${successes.length} succeeded, ${errors.length} failed.`);

            if (errors.length > 0) {
                 console.error("Detailed errors processing images:", errors.map(e => e.status === 'rejected' ? e.reason : e.value));
                const errorSummary = errors.map(e => {
                    if (e.status === 'rejected') return `Operation failed: ${e.reason?.message || 'Unknown network reason'}`;
                    return e.value.error || 'Unknown operation error';
                }).join('; ');
                toast.error(`Some image operations failed: ${errorSummary}`, { duration: 6000 });
            } else {
                 console.log("All image operations completed successfully.");
            }

        } catch (error) {
            console.error("Unexpected error during bulk image processing:", error);
            toast.error("An unexpected error occurred while processing images.");
        } finally {
             setIsProcessingImages(false);
        }
    }; // --- End of handleAdditionalImageProcessing ---


    // --- Component Render ---

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-[calc(100vh-200px)]">
                <div className="flex flex-col items-center gap-2">
                    <Loader2 className="h-8 w-8 animate-spin text-teal-600" />
                    <p className="text-sm text-muted-foreground">Loading property data...</p>
                </div>
            </div>
        )
    }

    // Determine overall busy state for disabling inputs/buttons
    const isBusy = isSubmitting || isProcessingImages || isProcessingAreas;

    return (
        <div className="container max-w-4xl py-6 mx-auto">
            <div className="flex items-center mb-6">
                <Button variant="ghost" size="sm" onClick={() => router.push("/dashboard/properties")} className="mr-4" disabled={isBusy}>
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back to Properties
                </Button>
                <h1 className="text-2xl font-semibold ml-auto">Edit Property</h1>
            </div>

            <Form {...form}>
                {/* Use native form element for submit event */}
                <form onSubmit={form.handleSubmit(onSubmit)}>
                    <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                        <TabsList className="w-full grid grid-cols-5">
                            <TabsTrigger value="basic" disabled={isBusy}>Basic Info</TabsTrigger>
                            <TabsTrigger value="location" disabled={isBusy}>Location</TabsTrigger>
                            <TabsTrigger value="details" disabled={isBusy}>Details</TabsTrigger>
                            <TabsTrigger value="areas" disabled={isBusy}>Areas</TabsTrigger>
                            <TabsTrigger value="images" disabled={isBusy}>Images</TabsTrigger>
                        </TabsList>

                        {/* === Basic Information Tab === */}
                        <TabsContent value="basic">
                            <Card>
                                <CardHeader>
                                    <CardTitle className="flex items-center">
                                        <Building2 className="mr-2 h-5 w-5" />
                                        Basic Information
                                    </CardTitle>
                                    <CardDescription>Edit the basic details about your property</CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-6">
                                    <FormField control={form.control} name="name" render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Property Name</FormLabel>
                                            <FormControl>
                                                <Input placeholder="e.g. Cozy Downtown Apartment" {...field} disabled={isBusy} />
                                            </FormControl>
                                            <FormDescription>A descriptive name for your property</FormDescription>
                                            <FormMessage />
                                        </FormItem>
                                    )} />
                                    <FormField control={form.control} name="description" render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Description</FormLabel>
                                            <FormControl>
                                                <Textarea
                                                    placeholder="Describe your property in detail..."
                                                    className="min-h-[120px]"
                                                    {...field}
                                                    value={field.value ?? ''} // Handle null value
                                                    disabled={isBusy}
                                                />
                                            </FormControl>
                                            <FormDescription>Provide a detailed description of your property</FormDescription>
                                            <FormMessage />
                                        </FormItem>
                                    )} />
                                    <FormField control={form.control} name="property_category" render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Property Category</FormLabel>
                                            {/* Use Select component for enum */}
                                            <Select onValueChange={field.onChange} value={field.value} disabled={isBusy}>
                                                <FormControl>
                                                    <SelectTrigger>
                                                        <SelectValue placeholder="Select property category" />
                                                    </SelectTrigger>
                                                </FormControl>
                                                <SelectContent>
                                                    <SelectItem value="COMPLETE_UNIT">
                                                        <div className="flex items-center">
                                                            <Home className="h-4 w-4 mr-2 text-slate-500" />
                                                            <span>Complete Unit</span>
                                                        </div>
                                                    </SelectItem>
                                                    <SelectItem value="ROOM">
                                                        <div className="flex items-center">
                                                            <Key className="h-4 w-4 mr-2 text-slate-500" />
                                                            <span>Room</span>
                                                        </div>
                                                    </SelectItem>
                                                </SelectContent>
                                            </Select>
                                            <FormDescription>
                                                Choose whether this is a complete unit or a room within a shared property
                                            </FormDescription>
                                            <FormMessage />
                                        </FormItem>
                                    )} />

                                    {/* Status Field */}
                                    <FormField control={form.control} name="status" render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Property Status</FormLabel>
                                            <Select onValueChange={field.onChange} value={field.value} disabled={isBusy}>
                                                <FormControl>
                                                    <SelectTrigger>
                                                        <SelectValue placeholder="Select status" />
                                                    </SelectTrigger>
                                                </FormControl>
                                                <SelectContent>
                                                    <SelectItem value="AVAILABLE">Available</SelectItem>
                                                    <SelectItem value="OCCUPIED">Occupied</SelectItem>
                                                    <SelectItem value="MAINTENANCE">Under Maintenance</SelectItem>
                                                    <SelectItem value="NOT_AVAILABLE">Not Available</SelectItem>
                                                </SelectContent>
                                            </Select>
                                            <FormDescription>Current availability status of the property</FormDescription>
                                            <FormMessage />
                                        </FormItem>
                                    )} />
                                </CardContent>
                                <CardFooter className="flex justify-end">
                                    <Button type="button" onClick={() => setActiveTab("location")} disabled={isBusy}>
                                        Next: Location
                                    </Button>
                                </CardFooter>
                            </Card>
                        </TabsContent>

                        {/* === Location Tab === */}
                        <TabsContent value="location">
                            <Card>
                                <CardHeader>
                                    <CardTitle className="flex items-center"><MapPin className="mr-2 h-5 w-5" />Location</CardTitle>
                                    <CardDescription>Edit the location details of your property</CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-6">
                                    <FormField control={form.control} name="address" render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Street Address</FormLabel>
                                            <FormControl>
                                                <Input placeholder="e.g. 123 Main Street, Unit 4B" {...field} disabled={isBusy} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )} />
                                    <div className="grid grid-cols-2 gap-4">
                                        <FormField control={form.control} name="city" render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>City</FormLabel>
                                                <FormControl>
                                                    <Input placeholder="e.g. Vancouver" {...field} disabled={isBusy} />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )} />
                                        <FormField control={form.control} name="province" render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Province/State</FormLabel>
                                                <FormControl>
                                                    <Input placeholder="e.g. British Columbia" {...field} disabled={isBusy} />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )} />
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <FormField control={form.control} name="postal_code" render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Postal/ZIP Code</FormLabel>
                                                <FormControl>
                                                    <Input placeholder="e.g. V6B 2W9" {...field} disabled={isBusy} />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )} />
                                        <FormField control={form.control} name="country" render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Country</FormLabel>
                                                <FormControl>
                                                    <Input placeholder="e.g. Canada" {...field} disabled={isBusy} />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )} />
                                    </div>
                                </CardContent>
                                <CardFooter className="flex justify-between">
                                    <Button variant="outline" type="button" onClick={() => setActiveTab("basic")} disabled={isBusy}>Back: Basic Info</Button>
                                    <Button type="button" onClick={() => setActiveTab("details")} disabled={isBusy}>Next: Details</Button>
                                </CardFooter>
                            </Card>
                        </TabsContent>

                        {/* === Property Details Tab === */}
                        <TabsContent value="details">
                            <Card>
                                <CardHeader>
                                    <CardTitle className="flex items-center"><Home className="mr-2 h-5 w-5" />Property Details</CardTitle>
                                    <CardDescription>Edit the specific details about your property</CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-6">
                                    {/* Conditional Fields based on propertyCategory */}
                                    {propertyCategory === "COMPLETE_UNIT" && (
                                        <>
                                            <FormField control={form.control} name="unit_type" render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>Unit Type</FormLabel>
                                                    <Select onValueChange={field.onChange} value={field.value ?? ''} disabled={isBusy}>
                                                        <FormControl>
                                                            <SelectTrigger>
                                                                <SelectValue placeholder="Select unit type" />
                                                            </SelectTrigger>
                                                        </FormControl>
                                                        <SelectContent>
                                                            <SelectItem value="BASEMENT">Basement</SelectItem>
                                                            <SelectItem value="GARDEN_SUITE">Garden Suite</SelectItem>
                                                            <SelectItem value="MAIN_FLOOR">Main Floor</SelectItem>
                                                            <SelectItem value="APARTMENT">Apartment</SelectItem>
                                                            <SelectItem value="OTHER">Other</SelectItem>
                                                        </SelectContent>
                                                    </Select>
                                                    <FormMessage />
                                                </FormItem>
                                            )} />
                                            <div className="grid grid-cols-2 gap-4">
                                                <FormField control={form.control} name="bedrooms" render={({ field }) => (
                                                    <FormItem>
                                                        <FormLabel>Bedrooms</FormLabel>
                                                        <FormControl>
                                                            <Input
                                                                type="number"
                                                                min="0"
                                                                {...field}
                                                                value={field.value ?? ''} // Handle null
                                                                onChange={e => field.onChange(e.target.value === '' ? null : Number(e.target.value))}
                                                                disabled={isBusy}
                                                            />
                                                        </FormControl>
                                                        <FormMessage />
                                                    </FormItem>
                                                )} />
                                                <FormField control={form.control} name="bathrooms" render={({ field }) => (
                                                    <FormItem>
                                                        <FormLabel>Bathrooms</FormLabel>
                                                        <FormControl>
                                                            <Input
                                                                type="number"
                                                                min="0"
                                                                step="0.5"
                                                                {...field}
                                                                value={field.value ?? ''} // Handle null
                                                                onChange={e => field.onChange(e.target.value === '' ? null : Number(e.target.value))}
                                                                disabled={isBusy}
                                                            />
                                                        </FormControl>
                                                        <FormDescription>Use 0.5 for half bathrooms</FormDescription>
                                                        <FormMessage />
                                                    </FormItem>
                                                )} />
                                            </div>
                                        </>
                                    )}
                                    {propertyCategory === "ROOM" && (
                                        <>
                                            <FormField control={form.control} name="room_type" render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>Room Type</FormLabel>
                                                    <Select onValueChange={field.onChange} value={field.value ?? ''} disabled={isBusy}>
                                                        <FormControl>
                                                            <SelectTrigger>
                                                                <SelectValue placeholder="Select room type" />
                                                            </SelectTrigger>
                                                        </FormControl>
                                                        <SelectContent>
                                                            <SelectItem value="PRIVATE">Private Room</SelectItem>
                                                            <SelectItem value="SHARED">Shared Room</SelectItem>
                                                            <SelectItem value="OTHER">Other</SelectItem>
                                                        </SelectContent>
                                                    </Select>
                                                    <FormMessage />
                                                </FormItem>
                                            )} />

                                            {/* Group Info Display (if applicable) */}
                                            {propertyGroup && (
                                                <div className="bg-indigo-50 p-4 rounded-md border border-indigo-100">
                                                    <div className="flex items-center mb-2">
                                                        <Users className="h-4 w-4 text-indigo-600 mr-2" />
                                                        <h3 className="text-sm font-medium text-indigo-800">Property Group</h3>
                                                    </div>
                                                    <p className="text-sm text-indigo-700 mb-1">
                                                        This room belongs to a property group. Shared areas can be defined.
                                                    </p>
                                                     {roomsInGroup.length > 1 && ( // Only show if there are OTHER rooms
                                                        <div className="text-xs text-indigo-600 mt-2">
                                                            <span className="font-medium">Other rooms in this group:</span>{' '}
                                                            {roomsInGroup
                                                                .filter(r => r.id !== Number(propertyId)) // Exclude current room
                                                                .map(r => r.name)
                                                                .join(', ')}
                                                        </div>
                                                     )}
                                                     {roomsInGroup.length <= 1 && (
                                                         <div className="text-xs text-indigo-600 mt-2">
                                                             No other rooms currently listed in this group.
                                                         </div>
                                                     )}
                                                </div>
                                            )}
                                        </>
                                    )}

                                    {/* Common Fields */}
                                    <div className="grid grid-cols-2 gap-4">
                                        <FormField control={form.control} name="max_occupancy" render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Maximum Occupancy</FormLabel>
                                                <FormControl>
                                                    <Input
                                                        type="number"
                                                        min="1"
                                                        {...field}
                                                        onChange={e => field.onChange(Number(e.target.value))} // Ensure number
                                                        disabled={isBusy}
                                                    />
                                                </FormControl>
                                                <FormDescription>Maximum number of people allowed</FormDescription>
                                                <FormMessage />
                                            </FormItem>
                                        )} />
                                        <FormField control={form.control} name="square_footage" render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Square Footage</FormLabel>
                                                <FormControl>
                                                    <Input
                                                        type="number"
                                                        min="0" // Allow 0
                                                        {...field}
                                                         value={field.value ?? ''} // Handle null
                                                         onChange={e => field.onChange(e.target.value === '' ? null : Number(e.target.value))} // Allow clearing to null
                                                        disabled={isBusy}
                                                    />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )} />
                                    </div>
                                </CardContent>
                                <CardFooter className="flex justify-between">
                                    <Button variant="outline" type="button" onClick={() => setActiveTab("location")} disabled={isBusy}>Back: Location</Button>
                                    <Button type="button" onClick={() => setActiveTab("areas")} disabled={isBusy}>Next: Areas</Button>
                                </CardFooter>
                            </Card>
                        </TabsContent>

                        {/* === New Areas Tab === */}
                        <TabsContent value="areas">
                            <Card>
                                <CardHeader>
                                    <CardTitle className="flex items-center justify-between">
                                        <span className="flex items-center">
                                            <Info className="mr-2 h-5 w-5" />
                                            Property Areas
                                        </span>
                                        <Button
                                            size="sm"
                                            type="button" // Ensure it doesn't submit the main form
                                            onClick={handleAddArea}
                                            disabled={isBusy}
                                            className="h-8"
                                        >
                                            <Plus className="h-4 w-4 mr-2" /> Add Area
                                        </Button>
                                    </CardTitle>
                                    <CardDescription>Define rooms and spaces in this property. Changes here are saved with the main form.</CardDescription>
                                </CardHeader>
                                <CardContent>
                                     {/* Filter out areas marked for deletion for display */}
                                    {areaFields.filter(area => !area.isDeleted).length === 0 ? (
                                        <div className="text-center py-8">
                                            <Info className="h-12 w-12 text-slate-300 mx-auto mb-3" />
                                            <p className="text-slate-500 mb-3">No areas have been defined for this property yet.</p>
                                            <Button
                                                variant="outline"
                                                type="button"
                                                onClick={handleAddArea}
                                                disabled={isBusy}
                                            >
                                                <Plus className="h-4 w-4 mr-2" /> Add First Area
                                            </Button>
                                        </div>
                                    ) : (
                                        <div className="space-y-4">
                                            {areaFields.map((area, index) => {
                                                if (area.isDeleted) return null; // Don't render deleted areas

                                                const statusInfo = getAreaStatusInfo(area.status as AreaStatusValue);

                                                return (
                                                    <div
                                                        key={area.id ?? `new-${index}`} // Use field ID or index for new items
                                                        className="p-4 rounded-md border bg-slate-50 flex flex-col"
                                                    >
                                                        <div className="flex justify-between items-start mb-2">
                                                            <div>
                                                                <h3 className="font-medium">
                                                                    {area.count > 1 ? `${area.count}× ` : ''}
                                                                    {getAreaTypeLabel(area.area_type as string)}
                                                                </h3>
                                                                <Badge variant="outline" className={`mt-1 text-xs ${statusInfo.color}`}>
                                                                    {statusInfo.label}
                                                                </Badge>
                                                            </div>
                                                            <div className="flex space-x-1">
                                                                <Button
                                                                    variant="ghost"
                                                                    size="sm"
                                                                    type="button"
                                                                    className="h-8 w-8 p-0"
                                                                    onClick={() => handleEditArea(index)}
                                                                    disabled={isBusy}
                                                                    title="Edit Area"
                                                                >
                                                                    <Edit className="h-4 w-4 text-slate-500" />
                                                                    <span className="sr-only">Edit</span>
                                                                </Button>
                                                                <Button
                                                                    variant="ghost"
                                                                    size="sm"
                                                                    type="button"
                                                                    className="h-8 w-8 p-0 text-red-500 hover:text-red-600 hover:bg-red-50"
                                                                    onClick={() => handleDeleteArea(index)}
                                                                    disabled={isBusy}
                                                                    title="Delete Area"
                                                                >
                                                                    <Trash2 className="h-4 w-4" />
                                                                    <span className="sr-only">Delete</span>
                                                                </Button>
                                                            </div>
                                                        </div>
                                                        {area.description && (
                                                            <p className="text-sm text-slate-600 mt-1">
                                                                {area.description}
                                                            </p>
                                                        )}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                </CardContent>
                                <CardFooter className="flex justify-between">
                                    <Button variant="outline" type="button" onClick={() => setActiveTab("details")} disabled={isBusy}>Back: Details</Button>
                                    <Button type="button" onClick={() => setActiveTab("images")} disabled={isBusy}>Next: Images</Button>
                                </CardFooter>
                            </Card>
                        </TabsContent>

                        {/* === Images Tab === */}
                        <TabsContent value="images">
                            <Card>
                                <CardHeader>
                                    <CardTitle className="flex items-center"><ImageIcon className="mr-2 h-5 w-5" />Property Images</CardTitle>
                                    <CardDescription>Upload and manage images of your property</CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-6">
                                    {/* Primary Image Section */}
                                    <div>
                                        <h3 className="text-lg font-medium mb-2">Primary Image</h3>
                                        <p className="text-sm text-slate-500 mb-4">This is the main image shown in listings</p>
                                        <div className="mb-4">
                                            {primaryImagePreview ? (
                                                <div className="relative group w-full h-64"> {/* Fixed height container */}
                                                    <img
                                                        src={primaryImagePreview} // Uses object URL or fetched full URL
                                                        alt="Primary property image preview"
                                                        className="w-full h-full object-cover rounded-md bg-slate-100 border"
                                                         // Basic fallback for broken image links
                                                        onError={(e) => { (e.target as HTMLImageElement).src = '/placeholder-image.png'; }}
                                                    />
                                                    <Button
                                                        type="button"
                                                        variant="destructive"
                                                        size="icon"
                                                        className="absolute top-2 right-2 opacity-70 group-hover:opacity-100 transition-opacity"
                                                        onClick={() => {
                                                            // Clear state and revoke URL if it's a blob
                                                            if (primaryImagePreview && primaryImagePreview.startsWith('blob:')) {
                                                                URL.revokeObjectURL(primaryImagePreview);
                                                            }
                                                            setPrimaryImage(null);
                                                            setPrimaryImagePreview(null);
                                                            // No need to clear input ref value here, handlePrimaryImageChange does it
                                                        }}
                                                        disabled={isBusy}
                                                        title="Remove primary image"
                                                    >
                                                        <X className="h-4 w-4" />
                                                        <span className="sr-only">Remove primary image</span>
                                                    </Button>
                                                </div>
                                            ) : (
                                                <div className="border-2 border-dashed border-slate-200 rounded-md p-6 text-center h-64 flex flex-col items-center justify-center">
                                                    <ImageIcon className="h-8 w-8 text-slate-400 mb-2" />
                                                    <p className="text-sm text-slate-500">No primary image selected</p>
                                                </div>
                                            )}
                                        </div>
                                        {/* Hidden file input triggered by button */}
                                        <input
                                            type="file"
                                            ref={primaryImageInputRef}
                                            onChange={handlePrimaryImageChange}
                                            accept="image/*"
                                            className="hidden"
                                            disabled={isBusy}
                                        />
                                        {/* Button to trigger file input */}
                                        <Button
                                            type="button"
                                            variant="outline"
                                            onClick={() => primaryImageInputRef.current?.click()}
                                            className="w-full"
                                            disabled={isBusy}
                                        >
                                            <Upload className="h-4 w-4 mr-2" />
                                            {primaryImagePreview ? "Change Primary Image" : "Upload Primary Image"}
                                        </Button>
                                         {/* Show message if image marked for removal */}
                                        {!primaryImage && !primaryImagePreview && initialPrimaryImageUrl && (
                                            <p className="text-xs text-red-600 mt-1 text-center">
                                                Current primary image will be removed upon saving.
                                            </p>
                                        )}
                                    </div>

                                    {/* Additional Images Section */}
                                    <div className="mt-8">
                                        <h3 className="text-lg font-medium mb-2">Additional Images</h3>
                                        <p className="text-sm text-slate-500 mb-4">Upload more images to showcase the property</p>
                                        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 mb-4">
                                            {/* Existing Images */}
                                            {existingImages.map((image) => {
                                                const fullImageUrl = getFullImageUrl(image.image);
                                                return (
                                                    <div key={`existing-${image.id}`} className="relative group">
                                                        <div className="aspect-square bg-slate-100 rounded-md overflow-hidden border">
                                                            <img
                                                                src={fullImageUrl ?? '/placeholder-image.png'}
                                                                alt={image.caption || `Property image ${image.id}`}
                                                                className="w-full h-full object-cover"
                                                                loading="lazy"
                                                                onError={(e) => { (e.target as HTMLImageElement).src = '/placeholder-image.png'; }}
                                                            />
                                                        </div>
                                                        <Button
                                                            type="button"
                                                            variant="destructive"
                                                            size="icon"
                                                            className="absolute top-1 right-1 opacity-60 group-hover:opacity-100 transition-opacity scale-90"
                                                            onClick={() => removeExistingImage(image.id)}
                                                            disabled={isBusy}
                                                            aria-label={`Remove image ${image.id}`}
                                                            title="Remove this image"
                                                        >
                                                            <X className="h-4 w-4" />
                                                        </Button>
                                                        <div className="mt-1">
                                                            <Input
                                                                placeholder="Caption"
                                                                aria-label={`Caption for image ${image.id}`}
                                                                value={image.caption || ''}
                                                                onChange={(e) => updateExistingImageCaption(image.id, e.target.value)}
                                                                className="text-sm h-8"
                                                                disabled={isBusy}
                                                            />
                                                        </div>
                                                    </div>
                                                );
                                            })}

                                            {/* New Additional Images (Previews) */}
                                            {additionalImages.map((imageInfo, index) => (
                                                <div key={`new-${index}`} className="relative group">
                                                    <div className="aspect-square bg-slate-100 rounded-md overflow-hidden border">
                                                        <img src={imageInfo.previewUrl} alt={imageInfo.caption || `New image ${index + 1}`} className="w-full h-full object-cover" />
                                                    </div>
                                                    <Button
                                                        type="button"
                                                        variant="destructive"
                                                        size="icon"
                                                        className="absolute top-1 right-1 opacity-60 group-hover:opacity-100 transition-opacity scale-90"
                                                        onClick={() => removeAdditionalImage(index)}
                                                        disabled={isBusy}
                                                        aria-label={`Remove new image ${index + 1}`}
                                                        title="Remove this image"
                                                    >
                                                        <X className="h-4 w-4" />
                                                    </Button>
                                                    <div className="mt-1">
                                                        <Input
                                                            placeholder="Caption"
                                                            aria-label={`Caption for new image ${index + 1}`}
                                                            value={imageInfo.caption}
                                                            onChange={(e) => updateImageCaption(index, e.target.value)}
                                                            className="text-sm h-8"
                                                            disabled={isBusy}
                                                        />
                                                    </div>
                                                </div>
                                            ))}

                                            {/* Upload Button Placeholder */}
                                            <div className="aspect-square border-2 border-dashed border-slate-300 hover:border-slate-400 rounded-md flex flex-col items-center justify-center p-2 group transition-colors">
                                                <input
                                                    type="file"
                                                    ref={additionalImageInputRef}
                                                    onChange={handleAdditionalImageChange}
                                                    accept="image/*"
                                                    multiple // Allow multiple file selection
                                                    className="hidden"
                                                    disabled={isBusy}
                                                />
                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="sm"
                                                    className="h-full w-full flex flex-col items-center justify-center gap-1 text-slate-500 group-hover:text-slate-700 transition-colors"
                                                    onClick={() => additionalImageInputRef.current?.click()}
                                                    disabled={isBusy}
                                                >
                                                    <Plus className="h-6 w-6" />
                                                    <span className="text-xs text-center">Add Images</span>
                                                </Button>
                                            </div>
                                        </div>
                                    </div>
                                </CardContent>
                                <CardFooter className="flex justify-between">
                                    <Button variant="outline" type="button" onClick={() => setActiveTab("areas")} disabled={isBusy}>Back: Areas</Button>
                                    {/* Main Submit Button */}
                                    <Button
                                        type="submit" // This button submits the form
                                        disabled={isBusy}
                                        className="bg-teal-600 hover:bg-teal-700"
                                    >
                                        {isBusy ? (
                                            <>
                                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                {isSubmitting ? "Saving Property..." :
                                                 isProcessingAreas ? "Processing Areas..." :
                                                 isProcessingImages ? "Processing Images..." : "Processing..."}
                                            </>
                                        ) : (
                                            <>
                                                <Save className="mr-2 h-4 w-4" /> Save Changes
                                            </>
                                        )}
                                    </Button>
                                </CardFooter>
                            </Card>
                        </TabsContent>
                    </Tabs>
                </form> {/* End of main form */}
            </Form>

            {/* Area Edit/Add Dialog */}
            <Dialog open={showAreaDialog} onOpenChange={setShowAreaDialog}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{editingAreaIndex !== null ? "Edit Area" : "Add New Area"}</DialogTitle>
                        <DialogDescription>
                            Define the rooms and spaces in your property. Click {editingAreaIndex !== null ? "Update" : "Add"} to confirm.
                        </DialogDescription>
                    </DialogHeader>

                    {/* Form specifically for the dialog */}
                    <Form {...areaForm}>
                        {/* Use native form element inside Dialog for its own submit */}
                        <form onSubmit={areaForm.handleSubmit(handleSaveArea)} className="space-y-4">
                             <FormField
                                control={areaForm.control}
                                name="area_type"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Area Type</FormLabel>
                                        <Select onValueChange={field.onChange} value={field.value}>
                                            <FormControl>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Select area type" />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                {AREA_TYPE_CHOICES.map(choice => (
                                                    <SelectItem key={choice.value} value={choice.value}>
                                                        {choice.label}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )}
                             />

                            <FormField
                                control={areaForm.control}
                                name="count"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Count</FormLabel>
                                        <FormControl>
                                            <Input
                                                type="number"
                                                min="1"
                                                {...field}
                                                onChange={e => field.onChange(Number(e.target.value))}
                                            />
                                        </FormControl>
                                        <FormDescription>
                                            How many of this area type? (e.g., 2 bathrooms)
                                        </FormDescription>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={areaForm.control}
                                name="description"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Description (Optional)</FormLabel>
                                        <FormControl>
                                            <Textarea
                                                placeholder="e.g., 'Main floor bathroom with shower'"
                                                className="min-h-[80px]"
                                                {...field}
                                                value={field.value ?? ''} // Handle null
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                             />

                            <FormField
                                control={areaForm.control}
                                name="status"
                                render={({ field }) => (
                                    <FormItem className="space-y-3">
                                        <FormLabel>Area Status / Sharing</FormLabel>
                                        <FormControl>
                                            <RadioGroup
                                                onValueChange={field.onChange}
                                                value={field.value}
                                                className="space-y-3"
                                            >
                                                 {/* Filter options based on property category and group status */}
                                                 {AREA_STATUS_OPTIONS
                                                    .filter(option => {
                                                        if (propertyCategory === 'COMPLETE_UNIT') {
                                                            return option.value === 'private_general';
                                                        } else if (propertyCategory === 'ROOM') {
                                                            if (option.value === 'shared_group') {
                                                                // Only allow shared if the property is in a group
                                                                return !!propertyGroup;
                                                            }
                                                            return true; // Allow private_specific and private_general
                                                        }
                                                        return false; // Should not happen
                                                    })
                                                    .map(option => (
                                                        <div
                                                            key={option.value}
                                                            className={`flex items-start space-x-3 rounded-md border p-3 transition-colors ${
                                                                field.value === option.value ? 'border-indigo-500 bg-indigo-50' : 'border-gray-200 hover:border-gray-300'
                                                            }`}
                                                        >
                                                            <FormControl>
                                                                <RadioGroupItem
                                                                    value={option.value}
                                                                    id={option.value}
                                                                    // Note: The filter above already handles disabling shared if no group
                                                                    // disabled={option.value === 'shared_group' && !propertyGroup}
                                                                />
                                                            </FormControl>
                                                            <div className="space-y-1 leading-none">
                                                                <Label htmlFor={option.value} className={`font-medium ${option.value === 'shared_group' && !propertyGroup ? 'text-muted-foreground' : ''}`}>
                                                                    {option.label}
                                                                    {/* Optional: Indicate if disabled visually */}
                                                                    {/* {option.value === 'shared_group' && !propertyGroup ? ' (N/A - Not in Group)' : ''} */}
                                                                </Label>
                                                                <p className="text-xs text-muted-foreground">
                                                                    {option.description}
                                                                </p>
                                                            </div>
                                                        </div>
                                                ))}
                                            </RadioGroup>
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <DialogFooter>
                                <Button
                                    type="button" // Prevent submission of the main form
                                    variant="outline"
                                    onClick={() => setShowAreaDialog(false)}
                                >
                                    Cancel
                                </Button>
                                <Button type="submit"> {/* Submits the areaForm */}
                                    <Check className="mr-2 h-4 w-4" />
                                    {editingAreaIndex !== null ? "Update Area" : "Add Area"}
                                </Button>
                            </DialogFooter>
                        </form>
                    </Form>
                </DialogContent>
            </Dialog>
        </div> // End of main container div
    )
} // End of EditPropertyPage component