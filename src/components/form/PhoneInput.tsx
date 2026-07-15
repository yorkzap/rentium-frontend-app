// PhoneInput.tsx

"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

/**
 * Country code, then ten digits. Formats as you type; sends E.164.
 *
 * The backend stores E.164 (+12505550100) and validates with libphonenumber, so
 * the only thing this component has to do is stop the user from producing
 * something the backend will reject, and show them a number that looks like a
 * number while they're typing it. Storage and display are different problems and
 * conflating them is how you end up unable to search your own data.
 */

const COUNTRIES = [
  { code: "+1", label: "🇨🇦 +1", digits: 10 },
  { code: "+44", label: "🇬🇧 +44", digits: 10 },
  { code: "+91", label: "🇮🇳 +91", digits: 10 },
  { code: "+61", label: "🇦🇺 +61", digits: 9 },
];

function formatNA(digits: string): string {
  const d = digits.slice(0, 10);
  if (d.length <= 3) return d;
  if (d.length <= 6) return `(${d.slice(0, 3)}) ${d.slice(3)}`;
  return `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}`;
}

interface Props {
  /** E.164 or "" */
  value: string;
  onChange: (e164: string) => void;
  label?: string;
  required?: boolean;
  error?: string;
}

export default function PhoneInput({ value, onChange, label = "Phone", required, error }: Props) {
  const initial = COUNTRIES.find((c) => value.startsWith(c.code)) ?? COUNTRIES[0];
  const [country, setCountry] = useState(initial.code);
  const [digits, setDigits] = useState(value.replace(initial.code, ""));

  const emit = (c: string, d: string) => {
    const clean = d.replace(/\D/g, "");
    onChange(clean ? `${c}${clean}` : "");
  };

  const conf = COUNTRIES.find((c) => c.code === country)!;
  const complete = digits.replace(/\D/g, "").length === conf.digits;

  return (
    <div className="space-y-1.5">
      <label className="text-sm font-medium">
        {label} {required && <span className="text-[hsl(var(--danger))]">*</span>}
      </label>
      <div className="flex gap-2">
        <select
          value={country}
          onChange={(e) => {
            setCountry(e.target.value);
            emit(e.target.value, digits);
          }}
          className="field w-[104px] flex-shrink-0"
        >
          {COUNTRIES.map((c) => (
            <option key={c.code} value={c.code}>{c.label}</option>
          ))}
        </select>
        <input
          type="tel"
          inputMode="numeric"
          value={country === "+1" ? formatNA(digits.replace(/\D/g, "")) : digits}
          onChange={(e) => {
            const clean = e.target.value.replace(/\D/g, "").slice(0, conf.digits);
            setDigits(clean);
            emit(country, clean);
          }}
          placeholder={country === "+1" ? "(250) 555-0100" : "Phone number"}
          className={cn("field flex-1", error && "border-[hsl(var(--danger))]")}
        />
      </div>
      {error ? (
        <p className="text-xs text-[hsl(var(--danger-ink))]">{error}</p>
      ) : digits && !complete ? (
        <p className="text-xs text-[hsl(var(--ink-4))]">
          {conf.digits} digits — {conf.digits - digits.replace(/\D/g, "").length} to go
        </p>
      ) : null}
    </div>
  );
}