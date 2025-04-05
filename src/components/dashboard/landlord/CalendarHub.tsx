"use client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Plus, Trash2, Recycle, Home, PenToolIcon as Tool, MoveRight } from "lucide-react"

export default function CalendarHub() {
  // Mock data for calendar events
  const upcomingEvents = [
    {
      id: 1,
      title: "Garbage Collection",
      date: "Apr 5, 2023",
      time: "7:00 AM",
      type: "Utility",
      properties: "All Properties",
      recurring: "Weekly",
    },
    {
      id: 2,
      title: "Recycling Collection",
      date: "Apr 7, 2023",
      time: "7:00 AM",
      type: "Utility",
      properties: "All Properties",
      recurring: "Bi-weekly",
    },
    {
      id: 3,
      title: "Property Inspection",
      date: "Apr 12, 2023",
      time: "10:00 AM",
      type: "Inspection",
      properties: "123 Main St, Apt 4B",
      recurring: "None",
    },
    {
      id: 4,
      title: "Plumber Appointment",
      date: "Apr 15, 2023",
      time: "2:00 PM - 4:00 PM",
      type: "Maintenance",
      properties: "456 Park Ave",
      recurring: "None",
    },
    {
      id: 5,
      title: "Tenant Move-In",
      date: "Apr 15, 2023",
      time: "9:00 AM",
      type: "Move-In",
      properties: "789 Oak Rd",
      recurring: "None",
    },
  ]

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-slate-900">Calendar Hub</h1>
        <Button className="bg-teal-600 hover:bg-teal-700">
          <Plus className="h-4 w-4 mr-1" /> Add Event
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>April 2023</CardTitle>
            </CardHeader>
            <CardContent>
              {/* This would be a full calendar component in a real app */}
              <div className="bg-slate-50 p-4 rounded-md text-center">
                <p className="text-muted-foreground">Calendar view would be displayed here</p>
                <p className="text-xs text-slate-500 mt-2">
                  A full calendar component would be integrated in a real application
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        <div>
          <Card>
            <CardHeader>
              <CardTitle>Upcoming Events</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {upcomingEvents.slice(0, 3).map((event) => (
                  <div key={event.id} className="flex items-start p-2 bg-slate-50 rounded-md">
                    <div
                      className={`p-2 rounded-full mr-3 ${
                        event.type === "Utility"
                          ? "bg-blue-100 text-blue-700"
                          : event.type === "Inspection"
                            ? "bg-amber-100 text-amber-700"
                            : event.type === "Maintenance"
                              ? "bg-green-100 text-green-700"
                              : "bg-purple-100 text-purple-700"
                      }`}
                    >
                      {event.type === "Utility" &&
                        (event.title.includes("Garbage") ? (
                          <Trash2 className="h-4 w-4" />
                        ) : (
                          <Recycle className="h-4 w-4" />
                        ))}
                      {event.type === "Inspection" && <Home className="h-4 w-4" />}
                      {event.type === "Maintenance" && <Tool className="h-4 w-4" />}
                      {event.type === "Move-In" && <MoveRight className="h-4 w-4" />}
                    </div>
                    <div>
                      <div className="font-medium text-sm">{event.title}</div>
                      <div className="text-xs text-slate-500">
                        {event.date}, {event.time}
                      </div>
                      <div className="text-xs text-slate-500 mt-1">{event.properties}</div>
                    </div>
                  </div>
                ))}
              </div>
              <Button variant="ghost" size="sm" className="w-full mt-3">
                View All Events
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      <Tabs defaultValue="all">
        <TabsList>
          <TabsTrigger value="all">All Events</TabsTrigger>
          <TabsTrigger value="utility">Utility</TabsTrigger>
          <TabsTrigger value="maintenance">Maintenance</TabsTrigger>
          <TabsTrigger value="inspections">Inspections</TabsTrigger>
          <TabsTrigger value="moveinout">Move In/Out</TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="mt-4">
          <Card>
            <CardContent className="p-0">
              <div className="rounded-md border">
                <div className="grid grid-cols-6 bg-slate-50 p-3 text-sm font-medium text-slate-600">
                  <div>Event</div>
                  <div>Date & Time</div>
                  <div>Type</div>
                  <div>Properties</div>
                  <div>Recurring</div>
                  <div></div>
                </div>

                {upcomingEvents.map((event) => (
                  <div key={event.id} className="grid grid-cols-6 border-t p-3 text-sm">
                    <div className="font-medium">{event.title}</div>
                    <div>
                      {event.date}, {event.time}
                    </div>
                    <div>
                      <span
                        className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${
                          event.type === "Utility"
                            ? "bg-blue-100 text-blue-700"
                            : event.type === "Inspection"
                              ? "bg-amber-100 text-amber-700"
                              : event.type === "Maintenance"
                                ? "bg-green-100 text-green-700"
                                : "bg-purple-100 text-purple-700"
                        }`}
                      >
                        {event.type}
                      </span>
                    </div>
                    <div>{event.properties}</div>
                    <div>{event.recurring}</div>
                    <div className="text-right">
                      <Button variant="ghost" size="sm">
                        Edit
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Other tab contents would be similar but filtered by type */}
        <TabsContent value="utility" className="mt-4">
          <Card>
            <CardContent className="p-6">
              <p className="text-muted-foreground">
                Utility events like garbage and recycling collection would appear here.
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="maintenance" className="mt-4">
          <Card>
            <CardContent className="p-6">
              <p className="text-muted-foreground">Maintenance events would appear here.</p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="inspections" className="mt-4">
          <Card>
            <CardContent className="p-6">
              <p className="text-muted-foreground">Property inspection events would appear here.</p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="moveinout" className="mt-4">
          <Card>
            <CardContent className="p-6">
              <p className="text-muted-foreground">Move in/out events would appear here.</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

