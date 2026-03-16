-- Migration: Lenser onboarding step tracking
-- Adds onboarding_step and onboarding_completed_at to lensers.profiles
-- so we can track completion rates and abandoned sessions per industry standard.

ALTER TABLE lensers.profiles
  ADD COLUMN IF NOT EXISTS onboarding_step smallint NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS onboarding_completed_at timestamptz;

COMMENT ON COLUMN lensers.profiles.onboarding_step IS
  '0=not started, 1=handle/profile created, 2=preferences set (complete)';
COMMENT ON COLUMN lensers.profiles.onboarding_completed_at IS
  'Timestamp when all onboarding steps were finished; NULL means incomplete.';

-- Backfill: profiles that existed before this tracking was added are already fully onboarded.
UPDATE lensers.profiles
SET
  onboarding_step = 2,
  onboarding_completed_at = created_at
WHERE onboarding_step = 0;

-- Partial index for analytics queries (abandoned vs completed counts, cohort analysis).
CREATE INDEX IF NOT EXISTS idx_lensers_profiles_onboarding_completed
  ON lensers.profiles (onboarding_completed_at)
  WHERE onboarding_completed_at IS NOT NULL;

-- Allow the app to read language options for the preferences step.
GRANT SELECT ON core.languages TO authenticated;
GRANT SELECT ON core.languages TO anon;
