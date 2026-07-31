'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  FileCheck2,
  FileSearch,
  Loader2,
  Search,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import { toast } from 'sonner';

import { useAuth } from '@/contexts/AuthContext';
import {
  deleteRamaDocument,
  fetchHoldings,
  fetchRamaDocuments,
  fetchRamaDocumentTags,
  downloadRamaDocument,
  fileRamaDocument,
  reocrRamaDocument,
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
    if (row.ledger_entry_id) {
      toast.error(
        'Linked to a ledger expense — cannot delete while linked. Void/unlink the expense first if needed.'
      );
      return;
    }
    if (
      !window.confirm(
        `Delete “${documentHeadline(row)}”? This cannot be undone.`
      )
    ) {
      return;
    }
    setBusy(true);
    try {
      await deleteRamaDocument(token, row.id);
      toast.success('Document deleted.');
      await reload();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Could not delete document'
      );
    } finally {
      setBusy(false);
    }
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
                ? 'No documents match these filters'
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
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <CardTitle className="text-base">
                      {documentHeadline(row)}
                    </CardTitle>
                    <p className="mt-1 text-xs text-[hsl(var(--ink-4))]">
                      {row.canonical_filename || row.original_filename}
                      {row.original_filename &&
                      row.title &&
                      row.original_filename !== row.title
                        ? ` · was ${row.original_filename}`
                        : ''}{' '}
                      · {row.status.replaceAll('_', ' ')}
                      {row.holding_name ? ` · ${row.holding_name}` : ''}
                      {row.amount ? ` · $${row.amount}` : ''}
                      {row.kind ? ` · ${row.kind_display || row.kind}` : ''}
                    </p>
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
                  <div className="flex items-center gap-3 shrink-0">
                    {row.archival_pdf && token && (
                      <button
                        className="text-sm text-[hsl(var(--brand))] hover:underline"
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
                        Download PDF/A
                      </button>
                    )}
                    <button
                      type="button"
                      className="inline-flex items-center gap-1 text-sm text-red-600 hover:underline disabled:opacity-40"
                      disabled={busy || !!row.ledger_entry_id}
                      title={
                        row.ledger_entry_id
                          ? 'Linked to a ledger expense'
                          : 'Delete document'
                      }
                      onClick={() => remove(row)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Delete
                    </button>
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
                {row.status === 'FILED' && (
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
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
