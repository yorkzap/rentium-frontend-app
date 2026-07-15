// page.tsx

// The four things every dashboard page needs and every dashboard page was
// hand-rolling differently: a header, an empty state, a loading state, and a
// status pill. Fifteen pages each inventing their own is precisely why the app
// reads as fifteen apps.

import Link from "next/link";
import { ChevronRight, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export function PageHeader({
  title, description, breadcrumbs, actions,
}: {
  title: string;
  description?: string;
  breadcrumbs?: { label: string; href?: string }[];
  actions?: React.ReactNode;
}) {
  return (
    <div className="mb-6">
      {breadcrumbs && breadcrumbs.length > 0 && (
        <nav className="mb-2 flex items-center gap-1 text-xs text-[hsl(var(--ink-4))]">
          {breadcrumbs.map((c, i) => (
            <span key={i} className="flex items-center gap-1">
              {i > 0 && <ChevronRight className="h-3 w-3 opacity-50" />}
              {c.href ? (
                <Link href={c.href} className="hover:text-[hsl(var(--ink))]">{c.label}</Link>
              ) : (
                <span className="text-[hsl(var(--ink-2))]">{c.label}</span>
              )}
            </span>
          ))}
        </nav>
      )}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
          {description && (
            <p className="mt-1 text-sm text-[hsl(var(--ink-3))]">{description}</p>
          )}
        </div>
        {actions && <div className="flex flex-shrink-0 gap-2">{actions}</div>}
      </div>
    </div>
  );
}

export function EmptyState({
  icon: Icon, title, description, action,
}: {
  icon: React.ElementType;
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="card border-dashed p-12 text-center">
      <Icon className="mx-auto mb-3 h-9 w-9 text-[hsl(var(--ink-5))]" />
      <p className="font-medium">{title}</p>
      <p className="mx-auto mt-1 max-w-sm text-sm text-[hsl(var(--ink-4))]">
        {description}
      </p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

/**
 * Skeletons, not spinners.
 *
 * A centered spinner tells the user "something is happening somewhere" and
 * nothing else — the page jumps when it resolves, and every single load feels
 * like a stall. A skeleton in the shape of the thing that's coming tells them
 * what to expect and holds the layout still. It's the difference between a page
 * that's loading and a page that's broken, and users can't tell those apart from
 * a spinner.
 */
export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "animate-pulse rounded-md bg-[hsl(var(--surface-sunken))]",
        className,
      )}
    />
  );
}

export function TableSkeleton({ rows = 5, cols = 4 }: { rows?: number; cols?: number }) {
  return (
    <div className="card overflow-hidden">
      <div className="border-b bg-[hsl(var(--surface-sunken))] px-4 py-3"
           style={{ borderColor: "hsl(var(--line))" }}>
        <Skeleton className="h-3 w-24" />
      </div>
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} className="flex gap-4 border-b px-4 py-4 last:border-0"
             style={{ borderColor: "hsl(var(--line))" }}>
          {Array.from({ length: cols }).map((_, c) => (
            <Skeleton key={c} className={cn("h-4", c === 0 ? "w-40" : "flex-1")} />
          ))}
        </div>
      ))}
    </div>
  );
}

export function CardsSkeleton({ n = 6 }: { n?: number }) {
  return (
    <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: n }).map((_, i) => (
        <div key={i} className="card overflow-hidden">
          <Skeleton className="aspect-[4/3] rounded-none" />
          <div className="space-y-2 p-4">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-2/3" />
          </div>
        </div>
      ))}
    </div>
  );
}

type Tone = "ok" | "warn" | "danger" | "info" | "neutral" | "brand";

const TONES: Record<Tone, string> = {
  ok: "bg-[hsl(var(--ok-soft))] text-[hsl(var(--ok-ink))]",
  warn: "bg-[hsl(var(--warn-soft))] text-[hsl(var(--warn-ink))]",
  danger: "bg-[hsl(var(--danger-soft))] text-[hsl(var(--danger-ink))]",
  info: "bg-[hsl(var(--info-soft))] text-[hsl(var(--info-ink))]",
  brand: "bg-[hsl(var(--brand-soft))] text-[hsl(var(--brand-ink))]",
  neutral: "bg-[hsl(var(--surface-sunken))] text-[hsl(var(--ink-3))]",
};

export function Pill({
  tone = "neutral", children, className,
}: { tone?: Tone; children: React.ReactNode; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium",
        TONES[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

export function Spinner({ className }: { className?: string }) {
  return <Loader2 className={cn("h-4 w-4 animate-spin", className)} />;
}