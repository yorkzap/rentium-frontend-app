// src/components/dashboard/landlord/inventory/constants.ts

// Assuming InventoryItemData will be updated later to remove is_shared
// Define a temporary type for suggestions based on the NEW structure
interface SharedInventoryItemSuggestion { // Define based on SharedInventoryItem model
    name: string;
    quantity?: number;
    condition?: 'NEW' | 'GOOD' | 'FAIR' | 'POOR' | 'DAMAGED' | 'MISSING' | null;
    location_description?: string;
    description?: string;
}
interface PrivateInventoryItemSuggestion { // Define based on InventoryItem model
    name: string;
    quantity?: number;
    condition?: 'NEW' | 'GOOD' | 'FAIR' | 'POOR' | 'DAMAGED' | 'MISSING' | null;
    location_description?: string;
    description?: string;
}

// Define the structure for a common item suggestion, including its type
export interface CommonItemSuggestion {
    name: string; // Display name
    itemType: 'private' | 'shared';
    // Default values based on the target model
    defaults: PrivateInventoryItemSuggestion | SharedInventoryItemSuggestion;
}


export const COMMON_INVENTORY_ITEMS: CommonItemSuggestion[] = [
    // Keys
    { name: "Front Door Key", itemType: 'shared', defaults: { name: "Front Door Key", quantity: 1, location_description: "Key Box/Office", condition: "GOOD" }},
    { name: "Room Key", itemType: 'private', defaults: { name: "Room Key", quantity: 1, location_description: "Tenant Room Door", condition: "GOOD" }},
    { name: "Mailbox Key", itemType: 'shared', defaults: { name: "Mailbox Key", quantity: 1, location_description: "Mailbox Area", condition: "GOOD" }},

    // Bedroom Furniture (Mostly Private)
    { name: "Bed Frame (Queen)", itemType: 'private', defaults: { name: "Bed Frame (Queen)", quantity: 1, location_description: "Bedroom", condition: "GOOD" }},
    { name: "Bed Frame (Double)", itemType: 'private', defaults: { name: "Bed Frame (Double)", quantity: 1, location_description: "Bedroom", condition: "GOOD" }},
    { name: "Bed Frame (Single)", itemType: 'private', defaults: { name: "Bed Frame (Single)", quantity: 1, location_description: "Bedroom", condition: "GOOD" }},
    { name: "Mattress (Queen)", itemType: 'private', defaults: { name: "Mattress (Queen)", quantity: 1, location_description: "Bedroom", condition: "GOOD" }},
    { name: "Mattress (Double)", itemType: 'private', defaults: { name: "Mattress (Double)", quantity: 1, location_description: "Bedroom", condition: "GOOD" }},
    { name: "Mattress (Single)", itemType: 'private', defaults: { name: "Mattress (Single)", quantity: 1, location_description: "Bedroom", condition: "GOOD" }},
    { name: "Pillow", itemType: 'private', defaults: { name: "Pillow", quantity: 2, location_description: "Bedroom", condition: "GOOD" }},
    { name: "Bedsheets & Pillowcases Set", itemType: 'private', defaults: { name: "Bedsheets & Pillowcases Set", quantity: 1, location_description: "Bedroom Closet", condition: "GOOD" }},
    { name: "Desk", itemType: 'private', defaults: { name: "Desk", quantity: 1, location_description: "Bedroom", condition: "GOOD" }},
    { name: "Desk Chair", itemType: 'private', defaults: { name: "Desk Chair", quantity: 1, location_description: "Bedroom", condition: "GOOD" }},
    { name: "Dresser/Chest of Drawers", itemType: 'private', defaults: { name: "Dresser/Chest of Drawers", quantity: 1, location_description: "Bedroom", condition: "GOOD" }},
    { name: "Bedside Table", itemType: 'private', defaults: { name: "Bedside Table", quantity: 1, location_description: "Bedroom", condition: "GOOD" }},
    { name: "Lamp (Desk/Bedside)", itemType: 'private', defaults: { name: "Lamp (Desk/Bedside)", quantity: 1, location_description: "Bedroom", condition: "GOOD" }},
    { name: "Closet Hangers", itemType: 'private', defaults: { name: "Closet Hangers", quantity: 10, location_description: "Bedroom Closet", condition: "GOOD" }},
    { name: "Trash Bin (Room)", itemType: 'private', defaults: { name: "Trash Bin (Room)", quantity: 1, location_description: "Bedroom", condition: "GOOD" }},
    { name: "Portable Heater", itemType: 'private', defaults: { name: "Portable Heater", quantity: 1, location_description: "Bedroom", condition: "GOOD" }},


    // Appliances & Kitchen (Mostly Shared)
    { name: "Microwave Oven", itemType: 'shared', defaults: { name: "Microwave Oven", quantity: 1, location_description: "Kitchen Counter", condition: "GOOD" }},
    { name: "Refrigerator", itemType: 'shared', defaults: { name: "Refrigerator", quantity: 1, location_description: "Kitchen", condition: "GOOD" }},
    { name: "Toaster", itemType: 'shared', defaults: { name: "Toaster", quantity: 1, location_description: "Kitchen Counter", condition: "GOOD" }},
    { name: "Kettle", itemType: 'shared', defaults: { name: "Kettle", quantity: 1, location_description: "Kitchen Counter", condition: "GOOD" }},
    { name: "Coffee Maker", itemType: 'shared', defaults: { name: "Coffee Maker", quantity: 1, location_description: "Kitchen Counter", condition: "GOOD" }},
    { name: "Kitchen Utensils Set", itemType: 'shared', defaults: { name: "Kitchen Utensils Set", quantity: 1, location_description: "Kitchen Drawer", condition: "GOOD" }},
    { name: "Pots & Pans Set", itemType: 'shared', defaults: { name: "Pots & Pans Set", quantity: 1, location_description: "Kitchen Cabinet", condition: "GOOD" }},
    { name: "Plates Set", itemType: 'shared', defaults: { name: "Plates Set", quantity: 4, location_description: "Kitchen Cabinet", condition: "GOOD" }},
    { name: "Bowls Set", itemType: 'shared', defaults: { name: "Bowls Set", quantity: 4, location_description: "Kitchen Cabinet", condition: "GOOD" }},
    { name: "Mugs/Cups Set", itemType: 'shared', defaults: { name: "Mugs/Cups Set", quantity: 4, location_description: "Kitchen Cabinet", condition: "GOOD" }},
    { name: "Cutlery Set", itemType: 'shared', defaults: { name: "Cutlery Set", quantity: 1, location_description: "Kitchen Drawer", condition: "GOOD" }},
    { name: "Dish Rack", itemType: 'shared', defaults: { name: "Dish Rack", quantity: 1, location_description: "Kitchen Sink Area", condition: "GOOD" }},
    { name: "Trash Bin (Kitchen)", itemType: 'shared', defaults: { name: "Trash Bin (Kitchen)", quantity: 1, location_description: "Kitchen", condition: "GOOD" }},


    // Common Areas Furniture / Items (Shared)
    { name: "Dining Table", itemType: 'shared', defaults: { name: "Dining Table", quantity: 1, location_description: "Dining Area", condition: "GOOD" }},
    { name: "Dining Chair", itemType: 'shared', defaults: { name: "Dining Chair", quantity: 4, location_description: "Dining Area", condition: "GOOD" }},
    { name: "Sofa/Couch", itemType: 'shared', defaults: { name: "Sofa/Couch", quantity: 1, location_description: "Living Room", condition: "GOOD" }},
    { name: "Coffee Table", itemType: 'shared', defaults: { name: "Coffee Table", quantity: 1, location_description: "Living Room", condition: "GOOD" }},
    { name: "TV", itemType: 'shared', defaults: { name: "TV", quantity: 1, location_description: "Living Room", condition: "GOOD" }},
    { name: "Lamp (Floor/Living)", itemType: 'shared', defaults: { name: "Lamp (Floor/Living)", quantity: 1, location_description: "Living Room", condition: "GOOD" }},


    // Cleaning & Utilities (Mostly Shared)
    { name: "Recycling Bin", itemType: 'shared', defaults: { name: "Recycling Bin", quantity: 1, location_description: "Kitchen/Utility", condition: "GOOD" }},
    { name: "Trash Bin (Bathroom)", itemType: 'shared', defaults: { name: "Trash Bin (Bathroom)", quantity: 1, location_description: "Bathroom", condition: "GOOD" }},
    { name: "Broom & Dustpan", itemType: 'shared', defaults: { name: "Broom & Dustpan", quantity: 1, location_description: "Utility Closet/Kitchen", condition: "GOOD" }},
    { name: "Mop & Bucket", itemType: 'shared', defaults: { name: "Mop & Bucket", quantity: 1, location_description: "Utility Closet/Kitchen", condition: "GOOD" }},
    { name: "Vacuum Cleaner", itemType: 'shared', defaults: { name: "Vacuum Cleaner", quantity: 1, location_description: "Utility Closet", condition: "GOOD" }},
    { name: "Basic Cleaning Supplies", itemType: 'shared', defaults: { name: "Basic Cleaning Supplies", quantity: 1, location_description: "Under Sink/Utility", condition: "GOOD" }},
    { name: "Smoke Detector", itemType: 'shared', defaults: { name: "Smoke Detector", quantity: 1, location_description: "Ceiling", condition: "GOOD" }},
    { name: "CO Detector", itemType: 'shared', defaults: { name: "CO Detector", quantity: 1, location_description: "Hallway/Near Furnace", condition: "GOOD" }},
];