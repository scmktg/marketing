# The Beachie Midweek Engine — Claude Code Project Brief

**Project:** An AI-powered midweek events and accommodation packages system for The Beachcomber Hotel & Resort, Toukley NSW
**Version:** v1.0 (Brain-only — no external integrations)
**Audience for this document:** A full-stack developer building the system in Claude Code

---

## 0. How to read this document

This is the master spec. Read it end-to-end before writing any code. The order matters: Section 1 explains *why* the system exists, Section 2 defines *what it must know about the property* (the most important section — get this wrong and everything downstream fails), Section 3 defines *what it does*, Sections 4–9 are the build details, and Section 10 is the delivery plan.

Where this brief says "the developer decides," that means it's deliberately left open — make a sensible choice and move on. Where it says "must" or "never," treat those as hard constraints.

---

## 1. Why this system exists

The Beachcomber Hotel & Resort ("The Beachie") in Toukley has low midweek occupancy. Weekends are strong; Monday–Thursday is soft. The single highest-leverage market segment for filling these midweek nights is **retirees from Western Sydney and Newcastle** — both demographics within a 60–90 minute drive, both with disposable income, time, and a strong appetite for organised, social, midweek getaways.

The strategic insight underpinning this system: **retirees don't book hotel rooms, they book reasons to leave the house on a Tuesday with people they like.** Generic "20% off midweek" offers don't move them. Themed events and accommodation packages with social or experiential anchors (a guest speaker, a workshop, a club outing, a curated experience) do. Layered on top, **gift-card style vouchers distributed through trusted local businesses** (hairdressers, GPs, retirement villages, RSL clubs) work as a sales-closing tool because retirees buy on personal recommendation more than on advertising.

This system is the engine that **invents the events, designs the packages, generates all marketing materials, and prepares all the distribution work** — handing finished outputs to the manager and marketing team to execute manually. It does not, in v1, integrate with any external system. It is a content and intelligence factory.

The economic goal is concrete: **measurably increase midweek room nights month-on-month**, measured by bookings logged into the system after each campaign.

---

## 2. The Property Knowledge Base — the single most important section

The system's intelligence is bounded by how accurately it understands the property. Every prompt to the AI reasoning layer must inject the property knowledge base as context. This section defines what that knowledge base contains, how it is structured, and how it is populated.

### 2.1 Property knowledge structure (Postgres tables)

A `property_profile` table containing a single row of high-level facts. A `room_types` table with one row per accommodation type. A `function_spaces` table with one row per event space. A `fb_venues` table for food and beverage outlets. A `regular_programming` table for recurring weekly/monthly events the system must work around. A `local_context` table with markets, distances, and target postcodes. A `brand_voice` table holding the voice guide. A `operational_constants` table holding rate ranges, F&B costs, accessibility notes, blackout dates.

All tables are editable by the manager via the admin UI; the system reads from them on every generation.

### 2.2 Initial seed data — populate during onboarding

The values below are confirmed from public sources (Beachie website, booking platforms, marketing materials) and should be pre-seeded. The manager confirms/edits during the 2–3 hour onboarding session described in Section 8.

**property_profile (single row):**

| field | value |
|---|---|
| name | The Beachcomber Hotel & Resort |
| nickname | The Beachie |
| address | 200 Main Rd, Toukley NSW 2263 |
| phone | (02) 4317 2845 |
| email | hello@beachcomberhotelandresort.com.au |
| brand_collection | Ascend Collection (Choice Hotels) |
| total_rooms | 83 |
| style | Hamptons-inspired, waterfront, iconic local |
| setting | Waterfront on Budgewoi Lake, Central Coast NSW |
| distance_sydney_cbd_min | 90 |
| distance_newcastle_min | 60 |
| tagline | Life's Peachy at The Beachie |
| website | beachcomberhotelandresort.com.au |
| instagram | @thebeachie |
| facebook | TheBeachie |
| booking_engine_internal | Choice Hotels (CentralCommand) |
| event_booking_system | iVvy |
| restaurant_booking_system | Sevenrooms |
| pms | RMS Cloud |

**room_types (seed, manager confirms exact counts):**

| name | beds | max_guests | tier | view | notable_features | retiree_suitability_notes |
|---|---|---|---|---|---|---|
| Water View Deluxe | 1 king + 1 sofa bed | 3 | Premium | Lake | Separate bathtub, balcony | Excellent for couples wanting waterfront premium; sofa bed not for sleeping retirees |
| Poolside Deluxe | 1 king + 1 sofa bed | 3 | Premium | Pool + lake | Separate bathtub, balcony | Excellent for couples; pool proximity good for low-mobility |
| Water View | 1 king OR 2 doubles | 4 | Mid | Lake | 55" smart TV, balcony, bar fridge | **HIGH-LEVERAGE FOR RETIREES** — twin-share configuration is the workhorse for friend-pair travel |
| Poolside | 1 king OR 2 queens | 4 | Mid | Pool + lake | 55" smart TV, terrace, bar fridge | High-leverage for retiree pairs; queens preferred over doubles for older guests |
| Urban Deluxe | 1 king | 2 | Lower | Street | 55" smart TV, bar fridge | De-prioritise for retiree campaigns; waterfront is the draw |
| Urban | 1 king | 2 | Entry | Street | 55" smart TV, bar fridge | De-prioritise for retiree campaigns |
| Essential (no view) | 1 queen OR 2 queens | 4 | Value | None | 55" smart TV, bar fridge | Useful for group rate-padding when view rooms run out; honest framing only — never marketed as premium |

The `count` field for each room type must be entered by the manager during onboarding and must sum to 83.

The `standard_midweek_rate_low` and `standard_midweek_rate_high` for each room type must also be entered during onboarding — these drive the P&L calculations in every package proposal.

A single `is_accessible` boolean exists per room type. During onboarding the manager additionally tags a `mobility_friendly_room_count` per type, identifying rooms that — while not formally accessible — are well-suited to guests with mobility limitations (ground floor, walk-in shower, proximity to lifts/parking). The system uses this for retiree package planning.

**function_spaces (seed from website, manager confirms capacities from existing iVvy event packs):**

| name | style | views | capacity_cocktail | capacity_banquet | capacity_theatre | best_for |
|---|---|---|---|---|---|---|
| Foreshore Room | Hamptons, polished timber floors, floor-to-ceiling bifolds, private courtyard | Lakefront | TBD | TBD | TBD | Flagship for group dinners, cocktail receptions, large retiree group events |
| Lake View Room | Newly refurbished Hamptons, natural light, balcony | Lake | TBD | TBD | TBD | Seated lunches, talks, workshops, smaller group dinners |
| Lakeside Cabanas | Outdoor, intimate | Lake | TBD | TBD | n/a | Picnics, intimate gatherings, 8–12 person bespoke experiences |
| Patio | Covered outdoor | Lake | TBD | TBD | n/a | Lakeside lunches, larger casual gatherings |

**fb_venues:**

| name | type | style | capacity | notes |
|---|---|---|---|---|
| The Beachie (Bistro) | Pub/bistro | Casual, elevated pub classics | TBD | Uses Sevenrooms; buzzer system per management response on TripAdvisor |
| Pelicans Restaurant | Restaurant | Elevated, seafood-focused, lake-facing | TBD | Premium F&B venue |
| Pool Club / Poolside Bar | Outdoor bar | Casual lakeside | TBD | Weather-dependent |

Capacities and approximate cost-per-head benchmarks for breakfast, lunch, two-course dinner, three-course dinner, canapés, beverage packages must all be entered by the manager during onboarding.

**regular_programming (seed from website):**

| event | frequency | day | time | venue | impact_on_midweek_events |
|---|---|---|---|---|---|
| Poker Tournament | Monthly | TBD | Evening | TBD | Avoid scheduling competing quiet events that night |
| Pool Comp | Weekly | Thursday | 7pm | Bar area | Avoid clashing quiet evening events Thursdays |
| Live Soloist | Weekly | Friday + Sunday | Evening | TBD | Not midweek; no impact |
| Saturday Sessions | Weekly | Saturday | 7pm+ | TBD | Not midweek; no impact |
| Wedding Showcase | Annual | TBD | TBD | Multiple spaces | Blocks function space on showcase date |

**local_context:**

A free-form section of the knowledge base containing nearby points of interest (Toukley Golf Club 5min, surf beaches 5min, The Entrance 13min, Tuggerah Lake, Wyrrabalong National Park, fishing spots, Norah Head Lighthouse, Pelican Plaza). Plus the target market postcodes:

| region | postcodes | suburbs | drive_time_min | retiree_density |
|---|---|---|---|---|
| Western Sydney (Hills) | 2153, 2154, 2155, 2156, 2157, 2118, 2119, 2120, 2121, 2125, 2126 | Castle Hill, Baulkham Hills, Carlingford, Epping, Pennant Hills, Cherrybrook, Glenhaven, Dural | 90 | High, affluent |
| Sydney North Shore | 2076, 2077, 2074, 2075 | Wahroonga, Hornsby, Turramurra, St Ives | 75 | High, affluent |
| Newcastle / Lake Macquarie | 2280, 2281, 2282, 2283, 2284, 2285, 2289, 2290, 2291 | Belmont, Valentine, Warners Bay, Charlestown, Adamstown Heights, Merewether, The Hill, New Lambton | 60–75 | High, mixed affluence |

**brand_voice:**

Drafted during onboarding by the system from the website and Facebook page. Indicative properties: warm, locally proud, lightly cheeky in an Aussie way, unpretentious, uses "The Beachie" affectionately, anchors around the Hamptons-inspired/waterfront/iconic-local identity, uses phrases like "Life's Peachy," "Pick your oasis," "Eat, Drink, Play + Stay," "arvo," "lakeside." Never luxury-speak. Never wellness-jargon. Never corporate. Edited by manager at onboarding and editable thereafter.

### 2.3 How the property knowledge base is used

Every AI generation call (event invention, package proposal, asset generation, on-demand chat response) loads the relevant property knowledge tables and injects them into the system prompt. The system is therefore physically incapable of proposing things that contradict the property (e.g. "a 200-person beachside wedding" — the Foreshore Room caps lower; or "a king-only romance package for 4 retiree friends" — wrong room configuration).

A property knowledge snapshot is taken at proposal-creation time and stored with the proposal so that later edits to the knowledge base don't retroactively invalidate already-approved campaigns.

---

## 3. What the system does — the pipeline

### 3.1 Three modes of operation

**Mode A — Scheduled weekly generation.** Cron-triggered every Monday at 6am AEST. The system reviews the forward calendar, recent learnings, seasonal context, and proposes 2–3 new event/package concepts for midweek dates 6–14 weeks out. Manager and marketing team see proposals in the admin UI by 9am Monday.

**Mode B — On-demand generation.** Manager or marketing team types a request into a chat interface in the admin UI. Examples: "Generate an events calendar for February to April," "Propose 5 accommodation packages targeting Newcastle retirees for soft July midweeks," "Build a Mother's Day week package using the Foreshore Room," "Suggest a package for a Probus club enquiry asking about 30 guests in May," "Show me what we should be working on this week." The system understands these requests, reasons against the property knowledge base, and produces proposals of the same caliber as the scheduled run.

**Mode C — Continuous background tasks.** The system maintains the coordinator/partner CRM, monitors pre-sale numbers against viability thresholds for live events, generates a daily 8am digest of pipeline status and items needing attention, and runs post-event learning ingestion.

### 3.2 The nine-step pipeline

Every event/package flows through these steps:

**Step 1 — Invention.** AI generates a proposal containing: event/package name, concept, theme, why-this-why-now rationale, suggested midweek dates (with rationale), target attendee count and minimum viability number, room types and counts to allocate, function space(s) used, F&B plan, third-party talent or partners required (with a shortlist of 3 named candidates each, researched via web search), pricing per person and per package, full P&L with break-even analysis, voucher distribution plan (if applicable), target audiences (which past-guest segments, which coordinators, which postcodes for ads).

**Step 2 — Manager approval.** Manager sees the proposal in the admin UI. Three actions: Approve, Reject (with reason logged to learning database), or Revise (free-text comment; AI regenerates with feedback applied). Marketing team can also approve, but the system tags who approved each proposal.

**Step 3 — Feasibility prep.** Because v1 does not integrate with RMS, the manager confirms in a 60-second form: rooms available on those dates, no conflicting function-space bookings, F&B can cope, no operational blackouts. The system pre-fills what it knows (e.g. flagging "Note: monthly Poker Tournament is typically on Thursdays — confirm no conflict"). On confirmation, the event moves to asset generation.

**Step 4 — Asset generation.** The system generates the full asset pack and stores in the event's workspace. Asset types in the locked library:

- Event/package landing page (standalone HTML file with inlined CSS, brand-styled, includes phone-call CTA and email-enquiry CTA — no live booking widget in v1)
- Past-guest email (HTML + plain text, with primary subject line and 2 alternates)
- Coordinator email (HTML + plain text, B2B tone, longer, accompanied by CSV of recommended coordinator recipients from CRM)
- SMS copy (160-char and 320-char variants for opted-in past guests)
- Facebook/Instagram ad set (3 creative variants — headline, primary text, description, CTA — plus a targeting spec document listing recommended postcodes, age ranges, interests, custom audience suggestions)
- Google ad set (keywords, headlines, descriptions, recommended bids, suggested daily budget, landing page URL)
- Printed A5 flyer (print-ready PDF with bleed and crop marks)
- Posted letter for older past guests (print-ready PDF, personalised at salutation, warm tone, phone number CTA)
- Voucher artwork (if vouchers are part of the campaign — print-ready PDF with unique codes generated and logged in the system, one code per intended distribution partner)
- Inbound phone script (for front-desk staff handling enquiries — event cheat sheet, FAQ, objection handling, upsell paths, recommended close)
- Outbound coordinator phone script (per-coordinator briefing notes attached, customised per CRM entry)

All copy is checked against the brand voice guide before display. Images use only the uploaded photo library plus AI-generated stylistic/abstract elements (backgrounds, decorative motifs). Never AI-generated photos of people or the hotel itself.

**Step 5 — Asset review.** Manager/marketing reviews the asset pack. Each item has Approve / Regenerate buttons. Regenerate takes a free-text comment ("less corporate," "lean harder on the lake views"); the AI produces a new version. Approved assets are locked and made downloadable.

**Step 6 — Human distribution checklist.** The admin UI presents an interactive checklist per event:

- Publish landing page (download HTML, instructions for CMS)
- Send past-guest email (download HTML, segment instructions, link to Outlook for sending)
- Send coordinator emails (download CSV + template, mail merge instructions)
- Send SMS to past guests (copy, instructions)
- Launch Facebook/Instagram ads (download creatives + targeting spec)
- Launch Google ads (download spec)
- Print and distribute flyers (download PDF, partner distribution list with addresses)
- Print, sign, post letters (download merged PDF, addresses)
- Print vouchers and deliver to partners (download PDF with codes, partner list, suggested delivery dates)
- Brief front-desk staff on inbound script (download cheat sheet)
- Brief sales person on coordinator outreach (download per-coordinator briefings)

Each tick logs to the system with timestamp and user.

**Step 7 — Bookings logging.** Bookings come in via phone or email. Front desk logs each into the system in 30 seconds: guest name, event, attribution channel (the script asks them how they heard), rooms allocated, room type, value. The system tracks pre-sales per event against its viability threshold.

**Step 8 — Pre-event viability check.** At a configurable cutoff (default 14 days pre-event), if pre-sales are below threshold, the system flags it and proposes options: pivot to a smaller format, postpone with comms to those booked, run a last-push campaign with a discount, cancel and offer alternatives. The manager decides; the system generates the comms for whichever option is chosen and adds them to the distribution checklist.

**Step 9 — Post-event learning.** After the event, the manager or front desk submits a structured form: actual attendance, total revenue, F&B spend, repeat-booking signal (have any attendees re-booked within 90 days), qualitative notes. The AI ingests this, writes a structured post-mortem, and updates a `learnings` table that feeds back into Step 1 of future cycles. Over a year this becomes proprietary intelligence about what converts.

### 3.3 The voucher mechanic

Vouchers are a sales-closing tactic, not a standalone product. When a proposal includes vouchers, the system:

- Specifies which partner types to distribute through (e.g. "20 hairdressers and 10 podiatrists in target postcodes")
- Generates unique voucher codes — one per partner business so redemption attribution is automatic
- Designs the voucher artwork (print-ready, brand-styled)
- Adds "Print and distribute vouchers to partners" to the distribution checklist
- Provides a researched list of recommended distribution partners drawn from the CRM (with names, addresses, owner names where known, phone numbers, suggested approach)
- Tracks redemption — when a guest books and references a voucher code, the system attributes the booking back to the originating partner, building partner ROI intelligence over time

Vouchers are typically $50–$100 in value, redeemable against midweek stays at the relevant event/package only. The partner pays nothing; only redeemed vouchers become a cost. This mechanic was identified as one of the highest-ROI tactics for this segment during scoping.

### 3.4 The coordinator/partner CRM

A simple Postgres table — `partners` — with these fields per record: business/organisation name, type (hairdresser/GP/retirement village/Probus/RSL/etc.), owner or coordinator name, role, phone, email, address, postcode, region, notes, status (researched/contacted/active/dormant), last_contact_date, last_contact_outcome, vouchers_distributed, vouchers_redeemed, bookings_attributed, revenue_attributed, partner_satisfaction (1–5, manually logged after quarterly check-ins), tags (free-form).

The manager seeds 30–50 contacts during onboarding. The system enriches each record with public research (business background, recent reviews, owner research via ABN/Google) and proposes 5–10 new partners per week for the manager to review/add. The system never auto-contacts partners; it only prepares materials and recommends actions.

---

## 4. Technical architecture

### 4.1 Stack

The developer makes the final call, but the recommended stack is:

- **Frontend:** Next.js 14+ with App Router, React, TypeScript, Tailwind CSS, shadcn/ui components
- **Backend:** Next.js API routes (or a separate Node/Express server if the developer prefers — either works)
- **Database:** Postgres (managed — Supabase, Neon, or Railway are all fine)
- **Auth:** Email/password with Clerk, Auth.js, or Supabase Auth — must support multiple users (manager, marketing team members) with role-based access (manager has all permissions; marketing team can create/approve but not modify property knowledge or guardrails)
- **AI reasoning:** OpenAI API — the system was specified to use ChatGPT. Use GPT-5 (or whatever is current and strongest at build time) for all reasoning. Use the Responses API where appropriate for multi-step tool use.
- **Image generation:** OpenAI gpt-image-1 (or equivalent current model) — stylistic/abstract elements only
- **PDF generation:** Puppeteer for HTML-to-PDF (landing page artwork, flyers, letters, vouchers)
- **File storage:** S3 or equivalent (Supabase Storage works fine) for generated assets, uploaded photos, brand documents
- **Job scheduling:** Cron via Vercel Cron or a simple scheduled job service; a job queue (BullMQ on Redis, or Inngest) for longer-running generation tasks so the UI doesn't hang
- **Hosting:** Vercel (or similar)
- **Email (outbound to users only — for digests and alerts):** Resend or Postmark. **Not used for marketing emails — those are downloaded and sent by humans via Outlook.**

### 4.2 Key architectural principles

**Property knowledge is injected, not assumed.** Every AI call loads relevant property knowledge tables and injects them into the system prompt. There is no globally-cached "this is The Beachie" prompt — the knowledge base is the source of truth and the prompt is rebuilt each call.

**Generation is staged and inspectable.** Long-running generation jobs (asset pack generation can take several minutes) run as background jobs with progress updates streamed to the UI. Every prompt-and-response pair is logged for debugging. Each generated asset is stored as a version — regenerations create new versions, the old version is retained for inspection.

**Nothing is sent to the outside world.** The system has no API integrations beyond OpenAI. It does not send marketing emails, post to social, publish to the website, or contact partners. Every output is downloaded or copy-pasted by humans. Internal-only outbound email (digests, alerts to team members) is permitted.

**The admin UI is the system.** No CLI, no separate dashboard. Everything the manager and marketing team need lives in the web app.

**Audit log everything.** Every action (proposal approved, asset regenerated, distribution step ticked, booking logged) is logged with user, timestamp, and content. Surfaced as an audit-log view in the admin UI.

**Kill switch.** A single "pause all generation" toggle in the admin UI (manager-only). When enabled, the cron jobs skip, on-demand generation is disabled, but the UI remains functional for review and human distribution work.

### 4.3 Data model (high level)

The developer designs the full schema, but at minimum:

- `users` (manager, marketing roles)
- `property_profile`, `room_types`, `function_spaces`, `fb_venues`, `regular_programming`, `local_context`, `brand_voice`, `operational_constants` — the property knowledge base
- `proposals` (event/package proposals with status: draft / pending_approval / approved / rejected / live / completed / cancelled, plus the full snapshot of the proposal content as JSON)
- `assets` (one per generated marketing item, linked to a proposal, with version, type, content, file URLs, approval status)
- `distribution_checklists` (one per approved event, with line items and completion status)
- `partners` (the coordinator/partner CRM)
- `vouchers` (codes, partner attribution, status: issued / distributed / redeemed)
- `bookings` (manually-logged bookings against events, with attribution)
- `learnings` (post-event records and the synthesised insights database)
- `audit_log` (all actions)
- `prompts_log` (all AI calls — prompt, response, model, tokens, cost, latency)

### 4.4 Prompt architecture

The system uses a small library of master prompts, each parameterised. The developer iterates on these — start simple and refine as proposals are reviewed. Indicative master prompts:

- **Event invention prompt** — produces a proposal from a brief (date range, audience, occupancy context, learnings) injected with full property knowledge
- **Package proposal prompt** — produces an accommodation package, similarly grounded
- **Asset generation prompt (one per asset type)** — produces a specific asset from an approved proposal, applying brand voice
- **On-demand chat prompt** — interprets a free-text request from the manager/marketing team and routes to the right generation pipeline
- **Partner research prompt** — produces a researched partner record from a business name + location, using web search
- **Post-event synthesis prompt** — ingests outcomes and writes the post-mortem; periodically synthesises across multiple post-mortems to update the meta-learnings

All prompts must include a "respect property knowledge" instruction and reject responses that violate constraints (e.g. proposing a 200-person event in a 80-cap room).

### 4.5 Guardrails

Hard rules the system cannot break:

- Never propose room counts that exceed the inventory of that room type
- Never propose function-space capacities that exceed the configured max
- Never schedule midweek events on dates flagged as operational blackouts
- Never schedule events that clash with regular weekly/monthly programming in the same space
- Never generate copy depicting AI-generated humans or AI-generated photos of the hotel
- Never include in any marketing material: promises of specific weather, claims about other hotels, anything that misrepresents accessibility, pricing that contradicts the operational_constants table
- Never auto-send anything to anyone outside the system's user base
- Never modify the property knowledge base without manager-level user permission
- Never deactivate the audit log

Soft rules surfaced as warnings, not blocks:

- Proposed events should respect retiree-segment preferences (mobility, daytime programming preference, twin-share configurations available)
- Proposed pricing should fall within standard rate ranges unless explicitly justified
- New partners proposed for the CRM should be from target postcodes

---

## 5. The admin UI — screen-by-screen

The developer designs the actual interface; this defines required functionality.

### 5.1 Dashboard (landing screen post-login)

- Top: KPI tiles — midweek occupancy trend (manual data entry, or just placeholder until v2), bookings this week vs target, pipeline (events in each stage), partner CRM size
- Pipeline kanban: columns for Pending Approval / Approved / Live / Past Events, cards showing each event with date, target attendees, current pre-sales
- Today's queue: items needing human attention (proposals waiting, assets pending review, distribution steps overdue, viability flags)
- Recent learnings: 3 most recent post-event syntheses, scrollable

### 5.2 Proposals view

List of all proposals, filterable by status. Clicking a proposal opens the full detail: concept, P&L, rooms allocated, function space, third-party shortlist, voucher plan, target audiences. Buttons: Approve, Reject (with reason field), Revise (with comment field). Once approved, transitions to the asset workspace.

### 5.3 Event workspace (one per approved event)

Tabs:
- Overview: the original proposal, the approval log, the feasibility confirmation, key dates
- Assets: all generated assets, each with view/download/regenerate/approve buttons, version history
- Distribution checklist: the interactive checklist, with assignees and timestamps
- Bookings: live list of bookings logged against this event, attribution breakdown, pre-sales vs target
- Viability: live status, pre-sales trajectory, alert if behind threshold, recommended actions
- Post-event: the outcome form (greyed out until event date passes), then the AI-synthesised post-mortem

### 5.4 On-demand chat

A chat interface, similar to ChatGPT. The manager or marketing team types a request; the system interprets and routes to the right pipeline. Long-running generations spawn background jobs and show progress. Generated proposals appear inline and can be promoted to the proposals view.

### 5.5 Partner CRM

Table view of all partners, filterable by region, type, status, performance. Each row clickable to a full record view with research, contact log, voucher history, attributed bookings, attributed revenue, satisfaction rating. Buttons: Add Partner (manual), Suggest Partners (AI proposes 5–10 new partners for the manager to review), Mark Contacted (manual log of a human-conducted outreach), Schedule Follow-up.

### 5.6 Property knowledge base

The seven tables (room_types, function_spaces, fb_venues, regular_programming, local_context, brand_voice, operational_constants) each get an edit view. Manager-only write access; marketing team has read-only.

### 5.7 Learnings

A view of the cumulative learnings database. Searchable, filterable by event type, audience, season. Shows synthesised insights ("Watercolour workshops priced at $299 per person to twin-share Water View rooms have averaged 87% pre-sale conversion when distributed via Western Sydney Probus clubs").

### 5.8 Audit log

Filterable log of every action taken in the system. Read-only for everyone.

### 5.9 Settings

User management (manager-only), kill switch, scheduled job times, viability check thresholds, OpenAI API key management, cost tracking dashboard (cumulative AI spend).

---

## 6. Onboarding flow

A guided one-time setup completed by the manager (with optional help from the developer during install), taking roughly 2–3 hours total. The flow:

1. Create the manager account and any marketing team accounts.
2. Confirm/edit `property_profile`.
3. Enter room counts and standard midweek rate ranges per room type. The system blocks proceeding until the sum of `count` equals `total_rooms` (83) — this is the data integrity check that ensures every package proposal respects real inventory.
4. Enter mobility-friendly room flags per room type.
5. Enter function space capacities (cocktail, banquet, theatre) for each space, from the existing iVvy event packs.
6. Enter F&B cost-per-head benchmarks (breakfast, lunch, two-course dinner, three-course dinner, canapés, beverage packages).
7. Confirm regular programming (poker tournament day, pool comp day, etc.) and any operational blackout dates.
8. Upload brand assets: logo files, brand colours, font files or names, photo library (20+ photos of the hotel, rooms, lake, grounds, food, function spaces). Photos are categorised by type for the system to pick appropriate images per asset.
9. Upload existing marketing materials (the system uses these to draft the brand voice guide).
10. Review and edit the AI-drafted brand voice guide.
11. Seed the partner CRM with 30–50 known contacts (manual entry or CSV upload).
12. Confirm any existing third-party talent contacts (musicians, instructors, artists) for the talent database.
13. Confirm cron timing and viability check thresholds.
14. Confirm OpenAI API key and budget caps.

After onboarding, the system is self-sufficient. The manager and marketing team can edit knowledge base entries at any time.

---

## 7. Architectural seams for v2 integrations

v1 is deliberately integration-free, but the architecture must leave clean seams so that v2 integrations can be added without rewriting core logic. The integrations expected in v2:

- **RMS Cloud** — for real-time room availability (replaces the manual feasibility step) and for ingesting actual bookings (replaces the manual booking log)
- **iVvy** — for function space availability and event booking sync
- **Sevenrooms** — for restaurant booking sync, particularly for events with included dining
- **Outlook 365 / Microsoft Graph** — for sending marketing emails directly (replaces the download-and-paste step)
- **Meta Ads API + Google Ads API** — for launching ad campaigns directly (replaces the download-and-build step)
- **An SMS gateway** — Twilio or MessageMedia for direct SMS sending
- **A print-on-demand API** — Sendle/Snail Mail or a local printer's API for direct print-and-post fulfilment of letters and vouchers

To enable this, all distribution-related code in v1 should be structured as adapter interfaces (e.g. `EmailDistributionAdapter`) with v1's implementation being the "generate file for human download" version. v2 implementations swap in the API-calling versions without touching the rest of the system.

The booking log in v1 has a manual-entry endpoint; the same endpoint structure can be triggered by a v2 RMS webhook without changing the data model.

---

## 8. Compliance and brand safety

Even though v1 doesn't send anything directly, the materials it generates must be compliant for the human to send. The system follows:

- **Australian Spam Act 2003** — generated marketing emails and SMS include unsubscribe instructions and identify the sender. The system never generates content for cold consumer outreach; it only generates content for past guests (existing business relationship), coordinators in their professional capacity, or via paid ads (different regulatory regime).
- **Privacy Act 1988** — partner CRM data is stored securely; partner records contain only public-business information unless the manager has added private notes. Past-guest data, if uploaded for segmentation, is handled per the existing privacy policy of The Beachie.
- **Do Not Call Register** — irrelevant for v1 (no calls made by the system); for v2 voice expansion, hard rules will apply.
- **Choice Hotels / Ascend Collection brand standards** — generated copy must not conflict with brand guidelines from the parent collection. The developer should confirm during onboarding whether any specific brand-standard documents need to be loaded into the brand voice context.
- **Responsible Service of Alcohol** — generated copy involving drinks must include standard responsible-service language where required.
- **Accessibility claims** — never overstate. Only the room flagged as wheelchair-accessible should be described as such; "mobility-friendly" rooms are described honestly (ground floor, walk-in shower) without overclaiming.

---

## 9. Costs and operational notes

OpenAI API costs are the main operational expense. Indicative budget:

- Weekly scheduled run: ~1–2 dollars worth of GPT-5 calls per proposal generated; an asset pack generation is heavier — perhaps 5–10 dollars worth of calls per event, depending on regenerations
- On-demand chat: variable, modest
- Partner research: cheap per record
- Post-event synthesis: cheap

A monthly budget of $200–500 USD is a reasonable starting envelope for a property running 2–4 campaigns a month. The system tracks cumulative spend in the settings dashboard and supports a hard monthly cap.

Image generation is metered separately and used sparingly (decorative elements only).

---

## 10. Build plan — phased delivery

The full system in 8–10 weeks of focused work. Suggested phasing:

**Week 1 — Foundations.** Repo, deployment, auth, database schema, basic admin shell, property knowledge base CRUD, onboarding flow. Goal: a logged-in user can complete onboarding and the property knowledge is editable.

**Week 2 — Proposals engine.** The event invention prompt and the package proposal prompt, wired to OpenAI, producing proposals that respect property knowledge. The proposals view, the approve/reject/revise flow, the feasibility prep form. Goal: a manager can trigger an on-demand "propose 3 events for March" and get sensible output, approve one, confirm feasibility.

**Week 3 — Asset generation (text-based).** The asset generation prompts for emails, SMS, ad copy, phone scripts, coordinator emails. The asset workspace UI, the per-asset regenerate flow. Goal: an approved event has a full set of text-based marketing assets ready for download.

**Week 4 — Asset generation (visual + PDF).** Landing page HTML, flyer PDF, voucher PDF, posted letter PDF, image generation for decorative elements, photo library integration. Goal: full asset pack downloadable for any approved event.

**Week 5 — Distribution and tracking.** The distribution checklist UI, the booking log, the pre-sale tracking, the viability check, the kill switch, the audit log. Goal: a complete event can flow from invention through approval through asset generation through human-executed distribution through booking tracking.

**Week 6 — Partner CRM.** Partner records, CRM table view, partner research via web search, voucher code generation, voucher attribution, partner ROI tracking. Goal: a coordinator/partner CRM with 30+ records (from manual seed plus AI suggestions), vouchers integrated into the event pipeline.

**Week 7 — Learning loop.** Post-event outcome forms, post-event synthesis prompts, the learnings view, integration of learnings into future invention prompts. Goal: completed events update the learning database and visibly inform new proposals.

**Week 8 — Scheduled mode and on-demand chat.** Cron jobs for Monday generation, daily 8am digest, viability monitoring. The on-demand chat interface in the admin UI. Goal: the system runs itself end-to-end on a weekly cadence and responds to natural-language requests.

**Weeks 9–10 — Polish, edge cases, training.** UI refinement, error handling, edge cases (e.g. what happens when a proposal references a third-party talent who's unavailable), the manager/marketing team training session, full end-to-end test with a real event run through the system.

The developer can compress this if experienced, or extend to 12–14 weeks if working part-time. Realistic target for the first revenue-generating event run through the system: end of week 6.

---

## 11. Success criteria

The system is considered successful in v1 if, by end of month 3 post-launch:

- At least 6 events have been generated, approved, and executed through the system
- Marketing assets are being used in real campaigns without manual rewriting of more than 25% of the generated content
- The partner CRM has grown to 100+ records, with at least 20 actively engaged
- Vouchers have been distributed through at least 10 partner businesses, with measurable redemptions logged
- Manager and marketing team report that the system saves them at least 60% of the time they previously spent producing campaign materials
- At least one measurable midweek occupancy lift has been attributed to a system-generated campaign

If these are hit, v2 integrations are worth investing in. If they're not, the gap is in the prompting and the system design — fix v1 before adding integrations.

---

## 12. Open questions to resolve with the manager before/during build

These don't block the build, but should be answered during week 1:

- Exact room count per type (sums to 83)
- Function space capacities (cocktail, banquet, theatre) per space
- Standard midweek rate ranges per room type
- F&B cost-per-head benchmarks
- Mobility-friendly room mapping
- Existing third-party talent contacts to seed the talent database
- Initial 30–50 partner CRM seed records
- Choice Hotels / Ascend Collection brand standards documents (if any)
- The manager's preferred cron time and viability check thresholds
- Monthly OpenAI budget cap

---

## End of brief
