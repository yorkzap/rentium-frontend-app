"use client"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Building2, Users, DollarSign, Plus, Wrench, FileText, ChevronRight } from "lucide-react"
import { useMediaQuery } from "@/hooks/use-media-query"
import { Progress } from "@/components/ui/progress"
import { cn } from "@/lib/utils"
import { useState } from "react"
import { useAuth } from "@/contexts/AuthContext"

export default function LandlordOverview({ onNavigate }) {
  const isMobile = useMediaQuery("(max-width: 768px)")
  const [hoveredListing, setHoveredListing] = useState(null)
  const { user } = useAuth()

  // Mock data for landlord dashboard
  const stats = [
    {
      title: "Listings",
      value: "8",
      details: "5 Full Units, 3 Rooms",
      icon: Building2,
      color: "bg-blue-50 text-blue-600",
      navigate: "properties",
    },
    {
      title: "Occupants",
      value: "12",
      details: "8 Tenants, 4 Roommates",
      icon: Users,
      color: "bg-green-50 text-green-600",
      navigate: "leases",
    },
    {
      title: "Monthly Income",
      value: "$8,450",
      details: "$6,800 Units, $1,650 Rooms",
      icon: DollarSign,
      color: "bg-amber-50 text-amber-600",
      navigate: "financial",
    },
  ]

  const listings = [
    {
      id: 1,
      address: "123 Main St, Apt 4B",
      city: "New York",
      type: "Full Unit",
      status: "Occupied",
      rent: "$1,800",
      leaseEnd: "Dec 31, 2023",
      occupancyRate: 100,
    },
    {
      id: 2,
      address: "456 Park Ave",
      city: "Boston",
      type: "Full Unit",
      status: "Occupied",
      rent: "$2,200",
      leaseEnd: "Mar 15, 2024",
      occupancyRate: 100,
    },
    {
      id: 3,
      address: "789 Oak Rd",
      city: "Chicago",
      type: "Full Unit",
      status: "Vacant",
      rent: "$1,600",
      leaseEnd: "N/A",
      occupancyRate: 0,
    },
    {
      id: 4,
      address: "101 Pine St, Room 2",
      city: "Seattle",
      type: "Private Room",
      status: "Occupied",
      rent: "$850",
      leaseEnd: "Jun 30, 2023",
      occupancyRate: 100,
    },
    {
      id: 5,
      address: "101 Pine St, Room 3",
      city: "Seattle",
      type: "Shared Room",
      status: "Occupied",
      rent: "$550",
      leaseEnd: "Aug 15, 2023",
      occupancyRate: 100,
    },
  ]

  // Calculate overall occupancy rate
  const totalUnits = listings.length
  const occupiedUnits = listings.filter((listing) => listing.status === "Occupied").length
  const overallOccupancyRate = Math.round((occupiedUnits / totalUnits) * 100)

  // Urgent tasks that need attention
  const urgentTasks = [
    { id: 1, title: "Lease renewal for 456 Park Ave", dueDate: "Due in 5 days", type: "lease", navigate: "leases" },
    {
      id: 2,
      title: "Maintenance request: Leaking faucet at 123 Main St",
      dueDate: "Reported 2 days ago",
      type: "maintenance",
      navigate: "maintenance",
    },
    {
      id: 3,
      title: "Move-out inspection for 101 Pine St, Room 2",
      dueDate: "Scheduled for Jun 28",
      type: "lease",
      navigate: "leases",
    },
  ]

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-semibold text-slate-900">
            Welcome{user?.name ? `, ${user.name.split(" ")[0]}` : ""}
          </h1>
          <p className="text-slate-500 mt-1">Here's what's happening with your properties today</p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {stats.map((stat, index) => (
          <Card
            key={index}
            className="hover:shadow-md transition-all cursor-pointer border-transparent hover:border-slate-200"
            onClick={() => onNavigate(stat.navigate)}
          >
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-500">{stat.title}</p>
                  <p className="text-3xl font-semibold mt-1">{stat.value}</p>
                  <p className="text-xs text-slate-500 mt-1">{stat.details}</p>
                </div>
                <div className={`p-3 rounded-full ${stat.color}`}>
                  <stat.icon className="h-6 w-6" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          {/* Property Listings */}
          <Card className="h-full overflow-hidden border-transparent shadow-sm hover:shadow-md transition-all">
            <CardHeader className="flex flex-col md:flex-row justify-between items-start md:items-center space-y-2 md:space-y-0 bg-white border-b">
              <div>
                <CardTitle>Your Listings</CardTitle>
                <CardDescription>Manage your properties and rooms</CardDescription>
              </div>
              <div className="flex space-x-2">
                <Button variant="outline" size="sm" onClick={() => onNavigate("properties")}>
                  <Plus className="h-4 w-4 mr-1" /> Add Property
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <ul className="divide-y divide-slate-100">
                {listings.slice(0, isMobile ? 3 : 5).map((listing) => (
                  <li
                    key={listing.id}
                    className={cn(
                      "hover:bg-slate-50 cursor-pointer transition-all",
                      hoveredListing === listing.id && "bg-slate-50",
                    )}
                    onClick={() => onNavigate("properties")}
                    onMouseEnter={() => setHoveredListing(listing.id)}
                    onMouseLeave={() => setHoveredListing(null)}
                  >
                    <div className="flex items-center justify-between p-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center">
                          <div className="flex-1 min-w-0">
                            <h3 className="text-sm font-medium text-slate-900 truncate">{listing.address}</h3>
                            <p className="text-xs text-slate-500">{listing.city}</p>
                          </div>
                          <ChevronRight
                            className={cn(
                              "h-4 w-4 text-slate-400 transition-opacity",
                              hoveredListing === listing.id ? "opacity-100" : "opacity-0",
                            )}
                          />
                        </div>
                        <div className="flex items-center mt-1 space-x-2">
                          <span
                            className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                              listing.type === "Full Unit"
                                ? "bg-purple-50 text-purple-700"
                                : listing.type === "Private Room"
                                  ? "bg-blue-50 text-blue-700"
                                  : "bg-indigo-50 text-indigo-700"
                            }`}
                          >
                            {listing.type}
                          </span>
                          <span
                            className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                              listing.status === "Occupied"
                                ? "bg-green-50 text-green-700"
                                : "bg-amber-50 text-amber-700"
                            }`}
                          >
                            {listing.status}
                          </span>
                          <span className="text-xs font-medium">{listing.rent}/mo</span>
                        </div>
                      </div>
                      <div className="ml-4 text-right">
                        {listing.leaseEnd !== "N/A" ? (
                          <div>
                            <div className="text-xs text-slate-500">Lease until</div>
                            <div className="text-sm">{listing.leaseEnd}</div>
                          </div>
                        ) : (
                          <div className="text-xs text-slate-500">No active lease</div>
                        )}
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
              {listings.length > (isMobile ? 3 : 5) && (
                <div className="p-4 text-center border-t">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onNavigate("properties")}
                    className="text-slate-600 hover:text-slate-900"
                  >
                    View all properties
                    <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-8">
          {/* Occupancy Card */}
          <Card className="overflow-hidden border-transparent shadow-sm hover:shadow-md transition-all">
            <CardHeader className="bg-white border-b">
              <CardTitle>Occupancy Rate</CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="flex flex-col items-center">
                <div className="relative h-32 w-32 flex items-center justify-center">
                  <svg className="h-full w-full" viewBox="0 0 100 100">
                    <circle
                      className="text-slate-100"
                      strokeWidth="10"
                      stroke="currentColor"
                      fill="transparent"
                      r="40"
                      cx="50"
                      cy="50"
                    />
                    <circle
                      className="text-blue-600"
                      strokeWidth="10"
                      strokeDasharray={`${overallOccupancyRate * 2.51} 251.2`}
                      strokeLinecap="round"
                      stroke="currentColor"
                      fill="transparent"
                      r="40"
                      cx="50"
                      cy="50"
                    />
                  </svg>
                  <div className="absolute text-center">
                    <div className="text-3xl font-bold">{overallOccupancyRate}%</div>
                    <div className="text-xs text-slate-500">Occupancy</div>
                  </div>
                </div>

                <div className="mt-6 w-full space-y-4">
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Full Units</span>
                      <span className="font-medium">
                        {Math.round(
                          (listings.filter((l) => l.type === "Full Unit" && l.status === "Occupied").length /
                            listings.filter((l) => l.type === "Full Unit").length) *
                            100,
                        )}
                        %
                      </span>
                    </div>
                    <Progress
                      value={Math.round(
                        (listings.filter((l) => l.type === "Full Unit" && l.status === "Occupied").length /
                          listings.filter((l) => l.type === "Full Unit").length) *
                          100,
                      )}
                      className="h-2"
                    />
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Rooms</span>
                      <span className="font-medium">
                        {Math.round(
                          (listings.filter(
                            (l) => (l.type === "Private Room" || l.type === "Shared Room") && l.status === "Occupied",
                          ).length /
                            listings.filter((l) => l.type === "Private Room" || l.type === "Shared Room").length) *
                            100,
                        )}
                        %
                      </span>
                    </div>
                    <Progress
                      value={Math.round(
                        (listings.filter(
                          (l) => (l.type === "Private Room" || l.type === "Shared Room") && l.status === "Occupied",
                        ).length /
                          listings.filter((l) => l.type === "Private Room" || l.type === "Shared Room").length) *
                          100,
                      )}
                      className="h-2"
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Urgent Tasks */}
          <Card className="overflow-hidden border-transparent shadow-sm hover:shadow-md transition-all">
            <CardHeader className="bg-white border-b">
              <CardTitle>Upcoming Tasks</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <ul className="divide-y divide-slate-100">
                {urgentTasks.map((task, index) => (
                  <li
                    key={task.id}
                    className="hover:bg-slate-50 cursor-pointer transition-colors"
                    onClick={() => onNavigate(task.navigate)}
                  >
                    <div className="flex items-center p-4">
                      <div
                        className={`p-2 rounded-full mr-3 ${
                          task.type === "lease" ? "bg-blue-50 text-blue-600" : "bg-amber-50 text-amber-600"
                        }`}
                      >
                        {task.type === "lease" && <FileText className="h-4 w-4" />}
                        {task.type === "maintenance" && <Wrench className="h-4 w-4" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-900 truncate">{task.title}</p>
                        <p className="text-xs text-slate-500">{task.dueDate}</p>
                      </div>
                      <ChevronRight className="h-4 w-4 text-slate-400" />
                    </div>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

