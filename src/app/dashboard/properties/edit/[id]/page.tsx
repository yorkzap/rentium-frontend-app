"use client"
import { useState, useEffect } from "react"
import { useRouter, useParams } from "next/navigation"
import { useAuth } from "@/contexts/AuthContext"
import { toast } from "sonner"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ArrowLeft, Building2, Home, MapPin, Save, Upload, Loader2 } from "lucide-react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import * as z from "zod"
import { DJANGO_API_URL } from "@/lib/config"

// Form validation schema (same as create page)
const propertySchema = z.object({
  name: z.string().min(3, { message: "Property name must be at least 3 characters" }),
  description: z.string().min(10, { message: "Description must be at least 10 characters" }),
  property_category: z.enum(["COMPLETE_UNIT", "ROOM"], {
    required_error: "Please select a property category",
  }),
  address: z.string().min(5, { message: "Address must be at least 5 characters" }),
  city: z.string().min(2, { message: "City is required" }),
  province: z.string().min(2, { message: "Province/State is required" }),
  postal_code: z.string().min(5, { message: "Postal/ZIP code is required" }),
  country: z.string().min(2, { message: "Country is required" }),
  unit_type: z.string().optional(),
  room_type: z.string().optional(),
  bedrooms: z.coerce.number().min(0).optional(),
  bathrooms: z.coerce.number().min(0).optional(),
  max_occupancy: z.coerce.number().min(1, { message: "Maximum occupancy must be at least 1" }),
  square_footage: z.coerce.number().min(1, { message: "Square footage must be at least 1" }),
  total_washrooms: z.coerce.number().min(0).optional(),
  other_rooms: z.string().optional(),
  shared_with: z.string().optional(),
  status: z.enum(["AVAILABLE", "OCCUPIED", "MAINTENANCE", "NOT_AVAILABLE"], {
    required_error: "Please select a status",
  }),
})

export default function EditPropertyPage() {
  const [activeTab, setActiveTab] = useState("basic")
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const router = useRouter()
  const params = useParams()
  const { token } = useAuth()
  const propertyId = params.id

  const form = useForm<z.infer<typeof propertySchema>>({
    resolver: zodResolver(propertySchema),
    defaultValues: {
      name: "",
      description: "",
      property_category: "COMPLETE_UNIT",
      address: "",
      city: "",
      province: "",
      postal_code: "",
      country: "Canada",
      unit_type: "APARTMENT",
      room_type: "",
      bedrooms: 1,
      bathrooms: 1,
      max_occupancy: 2,
      square_footage: 0,
      total_washrooms: 0,
      other_rooms: "",
      shared_with: "",
      status: "AVAILABLE",
    },
  })

  const propertyCategory = form.watch("property_category")

  // Fetch property data
  useEffect(() => {
    const fetchProperty = async () => {
      try {
        const response = await fetch(`${DJANGO_API_URL}/properties/${propertyId}/`, {
          headers: {
            'Authorization': `Token ${token}`,
          },
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.detail || 'Failed to fetch property');
        }

        const data = await response.json();

        // Reset form with fetched data
        form.reset(data);
        setIsLoading(false);
      } catch (error) {
        console.error("Error fetching property:", error);
        toast.error(`Failed to load property data: ${error instanceof Error ? error.message : 'Unknown error'}`);
        router.push("/dashboard/properties");
      }
    }

    fetchProperty();
  }, [propertyId, token, router, form]);

  const onSubmit = async (data: z.infer<typeof propertySchema>) => {
    setIsSubmitting(true);

    try {
      // Use PATCH to update the property
      const response = await fetch(`${DJANGO_API_URL}/properties/${propertyId}/`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Token ${token}`,
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to update property');
      }

      const result = await response.json();
      console.log("Property updated:", result);

      toast.success("Property updated successfully!");
      router.push("/dashboard/properties");
    } catch (error) {
      console.error("Error updating property:", error);
      toast.error(`Failed to update property: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsSubmitting(false);
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-200px)]">
        <div className="flex flex-col items-center gap-2">
          <Loader2 className="h-8 w-8 animate-spin text-teal-600" />
          <p className="text-sm text-muted-foreground">Loading property data...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="container max-w-4xl py-6">
      <div className="flex items-center mb-6">
        <Button variant="ghost" size="sm" onClick={() => router.push("/dashboard/properties")} className="mr-4">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Properties
        </Button>
        <h1 className="text-2xl font-semibold">Edit Property</h1>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="w-full grid grid-cols-4">
              <TabsTrigger value="basic">Basic Info</TabsTrigger>
              <TabsTrigger value="location">Location</TabsTrigger>
              <TabsTrigger value="details">Details</TabsTrigger>
              <TabsTrigger value="status">Status</TabsTrigger>
            </TabsList>

            {/* Basic Information Tab */}
            <TabsContent value="basic">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Building2 className="mr-2 h-5 w-5" />
                    Basic Information
                  </CardTitle>
                  <CardDescription>Edit the basic details about your property</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Property Name</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g. Cozy Downtown Apartment" {...field} />
                        </FormControl>
                        <FormDescription>A descriptive name for your property</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Description</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Describe your property in detail..."
                            className="min-h-[120px]"
                            {...field}
                          />
                        </FormControl>
                        <FormDescription>Provide a detailed description of your property</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="property_category"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Property Category</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select property category" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="COMPLETE_UNIT">Complete Unit</SelectItem>
                            <SelectItem value="ROOM">Room</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormDescription>
                          Choose whether this is a complete unit or a room within a shared property
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
                <CardFooter className="flex justify-end">
                  <Button type="button" onClick={() => setActiveTab("location")}>
                    Next: Location
                  </Button>
                </CardFooter>
              </Card>
            </TabsContent>

            {/* Location Tab */}
            <TabsContent value="location">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <MapPin className="mr-2 h-5 w-5" />
                    Location
                  </CardTitle>
                  <CardDescription>Edit the location details of your property</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <FormField
                    control={form.control}
                    name="address"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Street Address</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g. 123 Main Street, Unit 4B" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="city"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>City</FormLabel>
                          <FormControl>
                            <Input placeholder="e.g. Vancouver" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="province"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Province/State</FormLabel>
                          <FormControl>
                            <Input placeholder="e.g. British Columbia" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="postal_code"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Postal/ZIP Code</FormLabel>
                          <FormControl>
                            <Input placeholder="e.g. V6B 2W9" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="country"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Country</FormLabel>
                          <FormControl>
                            <Input placeholder="e.g. Canada" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </CardContent>
                <CardFooter className="flex justify-between">
                  <Button variant="outline" type="button" onClick={() => setActiveTab("basic")}>
                    Back: Basic Info
                  </Button>
                  <Button type="button" onClick={() => setActiveTab("details")}>
                    Next: Details
                  </Button>
                </CardFooter>
              </Card>
            </TabsContent>

            {/* Property Details Tab */}
            <TabsContent value="details">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Home className="mr-2 h-5 w-5" />
                    Property Details
                  </CardTitle>
                  <CardDescription>Edit the specific details about your property</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {propertyCategory === "COMPLETE_UNIT" && (
                    <>
                      <FormField
                        control={form.control}
                        name="unit_type"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Unit Type</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select unit type" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="BASEMENT">Basement</SelectItem>
                                <SelectItem value="GARDEN_SUITE">Garden Suite</SelectItem>
                                <SelectItem value="MAIN_FLOOR">Main Floor</SelectItem>
                                <SelectItem value="APARTMENT">Apartment</SelectItem>
                                <SelectItem value="OTHER">Other</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <div className="grid grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="bedrooms"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Bedrooms</FormLabel>
                              <FormControl>
                                <Input type="number" min="0" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="bathrooms"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Bathrooms</FormLabel>
                              <FormControl>
                                <Input type="number" min="0" step="0.5" {...field} />
                              </FormControl>
                              <FormDescription>Use 0.5 for half bathrooms</FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    </>
                  )}

                  {propertyCategory === "ROOM" && (
                    <>
                      <FormField
                        control={form.control}
                        name="room_type"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Room Type</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select room type" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="PRIVATE">Private Room</SelectItem>
                                <SelectItem value="SHARED">Shared Room</SelectItem>
                                <SelectItem value="OTHER">Other</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="total_washrooms"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Total Washrooms in Property</FormLabel>
                            <FormControl>
                              <Input type="number" min="0" {...field} />
                            </FormControl>
                            <FormDescription>Number of washrooms in the entire property</FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="shared_with"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Shared With</FormLabel>
                            <FormControl>
                              <Input placeholder="e.g. 3 other tenants" {...field} />
                            </FormControl>
                            <FormDescription>Describe who the tenant will share the property with</FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </>
                  )}

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="max_occupancy"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Maximum Occupancy</FormLabel>
                          <FormControl>
                            <Input type="number" min="1" {...field} />
                          </FormControl>
                          <FormDescription>Maximum number of people allowed</FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="square_footage"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Square Footage</FormLabel>
                          <FormControl>
                            <Input type="number" min="0" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  {propertyCategory === "COMPLETE_UNIT" && (
                    <FormField
                      control={form.control}
                      name="other_rooms"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Other Rooms (Optional)</FormLabel>
                          <FormControl>
                            <Textarea placeholder="e.g. Office, Den, Sunroom, etc." {...field} />
                          </FormControl>
                          <FormDescription>List any additional rooms not covered above</FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}
                </CardContent>
                <CardFooter className="flex justify-between">
                  <Button variant="outline" type="button" onClick={() => setActiveTab("location")}>
                    Back: Location
                  </Button>
                  <Button type="button" onClick={() => setActiveTab("status")}>
                    Next: Status
                  </Button>
                </CardFooter>
              </Card>
            </TabsContent>

            {/* Status Tab */}
            <TabsContent value="status">
              <Card>
                <CardHeader>
                  <CardTitle>Status and Images</CardTitle>
                  <CardDescription>Edit the availability status and property images</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <FormField
                    control={form.control}
                    name="status"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Property Status</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select status" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="AVAILABLE">Available</SelectItem>
                            <SelectItem value="OCCUPIED">Occupied</SelectItem>
                            <SelectItem value="MAINTENANCE">Under Maintenance</SelectItem>
                            <SelectItem value="NOT_AVAILABLE">Not Available</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormDescription>Current availability status of the property</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="space-y-2">
                    <Label>Property Images</Label>
                    <div className="grid grid-cols-3 gap-4 mb-4">
                      <div className="relative aspect-square bg-slate-100 rounded-md overflow-hidden">
                        <img
                          src="/placeholder.svg?height=200&width=200"
                          alt="Property"
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="relative aspect-square bg-slate-100 rounded-md overflow-hidden">
                        <img
                          src="/placeholder.svg?height=200&width=200"
                          alt="Property"
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="relative aspect-square bg-slate-100 rounded-md overflow-hidden">
                        <img
                          src="/placeholder.svg?height=200&width=200"
                          alt="Property"
                          className="w-full h-full object-cover"
                        />
                      </div>
                    </div>

                    <div className="border-2 border-dashed border-slate-200 rounded-md p-6 text-center">
                      <Upload className="h-8 w-8 mx-auto text-slate-400" />
                      <p className="text-sm text-slate-500 mt-2">
                        Drag & drop property images here, or click to browse
                      </p>
                      <Button variant="outline" size="sm" className="mt-4">
                        <Upload className="h-4 w-4 mr-2" />
                        Upload More Images
                      </Button>
                    </div>
                  </div>
                </CardContent>
                <CardFooter className="flex justify-between">
                  <Button variant="outline" type="button" onClick={() => setActiveTab("details")}>
                    Back: Details
                  </Button>
                  <Button type="submit" disabled={isSubmitting} className="bg-teal-600 hover:bg-teal-700">
                    {isSubmitting ? (
                      <>Saving Changes...</>
                    ) : (
                      <>
                        <Save className="mr-2 h-4 w-4" />
                        Save Changes
                      </>
                    )}
                  </Button>
                </CardFooter>
              </Card>
            </TabsContent>
          </Tabs>
        </form>
      </Form>
    </div>
  )
}