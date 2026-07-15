// src/components/dashboard/landlord/LandlordOverview.tsx
'use client';
import React, { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Building2,
  Users,
  DollarSign,
  Wrench,
  FileText,
  ChevronRight,
  Loader2,
  AlertCircle,
  ImageIcon,
} from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { DJANGO_API_URL } from '@/lib/config';
import { toast } from 'sonner';
import { fetchSummary, type LedgerSummary } from '@/lib/financeApi';
import { fetchAttention, type ActionItem } from '@/lib/attentionApi';
import {
  HouseKeys,
  InspectionWalk,
} from '@/components/public/illustrations/spots';
import { fetchWorkOrders, type WorkOrder } from '@/lib/maintenanceApi';

// --- Helper: Derive Base URL ---
let djangoBaseUrl = '';
try {
  if (
    DJANGO_API_URL &&
    (DJANGO_API_URL.startsWith('http://') ||
      DJANGO_API_URL.startsWith('https://'))
  ) {
    djangoBaseUrl = new URL(DJANGO_API_URL).origin;
  }
} catch (e) {
  console.error('Error parsing DJANGO_API_URL:', e);
}
const getFullImageUrl = (
  relativeUrl: string | null | undefined
): string | null => {
  if (!relativeUrl) return null;
  if (relativeUrl.startsWith('http') || relativeUrl.startsWith('blob:'))
    return relativeUrl;
  if (djangoBaseUrl) {
    try {
      return relativeUrl.startsWith('/media/')
        ? `${djangoBaseUrl}${relativeUrl}`
        : new URL(relativeUrl, djangoBaseUrl).href;
    } catch {
      return null;
    }
  }
  return relativeUrl;
};

interface PropertyListSummary {
  id: number;
  name: string;
  address: string;
  city: string;
  property_category: 'COMPLETE_UNIT' | 'ROOM';
  type_display: string;
  property_category_display?: string;
  bedrooms?: number | null;
  primary_image: string | null;
  status: 'AVAILABLE' | 'OCCUPIED' | 'MAINTENANCE' | 'NOT_AVAILABLE';
  status_display: string;
  landlord_name?: string;
}

const money = (v: string | number | null | undefined) =>
  `$${Number(v ?? 0).toLocaleString('en-US', { maximumFractionDigits: 0 })}`;

export default function LandlordOverview({
  onNavigate,
}: {
  onNavigate: (section: string) => void;
}) {
  const [hoveredListing, setHoveredListing] = useState<number | null>(null);
  const { user, token } = useAuth();
  const router = useRouter();

  const [properties, setProperties] = useState<PropertyListSummary[]>([]);
  const [summary, setSummary] = useState<LedgerSummary | null>(null);
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);
  // Server-computed Action Center items. null = endpoint not available
  // (backend Phase B not deployed yet) → fall back to the client-side
  // assembly below. See docs/phase-b-spec.md.
  const [attention, setAttention] = useState<ActionItem[] | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      setIsLoading(false);
      setError('Authentication required to load data.');
      return;
    }
    const load = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const propsRes = await fetch(`${DJANGO_API_URL}/properties/`, {
          headers: { Authorization: `Token ${token}` },
        });
        if (!propsRes.ok) {
          const e = await propsRes.json().catch(() => ({}));
          throw new Error(
            e.detail || `Failed to fetch properties (${propsRes.status})`
          );
        }
        setProperties(await propsRes.json());
        // These are best-effort — a failure here shouldn't blank the page.
        const [sum, wos, att] = await Promise.all([
          fetchSummary(token, { months: 1 }).catch(() => null),
          fetchWorkOrders(token).catch(() => [] as WorkOrder[]),
          fetchAttention(token).catch(() => null),
        ]);
        setSummary(sum);
        setWorkOrders(wos);
        setAttention(att);
      } catch (err) {
        const message =
          err instanceof Error ? err.message : 'An unknown error occurred';
        setError(message);
        toast.error(`Failed to load dashboard: ${message}`);
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, [token]);

  // --- Stats ---
  const totalListings = properties.length;
  const unitCount = properties.filter(
    (p) => p.property_category === 'COMPLETE_UNIT'
  ).length;
  const roomCount = properties.filter(
    (p) => p.property_category === 'ROOM'
  ).length;
  const occupiedCount = properties.filter(
    (p) => p.status === 'OCCUPIED'
  ).length;
  const thisMonth = summary?.monthly?.[summary.monthly.length - 1];

  const stats = [
    {
      title: 'Total Listings',
      value:
        isLoading && totalListings === 0 ? (
          <Loader2 className="h-6 w-6 animate-spin" />
        ) : (
          totalListings.toString()
        ),
      details: `${unitCount} Full Units, ${roomCount} Rooms`,
      icon: Building2,
      color: 'bg-blue-50 text-blue-600',
      navigate: 'properties',
    },
    {
      title: 'Occupied',
      value: `${occupiedCount}/${totalListings || 0}`,
      details: 'Units & rooms currently let',
      icon: Users,
      color: 'bg-green-50 text-green-600',
      navigate: 'leases',
    },
    {
      title: 'Expected This Month',
      value: thisMonth ? (
        money(thisMonth.expected_income)
      ) : isLoading ? (
        <Loader2 className="h-6 w-6 animate-spin" />
      ) : (
        '$0'
      ),
      // "Expected $0 · $0 collected" is technically right and practically
      // misleading when a deposit landed or rent starts next month — say
      // what actually happened with the money (docs/phase-b-spec.md B1).
      details: thisMonth ? (
        <>
          {money(thisMonth.collected_income)} collected so far
          {Number(thisMonth.deposits_collected ?? 0) > 0 && (
            <span className="text-ok-ink">
              {' '}
              · +{money(thisMonth.deposits_collected)} deposits
            </span>
          )}
          {Number(thisMonth.expected_income) === 0 && summary?.next_charge && (
            <span className="block">
              Next charge:{' '}
              {new Date(
                summary.next_charge.due_date + 'T00:00:00'
              ).toLocaleDateString('en-CA', {
                month: 'short',
                day: 'numeric',
              })}{' '}
              — {money(summary.next_charge.amount)} (
              {summary.next_charge.property_name})
            </span>
          )}
        </>
      ) : (
        'From active leases'
      ),
      icon: DollarSign,
      color: 'bg-amber-50 text-amber-600',
      navigate: 'financial',
    },
  ];

  // --- Occupancy ---
  const totalUnits = properties.length;
  const overallOccupancyRate =
    totalUnits > 0 ? Math.round((occupiedCount / totalUnits) * 100) : 0;
  const totalCompleteUnits = unitCount;
  const occupiedCompleteUnits = properties.filter(
    (l) => l.property_category === 'COMPLETE_UNIT' && l.status === 'OCCUPIED'
  ).length;
  const unitOccupancyRate =
    totalCompleteUnits > 0
      ? Math.round((occupiedCompleteUnits / totalCompleteUnits) * 100)
      : 0;
  const totalRooms = roomCount;
  const occupiedRooms = properties.filter(
    (l) => l.property_category === 'ROOM' && l.status === 'OCCUPIED'
  ).length;
  const roomOccupancyRate =
    totalRooms > 0 ? Math.round((occupiedRooms / totalRooms) * 100) : 0;

  // --- Real upcoming tasks: SLA-breached / new work orders + overdue rent ---
  const taskItems = React.useMemo(() => {
    const tasks: {
      id: string;
      title: string;
      sub: string;
      type: 'maintenance' | 'lease';
      navigate: string;
    }[] = [];
    workOrders
      .filter((w) => w.sla_breached || w.status === 'NEW')
      .slice(0, 4)
      .forEach((w) =>
        tasks.push({
          id: `wo-${w.id}`,
          title: w.sla_breached
            ? `Overdue: ${w.title}`
            : `New request: ${w.title}`,
          sub: `${w.property_name}${w.is_rta_emergency ? ' · RTA emergency' : ''}`,
          type: 'maintenance',
          navigate: 'maintenance',
        })
      );
    if (summary && summary.overdue_count > 0) {
      tasks.push({
        id: 'overdue',
        title: `${summary.overdue_count} overdue charge(s)`,
        sub: `${money(summary.outstanding_total)} outstanding`,
        type: 'lease',
        navigate: 'financial',
      });
    }
    return tasks.slice(0, 5);
  }, [workOrders, summary]);

  if (isLoading && properties.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-200px)]">
        <Loader2 className="h-12 w-12 animate-spin text-ink-2" />
      </div>
    );
  }

  if (error) {
    return (
      <Card className="border-destructive bg-red-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-destructive">
            <AlertCircle className="h-5 w-5" /> Error Loading Dashboard
          </CardTitle>
          <CardDescription className="text-red-700">{error}</CardDescription>
        </CardHeader>
        <CardContent>
          <Button variant="outline" onClick={() => window.location.reload()}>
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-semibold text-ink">
            Welcome{user?.name ? `, ${user.name.split(' ')[0]}` : ''}!
          </h1>
          <p className="text-ink-3 mt-1">
            Here&apos;s what&apos;s happening with your properties today.
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
        {stats.map((stat, index) => (
          <Card
            key={index}
            className="hover:shadow-md transition-all cursor-pointer border-l-4 border-transparent hover:border-l-blue-500"
            onClick={() => onNavigate(stat.navigate)}
          >
            <CardContent className="p-5 md:p-6">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <p className="text-sm font-medium text-ink-3">{stat.title}</p>
                  <div className="text-2xl md:text-3xl font-semibold h-8 flex items-center">
                    {stat.value}
                  </div>
                  <p className="text-xs text-ink-3 pt-0.5">{stat.details}</p>
                </div>
                <div className={`p-3 rounded-lg ${stat.color}`}>
                  <stat.icon className="h-5 w-5 md:h-6 md:w-6" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 xl:gap-8">
        {/* Listings */}
        <div className="lg:col-span-2">
          <Card className="h-full shadow-sm border">
            <CardHeader className="flex flex-row justify-between items-center bg-canvas/60 border-b px-4 py-3 md:px-6 md:py-4">
              <div>
                <CardTitle className="text-lg">Your Listings</CardTitle>
                <CardDescription className="text-xs md:text-sm">
                  Quick overview of your properties.
                </CardDescription>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => onNavigate('properties')}
              >
                <Building2 className="h-4 w-4 mr-1.5" /> View All
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              {properties.length > 0 ? (
                <ul className="divide-y divide-line">
                  {properties.slice(0, 5).map((listing) => {
                    const imageUrl = getFullImageUrl(listing.primary_image);
                    const handleClick = () =>
                      router.push(`/dashboard/properties/${listing.id}`);
                    return (
                      <li
                        key={listing.id}
                        className={cn(
                          'hover:bg-canvas cursor-pointer transition-colors',
                          hoveredListing === listing.id && 'bg-canvas'
                        )}
                        onClick={handleClick}
                        onMouseEnter={() => setHoveredListing(listing.id)}
                        onMouseLeave={() => setHoveredListing(null)}
                        role="link"
                        tabIndex={0}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') handleClick();
                        }}
                      >
                        <div className="flex items-center justify-between p-3 md:p-4 space-x-3">
                          <div className="flex-shrink-0 w-12 h-12 md:w-16 md:h-16 bg-surface-sunken rounded-md overflow-hidden border">
                            {imageUrl ? (
                              <img
                                src={imageUrl}
                                alt={listing.name ?? 'Property'}
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                  e.currentTarget.src = '/placeholder.svg';
                                }}
                                loading="lazy"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-ink-4">
                                <ImageIcon className="w-6 h-6" />
                              </div>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="text-sm font-medium text-ink truncate">
                              {listing.name ?? 'Unnamed Property'}
                            </h3>
                            <p className="text-xs text-ink-3 truncate">
                              {listing.address}, {listing.city}
                            </p>
                            <div className="flex items-center mt-1.5 space-x-2 flex-wrap gap-y-1">
                              <span
                                className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${listing.property_category === 'COMPLETE_UNIT' ? 'bg-purple-100 text-purple-800' : 'bg-cyan-100 text-cyan-800'}`}
                              >
                                {listing.type_display ||
                                  listing.property_category_display ||
                                  '-'}
                              </span>
                              <span
                                className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${listing.status === 'OCCUPIED' ? 'bg-green-100 text-green-800' : listing.status === 'AVAILABLE' ? 'bg-blue-100 text-blue-800' : 'bg-amber-100 text-amber-800'}`}
                              >
                                {listing.status_display || '-'}
                              </span>
                            </div>
                          </div>
                          <div className="ml-2 text-right flex items-center shrink-0">
                            <ChevronRight
                              className={cn(
                                'h-5 w-5 text-ink-4 transition-transform duration-150',
                                hoveredListing === listing.id
                                  ? 'translate-x-0.5'
                                  : ''
                              )}
                            />
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <div className="p-6 text-center text-ink-3">
                  <HouseKeys className="mx-auto h-20 opacity-90" />
                  <p className="mt-2">No properties added yet.</p>
                  <Button
                    variant="link"
                    size="sm"
                    className="mt-2 h-auto p-0"
                    onClick={() => onNavigate('properties')}
                  >
                    Add your first property
                  </Button>
                </div>
              )}
              {properties.length > 5 && (
                <div className="p-3 text-center border-t">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onNavigate('properties')}
                    className="text-ink-2 hover:text-ink"
                  >
                    View all properties{' '}
                    <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Occupancy & Tasks */}
        <div className="space-y-6 xl:space-y-8">
          <Card className="shadow-sm border">
            <CardHeader className="bg-canvas/60 border-b px-4 py-3 md:px-6 md:py-4">
              <CardTitle className="text-lg">Occupancy Rate</CardTitle>
            </CardHeader>
            <CardContent className="p-5 md:p-6">
              {totalUnits > 0 ? (
                <div className="flex flex-col items-center">
                  <div className="relative h-28 w-28 md:h-32 md:w-32 flex items-center justify-center mb-4">
                    <svg className="h-full w-full" viewBox="0 0 100 100">
                      <circle
                        className="text-ink-inverse"
                        strokeWidth="10"
                        stroke="currentColor"
                        fill="transparent"
                        r="40"
                        cx="50"
                        cy="50"
                      />
                      <circle
                        className="text-blue-600"
                        strokeWidth="10"
                        strokeDasharray={`${overallOccupancyRate * 2.512} 251.2`}
                        strokeLinecap="round"
                        stroke="currentColor"
                        fill="transparent"
                        r="40"
                        cx="50"
                        cy="50"
                        transform="rotate(-90 50 50)"
                      />
                    </svg>
                    <div className="absolute text-center">
                      <div className="text-3xl font-bold">
                        {overallOccupancyRate}%
                      </div>
                      <div className="text-xs text-ink-3">Overall</div>
                    </div>
                  </div>
                  <div className="mt-4 w-full space-y-4">
                    {totalCompleteUnits > 0 && (
                      <div className="space-y-1">
                        <div className="flex justify-between text-xs md:text-sm">
                          <span className="text-ink-2">Full Units</span>
                          <span className="font-medium">
                            {unitOccupancyRate}%
                          </span>
                        </div>
                        <Progress value={unitOccupancyRate} className="h-2" />
                      </div>
                    )}
                    {totalRooms > 0 && (
                      <div className="space-y-1">
                        <div className="flex justify-between text-xs md:text-sm">
                          <span className="text-ink-2">Rooms</span>
                          <span className="font-medium">
                            {roomOccupancyRate}%
                          </span>
                        </div>
                        <Progress
                          value={roomOccupancyRate}
                          className="h-2 bg-cyan-100 [&>div]:bg-cyan-500"
                        />
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <p className="text-center text-sm text-ink-3 py-8">
                  No occupancy data available yet.
                </p>
              )}
            </CardContent>
          </Card>

          <Card className="shadow-sm border">
            <CardHeader className="bg-canvas/60 border-b px-4 py-3 md:px-6 md:py-4">
              <CardTitle className="text-lg">Needs Attention</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {attention !== null ? (
                // Server-computed Action Center (Phase B): province-aware
                // requirements, deadlines, overdue money — one source.
                attention.length > 0 ? (
                  <ul className="divide-y divide-line">
                    {attention.map((item) => {
                      const tint =
                        item.severity === 'urgent'
                          ? 'bg-danger-soft text-danger-ink'
                          : item.severity === 'soon'
                            ? 'bg-warn-soft text-warn-ink'
                            : 'bg-info-soft text-info-ink';
                      const go = () => {
                        const section = item.url.match(
                          /^\/dashboard\/([^/]+)/
                        )?.[1];
                        if (section) onNavigate(section);
                        else router.push(item.url);
                      };
                      return (
                        <li
                          key={item.key}
                          className="hover:bg-canvas cursor-pointer transition-colors"
                          onClick={go}
                          role="link"
                          tabIndex={0}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') go();
                          }}
                        >
                          <div className="flex items-center p-3 md:p-4">
                            <div className={`p-2 rounded-lg mr-3 ${tint}`}>
                              {item.source === 'maintenance' ? (
                                <Wrench className="h-4 w-4" />
                              ) : item.source === 'ledger' ? (
                                <DollarSign className="h-4 w-4" />
                              ) : (
                                <FileText className="h-4 w-4" />
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-ink truncate">
                                {item.title}
                              </p>
                              <p className="text-xs text-ink-3 truncate">
                                {item.detail}
                              </p>
                            </div>
                            <ChevronRight className="h-5 w-5 text-ink-4 ml-2 shrink-0" />
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                ) : (
                  <div className="p-6 text-center">
                    <InspectionWalk className="mx-auto h-20 opacity-90" />
                    <p className="mt-2 text-sm text-ink-3">
                      Nothing needs attention. Nice.
                    </p>
                  </div>
                )
              ) : taskItems.length > 0 ? (
                <ul className="divide-y divide-line">
                  {taskItems.map((task) => (
                    <li
                      key={task.id}
                      className="hover:bg-canvas cursor-pointer transition-colors"
                      onClick={() => onNavigate(task.navigate)}
                      role="link"
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ')
                          onNavigate(task.navigate);
                      }}
                    >
                      <div className="flex items-center p-3 md:p-4">
                        <div
                          className={`p-2 rounded-lg mr-3 ${task.type === 'lease' ? 'bg-blue-100 text-blue-700' : 'bg-amber-100 text-amber-700'}`}
                        >
                          {task.type === 'lease' ? (
                            <FileText className="h-4 w-4" />
                          ) : (
                            <Wrench className="h-4 w-4" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-ink truncate">
                            {task.title}
                          </p>
                          <p className="text-xs text-ink-3 truncate">
                            {task.sub}
                          </p>
                        </div>
                        <ChevronRight className="h-5 w-5 text-ink-4 ml-2 shrink-0" />
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="p-6 text-center">
                  <InspectionWalk className="mx-auto h-20 opacity-90" />
                  <p className="mt-2 text-sm text-ink-3">
                    Nothing needs attention. Nice.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
