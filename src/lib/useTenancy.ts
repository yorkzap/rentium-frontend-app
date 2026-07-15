// useTenancy.ts
//
// Every tenancy page needs the same thing first: "which lease am I on?" A tenant
// is almost always on exactly one, but not always (they moved, they have a
// storage unit, they're mid-handover), so this resolves it once and lets the
// pages get on with their job.

"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { fetchLeases } from "@/lib/leaseApi";

export interface TenancyLease {
  id: string;
  lease_number: string;
  status: string;
  status_display?: string;
  property_name?: string | null;
  group_name?: string | null;
  property_address?: string | null;
  start_date?: string;
  end_date?: string | null;
  is_month_to_month?: boolean;
  total_rent?: string | number;
}

const LIVE = new Set(["ACTIVE", "PENDING"]);

export function useTenancy() {
  const { token } = useAuth();
  const [leases, setLeases] = useState<TenancyLease[]>([]);
  const [leaseId, setLeaseId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const data = await fetchLeases(token);
      const rows: TenancyLease[] = Array.isArray(data) ? data : (data?.results ?? []);
      // Live tenancies first — an expired lease from two years ago should never
      // be the thing the page silently picks for you.
      const sorted = [...rows].sort((a, b) => {
        const la = LIVE.has(a.status) ? 0 : 1;
        const lb = LIVE.has(b.status) ? 0 : 1;
        return la - lb;
      });
      setLeases(sorted);
      setLeaseId((cur) => cur ?? sorted[0]?.id ?? null);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't load your tenancy.");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { load(); }, [load]);

  const lease = leases.find((l) => l.id === leaseId) ?? null;

  return { token, leases, lease, leaseId, setLeaseId, loading, error, reload: load };
}