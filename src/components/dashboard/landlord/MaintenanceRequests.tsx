"use client"
import { useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Wrench, AlertCircle, CheckCircle, Clock, Plus, Search, Filter } from "lucide-react"
import { Input } from "@/components/ui/input"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { useMediaQuery } from "@/hooks/use-media-query"

export default function MaintenanceRequests() {
  const [searchTerm, setSearchTerm] = useState("")
  const isMobile = useMediaQuery("(max-width: 768px)")

  // Mock data for maintenance requests
  const requests = [
    {
      id: 1,
      property: "123 Main St, Apt 4B",
      issue: "Leaking faucet in bathroom",
      priority: "Medium",
      status: "In Progress",
      reportedBy: "John Tenant",
      reportedDate: "Apr 2, 2023",
      scheduledDate: "Apr 5, 2023",
    },
    {
      id: 2,
      property: "456 Park Ave",
      issue: "Heating not working properly",
      priority: "High",
      status: "Scheduled",
      reportedBy: "Sarah Renter",
      reportedDate: "Apr 1, 2023",
      scheduledDate: "Apr 4, 2023",
    },
    {
      id: 3,
      property: "789 Oak Rd",
      issue: "Broken window in living room",
      priority: "High",
      status: "New",
      reportedBy: "Mike Occupant",
      reportedDate: "Apr 3, 2023",
      scheduledDate: "Pending",
    },
    {
      id: 4,
      property: "101 Pine St, Room 2",
      issue: "Light fixture not working",
      priority: "Low",
      status: "Completed",
      reportedBy: "Lisa Roommate",
      reportedDate: "Mar 25, 2023",
      scheduledDate: "Mar 28, 2023",
    },
  ]

  // Filter requests based on search term
  const filteredRequests = requests.filter(
    (request) =>
      request.property.toLowerCase().includes(searchTerm.toLowerCase()) ||
      request.issue.toLowerCase().includes(searchTerm.toLowerCase()) ||
      request.reportedBy.toLowerCase().includes(searchTerm.toLowerCase()),
  )

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Maintenance</h1>
          <p className="text-slate-500 text-sm mt-1">Track and manage maintenance requests</p>
        </div>
        <div className="flex space-x-2 w-full md:w-auto">
          <div className="relative flex-1 md:flex-initial">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
            <Input
              type="search"
              placeholder="Search requests..."
              className="pl-8 w-full"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <Button className="bg-slate-900 hover:bg-slate-800 whitespace-nowrap">
            <Plus className="h-4 w-4 mr-1" /> New Request
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500">New Requests</p>
                <p className="text-2xl font-semibold">{requests.filter((r) => r.status === "New").length}</p>
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
                <p className="text-sm font-medium text-slate-500">In Progress</p>
                <p className="text-2xl font-semibold">{requests.filter((r) => r.status === "In Progress").length}</p>
              </div>
              <div className="p-2 rounded-full bg-blue-50 text-blue-600">
                <Clock className="h-5 w-5" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500">Completed</p>
                <p className="text-2xl font-semibold">{requests.filter((r) => r.status === "Completed").length}</p>
              </div>
              <div className="p-2 rounded-full bg-green-50 text-green-600">
                <CheckCircle className="h-5 w-5" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <h2 className="text-lg font-medium">All Requests</h2>

        {!isMobile && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <Filter className="h-4 w-4 mr-1" /> Filter
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem>Filter by Priority</DropdownMenuItem>
              <DropdownMenuItem>Filter by Status</DropdownMenuItem>
              <DropdownMenuItem>Filter by Date</DropdownMenuItem>
              <DropdownMenuItem>Filter by Property</DropdownMenuItem>
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
                    Property
                  </th>
                  <th
                    scope="col"
                    className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider"
                  >
                    Issue
                  </th>
                  <th
                    scope="col"
                    className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider"
                  >
                    Priority
                  </th>
                  <th
                    scope="col"
                    className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider"
                  >
                    Status
                  </th>
                  <th
                    scope="col"
                    className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider"
                  >
                    Reported By
                  </th>
                  <th
                    scope="col"
                    className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider"
                  >
                    Scheduled
                  </th>
                  <th scope="col" className="relative px-4 py-3">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-slate-200">
                {filteredRequests.map((request) => (
                  <tr key={request.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-slate-900">
                      {request.property}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-500">{request.issue}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm">
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                          request.priority === "High"
                            ? "bg-red-50 text-red-700"
                            : request.priority === "Medium"
                              ? "bg-amber-50 text-amber-700"
                              : "bg-blue-50 text-blue-700"
                        }`}
                      >
                        {request.priority}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm">
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                          request.status === "New"
                            ? "bg-amber-50 text-amber-700"
                            : request.status === "In Progress"
                              ? "bg-blue-50 text-blue-700"
                              : request.status === "Scheduled"
                                ? "bg-purple-50 text-purple-700"
                                : "bg-green-50 text-green-700"
                        }`}
                      >
                        {request.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-500">{request.reportedBy}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-500">{request.scheduledDate}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-right text-sm font-medium">
                      <Button variant="ghost" size="sm">
                        Manage
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {filteredRequests.length === 0 && (
            <div className="p-6 text-center">
              <Wrench className="h-12 w-12 text-slate-300 mx-auto mb-3" />
              <h3 className="text-lg font-medium text-slate-700">No maintenance requests found</h3>
              <p className="text-sm text-slate-500 mt-1">
                {searchTerm ? `No requests match "${searchTerm}"` : "You don't have any maintenance requests yet"}
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

