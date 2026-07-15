// MaintenanceRequests.tsx
'use client';
import { useCallback, useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Wrench,
  AlertCircle,
  CheckCircle,
  Clock,
  Plus,
  Search,
  Loader2,
  ShieldAlert,
  Flame,
  CalendarClock,
  MessageSquare,
  Send,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import {
  fetchWorkOrders,
  createWorkOrder,
  updateWorkOrder,
  transitionWorkOrder,
  completeWorkOrder,
  addComment,
  fetchAreas,
  CATEGORIES,
  PRIORITIES,
  type WorkOrder,
  type WorkOrderStatus,
  type WorkOrderCategory,
  type WorkOrderPriority,
  type Area,
} from '@/lib/maintenanceApi';
import { fetchProperties, type PropertyLite } from '@/lib/financeApi';

const money = (v: string | number | null | undefined) =>
  v == null
    ? '—'
    : `$${Number(v).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const STATUS_PILL: Record<WorkOrderStatus, string> = {
  NEW: 'bg-amber-50 text-amber-700',
  SCHEDULED: 'bg-purple-50 text-purple-700',
  IN_PROGRESS: 'bg-blue-50 text-blue-700',
  COMPLETED: 'bg-green-50 text-green-700',
  CANCELLED: 'bg-surface-sunken text-ink-3',
};

const PRIORITY_PILL: Record<WorkOrderPriority, string> = {
  LOW: 'bg-surface-sunken text-ink-2',
  MEDIUM: 'bg-blue-50 text-blue-700',
  HIGH: 'bg-amber-50 text-amber-700',
  EMERGENCY: 'bg-red-50 text-red-700',
};

function slaLabel(wo: WorkOrder): { text: string; cls: string } | null {
  if (['COMPLETED', 'CANCELLED'].includes(wo.status)) return null;
  if (wo.sla_breached)
    return { text: 'SLA breached', cls: 'bg-red-50 text-red-700' };
  if (!wo.sla_due_at || wo.status !== 'NEW') return null;
  const hrs = (new Date(wo.sla_due_at).getTime() - Date.now()) / 36e5;
  if (hrs <= 24)
    return {
      text: `${Math.max(0, Math.round(hrs))}h to respond`,
      cls: 'bg-amber-50 text-amber-700',
    };
  return {
    text: `${Math.round(hrs / 24)}d to respond`,
    cls: 'bg-surface-sunken text-ink-3',
  };
}

export default function MaintenanceRequests() {
  const { token } = useAuth();
  const [orders, setOrders] = useState<WorkOrder[]>([]);
  const [properties, setProperties] = useState<PropertyLite[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [createOpen, setCreateOpen] = useState(false);
  const [manage, setManage] = useState<WorkOrder | null>(null);

  const reload = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const data = await fetchWorkOrders(token, {
        status:
          statusFilter === 'all'
            ? undefined
            : (statusFilter as WorkOrderStatus),
        search: search || undefined,
      });
      setOrders(data);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : 'Failed to load work orders.'
      );
    } finally {
      setLoading(false);
    }
  }, [token, statusFilter, search]);

  useEffect(() => {
    reload();
  }, [reload]);
  useEffect(() => {
    if (token)
      fetchProperties(token)
        .then(setProperties)
        .catch(() => {});
  }, [token]);

  const counts = {
    NEW: orders.filter((o) => o.status === 'NEW').length,
    IN_PROGRESS: orders.filter((o) => o.status === 'IN_PROGRESS').length,
    COMPLETED: orders.filter((o) => o.status === 'COMPLETED').length,
  };
  const breaches = orders.filter((o) => o.sla_breached).length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-ink">Maintenance</h1>
          <p className="text-ink-3 text-sm mt-1">
            Track work orders, response deadlines, and costs.
          </p>
        </div>
        <div className="flex gap-2 w-full md:w-auto">
          <div className="relative flex-1 md:flex-initial">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-ink-4" />
            <Input
              placeholder="Search…"
              className="pl-8"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Button
            className="whitespace-nowrap"
            onClick={() => setCreateOpen(true)}
          >
            <Plus className="h-4 w-4 mr-1" /> New Work Order
          </Button>
        </div>
      </div>

      {breaches > 0 && (
        <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-r-md flex items-start gap-3">
          <ShieldAlert className="h-5 w-5 text-red-600 mt-0.5 flex-shrink-0" />
          <div>
            <h3 className="text-sm font-medium text-red-800">
              {breaches} work order(s) past their response deadline
            </h3>
            <p className="text-sm text-red-700 mt-1">
              Emergency repairs under BC&apos;s RTA must be addressed promptly.
              Schedule or start these now.
            </p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <MiniStat
          label="New / unactioned"
          value={counts.NEW}
          icon={<AlertCircle className="h-5 w-5" />}
          tone="amber"
        />
        <MiniStat
          label="In progress"
          value={counts.IN_PROGRESS}
          icon={<Clock className="h-5 w-5" />}
          tone="blue"
        />
        <MiniStat
          label="Completed"
          value={counts.COMPLETED}
          icon={<CheckCircle className="h-5 w-5" />}
          tone="green"
        />
      </div>

      <div className="flex justify-between items-center gap-3">
        <h2 className="text-lg font-medium">Work Orders</h2>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[170px]">
            <SelectValue placeholder="Any status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Any status</SelectItem>
            <SelectItem value="NEW">New</SelectItem>
            <SelectItem value="SCHEDULED">Scheduled</SelectItem>
            <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
            <SelectItem value="COMPLETED">Completed</SelectItem>
            <SelectItem value="CANCELLED">Cancelled</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-line text-sm">
              <thead className="bg-canvas text-xs uppercase tracking-wider text-ink-3">
                <tr>
                  <th className="px-4 py-3 text-left">Issue</th>
                  <th className="px-4 py-3 text-left">Property / Area</th>
                  <th className="px-4 py-3 text-left">Priority</th>
                  <th className="px-4 py-3 text-left">Status</th>
                  <th className="px-4 py-3 text-left">SLA</th>
                  <th className="px-4 py-3 text-left">Origin</th>
                  <th className="px-4 py-3">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {orders.map((wo) => {
                  const sla = slaLabel(wo);
                  return (
                    <tr key={wo.id} className="hover:bg-canvas">
                      <td className="px-4 py-3">
                        <div className="font-medium text-ink flex items-center gap-1.5">
                          {wo.is_rta_emergency && (
                            <Flame
                              className="h-3.5 w-3.5 text-red-600"
                              title="RTA emergency"
                            />
                          )}
                          {wo.title}
                        </div>
                        <div className="text-xs text-ink-4">
                          {wo.category_display}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-ink-3">
                        {wo.property_name}
                        {wo.area_name ? (
                          <span className="text-ink-4"> · {wo.area_name}</span>
                        ) : null}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${PRIORITY_PILL[wo.priority]}`}
                        >
                          {wo.priority_display}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_PILL[wo.status]}`}
                        >
                          {wo.status_display}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {sla ? (
                          <span
                            className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${sla.cls}`}
                          >
                            {sla.text}
                          </span>
                        ) : (
                          <span className="text-ink-5">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-ink-3 text-xs">
                        {wo.origin_display}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setManage(wo)}
                        >
                          Manage
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {!loading && orders.length === 0 && (
            <div className="p-10 text-center">
              <Wrench className="h-10 w-10 text-ink-5 mx-auto mb-3" />
              <p className="text-sm text-ink-3">
                {search
                  ? `No work orders match "${search}"`
                  : 'No work orders yet.'}
              </p>
            </div>
          )}
          {loading && (
            <div className="p-6 flex justify-center">
              <Loader2 className="h-5 w-5 animate-spin text-ink-4" />
            </div>
          )}
        </CardContent>
      </Card>

      {createOpen && (
        <CreateWorkOrderDialog
          token={token!}
          properties={properties}
          onClose={() => setCreateOpen(false)}
          onDone={() => {
            setCreateOpen(false);
            reload();
          }}
        />
      )}
      {manage && (
        <ManageWorkOrderDialog
          token={token!}
          workOrder={manage}
          onClose={() => setManage(null)}
          onChanged={reload}
          onClosedDialog={() => setManage(null)}
        />
      )}
    </div>
  );
}

function MiniStat({
  label,
  value,
  icon,
  tone,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
  tone: 'amber' | 'blue' | 'green';
}) {
  const tones = {
    amber: 'bg-amber-50 text-amber-600',
    blue: 'bg-blue-50 text-blue-600',
    green: 'bg-green-50 text-green-600',
  };
  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-ink-3">{label}</p>
            <p className="text-2xl font-semibold">{value}</p>
          </div>
          <div className={`p-2 rounded-full ${tones[tone]}`}>{icon}</div>
        </div>
      </CardContent>
    </Card>
  );
}

// -------------------------------------------------------------- create
function CreateWorkOrderDialog({
  token,
  properties,
  onClose,
  onDone,
}: {
  token: string;
  properties: PropertyLite[];
  onClose: () => void;
  onDone: () => void;
}) {
  const [property, setProperty] = useState('');
  const [areas, setAreas] = useState<Area[]>([]);
  const [area, setArea] = useState('none');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<WorkOrderCategory>('OTHER');
  const [priority, setPriority] = useState<WorkOrderPriority>('MEDIUM');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setArea('none');
    setAreas([]);
    if (property && token)
      fetchAreas(token, property)
        .then(setAreas)
        .catch(() => {});
  }, [property, token]);

  const submit = async () => {
    setBusy(true);
    try {
      await createWorkOrder(token, {
        property_id: property,
        area_id: area === 'none' ? null : area,
        title,
        description,
        category,
        priority,
        origin: 'LANDLORD',
      });
      toast.success('Work order created.');
      onDone();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : 'Failed to create work order.'
      );
      setBusy(false);
    }
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New work order</DialogTitle>
          <DialogDescription>
            Log an issue or schedule preventive work on one of your properties.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Property</Label>
              <Select value={property} onValueChange={setProperty}>
                <SelectTrigger>
                  <SelectValue placeholder="Select" />
                </SelectTrigger>
                <SelectContent>
                  {properties.map((p) => (
                    <SelectItem key={p.id} value={String(p.id)}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Area (optional)</Label>
              <Select value={area} onValueChange={setArea} disabled={!property}>
                <SelectTrigger>
                  <SelectValue placeholder="Whole unit" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Whole unit</SelectItem>
                  {areas.map((a) => (
                    <SelectItem key={a.id} value={a.id}>
                      {a.name} · {a.kind_display}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label>Title</Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Furnace not igniting"
            />
          </div>
          <div className="space-y-2">
            <Label>Description</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Category</Label>
              <Select
                value={category}
                onValueChange={(v) => setCategory(v as WorkOrderCategory)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((c) => (
                    <SelectItem key={c.value} value={c.value}>
                      {c.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Priority</Label>
              <Select
                value={priority}
                onValueChange={(v) => setPriority(v as WorkOrderPriority)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PRIORITIES.map((p) => (
                    <SelectItem key={p.value} value={p.value}>
                      {p.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button
            className=""
            onClick={submit}
            disabled={busy || !property || !title || !description}
          >
            {busy && <Loader2 className="h-4 w-4 mr-2 animate-spin" />} Create
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// -------------------------------------------------------------- manage
function ManageWorkOrderDialog({
  token,
  workOrder,
  onChanged,
  onClosedDialog,
}: {
  token: string;
  workOrder: WorkOrder;
  onClose: () => void;
  onChanged: () => void;
  onClosedDialog: () => void;
}) {
  const [wo, setWo] = useState<WorkOrder>(workOrder);
  const [busy, setBusy] = useState<string | null>(null);
  const [scheduledDate, setScheduledDate] = useState(wo.scheduled_date ?? '');
  const [contractor, setContractor] = useState(wo.contractor_name ?? '');
  const [cost, setCost] = useState(wo.cost ?? '');
  const [postExpense, setPostExpense] = useState(true);
  const [comment, setComment] = useState('');

  const refreshLocal = (next: WorkOrder) => {
    setWo(next);
    onChanged();
  };

  const doTransition = async (status: WorkOrderStatus) => {
    setBusy(status);
    try {
      refreshLocal(await transitionWorkOrder(token, wo.id, status));
      toast.success(`Marked ${status.replace('_', ' ').toLowerCase()}.`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Transition failed.');
    } finally {
      setBusy(null);
    }
  };

  const saveDetails = async () => {
    setBusy('details');
    try {
      refreshLocal(
        await updateWorkOrder(token, wo.id, {
          scheduled_date: scheduledDate || null,
          contractor_name: contractor,
        })
      );
      toast.success('Details saved.');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save.');
    } finally {
      setBusy(null);
    }
  };

  const doComplete = async () => {
    setBusy('complete');
    try {
      refreshLocal(
        await completeWorkOrder(token, wo.id, {
          cost: cost || undefined,
          post_expense: postExpense && !!cost,
          vendor: contractor,
        })
      );
      toast.success(
        postExpense && cost ? 'Completed and expense booked.' : 'Completed.'
      );
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to complete.');
    } finally {
      setBusy(null);
    }
  };

  const sendComment = async () => {
    if (!comment.trim()) return;
    setBusy('comment');
    try {
      const c = await addComment(token, wo.id, comment.trim());
      setWo({ ...wo, comments: [...wo.comments, c] });
      setComment('');
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : 'Failed to add comment.'
      );
    } finally {
      setBusy(null);
    }
  };

  const canComplete = wo.allowed_transitions.includes('COMPLETED');
  const otherTransitions = wo.allowed_transitions.filter(
    (s) => s !== 'COMPLETED'
  );
  const terminal = ['COMPLETED', 'CANCELLED'].includes(wo.status);

  return (
    <Dialog open onOpenChange={(o) => !o && onClosedDialog()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {wo.is_rta_emergency && <Flame className="h-4 w-4 text-red-600" />}
            {wo.title}
          </DialogTitle>
          <DialogDescription>
            {wo.property_name}
            {wo.area_name ? ` · ${wo.area_name}` : ''} · {wo.category_display} ·{' '}
            {wo.priority_display}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 max-h-[65vh] overflow-y-auto pr-1">
          <p className="text-sm text-ink-2 whitespace-pre-wrap">
            {wo.description}
          </p>

          <div className="flex items-center gap-2 text-sm">
            <span className="text-ink-3">Status:</span>
            <span
              className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_PILL[wo.status]}`}
            >
              {wo.status_display}
            </span>
            <span className="text-ink-4 text-xs ml-auto">
              Reported by {wo.reported_by_name}
            </span>
          </div>

          {!terminal && (
            <>
              {/* schedule + contractor */}
              <div className="space-y-3 border rounded-md p-3 bg-canvas">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs flex items-center gap-1">
                      <CalendarClock className="h-3.5 w-3.5" /> Scheduled date
                    </Label>
                    <Input
                      type="date"
                      value={scheduledDate}
                      onChange={(e) => setScheduledDate(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Contractor</Label>
                    <Input
                      value={contractor}
                      onChange={(e) => setContractor(e.target.value)}
                      placeholder="Name"
                    />
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={saveDetails}
                  disabled={busy === 'details'}
                >
                  {busy === 'details' && (
                    <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                  )}{' '}
                  Save details
                </Button>
              </div>

              {/* status transitions */}
              {otherTransitions.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {otherTransitions.map((s) => (
                    <Button
                      key={s}
                      variant="outline"
                      size="sm"
                      onClick={() => doTransition(s)}
                      disabled={!!busy}
                      className={
                        s === 'CANCELLED'
                          ? 'text-red-600 border-red-200 hover:bg-red-50'
                          : ''
                      }
                    >
                      {busy === s && (
                        <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                      )}
                      {s === 'SCHEDULED'
                        ? 'Mark scheduled'
                        : s === 'IN_PROGRESS'
                          ? 'Start work'
                          : s === 'NEW'
                            ? 'Reopen'
                            : 'Cancel'}
                    </Button>
                  ))}
                </div>
              )}

              {/* complete + cost */}
              {canComplete && (
                <div className="space-y-3 border rounded-md p-3">
                  <div className="grid grid-cols-2 gap-3 items-end">
                    <div className="space-y-1.5">
                      <Label className="text-xs">Actual cost (optional)</Label>
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        value={cost}
                        onChange={(e) => setCost(e.target.value)}
                      />
                    </div>
                    <label className="flex items-center gap-2 text-xs text-ink-2 pb-2.5">
                      <input
                        type="checkbox"
                        checked={postExpense}
                        onChange={(e) => setPostExpense(e.target.checked)}
                      />
                      Book cost as an expense
                    </label>
                  </div>
                  <Button
                    className="w-full"
                    size="sm"
                    onClick={doComplete}
                    disabled={busy === 'complete'}
                  >
                    {busy === 'complete' && (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    )}
                    <CheckCircle className="h-4 w-4 mr-1.5" /> Mark completed
                  </Button>
                </div>
              )}
            </>
          )}

          {terminal && wo.cost && (
            <p className="text-sm text-ink-2">
              Final cost: <span className="font-medium">{money(wo.cost)}</span>
            </p>
          )}

          {/* comments */}
          <div className="space-y-2">
            <Label className="text-xs flex items-center gap-1">
              <MessageSquare className="h-3.5 w-3.5" /> Activity
            </Label>
            <div className="space-y-2">
              {wo.comments.length === 0 && (
                <p className="text-xs text-ink-4">No comments yet.</p>
              )}
              {wo.comments.map((c) => (
                <div key={c.id} className="text-sm bg-canvas rounded-md p-2.5">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-xs">
                      {c.author_name}
                      {c.is_landlord ? ' (you)' : ''}
                    </span>
                    <span className="text-[11px] text-ink-4">
                      {new Date(c.created_at).toLocaleString()}
                    </span>
                  </div>
                  <p className="text-ink-2 mt-0.5">{c.body}</p>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <Input
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Add a note…"
                onKeyDown={(e) => e.key === 'Enter' && sendComment()}
              />
              <Button
                variant="outline"
                size="icon"
                onClick={sendComment}
                disabled={busy === 'comment' || !comment.trim()}
              >
                {busy === 'comment' ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={onClosedDialog}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
