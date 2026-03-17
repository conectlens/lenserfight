-- =============================================================================
-- 21. SCALE BACKFILL
-- Re-enable triggers, backfill analytics data, run ANALYZE.
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

-- lensers.follows
ALTER TABLE lensers.follows ENABLE TRIGGER "trg_follows_sync_counts";

-- content.threads
ALTER TABLE content.threads ENABLE TRIGGER "trg_sync_thread_count";
ALTER TABLE content.threads ENABLE TRIGGER "tg_xp_thread_created";
ALTER TABLE content.threads ENABLE TRIGGER "trg_xp_on_thread_created";

-- content.prompt_templates
ALTER TABLE content.prompt_templates ENABLE TRIGGER "trg_sync_prompt_count";
ALTER TABLE content.prompt_templates ENABLE TRIGGER "tg_xp_prompt_created";

-- content.thread_replies
ALTER TABLE content.thread_replies ENABLE TRIGGER "thread_replies_after_insert";
ALTER TABLE content.thread_replies ENABLE TRIGGER "thread_replies_after_update";
ALTER TABLE content.thread_replies ENABLE TRIGGER "thread_replies_after_delete";
ALTER TABLE content.thread_replies ENABLE TRIGGER "trg_xp_on_reply_created";
ALTER TABLE content.thread_replies ENABLE TRIGGER "trg_xp_on_reply_received";

-- content.tag_map
ALTER TABLE content.tag_map ENABLE TRIGGER "trg_tag_created";

-- content reactions
ALTER TABLE content.thread_reactions ENABLE TRIGGER "trg_set_reaction_user_id";
ALTER TABLE content.prompt_reactions ENABLE TRIGGER "trg_set_reaction_user_id";
ALTER TABLE content.thread_reply_reactions ENABLE TRIGGER "trg_set_reaction_user_id";

-- analytics.lenser_join_log
ALTER TABLE analytics.lenser_join_log ENABLE TRIGGER "trg_lenser_join_award_badges";
ALTER TABLE analytics.lenser_join_log ENABLE TRIGGER "trg_sync_join_order";
ALTER TABLE analytics.lenser_join_log ENABLE TRIGGER "trg_no_delete_lenser_join_log";
ALTER TABLE analytics.lenser_join_log ENABLE TRIGGER "trg_no_update_lenser_join_log";

-- ---------------------------------------------------------------------------
-- Backfill analytics.lenser_join_log
-- ---------------------------------------------------------------------------
INSERT INTO analytics.lenser_join_log (lenser_id, created_at)
SELECT id, created_at
FROM lensers.profiles
WHERE handle LIKE 'lenser_%'
ORDER BY created_at, id
ON CONFLICT (lenser_id) DO NOTHING;

-- ---------------------------------------------------------------------------
-- Backfill analytics.lenser_stats (thread/prompt/follower/following counts)
-- ---------------------------------------------------------------------------
INSERT INTO analytics.lenser_stats (lenser_id, thread_count, prompt_count, follower_count, following_count, created_at, updated_at)
SELECT
  p.id,
  COALESCE(tc.cnt, 0),
  COALESCE(pc.cnt, 0),
  COALESCE(frc.cnt, 0),
  COALESCE(fgc.cnt, 0),
  now(),
  now()
FROM lensers.profiles p
LEFT JOIN (
  SELECT lenser_id, count(*)::int AS cnt FROM content.threads GROUP BY lenser_id
) tc ON tc.lenser_id = p.id
LEFT JOIN (
  SELECT lenser_id, count(*)::int AS cnt FROM content.prompt_templates GROUP BY lenser_id
) pc ON pc.lenser_id = p.id
LEFT JOIN (
  SELECT following_id AS lenser_id, count(*)::int AS cnt FROM lensers.follows GROUP BY following_id
) frc ON frc.lenser_id = p.id
LEFT JOIN (
  SELECT follower_id AS lenser_id, count(*)::int AS cnt FROM lensers.follows GROUP BY follower_id
) fgc ON fgc.lenser_id = p.id
WHERE p.handle LIKE 'lenser_%'
ON CONFLICT (lenser_id) DO UPDATE SET
  thread_count = EXCLUDED.thread_count,
  prompt_count = EXCLUDED.prompt_count,
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

-- ---------------------------------------------------------------------------
-- ANALYZE all seeded tables for query planner accuracy
-- ---------------------------------------------------------------------------
ANALYZE auth.users;
ANALYZE auth.identities;
ANALYZE lensers.profiles;
ANALYZE lensers.follows;
ANALYZE lensers.tag_follows;
ANALYZE lensers.badges;
ANALYZE content.threads;
ANALYZE content.thread_translations;
ANALYZE content.thread_replies;
ANALYZE content.thread_reactions;
ANALYZE content.prompt_templates;
ANALYZE content.prompt_translations;
ANALYZE content.prompt_reactions;
ANALYZE content.thread_reply_reactions;
ANALYZE content.tags;
ANALYZE content.tag_translations;
ANALYZE content.tag_map;
ANALYZE analytics.lenser_stats;
ANALYZE analytics.lenser_join_log;
ANALYZE xp.totals;

-- Reset memory settings
RESET work_mem;
RESET maintenance_work_mem;
