// TenantMaintenance.tsx
//
// The tenant's maintenance section, wired to /api/maintenance/work-orders/.
// Tenants can: submit a request (with area, category, priority, photos),
// track its status (the landlord moves it through the FSM), and talk to
// the landlord in the per-ticket comment thread. Status changes are
// deliberately NOT possible here — the backend only lets landlords call
// /transition/, so this UI shows status instead of editing it.

'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { format, formatDistanceToNow, parseISO } from 'date-fns';
import {
  AlertTriangle,
  Camera,
  CheckCircle2,
  ChevronRight,
  Clock,
  Loader2,
  MessageSquare,
  Plus,
  Send,
  Wrench,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import {
  addWorkOrderComment,
  addWorkOrderImage,
  createWorkOrder,
  fetchMaintenanceAreas,
  fetchWorkOrders,
  MaintenanceArea,
  WORK_ORDER_CATEGORIES,
  WORK_ORDER_PRIORITIES,
  WorkOrder,
  WorkOrderCategory,
  WorkOrderPriority,
} from '@/lib/maintenanceApi';

interface TenantMaintenanceProps {
  /** Property id of the tenant's room/unit (used to scope + create). */
  propertyId: number | null;
  /** Lease id to attach to new work orders (for the property's history). */
  leaseId: string | null;
  /** e.g. "McKenzie Room A" — used in copy. */
  propertyLabel?: string;
}

const STATUS_STYLES: Record<string, string> = {
  NEW: 'bg-blue-50 text-blue-700 border-blue-200',
  SCHEDULED: 'bg-amber-50 text-amber-700 border-amber-200',
  IN_PROGRESS: 'bg-violet-50 text-violet-700 border-violet-200',
  COMPLETED: 'bg-green-50 text-green-700 border-green-200',
  CANCELLED: 'bg-slate-100 text-slate-500 border-slate-200',
};

const PRIORITY_STYLES: Record<string, string> = {
  EMERGENCY: 'bg-red-50 text-red-700 border-red-200',
  HIGH: 'bg-amber-50 text-amber-700 border-amber-200',
  MEDIUM: 'bg-slate-100 text-slate-600 border-slate-200',
  LOW: 'bg-slate-50 text-slate-500 border-slate-200',
};

const OPEN_STATUSES = ['NEW', 'SCHEDULED', 'IN_PROGRESS'];

export default function TenantMaintenance({
  propertyId,
  leaseId,
  propertyLabel,
}: TenantMaintenanceProps) {
  const { token } = useAuth();

  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selected, setSelected] = useState<WorkOrder | null>(null);

  // --- new request form state ---
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [areas, setAreas] = useState<MaintenanceArea[]>([]);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<WorkOrderCategory>('OTHER');
  const [priority, setPriority] = useState<WorkOrderPriority>('MEDIUM');
  const [areaId, setAreaId] = useState<string>('none');
  const [photos, setPhotos] = useState<File[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // --- comment state (in the detail dialog) ---
  const [commentBody, setCommentBody] = useState('');
  const [isCommenting, setIsCommenting] = useState(false);

  const load = useCallback(async () => {
    if (!token) return;
    setIsLoading(true);
    try {
      // The backend already scopes to this tenant's visible space; the
      // property filter just keeps multi-lease tenants focused.
      const orders = await fetchWorkOrders(
        token,
        propertyId ? { property: propertyId } : {}
      );
      setWorkOrders(orders);
    } catch (err) {
      toast.error(
        err instanceof Error
          ? err.message
          : 'Failed to load maintenance requests.'
      );
    } finally {
      setIsLoading(false);
    }
  }, [token, propertyId]);

  useEffect(() => {
    load();
  }, [load]);

  // Areas are lazy-loaded the first time the form opens.
  const openForm = async () => {
    setIsFormOpen(true);
    if (token && propertyId && areas.length === 0) {
      try {
        setAreas(await fetchMaintenanceAreas(token, propertyId));
      } catch {
        // Non-fatal — the request can still be filed property-wide.
      }
    }
  };

  const resetForm = () => {
    setTitle('');
    setDescription('');
    setCategory('OTHER');
    setPriority('MEDIUM');
    setAreaId('none');
    setPhotos([]);
  };

  const handleSubmit = async () => {
    if (!token || !propertyId) {
      toast.error(
        'Missing property information — please refresh and try again.'
      );
      return;
    }
    if (!title.trim() || !description.trim()) {
      toast.error('Please give the request a title and a description.');
      return;
    }
    setIsSubmitting(true);
    try {
      const created = await createWorkOrder(token, {
        property_id: propertyId,
        lease_id: leaseId,
        area_id: areaId !== 'none' ? Number(areaId) : null,
        title: title.trim(),
        description: description.trim(),
        category,
        priority,
      });
      // Photos are attached after creation (separate multipart endpoint).
      for (const file of photos) {
        try {
          await addWorkOrderImage(token, created.id, file);
        } catch {
          toast.error(
            `Couldn't upload ${file.name} — you can add it from the request later.`
          );
        }
      }
      toast.success(
        'Maintenance request submitted — your landlord has been notified.'
      );
      resetForm();
      setIsFormOpen(false);
      load();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : 'Failed to submit the request.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddComment = async () => {
    if (!token || !selected || !commentBody.trim()) return;
    setIsCommenting(true);
    try {
      const comment = await addWorkOrderComment(
        token,
        selected.id,
        commentBody.trim()
      );
      const updated = {
        ...selected,
        comments: [...selected.comments, comment],
      };
      setSelected(updated);
      setWorkOrders((prev) =>
        prev.map((w) => (w.id === updated.id ? updated : w))
      );
      setCommentBody('');
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : 'Failed to post comment.'
      );
    } finally {
      setIsCommenting(false);
    }
  };

  const openOrders = useMemo(
    () => workOrders.filter((w) => OPEN_STATUSES.includes(w.status)),
    [workOrders]
  );
  const closedOrders = useMemo(
    () => workOrders.filter((w) => !OPEN_STATUSES.includes(w.status)),
    [workOrders]
  );

  const statusBadge = (w: WorkOrder) => (
    <Badge variant="outline" className={cn('text-xs', STATUS_STYLES[w.status])}>
      {w.status === 'COMPLETED' && <CheckCircle2 className="h-3 w-3 mr-1" />}
      {w.status_display}
    </Badge>
  );

  const row = (w: WorkOrder) => (
    <button
      key={w.id}
      type="button"
      onClick={() => setSelected(w)}
      className="flex w-full items-center gap-3 border-b p-4 text-left last:border-b-0 hover:bg-slate-50 transition-colors"
    >
      <div
        className={cn(
          'flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full',
          w.priority === 'EMERGENCY'
            ? 'bg-red-50 text-red-600'
            : 'bg-slate-100 text-slate-500'
        )}
      >
        {w.priority === 'EMERGENCY' ? (
          <AlertTriangle className="h-4 w-4" />
        ) : (
          <Wrench className="h-4 w-4" />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="truncate text-sm font-medium text-slate-900">
            {w.title}
          </span>
          <Badge
            variant="outline"
            className={cn(
              'hidden sm:inline-flex text-xs',
              PRIORITY_STYLES[w.priority]
            )}
          >
            {w.priority_display}
          </Badge>
        </div>
        <p className="mt-0.5 truncate text-xs text-slate-500">
          {w.category_display}
          {w.area_name ? ` · ${w.area_name}` : ''}
          {' · '}
          {formatDistanceToNow(parseISO(w.created_at), { addSuffix: true })}
          {w.comments.length > 0 && (
            <span className="ml-2 inline-flex items-center gap-0.5">
              <MessageSquare className="h-3 w-3" /> {w.comments.length}
            </span>
          )}
        </p>
      </div>
      {statusBadge(w)}
      <ChevronRight className="h-4 w-4 flex-shrink-0 text-slate-300" />
    </button>
  );

  return (
    <div className="space-y-6">
      {/* Header row */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-slate-500">
            {openOrders.length === 0
              ? "No open requests — everything's in order."
              : `${openOrders.length} open request${openOrders.length === 1 ? '' : 's'}`}
            {propertyLabel ? ` · ${propertyLabel}` : ''}
          </p>
        </div>
        <Button className="bg-slate-900 hover:bg-slate-800" onClick={openForm}>
          <Plus className="h-4 w-4 mr-1" /> New Request
        </Button>
      </div>

      {/* Emergency guidance — always visible, small */}
      <p className="text-xs text-slate-500">
        For urgent issues (no heat or water, major leak, electrical hazard,
        broken exterior lock), submit with{' '}
        <span className="font-medium">Emergency</span> priority <em>and</em>{' '}
        contact your landlord directly. If anyone is in danger, call emergency
        services first.
      </p>

      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
        </div>
      ) : workOrders.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Wrench className="h-12 w-12 text-slate-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-slate-700 mb-1">
              No maintenance requests yet
            </h3>
            <p className="text-sm text-slate-500 mb-4">
              Something broken, leaking, or not working
              {propertyLabel ? ` in ${propertyLabel}` : ''}? Let your landlord
              know.
            </p>
            <Button
              className="bg-slate-900 hover:bg-slate-800"
              onClick={openForm}
            >
              <Plus className="h-4 w-4 mr-1" /> Submit your first request
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Open Requests</CardTitle>
              <CardDescription>
                Your landlord sees these and updates their status as work
                progresses
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              {openOrders.length > 0 ? (
                openOrders.map(row)
              ) : (
                <p className="p-6 text-center text-sm text-slate-500">
                  Nothing open right now.
                </p>
              )}
            </CardContent>
          </Card>
          {closedOrders.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">Completed & Cancelled</CardTitle>
              </CardHeader>
              <CardContent className="p-0">{closedOrders.map(row)}</CardContent>
            </Card>
          )}
        </div>
      )}

      {/* ---------------- New Request Dialog ---------------- */}
      <Dialog
        open={isFormOpen}
        onOpenChange={(open) => {
          if (!isSubmitting) setIsFormOpen(open);
        }}
      >
        <DialogContent className="sm:max-w-[520px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>New Maintenance Request</DialogTitle>
            <DialogDescription>
              Describe the issue{propertyLabel ? ` at ${propertyLabel}` : ''} —
              photos help a lot.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="wo-title">What&apos;s the issue?*</Label>
              <Input
                id="wo-title"
                placeholder="e.g. Kitchen sink is leaking"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                maxLength={200}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="wo-desc">Details*</Label>
              <Textarea
                id="wo-desc"
                rows={4}
                value={description}
                placeholder="When did it start? Where exactly? Anything you've tried?"
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Category*</Label>
                <Select
                  value={category}
                  onValueChange={(v) => setCategory(v as WorkOrderCategory)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {WORK_ORDER_CATEGORIES.map((c) => (
                      <SelectItem key={c.value} value={c.value}>
                        {c.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Where is it?</Label>
                <Select value={areaId} onValueChange={setAreaId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select area..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">My room / whole unit</SelectItem>
                    {areas.map((a) => (
                      <SelectItem key={a.id} value={String(a.id)}>
                        {a.name}
                        {a.kind_display ? ` (${a.kind_display})` : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Priority*</Label>
              <Select
                value={priority}
                onValueChange={(v) => setPriority(v as WorkOrderPriority)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {WORK_ORDER_PRIORITIES.map((p) => (
                    <SelectItem key={p.value} value={p.value}>
                      <span className="font-medium">{p.label}</span>
                      <span className="text-slate-500"> — {p.hint}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {/* Photos */}
            <div className="space-y-1.5">
              <Label>Photos (optional)</Label>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={(e) => {
                  const files = Array.from(e.target.files ?? []);
                  if (files.length)
                    setPhotos((prev) => [...prev, ...files].slice(0, 6));
                  e.target.value = '';
                }}
              />
              <div className="flex flex-wrap items-center gap-2">
                {photos.map((f, i) => (
                  <span
                    key={`${f.name}-${i}`}
                    className="inline-flex items-center gap-1 rounded-md border bg-slate-50 px-2 py-1 text-xs text-slate-600"
                  >
                    <Camera className="h-3 w-3" />{' '}
                    {f.name.length > 22 ? `${f.name.slice(0, 20)}…` : f.name}
                    <button
                      type="button"
                      onClick={() =>
                        setPhotos((prev) => prev.filter((_, j) => j !== i))
                      }
                    >
                      <X className="h-3 w-3 text-slate-400 hover:text-slate-700" />
                    </button>
                  </span>
                ))}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Camera className="h-4 w-4 mr-1" /> Add photo
                </Button>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              disabled={isSubmitting}
              onClick={() => setIsFormOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              className="bg-slate-900 hover:bg-slate-800"
              disabled={isSubmitting}
              onClick={handleSubmit}
            >
              {isSubmitting && (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              )}{' '}
              Submit Request
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ---------------- Detail Dialog ---------------- */}
      <Dialog
        open={!!selected}
        onOpenChange={(open) => {
          if (!open) setSelected(null);
        }}
      >
        <DialogContent className="sm:max-w-[560px] max-h-[90vh] overflow-y-auto">
          {selected && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 pr-6">
                  {selected.title}
                </DialogTitle>
                <DialogDescription className="flex flex-wrap items-center gap-2 pt-1">
                  {statusBadge(selected)}
                  <Badge
                    variant="outline"
                    className={cn(
                      'text-xs',
                      PRIORITY_STYLES[selected.priority]
                    )}
                  >
                    {selected.priority_display}
                  </Badge>
                  <span className="text-xs text-slate-500">
                    {selected.category_display}
                    {selected.area_name ? ` · ${selected.area_name}` : ''}
                  </span>
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <p className="whitespace-pre-wrap text-sm text-slate-700">
                  {selected.description}
                </p>

                <div className="grid grid-cols-2 gap-3 text-xs text-slate-500">
                  <div>
                    <span className="block text-slate-400">Submitted</span>
                    {format(
                      parseISO(selected.created_at),
                      'MMM d, yyyy'
                    )} by {selected.reported_by_name}
                  </div>
                  {selected.scheduled_date && (
                    <div>
                      <span className="block text-slate-400">
                        Scheduled for
                      </span>
                      <span className="inline-flex items-center gap-1 text-slate-700 font-medium">
                        <Clock className="h-3 w-3" />
                        {format(
                          parseISO(selected.scheduled_date),
                          'MMM d, yyyy'
                        )}
                      </span>
                    </div>
                  )}
                  {selected.completed_date && (
                    <div>
                      <span className="block text-slate-400">Completed</span>
                      {format(parseISO(selected.completed_date), 'MMM d, yyyy')}
                    </div>
                  )}
                  {selected.contractor_name && (
                    <div>
                      <span className="block text-slate-400">Contractor</span>
                      {selected.contractor_name}
                    </div>
                  )}
                </div>

                {selected.images.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {selected.images.map((img) => (
                      <a
                        key={img.id}
                        href={img.image}
                        target="_blank"
                        rel="noreferrer"
                        className="block h-20 w-20 overflow-hidden rounded-md border"
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={img.image}
                          alt={img.caption || 'Attachment'}
                          className="h-full w-full object-cover"
                        />
                      </a>
                    ))}
                  </div>
                )}

                {/* Comment thread */}
                <div className="border-t pt-3">
                  <p className="mb-2 text-sm font-medium text-slate-700">
                    Conversation
                  </p>
                  {selected.comments.length === 0 ? (
                    <p className="text-xs text-slate-400">No comments yet.</p>
                  ) : (
                    <ul className="space-y-2 max-h-56 overflow-y-auto pr-1">
                      {selected.comments.map((c) => (
                        <li
                          key={c.id}
                          className={cn(
                            'rounded-md p-2.5 text-sm',
                            c.is_landlord ? 'bg-blue-50' : 'bg-slate-50'
                          )}
                        >
                          <div className="mb-0.5 flex items-center justify-between text-xs text-slate-500">
                            <span className="font-medium text-slate-700">
                              {c.author_name}
                              {c.is_landlord ? ' (Landlord)' : ''}
                            </span>
                            <span>
                              {formatDistanceToNow(parseISO(c.created_at), {
                                addSuffix: true,
                              })}
                            </span>
                          </div>
                          <p className="whitespace-pre-wrap text-slate-700">
                            {c.body}
                          </p>
                        </li>
                      ))}
                    </ul>
                  )}
                  {selected.status !== 'CANCELLED' && (
                    <div className="mt-3 flex items-start gap-2">
                      <Textarea
                        rows={2}
                        value={commentBody}
                        placeholder="Add a comment for your landlord..."
                        onChange={(e) => setCommentBody(e.target.value)}
                        className="text-sm"
                      />
                      <Button
                        size="icon"
                        className="bg-slate-900 hover:bg-slate-800 flex-shrink-0"
                        disabled={isCommenting || !commentBody.trim()}
                        onClick={handleAddComment}
                      >
                        {isCommenting ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Send className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
