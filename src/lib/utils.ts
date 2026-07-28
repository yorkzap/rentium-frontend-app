// src/lib/utils.ts
import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// ---------------------------------------------------------------- dates
//
// Django serializes a DateField as a bare "YYYY-MM-DD". `new Date("2026-08-01")`
// parses that as UTC midnight, so anywhere west of Greenwich it renders as the
// PREVIOUS day — a rent charge due Aug 1 showed up as "Jul 31", filed under
// July, contradicting a server-side monthly total that (correctly) counted it
// in August.
//
// A DateTimeField ("2026-08-01T22:30:00Z") is a real instant and must NOT be
// touched. Deciding which is which at each of ~84 call sites is exactly the
// judgement that got missed, so the regex decides instead of the caller.

const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;

/** Parse an API date. Date-only strings land on local midnight; timestamps are left alone. */
export function parseLocalDate(iso: string | null | undefined): Date | null {
  if (!iso) return null;
  const d = new Date(DATE_ONLY.test(iso) ? `${iso}T00:00:00` : iso);
  return isNaN(d.getTime()) ? null : d;
}

/** Format an API date for display. Falls back to the raw string rather than "Invalid Date". */
export function dateLabel(
  iso: string | null | undefined,
  opts: Intl.DateTimeFormatOptions = {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  },
  locale = 'en-CA'
): string {
  if (!iso) return '—';
  const d = parseLocalDate(iso);
  return d ? d.toLocaleDateString(locale, opts) : iso;
}

// Helper to capitalize first letter and replace underscores
export function capitalize(str: string | null | undefined): string {
  if (!str) return '';
  const formatted = str.replace(/_/g, ' ');
  return formatted.charAt(0).toUpperCase() + formatted.slice(1).toLowerCase();
}

// Helper to format status display text
export function formatStatus(
  status?: 'AVAILABLE' | 'OCCUPIED' | 'MAINTENANCE' | 'NOT_AVAILABLE'
): string {
  if (!status) return '-';
  switch (status) {
    case 'AVAILABLE':
      return 'Available';
    case 'OCCUPIED':
      return 'Occupied';
    case 'MAINTENANCE':
      return 'Maintenance';
    case 'NOT_AVAILABLE':
      return 'Not Available';
    default:
      return capitalize(status); // Fallback for any unexpected values
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
