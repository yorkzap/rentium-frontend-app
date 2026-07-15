// page.tsx
// Leases list, rebuilt around the question landlords actually ask:
// "which lease is WHOSE?" Tenant names are shown right on the row
// (backend: LeaseListSerializer.tenant_names — account name -> invited
// name -> email fallbacks), the whole row is clickable, and status tabs +
// search narrow things down fast.
//
// NOTE: if your leases list currently lives in a component (e.g.
// src/components/dashboard/landlord/LeasesManagement.tsx) rather than
// directly in this route, move this file's default export there instead.
"use client";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { FileText, Loader2, Plus, Search, Users } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { DJANGO_API_URL } from "@/lib/config";
import { toast } from "sonner";

interface LeaseRow {
  id: string;
  lease_number: string;
  lease_type_display: string;
  status: string;
  status_display: string;
  property_name: string | null;
  property_address: string | null;
  group_name: string | null;
  primary_tenant_name: string | null;
  tenant_names?: string[];
  start_date: string;
  end_date: string | null;
  is_month_to_month: boolean;
  tenant_count: number;
  total_rent: string | number;
}

const TABS = [
  { value: "ALL", label: "All" },
  { value: "ACTIVE", label: "Active" },
  { value: "PENDING", label: "Pending Signatures" },
  { value: "EXPIRED", label: "Expired" },
  { value: "TERMINATED", label: "Terminated" },
];

const STATUS_STYLES: Record<string, string> = {
  ACTIVE: "bg-emerald-50 text-emerald-700 border-emerald-200",
  PENDING: "bg-amber-50 text-amber-700 border-amber-200",
  DRAFT: "bg-slate-50 text-slate-500 border-slate-200",
  EXPIRED: "bg-slate-100 text-slate-500 border-slate-200",
  TERMINATED: "bg-red-50 text-red-600 border-red-200",
  RENEWED: "bg-blue-50 text-blue-700 border-blue-200",
};

const fmtDate = (iso: string | null) =>
  iso ? new Date(`${iso}T00:00:00`).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "—";
const money = (v: string | number) => `$${Number(v).toLocaleString("en-US")}`;

export default function LeasesPage() {
  const router = useRouter();
  const { token } = useAuth();
  const [leases, setLeases] = useState<LeaseRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("ALL");
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (!token) return;
    fetch(`${DJANGO_API_URL}/leases/`, { headers: { Authorization: `Token ${token}` } })
      .then(async (r) => {
        if (!r.ok) throw new Error(`Failed to load leases (${r.status})`);
        const data = await r.json();
        setLeases(Array.isArray(data) ? data : data.results ?? []);
      })
      .catch((err) => toast.error(err instanceof Error ? err.message : "Failed to load leases."))
      .finally(() => setLoading(false));
  }, [token]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return leases.filter((l) => {
      if (tab !== "ALL" && l.status !== tab) return false;
      if (!q) return true;
      const hay = [
        l.lease_number, l.property_name, l.group_name, l.property_address,
        l.primary_tenant_name, ...(l.tenant_names || []),
      ].filter(Boolean).join(" ").toLowerCase();
      return hay.includes(q);
    });
  }, [leases, tab, search]);

  const tenantLine = (l: LeaseRow) => {
    const names = l.tenant_names && l.tenant_names.length > 0
      ? l.tenant_names
      : l.primary_tenant_name ? [l.primary_tenant_name] : [];
    if (names.length === 0) return <span className="text-slate-400">No tenants yet</span>;
    const shown = names.slice(0, 2).join(", ");
    const extra = names.length - 2;
    return (
      <span className="text-slate-700">
        {shown}
        {extra > 0 && <span className="text-slate-400"> +{extra} more</span>}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="container max-w-6xl py-6 px-4 sm:px-6 space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 flex items-center gap-2">
            <FileText className="h-6 w-6 text-teal-600" /> Leases
          </h1>
          <p className="text-sm text-slate-500">Every agreement, with who's on it at a glance.</p>
        </div>
        <Button className="bg-teal-600 hover:bg-teal-700" onClick={() => router.push("/dashboard/leases/create")}>
          <Plus className="h-4 w-4 mr-1" /> New Lease
        </Button>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 sm:items-center justify-between">
        <div className="flex flex-wrap gap-1.5">
          {TABS.map((t) => (
            <button key={t.value} type="button" onClick={() => setTab(t.value)}
              className={`rounded-full px-3 py-1 text-sm transition-colors ${
                tab === t.value ? "bg-teal-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}>
              {t.label}
              <span className="ml-1 opacity-70">
                {t.value === "ALL" ? leases.length : leases.filter((l) => l.status === t.value).length}
              </span>
            </button>
          ))}
        </div>
        <div className="relative w-full sm:w-64">
          <Search className="h-4 w-4 absolute left-2.5 top-2.5 text-slate-400" />
          <Input className="pl-8" placeholder="Search tenant, property, lease #…"
            value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-4 py-3 text-left">Lease</th>
                  <th className="px-4 py-3 text-left">Tenants</th>
                  <th className="px-4 py-3 text-left hidden md:table-cell">Term</th>
                  <th className="px-4 py-3 text-right hidden sm:table-cell">Rent</th>
                  <th className="px-4 py-3 text-left">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((l) => (
                  <tr key={l.id} className="hover:bg-teal-50/40 cursor-pointer"
                    onClick={() => router.push(`/dashboard/leases/${l.id}`)}>
                    <td className="px-4 py-3">
                      <p className="font-medium text-slate-900">{l.property_name || l.group_name}</p>
                      <p className="text-xs text-slate-400">
                        {l.property_address}{l.property_address ? " · " : ""}{l.lease_type_display}
                      </p>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        <Users className="h-3.5 w-3.5 text-slate-300 flex-shrink-0" />
                        {tenantLine(l)}
                      </div>
                      {/* mobile: term inline since the column is hidden */}
                      <p className="text-xs text-slate-400 md:hidden mt-0.5">
                        {fmtDate(l.start_date)} – {l.is_month_to_month ? "Month-to-month" : fmtDate(l.end_date)}
                      </p>
                    </td>
                    <td className="px-4 py-3 text-slate-500 hidden md:table-cell whitespace-nowrap">
                      {fmtDate(l.start_date)} – {l.is_month_to_month ? "Month-to-month" : fmtDate(l.end_date)}
                    </td>
                    <td className="px-4 py-3 text-right font-medium hidden sm:table-cell">
                      {money(l.total_rent)}<span className="text-slate-400 font-normal">/mo</span>
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant="outline" className={STATUS_STYLES[l.status] || "bg-slate-50"}>
                        {l.status_display}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {filtered.length === 0 && (
            <p className="p-8 text-center text-sm text-slate-500">
              {search || tab !== "ALL" ? "No leases match." : "No leases yet — create your first one."}
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}