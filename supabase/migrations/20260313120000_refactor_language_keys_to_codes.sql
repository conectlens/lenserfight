-- Migration: Refactor language references to use core.languages.code
-- Goal: eliminate UUID language dependencies, store language codes directly,
-- and stop relying on the unexposed core schema from the frontend.

-- 1) Ensure English exists and remains the default language.
INSERT INTO core.languages (code, name, native_name, is_default, is_active)
VALUES ('en', 'English', 'English', true, true)
ON CONFLICT (code) DO UPDATE
SET is_default = true,
    is_active = true;

UPDATE core.languages
SET is_default = (code = 'en');

-- 2) Rework lensers.profiles to store the preferred language code directly.
ALTER TABLE lensers.profiles
ADD COLUMN IF NOT EXISTS preferred_language text;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'lensers'
      AND table_name = 'profiles'
      AND column_name = 'preferred_language_id'
  ) THEN
    UPDATE lensers.profiles p
    SET preferred_language = l.code
    FROM core.languages l
    WHERE p.preferred_language IS NULL
      AND p.preferred_language_id IS NOT NULL
      AND l.id = p.preferred_language_id;
  END IF;
END $$;

UPDATE lensers.profiles
SET preferred_language = 'en'
WHERE preferred_language IS NULL
   OR NOT EXISTS (
     SELECT 1
     FROM core.languages l
     WHERE l.code = lensers.profiles.preferred_language
   );

ALTER TABLE lensers.profiles
ALTER COLUMN preferred_language SET DEFAULT 'en',
ALTER COLUMN preferred_language SET NOT NULL;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'profiles_lang_fk'
      AND conrelid = 'lensers.profiles'::regclass
  ) THEN
    ALTER TABLE lensers.profiles DROP CONSTRAINT profiles_lang_fk;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'profiles_preferred_language_fk'
      AND conrelid = 'lensers.profiles'::regclass
  ) THEN
    ALTER TABLE lensers.profiles
      ADD CONSTRAINT profiles_preferred_language_fk
      FOREIGN KEY (preferred_language)
      REFERENCES core.languages(code)
      ON DELETE RESTRICT;
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'lensers'
      AND table_name = 'profiles'
      AND column_name = 'preferred_language_id'
  ) THEN
    ALTER TABLE lensers.profiles
    ALTER COLUMN preferred_language_id DROP DEFAULT;
  END IF;
END $$;

ALTER TABLE lensers.profiles
DROP COLUMN IF EXISTS preferred_language_id;

DROP FUNCTION IF EXISTS lensers.default_preferred_language_id();

-- 3) Convert translation tables from language_id UUID references to language_code text references.
DROP VIEW IF EXISTS content.vw_auth_prompts;
DROP VIEW IF EXISTS content.vw_auth_threads;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'content'
      AND table_name = 'tag_translations'
      AND column_name = 'language_id'
  ) THEN
    ALTER TABLE content.tag_translations RENAME COLUMN language_id TO language_code;
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'content'
      AND table_name = 'prompt_translations'
      AND column_name = 'language_id'
  ) THEN
    ALTER TABLE content.prompt_translations RENAME COLUMN language_id TO language_code;
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'content'
      AND table_name = 'thread_translations'
      AND column_name = 'language_id'
  ) THEN
    ALTER TABLE content.thread_translations RENAME COLUMN language_id TO language_code;
  END IF;
END $$;

DO $$
DECLARE
  fk record;
BEGIN
  FOR fk IN
    SELECT conrelid::regclass AS table_name, conname
    FROM pg_constraint
    WHERE contype = 'f'
      AND confrelid = 'core.languages'::regclass
      AND conrelid IN (
        'content.tag_translations'::regclass,
        'content.prompt_translations'::regclass,
        'content.thread_translations'::regclass
      )
  LOOP
    EXECUTE format('ALTER TABLE %s DROP CONSTRAINT %I', fk.table_name, fk.conname);
  END LOOP;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'content'
      AND table_name = 'tag_translations'
      AND column_name = 'language_code'
      AND data_type <> 'text'
  ) THEN
    ALTER TABLE content.tag_translations
      ALTER COLUMN language_code TYPE text
      USING language_code::text;
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'content'
      AND table_name = 'prompt_translations'
      AND column_name = 'language_code'
      AND data_type <> 'text'
  ) THEN
    ALTER TABLE content.prompt_translations
      ALTER COLUMN language_code TYPE text
      USING language_code::text;
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'content'
      AND table_name = 'thread_translations'
      AND column_name = 'language_code'
      AND data_type <> 'text'
  ) THEN
    ALTER TABLE content.thread_translations
      ALTER COLUMN language_code TYPE text
      USING language_code::text;
  END IF;
END $$;

UPDATE content.tag_translations t
SET language_code = l.code
FROM core.languages l
WHERE t.language_code = l.id::text;

UPDATE content.prompt_translations t
SET language_code = l.code
FROM core.languages l
WHERE t.language_code = l.id::text;

UPDATE content.thread_translations t
SET language_code = l.code
FROM core.languages l
WHERE t.language_code = l.id::text;

UPDATE content.tag_translations t
SET language_code = 'en'
WHERE language_code IS NULL
   OR NOT EXISTS (
     SELECT 1
     FROM core.languages l
     WHERE l.code = t.language_code
   );

UPDATE content.prompt_translations t
SET language_code = 'en'
WHERE language_code IS NULL
   OR NOT EXISTS (
     SELECT 1
     FROM core.languages l
     WHERE l.code = t.language_code
   );

UPDATE content.thread_translations t
SET language_code = 'en'
WHERE language_code IS NULL
   OR NOT EXISTS (
     SELECT 1
     FROM core.languages l
     WHERE l.code = t.language_code
   );

ALTER TABLE content.tag_translations
ALTER COLUMN language_code SET NOT NULL;

ALTER TABLE content.prompt_translations
ALTER COLUMN language_code SET NOT NULL;

ALTER TABLE content.thread_translations
ALTER COLUMN language_code SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'tag_translations_language_code_fk'
      AND conrelid = 'content.tag_translations'::regclass
  ) THEN
    ALTER TABLE content.tag_translations
      ADD CONSTRAINT tag_translations_language_code_fk
      FOREIGN KEY (language_code)
      REFERENCES core.languages(code)
      ON DELETE RESTRICT;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'prompt_translations_language_code_fk'
      AND conrelid = 'content.prompt_translations'::regclass
  ) THEN
    ALTER TABLE content.prompt_translations
      ADD CONSTRAINT prompt_translations_language_code_fk
      FOREIGN KEY (language_code)
      REFERENCES core.languages(code)
      ON DELETE RESTRICT;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'thread_translations_language_code_fk'
      AND conrelid = 'content.thread_translations'::regclass
  ) THEN
    ALTER TABLE content.thread_translations
      ADD CONSTRAINT thread_translations_language_code_fk
      FOREIGN KEY (language_code)
      REFERENCES core.languages(code)
      ON DELETE RESTRICT;
  END IF;
END $$;

-- 4) Rewrite trigger/function/view definitions that still expose UUID language fields.
CREATE OR REPLACE FUNCTION lensers.sync_profile_from_auth_metadata()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  auth_metadata jsonb;
  v_lang_code text;
BEGIN
  SELECT raw_user_meta_data
  INTO auth_metadata
  FROM auth.users
  WHERE id = NEW.user_id;

  IF auth_metadata IS NOT NULL THEN
    v_lang_code := auth_metadata->>'preferred_language';

    IF NEW.preferred_language IS NULL
       AND v_lang_code IS NOT NULL
       AND EXISTS (SELECT 1 FROM core.languages WHERE code = v_lang_code)
    THEN
      NEW.preferred_language := v_lang_code;
    END IF;

    IF NEW.country IS NULL THEN
      NEW.country := auth_metadata->>'country';
    END IF;

    IF NEW.timezone IS NULL THEN
      NEW.timezone := auth_metadata->>'timezone';
    END IF;
  END IF;

  IF NEW.preferred_language IS NULL
     OR NOT EXISTS (SELECT 1 FROM core.languages WHERE code = NEW.preferred_language)
  THEN
    NEW.preferred_language := 'en';
  END IF;

  RETURN NEW;
END;
$$;

DROP VIEW IF EXISTS content.vw_auth_prompts;
CREATE VIEW content.vw_auth_prompts AS
SELECT
  p.id,
  p.lenser_id,
  p.visibility,
  p.created_at,
  p.updated_at,
  pt.title,
  pt.description,
  pt.content,
  pt.language_code,
  COALESCE(
    (
      SELECT jsonb_object_agg(reaction, cnt)
      FROM (
        SELECT reaction, count(*)::int AS cnt
        FROM content.prompt_reactions pr
        WHERE pr.prompt_id = p.id
        GROUP BY reaction
      ) AS agg
    ),
    '{}'::jsonb
  ) AS reaction_totals,
  jsonb_build_object(
    'handle', prof.handle,
    'display_name', prof.display_name,
    'avatar_url', prof.avatar_url
  ) AS author_profile
FROM content.prompt_templates p
LEFT JOIN lensers.profiles prof ON p.lenser_id = prof.id
LEFT JOIN content.prompt_translations pt ON p.id = pt.prompt_id AND pt.is_original = true;

GRANT SELECT ON content.vw_auth_prompts TO anon, authenticated, service_role;

DROP VIEW IF EXISTS content.vw_auth_threads;
CREATE VIEW content.vw_auth_threads AS
SELECT
  t.id,
  t.lenser_id,
  t.visibility,
  t.view_count,
  t.reply_count,
  t.thumbnail_url,
  t.created_at,
  t.updated_at,
  tt.title,
  tt.content,
  tt.language_code,
  COALESCE(
    (
      SELECT jsonb_object_agg(reaction, cnt)
      FROM (
        SELECT reaction, count(*)::int AS cnt
        FROM content.thread_reactions tr
        WHERE tr.thread_id = t.id
        GROUP BY reaction
      ) AS agg
    ),
    '{}'::jsonb
  ) AS reaction_totals,
  jsonb_build_object(
    'handle', prof.handle,
    'display_name', prof.display_name,
    'avatar_url', prof.avatar_url
  ) AS author_profile
FROM content.threads t
LEFT JOIN lensers.profiles prof ON t.lenser_id = prof.id
LEFT JOIN content.thread_translations tt ON t.id = tt.thread_id AND tt.is_original = true;

GRANT SELECT ON content.vw_auth_threads TO anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION public.fn_content_tags_create(p_name text, p_slug text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'content', 'public'
AS $$
DECLARE
  v_id uuid;
BEGIN
  IF p_name IS NULL OR btrim(p_name) = '' THEN
    RAISE EXCEPTION 'Tag name is required';
  END IF;

  IF p_slug IS NULL OR btrim(p_slug) = '' THEN
    RAISE EXCEPTION 'Tag slug is required';
  END IF;

  INSERT INTO content.tags (slug, visibility)
  VALUES (btrim(p_slug), 'public')
  RETURNING id INTO v_id;

  INSERT INTO content.tag_translations (tag_id, language_code, name)
  VALUES (v_id, 'en', btrim(p_name));

  RETURN v_id;
EXCEPTION
  WHEN unique_violation THEN
    SELECT id INTO v_id
    FROM content.tags
    WHERE slug = p_slug;

    IF v_id IS NOT NULL THEN
      RETURN v_id;
    END IF;

    RAISE;
END;
$$;

GRANT ALL ON FUNCTION public.fn_content_tags_create(text, text) TO anon, authenticated, service_role;

-- 5) Promote core.languages.code to the canonical primary key and drop the UUID id column.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'core'
      AND table_name = 'languages'
      AND column_name = 'id'
  ) THEN
    ALTER TABLE core.languages DROP CONSTRAINT IF EXISTS languages_pkey;

    IF NOT EXISTS (
      SELECT 1
      FROM pg_constraint
      WHERE conname = 'languages_code_pkey'
        AND conrelid = 'core.languages'::regclass
    ) THEN
      ALTER TABLE core.languages
        ADD CONSTRAINT languages_code_pkey PRIMARY KEY (code);
    END IF;

    ALTER TABLE core.languages
      DROP COLUMN id;
  END IF;
END $$;
