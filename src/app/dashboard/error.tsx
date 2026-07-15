'use client';

// Segment error boundary: an API blip should read as a hiccup with a retry
// button, never a stack trace or a dead white page.
import { RefreshCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 text-center">
      <h2 className="text-lg font-semibold text-ink">
        Something went wrong loading this page.
      </h2>
      <p className="mt-2 max-w-sm text-sm leading-6 text-ink-3">
        Your data is safe — this is a display problem, not a data problem. Try
        again, and if it keeps happening, refresh the browser.
      </p>
      {error.digest && (
        <p className="mt-2 text-xs text-ink-5">Reference: {error.digest}</p>
      )}
      <Button onClick={reset} className="mt-6 rounded-full px-6">
        <RefreshCcw className="mr-2 h-4 w-4" />
        Try again
      </Button>
    </div>
  );
}
