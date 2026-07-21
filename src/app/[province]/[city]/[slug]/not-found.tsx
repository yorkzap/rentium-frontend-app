// Listing-specific not-found. Renders inside [province]/layout.tsx, so it keeps
// the public header/footer — unlike the bare root not-found. A listing 404s for
// an ordinary reason: the room was taken, or the landlord unlisted it. Say that,
// don't imply the visitor did something wrong.
import Link from 'next/link';

export default function ListingNotFound() {
  return (
    <main className="mx-auto flex max-w-2xl flex-col items-center px-5 py-20 text-center sm:py-28">
      <p className="text-kicker">Rentium</p>
      <h1 className="mt-3 text-2xl font-semibold tracking-tight text-ink">
        This place isn&rsquo;t available right now.
      </h1>
      <p className="mt-2 max-w-md text-sm leading-6 text-ink-3">
        It may have just been rented, or the landlord took the listing down.
        Plenty of others are looking for tenants — take a look.
      </p>
      <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
        <Link
          href="/bc/saanich"
          className="rounded-full bg-ink px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-ink/90"
        >
          Browse rentals
        </Link>
        <Link
          href="/"
          className="rounded-full border border-neutral-200 bg-white px-6 py-2.5 text-sm font-medium text-ink-2 transition-colors hover:bg-neutral-50"
        >
          Back to home
        </Link>
      </div>
    </main>
  );
}
