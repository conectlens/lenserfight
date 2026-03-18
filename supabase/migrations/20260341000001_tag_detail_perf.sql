-- Migration: tag_detail_perf
-- Adds missing indexes on analytics tables and replaces tag content RPCs
-- with sort-aware versions (p_sort: 'newest' | 'trending' | 'popular').

-- ── 1. Missing indexes ────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_tag_activity_daily_tag_id
  ON analytics.tag_activity_daily (tag_id);

CREATE INDEX IF NOT EXISTS idx_tag_activity_daily_tag_date
  ON analytics.tag_activity_daily (tag_id, activity_date);

CREATE INDEX IF NOT EXISTS idx_tag_activity_events_tag_id
  ON analytics.tag_activity_events (tag_id);

CREATE INDEX IF NOT EXISTS idx_tag_activity_events_tag_occurred
  ON analytics.tag_activity_events (tag_id, occurred_at);

CREATE INDEX IF NOT EXISTS idx_tag_suggestions_entity
  ON content.tag_suggestions (entity_type, entity_id);

-- ── 2. Replace fn_content_get_prompts_by_tag ─────────────────────────────────
-- Drop old 3-arg signature before creating new 4-arg signature.

DROP FUNCTION IF EXISTS public.fn_content_get_prompts_by_tag(text, integer, integer);

CREATE OR REPLACE FUNCTION public.fn_content_get_prompts_by_tag(
  p_tag_slug  TEXT,
  p_sort      TEXT    DEFAULT 'newest',
  p_limit     INT     DEFAULT 20,
  p_offset    INT     DEFAULT 0
)
RETURNS TABLE (
  id              UUID,
  lenser_id       UUID,
  visibility      content.visibility_enum,
  title           TEXT,
  description     TEXT,
  author_profile  JSONB,
  reaction_totals JSONB,
  copy_count      INT,
  like_count      INT,
  saved_count     INT,
  tags            JSONB,
  created_at      TIMESTAMPTZ
)
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public, content, lensers
AS $$
  WITH matched_ids AS (
    SELECT DISTINCT tm.entity_id AS prompt_id
    FROM content.tag_map tm
    JOIN content.tags tg ON tg.id = tm.tag_id AND tg.slug = p_tag_slug
    WHERE tm.entity_type = 'prompt_template'
    LIMIT 1000
  )
  SELECT
    v.id, v.lenser_id, v.visibility, v.title, v.description,
    v.author_profile, v.reaction_totals, v.copy_count, v.like_count,
    v.saved_count, v.tags, v.created_at
  FROM matched_ids m
  JOIN public.vw_prompt_templates_public v ON v.id = m.prompt_id
  ORDER BY
    CASE WHEN p_sort = 'newest' THEN v.created_at END DESC,
    CASE WHEN p_sort IN ('trending', 'popular') THEN v.copy_count END DESC NULLS LAST,
    CASE WHEN p_sort IN ('trending', 'popular') THEN v.like_count END DESC NULLS LAST
  LIMIT  LEAST(p_limit, 50)
  OFFSET GREATEST(p_offset, 0);
$$;

REVOKE ALL ON FUNCTION public.fn_content_get_prompts_by_tag(text, text, integer, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.fn_content_get_prompts_by_tag(text, text, integer, integer) TO anon;
GRANT EXECUTE ON FUNCTION public.fn_content_get_prompts_by_tag(text, text, integer, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.fn_content_get_prompts_by_tag(text, text, integer, integer) TO service_role;

-- ── 3. Replace fn_content_get_threads_by_tag ─────────────────────────────────

DROP FUNCTION IF EXISTS public.fn_content_get_threads_by_tag(text, integer, integer);

CREATE OR REPLACE FUNCTION public.fn_content_get_threads_by_tag(
  p_tag_slug  TEXT,
  p_sort      TEXT    DEFAULT 'newest',
  p_limit     INT     DEFAULT 20,
  p_offset    INT     DEFAULT 0
)
RETURNS TABLE (
  id              UUID,
  lenser_id       UUID,
  title           TEXT,
  content         TEXT,
  author_profile  JSONB,
  reaction_totals JSONB,
  like_count      INT,
  reply_count     INT,
  view_count      INT,
  visibility      content.visibility_enum,
  tags            JSONB,
  created_at      TIMESTAMPTZ
)
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public, content, lensers
AS $$
  WITH matched_ids AS (
    SELECT DISTINCT tm.entity_id AS thread_id
    FROM content.tag_map tm
    JOIN content.tags tg ON tg.id = tm.tag_id AND tg.slug = p_tag_slug
    WHERE tm.entity_type = 'thread'
    LIMIT 1000
  )
  SELECT
    v.id, v.lenser_id, v.title, v.content,
    v.author_profile, v.reaction_totals, v.like_count,
    v.reply_count, v.view_count, v.visibility, v.tags, v.created_at
  FROM matched_ids m
  JOIN public.vw_content_threads_public v ON v.id = m.thread_id
  ORDER BY
    CASE WHEN p_sort = 'newest' THEN v.created_at END DESC,
    CASE WHEN p_sort IN ('trending', 'popular') THEN v.like_count END DESC NULLS LAST,
    CASE WHEN p_sort IN ('trending', 'popular') THEN v.reply_count END DESC NULLS LAST
  LIMIT  LEAST(p_limit, 50)
  OFFSET GREATEST(p_offset, 0);
$$;

REVOKE ALL ON FUNCTION public.fn_content_get_threads_by_tag(text, text, integer, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.fn_content_get_threads_by_tag(text, text, integer, integer) TO anon;
GRANT EXECUTE ON FUNCTION public.fn_content_get_threads_by_tag(text, text, integer, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.fn_content_get_threads_by_tag(text, text, integer, integer) TO service_role;
