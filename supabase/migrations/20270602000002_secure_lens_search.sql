-- ============================================================================
-- Secure, visibility-aware lens search + saved-lens listing
-- ----------------------------------------------------------------------------
-- Problem
--   Lens search routed through `vw_lenses_public` (hard-filtered to
--   visibility='public' AND status='published'), then tried to splice in the
--   author's own non-public lenses via `fn_list_my_private_lenses` — a function
--   that returns no title/description/content, so the client-side text filter
--   matched nothing. Net effect: an author searching their own private /
--   community / followers lenses got ZERO results, anywhere.
--
-- Fix
--   `fn_search_lenses` queries the base `lenses.lenses` table and re-encodes the
--   EXACT visibility contract enforced by the `authenticated_select` RLS policy
--   and `fn_get_lens_detail_bootstrap`:
--     • owner sees ALL of their own lenses (any visibility / status), and
--     • everyone else sees only published lenses gated by visibility:
--         public     → anyone (incl. anon)
--         community  → any authenticated viewer
--         followers  → accepted followers only
--         private    → owner only
--   It searches across title, description, content, tag name/slug, and lens
--   parameter labels. Because the predicate is owner-aware, a non-owner can
--   never surface another lenser's non-public lens through search.
--
--   `fn_get_my_saved_lenses` lists the caller's bookmarked ('saved' reaction)
--   lenses with the same visibility guard (a lens that turned private after you
--   saved it stops appearing).
--
-- Both functions return the identical row shape as `fn_get_my_lenses` (+`status`)
-- so the existing repository mapper is reused unchanged.
-- ============================================================================

-- ── Trigram indexes for substring (ILIKE '%q%') search ─────────────────────
-- title already has idx_entity_translations_title_trgm; add the rest.
CREATE INDEX IF NOT EXISTS idx_entity_translations_description_trgm
  ON content.entity_translations
  USING gin (lower(description) extensions.gin_trgm_ops)
  WHERE (is_original = true AND description IS NOT NULL);

CREATE INDEX IF NOT EXISTS idx_entity_translations_content_trgm
  ON content.entity_translations
  USING gin (lower(content) extensions.gin_trgm_ops)
  WHERE (is_original = true AND content IS NOT NULL);

CREATE INDEX IF NOT EXISTS idx_tag_translations_name_trgm
  ON content.tag_translations
  USING gin (lower(name) extensions.gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_version_parameters_label_trgm
  ON lenses.version_parameters
  USING gin (lower(label) extensions.gin_trgm_ops);

-- ── fn_search_lenses ───────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.fn_search_lenses(
  p_query    text    DEFAULT NULL,
  p_owner_id uuid    DEFAULT NULL,
  p_offset   integer DEFAULT 0,
  p_limit    integer DEFAULT 12
)
RETURNS TABLE(
  id              uuid,
  lenser_id       uuid,
  visibility      content.visibility_enum,
  status          content.content_status,
  title           text,
  description     text,
  author_profile  jsonb,
  reaction_totals jsonb,
  copy_count      integer,
  like_count      integer,
  saved_count     integer,
  tags            jsonb,
  created_at      timestamp with time zone
)
  LANGUAGE plpgsql STABLE SECURITY DEFINER
  SET search_path TO 'lenses', 'lensers', 'content', 'public'
  -- lenses.lenses / lenses.versions carry FORCE ROW LEVEL SECURITY and their
  -- SELECT policies are scoped TO anon/authenticated, not the definer (postgres).
  -- Disable row security here and let the explicit WHERE predicate below be the
  -- sole visibility authority (same approach as fn_get_lens_detail_bootstrap).
  SET row_security TO off
  AS $$
DECLARE
  v_viewer uuid;
  v_q      text;
BEGIN
  v_viewer := lensers.get_auth_lenser_id();

  -- Normalize: NULL/blank query means "no text filter" (list mode).
  -- Escape LIKE metacharacters so a literal % or _ in the query is not a wildcard.
  v_q := NULLIF(btrim(coalesce(p_query, '')), '');
  IF v_q IS NOT NULL THEN
    v_q := '%' || replace(replace(replace(v_q, '\', '\\'), '%', '\%'), '_', '\_') || '%';
  END IF;

  RETURN QUERY
  SELECT
    l.id,
    l.lenser_id,
    l.visibility,
    l.status,
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
    l.created_at
  FROM lenses.lenses l
  LEFT JOIN content.entity_translations et
    ON et.entity_id = l.id
   AND et.entity_type = 'lens'
   AND et.is_original = true
  LEFT JOIN lensers.profiles prof ON prof.id = l.lenser_id
  LEFT JOIN LATERAL (
    SELECT
      COALESCE(jsonb_object_agg(x.reaction, x.cnt), '{}')::jsonb AS reaction_totals,
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
  WHERE l.deleted_at IS NULL
    -- Optional scope to a single author's profile (profile Lenses tab / "My Lenses").
    AND (p_owner_id IS NULL OR l.lenser_id = p_owner_id)
    -- Visibility contract — mirrors lenses.lenses RLS `authenticated_select`.
    AND (
      l.lenser_id = v_viewer
      OR (
        l.status = 'published'::content.content_status
        -- Match RLS: non-owners never see content from a non-active author.
        AND EXISTS (
          SELECT 1 FROM lensers.profiles ap
          WHERE ap.id = l.lenser_id AND ap.status = 'active'
        )
        AND (
          l.visibility = 'public'::content.visibility_enum
          OR (l.visibility = 'community'::content.visibility_enum AND v_viewer IS NOT NULL)
          OR (
            l.visibility = 'followers'::content.visibility_enum
            AND v_viewer IS NOT NULL
            AND lensers.fn_viewer_follows_owner(v_viewer, l.lenser_id)
          )
        )
      )
    )
    -- Text filter across title, description, content, tag name/slug, parameter labels.
    AND (
      v_q IS NULL
      OR et.title       ILIKE v_q ESCAPE '\'
      OR et.description ILIKE v_q ESCAPE '\'
      OR et.content     ILIKE v_q ESCAPE '\'
      OR EXISTS (
        SELECT 1
        FROM content.tag_map tm
        JOIN content.tags tg ON tg.id = tm.tag_id
        LEFT JOIN content.tag_translations tt ON tt.tag_id = tg.id
        WHERE tm.entity_type = 'lens'
          AND tm.entity_id = l.id
          AND (tg.slug ILIKE v_q ESCAPE '\' OR tt.name ILIKE v_q ESCAPE '\')
      )
      OR EXISTS (
        SELECT 1
        FROM lenses.versions v
        JOIN lenses.version_parameters vp ON vp.version_id = v.id
        WHERE v.lens_id = l.id
          AND vp.label ILIKE v_q ESCAPE '\'
      )
    )
  ORDER BY l.created_at DESC
  OFFSET GREATEST(p_offset, 0)
  LIMIT  LEAST(GREATEST(p_limit, 1), 50);
END;
$$;

ALTER FUNCTION public.fn_search_lenses(text, uuid, integer, integer) OWNER TO postgres;
REVOKE ALL ON FUNCTION public.fn_search_lenses(text, uuid, integer, integer) FROM public;
GRANT EXECUTE ON FUNCTION public.fn_search_lenses(text, uuid, integer, integer) TO anon, authenticated, service_role;

-- ── fn_get_my_saved_lenses ─────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.fn_get_my_saved_lenses(
  p_offset integer DEFAULT 0,
  p_limit  integer DEFAULT 12
)
RETURNS TABLE(
  id              uuid,
  lenser_id       uuid,
  visibility      content.visibility_enum,
  status          content.content_status,
  title           text,
  description     text,
  author_profile  jsonb,
  reaction_totals jsonb,
  copy_count      integer,
  like_count      integer,
  saved_count     integer,
  tags            jsonb,
  created_at      timestamp with time zone
)
  LANGUAGE plpgsql STABLE SECURITY DEFINER
  SET search_path TO 'lenses', 'lensers', 'content', 'public'
  -- See fn_search_lenses: FORCE RLS on lenses.lenses would otherwise return zero
  -- rows for the definer role; the WHERE predicate is the visibility authority.
  SET row_security TO off
  AS $$
DECLARE
  v_viewer uuid;
BEGIN
  v_viewer := lensers.get_auth_lenser_id();
  IF v_viewer IS NULL THEN
    RETURN; -- unauthenticated: bookmarks are personal
  END IF;

  RETURN QUERY
  SELECT
    l.id,
    l.lenser_id,
    l.visibility,
    l.status,
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
    l.created_at
  FROM content.reactions r
  JOIN lenses.lenses l
    ON l.id = r.entity_id
   AND l.deleted_at IS NULL
  LEFT JOIN content.entity_translations et
    ON et.entity_id = l.id
   AND et.entity_type = 'lens'
   AND et.is_original = true
  LEFT JOIN lensers.profiles prof ON prof.id = l.lenser_id
  LEFT JOIN LATERAL (
    SELECT
      COALESCE(jsonb_object_agg(x.reaction, x.cnt), '{}')::jsonb AS reaction_totals,
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
  WHERE r.entity_type = 'lens'
    AND r.reaction = 'saved'::content.reaction_enum
    AND r.lenser_id = v_viewer
    -- Same visibility guard: a lens that turned private after you saved it drops off.
    AND (
      l.lenser_id = v_viewer
      OR (
        l.status = 'published'::content.content_status
        -- Match RLS: non-owners never see content from a non-active author.
        AND EXISTS (
          SELECT 1 FROM lensers.profiles ap
          WHERE ap.id = l.lenser_id AND ap.status = 'active'
        )
        AND (
          l.visibility = 'public'::content.visibility_enum
          OR (l.visibility = 'community'::content.visibility_enum AND v_viewer IS NOT NULL)
          OR (
            l.visibility = 'followers'::content.visibility_enum
            AND v_viewer IS NOT NULL
            AND lensers.fn_viewer_follows_owner(v_viewer, l.lenser_id)
          )
        )
      )
    )
  ORDER BY r.created_at DESC
  OFFSET GREATEST(p_offset, 0)
  LIMIT  LEAST(GREATEST(p_limit, 1), 50);
END;
$$;

ALTER FUNCTION public.fn_get_my_saved_lenses(integer, integer) OWNER TO postgres;
REVOKE ALL ON FUNCTION public.fn_get_my_saved_lenses(integer, integer) FROM public;
GRANT EXECUTE ON FUNCTION public.fn_get_my_saved_lenses(integer, integer) TO authenticated, service_role;
