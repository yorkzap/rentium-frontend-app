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

## **Saving work: repo setup (one-time)**

This repo currently has **no git remote**, and the Django backend lives in a
separate repo in the same situation. Until both are on GitHub, work only
exists on the machines it was written on. One-time setup, from your machine:

```bash
# 1. Create two private repos on github.com (no README/gitignore — empty):
#      rentium-frontend   rentium-backend

# 2. Frontend (run inside this repo):
git remote add origin git@github.com:<your-username>/rentium-frontend.git
git push -u origin main
git push -u origin claude/site-premium-pass claude/alive-pass   # session branches

# 3. Backend (run inside the Django repo):
git remote add origin git@github.com:<your-username>/rentium-backend.git
git push -u origin main

# 4. Commit your local in-flight changes first if you want them included:
git add -A && git commit -m "wip"
```

After that:

- **Remote Claude sessions** should be started from the GitHub repo (or the
  repo authorized in the session), so branches can be pushed and PRs opened
  instead of work living only inside a container.
- **Seeing changes on the actual site**: connect `rentium-frontend` to Vercel
  (zero-config for Next.js) and every push deploys a preview; the backend can
  start on any Docker host (Railway/Fly/a VPS) with `DJANGO_API_URL` pointed
  at it. Wildcard subdomains for showcases are documented below.

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
2. Add a proxied wildcard DNS record in Cloudflare:
   `*.rentium.ca` → `rentium.ca`.
3. Deploy `cloudflare/vanity-subdomains.mjs` with
   `npm run deploy:vanity-worker`. Its `*.rentium.ca/*` route terminates TLS at
   Cloudflare and fetches the matching `/l/<slug>` page from the apex Vercel
   deployment. Do not attach `*.rentium.ca` directly to Vercel: Vercel does
   not provision that wildcard certificate while Cloudflare owns the
   nameservers, which produces Cloudflare error 525.
4. In Cloudflare SSL/TLS, use **Full** mode. Universal SSL covers the public
   first-level wildcard; the Worker connects to Vercel as `rentium.ca`, whose
   origin certificate is valid.
5. SEO: the canonical URL stays the path form. Showcase pages should emit
   `rel=canonical` → `https://rentium.ca/l/<slug>` so the subdomain and path
   don't compete in search results.

**Showcase-only scope.** A vanity host serves _only_ the landlord's showcase.
`raj.rentium.ca/` → their page; **every other path 301s to the apex**
(`/pricing`, `/dashboard`, `/auth`, and their individual listings all live on
`rentium.ca`). A landlord's listings stay on `rentium.ca/<province>/<city>/…`
— the showcase is the one thing exclusive to the subdomain.

Reserved subdomains are kept in sync with the backend's
`showcase.models.RESERVED_SLUGS` (province codes, `www`, `app`, `api`, `admin`,
`dashboard`, `auth`, `pricing`, …) and are never treated as landlord slugs.

**Backend (Django).** The API is served from `api.rentium.ca`, so Django's
`ALLOWED_HOSTS` needs no wildcard. But a browser call from a showcase page
carries a `*.rentium.ca` Origin, so `config/settings/base.py` adds
`CORS_ALLOWED_ORIGIN_REGEXES` for `^https://[a-z0-9-]+\.rentium\.ca$` and
production `CSRF_TRUSTED_ORIGINS` trusts `https://*.rentium.ca`.
