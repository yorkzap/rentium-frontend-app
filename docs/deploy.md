# Deploying Rentium

Two moving parts: the Next.js frontend on **Vercel**, and the Django backend
running — for now — on **your own machine**, reached through a **Cloudflare
Tunnel** at `api.rentium.ca`. Swap the tunnel for a VPS later without touching
the frontend: the hostname stays the same.

## 1. Frontend → Vercel (one command)

```bash
VERCEL_TOKEN=... CF_API_TOKEN=... ./scripts/deploy-frontend.sh
```

That script links/creates the `rentium-frontend` project, sets the three
production env vars (`NEXT_PUBLIC_ROOT_DOMAIN`, `NEXT_PUBLIC_DJANGO_API_URL`,
`DJANGO_API_URL`), and deploys the apex site to Vercel.

**After the first run**, connect the GitHub repo in the Vercel dashboard
(Project → Settings → Git) so every push to `main` auto-deploys — the CLI
deploy is just the bootstrap.

### Vanity subdomains

Cloudflare must terminate wildcard TLS because Cloudflare owns the
nameservers. A proxied `*.rentium.ca` CNAME pointed at Vercel without a Worker
causes error 525: Cloudflare asks Vercel for a certificate for
`<slug>.rentium.ca`, but Vercel has no wildcard certificate for that hostname.

Keep the proxied `*.rentium.ca` CNAME pointing to `rentium.ca`, then deploy the
Worker checked into this repository:

```bash
CLOUDFLARE_API_TOKEN=... npm run deploy:vanity-worker
```

The Worker route is `*.rentium.ca/*`. It serves
`https://<slug>.rentium.ca/` from the corresponding Vercel `/l/<slug>` route,
while leaving `api.rentium.ca` and all other reserved infrastructure hosts
alone. Set Cloudflare SSL/TLS mode to **Full**.

## 2. Backend → your machine, behind a Cloudflare Tunnel

The tunnel gives your Mac a stable public HTTPS hostname with no port
forwarding, no exposed home IP, and Cloudflare TLS.

```bash
brew install cloudflared
cloudflared tunnel login                 # opens browser; pick rentium.ca
cloudflared tunnel create rentium-api
cloudflared tunnel route dns rentium-api api.rentium.ca
```

`~/.cloudflared/config.yml`:

```yaml
tunnel: rentium-api
credentials-file: /Users/<you>/.cloudflared/<tunnel-id>.json
ingress:
  - hostname: api.rentium.ca
    service: http://localhost:8000
  - service: http_status:404
```

Run the backend (Django + Postgres + Redis + a Celery worker — the worker is
what delivers notifications and emails):

```bash
# in the rentium backend repo
docker compose -f docker-compose.local.yml up -d
cloudflared tunnel run rentium-api
```

Environment the Django container needs for public serving (add to your env
file — never commit values):

```
DJANGO_ALLOWED_HOSTS=api.rentium.ca,localhost
CORS_ALLOWED_ORIGINS=https://rentium.ca,https://www.rentium.ca
CSRF_TRUSTED_ORIGINS=https://rentium.ca,https://api.rentium.ca
FRONTEND_URL=https://rentium.ca
SENDGRID_API_KEY=<your key>          # real email via Anymail
DJANGO_DEFAULT_FROM_EMAIL=Rentium <noreply@rentium.ca>
```

> ⚠️ This is a "launch from the laptop" setup: if the machine sleeps, the API
> is down. When you get a VPS, run `docker-compose.production.yml` there,
> point the tunnel (or plain DNS) at it, and nothing else changes.
>
> Also verify the SendGrid sender: SendGrid → Settings → Sender
> Authentication → authenticate the rentium.ca domain, or emails will bounce.

## 3. Sanity checklist after first deploy

- [ ] `https://rentium.ca` renders the homepage
- [ ] `https://api.rentium.ca/api/public/sitemap-data/` returns JSON
- [ ] Sign-up email arrives (SendGrid domain verified)
- [ ] A public viewing request → landlord bell notification + prospect email
- [ ] `celery -A config worker` (or the compose worker service) is running —
      without it, notifications/emails queue but never send
