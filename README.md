<!-- README.md -->
# Rentium Frontend

This is the frontend for the Rentium project, built with Next.js and configured with Husky and Commitlint.

## **Prerequisites**

- Docker installed on your system
- Node.js (optional for local development)

---

## **Getting Started**

### **Running with Docker**

- Build and run the application using Docker Compose:
  `docker-compose up --build`

---

## **Landlord showcase subdomains**

Each landlord showcase (`/l/<slug>`) is also served on its own subdomain:
`raj-rentals.rentium.ca` renders the same page as `rentium.ca/l/raj-rentals`.
The rewrite lives in `src/middleware.ts` and is driven by one env var:

- `NEXT_PUBLIC_ROOT_DOMAIN` — the apex domain, default `localhost:3000`.

**In development** nothing needs configuring: browsers resolve `*.localhost`
to loopback, so `http://raj-rentals.localhost:3000` works out of the box.

**Going live (Cloudflare):**

1. Set `NEXT_PUBLIC_ROOT_DOMAIN=rentium.ca` in the production environment.
2. Add a wildcard DNS record in Cloudflare: `*.rentium.ca` → the app host
   (same target as the apex record), proxied.
3. TLS: Cloudflare's Universal SSL covers `*.rentium.ca` at the first level —
   no per-tenant certificates and no Next.js config needed.
4. SEO: the canonical URL stays the path form. Showcase pages should emit
   `rel=canonical` → `https://rentium.ca/l/<slug>` so the subdomain and path
   don't compete in search results.

Reserved subdomains (`www`, `app`, `api`, `admin`, `mail`) are never treated
as landlord slugs, and `/dashboard` + `/auth` redirect back to the apex
domain if opened on a tenant subdomain.
