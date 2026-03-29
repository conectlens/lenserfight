-- =============================================================================
-- 21. SCALE BACKFILL
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Re-enable all disabled triggers
-- ---------------------------------------------------------------------------

-- lensers.profiles
ALTER TABLE lensers.profiles ENABLE TRIGGER "trg_after_lenser_insert";
ALTER TABLE lensers.profiles ENABLE TRIGGER "trg_init_lenser_engagement_row";
ALTER TABLE lensers.profiles ENABLE TRIGGER "trg_log_lenser_join";
ALTER TABLE lensers.profiles ENABLE TRIGGER "trg_sync_profile_from_auth_metadata";
ALTER TABLE lensers.profiles ENABLE TRIGGER "trg_enforce_lensers_protections";
ALTER TABLE lensers.profiles ENABLE TRIGGER "trg_protect_sensitive_lenser_fields";

-- lensers.follows trigger re-enable removed: table dropped in schema_cleanup migration

-- content.threads
-- Note: tg_xp_thread_created was dropped in migration 20260328130000 (duplicate trigger fix)
ALTER TABLE content.threads ENABLE TRIGGER "trg_sync_thread_count";
ALTER TABLE content.threads ENABLE TRIGGER "trg_xp_on_thread_created";
ALTER TABLE content.threads ENABLE TRIGGER "trg_xp_thread_visibility_changed";

-- lenses.lenses
-- Note: trg_lenses_create_initial_version and trg_lens_template_updated
-- were dropped in migration 20260324000000_lens_schema_refactor.sql
ALTER TABLE lenses.lenses ENABLE TRIGGER "trg_sync_lens_count";
ALTER TABLE lenses.lenses ENABLE TRIGGER "tg_xp_lens_created";

-- content.thread_replies
ALTER TABLE content.thread_replies ENABLE TRIGGER "thread_replies_after_insert";
ALTER TABLE content.thread_replies ENABLE TRIGGER "thread_replies_after_update";
ALTER TABLE content.thread_replies ENABLE TRIGGER "thread_replies_after_delete";
ALTER TABLE content.thread_replies ENABLE TRIGGER "trg_xp_on_reply_created";
ALTER TABLE content.thread_replies ENABLE TRIGGER "trg_xp_on_reply_received";

-- content.tag_map
ALTER TABLE content.tag_map ENABLE TRIGGER "trg_tag_created";

-- content reactions
ALTER TABLE content.reactions ENABLE TRIGGER ALL;


-- ---------------------------------------------------------------------------
-- ---------------------------------------------------------------------------
SELECT id, created_at
FROM lensers.profiles
WHERE handle LIKE 'lenser_%'
ORDER BY created_at, id
ON CONFLICT (lenser_id) DO NOTHING;

-- ---------------------------------------------------------------------------
-- ---------------------------------------------------------------------------
SELECT
  p.id,
  COALESCE(tc.cnt, 0),
  COALESCE(pc.cnt, 0),
  COALESCE(frc.cnt, 0),
  COALESCE(fgc.cnt, 0),
  now()
FROM lensers.profiles p
LEFT JOIN (
  SELECT lenser_id, count(*)::int AS cnt FROM content.threads GROUP BY lenser_id
) tc ON tc.lenser_id = p.id
LEFT JOIN (
  SELECT lenser_id, count(*)::int AS cnt FROM lenses.lenses GROUP BY lenser_id
) pc ON pc.lenser_id = p.id
LEFT JOIN (
  SELECT target_profile_id AS lenser_id, count(*)::int AS cnt FROM lensers.relationships WHERE status = 'accepted' GROUP BY target_profile_id
) frc ON frc.lenser_id = p.id
LEFT JOIN (
  SELECT source_profile_id AS lenser_id, count(*)::int AS cnt FROM lensers.relationships WHERE status = 'accepted' GROUP BY source_profile_id
) fgc ON fgc.lenser_id = p.id
WHERE p.handle LIKE 'lenser_%'
ON CONFLICT (lenser_id) DO UPDATE SET
  thread_count = EXCLUDED.thread_count,
  lens_count = EXCLUDED.lens_count,
  follower_count = EXCLUDED.follower_count,
  following_count = EXCLUDED.following_count,
  updated_at = now();

-- ---------------------------------------------------------------------------
-- Backfill thread reply_count
-- ---------------------------------------------------------------------------
UPDATE content.threads t
SET reply_count = sub.cnt
FROM (
  SELECT thread_id, count(*)::int AS cnt
  FROM content.thread_replies
  WHERE status = 'published'::"content"."thread_reply_status"
    AND deleted_at IS NULL
  GROUP BY thread_id
) sub
WHERE t.id = sub.thread_id
  AND t.reply_count <> sub.cnt;

-- ---------------------------------------------------------------------------
-- Drop temp tables
-- ---------------------------------------------------------------------------
DROP TABLE IF EXISTS seed_profile_index;
DROP TABLE IF EXISTS seed_tag_index;
DROP FUNCTION IF EXISTS public.seed_pick_language(float);
DROP FUNCTION IF EXISTS public.seed_pick_country(double precision);
DROP FUNCTION IF EXISTS public.seed_password_hash();

-- ---------------------------------------------------------------------------
-- ANALYZE all seeded tables for query planner accuracy
-- ---------------------------------------------------------------------------
ANALYZE auth.users;
ANALYZE auth.identities;
ANALYZE lensers.profiles;
ANALYZE lensers.relationships;
ANALYZE lensers.tag_follows;
ANALYZE lensers.badges;
ANALYZE content.threads;
ANALYZE content.entity_translations;
ANALYZE content.thread_replies;
ANALYZE content.reactions;
ANALYZE lenses.lenses;
ANALYZE lenses.versions;
ANALYZE content.tags;
ANALYZE content.tag_translations;
ANALYZE content.tag_map;

-- Reset memory settings
RESET work_mem;
RESET maintenance_work_mem;
