// page.tsx
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';

import { getShowcase, money, prettyDate } from '@/lib/publicApi';

export const revalidate = 300;

type Params = { slug: string };

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { slug } = await params;
  const s = await getShowcase(slug);
  if (!s || s.redirect_to) return { title: 'Not found' };
  return {
    title: `${s.name} — places for rent`,
    description: s.bio?.slice(0, 155) || `Rentals listed by ${s.name}.`,
    alternates: { canonical: `/l/${slug}` },
  };
}

export default async function ShowcasePage({
  params,
}: {
  params: Promise<Params>;
}) {
  const { slug } = await params;
  const s = await getShowcase(slug);
  if (!s) notFound();

  // A landlord who tidies up their URL shouldn't 404 every link they've already
  // put on a poster. Retired slugs 301 here.
  if (s.redirect_to) redirect(`/l/${s.redirect_to}`);

  // City chips: derived from what's actually listed, linking into the
  // public city pages. No stored field to go stale.
  const cities = Array.from(
    new Map(
      s.properties.map((p) => [
        `${p.province}/${p.city_slug}`,
        {
          label: p.location.split(',').pop()?.trim() || p.city_slug,
          href: `/${p.province}/${p.city_slug}`,
        },
      ])
    ).values()
  );

  return (
    <main className="mx-auto max-w-5xl px-5 pb-12">
      {/* Cover band — brand-toned, quietly textured, no stock photography. */}
      <div
        className="relative -mx-5 h-40 overflow-hidden sm:h-52 sm:rounded-b-2xl"
        aria-hidden
      >
        <div className="absolute inset-0 bg-gradient-to-br from-[hsl(var(--brand))] via-[hsl(var(--brand))] to-[hsl(var(--brand-ink))]" />
        {/* hand-drawn rooflines along the bottom, in keeping with the site's line work */}
        <svg
          viewBox="0 0 800 120"
          preserveAspectRatio="xMidYMax slice"
          className="absolute inset-x-0 bottom-0 h-24 w-full text-white/15"
          fill="none"
        >
          <path
            d="M-10 120V84l50-32 52 30 38-22 60 34 44-26 70 40 36-20 58 32 48-28 66 36 40-24 62 34 50-28 60 34 40-22 46 26V120z"
            fill="currentColor"
          />
          <path
            d="M-10 92l50-32 52 30 38-22 60 34 44-26 70 40 36-20 58 32 48-28 66 36 40-24 62 34 50-28 60 34 40-22 46 26"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinejoin="round"
          />
        </svg>
      </div>

      <header className="relative -mt-10 flex flex-col gap-4 sm:-mt-12 sm:flex-row sm:items-end">
        {s.photo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={s.photo}
            alt=""
            className="h-20 w-20 rounded-2xl border-4 border-white object-cover shadow-md sm:h-24 sm:w-24"
          />
        ) : (
          <div className="flex h-20 w-20 items-center justify-center rounded-2xl border-4 border-white bg-neutral-100 text-2xl font-medium text-neutral-500 shadow-md sm:h-24 sm:w-24">
            {s.name.charAt(0)}
          </div>
        )}
        <div className="pb-1">
          <h1 className="text-2xl font-semibold tracking-tight text-neutral-900 sm:text-3xl">
            {s.name}
          </h1>
          <p className="mt-1 text-sm text-neutral-500">
            {s.properties.length} place{s.properties.length === 1 ? '' : 's'}{' '}
            available
            {cities.length > 0 && (
              <>
                {' '}
                in {cities.length} {cities.length === 1 ? 'city' : 'cities'}
              </>
            )}{' '}
            · Managed on Rentium
          </p>
        </div>
      </header>

      {cities.length > 0 && (
        <div className="mt-5 flex flex-wrap gap-2">
          {cities.map((c) => (
            <Link
              key={c.href}
              href={c.href}
              className="rounded-full border border-neutral-200 bg-white px-3.5 py-1.5 text-sm text-neutral-700 transition-colors hover:border-neutral-300 hover:bg-neutral-50"
            >
              {c.label}
            </Link>
          ))}
        </div>
      )}

      {s.bio && (
        <p className="mt-6 max-w-2xl whitespace-pre-line leading-relaxed text-neutral-700">
          {s.bio}
        </p>
      )}

      {s.properties.length > 0 ? (
        <ul className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {s.properties.map((p) => (
            <li key={p.slug}>
              <Link
                href={`/${p.province}/${p.city_slug}/${p.slug}`}
                className="group block overflow-hidden rounded-xl border border-neutral-200 bg-white transition hover:border-neutral-300"
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
                  ) : null}
                </div>
                <div className="p-4">
                  <p className="text-lg font-semibold text-neutral-900">
                    {money(p.asking_rent)}
                    <span className="text-sm font-normal text-neutral-500">
                      /mo
                    </span>
                  </p>
                  <p className="mt-0.5 text-sm text-neutral-700">
                    {p.type_label}
                  </p>
                  <p className="text-sm text-neutral-500">{p.location}</p>
                  <p className="mt-2 text-xs text-neutral-500">
                    Available {prettyDate(p.available_from)}
                  </p>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-10 rounded-xl border border-dashed border-neutral-300 bg-neutral-50 px-6 py-14 text-center text-neutral-500">
          Nothing available right now.
        </p>
      )}
    </main>
  );
}
