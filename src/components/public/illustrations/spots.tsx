// Spot illustrations — small hand-drawn scenes in the product's own hand.
// One style: wobbly dark-teal line work, warm paper fills, a single brand
// accent per scene, tiny rotations. All decorative (aria-hidden); the copy
// beside them carries the meaning.

import { cn } from '@/lib/utils';

const INK = 'hsl(var(--brand-ink))';
const BRAND = 'hsl(var(--brand))';
const SOFT = 'hsl(var(--brand-soft))';
const WARM = 'hsl(var(--warn-soft))';
const PAPER = 'hsl(var(--surface))';

type SpotProps = { className?: string };

/** A lease being signed: document, oversized pencil, signature squiggle. */
export function LeaseSigning({ className }: SpotProps) {
  return (
    <svg
      viewBox="0 0 160 140"
      fill="none"
      className={cn('h-32 w-auto', className)}
      aria-hidden
    >
      {/* warm backdrop blob */}
      <path
        d="M28 84c-8-26 8-52 38-58s62 4 66 28-10 48-40 56-56 0-64-26z"
        fill={WARM}
        opacity="0.6"
      />
      {/* document, slightly tilted */}
      <g transform="rotate(-4 80 70)">
        <path
          d="M50 26l52-3 4 84-56 3z"
          fill={PAPER}
          stroke={INK}
          strokeWidth="2.4"
          strokeLinejoin="round"
        />
        {/* folded corner */}
        <path
          d="M102 23l4 14-12-.5"
          fill={SOFT}
          stroke={INK}
          strokeWidth="2"
          strokeLinejoin="round"
        />
        {/* text lines */}
        <path
          d="M58 42c10-1 20-1.5 30-1.5"
          stroke={INK}
          strokeWidth="2"
          strokeLinecap="round"
          opacity="0.55"
        />
        <path
          d="M58.5 52c8-.8 16-1 26-1"
          stroke={INK}
          strokeWidth="2"
          strokeLinecap="round"
          opacity="0.55"
        />
        <path
          d="M59 62c11-.8 18-1 28-.8"
          stroke={INK}
          strokeWidth="2"
          strokeLinecap="round"
          opacity="0.55"
        />
        {/* signature squiggle */}
        <path
          d="M58 92c4-7 7 2 11-4s6 3 10-3 5 1 12-4"
          stroke={BRAND}
          strokeWidth="2.6"
          strokeLinecap="round"
        />
      </g>
      {/* oversized pencil coming in from the right */}
      <g transform="rotate(38 118 78)">
        <rect
          x="108"
          y="34"
          width="13"
          height="58"
          rx="2"
          fill={WARM}
          stroke={INK}
          strokeWidth="2.4"
        />
        <path
          d="M108 92h13l-6.5 14z"
          fill={PAPER}
          stroke={INK}
          strokeWidth="2.4"
          strokeLinejoin="round"
        />
        <path d="M111.5 100l3-6 3 6" fill={INK} />
        <rect
          x="108"
          y="28"
          width="13"
          height="7"
          rx="2"
          fill={BRAND}
          stroke={INK}
          strokeWidth="2.2"
        />
      </g>
    </svg>
  );
}

/** Move-in inspection: clipboard with room checklist, one box mid-check. */
export function InspectionWalk({ className }: SpotProps) {
  return (
    <svg
      viewBox="0 0 160 140"
      fill="none"
      className={cn('h-32 w-auto', className)}
      aria-hidden
    >
      <path
        d="M30 78c-6-30 16-52 46-54s58 12 56 40-24 46-52 46-44-8-50-32z"
        fill={SOFT}
        opacity="0.7"
      />
      <g transform="rotate(3 80 72)">
        {/* board */}
        <rect
          x="46"
          y="26"
          width="66"
          height="88"
          rx="6"
          fill={PAPER}
          stroke={INK}
          strokeWidth="2.4"
        />
        {/* clip */}
        <path
          d="M68 26c0-6 5-10 11-10s11 4 11 10"
          stroke={INK}
          strokeWidth="2.4"
          fill="none"
        />
        <rect
          x="64"
          y="22"
          width="30"
          height="10"
          rx="3"
          fill={WARM}
          stroke={INK}
          strokeWidth="2.2"
        />
        {/* checklist rows: box + label line */}
        {[46, 64, 82, 98].map((y, i) => (
          <g key={y}>
            <rect
              x="54"
              y={y}
              width="11"
              height="11"
              rx="2.5"
              fill={i < 2 ? SOFT : PAPER}
              stroke={INK}
              strokeWidth="2"
            />
            <path
              d={`M72 ${y + 6}c9-1 18-1.2 ${i % 2 ? 24 : 30}-1`}
              stroke={INK}
              strokeWidth="2"
              strokeLinecap="round"
              opacity="0.5"
            />
            {i < 2 && (
              <path
                d={`M55.5 ${y + 6}c1.6 1.4 2.8 3 3.4 4.4 1.6-3.8 4.4-7.6 7.6-10.4`}
                stroke={BRAND}
                strokeWidth="2.6"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            )}
          </g>
        ))}
      </g>
      {/* big pencil ticking the third box */}
      <g transform="rotate(-30 122 86)">
        <rect
          x="118"
          y="52"
          width="10"
          height="42"
          rx="2"
          fill={WARM}
          stroke={INK}
          strokeWidth="2.2"
        />
        <path
          d="M118 94h10l-5 11z"
          fill={PAPER}
          stroke={INK}
          strokeWidth="2.2"
          strokeLinejoin="round"
        />
      </g>
    </svg>
  );
}

/** The honest ledger: open book, entry lines, money tags. */
export function LedgerBook({ className }: SpotProps) {
  return (
    <svg
      viewBox="0 0 170 140"
      fill="none"
      className={cn('h-32 w-auto', className)}
      aria-hidden
    >
      <path
        d="M26 70c0-28 24-46 58-46s62 16 62 44-26 48-60 48S26 98 26 70z"
        fill={WARM}
        opacity="0.55"
      />
      <g transform="rotate(-2 85 78)">
        {/* left + right pages */}
        <path
          d="M85 44c-14-7-30-8-44-5l2 62c14-3 29-2 42 5z"
          fill={PAPER}
          stroke={INK}
          strokeWidth="2.4"
          strokeLinejoin="round"
        />
        <path
          d="M85 44c14-7 30-8 44-5l-2 62c-14-3-29-2-42 5z"
          fill={PAPER}
          stroke={INK}
          strokeWidth="2.4"
          strokeLinejoin="round"
        />
        {/* entries left page */}
        <path
          d="M50 56c8-1.6 16-2 26-1.4"
          stroke={INK}
          strokeWidth="2"
          strokeLinecap="round"
          opacity="0.5"
        />
        <path
          d="M50.5 66c7-1.4 14-1.6 24-1"
          stroke={INK}
          strokeWidth="2"
          strokeLinecap="round"
          opacity="0.5"
        />
        <path
          d="M51 76c8-1.4 15-1.6 23-1"
          stroke={INK}
          strokeWidth="2"
          strokeLinecap="round"
          opacity="0.5"
        />
        {/* entries right page with amount ticks */}
        <path
          d="M94 55c7-.6 13-.6 20 0"
          stroke={INK}
          strokeWidth="2"
          strokeLinecap="round"
          opacity="0.5"
        />
        <path
          d="M94 65c6-.4 12-.4 19 .2"
          stroke={INK}
          strokeWidth="2"
          strokeLinecap="round"
          opacity="0.5"
        />
        <path
          d="M95 76c1.4 1.2 2.4 2.6 3 3.8 1.4-3.4 3.8-6.6 6.6-9"
          stroke={BRAND}
          strokeWidth="2.4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </g>
      {/* floating amount chip */}
      <g transform="rotate(5 128 34)">
        <rect
          x="104"
          y="22"
          width="48"
          height="22"
          rx="11"
          fill={SOFT}
          stroke={INK}
          strokeWidth="2.2"
        />
        <text
          x="128"
          y="37"
          textAnchor="middle"
          fontSize="12"
          fontWeight="600"
          fill={INK}
          fontFamily="inherit"
        >
          +$425
        </text>
      </g>
    </svg>
  );
}

/** Keys to a little house — for the CTA. */
export function HouseKeys({ className }: SpotProps) {
  return (
    <svg
      viewBox="0 0 170 140"
      fill="none"
      className={cn('h-32 w-auto', className)}
      aria-hidden
    >
      <path
        d="M30 80c-4-28 18-50 50-52s60 12 58 40-22 50-54 50-50-12-54-38z"
        fill={SOFT}
        opacity="0.7"
      />
      {/* house */}
      <g transform="rotate(-2 78 78)">
        <path
          d="M44 70l34-26 35 25-1 44-67 1z"
          fill={PAPER}
          stroke={INK}
          strokeWidth="2.4"
          strokeLinejoin="round"
        />
        {/* roof overhang */}
        <path
          d="M38 73l40-31 41 30"
          stroke={INK}
          strokeWidth="2.6"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
        {/* door */}
        <path
          d="M70 113l.5-24c0-3 2.5-5 5.5-5h5c3 0 5.5 2 5.5 5l.5 24"
          fill={WARM}
          stroke={INK}
          strokeWidth="2.2"
          strokeLinejoin="round"
        />
        <circle cx="83" cy="101" r="1.6" fill={INK} />
        {/* window */}
        <rect
          x="94"
          y="82"
          width="14"
          height="13"
          rx="2"
          fill={SOFT}
          stroke={INK}
          strokeWidth="2"
        />
        <path d="M101 82v13M94 88.5h14" stroke={INK} strokeWidth="1.6" />
        {/* chimney */}
        <path
          d="M96 55v-9h8v15"
          stroke={INK}
          strokeWidth="2.2"
          fill={PAPER}
          strokeLinejoin="round"
        />
      </g>
      {/* oversized key lying at the doorstep */}
      <g transform="rotate(-14 122 118)">
        <circle
          cx="103"
          cy="118"
          r="12"
          fill={WARM}
          stroke={INK}
          strokeWidth="2.6"
        />
        <circle
          cx="103"
          cy="118"
          r="4.5"
          fill={PAPER}
          stroke={INK}
          strokeWidth="2.2"
        />
        <path
          d="M115 118h46"
          stroke={INK}
          strokeWidth="3"
          strokeLinecap="round"
        />
        <path
          d="M150 118v9M159 118v12"
          stroke={INK}
          strokeWidth="3"
          strokeLinecap="round"
        />
      </g>
    </svg>
  );
}

/** A deadline arriving by mail: envelope, notice peeking out, clock. */
export function MailNotice({ className }: SpotProps) {
  return (
    <svg
      viewBox="0 0 160 140"
      fill="none"
      className={cn('h-32 w-auto', className)}
      aria-hidden
    >
      <path
        d="M28 76c-2-26 20-46 50-46s56 14 54 40-24 44-52 44-50-14-52-38z"
        fill={WARM}
        opacity="0.55"
      />
      {/* notice sheet peeking out */}
      <g transform="rotate(-6 80 56)">
        <rect
          x="56"
          y="34"
          width="50"
          height="40"
          rx="3"
          fill={PAPER}
          stroke={INK}
          strokeWidth="2.2"
        />
        <path
          d="M64 44c9-1 18-1.2 26-.8M64.5 52c7-.8 14-1 22-.6"
          stroke={INK}
          strokeWidth="2"
          strokeLinecap="round"
          opacity="0.5"
        />
        <path
          d="M64 61c5-.6 9-.6 14-.2"
          stroke={BRAND}
          strokeWidth="2.2"
          strokeLinecap="round"
        />
      </g>
      {/* envelope */}
      <g transform="rotate(2 80 92)">
        <path
          d="M42 74l76-2 2 44-78 2z"
          fill={SOFT}
          stroke={INK}
          strokeWidth="2.4"
          strokeLinejoin="round"
        />
        <path
          d="M43 75l38 24 37-25"
          stroke={INK}
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
      </g>
      {/* small deadline clock */}
      <g transform="rotate(8 128 44)">
        <circle
          cx="128"
          cy="44"
          r="14"
          fill={PAPER}
          stroke={INK}
          strokeWidth="2.4"
        />
        <path
          d="M128 36v9l6 4"
          stroke={BRAND}
          strokeWidth="2.4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </g>
    </svg>
  );
}

/**
 * Canada, simplified and friendly: a rough southern-Canada silhouette with
 * straight prairie borders (they really are straight), BC filled in brand
 * teal with a location pin. Deliberately loose — a drawing, not a GIS asset.
 */
export function CanadaMap({ className }: SpotProps) {
  return (
    <svg
      viewBox="0 0 320 200"
      fill="none"
      className={cn('h-44 w-auto', className)}
      aria-hidden
    >
      {/* Mainland, traced from real landmarks on a simple lon/lat grid
          (lon −141…−52 → x 0…320, lat 72…41 → y 0…200): the 141st meridian,
          the arctic coast, Hudson Bay + James Bay, Ungava, Labrador, the
          Maritimes, the St. Lawrence, the Great Lakes and the straight
          49th parallel back to the BC coast. A drawing, but *of Canada*. */}
      <path
        d="M65 148
           L40 113 L22 81 L4 76 L2 18
           L47 16 L93 19 L129 24 L165 32
           L176 58 L169 84 L176 97 L201 108 L212 122 L217 134 L221 112
           L228 90 L255 71 L262 85 L286 103 L300 129
           L291 161 L280 177 L270 171 L259 160
           L237 174 L223 184 L208 192 L205 168 L187 155 L165 148
           Z"
        fill="hsl(var(--deep-raised))"
        stroke="hsl(var(--ink-inverse-muted))"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      {/* BC — the live province, filled */}
      <path
        d="M65 148 L97 148 L76 117 L76 77 L10 77 L22 81 L40 113 Z"
        fill={BRAND}
        stroke="hsl(var(--brand-bright))"
        strokeWidth="2.2"
        strokeLinejoin="round"
      />
      {/* Vancouver Island */}
      <path
        d="M42 156c5-7 12-11 17-9 4 2 3 8-3 13s-13 7-17 5c-3-2-2-6 3-9z"
        fill={BRAND}
        stroke="hsl(var(--brand-bright))"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      {/* province borders: prairies (straight), 60th parallel, ON/QC */}
      <path
        d="M112 148V77 M140 148V77 M76 77h89 M221 112L232 178"
        stroke="hsl(var(--ink-inverse-muted))"
        strokeWidth="1.5"
        opacity="0.45"
      />
      {/* Newfoundland */}
      <path
        d="M296 142c7-3 13-1 15 4s-3 11-10 12-13-3-13-8c0-4 3-7 8-8z"
        fill="hsl(var(--deep-raised))"
        stroke="hsl(var(--ink-inverse-muted))"
        strokeWidth="1.8"
      />
      {/* pin over BC */}
      <g transform="translate(40 68)">
        <path
          d="M0 15C0 6.5 6.5 0 15 0s15 6.5 15 15c0 11-15 26-15 26S0 26 0 15z"
          fill="hsl(var(--brand-bright))"
          stroke="hsl(var(--deep))"
          strokeWidth="2.6"
        />
        <circle cx="15" cy="15" r="5.5" fill="hsl(var(--deep))" />
      </g>
      {/* coastal waves */}
      <path
        d="M14 130c4-2 8-2 12 0M22 144c4-2 8-2 12 0"
        stroke="hsl(var(--ink-inverse-muted))"
        strokeWidth="1.8"
        strokeLinecap="round"
        opacity="0.55"
      />
      <path
        d="M300 182c4-2 8-2 12 0M292 192c4-2 8-2 12 0"
        stroke="hsl(var(--ink-inverse-muted))"
        strokeWidth="1.8"
        strokeLinecap="round"
        opacity="0.55"
      />
    </svg>
  );
}

/** Autopilot: a paper plane cruising a dotted loop past a wound-up clock —
 *  the system flying the route while the clock takes care of itself. */
export function AutopilotSpot({ className }: SpotProps) {
  return (
    <svg
      viewBox="0 0 160 140"
      fill="none"
      className={cn('h-32 w-auto', className)}
      aria-hidden
    >
      {/* soft backdrop blob */}
      <path
        d="M30 78c-6-28 14-50 44-54s58 10 60 34-14 44-44 50-54-4-60-30z"
        fill={SOFT}
        opacity="0.55"
      />
      {/* dotted flight loop */}
      <path
        d="M28 96c10-30 38-46 64-42 24 4 40 22 36 40-3 14-18 22-32 18"
        stroke={INK}
        strokeWidth="2"
        strokeLinecap="round"
        strokeDasharray="1 7"
        opacity="0.6"
      />
      {/* paper plane, mid-banking */}
      <g transform="rotate(14 96 108)">
        <path
          d="M78 104l40-14-16 26-6-9z"
          fill={PAPER}
          stroke={INK}
          strokeWidth="2.4"
          strokeLinejoin="round"
        />
        <path
          d="M118 90l-22 17 6 9"
          fill={BRAND}
          opacity="0.25"
          stroke={INK}
          strokeWidth="2"
          strokeLinejoin="round"
        />
      </g>
      {/* small wound clock, ticking along on its own */}
      <g transform="rotate(-6 52 52)">
        <circle
          cx="52"
          cy="52"
          r="17"
          fill={PAPER}
          stroke={INK}
          strokeWidth="2.4"
        />
        <path
          d="M52 42v10l7 5"
          stroke={INK}
          strokeWidth="2.4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {/* wind-up key */}
        <path
          d="M52 33v-6M48 27h8"
          stroke={INK}
          strokeWidth="2.4"
          strokeLinecap="round"
        />
        {/* tick marks */}
        <path
          d="M62 38l2-2M64 52h3M40 64l-2 2"
          stroke={BRAND}
          strokeWidth="2.2"
          strokeLinecap="round"
        />
      </g>
      {/* motion dashes behind the plane */}
      <path
        d="M64 118c4-1.5 8-2 12-2M60 126c5-2 10-3 15-3"
        stroke={BRAND}
        strokeWidth="2.2"
        strokeLinecap="round"
        opacity="0.7"
      />
    </svg>
  );
}

/** A spreadsheet page flowing into the bound ledger — bring your own rows,
 *  take them back out any time. */
export function SpreadsheetSwap({ className }: SpotProps) {
  return (
    <svg
      viewBox="0 0 160 140"
      fill="none"
      className={cn('h-32 w-auto', className)}
      aria-hidden
    >
      {/* warm backdrop */}
      <path
        d="M26 80c-4-26 16-48 44-52s60 6 64 30-12 46-42 52-60-4-66-30z"
        fill={WARM}
        opacity="0.55"
      />
      {/* spreadsheet page, tilted left */}
      <g transform="rotate(-7 52 68)">
        <rect
          x="26"
          y="34"
          width="52"
          height="66"
          rx="3"
          fill={PAPER}
          stroke={INK}
          strokeWidth="2.4"
        />
        {/* grid lines, hand-ruled */}
        <path
          d="M27 50c17-.6 34-.8 50-.6M27.5 64c16-.7 32-.8 49-.5M28 78c16-.5 32-.6 48-.4"
          stroke={INK}
          strokeWidth="1.8"
          opacity="0.5"
        />
        <path
          d="M44 35.5c.6 21 .8 42 .6 63M61 35c.5 21 .6 43 .4 64"
          stroke={INK}
          strokeWidth="1.8"
          opacity="0.5"
        />
        {/* a few filled cells */}
        <rect x="30" y="53" width="11" height="8" fill={BRAND} opacity="0.3" />
        <rect x="47" y="67" width="11" height="8" fill={SOFT} />
      </g>
      {/* two-way arrows between the artifacts */}
      <path
        d="M84 60c8-4 16-5 24-3"
        stroke={INK}
        strokeWidth="2.4"
        strokeLinecap="round"
      />
      <path
        d="M104 53l5 4-6 3"
        stroke={INK}
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M108 84c-8 4-16 5-24 3"
        stroke={INK}
        strokeWidth="2.4"
        strokeLinecap="round"
      />
      <path
        d="M88 91l-5-4 6-3"
        stroke={INK}
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* bound ledger, tilted right */}
      <g transform="rotate(6 122 72)">
        <rect
          x="104"
          y="40"
          width="40"
          height="58"
          rx="4"
          fill={PAPER}
          stroke={INK}
          strokeWidth="2.4"
        />
        {/* spine stitches */}
        <path
          d="M109 46v46"
          stroke={BRAND}
          strokeWidth="2.4"
          strokeLinecap="round"
          strokeDasharray="4 5"
        />
        {/* entry lines with amounts */}
        <path
          d="M116 54c8-.5 15-.6 22-.4M116 66c8-.4 14-.5 21-.3M116 78c7-.4 13-.4 20-.2"
          stroke={INK}
          strokeWidth="2"
          strokeLinecap="round"
          opacity="0.6"
        />
        <circle cx="138" cy="88" r="4" fill={BRAND} opacity="0.4" />
      </g>
    </svg>
  );
}
