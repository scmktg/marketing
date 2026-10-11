# Stevens Marketing

Minimal, performance-based marketing website built using Next.js App Router, React, TypeScript and Tailwind CSS.

## Setup

1. Install Node.js 20 or newer.
2. Run `npm install`.
3. Copy `.env.example` to `.env.local` and configure the values.
4. Run `npm run dev`.

## Environment variables

- `NEXT_PUBLIC_SITE_URL`: production website origin (for canonical links and sitemap).
- `CONTACT_EMAIL`: business email shown on Contact and Privacy pages.
- `RESEND_API_KEY`: server-only Resend API key.
- `ENQUIRY_TO_EMAIL`: recipient for enquiry notifications.
- `ENQUIRY_FROM_EMAIL`: sending address on a domain verified in Resend.

If Resend settings are missing, the enquiry endpoint deliberately fails with HTTP 503; it does not silently discard the enquiry.

## Deployment

Import `scmktg/marketing` into Vercel, configure the same environment variables under project settings, and deploy. Test an actual form submission end-to-end after verifying the Resend sending domain.

## Quality checks

Run `npm run lint`, `npm run typecheck`, and `npm run build`. These commands are documented but have not yet been executed in this connector-only implementation.

## Launch checklist

Confirm the contact address, canonical domain, legal identity and privacy terms; test mobile layouts, keyboard navigation, and email success/failure paths. Server-side rate limiting uses best-effort memory storage; for significant production traffic, migrate to a shared rate-limiting store.

The current scope is limited to public marketing pages and enquiries. No client dashboard, account management, commissions backend or authentication has been built.
