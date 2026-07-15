# Project RAMA — Architecture

**Status:** design document. No RAMA code exists yet, and none should be
written until the service-function groundwork described in "v0" is in place.

**One-line definition:** RAMA is the existing Rentium service layer with a
conversational front-end. It is not "an AI that runs your properties."

---

## 1. How the system works

The design rests on a single principle: **deterministic code does the heavy
lifting; the model routes and phrases.** Every question about money, leases or
compliance is answered by a typed Python function reading Postgres — the same
functions the dashboard uses. The model's job is to pick the right function,
fill in its arguments, and turn the structured result into a sentence.

### The anatomy of one turn

> Landlord: _"Did Sarah pay rent this month?"_

1. **Scope is injected, never inferred.** The chat endpoint authenticates the
   landlord and builds a tool context bound to `landlord_id`. The model never
   sees or supplies a landlord identifier; every tool call is scoped
   server-side, exactly like every existing API view.
2. **Resolve.** The model calls `resolve_person("Sarah")`. The tool runs a
   scoped query over the landlord's tenants and returns candidates with
   lease context (`Sarah N — Oak Ave Suite B, active lease`). **Hard rule:
   ambiguity → ask, never guess.** Two Sarahs means the model must ask which
   one; the resolution is recorded on the conversation row, not in any
   long-term memory.
3. **Query.** The model calls `charge_status(lease_id, month)` and receives a
   compact structured answer: `{rent_due: 850, paid: 850, paid_on: "2026-07-01",
method: "e-transfer"}`. It never reads raw tables and never does
   arithmetic — the numbers come from the ledger service, so they are the
   same numbers the dashboard shows.
4. **Answer.** The model restates the result in prose. Total cost of the
   turn: roughly 2–5k tokens, because tools return summaries, not rows.

### Writes are proposals

> Landlord: _"Charge her a $25 late fee."_

A write intent never executes directly. The model produces a **proposed
action** — a row containing the tool name, arguments, and its rationale —
which renders as a confirm card in the dashboard. On approval, the _existing_
append-only ledger service executes it. Two properties make this safe:

- **The model holds no write credentials.** The approval gate is enforced in
  Django (the execute endpoint requires an authenticated human), not in the
  prompt.
- **The invariants don't move.** The immutable ledger, the lease FSM, the
  deposit rules — proposals flow through the same services with the same
  validation as a button click in the UI.

### Everything is audited

One `rama_audit` table records: conversation id, every tool call with
arguments and results, every proposal, every approval or rejection. This is
simultaneously the safety trail and the eval set — when a prompt change is
tested, it is replayed against real (anonymized) audited conversations.

```
Landlord ──chat──▶ RAMA endpoint (Django)
                     │  scope = landlord_id from session
                     ▼
              Model (hosted, via adapter)
                     │  tool calls (JSON schema)
                     ▼
              Tool registry ──▶ service functions ──▶ Postgres
                     │                (read)
                     ├──▶ proposal rows ──▶ human confirm ──▶ existing
                     │      (write intent)                    append-only
                     ▼                                        services
              rama_audit (every call, every proposal)
```

---

## 2. Design positions

Each position is chosen for **buildability on the existing Django stack** —
no new infrastructure until a phase proves it needs it.

### 2.1 Deterministic state vs probabilistic policy

Postgres stays the only truth. The **Constitution** — the landlord's standing
policy ("keep a $5,000 liquidity floor", "never rent below $X in building Y")
— is _versioned config, not knowledge_:

- Stored as markdown blobs in DB rows with git-like lineage: content hash,
  parent hash, author, `approved_by`, `activated_at`. Never loose files.
- Activating a policy version emits `policy.activated` through the existing
  outbox/domain-event pattern.
- Compliance checks are ordinary event handlers plus scheduled re-checks
  (same pattern as `ledger/daily.py`) that re-run assertions against the
  ledger — e.g. "liquid balance ≥ floor" — and raise attention items on
  breach. No rules engine; each assertion is a small tested function.
- Only the _active_ version's text enters the model's context. History is
  for humans and audits.

### 2.2 Disambiguation: relational tools, not GraphRAG

The database already **is** the entity graph
(Landlord → Property → Lease → LeaseTenant). `resolve_person(name)` is a
scoped `icontains` query returning candidates with active-lease context.

**No vector store in v1.** Per-landlord data volumes are dozens of entities,
not millions of documents; embedding retrieval would add infrastructure,
failure modes and cross-tenant risk to solve a problem SQL already solves.
A vector index earns its place only when free-text document search (lease
PDFs, message history) ships as a feature.

### 2.3 Evolutionary logic: composition, never schema generation

The tool surface is **human-defined**. The AI may compose sequences of
existing tools ("skills": saved, replayable tool plans stored as data and
reviewed like Constitution versions), but it can never define new tools,
new schemas, or new SQL. A model that can synthesize its own write paths is
a model that can route around the append-only ledger — the one invariant
the product's credibility rests on.

### 2.4 Dirty history: staged, walled off

Landlords arrive with years of messy records. Those go into a `StagedEntry`
table in a separate app — provenance, confidence score, and **no foreign key
into `LedgerEntry`**:

- **Read side:** analytics and the model may blend official + staged data for
  pattern learning ("your furnace repairs cluster in November").
- **Write wall:** staged rows never emit domain events, never touch billing,
  never appear in official statements.
- **Promotion:** a staged row becomes real only through the existing
  append-only services, after explicit human confirmation, one auditable
  entry at a time.

### 2.5 Multi-tenant intelligence: none, then aggregate-only

v1 has **no cross-landlord learning surface at all**. Tools are scoped by
`landlord_id` at the registry level; there is no retrieval layer that could
leak one landlord's text into another's context. "Collective intelligence"
only ever ships as **opt-in aggregate benchmarks computed by ordinary SQL**
("2-bed units in Saanich average $X") — numbers from aggregates, never
retrieved text from other tenants.

### 2.6 "State of the Union"

A service-layer aggregate (equity, monthly surplus, portfolio health,
outstanding compliance items) built exactly like `summary_view`. It ships on
the dashboard for humans _before_ any AI exists — which is the test every
RAMA component must pass: **useful without the model, safer with it.**

---

## 3. Model choice — the Hermes question

**Decision: do not build on self-hosted Nous Hermes. Start on a hosted
frontier model behind a provider-agnostic adapter.**

The adapter is one small interface — messages + tool schemas in, tool calls
or text out — so the provider is swappable evidence-first, later.

Why hosted-frontier first:

1. **Tool-calling reliability is the entire game.** The architecture depends
   on schema-faithful arguments, correct ask-vs-act judgment, and clean
   multi-step chains (resolve → query → answer). This is precisely where
   frontier models are strongest and small self-hosted models are weakest.
   An unreliable tool-caller poisons a product whose selling point is
   trustworthy answers about money and legal compliance.
2. **Self-hosting is an ops tax paid before value exists.** GPU provisioning,
   a serving stack, quantization trade-offs, upgrade churn — all before the
   first agent conversation ships. That effort belongs in the audit and
   approval layer, which is what actually makes RAMA safe.
3. **The economics argument mostly evaporates under this design.** Because
   tools return compact structured answers, a typical Q&A turn costs 2–5k
   tokens. At realistic usage (a landlord asking a handful of questions a
   day), hosted inference is cheap relative to one support ticket avoided.
4. **Where a small model fits later:** high-volume, low-stakes, non-tool
   tasks — classifying inbound tenant messages, drafting notice text for
   human review. Run those behind the same adapter as a cost experiment.
   The orchestrator stays frontier.

---

## 4. Phased build path

Each phase is independently shippable and gated on the previous phase's
audit log looking healthy.

| Phase  | Ships                                                                                                                                     | Writes?      | Gate to advance                                                            |
| ------ | ----------------------------------------------------------------------------------------------------------------------------------------- | ------------ | -------------------------------------------------------------------------- |
| **v0** | Business logic as typed, side-effect-free service functions (`month_summary`, `compute_attention`, …) with thin API views                 | n/a          | Functions exist, tested, powering the dashboard                            |
| **v1** | `rama` Django app: tool registry over ~8 read functions, chat endpoint, `rama_audit` table, dashboard chat panel                          | No           | Audit shows correct tool selection & scoping; ambiguity rule holds         |
| **v2** | Proposal rows + confirm cards; writes executed by existing services on human approve                                                      | Propose-only | Proposals consistently correct in audit review                             |
| **v3** | Allowlisted low-risk actions (e.g. send a rent reminder) auto-execute under active Constitution rules; everything else stays propose-only | Scoped       | Only if v2's log shows sustained precision; allowlist reviewed like policy |

v0 is not a RAMA phase so much as good engineering the dashboard needs
anyway — it is being delivered as part of the current platform work (the
attention module and ledger summary functions). The tool registry in v1 is
deliberately boring: a dict from tool name → function + JSON schema derived
from type hints, with `landlord` injected from the request. If v1 takes more
than a few weeks, something in this document was over-designed.

---

## 5. What RAMA explicitly does not do

- No self-generated schemas, SQL, or tools (2.3).
- No writes without a human approval, until and except the v3 allowlist.
- No cross-landlord retrieval, ever; aggregates only, opt-in (2.5).
- No long-term memory of conversational resolutions — per-conversation only.
- No staged/dirty data in official records without per-entry human promotion.
- No self-hosted orchestrator until the hosted baseline sets the reliability
  bar it must match (3).
