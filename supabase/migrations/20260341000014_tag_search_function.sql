-- Migration: Add fn_tags_search RPC for tag mention autocomplete
-- Supports sorting by: 1) language match, 2) exact match, 3) popularity

CREATE OR REPLACE FUNCTION public.fn_tags_search(
  p_query text,
  p_lang  text DEFAULT 'en',
  p_limit int  DEFAULT 5
)
RETURNS TABLE (
  id          uuid,
  name        text,
  slug        text,
  visibility  text,
  total_usage bigint,
  lang_match  boolean
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    t.id,
    COALESCE(tr_lang.name, tr_en.name, t.slug) AS name,
    t.slug,
    t.visibility::text,
    COALESCE(s.total_usage, 0)                  AS total_usage,
    (tr_lang.tag_id IS NOT NULL)                AS lang_match
  FROM content.tags t
  LEFT JOIN content.tag_translations tr_lang
    ON tr_lang.tag_id = t.id AND tr_lang.language_code = p_lang
  LEFT JOIN content.tag_translations tr_en
    ON tr_en.tag_id = t.id AND tr_en.language_code = 'en'
  LEFT JOIN vw_tags_public_stats s
    ON s.id = t.id
  WHERE
    t.visibility = 'public'
    AND (
      COALESCE(tr_lang.name, tr_en.name, t.slug) ILIKE '%' || p_query || '%'
      OR t.slug ILIKE '%' || p_query || '%'
    )
  ORDER BY
    lang_match DESC,
    CASE
      WHEN LOWER(COALESCE(tr_lang.name, tr_en.name, t.slug)) = LOWER(p_query) THEN 0
      ELSE 1
    END,
    COALESCE(s.total_usage, 0) DESC
  LIMIT p_limit;
$$;

GRANT EXECUTE ON FUNCTION public.fn_tags_search(text, text, int) TO authenticated, anon;
