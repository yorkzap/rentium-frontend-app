// publicApi.ts
//
// The logged-out layer. No token, ever — these call the AllowAny endpoints in
// rentium/showcase/api/urls.py:public_urlpatterns.
//
// Everything here runs in React Server Components, so the fetch happens on the
// Next server, not in the visitor's browser. That's deliberate: it means the city
// and listing pages are real HTML on first byte, which is the entire reason they
// can be indexed at all.

import { DJANGO_API_URL } from "@/lib/config";

// --------------------------------------------------------------- origins
//
// Next.js runs inside a Docker container; the visitor's browser does not. Those
// two see Django at different hostnames, and conflating them is what broke this
// page twice:
//
//   Node (in container)  ->  http://host.docker.internal:8000/api   [DJANGO_API_URL]
//   Browser (on the Mac) ->  http://localhost:8000/api              [NEXT_PUBLIC_...]
//
// DJANGO_API_URL is a server-only env var, so in a client bundle Next inlines it
// as `undefined` and we correctly fall through to the browser-facing value.

const SERVER_BASE = process.env.DJANGO_API_URL ?? DJANGO_API_URL;
const BROWSER_BASE = process.env.NEXT_PUBLIC_DJANGO_API_URL ?? DJANGO_API_URL;

const PUBLIC = `${SERVER_BASE}/public`;
const PUBLIC_BROWSER = `${BROWSER_BASE}/public`;

const SERVER_ORIGIN = new URL(SERVER_BASE).origin;
const BROWSER_ORIGIN = new URL(BROWSER_BASE).origin;

/**
 * DRF builds absolute media URLs with request.build_absolute_uri(), which reads
 * the incoming Host header. So a response fetched by Node comes back with every
 * image pointing at host.docker.internal — a name that resolves only inside
 * Docker, and 404s in the visitor's browser.
 *
 * Rather than force MEDIA_URL absolute on the Django side (which silently
 * disables django.conf.urls.static.static() and kills /media/ serving outright —
 * ask me how I know), we normalise the origin on the way in.
 *
 * No-ops when the two origins already agree, i.e. in production, or whenever Next
 * isn't containerised.
 */
function rewriteOrigins<T>(data: T): T {
  if (SERVER_ORIGIN === BROWSER_ORIGIN) return data;
  return JSON.parse(
    JSON.stringify(data).split(SERVER_ORIGIN).join(BROWSER_ORIGIN),
  ) as T;
}

export const PROVINCES: Record<string, string> = {
  ab: "Alberta",
  bc: "British Columbia",
  mb: "Manitoba",
  nb: "New Brunswick",
  nl: "Newfoundland and Labrador",
  ns: "Nova Scotia",
  nt: "Northwest Territories",
  nu: "Nunavut",
  on: "Ontario",
  pe: "Prince Edward Island",
  qc: "Quebec",
  sk: "Saskatchewan",
  yt: "Yukon",
};

export interface PublicCard {
  slug: string;
  name: string;
  type_label: string;
  location: string;
  city: string;
  city_slug: string;
  province: string;
  asking_rent: string | null;
  available_from: string | null;
  is_furnished: boolean;
  bedrooms: number | null;
  bathrooms: string | null;
  square_footage: number | null;
  image: string | null;
  coords: { lat: number; lng: number } | null;
  landlord_slug: string | null;
}

export interface PublicDetail extends PublicCard {
  description: string;
  max_occupancy: number | null;
  images: { url: string | null; caption: string }[];
  furnishings: {
    is_furnished: boolean;
    sleeping: string[];
    furniture: string[];
    appliances: string[];
  };
  shared_spaces: { name: string; shared_with_landlord: boolean }[];
  building_amenities: string[];
  landlord: { slug: string; name: string; photo: string | null } | null;
}

export interface CityPayload {
  city: string;
  city_slug: string;
  province_code: string;
  province_name: string;
  facets: {
    total: number;
    min_rent: string | null;
    max_rent: string | null;
    counts: { private_room: number; shared_room: number; full_suite: number };
    furnished: number;
  };
  results: PublicCard[];
}

export interface ShowcasePayload {
  slug: string;
  name: string;
  bio: string;
  photo: string | null;
  properties: PublicCard[];
  /** Set when the slug is RETIRED — the caller should 301 to it. */
  redirect_to?: string;
}

export interface CityIndexRow {
  city: string;
  city_slug: string;
  province_code: string;
  province_name: string;
  count: number;
}

export interface SitemapData {
  cities: CityIndexRow[];
  properties: {
    public_slug: string;
    city_slug: string;
    province_code: string;
    updated_at: string;
  }[];
  showcases: { slug: string; updated_at: string }[];
}

// A short revalidate window is what makes "the sitemap regenerates as properties
// change" true without a build step: a room going OCCUPIED drops out of
// Property.objects.public(), and within five minutes it drops out of here too.
const REVALIDATE = 300;

/**
 * The one fetcher.
 *
 * IMPORTANT — and this is a correction to how I first wrote it. The original
 * version did `if (!res.ok) return null`, and every caller turned null into
 * notFound(). Which means a 500 from Django rendered in the browser as a clean
 * 404 page. That is the single most misleading thing a frontend can do: it
 * converts "the backend is on fire" into "this page doesn't exist", and you go
 * hunting for a routing bug that was never there. It cost real time.
 *
 * Now: 404 is the ONLY status that means null. It's a real answer — this city or
 * listing genuinely isn't public. Everything else is a fault on our side and says
 * so. In dev it throws, loudly, with the status and body. In prod it degrades to a
 * 404 rather than a white screen, but it still shouts into the server log first.
 */
async function get<T>(path: string): Promise<T | null> {
  const url = `${PUBLIC}${path}`;

  let res: Response;
  try {
    res = await fetch(url, {
      next: { revalidate: REVALIDATE },
      headers: { Accept: "application/json" },
    });
  } catch (err) {
    const msg = `Public API unreachable: ${url}`;
    if (process.env.NODE_ENV !== "production") {
      throw new Error(`${msg} — is Django running on ${SERVER_BASE}?`, { cause: err });
    }
    console.error(msg, err);
    return null;
  }

  if (res.status === 404) return null;

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    const msg = `Public API ${res.status} on ${url}${body ? ` — ${body.slice(0, 300)}` : ""}`;
    if (process.env.NODE_ENV !== "production") throw new Error(msg);
    console.error(msg);
    return null;
  }

  try {
    return rewriteOrigins((await res.json()) as T);
  } catch (err) {
    const msg = `Public API returned non-JSON on ${url}`;
    if (process.env.NODE_ENV !== "production") throw new Error(msg, { cause: err });
    console.error(msg, err);
    return null;
  }
}

// -------------------------------------------------------------------- reads

export function getCity(
  province: string,
  city: string,
  search?: Record<string, string | undefined>,
): Promise<CityPayload | null> {
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(search ?? {})) {
    if (v) params.set(k, v);
  }
  const qs = params.toString();
  return get<CityPayload>(`/cities/${province}/${city}/${qs ? `?${qs}` : ""}`);
}

export const getCities = () => get<{ cities: CityIndexRow[] }>("/cities/");
export const getListing = (slug: string) => get<PublicDetail>(`/listings/${slug}/`);
export const getShowcase = (slug: string) => get<ShowcasePayload>(`/l/${slug}/`);
export const getSitemapData = () => get<SitemapData>("/sitemap-data/");

// -------------------------------------------------- the one write: contact
//
// Called from InquiryForm, a client component — so this runs in the visitor's
// browser and must use the browser-facing origin, not the container one.

export async function sendInquiry(payload: {
  property_slug: string;
  name: string;
  email: string;
  phone?: string;
  message: string;
  move_in_target?: string;
  /** Honeypot. A real person never sees this field; bots fill in everything. */
  website?: string;
}): Promise<{ ok: boolean; detail: string }> {
  const res = await fetch(`${PUBLIC_BROWSER}/inquiries/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    cache: "no-store",
  });

  const body = await res.json().catch(() => ({} as Record<string, unknown>));

  if (!res.ok) {
    // DRF shape: {"field": ["message"]} or {"detail": "..."}
    const msg =
      (body as { detail?: string }).detail ||
      (body as { property_slug?: string[] }).property_slug?.[0] ||
      Object.values(body).flat().filter((v) => typeof v === "string")[0] ||
      "Couldn't send your message. Try again in a moment.";
    throw new Error(String(msg));
  }

  return body as { ok: boolean; detail: string };
}

// ------------------------------------------------------------------ format

export function money(v: string | null): string {
  if (!v) return "—";
  return `$${Math.round(Number(v)).toLocaleString()}`;
}

export function prettyDate(iso: string | null): string {
  if (!iso) return "Now";
  const d = new Date(`${iso}T00:00:00`);
  return isNaN(d.getTime())
    ? iso
    : d.toLocaleDateString("en-CA", { month: "short", day: "numeric" });
}