import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Landlord showcase subdomains: raj-rentals.rentium.ca serves ONLY the
// landlord's showcase page (/l/raj-rentals). Everything else — their listings,
// pricing, the app, auth — lives on the main site, so any other path on a
// vanity host 301s to the apex. The showcase is the one thing exclusive to the
// subdomain; a landlord's listings stay on rentium.ca/<province>/<city>/...
//
// ROOT domain comes from env so this works everywhere with zero setup:
//   dev        → localhost:3000 (browsers resolve *.localhost to loopback, so
//                raj-rentals.localhost:3000 just works)
//   production → set NEXT_PUBLIC_ROOT_DOMAIN=rentium.ca
//
// Go-live steps (DNS/TLS) are documented in README.md. The canonical URL for
// SEO stays the /l/<slug> path form on the apex — the showcase page emits
// rel=canonical there so the two hostnames don't split ranking.

const ROOT_DOMAIN = process.env.NEXT_PUBLIC_ROOT_DOMAIN ?? 'localhost:3000';

// MUST stay in sync with the backend's showcase.models.RESERVED_SLUGS — a name
// reserved there can never be a landlord slug, so it must never be treated as a
// tenant subdomain here either.
const RESERVED_SUBDOMAINS = new Set([
  'admin',
  'api',
  'app',
  'about',
  'auth',
  'blog',
  'contact',
  'dashboard',
  'help',
  'invite',
  'l',
  'legal',
  'login',
  'logout',
  'mail',
  'media',
  'pricing',
  'privacy',
  'public',
  'rentium',
  'settings',
  'signup',
  'sitemap',
  'static',
  'support',
  'terms',
  'viewing',
  'www',
  // every province code, mirroring the backend
  'ab',
  'bc',
  'mb',
  'nb',
  'nl',
  'ns',
  'nt',
  'nu',
  'on',
  'pe',
  'qc',
  'sk',
  'yt',
]);

export function middleware(request: NextRequest) {
  const host = request.headers.get('host') ?? '';

  if (host !== ROOT_DOMAIN && host.endsWith(`.${ROOT_DOMAIN}`)) {
    const slug = host.slice(0, -(ROOT_DOMAIN.length + 1));

    // Only single-label, plausible slugs: "raj-rentals", not "a.b" or "www".
    if (slug && !slug.includes('.') && !RESERVED_SUBDOMAINS.has(slug)) {
      const url = request.nextUrl.clone();

      // The root of the vanity host → the landlord's showcase.
      if (url.pathname === '/') {
        url.pathname = `/l/${slug}`;
        return NextResponse.rewrite(url);
      }

      // Everything else belongs to the main site. Send them there, same path,
      // so a listing/pricing/app/auth link on a subdomain resolves canonically
      // on the apex instead of being duplicated under the vanity host.
      const apex = request.nextUrl.clone();
      apex.host = ROOT_DOMAIN;
      return NextResponse.redirect(apex);
    }
  }

  return NextResponse.next();
}

export const config = {
  // Run on everything except Next internals and static assets; the handler
  // itself is a no-op unless the Host header is a tenant subdomain.
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)'],
};
