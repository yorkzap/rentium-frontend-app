// src/app/dashboard/properties/edit-group/[id]/page.tsx
"use client";

import { useParams, useRouter } from 'next/navigation';
import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { DJANGO_API_URL } from '@/lib/config';
import { toast } from 'sonner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, ArrowLeft, Save, Trash2, Plus, Home } from 'lucide-react';
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import Link from 'next/link';

// Interfaces
interface PropertyStub {
    id: number;
    name: string;
    address?: string;
}
interface PropertyGroupDetail {
    id: string;
    name: string;
    description: string;
    grouped_properties: PropertyStub[];
}
// Update interface to reflect available data from list endpoint
interface RoomPropertyStub extends PropertyStub {
     // group_id might not be available from the list endpoint
     group_id?: string | null | undefined;
     group_name: string | null | undefined; // <<< We have group_name
     property_category: 'ROOM';
     address?: string;
}


export default function EditGroupPage() {
    const params = useParams();
    const groupId = params.id as string;
    const router = useRouter();
    const { token } = useAuth();

    const [group, setGroup] = useState<PropertyGroupDetail | null>(null);
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [availableRooms, setAvailableRooms] = useState<RoomPropertyStub[]>([]);
    const [propertiesToAdd, setPropertiesToAdd] = useState<number[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // --- Fetch Group Details ---
    const fetchGroupData = useCallback(async () => {
        // ... (previous fetchGroupData code is fine) ...
        if (!groupId || !token) { return; }
         setError(null);
        try {
            console.log(`[EditGroup] Fetching group details for ID: ${groupId}`);
            const groupRes = await fetch(`${DJANGO_API_URL}/property-groups/${groupId}/`, { headers: { 'Authorization': `Token ${token}` } });
            if (!groupRes.ok) { const errText = await groupRes.text(); throw new Error(`Failed fetch group (${groupRes.status}): ${errText}`); }
            const groupData: PropertyGroupDetail = await groupRes.json();
            setGroup(groupData); setName(groupData.name); setDescription(groupData.description);
            console.log("[EditGroup] Group details fetched successfully.");
        } catch (err) {
             const msg = err instanceof Error ? err.message : 'Unknown error loading group';
             setError(prev => prev ? `${prev}; ${msg}` : msg); toast.error(`Error loading group: ${msg}`);
        }
    }, [groupId, token]);

     // --- Fetch Available Rooms ---
     const fetchAvailableRooms = useCallback(async () => {
         if (!token) { return; }
         setError(null);
         try {
              console.log("[EditGroup] Fetching ALL rooms...");
              const roomsRes = await fetch(`${DJANGO_API_URL}/properties/?property_category=ROOM`, { headers: { 'Authorization': `Token ${token}` } });
              if (!roomsRes.ok) { const errText = await roomsRes.text(); throw new Error(`Failed fetch rooms (${roomsRes.status}): ${errText}`); }
              const allRoomsData: RoomPropertyStub[] = await roomsRes.json();

              console.log("[EditGroup] Raw Rooms Data (first 5):", JSON.stringify(allRoomsData.slice(0, 5), null, 2));

              // *** ADJUSTED FILTERING LOGIC ***
              // Filter for rooms where group_name is strictly null or undefined
              const filteredRooms = allRoomsData.filter(room => {
                  const isUnassigned = room.group_name == null; // <<< USE group_name for filtering
                  // console.log(`[EditGroup Filter Check] Room: ${room.name}, group_name: ${JSON.stringify(room.group_name)}, isUnassigned: ${isUnassigned}`);
                  return room.property_category === 'ROOM' && isUnassigned;
              });

              console.log("[EditGroup] Filtered Available Rooms (group_name == null) (first 5):", JSON.stringify(filteredRooms.slice(0,5), null, 2));

              setAvailableRooms(filteredRooms);
              console.log("[EditGroup] Available rooms fetched and filtered.");

         } catch(err) {
              const msg = err instanceof Error ? err.message : 'Unknown error loading rooms';
               setError(prev => prev ? `${prev}; ${msg}` : msg);
              toast.error(`Error loading rooms: ${msg}`);
              setAvailableRooms([]);
         }
     }, [token]);

    // --- Combined Initial Fetch ---
    useEffect(() => {
        setIsLoading(true);
        Promise.all([fetchGroupData(), fetchAvailableRooms()])
            .catch((err) => { console.error("[EditGroup] Error during initial data fetch:", err); })
            .finally(() => { setIsLoading(false); });
    }, [fetchGroupData, fetchAvailableRooms]); // Depend on the callback functions


    // --- Handle Save Changes (No changes needed) ---
    const handleSaveChanges = async () => { /* ... */
        if (!group || !token || isSaving) return;
        setIsSaving(true);
        const originalName = group.name;
        try {
            const updatePayload = { name, description };
            const updateRes = await fetch(`${DJANGO_API_URL}/property-groups/${group.id}/`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Token ${token}` },
                body: JSON.stringify(updatePayload)
            });
            if (!updateRes.ok) { const errText = await updateRes.text(); throw new Error(`Failed update (${updateRes.status}): ${errText}`); }
            toast.success(`Group "${name}" details updated!`);
            setGroup(prev => prev ? { ...prev, name, description } : null);
        } catch (err) {
            toast.error(`Failed to save details: ${err instanceof Error ? err.message : 'Unknown error'}`);
            setName(originalName);
        } finally { setIsSaving(false); }
    };

    // --- Handle Remove Property (No changes needed) ---
    const handleRemoveProperty = async (propertyId: number) => { /* ... */
        if (!group || !token || isSaving) return;
        const propertyName = group.grouped_properties.find(p=>p.id === propertyId)?.name ?? `Property ID ${propertyId}`;
        if (!confirm(`Remove "${propertyName}" from the group "${group.name}"?`)) return;
        setIsSaving(true);
        try {
            const res = await fetch(`${DJANGO_API_URL}/property-groups/${group.id}/remove-property/`, {
                method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Token ${token}` },
                body: JSON.stringify({ property_id: propertyId })
            });
             if (!res.ok) { const errText = await res.text(); throw new Error(`Failed remove (${res.status}): ${errText}`); }
             toast.success(`"${propertyName}" removed from group.`);
             await Promise.all([fetchGroupData(), fetchAvailableRooms()]);
         } catch(err) {
             toast.error(`Failed to remove property: ${err instanceof Error ? err.message : 'Error'}`);
         } finally { setIsSaving(false); }
    };

     // --- Handle Add Properties (No changes needed) ---
     const handleAddProperties = async () => {
        if (!group || !token || propertiesToAdd.length === 0 || isSaving) return;
        setIsSaving(true); let successCount = 0; const addedIds: number[] = [];
        try {
            console.log(`[EditGroup Add] Attempting to add properties: ${JSON.stringify(propertiesToAdd)} to group ${group.id}`); // Add log
            const addPromises = propertiesToAdd.map(propId =>
                fetch(`${DJANGO_API_URL}/property-groups/${group.id}/add-property/`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'Authorization': `Token ${token}` },
                    body: JSON.stringify({ property_id: propId }) // Sending correct payload { "property_id": <id> }
                }).then(async res => {
                    if (res.ok) {
                        console.log(`[EditGroup Add] Successfully added prop ${propId}`); // Add log
                        addedIds.push(propId); return true;
                    } else {
                        // *** IMPROVE ERROR LOGGING HERE ***
                        const status = res.status;
                        let errorText = `Failed adding prop ${propId} (${status})`;
                        try {
                            const errorData = await res.json(); // Try to parse JSON error
                            errorText = formatApiError(errorData, errorText); // Use helper
                        } catch (e) {
                            errorText = await res.text().catch(() => errorText + ", unreadable response"); // Fallback to text
                        }
                        console.warn(`[EditGroup Add] ${errorText}`); // Log detailed error
                        return false; // Indicate failure
                    }
                }).catch(err => {
                    console.error(`[EditGroup Add] Network error adding prop ${propId}:`, err);
                    return false; // Indicate failure
                })
            );
            const results = await Promise.all(addPromises);
            successCount = results.filter(Boolean).length;

            console.log(`[EditGroup Add] Results: ${successCount} succeeded out of ${propertiesToAdd.length}`); // Add log

            if (successCount > 0) {
                toast.success(`${successCount} properties added.`);
                // Refresh data ONLY if something changed
                await Promise.all([fetchGroupData(), fetchAvailableRooms()]);
                setPropertiesToAdd([]); // Clear selection on success
            }
            // Display warning if some failed
            if (successCount < propertiesToAdd.length) {
                // The specific error should have been logged/toasted inside the .then() block now
                toast.warning(`Could not add ${propertiesToAdd.length - successCount} properties. Check console for details.`);
            }
        } catch (err) {
            // Catch errors during Promise.all or subsequent fetches
            toast.error(`An unexpected error occurred while adding properties: ${err instanceof Error ? err.message : 'Error'}`);
            console.error("[EditGroup Add] Unexpected error:", err);
        } finally { setIsSaving(false); }
    };


    if (isLoading) { /* ... loading ... */
        return <div className="flex justify-center items-center h-screen"><Loader2 className="h-8 w-8 animate-spin" /> Loading Group Data...</div>;
    }
    if (error || !group) { /* ... error ... */
        return ( <div className="container max-w-lg py-10 text-center"><h2 className="text-xl font-semibold text-red-600 mb-4">Error Loading Group</h2><p className="text-slate-600 mb-6">{error || 'Group not found.'}</p><Button variant="outline" onClick={() => router.push('/dashboard/properties?view=groups')}><ArrowLeft className="mr-2 h-4 w-4" /> Back to Groups</Button></div> );
    }

    // --- Render Edit Form ---
    return (
        <div className="container max-w-4xl py-6">
             {/* Back Button & Header */}
            <div className="flex items-center mb-6">
               <Button variant="ghost" size="sm" onClick={() => router.push("/dashboard/properties?view=groups")} className="mr-4"><ArrowLeft className="mr-2 h-4 w-4" /> Back to Groups</Button>
               <h1 className="text-2xl font-semibold">Edit Group: {group.name}</h1>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Column 1: Group Details & Current Properties */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Edit Details Card */}
                    <Card>
                        <CardHeader> <CardTitle>Group Details</CardTitle> </CardHeader>
                        <CardContent className="space-y-4">
                             <div><Label htmlFor="groupName">Group Name</Label><Input id="groupName" value={name} onChange={(e) => setName(e.target.value)} disabled={isSaving}/></div>
                             <div><Label htmlFor="groupDescription">Description</Label><Textarea id="groupDescription" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Optional description..." disabled={isSaving}/></div>
                        </CardContent>
                        <CardFooter>
                             <Button onClick={handleSaveChanges} disabled={isSaving || (name === group.name && description === group.description)}> {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Save className="mr-2 h-4 w-4" />} Save Details </Button>
                        </CardFooter>
                    </Card>

                     {/* Current Properties Card */}
                    <Card>
                         <CardHeader> <CardTitle>Properties in this Group</CardTitle> <CardDescription>Manage properties assigned to "{name}".</CardDescription> </CardHeader>
                         <CardContent>
                             {!group.grouped_properties || group.grouped_properties.length === 0 ? (
                                 <p className="text-sm text-slate-500 text-center py-4">No properties currently in this group.</p>
                             ) : (
                                 <ul className="space-y-2">
                                     {group.grouped_properties.map(prop => (
                                         <li key={prop.id} className="flex justify-between items-center p-2 border rounded-md hover:bg-slate-100">
                                             <Link href={`/dashboard/properties/${prop.id}`} className="text-sm font-medium hover:underline flex-grow mr-2 truncate" title={prop.name}> {prop.name} </Link>
                                             <Button variant="ghost" size="sm" className="text-red-500 hover:text-red-600 hover:bg-red-50 px-2" onClick={() => handleRemoveProperty(prop.id)} disabled={isSaving} title="Remove from group"> <Trash2 className="h-4 w-4"/> </Button>
                                         </li>
                                     ))}
                                 </ul>
                             )}
                         </CardContent>
                    </Card>
                </div>

                {/* Column 2: Add Available Rooms */}
                <div className="lg:col-span-1">
                    <Card>
                         <CardHeader> <CardTitle>Add Available Rooms</CardTitle> <CardDescription>Select unassigned rooms to add.</CardDescription> </CardHeader>
                         <CardContent>
                             {availableRooms.length === 0 ? (
                                 <p className="text-sm text-slate-500 text-center py-4">No unassigned rooms available.</p>
                             ) : (
                                <ScrollArea className="h-72 w-full rounded-md border">
                                    <div className="p-4 space-y-2">
                                        {availableRooms.map(room => (
                                             <div key={room.id} className="flex items-center space-x-3 p-2 rounded hover:bg-slate-50">
                                                 <Checkbox id={`add-room-${room.id}`} checked={propertiesToAdd.includes(room.id)} onCheckedChange={(checked) => { setPropertiesToAdd(prev => checked ? [...prev, room.id] : prev.filter(id => id !== room.id)); }} disabled={isSaving} />
                                                 <Label htmlFor={`add-room-${room.id}`} className="text-sm font-normal cursor-pointer flex-grow truncate" title={`${room.name} (${room.address})`}>
                                                      {room.name} <span className="text-xs text-muted-foreground">({room.address ?? 'No address'})</span>
                                                 </Label>
                                             </div>
                                        ))}
                                    </div>
                                </ScrollArea>
                             )}
                         </CardContent>
                         <CardFooter>
                             <Button onClick={handleAddProperties} disabled={isSaving || propertiesToAdd.length === 0} className="w-full"> <Plus className="mr-2 h-4 w-4" /> Add Selected ({propertiesToAdd.length}) </Button>
                         </CardFooter>
                    </Card>
                </div>
            </div>
        </div>
    );
}