# lib/pdf

Puppeteer wrappers per asset type. Lands in `feat/asset-pdf`.

- `landing-page.ts` — HTML → standalone HTML file (no PDF, but uses
  the same template engine)
- `flyer.ts` — A5 PDF with bleed + crop marks
- `letter.ts` — A4 PDF, personalised at salutation
- `voucher.ts` — voucher PDF with unique batch code

Dev: uses system Chrome via `puppeteer`. Prod: `@sparticuz/chromium`
on Vercel Node runtime. See PLAN.md §1.3 risks.
