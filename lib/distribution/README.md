# lib/distribution

v2 integration seam. Each adapter has a v1 file-producing impl and a
v2 API-calling impl behind the same interface.

Lands in `feat/distribution-checklist`:
- `email.ts` — `EmailDistributionAdapter` (v1: writes HTML+CSV;
  v2: Microsoft Graph)
- `sms.ts` — `SmsAdapter` (v1: writes text file; v2: Twilio/MessageMedia)
- `ads.ts` — `AdAdapter` (v1: writes spec doc; v2: Meta + Google Ads APIs)
- `print.ts` — `PrintAdapter` (v1: writes PDF; v2: print-on-demand API)
- `availability.ts` — `AvailabilityAdapter` (v1: manual feasibility form;
  v2: RMS Cloud)
- `booking-ingest.ts` — `BookingIngestAdapter` (v1: manual form;
  v2: RMS webhook to same endpoint)
