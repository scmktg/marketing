# Stevens Marketing

An independent marketing practice and open knowledge website. Built with Next.js App Router, React, TypeScript, and Tailwind CSS.

The public site is organised around personal principles, independently authored research guides and templates, a studies portfolio, and a direct option to engage the practitioner. It does not imply an agency team or publish invented case-study results.

## Add research, templates and principles

Edit `src/lib/knowledge.ts`. Each entry has a unique slug, type (`Guide`, `Template`, or `Principle`), title, description, reading time and content sections. The resource index and detail routes use this data automatically, and resource URLs are included in the sitemap.

Studies are intentionally unpublished until there are real, verifiable projects to describe. Edit `src/app/studies/page.tsx` when ready to add research, results and appropriate permissions. Clearly distinguish independent studies, experiments and actual client results.

## Local setup

1. Install Node.js 20+.
2. Run `npm install`.
3. Copy `.env.example` to `.env.local` and configure your values.
4. Run `npm run dev`.

## Environment variables

- `NEXT_PUBLIC_SITE_URL`: production site origin (canonicals and sitemap).
- `CONTACT_EMAIL`: real business contact email.
- `RESEND_API_KEY`: secret API key (server-only).
- `ENQUIRY_TO_EMAIL`: inbox receiving enquiries.
- `ENQUIRY_FROM_EMAIL`: sender on a domain verified by Resend.

Without configured email delivery the enquiry endpoint returns an error instead of a false success.

## Deployment

Import `scmktg/marketing` into Vercel and set environment variables in the project settings. Test a real enquiry after configuring the Resend sending domain. Check privacy wording, contact information and production domain before launch.

## Quality checks

Run `npm run lint`, `npm run typecheck`, and `npm run build`. Those checks have not been executed through the GitHub connector; treat build verification as outstanding.

The enquiry API uses in-memory best-effort rate limiting. For higher traffic levels, add a persistent shared rate-limiting mechanism.

This phase includes no dashboards, client accounts, authentication or commission backend.
