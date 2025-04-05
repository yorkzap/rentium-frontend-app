"use client"
import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Home,
  CreditCard,
  FileText,
  Wrench,
  MessageSquare,
  Receipt,
  Bolt,
  Droplet,
  Flame,
  Wifi,
  Bell,
  User,
  ChevronRight,
  Settings,
  Download,
  CreditCardIcon,
  CheckCircle,
  Upload,
  Search,
  Filter,
  Plus,
  Shield,
  Building,
  AlertCircle,
  Calendar,
  Clock,
} from "lucide-react"
import { useMediaQuery } from "@/hooks/use-media-query"
import { Progress } from "@/components/ui/progress"
import { cn } from "@/lib/utils"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useAuth } from "@/contexts/AuthContext"
import { useRouter } from "next/navigation"
import ProfileSettings from "./profile/ProfileSettings"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

export default function TenantDashboard() {
  const [activeTab, setActiveTab] = useState("overview")
  const [notifications, setNotifications] = useState(2)
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState("credit-card")
  const isMobile = useMediaQuery("(max-width: 768px)")
  const { user, logout } = useAuth()
  const router = useRouter()

  // Get user initials for avatar
  const getUserInitials = () => {
    if (!user || !user.name) return "U"

    const nameParts = user.name.split(" ")
    if (nameParts.length >= 2) {
      return `${nameParts[0][0]}${nameParts[1][0]}`.toUpperCase()
    }
    return nameParts[0][0].toUpperCase()
  }

  // Mock data for tenant dashboard
  const property = {
    address: "123 Main St, Apt 4B",
    city: "New York, NY 10001",
    landlord: "John Smith",
    landlordContact: "landlord@example.com",
    leaseStart: "Jan 1, 2023",
    leaseEnd: "Dec 31, 2023",
    rent: "$1,500",
    dueDate: "1st of each month",
    image: "/placeholder.svg?height=200&width=400",
  }

  const utilities = [
    { id: 1, type: "Electricity", icon: Bolt, amount: "$85", yourShare: "$42.50", color: "bg-amber-50 text-amber-600" },
    { id: 2, type: "Water", icon: Droplet, amount: "$65", yourShare: "$32.50", color: "bg-blue-50 text-blue-600" },
    { id: 3, type: "Gas", icon: Flame, amount: "$100", yourShare: "$50", color: "bg-red-50 text-red-600" },
    { id: 4, type: "Internet", icon: Wifi, amount: "$100", yourShare: "$50", color: "bg-purple-50 text-purple-600" },
  ]

  const payments = [
    { id: 1, date: "Apr 1, 2023", amount: "$1,500", status: "Paid", method: "Bank Transfer", receipt: true },
    { id: 2, date: "Mar 1, 2023", amount: "$1,500", status: "Paid", method: "Bank Transfer", receipt: true },
    { id: 3, date: "Feb 1, 2023", amount: "$1,500", status: "Paid", method: "Credit Card", receipt: true },
    { id: 4, date: "Jan 1, 2023", amount: "$1,500", status: "Paid", method: "Bank Transfer", receipt: true },
    { id: 5, date: "Dec 1, 2022", amount: "$1,500", status: "Paid", method: "Credit Card", receipt: true },
    { id: 6, date: "Nov 1, 2022", amount: "$1,500", status: "Paid", method: "Bank Transfer", receipt: true },
  ]

  const maintenanceRequests = [
    {
      id: 1,
      issue: "Leaking faucet in bathroom",
      status: "In Progress",
      priority: "Medium",
      date: "Apr 15, 2023",
      description: "The bathroom sink faucet is leaking constantly, causing water to pool around the sink area.",
      updates: [
        { date: "Apr 15, 2023", note: "Request submitted", by: "You" },
        { date: "Apr 16, 2023", note: "Request approved. Plumber scheduled for Apr 18.", by: "Landlord" },
      ],
    },
    {
      id: 2,
      issue: "Heating not working properly",
      status: "Completed",
      priority: "High",
      date: "Feb 10, 2023",
      description: "The heating system is not maintaining temperature properly. The apartment gets very cold at night.",
      updates: [
        { date: "Feb 10, 2023", note: "Request submitted", by: "You" },
        { date: "Feb 11, 2023", note: "Request approved. HVAC technician scheduled for Feb 12.", by: "Landlord" },
        {
          date: "Feb 12, 2023",
          note: "Technician replaced thermostat and serviced heating system.",
          by: "Maintenance",
        },
        { date: "Feb 13, 2023", note: "Request marked as completed.", by: "Landlord" },
      ],
    },
    {
      id: 3,
      issue: "Light fixture not working in kitchen",
      status: "Scheduled",
      priority: "Low",
      date: "Apr 20, 2023",
      description:
        "The ceiling light in the kitchen is not turning on. I've tried replacing the bulb but it still doesn't work.",
      updates: [
        { date: "Apr 20, 2023", note: "Request submitted", by: "You" },
        { date: "Apr 21, 2023", note: "Request approved. Electrician scheduled for Apr 25.", by: "Landlord" },
      ],
    },
  ]

  const documents = [
    {
      id: 1,
      name: "Lease Agreement",
      type: "PDF",
      size: "1.2 MB",
      date: "Jan 1, 2023",
      category: "Lease",
      icon: FileText,
    },
    {
      id: 2,
      name: "Move-in Inspection",
      type: "PDF",
      size: "3.5 MB",
      date: "Jan 1, 2023",
      category: "Inspection",
      icon: CheckCircle,
    },
    {
      id: 3,
      name: "Rental Policies",
      type: "PDF",
      size: "850 KB",
      date: "Jan 1, 2023",
      category: "Policy",
      icon: FileText,
    },
    {
      id: 4,
      name: "Renter's Insurance",
      type: "PDF",
      size: "1.1 MB",
      date: "Jan 5, 2023",
      category: "Insurance",
      icon: Shield,
    },
    {
      id: 5,
      name: "Building Rules",
      type: "PDF",
      size: "720 KB",
      date: "Jan 1, 2023",
      category: "Policy",
      icon: FileText,
    },
    {
      id: 6,
      name: "Maintenance Request Form",
      type: "PDF",
      size: "550 KB",
      date: "Jan 1, 2023",
      category: "Form",
      icon: Wrench,
    },
  ]

  // Calculate days until next payment
  const today = new Date()
  const nextPaymentDate = new Date(today.getFullYear(), today.getMonth() + 1, 1)
  const daysUntilPayment = Math.ceil((nextPaymentDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))

  // Calculate lease progress
  const leaseStartDate = new Date("2023-01-01")
  const leaseEndDate = new Date("2023-12-31")
  const totalLeaseDays = (leaseEndDate.getTime() - leaseStartDate.getTime()) / (1000 * 60 * 60 * 24)
  const daysElapsed = (today.getTime() - leaseStartDate.getTime()) / (1000 * 60 * 60 * 24)
  const leaseProgress = Math.round((daysElapsed / totalLeaseDays) * 100)

  // Calculate total utilities
  const totalUtilities = utilities.reduce(
    (sum, utility) => sum + Number.parseFloat(utility.yourShare.replace("$", "")),
    0,
  )

  const handleLogout = () => {
    logout()
    router.push("/auth/login")
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Top Navigation */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10 shadow-sm">
        <div className="max-w-screen-2xl mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            {/* Logo and Mobile Menu Button */}
            <div className="flex items-center">
              <h1 className="text-xl font-semibold text-slate-900 mr-2">Rentium</h1>
              <span className="hidden md:inline-flex px-2 py-1 bg-slate-100 text-xs rounded-md text-slate-700">
                Tenant
              </span>
            </div>

            {/* Navigation */}
            <nav className="hidden md:flex items-center space-x-1">
              <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="bg-transparent p-0 h-auto">
                  <TabsTrigger
                    value="overview"
                    className={cn(
                      "h-9 px-4 text-sm font-medium transition-colors",
                      activeTab === "overview"
                        ? "bg-slate-900 text-white"
                        : "bg-transparent text-slate-600 hover:text-slate-900",
                    )}
                  >
                    Overview
                  </TabsTrigger>
                  <TabsTrigger
                    value="payments"
                    className={cn(
                      "h-9 px-4 text-sm font-medium transition-colors",
                      activeTab === "payments"
                        ? "bg-slate-900 text-white"
                        : "bg-transparent text-slate-600 hover:text-slate-900",
                    )}
                  >
                    Payments
                  </TabsTrigger>
                  <TabsTrigger
                    value="maintenance"
                    className={cn(
                      "h-9 px-4 text-sm font-medium transition-colors",
                      activeTab === "maintenance"
                        ? "bg-slate-900 text-white"
                        : "bg-transparent text-slate-600 hover:text-slate-900",
                    )}
                  >
                    Maintenance
                  </TabsTrigger>
                  <TabsTrigger
                    value="documents"
                    className={cn(
                      "h-9 px-4 text-sm font-medium transition-colors",
                      activeTab === "documents"
                        ? "bg-slate-900 text-white"
                        : "bg-transparent text-slate-600 hover:text-slate-900",
                    )}
                  >
                    Documents
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </nav>

            {/* User Menu and Notifications */}
            <div className="flex items-center space-x-4">
              {/* Contact Landlord Button */}
              <Button variant="outline" size="sm" className="hidden md:flex">
                <MessageSquare className="h-4 w-4 mr-1" /> Contact Landlord
              </Button>

              {/* Notifications */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="relative">
                    <Bell className="h-5 w-5 text-slate-600" />
                    {notifications > 0 && (
                      <Badge
                        variant="destructive"
                        className="absolute -top-1 -right-1 h-4 w-4 p-0 flex items-center justify-center text-[10px]"
                      >
                        {notifications}
                      </Badge>
                    )}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-80">
                  <div className="flex items-center justify-between px-4 py-2 border-b">
                    <span className="font-medium">Notifications</span>
                    <button className="text-xs text-slate-500 hover:text-slate-900" onClick={() => setNotifications(0)}>
                      Mark all as read
                    </button>
                  </div>
                  <div className="py-2 px-4 max-h-80 overflow-auto">
                    <div className="space-y-2">
                      <div className="p-2 bg-slate-50 rounded-md text-sm">
                        <div className="font-medium">Rent due soon</div>
                        <p className="text-xs text-slate-500">Your rent payment is due in {daysUntilPayment} days</p>
                      </div>
                      <div className="p-2 bg-slate-50 rounded-md text-sm">
                        <div className="font-medium">Maintenance update</div>
                        <p className="text-xs text-slate-500">Your request for the leaking faucet is in progress</p>
                      </div>
                    </div>
                  </div>
                </DropdownMenuContent>
              </DropdownMenu>

              {/* User Menu */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="rounded-full p-0 h-8 w-8">
                    <Avatar className="h-8 w-8 bg-slate-900 text-white">
                      <AvatarImage src={user?.profileImage || ""} alt={user?.name || "User"} />
                      <AvatarFallback>{getUserInitials()}</AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <div className="px-4 py-2 text-sm">
                    <p className="font-medium">{user?.name || user?.email || "User"}</p>
                    <p className="text-xs text-slate-500">Tenant</p>
                  </div>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => setActiveTab("profile")}>
                    <User className="h-4 w-4 mr-2" />
                    My Account
                  </DropdownMenuItem>
                  <DropdownMenuItem>
                    <Settings className="h-4 w-4 mr-2" />
                    Settings
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleLogout}>Logout</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          {/* Mobile Navigation */}
          <div className="md:hidden py-2 overflow-x-auto">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="w-full justify-start">
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="payments">Payments</TabsTrigger>
                <TabsTrigger value="maintenance">Maintenance</TabsTrigger>
                <TabsTrigger value="documents">Documents</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-auto bg-slate-50">
        <div className="max-w-screen-2xl mx-auto px-4 py-6">
          {activeTab === "profile" ? (
            <ProfileSettings />
          ) : (
            <Tabs value={activeTab} className="mt-0">
              {activeTab === "overview" && (
                <div className="mb-6">
                  <h1 className="text-3xl font-semibold text-slate-900">
                    Welcome{user?.name ? `, ${user.name.split(" ")[0]}` : ""}
                  </h1>
                  <p className="text-slate-500 mt-1">Here's an overview of your rental information</p>
                </div>
              )}

              {activeTab === "payments" && (
                <div className="mb-6">
                  <h1 className="text-3xl font-semibold text-slate-900">Payments</h1>
                  <p className="text-slate-500 mt-1">Manage your rent payments and payment methods</p>
                </div>
              )}

              {activeTab === "maintenance" && (
                <div className="mb-6">
                  <h1 className="text-3xl font-semibold text-slate-900">Maintenance</h1>
                  <p className="text-slate-500 mt-1">Submit and track maintenance requests for your rental</p>
                </div>
              )}

              {activeTab === "documents" && (
                <div className="mb-6">
                  <h1 className="text-3xl font-semibold text-slate-900">Documents</h1>
                  <p className="text-slate-500 mt-1">Access and manage important documents related to your rental</p>
                </div>
              )}

              <TabsContent value="overview" className="mt-0 space-y-6">
                {/* Important alerts section */}
                {daysUntilPayment <= 5 && (
                  <div className="bg-amber-50 border-l-4 border-amber-500 p-4 rounded-r-md mb-6">
                    <div className="flex">
                      <AlertCircle className="h-6 w-6 text-amber-500 mr-3 flex-shrink-0" />
                      <div>
                        <h3 className="text-sm font-medium text-amber-800">Rent Due Soon</h3>
                        <div className="mt-1 text-sm text-amber-700">
                          Your rent payment of ${(1500 + totalUtilities).toFixed(2)} is due in {daysUntilPayment} days.
                          <Button
                            variant="link"
                            className="p-0 h-auto text-amber-800 font-medium"
                            onClick={() => setActiveTab("payments")}
                          >
                            Make a payment
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <Card className="md:col-span-2 overflow-hidden border-transparent shadow-sm hover:shadow-md transition-all">
                    <CardHeader className="bg-white border-b pb-3">
                      <CardTitle className="flex items-center text-lg">
                        <Home className="mr-2 h-5 w-5 text-slate-600" />
                        Your Rental Property
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                      <div className="aspect-video relative">
                        <img
                          src={property.image || "/placeholder.svg"}
                          alt={property.address}
                          className="w-full h-full object-cover"
                        />
                      </div>

                      <div className="p-6 space-y-4">
                        <div>
                          <h3 className="font-semibold text-lg">{property.address}</h3>
                          <p className="text-slate-500">{property.city}</p>
                        </div>

                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <p className="text-slate-500">Landlord</p>
                            <p>{property.landlord}</p>
                          </div>
                          <div>
                            <p className="text-slate-500">Contact</p>
                            <p>{property.landlordContact}</p>
                          </div>
                          <div>
                            <p className="text-slate-500">Lease Period</p>
                            <p>
                              {property.leaseStart} - {property.leaseEnd}
                            </p>
                          </div>
                          <div>
                            <p className="text-slate-500">Monthly Rent</p>
                            <p className="font-semibold">{property.rent}</p>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <div className="space-y-6">
                    <Card className="overflow-hidden border-transparent shadow-sm hover:shadow-md transition-all">
                      <CardHeader className="bg-white border-b pb-3">
                        <CardTitle className="flex items-center text-lg">
                          <CreditCard className="mr-2 h-5 w-5 text-slate-600" />
                          Next Payment
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="p-6">
                        <div className="space-y-4">
                          <div className="flex justify-between items-center">
                            <div>
                              <p className="text-slate-500">Due Date</p>
                              <p className="text-lg font-semibold">May 1, 2023</p>
                            </div>
                            <div>
                              <p className="text-slate-500">Amount</p>
                              <p className="text-lg font-semibold">${(1500 + totalUtilities).toFixed(2)}</p>
                            </div>
                          </div>

                          <div className="text-center p-3 bg-amber-50 rounded-md text-amber-700 text-sm">
                            {daysUntilPayment} days until next payment
                          </div>

                          <Button
                            className="w-full bg-slate-900 hover:bg-slate-800"
                            onClick={() => setActiveTab("payments")}
                          >
                            Make Payment
                          </Button>
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="overflow-hidden border-transparent shadow-sm hover:shadow-md transition-all">
                      <CardHeader className="bg-white border-b pb-3">
                        <CardTitle className="flex items-center text-lg">
                          <FileText className="mr-2 h-5 w-5 text-slate-600" />
                          Lease Progress
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="p-6">
                        <div className="space-y-2">
                          <div className="flex justify-between text-sm">
                            <span>Lease completion</span>
                            <span className="font-medium">{leaseProgress}%</span>
                          </div>
                          <Progress value={leaseProgress} className="h-2" />
                          <p className="text-xs text-slate-500">Your lease ends on {property.leaseEnd}</p>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <Card className="overflow-hidden border-transparent shadow-sm hover:shadow-md transition-all">
                    <CardHeader className="bg-white border-b pb-3 flex flex-row items-center justify-between">
                      <CardTitle className="flex items-center text-lg">
                        <Receipt className="mr-2 h-5 w-5 text-slate-600" />
                        Recent Payments
                      </CardTitle>
                      <Button variant="ghost" size="sm" onClick={() => setActiveTab("payments")}>
                        View All
                      </Button>
                    </CardHeader>
                    <CardContent className="p-0">
                      <ul className="divide-y divide-slate-100">
                        {payments.slice(0, 3).map((payment) => (
                          <li key={payment.id} className="hover:bg-slate-50 transition-colors">
                            <div className="flex justify-between items-center p-4">
                              <div className="flex-1">
                                <div className="text-sm font-medium">{payment.date}</div>
                                <div className="text-xs text-slate-500">{payment.method}</div>
                              </div>
                              <div className="text-sm font-medium">{payment.amount}</div>
                              <span className="ml-4 inline-flex items-center rounded-full bg-green-50 px-2 py-1 text-xs font-medium text-green-700">
                                {payment.status}
                              </span>
                            </div>
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>

                  <Card className="overflow-hidden border-transparent shadow-sm hover:shadow-md transition-all">
                    <CardHeader className="flex flex-row items-center justify-between bg-white border-b pb-3">
                      <CardTitle className="flex items-center text-lg">
                        <Wrench className="mr-2 h-5 w-5 text-slate-600" />
                        Maintenance
                      </CardTitle>
                      <Button
                        size="sm"
                        className="bg-slate-900 hover:bg-slate-800"
                        onClick={() => setActiveTab("maintenance")}
                      >
                        New Request
                      </Button>
                    </CardHeader>
                    <CardContent className="p-0">
                      {maintenanceRequests.length > 0 ? (
                        <ul className="divide-y divide-slate-100">
                          {maintenanceRequests.slice(0, 2).map((request) => (
                            <li
                              key={request.id}
                              className="hover:bg-slate-50 transition-colors cursor-pointer"
                              onClick={() => setActiveTab("maintenance")}
                            >
                              <div className="flex justify-between items-center p-4">
                                <div className="flex-1">
                                  <div className="text-sm font-medium">{request.issue}</div>
                                  <div className="text-xs text-slate-500">{request.date}</div>
                                </div>
                                <span
                                  className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${
                                    request.status === "Completed"
                                      ? "bg-green-50 text-green-700"
                                      : request.status === "In Progress"
                                        ? "bg-amber-50 text-amber-700"
                                        : "bg-blue-50 text-blue-700"
                                  }`}
                                >
                                  {request.status}
                                </span>
                                <ChevronRight className="h-4 w-4 ml-2 text-slate-400" />
                              </div>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <div className="text-center text-slate-500 py-8">No maintenance requests</div>
                      )}
                      {maintenanceRequests.length > 2 && (
                        <div className="p-3 text-center border-t">
                          <Button variant="ghost" size="sm" onClick={() => setActiveTab("maintenance")}>
                            View All Requests
                          </Button>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              <TabsContent value="payments" className="mt-0 space-y-6">
                {/* Payment summary cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                  <Card>
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-slate-500">Next Payment</p>
                          <p className="text-2xl font-semibold">${(1500 + totalUtilities).toFixed(2)}</p>
                        </div>
                        <div className="p-2 rounded-full bg-amber-50 text-amber-600">
                          <Calendar className="h-5 w-5" />
                        </div>
                      </div>
                      <p className="text-xs text-slate-500 mt-2">Due on May 1, 2023</p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-slate-500">Base Rent</p>
                          <p className="text-2xl font-semibold">$1,500.00</p>
                        </div>
                        <div className="p-2 rounded-full bg-slate-100 text-slate-600">
                          <Home className="h-5 w-5" />
                        </div>
                      </div>
                      <p className="text-xs text-slate-500 mt-2">Monthly rent amount</p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-slate-500">Utilities</p>
                          <p className="text-2xl font-semibold">${totalUtilities.toFixed(2)}</p>
                        </div>
                        <div className="p-2 rounded-full bg-blue-50 text-blue-600">
                          <Bolt className="h-5 w-5" />
                        </div>
                      </div>
                      <p className="text-xs text-slate-500 mt-2">Your share of utilities</p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-slate-500">Days Until Due</p>
                          <p className="text-2xl font-semibold">{daysUntilPayment}</p>
                        </div>
                        <div className="p-2 rounded-full bg-green-50 text-green-600">
                          <Clock className="h-5 w-5" />
                        </div>
                      </div>
                      <p className="text-xs text-slate-500 mt-2">Time remaining to pay</p>
                    </CardContent>
                  </Card>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <Card className="md:col-span-2">
                    <CardHeader className="pb-3">
                      <CardTitle>Payment History</CardTitle>
                      <CardDescription>View your past rent payments</CardDescription>
                    </CardHeader>
                    <CardContent className="p-0">
                      <div className="rounded-md border">
                        <div className="grid grid-cols-5 bg-slate-50 p-3 text-sm font-medium text-slate-600">
                          <div>Date</div>
                          <div>Amount</div>
                          <div>Method</div>
                          <div>Status</div>
                          <div></div>
                        </div>
                        <div className="divide-y divide-slate-100">
                          {payments.map((payment) => (
                            <div key={payment.id} className="grid grid-cols-5 p-3 text-sm">
                              <div>{payment.date}</div>
                              <div className="font-medium">{payment.amount}</div>
                              <div>{payment.method}</div>
                              <div>
                                <span className="inline-flex items-center rounded-full bg-green-50 px-2 py-1 text-xs font-medium text-green-700">
                                  {payment.status}
                                </span>
                              </div>
                              <div className="text-right">
                                {payment.receipt && (
                                  <Button variant="ghost" size="sm">
                                    <Download className="h-4 w-4 mr-1" /> Receipt
                                  </Button>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <div className="space-y-6">
                    <Card>
                      <CardHeader className="pb-3">
                        <CardTitle>Make a Payment</CardTitle>
                        <CardDescription>Pay your rent and utilities</CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="p-4 bg-slate-50 rounded-md">
                          <div className="flex justify-between mb-2">
                            <span className="text-sm text-slate-600">Base Rent</span>
                            <span className="text-sm font-medium">$1,500.00</span>
                          </div>
                          <div className="flex justify-between mb-2">
                            <span className="text-sm text-slate-600">Utilities</span>
                            <span className="text-sm font-medium">${totalUtilities.toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between pt-2 border-t border-slate-200">
                            <span className="text-sm font-medium">Total Due</span>
                            <span className="text-sm font-bold">${(1500 + totalUtilities).toFixed(2)}</span>
                          </div>
                        </div>

                        <div className="space-y-2">
                          <Label>Payment Method</Label>
                          <div className="space-y-2">
                            <div className="flex items-center space-x-2">
                              <input
                                type="radio"
                                id="credit-card"
                                name="payment-method"
                                checked={selectedPaymentMethod === "credit-card"}
                                onChange={() => setSelectedPaymentMethod("credit-card")}
                                className="h-4 w-4 text-slate-900 focus:ring-slate-500"
                              />
                              <Label htmlFor="credit-card" className="flex items-center">
                                <CreditCardIcon className="h-4 w-4 mr-2 text-slate-600" />
                                Credit Card ending in 4242
                              </Label>
                            </div>
                            <div className="flex items-center space-x-2">
                              <input
                                type="radio"
                                id="bank-account"
                                name="payment-method"
                                checked={selectedPaymentMethod === "bank-account"}
                                onChange={() => setSelectedPaymentMethod("bank-account")}
                                className="h-4 w-4 text-slate-900 focus:ring-slate-500"
                              />
                              <Label htmlFor="bank-account" className="flex items-center">
                                <Building className="h-4 w-4 mr-2 text-slate-600" />
                                Bank Account ending in 1234
                              </Label>
                            </div>
                          </div>
                        </div>

                        <Button className="w-full bg-slate-900 hover:bg-slate-800">
                          Pay ${(1500 + totalUtilities).toFixed(2)}
                        </Button>

                        <div className="text-center">
                          <Button variant="link" size="sm" className="text-slate-500">
                            <Plus className="h-3 w-3 mr-1" /> Add Payment Method
                          </Button>
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader className="pb-3">
                        <CardTitle>Utilities Breakdown</CardTitle>
                        <CardDescription>Your share of utility costs</CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        {utilities.map((utility) => (
                          <div key={utility.id} className="flex items-center justify-between">
                            <div className="flex items-center">
                              <div className={`p-2 rounded-full mr-2 ${utility.color}`}>
                                <utility.icon className="h-4 w-4" />
                              </div>
                              <div>
                                <p className="text-sm font-medium">{utility.type}</p>
                                <p className="text-xs text-slate-500">Total: {utility.amount}</p>
                              </div>
                            </div>
                            <p className="font-medium">{utility.yourShare}</p>
                          </div>
                        ))}
                      </CardContent>
                    </Card>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="maintenance" className="mt-0 space-y-6">
                {/* Quick action buttons */}
                <div className="flex flex-wrap gap-3">
                  <Button className="bg-slate-900 hover:bg-slate-800">
                    <Plus className="h-4 w-4 mr-1" /> New Request
                  </Button>
                  <Button variant="outline">
                    <Clock className="h-4 w-4 mr-1" /> View Scheduled
                  </Button>
                  <Button variant="outline">
                    <CheckCircle className="h-4 w-4 mr-1" /> View Completed
                  </Button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <Card className="md:col-span-2">
                    <CardHeader className="pb-3">
                      <CardTitle>Maintenance Requests</CardTitle>
                      <CardDescription>Track the status of your maintenance requests</CardDescription>
                    </CardHeader>
                    <CardContent className="p-0">
                      <div className="p-4 flex items-center space-x-2">
                        <div className="relative flex-1">
                          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
                          <Input
                            type="search"
                            placeholder="Search requests..."
                            className="pl-8 w-full"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                          />
                        </div>
                        <Button variant="outline" size="sm">
                          <Filter className="h-4 w-4 mr-1" /> Filter
                        </Button>
                      </div>
                      <div className="rounded-md border">
                        <div className="grid grid-cols-4 bg-slate-50 p-3 text-sm font-medium text-slate-600">
                          <div>Issue</div>
                          <div>Date</div>
                          <div>Status</div>
                          <div>Priority</div>
                        </div>
                        <div className="divide-y divide-slate-100">
                          {maintenanceRequests.map((request) => (
                            <div
                              key={request.id}
                              className="grid grid-cols-4 p-3 text-sm hover:bg-slate-50 cursor-pointer"
                            >
                              <div className="font-medium">{request.issue}</div>
                              <div>{request.date}</div>
                              <div>
                                <span
                                  className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${
                                    request.status === "Completed"
                                      ? "bg-green-50 text-green-700"
                                      : request.status === "In Progress"
                                        ? "bg-amber-50 text-amber-700"
                                        : "bg-blue-50 text-blue-700"
                                  }`}
                                >
                                  {request.status}
                                </span>
                              </div>
                              <div>
                                <span
                                  className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${
                                    request.priority === "High"
                                      ? "bg-red-50 text-red-700"
                                      : request.priority === "Medium"
                                        ? "bg-amber-50 text-amber-700"
                                        : "bg-blue-50 text-blue-700"
                                  }`}
                                >
                                  {request.priority}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <div className="space-y-6">
                    <Card>
                      <CardHeader className="pb-3">
                        <CardTitle>Request Details</CardTitle>
                        <CardDescription>Selected maintenance request information</CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="space-y-2">
                          <h3 className="font-medium">Leaking faucet in bathroom</h3>
                          <div className="flex space-x-2">
                            <span className="inline-flex items-center rounded-full bg-amber-50 px-2 py-1 text-xs font-medium text-amber-700">
                              In Progress
                            </span>
                            <span className="inline-flex items-center rounded-full bg-amber-50 px-2 py-1 text-xs font-medium text-amber-700">
                              Medium Priority
                            </span>
                          </div>
                          <p className="text-sm text-slate-600 mt-2">
                            The bathroom sink faucet is leaking constantly, causing water to pool around the sink area.
                          </p>
                        </div>

                        <div className="space-y-2">
                          <h4 className="text-sm font-medium">Updates</h4>
                          <div className="space-y-2">
                            <div className="bg-slate-50 p-2 rounded-md">
                              <div className="flex justify-between text-xs text-slate-500">
                                <span>Apr 16, 2023</span>
                                <span>Landlord</span>
                              </div>
                              <p className="text-sm">Request approved. Plumber scheduled for Apr 18.</p>
                            </div>
                            <div className="bg-slate-50 p-2 rounded-md">
                              <div className="flex justify-between text-xs text-slate-500">
                                <span>Apr 15, 2023</span>
                                <span>You</span>
                              </div>
                              <p className="text-sm">Request submitted</p>
                            </div>
                          </div>
                        </div>

                        <div className="space-y-2">
                          <h4 className="text-sm font-medium">Add Comment</h4>
                          <Textarea placeholder="Type your comment here..." className="resize-none" />
                          <Button size="sm" className="w-full">
                            Send Comment
                          </Button>
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader className="pb-3">
                        <CardTitle>Submit New Request</CardTitle>
                        <CardDescription>Report a maintenance issue</CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="space-y-2">
                          <Label htmlFor="issue-title">Issue Title</Label>
                          <Input id="issue-title" placeholder="Brief description of the issue" />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="issue-description">Description</Label>
                          <Textarea
                            id="issue-description"
                            placeholder="Please provide details about the issue..."
                            className="resize-none min-h-[100px]"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="issue-priority">Priority</Label>
                          <Select defaultValue="medium">
                            <SelectTrigger id="issue-priority">
                              <SelectValue placeholder="Select priority" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="low">Low</SelectItem>
                              <SelectItem value="medium">Medium</SelectItem>
                              <SelectItem value="high">High</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="issue-photos">Photos (Optional)</Label>
                          <div className="border-2 border-dashed border-slate-200 rounded-md p-4 text-center">
                            <Upload className="h-8 w-8 mx-auto text-slate-400" />
                            <p className="text-sm text-slate-500 mt-2">Drag & drop photos or click to browse</p>
                            <Input id="issue-photos" type="file" multiple className="hidden" />
                            <Button variant="outline" size="sm" className="mt-2">
                              Upload Photos
                            </Button>
                          </div>
                        </div>
                        <Button className="w-full bg-slate-900 hover:bg-slate-800">Submit Request</Button>
                      </CardContent>
                    </Card>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="documents" className="mt-0 space-y-6">
                {/* Document categories */}
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
                  <Card className="hover:bg-slate-50 cursor-pointer">
                    <CardContent className="p-6 text-center">
                      <FileText className="h-8 w-8 mx-auto text-slate-600 mb-2" />
                      <p className="font-medium">Lease</p>
                      <p className="text-xs text-slate-500">
                        {documents.filter((d) => d.category === "Lease").length} documents
                      </p>
                    </CardContent>
                  </Card>
                  <Card className="hover:bg-slate-50 cursor-pointer">
                    <CardContent className="p-6 text-center">
                      <CheckCircle className="h-8 w-8 mx-auto text-slate-600 mb-2" />
                      <p className="font-medium">Inspections</p>
                      <p className="text-xs text-slate-500">
                        {documents.filter((d) => d.category === "Inspection").length} documents
                      </p>
                    </CardContent>
                  </Card>
                  <Card className="hover:bg-slate-50 cursor-pointer">
                    <CardContent className="p-6 text-center">
                      <FileText className="h-8 w-8 mx-auto text-slate-600 mb-2" />
                      <p className="font-medium">Policies</p>
                      <p className="text-xs text-slate-500">
                        {documents.filter((d) => d.category === "Policy").length} documents
                      </p>
                    </CardContent>
                  </Card>
                  <Card className="hover:bg-slate-50 cursor-pointer">
                    <CardContent className="p-6 text-center">
                      <Shield className="h-8 w-8 mx-auto text-slate-600 mb-2" />
                      <p className="font-medium">Insurance</p>
                      <p className="text-xs text-slate-500">
                        {documents.filter((d) => d.category === "Insurance").length} documents
                      </p>
                    </CardContent>
                  </Card>
                  <Card className="hover:bg-slate-50 cursor-pointer">
                    <CardContent className="p-6 text-center">
                      <Wrench className="h-8 w-8 mx-auto text-slate-600 mb-2" />
                      <p className="font-medium">Forms</p>
                      <p className="text-xs text-slate-500">
                        {documents.filter((d) => d.category === "Form").length} documents
                      </p>
                    </CardContent>
                  </Card>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <Card className="md:col-span-2">
                    <CardHeader className="pb-3 flex flex-row items-center justify-between">
                      <div>
                        <CardTitle>Documents</CardTitle>
                        <CardDescription>Access important documents related to your rental</CardDescription>
                      </div>
                      <Button variant="outline" size="sm">
                        <Upload className="h-4 w-4 mr-1" /> Upload
                      </Button>
                    </CardHeader>
                    <CardContent className="p-0">
                      <div className="p-4 flex items-center space-x-2">
                        <div className="relative flex-1">
                          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
                          <Input
                            type="search"
                            placeholder="Search documents..."
                            className="pl-8 w-full"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                          />
                        </div>
                        <Button variant="outline" size="sm">
                          <Filter className="h-4 w-4 mr-1" /> Filter
                        </Button>
                      </div>
                      <div className="rounded-md border">
                        <div className="grid grid-cols-5 bg-slate-50 p-3 text-sm font-medium text-slate-600">
                          <div className="col-span-2">Name</div>
                          <div>Category</div>
                          <div>Date</div>
                          <div>Actions</div>
                        </div>
                        <div className="divide-y divide-slate-100">
                          {documents.map((doc) => (
                            <div key={doc.id} className="grid grid-cols-5 p-3 text-sm hover:bg-slate-50">
                              <div className="col-span-2 flex items-center">
                                <doc.icon className="h-5 w-5 mr-2 text-slate-400" />
                                <span className="font-medium">{doc.name}</span>
                              </div>
                              <div>{doc.category}</div>
                              <div>{doc.date}</div>
                              <div className="flex space-x-2">
                                <Button variant="ghost" size="sm">
                                  <Download className="h-4 w-4" />
                                  <span className="sr-only">Download</span>
                                </Button>
                                <Button variant="ghost" size="sm">
                                  <Search className="h-4 w-4" />
                                  <span className="sr-only">View</span>
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <div className="space-y-6">
                    <Card>
                      <CardHeader className="pb-3">
                        <CardTitle>Recently Viewed</CardTitle>
                        <CardDescription>Your recently accessed documents</CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="space-y-2">
                          {documents.slice(0, 3).map((doc) => (
                            <div
                              key={doc.id}
                              className="flex items-center p-2 bg-slate-50 rounded-md hover:bg-slate-100 cursor-pointer"
                            >
                              <doc.icon className="h-5 w-5 mr-2 text-slate-400" />
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium truncate">{doc.name}</p>
                                <p className="text-xs text-slate-500">{doc.date}</p>
                              </div>
                              <Button variant="ghost" size="sm" className="ml-2">
                                <Download className="h-4 w-4" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader className="pb-3">
                        <CardTitle>Upload Document</CardTitle>
                        <CardDescription>Add a new document to your records</CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="space-y-2">
                          <Label htmlFor="doc-title">Document Title</Label>
                          <Input id="doc-title" placeholder="Enter document name" />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="doc-category">Category</Label>
                          <Select defaultValue="other">
                            <SelectTrigger id="doc-category">
                              <SelectValue placeholder="Select category" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="lease">Lease</SelectItem>
                              <SelectItem value="inspection">Inspection</SelectItem>
                              <SelectItem value="policy">Policy</SelectItem>
                              <SelectItem value="insurance">Insurance</SelectItem>
                              <SelectItem value="form">Form</SelectItem>
                              <SelectItem value="other">Other</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="doc-file">File</Label>
                          <div className="border-2 border-dashed border-slate-200 rounded-md p-4 text-center">
                            <Upload className="h-8 w-8 mx-auto text-slate-400" />
                            <p className="text-sm text-slate-500 mt-2">Drag & drop file or click to browse</p>
                            <Input id="doc-file" type="file" className="hidden" />
                            <Button variant="outline" size="sm" className="mt-2">
                              Select File
                            </Button>
                          </div>
                        </div>
                        <Button className="w-full bg-slate-900 hover:bg-slate-800">Upload Document</Button>
                      </CardContent>
                    </Card>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          )}
        </div>
      </main>
    </div>
  )
}

