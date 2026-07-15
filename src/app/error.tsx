'use client';

// Root error boundary for public pages.
import { RefreshCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function RootError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-canvas px-4 text-center">
      <p className="text-kicker">Rentium</p>
      <h1 className="mt-3 text-2xl font-semibold tracking-tight text-ink">
        That didn&rsquo;t work — let&rsquo;s try again.
      </h1>
      <p className="mt-2 max-w-sm text-sm leading-6 text-ink-3">
        Something went wrong rendering this page. It&rsquo;s on our side, not
        yours.
      </p>
      {error.digest && (
        <p className="mt-2 text-xs text-ink-5">Reference: {error.digest}</p>
      )}
      <Button onClick={reset} className="mt-6 rounded-full px-6">
        <RefreshCcw className="mr-2 h-4 w-4" />
        Reload
      </Button>
    </div>
  );
}
