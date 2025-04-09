// src/components/dashboard/landlord/properties/constants.ts

export const AREA_TYPE_CHOICES = [
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
] as const; // Use 'as const' for stricter typing

// Define Area Status options for the form
export const AREA_STATUS_OPTIONS = [
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
export type AreaStatusValue = typeof AREA_STATUS_OPTIONS[number]['value'];