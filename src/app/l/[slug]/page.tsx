// page.tsx
import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { getShowcase, money, prettyDate } from "@/lib/publicApi";

export const revalidate = 300;

type Params = { slug: string };

export async function generateMetadata(
  { params }: { params: Promise<Params> },
): Promise<Metadata> {
  const { slug } = await params;
  const s = await getShowcase(slug);
  if (!s || s.redirect_to) return { title: "Not found" };
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

  return (
    <main className="mx-auto max-w-5xl px-5 py-12">
      <header className="flex items-center gap-4">
        {s.photo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={s.photo} alt="" className="h-16 w-16 rounded-xl object-cover" />
        ) : (
          <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-neutral-100 text-xl font-medium text-neutral-500">
            {s.name.charAt(0)}
          </div>
        )}
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-neutral-900">
            {s.name}
          </h1>
          <p className="text-sm text-neutral-500">
            {s.properties.length} place{s.properties.length === 1 ? "" : "s"} available
          </p>
        </div>
      </header>

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
                    <span className="text-sm font-normal text-neutral-500">/mo</span>
                  </p>
                  <p className="mt-0.5 text-sm text-neutral-700">{p.type_label}</p>
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