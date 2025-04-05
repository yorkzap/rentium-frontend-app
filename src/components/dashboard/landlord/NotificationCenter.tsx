"use client"
import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Bell,
  FileText,
  Wrench,
  Building2,
  Users,
  DollarSign,
  CalendarDays,
  CheckCircle,
  AlertTriangle,
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"

export default function NotificationCenter() {
  const [activeTab, setActiveTab] = useState("all")

  // Mock notifications data
  const notifications = [
    {
      id: 1,
      title: "Lease expiring soon",
      description: "The lease for 456 Park Ave will expire in 15 days",
      date: "2 hours ago",
      type: "lease",
      read: false,
      priority: "high",
    },
    {
      id: 2,
      title: "Maintenance request submitted",
      description: "New request: Leaking faucet at 123 Main St, Apt 4B",
      date: "5 hours ago",
      type: "maintenance",
      read: false,
      priority: "medium",
    },
    {
      id: 3,
      title: "Rent payment received",
      description: "Received $1,800 from John Tenant for 123 Main St",
      date: "Yesterday",
      type: "payment",
      read: true,
      priority: "low",
    },
    {
      id: 4,
      title: "Move-out inspection scheduled",
      description: "Inspection for 101 Pine St, Room 2 on Jun 28, 2023",
      date: "2 days ago",
      type: "inspection",
      read: true,
      priority: "medium",
    },
    {
      id: 5,
      title: "New message from tenant",
      description: 'Sarah Renter: "When will the plumber arrive?"',
      date: "3 days ago",
      type: "message",
      read: true,
      priority: "medium",
    },
  ]

  // Filter notifications based on active tab
  const filteredNotifications = notifications.filter((notification) => {
    if (activeTab === "all") return true
    if (activeTab === "unread") return !notification.read
    if (activeTab === "high") return notification.priority === "high"
    return notification.type === activeTab
  })

  // Count unread notifications
  const unreadCount = notifications.filter((n) => !n.read).length

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Notification Center</h1>
          <p className="text-slate-500 text-sm mt-1">Stay updated on important events</p>
        </div>
        <div className="flex space-x-2">
          <Button variant="outline" size="sm">
            <CheckCircle className="h-4 w-4 mr-1" />
            Mark All Read
          </Button>
          <Button size="sm" className="bg-teal-600 hover:bg-teal-700">
            <Bell className="h-4 w-4 mr-1" />
            Notification Settings
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">All Notifications</p>
                <p className="text-2xl font-bold">{notifications.length}</p>
              </div>
              <div className="p-2 rounded-full bg-slate-100 text-slate-700">
                <Bell className="h-5 w-5" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Unread</p>
                <p className="text-2xl font-bold">{unreadCount}</p>
              </div>
              <div className="p-2 rounded-full bg-blue-100 text-blue-700">
                <AlertTriangle className="h-5 w-5" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">High Priority</p>
                <p className="text-2xl font-bold">{notifications.filter((n) => n.priority === "high").length}</p>
              </div>
              <div className="p-2 rounded-full bg-red-100 text-red-700">
                <AlertTriangle className="h-5 w-5" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">This Week</p>
                <p className="text-2xl font-bold">{notifications.length}</p>
              </div>
              <div className="p-2 rounded-full bg-green-100 text-green-700">
                <CalendarDays className="h-5 w-5" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="all" onValueChange={setActiveTab}>
        <TabsList className="grid grid-cols-6 w-full">
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="unread">
            Unread
            {unreadCount > 0 && (
              <Badge variant="destructive" className="ml-2">
                {unreadCount}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="high">High Priority</TabsTrigger>
          <TabsTrigger value="maintenance">Maintenance</TabsTrigger>
          <TabsTrigger value="lease">Leases</TabsTrigger>
          <TabsTrigger value="payment">Payments</TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>
                {activeTab === "all" && "All Notifications"}
                {activeTab === "unread" && "Unread Notifications"}
                {activeTab === "high" && "High Priority Notifications"}
                {activeTab === "maintenance" && "Maintenance Notifications"}
                {activeTab === "lease" && "Lease Notifications"}
                {activeTab === "payment" && "Payment Notifications"}
              </CardTitle>
              <CardDescription>
                {filteredNotifications.length} notification{filteredNotifications.length !== 1 ? "s" : ""}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {filteredNotifications.length > 0 ? (
                  filteredNotifications.map((notification) => (
                    <div
                      key={notification.id}
                      className={`flex items-start p-4 rounded-lg border ${
                        !notification.read ? "bg-slate-50 border-slate-200" : "bg-white border-slate-100"
                      }`}
                    >
                      <div
                        className={`p-2 rounded-full mr-4 ${
                          notification.type === "lease"
                            ? "bg-blue-100 text-blue-700"
                            : notification.type === "maintenance"
                              ? "bg-amber-100 text-amber-700"
                              : notification.type === "payment"
                                ? "bg-green-100 text-green-700"
                                : notification.type === "inspection"
                                  ? "bg-purple-100 text-purple-700"
                                  : "bg-slate-100 text-slate-700"
                        }`}
                      >
                        {notification.type === "lease" && <FileText className="h-5 w-5" />}
                        {notification.type === "maintenance" && <Wrench className="h-5 w-5" />}
                        {notification.type === "payment" && <DollarSign className="h-5 w-5" />}
                        {notification.type === "inspection" && <Building2 className="h-5 w-5" />}
                        {notification.type === "message" && <Users className="h-5 w-5" />}
                      </div>

                      <div className="flex-1">
                        <div className="flex justify-between items-start">
                          <h3 className={`font-medium ${!notification.read ? "text-slate-900" : "text-slate-700"}`}>
                            {notification.title}
                            {!notification.read && (
                              <span className="ml-2 inline-flex h-2 w-2 rounded-full bg-blue-600"></span>
                            )}
                          </h3>
                          <span className="text-xs text-slate-500">{notification.date}</span>
                        </div>
                        <p className="text-sm text-slate-600 mt-1">{notification.description}</p>

                        <div className="flex justify-between items-center mt-3">
                          <div className="flex space-x-2">
                            {notification.priority === "high" && <Badge variant="destructive">High Priority</Badge>}
                            {notification.priority === "medium" && (
                              <Badge variant="default" className="bg-amber-500">
                                Medium Priority
                              </Badge>
                            )}
                          </div>

                          <div className="flex space-x-2">
                            <Button variant="ghost" size="sm">
                              {notification.read ? "Mark Unread" : "Mark Read"}
                            </Button>
                            <Button variant="outline" size="sm">
                              View
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8">
                    <Bell className="h-12 w-12 text-slate-300 mx-auto mb-3" />
                    <h3 className="text-lg font-medium text-slate-700">No notifications</h3>
                    <p className="text-sm text-slate-500 mt-1">
                      You don't have any {activeTab !== "all" ? activeTab : ""} notifications at the moment
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Card>
        <CardHeader>
          <CardTitle>Notification Preferences</CardTitle>
          <CardDescription>Customize how you receive notifications</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-4">
                <h3 className="text-sm font-medium">Email Notifications</h3>

                <div className="flex items-center justify-between">
                  <Label htmlFor="email-maintenance" className="text-sm">
                    Maintenance Requests
                  </Label>
                  <Switch id="email-maintenance" defaultChecked />
                </div>

                <div className="flex items-center justify-between">
                  <Label htmlFor="email-lease" className="text-sm">
                    Lease Renewals
                  </Label>
                  <Switch id="email-lease" defaultChecked />
                </div>

                <div className="flex items-center justify-between">
                  <Label htmlFor="email-payment" className="text-sm">
                    Payment Notifications
                  </Label>
                  <Switch id="email-payment" defaultChecked />
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-sm font-medium">SMS Notifications</h3>

                <div className="flex items-center justify-between">
                  <Label htmlFor="sms-maintenance" className="text-sm">
                    Maintenance Requests
                  </Label>
                  <Switch id="sms-maintenance" defaultChecked />
                </div>

                <div className="flex items-center justify-between">
                  <Label htmlFor="sms-lease" className="text-sm">
                    Lease Renewals
                  </Label>
                  <Switch id="sms-lease" />
                </div>

                <div className="flex items-center justify-between">
                  <Label htmlFor="sms-payment" className="text-sm">
                    Payment Notifications
                  </Label>
                  <Switch id="sms-payment" />
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-sm font-medium">In-App Notifications</h3>

                <div className="flex items-center justify-between">
                  <Label htmlFor="app-maintenance" className="text-sm">
                    Maintenance Requests
                  </Label>
                  <Switch id="app-maintenance" defaultChecked />
                </div>

                <div className="flex items-center justify-between">
                  <Label htmlFor="app-lease" className="text-sm">
                    Lease Renewals
                  </Label>
                  <Switch id="app-lease" defaultChecked />
                </div>

                <div className="flex items-center justify-between">
                  <Label htmlFor="app-payment" className="text-sm">
                    Payment Notifications
                  </Label>
                  <Switch id="app-payment" defaultChecked />
                </div>
              </div>
            </div>

            <div className="pt-4">
              <Button className="bg-teal-600 hover:bg-teal-700">Save Preferences</Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

