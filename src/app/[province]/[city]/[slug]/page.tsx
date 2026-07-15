// page.tsx

import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { PROVINCES, getListing, money, prettyDate } from "@/lib/publicApi";
import InquiryForm from "@/components/public/InquiryForm";
import ListingsMapLazy from "@/components/public/ListingsMapLazy";

export const revalidate = 300;

type Params = { province: string; city: string; slug: string };

export async function generateMetadata(
  { params }: { params: Promise<Params> },
): Promise<Metadata> {
  const { province, city, slug } = await params;
  if (!PROVINCES[province.toLowerCase()]) return { title: "Not found" };

  const p = await getListing(slug);
  if (!p) return { title: "Not found" };

  const title = `${p.type_label} in ${p.location} — ${money(p.asking_rent)}/mo`;
  return {
    title,
    description: (p.description || "").slice(0, 155) || title,
    alternates: { canonical: `/${province}/${city}/${slug}` },
    openGraph: {
      title,
      images: p.image ? [p.image] : undefined,
      type: "website",
    },
  };
}

export default async function ListingPage({
  params,
}: {
  params: Promise<Params>;
}) {
  const { province, city, slug } = await params;
  if (!PROVINCES[province.toLowerCase()]) notFound();

  const p = await getListing(slug);
  if (!p) notFound();

  const contents = [
    ...p.furnishings.sleeping,
    ...p.furnishings.furniture,
    ...p.furnishings.appliances,
  ];
  const landlordShares = p.shared_spaces.filter((s) => s.shared_with_landlord);

  return (
    <main className="mx-auto max-w-5xl px-5 py-8 sm:py-12">
      <nav className="mb-6 text-sm text-neutral-500">
        <Link href={`/${province}/${city}`} className="hover:text-neutral-900">
          {p.city}
        </Link>
        <span className="mx-1.5">/</span>
        <span className="text-neutral-900">{p.location}</span>
      </nav>

      {/* Gallery */}
      {p.images.length > 0 || p.image ? (
        <div className="mb-8 grid gap-2 overflow-hidden rounded-xl sm:grid-cols-3">
          {/* eslint-disable @next/next/no-img-element */}
          <img
            src={p.images[0]?.url ?? p.image ?? ""}
            alt={p.name}
            className="aspect-[4/3] w-full object-cover sm:col-span-2 sm:aspect-[16/10]"
          />
          <div className="grid gap-2">
            {p.images.slice(1, 3).map((img, i) => (
              <img
                key={i}
                src={img.url ?? ""}
                alt={img.caption || p.name}
                className="aspect-[4/3] w-full object-cover"
              />
            ))}
          </div>
          {/* eslint-enable @next/next/no-img-element */}
        </div>
      ) : null}

      <div className="grid gap-12 lg:grid-cols-[1fr_360px]">
        {/* ------------------------------------------------------- left */}
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-neutral-900 sm:text-3xl">
            {p.type_label} in {p.location}
          </h1>
          <p className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-neutral-600">
            <span className="text-xl font-semibold text-neutral-900">
              {money(p.asking_rent)}
              <span className="text-base font-normal text-neutral-500">/mo</span>
            </span>
            <span className="text-neutral-300">·</span>
            <span>Available {prettyDate(p.available_from)}</span>
            {p.square_footage && (
              <>
                <span className="text-neutral-300">·</span>
                <span>{p.square_footage} ft²</span>
              </>
            )}
            {p.is_furnished && (
              <span className="rounded-full bg-neutral-100 px-2.5 py-0.5 text-xs text-neutral-700">
                Furnished
              </span>
            )}
          </p>

          {p.description && (
            <p className="mt-6 whitespace-pre-line leading-relaxed text-neutral-700">
              {p.description}
            </p>
          )}

          {contents.length > 0 && (
            <Section title="What comes with it">
              <ul className="grid gap-x-6 gap-y-1.5 text-sm text-neutral-700 sm:grid-cols-2">
                {contents.map((c) => (
                  <li key={c} className="flex gap-2">
                    <span className="text-neutral-400">·</span>
                    {c}
                  </li>
                ))}
              </ul>
            </Section>
          )}

          {p.shared_spaces.length > 0 && (
            <Section title="Shared areas">
              <ul className="flex flex-wrap gap-2">
                {p.shared_spaces.map((s) => (
                  <li
                    key={s.name}
                    className="rounded-full bg-neutral-100 px-3 py-1 text-sm text-neutral-700"
                  >
                    {s.name}
                  </li>
                ))}
              </ul>

              {/* This one fact decides whether the provincial tenancy act
                  applies to the tenancy at all. Someone deciding whether to get
                  in a car and go and view the room deserves to know it before
                  they do — not after they've signed. */}
              {landlordShares.length > 0 && (
                <p className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                  <strong className="font-semibold">
                    The landlord lives here too.
                  </strong>{" "}
                  You'd be sharing the{" "}
                  {landlordShares.map((s) => s.name.toLowerCase()).join(" and ")}{" "}
                  with them. That usually means the provincial tenancy act
                  doesn't cover the arrangement — worth asking about.
                </p>
              )}
            </Section>
          )}

          {p.building_amenities.length > 0 && (
            <Section title="In the building">
              <ul className="flex flex-wrap gap-2">
                {p.building_amenities.map((a) => (
                  <li
                    key={a}
                    className="rounded-full bg-neutral-100 px-3 py-1 text-sm text-neutral-700"
                  >
                    {a}
                  </li>
                ))}
              </ul>
            </Section>
          )}

          {p.coords && (
            <Section title="Location">
              <ListingsMapLazy
                area={{ coords: p.coords }}
                className="h-64 w-full rounded-xl border border-neutral-200"
              />
              <p className="mt-2 text-xs text-neutral-500">
                Approximate area — the circle shows the neighbourhood, not the
                door.
              </p>
            </Section>
          )}

          <p className="mt-10 text-xs text-neutral-400">
            The exact address isn't shown publicly. The landlord will share it
            with you when you're in touch.
          </p>
        </div>

        {/* ------------------------------------------------------ right */}
        <aside className="lg:sticky lg:top-8 lg:self-start">
          <div className="rounded-xl border border-neutral-200 bg-white p-5 shadow-sm">
            {p.landlord && (
              <div className="mb-5 flex items-center gap-3 border-b border-neutral-100 pb-5">
                {p.landlord.photo ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={p.landlord.photo}
                    alt=""
                    className="h-11 w-11 rounded-full object-cover"
                  />
                ) : (
                  <div className="flex h-11 w-11 items-center justify-center rounded-full bg-neutral-100 text-sm font-medium text-neutral-500">
                    {p.landlord.name.charAt(0)}
                  </div>
                )}
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-neutral-900">
                    {p.landlord.name}
                  </p>
                  <Link
                    href={`/l/${p.landlord.slug}`}
                    className="text-xs text-teal-700 hover:underline"
                  >
                    See their other places
                  </Link>
                </div>
              </div>
            )}

            <InquiryForm propertySlug={p.slug} placeName={p.type_label} />
          </div>
        </aside>
      </div>
    </main>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mt-8 border-t border-neutral-200 pt-6">
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-neutral-500">
        {title}
      </h2>
      {children}
    </section>
  );
}