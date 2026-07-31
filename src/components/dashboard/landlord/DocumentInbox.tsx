'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { FileCheck2, FileSearch, Loader2, Trash2, Upload } from 'lucide-react';
import { toast } from 'sonner';

import { useAuth } from '@/contexts/AuthContext';
import {
  deleteRamaDocument,
  fetchHoldings,
  fetchRamaDocuments,
  downloadRamaDocument,
  fileRamaDocument,
  uploadRamaDocument,
  type Holding,
  type RamaDocument,
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

export default function DocumentInbox({
  focusDocumentId,
}: {
  focusDocumentId?: string;
}) {
  const { token } = useAuth();
  const picker = useRef<HTMLInputElement>(null);
  const [documents, setDocuments] = useState<RamaDocument[]>([]);
  const [holdings, setHoldings] = useState<Holding[]>([]);
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

  const reload = useCallback(async () => {
    if (!token) return;
    const [docs, propertyHoldings] = await Promise.all([
      fetchRamaDocuments(token, { page, page_size: pageSize }),
      fetchHoldings(token),
    ]);
    setDocuments(docs.documents);
    setPagination(docs.pagination ?? null);
    setHoldings(propertyHoldings.holdings);
  }, [token, page]);

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
        `Delete “${row.title || row.original_filename}”? This cannot be undone.`
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

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Document inbox</h1>
          <p className="text-sm text-[hsl(var(--ink-3))]">
            Receipts, invoices, tax notices, mortgage letters, and other
            property records.
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

      {documents.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-2 py-16 text-center">
            <FileSearch className="h-8 w-8 text-[hsl(var(--ink-4))]" />
            <p className="font-medium">No business documents yet</p>
            <p className="max-w-md text-sm text-[hsl(var(--ink-3))]">
              Upload a photo or PDF. RAMA will OCR it, propose a property and
              category, then wait for your review.
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
                      {row.title || row.original_filename}
                    </CardTitle>
                    <p className="mt-1 text-xs text-[hsl(var(--ink-4))]">
                      {row.canonical_filename || row.original_filename} ·{' '}
                      {row.status.replaceAll('_', ' ')}
                      {row.holding_name ? ` · ${row.holding_name}` : ''}
                      {row.amount ? ` · $${row.amount}` : ''}
                    </p>
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
                  <p className="text-sm text-red-700">{row.failure_reason}</p>
                )}
                {['READY', 'NEEDS_REVIEW'].includes(row.status) && (
                  <>
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
                        <Label>Property holding</Label>
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
                          <SelectTrigger>
                            <SelectValue placeholder="Choose property" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="portfolio">
                              Whole portfolio
                            </SelectItem>
                            {holdings.map((holding) => (
                              <SelectItem key={holding.id} value={holding.id}>
                                {holding.name} · {holding.address}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
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
                      <div className="space-y-1">
                        <Label>Bank status</Label>
                        <Select
                          value={row.payment_state}
                          onValueChange={(value) =>
                            update(row.id, {
                              payment_state:
                                value as RamaDocument['payment_state'],
                            })
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="PAID">
                              Paid / left bank
                            </SelectItem>
                            <SelectItem value="UNPAID">
                              Invoice / not yet taken
                            </SelectItem>
                            <SelectItem value="NOT_APPLICABLE">
                              Not an expense
                            </SelectItem>
                            <SelectItem value="UNKNOWN">Not sure</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <Button
                      onClick={() => confirm(row)}
                      disabled={
                        busy || (!row.holding_id && !row.portfolio_wide)
                      }
                    >
                      <FileCheck2 className="mr-2 h-4 w-4" /> Confirm and file
                    </Button>
                  </>
                )}
                {row.status === 'FILED' && (
                  <p className="text-sm text-emerald-700">
                    Filed as {row.canonical_filename}
                    {row.ledger_entry_id
                      ? ' and linked to its immutable expense entry.'
                      : '.'}
                  </p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
