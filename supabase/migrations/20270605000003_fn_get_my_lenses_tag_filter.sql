-- fn_get_my_lenses: add optional tag-slug filter so "My Lenses" + tag combos work.
DROP FUNCTION IF EXISTS public.fn_get_my_lenses(integer, integer);

CREATE FUNCTION public.fn_get_my_lenses(p_offset integer DEFAULT 0, p_limit integer DEFAULT 20, p_tag_slug text DEFAULT NULL)
RETURNS TABLE(
  id uuid, lenser_id uuid, visibility content.visibility_enum, title text,
  description text, author_profile jsonb, reaction_totals jsonb,
  copy_count integer, like_count integer, saved_count integer, tags jsonb,
  created_at timestamp with time zone, "outputKind" text
)
    LANGUAGE plpgsql STABLE SECURITY DEFINER
    SET search_path TO 'lenses', 'lensers', 'content', 'public'
    AS $$
DECLARE
  v_lenser_id uuid;
BEGIN
  v_lenser_id := lensers.get_auth_lenser_id();
  IF v_lenser_id IS NULL THEN
    RETURN; -- unauthenticated: empty result set
  END IF;

  RETURN QUERY
  SELECT
    l.id,
    l.lenser_id,
    l.visibility,
    COALESCE(et.title, 'Untitled') AS title,
    et.description,
    jsonb_build_object(
      'id',           prof.id,
      'handle',       prof.handle,
      'display_name', prof.display_name,
      'avatar_url',   prof.avatar_url
    ) AS author_profile,
    COALESCE(rt.reaction_totals, '{}') AS reaction_totals,
    COALESCE(rt.copy_count, 0)         AS copy_count,
    COALESCE(rt.like_count, 0)         AS like_count,
    COALESCE(rt.saved_count, 0)        AS saved_count,
    COALESCE(tg_agg.tags, '[]')        AS tags,
    l.created_at,
    lenses.fn_output_kind(l.id)        AS "outputKind"
  FROM lenses.lenses l
  LEFT JOIN content.entity_translations et
    ON et.entity_id = l.id
   AND et.entity_type = 'lens'
   AND et.is_original = true
  LEFT JOIN lensers.profiles prof ON prof.id = l.lenser_id
  LEFT JOIN LATERAL (
    SELECT
      COALESCE(jsonb_object_agg(x.reaction, x.cnt), '{}')::jsonb  AS reaction_totals,
      COALESCE(SUM(CASE WHEN x.reaction = 'copy'::content.reaction_enum  THEN x.cnt ELSE 0 END)::integer, 0) AS copy_count,
      COALESCE(SUM(CASE WHEN x.reaction = 'like'::content.reaction_enum  THEN x.cnt ELSE 0 END)::integer, 0) AS like_count,
      COALESCE(SUM(CASE WHEN x.reaction = 'saved'::content.reaction_enum THEN x.cnt ELSE 0 END)::integer, 0) AS saved_count
    FROM (
      SELECT rx.reaction, COUNT(*)::integer AS cnt
      FROM content.reactions rx
      WHERE rx.entity_type = 'lens' AND rx.entity_id = l.id
      GROUP BY rx.reaction
    ) x
  ) rt ON true
  LEFT JOIN LATERAL (
    SELECT COALESCE(jsonb_agg(
      jsonb_build_object('id', tg.id, 'slug', tg.slug, 'name', tg.slug)
    ), '[]') AS tags
    FROM content.tag_map tm
    JOIN content.tags tg ON tg.id = tm.tag_id
    WHERE tm.entity_type = 'lens' AND tm.entity_id = l.id
  ) tg_agg ON true
  WHERE l.lenser_id = v_lenser_id
    AND (
      p_tag_slug IS NULL
      OR EXISTS (
        SELECT 1
        FROM content.tag_map tm2
        JOIN content.tags tg2 ON tg2.id = tm2.tag_id
        WHERE tm2.entity_type = 'lens' AND tm2.entity_id = l.id AND tg2.slug = p_tag_slug
      )
    )
  ORDER BY l.created_at DESC
  OFFSET GREATEST(p_offset, 0)
  LIMIT  LEAST(p_limit, 100);
END;
$$;

ALTER FUNCTION public.fn_get_my_lenses(integer, integer, text) OWNER TO postgres;
COMMENT ON FUNCTION public.fn_get_my_lenses(integer, integer, text) IS 'Returns all lenses (public, private, unlisted) owned by the authenticated lenser, optionally filtered by tag slug. Used by the "My Lenses" filter on LensesPage.';
GRANT ALL ON FUNCTION public.fn_get_my_lenses(integer, integer, text) TO anon;
GRANT ALL ON FUNCTION public.fn_get_my_lenses(integer, integer, text) TO authenticated;
GRANT ALL ON FUNCTION public.fn_get_my_lenses(integer, integer, text) TO service_role;
