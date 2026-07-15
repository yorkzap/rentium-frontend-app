// CreateLeaseForm.tsx
'use client';
import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  useForm,
  Controller,
  useFieldArray,
  type Resolver,
} from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import axios from 'axios';
import { format } from 'date-fns';
import { DJANGO_API_URL } from '@/lib/config';
import { previewRentSplit } from '@/lib/leaseApi';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import {
  CalendarIcon,
  Loader2,
  Plus,
  Trash2,
  Info,
  CheckCircle,
  AlertTriangle,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import PropertySelector from './PropertySelector';

// Number inputs silently increment/decrement by `step` when the user
// scrolls (or presses arrow keys) while the field is focused — with
// step="0.01" that's exactly how a typed $600.00 deposit became $599.98
// (two wheel ticks) without anyone noticing. Blurring on wheel means
// scrolling the page can never edit a money field. Attach this to EVERY
// numeric money input.
const blurOnWheel = (e: React.WheelEvent<HTMLInputElement>) => {
  e.currentTarget.blur();
};

// Enhanced schema with all the required lease details including bill terms.
// NOTE: the <=100 constraint only applies to PERCENTAGE responsibility —
// a FIXED dollar amount can legitimately exceed $100 (the old schema's
// blanket .max(100) rejected e.g. "$150/month fixed", which the backend
// happily accepts).
const billTermSchema = z
  .object({
    utility: z.string().min(1, 'Utility type is required'),
    provider: z.string().min(1, 'Provider name is required'),
    customProvider: z.string().optional(),
    included: z.boolean().default(false),
    responsibilityType: z
      .enum(['none', 'full', 'percentage', 'fixed'])
      .default('none'),
    responsibilityValue: z.preprocess(
      (val) => (val === '' ? 0 : Number(val)),
      z
        .number({ invalid_type_error: 'Value must be a number' })
        .min(0, 'Value cannot be negative')
    ),
    distribution: z.enum(['none', 'equal', 'custom']).default('none'),
    notes: z.string().optional(),
  })
  .refine(
    (term) =>
      term.responsibilityType !== 'percentage' ||
      term.responsibilityValue <= 100,
    {
      message: 'Percentage must be between 0 and 100',
      path: ['responsibilityValue'],
    }
  );

const formSchema = z
  .object({
    propertyId: z.string().min(1, 'Property selection is required'),
    leaseType: z.string().min(1, 'Lease type is required'),
    startDate: z.date({ required_error: 'Start date is required' }),
    isMonthToMonth: z.boolean().default(false),
    endDate: z.date().optional(),
    moveInDate: z.date().optional(),
    totalRent: z.preprocess(
      (val) => (val === '' ? undefined : Number(val)),
      z
        .number({
          required_error: 'Total monthly rent is required',
          invalid_type_error: 'Rent must be a number',
        })
        .positive('Total monthly rent must be greater than $0')
    ),
    securityDeposit: z.preprocess(
      (val) => (val === '' ? 0 : Number(val)),
      z
        .number({ invalid_type_error: 'Deposit must be a number' })
        .min(0, 'Deposit cannot be negative')
        .default(0)
    ),
    petDeposit: z.preprocess(
      (val) => (val === '' ? 0 : Number(val)),
      z
        .number({ invalid_type_error: 'Deposit must be a number' })
        .min(0, 'Deposit cannot be negative')
        .default(0)
    ),
    cleaningFee: z.preprocess(
      (val) => (val === '' ? 0 : Number(val)),
      z
        .number({ invalid_type_error: 'Fee must be a number' })
        .min(0, 'Fee cannot be negative')
        .default(0)
    ),
    // Where tenants should send their e-transfers. Optional — the backend
    // falls back to your service email, then your account email, so tenants
    // always see SOME address; set this if rent should go somewhere specific.
    etransferEmail: z
      .string()
      .email('Enter a valid email address')
      .or(z.literal(''))
      .optional(),
    // Months of notice the tenant must give. Honored ONLY when the landlord
    // (or relatives) shares kitchen/common areas with the tenancy — i.e. the
    // RTA doesn't apply and the lease's own terms govern. When the RTA
    // applies its statutory minimums override this. (leases/tenancy_rules.py)
    tenantNoticeMonths: z.preprocess(
      (val) => (val === '' || val === undefined ? 1 : Number(val)),
      z
        .number({ invalid_type_error: 'Must be a number' })
        .int()
        .min(1, 'At least 1 month')
        .max(12, 'At most 12 months')
    ),
    petsAllowed: z.boolean().default(false),
    smokingAllowed: z.boolean().default(false),
    specialTerms: z.string().optional(),
    billTerms: z.array(billTermSchema).optional().default([]),
  })
  .refine((data) => (!data.isMonthToMonth ? !!data.endDate : true), {
    message: 'End date is required for fixed-term leases',
    path: ['endDate'],
  })
  .refine(
    (data) =>
      data.endDate && data.startDate ? data.endDate > data.startDate : true,
    {
      message: 'End date must be after start date',
      path: ['endDate'],
    }
  )
  .refine(
    (data) =>
      data.moveInDate && data.startDate
        ? data.moveInDate >= data.startDate
        : true,
    {
      message: 'Move-in date cannot be before the lease start date',
      path: ['moveInDate'],
    }
  );

// Interfaces for property and lease types
interface Property {
  id: number;
  name: string;
  property_category: 'COMPLETE_UNIT' | 'ROOM';
  property_category_display?: string;
  city: string;
  province?: string;
  address?: string;
  primary_image?: string | null;
  area_summary?: string;
  bedrooms?: number | null;
  bathrooms?: string | number | null;
  group?: { id: string; name: string } | null;
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
  const { token } = useAuth(); // Use auth context to get token
  const [isLoading, setIsLoading] = useState(false);
  const [isFetchingData, setIsFetchingData] = useState(true);
  const [properties, setProperties] = useState<Property[]>([]);
  const [leaseTypes, setLeaseTypes] = useState<LeaseType[]>([]);
  const [billProviders, setBillProviders] = useState<BillProvider[]>([]);
  const [apiError, setApiError] = useState<string | null>(null);
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(
    null
  );
  const [autoSelectedLeaseType, setAutoSelectedLeaseType] =
    useState<LeaseType | null>(null);
  const [step, setStep] = useState(1); // Track form steps: 1 = property, 2 = lease details, 3 = bill terms
  const [overlapWarning, setOverlapWarning] = useState<
    | {
        lease_number: string;
        start_date: string;
        end_date: string | null;
        status_display: string;
      }[]
    | null
  >(null);
  const [, setIsCheckingOverlap] = useState(false);
  const [activeTab, setActiveTab] = useState('details'); // Track active tab in step 2

  // --- Tenant invite step (post lease-creation) ---
  interface TenantInviteRow {
    email: string;
    // Full legal name (no first/last split, matching RTB-1 handling
    // elsewhere) — goes on the invite as invited_name so the lease form's
    // parties/signature blocks are filled before the tenant registers.
    name: string;
    rentAmount: string; // kept as a string for controlled-input binding
    isPrimary: boolean;
    touched: boolean; // true once the user manually edited this row's rent
  }
  const [createdLeaseId, setCreatedLeaseId] = useState<string | null>(null);
  const [totalRentValue, setTotalRentValue] = useState<number>(0);
  const [tenantInvites, setTenantInvites] = useState<TenantInviteRow[]>([
    { email: '', name: '', rentAmount: '', isPrimary: true, touched: false },
  ]);
  const [isSendingInvites, setIsSendingInvites] = useState(false);
  const [isSyncingSplit, setIsSyncingSplit] = useState(false);

  // Rent-split computation lives on the backend now
  // (leases/services.py:compute_rent_split via the preview-split endpoint)
  // — this used to be a local reimplementation of the same algorithm
  // duplicated here and in LeaseDetail.tsx's tenant roster editor. Every
  // row here is brand new (id: null) since the lease was just created with
  // no tenants yet, so results are zipped back by array position.
  const splitDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const syncSplit = async (
    rows: TenantInviteRow[],
    leaseIdOverride?: string
  ) => {
    const leaseId = leaseIdOverride || createdLeaseId;
    if (!token || !leaseId) return;
    setIsSyncingSplit(true);
    try {
      const result = await previewRentSplit(
        token,
        leaseId,
        rows.map((r) => ({
          id: null,
          rent_amount: r.rentAmount || null,
          touched: r.touched,
        }))
      );
      setTenantInvites((prev) =>
        prev.map((row, i) => {
          const resultRow = result.rows[i];
          return resultRow
            ? { ...row, rentAmount: resultRow.rent_amount }
            : row;
        })
      );
    } catch (err) {
      toast.error('Error', {
        description:
          err instanceof Error
            ? err.message
            : "Couldn't recalculate the rent split.",
      });
    } finally {
      setIsSyncingSplit(false);
    }
  };
  const addTenantRow = () => {
    setTenantInvites((prev) => {
      const next = [
        ...prev,
        {
          email: '',
          name: '',
          rentAmount: '',
          isPrimary: prev.length === 0,
          touched: false,
        },
      ];
      syncSplit(next);
      return next;
    });
  };
  const removeTenantRow = (index: number) => {
    setTenantInvites((prev) => {
      const wasPrimary = prev[index]?.isPrimary;
      let next = prev.filter((_, i) => i !== index);
      // Always keep exactly one primary tenant (if any rows remain) — if we
      // just removed the primary one, promote the new first row.
      if (wasPrimary && next.length > 0 && !next.some((r) => r.isPrimary)) {
        next = next.map((r, i) => ({ ...r, isPrimary: i === 0 }));
      }
      syncSplit(next);
      return next;
    });
  };
  const updateTenantEmail = (index: number, email: string) => {
    setTenantInvites((prev) =>
      prev.map((row, i) => (i === index ? { ...row, email } : row))
    );
  };
  const updateTenantName = (index: number, name: string) => {
    setTenantInvites((prev) =>
      prev.map((row, i) => (i === index ? { ...row, name } : row))
    );
  };
  const updateTenantRent = (index: number, value: string) => {
    setTenantInvites((prev) => {
      const next = prev.map((row, i) =>
        i === index ? { ...row, rentAmount: value, touched: true } : row
      );
      // Debounced — this fires on every keystroke, and we don't want a
      // network round trip per character typed.
      if (splitDebounceRef.current) clearTimeout(splitDebounceRef.current);
      splitDebounceRef.current = setTimeout(() => syncSplit(next), 350);
      return next;
    });
  };
  // Primary contact is single-select by design (backend enforces this too,
  // at the model level) — selecting one always clears the others, so this
  // behaves like a radio group even though each row renders its own control.
  const setPrimaryTenant = (index: number) => {
    setTenantInvites((prev) =>
      prev.map((row, i) => ({ ...row, isPrimary: i === index }))
    );
  };
  const allocatedTotal = tenantInvites.reduce(
    (sum, r) => sum + (parseFloat(r.rentAmount) || 0),
    0
  );
  const unallocatedRent = Math.max(totalRentValue - allocatedTotal, 0);
  const sendTenantInvites = async () => {
    if (!createdLeaseId) return;
    const validRows = tenantInvites.filter(
      (r) => r.email.trim() && r.rentAmount
    );
    if (validRows.length === 0) {
      router.push(`/dashboard/leases/${createdLeaseId}`);
      return;
    }
    // Safety net: if somehow none of the rows being sent is marked primary
    // (e.g. the primary row's email was left blank and got filtered out),
    // default the first one so the lease always ends up with exactly one.
    const hasPrimary = validRows.some((r) => r.isPrimary);
    const rowsToSend = hasPrimary
      ? validRows
      : validRows.map((r, i) => (i === 0 ? { ...r, isPrimary: true } : r));
    setIsSendingInvites(true);
    try {
      const api = axios.create({
        baseURL: DJANGO_API_URL,
        headers: {
          Authorization: `Token ${token}`,
          'Content-Type': 'application/json',
        },
      });
      await Promise.all(
        rowsToSend.map((row) =>
          api.post('/leases/tenants/', {
            lease: createdLeaseId,
            invited_email: row.email.trim(),
            // Full legal name for the lease form (RTB-1 parties/signature
            // blocks) — the account's own name takes over once they link.
            invited_name: row.name.trim(),
            // Pass the backend's own Decimal string straight through —
            // preview-split returned e.g. "600.00"; Number() would
            // round-trip it through a float for no reason. DRF's
            // DecimalField parses the string exactly.
            rent_amount: row.rentAmount,
            is_primary_tenant: row.isPrimary,
          })
        )
      );
      toast.success('Invites sent', {
        description: `${rowsToSend.length} tenant(s) invited to sign.`,
      });
      router.push(`/dashboard/leases/${createdLeaseId}`);
    } catch (error) {
      const msg =
        axios.isAxiosError(error) && error.response?.data
          ? JSON.stringify(error.response.data)
          : 'Failed to send some invites.';
      toast.error('Error', { description: msg });
    } finally {
      setIsSendingInvites(false);
    }
  };

  // The schema coerces its money fields (string in, number out), which makes
  // zod's INPUT type `unknown` and unusable for <Input {...field}>. Run the
  // form on the OUTPUT shape and bridge the resolver's input/output split
  // with one contained cast.
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema) as unknown as Resolver<
      z.infer<typeof formSchema>
    >,
    defaultValues: {
      propertyId: '',
      leaseType: '',
      startDate: undefined,
      isMonthToMonth: false,
      endDate: undefined,
      moveInDate: undefined,
      totalRent: undefined,
      securityDeposit: 0,
      petDeposit: 0,
      cleaningFee: 0,
      etransferEmail: '',
      tenantNoticeMonths: 1,
      petsAllowed: false,
      smokingAllowed: false,
      specialTerms: '',
      billTerms: [],
    },
  });

  // Setup field array for bill terms
  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'billTerms',
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
            Authorization: `Token ${token}`,
            'Content-Type': 'application/json',
          },
        });

        const [propertiesRes, leaseTypesRes, billProvidersRes] =
          await Promise.all([
            api.get('/properties/'),
            api.get('/leases/types/'),
            api.get('/leases/bill_providers/'),
          ]);

        setProperties(propertiesRes.data);
        setLeaseTypes(leaseTypesRes.data);

        // Process bill providers data
        const billProvidersData = billProvidersRes.data;
        console.log('Bill providers API response:', billProvidersData);

        if (billProvidersData && billProvidersData.bill_providers) {
          // The API returns a structure with regions (BC, SK, GENERIC) containing utility types
          // Extract all unique utility types across regions
          type RawProvider = {
            id: string | number;
            name: string;
            region?: string;
          };
          const utilityTypes: {
            [key: string]: {
              category: string;
              display_name: string;
              providers: RawProvider[];
            };
          } = {};

          // Process all regions
          Object.keys(billProvidersData.bill_providers).forEach((region) => {
            const regionData = billProvidersData.bill_providers[region];

            // For each utility type in this region
            Object.keys(regionData).forEach((utilityType) => {
              const utilityData = regionData[utilityType];

              // If we haven't seen this utility type yet, initialize it
              if (!utilityTypes[utilityType]) {
                utilityTypes[utilityType] = {
                  category: utilityType,
                  display_name: utilityData.display_name,
                  providers: [],
                };
              }

              // Add providers from this region, marking the region in the provider
              utilityData.providers.forEach((provider: RawProvider) => {
                // Add the region to the provider and ensure no duplicates
                const providerWithRegion = {
                  ...provider,
                  region: region !== 'GENERIC' ? region : undefined,
                };

                // Check if this provider already exists (by id)
                const existingProviderIndex = utilityTypes[
                  utilityType
                ].providers.findIndex((p) => p.id === provider.id);

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
            {
              category: 'electricity',
              display_name: 'Electricity',
              providers: [],
            },
            { category: 'water', display_name: 'Water', providers: [] },
            { category: 'internet', display_name: 'Internet', providers: [] },
            { category: 'gas', display_name: 'Gas/Heating', providers: [] },
            {
              category: 'waste',
              display_name: 'Waste Collection',
              providers: [],
            },
          ];
          setBillProviders(defaultUtilities);
          console.warn(
            'Using default utility list as bill providers data is missing or has unexpected format'
          );
        }
      } catch (error) {
        console.error('Failed to fetch data:', error);
        // Set default utilities even on error
        const defaultUtilities = [
          {
            category: 'electricity',
            display_name: 'Electricity',
            providers: [],
          },
          { category: 'water', display_name: 'Water', providers: [] },
          { category: 'internet', display_name: 'Internet', providers: [] },
          { category: 'gas', display_name: 'Gas/Heating', providers: [] },
          {
            category: 'waste',
            display_name: 'Waste Collection',
            providers: [],
          },
        ];
        setBillProviders(defaultUtilities);

        setApiError(
          'Could not load properties, lease types, or bill providers. Using default utility list.'
        );
        toast.error('Warning', {
          description: 'Could not load utility providers. Using default list.',
        });
      } finally {
        setIsFetchingData(false);
      }
    };

    if (token) {
      fetchData();
    } else {
      setApiError('Authentication required. Please log in again.');
      setIsFetchingData(false);
    }
  }, [token, toast]);

  // Non-blocking overlap warning — watches property + dates and pings the
  // backend's read-only check-overlap endpoint. This never blocks
  // submission; it just surfaces a heads-up so the landlord can catch a
  // scheduling mistake before signing, rather than the system silently
  // resolving it after the fact.
  const watchedPropertyId = form.watch('propertyId');
  const watchedStartDate = form.watch('startDate');
  const watchedEndDate = form.watch('endDate');
  const watchedIsMonthToMonth = form.watch('isMonthToMonth');
  useEffect(() => {
    if (!token || !watchedPropertyId || !watchedStartDate) {
      setOverlapWarning(null);
      return;
    }
    if (!watchedIsMonthToMonth && !watchedEndDate) {
      // Fixed-term but no end date chosen yet — nothing meaningful to check.
      setOverlapWarning(null);
      return;
    }
    let cancelled = false;
    const checkOverlap = async () => {
      setIsCheckingOverlap(true);
      try {
        const api = axios.create({
          baseURL: DJANGO_API_URL,
          headers: { Authorization: `Token ${token}` },
        });
        const params = new URLSearchParams({
          property: watchedPropertyId,
          start_date: format(watchedStartDate, 'yyyy-MM-dd'),
        });
        if (!watchedIsMonthToMonth && watchedEndDate) {
          params.set('end_date', format(watchedEndDate, 'yyyy-MM-dd'));
        }
        const res = await api.get(
          `/leases/check-overlap/?${params.toString()}`
        );
        if (!cancelled) {
          setOverlapWarning(
            res.data.has_overlap ? res.data.overlapping_leases : null
          );
        }
      } catch {
        if (!cancelled) setOverlapWarning(null);
      } finally {
        if (!cancelled) setIsCheckingOverlap(false);
      }
    };
    checkOverlap();
    return () => {
      cancelled = true;
    };
  }, [
    token,
    watchedPropertyId,
    watchedStartDate,
    watchedEndDate,
    watchedIsMonthToMonth,
  ]);

  // Function to automatically choose a lease type based on the property details
  const getSuitableLeaseTypes = (property: Property): LeaseType[] => {
    if (!property) return [];
    // Map province to code if needed
    let provinceCode = null;
    if (property.province) {
      if (property.province === 'British Columbia') provinceCode = 'BC';
      else if (property.province === 'Saskatchewan') provinceCode = 'SK';
    }
    // First try for province-specific types
    const provinceSpecificTypes = leaseTypes.filter(
      (lt) =>
        lt.property_category === property.property_category &&
        provinceCode &&
        lt.province.code === provinceCode
    );
    if (provinceSpecificTypes.length > 0) {
      return provinceSpecificTypes;
    }
    // Otherwise, fall back to generic types
    return leaseTypes.filter(
      (lt) =>
        lt.property_category === property.property_category &&
        lt.province.code === 'GENERIC'
    );
  };

  // Handle property selection; auto-picks an appropriate lease type upon selection
  const handlePropertyChange = async (propertyId: string) => {
    form.setValue('propertyId', propertyId);
    setIsLoading(true);

    try {
      const api = axios.create({
        baseURL: DJANGO_API_URL,
        headers: {
          Authorization: `Token ${token}`,
          'Content-Type': 'application/json',
        },
      });

      // Fetch complete property details
      const propertyResponse = await api.get(`/properties/${propertyId}/`);
      const completeProperty = propertyResponse.data;

      setSelectedProperty(completeProperty);
      // Clear any previous leaseType value
      form.setValue('leaseType', '');
      setAutoSelectedLeaseType(null);

      // Automatically determine the suitable lease types
      const suitableLeaseTypes = getSuitableLeaseTypes(completeProperty);
      if (suitableLeaseTypes.length > 0) {
        // Automatically choose the first match (or add your preferred logic)
        const chosenLeaseType = suitableLeaseTypes[0];
        form.setValue('leaseType', chosenLeaseType.value);
        setAutoSelectedLeaseType(chosenLeaseType);
      } else {
        toast.error('No Agreement Found', {
          description:
            'No suitable agreement type was found for the selected property.',
        });
      }
    } catch (error) {
      console.error('Error fetching complete property details:', error);
      toast.error('Error', {
        description: 'Failed to load complete property details.',
      });
      // Fallback: try to set a basic property if available
      const basicProperty =
        properties.find((p) => p.id.toString() === propertyId) || null;
      setSelectedProperty(basicProperty);
    } finally {
      setIsLoading(false);
    }
  };

  // Function to add a new bill term
  const addBillTerm = () => {
    append({
      utility: '',
      provider: '',
      customProvider: '',
      included: false,
      responsibilityType: 'none',
      responsibilityValue: 0,
      distribution: 'none',
      notes: '',
    });
  };

  // Proceed to lease details step
  const goToLeaseDetails = () => {
    if (selectedProperty && autoSelectedLeaseType) {
      setStep(2);
      setActiveTab('details');
    } else {
      toast.error('Selection Required', {
        description: 'Please select a property first.',
      });
    }
  };

  // Proceed to bill terms step
  const goToBillTerms = async () => {
    const detailsResult = await form.trigger([
      'startDate',
      'endDate',
      'moveInDate',
      'totalRent',
      'securityDeposit',
      'petDeposit',
      'cleaningFee',
      'etransferEmail',
      'tenantNoticeMonths',
      'petsAllowed',
      'smokingAllowed',
      'specialTerms',
    ]);

    if (detailsResult) {
      setActiveTab('utilities');
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

    const utility = billProviders.find((bp) => bp.category === utilityType);

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
          Authorization: `Token ${token}`,
          'Content-Type': 'application/json',
        },
      });

      // Transform bill terms into the format expected by the API
      type BillIncludedEntry = {
        included: boolean;
        provider: string;
        category: string;
        tenant_responsibility: {
          type: string | undefined;
          value: number | undefined;
          distribution: string | undefined;
        };
        notes: string;
      };
      const billsIncluded: Record<string, BillIncludedEntry> = {};

      values.billTerms?.forEach((term) => {
        if (term.utility && term.provider) {
          billsIncluded[term.utility] = {
            included: term.included,
            provider: term.provider,
            category: term.utility,
            tenant_responsibility: {
              type: term.responsibilityType,
              value: term.responsibilityValue,
              distribution: term.distribution,
            },
            notes: term.notes || '',
          };
        }
      });

      // Prepare lease data.
      // Money always travels as fixed-2 STRINGS — never raw JS numbers.
      // DRF's DecimalField parses strings exactly, whereas JSON floats can
      // carry binary representation error for values like 1234.565.
      const leaseData = {
        lease_type: values.leaseType,
        property_id: parseInt(values.propertyId),
        start_date: format(values.startDate, 'yyyy-MM-dd'),
        is_month_to_month: values.isMonthToMonth,
        end_date: values.endDate ? format(values.endDate, 'yyyy-MM-dd') : null,
        move_in_date: values.moveInDate
          ? format(values.moveInDate, 'yyyy-MM-dd')
          : null,
        total_rent: values.totalRent.toFixed(2),
        security_deposit: values.securityDeposit.toFixed(2),
        pet_deposit: values.petDeposit.toFixed(2),
        cleaning_fee: values.cleaningFee.toFixed(2),
        etransfer_email: values.etransferEmail || '',
        custom_tenant_notice_months: values.tenantNoticeMonths,
        pets_allowed: values.petsAllowed,
        smoking_allowed: values.smokingAllowed,
        special_terms: values.specialTerms,
        bills_included: billsIncluded,
      };

      // Create lease
      const response = await api.post('/leases/', leaseData);
      toast.success('Lease created', {
        description: 'Now add the tenant(s) who need to sign it.',
      });
      console.log('Created lease:', response.data);
      // Move to the tenant-invite step instead of redirecting immediately.
      // Seed the split state with the total rent just set; syncSplit needs
      // the lease id explicitly here since setCreatedLeaseId() above hasn't
      // actually updated the `createdLeaseId` closure variable yet (React
      // state updates aren't synchronous).
      setCreatedLeaseId(response.data.id);
      setTotalRentValue(values.totalRent);
      syncSplit(tenantInvites, response.data.id);
      setStep(3);
    } catch (error) {
      console.error('Error creating lease:', error);
      let errorMessage = 'Failed to create lease.';

      if (axios.isAxiosError(error) && error.response?.data) {
        errorMessage =
          typeof error.response.data === 'string'
            ? error.response.data
            : JSON.stringify(error.response.data);

        if (errorMessage.length > 200) {
          errorMessage =
            'Multiple validation errors occurred. Please check your inputs.';
        }
      }

      setApiError(errorMessage);
      toast.error('Error', { description: errorMessage });
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
        <strong>Authentication Error:</strong> Please log in again to access
        this feature.
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
      <h1 className="text-2xl font-bold mb-1">Create New Lease</h1>
      <p className="text-sm text-ink-3 mb-6">
        Set up a new lease agreement in three quick steps.
      </p>
      <div className="flex items-center mb-8">
        {[
          { num: 1, label: 'Property' },
          { num: 2, label: 'Lease Details' },
          { num: 3, label: 'Invite Tenants' },
        ].map((s, i, arr) => (
          <div key={s.num} className="flex items-center flex-1 last:flex-none">
            <div className="flex flex-col items-center">
              <div
                className={cn(
                  'h-8 w-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors',
                  step === s.num
                    ? 'bg-brand text-white'
                    : step > s.num
                      ? 'bg-green-100 text-green-700'
                      : 'bg-surface-sunken text-ink-4'
                )}
              >
                {step > s.num ? '✓' : s.num}
              </div>
              <span
                className={cn(
                  'text-xs mt-1.5 whitespace-nowrap',
                  step === s.num ? 'text-ink font-medium' : 'text-ink-4'
                )}
              >
                {s.label}
              </span>
            </div>
            {i < arr.length - 1 && (
              <div
                className={cn(
                  'h-0.5 flex-1 mx-2 mb-4',
                  step > s.num ? 'bg-green-200' : 'bg-surface-sunken'
                )}
              />
            )}
          </div>
        ))}
      </div>

      {apiError && (
        <div className="bg-red-50 border border-red-200 text-red-700 p-4 mb-4 rounded-md">
          <strong>Error:</strong> {apiError}
        </div>
      )}

      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {step === 1 && (
          <div className="space-y-6">
            <div className="bg-blue-50 border border-blue-200 text-blue-700 p-4 mb-4 rounded-md">
              <strong>Step 1:</strong> Select the property for this lease
              agreement.
            </div>

            <div className="space-y-2">
              <Label htmlFor="propertyId">Select Property</Label>
              <PropertySelector
                properties={properties}
                selectedId={form.watch('propertyId')}
                onSelect={handlePropertyChange}
              />
              {form.formState.errors.propertyId && (
                <p className="text-sm text-red-500">
                  {form.formState.errors.propertyId.message}
                </p>
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
                    <li>
                      <strong>Property Type:</strong>{' '}
                      {selectedProperty.property_category === 'COMPLETE_UNIT'
                        ? 'Complete Unit'
                        : 'Room'}
                    </li>
                    <li>
                      <strong>Province:</strong>{' '}
                      {selectedProperty.province || 'Not specified'}
                    </li>
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
              <strong>Step 2:</strong> Enter lease details for{' '}
              {selectedProperty?.name}.
            </div>

            <Tabs
              value={activeTab}
              onValueChange={setActiveTab}
              className="w-full"
            >
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
                                variant={'outline'}
                                className={cn(
                                  'w-full justify-start text-left font-normal',
                                  !field.value && 'text-muted-foreground'
                                )}
                              >
                                <CalendarIcon className="mr-2 h-4 w-4" />
                                {field.value
                                  ? format(field.value, 'PPP')
                                  : 'Select date'}
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
                        <p className="text-sm text-red-500">
                          {form.formState.errors.startDate.message}
                        </p>
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
                                form.setValue('endDate', undefined);
                              }
                            }}
                            id="isMonthToMonth"
                          />
                        )}
                      />
                      <Label htmlFor="isMonthToMonth">Month-to-Month?</Label>
                    </div>

                    {!form.watch('isMonthToMonth') && (
                      <div className="space-y-2">
                        <Label htmlFor="endDate">End Date *</Label>
                        <Controller
                          control={form.control}
                          name="endDate"
                          render={({ field }) => (
                            <Popover>
                              <PopoverTrigger asChild>
                                <Button
                                  variant={'outline'}
                                  className={cn(
                                    'w-full justify-start text-left font-normal',
                                    !field.value && 'text-muted-foreground'
                                  )}
                                >
                                  <CalendarIcon className="mr-2 h-4 w-4" />
                                  {field.value
                                    ? format(field.value, 'PPP')
                                    : 'Select end date'}
                                </Button>
                              </PopoverTrigger>
                              <PopoverContent className="w-auto p-0">
                                <Calendar
                                  mode="single"
                                  selected={field.value}
                                  onSelect={field.onChange}
                                  initialFocus
                                  disabled={(date) =>
                                    !form.watch('startDate') ||
                                    date < form.watch('startDate')
                                  }
                                />
                              </PopoverContent>
                            </Popover>
                          )}
                        />
                        {form.formState.errors.endDate && (
                          <p className="text-sm text-red-500">
                            {form.formState.errors.endDate.message}
                          </p>
                        )}
                      </div>
                    )}

                    <div className="space-y-2">
                      <Label htmlFor="moveInDate">
                        Move-in Date (Optional)
                      </Label>
                      <Controller
                        control={form.control}
                        name="moveInDate"
                        render={({ field }) => (
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button
                                variant={'outline'}
                                className={cn(
                                  'w-full justify-start text-left font-normal',
                                  !field.value && 'text-muted-foreground'
                                )}
                              >
                                <CalendarIcon className="mr-2 h-4 w-4" />
                                {field.value
                                  ? format(field.value, 'PPP')
                                  : 'Select move-in date'}
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0">
                              <Calendar
                                mode="single"
                                selected={field.value}
                                onSelect={field.onChange}
                                initialFocus
                                disabled={(date) =>
                                  !form.watch('startDate') ||
                                  date < form.watch('startDate')
                                }
                              />
                            </PopoverContent>
                          </Popover>
                        )}
                      />
                      {form.formState.errors.moveInDate && (
                        <p className="text-sm text-red-500">
                          {form.formState.errors.moveInDate.message}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
                {overlapWarning && overlapWarning.length > 0 && (
                  <div className="bg-amber-50 border border-amber-200 text-amber-800 p-4 rounded-md">
                    <div className="flex items-start gap-2">
                      <AlertTriangle className="h-5 w-5 mt-0.5 flex-shrink-0 text-amber-600" />
                      <div className="space-y-1">
                        <p className="font-medium text-sm">
                          Heads up — this overlaps with{' '}
                          {overlapWarning.length === 1
                            ? 'an existing lease'
                            : 'existing leases'}{' '}
                          on this property
                        </p>
                        <ul className="text-sm space-y-0.5">
                          {overlapWarning.map((l, i) => (
                            <li key={i}>
                              {l.lease_number} ({l.status_display}):{' '}
                              {l.start_date} – {l.end_date || 'ongoing'}
                            </li>
                          ))}
                        </ul>
                        <p className="text-xs text-amber-700 pt-1">
                          You can still continue — this is just a heads-up,
                          nothing is blocked or changed automatically. A
                          month-to-month lease on this property will get its end
                          date set to this lease&apos;s start date once this one
                          is signed; a fixed-term overlap needs to be resolved
                          manually (e.g. terminate the old one).
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Financials Section */}
                <div className="space-y-4 border p-4 rounded-md">
                  <h2 className="text-lg font-semibold">Financial Details</h2>
                  <div className="space-y-2 p-4 bg-canvas rounded-md border">
                    <Label htmlFor="totalRent">Total Monthly Rent ($) *</Label>
                    <Controller
                      control={form.control}
                      name="totalRent"
                      render={({ field }) => (
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          placeholder="e.g. 1000"
                          onWheel={blurOnWheel}
                          {...field}
                          value={field.value ?? ''}
                        />
                      )}
                    />
                    <p className="text-xs text-ink-3">
                      The full rent for this unit/room. On the next step,
                      you&apos;ll split this across the tenant(s) you invite —
                      if it&apos;s just one person, they&apos;re automatically
                      responsible for the whole amount.
                    </p>
                    {form.formState.errors.totalRent && (
                      <p className="text-sm text-red-500">
                        {form.formState.errors.totalRent.message}
                      </p>
                    )}
                  </div>
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                    <div className="space-y-2">
                      <Label htmlFor="securityDeposit">
                        Security Deposit ($)
                      </Label>
                      <Controller
                        control={form.control}
                        name="securityDeposit"
                        render={({ field }) => (
                          <Input
                            type="number"
                            min="0"
                            step="0.01"
                            onWheel={blurOnWheel}
                            {...field}
                          />
                        )}
                      />
                      {form.formState.errors.securityDeposit && (
                        <p className="text-sm text-red-500">
                          {form.formState.errors.securityDeposit.message}
                        </p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="petDeposit">Pet Deposit ($)</Label>
                      <Controller
                        control={form.control}
                        name="petDeposit"
                        render={({ field }) => (
                          <Input
                            type="number"
                            min="0"
                            step="0.01"
                            onWheel={blurOnWheel}
                            {...field}
                          />
                        )}
                      />
                      {form.formState.errors.petDeposit && (
                        <p className="text-sm text-red-500">
                          {form.formState.errors.petDeposit.message}
                        </p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="cleaningFee">Cleaning Fee ($)</Label>
                      <Controller
                        control={form.control}
                        name="cleaningFee"
                        render={({ field }) => (
                          <Input
                            type="number"
                            min="0"
                            step="0.01"
                            onWheel={blurOnWheel}
                            {...field}
                          />
                        )}
                      />
                      {form.formState.errors.cleaningFee && (
                        <p className="text-sm text-red-500">
                          {form.formState.errors.cleaningFee.message}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="etransferEmail">
                      e-Transfer Email (optional)
                    </Label>
                    <Controller
                      control={form.control}
                      name="etransferEmail"
                      render={({ field }) => (
                        <Input
                          type="email"
                          placeholder="e.g. rent@yourdomain.com"
                          {...field}
                          value={field.value ?? ''}
                        />
                      )}
                    />
                    <p className="text-xs text-ink-3">
                      Where tenants should send their e-transfers. Shown in
                      their dashboard&apos;s &quot;Make a Payment&quot; section.
                      Left blank, your service email (or account email) is shown
                      instead.
                    </p>
                    {form.formState.errors.etransferEmail && (
                      <p className="text-sm text-red-500">
                        {form.formState.errors.etransferEmail.message}
                      </p>
                    )}
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
                                form.setValue('petDeposit', 0);
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
                  <div className="space-y-2 pt-2 border-t">
                    <Label htmlFor="tenantNoticeMonths">
                      Tenant Move-Out Notice (months)
                    </Label>
                    <Controller
                      control={form.control}
                      name="tenantNoticeMonths"
                      render={({ field }) => (
                        <Input
                          type="number"
                          min="1"
                          max="12"
                          step="1"
                          className="w-32"
                          onWheel={blurOnWheel}
                          {...field}
                          value={field.value ?? 1}
                        />
                      )}
                    />
                    <p className="text-xs text-ink-3">
                      How many months&apos; notice the tenant must give to move
                      out. This only takes effect when you (or your relatives)
                      share the kitchen/common areas with the tenancy — the
                      provincial tenancy act doesn&apos;t apply there, so the
                      lease&apos;s own terms govern. Otherwise the act&apos;s
                      statutory minimums apply automatically (1 month tenant / 3
                      months landlord in BC).
                    </p>
                    {form.formState.errors.tenantNoticeMonths && (
                      <p className="text-sm text-red-500">
                        {form.formState.errors.tenantNoticeMonths.message}
                      </p>
                    )}
                  </div>
                </div>

                {/* Special Terms Section */}
                <div className="space-y-4 border p-4 rounded-md">
                  <h2 className="text-lg font-semibold">Special Terms</h2>

                  <div className="space-y-2">
                    <Label htmlFor="specialTerms">
                      Additional Terms & Conditions
                    </Label>
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
                      <p className="text-sm text-red-500">
                        {form.formState.errors.specialTerms.message}
                      </p>
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
                    <Button type="button" onClick={goToBillTerms}>
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
                      <h3 className="font-medium text-blue-700">
                        Utility Bills Configuration
                      </h3>
                      <p className="text-sm text-blue-600 mt-1">
                        Specify which utilities are included in the rent and
                        which are the tenant&apos;s responsibility. For tenant
                        responsibilities, you can set percentage, fixed amount,
                        or full payment options.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Bill Terms Section */}
                <div className="space-y-6">
                  {fields.length === 0 ? (
                    <div className="text-center p-8 border border-dashed rounded-md">
                      <p className="text-gray-500 mb-4">
                        No utility bills have been added yet
                      </p>
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
                              <CardTitle className="text-lg">
                                Utility #{index + 1}
                              </CardTitle>
                              <div>
                                {form.watch(`billTerms.${index}.included`) ? (
                                  <Badge
                                    variant="outline"
                                    className="bg-green-50 text-green-700 border-green-200"
                                  >
                                    <CheckCircle className="h-3 w-3 mr-1" />{' '}
                                    Included in Rent
                                  </Badge>
                                ) : (
                                  <Badge
                                    variant="outline"
                                    className="bg-amber-50 text-amber-700 border-amber-200"
                                  >
                                    <AlertTriangle className="h-3 w-3 mr-1" />{' '}
                                    Tenant Pays
                                  </Badge>
                                )}
                              </div>
                            </div>
                          </CardHeader>

                          <CardContent className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div className="space-y-2">
                                <Label htmlFor={`billTerms.${index}.utility`}>
                                  Utility Type
                                </Label>
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
                                        {Array.isArray(billProviders) &&
                                          billProviders.map((provider) => (
                                            <SelectItem
                                              key={provider.category}
                                              value={provider.category}
                                            >
                                              {provider.display_name}
                                            </SelectItem>
                                          ))}
                                      </SelectContent>
                                    </Select>
                                  )}
                                />
                                {form.formState.errors.billTerms?.[index]
                                  ?.utility && (
                                  <p className="text-sm text-red-500">
                                    {
                                      form.formState.errors.billTerms[index]
                                        ?.utility?.message
                                    }
                                  </p>
                                )}
                              </div>

                              <div className="space-y-2">
                                <Label htmlFor={`billTerms.${index}.provider`}>
                                  Provider
                                </Label>
                                <Controller
                                  control={form.control}
                                  name={`billTerms.${index}.provider`}
                                  render={({ field }) => {
                                    const providers = form.watch(
                                      `billTerms.${index}.utility`
                                    )
                                      ? getProviderOptions(
                                          form.watch(
                                            `billTerms.${index}.utility`
                                          )
                                        )
                                      : [];

                                    // If no providers available, use an input instead of a select
                                    if (
                                      providers.length === 0 ||
                                      (providers.length === 1 &&
                                        providers[0].name.startsWith('Default'))
                                    ) {
                                      return (
                                        <Input
                                          placeholder="Enter provider name"
                                          value={field.value}
                                          onChange={(e) =>
                                            field.onChange(e.target.value)
                                          }
                                        />
                                      );
                                    }

                                    return (
                                      <Select
                                        onValueChange={field.onChange}
                                        value={field.value}
                                        disabled={
                                          !form.watch(
                                            `billTerms.${index}.utility`
                                          )
                                        }
                                      >
                                        <SelectTrigger>
                                          <SelectValue placeholder="Select provider" />
                                        </SelectTrigger>
                                        <SelectContent>
                                          {providers.map((provider, idx) => (
                                            <SelectItem
                                              key={idx}
                                              value={provider.name}
                                            >
                                              {provider.name}
                                              {provider.region &&
                                                ` (${provider.region})`}
                                            </SelectItem>
                                          ))}
                                          <SelectItem value="other">
                                            Custom (Enter below)
                                          </SelectItem>
                                        </SelectContent>
                                      </Select>
                                    );
                                  }}
                                />
                                {/*
                                  BUGFIX: this used to check `field.value === "other"`
                                  OUTSIDE the Controller's render scope, where `field`
                                  is the useFieldArray row object (has .id, not .value)
                                  — so the custom-provider input never rendered and
                                  choosing "Custom" silently saved the provider name
                                  "other". We now watch the actual form value, and only
                                  commit the custom name into `provider` on blur so the
                                  input doesn't vanish after the first keystroke
                                  (provider would no longer equal "other").
                                */}
                                {form.watch(`billTerms.${index}.provider`) ===
                                  'other' && (
                                  <div className="mt-2">
                                    <Input
                                      placeholder="Enter custom provider name"
                                      value={
                                        form.watch(
                                          `billTerms.${index}.customProvider`
                                        ) || ''
                                      }
                                      onChange={(e) => {
                                        form.setValue(
                                          `billTerms.${index}.customProvider`,
                                          e.target.value
                                        );
                                      }}
                                      onBlur={(e) => {
                                        if (e.target.value.trim()) {
                                          form.setValue(
                                            `billTerms.${index}.provider`,
                                            e.target.value.trim()
                                          );
                                        }
                                      }}
                                    />
                                    <p className="text-xs text-ink-3 mt-1">
                                      Type the provider name, then click away to
                                      confirm.
                                    </p>
                                  </div>
                                )}
                                {form.formState.errors.billTerms?.[index]
                                  ?.provider && (
                                  <p className="text-sm text-red-500">
                                    {
                                      form.formState.errors.billTerms[index]
                                        ?.provider?.message
                                    }
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
                                        form.setValue(
                                          `billTerms.${index}.responsibilityType`,
                                          'none'
                                        );
                                        form.setValue(
                                          `billTerms.${index}.responsibilityValue`,
                                          0
                                        );
                                        form.setValue(
                                          `billTerms.${index}.distribution`,
                                          'none'
                                        );
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
                                      Toggle on if this utility is fully
                                      included in the rent. If off, you can
                                      specify how the tenant will pay for it.
                                    </p>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            </div>

                            {!form.watch(`billTerms.${index}.included`) && (
                              <div className="space-y-4 p-4 bg-gray-50 rounded-md">
                                <h4 className="font-medium">
                                  Tenant Responsibility
                                </h4>

                                <div className="space-y-2">
                                  <Label
                                    htmlFor={`billTerms.${index}.responsibilityType`}
                                  >
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
                                          if (value === 'full') {
                                            form.setValue(
                                              `billTerms.${index}.responsibilityValue`,
                                              100
                                            );
                                          } else if (value === 'none') {
                                            form.setValue(
                                              `billTerms.${index}.responsibilityValue`,
                                              0
                                            );
                                          }
                                        }}
                                        className="flex flex-col space-y-1"
                                      >
                                        <div className="flex items-center space-x-2">
                                          <RadioGroupItem
                                            value="percentage"
                                            id={`billTerms.${index}.responsibility.percentage`}
                                          />
                                          <Label
                                            htmlFor={`billTerms.${index}.responsibility.percentage`}
                                          >
                                            Percentage of Bill
                                          </Label>
                                        </div>
                                        <div className="flex items-center space-x-2">
                                          <RadioGroupItem
                                            value="fixed"
                                            id={`billTerms.${index}.responsibility.fixed`}
                                          />
                                          <Label
                                            htmlFor={`billTerms.${index}.responsibility.fixed`}
                                          >
                                            Fixed Amount
                                          </Label>
                                        </div>
                                        <div className="flex items-center space-x-2">
                                          <RadioGroupItem
                                            value="full"
                                            id={`billTerms.${index}.responsibility.full`}
                                          />
                                          <Label
                                            htmlFor={`billTerms.${index}.responsibility.full`}
                                          >
                                            Full Payment
                                          </Label>
                                        </div>
                                      </RadioGroup>
                                    )}
                                  />
                                </div>

                                {form.watch(
                                  `billTerms.${index}.responsibilityType`
                                ) !== 'full' &&
                                  form.watch(
                                    `billTerms.${index}.responsibilityType`
                                  ) !== 'none' && (
                                    <div className="space-y-2">
                                      <Label
                                        htmlFor={`billTerms.${index}.responsibilityValue`}
                                      >
                                        {form.watch(
                                          `billTerms.${index}.responsibilityType`
                                        ) === 'percentage'
                                          ? 'Percentage (%)'
                                          : 'Amount ($)'}
                                      </Label>
                                      <Controller
                                        control={form.control}
                                        name={`billTerms.${index}.responsibilityValue`}
                                        render={({ field }) => (
                                          <Input
                                            type="number"
                                            min="0"
                                            max={
                                              form.watch(
                                                `billTerms.${index}.responsibilityType`
                                              ) === 'percentage'
                                                ? 100
                                                : undefined
                                            }
                                            step={
                                              form.watch(
                                                `billTerms.${index}.responsibilityType`
                                              ) === 'percentage'
                                                ? 1
                                                : 0.01
                                            }
                                            onWheel={blurOnWheel}
                                            {...field}
                                          />
                                        )}
                                      />
                                      {form.formState.errors.billTerms?.[index]
                                        ?.responsibilityValue && (
                                        <p className="text-sm text-red-500">
                                          {
                                            form.formState.errors.billTerms[
                                              index
                                            ]?.responsibilityValue?.message
                                          }
                                        </p>
                                      )}
                                    </div>
                                  )}

                                <div className="space-y-2">
                                  <Label
                                    htmlFor={`billTerms.${index}.distribution`}
                                  >
                                    Distribution Method
                                  </Label>
                                  <Controller
                                    control={form.control}
                                    name={`billTerms.${index}.distribution`}
                                    render={({ field }) => (
                                      <Select
                                        onValueChange={field.onChange}
                                        value={field.value}
                                        disabled={
                                          form.watch(
                                            `billTerms.${index}.responsibilityType`
                                          ) === 'none'
                                        }
                                      >
                                        <SelectTrigger>
                                          <SelectValue placeholder="Select distribution method" />
                                        </SelectTrigger>
                                        <SelectContent>
                                          <SelectItem value="equal">
                                            Equal Split
                                          </SelectItem>
                                          <SelectItem value="custom">
                                            Custom Split
                                          </SelectItem>
                                        </SelectContent>
                                      </Select>
                                    )}
                                  />
                                  {form.watch(
                                    `billTerms.${index}.distribution`
                                  ) === 'custom' && (
                                    <p className="text-xs text-amber-600 mt-1">
                                      Note: Custom splits can be configured
                                      after lease creation when tenants are
                                      assigned.
                                    </p>
                                  )}
                                </div>
                              </div>
                            )}

                            <div className="space-y-2">
                              <Label htmlFor={`billTerms.${index}.notes`}>
                                Notes
                              </Label>
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
                      setActiveTab('details');
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
                    <Button type="submit" disabled={isLoading}>
                      {isLoading ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : null}
                      Create Lease
                    </Button>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </div>
        )}
        {step === 3 && (
          <div className="space-y-6">
            <div className="bg-green-50 border border-green-200 text-green-700 p-4 mb-4 rounded-md">
              <strong>Lease created.</strong> Now invite the tenant(s) who need
              to sign it. Each person gets a signing link by email — they
              don&apos;t need an account first.
            </div>
            <div className="bg-blue-50 border border-blue-200 text-blue-700 p-3 rounded-md text-sm flex items-start gap-2">
              <Info className="h-4 w-4 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                Total monthly rent:{' '}
                <strong>${totalRentValue.toFixed(2)}</strong>.
                {tenantInvites.length > 1 && (
                  <>
                    {' '}
                    Split equally by default — edit any amount below and the
                    rest auto-adjusts to keep the total correct.
                  </>
                )}{' '}
                The full legal name goes on the lease form itself (e.g. the
                RTB-1 parties and signature blocks), so enter it as it should
                appear there.
              </div>
              {isSyncingSplit && (
                <Loader2 className="h-4 w-4 animate-spin flex-shrink-0" />
              )}
            </div>
            <RadioGroup
              value={tenantInvites.findIndex((r) => r.isPrimary).toString()}
              onValueChange={(value) => setPrimaryTenant(Number(value))}
              className="space-y-4"
            >
              {tenantInvites.map((row, index) => (
                <div key={index} className="border p-4 rounded-md space-y-3">
                  <div className="flex flex-wrap items-end gap-3">
                    <div className="w-full sm:w-48 space-y-2">
                      <Label htmlFor={`tenant-name-${index}`}>
                        Full Legal Name
                      </Label>
                      <Input
                        id={`tenant-name-${index}`}
                        placeholder="e.g. Jordan Lee"
                        value={row.name}
                        onChange={(e) =>
                          updateTenantName(index, e.target.value)
                        }
                      />
                    </div>
                    <div className="flex-1 min-w-[200px] space-y-2">
                      <Label htmlFor={`tenant-email-${index}`}>
                        Tenant Email
                      </Label>
                      <Input
                        id={`tenant-email-${index}`}
                        type="email"
                        placeholder="tenant@example.com"
                        value={row.email}
                        onChange={(e) =>
                          updateTenantEmail(index, e.target.value)
                        }
                      />
                    </div>
                    {tenantInvites.length > 1 ? (
                      <div className="w-40 space-y-2">
                        <Label htmlFor={`tenant-rent-${index}`}>
                          Monthly Rent ($)
                        </Label>
                        <Input
                          id={`tenant-rent-${index}`}
                          type="number"
                          min="0"
                          step="0.01"
                          onWheel={blurOnWheel}
                          value={row.rentAmount}
                          onChange={(e) =>
                            updateTenantRent(index, e.target.value)
                          }
                        />
                      </div>
                    ) : (
                      <div className="w-40 space-y-2">
                        <Label>Monthly Rent</Label>
                        <div className="h-10 flex items-center px-3 text-sm text-ink-2 bg-canvas rounded-md border">
                          ${row.rentAmount || '0.00'} (full amount)
                        </div>
                      </div>
                    )}
                    {tenantInvites.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => removeTenantRow(index)}
                      >
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    )}
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem
                      value={index.toString()}
                      id={`primary-${index}`}
                    />
                    <Label
                      htmlFor={`primary-${index}`}
                      className="text-sm whitespace-nowrap cursor-pointer"
                    >
                      Primary contact
                    </Label>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Info className="h-3.5 w-3.5 text-ink-4 cursor-help" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p className="w-[220px] text-xs">
                            Exactly one tenant is the primary contact for lease
                            communications. Selecting a new one automatically
                            un-selects the previous choice.
                          </p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                </div>
              ))}
            </RadioGroup>
            {tenantInvites.length > 1 && unallocatedRent > 0.01 && (
              <div className="bg-amber-50 border border-amber-200 text-amber-700 p-3 rounded-md text-sm">
                ${unallocatedRent.toFixed(2)} of the total rent isn&apos;t
                assigned to anyone yet. Add another tenant row or adjust the
                amounts above.
              </div>
            )}
            <Button type="button" variant="outline" onClick={addTenantRow}>
              <Plus className="h-4 w-4 mr-2" /> Add Another Tenant
            </Button>
            <div className="flex justify-between pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() =>
                  router.push(
                    createdLeaseId
                      ? `/dashboard/leases/${createdLeaseId}`
                      : '/dashboard/leases'
                  )
                }
              >
                Skip for Now
              </Button>
              <Button
                type="button"
                onClick={sendTenantInvites}
                disabled={isSendingInvites}
              >
                {isSendingInvites ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : null}
                Send Invites & Finish
              </Button>
            </div>
          </div>
        )}
      </form>
    </div>
  );
}
