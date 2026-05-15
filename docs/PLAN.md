# The Beachie Midweek Engine — Implementation Plan

**Status:** Draft v0.3 — scaffolding in progress.
**Source spec:** [`docs/SPEC.md`](./SPEC.md) (the master brief; treat as authoritative when this plan and the spec disagree).
**Target:** v1, brain-only, no external integrations beyond OpenAI.

**Changelog v0.2 → v0.3:** Added the placeholder seed-data + `production_mode` strategy (new §3.x, §6.x) so the build can run ahead of onboarding data collection. Every property knowledge table gets an `is_placeholder` boolean (default true for seed-script values, flips to false on first manager edit). Admin UI shows yellow banners per record + a dashboard tally. A single `system_settings.production_mode` boolean (default false) gates real distribution: when false, every generated marketing asset is watermarked "TEST — built from placeholder data" and the distribution checklist refuses to mark items "sent". Manager flips it true only after replacing placeholders and signing off onboarding.

**Changelog v0.1 → v0.2:** Brand voice promoted to a first-class structural guardrail (§4.5, §4.6). Image guardrail switched from a word blocklist to a category enum (§4.5, §6). Voucher schema restructured as `voucher_batches` (§3). Kill switch split into three granular flags (§3, §7). `attribution_notes` added to `bookings` (§3). Explicit onboarding hard gates added (new §10). On-demand chat router design added (new §4.7). Testing approach added (new §11). Local dev story added (new §12). CSV export added for partners and bookings (§3, §13). Inngest cost projection added (§1.2). Sections 10–13 from v0.1 renumbered to 13–16.

This document is the bridge between the brief and the codebase. It pins the stack, sketches the schema, defines the prompt architecture, lays out the repo, maps the brief's 8–10 week plan to concrete PRs, and lists what we need from the manager before we can start coding usefully.

If you (the reviewer) want anything changed, mark this PR with comments — nothing is built yet.

---

## 1. Stack — pinned

### 1.1 Choices

| Layer | Choice | Why |
|---|---|---|
| Framework | **Next.js 15 App Router, TypeScript, React Server Components** | Matches brief §4.1. App Router lets us co-locate server logic with the admin UI without a separate API service. |
| UI | **Tailwind CSS + shadcn/ui + lucide icons** | shadcn gives us accessible primitives we own; faster than a heavy component library for an admin tool. |
| Database | **Supabase Postgres** | Single managed service for DB + Auth + Storage + Realtime. Matches user direction. |
| ORM | **Drizzle ORM** | Lightweight, SQL-first, plays nicely with Supabase, good migration story. (Prisma is the alternative if the reviewer prefers — flag in PR.) |
| Auth | **Supabase Auth (email/password)** with RLS-aware server client | Brief requires multi-user with role-based access; we model roles as a `role` column on `users` and enforce in API layer + RLS. |
| Storage | **Supabase Storage** | Generated PDFs, uploaded photos, brand assets. One private bucket per concern (`assets`, `photos`, `brand`). |
| AI reasoning | **OpenAI Responses API** (`gpt-5` or latest at build time) | Brief §4.1. Responses API gives us native multi-step tool use for partner research (web search) and structured output. |
| AI images | **OpenAI `gpt-image-1`** | Stylistic/decorative only per brief §4.5 guardrail. Never people, never the hotel. |
| PDF | **Puppeteer** running on a serverless function (Vercel Node runtime, not Edge) | HTML → PDF for landing pages, flyers, letters, vouchers. Brief §4.1. |
| Jobs | **Inngest** (subject to §1.2 cost check) | Cron + background jobs + retries + observability. Cleaner than rolling our own with BullMQ when we're already on Vercel. |
| Hosting | **Vercel** | Brief §4.1. |
| Internal email (digests/alerts only) | **Resend** | Not for marketing — only for internal team notifications. Brief §4.1. |
| Observability | **Vercel logs + a `prompts_log` table + Sentry** | Brief §4.2 requires every prompt/response logged. Sentry catches runtime errors. |
| Cost tracking | Custom dashboard reading from `prompts_log` | Brief §5.9. Hard monthly cap enforced in middleware. |

**Pinned package versions** are deferred to scaffolding time so we pick latest stable. The PR that scaffolds Week 1 will record them in `package.json` and the lockfile is the source of truth.

### 1.2 Inngest cost projection at v1 volume

Modelled monthly volume (matches §13 PR plan and brief §3.1). One Inngest **step** = one `step.run` block; one function invocation typically has 3–4 steps (LLM call, voice scorer, store, plus the trigger). Fan-out multiplies through children.

| Event source | Invocations/mo | Steps per invocation | Steps/mo |
|---|---|---|---|
| Weekly proposal cron — 2–3 proposals/run × 4 weeks | 4 | 1 trigger + 3×(generate + voice-score + store) = 10 | ~40 |
| Asset pack — 4 events × (1 parent + 11 children × 3 steps each) | 4 | 1 + 33 = 34 | ~136 |
| Asset regenerations — ~50% of assets get 1 regen ≈ 22 regens | 22 | trigger + generate + voice-score + store = 4 | ~88 |
| Daily digest — read DB + email | 30 | 3 | ~90 |
| Viability monitor — daily query + alert conditional | 30 | 3 | ~90 |
| Partner research — ad-hoc; web search + LLM enrich + store | 20 | 4 | ~80 |
| Partner suggest cron — weekly batch | 4 | 3 | ~12 |
| Post-event synthesis — read priors + LLM + update meta + store | 4 | 5 | ~20 |
| Monthly cost-cap check — daily | 30 | 3 | ~90 |
| Subtotal | | | **~646** |
| Retries @ ~5% | | | **~32** |
| **Total** | | | **~680** |

Inngest's free tier (as of late 2025) covers 50K step executions/month; the next paid tier (Pro) is **USD 20/mo** at the time of writing. v1 volume sits at ~1.4% of the free tier ceiling. At 3–4× growth (~2,700 steps/mo) we are still under 6%, so:

> **Projected v1 Inngest cost: USD 0/mo (free tier), capped at USD 20/mo if we hit the Pro tier for concurrency or observability features. Conclusion holds even at 5× growth.**

Well below the USD 100/mo threshold flagged by the reviewer. The Vercel Cron + DB-backed queue alternative would save the eventual USD 20/mo but cost engineer-days to build and operate (retries, dead-letter, observability, fan-out). Net: **keep Inngest**. Reviewer should spot-check Inngest's current pricing page at scaffold time; if pricing has shifted materially, fall back to Vercel Cron + a simple jobs table + a `worker` function with manual retries.

### 1.3 Stack risks to flag now

- **Puppeteer on Vercel** is workable but has cold-start cost and a 50MB function size limit. Fallback: `@sparticuz/chromium` + a dedicated Node serverless function. If we exceed limits, move PDF generation to a separate worker (Railway/Fly) — this is the most likely v1 ops headache.
- **Supabase Auth + RLS for multi-user admin** is fine, but RLS adds friction in server-only admin tools. We'll lean on server-side role checks at the API layer and use RLS as defence-in-depth, not the primary authorisation mechanism.
- **OpenAI `gpt-5`** — assuming it remains the strongest available reasoning model at build time. We abstract the model behind a `LLM` interface so swapping is one-file.

---

## 2. Repo layout

```
marketing/
├── docs/
│   ├── SPEC.md                  # the brief, verbatim
│   ├── PLAN.md                  # this file
│   ├── prompts/                 # versioned master prompts (markdown)
│   │   ├── event-invention.md
│   │   ├── package-proposal.md
│   │   ├── asset-*.md           # one per asset type
│   │   ├── on-demand-chat.md
│   │   ├── partner-research.md
│   │   └── post-event-synthesis.md
│   ├── prompts/evals/           # golden cases per pipeline (see §11)
│   └── adr/                     # architecture decision records (one md per decision)
├── app/                         # Next.js App Router
│   ├── (auth)/                  # login, logout
│   ├── (admin)/                 # all admin screens — auth-gated layout
│   │   ├── dashboard/
│   │   ├── proposals/
│   │   ├── events/[id]/         # event workspace (overview/assets/distribution/bookings/viability/post-event tabs)
│   │   ├── chat/                # on-demand chat
│   │   ├── partners/
│   │   ├── knowledge/           # property knowledge base CRUD
│   │   ├── learnings/
│   │   ├── audit/
│   │   └── settings/
│   ├── api/                     # server route handlers (thin — call into /lib)
│   │   ├── proposals/
│   │   ├── assets/
│   │   ├── bookings/
│   │   ├── partners/
│   │   ├── knowledge/
│   │   ├── chat/
│   │   ├── export/              # CSV exports (partners, bookings)
│   │   └── webhooks/inngest/
│   └── onboarding/              # one-time setup flow
├── lib/
│   ├── db/                      # Drizzle schema, migrations, client
│   ├── ai/
│   │   ├── client.ts            # OpenAI wrapper; logs every call to prompts_log
│   │   ├── prompts/             # prompt builders — load markdown from /docs/prompts and interpolate knowledge
│   │   ├── pipelines/           # invention.ts, asset-gen.ts, partner-research.ts, post-event.ts, chat-router.ts
│   │   ├── guardrails.ts        # hard/soft rule checker — runs over every proposal & generated asset
│   │   └── brand-voice.ts       # voice context loader + post-generation voice-conformance checker
│   ├── knowledge/               # functions that load property knowledge tables and produce the injectable context blob
│   ├── pdf/                     # Puppeteer wrappers per asset type
│   ├── distribution/            # adapter interfaces (EmailAdapter, AdAdapter, SmsAdapter, PrintAdapter) — v1 impls produce files
│   ├── partners/                # CRM logic, voucher batch generation/attribution
│   ├── auth/                    # Supabase client wrappers, role checks
│   ├── audit/                   # auditLog() helper used everywhere
│   ├── export/                  # CSV builders for partners and bookings
│   └── jobs/                    # Inngest function definitions
├── components/                  # shared UI
├── inngest/                     # entry point for Inngest functions
├── public/
├── supabase/
│   └── migrations/              # SQL migrations (also exported by Drizzle for review)
├── scripts/
│   ├── seed-property.ts         # seeds the public-source defaults from brief §2.2
│   ├── dev-openai-mock.ts       # local OpenAI fake server for dev (§12)
│   └── dev-reset.ts
├── tests/
│   ├── unit/                    # Vitest unit + integration
│   └── e2e/                     # Playwright — one onboarding spec for v1 (§11)
├── .github/workflows/           # CI (markdown lint + link check in v1)
├── .env.example
├── drizzle.config.ts
├── next.config.mjs
├── tailwind.config.ts
├── package.json
└── README.md
```

### Layering rules

- **`app/` is thin.** Route handlers and pages validate input and call `lib/`. No business logic in `app/`.
- **`lib/ai/` is the only thing that talks to OpenAI.** Every call goes through `lib/ai/client.ts` so logging and cost tracking are guaranteed.
- **`lib/distribution/` adapters are the v2 seam.** v1 implementations write files to Supabase Storage and return a download URL; v2 implementations call external APIs. Same interface.
- **`lib/audit/auditLog()` is called from every mutating server action.** Enforced by lint rule (custom ESLint rule, week 5).

---

## 3. Data model — schema sketch

Full DDL is deferred to Week 1, but the shape is:

### Property knowledge (manager-edited, snapshotted into proposals)

```
property_profile           — single row; all fields from brief §2.2
room_types                 — id, name, beds, max_guests, tier, view, notable_features,
                             retiree_suitability_notes, count, standard_midweek_rate_low,
                             standard_midweek_rate_high, is_accessible, mobility_friendly_count
function_spaces            — id, name, style, views, capacity_cocktail, capacity_banquet,
                             capacity_theatre, best_for
fb_venues                  — id, name, type, style, capacity, notes,
                             cost_per_head_{breakfast,lunch,dinner_2c,dinner_3c,canapes},
                             beverage_package_options (jsonb)
regular_programming        — id, event, frequency, day_of_week, time, venue, impact_notes
local_context_pois         — id, name, distance_min, notes
target_postcodes           — id, region, postcode, suburbs, drive_time_min, retiree_density
brand_voice                — single row; version (int, incremented on every save),
                             reviewed_by_manager (bool — set true only after onboarding step 10),
                             reviewed_at, rules (jsonb), guide_markdown (text),
                             forbidden_phrases (text[]), required_phrases_per_context (jsonb)
operational_constants      — single row; blackout_dates (jsonb), rate_floors, rate_ceilings,
                             accessibility_notes, choice_hotels_brand_notes
photo_library              — id, storage_path, category, tags, alt_text
brand_assets               — id, type (logo|font|colour|doc), storage_path, metadata
talent_database            — id, name, type, contact, fee_range, notes (seeded at onboarding)
```

A hard DB constraint enforces `SUM(room_types.count) = property_profile.total_rooms`. Onboarding blocks until this is satisfied (brief §6 step 3; see §10 onboarding gates).

`brand_voice.reviewed_by_manager` is checked at runtime before any asset generation runs (see §4.5).

### Workflow tables

```
users                      — id, email, role (manager|marketing), created_at, last_login
proposals                  — id, status, type (event|package), content (jsonb — full snapshot),
                             property_knowledge_snapshot (jsonb), brand_voice_version (int),
                             created_by, approved_by, created_at, target_date_start,
                             target_date_end, viability_threshold
proposal_revisions         — id, proposal_id, content (jsonb), reason, created_by, created_at
feasibility_checks         — id, proposal_id, confirmed_by, confirmed_at, notes
assets                     — id, proposal_id, type, version, status, content (jsonb for text,
                             storage_path for files), prompt_log_id, brand_voice_score (float),
                             created_at, approved_by
asset_regenerations        — id, asset_id, comment, prior_version
distribution_checklists    — id, proposal_id, items (jsonb array of {key,label,status,assignee,
                             completed_at,completed_by})
bookings                   — id, proposal_id, guest_name, guest_phone, rooms_allocated (jsonb),
                             room_type_id, value_cents, attribution_channel (enum), 
                             attribution_notes (text — free-form, e.g. "voucher from Castle Hill
                             Hair Studio, also saw FB ad"), voucher_batch_id (nullable),
                             logged_by, logged_at, status
voucher_batches            — id, proposal_id, partner_id, code (unique across all batches),
                             quantity_issued, quantity_redeemed, value_cents_per_voucher,
                             status (issued|distributed|partially_redeemed|exhausted),
                             distributed_at, created_at
partners                   — id, name, type, owner_name, role, phone, email, address, postcode,
                             region, notes, status, last_contact_date, last_contact_outcome,
                             satisfaction (1-5), tags (text[]), research (jsonb), created_at
partner_contact_log        — id, partner_id, type, outcome, notes, logged_by, logged_at
learnings                  — id, proposal_id (nullable for synthesised cross-event insights),
                             type (post_event|synthesis), content (jsonb), created_at
prompts_log                — id, pipeline, model, prompt, response, tokens_in, tokens_out,
                             cost_cents, latency_ms, created_at, user_id, proposal_id
audit_log                  — id, user_id, action, entity_type, entity_id, before (jsonb),
                             after (jsonb), created_at
system_settings            — single row;
                             generation_paused (bool, default false),
                             cron_paused (bool, default false),
                             on_demand_paused (bool, default false),
                             monthly_budget_cents,
                             viability_check_days_pre_event,
                             cron_proposal_time, cron_digest_time,
                             openai_api_key_ref
```

### Key design decisions

- **`property_knowledge_snapshot` on proposals** — brief §2.3 mandates this. Stored as jsonb at proposal-creation time so later edits to the knowledge base don't retroactively invalidate approved campaigns.
- **`brand_voice_version` on proposals + `brand_voice_score` on assets** — every generated asset is gated by a voice-conformance score (see §4.6). Versioning lets us correlate score drops with voice-guide edits.
- **`content jsonb` everywhere** — the proposal and asset schemas evolve as we iterate prompts. Strongly-typed columns are not worth the migration churn in v1; we validate jsonb with Zod at the API boundary.
- **Voucher batches, not individual codes** — one batch per `(proposal, partner)` with a single unique code at the batch level and counters for `quantity_issued` / `quantity_redeemed`. Redemption is logged by setting `bookings.voucher_batch_id` and incrementing the batch's redeemed counter (single-statement update inside a transaction). This is dramatically simpler than per-voucher rows for the brief's "one code per partner business so redemption attribution is automatic" requirement (brief §3.3) and supports partner ROI rollups in a single GROUP BY.
- **Three granular kill-switch flags** — `generation_paused`, `cron_paused`, `on_demand_paused` are separate booleans in `system_settings`. The v1 UI exposes a single master toggle that flips all three together, but every code path checks the specific flag that applies (see §7). This means in v2 we can pause crons without disabling on-demand chat (useful during an outage) without a schema change.
- **`bookings.attribution_notes`** — front desk often has more context than a single channel enum can hold ("saw the FB ad first, came in via the voucher from Castle Hill Hair Studio"). The free-text field captures it without forcing a structured taxonomy; the synthesis prompt mines it during post-event learning.
- **`audit_log.before/after` is jsonb** — not joinable but trivially diffable in the UI.
- **No soft-delete** — kept simple in v1. Status fields cover lifecycle.

### 3.1 Placeholder seed data and `production_mode`

The build runs ahead of onboarding data collection. To make that safe, two mechanisms work together:

**Per-row `is_placeholder: boolean`.** Every property knowledge table (`property_profile`, `room_types`, `function_spaces`, `fb_venues`, `regular_programming`, `local_context_pois`, `target_postcodes`, `brand_voice`, `operational_constants`, `photo_library`, `talent_database`) gets an `is_placeholder` column, default `true`. `scripts/seed-property.ts` populates plausible Australian-regional-resort placeholders for every field (brief §2.2 verbatim where public data exists; invented but realistic values for everything marked TBD or held by the manager — rates, F&B costs, capacities, room counts). The seed script's top-of-file comment documents which fields are public vs invented and the basis for each placeholder. Room counts always sum to 83 (brief §6 hard gate).

The first time a manager saves an edit to a record from the admin UI, `is_placeholder` flips to `false`. There is no UI to flip it back — explicit re-seeding is required.

**Per-record yellow banner + dashboard tally.** The knowledge CRUD UI shows a yellow banner over any record where `is_placeholder = true`: *"Seed data — replace with real data from the onboarding workbook before going live."* The dashboard shows a live tally: *"N of M property knowledge records still use placeholder data."* Both are queries off `is_placeholder`.

**Global `system_settings.production_mode: boolean`** (default `false`). When `false`:
- Every generated marketing asset is watermarked **"TEST — built from placeholder data"** (rendered into the PDF/HTML output by the asset generation layer, not just a CSS overlay).
- The distribution checklist UI shows a banner: *"Production mode disabled — outputs are for review only, do not distribute."* The "Mark sent" checkboxes are disabled.
- All v1 distribution adapters (which write files for human download — there are no external API calls in v1) prefix downloaded filenames with `TEST_`.

`production_mode` can only be flipped to `true` by a manager-role user, only via the settings UI, only when all three onboarding hard gates (§10) are green AND `is_placeholder = false` for every row in the property knowledge tables. The flip is logged to `audit_log` with the user and the count of records that were real-data at the time. Flipping back to `false` is allowed and logged.

**Generation pipelines work normally throughout.** Event invention, package proposals, asset generation, partner research, post-event synthesis — all run identically against placeholder and real data. Watermarking is the only behavioural difference. This means the system is fully end-to-end testable during the build, and the moment real data is plugged in there is no integration step beyond editing knowledge rows and flipping `production_mode`.

The single source of truth for placeholder status across the schema is the per-table `is_placeholder` column. `production_mode` is a global gate, not a redundant per-record marker — it would be a foot-gun to allow "production mode on, but this one row is placeholder."

---

## 4. Prompt architecture

Brief §4.4 lists six master prompts. We treat prompts as code, not config — versioned in `docs/prompts/`, loaded by `lib/ai/prompts/`, and tested as part of the build (see §11 evals).

### 4.1 Anatomy of a prompt call

```
buildSystemPrompt(pipeline) =
  STATIC_PREAMBLE
  + propertyKnowledgeContext()  // injected from DB every call (brief §2.3, §4.2)
  + brandVoiceContext()         // injected from DB every call — see §4.5
  + guardrailsInstruction()     // brief §4.5 hard rules verbatim — see §4.5
  + pipelineSpecificInstructions
```

`propertyKnowledgeContext()` loads only the tables relevant to the pipeline (e.g. partner research doesn't need room types). It's deterministic, hashed, and cached per-process — but always re-read from DB on every cold start so manager edits propagate.

### 4.2 Pipelines

| Pipeline | Inputs | Output | Notes |
|---|---|---|---|
| `event-invention` | date_range, audience hints, occupancy context, recent learnings | Structured proposal (zod-validated) | Used by cron + on-demand |
| `package-proposal` | brief from manager, target audience, date | Structured package proposal | Same shape as event proposal, different theming |
| `asset-{type}` (~11 types) | approved proposal + brand voice + photo library refs | Asset content (text or HTML) | One prompt per type. Asset types from brief §3.2 step 4. |
| `on-demand-chat` | free-text user message + conversation history | Routed action (see §4.7) | Function-calling for routing; brief §3.1 mode B |
| `partner-research` | business name, location | Structured partner record | Uses Responses API web search tool |
| `post-event-synthesis` | post-event form data, prior learnings | Structured post-mortem + delta to meta-learnings | Brief §3.2 step 9 |

### 4.3 Structured output

Every pipeline returns Zod-validated JSON. If validation fails, we re-prompt once with the validation error and then surface to the user. No silent retries beyond 1.

### 4.4 Guardrails — two-tier enforcement

Hard rules are enforced **twice**:

1. **In the prompt** — "you must not propose room counts exceeding inventory" etc.
2. **In code, post-generation** — `lib/ai/guardrails.ts` runs structural checks on the JSON output and rejects violations. Rejection re-prompts once with the violation reason, then surfaces.

Soft rules surface as warnings in the proposal UI ("This proposal prices 18% above the standard rate range for Water View — justification: …") but don't block approval.

### 4.5 Hard rules (codified from brief §4.5, expanded here)

| Rule | Pre-generation enforcement | Post-generation enforcement |
|---|---|---|
| Room counts ≤ inventory | Prompt: "You have N of room type X" | Numeric check against `room_types.count` |
| Function space ≤ capacity | Prompt: capacities listed | Numeric check |
| No operational blackout dates | Prompt: blackouts listed | Date range intersection check |
| No clash with regular programming | Prompt: programming listed | Calendar intersection check |
| **Brand voice conformance** | Voice context injected (§4.6) | **Conformance scorer pipeline** (§4.6) |
| **Image generation: category-bounded** | **Prompt receives an explicit `category` parameter from {`decorative_background`, `abstract_motif`, `icon_set`, `texture`, `pattern`}** | **The image prompt is constructed by code from the category — the LLM never authors the image prompt directly. Anything that resolves to a category not in the enum is rejected.** This is structurally stronger than a word blocklist (which fails on synonyms, paraphrases, multilingual etc.). |
| No fabricated pricing | Prompt: rate ranges listed | Numeric range check against `operational_constants` |
| No false accessibility claims | Prompt: only `is_accessible=true` rooms can use "accessible" language; the approved phrase for mobility-friendly rooms is loaded from `operational_constants` and injected verbatim | Regex check on output for forbidden phrases ("wheelchair friendly", "fully accessible") on non-accessible rooms |
| No auto-send | Architectural — no SMTP/SMS adapters in v1 build | n/a |
| Audit log immutable | DB role separation — no DELETE on `audit_log` granted to app user | n/a |

### 4.6 Brand voice as a first-class guardrail

Brand voice is **not** a styling concern; it's a structural guardrail enforced on every generation.

Three integration points:

1. **Injection** — `brandVoiceContext()` loads the current `brand_voice` row (rules, guide, forbidden phrases, required phrases per context) and injects it into every prompt. Cached per-process keyed by `brand_voice.version`.
2. **Pre-flight gate** — every generation pipeline checks `brand_voice.reviewed_by_manager = true` before invoking the LLM. If false, the call is refused and the UI surfaces a "Brand voice must be reviewed before generation" message linking to the onboarding step.
3. **Post-generation conformance scorer** — a separate, cheap LLM call (`gpt-4o-mini`-class) takes the generated asset + the voice rules and returns a structured score (0–100) plus violations. Stored as `assets.brand_voice_score`. Below a threshold (default 70) the asset is auto-rejected with the violations returned to the generator for a single regeneration; below 50 twice surfaces to the manager. Threshold is in `operational_constants`.

This makes voice drift visible (score histogram in the audit/learnings views) and gives the manager a single knob to tighten.

### 4.7 On-demand chat router

The on-demand chat (brief §3.1 mode B) is a router, not a free-text LLM. The router prompt uses OpenAI function calling with a fixed schema of routable actions:

```ts
type RoutableAction =
  | { tool: "propose_events"; date_range: DateRange; audience?: string; count?: number }
  | { tool: "propose_packages"; brief: string; audience?: string; date?: Date }
  | { tool: "generate_event_calendar"; date_range: DateRange }
  | { tool: "answer_question"; question: string }      // routes to a RAG-over-learnings answerer
  | { tool: "suggest_partners"; region?: string; type?: string; count?: number }
  | { tool: "show_pipeline_status" }
  | { tool: "regenerate_asset"; asset_id: string; instruction: string }
  | { tool: "ask_clarification"; question: string };   // ambiguity escape hatch
```

**Ambiguity handling.** If the router's confidence in any single tool is below threshold, it returns `ask_clarification` with a single targeted question (one round-trip; no nested clarifications). Once clarified, the next user message is re-routed against the same schema with the prior turn as context.

**Routing constraints:**
- `propose_*` and `generate_*` checks `generation_paused` and `on_demand_paused` first; refuses with the reason if either is true.
- Long-running actions (anything that fans out) return an Inngest event ID and the UI subscribes for completion — the chat does not block.
- Every routed action writes the routed tool + arguments to `prompts_log` and `audit_log` so the router's behaviour is fully inspectable.

The chat prompt itself lives at `docs/prompts/on-demand-chat.md` with the function schema, the routable-actions reference, and the ambiguity policy.

---

## 5. Property knowledge injection — the mechanism

This is the single most important behaviour per brief §2.

```
GET /api/proposals/generate
  → assertNotPaused('generation_paused' | 'on_demand_paused' | 'cron_paused')
  → assertBrandVoiceReviewed()                       // §4.6 gate
  → loadPropertyKnowledge()                          // pulls all relevant tables
  → snapshot = serialize(knowledge)
  → systemPrompt = buildSystemPrompt('event-invention', knowledge)
  → response = openai.responses.create(...)
  → validated = zod.parse(response.output)
  → guardrails.check(validated, knowledge)           // §4.5 hard rules
  → voiceScore = brandVoiceConformance(validated)    // §4.6 scorer
  → proposal.save({ content: validated, property_knowledge_snapshot: snapshot,
                    brand_voice_version: knowledge.brand_voice.version })
  → auditLog({ action: 'proposal.created', ... })
  → promptsLog.write({ ... })
```

The snapshot is the contract: every proposal has its frozen view of the property. If the manager later changes a room rate, in-flight proposals still show the rate they were generated against — but a "knowledge has drifted" badge appears on the proposal.

---

## 6. Asset generation pipeline

Per brief §3.2 step 4, asset generation is heavy (~5–10 USD per pack). We handle it as:

1. Manager approves proposal.
2. Manager confirms feasibility (60-second form).
3. UI button "Generate asset pack" → enqueues an Inngest job.
4. Inngest job fans out 11 parallel `asset-{type}` generations.
5. Each child job:
   - calls the asset-specific prompt
   - for visual assets, renders HTML → PDF via Puppeteer or generates a decorative image via `gpt-image-1`
   - runs the brand voice conformance scorer (§4.6) on text outputs
   - saves to Supabase Storage
   - writes `assets` row
6. Asset workspace UI polls (or subscribes via Supabase Realtime) for completion.
7. Per-asset Regenerate button enqueues a single re-generation with the manager's comment.

### Image handling

The photo library is the source for all hotel/people imagery. The asset prompts return references (`{ "hero_photo_id": "..." }`) which the HTML template resolves to signed URLs.

AI image generation is **category-bounded** rather than word-blocked. The LLM never authors the image-generation prompt directly. Instead the asset prompt returns a declarative request:

```json
{ "decorative_image": { "category": "abstract_motif", "palette_hint": "lakeside-blue-cream", "style_hint": "Hamptons" } }
```

`lib/ai/images.ts` exposes exactly one function for decorative generation. The signature takes `category` and `styleBrief` as separate, typed parameters — never a free-form prompt string with a category label:

```ts
type ImageCategory =
  | "decorative_background"
  | "abstract_motif"
  | "icon_set"
  | "texture"
  | "pattern";

type StyleBrief = {
  paletteHint?: string;   // e.g. "lakeside-blue-cream" — short, controlled vocabulary
  styleHint?: string;     // e.g. "Hamptons" — drawn from brand_voice.rules
  aspectRatio: "1:1" | "16:9" | "4:5" | "3:4";
};

function generateDecorativeImage(
  category: ImageCategory,
  styleBrief: StyleBrief,
): Promise<ImageRef>;
```

Internally the function looks up the code-owned prompt template for `category` (e.g. `"abstract decorative motif suggesting {paletteHint} tones, {styleHint} aesthetic, no objects, no text, no people, suitable as a header background"`), interpolates `styleBrief` fields, and only then calls `gpt-image-1`. The LLM that generates the asset returns a structured request — `{ category, styleBrief }` as separate JSON fields, Zod-validated — which the caller passes through to `generateDecorativeImage`. There is no path where an LLM-authored string becomes the image prompt. Any request whose `category` ∉ `ImageCategory` fails Zod validation before any image API call is made. This is structurally stronger than a word blocklist (a blocklist fails on "individual", "human figure", "guest space", paraphrases, non-English, etc.) and keeps the blast radius of a model-side jailbreak attempt bounded by code.

---

## 7. Background jobs & cron

Inngest functions. Every function checks the relevant kill-switch flag at the top:

| Function | Trigger | Kill-switch check | Action |
|---|---|---|---|
| `weekly-proposal-generation` | Cron `0 6 * * 1 AEST` | `cron_paused` OR `generation_paused` | Mode A from brief §3.1 — generate 2–3 proposals for 6–14 weeks out |
| `daily-digest` | Cron `0 8 * * * AEST` | `cron_paused` | Email manager + marketing the daily digest (informational; does not call OpenAI) |
| `viability-monitor` | Cron daily | `cron_paused` | For each live event, compare pre-sales to threshold N days out; flag |
| `asset-pack-generate` | UI-triggered event | `generation_paused` | Fan-out asset generation |
| `partner-research` | UI-triggered event | `generation_paused` OR `on_demand_paused` | Enrich a single partner record |
| `partner-suggest` | Cron weekly | `cron_paused` OR `generation_paused` | Propose 5–10 new partners for review |
| `post-event-synthesis` | UI-triggered (post-event form submission) | `generation_paused` | Synthesise post-mortem; update meta-learnings |
| `monthly-cost-check` | Cron daily | (never paused — operational invariant) | If `prompts_log.cost` sum > monthly cap, flip `generation_paused = true` and alert |

The **kill switch** UI in v1 is a single "Pause everything" toggle (manager-only). Flipping it on sets all three flags to `true`; flipping off sets all to `false`. The flags exist separately in the DB so v2 can expose them granularly without a migration.

---

## 8. v2 integration seams (brief §7)

In `lib/distribution/`:

```ts
interface EmailDistributionAdapter {
  send(payload: GeneratedEmail, recipients: Recipient[]): Promise<DistributionResult>;
}
// v1: FileEmailAdapter — writes HTML+CSV to storage, returns download URLs
// v2: GraphEmailAdapter — calls Microsoft Graph
```

Same pattern for `SmsAdapter`, `AdAdapter` (Meta/Google), `PrintAdapter`, `AvailabilityAdapter` (manual feasibility form vs RMS Cloud), `BookingIngestAdapter` (manual form vs RMS webhook).

The booking-log POST endpoint accepts the manual form in v1; v2 RMS webhook posts to the same endpoint with a different `source` field. No data-model change.

---

## 9. Compliance & safety implementation (brief §8)

- Every generated marketing email and SMS template ends with an unsubscribe instruction block (Spam Act 2003). The asset prompt enforces this; the guardrail checker rejects if absent.
- Partner CRM stores only public-business info by default; a free-text `notes` field for the manager's private notes is access-controlled.
- Accessibility language: only the `is_accessible=true` room can use "wheelchair accessible"; "mobility-friendly" rooms get a fixed approved phrase from `operational_constants`.
- RSA: any copy mentioning drinks includes the responsible-service line (template-enforced).
- The Choice Hotels brand notes (TBD from manager during onboarding) live in `operational_constants.choice_hotels_brand_notes` and are injected into every brand-voice context.

---

## 10. Onboarding gates

Brief §6 lists 14 onboarding steps. Not all are equal — some block the system from producing safe output; others are quality-of-life. We split them into **hard gates** (block the app until satisfied) and **soft banners** (visible warnings on the dashboard until satisfied).

### Hard gates — app refuses to generate until all three are green

1. **Room inventory complete.** `SUM(room_types.count) = property_profile.total_rooms` (= 83). Enforced as a DB check constraint and as a UI block on the dashboard until satisfied. Brief §6 step 3.
2. **Brand voice reviewed by manager.** `brand_voice.reviewed_by_manager = true`, set explicitly by the manager clicking "I have reviewed this voice guide" during onboarding step 10. Until then, every generation pipeline refuses with a clear error linking back to the voice-edit screen. Prevents shipping campaigns in a hallucinated voice.
3. **Photo library ≥ 20 photos.** `COUNT(photo_library) ≥ 20`. The asset visual pipeline (landing pages, flyers) refuses below this — the hero photo selector has nothing to pick from.

The onboarding flow shows a persistent banner listing the unmet gates until they're all green; the dashboard's "Generate" buttons are disabled with a tooltip pointing to the failing gate.

### Soft banners — visible warnings, but generation proceeds

- Function-space capacities entered for all 4 spaces (yellow banner if any are null; events default to lower capacities and warn).
- Rate ranges entered for all 7 room types (yellow banner; package proposals warn if a room type lacks a rate).
- F&B cost-per-head benchmarks entered (yellow banner; P&L marked "F&B cost estimated").
- Partner CRM seeded with ≥ 30 records (yellow banner; partner-distribution suggestions warn that the pool is shallow).
- Talent database seeded with ≥ 5 contacts (yellow banner; talent shortlists fall back to web-search-only).
- Choice Hotels brand standards uploaded (yellow banner only — generation proceeds with a flag in `audit_log` so the manager can later audit any output produced without the brand docs).
- Mobility-friendly room counts entered per room type.
- Operational blackout dates entered for the next 6 months.
- Cron schedule and monthly budget confirmed.

The split is deliberate: we'd rather the manager start using the system with rough data than wait six weeks for perfect onboarding.

---

## 11. Testing approach

Tight in v1; expandable as the surface area grows.

### 11.1 Unit + integration: Vitest

- One test file per module under `lib/`.
- Integration tests for the prompt pipelines run against a deterministic OpenAI mock (`scripts/dev-openai-mock.ts`, see §12) — they assert structural correctness of the output (Zod parse OK, guardrails pass, voice score returned) but not literal LLM output.
- Database tests use Supabase local with a per-test transaction rolled back.

### 11.2 End-to-end: Playwright, one spec only in v1

The single e2e spec covers onboarding end-to-end: signup → create knowledge base → upload 20 photos (fixtures) → seed partners → mark voice reviewed → land on dashboard. Onboarding is the only flow where a regression silently breaks the entire system (a soft-gate bug doesn't; an onboarding bug does), so it gets the only e2e in v1. We add more in subsequent weeks if it pays off.

### 11.3 Prompt evals — `docs/prompts/evals/`

Five golden cases per pipeline (six pipelines × 5 = 30 cases). Each case is a YAML file:

```yaml
id: invention-001
input:
  date_range: { from: "2026-03-02", to: "2026-03-05" }
  audience: "Western Sydney retirees"
  occupancy_context: "soft Tuesday-Wednesday in March"
property_knowledge_fixture: fixtures/standard-beachie.json
assertions:
  - output.proposed_rooms.total <= 83
  - output.function_space in function_spaces
  - output.brand_voice_score >= 70
  - "no value of `output.pricing.per_person_cents` is outside 7500..50000"
  - none of forbidden_phrases appears in output.copy_preview
```

Evals run against the real OpenAI API in a dedicated CI job (manually triggered, not on every PR — keeps CI cost predictable) and against the mock on every PR. Failure of a mock-based assertion fails CI; failure of a real-API assertion produces a warning report attached to the PR.

This gives us a regression suite that protects against prompt drift, model swaps, and refactors — without locking us into specific LLM outputs.

---

## 12. Local dev story

### 12.1 Database, auth, storage

- **Supabase local** via the Supabase CLI: `supabase start` brings up Postgres + Auth + Storage on localhost. Migrations applied via `drizzle-kit push`. Seed data via `pnpm seed:dev` (loads brief §2.2 defaults plus 10 fake proposals, 20 fake partners, 20 fake photos).
- **No reliance on Supabase cloud in dev** — engineers can work offline.

### 12.2 OpenAI in dev

A dev-only mock server (`scripts/dev-openai-mock.ts`) speaks the OpenAI Responses API surface and returns deterministic structured outputs from a fixtures directory (`tests/fixtures/openai/`). Selected by env var `OPENAI_BASE_URL=http://localhost:4010`. The mock supports:

- structured-output mode (returns a fixture per `(pipeline, fixture_id)`)
- function-calling mode (used by the chat router)
- image-generation mode (returns a 1×1 PNG placeholder)

For developers who want to test against the real API:
- A separate env (`OPENAI_API_KEY` in `.env.local`) talks to the real API.
- **A hard dev-mode cost cap of USD 5/day** (configurable) is enforced by `lib/ai/client.ts` — every real call reads cumulative cost from the local `prompts_log` and refuses above the cap. Prevents a runaway debug loop from generating a surprise bill.

### 12.3 Inngest in dev

`npx inngest-cli dev` runs the local Inngest dev server. Functions register on file save. No cron triggers fire in dev unless explicitly invoked.

### 12.4 Puppeteer in dev

Uses the system Chrome via `puppeteer` (not `@sparticuz/chromium`). PDF outputs land in `tmp/` for inspection.

---

## 13. Week-by-week PR plan

Mapping brief §10 to discrete PRs. Each PR is reviewable in <1 hour.

| Week | PR | Deliverable | Definition of done |
|---|---|---|---|
| 1 | `feat/scaffold` | Next.js + Drizzle + Supabase + Auth shell | Logged-in user lands on empty dashboard |
| 1 | `feat/knowledge-schema` | Property knowledge tables + migrations + seed script | `pnpm seed:property` populates §2.2 defaults |
| 1 | `feat/knowledge-crud` | Admin CRUD UI for all 7 knowledge tables | Manager can edit rates; marketing has read-only |
| 1 | `feat/onboarding` | 14-step onboarding flow with the three hard gates (§10) | Onboarding completion gates dashboard; soft banners visible |
| 2 | `feat/prompt-runtime` | `lib/ai/client.ts`, prompts_log, cost tracking, granular kill-switch flags + master toggle UI, dev OpenAI mock | Every OpenAI call logged with cost; dev mock works offline |
| 2 | `feat/brand-voice-pipeline` | `brand_voice` table + reviewed_by_manager gate + conformance scorer | Generation refuses when voice not reviewed; scorer attaches to every asset |
| 2 | `feat/invention-pipeline` | Event invention + package proposal pipelines + guardrails | On-demand generation produces a valid proposal |
| 2 | `feat/proposals-ui` | Proposals view, approve/reject/revise, feasibility form | Approve flow end-to-end |
| 3 | `feat/asset-text-prompts` | Email, SMS, ad copy, phone scripts, coordinator email prompts | All text assets generate against an approved proposal |
| 3 | `feat/asset-workspace` | Event workspace UI, per-asset regenerate/approve, version history | Manager can iterate one asset |
| 4 | `feat/asset-pdf` | Landing page HTML, flyer PDF, voucher PDF, letter PDF | Print-ready downloads |
| 4 | `feat/asset-images-category` | `gpt-image-1` integration via category enum (§6) + photo library integration | Hero photos resolve correctly; image generation rejects non-enum categories |
| 5 | `feat/distribution-checklist` | Interactive checklist + adapter interfaces (v1 file impls) | Full event distribution flow |
| 5 | `feat/bookings-log` | Manual booking entry (incl. `attribution_notes`) + pre-sale tracking + viability flag | Bookings attributed to events and channels |
| 5 | `feat/csv-export` | CSV export endpoints for partners and bookings | Manager can download CSVs from both screens |
| 5 | `feat/audit-log` | Audit logging across all mutations + audit UI | Every action traceable |
| 6 | `feat/partner-crm` | Partner table, detail view, manual seed | 30+ seed records |
| 6 | `feat/partner-research` | AI-enriched partner records via Responses web search | Per-partner research populated |
| 6 | `feat/voucher-batches` | `voucher_batches` schema + voucher PDFs + redemption attribution via `bookings.voucher_batch_id` | Voucher redemption increments batch counters; partner ROI rollup query works |
| 7 | `feat/post-event` | Post-event form + synthesis prompt + learnings view | Completed event updates learnings |
| 7 | `feat/learnings-feedback` | Invention prompts read recent learnings | New proposals visibly reference prior insights |
| 8 | `feat/cron-and-digest` | Weekly proposal cron + daily digest email | System runs itself |
| 8 | `feat/chat-router` | On-demand chat router (§4.7) — function-calling schema + ambiguity flow | Free-text requests routed; clarifications work |
| 8 | `feat/onboarding-e2e-test` | Playwright onboarding spec (§11.2) | Spec runs in CI |
| 8 | `feat/prompt-evals` | Initial 30 golden cases + eval runner (§11.3) | Eval CI job green |
| 9–10 | `chore/polish-*` | Edge cases, error handling, perf, training docs | Real event end-to-end |

First revenue-generating event run-through target: end of Week 6, matching brief §10.

---

## 14. Open questions blocking real value (brief §12)

We can scaffold without these but the system will not produce useful proposals until they are populated. To be collected during the Week 1 onboarding session:

1. Exact room count per type (must sum to 83) — **hard gate**.
2. Function space capacities (cocktail/banquet/theatre) per space — from existing iVvy event packs.
3. Standard midweek rate ranges per room type.
4. F&B cost-per-head benchmarks for all six categories.
5. Mobility-friendly room counts per type.
6. Existing third-party talent contacts to seed the talent database.
7. 30–50 partner CRM seed records (CSV preferred).
8. Choice Hotels / Ascend Collection brand standards documents.
9. Preferred cron times (default `Mon 06:00 AEST` for proposals, `08:00 AEST` for digest).
10. Monthly OpenAI budget cap (default proposal: USD 350/mo).
11. Confirmed exact day for the monthly Poker Tournament and the Thursday Pool Comp time/location (brief §2.2 marks several as TBD).
12. Brand colours, fonts, logo files, 20+ categorised hotel photos — **photo count is a hard gate**.
13. OpenAI API key + Resend API key + Supabase project credentials.
14. List of marketing team email addresses for initial user provisioning.
15. Voice-guide review sign-off from the manager — **hard gate**.

---

## 15. Risks & unknowns (called out so they don't surprise us)

| Risk | Impact | Mitigation |
|---|---|---|
| Puppeteer cold starts on Vercel | Slow first PDF; possible 50MB limit | Pre-warmed function or dedicated worker if needed; abstract behind `lib/pdf/` |
| OpenAI rate limits during fan-out asset gen | Failed asset packs | Inngest retries with backoff; per-pack concurrency cap |
| Brand voice drift across regenerations | Inconsistent campaigns | Conformance scorer (§4.6) is the structural fix; voice version pinned per proposal |
| Manager doesn't complete onboarding fully | System can't produce useful proposals | Hard gates (§10) block generation; soft banners list what's missing without halting work |
| Choice Hotels brand standards conflict | Generated copy may violate parent brand | Hold marketing-asset generation behind a soft banner until brand docs are uploaded; flag audit entries until then |
| Image library too small | Repetitive visual assets | ≥ 20 photos is a hard gate (§10) |
| Postgres jsonb proposal schema drift | Hard to migrate later | Version every jsonb shape (`content.version`); writer always writes current version; reader supports prior versions |
| Cost overrun | OpenAI bill blows the cap | Hard monthly cap + kill switch + per-user rate limits on on-demand chat; dev-mode USD 5/day cap |
| Supabase RLS bugs locking out admin | Site broken | Server-side role checks are primary; RLS is defence-in-depth, not the gate |
| Manual booking entry is friction | Front desk skips logging → attribution data dies | 30-second target form; `attribution_notes` lets them dump context without forcing taxonomy; manager can backfill |
| Chat router misroutes ambiguous requests | Wasted generation; user frustration | Confidence threshold + `ask_clarification` escape hatch (§4.7); every routed call is in `audit_log` for review |
| Inngest pricing shifts | v1 cost projection invalidated | §1.2 projection is at 0.5% of free tier — even a 50× price hike still fits; fallback documented in §1.2 |

---

## 16. What I am asking you to confirm before scaffolding

Please flag any of these in PR comments:

1. **Drizzle vs Prisma** — Drizzle is my recommendation; happy to switch.
2. **Inngest** — locked in per §1.2 cost projection. Flag if you want to revisit.
3. **Supabase Auth vs Auth.js** — Supabase Auth is the natural fit given the rest of the stack; flag if you want to keep auth provider-independent.
4. **Repo layout** — single Next.js app vs Turborepo monorepo (admin + worker). I've proposed single-app for v1 simplicity.
5. **The PR cadence in §13** — happy to compress, expand, or reorder.
6. **Whether the brief's open questions in §14 are being collected in parallel** so Week 1 onboarding isn't blocked.

Once these are confirmed (or amended), the next session starts at PR `feat/scaffold`.
