// TenantDocumentsTab.tsx
//
// The tenant home's Documents tab, split out of TenantDashboard.tsx: the
// on-demand lease PDF plus anything else attached to the lease.
'use client';
import { FileText, Download, Loader2 } from 'lucide-react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { format, parseISO } from 'date-fns';
import type { LeaseDocument } from '@/types/lease';

export default function TenantDocumentsTab({
  documents,
  isDownloadingPdf,
  onDownloadLeasePdf,
}: {
  documents: LeaseDocument[];
  isDownloadingPdf: boolean;
  onDownloadLeasePdf: () => void;
}) {
  return (
    <div className="mt-6">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle>Documents</CardTitle>
          <CardDescription>
            Your lease and anything attached to it
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="border-b">
            <div className="flex items-center justify-between p-4 hover:bg-canvas">
              <div className="flex items-center">
                <FileText className="mr-3 h-5 w-5 flex-shrink-0 text-ink-4" />
                <div>
                  <span className="text-sm font-medium">
                    Your lease agreement (PDF)
                  </span>
                  <p className="text-xs text-ink-3">
                    The exact document you signed, generated on demand
                  </p>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={onDownloadLeasePdf}
                disabled={isDownloadingPdf}
              >
                {isDownloadingPdf ? (
                  <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                ) : (
                  <Download className="mr-1 h-4 w-4" />
                )}
                Download
              </Button>
            </div>
          </div>

          {documents.length > 0 ? (
            <ul className="divide-y divide-line">
              {documents.map((doc) => (
                <li
                  key={doc.id}
                  className="flex items-center justify-between p-4 hover:bg-canvas"
                >
                  <div className="flex min-w-0 items-center">
                    <FileText className="mr-3 h-5 w-5 flex-shrink-0 text-ink-4" />
                    <div className="min-w-0">
                      <span className="truncate text-sm font-medium">
                        {doc.title}
                      </span>
                      <p className="text-xs text-ink-3">
                        {doc.uploaded_at
                          ? format(parseISO(doc.uploaded_at), 'MMM d, yyyy')
                          : '—'}
                      </p>
                    </div>
                  </div>
                  <Button variant="ghost" size="icon" asChild>
                    <a
                      href={doc.document}
                      target="_blank"
                      rel="noreferrer"
                      title={`Download ${doc.title}`}
                    >
                      <Download className="h-4 w-4" />
                    </a>
                  </Button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="p-6 text-center text-sm text-ink-3">
              No other documents on this lease.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
