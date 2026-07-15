// page.tsx
//
// A city page. Server-rendered, cached, indexable.
//
// It renders — with real content — even when the city currently has ZERO
// vacancies. That is not an oversight, it's the point: a page whose entire
// value is "here are today's listings" is structurally guaranteed to 404 every
// time inventory turns over, get dropped from Google's index, and have to climb
// back from nothing. In rentals, inventory turns over constantly. So the page
// survives the gap and says so honestly.

import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import {
  PROVINCES,
  getCity,
  money,
  prettyDate,
  type PublicCard,
} from "@/lib/publicApi";
import CityMap from "@/components/public/CityMap";

export const revalidate = 300;

type Params = { province: string; city: string };
type Search = { type?: string; furnished?: string; min_rent?: string; max_rent?: string };

// Root-level dynamic segments are greedy. Next gives static routes (/dashboard,
// /auth, /pricing) priority, so they still win — but a stray /foo/bar would
// otherwise hit Django. Rejecting anything that isn't a real province code here
// keeps that traffic out of the API entirely.
function assertProvince(code: string) {
  if (!PROVINCES[code.toLowerCase()]) notFound();
}

export async function generateMetadata(
  { params }: { params: Promise<Params> },
): Promise<Metadata> {
  const { province, city } = await params;
  assertProvince(province);

  const data = await getCity(province, city);
  if (!data) return { title: "Not found" };

  const n = data.facets.total;
  const title =
    n > 0
      ? `${n} room${n === 1 ? "" : "s"} & rentals in ${data.city}, ${data.province_code.toUpperCase()}`
      : `Rooms & rentals in ${data.city}, ${data.province_code.toUpperCase()}`;

  return {
    title,
    description:
      `Rooms, shared suites and full units for rent in ${data.city}, ` +
      `${data.province_name}. Listed directly by the people who own them.`,
    alternates: { canonical: `/${province}/${city}` },
    openGraph: { title, type: "website" },
  };
}

export default async function CityPage({
  params,
  searchParams,
}: {
  params: Promise<Params>;
  searchParams: Promise<Search>;
}) {
  const { province, city } = await params;
  const search = await searchParams;
  assertProvince(province);

  const data = await getCity(province, city, search);
  if (!data) notFound();

  const { facets, results } = data;
  const base = `/${province}/${city}`;

  const filters = [
    { key: undefined, label: "Everything", n: facets.total },
    { key: "private_room", label: "Private rooms", n: facets.counts.private_room },
    { key: "shared_room", label: "Shared rooms", n: facets.counts.shared_room },
    { key: "full_suite", label: "Full suites", n: facets.counts.full_suite },
  ];

  return (
    <main className="mx-auto max-w-6xl px-5 py-10 sm:py-14">
      <nav className="mb-6 text-sm text-neutral-500">
        <Link href="/" className="hover:text-neutral-900">Rentium</Link>
        <span className="mx-1.5">/</span>
        <span className="text-neutral-900">{data.city}</span>
      </nav>

      <header className="mb-8">
        <h1 className="text-3xl font-semibold tracking-tight text-neutral-900 sm:text-4xl">
          Places to rent in {data.city}
        </h1>
        <p className="mt-2 max-w-2xl text-neutral-600">
          {facets.total > 0 ? (
            <>
              {facets.total} available right now
              {facets.min_rent && <> · from {money(facets.min_rent)}/mo</>}
              . Listed by the people who actually own them — no agency fee, no
              middleman.
            </>
          ) : (
            <>
              Nothing is free in {data.city} this minute. Places here go
              quickly; check back, or look at a nearby city.
            </>
          )}
        </p>
      </header>

      {facets.total > 0 && (
        <div className="mb-8 flex flex-wrap gap-2">
          {filters
            .filter((f) => f.n > 0 || !f.key)
            .map((f) => {
              const active = (search.type ?? undefined) === f.key;
              const href = f.key ? `${base}?type=${f.key}` : base;
              return (
                <Link
                  key={f.label}
                  href={href}
                  className={[
                    "rounded-full border px-3.5 py-1.5 text-sm transition",
                    active
                      ? "border-neutral-900 bg-neutral-900 text-white"
                      : "border-neutral-200 bg-white text-neutral-700 hover:border-neutral-400",
                  ].join(" ")}
                >
                  {f.label}
                  <span className={active ? "ml-1.5 opacity-60" : "ml-1.5 text-neutral-400"}>
                    {f.n}
                  </span>
                </Link>
              );
            })}
          {facets.furnished > 0 && (
            <Link
              href={search.furnished ? base : `${base}?furnished=1`}
              className={[
                "rounded-full border px-3.5 py-1.5 text-sm transition",
                search.furnished
                  ? "border-neutral-900 bg-neutral-900 text-white"
                  : "border-neutral-200 bg-white text-neutral-700 hover:border-neutral-400",
              ].join(" ")}
            >
              Furnished
              <span className={search.furnished ? "ml-1.5 opacity-60" : "ml-1.5 text-neutral-400"}>
                {facets.furnished}
              </span>
            </Link>
          )}
        </div>
      )}

      {results.length > 0 ? (
        <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_400px] lg:items-start lg:gap-8">
          <ul className="grid gap-6 sm:grid-cols-2">
            {results.map((p) => (
              <ListingCard key={p.slug} p={p} href={`${base}/${p.slug}`} />
            ))}
          </ul>
          <CityMap
            pins={results
              .filter((p) => p.coords)
              .map((p) => ({
                id: p.slug,
                title: p.name,
                href: `${base}/${p.slug}`,
                priceLabel: p.asking_rent ? `${money(p.asking_rent)}/mo` : undefined,
                coords: p.coords!,
              }))}
          />
        </div>
      ) : (
        <EmptyState city={data.city} filtered={Object.keys(search).length > 0} base={base} />
      )}

      <section className="mt-16 border-t border-neutral-200 pt-10">
        <h2 className="text-lg font-semibold text-neutral-900">
          Renting in {data.city}
        </h2>
        <div className="mt-3 max-w-2xl space-y-3 text-sm leading-relaxed text-neutral-600">
          <p>
            Every place on this page is listed by its owner. You message them
            directly and they reply to you by email — there's no agency in the
            middle and no fee for asking.
          </p>
          <p>
            Listings show the neighbourhood rather than the street address. The
            exact address is something a landlord shares with you once you've
            been in touch, not something we publish to strangers.
          </p>
        </div>
      </section>
    </main>
  );
}

function ListingCard({ p, href }: { p: PublicCard; href: string }) {
  return (
    <li>
      <Link
        href={href}
        className="group block overflow-hidden rounded-xl border border-neutral-200 bg-white transition hover:border-neutral-300 hover:shadow-[0_6px_24px_-12px_rgba(0,0,0,0.18)]"
      >
        <div className="aspect-[4/3] overflow-hidden bg-neutral-100">
          {p.image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={p.image}
              alt={p.name}
              className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.03]"
              loading="lazy"
            />
          ) : (
            <div className="flex h-full items-center justify-center text-sm text-neutral-400">
              No photo yet
            </div>
          )}
        </div>

        <div className="p-4">
          <div className="flex items-baseline justify-between gap-3">
            <span className="text-lg font-semibold text-neutral-900">
              {money(p.asking_rent)}
              <span className="text-sm font-normal text-neutral-500">/mo</span>
            </span>
            {p.is_furnished && (
              <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-xs text-neutral-600">
                Furnished
              </span>
            )}
          </div>
          <p className="mt-1 truncate text-sm font-medium text-neutral-800">
            {p.type_label}
          </p>
          <p className="mt-0.5 truncate text-sm text-neutral-500">{p.location}</p>
          <p className="mt-2 text-xs text-neutral-500">
            Available {prettyDate(p.available_from)}
            {p.square_footage ? ` · ${p.square_footage} ft²` : ""}
          </p>
        </div>
      </Link>
    </li>
  );
}

function EmptyState({
  city,
  filtered,
  base,
}: {
  city: string;
  filtered: boolean;
  base: string;
}) {
  return (
    <div className="rounded-xl border border-dashed border-neutral-300 bg-neutral-50 px-6 py-16 text-center">
      <p className="text-neutral-900">
        {filtered
          ? "Nothing matches those filters right now."
          : `No places are free in ${city} at the moment.`}
      </p>
      {filtered ? (
        <Link
          href={base}
          className="mt-3 inline-block text-sm font-medium text-teal-700 hover:underline"
        >
          Clear filters
        </Link>
      ) : (
        <p className="mx-auto mt-2 max-w-sm text-sm text-neutral-500">
          Rooms here turn over often — it's worth checking back in a week.
        </p>
      )}
    </div>
  );
}