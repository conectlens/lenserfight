-- =============================================================================
-- 10. SCALE SEED SETUP
-- =============================================================================

-- Memory tuning for bulk operations
SET work_mem = '32MB';
SET maintenance_work_mem = '128MB';

-- ---------------------------------------------------------------------------
-- Utility: language picker with weighted distribution
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.seed_pick_language(r float)
RETURNS text LANGUAGE sql IMMUTABLE AS $$
  SELECT CASE
    WHEN r < 0.40 THEN 'en'
    WHEN r < 0.55 THEN 'tr'
    WHEN r < 0.65 THEN 'es'
    WHEN r < 0.73 THEN 'fr'
    WHEN r < 0.80 THEN 'de'
    WHEN r < 0.85 THEN 'ar'
    WHEN r < 0.89 THEN 'ja'
    WHEN r < 0.92 THEN 'ko'
    WHEN r < 0.95 THEN 'pt'
    WHEN r < 0.98 THEN 'zh'
    ELSE 'it'
  END;
$$;

-- ---------------------------------------------------------------------------
-- Utility: country picker with weighted distribution
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.seed_pick_country(r double precision)
RETURNS text LANGUAGE sql IMMUTABLE AS $$
  SELECT CASE
    WHEN r < 0.25 THEN 'US'
    WHEN r < 0.40 THEN 'TR'
    WHEN r < 0.50 THEN 'ES'
    WHEN r < 0.58 THEN 'FR'
    WHEN r < 0.65 THEN 'DE'
    WHEN r < 0.72 THEN 'GB'
    WHEN r < 0.77 THEN 'JP'
    WHEN r < 0.82 THEN 'KR'
    WHEN r < 0.87 THEN 'BR'
    WHEN r < 0.91 THEN 'SA'
    WHEN r < 0.94 THEN 'IT'
    WHEN r < 0.96 THEN 'MX'
    WHEN r < 0.98 THEN 'IN'
    ELSE 'CA'
  END;
$$;

-- Pre-computed bcrypt hash for 'seedpassword' (avoids per-row crypt() cost)
CREATE OR REPLACE FUNCTION public.seed_password_hash()
RETURNS text LANGUAGE sql IMMUTABLE AS $$
  SELECT '$2a$06$RzK1X5hN5KqJF5V8OqXYXOqYXOqYXOqYXOqYXOqYXOqYXOqYXOqYX'::text;
$$;

-- ---------------------------------------------------------------------------
-- Disable triggers that interfere with bulk inserts
-- ---------------------------------------------------------------------------

-- lensers.profiles triggers
ALTER TABLE lensers.profiles DISABLE TRIGGER "trg_after_lenser_insert";
ALTER TABLE lensers.profiles DISABLE TRIGGER "trg_init_lenser_engagement_row";
ALTER TABLE lensers.profiles DISABLE TRIGGER "trg_log_lenser_join";
ALTER TABLE lensers.profiles DISABLE TRIGGER "trg_sync_profile_from_auth_metadata";
ALTER TABLE lensers.profiles DISABLE TRIGGER "trg_enforce_lensers_protections";
ALTER TABLE lensers.profiles DISABLE TRIGGER "trg_protect_sensitive_lenser_fields";

-- lensers.follows trigger disable removed: table dropped in schema_cleanup migration

-- content.threads triggers
-- Note: tg_xp_thread_created was removed (duplicate trigger bug fix in migration 20260328130000)
ALTER TABLE content.threads DISABLE TRIGGER "trg_sync_thread_count";
ALTER TABLE content.threads DISABLE TRIGGER "trg_xp_on_thread_created";
ALTER TABLE content.threads DISABLE TRIGGER "trg_xp_thread_visibility_changed";

-- lenses.lenses triggers
ALTER TABLE lenses.lenses DISABLE TRIGGER "trg_sync_lens_count";
ALTER TABLE lenses.lenses DISABLE TRIGGER "tg_xp_lens_created";
ALTER TABLE lenses.lenses DISABLE TRIGGER "trg_xp_lens_visibility_changed";

-- lenses.workflows triggers
ALTER TABLE lenses.workflows DISABLE TRIGGER "trg_xp_workflow_created";
ALTER TABLE lenses.workflows DISABLE TRIGGER "trg_xp_workflow_visibility_changed";


-- content.thread_replies triggers
ALTER TABLE content.thread_replies DISABLE TRIGGER "thread_replies_after_insert";
ALTER TABLE content.thread_replies DISABLE TRIGGER "thread_replies_after_update";
ALTER TABLE content.thread_replies DISABLE TRIGGER "thread_replies_after_delete";
ALTER TABLE content.thread_replies DISABLE TRIGGER "trg_xp_on_reply_created";
ALTER TABLE content.thread_replies DISABLE TRIGGER "trg_xp_on_reply_received";

-- content.tag_map triggers
ALTER TABLE content.tag_map DISABLE TRIGGER "trg_tag_created";

-- content reaction triggers (force lenser_id = auth.uid() which is NULL in seed)
ALTER TABLE content.reactions DISABLE TRIGGER ALL;

