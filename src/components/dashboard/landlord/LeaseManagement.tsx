// src/components/dashboard/landlord/LeaseManagement.tsx
"use client"
import { useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { FileText, AlertCircle, Plus, Search, Calendar, Filter } from "lucide-react"
import { Input } from "@/components/ui/input"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { useMediaQuery } from "@/hooks/use-media-query"

export default function LeaseManagement() {
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const isMobile = useMediaQuery("(max-width: 768px)")

  // Mock data for leases
  const leases = [
    {
      id: 1,
      tenant: "John Tenant",
      property: "123 Main St, Apt 4B",
      type: "Full Unit",
      startDate: "Jan 1, 2023",
      endDate: "Dec 31, 2023",
      monthlyRent: "$1,800",
      status: "Active",
      daysRemaining: 275,
    },
    {
      id: 2,
      tenant: "Sarah Renter",
      property: "456 Park Ave",
      type: "Full Unit",
      startDate: "Mar 15, 2023",
      endDate: "Mar 14, 2024",
      monthlyRent: "$2,200",
      status: "Active",
      daysRemaining: 348,
    },
    {
      id: 3,
      tenant: "Mike Occupant",
      property: "789 Oak Rd",
      type: "Full Unit",
      startDate: "May 1, 2022",
      endDate: "Apr 30, 2023",
      monthlyRent: "$1,600",
      status: "Expiring Soon",
      daysRemaining: 28,
    },
    {
      id: 4,
      tenant: "Lisa Roommate",
      property: "101 Pine St, Room 2",
      type: "Private Room",
      startDate: "Feb 1, 2023",
      endDate: "Jul 31, 2023",
      monthlyRent: "$850",
      status: "Active",
      daysRemaining: 120,
    },
  ]

  // Filter leases based on search term and status
  const filteredLeases = leases.filter(
    (lease) =>
      (lease.tenant.toLowerCase().includes(searchTerm.toLowerCase()) ||
        lease.property.toLowerCase().includes(searchTerm.toLowerCase())) &&
      (statusFilter === "all" || lease.status === statusFilter),
  )

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
          <Button className="bg-slate-900 hover:bg-slate-800 whitespace-nowrap">
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
                <p className="text-2xl font-semibold">{leases.filter((l) => l.status === "Active").length}</p>
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
                <p className="text-sm font-medium text-slate-500">Expiring Soon</p>
                <p className="text-2xl font-semibold">{leases.filter((l) => l.status === "Expiring Soon").length}</p>
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
                <p className="text-sm font-medium text-slate-500">Renewals This Month</p>
                <p className="text-2xl font-semibold">1</p>
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
            <TabsTrigger value="Active">Active</TabsTrigger>
            <TabsTrigger value="Expiring Soon">Expiring Soon</TabsTrigger>
            <TabsTrigger value="Expired">Expired</TabsTrigger>
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
              <DropdownMenuItem>Filter by Property</DropdownMenuItem>
              <DropdownMenuItem>Filter by Tenant</DropdownMenuItem>
              <DropdownMenuItem>Filter by End Date</DropdownMenuItem>
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
                  <th
                    scope="col"
                    className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider"
                  >
                    Tenant
                  </th>
                  <th
                    scope="col"
                    className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider"
                  >
                    Property
                  </th>
                  <th
                    scope="col"
                    className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider"
                  >
                    Type
                  </th>
                  <th
                    scope="col"
                    className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider"
                  >
                    Start Date
                  </th>
                  <th
                    scope="col"
                    className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider"
                  >
                    End Date
                  </th>
                  <th
                    scope="col"
                    className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider"
                  >
                    Monthly Rent
                  </th>
                  <th
                    scope="col"
                    className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider"
                  >
                    Status
                  </th>
                  <th scope="col" className="relative px-4 py-3">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-slate-200">
                {filteredLeases.map((lease) => (
                  <tr key={lease.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-slate-900">{lease.tenant}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-500">{lease.property}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm">
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                          lease.type === "Full Unit" ? "bg-purple-50 text-purple-700" : "bg-blue-50 text-blue-700"
                        }`}
                      >
                        {lease.type}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-500">{lease.startDate}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-500">{lease.endDate}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-500">{lease.monthlyRent}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm">
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                          lease.status === "Active" ? "bg-green-50 text-green-700" : "bg-amber-50 text-amber-700"
                        }`}
                      >
                        {lease.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-right text-sm font-medium">
                      <Button variant="ghost" size="sm">
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

