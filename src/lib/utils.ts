// src/lib/utils.ts
import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Helper to capitalize first letter and replace underscores
export function capitalize(str: string | null | undefined): string {
    if (!str) return '';
    const formatted = str.replace(/_/g, ' ');
    return formatted.charAt(0).toUpperCase() + formatted.slice(1).toLowerCase();
}

// Helper to format status display text
export function formatStatus(status?: 'AVAILABLE' | 'OCCUPIED' | 'MAINTENANCE' | 'NOT_AVAILABLE'): string {
    if (!status) return '-';
    switch (status) {
        case 'AVAILABLE': return 'Available';
        case 'OCCUPIED': return 'Occupied';
        case 'MAINTENANCE': return 'Maintenance';
        case 'NOT_AVAILABLE': return 'Not Available';
        default: return capitalize(status); // Fallback for any unexpected values
    }
}

// You can add more specific formatters if needed, e.g., for unit_type, room_type
export function formatUnitType(type?: string | null): string {
     if (!type) return '-';
     return capitalize(type);
}

export function formatRoomType(type?: string | null): string {
    if (!type) return '-';
    return capitalize(type);
}