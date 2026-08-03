-- ============================================================================
-- Surface each lens's declared output kind on list/feed RPCs
-- ----------------------------------------------------------------------------
-- Problem
--   LensesPage's kind filter tabs (text/image/video/audio/music) read
--   `lens.outputKind`, but none of the RPCs backing its feeds
--   (fn_get_my_lenses, fn_search_lenses, fn_content_get_lenses_by_tag,
--   fn_content_get_popular_lenses, vw_lenses_public) ever selected it. The
--   field was always undefined, so the client-side filter defaulted every
--   lens to 'text' and any non-text kind filter matched nothing — which also
--   kept the infinite-scroll sentinel in view (filtered list stayed empty)
--   and triggered a request storm against fn_get_my_lenses.
--
-- Fix
--   Add lenses.fn_output_kind(lens_id), resolving the output kind from the
--   lens's latest published version (falling back to head_version_id for
--   lenses with no published version yet), matching the version-resolution
--   pattern already used by execution.trg_requests_resolve_lens_snapshot.
--   Thread it through the list RPCs as "outputKind" (quoted/camelCase) so it
--   lines up with LensViewModel without requiring a repository-side mapper —
--   these RPCs are consumed via a direct cast in LensesPage today.
-- ============================================================================

CREATE OR REPLACE FUNCTION lenses.fn_output_kind(p_lens_id uuid)
RETURNS text
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path TO 'lenses', 'content', 'pg_temp'
AS $$
  SELECT v.output_contract ->> 'kind'
  FROM lenses.versions v
  WHERE v.id = COALESCE(
    (
      SELECT pv.id FROM lenses.versions pv
      WHERE pv.lens_id = p_lens_id
        AND pv.status = 'published'::content.content_status
      ORDER BY pv.version_number DESC
      LIMIT 1
    ),
    (SELECT l.head_version_id FROM lenses.lenses l WHERE l.id = p_lens_id)
  );
$$;

ALTER FUNCTION lenses.fn_output_kind(uuid) OWNER TO postgres;
REVOKE ALL ON FUNCTION lenses.fn_output_kind(uuid) FROM public;
GRANT EXECUTE ON FUNCTION lenses.fn_output_kind(uuid) TO anon, authenticated, service_role;

-- ── vw_lenses_public — append-only column, no DROP needed ──────────────────
CREATE OR REPLACE VIEW public.vw_lenses_public AS
 SELECT pt.id,
    pt.lenser_id,
    prof.handle AS lenser_handle,
    pt.visibility,
    COALESCE(et.title, 'Untitled'::text) AS title,
    et.description,
    COALESCE(et.content, ''::text) AS content,
    jsonb_build_object('id', prof.id, 'handle', prof.handle, 'display_name', prof.display_name, 'avatar_url', prof.avatar_url) AS author_profile,
    rt.reaction_totals,
    rt.copy_count,
    rt.like_count,
    rt.saved_count,
    pt.created_at,
    tg_agg.tags,
    lenses.fn_output_kind(pt.id) AS "outputKind"
   FROM ((((lenses.lenses pt
     LEFT JOIN content.entity_translations et ON ((et.entity_id = pt.id) AND (et.entity_type = 'lens'::content.entity_type_enum) AND (et.is_original = true)))
     LEFT JOIN lensers.profiles prof ON (prof.id = pt.lenser_id))
     LEFT JOIN LATERAL ( SELECT COALESCE(jsonb_object_agg(x.reaction, x.cnt), '{}'::jsonb) AS reaction_totals,
            COALESCE((sum(
                CASE
                    WHEN (x.reaction = 'copy'::content.reaction_enum) THEN x.cnt
                    ELSE 0
                END))::integer, 0) AS copy_count,
            COALESCE((sum(
                CASE
                    WHEN (x.reaction = 'like'::content.reaction_enum) THEN x.cnt
                    ELSE 0
                END))::integer, 0) AS like_count,
            COALESCE((sum(
                CASE
                    WHEN (x.reaction = 'saved'::content.reaction_enum) THEN x.cnt
                    ELSE 0
                END))::integer, 0) AS saved_count
           FROM ( SELECT rx.reaction,
                    (count(*))::integer AS cnt
                   FROM content.reactions rx
                  WHERE ((rx.entity_type = 'lens'::content.entity_type_enum) AND (rx.entity_id = pt.id))
                  GROUP BY rx.reaction) x) rt ON (true))
     LEFT JOIN LATERAL ( SELECT COALESCE(jsonb_agg(jsonb_build_object('id', tg.id, 'slug', tg.slug, 'name', COALESCE(tn.name, tg.slug))), '[]'::jsonb) AS tags
           FROM ((content.tag_map tm
             JOIN content.tags tg ON (tg.id = tm.tag_id))
             LEFT JOIN LATERAL ( SELECT tag_translations.name
                   FROM content.tag_translations
                  WHERE (tag_translations.tag_id = tg.id)
                 LIMIT 1) tn ON (true))
          WHERE ((tm.entity_type = 'lens'::content.entity_type_enum) AND (tm.entity_id = pt.id))) tg_agg ON (true))
  WHERE ((pt.visibility = 'public'::content.visibility_enum) AND (pt.status = 'published'::content.content_status));

-- ── fn_get_my_lenses — add "outputKind" column ──────────────────────────────
DROP FUNCTION IF EXISTS public.fn_get_my_lenses(integer, integer);

CREATE FUNCTION public.fn_get_my_lenses(p_offset integer DEFAULT 0, p_limit integer DEFAULT 20)
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
  ORDER BY l.created_at DESC
  OFFSET GREATEST(p_offset, 0)
  LIMIT  LEAST(p_limit, 100);
END;
$$;

ALTER FUNCTION public.fn_get_my_lenses(integer, integer) OWNER TO postgres;
COMMENT ON FUNCTION public.fn_get_my_lenses(integer, integer) IS 'Returns all lenses (public, private, unlisted) owned by the authenticated lenser. Used by the "My Lenses" filter on LensesPage.';
GRANT ALL ON FUNCTION public.fn_get_my_lenses(integer, integer) TO anon;
GRANT ALL ON FUNCTION public.fn_get_my_lenses(integer, integer) TO authenticated;
GRANT ALL ON FUNCTION public.fn_get_my_lenses(integer, integer) TO service_role;

-- ── fn_search_lenses — add "outputKind" column ──────────────────────────────
DROP FUNCTION IF EXISTS public.fn_search_lenses(text, uuid, integer, integer);

CREATE FUNCTION public.fn_search_lenses(
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
  created_at      timestamp with time zone,
  "outputKind"    text
)
  LANGUAGE plpgsql STABLE SECURITY DEFINER
  SET search_path TO 'lenses', 'lensers', 'content', 'public'
  SET row_security TO off
  AS $$
DECLARE
  v_viewer uuid;
  v_q      text;
BEGIN
  v_viewer := lensers.get_auth_lenser_id();

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
    AND (p_owner_id IS NULL OR l.lenser_id = p_owner_id)
    AND (
      l.lenser_id = v_viewer
      OR (
        l.status = 'published'::content.content_status
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

-- ── fn_content_get_lenses_by_tag — add "outputKind" column ──────────────────
DROP FUNCTION IF EXISTS public.fn_content_get_lenses_by_tag(text, text, integer, integer);

CREATE FUNCTION public.fn_content_get_lenses_by_tag(
  p_tag_slug text, p_sort text DEFAULT 'newest'::text,
  p_limit integer DEFAULT 20, p_offset integer DEFAULT 0
)
RETURNS TABLE(
  id uuid, lenser_id uuid, visibility content.visibility_enum, title text,
  description text, author_profile jsonb, reaction_totals jsonb,
  copy_count integer, like_count integer, saved_count integer, tags jsonb,
  created_at timestamp with time zone, "outputKind" text
)
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public', 'content', 'lensers'
    AS $$
  WITH matched_ids AS (
    SELECT DISTINCT tm.entity_id AS prompt_id
    FROM content.tag_map tm
    JOIN content.tags tg ON tg.id = tm.tag_id AND tg.slug = p_tag_slug
    WHERE tm.entity_type = 'lens'
    LIMIT 1000
  )
  SELECT
    v.id, v.lenser_id, v.visibility, v.title, v.description,
    v.author_profile, v.reaction_totals, v.copy_count, v.like_count,
    v.saved_count, v.tags, v.created_at, v."outputKind"
  FROM matched_ids m
  JOIN public.vw_lenses_public v ON v.id = m.prompt_id
  ORDER BY
    CASE WHEN p_sort = 'newest' THEN v.created_at END DESC,
    CASE WHEN p_sort IN ('trending', 'popular') THEN v.copy_count END DESC NULLS LAST,
    CASE WHEN p_sort IN ('trending', 'popular') THEN v.like_count END DESC NULLS LAST
  LIMIT  LEAST(p_limit, 50)
  OFFSET GREATEST(p_offset, 0);
$$;

ALTER FUNCTION public.fn_content_get_lenses_by_tag(text, text, integer, integer) OWNER TO postgres;
GRANT ALL ON FUNCTION public.fn_content_get_lenses_by_tag(text, text, integer, integer) TO anon;
GRANT ALL ON FUNCTION public.fn_content_get_lenses_by_tag(text, text, integer, integer) TO authenticated;
GRANT ALL ON FUNCTION public.fn_content_get_lenses_by_tag(text, text, integer, integer) TO service_role;

-- ── fn_content_get_popular_lenses — add "outputKind" column ─────────────────
DROP FUNCTION IF EXISTS public.fn_content_get_popular_lenses(integer, integer);

CREATE FUNCTION public.fn_content_get_popular_lenses(p_limit integer DEFAULT 20, p_offset integer DEFAULT 0)
RETURNS TABLE(
  id uuid, lenser_id uuid, visibility content.visibility_enum, title text,
  description text, author_profile jsonb, reaction_totals jsonb,
  copy_count integer, like_count integer, saved_count integer, tags jsonb,
  created_at timestamp with time zone, "outputKind" text
)
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public', 'lenses', 'content', 'lensers'
    AS $$
WITH
  candidates AS (
    SELECT pt.id, pt.created_at
    FROM lenses.lenses pt
    WHERE pt.visibility = 'public' AND pt.status = 'published'
    ORDER BY pt.created_at DESC
    LIMIT 5000
  ),
  reaction_agg AS (
    SELECT r.entity_id AS prompt_id,
      COUNT(*) FILTER (WHERE r.reaction = 'copy':: content.reaction_enum) AS copy_count,
      COUNT(*) FILTER (WHERE r.reaction = 'like':: content.reaction_enum) AS like_count,
      COUNT(*) FILTER (WHERE r.reaction = 'saved'::content.reaction_enum) AS saved_count
    FROM content.reactions r
    WHERE r.entity_type = 'lens'
      AND r.entity_id IN (SELECT id FROM candidates)
    GROUP BY r.entity_id
  ),
  ranked AS (
    SELECT
      c.id,
      log(GREATEST(1,
        4.0 * COALESCE(r.copy_count,  0)
      + 2.0 * COALESCE(r.like_count,  0)
      + 1.0 * COALESCE(r.saved_count, 0)
      )) / pow(EXTRACT(epoch FROM now() - c.created_at) / 3600.0 + 2, 1.5) AS hot_score
    FROM candidates c
    LEFT JOIN reaction_agg r ON r.prompt_id = c.id
    ORDER BY hot_score DESC
    LIMIT  LEAST(p_limit,  50)
    OFFSET GREATEST(p_offset, 0)
  )
SELECT
  v.id, v.lenser_id, v.visibility, v.title, v.description,
  v.author_profile, v.reaction_totals, v.copy_count, v.like_count,
  v.saved_count, v.tags, v.created_at, v."outputKind"
FROM ranked rk
JOIN public.vw_lenses_public v ON v.id = rk.id
ORDER BY rk.hot_score DESC;
$$;

ALTER FUNCTION public.fn_content_get_popular_lenses(integer, integer) OWNER TO postgres;
GRANT ALL ON FUNCTION public.fn_content_get_popular_lenses(integer, integer) TO anon;
GRANT ALL ON FUNCTION public.fn_content_get_popular_lenses(integer, integer) TO authenticated;
GRANT ALL ON FUNCTION public.fn_content_get_popular_lenses(integer, integer) TO service_role;

-- ── fn_content_get_personal_lenses — add "outputKind" column ────────────────
-- Backs CreateBattleWizard's own-lens picker (Step 1, taskSource === 'lens'),
-- which also reads lens.outputKind to scope the model list to the lens's
-- declared output modality.
DROP FUNCTION IF EXISTS public.fn_content_get_personal_lenses(integer, integer);

CREATE FUNCTION public.fn_content_get_personal_lenses(p_limit integer DEFAULT 20, p_offset integer DEFAULT 0)
RETURNS TABLE(
  id uuid, personal_score double precision, hot_score double precision,
  primary_language text, author_profile jsonb, tags jsonb,
  reaction_totals jsonb, title text, description text,
  created_at timestamp with time zone, "outputKind" text
)
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public', 'lenses', 'content', 'lensers', 'auth'
    AS $$
WITH
  current_lenser AS (
    SELECT p.id, COALESCE(lp.language, 'en') AS preferred_language, p.user_id
    FROM lensers.profiles p
    LEFT JOIN lensers.preferences lp ON lp.lenser_id = p.id
    WHERE p.user_id = auth.uid()
    LIMIT 1
  ),
  interest_tags AS (
    SELECT tf.tag_id
    FROM lensers.tag_follows tf
    WHERE tf.lenser_id = (SELECT id FROM current_lenser)
    UNION
    SELECT xcl.equivalent_tag_id
    FROM lensers.tag_follows tf
    JOIN content.vw_tag_cross_lang xcl ON xcl.source_tag_id = tf.tag_id
    WHERE tf.lenser_id = (SELECT id FROM current_lenser)
    UNION
    SELECT DISTINCT tm.tag_id
    FROM content.reactions r
    JOIN lenses.lenses   pt2 ON pt2.id = r.entity_id
    JOIN content.tag_map tm  ON tm.entity_id = pt2.id AND tm.entity_type = 'lens'
    WHERE r.entity_type = 'lens'
      AND r.lenser_id   = (SELECT user_id FROM current_lenser)
      AND r.created_at  > now() - interval '30 days'
  ),
  candidates AS (
    SELECT pt.id, pt.created_at, pt.lenser_id
    FROM lenses.lenses pt
    WHERE pt.visibility = 'public'
      AND pt.status     = 'published'
      AND (SELECT id FROM current_lenser) IS NOT NULL
    ORDER BY pt.created_at DESC
    LIMIT 5000
  ),
  reaction_agg AS (
    SELECT r.entity_id AS prompt_id,
      COUNT(*) FILTER (WHERE r.reaction = 'copy':: content.reaction_enum) AS copy_count,
      COUNT(*) FILTER (WHERE r.reaction = 'like':: content.reaction_enum) AS like_count,
      COUNT(*) FILTER (WHERE r.reaction = 'saved'::content.reaction_enum) AS saved_count
    FROM content.reactions r
    WHERE r.entity_type = 'lens'
      AND r.entity_id IN (SELECT id FROM candidates)
    GROUP BY r.entity_id
  ),
  preliminary_scores AS (
    SELECT
      c.id,
      c.lenser_id,
      et.language_code AS primary_language,
      log(GREATEST(1,
        4.0 * COALESCE(r.copy_count,  0)
      + 2.0 * COALESCE(r.like_count,  0)
      + 1.0 * COALESCE(r.saved_count, 0)
      )) / pow(EXTRACT(epoch FROM now() - c.created_at) / 3600.0 + 2, 1.5) AS hot_score,
      (
        0.30 * COALESCE((
          SELECT COUNT(*)::float / GREATEST((SELECT COUNT(*) FROM interest_tags), 1)
          FROM content.tag_map tm
          JOIN interest_tags it ON it.tag_id = tm.tag_id
          WHERE tm.entity_type = 'lens' AND tm.entity_id = c.id
        ), 0.0)
        + 0.25 * CASE
            WHEN et.language_code = (SELECT preferred_language FROM current_lenser) THEN 1.0
            ELSE 0.0
          END
        + 0.20 * LEAST(
            log(GREATEST(1,
              4.0 * COALESCE(r.copy_count,  0)
            + 2.0 * COALESCE(r.like_count,  0)
            + 1.0 * COALESCE(r.saved_count, 0)
            )) / pow(EXTRACT(epoch FROM now() - c.created_at) / 3600.0 + 2, 1.5)
            / 2.0, 1.0)
        + 0.10 * CASE WHEN fa.target_profile_id IS NOT NULL THEN 1.0 ELSE 0.0 END
      ) AS preliminary_score
    FROM candidates c
    LEFT JOIN reaction_agg r ON r.prompt_id = c.id
    LEFT JOIN content.entity_translations et
           ON et.entity_id   = c.id
          AND et.entity_type = 'lens'
          AND et.is_original = true
    LEFT JOIN lensers.relationships fa
           ON fa.source_profile_id = (SELECT id FROM current_lenser)
          AND fa.target_profile_id = c.lenser_id
          AND fa.status = 'accepted'
    WHERE c.id NOT IN (
      SELECT target_id FROM content.reports
      WHERE target_type = 'lens'::content.entity_type_enum
      GROUP BY target_id HAVING COUNT(DISTINCT reporter_id) >= 3
    )
    ORDER BY preliminary_score DESC
    LIMIT LEAST(p_limit, 50) * 2
  ),
  candidate_scores AS (
    SELECT
      ps.id,
      ps.primary_language,
      ps.hot_score,
      (
        ps.preliminary_score
        + 0.15 * LEAST(COALESCE(ls.lenser_score, 0.0) / 5.0, 1.0)
      ) AS personal_score
    FROM preliminary_scores ps
    LEFT JOIN lensers.vw_lensers_score ls ON ls.lenser_id = ps.lenser_id
    ORDER BY personal_score DESC
    LIMIT  LEAST(p_limit,  50)
    OFFSET GREATEST(p_offset, 0)
  )
SELECT
  v.id, c.personal_score, c.hot_score, c.primary_language,
  v.author_profile, v.tags, v.reaction_totals, v.title, v.description, v.created_at,
  v."outputKind"
FROM candidate_scores c
JOIN public.vw_lenses_public v ON v.id = c.id
ORDER BY c.personal_score DESC;
$$;

ALTER FUNCTION public.fn_content_get_personal_lenses(integer, integer) OWNER TO postgres;
GRANT ALL ON FUNCTION public.fn_content_get_personal_lenses(integer, integer) TO anon;
GRANT ALL ON FUNCTION public.fn_content_get_personal_lenses(integer, integer) TO authenticated;
GRANT ALL ON FUNCTION public.fn_content_get_personal_lenses(integer, integer) TO service_role;
