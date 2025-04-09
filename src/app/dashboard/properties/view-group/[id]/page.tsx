// src/app/dashboard/properties/view-group/[id]/page.tsx
// src/app/dashboard/properties/view-group/[id]/page.tsx
"use client";

import { useParams, useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { DJANGO_API_URL } from '@/lib/config';
import { toast } from 'sonner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, ArrowLeft, Home, Users, Edit } from 'lucide-react'; // Add necessary icons
import Link from 'next/link';
import { Badge } from '@/components/ui/badge'; // If displaying common areas

// Interfaces
interface PropertyGroupDetail {
    id: string;
    name: string;
    description: string;
    grouped_properties: PropertyStub[];
    // Add common_areas if your detail endpoint includes them
    // common_areas: { area_type: string; area_type_display: string; count: number }[];
    created_at: string;
    updated_at: string;
}
interface PropertyStub {
    id: number;
    name: string;
    // Add other fields if needed (e.g., address, status)
}

export default function ViewGroupPage() {
    const params = useParams();
    const groupId = params.id as string;
    const router = useRouter();
    const { token } = useAuth();

    const [group, setGroup] = useState<PropertyGroupDetail | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!groupId || !token) return;

        const fetchGroupDetails = async () => {
            setIsLoading(true);
            setError(null);
            try {
                const res = await fetch(`${DJANGO_API_URL}/property-groups/${groupId}/`, {
                    headers: { 'Authorization': `Token ${token}` }
                });
                if (!res.ok) throw new Error('Failed to fetch group details');
                const data: PropertyGroupDetail = await res.json();
                setGroup(data);
            } catch (err) {
                setError(err instanceof Error ? err.message : 'Failed to load group');
                toast.error(`Error: ${error}`);
            } finally {
                setIsLoading(false);
            }
        };

        fetchGroupDetails();
    }, [groupId, token, error]); // Re-run if error state changes? Maybe not.

    if (isLoading) {
        return <div className="flex justify-center items-center h-screen"><Loader2 className="h-8 w-8 animate-spin" /></div>;
    }

    if (error || !group) {
        return (
             <div className="container max-w-lg py-10 text-center">
                <h2 className="text-xl font-semibold text-red-600 mb-4">Error Loading Group</h2>
                <p className="text-slate-600 mb-6">{error || 'Group not found.'}</p>
                <Button variant="outline" onClick={() => router.push('/dashboard/properties?view=groups')}>
                    <ArrowLeft className="mr-2 h-4 w-4" /> Back to Groups
                </Button>
            </div>
        );
    }

    return (
        <div className="container max-w-4xl py-6">
             {/* Back Button & Header */}
            <div className="flex items-center justify-between mb-6">
                 <Button variant="ghost" size="sm" onClick={() => router.push("/dashboard/properties?view=groups")}>
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back to Groups
                 </Button>
                 <Button variant="outline" size="sm" onClick={() => router.push(`/dashboard/properties/edit-group/${groupId}`)}>
                      <Edit className="mr-2 h-4 w-4" /> Edit Group
                 </Button>
            </div>

             <Card className="mb-6">
                <CardHeader>
                    <CardTitle className="flex items-center text-2xl">
                       <Users className="mr-3 h-6 w-6 text-indigo-600"/> {group.name}
                    </CardTitle>
                     {group.description && (
                        <CardDescription className="pt-2">{group.description}</CardDescription>
                     )}
                </CardHeader>
                 {/* Optional: Display creation/update dates */}
                 {/* <CardFooter className="text-xs text-muted-foreground">
                     Created: {new Date(group.created_at).toLocaleDateString()} |
                     Last Updated: {new Date(group.updated_at).toLocaleDateString()}
                 </CardFooter> */}
            </Card>

             <Card>
                <CardHeader>
                    <CardTitle className="text-lg">Properties in this Group</CardTitle>
                </CardHeader>
                <CardContent>
                     {group.grouped_properties.length === 0 ? (
                         <p className="text-sm text-slate-500 text-center py-4">No properties assigned to this group.</p>
                     ) : (
                         <ul className="space-y-2">
                             {group.grouped_properties.map(prop => (
                                 <li key={prop.id} className="border p-3 rounded-md hover:bg-slate-50 transition-colors">
                                     <Link href={`/dashboard/properties/${prop.id}`} className="flex items-center justify-between">
                                         <div className="flex items-center">
                                             <Home className="h-4 w-4 mr-2 text-slate-500"/>
                                             <span className="font-medium">{prop.name}</span>
                                         </div>
                                          {/* Add other property details if needed */}
                                         <span className="text-sm text-muted-foreground">View Property →</span>
                                     </Link>
                                 </li>
                             ))}
                         </ul>
                     )}
                </CardContent>
             </Card>

             {/* Optional: Card for Common Areas if data available */}
             {/*
             {group.common_areas && group.common_areas.length > 0 && (
                 <Card className="mt-6">
                     <CardHeader><CardTitle className="text-lg">Common Areas</CardTitle></CardHeader>
                     <CardContent className="flex flex-wrap gap-2">
                        {group.common_areas.map((area, index) => (
                           <Badge key={index} variant="secondary">...</Badge>
                        ))}
                     </CardContent>
                 </Card>
             )}
             */}
        </div>
    );
}