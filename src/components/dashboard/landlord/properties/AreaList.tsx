// AreaList.tsx
'use client';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { MoreHorizontal, Edit, Trash2, Home, Users } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

// Minimal property info nested in shared_by_details (from BasicPropertySerializer)
export interface SharedByPropertyInfo {
  id: number;
  name: string;
  property_category: 'ROOM' | 'COMPLETE_UNIT';
}

// Matches the refactored PropertyAreaSerializer:
// - is_shared / is_private_to_room are GONE
// - shared_by: writable list of Property IDs (returned on read too)
// - shared_by_details: read-only nested property info
// - 'property' FK is write_only on the serializer, so it is NOT in responses
export interface AreaData {
  id: number;
  area_type: string; // e.g. 'KITCHEN'
  area_type_display: string; // e.g. 'Kitchen'
  count: number;
  description?: string | null;
  shared_by: number[];
  shared_by_details: SharedByPropertyInfo[];
  created_at: string;
  updated_at: string;
}

interface AreaListProps {
  areas: AreaData[];
  onEdit: (area: AreaData) => void;
  onDelete: (areaId: number) => void;
  isLoading?: boolean;
  /** ID of the property whose detail page is rendering this list.
   *  Used to phrase sharing status from this property's perspective. */
  currentPropertyId?: number;
}

export default function AreaList({
  areas,
  onEdit,
  onDelete,
  isLoading = false,
  currentPropertyId,
}: AreaListProps) {
  // Status is now DERIVED from the single shared_by relation — no parallel flags.
  const getStatusInfo = (
    area: AreaData
  ): {
    icon: React.ElementType;
    text: string;
    tooltip: string;
    variant: 'outline' | 'secondary';
  } => {
    const details = area.shared_by_details ?? [];

    // Properties sharing this area other than the one we're currently viewing
    const others =
      currentPropertyId != null
        ? details.filter((p) => p.id !== currentPropertyId)
        : details;

    // Empty shared_by (or only the primary/current property) => private
    const isShared = others.length > 0 && details.length > 1;

    if (isShared) {
      const names = others.map((p) => p.name).join(', ');
      return {
        icon: Users,
        text: `Shared (${details.length})`,
        tooltip: `Shared with: ${names}`,
        variant: 'secondary',
      };
    }
    return {
      icon: Home,
      text: 'Private',
      tooltip: 'Private to this property',
      variant: 'outline',
    };
  };

  if (!areas || areas.length === 0) {
    return (
      <p className="text-center text-ink-3 py-6">
        No specific areas defined yet.
      </p>
    );
  }

  return (
    <TooltipProvider>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Area Type</TableHead>
            <TableHead className="w-[60px] text-center">Count</TableHead>
            <TableHead className="w-[140px]">Status</TableHead>
            <TableHead>Description</TableHead>
            <TableHead className="w-[60px] text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {areas.map((area) => {
            const statusInfo = getStatusInfo(area);
            return (
              <TableRow key={area.id}>
                <TableCell className="font-medium">
                  {area.area_type_display}
                </TableCell>
                <TableCell className="text-center">{area.count}</TableCell>
                <TableCell>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span className="inline-block">
                        <Badge
                          variant={statusInfo.variant}
                          className="cursor-help text-xs"
                        >
                          <statusInfo.icon className="h-3 w-3 mr-1 flex-shrink-0" />
                          {statusInfo.text}
                        </Badge>
                      </span>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>{statusInfo.tooltip}</p>
                    </TooltipContent>
                  </Tooltip>
                </TableCell>
                <TableCell className="text-sm text-ink-2">
                  {area.description || <span className="text-ink-4">-</span>}
                </TableCell>
                <TableCell className="text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        disabled={isLoading}
                      >
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => onEdit(area)}>
                        <Edit className="mr-2 h-4 w-4" /> Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className="text-red-600 focus:text-red-600"
                        onClick={() => onDelete(area.id)}
                      >
                        <Trash2 className="mr-2 h-4 w-4" /> Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </TooltipProvider>
  );
}
