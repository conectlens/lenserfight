-- Phase Z5: Validate language codes against an allow-list.
-- Issue: content.entity_translations.language_code (and similar columns)
-- are plain text — any string is accepted, breaking i18n lookups.
--
-- Approach: introduce a CHECK against a curated BCP-47 short list. We use a
-- CHECK rather than CREATE DOMAIN because Postgres domains complicate
-- ALTER TABLE TYPE on existing columns and PostgREST type introspection.
-- Add new locales by appending to i18n.fn_is_supported_language and bumping
-- the constraint definition (via migration).

CREATE SCHEMA IF NOT EXISTS i18n;

CREATE OR REPLACE FUNCTION i18n.fn_is_supported_language(p_code text)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
PARALLEL SAFE
AS $$
  SELECT p_code IS NULL OR p_code IN (
    'en','tr','es','fr','de','it','pt','pt-BR','nl','pl','ru','uk','cs',
    'sv','no','da','fi','hu','ro','el','ar','he','fa','hi','bn','ur',
    'zh','zh-CN','zh-TW','ja','ko','vi','th','id','ms','tl'
  );
$$;

DO $$
DECLARE
  r record;
  conname text;
BEGIN
  FOR r IN
    SELECT (table_schema || '.' || table_name) AS rel, column_name AS col
    FROM information_schema.columns
    WHERE column_name IN ('language_code','locale','preferred_language','lang_code')
      AND data_type IN ('text','character varying')
      AND table_schema NOT IN ('pg_catalog','information_schema','auth','storage','realtime','supabase_functions')
  LOOP
    conname := format('ck_%s_%s_bcp47', replace(r.rel,'.','_'), r.col);
    BEGIN
      EXECUTE format(
        'ALTER TABLE %s ADD CONSTRAINT %I CHECK (i18n.fn_is_supported_language(%I)) NOT VALID',
        r.rel, conname, r.col
      );
      EXECUTE format('ALTER TABLE %s VALIDATE CONSTRAINT %I', r.rel, conname);
    EXCEPTION
      WHEN duplicate_object THEN NULL;
      WHEN check_violation THEN
        RAISE WARNING 'Existing rows in %.% have unsupported language codes; left NOT VALID', r.rel, r.col;
      WHEN others THEN
        RAISE NOTICE 'skip lang check on %.%: %', r.rel, r.col, SQLERRM;
    END;
  END LOOP;
END $$;
