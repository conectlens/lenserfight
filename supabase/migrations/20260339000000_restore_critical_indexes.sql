-- Restore critical indexes dropped in 20260338 that are required by
-- query-optimization functions introduced in 20260335.
-- These were incorrectly flagged as unused because the functions
-- that depend on them were added around the same time as the linter ran.
--
-- Note: Some indexes like idx_threads_lenser_id_created and
-- idx_prompt_reactions_prompt_id already exist in the base schema (20260334)
-- and were NOT dropped in 20260338, so they are omitted here.

-- ============================================================
-- lensers.follows indexes (dropped in 20260338)
-- Required by: fn_content_get_personal_prompts, fn_content_get_personal_threads
-- Pattern: LEFT JOIN lensers.follows fa
--            ON fa.follower_id = (SELECT id FROM current_lenser)
--           AND fa.following_id = c.lenser_id
-- ============================================================
CREATE INDEX "idx_follows_follower_id"
  ON "lensers"."follows" ("follower_id");

CREATE INDEX "idx_follows_following_id"
  ON "lensers"."follows" ("following_id");

CREATE INDEX "idx_follows_follower_following"
  ON "lensers"."follows" ("follower_id", "following_id");

-- ============================================================
-- lensers.tag_follows indexes (dropped in 20260338)
-- Required by: interest_tags CTE in fn_content_get_personal_prompts/threads
-- Pattern: SELECT tf.tag_id FROM lensers.tag_follows tf WHERE tf.lenser_id = ...
--      and JOIN content.vw_tag_cross_lang ON xcl.source_tag_id = tf.tag_id
-- ============================================================
CREATE INDEX "idx_tag_follows_lenser_id"
  ON "lensers"."tag_follows" ("lenser_id");

CREATE INDEX "idx_tag_follows_tag_id"
  ON "lensers"."tag_follows" ("tag_id");

-- ============================================================
-- content.prompt_reactions indexes (dropped in 20260338)
-- Required by:
--   - idx_prompt_reactions_prompt_id: reaction_agg CTE in fn_content_get_personal_prompts
--   - idx_prompt_reactions_created_at: LATERAL subquery in fn_lensers_get_leaderboard
-- We restore these as singles to match original dropped behavior
-- ============================================================
CREATE INDEX "idx_prompt_reactions_prompt_id"
  ON "content"."prompt_reactions" ("prompt_id");

CREATE INDEX "idx_prompt_reactions_created_at"
  ON "content"."prompt_reactions" ("created_at");

-- ============================================================
-- content.thread_reactions indexes (dropped in 20260338)
-- Required by:
--   - reaction_agg CTE in fn_content_get_personal_threads (thread_id lookup)
--   - LATERAL subquery in fn_lensers_get_leaderboard (created_at filter)
-- ============================================================
CREATE INDEX "idx_thread_reactions_created_at"
  ON "content"."thread_reactions" ("created_at");

-- ============================================================
-- content.tag_map composite index (dropped in 20260338)
-- Required by: interest_tags CTE scoring subquery
-- Pattern: WHERE tm.entity_type = 'prompt_template' AND tm.entity_id = c.id
--      and: JOIN interest_tags it ON it.tag_id = tm.tag_id
-- ============================================================
CREATE INDEX "idx_tag_map_type_tag"
  ON "content"."tag_map" ("entity_type", "tag_id", "entity_id");

-- ============================================================
-- content.threads indexes (dropped in 20260338)
-- Required by: candidates CTE in fn_content_get_personal_threads
-- Pattern: WHERE t.visibility = 'public' AND t.status = 'published'
--          ORDER BY t.created_at DESC LIMIT 5000
-- ============================================================
CREATE INDEX "idx_threads_public_feed"
  ON "content"."threads" ("visibility", "status", "created_at" DESC)
  WHERE "visibility" = 'public'::"content"."visibility_enum"
    AND "status"     = 'published'::"content"."content_status";

-- ============================================================
-- content.prompt_templates indexes (dropped in 20260338)
-- Required by: leaderboard LATERAL join and prompt feed
-- ============================================================
CREATE INDEX "idx_prompt_templates_public_created"
  ON "content"."prompt_templates" ("created_at" DESC)
  WHERE ("visibility" = 'public'::"content"."visibility_enum")
    AND ("status" = 'published'::"content"."content_status");

CREATE INDEX "idx_prompt_templates_lenser_id_created"
  ON "content"."prompt_templates" ("lenser_id", "created_at" DESC)
  WHERE ("visibility" = 'public'::"content"."visibility_enum")
    AND ("status" = 'published'::"content"."content_status");

-- ============================================================
-- lensers.profiles indexes (dropped in 20260338)
-- Required by: fn_lensers_get_leaderboard weekly/monthly/all_time filters
-- Pattern: WHERE lp.status = 'active' AND lp.visibility = 'public'
--          AND lp.deletion_requested_at IS NULL
--          AND lp.last_active_at > now() - interval '7 days'
-- ============================================================
CREATE INDEX "idx_profiles_last_active_at"
  ON "lensers"."profiles" ("last_active_at" DESC NULLS LAST)
  WHERE "status"                = 'active'::"lensers"."lenser_status"
    AND "visibility"            = 'public'::"lensers"."lenser_visibility"
    AND "deletion_requested_at" IS NULL;

CREATE INDEX "idx_profiles_joined_at"
  ON "lensers"."profiles" ("created_at" DESC);

CREATE INDEX "idx_profiles_preferred_language"
  ON "lensers"."profiles" ("preferred_language");
