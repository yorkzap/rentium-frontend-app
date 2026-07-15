// LeaseManagement.tsx
"use client"
import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { FileText, AlertCircle, Plus, Search, Calendar, Filter, Loader2 } from "lucide-react"
import { Input } from "@/components/ui/input"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { useMediaQuery } from "@/hooks/use-media-query"
import { useAuth } from "@/contexts/AuthContext"
import { DJANGO_API_URL } from "@/lib/config"
import { toast } from "sonner"

interface LeaseListItem {
  id: string
  lease_number: string
  lease_type: string
  lease_type_display: string
  status: string
  status_display: string
  property_name: string | null
  property_address: string | null
  group_name: string | null
  landlord_name: string
  start_date: string
  end_date: string | null
  is_month_to_month: boolean
  tenant_count: number
  total_rent: string | number
  created_at: string
}

const STATUS_STYLES: Record<string, string> = {
  ACTIVE: "bg-green-50 text-green-700",
  PENDING: "bg-amber-50 text-amber-700",
  DRAFT: "bg-slate-100 text-slate-700",
  EXPIRED: "bg-red-50 text-red-700",
  TERMINATED: "bg-red-50 text-red-700",
  RENEWED: "bg-blue-50 text-blue-700",
}

function daysRemaining(endDate: string | null): number | null {
  if (!endDate) return null
  const diff = new Date(endDate).getTime() - Date.now()
  return Math.ceil(diff / (1000 * 60 * 60 * 24))
}

function formatCurrency(value: string | number) {
  const num = typeof value === "string" ? parseFloat(value) : value
  if (isNaN(num)) return "$0"
  return num.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 })
}

export default function LeaseManagement() {
  const router = useRouter()
  const { token } = useAuth()
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [leases, setLeases] = useState<LeaseListItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const isMobile = useMediaQuery("(max-width: 768px)")

  const fetchLeases = useCallback(async () => {
    if (!token) {
      setIsLoading(false)
      setError("Authentication required.")
      return
    }
    setIsLoading(true)
    setError(null)
    try {
      const res = await fetch(`${DJANGO_API_URL}/leases/`, {
        headers: { Authorization: `Token ${token}` },
      })
      if (!res.ok) throw new Error(`Failed to load leases (${res.status})`)
      const data: LeaseListItem[] = await res.json()
      setLeases(data)
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unknown error loading leases"
      setError(msg)
      toast.error(msg)
    } finally {
      setIsLoading(false)
    }
  }, [token])

  useEffect(() => {
    fetchLeases()
  }, [fetchLeases])

  const filteredLeases = leases.filter(
    (lease) =>
      (lease.property_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        lease.group_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        lease.lease_number.toLowerCase().includes(searchTerm.toLowerCase())) &&
      (statusFilter === "all" || lease.status === statusFilter)
  )

  const activeCount = leases.filter((l) => l.status === "ACTIVE").length
  const expiringSoonCount = leases.filter((l) => {
    const days = daysRemaining(l.end_date)
    return l.status === "ACTIVE" && days !== null && days <= 30 && days >= 0
  }).length
  const pendingCount = leases.filter((l) => l.status === "PENDING").length

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-teal-600" />
      </div>
    )
  }

  if (error) {
    return (
      <Card className="border-destructive bg-red-50">
        <CardContent className="p-6 text-center">
          <AlertCircle className="h-10 w-10 text-destructive mx-auto mb-3" />
          <p className="text-destructive font-medium">{error}</p>
          <Button variant="outline" className="mt-4" onClick={fetchLeases}>
            Retry
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Leases</h1>
          <p className="text-slate-500 text-sm mt-1">Manage tenant agreements and renewals</p>
        </div>
        <div className="flex space-x-2 w-full md:w-auto">
          <div className="relative flex-1 md:flex-initial">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
            <Input
              type="search"
              placeholder="Search leases..."
              className="pl-8 w-full"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <Button
            className="bg-slate-900 hover:bg-slate-800 whitespace-nowrap"
            onClick={() => router.push("/dashboard/leases/create")}
          >
            <Plus className="h-4 w-4 mr-1" /> New Lease
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500">Active Leases</p>
                <p className="text-2xl font-semibold">{activeCount}</p>
              </div>
              <div className="p-2 rounded-full bg-green-50 text-green-600">
                <FileText className="h-5 w-5" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500">Expiring Within 30 Days</p>
                <p className="text-2xl font-semibold">{expiringSoonCount}</p>
              </div>
              <div className="p-2 rounded-full bg-amber-50 text-amber-600">
                <AlertCircle className="h-5 w-5" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500">Pending Signatures</p>
                <p className="text-2xl font-semibold">{pendingCount}</p>
              </div>
              <div className="p-2 rounded-full bg-blue-50 text-blue-600">
                <Calendar className="h-5 w-5" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <Tabs defaultValue="all" className="w-full" onValueChange={setStatusFilter}>
          <TabsList className="w-full md:w-auto">
            <TabsTrigger value="all">All Leases</TabsTrigger>
            <TabsTrigger value="ACTIVE">Active</TabsTrigger>
            <TabsTrigger value="PENDING">Pending Signatures</TabsTrigger>
            <TabsTrigger value="EXPIRED">Expired</TabsTrigger>
            <TabsTrigger value="TERMINATED">Terminated</TabsTrigger>
          </TabsList>
        </Tabs>

        {!isMobile && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <Filter className="h-4 w-4 mr-1" /> Filter
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => fetchLeases()}>Refresh</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Lease
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Type
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Start Date
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    End Date
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Tenants
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Monthly Rent
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="relative px-4 py-3">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-slate-200">
                {filteredLeases.map((lease) => (
                  <tr key={lease.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-slate-900">
                      <div>{lease.property_name || lease.group_name || lease.lease_number}</div>
                      <div className="text-xs text-slate-500">{lease.property_address || lease.lease_number}</div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm">
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                          lease.lease_type.includes("ROOMMATE")
                            ? "bg-blue-50 text-blue-700"
                            : "bg-purple-50 text-purple-700"
                        }`}
                      >
                        {lease.lease_type_display}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-500">{lease.start_date}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-500">
                      {lease.is_month_to_month ? "Month-to-month" : lease.end_date || "—"}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-500">{lease.tenant_count}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-500">
                      {formatCurrency(lease.total_rent)}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm">
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                          STATUS_STYLES[lease.status] || "bg-slate-100 text-slate-700"
                        }`}
                      >
                        {lease.status_display}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-right text-sm font-medium">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => router.push(`/dashboard/leases/${lease.id}`)}
                      >
                        View
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {filteredLeases.length === 0 && (
            <div className="p-6 text-center">
              <FileText className="h-12 w-12 text-slate-300 mx-auto mb-3" />
              <h3 className="text-lg font-medium text-slate-700">No leases found</h3>
              <p className="text-sm text-slate-500 mt-1">
                {searchTerm || statusFilter !== "all"
                  ? "No leases match your current filters"
                  : "You don't have any leases yet"}
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}