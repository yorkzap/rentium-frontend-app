// src/components/dashboard/landlord/InventoryManagement.tsx
'use client';
import React, { useState, useEffect, useCallback } from 'react'; // Ensure React is imported
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Loader2, Plus, PackageSearch, Building } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { DJANGO_API_URL } from '@/lib/config';
import { toast } from 'sonner';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Badge } from '@/components/ui/badge';

// Import child components and constants
import InventoryItemsTable, {
  DisplayInventoryItem,
} from './inventory/InventoryItemsTable';
import InventoryItemForm from './inventory/InventoryItemForm';
import {
  COMMON_INVENTORY_ITEMS,
  CommonItemSuggestion,
} from './inventory/constants';

// Interfaces
interface PropertyListItem {
  id: number;
  name: string;
  address: string;
  city: string;
}
interface PropertyDetailData {
  id: number;
  name: string;
  address: string;
  city: string;
  group_id: string | null;
  group_name?: string | null;
}
interface ApiInventoryItem {
  id: number;
  property: number;
  name: string;
  description?: string | null;
  quantity: number;
  condition?: 'NEW' | 'GOOD' | 'FAIR' | 'POOR' | 'DAMAGED' | 'MISSING' | null;
  condition_display?: string | null;
  location_description?: string | null;
  created_at: string;
  updated_at: string;
}
interface ApiSharedInventoryItem {
  id: number;
  group: string;
  group_name?: string;
  name: string;
  description?: string | null;
  quantity: number;
  condition?: 'NEW' | 'GOOD' | 'FAIR' | 'POOR' | 'DAMAGED' | 'MISSING' | null;
  condition_display?: string | null;
  location_description?: string | null;
  created_at: string;
  updated_at: string;
}

export default function InventoryManagement() {
  const [properties, setProperties] = useState<PropertyListItem[]>([]);
  const [selectedPropertyId, setSelectedPropertyId] = useState<string | null>(
    null
  );
  const [selectedPropertyDetail, setSelectedPropertyDetail] =
    useState<PropertyDetailData | null>(null);
  const [privateInventory, setPrivateInventory] = useState<ApiInventoryItem[]>(
    []
  );
  const [sharedInventory, setSharedInventory] = useState<
    ApiSharedInventoryItem[]
  >([]);
  const [combinedInventory, setCombinedInventory] = useState<
    DisplayInventoryItem[]
  >([]);
  const [isLoadingProperties, setIsLoadingProperties] = useState(true); // Keep true initially
  const [isLoadingInventory, setIsLoadingInventory] = useState(false); // Start false, set true during fetch
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<DisplayInventoryItem | null>(
    null
  );
  const [addItemType, setAddItemType] = useState<'private' | 'shared'>(
    'private'
  );
  const [deleteInfo, setDeleteInfo] = useState<{
    id: number;
    type: 'private' | 'shared';
  } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // --- Hydration Fix State ---
  const [isClient, setIsClient] = useState(false);
  const { token, loading: authLoading } = useAuth(); // Get auth loading state

  // --- Hydration Fix Effect ---
  useEffect(() => {
    setIsClient(true); // Set true only on the client side after mount
  }, []);

  // Fetch Properties List
  const fetchProperties = useCallback(async () => {
    // Wait for client and token
    if (!isClient || !token) {
      // Avoid setting loading false prematurely if it's just waiting for client/token
      if (!token && isClient) setError('Not authenticated.'); // Set error if client but no token
      if (!isClient && !authLoading) setIsLoadingProperties(false); // Stop loading if auth is done but client not ready yet? Maybe keep loading.
      return;
    }
    setIsLoadingProperties(true);
    setError(null);
    try {
      const response = await fetch(`${DJANGO_API_URL}/properties/`, {
        headers: { Authorization: `Token ${token}` },
      });
      if (!response.ok)
        throw new Error(`Failed property list fetch (${response.status})`);
      const data: PropertyListItem[] = await response.json();
      setProperties(data);
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : 'Unknown property fetch error';
      setError(msg);
      toast.error(msg);
      setProperties([]);
    } finally {
      setIsLoadingProperties(false);
    }
  }, [token, isClient, authLoading]); // Add dependencies

  // Fetch Details AND Inventories
  const fetchDetailsAndInventory = useCallback(async () => {
    // Wait for client, token, and selected property
    if (!isClient || !token || !selectedPropertyId) {
      setSelectedPropertyDetail(null);
      setPrivateInventory([]);
      setSharedInventory([]);
      return;
    }
    setIsLoadingInventory(true);
    setError(null);
    setPrivateInventory([]);
    setSharedInventory([]);
    let groupId: string | null = null;

    try {
      // Fetch details and inventories concurrently
      const detailPromise = fetch(
        `${DJANGO_API_URL}/properties/${selectedPropertyId}/`,
        { headers: { Authorization: `Token ${token}` } }
      );
      const privateInvPromise = fetch(
        `${DJANGO_API_URL}/properties/${selectedPropertyId}/inventory/`,
        { headers: { Authorization: `Token ${token}` } }
      );

      const [detailRes, privateInvRes] = await Promise.all([
        detailPromise,
        privateInvPromise,
      ]);

      // Process Detail Response
      if (!detailRes.ok)
        throw new Error(`Failed property detail fetch (${detailRes.status})`);
      const propDetail: PropertyDetailData = await detailRes.json();
      setSelectedPropertyDetail(propDetail);
      groupId = propDetail.group_id;

      // Process Private Inventory Response
      if (!privateInvRes.ok)
        console.error(
          `Private inventory fetch failed (${privateInvRes.status})`
        ); // Log error but continue
      const privateData: ApiInventoryItem[] = privateInvRes.ok
        ? await privateInvRes.json()
        : [];
      setPrivateInventory(privateData);

      // Fetch Shared Inventory (if grouped)
      if (groupId) {
        const sharedInvRes = await fetch(
          `${DJANGO_API_URL}/property-groups/${groupId}/shared-inventory/`,
          { headers: { Authorization: `Token ${token}` } }
        );
        if (!sharedInvRes.ok)
          console.error(
            `Shared inventory fetch failed (${sharedInvRes.status})`
          ); // Log error but continue
        const sharedData: ApiSharedInventoryItem[] = sharedInvRes.ok
          ? await sharedInvRes.json()
          : [];
        setSharedInventory(sharedData);
      } else {
        setSharedInventory([]); // Ensure shared is empty if not grouped
      }
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : 'Unknown inventory load error';
      setError(msg);
      toast.error(msg);
      setPrivateInventory([]);
      setSharedInventory([]);
      setSelectedPropertyDetail(null);
    } finally {
      setIsLoadingInventory(false);
    }
  }, [selectedPropertyId, token, isClient]); // Add isClient dependency

  // Combine Inventories Effect
  useEffect(() => {
    const combined: DisplayInventoryItem[] = [
      ...privateInventory.map((item) => ({
        ...item,
        itemType: 'private' as const,
      })),
      ...sharedInventory.map((item) => ({
        ...item,
        itemType: 'shared' as const,
      })),
    ];
    combined.sort((a, b) => a.name.localeCompare(b.name));
    setCombinedInventory(combined);
  }, [privateInventory, sharedInventory]);

  // Initial & Reactive Fetches
  useEffect(() => {
    fetchProperties();
  }, [fetchProperties]);
  useEffect(() => {
    fetchDetailsAndInventory();
  }, [fetchDetailsAndInventory]);

  // Modal Handlers
  const openAddItemModal = () => {
    setEditingItem(null);
    setIsModalOpen(true);
  };
  const openEditItemModal = (item: DisplayInventoryItem) => {
    setEditingItem(item);
    setAddItemType(item.itemType);
    setIsModalOpen(true);
  };
  const closeModal = () => {
    setIsModalOpen(false);
    setEditingItem(null);
    setAddItemType('private');
  };
  const handleQuickAdd = (suggestion: CommonItemSuggestion) => {
    if (!selectedPropertyId) return;
    const targetType = suggestion.itemType;
    if (targetType === 'shared' && !selectedPropertyDetail?.group_id) {
      toast.error(
        'Cannot add shared item: Selected property is not part of a group.'
      );
      return;
    }
    setAddItemType(targetType);
    setEditingItem({
      id: 0,
      itemType: targetType,
      property:
        targetType === 'private' ? Number(selectedPropertyId) : undefined,
      group:
        targetType === 'shared'
          ? (selectedPropertyDetail?.group_id ?? undefined)
          : undefined,
      created_at: '',
      updated_at: '',
      ...suggestion.defaults,
      name: suggestion.defaults.name ?? 'Unnamed Quick Add',
      quantity: suggestion.defaults.quantity ?? 1,
      condition_display: '',
      location_description: suggestion.defaults.location_description ?? '',
      description: suggestion.defaults.description ?? '',
    });
    setIsModalOpen(true);
  };

  // CRUD Handlers
  const handleFormSubmit = async (
    data: Omit<
      ApiInventoryItem | ApiSharedInventoryItem,
      'id' | 'created_at' | 'updated_at' | 'condition_display'
    >,
    itemType: 'private' | 'shared',
    itemId?: number
  ): Promise<boolean> => {
    const targetId =
      itemType === 'private'
        ? selectedPropertyId
        : selectedPropertyDetail?.group_id;
    if (!targetId || !token) {
      toast.error('Missing target ID or token.');
      return false;
    }
    const isEdit = !!itemId && itemId > 0;
    const endpoint = itemType === 'private' ? 'inventory' : 'shared-inventory';
    const base = itemType === 'private' ? 'properties' : 'property-groups';
    const url = isEdit
      ? `${DJANGO_API_URL}/${base}/${targetId}/${endpoint}/${itemId}/`
      : `${DJANGO_API_URL}/${base}/${targetId}/${endpoint}/`;
    const method = isEdit ? 'PATCH' : 'POST';
    const payload = { ...data };
    if (itemType === 'private')
      delete (payload as Record<string, unknown>).group;
    else delete (payload as Record<string, unknown>).property;
    try {
      console.log(`Submitting ${method} to ${url}`, payload);
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Token ${token}`,
        },
        body: JSON.stringify(payload),
      });
      if (!response.ok) {
        const errorData = await response
          .json()
          .catch(() => ({ detail: `Request failed (${response.status})` }));
        let errorMessage =
          errorData.detail ||
          `Failed to ${isEdit ? 'update' : 'add'} ${itemType} item`;
        if (typeof errorData === 'object') {
          const fieldErrors = Object.entries(errorData)
            .map(([k, v]) => `${k}: ${v}`)
            .join('; ');
          if (fieldErrors) errorMessage += ` (${fieldErrors})`;
        }
        throw new Error(errorMessage);
      }
      toast.success(
        `${itemType.charAt(0).toUpperCase() + itemType.slice(1)} item ${isEdit ? 'updated' : 'added'} successfully!`
      );
      fetchDetailsAndInventory();
      return true;
    } catch (error) {
      toast.error(
        `Error: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
      return false;
    }
  };
  const handleDeleteItemRequest = (
    itemId: number,
    itemType: 'private' | 'shared'
  ) => {
    setDeleteInfo({ id: itemId, type: itemType });
  };
  const confirmDeleteItem = async () => {
    if (!deleteInfo || !token) return;
    const { id: itemId, type: itemType } = deleteInfo;
    const targetId =
      itemType === 'private'
        ? selectedPropertyId
        : selectedPropertyDetail?.group_id;
    if (!targetId) {
      toast.error('Cannot delete: Missing target ID.');
      setDeleteInfo(null);
      return;
    }
    setIsDeleting(true);
    const itemToDelete = combinedInventory.find(
      (item) => item.id === itemId && item.itemType === itemType
    );
    const endpoint = itemType === 'private' ? 'inventory' : 'shared-inventory';
    const base = itemType === 'private' ? 'properties' : 'property-groups';
    const url = `${DJANGO_API_URL}/${base}/${targetId}/${endpoint}/${itemId}/`;
    try {
      console.log(
        `Deleting ${itemType} item ${itemId} from ${base} ${targetId} via ${url}`
      );
      const response = await fetch(url, {
        method: 'DELETE',
        headers: { Authorization: `Token ${token}` },
      });
      if (!response.ok && response.status !== 204) {
        const errorData = await response
          .json()
          .catch(() => ({ detail: `Delete failed (${response.status})` }));
        throw new Error(
          errorData.detail || `Failed to delete item (${response.status})`
        );
      }
      toast.success(
        `${itemType.charAt(0).toUpperCase() + itemType.slice(1)} item "${itemToDelete?.name ?? 'ID: ' + itemId}" deleted.`
      );
      fetchDetailsAndInventory();
    } catch (error) {
      toast.error(
        `Error deleting item: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    } finally {
      setDeleteInfo(null);
      setIsDeleting(false);
    }
  };

  const isGrouped = !!selectedPropertyDetail?.group_id;

  // --- Combined Loading Check ---
  // Wait for client hydration AND auth check AND initial properties load
  const isInitiallyLoading = !isClient || authLoading || isLoadingProperties;

  if (isInitiallyLoading) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-200px)]">
        <div className="flex flex-col items-center gap-2">
          <Loader2 className="h-10 w-10 animate-spin text-brand" />
          <p className="text-sm text-muted-foreground">
            Loading Inventory Management...
          </p>
        </div>
      </div>
    );
  }

  // --- Render Main Page ---
  return (
    <TooltipProvider delayDuration={100}>
      <div className="space-y-6">
        {/* Top Card: Property Selection */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <PackageSearch className="mr-2 h-5 w-5 text-blue-600" /> Inventory
              Management
            </CardTitle>
            <CardDescription>
              Select a property to view its private and shared (if grouped)
              inventory items.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Label htmlFor="propertySelect">Select Property</Label>
            {/* No loading spinner here, handled by main check */}
            {properties.length === 0 ? (
              <p className="text-sm text-ink-3 mt-1">
                No properties found. Add properties first.
              </p>
            ) : (
              <Select
                value={selectedPropertyId ?? ''}
                onValueChange={(value) => {
                  setSelectedPropertyId(value);
                  // Clear dependent data immediately for better UX
                  setSelectedPropertyDetail(null);
                  setPrivateInventory([]);
                  setSharedInventory([]);
                  setCombinedInventory([]);
                }}
              >
                <SelectTrigger id="propertySelect" className="mt-1">
                  <SelectValue placeholder="-- Select a property --" />
                </SelectTrigger>
                <SelectContent>
                  {properties.map((prop) => (
                    <SelectItem key={prop.id} value={String(prop.id)}>
                      {prop.name}{' '}
                      <span className="text-xs text-muted-foreground ml-2">
                        ({prop.address}, {prop.city})
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </CardContent>
        </Card>

        {/* Only show Add and Inventory sections if a property is selected */}
        {selectedPropertyId && ( // Only need ID selected to show these sections
          <>
            {/* --- Add Inventory Section --- */}
            {/* Conditionally render based on detail loading only if needed, 
                            but often better to allow adding even if detail is still loading */}
            {/* {isLoadingInventory && !selectedPropertyDetail ? <Loader2/> : ( */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Add Inventory Item</CardTitle>
                {/* Description changes based on whether group info is loaded */}
                <CardDescription>
                  {isLoadingInventory && !selectedPropertyDetail
                    ? 'Loading property details...'
                    : isGrouped
                      ? 'Select type and add common items or a custom one.'
                      : 'Add a private inventory item for this property.'}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Radio group (show only if grouped, disable if loading details) */}
                {isGrouped && (
                  <RadioGroup
                    value={addItemType}
                    onValueChange={(value) =>
                      setAddItemType(value as 'private' | 'shared')
                    }
                    className="flex space-x-4 mb-4"
                    // disabled={isLoadingInventory} // Disable while loading group status
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="private" id="r-private" />
                      <Label htmlFor="r-private">Private Item</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="shared" id="r-shared" />
                      <Label htmlFor="r-shared">
                        Shared Item (Group:{' '}
                        {selectedPropertyDetail?.group_name ?? '...'})
                      </Label>
                    </div>
                  </RadioGroup>
                )}

                {/* Quick Add */}
                <div>
                  <Label className="text-sm font-medium">
                    Quick Add Common Items (
                    {isGrouped ? addItemType : 'private'})
                  </Label>
                  <ScrollArea className="w-full mt-2">
                    <div className="flex flex-wrap gap-2 pb-2">
                      {COMMON_INVENTORY_ITEMS.filter(
                        (item) =>
                          item.itemType ===
                          (isGrouped ? addItemType : 'private')
                      ).map((item, index) => (
                        <Tooltip key={index}>
                          <TooltipTrigger asChild>
                            <Button
                              variant="outline"
                              size="sm"
                              className="text-xs h-7 px-2"
                              onClick={() => handleQuickAdd(item)}
                              disabled={isLoadingInventory}
                            >
                              {' '}
                              {/* Disable while loading */}
                              <Plus className="h-3 w-3 mr-1" /> {item.name}
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            {' '}
                            <p>Defaults:</p>{' '}
                            <ul className="text-xs list-disc pl-4">
                              {' '}
                              <li>Qty: {item.defaults.quantity ?? 1}</li>{' '}
                              <li>
                                Condition: {item.defaults.condition ?? 'N/A'}
                              </li>{' '}
                              <li>
                                Location:{' '}
                                {item.defaults.location_description || 'N/A'}
                              </li>{' '}
                            </ul>{' '}
                          </TooltipContent>
                        </Tooltip>
                      ))}
                      {COMMON_INVENTORY_ITEMS.filter(
                        (item) =>
                          item.itemType ===
                          (isGrouped ? addItemType : 'private')
                      ).length === 0 && (
                        <p className="text-xs text-ink-3 italic">
                          No common &apos;{isGrouped ? addItemType : 'private'}
                          &apos; items defined.
                        </p>
                      )}
                    </div>
                  </ScrollArea>
                </div>
                {/* Custom Add Button */}
                <div>
                  {' '}
                  <Button
                    onClick={openAddItemModal}
                    variant="secondary"
                    disabled={isLoadingInventory}
                  >
                    {' '}
                    <Plus className="mr-2 h-4 w-4" /> Add Custom{' '}
                    {isGrouped
                      ? addItemType === 'shared'
                        ? 'Shared'
                        : 'Private'
                      : 'Private'}{' '}
                    Item...{' '}
                  </Button>{' '}
                </div>
              </CardContent>
            </Card>
            {/* )} */}

            {/* Card: Inventory List */}
            {/* Show this card even if selectedPropertyDetail is null but ID is selected */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center">
                  <Building className="mr-2 h-5 w-5 text-gray-500" />
                  Inventory for:{' '}
                  {selectedPropertyDetail?.name ??
                    `Property #${selectedPropertyId}`}
                  {/* Show loading indicator for group name if needed */}
                  {isLoadingInventory && !selectedPropertyDetail ? (
                    <Loader2 className="h-4 w-4 animate-spin ml-3" />
                  ) : (
                    isGrouped && (
                      <Badge
                        variant="outline"
                        className="ml-3 bg-indigo-50 text-indigo-700 border-indigo-200"
                      >
                        Group: {selectedPropertyDetail?.group_name ?? '...'}
                      </Badge>
                    )
                  )}
                </CardTitle>
                <CardDescription>
                  Shows private items for this property and shared items from
                  its group.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isLoadingInventory ? (
                  <div className="flex justify-center items-center py-10">
                    {' '}
                    <Loader2 className="h-6 w-6 animate-spin text-ink-4" />{' '}
                    <span className="ml-2 text-ink-3">
                      Loading inventory...
                    </span>{' '}
                  </div>
                ) : error && combinedInventory.length === 0 ? (
                  <p className="text-center text-red-600 py-6">{error}</p> // Show fetch error
                ) : combinedInventory.length === 0 ? (
                  <p className="text-center text-ink-3 py-6">
                    No inventory items (private or shared) found for this
                    property.
                  </p> // Explicit empty state
                ) : (
                  <InventoryItemsTable
                    items={combinedInventory}
                    onEdit={openEditItemModal}
                    onDelete={handleDeleteItemRequest}
                    isLoading={isDeleting}
                  />
                )}
              </CardContent>
            </Card>
          </>
        )}

        {/* Placeholder when no property selected */}
        {!selectedPropertyId && !isClient && properties.length > 0 && (
          <Card className="border-dashed">
            <CardContent className="p-10 text-center">
              <PackageSearch className="h-12 w-12 text-ink-5 mx-auto mb-3" />
              <p className="text-ink-3">
                Please select a property above to view its inventory.
              </p>
            </CardContent>
          </Card>
        )}

        {/* Modals */}
        <InventoryItemForm
          isOpen={isModalOpen}
          onClose={closeModal}
          onSubmit={handleFormSubmit}
          itemToEdit={editingItem}
          propertyId={selectedPropertyId ? Number(selectedPropertyId) : null}
          groupId={selectedPropertyDetail?.group_id ?? null}
          itemTypeToAddOrEdit={editingItem?.itemType ?? addItemType}
        />
        <AlertDialog
          open={!!deleteInfo}
          onOpenChange={(open) => !open && setDeleteInfo(null)}
        >
          {' '}
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Confirm Deletion</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete the {deleteInfo?.type} item{' '}
                <strong className="mx-1">
                  &quot;
                  {combinedInventory.find(
                    (item) =>
                      item.id === deleteInfo?.id &&
                      item.itemType === deleteInfo?.type
                  )?.name ?? `ID: ${deleteInfo?.id}`}
                  &quot;
                </strong>
                ? This cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={isDeleting}>
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={confirmDeleteItem}
                disabled={isDeleting}
                className="bg-red-600 hover:bg-red-700"
              >
                {' '}
                {isDeleting && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}{' '}
                Yes, Delete Item{' '}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </TooltipProvider>
  );
}
