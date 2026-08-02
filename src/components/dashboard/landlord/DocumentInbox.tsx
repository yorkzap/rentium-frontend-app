'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  CheckSquare,
  Download,
  Eye,
  FileCheck2,
  FileSearch,
  Loader2,
  PencilLine,
  Search,
  Square,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import { toast } from 'sonner';

import { useAuth } from '@/contexts/AuthContext';
import {
  bulkRamaDocuments,
  deleteRamaDocument,
  fetchHoldings,
  fetchRamaDocuments,
  fetchRamaDocumentBlob,
  fetchRamaDocumentTags,
  downloadRamaDocument,
  fileRamaDocument,
  markRamaDocumentPaid,
  moveRamaDocument,
  reocrRamaDocument,
  renameRamaDocument,
  restoreRamaDocument,
  updateRamaDocumentTags,
  uploadRamaDocument,
  type Holding,
  type RamaDocument,
  type RamaDocumentTag,
} from '@/lib/ramaApi';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const EXPENSE_CATEGORIES = [
  'MAINTENANCE',
  'UTILITIES',
  'INSURANCE',
  'PROPERTY_TAX',
  'MORTGAGE',
  'STRATA',
  'MANAGEMENT',
  'SUPPLIES',
  'ADVERTISING',
  'OTHER',
];

const KIND_OPTIONS = [
  { value: '', label: 'All kinds' },
  { value: 'MAINTENANCE', label: 'Maintenance' },
  { value: 'EXPENSE', label: 'Expense' },
  { value: 'TAX', label: 'Tax' },
  { value: 'INSURANCE', label: 'Insurance' },
  { value: 'MORTGAGE', label: 'Mortgage' },
  { value: 'NOTICE', label: 'Notice' },
  { value: 'LEASE', label: 'Lease' },
  { value: 'BANK_STATEMENT', label: 'Bank statement' },
  { value: 'OTHER', label: 'Other' },
];

const STATUS_OPTIONS = [
  { value: '', label: 'All statuses' },
  { value: 'NEEDS_REVIEW', label: 'Needs review' },
  { value: 'READY', label: 'Ready to file' },
  { value: 'FILED', label: 'Filed' },
  { value: 'QUEUED', label: 'Queued' },
  { value: 'PROCESSING', label: 'Processing' },
  { value: 'FAILED', label: 'Failed' },
  { value: 'TRASH', label: 'Trash' },
];

function documentHeadline(row: RamaDocument): string {
  return (
    row.display_title ||
    row.title ||
    row.canonical_filename ||
    row.original_filename ||
    'Untitled document'
  );
}

function formatDocumentAmount(row: RamaDocument): string | null {
  if (!row.amount) return null;
  const value = Number(row.amount);
  if (!Number.isFinite(value)) return `${row.currency || 'CAD'} ${row.amount}`;
  try {
    return new Intl.NumberFormat('en-CA', {
      style: 'currency',
      currency: row.currency || 'CAD',
    }).format(value);
  } catch {
    return `${row.currency || 'CAD'} ${value.toFixed(2)}`;
  }
}

function paymentLabel(row: RamaDocument): string | null {
  if (!row.amount) return null;
  if (row.payment_state === 'PAID') return 'Paid';
  if (row.payment_state === 'UNPAID') return 'Not yet paid';
  if (row.payment_state === 'UNKNOWN') return 'Payment status needed';
  return null;
}

export default function DocumentInbox({
  focusDocumentId,
}: {
  focusDocumentId?: string;
}) {
  const { token } = useAuth();
  const picker = useRef<HTMLInputElement>(null);
  const [documents, setDocuments] = useState<RamaDocument[]>([]);
  const [holdings, setHoldings] = useState<Holding[]>([]);
  const [availableTags, setAvailableTags] = useState<RamaDocumentTag[]>([]);
  const [busy, setBusy] = useState(false);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState<{
    page: number;
    page_size: number;
    total: number;
    has_next: boolean;
    has_prev: boolean;
  } | null>(null);
  const pageSize = 25;

  // Library filters
  const [qInput, setQInput] = useState('');
  const [q, setQ] = useState('');
  const [holdingFilter, setHoldingFilter] = useState('');
  const [kindFilter, setKindFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [yearFilter, setYearFilter] = useState('');
  const [tagFilter, setTagFilter] = useState('');
  const [tagDrafts, setTagDrafts] = useState<Record<string, string>>({});
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [bulkHolding, setBulkHolding] = useState('');
  const [bulkTag, setBulkTag] = useState('');
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameDraft, setRenameDraft] = useState('');
  const [renameBusy, setRenameBusy] = useState(false);
  const [previewDocument, setPreviewDocument] = useState<RamaDocument | null>(
    null
  );
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewType, setPreviewType] = useState('');
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState('');
  const previewRequest = useRef(0);

  const viewingTrash = statusFilter === 'TRASH';
  const selectedIds = Object.entries(selected)
    .filter(([, on]) => on)
    .map(([id]) => id);

  // Debounce free-text search
  useEffect(() => {
    const handle = window.setTimeout(() => {
      setQ(qInput.trim());
      setPage(1);
    }, 300);
    return () => window.clearTimeout(handle);
  }, [qInput]);

  const hasActiveFilters = Boolean(
    q || holdingFilter || kindFilter || statusFilter || yearFilter || tagFilter
  );

  const clearFilters = () => {
    setQInput('');
    setQ('');
    setHoldingFilter('');
    setKindFilter('');
    setStatusFilter('');
    setYearFilter('');
    setTagFilter('');
    setPage(1);
  };

  const reload = useCallback(async () => {
    if (!token) return;
    const [docs, propertyHoldings, tags] = await Promise.all([
      fetchRamaDocuments(token, {
        page,
        page_size: pageSize,
        q: q || undefined,
        holding: holdingFilter || undefined,
        kind: kindFilter || undefined,
        status: statusFilter || undefined,
        year: yearFilter || undefined,
        tag: tagFilter || undefined,
      }),
      fetchHoldings(token),
      fetchRamaDocumentTags(token).catch(() => ({
        tags: [] as RamaDocumentTag[],
      })),
    ]);
    setDocuments(docs.documents);
    setPagination(docs.pagination ?? null);
    setHoldings(propertyHoldings.holdings);
    setAvailableTags(tags.tags ?? []);
    setSelected({});
  }, [
    token,
    page,
    q,
    holdingFilter,
    kindFilter,
    statusFilter,
    yearFilter,
    tagFilter,
  ]);

  useEffect(() => {
    reload().catch((error: unknown) =>
      toast.error(
        error instanceof Error ? error.message : 'Could not load documents'
      )
    );
  }, [reload]);

  useEffect(() => {
    if (!focusDocumentId || documents.length === 0) return;
    document
      .getElementById(`business-document-${focusDocumentId}`)
      ?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [documents, focusDocumentId]);

  useEffect(
    () => () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    },
    [previewUrl]
  );

  const upload = async (file?: File) => {
    if (!file || !token) return;
    setBusy(true);
    try {
      const row = await uploadRamaDocument(token, file);
      toast.success(
        row.duplicate
          ? 'This document is already in your archive.'
          : 'Document queued for OCR.'
      );
      await reload();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Upload failed');
    } finally {
      setBusy(false);
      if (picker.current) picker.current.value = '';
    }
  };

  const update = (id: string, patch: Partial<RamaDocument>) =>
    setDocuments((rows) =>
      rows.map((row) => (row.id === id ? { ...row, ...patch } : row))
    );

  const confirm = async (row: RamaDocument) => {
    if (!token) return;
    if (!row.holding_id && !row.portfolio_wide) {
      toast.error(
        'Choose which physical property this belongs to (or whole portfolio).'
      );
      return;
    }
    const expenseLike = [
      'EXPENSE',
      'TAX',
      'MORTGAGE',
      'INSURANCE',
      'MAINTENANCE',
    ].includes(row.kind);
    if (expenseLike && row.amount && row.payment_state === 'UNKNOWN') {
      toast.error(
        'Say whether this has already left the bank (Paid) or is still unpaid.'
      );
      return;
    }
    setBusy(true);
    try {
      await fileRamaDocument(token, row.id, {
        holding_id: row.holding_id ?? undefined,
        portfolio_wide: row.portfolio_wide,
        kind: row.kind,
        title: row.title,
        issuer: row.issuer,
        reference_number: row.reference_number,
        document_date: row.document_date ?? undefined,
        due_date: row.due_date ?? undefined,
        amount: row.amount ?? undefined,
        expense_category: row.expense_category,
        payment_state: row.payment_state,
        clarification_answer: row.clarification_question
          ? 'Reviewed and corrected in the document inbox.'
          : '',
      });
      toast.success(
        row.amount ? 'Filed and recorded in the ledger.' : 'Document filed.'
      );
      await reload();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Could not file document'
      );
    } finally {
      setBusy(false);
    }
  };

  const holdingLabel = (row: RamaDocument) => {
    if (row.portfolio_wide) return 'Whole portfolio';
    if (!row.holding_id) return null;
    const h = holdings.find((x) => x.id === row.holding_id);
    if (h) return `${h.name} · ${h.address}`;
    return row.holding_name || 'Selected property';
  };

  const needsFiling = (row: RamaDocument) =>
    ['READY', 'NEEDS_REVIEW'].includes(row.status);

  const remove = async (row: RamaDocument) => {
    if (!token) return;
    if (viewingTrash) {
      if (
        !window.confirm(
          `Permanently delete “${documentHeadline(row)}”? This cannot be undone.`
        )
      ) {
        return;
      }
      setBusy(true);
      try {
        await deleteRamaDocument(token, row.id, { hard: true });
        toast.success('Document permanently deleted.');
        await reload();
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : 'Could not delete document'
        );
      } finally {
        setBusy(false);
      }
      return;
    }
    if (
      !window.confirm(
        `Move “${documentHeadline(row)}” to trash? You can restore it later.`
      )
    ) {
      return;
    }
    setBusy(true);
    try {
      await deleteRamaDocument(token, row.id);
      toast.success('Moved to trash.');
      await reload();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Could not trash document'
      );
    } finally {
      setBusy(false);
    }
  };

  const restore = async (row: RamaDocument) => {
    if (!token) return;
    setBusy(true);
    try {
      await restoreRamaDocument(token, row.id);
      toast.success('Document restored.');
      await reload();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Could not restore document'
      );
    } finally {
      setBusy(false);
    }
  };

  const markPaid = async (row: RamaDocument) => {
    if (!token) return;
    if (!row.ledger_entry_id) {
      toast.error('No linked ledger expense on this document yet.');
      return;
    }
    setBusy(true);
    try {
      await markRamaDocumentPaid(token, row.id);
      toast.success('Marked paid in the ledger.');
      await reload();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Could not mark paid'
      );
    } finally {
      setBusy(false);
    }
  };

  const moveHolding = async (row: RamaDocument, holdingId: string) => {
    if (!token) return;
    setBusy(true);
    try {
      const result = await moveRamaDocument(
        token,
        row.id,
        holdingId === 'portfolio'
          ? { portfolio_wide: true }
          : { holding_id: holdingId }
      );
      if (result.warning) {
        toast.warning(result.warning);
      } else {
        toast.success(
          holdingId === 'portfolio'
            ? 'Moved to whole portfolio.'
            : 'Moved to the selected property (expense reallocated if linked).'
        );
      }
      await reload();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Could not move document'
      );
    } finally {
      setBusy(false);
    }
  };

  const runBulk = async (
    action: 'trash' | 'restore' | 'tag' | 'move' | 'hard_delete'
  ) => {
    if (!token || selectedIds.length === 0) {
      toast.error('Select at least one document.');
      return;
    }
    if (action === 'tag' && !bulkTag.trim()) {
      toast.error('Enter a tag name for bulk tag.');
      return;
    }
    if (action === 'move' && !bulkHolding) {
      toast.error('Choose a property for bulk move.');
      return;
    }
    if (
      action === 'hard_delete' &&
      !window.confirm(
        `Permanently delete ${selectedIds.length} document(s)? This cannot be undone.`
      )
    ) {
      return;
    }
    setBusy(true);
    try {
      const result = await bulkRamaDocuments(token, {
        document_ids: selectedIds,
        action,
        tag_names:
          action === 'tag'
            ? bulkTag
                .split(',')
                .map((s) => s.trim())
                .filter(Boolean)
            : undefined,
        holding_id:
          action === 'move' && bulkHolding !== 'portfolio'
            ? bulkHolding
            : undefined,
        portfolio_wide: action === 'move' && bulkHolding === 'portfolio',
      });
      const errors = result.results.filter((r) => r.error).length;
      toast.success(
        errors
          ? `${action}: ${result.count - errors} ok, ${errors} failed.`
          : `${action}: ${result.count} document(s).`
      );
      setSelected({});
      await reload();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Bulk action failed'
      );
    } finally {
      setBusy(false);
    }
  };

  const toggleSelect = (id: string) =>
    setSelected((prev) => ({ ...prev, [id]: !prev[id] }));

  const toggleSelectAll = () => {
    if (selectedIds.length === documents.length) {
      setSelected({});
      return;
    }
    const next: Record<string, boolean> = {};
    for (const row of documents) next[row.id] = true;
    setSelected(next);
  };

  const retryOcr = async (row: RamaDocument) => {
    if (!token) return;
    setBusy(true);
    try {
      const updated = await reocrRamaDocument(token, row.id);
      if (updated.status === 'FAILED') {
        toast.error(updated.failure_reason || 'OCR still failed after retry.');
      } else {
        toast.success(
          updated.title
            ? `OCR ok — ${updated.title}`
            : 'OCR completed. Review the fields below.'
        );
      }
      await reload();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Could not re-run OCR'
      );
    } finally {
      setBusy(false);
    }
  };

  const saveTags = async (row: RamaDocument) => {
    if (!token) return;
    const raw =
      tagDrafts[row.id] ?? (row.tags ?? []).map((t) => t.name).join(', ');
    const names = raw
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    setBusy(true);
    try {
      const updated = await updateRamaDocumentTags(token, row.id, names);
      update(row.id, { tags: updated.tags });
      toast.success('Tags saved.');
      const tags = await fetchRamaDocumentTags(token);
      setAvailableTags(tags.tags ?? []);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Could not save tags'
      );
    } finally {
      setBusy(false);
    }
  };

  const startRename = (row: RamaDocument) => {
    setRenamingId(row.id);
    setRenameDraft(documentHeadline(row));
  };

  const cancelRename = () => {
    setRenamingId(null);
    setRenameDraft('');
  };

  const saveRename = async (row: RamaDocument) => {
    if (!token || renameBusy) return;
    const title = renameDraft.trim();
    if (!title) {
      toast.error('Enter a name for this document.');
      return;
    }
    setRenameBusy(true);
    try {
      const renamed = await renameRamaDocument(token, row.id, title);
      update(row.id, {
        title: renamed.title,
        display_title: renamed.display_title,
      });
      cancelRename();
      toast.success('Document renamed. Original file preserved.');
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Could not rename document'
      );
    } finally {
      setRenameBusy(false);
    }
  };

  const closePreview = () => {
    previewRequest.current += 1;
    setPreviewDocument(null);
    setPreviewUrl(null);
    setPreviewType('');
    setPreviewError('');
    setPreviewLoading(false);
  };

  const openPreview = async (row: RamaDocument) => {
    if (!token) return;
    const requestId = previewRequest.current + 1;
    previewRequest.current = requestId;
    setPreviewDocument(row);
    setPreviewUrl(null);
    setPreviewType('');
    setPreviewError('');
    setPreviewLoading(true);
    try {
      const blob = await fetchRamaDocumentBlob(token, row.id);
      if (previewRequest.current !== requestId) return;
      setPreviewType(blob.type || 'application/octet-stream');
      setPreviewUrl(URL.createObjectURL(blob));
    } catch (error) {
      if (previewRequest.current !== requestId) return;
      setPreviewError(
        error instanceof Error ? error.message : 'Could not preview document'
      );
    } finally {
      if (previewRequest.current === requestId) setPreviewLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Documents</h1>
          <p className="text-sm text-[hsl(var(--ink-3))]">
            Searchable filing cabinet for receipts, invoices, tax notices, and
            other property records.
          </p>
        </div>
        <input
          ref={picker}
          type="file"
          accept=".pdf,.jpg,.jpeg,.png,.tif,.tiff,.webp,.heic,.heif"
          className="hidden"
          onChange={(event) => upload(event.target.files?.[0])}
        />
        <Button onClick={() => picker.current?.click()} disabled={busy}>
          {busy ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Upload className="mr-2 h-4 w-4" />
          )}
          Add document
        </Button>
      </div>

      <Card>
        <CardContent className="grid gap-3 pt-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          <div className="space-y-1 xl:col-span-2">
            <Label htmlFor="doc-search">Search</Label>
            <div className="relative">
              <Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-[hsl(var(--ink-4))]" />
              <Input
                id="doc-search"
                className="pl-8"
                placeholder="Window screens, McKenzie, tax…"
                value={qInput}
                onChange={(e) => setQInput(e.target.value)}
              />
            </div>
          </div>
          <div className="space-y-1">
            <Label>Property</Label>
            <Select
              value={holdingFilter || 'all'}
              onValueChange={(value) => {
                setHoldingFilter(value === 'all' ? '' : value);
                setPage(1);
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="All properties" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All properties</SelectItem>
                {holdings.map((holding) => (
                  <SelectItem key={holding.id} value={holding.id}>
                    {holding.name || holding.address}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label>Kind</Label>
            <Select
              value={kindFilter || 'all'}
              onValueChange={(value) => {
                setKindFilter(value === 'all' ? '' : value);
                setPage(1);
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="All kinds" />
              </SelectTrigger>
              <SelectContent>
                {KIND_OPTIONS.map((opt) => (
                  <SelectItem
                    key={opt.value || 'all'}
                    value={opt.value || 'all'}
                  >
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label>Status</Label>
            <Select
              value={statusFilter || 'all'}
              onValueChange={(value) => {
                setStatusFilter(value === 'all' ? '' : value);
                setPage(1);
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="All statuses" />
              </SelectTrigger>
              <SelectContent>
                {STATUS_OPTIONS.map((opt) => (
                  <SelectItem
                    key={opt.value || 'all'}
                    value={opt.value || 'all'}
                  >
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label htmlFor="doc-year">Year</Label>
            <Input
              id="doc-year"
              inputMode="numeric"
              placeholder="2026"
              value={yearFilter}
              onChange={(e) => {
                setYearFilter(e.target.value.replace(/[^\d]/g, '').slice(0, 4));
                setPage(1);
              }}
            />
          </div>
          {availableTags.length > 0 && (
            <div className="space-y-1 xl:col-span-2">
              <Label>Tag</Label>
              <Select
                value={tagFilter || 'all'}
                onValueChange={(value) => {
                  setTagFilter(value === 'all' ? '' : value);
                  setPage(1);
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All tags" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All tags</SelectItem>
                  {availableTags.map((tag) => (
                    <SelectItem key={tag.id} value={tag.slug}>
                      {tag.name}
                      {typeof tag.document_count === 'number'
                        ? ` (${tag.document_count})`
                        : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          {hasActiveFilters && (
            <div className="flex items-end">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={clearFilters}
              >
                <X className="mr-1 h-3.5 w-3.5" />
                Clear filters
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {documents.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-2 py-16 text-center">
            <FileSearch className="h-8 w-8 text-[hsl(var(--ink-4))]" />
            <p className="font-medium">
              {hasActiveFilters
                ? viewingTrash
                  ? 'Trash is empty'
                  : 'No documents match these filters'
                : 'No business documents yet'}
            </p>
            <p className="max-w-md text-sm text-[hsl(var(--ink-3))]">
              {hasActiveFilters
                ? 'Try a broader search, or clear filters.'
                : 'Upload a photo or PDF. RAMA will OCR it, propose a property and category, then wait for your review.'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {pagination && (
            <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-[hsl(var(--ink-3))]">
              <span>
                {pagination.total} document
                {pagination.total === 1 ? '' : 's'}
                {viewingTrash ? ' in trash' : ''}
                {pagination.total > pageSize
                  ? ` · page ${pagination.page}`
                  : ''}
              </span>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={!pagination.has_prev || busy}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >
                  Previous
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={!pagination.has_next || busy}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Next
                </Button>
              </div>
            </div>
          )}

          <Card>
            <CardContent className="flex flex-wrap items-end gap-3 pt-6">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={toggleSelectAll}
                disabled={busy || documents.length === 0}
              >
                {selectedIds.length === documents.length &&
                documents.length > 0 ? (
                  <CheckSquare className="mr-1.5 h-3.5 w-3.5" />
                ) : (
                  <Square className="mr-1.5 h-3.5 w-3.5" />
                )}
                {selectedIds.length
                  ? `${selectedIds.length} selected`
                  : 'Select all'}
              </Button>
              {viewingTrash ? (
                <>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={busy || !selectedIds.length}
                    onClick={() => runBulk('restore')}
                  >
                    Restore selected
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="destructive"
                    disabled={busy || !selectedIds.length}
                    onClick={() => runBulk('hard_delete')}
                  >
                    Delete forever
                  </Button>
                </>
              ) : (
                <>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={busy || !selectedIds.length}
                    onClick={() => runBulk('trash')}
                  >
                    Trash selected
                  </Button>
                  <div className="flex flex-wrap items-end gap-2">
                    <div className="space-y-1">
                      <Label className="text-xs">Bulk tag</Label>
                      <Input
                        className="h-8 w-40"
                        placeholder="tax-2026"
                        value={bulkTag}
                        onChange={(e) => setBulkTag(e.target.value)}
                      />
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={busy || !selectedIds.length}
                      onClick={() => runBulk('tag')}
                    >
                      Apply tag
                    </Button>
                  </div>
                  <div className="flex flex-wrap items-end gap-2">
                    <div className="space-y-1">
                      <Label className="text-xs">Bulk move</Label>
                      <Select
                        value={bulkHolding || 'none'}
                        onValueChange={(v) =>
                          setBulkHolding(v === 'none' ? '' : v)
                        }
                      >
                        <SelectTrigger className="h-8 w-48">
                          <SelectValue placeholder="Property…" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">Choose…</SelectItem>
                          <SelectItem value="portfolio">
                            Whole portfolio
                          </SelectItem>
                          {holdings.map((h) => (
                            <SelectItem key={h.id} value={h.id}>
                              {h.address || h.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={busy || !selectedIds.length}
                      onClick={() => runBulk('move')}
                    >
                      Move selected
                    </Button>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {documents.map((row) => (
            <Card
              key={row.id}
              id={`business-document-${row.id}`}
              className={
                row.id === focusDocumentId
                  ? 'ring-2 ring-[hsl(var(--brand))] ring-offset-2'
                  : undefined
              }
            >
              <CardHeader className="pb-3">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="flex min-w-0 flex-1 items-start gap-3">
                    <button
                      type="button"
                      className="mt-1 text-[hsl(var(--ink-3))] hover:text-[hsl(var(--ink-1))]"
                      onClick={() => toggleSelect(row.id)}
                      aria-label={
                        selected[row.id] ? 'Deselect' : 'Select document'
                      }
                    >
                      {selected[row.id] ? (
                        <CheckSquare className="h-4 w-4" />
                      ) : (
                        <Square className="h-4 w-4" />
                      )}
                    </button>
                    <div className="min-w-0 flex-1">
                      {renamingId === row.id ? (
                        <div className="flex max-w-2xl flex-wrap items-center gap-2">
                          <Input
                            autoFocus
                            aria-label="Document name"
                            className="h-9 min-w-[14rem] flex-1 font-medium"
                            maxLength={255}
                            value={renameDraft}
                            onChange={(event) =>
                              setRenameDraft(event.target.value)
                            }
                            onKeyDown={(event) => {
                              if (event.key === 'Enter') {
                                event.preventDefault();
                                void saveRename(row);
                              }
                              if (event.key === 'Escape') cancelRename();
                            }}
                          />
                          <Button
                            type="button"
                            size="sm"
                            disabled={renameBusy || !renameDraft.trim()}
                            onClick={() => saveRename(row)}
                          >
                            {renameBusy && (
                              <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                            )}
                            Save
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            disabled={renameBusy}
                            onClick={cancelRename}
                          >
                            Cancel
                          </Button>
                        </div>
                      ) : (
                        <div className="flex min-w-0 items-center gap-2">
                          <CardTitle className="truncate text-base sm:text-lg">
                            {documentHeadline(row)}
                          </CardTitle>
                          <button
                            type="button"
                            className="shrink-0 rounded-md p-1.5 text-[hsl(var(--ink-4))] transition-colors hover:bg-[hsl(var(--surface-2))] hover:text-[hsl(var(--ink-1))]"
                            onClick={() => startRename(row)}
                            aria-label={`Rename ${documentHeadline(row)}`}
                            title="Rename document"
                          >
                            <PencilLine className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      )}
                      <p className="mt-1 truncate text-xs text-[hsl(var(--ink-4))]">
                        Original file: {row.original_filename}
                      </p>
                      <div className="mt-2 flex flex-wrap items-center gap-1.5">
                        <span className="rounded-full border border-[hsl(var(--border))] bg-[hsl(var(--surface-1))] px-2 py-0.5 text-xs font-medium text-[hsl(var(--ink-2))]">
                          {row.status.replaceAll('_', ' ')}
                        </span>
                        {row.kind && (
                          <span className="rounded-full bg-[hsl(var(--surface-2))] px-2 py-0.5 text-xs text-[hsl(var(--ink-2))]">
                            {row.kind_display || row.kind}
                          </span>
                        )}
                        {(row.holding_name || row.portfolio_wide) && (
                          <span className="max-w-full truncate rounded-full bg-[hsl(var(--surface-2))] px-2 py-0.5 text-xs text-[hsl(var(--ink-2))]">
                            {row.portfolio_wide
                              ? 'Whole portfolio'
                              : row.holding_name}
                          </span>
                        )}
                      </div>
                      {(row.tags?.length ?? 0) > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {row.tags!.map((tag) => (
                            <button
                              key={tag.id}
                              type="button"
                              className="rounded-full bg-[hsl(var(--surface-2))] px-2 py-0.5 text-xs text-[hsl(var(--ink-2))] hover:bg-[hsl(var(--surface-3))]"
                              onClick={() => {
                                setTagFilter(tag.slug);
                                setPage(1);
                              }}
                            >
                              {tag.name}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex shrink-0 flex-wrap items-start gap-3 lg:justify-end">
                    {formatDocumentAmount(row) && (
                      <div className="min-w-[9.5rem] rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--surface-1))] px-4 py-2.5 lg:text-right">
                        <p className="text-[11px] font-medium uppercase tracking-wide text-[hsl(var(--ink-4))]">
                          Amount
                        </p>
                        <p className="text-xl font-semibold tabular-nums text-[hsl(var(--ink-1))]">
                          {formatDocumentAmount(row)}
                        </p>
                        {paymentLabel(row) && (
                          <p
                            className={`mt-0.5 text-xs font-medium ${
                              row.payment_state === 'PAID'
                                ? 'text-emerald-700'
                                : row.payment_state === 'UNKNOWN'
                                  ? 'text-amber-700'
                                  : 'text-[hsl(var(--ink-3))]'
                            }`}
                          >
                            {paymentLabel(row)}
                          </p>
                        )}
                      </div>
                    )}
                    <div className="flex flex-wrap items-center gap-2">
                      {token && (
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => openPreview(row)}
                        >
                          <Eye className="mr-1.5 h-3.5 w-3.5" />
                          Preview
                        </Button>
                      )}
                      {token && (
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() =>
                            downloadRamaDocument(token, row).catch(
                              (error: unknown) =>
                                toast.error(
                                  error instanceof Error
                                    ? error.message
                                    : 'Download failed'
                                )
                            )
                          }
                        >
                          <Download className="mr-1.5 h-3.5 w-3.5" />
                          Download
                        </Button>
                      )}
                      {viewingTrash ? (
                        <>
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            disabled={busy}
                            onClick={() => restore(row)}
                          >
                            Restore
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            className="text-red-600 hover:text-red-700"
                            disabled={busy || !!row.ledger_entry_id}
                            title={
                              row.ledger_entry_id
                                ? 'Linked to a ledger expense — cannot hard-delete'
                                : 'Delete forever'
                            }
                            onClick={() => remove(row)}
                          >
                            <Trash2 className="mr-1.5 h-3.5 w-3.5" />
                            Delete forever
                          </Button>
                        </>
                      ) : (
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          className="text-red-600 hover:text-red-700"
                          disabled={busy}
                          title="Move to trash"
                          onClick={() => remove(row)}
                        >
                          <Trash2 className="mr-1.5 h-3.5 w-3.5" />
                          Trash
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {row.clarification_question && (
                  <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
                    <strong>RAMA needs your help:</strong>{' '}
                    {row.clarification_question}
                  </div>
                )}
                {row.failure_reason && (
                  <div className="space-y-2 rounded-lg border border-red-200 bg-red-50 p-3">
                    <p className="text-sm text-red-800">{row.failure_reason}</p>
                    {row.failure_reason
                      .toLowerCase()
                      .includes('ghostscript') && (
                      <p className="text-xs text-red-700">
                        This is a server OCR config issue, not a blurry photo.
                        Use Retry OCR below.
                      </p>
                    )}
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={busy}
                      onClick={() => retryOcr(row)}
                    >
                      Retry OCR
                    </Button>
                  </div>
                )}
                {row.status === 'FAILED' && !row.failure_reason && (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={busy}
                    onClick={() => retryOcr(row)}
                  >
                    Retry OCR
                  </Button>
                )}
                <div className="flex flex-wrap items-end gap-2">
                  <div className="min-w-[12rem] flex-1 space-y-1">
                    <Label>Tags (comma-separated)</Label>
                    <Input
                      placeholder="tax-2026, insurance, hvac"
                      value={
                        tagDrafts[row.id] ??
                        (row.tags ?? []).map((t) => t.name).join(', ')
                      }
                      onChange={(e) =>
                        setTagDrafts((prev) => ({
                          ...prev,
                          [row.id]: e.target.value,
                        }))
                      }
                    />
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={busy}
                    onClick={() => saveTags(row)}
                  >
                    Save tags
                  </Button>
                </div>
                {needsFiling(row) && (
                  <>
                    {/* Same question RAMA asks in chat — required before file */}
                    <div
                      className={
                        !row.holding_id && !row.portfolio_wide
                          ? 'space-y-2 rounded-lg border border-amber-300 bg-amber-50 p-4'
                          : 'space-y-2 rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--surface-1))] p-4'
                      }
                    >
                      <div>
                        <Label className="text-base font-medium">
                          Which physical property?
                        </Label>
                        <p className="mt-0.5 text-xs text-[hsl(var(--ink-3))]">
                          File against the building/address (e.g. 950 McKenzie
                          Ave), not a room listing — same as chat.
                        </p>
                      </div>
                      <Select
                        value={
                          row.portfolio_wide
                            ? 'portfolio'
                            : (row.holding_id ?? '')
                        }
                        onValueChange={(value) =>
                          update(row.id, {
                            holding_id: value === 'portfolio' ? null : value,
                            portfolio_wide: value === 'portfolio',
                          })
                        }
                      >
                        <SelectTrigger className="bg-white">
                          <SelectValue placeholder="Choose property address…" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="portfolio">
                            Whole portfolio (not one property)
                          </SelectItem>
                          {holdings.map((holding) => (
                            <SelectItem key={holding.id} value={holding.id}>
                              {holding.address || holding.name}
                              {holding.name && holding.address
                                ? ` · ${holding.name}`
                                : ''}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {holdingLabel(row) && (
                        <p className="text-sm text-emerald-800">
                          Filing under: <strong>{holdingLabel(row)}</strong>
                        </p>
                      )}
                      {!row.holding_id && !row.portfolio_wide && (
                        <p className="text-xs text-amber-900">
                          Required — OCR may suggest the wrong address (e.g.
                          your home vs the rental). Pick the service property.
                        </p>
                      )}
                    </div>

                    <div className="grid gap-3 md:grid-cols-3">
                      <div className="space-y-1">
                        <Label>Title</Label>
                        <Input
                          value={row.title}
                          onChange={(e) =>
                            update(row.id, { title: e.target.value })
                          }
                        />
                      </div>
                      <div className="space-y-1">
                        <Label>Issuer / vendor</Label>
                        <Input
                          value={row.issuer}
                          onChange={(e) =>
                            update(row.id, { issuer: e.target.value })
                          }
                        />
                      </div>
                      <div className="space-y-1">
                        <Label>Amount</Label>
                        <Input
                          type="number"
                          step="0.01"
                          value={row.amount ?? ''}
                          onChange={(e) =>
                            update(row.id, { amount: e.target.value || null })
                          }
                        />
                      </div>
                      <div className="space-y-1">
                        <Label>Expense category</Label>
                        <Select
                          value={row.expense_category || 'OTHER'}
                          onValueChange={(value) =>
                            update(row.id, { expense_category: value })
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {EXPENSE_CATEGORIES.map((category) => (
                              <SelectItem key={category} value={category}>
                                {category.replaceAll('_', ' ')}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1 md:col-span-2">
                        <Label>Has this left the bank?</Label>
                        <Select
                          value={
                            ['PAID', 'UNPAID', 'NOT_APPLICABLE'].includes(
                              row.payment_state
                            )
                              ? row.payment_state
                              : undefined
                          }
                          onValueChange={(value) =>
                            update(row.id, {
                              payment_state:
                                value as RamaDocument['payment_state'],
                            })
                          }
                        >
                          <SelectTrigger
                            className={
                              row.amount && row.payment_state === 'UNKNOWN'
                                ? 'border-amber-400'
                                : undefined
                            }
                          >
                            <SelectValue placeholder="Choose paid or unpaid…" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="PAID">
                              Paid — money already left the bank
                            </SelectItem>
                            <SelectItem value="UNPAID">
                              Unpaid — invoice not yet taken
                            </SelectItem>
                            <SelectItem value="NOT_APPLICABLE">
                              Not an expense
                            </SelectItem>
                          </SelectContent>
                        </Select>
                        {row.amount && row.payment_state === 'UNKNOWN' && (
                          <p className="text-xs text-amber-800">
                            Required for expenses — same question RAMA asks in
                            chat.
                          </p>
                        )}
                      </div>
                    </div>
                    <Button
                      onClick={() => confirm(row)}
                      disabled={
                        busy ||
                        (!row.holding_id && !row.portfolio_wide) ||
                        !!(
                          row.amount &&
                          [
                            'EXPENSE',
                            'TAX',
                            'MORTGAGE',
                            'INSURANCE',
                            'MAINTENANCE',
                          ].includes(row.kind) &&
                          row.payment_state === 'UNKNOWN'
                        )
                      }
                    >
                      <FileCheck2 className="mr-2 h-4 w-4" /> Confirm and file
                      {holdingLabel(row) ? ` · ${holdingLabel(row)}` : ''}
                    </Button>
                  </>
                )}
                {row.status === 'FILED' && !viewingTrash && (
                  <div className="space-y-3">
                    <div className="space-y-1 text-sm text-emerald-700">
                      <p>
                        Filed as {row.canonical_filename}
                        {row.ledger_entry_id
                          ? ' and linked to its immutable expense entry.'
                          : '.'}
                      </p>
                      {holdingLabel(row) && (
                        <p className="text-[hsl(var(--ink-3))]">
                          Property: {holdingLabel(row)}
                          {row.payment_state === 'PAID'
                            ? ' · Paid'
                            : row.payment_state === 'UNPAID'
                              ? ' · Not yet taken from bank'
                              : ''}
                        </p>
                      )}
                    </div>
                    <div className="flex flex-wrap items-end gap-3 rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--surface-1))] p-3">
                      {row.ledger_entry_id &&
                        row.payment_state === 'UNPAID' && (
                          <Button
                            type="button"
                            size="sm"
                            disabled={busy}
                            onClick={() => markPaid(row)}
                          >
                            Mark paid
                          </Button>
                        )}
                      <div className="min-w-[14rem] flex-1 space-y-1">
                        <Label className="text-xs">Move to property</Label>
                        <Select
                          value={
                            row.portfolio_wide
                              ? 'portfolio'
                              : (row.holding_id ?? '')
                          }
                          onValueChange={(value) => moveHolding(row, value)}
                        >
                          <SelectTrigger className="bg-white">
                            <SelectValue placeholder="Choose property…" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="portfolio">
                              Whole portfolio
                            </SelectItem>
                            {holdings.map((holding) => (
                              <SelectItem key={holding.id} value={holding.id}>
                                {holding.address || holding.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog
        open={Boolean(previewDocument)}
        onOpenChange={(open) => {
          if (!open) closePreview();
        }}
      >
        <DialogContent className="flex h-[min(90vh,900px)] max-w-6xl flex-col gap-0 overflow-hidden p-0">
          <DialogHeader className="border-b border-[hsl(var(--border))] px-6 py-4 pr-14">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <DialogTitle className="truncate text-lg">
                  {previewDocument
                    ? documentHeadline(previewDocument)
                    : 'Document preview'}
                </DialogTitle>
                <DialogDescription className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1">
                  <span>{previewDocument?.original_filename}</span>
                  {previewDocument && formatDocumentAmount(previewDocument) && (
                    <>
                      <span aria-hidden="true">·</span>
                      <span className="font-semibold text-[hsl(var(--ink-1))]">
                        {formatDocumentAmount(previewDocument)}
                      </span>
                    </>
                  )}
                </DialogDescription>
              </div>
              {previewDocument && token && (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="shrink-0 self-start sm:self-auto"
                  onClick={() =>
                    downloadRamaDocument(token, previewDocument).catch(
                      (error: unknown) =>
                        toast.error(
                          error instanceof Error
                            ? error.message
                            : 'Download failed'
                        )
                    )
                  }
                >
                  <Download className="mr-1.5 h-3.5 w-3.5" />
                  Download
                </Button>
              )}
            </div>
          </DialogHeader>
          <div className="flex min-h-0 flex-1 items-center justify-center bg-slate-100 p-3 sm:p-5">
            {previewLoading && (
              <div className="flex flex-col items-center gap-3 text-sm text-[hsl(var(--ink-3))]">
                <Loader2 className="h-7 w-7 animate-spin text-[hsl(var(--brand))]" />
                Loading secure preview…
              </div>
            )}
            {!previewLoading && previewError && (
              <div className="max-w-md rounded-lg border border-red-200 bg-white p-6 text-center">
                <p className="font-medium text-red-700">Preview unavailable</p>
                <p className="mt-1 text-sm text-[hsl(var(--ink-3))]">
                  {previewError}
                </p>
              </div>
            )}
            {!previewLoading && !previewError && previewUrl && (
              <>
                {previewType === 'application/pdf' ? (
                  <iframe
                    src={previewUrl}
                    title={`Preview of ${
                      previewDocument
                        ? documentHeadline(previewDocument)
                        : 'document'
                    }`}
                    className="h-full w-full rounded-lg border border-slate-200 bg-white shadow-sm"
                  />
                ) : previewType.startsWith('image/') ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={previewUrl}
                    alt={
                      previewDocument
                        ? `Preview of ${documentHeadline(previewDocument)}`
                        : 'Document preview'
                    }
                    className="max-h-full max-w-full rounded-lg bg-white object-contain shadow-sm"
                  />
                ) : (
                  <div className="max-w-md rounded-lg border border-[hsl(var(--border))] bg-white p-6 text-center">
                    <FileSearch className="mx-auto h-8 w-8 text-[hsl(var(--ink-4))]" />
                    <p className="mt-3 font-medium">
                      This file type cannot be previewed here
                    </p>
                    <p className="mt-1 text-sm text-[hsl(var(--ink-3))]">
                      Download the original to open it on your device.
                    </p>
                  </div>
                )}
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
