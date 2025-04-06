"use client";
import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ArrowLeft,
  Edit,
  Trash2,
  Home,
  Bed,
  Bath,
  SquareIcon as SquareFootIcon,
  MapPin,
  Calendar,
  DollarSign,
  Loader2,
  Camera,
  FileText,
  Key,
} from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { DJANGO_API_URL } from "@/lib/config";

export default function PropertyDetailsPage() {
  const [property, setProperty] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const router = useRouter();
  const params = useParams();
  const { token } = useAuth();
  const propertyId = params.id;

  useEffect(() => {
    const fetchProperty = async () => {
      if (!token) return;
      
      try {
        // Fetch property details from API
        const response = await fetch(`${DJANGO_API_URL}/properties/${propertyId}/`, {
          headers: {
            'Authorization': `Token ${token}`,
          },
        });
        
        if (!response.ok) {
          throw new Error('Failed to fetch property');
        }
        
        const data = await response.json();
        console.log("Property details:", data);
        
        // Add some default values for properties not coming from backend
        const enhancedData = {
          ...data,
          images: data.images || ["/placeholder.svg?height=400&width=600"],
          amenities: data.amenities || ["Air Conditioning", "Dishwasher", "In-unit Laundry"],
          rental_terms: data.rental_terms || {
            monthly_rent: 1800,
            security_deposit: 1800,
            lease_length: "12 months",
            available_from: "2025-05-01",
            utilities_included: ["Water", "Garbage"],
            utilities_not_included: ["Electricity", "Internet", "Gas"],
          }
        };
        
        setProperty(enhancedData);
        setIsLoading(false);
      } catch (error) {
        console.error("Error fetching property:", error);
        toast.error("Failed to load property data");
        router.push("/dashboard/properties");
      }
    };
    
    fetchProperty();
  }, [propertyId, token, router]);

  const handleEdit = () => {
    router.push(`/dashboard/properties/edit/${propertyId}`);
  };

  const handleDelete = () => {
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!token) return;
    
    setIsDeleting(true);
    try {
      const response = await fetch(`${DJANGO_API_URL}/properties/${propertyId}/`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Token ${token}`,
        },
      });
      
      if (!response.ok) throw new Error('Failed to delete property');
      
      toast.success("Property deleted successfully");
      router.push("/dashboard/properties");
    } catch (error) {
      console.error("Error deleting property:", error);
      toast.error(`Failed to delete property: ${error.message}`);
    } finally {
      setIsDeleting(false);
      setDeleteDialogOpen(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "AVAILABLE":
        return "bg-green-50 text-green-700";
      case "OCCUPIED":
        return "bg-blue-50 text-blue-700";
      case "MAINTENANCE":
        return "bg-amber-50 text-amber-700";
      case "NOT_AVAILABLE":
        return "bg-red-50 text-red-700";
      default:
        return "bg-slate-50 text-slate-700";
    }
  };

  const updatePropertyStatus = async (newStatus) => {
    if (!token) return;
    
    try {
      const response = await fetch(`${DJANGO_API_URL}/properties/${propertyId}/`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Token ${token}`,
        },
        body: JSON.stringify({ status: newStatus }),
      });
      
      if (!response.ok) throw new Error('Failed to update property status');
      
      const updatedProperty = await response.json();
      setProperty(prev => ({...prev, ...updatedProperty}));
      toast.success(`Property status updated to ${updatedProperty.status_display}`);
    } catch (error) {
      console.error("Error updating property status:", error);
      toast.error(`Failed to update status: ${error.message}`);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-200px)]">
        <div className="flex flex-col items-center gap-2">
          <Loader2 className="h-8 w-8 animate-spin text-teal-600" />
          <p className="text-sm text-muted-foreground">Loading property details...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container max-w-6xl py-6">
      <div className="flex items-center mb-6">
        <Button variant="ghost" size="sm" onClick={() => router.push("/dashboard/properties")} className="mr-4">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Properties
        </Button>
        <h1 className="text-2xl font-semibold flex-1">{property.name}</h1>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleEdit}>
            <Edit className="mr-2 h-4 w-4" />
            Edit
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="text-red-600 hover:text-red-700 hover:bg-red-50"
            onClick={handleDelete}
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Delete
          </Button>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2">
          {/* Property Images */}
          <div className="mb-6">
            <div className="aspect-video bg-slate-100 rounded-lg overflow-hidden">
              <img
                src={property.images && property.images.length > 0 ? property.images[0] : "/placeholder.svg"}
                alt={property.name}
                className="w-full h-full object-cover"
              />
            </div>
            <div className="grid grid-cols-4 gap-2 mt-2">
              {property.images && property.images.slice(1).map((image, index) => (
                <div key={index} className="aspect-video bg-slate-100 rounded-md overflow-hidden">
                  <img
                    src={image || "/placeholder.svg"}
                    alt={`${property.name} ${index + 2}`}
                    className="w-full h-full object-cover"
                  />
                </div>
              ))}
              <Button
                variant="outline"
                className="aspect-video flex flex-col items-center justify-center text-sm gap-1"
              >
                <Camera className="h-4 w-4" />
                <span>Add Photos</span>
              </Button>
            </div>
          </div>
          <Tabs defaultValue="details" className="w-full">
            <TabsList className="w-full grid grid-cols-3">
              <TabsTrigger value="details">Details</TabsTrigger>
              <TabsTrigger value="rental">Rental Terms</TabsTrigger>
              <TabsTrigger value="documents">Documents</TabsTrigger>
            </TabsList>
            {/* Details Tab */}
            <TabsContent value="details" className="mt-4">
              <Card>
                <CardHeader>
                  <CardTitle>Property Details</CardTitle>
                  <CardDescription>Comprehensive information about this property</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div>
                    <h3 className="text-lg font-medium mb-2">Description</h3>
                    <p className="text-slate-600">{property.description}</p>
                  </div>
                  <Separator />
                  <div>
                    <h3 className="text-lg font-medium mb-3">Features</h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      {property.property_category === "COMPLETE_UNIT" && (
                        <>
                          <div className="flex flex-col items-center p-3 bg-slate-50 rounded-md">
                            <Home className="h-5 w-5 text-slate-600 mb-1" />
                            <span className="text-sm font-medium">{property.unit_type_display}</span>
                          </div>
                          {property.bedrooms != null && (
                            <div className="flex flex-col items-center p-3 bg-slate-50 rounded-md">
                              <Bed className="h-5 w-5 text-slate-600 mb-1" />
                              <span className="text-sm font-medium">
                                {property.bedrooms} {property.bedrooms === 1 ? "Bedroom" : "Bedrooms"}
                              </span>
                            </div>
                          )}
                          {property.bathrooms != null && (
                            <div className="flex flex-col items-center p-3 bg-slate-50 rounded-md">
                              <Bath className="h-5 w-5 text-slate-600 mb-1" />
                              <span className="text-sm font-medium">
                                {property.bathrooms} {property.bathrooms === 1 ? "Bathroom" : "Bathrooms"}
                              </span>
                            </div>
                          )}
                        </>
                      )}
                      {property.property_category === "ROOM" && (
                        <div className="flex flex-col items-center p-3 bg-slate-50 rounded-md">
                          <Key className="h-5 w-5 text-slate-600 mb-1" />
                          <span className="text-sm font-medium">{property.room_type_display}</span>
                        </div>
                      )}
                      {property.square_footage != null && (
                        <div className="flex flex-col items-center p-3 bg-slate-50 rounded-md">
                          <SquareFootIcon className="h-5 w-5 text-slate-600 mb-1" />
                          <span className="text-sm font-medium">{property.square_footage} sq ft</span>
                        </div>
                      )}
                    </div>
                  </div>
                  {property.amenities && property.amenities.length > 0 && (
                    <>
                      <Separator />
                      <div>
                        <h3 className="text-lg font-medium mb-3">Amenities</h3>
                        <div className="grid grid-cols-2 gap-2">
                          {property.amenities.map((amenity, index) => (
                            <div key={index} className="flex items-center gap-2">
                              <div className="h-2 w-2 rounded-full bg-teal-500"></div>
                              <span className="text-sm">{amenity}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </>
                  )}
                  {property.other_rooms && (
                    <>
                      <Separator />
                      <div>
                        <h3 className="text-lg font-medium mb-2">Other Rooms</h3>
                        <p className="text-slate-600">{property.other_rooms}</p>
                      </div>
                    </>
                  )}
                  {property.property_category === "ROOM" && property.shared_with && (
                    <>
                      <Separator />
                      <div>
                        <h3 className="text-lg font-medium mb-2">Shared With</h3>
                        <p className="text-slate-600">{property.shared_with}</p>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
            {/* Rental Terms Tab */}
            <TabsContent value="rental" className="mt-4">
              <Card>
                <CardHeader>
                  <CardTitle>Rental Terms</CardTitle>
                  <CardDescription>Rental pricing and terms for this property</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="p-4 bg-slate-50 rounded-md">
                      <div className="flex items-center gap-2 mb-1">
                        <DollarSign className="h-4 w-4 text-slate-600" />
                        <span className="text-sm font-medium">Monthly Rent</span>
                      </div>
                      <p className="text-2xl font-semibold">${property.rental_terms.monthly_rent}</p>
                    </div>
                    <div className="p-4 bg-slate-50 rounded-md">
                      <div className="flex items-center gap-2 mb-1">
                        <DollarSign className="h-4 w-4 text-slate-600" />
                        <span className="text-sm font-medium">Security Deposit</span>
                      </div>
                      <p className="text-2xl font-semibold">${property.rental_terms.security_deposit}</p>
                    </div>
                    <div className="p-4 bg-slate-50 rounded-md">
                      <div className="flex items-center gap-2 mb-1">
                        <Calendar className="h-4 w-4 text-slate-600" />
                        <span className="text-sm font-medium">Lease Length</span>
                      </div>
                      <p className="text-2xl font-semibold">{property.rental_terms.lease_length}</p>
                    </div>
                  </div>
                  <div>
                    <h3 className="text-lg font-medium mb-3">Availability</h3>
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-slate-600" />
                      <span>Available from {new Date(property.rental_terms.available_from).toLocaleDateString()}</span>
                    </div>
                  </div>
                  <Separator />
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <h3 className="text-lg font-medium mb-3">Utilities Included</h3>
                      <div className="space-y-2">
                        {property.rental_terms.utilities_included.map((utility, index) => (
                          <div key={index} className="flex items-center gap-2">
                            <div className="h-2 w-2 rounded-full bg-green-500"></div>
                            <span className="text-sm">{utility}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div>
                      <h3 className="text-lg font-medium mb-3">Utilities Not Included</h3>
                      <div className="space-y-2">
                        {property.rental_terms.utilities_not_included.map((utility, index) => (
                          <div key={index} className="flex items-center gap-2">
                            <div className="h-2 w-2 rounded-full bg-red-500"></div>
                            <span className="text-sm">{utility}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </CardContent>
                <CardFooter>
                  <Button variant="outline">Edit Rental Terms</Button>
                </CardFooter>
              </Card>
            </TabsContent>
            {/* Documents Tab */}
            <TabsContent value="documents" className="mt-4">
              <Card>
                <CardHeader>
                  <CardTitle>Property Documents</CardTitle>
                  <CardDescription>Manage documents related to this property</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center p-4 bg-slate-50 rounded-md">
                      <div className="flex items-center gap-3">
                        <FileText className="h-5 w-5 text-slate-600" />
                        <div>
                          <p className="font-medium">Lease Agreement Template</p>
                          <p className="text-xs text-slate-500">PDF • 245 KB • Uploaded 3 months ago</p>
                        </div>
                      </div>
                      <Button variant="ghost" size="sm">
                        View
                      </Button>
                    </div>
                    <div className="flex justify-between items-center p-4 bg-slate-50 rounded-md">
                      <div className="flex items-center gap-3">
                        <FileText className="h-5 w-5 text-slate-600" />
                        <div>
                          <p className="font-medium">Property Inspection Report</p>
                          <p className="text-xs text-slate-500">PDF • 1.2 MB • Uploaded 3 months ago</p>
                        </div>
                      </div>
                      <Button variant="ghost" size="sm">
                        View
                      </Button>
                    </div>
                    <div className="flex justify-between items-center p-4 bg-slate-50 rounded-md">
                      <div className="flex items-center gap-3">
                        <FileText className="h-5 w-5 text-slate-600" />
                        <div>
                          <p className="font-medium">Property Insurance</p>
                          <p className="text-xs text-slate-500">PDF • 320 KB • Uploaded 2 months ago</p>
                        </div>
                      </div>
                      <Button variant="ghost" size="sm">
                        View
                      </Button>
                    </div>
                  </div>
                  <div className="mt-6">
                    <Button>
                      <FileText className="h-4 w-4 mr-2" />
                      Upload New Document
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
        <div className="space-y-6">
          {/* Property Status Card */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle>Property Status</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex justify-between items-center">
                <span>Current Status:</span>
                <Badge className={getStatusColor(property.status)}>{property.status_display}</Badge>
              </div>
              <div className="mt-4 space-y-2">
                {property.status !== "OCCUPIED" && (
                  <Button 
                    className="w-full" 
                    variant="outline"
                    onClick={() => updatePropertyStatus("OCCUPIED")}
                  >
                    Mark as Occupied
                  </Button>
                )}
                {property.status !== "AVAILABLE" && (
                  <Button 
                    className="w-full" 
                    variant="outline"
                    onClick={() => updatePropertyStatus("AVAILABLE")}
                  >
                    Mark as Available
                  </Button>
                )}
                {property.status !== "MAINTENANCE" && (
                  <Button 
                    className="w-full" 
                    variant="outline"
                    onClick={() => updatePropertyStatus("MAINTENANCE")}
                  >
                    Mark as Under Maintenance
                  </Button>
                )}
                {property.status !== "NOT_AVAILABLE" && (
                  <Button 
                    className="w-full" 
                    variant="outline"
                    onClick={() => updatePropertyStatus("NOT_AVAILABLE")}
                  >
                    Mark as Not Available
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
          {/* Location Card */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle>Location</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="aspect-video bg-slate-100 rounded-md overflow-hidden">
                {/* This would be a map in a real app */}
                <div className="w-full h-full flex items-center justify-center text-slate-400">Map View</div>
              </div>
              <div className="space-y-2">
                <div className="flex items-start gap-2">
                  <MapPin className="h-4 w-4 text-slate-500 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-sm">{property.address}</p>
                    <p className="text-sm">
                      {property.city}, {property.province} {property.postal_code}
                    </p>
                    <p className="text-sm">{property.country}</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
          {/* Property Management Card */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button className="w-full" variant="outline">
                <Key className="h-4 w-4 mr-2" />
                Schedule Viewing
              </Button>
              <Button className="w-full" variant="outline">
                <FileText className="h-4 w-4 mr-2" />
                Create Lease
              </Button>
              <Button className="w-full" variant="outline">
                <Camera className="h-4 w-4 mr-2" />
                Schedule Photoshoot
              </Button>
            </CardContent>
          </Card>
          {/* Property Info Card */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle>Property Information</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-500">Property ID:</span>
                  <span>{property.id}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Created:</span>
                  <span>{new Date(property.created_at).toLocaleDateString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Last Updated:</span>
                  <span>{new Date(property.updated_at).toLocaleDateString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Category:</span>
                  <span>{property.property_category_display}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Max Occupancy:</span>
                  <span>{property.max_occupancy} people</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the property "{property.name}". This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmDelete}
              disabled={isDeleting}
              className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
            >
              {isDeleting ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}