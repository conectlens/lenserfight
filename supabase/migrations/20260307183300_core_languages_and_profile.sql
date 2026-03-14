-- Migration: V1 & V2 - Core Languages & Profiles
-- Description: Creates the `core` schema, `core.languages` table, seeds default locales, and enforces `preferred_language_id` on `lensers.profiles`.

-- 1. Create Core Schema
CREATE SCHEMA IF NOT EXISTS "core";
ALTER SCHEMA "core" OWNER TO "postgres";

-- Grant standard usage to Supabase API roles
GRANT USAGE ON SCHEMA "core" TO anon, authenticated, service_role;

-- 2. Create Languages Table
CREATE TABLE IF NOT EXISTS "core"."languages" (
    "id" uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    "code" text NOT NULL UNIQUE CHECK (code ~ '^[a-z]{2}(-[A-Z]{2})?$'),
    "name" text NOT NULL,
    "native_name" text NOT NULL,
    "is_default" boolean DEFAULT false,
    "is_active" boolean DEFAULT true,
    "direction" text DEFAULT 'ltr' CHECK (direction IN ('ltr', 'rtl')),
    "created_at" timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE "core"."languages" OWNER TO "postgres";

GRANT ALL ON TABLE "core"."languages" TO anon, authenticated, service_role;

-- 3. Seed default languages
INSERT INTO "core"."languages" (code, name, native_name, is_default)
VALUES 
  ('en', 'English', 'English', true),
  ('tr', 'Turkish', 'Türkçe', false),
  ('de', 'German', 'Deutsch', false),
  ('es', 'Spanish', 'Español', false),
  ('fr', 'French', 'Français', false)
ON CONFLICT (code) DO NOTHING;

-- 4. Enforce Language on Profiles
ALTER TABLE "lensers"."profiles" 
  ADD COLUMN "preferred_language_id" uuid;

-- 5. Data Backfill Strategy: match existing free-text 'preferred_language' to the new 'core.languages' table
-- We use DO BLOCK to safely execute this even if 'preferred_language' column is already dropped in future reruns
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'lensers' AND table_name = 'profiles' AND column_name = 'preferred_language') THEN
    UPDATE "lensers"."profiles" p
    SET preferred_language_id = l.id
    FROM "core"."languages" l
    WHERE p.preferred_language = l.code;
  END IF;
END $$;

-- Fallback for unmatched languages or nulls
UPDATE "lensers"."profiles"
SET preferred_language_id = (SELECT id FROM "core"."languages" WHERE is_default = true LIMIT 1)
WHERE preferred_language_id IS NULL;

-- 6. Add constraints and drop old columns
ALTER TABLE "lensers"."profiles" 
  ALTER COLUMN "preferred_language_id" SET NOT NULL,
  ADD CONSTRAINT "profiles_lang_fk" 
  FOREIGN KEY ("preferred_language_id") REFERENCES "core"."languages"("id");

-- Note: We drop the old text columns IF they exist to remain idempotent
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'lensers' AND table_name = 'profiles' AND column_name = 'preferred_language') THEN
    ALTER TABLE "lensers"."profiles" DROP COLUMN "preferred_language";
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'lensers' AND table_name = 'profiles' AND column_name = 'ui_language') THEN
    ALTER TABLE "lensers"."profiles" DROP COLUMN "ui_language";
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'lensers' AND table_name = 'profiles' AND column_name = 'detected_language') THEN
    ALTER TABLE "lensers"."profiles" DROP COLUMN "detected_language";
  END IF;
END $$;
