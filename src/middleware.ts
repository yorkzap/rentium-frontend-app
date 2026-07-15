import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Landlord showcase subdomains: raj-rentals.rentium.ca serves /l/raj-rentals.
//
// ROOT domain comes from env so this works everywhere with zero setup:
//   dev        → localhost:3000 (browsers resolve *.localhost to loopback, so
//                raj-rentals.localhost:3000 just works)
//   production → set NEXT_PUBLIC_ROOT_DOMAIN=rentium.ca
//
// Go-live steps (DNS/TLS) are documented in README.md. The canonical URL for
// SEO stays the /l/<slug> path form — showcase pages should emit
// rel=canonical pointing there so the two hostnames don't split ranking.
//
// TODO: auth-cookie enforcement for /dashboard is still a known gap — the
// client-side guard in dashboard/layout.tsx plus backend token auth are the
// current protection.

const ROOT_DOMAIN = process.env.NEXT_PUBLIC_ROOT_DOMAIN ?? 'localhost:3000';

// Subdomains that must never be treated as a landlord slug.
const RESERVED_SUBDOMAINS = new Set(['www', 'app', 'api', 'admin', 'mail']);

export function middleware(request: NextRequest) {
  const host = request.headers.get('host') ?? '';

  if (host !== ROOT_DOMAIN && host.endsWith(`.${ROOT_DOMAIN}`)) {
    const slug = host.slice(0, -(ROOT_DOMAIN.length + 1));

    // Only single-label, plausible slugs: "raj-rentals", not "a.b" or "www".
    if (slug && !slug.includes('.') && !RESERVED_SUBDOMAINS.has(slug)) {
      const url = request.nextUrl.clone();

      // Never expose the app itself on tenant subdomains.
      if (
        url.pathname.startsWith('/dashboard') ||
        url.pathname.startsWith('/auth')
      ) {
        const redirect = request.nextUrl.clone();
        redirect.host = ROOT_DOMAIN;
        return NextResponse.redirect(redirect);
      }

      // Root of the subdomain → the showcase page. Deeper paths (e.g. a
      // listing link inside the showcase) pass through untouched so shared
      // absolute links keep working.
      if (url.pathname === '/') {
        url.pathname = `/l/${slug}`;
        return NextResponse.rewrite(url);
      }
    }
  }

  return NextResponse.next();
}

export const config = {
  // Run on everything except Next internals and static assets; the handler
  // itself is a no-op unless the Host header is a tenant subdomain.
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)'],
};
