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
