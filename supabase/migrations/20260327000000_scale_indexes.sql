-- =============================================================================
-- Scale Indexes: Add missing indexes and drop redundant duplicates
-- =============================================================================

-- ---------------------------------------------------------------------------
-- NEW INDEXES
-- ---------------------------------------------------------------------------

-- CRITICAL: Public views + hot scores filter on visibility AND status.
-- Current idx_threads_public_created only filters visibility='public'.
CREATE INDEX IF NOT EXISTS idx_threads_public_published
  ON content.threads (created_at DESC)
  WHERE visibility = 'public' AND status = 'published';

CREATE INDEX IF NOT EXISTS idx_prompts_public_published
  ON content.prompt_templates (created_at DESC)
  WHERE visibility = 'public' AND status = 'published';

-- HIGH: Personal feed tag_sim CTE joins on (entity_type, tag_id, entity_id).
CREATE INDEX IF NOT EXISTS idx_tag_map_type_tag
  ON content.tag_map (entity_type, tag_id, entity_id);

-- HIGH: Reaction totals computed inline in every public view via GROUP BY.
CREATE INDEX IF NOT EXISTS idx_thread_reactions_thread_reaction
  ON content.thread_reactions (thread_id, reaction);

CREATE INDEX IF NOT EXISTS idx_prompt_reactions_prompt_reaction
  ON content.prompt_reactions (prompt_id, reaction);

-- MEDIUM: Cross-language tag view self-join on LOWER(TRIM(name)).
CREATE INDEX IF NOT EXISTS idx_tag_translations_name_lower
  ON content.tag_translations (lower(btrim(name)));

-- MEDIUM: Covering index for followed_authors CTE in personal feed.
CREATE INDEX IF NOT EXISTS idx_follows_follower_following
  ON lensers.follows (follower_id, following_id);

-- LOW: Public replies view filters on status + deleted_at.
CREATE INDEX IF NOT EXISTS idx_thread_replies_published
  ON content.thread_replies (thread_id, created_at)
  WHERE status = 'published' AND deleted_at IS NULL;

-- ---------------------------------------------------------------------------
-- DROP REDUNDANT INDEXES (duplicates of existing ones)
-- ---------------------------------------------------------------------------

-- content.threads_lenser_idx is duplicate of idx_threads_lenser_id
DROP INDEX IF EXISTS content.threads_lenser_idx;

-- content.prompt_templates_lenser_idx is duplicate of idx_prompt_templates_lenser_id
DROP INDEX IF EXISTS content.prompt_templates_lenser_idx;

-- content.tag_map_tag_idx is duplicate of idx_tag_map_tag_id
DROP INDEX IF EXISTS content.tag_map_tag_idx;

-- lensers.lensers_handle_idx is duplicate of idx_profiles_handle
DROP INDEX IF EXISTS lensers.lensers_handle_idx;

-- lensers.lensers_user_id_idx is duplicate of idx_profiles_user_id
DROP INDEX IF EXISTS lensers.lensers_user_id_idx;

-- lensers.lenser_social_links_lenser_id_idx is duplicate of idx_lensers_social_links_lenser_id
DROP INDEX IF EXISTS lensers.lenser_social_links_lenser_id_idx;

-- xp.xp_totals_lenser_id_idx is duplicate of idx_xp_totals_lenser_id
DROP INDEX IF EXISTS xp.xp_totals_lenser_id_idx;
