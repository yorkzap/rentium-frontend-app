import type { Metadata } from 'next';
import Link from 'next/link';

import {
  getRentalListings,
  money,
  prettyDate,
  type PublicCard,
} from '@/lib/publicApi';

export const metadata: Metadata = {
  title: 'Browse rentals',
  description:
    'Explore the latest rooms, suites, and apartments listed directly by Canadian landlords.',
  alternates: { canonical: '/rentals' },
};

export const revalidate = 300;

type Search = {
  area?: string;
  type?: string;
  furnished?: string;
  min_rent?: string;
  max_rent?: string;
};

export default async function RentalsPage({
  searchParams,
}: {
  searchParams: Promise<Search>;
}) {
  const search = await searchParams;
  const [province, city] = (search.area ?? '').split(':');
  const data = await getRentalListings({
    province,
    city,
    type: search.type,
    furnished: search.furnished,
    min_rent: search.min_rent,
    max_rent: search.max_rent,
  });

  const areas = data?.areas ?? [];
  const results = data?.results ?? [];

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6 sm:py-14">
      <header className="max-w-3xl">
        <p className="text-kicker">Available now</p>
        <h1 className="mt-3 text-4xl font-semibold tracking-tight text-ink sm:text-5xl">
          Find a place that fits.
        </h1>
        <p className="mt-4 text-lg leading-8 text-ink-3">
          Browse the latest rooms and complete homes. Filter by area, place
          type, furnishing, and monthly rent.
        </p>
      </header>

      <form
        action="/rentals"
        className="mt-8 grid gap-3 rounded-2xl border border-line bg-white p-4 shadow-sm md:grid-cols-2 lg:grid-cols-6"
      >
        <label className="space-y-1.5 lg:col-span-2">
          <span className="text-xs font-semibold uppercase tracking-wide text-ink-3">
            Area
          </span>
          <select
            name="area"
            defaultValue={search.area ?? ''}
            className="h-11 w-full rounded-lg border border-line bg-white px-3 text-sm text-ink"
          >
            <option value="">Everywhere</option>
            {areas.map((area) => (
              <option
                key={`${area.province_code}:${area.city_slug}`}
                value={`${area.province_code}:${area.city_slug}`}
              >
                {area.city}, {area.province_code.toUpperCase()} ({area.count})
              </option>
            ))}
          </select>
        </label>

        <label className="space-y-1.5">
          <span className="text-xs font-semibold uppercase tracking-wide text-ink-3">
            Place type
          </span>
          <select
            name="type"
            defaultValue={search.type ?? ''}
            className="h-11 w-full rounded-lg border border-line bg-white px-3 text-sm text-ink"
          >
            <option value="">Any type</option>
            <option value="private_room">Private room</option>
            <option value="shared_room">Shared room</option>
            <option value="full_suite">Full suite or unit</option>
          </select>
        </label>

        <PriceInput name="min_rent" label="Min rent" value={search.min_rent} />
        <PriceInput name="max_rent" label="Max rent" value={search.max_rent} />

        <div className="flex items-end gap-2">
          <button
            type="submit"
            className="h-11 flex-1 rounded-full bg-ink px-5 text-sm font-medium text-white transition hover:bg-ink/90"
          >
            Search
          </button>
          {(search.area ||
            search.type ||
            search.furnished ||
            search.min_rent ||
            search.max_rent) && (
            <Link
              href="/rentals"
              className="flex h-11 items-center rounded-full px-3 text-sm text-ink-3 hover:text-ink"
            >
              Clear
            </Link>
          )}
        </div>

        <label className="flex items-center gap-2 text-sm text-ink-2 lg:col-span-6">
          <input
            type="checkbox"
            name="furnished"
            value="1"
            defaultChecked={search.furnished === '1'}
            className="h-4 w-4 rounded border-line"
          />
          Furnished places only
        </label>
      </form>

      <section className="mt-10">
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-ink-3">
              {data?.total ?? 0} place{data?.total === 1 ? '' : 's'}
            </p>
            <h2 className="mt-1 text-2xl font-semibold text-ink">
              {Object.values(search).some(Boolean)
                ? 'Matching rentals'
                : 'Latest listings'}
            </h2>
          </div>
        </div>

        {results.length ? (
          <ul className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {results.map((property) => (
              <RentalCard key={property.slug} property={property} />
            ))}
          </ul>
        ) : (
          <div className="mt-6 rounded-2xl border border-dashed border-line bg-surface-sunken px-6 py-14 text-center">
            <h3 className="font-semibold text-ink">No exact matches yet</h3>
            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-ink-3">
              Try a wider area or remove one of the filters. New landlord
              listings will appear here automatically.
            </p>
            <Link
              href="/rentals"
              className="mt-5 inline-flex rounded-full border border-line bg-white px-5 py-2.5 text-sm font-medium text-ink hover:bg-canvas"
            >
              See all rentals
            </Link>
          </div>
        )}
      </section>
    </main>
  );
}

function PriceInput({
  name,
  label,
  value,
}: {
  name: string;
  label: string;
  value?: string;
}) {
  return (
    <label className="space-y-1.5">
      <span className="text-xs font-semibold uppercase tracking-wide text-ink-3">
        {label}
      </span>
      <div className="relative">
        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-ink-3">
          $
        </span>
        <input
          type="number"
          min="0"
          step="50"
          name={name}
          defaultValue={value}
          placeholder="Any"
          className="h-11 w-full rounded-lg border border-line bg-white pl-7 pr-3 text-sm text-ink"
        />
      </div>
    </label>
  );
}

function RentalCard({ property }: { property: PublicCard }) {
  const href = `/${property.province}/${property.city_slug}/${property.slug}`;

  return (
    <li>
      <Link
        href={href}
        className="group block h-full overflow-hidden rounded-2xl border border-line bg-white transition hover:-translate-y-0.5 hover:shadow-lg"
      >
        <div className="aspect-[4/3] overflow-hidden bg-surface-sunken">
          {property.image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={property.image}
              alt={property.name}
              className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.03]"
            />
          ) : (
            <div className="flex h-full items-center justify-center text-sm text-ink-4">
              Photos coming soon
            </div>
          )}
        </div>
        <div className="p-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-ink-4">
                {property.type_label}
              </p>
              <h3 className="mt-1 font-semibold text-ink">{property.name}</h3>
            </div>
            <p className="shrink-0 font-semibold text-ink">
              {money(property.asking_rent)}
              <span className="text-xs font-normal text-ink-3">/mo</span>
            </p>
          </div>
          <p className="mt-3 text-sm text-ink-3">{property.location}</p>
          <p className="mt-2 text-xs text-ink-4">
            {property.available_from
              ? `Available ${prettyDate(property.available_from)}`
              : 'Available now'}
            {property.is_furnished ? ' · Furnished' : ''}
          </p>
        </div>
      </Link>
    </li>
  );
}
