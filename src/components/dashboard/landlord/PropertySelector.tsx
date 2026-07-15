// PropertySelector.tsx
'use client';
import { useState, useMemo, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Search,
  Home,
  Key,
  ImageIcon,
  Info,
  Loader2,
  CheckCircle2,
  MapPin,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { DJANGO_API_URL } from '@/lib/config';

export interface SelectableProperty {
  id: number;
  name: string;
  property_category: 'COMPLETE_UNIT' | 'ROOM';
  property_category_display?: string;
  city?: string;
  province?: string;
  address?: string;
  primary_image?: string | null;
  area_summary?: string;
  bedrooms?: number | null;
  bathrooms?: string | number | null;
  group?: { id: string; name: string } | null;
}

interface ActiveLeaseSummary {
  id: string;
  lease_number: string;
  status_display: string;
  start_date: string;
  end_date: string | null;
  is_month_to_month: boolean;
  tenant_count: number;
}

// Reuses the same DJANGO_API_URL-origin derivation pattern already used
// elsewhere (PropertyList.tsx) for resolving relative image paths.
let djangoBaseUrl = '';
try {
  if (DJANGO_API_URL && DJANGO_API_URL.startsWith('http')) {
    djangoBaseUrl = new URL(DJANGO_API_URL).origin;
  }
} catch {
  // leave blank — getFullImageUrl falls back to the raw path below
}

function getFullImageUrl(relativeUrl?: string | null): string | null {
  if (!relativeUrl) return null;
  if (relativeUrl.startsWith('http') || relativeUrl.startsWith('blob:'))
    return relativeUrl;
  if (!djangoBaseUrl) return relativeUrl;
  try {
    const path = relativeUrl.startsWith('/')
      ? relativeUrl.substring(1)
      : relativeUrl;
    return new URL(path, djangoBaseUrl).href;
  } catch {
    return relativeUrl;
  }
}

interface PropertySelectorProps {
  properties: SelectableProperty[];
  selectedId: string;
  onSelect: (propertyId: string) => void;
}

export default function PropertySelector({
  properties,
  selectedId,
  onSelect,
}: PropertySelectorProps) {
  const { token } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [detailsFor, setDetailsFor] = useState<SelectableProperty | null>(null);
  const [activeLeases, setActiveLeases] = useState<ActiveLeaseSummary[]>([]);
  const [isLoadingLeases, setIsLoadingLeases] = useState(false);

  const filtered = useMemo(() => {
    const term = searchTerm.toLowerCase();
    if (!term) return properties;
    return properties.filter(
      (p) =>
        p.name?.toLowerCase().includes(term) ||
        p.address?.toLowerCase().includes(term) ||
        p.city?.toLowerCase().includes(term)
    );
  }, [properties, searchTerm]);

  useEffect(() => {
    if (!detailsFor || !token) return;
    const loadActiveLeases = async () => {
      setIsLoadingLeases(true);
      try {
        const res = await fetch(
          `${DJANGO_API_URL}/leases/?property=${detailsFor.id}&status=ACTIVE`,
          { headers: { Authorization: `Token ${token}` } }
        );
        if (res.ok) {
          setActiveLeases(await res.json());
        } else {
          setActiveLeases([]);
        }
      } catch {
        setActiveLeases([]);
      } finally {
        setIsLoadingLeases(false);
      }
    };
    loadActiveLeases();
  }, [detailsFor, token]);

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
        <Input
          placeholder="Search by name, address, or city..."
          className="pl-8"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-10 border border-dashed rounded-md text-slate-500 text-sm">
          {properties.length === 0
            ? 'No properties found. Add one first.'
            : `No properties match "${searchTerm}".`}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 max-h-[520px] overflow-y-auto pr-1">
          {filtered.map((property) => {
            const isSelected = selectedId === property.id.toString();
            const imageUrl = getFullImageUrl(property.primary_image);
            return (
              <Card
                key={property.id}
                className={`cursor-pointer transition-all overflow-hidden ${
                  isSelected
                    ? 'ring-2 ring-slate-900 border-slate-900'
                    : 'hover:shadow-md'
                }`}
                onClick={() => onSelect(property.id.toString())}
              >
                <div className="relative h-32 bg-slate-100">
                  {imageUrl ? (
                    <img
                      src={imageUrl}
                      alt={property.name}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = 'none';
                      }}
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-slate-300">
                      <ImageIcon className="h-8 w-8" />
                    </div>
                  )}
                  {isSelected && (
                    <div className="absolute top-2 right-2 bg-slate-900 text-white rounded-full p-1">
                      <CheckCircle2 className="h-4 w-4" />
                    </div>
                  )}
                  <Badge
                    variant="outline"
                    className="absolute top-2 left-2 text-xs bg-white/90"
                  >
                    {property.property_category === 'ROOM' ? (
                      <Key className="h-3 w-3 mr-1" />
                    ) : (
                      <Home className="h-3 w-3 mr-1" />
                    )}
                    {property.property_category_display ||
                      (property.property_category === 'ROOM'
                        ? 'Room'
                        : 'Complete Unit')}
                  </Badge>
                </div>
                <CardContent className="p-3 space-y-1">
                  <p
                    className="font-medium text-sm truncate"
                    title={property.name}
                  >
                    {property.name}
                  </p>
                  <p className="text-xs text-slate-500 flex items-center truncate">
                    <MapPin className="h-3 w-3 mr-1 flex-shrink-0" />
                    {property.address
                      ? `${property.address}, ${property.city}`
                      : property.city || '—'}
                  </p>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="w-full mt-2 text-xs h-7"
                    onClick={(e) => {
                      e.stopPropagation();
                      setDetailsFor(property);
                    }}
                  >
                    <Info className="h-3 w-3 mr-1" /> View Details
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog
        open={!!detailsFor}
        onOpenChange={(open) => !open && setDetailsFor(null)}
      >
        <DialogContent className="sm:max-w-lg max-h-[80vh] overflow-y-auto">
          {detailsFor && (
            <>
              <DialogHeader>
                <DialogTitle>{detailsFor.name}</DialogTitle>
                <DialogDescription>
                  {detailsFor.address
                    ? `${detailsFor.address}, ${detailsFor.city}`
                    : detailsFor.city}
                </DialogDescription>
              </DialogHeader>

              {getFullImageUrl(detailsFor.primary_image) && (
                <img
                  src={getFullImageUrl(detailsFor.primary_image) as string}
                  alt={detailsFor.name}
                  className="w-full h-48 object-cover rounded-md"
                />
              )}

              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-slate-500">Type</p>
                  <p className="font-medium">
                    {detailsFor.property_category_display ||
                      (detailsFor.property_category === 'ROOM'
                        ? 'Room'
                        : 'Complete Unit')}
                  </p>
                </div>
                {detailsFor.property_category === 'COMPLETE_UNIT' && (
                  <div>
                    <p className="text-slate-500">Bed / Bath</p>
                    <p className="font-medium">
                      {detailsFor.bedrooms ?? '—'} bd /{' '}
                      {detailsFor.bathrooms ?? '—'} ba
                    </p>
                  </div>
                )}
                {detailsFor.group && (
                  <div className="col-span-2">
                    <p className="text-slate-500">Group</p>
                    <p className="font-medium">{detailsFor.group.name}</p>
                  </div>
                )}
                {detailsFor.area_summary && (
                  <div className="col-span-2">
                    <p className="text-slate-500">Areas</p>
                    <p className="font-medium">{detailsFor.area_summary}</p>
                  </div>
                )}
              </div>

              <div>
                <p className="text-sm font-medium mb-2">Active Leases</p>
                {isLoadingLeases ? (
                  <div className="flex items-center text-sm text-slate-500">
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />{' '}
                    Checking...
                  </div>
                ) : activeLeases.length === 0 ? (
                  <p className="text-sm text-slate-500">
                    No active lease on this property right now.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {activeLeases.map((lease) => (
                      <div
                        key={lease.id}
                        className="text-sm border rounded-md p-2 flex justify-between"
                      >
                        <span>{lease.lease_number}</span>
                        <span className="text-slate-500">
                          {lease.start_date} –{' '}
                          {lease.is_month_to_month ? 'ongoing' : lease.end_date}
                        </span>
                      </div>
                    ))}
                    <p className="text-xs text-amber-600">
                      A month-to-month lease here will automatically get an end
                      date set to a new lease&apos;s start date once that new
                      lease is signed. A fixed-term overlap won&apos;t be
                      changed automatically — you&apos;ll need to resolve it
                      manually (e.g. terminate the old one) if you go ahead.
                    </p>
                  </div>
                )}
              </div>

              <Button
                type="button"
                className="w-full"
                onClick={() => {
                  onSelect(detailsFor.id.toString());
                  setDetailsFor(null);
                }}
              >
                Select This Property
              </Button>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
