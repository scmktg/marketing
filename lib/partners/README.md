# lib/partners

Partner CRM logic + voucher batch generation/attribution.
Lands in `feat/partner-crm` and `feat/voucher-batches`.

- `crm.ts` — partner CRUD, contact log, satisfaction tracking
- `vouchers.ts` — voucher batch generation, code uniqueness,
  redemption counters
- `roi.ts` — partner ROI rollup (bookings + revenue attributed)
