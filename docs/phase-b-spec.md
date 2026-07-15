# Phase B — Implementation Spec: Truthful Money Card + Action Center

**Why this is a spec and not code:** the Django backend is a separate repo
that wasn't available to the session that wrote this, and the frontend data
layer (`src/lib/financeApi.ts` etc.) exists only as untracked files on the
local machine. Everything below is written to be executed mechanically in an
environment that has both. Nothing here is speculative — it references the
real modules by the names they already have.

**Design rule (applies to every item):** each piece of business logic lands
as a named, typed, side-effect-free function in the service layer, with the
API view as a thin wrapper. These functions are the future RAMA tool surface
(see `docs/rama-architecture.md`): the model will call them and get compact
structured answers, so getting the shapes right now pays twice.

---

## B1 — Ledger summary stops hiding deposit money

### The problem being fixed
`/api/ledger/summary/` correctly excludes deposits from income (they're a
refundable liability), and "Expected This Month" only counts charges due in
the current calendar month. Net effect: a landlord who collected a $425
deposit and has Aug-1 rent scheduled sees **"Expected $0 · $0 collected"**
in July. The accounting is right; the presentation hides real money movement.
Keep the accounting. Fix the presentation.

### Backend — `rentium/ledger/services.py` + `rentium/ledger/api/views.py`

1. In `services.py`, extend the month aggregation behind `summary_view` so
   each month row also carries deposits:

   ```python
   # per-month, alongside existing income/expenses/expected figures
   "deposits_collected": Decimal,   # deposit-type payments received that month
   ```

   Compute from the same queryset the summary already walks — deposit-type
   entries (`SECURITY_DEPOSIT`, `PET_DEPOSIT`, however `entry_type` names
   them in `CHARGE_TYPES`) with payments applied in the month. Do NOT add
   them to `income`.

2. Add top-level convenience fields to the summary response:

   ```python
   "collected_this_month_total": Decimal,  # income collected + deposits collected, current month
   "next_charge": {                        # earliest unpaid charge with a future due_date, or null
       "due_date": date, "amount": Decimal, "entry_type": str,
       "lease_id": int, "property_name": str,
   } | None,
   ```

   `next_charge` comes from a new service function (RAMA-ready):

   ```python
   def next_upcoming_charge(landlord) -> dict | None: ...
   ```

3. Tests (`rentium/ledger/tests/…`, run `pytest rentium/ledger --keepdb`):
   - deposit payment in month M → `deposits_collected` = amount in M's row,
     `income` unchanged, `collected_this_month_total` includes it;
   - no charges due this month + Aug-1 rent exists → `next_charge` is the
     Aug-1 rent; **regression: the $425-deposit scenario shows nonzero
     collected total** while income stays 0.

### Frontend

1. `src/lib/financeApi.ts` — extend the `LedgerSummary` type:

   ```ts
   months: Array<{ …existing…, deposits_collected: string }>;
   collected_this_month_total: string;
   next_charge: {
     due_date: string; amount: string; entry_type: string;
     lease_id: number; property_name: string;
   } | null;
   ```

2. `src/components/dashboard/landlord/LandlordOverview.tsx` — the money card:
   - headline stays rent-only (honest accounting) but adds the movement line:
     **"Rent expected $X · Collected $Y"** and, when this month's
     `deposits_collected > 0`, append **"· +$425 deposits collected"** in
     `ok-ink` styling;
   - when the current month is empty and `next_charge` exists, render a
     quiet second line: **"Next charge: Aug 1 — $850 (Rent · Maple St)"**;
   - never show "Expected $0 · $0 collected" alone when either deposits
     were collected or a future charge exists.
3. `src/components/dashboard/landlord/FinancialManagement.tsx` — same
   summary consumption; add a "Deposits held" stat where summary cards
   render (deposits are already excluded from the income figures it shows).

---

## B2 — Action Center: one server-side source for "what needs doing"

### Shape

New module `rentium/core/attention.py` (or `rentium/attention/` app if the
project prefers app-per-domain — follow the existing services pattern):

```python
@dataclass
class ActionItem:
    key: str          # stable id, e.g. "inspection.move_in.lease:42"
    severity: str     # "urgent" | "soon" | "info"
    title: str        # "Schedule the move-in condition inspection"
    detail: str       # "Oak Ave · required by BC RTB within …"
    url: str          # deep link, e.g. "/dashboard/leases/42#inspection"
    due_date: date | None
    source: str       # "inspection" | "lease" | "ledger" | "maintenance" | "inquiry"

def compute_attention(landlord) -> list[ActionItem]:
    """Computed on read — no stored task rows, nothing to go stale."""
```

Each source is its own function (individually testable, individually
tool-exposable to RAMA later):

| function | logic (all reuse existing models/services) |
|---|---|
| `_missing_move_in_inspections` | ACTIVE/PENDING lease where `tenancy_rules.rules_for_lease(lease).code == "BC_RTA"` and no MOVE_IN `ConditionInspection` exists or is scheduled → urgent. (Same pattern later for MOVE_OUT.) |
| `_inspection_delivery_due` | reuse the `inspection.delivery_due` computation that lives in `ledger/daily.py` — extract it into this module and have the daily task call it here, one source of truth |
| `_stalled_signatures` | leases in PENDING_SIGNATURES for > 7 days → soon |
| `_expiring_leases` | fixed-term leases ending within 60 days → info ("renew or send notice") |
| `_overdue_charges` | from the existing summary/overdue logic → urgent, grouped per lease |
| `_stale_work_orders` | NEW/SLA-breached work orders → soon |
| `_unanswered_inquiries` | inquiries without a reply → soon |

**Province-awareness note:** `tenancy_rules` computes *requirements*; the
attention layer only surfaces them. When Ontario lands in `tenancy_rules`,
its inspection/notice items appear here with zero UI changes — this is the
concrete mechanism behind "each province slots in."

### API

`GET /api/attention/` — auth-required, landlord-scoped, returns
`{"items": [ActionItem…]}` ordered urgent→info then by due_date. Register in
the app's `api/urls.py` following the existing routing convention. Thin view:
serialize `compute_attention(request.user.landlord)`; no logic in the view.

### Tests

- BC lease, no inspection → item present; GENERIC-rules lease → absent.
- Inspection exists but unsigned/undelivered near deadline → delivery item.
- Each source function tested in isolation; `compute_attention` ordering test.

### Frontend

1. New `src/lib/attentionApi.ts`:

   ```ts
   export type ActionItem = {
     key: string; severity: "urgent" | "soon" | "info";
     title: string; detail: string; url: string;
     due_date: string | null; source: string;
   };
   export async function fetchAttention(): Promise<ActionItem[]> { … } // GET /api/attention/
   ```

2. `LandlordOverview.tsx` — replace the client-side "Needs Attention"
   assembly (currently built from work orders + overdue charges in the
   component) with `fetchAttention()`; severity-tinted rows
   (`danger-soft`/`warn-soft`/`info-soft` tokens) with deep links; empty
   state keeps the existing "Nothing needs attention. Nice."
3. `CalendarHub.tsx` — add attention items with `due_date` as a calendar
   source (they already have the inspection kind styling).

### Notifications vs dashboard (so the two don't blur)

*State* lives in Needs Attention — computed, persists until resolved.
*Events* stay in the NotificationBell — fanout via `events/notify.py` ROUTES.
A maintenance request appears in both: the bell announces its arrival, the
Action Center keeps it visible until handled. While in `notify.py`, add a
route for "lease fully signed" if one doesn't exist.

---

## Execution order

1. B1 backend (+ tests) → B1 frontend.
2. B2 module + endpoint (+ tests) → B2 frontend card → calendar source.
3. Manual verification: seed the $425-deposit scenario and a BC lease
   without a move-in inspection; confirm the dashboard shows the deposit
   line and the inspection action item; `pytest rentium/ledger rentium/core
   --keepdb` green.
