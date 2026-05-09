-- Phase Z4: Bound user-submitted text columns with CHECK length constraints.
-- Prevents oversized payloads, UI-breaking strings, and DB bloat. Each CHECK
-- is added NOT VALID then VALIDATEd in a separate statement to avoid an
-- AccessExclusiveLock on hot tables.
--
-- Caps chosen to fit existing UI affordances:
--   display_name          60
--   bio                  500
--   headline             120
--   battle title         200
--   prompt body       32 000
--   submission body   20 000
--   reply / comment    5 000
--   slug                 128
--   url               2 048
--   memory content    20 000
--
-- Idempotent: skips if column missing or constraint already present.

CREATE OR REPLACE FUNCTION pg_temp.add_len_check(
  p_table  text,
  p_column text,
  p_max    int
) RETURNS void AS $$
DECLARE
  v_conname text := format('ck_%s_%s_len', replace(p_table,'.','_'), p_column);
  has_col boolean;
BEGIN
  IF to_regclass(p_table) IS NULL THEN RETURN; END IF;
  EXECUTE format(
    'SELECT EXISTS (SELECT 1 FROM information_schema.columns
                    WHERE (table_schema || ''.'' || table_name) = %L AND column_name = %L)',
    p_table, p_column
  ) INTO has_col;
  IF NOT has_col THEN RETURN; END IF;

  IF EXISTS (SELECT 1 FROM pg_constraint
             WHERE conname = v_conname
               AND conrelid = p_table::regclass) THEN
    RETURN;
  END IF;

  EXECUTE format(
    'ALTER TABLE %s ADD CONSTRAINT %I CHECK (%I IS NULL OR length(%I) <= %s) NOT VALID',
    p_table, v_conname, p_column, p_column, p_max
  );
  -- VALIDATE acquires only ShareUpdateExclusiveLock — concurrent reads/writes OK.
  EXECUTE format('ALTER TABLE %s VALIDATE CONSTRAINT %I', p_table, v_conname);
EXCEPTION WHEN check_violation THEN
  RAISE WARNING 'Existing rows in %.% violate length<=%; constraint left NOT VALID',
                p_table, p_column, p_max;
END $$ LANGUAGE plpgsql;

DO $$
BEGIN
  -- lensers.profiles
  PERFORM pg_temp.add_len_check('lensers.profiles', 'display_name',  60);
  PERFORM pg_temp.add_len_check('lensers.profiles', 'bio',          500);
  PERFORM pg_temp.add_len_check('lensers.profiles', 'headline',     120);

  -- battles.battles
  PERFORM pg_temp.add_len_check('battles.battles',  'title',           200);
  PERFORM pg_temp.add_len_check('battles.battles',  'task_prompt',  32000);
  PERFORM pg_temp.add_len_check('battles.battles',  'ai_judge_prompt', 8000);
  PERFORM pg_temp.add_len_check('battles.battles',  'invite_code',     32);

  -- battles.submissions
  PERFORM pg_temp.add_len_check('battles.submissions', 'content_text', 20000);

  -- battles.templates
  PERFORM pg_temp.add_len_check('battles.templates', 'title',          200);
  PERFORM pg_temp.add_len_check('battles.templates', 'description',   2000);
  PERFORM pg_temp.add_len_check('battles.templates', 'task_prompt',  32000);

  -- content.threads / thread_replies
  PERFORM pg_temp.add_len_check('content.threads',         'title',  200);
  PERFORM pg_temp.add_len_check('content.thread_replies',  'content', 5000);

  -- content.entity_translations
  PERFORM pg_temp.add_len_check('content.entity_translations', 'title',         200);
  PERFORM pg_temp.add_len_check('content.entity_translations', 'description',  2000);
  PERFORM pg_temp.add_len_check('content.entity_translations', 'content',     32000);

  -- agents.memories
  PERFORM pg_temp.add_len_check('agents.memories', 'content', 20000);
END $$;

-- Username/handle format CHECK already exists on lensers.profiles.handle.
-- Add slug-format CHECK on any *_slug column that lacks one — guarded scan.
DO $$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT (table_schema || '.' || table_name) AS rel, column_name AS col
    FROM information_schema.columns
    WHERE column_name LIKE '%slug%'
      AND data_type IN ('text','character varying')
      AND table_schema NOT IN ('pg_catalog','information_schema')
  LOOP
    BEGIN
      EXECUTE format(
        'ALTER TABLE %s ADD CONSTRAINT %I CHECK (%I IS NULL OR %I ~ ''^[a-z0-9][a-z0-9-]{0,127}$'') NOT VALID',
        r.rel,
        format('ck_%s_%s_format', replace(r.rel,'.','_'), r.col),
        r.col, r.col
      );
    EXCEPTION
      WHEN duplicate_object THEN NULL;
      WHEN others THEN
        RAISE NOTICE 'skip slug check on %.%: %', r.rel, r.col, SQLERRM;
    END;
  END LOOP;
END $$;
