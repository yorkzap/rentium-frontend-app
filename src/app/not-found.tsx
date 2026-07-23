// Global not-found boundary.
//
// Before this file existed, every notFound() — a genuinely-private listing, a
// retired showcase slug, a mistyped URL — fell through to Next's default 404,
// which renders inside the provider-only root layout with no styling at all.
// That bare page is what read as "blank". This gives notFound() a real face.
import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-canvas px-4 text-center">
      <p className="text-kicker">Rentium</p>
      <h1 className="mt-3 text-2xl font-semibold tracking-tight text-ink">
        We couldn&rsquo;t find that page.
      </h1>
      <p className="mt-2 max-w-sm text-sm leading-6 text-ink-3">
        The link may be broken, or the page may have moved. It happens — no harm
        done.
      </p>
      <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
        <Link
          href="/"
          className="rounded-full bg-ink px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-ink/90"
        >
          Back to home
        </Link>
        <Link
          href="/rentals"
          className="rounded-full border border-neutral-200 bg-white px-6 py-2.5 text-sm font-medium text-ink-2 transition-colors hover:bg-neutral-50"
        >
          Browse rentals
        </Link>
      </div>
    </div>
  );
}
