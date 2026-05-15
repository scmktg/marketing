-- Adds the onboarding_completed_steps array column to system_settings.
-- Tracks manually-acknowledged wizard steps (PLAN.md §10).
-- Numbered 9997 so it runs alongside the Drizzle-generated init migration.

ALTER TABLE system_settings
  ADD COLUMN IF NOT EXISTS onboarding_completed_steps text[]
  NOT NULL DEFAULT ARRAY[]::text[];
