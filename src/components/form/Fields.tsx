// Fields.tsx

"use client";

import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * The five inputs that every form in this app needs, so that fifteen forms stop
 * each inventing their own. Every one of them takes an `error` and renders it
 * under the field it belongs to — which is what makes it possible to stop
 * throwing JSON.stringify(err) into a toast and calling it error handling.
 */

export function Field({
  label, required, error, hint, children,
}: {
  label: string;
  required?: boolean;
  error?: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label className="block text-sm font-medium">
        {label}
        {required && <span className="ml-0.5 text-[hsl(var(--danger))]">*</span>}
      </label>
      {children}
      {error ? (
        <p className="text-xs text-[hsl(var(--danger-ink))]">{error}</p>
      ) : hint ? (
        <p className="text-xs text-[hsl(var(--ink-4))]">{hint}</p>
      ) : null}
    </div>
  );
}

export function TextInput({
  value, onChange, error, ...rest
}: {
  value: string;
  onChange: (v: string) => void;
  error?: string;
} & Omit<React.InputHTMLAttributes<HTMLInputElement>, "value" | "onChange">) {
  return (
    <input
      {...rest}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={cn("field", error && "border-[hsl(var(--danger))]")}
    />
  );
}

export function NumberInput({
  value, onChange, error, prefix, suffix, ...rest
}: {
  value: string;
  onChange: (v: string) => void;
  error?: string;
  prefix?: string;
  suffix?: string;
} & Omit<React.InputHTMLAttributes<HTMLInputElement>, "value" | "onChange">) {
  return (
    <div className="relative">
      {prefix && (
        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-[hsl(var(--ink-4))]">
          {prefix}
        </span>
      )}
      <input
        {...rest}
        type="number"
        inputMode="decimal"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        // A number input silently increments when you SCROLL over it while it's
        // focused. With step="0.01", two wheel ticks turn a typed $600.00 deposit
        // into $599.98 and nobody notices until a tenant queries their receipt.
        // Blurring on wheel means scrolling the page can never edit a money field.
        onWheel={(e) => e.currentTarget.blur()}
        className={cn(
          "field",
          prefix && "pl-7",
          suffix && "pr-12",
          error && "border-[hsl(var(--danger))]",
        )}
      />
      {suffix && (
        <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-[hsl(var(--ink-4))]">
          {suffix}
        </span>
      )}
    </div>
  );
}

export function TextArea({
  value, onChange, error, rows = 4, ...rest
}: {
  value: string;
  onChange: (v: string) => void;
  error?: string;
  rows?: number;
} & Omit<React.TextareaHTMLAttributes<HTMLTextAreaElement>, "value" | "onChange" | "rows">) {
  return (
    <textarea
      {...rest}
      rows={rows}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={cn("field resize-none", error && "border-[hsl(var(--danger))]")}
    />
  );
}

export function Select<T extends string>({
  value, onChange, options, placeholder, error,
}: {
  value: T | "";
  onChange: (v: T) => void;
  options: { value: T; label: string }[];
  placeholder?: string;
  error?: string;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value as T)}
      className={cn("field", error && "border-[hsl(var(--danger))]", !value && "text-[hsl(var(--ink-5))]")}
    >
      {placeholder && <option value="">{placeholder}</option>}
      {options.map((o) => (
        <option key={o.value} value={o.value} className="text-[hsl(var(--ink))]">
          {o.label}
        </option>
      ))}
    </select>
  );
}

/** Big tappable cards, for a choice with 2–4 options that carries real weight. */
export function CardChoice<T extends string>({
  value, onChange, options,
}: {
  value: T | "";
  onChange: (v: T) => void;
  options: { value: T; label: string; hint?: string; icon?: React.ElementType }[];
}) {
  return (
    <div className={cn("grid gap-2.5", options.length > 2 ? "sm:grid-cols-3" : "sm:grid-cols-2")}>
      {options.map((o) => {
        const active = value === o.value;
        return (
          <button
            key={o.value}
            type="button"
            onClick={() => onChange(o.value)}
            className={cn(
              "relative rounded-xl border p-4 text-left transition-colors",
              active
                ? "border-[hsl(var(--brand))] bg-[hsl(var(--brand-soft))]"
                : "border-[hsl(var(--line))] bg-white hover:border-[hsl(var(--line-strong))]",
            )}
          >
            {active && (
              <Check className="absolute right-3 top-3 h-4 w-4 text-[hsl(var(--brand))]" />
            )}
            {o.icon && (
              <o.icon
                className={cn(
                  "mb-2 h-5 w-5",
                  active ? "text-[hsl(var(--brand))]" : "text-[hsl(var(--ink-4))]",
                )}
              />
            )}
            <span className="block text-sm font-medium">{o.label}</span>
            {o.hint && (
              <span className="mt-0.5 block text-xs text-[hsl(var(--ink-4))]">{o.hint}</span>
            )}
          </button>
        );
      })}
    </div>
  );
}

export function CheckboxRow({
  checked, onChange, label, hint,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  hint?: string;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={cn(
        "flex w-full items-start gap-3 rounded-lg border p-3 text-left transition-colors",
        checked
          ? "border-[hsl(var(--brand))] bg-[hsl(var(--brand-soft))]"
          : "border-[hsl(var(--line))] bg-white hover:border-[hsl(var(--line-strong))]",
      )}
    >
      <span
        className={cn(
          "mt-0.5 flex h-4 w-4 flex-shrink-0 items-center justify-center rounded border",
          checked
            ? "border-[hsl(var(--brand))] bg-[hsl(var(--brand))]"
            : "border-[hsl(var(--line-strong))]",
        )}
      >
        {checked && <Check className="h-3 w-3 text-white" />}
      </span>
      <span>
        <span className="block text-sm font-medium">{label}</span>
        {hint && <span className="mt-0.5 block text-xs text-[hsl(var(--ink-4))]">{hint}</span>}
      </span>
    </button>
  );
}