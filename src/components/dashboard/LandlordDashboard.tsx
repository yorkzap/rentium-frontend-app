"use client"
import { useState } from "react"
import { useMediaQuery } from "@/hooks/use-media-query"
import {
  LayoutDashboard,
  Building,
  Wrench,
  FileText,
  CreditCard,
  Menu,
  X,
  Bell,
  User,
  Key,
  Settings,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
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

// Dashboard sections
import LandlordOverview from "./landlord/LandlordOverview"
import AssetManagement from "./landlord/AssetManagement"
import MaintenanceRequests from "./landlord/MaintenanceRequests"
import LeaseManagement from "./landlord/LeaseManagement"
import FinancialManagement from "./landlord/FinancialManagement"
import InventoryManagement from "./landlord/InventoryManagement"
import ProfileSettings from "./profile/ProfileSettings"

export default function LandlordDashboard() {
  const [activeSection, setActiveSection] = useState("dashboard")
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [notifications, setNotifications] = useState(3)
  const isMobile = useMediaQuery("(max-width: 768px)")
  const { user, logout } = useAuth()
  const router = useRouter()

  const menuItems = [
    { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
    { id: "properties", label: "Properties", icon: Building },
    { id: "maintenance", label: "Maintenance", icon: Wrench },
    { id: "inventory", label: "Inventory", icon: Key },
    { id: "leases", label: "Leases", icon: FileText },
    { id: "financial", label: "Financial", icon: CreditCard },
    { id: "profile", label: "My Account", icon: User },
  ]

  // Get user initials for avatar
  const getUserInitials = () => {
    if (!user || !user.name) return "U"

    const nameParts = user.name.split(" ")
    if (nameParts.length >= 2) {
      return `${nameParts[0][0]}${nameParts[1][0]}`.toUpperCase()
    }
    return nameParts[0][0].toUpperCase()
  }

  // Render the active section content
  const renderSection = () => {
    switch (activeSection) {
      case "dashboard":
        return <LandlordOverview onNavigate={setActiveSection} />
      case "properties":
        return <AssetManagement />
      case "maintenance":
        return <MaintenanceRequests />
      case "inventory":
        return <InventoryManagement />
      case "leases":
        return <LeaseManagement />
      case "financial":
        return <FinancialManagement />
      case "profile":
        return <ProfileSettings />
      default:
        return <LandlordOverview onNavigate={setActiveSection} />
    }
  }

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
                Landlord
              </span>

              {isMobile && (
                <Button variant="ghost" size="sm" className="ml-2" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
                  {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
                </Button>
              )}
            </div>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center space-x-1">
              {menuItems
                .filter((item) => item.id !== "profile")
                .map((item) => (
                  <Button
                    key={item.id}
                    variant={activeSection === item.id ? "default" : "ghost"}
                    size="sm"
                    className={cn(
                      "h-9 px-4 text-sm font-medium transition-colors",
                      activeSection === item.id ? "bg-slate-900 text-white" : "text-slate-600 hover:text-slate-900",
                    )}
                    onClick={() => setActiveSection(item.id)}
                  >
                    <item.icon className="h-4 w-4 mr-2" />
                    {item.label}
                  </Button>
                ))}
            </nav>

            {/* User Menu and Notifications */}
            <div className="flex items-center space-x-4">
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
                        <div className="font-medium">Lease expiring soon</div>
                        <p className="text-xs text-slate-500">The lease for 456 Park Ave will expire in 15 days</p>
                      </div>
                      <div className="p-2 bg-slate-50 rounded-md text-sm">
                        <div className="font-medium">Maintenance request submitted</div>
                        <p className="text-xs text-slate-500">New request: Leaking faucet at 123 Main St</p>
                      </div>
                      <div className="p-2 bg-slate-50 rounded-md text-sm">
                        <div className="font-medium">Rent payment received</div>
                        <p className="text-xs text-slate-500">Received $1,800 from John Tenant</p>
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
                    <p className="text-xs text-slate-500">Landlord</p>
                  </div>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => setActiveSection("profile")}>
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
        </div>

        {/* Mobile Navigation Menu */}
        {isMobile && mobileMenuOpen && (
          <div className="md:hidden border-t border-slate-200 bg-white">
            <nav className="flex flex-col py-2">
              {menuItems.map((item) => (
                <Button
                  key={item.id}
                  variant="ghost"
                  size="sm"
                  className={cn(
                    "justify-start rounded-none h-10 px-4 text-sm font-medium transition-colors",
                    activeSection === item.id
                      ? "bg-slate-100 text-slate-900"
                      : "text-slate-600 hover:bg-slate-50 hover:text-slate-900",
                  )}
                  onClick={() => {
                    setActiveSection(item.id)
                    setMobileMenuOpen(false)
                  }}
                >
                  <item.icon className="h-4 w-4 mr-2" />
                  {item.label}
                </Button>
              ))}
            </nav>
          </div>
        )}
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        <div className="max-w-screen-2xl mx-auto px-4 py-6">{renderSection()}</div>
      </main>
    </div>
  )
}

