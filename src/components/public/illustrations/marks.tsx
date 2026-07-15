// Decorative hand-drawn marks. These are what make the difference between
// "template" and "drawn for us": every check, underline and arrow on the
// public site comes from here, in one consistent hand.
//
// Style rules (applies to spots.tsx too):
//   - strokes 2–2.5, round caps/joins, paths with a deliberate wobble
//   - colors via currentColor or tokens; never gradients
//   - tiny rotations; nothing perfectly straight

import { cn } from '@/lib/utils';

/** Hand-drawn check — replaces lucide <Check> in all marketing bullets. */
export function WobblyCheck({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      className={cn('h-4 w-4', className)}
      aria-hidden
    >
      <path
        d="M4.5 13.2c1.8 1.5 3.4 3.6 4.2 5.1 1.9-4.8 6-10.9 10.6-14.1"
        stroke="currentColor"
        strokeWidth="2.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/**
 * Hand-drawn underline for one word in a headline:
 *   <span className="relative">word<Underline /></span>
 */
export function Underline({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 220 14"
      fill="none"
      preserveAspectRatio="none"
      className={cn(
        'absolute -bottom-2 left-0 h-[0.32em] w-full text-brand',
        className
      )}
      aria-hidden
    >
      <path
        d="M4 9.5C40 5 78 4 112 5.5c-20 1-38 2.5-52 5 44-3.5 106-5 156-2.5"
        stroke="currentColor"
        strokeWidth="5"
        strokeLinecap="round"
      />
    </svg>
  );
}

/** Loose curved arrow, points down-right by default. */
export function CurvedArrow({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 64 64"
      fill="none"
      className={cn('h-12 w-12', className)}
      aria-hidden
    >
      <path
        d="M10 8c3 18 14 33 36 40"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinecap="round"
      />
      <path
        d="M36 46c4 2 7.5 2.8 11 2.4-1.8 2.6-3 5.6-3.4 9"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** Sparse plus/dot confetti — use ONE per section, small, low-contrast. */
export function Sparkles({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 80 80"
      fill="none"
      className={cn('h-16 w-16', className)}
      aria-hidden
    >
      <path
        d="M14 22v12M8 28h12"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
      />
      <path
        d="M62 10v8M58 14h8"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        opacity="0.7"
      />
      <circle cx="70" cy="52" r="2.6" fill="currentColor" opacity="0.55" />
      <circle cx="34" cy="66" r="2" fill="currentColor" opacity="0.4" />
    </svg>
  );
}

/** Rough circle for ringing a number or word ("30 days free"). */
export function ScribbleRing({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 120 56"
      fill="none"
      preserveAspectRatio="none"
      className={cn(
        'absolute -inset-x-3 -inset-y-1 h-[calc(100%+8px)] w-[calc(100%+24px)] text-brand',
        className
      )}
      aria-hidden
    >
      <path
        d="M30 8C12 12 4 20 6 30c2.5 12 26 20 56 18s54-12 52-24C112 13 88 5 62 6c-10 .4-19 2-26 4.5"
        stroke="currentColor"
        strokeWidth="2.6"
        strokeLinecap="round"
      />
    </svg>
  );
}
