# The Beachie Midweek Engine — Implementation Plan

**Status:** Draft v0.1 — for manager review before any scaffolding work begins.
**Source spec:** [`docs/SPEC.md`](./SPEC.md) (the master brief; treat as authoritative when this plan and the spec disagree).
**Target:** v1, brain-only, no external integrations beyond OpenAI.

This document is the bridge between the brief and the codebase. It pins the stack, sketches the schema, defines the prompt architecture, lays out the repo, maps the brief's 8–10 week plan to concrete PRs, and lists what we need from the manager before we can start coding usefully.

If you (the reviewer) want anything changed, mark this PR with comments — nothing is built yet.

---

## 1. Stack — pinned

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
| Jobs | **Inngest** | Cron + background jobs + retries + observability. Cleaner than rolling our own with BullMQ when we're already on Vercel. |
| Hosting | **Vercel** | Brief §4.1. |
| Internal email (digests/alerts only) | **Resend** | Not for marketing — only for internal team notifications. Brief §4.1. |
| Observability | **Vercel logs + a `prompts_log` table + Sentry** | Brief §4.2 requires every prompt/response logged. Sentry catches runtime errors. |
| Cost tracking | Custom dashboard reading from `prompts_log` | Brief §5.9. Hard monthly cap enforced in middleware. |

**Pinned package versions** are deferred to scaffolding time so we pick latest stable. The PR that scaffolds Week 1 will record them in `package.json` and the lockfile is the source of truth.

### Stack risks to flag now

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
│   │   └── webhooks/inngest/
│   └── onboarding/              # one-time setup flow
├── lib/
│   ├── db/                      # Drizzle schema, migrations, client
│   ├── ai/
│   │   ├── client.ts            # OpenAI wrapper; logs every call to prompts_log
│   │   ├── prompts/             # prompt builders — load markdown from /docs/prompts and interpolate knowledge
│   │   ├── pipelines/           # invention.ts, asset-gen.ts, partner-research.ts, post-event.ts, chat-router.ts
│   │   └── guardrails.ts        # hard/soft rule checker — runs over every proposal & generated asset
│   ├── knowledge/               # functions that load property knowledge tables and produce the injectable context blob
│   ├── pdf/                     # Puppeteer wrappers per asset type
│   ├── distribution/            # adapter interfaces (EmailAdapter, AdAdapter, SmsAdapter, PrintAdapter) — v1 impls produce files
│   ├── partners/                # CRM logic, voucher code generation/attribution
│   ├── auth/                    # Supabase client wrappers, role checks
│   ├── audit/                   # auditLog() helper used everywhere
│   └── jobs/                    # Inngest function definitions
├── components/                  # shared UI
├── inngest/                     # entry point for Inngest functions
├── public/
├── supabase/
│   └── migrations/              # SQL migrations (also exported by Drizzle for review)
├── scripts/
│   ├── seed-property.ts         # seeds the public-source defaults from brief §2.2
│   └── dev-reset.ts
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
brand_voice                — single row; jsonb of voice rules + free-text guide
operational_constants      — single row; blackout_dates (jsonb), rate_floors, rate_ceilings,
                             accessibility_notes, choice_hotels_brand_notes
photo_library              — id, storage_path, category, tags, alt_text
brand_assets               — id, type (logo|font|colour|doc), storage_path, metadata
talent_database            — id, name, type, contact, fee_range, notes (seeded at onboarding)
```

A hard DB constraint enforces `SUM(room_types.count) = property_profile.total_rooms`. Onboarding blocks until this is satisfied (brief §6 step 3).

### Workflow tables

```
users                      — id, email, role (manager|marketing), created_at, last_login
proposals                  — id, status, type (event|package), content (jsonb — full snapshot),
                             property_knowledge_snapshot (jsonb), created_by, approved_by,
                             created_at, target_date_start, target_date_end, viability_threshold
proposal_revisions         — id, proposal_id, content (jsonb), reason, created_by, created_at
feasibility_checks         — id, proposal_id, confirmed_by, confirmed_at, notes
assets                     — id, proposal_id, type, version, status, content (jsonb for text,
                             storage_path for files), prompt_log_id, created_at, approved_by
asset_regenerations        — id, asset_id, comment, prior_version
distribution_checklists    — id, proposal_id, items (jsonb array of {key,label,status,assignee,
                             completed_at,completed_by})
bookings                   — id, proposal_id, guest_name, guest_phone, rooms_allocated (jsonb),
                             room_type_id, value_cents, attribution_channel, voucher_code,
                             logged_by, logged_at, status
vouchers                   — id, proposal_id, code (unique), partner_id, value_cents, status
                             (issued|distributed|redeemed), redeemed_booking_id, created_at,
                             distributed_at, redeemed_at
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
system_settings            — single row; kill_switch_enabled, monthly_budget_cents,
                             viability_check_days_pre_event, cron_proposal_time,
                             cron_digest_time, openai_api_key_ref
```

### Key design decisions

- **`property_knowledge_snapshot` on proposals** — brief §2.3 mandates this. Stored as jsonb at proposal-creation time so later edits to the knowledge base don't retroactively invalidate approved campaigns.
- **`content jsonb` everywhere** — the proposal and asset schemas evolve as we iterate prompts. Strongly-typed columns are not worth the migration churn in v1; we validate jsonb with Zod at the API boundary.
- **Voucher codes are unique per partner per proposal** — so a redemption attributes both the campaign and the partner automatically (brief §3.3).
- **`audit_log.before/after` is jsonb** — not joinable but trivially diffable in the UI.
- **No soft-delete** — kept simple in v1. Status fields cover lifecycle.

---

## 4. Prompt architecture

Brief §4.4 lists six master prompts. We treat prompts as code, not config — versioned in `docs/prompts/`, loaded by `lib/ai/prompts/`, and tested as part of the build.

### Anatomy of a prompt call

```
buildSystemPrompt(pipeline) =
  STATIC_PREAMBLE
  + propertyKnowledgeContext()  // injected from DB every call (brief §2.3, §4.2)
  + brandVoiceContext()
  + guardrailsInstruction()     // brief §4.5 hard rules verbatim
  + pipelineSpecificInstructions
```

`propertyKnowledgeContext()` loads only the tables relevant to the pipeline (e.g. partner research doesn't need room types). It's deterministic, hashed, and cached per-process — but always re-read from DB on every cold start so manager edits propagate.

### Pipelines

| Pipeline | Inputs | Output | Notes |
|---|---|---|---|
| `event-invention` | date_range, audience hints, occupancy context, recent learnings | Structured proposal (zod-validated) | Used by cron + on-demand |
| `package-proposal` | brief from manager, target audience, date | Structured package proposal | Same shape as event proposal, different theming |
| `asset-{type}` (~11 types) | approved proposal + brand voice + photo library refs | Asset content (text or HTML) | One prompt per type. Asset types from brief §3.2 step 4. |
| `on-demand-chat` | free-text user message + conversation history | Routed action (propose / answer / generate) | Function-calling for routing; brief §3.1 mode B |
| `partner-research` | business name, location | Structured partner record | Uses Responses API web search tool |
| `post-event-synthesis` | post-event form data, prior learnings | Structured post-mortem + delta to meta-learnings | Brief §3.2 step 9 |

### Structured output

Every pipeline returns Zod-validated JSON. If validation fails, we re-prompt once with the validation error and then surface to the user. No silent retries beyond 1.

### Guardrails (brief §4.5)

Hard rules are enforced **twice**:

1. **In the prompt** — "you must not propose room counts exceeding inventory" etc.
2. **In code, post-generation** — `lib/ai/guardrails.ts` runs structural checks on the JSON output and rejects violations. Rejection re-prompts once with the violation reason, then surfaces.

Soft rules surface as warnings in the proposal UI ("This proposal prices 18% above the standard rate range for Water View — justification: …") but don't block approval.

---

## 5. Property knowledge injection — the mechanism

This is the single most important behaviour per brief §2.

```
GET /api/proposals/generate
  → loadPropertyKnowledge()        // pulls all relevant tables
  → snapshot = serialize(knowledge)
  → systemPrompt = buildSystemPrompt('event-invention', knowledge)
  → response = openai.responses.create(...)
  → validated = zod.parse(response.output)
  → guardrails.check(validated, knowledge)
  → proposal.save({ content: validated, property_knowledge_snapshot: snapshot })
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
   - saves to Supabase Storage
   - writes `assets` row
6. Asset workspace UI polls (or subscribes via Supabase Realtime) for completion.
7. Per-asset Regenerate button enqueues a single re-generation with the manager's comment.

**Image handling:** the photo library is the source for all hotel/people imagery. The asset prompts return references (`{ "hero_photo_id": "..." }`) which the HTML template resolves to signed URLs. AI image generation is only for backgrounds, motifs, decorative elements — enforced by prompt + a hard guardrail rejecting any image prompt containing the words "person", "people", "guest", "hotel", "room" (sample list — refined during build).

---

## 7. Background jobs & cron

Inngest functions:

| Function | Trigger | Action |
|---|---|---|
| `weekly-proposal-generation` | Cron `0 6 * * 1 AEST` | Mode A from brief §3.1 — generate 2–3 proposals for 6–14 weeks out |
| `daily-digest` | Cron `0 8 * * * AEST` | Email manager + marketing the daily digest (brief §3.1 mode C) |
| `viability-monitor` | Cron daily | For each live event, compare pre-sales to threshold N days out; flag |
| `asset-pack-generate` | UI-triggered event | Fan-out asset generation |
| `partner-research` | UI-triggered event | Enrich a single partner record (or batch) |
| `partner-suggest` | Cron weekly | Propose 5–10 new partners for review |
| `post-event-synthesis` | UI-triggered (post-event form submission) | Synthesise post-mortem; update meta-learnings |
| `monthly-cost-check` | Cron daily | If `prompts_log.cost` sum > monthly cap, flip the kill switch and alert |

The **kill switch** (brief §4.2) is a `system_settings.kill_switch_enabled` boolean. Every Inngest function and every API route that triggers generation checks it first and bails with a logged event.

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

## 10. Week-by-week PR plan

Mapping brief §10 to discrete PRs. Each PR is reviewable in <1 hour.

| Week | PR | Deliverable | Definition of done |
|---|---|---|---|
| 1 | `feat/scaffold` | Next.js + Drizzle + Supabase + Auth shell | Logged-in user lands on empty dashboard |
| 1 | `feat/knowledge-schema` | Property knowledge tables + migrations + seed script | `pnpm seed:property` populates §2.2 defaults |
| 1 | `feat/knowledge-crud` | Admin CRUD UI for all 7 knowledge tables | Manager can edit rates; marketing has read-only |
| 1 | `feat/onboarding` | 14-step onboarding flow with room-count = 83 hard check | Onboarding completion gates dashboard |
| 2 | `feat/prompt-runtime` | `lib/ai/client.ts`, prompts_log, cost tracking, kill switch | Every OpenAI call logged with cost |
| 2 | `feat/invention-pipeline` | Event invention + package proposal pipelines + guardrails | On-demand generation produces a valid proposal |
| 2 | `feat/proposals-ui` | Proposals view, approve/reject/revise, feasibility form | Approve flow end-to-end |
| 3 | `feat/asset-text-prompts` | Email, SMS, ad copy, phone scripts, coordinator email prompts | All text assets generate against an approved proposal |
| 3 | `feat/asset-workspace` | Event workspace UI, per-asset regenerate/approve, version history | Manager can iterate one asset |
| 4 | `feat/asset-pdf` | Landing page HTML, flyer PDF, voucher PDF, letter PDF | Print-ready downloads |
| 4 | `feat/asset-images` | gpt-image-1 for decorative + photo library integration | Hero photos resolve correctly |
| 5 | `feat/distribution-checklist` | Interactive checklist + adapter interfaces (v1 file impls) | Full event distribution flow |
| 5 | `feat/bookings-log` | Manual booking entry + pre-sale tracking + viability flag | Bookings attributed to events and channels |
| 5 | `feat/audit-log` | Audit logging across all mutations + audit UI + kill switch UI | Every action traceable |
| 6 | `feat/partner-crm` | Partner table, detail view, manual seed, voucher attribution | 30+ seed records |
| 6 | `feat/partner-research` | AI-enriched partner records via Responses web search | Per-partner research populated |
| 7 | `feat/post-event` | Post-event form + synthesis prompt + learnings view | Completed event updates learnings |
| 7 | `feat/learnings-feedback` | Invention prompts read recent learnings | New proposals visibly reference prior insights |
| 8 | `feat/cron-and-digest` | Weekly proposal cron + daily digest email | System runs itself |
| 8 | `feat/chat-ui` | On-demand chat interface in admin | Free-text requests routed |
| 9–10 | `chore/polish-*` | Edge cases, error handling, perf, training docs | Real event end-to-end |

First revenue-generating event run-through target: end of Week 6, matching brief §10.

---

## 11. Open questions blocking real value (brief §12)

We can scaffold without these but the system will not produce useful proposals until they are populated. To be collected during the Week 1 onboarding session:

1. Exact room count per type (must sum to 83).
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
12. Brand colours, fonts, logo files, 20+ categorised hotel photos.
13. OpenAI API key + Resend API key + Supabase project credentials.
14. List of marketing team email addresses for initial user provisioning.

---

## 12. Risks & unknowns (called out so they don't surprise us)

| Risk | Impact | Mitigation |
|---|---|---|
| Puppeteer cold starts on Vercel | Slow first PDF; possible 50MB limit | Pre-warmed function or dedicated worker if needed; abstract behind `lib/pdf/` |
| OpenAI rate limits during fan-out asset gen | Failed asset packs | Inngest retries with backoff; per-pack concurrency cap |
| Brand voice drift across regenerations | Inconsistent campaigns | Voice context is injected every call; we add a voice-conformance check prompt as a final gate in week 3 |
| Manager doesn't complete onboarding fully | System can't produce useful proposals | Onboarding gates dashboard; partial completion is allowed but with banners listing what's missing |
| Choice Hotels brand standards conflict | Generated copy may violate parent brand | Block on getting brand docs in week 1; until then, hold marketing-asset generation behind a feature flag |
| Image library too small | Repetitive visual assets | Onboarding requires ≥20 photos before asset pack generation is enabled |
| Postgres jsonb proposal schema drift | Hard to migrate later | Version every jsonb shape (`content.version`); writer always writes current version; reader supports prior versions |
| Cost overrun | OpenAI bill blows the cap | Hard monthly cap + kill switch + per-user rate limits on on-demand chat |
| Supabase RLS bugs locking out admin | Site broken | Server-side role checks are primary; RLS is defence-in-depth, not the gate |
| Manual booking entry is friction | Front desk skips logging → attribution data dies | 30-second target form; phone script explicitly instructs the channel question; manager can backfill |

---

## 13. What I am asking you to confirm before scaffolding

Please flag any of these in PR comments:

1. **Drizzle vs Prisma** — Drizzle is my recommendation; happy to switch.
2. **Inngest vs Vercel Cron + a simpler queue** — Inngest is heavier; for v1 you may prefer plain cron + DB-backed jobs.
3. **Supabase Auth vs Auth.js** — Supabase Auth is the natural fit given the rest of the stack; flag if you want to keep auth provider-independent.
4. **Repo layout** — single Next.js app vs Turborepo monorepo (admin + worker). I've proposed single-app for v1 simplicity.
5. **The PR cadence in §10** — happy to compress, expand, or reorder.
6. **Whether the brief's open questions in §12 are being collected in parallel** so Week 1 onboarding isn't blocked.

Once these are confirmed (or amended), the next session starts at PR `feat/scaffold`.
