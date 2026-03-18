-- Migration: Add fn_tags_get_cloud RPC
-- Purpose: Return top N trending tags for the tag cloud page, preventing unbounded
--          full-table scans on vw_tags_public_stats (was fetching 1000+ rows).

CREATE OR REPLACE FUNCTION fn_tags_get_cloud(p_limit INT DEFAULT 50)
RETURNS TABLE (
  id            UUID,
  slug          TEXT,
  name          TEXT,
  visibility    TEXT,
  created_at    TIMESTAMPTZ,
  created_count BIGINT,
  viewed_count  BIGINT,
  reacted_count BIGINT,
  total_usage   BIGINT,
  trend_score_7d NUMERIC
)
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public, content, analytics
AS $$
  SELECT
    id,
    slug,
    name,
    visibility,
    created_at,
    created_count,
    viewed_count,
    reacted_count,
    total_usage,
    trend_score_7d
  FROM vw_tags_public_stats
  ORDER BY trend_score_7d DESC NULLS LAST, total_usage DESC NULLS LAST
  LIMIT LEAST(p_limit, 100);
$$;

GRANT EXECUTE ON FUNCTION fn_tags_get_cloud(INT) TO anon, authenticated;
