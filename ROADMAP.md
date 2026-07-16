# Rentium — Roadmap & Session Handoff

Lives in the **frontend repo root** so future Claude sessions find it.
Companion docs in this repo: `docs/rama-architecture.md` (the full AI design)
and `docs/phase-b-spec.md` (implemented; kept as reference).

---

## 0. State of the world (July 2026, session 3)

Everything below is MERGED and PUSHED. Frontend: `main`. Backend: `dev`.
There are no pending patch files or unmerged work branches.

**Shipped, frontend (`main`):**

- One design system (`--brand`/`--ink`/`--canvas` tokens), hand-drawn SVG
  illustration set (`src/components/public/illustrations/`), public shell on
  every public route, Leaflet/OSM maps.
- Homepage with **Autopilot** section (the operating promise + "your data
  stays yours": export always, spreadsheet import labelled _coming soon_).
- **/privacy and /terms** in the product's voice (review with counsel before
  relying on them). Legal column in the footer.
- SEO: `metadataBase`, OG/Twitter cards, SoftwareApplication JSON-LD,
  per-listing canonical/OG (pre-existing), live sitemap.
- **ListingGallery**: grid + full-screen lightbox (keyboard, swipe, counter,
  captions, neighbour preload); phones get lead photo + "view all" pill.
- **/l/[slug] showcase** (Phase D): brand cover band with hand-drawn
  rooflines, overlapping avatar, city chips derived from live listings.
- Tenant Home (Phase C): Upcoming strip (next visit / rent due / signature),
  `TenantDashboard.tsx` split into `tenant/Tenant*Tab.tsx`; calendar renders
  an **agenda list below `md:`**.
- **/viewing/status/[token]**: prospective tenant's tracking page (capability
  link, no account).
- Notifications: opening the bell or the notifications page **marks all
  read**; no "mark read" buttons anywhere.
- **Type/lint debt: ZERO.** `next.config.ts` no longer ignores anything —
  builds enforce tsc + eslint. Keep it that way.

**Shipped, backend (`dev`):**

- Phase B: deposit-aware summary API + `rentium/attention/` Action Center
  (`GET /api/attention/`).
- Appointment visibility fix: tenants see only their entry notice — own-lease
  appointments plus property-wide ones from their lease start date onward;
  prospect contact email/phone redacted from tenant payloads.
- `Appointment.public_token` + `GET /api/public/viewing-status/<token>/`.
- Event fan-out (`rentium/events/handlers.py`): Notification rows for
  viewing requests, scheduled visits (tenant entry notice), work orders, SLA
  breaches, payments, rent-due-soon; emails to viewing requesters on
  request/confirm/decline (console backend locally, Anymail/SendGrid prod).
- Suite: **47 tests, all green.**

**Known gaps / debt (do not lose these):**

1. `FinancialManagement.tsx` (~1,500 lines) still needs splitting into
   `financial/` subcomponents + a 375px pass on the financial and inventory
   tables (tables → cards or `overflow-x-auto`).
2. Hero/product visuals are hand-built compositions — replace with real
   screenshots once a seeded demo account exists (see §3).
3. Password-reset flow doesn't exist; links intentionally absent.
4. `ledger/daily.py` and `attention/service.py` share the delivery-clock
   computation — de-duplicate onto one helper.
5. Spreadsheet import is _promised as coming soon_ on the homepage — build
   `POST /api/import/` (CSV/XLSX → staged rows → human confirm → services)
   before launch marketing leans on it. Export exists conceptually via the
   append-only ledger; ship `GET /api/export/` (CSV) alongside.
6. Policy pages: have a lawyer read /privacy and /terms before launch.

## 1. Next session — RAMA v1 (read `docs/rama-architecture.md` first)

v0 is done: the tool surface exists as typed, side-effect-free functions
(`compute_attention` + six sources, `deposits_collected_between`,
`next_upcoming_charge`, `deposits_held`, summary aggregation). The event
pipeline (DomainEvent → handlers) is the audit spine RAMA will read.

**Operating principle (owner's direction, July 2026):** the AI is the
_reasoning_ layer, never the _heavy-lifting_ layer. Every number, deadline,
and record comes from our typed service functions; the model's job is to
choose which tools to call, interpret results against our policies, and
explain. If a task can be a deterministic service function, it becomes one —
the model orchestrates, the app computes.

**v1 — read-only Q&A agent (~1–2 weeks):**

- New `rentium/rama/` Django app:
  - `registry.py` — tool name → function + JSON schema derived from type
    hints; `landlord` injected from the session, never from model output.
  - `providers/` — **provider-agnostic by contract, not by promise.** One
    internal interface: `complete(messages, tools) → assistant turn plus
tool calls`, with pluggable adapters — `anthropic.py` first, then
    `openai.py`, `xai.py`, etc.; anything with function calling slots in.
    Provider and model are **configuration, not code**: `RAMA_PROVIDER` and
    `RAMA_MODEL` env defaults (default `anthropic` + Haiku — cheap, fast,
    plenty for tool routing), overridable per request so a Sonnet-class or
    GPT/Grok-class model can be A/B'd on the same conversation. The active
    provider/model is stamped on every `RamaAudit` row so answer quality is
    attributable.
  - `views.py` — chat endpoint; `models.py` — `RamaAudit` (conversation id,
    provider, model, every tool call with args/results).
  - Two new read tools: `resolve_person(name)` (scoped icontains over
    tenants with lease context; ambiguity → ask, never guess) and
    `lease_state(lease_id)`.
  - No writes anywhere. Dashboard chat panel behind a feature flag, with a
    visible "powered by <model>" tag and (owner-only) a model picker.
- Also ship "State of the Union": a service-layer aggregate (equity, surplus,
  portfolio health, open compliance items) — useful on the dashboard before
  any AI touches it, and exactly the kind of heavy lifting that stays out of
  the model.

**v2 — propose-only:** proposal rows + confirm cards; writes execute through
the existing append-only services on human approval only.

**v3 — scoped autonomy:** allowlisted low-risk actions (send rent reminder)
auto-execute under Constitution rules (versioned config in DB rows,
`policy.activated` domain event); everything else stays propose-only. Gate
on v2's audit log showing sustained precision.

**Never:** self-generated tools/SQL, cross-landlord retrieval, staged/dirty
data writing to the ledger without human promotion, long-term memory of
conversational resolutions.

## 2. Remaining polish queue (interleave with RAMA)

- Split `FinancialManagement.tsx`; 375px pass on financial/inventory routes.
- Spreadsheet import/export (gap #5) — also a natural RAMA v2 write surface.
- Password reset (Django allauth flow + frontend pages).
- Demo-account seed script (`manage.py seed_demo`) → real screenshots →
  swap the hero composition (gap #2).

## 3. Deploy — see `docs/deploy.md` (the runbook)

`scripts/deploy-frontend.sh` is the whole frontend deploy: Vercel project +
env vars + prod deploy + domains + Cloudflare DNS in one idempotent command,
run with `VERCEL_TOKEN` and `CF_API_TOKEN` in the environment. The backend
runs on the owner's machine for now, published as `api.rentium.ca` through a
Cloudflare Tunnel (full recipe in the runbook), moving to a VPS later with
zero frontend changes. **Run a Celery worker** — notifications/emails
dispatch through it. Wildcard `*.rentium.ca` certs need Vercel nameservers;
`/l/<slug>` paths work without them.

## 4. Bootstrap prompt for a new Claude session

> Read ROADMAP.md in the frontend repo root, plus docs/rama-architecture.md.
> Confirm both repos match §0 (frontend `main`, backend `dev`, no pending
> patches), then start §1 — RAMA v1 — interleaving §2 polish as natural
> breaks. Work in small verified commits (run the app in a browser, not just
> tests), push to the designated branches. Design philosophy: premium,
> alive, honest — no template smell, no fake content, every business rule a
> typed service function so RAMA tools stay cheap and accurate. Type/lint
> debt is zero and builds enforce it; never reintroduce the ignore flags.
