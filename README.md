# Stevens Marketing

Minimal, performance-focused public marketing website. Built with Next.js App Router, TypeScript and Tailwind CSS.

## Development

```bash
npm install
npm run dev
```

## Environment

Copy `.env.example` to `.env.local` and configure the values. Enquiries are delivered through Resend, using a server-side API endpoint. Without valid delivery configuration, the endpoint returns an error rather than a false success.

## Deployment

Import this repository to Vercel. Set environment variables in Vercel Project Settings before going live. `NEXT_PUBLIC_SITE_URL` should be the production origin (https://...). `RESEND_API_KEY` must be a server-only secret; `ENQUIRY_TO_EMAIL` and `ENQUIRY_FROM_EMAIL` must be configured with a verified Resend sending domain. Set `CONTACT_EMAIL` to your real business contact email.

## Quality checks

```bash
npm run typecheck
npm run lint
npm run build
```

## Important launch checks

Verify the business contact email, approved privacy wording, domain, working Resend sender and recipient, and perform a real enquiry delivery test before advertising the site. A short-lived in-memory rate limit is best-effort on serverless hosting; use infrastructure-level persistent limits for larger traffic volumes.

Only the public marketing site is included in this release. No accounts, dashboards or client reporting are implemented.
