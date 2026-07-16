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
- **RAMA v1 chat panel** (`RamaPanel.tsx`, mounted in the landlord dashboard
  shell): floating "Ask RAMA" launcher, gated on the backend's
  `/api/rama/config/` (no env-var flag — one source of truth). Visible
  "powered by <model>" tag on the composer; staff-only provider/model
  picker; hidden from customers until a provider key is configured.
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
- **RAMA v1** (`rentium/rama/`): tool registry over 9 read functions
  (schemas from type hints, landlord injected from the session), provider
  adapters behind one `complete()` contract (`anthropic` default via the
  official SDK; `openai`/`xai` over chat-completions), audited chat loop
  (`POST /api/rama/chat/`), `RamaAudit` rows stamping provider/model on
  every event, staff-only per-request override. `RAMA_PROVIDER`/`RAMA_MODEL`
  env config, default `anthropic` + `claude-haiku-4-5`. No writes anywhere.
- **State of the Union**: `GET /api/rama/state-of-the-union/` — portfolio
  aggregate (money this month, outstanding, deposits, open work, attention)
  from `rentium/rama/union.py`, no model involved.
- Suite: **64 tests, all green** (17 of them RAMA: registry scoping, tool
  correctness, chat loop with a scripted stub provider, wire formats).

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

## 1. Next session — RAMA v2 (read `docs/rama-architecture.md` first)

**v1 is SHIPPED** (see §0): registry over 9 read tools, provider-agnostic
adapters (anthropic default + Haiku; openai/xai slot in), audited chat
loop, State of the Union endpoint, feature-flagged dashboard panel with the
"powered by <model>" tag and staff-only model picker. **The Anthropic API
key is the only missing piece** — set `ANTHROPIC_API_KEY` in the backend
env and the panel goes live for real (until then only staff see it).

**Operating principle (owner's direction, July 2026):** the AI is the
_reasoning_ layer, never the _heavy-lifting_ layer. Every number, deadline,
and record comes from our typed service functions; the model's job is to
choose which tools to call, interpret results against our policies, and
explain. If a task can be a deterministic service function, it becomes one —
the model orchestrates, the app computes.

**v1 gate before starting v2:** run real conversations on the live key and
read the `RamaAudit` rows (Django admin → RAMA) — correct tool selection,
scoping holds, ambiguity rule holds ("two Sarahs" must produce a question,
not a guess). The audit table is the eval set.

**v2 — propose-only:** proposal rows + confirm cards; writes execute through
the existing append-only services on human approval only. Natural first
proposals: record a payment, post a late-fee charge, send a rent reminder.

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
