"use client"
import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Building2, FileText, Camera, Plus, Search } from "lucide-react"
import { Input } from "@/components/ui/input"
import { useMediaQuery } from "@/hooks/use-media-query"

export default function AssetManagement() {
  const [searchTerm, setSearchTerm] = useState("")
  const isMobile = useMediaQuery("(max-width: 768px)")

  // Mock data for properties
  const properties = [
    {
      id: 1,
      name: "123 Main St Building",
      address: "123 Main St, New York, NY 10001",
      type: "Multi-unit",
      units: 4,
      occupiedUnits: 3,
      acquisitionDate: "Jan 15, 2020",
      currentValue: "$850,000",
      image: "/placeholder.svg?height=100&width=200",
    },
    {
      id: 2,
      name: "456 Park Ave",
      address: "456 Park Ave, Boston, MA 02108",
      type: "Single-family",
      units: 1,
      occupiedUnits: 1,
      acquisitionDate: "Mar 22, 2021",
      currentValue: "$425,000",
      image: "/placeholder.svg?height=100&width=200",
    },
    {
      id: 3,
      name: "789 Oak Rd",
      address: "789 Oak Rd, Chicago, IL 60601",
      type: "Single-family",
      units: 1,
      occupiedUnits: 0,
      acquisitionDate: "Jun 10, 2022",
      currentValue: "$375,000",
      image: "/placeholder.svg?height=100&width=200",
    },
    {
      id: 4,
      name: "101 Pine St",
      address: "101 Pine St, Seattle, WA 98101",
      type: "Multi-room",
      units: 3,
      occupiedUnits: 2,
      acquisitionDate: "Sep 5, 2021",
      currentValue: "$520,000",
      image: "/placeholder.svg?height=100&width=200",
    },
  ]

  // Filter properties based on search term
  const filteredProperties = properties.filter(
    (property) =>
      property.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      property.address.toLowerCase().includes(searchTerm.toLowerCase()) ||
      property.type.toLowerCase().includes(searchTerm.toLowerCase()),
  )

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Properties</h1>
          <p className="text-slate-500 text-sm mt-1">Manage your real estate portfolio</p>
        </div>
        <div className="flex space-x-2 w-full md:w-auto">
          <div className="relative flex-1 md:flex-initial">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
            <Input
              type="search"
              placeholder="Search properties..."
              className="pl-8 w-full"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <Button className="bg-slate-900 hover:bg-slate-800 whitespace-nowrap">
            <Plus className="h-4 w-4 mr-1" /> Add Property
          </Button>
        </div>
      </div>

      <Tabs defaultValue="all">
        <TabsList className="w-full md:w-auto">
          <TabsTrigger value="all">All Properties</TabsTrigger>
          <TabsTrigger value="units">Full Units</TabsTrigger>
          <TabsTrigger value="rooms">Rooms</TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="mt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredProperties.map((property) => (
              <Card key={property.id} className="overflow-hidden hover:shadow-md transition-shadow flex flex-col">
                <div className="aspect-video relative">
                  <img
                    src={property.image || "/placeholder.svg"}
                    alt={property.name}
                    className="w-full h-full object-cover"
                  />
                </div>
                <CardContent className="p-4 flex-1 flex flex-col">
                  <h3 className="font-semibold text-lg">{property.name}</h3>
                  <p className="text-sm text-slate-500 mb-3">{property.address}</p>

                  <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm mt-auto">
                    <div>
                      <p className="text-slate-500">Type</p>
                      <p>{property.type}</p>
                    </div>
                    <div>
                      <p className="text-slate-500">Occupancy</p>
                      <p>
                        {property.occupiedUnits}/{property.units} units
                      </p>
                    </div>
                    <div>
                      <p className="text-slate-500">Acquired</p>
                      <p>{property.acquisitionDate}</p>
                    </div>
                    <div>
                      <p className="text-slate-500">Value</p>
                      <p>{property.currentValue}</p>
                    </div>
                  </div>

                  <div className="mt-4 flex justify-end">
                    <Button variant="outline" size="sm">
                      View Details
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {filteredProperties.length === 0 && (
            <Card className="mt-4">
              <CardContent className="p-6 text-center">
                <Building2 className="h-12 w-12 text-slate-300 mx-auto mb-3" />
                <h3 className="text-lg font-medium text-slate-700">No properties found</h3>
                <p className="text-sm text-slate-500 mt-1">
                  {searchTerm ? `No properties match "${searchTerm}"` : "You haven't added any properties yet"}
                </p>
                {!searchTerm && (
                  <Button className="mt-4 bg-slate-900 hover:bg-slate-800">
                    <Plus className="h-4 w-4 mr-1" /> Add Your First Property
                  </Button>
                )}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="units" className="mt-4">
          <Card>
            <CardContent className="p-6">
              <h3 className="text-lg font-medium mb-4">Full Units Management</h3>
              <p className="text-slate-500">Detailed view of your full unit properties would appear here.</p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="rooms" className="mt-4">
          <Card>
            <CardContent className="p-6">
              <h3 className="text-lg font-medium mb-4">Rooms Management</h3>
              <p className="text-slate-500">Detailed view of your room listings would appear here.</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {!isMobile && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <FileText className="h-5 w-5 mr-2 text-slate-600" />
                Property Documents
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                <li className="flex justify-between items-center p-2 bg-slate-50 rounded-md">
                  <span>Insurance Policies</span>
                  <Button variant="ghost" size="sm">
                    View
                  </Button>
                </li>
                <li className="flex justify-between items-center p-2 bg-slate-50 rounded-md">
                  <span>Property Deeds</span>
                  <Button variant="ghost" size="sm">
                    View
                  </Button>
                </li>
                <li className="flex justify-between items-center p-2 bg-slate-50 rounded-md">
                  <span>Tax Documents</span>
                  <Button variant="ghost" size="sm">
                    View
                  </Button>
                </li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Camera className="h-5 w-5 mr-2 text-slate-600" />
                Property Inspections
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                <li className="flex justify-between items-center p-2 bg-slate-50 rounded-md">
                  <div>
                    <div className="font-medium">Annual Inspection</div>
                    <div className="text-xs text-slate-500">123 Main St - Apr 15, 2023</div>
                  </div>
                  <Button variant="ghost" size="sm">
                    View
                  </Button>
                </li>
                <li className="flex justify-between items-center p-2 bg-slate-50 rounded-md">
                  <div>
                    <div className="font-medium">Move-out Inspection</div>
                    <div className="text-xs text-slate-500">456 Park Ave, Unit 2 - Feb 28, 2023</div>
                  </div>
                  <Button variant="ghost" size="sm">
                    View
                  </Button>
                </li>
              </ul>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}

