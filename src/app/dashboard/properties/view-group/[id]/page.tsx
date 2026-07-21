// page.tsx
'use client';
import { useParams, useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { DJANGO_API_URL } from '@/lib/config';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Loader2,
  ArrowLeft,
  Home,
  Users,
  Edit,
  Sofa,
  UserCheck,
} from 'lucide-react';

interface PropertyStub {
  id: number | string;
  name: string;
  address?: string;
}
interface PropertyGroupDetail {
  id: string;
  name: string;
  description: string;
  // DRF may return nested rooms as grouped_properties or properties
  grouped_properties?: PropertyStub[];
  properties?: PropertyStub[];
  created_at: string;
  updated_at: string;
}
// Shape returned by GET /api/properties/property-groups/<id>/common-areas/
interface CommonArea {
  id: number;
  area_type: string;
  area_type_display: string;
  count: number;
  description: string;
  shared_with_landlord: boolean;
  shared_by_count: number;
}

export default function ViewGroupPage() {
  const params = useParams();
  const groupId = params.id as string;
  const router = useRouter();
  const { token } = useAuth();
  const [group, setGroup] = useState<PropertyGroupDetail | null>(null);
  const [areas, setAreas] = useState<CommonArea[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!groupId || !token) return;
    setError(null);
    try {
      // Django routes: /api/properties/groups/<uuid>/
      // and /api/properties/property-groups/<uuid>/common-areas/
      const [groupRes, areasRes] = await Promise.all([
        fetch(`${DJANGO_API_URL}/properties/groups/${groupId}/`, {
          headers: { Authorization: `Token ${token}` },
        }),
        fetch(
          `${DJANGO_API_URL}/properties/property-groups/${groupId}/common-areas/`,
          {
            headers: { Authorization: `Token ${token}` },
          }
        ),
      ]);
      if (!groupRes.ok)
        throw new Error(`Failed to fetch group (${groupRes.status})`);
      const body = await groupRes.json();
      setGroup(body);
      // Areas endpoint may be empty for new groups — degrade gracefully.
      if (areasRes.ok) {
        const areaBody = await areasRes.json();
        setAreas(Array.isArray(areaBody) ? areaBody : areaBody.results || []);
      } else {
        setAreas([]);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to load group';
      setError(msg);
      toast.error(msg);
    } finally {
      setIsLoading(false);
    }
  }, [groupId, token]);
  useEffect(() => {
    load();
  }, [load]);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }
  if (error || !group) {
    return (
      <div className="container max-w-lg py-10 text-center">
        <h2 className="text-xl font-semibold text-red-600 mb-4">
          Error Loading Group
        </h2>
        <p className="text-ink-2 mb-6">{error || 'Group not found.'}</p>
        <Button
          variant="outline"
          onClick={() => router.push('/dashboard/properties?view=groups')}
        >
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to Groups
        </Button>
      </div>
    );
  }

  const landlordShared = areas.some((a) => a.shared_with_landlord);
  const rooms: PropertyStub[] =
    group.grouped_properties || group.properties || [];

  return (
    <div className="container max-w-4xl py-6 px-4 sm:px-6">
      <div className="flex items-center justify-between mb-6">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push('/dashboard/properties?view=groups')}
        >
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to Groups
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() =>
            router.push(`/dashboard/properties/edit-group/${groupId}`)
          }
        >
          <Edit className="mr-2 h-4 w-4" /> Edit Group
        </Button>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center text-2xl">
            <Users className="mr-3 h-6 w-6 text-indigo-600" /> {group.name}
          </CardTitle>
          {group.description && (
            <CardDescription className="pt-2">
              {group.description}
            </CardDescription>
          )}
          {landlordShared && (
            <div className="pt-2">
              <Badge
                variant="outline"
                className="bg-purple-50 text-purple-700 border-purple-200"
              >
                <UserCheck className="h-3 w-3 mr-1" /> Landlord shares common
                areas
              </Badge>
              <p className="text-xs text-ink-3 mt-1.5">
                Because you (or your relatives) share common areas here, the BC
                tenancy act does not apply to these rooms — each lease&apos;s
                own notice terms govern move-outs.
              </p>
            </div>
          )}
        </CardHeader>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center">
              <Home className="mr-2 h-4 w-4 text-ink-3" /> Rooms in this Group
            </CardTitle>
          </CardHeader>
          <CardContent>
            {rooms.length === 0 ? (
              <p className="text-sm text-ink-3 text-center py-4">
                No rooms assigned yet.
              </p>
            ) : (
              <ul className="space-y-2">
                {rooms.map((prop) => (
                  <li
                    key={prop.id}
                    className="border p-3 rounded-md hover:bg-canvas transition-colors"
                  >
                    <Link
                      href={`/dashboard/properties/${prop.id}`}
                      className="flex items-center justify-between"
                    >
                      <span className="font-medium text-sm">{prop.name}</span>
                      <span className="text-xs text-muted-foreground">
                        View →
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center">
              <Sofa className="mr-2 h-4 w-4 text-ink-3" /> Common Areas
            </CardTitle>
            <CardDescription>
              Shared by the rooms in this group.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {areas.length === 0 ? (
              <p className="text-sm text-ink-3 text-center py-4">
                No shared common areas yet — add them from the Edit Group page.
              </p>
            ) : (
              <ul className="space-y-2">
                {areas.map((a) => (
                  <li key={a.id} className="border p-3 rounded-md text-sm">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-medium">
                        {a.area_type_display}
                        {a.count > 1 && (
                          <span className="text-ink-4 font-normal">
                            {' '}
                            × {a.count}
                          </span>
                        )}
                      </span>
                      <div className="flex gap-1.5">
                        <Badge variant="outline" className="text-xs bg-canvas">
                          {a.shared_by_count} rooms
                        </Badge>
                        {a.shared_with_landlord && (
                          <Badge
                            variant="outline"
                            className="text-xs bg-purple-50 text-purple-700 border-purple-200"
                          >
                            <UserCheck className="h-3 w-3 mr-0.5" /> Landlord
                          </Badge>
                        )}
                      </div>
                    </div>
                    {a.description && (
                      <p className="text-xs text-ink-3 mt-1">{a.description}</p>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
