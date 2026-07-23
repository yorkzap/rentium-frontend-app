// Vercel has www.rentium.ca configured as the canonical production domain.
// Fetching rentium.ca would return its canonical redirect, which would leak
// through the Worker and move the visitor away from the vanity hostname.
const APEX_ORIGIN = 'https://www.rentium.ca';

// Keep this list aligned with src/middleware.ts and the backend's
// showcase.models.RESERVED_SLUGS. Reserved infrastructure hosts must continue
// to their normal origin (especially api.rentium.ca -> Cloudflare Tunnel).
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
  'rentals',
  'rentium',
  'settings',
  'signup',
  'sitemap',
  'static',
  'support',
  'terms',
  'viewing',
  'www',
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

function proxyToApex(request, targetUrl) {
  return fetch(targetUrl, {
    method: request.method,
    headers: request.headers,
    body: ['GET', 'HEAD'].includes(request.method) ? undefined : request.body,
    redirect: 'manual',
  });
}

export default {
  async fetch(request) {
    const requestUrl = new URL(request.url);
    const hostname = requestUrl.hostname.toLowerCase();
    const suffix = '.rentium.ca';

    if (!hostname.endsWith(suffix)) {
      return fetch(request);
    }

    const slug = hostname.slice(0, -suffix.length);
    if (!slug || slug.includes('.')) {
      return fetch(request);
    }

    // api.rentium.ca is a real, separate Cloudflare Tunnel origin. www is the
    // canonical Vercel origin and must never redirect to itself if its DNS is
    // proxied in the future.
    if (slug === 'api' || slug === 'www') {
      return fetch(request);
    }

    // Other reserved names are application aliases, not landlord showcases.
    // Sending them through the wildcard CNAME asks Vercel for an unsupported
    // <name>.rentium.ca certificate and produces Cloudflare 525. Normalize
    // legacy document links while sending all such traffic to the canonical
    // application origin.
    if (RESERVED_SUBDOMAINS.has(slug)) {
      const legacyDocument = requestUrl.pathname.match(
        /^\/business_document\/([0-9a-f-]+)\/?$/i
      );
      const pathname = legacyDocument
        ? `/dashboard/documents?document=${legacyDocument[1]}`
        : requestUrl.pathname;
      const target =
        legacyDocument && requestUrl.search
          ? `${pathname}&${requestUrl.search.slice(1)}`
          : `${pathname}${requestUrl.search}`;
      return Response.redirect(new URL(target, APEX_ORIGIN), 307);
    }

    // The browser remains at https://<slug>.rentium.ca while Vercel receives a
    // hostname and path for which it has a valid certificate and Next route.
    if (requestUrl.pathname === '/') {
      const target = new URL(`/l/${slug}${requestUrl.search}`, APEX_ORIGIN);
      return proxyToApex(request, target);
    }

    // Next.js assets referenced by the proxied page must also be fetched from
    // the apex Vercel deployment. Other links belong to the main Rentium site.
    if (
      requestUrl.pathname.startsWith('/_next/') ||
      requestUrl.pathname === '/favicon.ico' ||
      /\.[a-z0-9]+$/i.test(requestUrl.pathname)
    ) {
      const target = new URL(
        `${requestUrl.pathname}${requestUrl.search}`,
        APEX_ORIGIN
      );
      return proxyToApex(request, target);
    }

    return Response.redirect(
      new URL(`${requestUrl.pathname}${requestUrl.search}`, APEX_ORIGIN),
      // Edge routing changes must not become permanent browser state. A
      // cached 301/308 can outlive a corrected Worker deployment.
      307
    );
  },
};
