"use client";
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm, Controller, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import axios from 'axios';
import { format } from "date-fns";
import { DJANGO_API_URL } from "@/lib/config";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { CalendarIcon, Loader2, Plus, Trash2, Info, CheckCircle, AlertTriangle } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";
import { 
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger
} from "@/components/ui/accordion";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle
} from "@/components/ui/card";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger
} from "@/components/ui/tabs";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger
} from "@/components/ui/tooltip";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Switch } from "@/components/ui/switch";
import {
  Badge,
} from "@/components/ui/badge";

// Helper function to format bill responsibility for display
const formatBillResponsibility = (type: string, value: number, distribution: string) => {
  if (type === "none") return "None (included in rent)";
  if (type === "full") return `Full payment (100%), ${distribution === "equal" ? "split equally" : "custom split"}`;
  if (type === "percentage") return `${value}% of bill, ${distribution === "equal" ? "split equally" : "custom split"}`;
  if (type === "fixed") return `Fixed $${value.toFixed(2)}, ${distribution === "equal" ? "split equally" : "custom split"}`;
  return "Not specified";
};

// Enhanced schema with all the required lease details including bill terms
const billTermSchema = z.object({
  utility: z.string().min(1, "Utility type is required"),
  provider: z.string().min(1, "Provider name is required"),
  included: z.boolean().default(false),
  responsibilityType: z.enum(["none", "full", "percentage", "fixed"]).default("none"),
  responsibilityValue: z.preprocess(
    (val) => (val === "" ? 0 : Number(val)),
    z.number().min(0).max(100)
  ),
  distribution: z.enum(["none", "equal", "custom"]).default("none"),
  notes: z.string().optional(),
});

const formSchema = z.object({
  propertyId: z.string().min(1, "Property selection is required"),
  leaseType: z.string().min(1, "Lease type is required"),
  startDate: z.date({ required_error: "Start date is required" }),
  isMonthToMonth: z.boolean().default(false),
  endDate: z.date().optional(),
  moveInDate: z.date().optional(),
  securityDeposit: z.preprocess(
    (val) => (val === "" ? 0 : Number(val)),
    z.number({ invalid_type_error: "Deposit must be a number" }).min(0, "Deposit cannot be negative").default(0)
  ),
  petDeposit: z.preprocess(
    (val) => (val === "" ? 0 : Number(val)),
    z.number({ invalid_type_error: "Deposit must be a number" }).min(0, "Deposit cannot be negative").default(0)
  ),
  cleaningFee: z.preprocess(
    (val) => (val === "" ? 0 : Number(val)),
    z.number({ invalid_type_error: "Fee must be a number" }).min(0, "Fee cannot be negative").default(0)
  ),
  petsAllowed: z.boolean().default(false),
  smokingAllowed: z.boolean().default(false),
  specialTerms: z.string().optional(),
  billTerms: z.array(billTermSchema).optional().default([]),
})
.refine(data => !data.isMonthToMonth ? !!data.endDate : true, {
  message: "End date is required for fixed-term leases",
  path: ["endDate"]
})
.refine(data => data.endDate && data.startDate ? data.endDate > data.startDate : true, {
  message: "End date must be after start date",
  path: ["endDate"]
})
.refine(data => data.moveInDate && data.startDate ? data.moveInDate >= data.startDate : true, {
  message: "Move-in date cannot be before the lease start date",
  path: ["moveInDate"]
});

// Interfaces for property and lease types
interface Property {
  id: number;
  name: string;
  property_category: string;
  city: string;
  province?: string;
}

interface LeaseType {
  value: string;
  label: string;
  property_category: string;
  province: {
    code: string;
    name: string;
  };
}

interface BillProvider {
  category: string;
  display_name: string;
  providers: {
    name: string;
    region?: string;
  }[];
}

export function CreateLeaseForm() {
  const router = useRouter();
  const { toast } = useToast();
  const { token } = useAuth(); // Use auth context to get token
  const [isLoading, setIsLoading] = useState(false);
  const [isFetchingData, setIsFetchingData] = useState(true);
  const [properties, setProperties] = useState<Property[]>([]);
  const [leaseTypes, setLeaseTypes] = useState<LeaseType[]>([]);
  const [billProviders, setBillProviders] = useState<BillProvider[]>([]);
  const [apiError, setApiError] = useState<string | null>(null);
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null);
  const [autoSelectedLeaseType, setAutoSelectedLeaseType] = useState<LeaseType | null>(null);
  const [step, setStep] = useState(1); // Track form steps: 1 = property, 2 = lease details, 3 = bill terms
  const [activeTab, setActiveTab] = useState("details"); // Track active tab in step 2

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      propertyId: "",
      leaseType: "",
      startDate: undefined,
      isMonthToMonth: false,
      endDate: undefined,
      moveInDate: undefined,
      securityDeposit: 0,
      petDeposit: 0,
      cleaningFee: 0,
      petsAllowed: false,
      smokingAllowed: false,
      specialTerms: "",
      billTerms: [],
    },
  });

  // Setup field array for bill terms
  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "billTerms",
  });

  // Fetch properties, lease types, and bill providers when token is available
  useEffect(() => {
    const fetchData = async () => {
      setIsFetchingData(true);
      setApiError(null);
      
      try {
        const api = axios.create({
          baseURL: DJANGO_API_URL,
          headers: {
            'Authorization': `Token ${token}`,
            'Content-Type': 'application/json',
          }
        });
        
        const [propertiesRes, leaseTypesRes, billProvidersRes] = await Promise.all([
          api.get('/properties/'),
          api.get('/leases/types/'),
          api.get('/leases/bill_providers/')
        ]);
        
        setProperties(propertiesRes.data);
        setLeaseTypes(leaseTypesRes.data);
        
        // Process bill providers data
        const billProvidersData = billProvidersRes.data;
        console.log("Bill providers API response:", billProvidersData);
        
        if (billProvidersData && billProvidersData.bill_providers) {
          // The API returns a structure with regions (BC, SK, GENERIC) containing utility types
          // Extract all unique utility types across regions
          const utilityTypes: {[key: string]: {category: string, display_name: string, providers: any[]}} = {};
          
          // Process all regions
          Object.keys(billProvidersData.bill_providers).forEach(region => {
            const regionData = billProvidersData.bill_providers[region];
            
            // For each utility type in this region
            Object.keys(regionData).forEach(utilityType => {
              const utilityData = regionData[utilityType];
              
              // If we haven't seen this utility type yet, initialize it
              if (!utilityTypes[utilityType]) {
                utilityTypes[utilityType] = {
                  category: utilityType,
                  display_name: utilityData.display_name,
                  providers: []
                };
              }
              
              // Add providers from this region, marking the region in the provider
              utilityData.providers.forEach((provider: any) => {
                // Add the region to the provider and ensure no duplicates
                const providerWithRegion = {
                  ...provider,
                  region: region !== "GENERIC" ? region : undefined
                };
                
                // Check if this provider already exists (by id)
                const existingProviderIndex = utilityTypes[utilityType].providers.findIndex(
                  p => p.id === provider.id
                );
                
                if (existingProviderIndex === -1) {
                  // Add new provider
                  utilityTypes[utilityType].providers.push(providerWithRegion);
                }
              });
            });
          });
          
          // Convert the object to an array
          const formattedProviders = Object.values(utilityTypes);
          setBillProviders(formattedProviders);
        } else {
          // Fallback to default utilities if the format is unexpected
          const defaultUtilities = [
            { category: "electricity", display_name: "Electricity", providers: [] },
            { category: "water", display_name: "Water", providers: [] },
            { category: "internet", display_name: "Internet", providers: [] },
            { category: "gas", display_name: "Gas/Heating", providers: [] },
            { category: "waste", display_name: "Waste Collection", providers: [] }
          ];
          setBillProviders(defaultUtilities);
          console.warn("Using default utility list as bill providers data is missing or has unexpected format");
        }
      } catch (error) {
        console.error("Failed to fetch data:", error);
        // Set default utilities even on error
        const defaultUtilities = [
          { category: "electricity", display_name: "Electricity", providers: [] },
          { category: "water", display_name: "Water", providers: [] },
          { category: "internet", display_name: "Internet", providers: [] },
          { category: "gas", display_name: "Gas/Heating", providers: [] },
          { category: "waste", display_name: "Waste Collection", providers: [] }
        ];
        setBillProviders(defaultUtilities);
        
        setApiError("Could not load properties, lease types, or bill providers. Using default utility list.");
        toast({
          title: "Warning",
          description: "Could not load utility providers. Using default list.",
          variant: "destructive"
        });
      } finally {
        setIsFetchingData(false);
      }
    };
    
    if (token) {
      fetchData();
    } else {
      setApiError("Authentication required. Please log in again.");
      setIsFetchingData(false);
    }
  }, [token, toast]);

  // Function to automatically choose a lease type based on the property details
  const getSuitableLeaseTypes = (property: Property): LeaseType[] => {
    if (!property) return [];
    // Map province to code if needed
    let provinceCode = null;
    if (property.province) {
      if (property.province === "British Columbia") provinceCode = "BC";
      else if (property.province === "Saskatchewan") provinceCode = "SK";
    }
    // First try for province-specific types
    const provinceSpecificTypes = leaseTypes.filter(lt => 
      lt.property_category === property.property_category && 
      provinceCode &&
      lt.province.code === provinceCode
    );
    if (provinceSpecificTypes.length > 0) {
      return provinceSpecificTypes;
    }
    // Otherwise, fall back to generic types
    return leaseTypes.filter(lt => 
      lt.property_category === property.property_category && 
      lt.province.code === "GENERIC"
    );
  };

  // Handle property selection; auto-picks an appropriate lease type upon selection
  const handlePropertyChange = async (propertyId: string) => {
    form.setValue("propertyId", propertyId);
    setIsLoading(true);
    
    try {
      const api = axios.create({
        baseURL: DJANGO_API_URL,
        headers: {
          'Authorization': `Token ${token}`,
          'Content-Type': 'application/json',
        }
      });
      
      // Fetch complete property details
      const propertyResponse = await api.get(`/properties/${propertyId}/`);
      const completeProperty = propertyResponse.data;
      
      setSelectedProperty(completeProperty);
      // Clear any previous leaseType value
      form.setValue("leaseType", "");
      setAutoSelectedLeaseType(null);
      
      // Automatically determine the suitable lease types
      const suitableLeaseTypes = getSuitableLeaseTypes(completeProperty);
      if (suitableLeaseTypes.length > 0) {
        // Automatically choose the first match (or add your preferred logic)
        const chosenLeaseType = suitableLeaseTypes[0];
        form.setValue("leaseType", chosenLeaseType.value);
        setAutoSelectedLeaseType(chosenLeaseType);
      } else {
        toast({
          title: "No Agreement Found",
          description: "No suitable agreement type was found for the selected property.",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error("Error fetching complete property details:", error);
      toast({
        title: "Error",
        description: "Failed to load complete property details.",
        variant: "destructive"
      });
      // Fallback: try to set a basic property if available
      const basicProperty = properties.find(p => p.id.toString() === propertyId) || null;
      setSelectedProperty(basicProperty);
    } finally {
      setIsLoading(false);
    }
  };

  // Function to add a new bill term
  const addBillTerm = () => {
    append({
      utility: "",
      provider: "",
      included: false,
      responsibilityType: "none",
      responsibilityValue: 0,
      distribution: "none",
      notes: "",
    });
  };

  // Proceed to lease details step
  const goToLeaseDetails = () => {
    if (selectedProperty && autoSelectedLeaseType) {
      setStep(2);
      setActiveTab("details");
    } else {
      toast({
        title: "Selection Required",
        description: "Please select a property first.",
        variant: "destructive"
      });
    }
  };

  // Proceed to bill terms step
  const goToBillTerms = () => {
    const detailsResult = form.trigger([
      "startDate", "endDate", "moveInDate", 
      "securityDeposit", "petDeposit", "cleaningFee", 
      "petsAllowed", "smokingAllowed", "specialTerms"
    ]);
    
    if (detailsResult) {
      setActiveTab("utilities");
      // If no bill terms exist yet, add an initial empty one
      if (fields.length === 0) {
        addBillTerm();
      }
    }
  };

  // Go back to property selection
  const goBackToPropertySelection = () => {
    setStep(1);
  };

  // Get provider options for a specific utility
  const getProviderOptions = (utilityType: string) => {
    if (!Array.isArray(billProviders)) return [];
    
    const utility = billProviders.find(bp => bp.category === utilityType);
    
    if (!utility || !utility.providers || !Array.isArray(utility.providers)) {
      return [];
    }
    
    return utility.providers;
  };

  // Handle form submission
  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    setIsLoading(true);
    setApiError(null);
    
    try {
      const api = axios.create({
        baseURL: DJANGO_API_URL,
        headers: {
          'Authorization': `Token ${token}`,
          'Content-Type': 'application/json',
        }
      });
      
      // Transform bill terms into the format expected by the API
      const billsIncluded: Record<string, any> = {};
      
      values.billTerms?.forEach(term => {
        if (term.utility && term.provider) {
          billsIncluded[term.utility] = {
            included: term.included,
            provider: term.provider,
            category: term.utility,
            tenant_responsibility: {
              type: term.responsibilityType,
              value: term.responsibilityValue,
              distribution: term.distribution
            },
            notes: term.notes || ""
          };
        }
      });
      
      // Prepare lease data
      const leaseData = {
        lease_type: values.leaseType,
        property_id: parseInt(values.propertyId),
        start_date: format(values.startDate, 'yyyy-MM-dd'),
        is_month_to_month: values.isMonthToMonth,
        end_date: values.endDate ? format(values.endDate, 'yyyy-MM-dd') : null,
        move_in_date: values.moveInDate ? format(values.moveInDate, 'yyyy-MM-dd') : null,
        security_deposit: values.securityDeposit,
        pet_deposit: values.petDeposit,
        cleaning_fee: values.cleaningFee,
        pets_allowed: values.petsAllowed,
        smoking_allowed: values.smokingAllowed,
        special_terms: values.specialTerms,
        bills_included: billsIncluded
      };
      
      // Create lease
      const response = await api.post('/leases/', leaseData);
      
      toast({
        title: "Success",
        description: "Lease created successfully!"
      });
      
      console.log("Created lease:", response.data);
      
      // Redirect to the lease detail page or listing
      router.push('/dashboard/leases');
      
    } catch (error: any) {
      console.error("Error creating lease:", error);
      let errorMessage = "Failed to create lease.";
      
      if (error.response?.data) {
        errorMessage = typeof error.response.data === 'string' 
          ? error.response.data 
          : JSON.stringify(error.response.data);
        
        if (errorMessage.length > 200) {
          errorMessage = "Multiple validation errors occurred. Please check your inputs.";
        }
      }
      
      setApiError(errorMessage);
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (isFetchingData) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="h-8 w-8 animate-spin mr-2" />
        <p>Loading properties...</p>
      </div>
    );
  }
  
  // Show authentication error if no token
  if (!token) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-700 p-4 mb-4 rounded-md">
        <strong>Authentication Error:</strong> Please log in again to access this feature.
        <div className="mt-4">
          <Button onClick={() => router.push('/auth/login')}>
            Go to Login
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Create New Lease</h1>
      
      {apiError && (
        <div className="bg-red-50 border border-red-200 text-red-700 p-4 mb-4 rounded-md">
          <strong>Error:</strong> {apiError}
        </div>
      )}
      
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {step === 1 && (
          <div className="space-y-6">
            <div className="bg-blue-50 border border-blue-200 text-blue-700 p-4 mb-4 rounded-md">
              <strong>Step 1:</strong> Select the property for this lease agreement.
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="propertyId">Select Property</Label>
              <Select 
                onValueChange={handlePropertyChange}
                value={form.watch("propertyId")}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Choose a property" />
                </SelectTrigger>
                <SelectContent>
                  {properties.map(property => (
                    <SelectItem key={property.id} value={property.id.toString()}>
                      {property.name} - {property.city}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {form.formState.errors.propertyId && (
                <p className="text-sm text-red-500">{form.formState.errors.propertyId.message}</p>
              )}
            </div>
            
            {selectedProperty && autoSelectedLeaseType && (
              <div className="space-y-2">
                <Label>Agreement Type</Label>
                <div className="p-3 border rounded-md bg-gray-50">
                  {autoSelectedLeaseType.label}
                </div>
                <div className="mt-4 p-4 bg-gray-50 rounded-md border">
                  <h3 className="font-medium mb-2">Selected Property</h3>
                  <p className="text-sm text-gray-600 mb-2">
                    {selectedProperty.name} ({selectedProperty.city})
                  </p>
                  <ul className="text-sm text-gray-600 list-disc pl-5 space-y-1">
                    <li><strong>Property Type:</strong> {selectedProperty.property_category === "COMPLETE_UNIT" ? "Complete Unit" : "Room"}</li>
                    <li><strong>Province:</strong> {selectedProperty.province || "Not specified"}</li>
                  </ul>
                </div>
              </div>
            )}
            
            <div className="flex justify-end space-x-2 pt-4">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => router.back()}
              >
                Cancel
              </Button>
              <Button 
                type="button"
                onClick={goToLeaseDetails} 
                disabled={!selectedProperty || !autoSelectedLeaseType}
              >
                Continue to Lease Details
              </Button>
            </div>
          </div>
        )}
        
        {step === 2 && (
          <div className="space-y-6">
            <div className="bg-blue-50 border border-blue-200 text-blue-700 p-4 mb-4 rounded-md">
              <strong>Step 2:</strong> Enter lease details for {selectedProperty?.name}.
            </div>
            
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="details">Lease Details</TabsTrigger>
                <TabsTrigger value="utilities">Utility Bills</TabsTrigger>
              </TabsList>
              
              <TabsContent value="details" className="space-y-6 pt-4">
                {/* Lease Term Section */}
                <div className="space-y-4 border p-4 rounded-md">
                  <h2 className="text-lg font-semibold">Lease Term</h2>
                  
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="startDate">Start Date *</Label>
                      <Controller
                        control={form.control}
                        name="startDate"
                        render={({ field }) => (
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button
                                variant={"outline"}
                                className={cn(
                                  "w-full justify-start text-left font-normal",
                                  !field.value && "text-muted-foreground"
                                )}
                              >
                                <CalendarIcon className="mr-2 h-4 w-4" />
                                {field.value ? format(field.value, "PPP") : "Select date"}
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0">
                              <Calendar
                                mode="single"
                                selected={field.value}
                                onSelect={field.onChange}
                                initialFocus
                              />
                            </PopoverContent>
                          </Popover>
                        )}
                      />
                      {form.formState.errors.startDate && (
                        <p className="text-sm text-red-500">{form.formState.errors.startDate.message}</p>
                      )}
                    </div>
                    
                    <div className="flex items-center space-x-2 mt-8">
                      <Controller
                        control={form.control}
                        name="isMonthToMonth"
                        render={({ field }) => (
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={(checked) => {
                              field.onChange(Boolean(checked));
                              if (checked) {
                                form.setValue("endDate", undefined);
                              }
                            }}
                            id="isMonthToMonth"
                          />
                        )}
                      />
                      <Label htmlFor="isMonthToMonth">Month-to-Month?</Label>
                    </div>
                    
                    {!form.watch("isMonthToMonth") && (
                      <div className="space-y-2">
                        <Label htmlFor="endDate">End Date *</Label>
                        <Controller
                          control={form.control}
                          name="endDate"
                          render={({ field }) => (
                            <Popover>
                              <PopoverTrigger asChild>
                                <Button
                                  variant={"outline"}
                                  className={cn(
                                    "w-full justify-start text-left font-normal",
                                    !field.value && "text-muted-foreground"
                                  )}
                                >
                                  <CalendarIcon className="mr-2 h-4 w-4" />
                                  {field.value ? format(field.value, "PPP") : "Select end date"}
                                </Button>
                              </PopoverTrigger>
                              <PopoverContent className="w-auto p-0">
                                <Calendar
                                  mode="single"
                                  selected={field.value}
                                  onSelect={field.onChange}
                                  initialFocus
                                  disabled={(date) => 
                                    !form.watch("startDate") || 
                                    date < form.watch("startDate")
                                  }
                                />
                              </PopoverContent>
                            </Popover>
                          )}
                        />
                        {form.formState.errors.endDate && (
                          <p className="text-sm text-red-500">{form.formState.errors.endDate.message}</p>
                        )}
                      </div>
                    )}
                    
                    <div className="space-y-2">
                      <Label htmlFor="moveInDate">Move-in Date (Optional)</Label>
                      <Controller
                        control={form.control}
                        name="moveInDate"
                        render={({ field }) => (
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button
                                variant={"outline"}
                                className={cn(
                                  "w-full justify-start text-left font-normal",
                                  !field.value && "text-muted-foreground"
                                )}
                              >
                                <CalendarIcon className="mr-2 h-4 w-4" />
                                {field.value ? format(field.value, "PPP") : "Select move-in date"}
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0">
                              <Calendar
                                mode="single"
                                selected={field.value}
                                onSelect={field.onChange}
                                initialFocus
                                disabled={(date) => 
                                  !form.watch("startDate") || 
                                  date < form.watch("startDate")
                                }
                              />
                            </PopoverContent>
                          </Popover>
                        )}
                      />
                      {form.formState.errors.moveInDate && (
                        <p className="text-sm text-red-500">{form.formState.errors.moveInDate.message}</p>
                      )}
                    </div>
                  </div>
                </div>
                
                {/* Financials Section */}
                <div className="space-y-4 border p-4 rounded-md">
                  <h2 className="text-lg font-semibold">Financial Details</h2>
                  
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                    <div className="space-y-2">
                      <Label htmlFor="securityDeposit">Security Deposit ($)</Label>
                      <Controller
                        control={form.control}
                        name="securityDeposit"
                        render={({ field }) => (
                          <Input type="number" min="0" step="0.01" {...field} />
                        )}
                      />
                      {form.formState.errors.securityDeposit && (
                        <p className="text-sm text-red-500">{form.formState.errors.securityDeposit.message}</p>
                      )}
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="petDeposit">Pet Deposit ($)</Label>
                      <Controller
                        control={form.control}
                        name="petDeposit"
                        render={({ field }) => (
                          <Input type="number" min="0" step="0.01" {...field} />
                        )}
                      />
                      {form.formState.errors.petDeposit && (
                        <p className="text-sm text-red-500">{form.formState.errors.petDeposit.message}</p>
                      )}
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="cleaningFee">Cleaning Fee ($)</Label>
                      <Controller
                        control={form.control}
                        name="cleaningFee"
                        render={({ field }) => (
                          <Input type="number" min="0" step="0.01" {...field} />
                        )}
                      />
                      {form.formState.errors.cleaningFee && (
                        <p className="text-sm text-red-500">{form.formState.errors.cleaningFee.message}</p>
                      )}
                    </div>
                  </div>
                </div>
                
                {/* Property Rules Section */}
                <div className="space-y-4 border p-4 rounded-md">
                  <h2 className="text-lg font-semibold">Property Rules</h2>
                  
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div className="flex items-center space-x-2">
                      <Controller
                        control={form.control}
                        name="petsAllowed"
                        render={({ field }) => (
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={(checked) => {
                              field.onChange(Boolean(checked));
                              if (!checked) {
                                form.setValue("petDeposit", 0);
                              }
                            }}
                            id="petsAllowed"
                          />
                        )}
                      />
                      <Label htmlFor="petsAllowed">Pets Allowed?</Label>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <Controller
                        control={form.control}
                        name="smokingAllowed"
                        render={({ field }) => (
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={(checked) => {
                              field.onChange(Boolean(checked));
                            }}
                            id="smokingAllowed"
                          />
                        )}
                      />
                      <Label htmlFor="smokingAllowed">Smoking Allowed?</Label>
                    </div>
                  </div>
                </div>
                
                {/* Special Terms Section */}
                <div className="space-y-4 border p-4 rounded-md">
                  <h2 className="text-lg font-semibold">Special Terms</h2>
                  
                  <div className="space-y-2">
                    <Label htmlFor="specialTerms">Additional Terms & Conditions</Label>
                    <Controller
                      control={form.control}
                      name="specialTerms"
                      render={({ field }) => (
                        <Textarea 
                          className="min-h-[100px]" 
                          placeholder="Enter any special terms, rules, or conditions for this lease agreement..."
                          {...field}
                        />
                      )}
                    />
                    {form.formState.errors.specialTerms && (
                      <p className="text-sm text-red-500">{form.formState.errors.specialTerms.message}</p>
                    )}
                  </div>
                </div>
                
                {/* Navigation buttons */}
                <div className="flex justify-between pt-4">
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={goBackToPropertySelection}
                  >
                    Back to Property Selection
                  </Button>
                  
                  <div className="space-x-2">
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={() => router.back()}
                    >
                      Cancel
                    </Button>
                    <Button 
                      type="button"
                      onClick={goToBillTerms}
                    >
                      Continue to Utility Bills
                    </Button>
                  </div>
                </div>
              </TabsContent>
              
              <TabsContent value="utilities" className="space-y-6 pt-4">
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-md">
                  <div className="flex items-start">
                    <Info className="h-5 w-5 text-blue-500 mr-2 mt-0.5" />
                    <div>
                      <h3 className="font-medium text-blue-700">Utility Bills Configuration</h3>
                      <p className="text-sm text-blue-600 mt-1">
                        Specify which utilities are included in the rent and which are the tenant's responsibility.
                        For tenant responsibilities, you can set percentage, fixed amount, or full payment options.
                      </p>
                    </div>
                  </div>
                </div>
                
                {/* Bill Terms Section */}
                <div className="space-y-6">
                  {fields.length === 0 ? (
                    <div className="text-center p-8 border border-dashed rounded-md">
                      <p className="text-gray-500 mb-4">No utility bills have been added yet</p>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      {fields.map((field, index) => (
                        <Card key={field.id} className="relative">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="absolute right-2 top-2"
                            onClick={() => remove(index)}
                          >
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
                          
                          <CardHeader className="pb-2">
                            <div className="flex items-center justify-between">
                              <CardTitle className="text-lg">Utility #{index + 1}</CardTitle>
                              <div>
                                {form.watch(`billTerms.${index}.included`) ? (
                                  <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                                    <CheckCircle className="h-3 w-3 mr-1" /> Included in Rent
                                  </Badge>
                                ) : (
                                  <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
                                    <AlertTriangle className="h-3 w-3 mr-1" /> Tenant Pays
                                  </Badge>
                                )}
                              </div>
                            </div>
                          </CardHeader>
                          
                          <CardContent className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div className="space-y-2">
                                <Label htmlFor={`billTerms.${index}.utility`}>Utility Type</Label>
                                <Controller
                                  control={form.control}
                                  name={`billTerms.${index}.utility`}
                                  render={({ field }) => (
                                    <Select 
                                      onValueChange={field.onChange}
                                      value={field.value}
                                    >
                                      <SelectTrigger>
                                        <SelectValue placeholder="Select utility type" />
                                      </SelectTrigger>
                                      <SelectContent>
                                        {Array.isArray(billProviders) && billProviders.map(provider => (
                                          <SelectItem key={provider.category} value={provider.category}>
                                            {provider.display_name}
                                          </SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                  )}
                                />
                                {form.formState.errors.billTerms?.[index]?.utility && (
                                  <p className="text-sm text-red-500">
                                    {form.formState.errors.billTerms[index]?.utility?.message}
                                  </p>
                                )}
                              </div>
                              
                              <div className="space-y-2">
                                <Label htmlFor={`billTerms.${index}.provider`}>Provider</Label>
                                <Controller
                                  control={form.control}
                                  name={`billTerms.${index}.provider`}
                                  render={({ field }) => {
                                    const providers = form.watch(`billTerms.${index}.utility`) ? 
                                      getProviderOptions(form.watch(`billTerms.${index}.utility`)) : [];
                                    
                                    // If no providers available, use an input instead of a select
                                    if (providers.length === 0 || (providers.length === 1 && providers[0].name.startsWith("Default"))) {
                                      return (
                                        <Input
                                          placeholder="Enter provider name"
                                          value={field.value}
                                          onChange={(e) => field.onChange(e.target.value)}
                                        />
                                      );
                                    }
                                    
                                    return (
                                      <Select 
                                        onValueChange={field.onChange}
                                        value={field.value}
                                        disabled={!form.watch(`billTerms.${index}.utility`)}
                                      >
                                        <SelectTrigger>
                                          <SelectValue placeholder="Select provider" />
                                        </SelectTrigger>
                                        <SelectContent>
                                          {providers.map((provider, idx) => (
                                            <SelectItem key={idx} value={provider.name}>
                                              {provider.name}
                                              {provider.region && ` (${provider.region})`}
                                            </SelectItem>
                                          ))}
                                          <SelectItem value="other">Custom (Enter below)</SelectItem>
                                        </SelectContent>
                                      </Select>
                                    );
                                  }}
                                />
                                {field.value === "other" && (
                                  <div className="mt-2">
                                    <Input
                                      placeholder="Enter custom provider name"
                                      value={form.watch(`billTerms.${index}.customProvider`) || ""}
                                      onChange={(e) => {
                                        form.setValue(`billTerms.${index}.customProvider`, e.target.value);
                                        form.setValue(`billTerms.${index}.provider`, e.target.value);
                                      }}
                                    />
                                  </div>
                                )}
                                {form.formState.errors.billTerms?.[index]?.provider && (
                                  <p className="text-sm text-red-500">
                                    {form.formState.errors.billTerms[index]?.provider?.message}
                                  </p>
                                )}
                              </div>
                            </div>
                            
                            <div className="flex items-center space-x-2 py-2">
                              <Controller
                                control={form.control}
                                name={`billTerms.${index}.included`}
                                render={({ field }) => (
                                  <Switch
                                    checked={field.value}
                                    onCheckedChange={(checked) => {
                                      field.onChange(checked);
                                      if (checked) {
                                        // Reset tenant responsibility settings if included in rent
                                        form.setValue(`billTerms.${index}.responsibilityType`, "none");
                                        form.setValue(`billTerms.${index}.responsibilityValue`, 0);
                                        form.setValue(`billTerms.${index}.distribution`, "none");
                                      }
                                    }}
                                    id={`billTerms.${index}.included`}
                                  />
                                )}
                              />
                              <Label htmlFor={`billTerms.${index}.included`}>
                                Included in Rent
                              </Label>
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Info className="h-4 w-4 text-gray-400 ml-1 cursor-help" />
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p className="w-[250px] text-sm">
                                      Toggle on if this utility is fully included in the rent.
                                      If off, you can specify how the tenant will pay for it.
                                    </p>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            </div>
                            
                            {!form.watch(`billTerms.${index}.included`) && (
                              <div className="space-y-4 p-4 bg-gray-50 rounded-md">
                                <h4 className="font-medium">Tenant Responsibility</h4>
                                
                                <div className="space-y-2">
                                  <Label htmlFor={`billTerms.${index}.responsibilityType`}>
                                    Payment Type
                                  </Label>
                                  <Controller
                                    control={form.control}
                                    name={`billTerms.${index}.responsibilityType`}
                                    render={({ field }) => (
                                      <RadioGroup
                                        value={field.value}
                                        onValueChange={(value) => {
                                          field.onChange(value);
                                          if (value === "full") {
                                            form.setValue(`billTerms.${index}.responsibilityValue`, 100);
                                          } else if (value === "none") {
                                            form.setValue(`billTerms.${index}.responsibilityValue`, 0);
                                          }
                                        }}
                                        className="flex flex-col space-y-1"
                                      >
                                        <div className="flex items-center space-x-2">
                                          <RadioGroupItem value="percentage" id={`billTerms.${index}.responsibility.percentage`} />
                                          <Label htmlFor={`billTerms.${index}.responsibility.percentage`}>
                                            Percentage of Bill
                                          </Label>
                                        </div>
                                        <div className="flex items-center space-x-2">
                                          <RadioGroupItem value="fixed" id={`billTerms.${index}.responsibility.fixed`} />
                                          <Label htmlFor={`billTerms.${index}.responsibility.fixed`}>
                                            Fixed Amount
                                          </Label>
                                        </div>
                                        <div className="flex items-center space-x-2">
                                          <RadioGroupItem value="full" id={`billTerms.${index}.responsibility.full`} />
                                          <Label htmlFor={`billTerms.${index}.responsibility.full`}>
                                            Full Payment
                                          </Label>
                                        </div>
                                      </RadioGroup>
                                    )}
                                  />
                                </div>
                                
                                {form.watch(`billTerms.${index}.responsibilityType`) !== "full" && 
                                 form.watch(`billTerms.${index}.responsibilityType`) !== "none" && (
                                  <div className="space-y-2">
                                    <Label htmlFor={`billTerms.${index}.responsibilityValue`}>
                                      {form.watch(`billTerms.${index}.responsibilityType`) === "percentage" 
                                        ? "Percentage (%)" 
                                        : "Amount ($)"}
                                    </Label>
                                    <Controller
                                      control={form.control}
                                      name={`billTerms.${index}.responsibilityValue`}
                                      render={({ field }) => (
                                        <Input 
                                          type="number" 
                                          min="0" 
                                          max={form.watch(`billTerms.${index}.responsibilityType`) === "percentage" ? 100 : undefined}
                                          step={form.watch(`billTerms.${index}.responsibilityType`) === "percentage" ? 1 : 0.01}
                                          {...field}
                                        />
                                      )}
                                    />
                                  </div>
                                )}
                                
                                <div className="space-y-2">
                                  <Label htmlFor={`billTerms.${index}.distribution`}>
                                    Distribution Method
                                  </Label>
                                  <Controller
                                    control={form.control}
                                    name={`billTerms.${index}.distribution`}
                                    render={({ field }) => (
                                      <Select 
                                        onValueChange={field.onChange}
                                        value={field.value}
                                        disabled={form.watch(`billTerms.${index}.responsibilityType`) === "none"}
                                      >
                                        <SelectTrigger>
                                          <SelectValue placeholder="Select distribution method" />
                                        </SelectTrigger>
                                        <SelectContent>
                                          <SelectItem value="equal">Equal Split</SelectItem>
                                          <SelectItem value="custom">Custom Split</SelectItem>
                                        </SelectContent>
                                      </Select>
                                    )}
                                  />
                                  {form.watch(`billTerms.${index}.distribution`) === "custom" && (
                                    <p className="text-xs text-amber-600 mt-1">
                                      Note: Custom splits can be configured after lease creation when tenants are assigned.
                                    </p>
                                  )}
                                </div>
                              </div>
                            )}
                            
                            <div className="space-y-2">
                              <Label htmlFor={`billTerms.${index}.notes`}>Notes</Label>
                              <Controller
                                control={form.control}
                                name={`billTerms.${index}.notes`}
                                render={({ field }) => (
                                  <Textarea 
                                    className="min-h-[60px]" 
                                    placeholder="Add any notes or details about this utility..."
                                    {...field}
                                  />
                                )}
                              />
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                  
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full py-6"
                    onClick={addBillTerm}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Another Utility
                  </Button>
                </div>
                
                {/* Navigation buttons */}
                <div className="flex justify-between pt-4">
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => {
                      setActiveTab("details");
                    }}
                  >
                    Back to Lease Details
                  </Button>
                  
                  <div className="space-x-2">
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={() => router.back()}
                    >
                      Cancel
                    </Button>
                    <Button 
                      type="submit"
                      disabled={isLoading}
                    >
                      {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                      Create Lease
                    </Button>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </div>
        )}
      </form>
    </div>
  );
}