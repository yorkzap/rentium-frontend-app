"use client"
import { useState, useEffect } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Building2,
  Plus,
  Search,
  Edit,
  Trash2,
  Eye,
  Home,
  Bed,
  Bath,
  Users,
  SquareIcon as SquareFootIcon,
  MapPin,
  Loader2,
} from "lucide-react"
import { Input } from "@/components/ui/input"
import { useMediaQuery } from "@/hooks/use-media-query"
import { useRouter } from "next/navigation"
import { Badge } from "@/components/ui/badge"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { toast } from "sonner"
import { useAuth } from "@/contexts/AuthContext"
import { DJANGO_API_URL } from "@/lib/config"

export default function AssetManagement() {
  const [searchTerm, setSearchTerm] = useState("")
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [propertyToDelete, setPropertyToDelete] = useState(null)
  const [properties, setProperties] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)
  const [activeTab, setActiveTab] = useState("all")
  const isMobile = useMediaQuery("(max-width: 768px)")
  const router = useRouter()
  const { token } = useAuth()

  // Fetch properties data from API
  useEffect(() => {
    const fetchProperties = async () => {
      setIsLoading(true)
      setError(null)
      
      try {
        const response = await fetch(`${DJANGO_API_URL}/properties/`, {
          headers: {
            'Authorization': `Token ${token}`,
          },
        })

        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.detail || 'Failed to fetch properties')
        }

        const data = await response.json()
        setProperties(data)
      } catch (error) {
        console.error("Error fetching properties:", error)
        setError(error instanceof Error ? error.message : 'An unknown error occurred')
        toast.error(`Failed to load properties: ${error instanceof Error ? error.message : 'Unknown error'}`)
      } finally {
        setIsLoading(false)
      }
    }

    fetchProperties()
  }, [token])

  // Count properties by category and status
  const categoryCounts = {
    all: properties.length,
    units: properties.filter(p => p.property_category === "COMPLETE_UNIT").length,
    rooms: properties.filter(p => p.property_category === "ROOM").length,
    available: properties.filter(p => p.status === "AVAILABLE").length,
    occupied: properties.filter(p => p.status === "OCCUPIED").length,
  }

  // Filter properties based on search term and active tab
  const getFilteredProperties = () => {
    // First apply search filter
    let filtered = properties.filter(
      (property) =>
        property.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        property.address?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        property.city?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        property.property_category_display?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        property.unit_type_display?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        property.status_display?.toLowerCase().includes(searchTerm.toLowerCase()),
    )
    
    // Then apply tab filter
    switch (activeTab) {
      case "units":
        filtered = filtered.filter(property => property.property_category === "COMPLETE_UNIT");
        break;
      case "rooms":
        filtered = filtered.filter(property => property.property_category === "ROOM");
        break;
      case "available":
        filtered = filtered.filter(property => property.status === "AVAILABLE");
        break;
      case "occupied":
        filtered = filtered.filter(property => property.status === "OCCUPIED");
        break;
      default:
        // "all" tab - no additional filtering
        break;
    }

    return filtered;
  }

  const filteredProperties = getFilteredProperties();

  const handleCreateListing = () => {
    router.push("/dashboard/properties/create")
  }

  const handleEditProperty = (propertyId) => {
    router.push(`/dashboard/properties/edit/${propertyId}`)
  }

  const handleDeleteProperty = (property) => {
    setPropertyToDelete(property)
    setDeleteDialogOpen(true)
  }

  const confirmDelete = async () => {
    if (!propertyToDelete) return

    try {
      const response = await fetch(`${DJANGO_API_URL}/properties/${propertyToDelete.id}/`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Token ${token}`,
        },
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.detail || 'Failed to delete property')
      }

      // Remove the deleted property from the local state
      setProperties(properties.filter(p => p.id !== propertyToDelete.id))
      toast.success(`Property "${propertyToDelete.name}" deleted successfully`)
      
    } catch (error) {
      console.error("Error deleting property:", error)
      toast.error(`Error deleting property: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setDeleteDialogOpen(false)
      setPropertyToDelete(null)
    }
  }

  const getStatusColor = (status) => {
    switch (status) {
      case "AVAILABLE":
        return "bg-green-50 text-green-700"
      case "OCCUPIED":
        return "bg-blue-50 text-blue-700"
      case "MAINTENANCE":
        return "bg-amber-50 text-amber-700"
      case "NOT_AVAILABLE":
        return "bg-red-50 text-red-700"
      default:
        return "bg-slate-50 text-slate-700"
    }
  }

  const getCategoryColor = (category) => {
    switch (category) {
      case "COMPLETE_UNIT":
        return "bg-purple-50 text-purple-700"
      case "ROOM":
        return "bg-blue-50 text-blue-700"
      default:
        return "bg-slate-50 text-slate-700"
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-200px)]">
        <div className="flex flex-col items-center gap-2">
          <Loader2 className="h-8 w-8 animate-spin text-teal-600" />
          <p className="text-sm text-muted-foreground">Loading properties...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-6">
        <Card>
          <CardContent className="p-6 text-center">
            <Building2 className="h-12 w-12 text-red-300 mx-auto mb-3" />
            <h3 className="text-lg font-medium text-slate-700">Error loading properties</h3>
            <p className="text-sm text-slate-500 mt-1">{error}</p>
            <Button className="mt-4" onClick={() => window.location.reload()}>
              Try Again
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

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
          <Button className="bg-slate-900 hover:bg-slate-800 whitespace-nowrap" onClick={handleCreateListing}>
            <Plus className="h-4 w-4 mr-1" /> Add Property
          </Button>
        </div>
      </div>

      <Tabs defaultValue="all" value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="w-full md:w-auto">
          <TabsTrigger value="all">All Properties ({categoryCounts.all})</TabsTrigger>
          <TabsTrigger value="units">Full Units ({categoryCounts.units})</TabsTrigger>
          <TabsTrigger value="rooms">Rooms ({categoryCounts.rooms})</TabsTrigger>
          <TabsTrigger value="available">Available ({categoryCounts.available})</TabsTrigger>
          <TabsTrigger value="occupied">Occupied ({categoryCounts.occupied})</TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="mt-4">
          <PropertyGrid 
            properties={filteredProperties} 
            handleEditProperty={handleEditProperty} 
            handleDeleteProperty={handleDeleteProperty} 
            handleCreateListing={handleCreateListing}
            getStatusColor={getStatusColor}
            getCategoryColor={getCategoryColor}
            searchTerm={searchTerm}
            tabType="all"
          />
        </TabsContent>

        <TabsContent value="units" className="mt-4">
          <PropertyGrid 
            properties={filteredProperties} 
            handleEditProperty={handleEditProperty} 
            handleDeleteProperty={handleDeleteProperty} 
            handleCreateListing={handleCreateListing}
            getStatusColor={getStatusColor}
            getCategoryColor={getCategoryColor}
            searchTerm={searchTerm}
            tabType="units"
          />
        </TabsContent>

        <TabsContent value="rooms" className="mt-4">
          <PropertyGrid 
            properties={filteredProperties} 
            handleEditProperty={handleEditProperty} 
            handleDeleteProperty={handleDeleteProperty} 
            handleCreateListing={handleCreateListing}
            getStatusColor={getStatusColor}
            getCategoryColor={getCategoryColor}
            searchTerm={searchTerm}
            tabType="rooms"
          />
        </TabsContent>

        <TabsContent value="available" className="mt-4">
          <PropertyGrid 
            properties={filteredProperties} 
            handleEditProperty={handleEditProperty} 
            handleDeleteProperty={handleDeleteProperty} 
            handleCreateListing={handleCreateListing}
            getStatusColor={getStatusColor}
            getCategoryColor={getCategoryColor}
            searchTerm={searchTerm}
            tabType="available"
          />
        </TabsContent>

        <TabsContent value="occupied" className="mt-4">
          <PropertyGrid 
            properties={filteredProperties} 
            handleEditProperty={handleEditProperty} 
            handleDeleteProperty={handleDeleteProperty} 
            handleCreateListing={handleCreateListing}
            getStatusColor={getStatusColor}
            getCategoryColor={getCategoryColor}
            searchTerm={searchTerm}
            tabType="occupied"
          />
        </TabsContent>
      </Tabs>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the property "{propertyToDelete?.name}". This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-red-600 hover:bg-red-700 focus:ring-red-600">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

function PropertyGrid({ 
  properties, 
  handleEditProperty, 
  handleDeleteProperty, 
  handleCreateListing,
  getStatusColor,
  getCategoryColor,
  searchTerm,
  tabType
}) {
  const router = useRouter();

  if (properties.length === 0) {
    let emptyMessage = "You haven't added any properties yet";
    let actionText = "Add Your First Property";
    
    if (searchTerm) {
      emptyMessage = `No properties match "${searchTerm}"`;
      actionText = "Clear Search";
    } else {
      switch (tabType) {
        case "units":
          emptyMessage = "You haven't added any full units yet";
          actionText = "Add Your First Full Unit";
          break;
        case "rooms":
          emptyMessage = "You haven't added any rooms yet";
          actionText = "Add Your First Room";
          break;
        case "available":
          emptyMessage = "You don't have any available properties";
          actionText = "Add Available Property";
          break;
        case "occupied":
          emptyMessage = "You don't have any occupied properties";
          actionText = "Add New Property";
          break;
      }
    }
    
    return (
      <Card className="mt-4">
        <CardContent className="p-6 text-center">
          <Building2 className="h-12 w-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-lg font-medium text-slate-700">No properties found</h3>
          <p className="text-sm text-slate-500 mt-1">{emptyMessage}</p>
          <Button className="mt-4 bg-slate-900 hover:bg-slate-800" onClick={handleCreateListing}>
            <Plus className="h-4 w-4 mr-1" /> {actionText}
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {properties.map((property) => (
        <Card key={property.id} className="overflow-hidden hover:shadow-md transition-shadow flex flex-col">
          <div className="aspect-video relative">
            <img
              src={property.image || "/placeholder.svg?height=100&width=200"}
              alt={property.name}
              className="w-full h-full object-cover"
            />
            <div className="absolute top-2 right-2 flex gap-1">
              <Badge className={getCategoryColor(property.property_category)}>
                {property.property_category_display}
              </Badge>
              <Badge className={getStatusColor(property.status)}>{property.status_display}</Badge>
            </div>
          </div>
          <CardContent className="p-4 flex-1 flex flex-col">
            <div className="flex justify-between items-start">
              <h3 className="font-semibold text-lg">{property.name}</h3>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                    <span className="sr-only">Open menu</span>
                    <svg
                      width="15"
                      height="15"
                      viewBox="0 0 15 15"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-4 w-4"
                    >
                      <path
                        d="M3.625 7.5C3.625 8.12132 3.12132 8.625 2.5 8.625C1.87868 8.625 1.375 8.12132 1.375 7.5C1.375 6.87868 1.87868 6.375 2.5 6.375C3.12132 6.375 3.625 6.87868 3.625 7.5ZM8.625 7.5C8.625 8.12132 8.12132 8.625 7.5 8.625C6.87868 8.625 6.375 8.12132 6.375 7.5C6.375 6.87868 6.87868 6.375 7.5 6.375C8.12132 6.375 8.625 6.87868 8.625 7.5ZM13.625 7.5C13.625 8.12132 13.1213 8.625 12.5 8.625C11.8787 8.625 11.375 8.12132 11.375 7.5C11.375 6.87868 11.8787 6.375 12.5 6.375C13.1213 6.375 13.625 6.87868 13.625 7.5Z"
                        fill="currentColor"
                        fillRule="evenodd"
                        clipRule="evenodd"
                      ></path>
                    </svg>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => router.push(`/dashboard/properties/${property.id}`)}>
                    <Eye className="mr-2 h-4 w-4" />
                    <span>View Details</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleEditProperty(property.id)}>
                    <Edit className="mr-2 h-4 w-4" />
                    <span>Edit</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem className="text-red-600" onClick={() => handleDeleteProperty(property)}>
                    <Trash2 className="mr-2 h-4 w-4" />
                    <span>Delete</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            <div className="flex items-center text-sm text-slate-500 mt-1 mb-3">
              <MapPin className="h-3.5 w-3.5 mr-1 flex-shrink-0" />
              <span className="truncate">
                {property.address}, {property.city}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 mt-auto">
              {property.property_category === "COMPLETE_UNIT" && (
                <>
                  <div className="flex items-center text-sm">
                    <Home className="h-3.5 w-3.5 mr-1 text-slate-400" />
                    <span>{property.unit_type_display}</span>
                  </div>
                  <div className="flex items-center text-sm">
                    <Bed className="h-3.5 w-3.5 mr-1 text-slate-400" />
                    <span>
                      {property.bedrooms} {property.bedrooms === 1 ? "Bed" : "Beds"}
                    </span>
                  </div>
                  <div className="flex items-center text-sm">
                    <Bath className="h-3.5 w-3.5 mr-1 text-slate-400" />
                    <span>
                      {property.bathrooms} {property.bathrooms === 1 ? "Bath" : "Baths"}
                    </span>
                  </div>
                  <div className="flex items-center text-sm">
                    <SquareFootIcon className="h-3.5 w-3.5 mr-1 text-slate-400" />
                    <span>{property.square_footage} sq ft</span>
                  </div>
                </>
              )}
              {property.property_category === "ROOM" && (
                <>
                  <div className="flex items-center text-sm">
                    <Home className="h-3.5 w-3.5 mr-1 text-slate-400" />
                    <span>{property.room_type_display}</span>
                  </div>
                  <div className="flex items-center text-sm">
                    <Users className="h-3.5 w-3.5 mr-1 text-slate-400" />
                    <span>{property.shared_with ? `Shared with ${property.shared_with}` : "Private"}</span>
                  </div>
                  <div className="flex items-center text-sm">
                    <Bath className="h-3.5 w-3.5 mr-1 text-slate-400" />
                    <span>
                      {property.total_washrooms || 0} Shared {property.total_washrooms === 1 ? "Bath" : "Baths"}
                    </span>
                  </div>
                  <div className="flex items-center text-sm">
                    <SquareFootIcon className="h-3.5 w-3.5 mr-1 text-slate-400" />
                    <span>{property.square_footage} sq ft</span>
                  </div>
                </>
              )}
            </div>

            <div className="mt-4 flex justify-end">
              <Button
                variant="outline"
                size="sm"
                onClick={() => router.push(`/dashboard/properties/${property.id}`)}
              >
                View Details
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}