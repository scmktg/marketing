# The Beachie Midweek Engine

AI-powered midweek events and accommodation packages system for The Beachcomber Hotel & Resort, Toukley NSW.

**Status:** Scaffold landed. Knowledge CRUD UI, onboarding wizard, prompt runtime, asset generation, and CRM all to follow.

## Documents

- [`docs/SPEC.md`](./docs/SPEC.md) — master project brief (v1, brain-only).
- [`docs/PLAN.md`](./docs/PLAN.md) — implementation plan: stack, schema, prompt architecture, repo layout, week-by-week PR plan.

## Stack

Next.js 15 App Router · TypeScript · Tailwind · shadcn-style components · Supabase (Postgres + Auth + Storage) · Drizzle ORM · Inngest (jobs/cron, lands later) · OpenAI Responses API + `gpt-image-1` (lands later) · Puppeteer for PDFs (lands later) · Resend for internal alerts only.

## Local development

### Prerequisites

- Node 20.10+ · pnpm 9
- Access to the shared Supabase dev project (ask the manager for credentials)
- An OpenAI **dev** API key with a hard daily budget cap set on the OpenAI dashboard (manager's manual step — recommended $20/day for v1)

### One-time setup

```bash
git clone <repo>
cd marketing
pnpm install
cp .env.example .env.local
# Fill in the Supabase URL, anon key, service role key, DATABASE_URL,
# OPENAI_API_KEY. See .env.example for inline guidance.
```

### Database setup (against shared Supabase dev)

```bash
pnpm db:push       # Apply schema to the shared dev DB
pnpm seed:property # Seed placeholder property knowledge (idempotent)
```

Re-running `seed:property` is safe — every insert uses `ON CONFLICT DO NOTHING`. Manager edits in the admin UI flip `is_placeholder` to `false` and re-seeding will not overwrite them.

### Run the app

```bash
pnpm dev
# http://localhost:3000 — redirects to /dashboard → /login (no users yet)
```

To create your first user, sign up via the Supabase dashboard (Auth → Users → Add user, email + password). The DB trigger inserts a matching row in `public.users` with role `marketing`. To promote yourself to manager:

```sql
UPDATE public.users SET role = 'manager' WHERE email = 'you@example.com';
```

### Tests

```bash
pnpm test          # Vitest unit tests
pnpm test:e2e      # Playwright (requires dev server running)
pnpm typecheck     # tsc --noEmit
pnpm lint          # ESLint, including the require-audit-log rule
```

## Environment variables

See [`.env.example`](./.env.example) for the full list and inline guidance. Notable:

- **`OPENAI_MODE`** — `production` uses the top-tier reasoning model; `cheap` downgrades to the cheapest currently-available model for dev iteration. Production deployments must set `production`. Real API calls in both modes — no mocking. The model resolver lives in `lib/ai/model.ts` (lands in `feat/prompt-runtime`).
- **`DATABASE_URL`** — server-only. Used by Drizzle migrations and the runtime DB client. Lazy-loaded so `next build` does not require it.

## v2 dev environment notes

v1 uses a **shared Supabase dev project** for simplicity. When the team grows past 2–3 active developers, migrate to **local Supabase CLI** (`supabase start`) per `docs/PLAN.md` §12.1 so each developer can iterate against an isolated DB.

## Production-mode safety

Every generated marketing asset is watermarked **TEST — built from placeholder data** until `system_settings.production_mode = true`. Flipping that flag requires:

- All three onboarding hard gates green (room inventory, brand voice reviewed, ≥40 photos uploaded — `docs/PLAN.md` §10).
- `is_placeholder = false` for every row in the property knowledge tables.
- A manager-role user performing the flip from the Settings page.

The flag is logged to `audit_log` on every change. See `docs/PLAN.md` §3.1.

## CI

- **`.github/workflows/ci.yml`** — typecheck + lint + unit tests + build, on every code PR (non-`*.md` paths).
- **`.github/workflows/docs.yml`** — markdownlint + lychee link check, on every docs PR.

Mixed PRs run both.
