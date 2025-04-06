"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import { ArrowLeft, ArrowRight, Building2, Check, Home, MapPin, Save, Upload } from "lucide-react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { DJANGO_API_URL } from "@/lib/config";

// Form validation schema
const propertySchema = z.object({
  // Step 1: Basic Information
  name: z.string().min(3, { message: "Property name must be at least 3 characters" }),
  description: z.string().min(10, { message: "Description must be at least 10 characters" }),
  property_category: z.enum(["COMPLETE_UNIT", "ROOM"], {
    required_error: "Please select a property category",
  }),

  // Step 2: Location
  address: z.string().min(5, { message: "Address must be at least 5 characters" }),
  city: z.string().min(2, { message: "City is required" }),
  province: z.string().min(2, { message: "Province/State is required" }),
  postal_code: z.string().min(5, { message: "Postal/ZIP code is required" }),
  country: z.string().min(2, { message: "Country is required" }),

  // Step 3: Property Details
  unit_type: z.string().optional(),
  room_type: z.string().optional(),
  bedrooms: z.coerce.number().min(0).optional(),
  bathrooms: z.coerce.number().min(0).optional(),
  max_occupancy: z.coerce.number().min(1, { message: "Maximum occupancy must be at least 1" }),
  square_footage: z.coerce.number().min(1, { message: "Square footage must be at least 1" }),
  total_washrooms: z.coerce.number().min(0).optional(),
  other_rooms: z.string().optional(),
  shared_with: z.string().optional(),

  // Step 4: Status
  status: z.enum(["AVAILABLE", "OCCUPIED", "MAINTENANCE", "NOT_AVAILABLE"], {
    required_error: "Please select a status",
  }),
});

export default function CreatePropertyPage() {
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const router = useRouter();
  const { token } = useAuth();

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
  });

  const propertyCategory = form.watch("property_category");

  const onSubmit = async (data: z.infer<typeof propertySchema>) => {
    setIsSubmitting(true);

    try {
      // Send the data to the backend API
      const response = await fetch(`${DJANGO_API_URL}/properties/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Token ${token}`,
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to create property');
      }

      const result = await response.json();
      console.log("Property created:", result);

      toast.success("Property created successfully!");
      router.push("/dashboard/properties");
    } catch (error) {
      console.error("Error creating property:", error);
      toast.error(`Failed to create property: ${error.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const nextStep = () => {
    const fieldsToValidate = {
      1: ["name", "description", "property_category"],
      2: ["address", "city", "province", "postal_code", "country"],
      3:
        propertyCategory === "COMPLETE_UNIT"
          ? ["unit_type", "bedrooms", "bathrooms", "max_occupancy", "square_footage"]
          : ["room_type", "max_occupancy", "square_footage", "total_washrooms"],
    }[currentStep];

    form.trigger(fieldsToValidate).then((isValid) => {
      if (isValid) {
        setCurrentStep((prev) => Math.min(prev + 1, 4));
      }
    });
  };

  const prevStep = () => {
    setCurrentStep((prev) => Math.max(prev - 1, 1));
  };

  const getStepTabValue = () => {
    return {
      1: "basic",
      2: "location",
      3: "details",
      4: "status",
    }[currentStep];
  };

  return (
    <div className="container max-w-4xl py-6">
      <div className="flex items-center mb-6">
        <Button variant="ghost" size="sm" onClick={() => router.push("/dashboard/properties")} className="mr-4">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Properties
        </Button>
        <h1 className="text-2xl font-semibold">Create New Property Listing</h1>
      </div>

      <div className="mb-8">
        <div className="flex justify-between mb-2">
          {[1, 2, 3, 4].map((step) => (
            <div key={step} className="flex flex-col items-center" style={{ width: "25%" }}>
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center mb-2 ${
                  currentStep >= step ? "bg-teal-600 text-white" : "bg-slate-200 text-slate-500"
                }`}
              >
                {currentStep > step ? <Check className="h-4 w-4" /> : step}
              </div>
              <div className="text-xs text-center">
                {step === 1 && "Basic Info"}
                {step === 2 && "Location"}
                {step === 3 && "Details"}
                {step === 4 && "Status"}
              </div>
            </div>
          ))}
        </div>
        <div className="relative w-full h-2 bg-slate-200 rounded-full mt-2">
          <div
            className="absolute top-0 left-0 h-2 bg-teal-600 rounded-full transition-all"
            style={{ width: `${(currentStep - 1) * 33.33}%` }}
          ></div>
        </div>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <Tabs value={getStepTabValue()} className="w-full">
            {/* Step 1: Basic Information */}
            <TabsContent value="basic">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Building2 className="mr-2 h-5 w-5" />
                    Basic Information
                  </CardTitle>
                  <CardDescription>Enter the basic details about your property</CardDescription>
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
                <CardFooter className="flex justify-between">
                  <Button variant="outline" onClick={() => router.push("/dashboard/properties")}>
                    Cancel
                  </Button>
                  <Button type="button" onClick={nextStep}>
                    Next Step
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </CardFooter>
              </Card>
            </TabsContent>

            {/* Step 2: Location */}
            <TabsContent value="location">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <MapPin className="mr-2 h-5 w-5" />
                    Location
                  </CardTitle>
                  <CardDescription>Enter the location details of your property</CardDescription>
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
                  <Button variant="outline" onClick={prevStep}>
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Previous Step
                  </Button>
                  <Button type="button" onClick={nextStep}>
                    Next Step
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </CardFooter>
              </Card>
            </TabsContent>

            {/* Step 3: Property Details */}
            <TabsContent value="details">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Home className="mr-2 h-5 w-5" />
                    Property Details
                  </CardTitle>
                  <CardDescription>Enter the specific details about your property</CardDescription>
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
                  <Button variant="outline" onClick={prevStep}>
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Previous Step
                  </Button>
                  <Button type="button" onClick={nextStep}>
                    Next Step
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </CardFooter>
              </Card>
            </TabsContent>

            {/* Step 4: Status and Images */}
            <TabsContent value="status">
              <Card>
                <CardHeader>
                  <CardTitle>Status and Images</CardTitle>
                  <CardDescription>Set the availability status and upload images</CardDescription>
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
                    <div className="border-2 border-dashed border-slate-200 rounded-md p-6 text-center">
                      <Upload className="h-8 w-8 mx-auto text-slate-400" />
                      <p className="text-sm text-slate-500 mt-2">
                        Drag & drop property images here, or click to browse
                      </p>
                      <p className="text-xs text-slate-400 mt-1">Recommended: Upload at least 5 high-quality images</p>
                      <Button variant="outline" size="sm" className="mt-4">
                        <Upload className="h-4 w-4 mr-2" />
                        Upload Images
                      </Button>
                    </div>
                    <FormDescription>Upload images of your property (max 10 images, 5MB each)</FormDescription>
                  </div>

                  <div className="bg-slate-50 p-4 rounded-md">
                    <h3 className="font-medium mb-2">Property Summary</h3>
                    <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                      <div>
                        <span className="text-slate-500">Name:</span> {form.getValues("name")}
                      </div>
                      <div>
                        <span className="text-slate-500">Category:</span>{" "}
                        {form.getValues("property_category") === "COMPLETE_UNIT" ? "Complete Unit" : "Room"}
                      </div>
                      <div>
                        <span className="text-slate-500">Address:</span> {form.getValues("address")}
                      </div>
                      <div>
                        <span className="text-slate-500">City:</span> {form.getValues("city")}
                      </div>
                      <div>
                        <span className="text-slate-500">Status:</span> {form.getValues("status")}
                      </div>
                      {form.getValues("property_category") === "COMPLETE_UNIT" && (
                        <>
                          <div>
                            <span className="text-slate-500">Unit Type:</span> {form.getValues("unit_type")}
                          </div>
                          <div>
                            <span className="text-slate-500">Bedrooms:</span> {form.getValues("bedrooms")}
                          </div>
                          <div>
                            <span className="text-slate-500">Bathrooms:</span> {form.getValues("bathrooms")}
                          </div>
                        </>
                      )}
                      {form.getValues("property_category") === "ROOM" && (
                        <>
                          <div>
                            <span className="text-slate-500">Room Type:</span> {form.getValues("room_type")}
                          </div>
                          <div>
                            <span className="text-slate-500">Shared With:</span> {form.getValues("shared_with")}
                          </div>
                        </>
                      )}
                      <div>
                        <span className="text-slate-500">Square Footage:</span> {form.getValues("square_footage")}
                      </div>
                      <div>
                        <span className="text-slate-500">Max Occupancy:</span> {form.getValues("max_occupancy")}
                      </div>
                    </div>
                  </div>
                </CardContent>
                <CardFooter className="flex justify-between">
                  <Button variant="outline" onClick={prevStep}>
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Previous Step
                  </Button>
                  <Button type="submit" disabled={isSubmitting} className="bg-teal-600 hover:bg-teal-700">
                    {isSubmitting ? (
                      <>Saving...</>
                    ) : (
                      <>
                        <Save className="mr-2 h-4 w-4" />
                        Create Property
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
  );
}