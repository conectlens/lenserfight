-- Migration: Enforce preferred language on profiles
-- Goal: every profile must have a preferred language, defaulting to English (en), with no NULL values.

-- 1) Ensure English exists and is marked as the default language.
INSERT INTO core.languages (code, name, native_name, is_default, is_active)
VALUES ('en', 'English', 'English', true, true)
ON CONFLICT (code) DO UPDATE
SET is_default = true,
    is_active = true;

-- Make English the single default to avoid ambiguity.
UPDATE core.languages
SET is_default = (code = 'en');

-- 2) Provide a stable default-language resolver for column defaults.
CREATE OR REPLACE FUNCTION lensers.default_preferred_language_id()
RETURNS uuid
LANGUAGE sql
STABLE
AS $$
  SELECT COALESCE(
    (SELECT id FROM core.languages WHERE code = 'en' LIMIT 1),
    (SELECT id FROM core.languages WHERE is_default = true LIMIT 1)
  );
$$;

-- 3) Ensure preferred_language_id exists.
ALTER TABLE lensers.profiles
ADD COLUMN IF NOT EXISTS preferred_language_id uuid;

-- 4) Set DB-level default and backfill existing NULLs.
ALTER TABLE lensers.profiles
ALTER COLUMN preferred_language_id SET DEFAULT lensers.default_preferred_language_id();

UPDATE lensers.profiles
SET preferred_language_id = lensers.default_preferred_language_id()
WHERE preferred_language_id IS NULL;

-- 5) Enforce FK and NOT NULL.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'profiles_lang_fk'
      AND conrelid = 'lensers.profiles'::regclass
  ) THEN
    ALTER TABLE lensers.profiles
      ADD CONSTRAINT profiles_lang_fk
      FOREIGN KEY (preferred_language_id)
      REFERENCES core.languages(id)
      ON DELETE RESTRICT;
  END IF;
END $$;

ALTER TABLE lensers.profiles
ALTER COLUMN preferred_language_id SET NOT NULL;
