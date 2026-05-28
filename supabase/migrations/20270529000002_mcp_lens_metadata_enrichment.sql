-- Enrich MCP lens RPCs with human-readable metadata (title, description, content,
-- tags) so AI models can introspect lenses without follow-up calls. Replaces the
-- minimal id/visibility/status output with the full vw_lenses projection + tags.

-- ─────────────────────────────────────────────────────────────────────────────
-- Helper: fetch tags for a lens (label + slug for AI legibility)
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.fn_mcp_lens_tags(p_lens_id uuid)
RETURNS jsonb
LANGUAGE sql SECURITY DEFINER STABLE
SET search_path TO 'content', 'public'
AS $$
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
           'id',   t.id,
           'slug', t.slug
         ) ORDER BY t.slug), '[]'::jsonb)
    FROM content.tag_map tm
    JOIN content.tags t ON t.id = tm.tag_id
   WHERE tm.entity_type = 'lens'
     AND tm.entity_id   = p_lens_id;
$$;
ALTER FUNCTION public.fn_mcp_lens_tags(uuid) OWNER TO postgres;
REVOKE ALL    ON FUNCTION public.fn_mcp_lens_tags(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.fn_mcp_lens_tags(uuid) TO authenticated, service_role;

-- ─────────────────────────────────────────────────────────────────────────────
-- fn_mcp_lens_get — full single-lens view with title, content, parameters, tags
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.fn_mcp_lens_get(p_lens_id uuid)
RETURNS jsonb
LANGUAGE sql SECURITY DEFINER STABLE
SET search_path TO 'lenses', 'content', 'public'
AS $$
  SELECT jsonb_build_object(
    'id', v.id,
    'lenser_id', v.lenser_id,
    'title', v.title,
    'description', v.description,
    'content', v.content,
    'language_code', v.language_code,
    'visibility', v.visibility::text,
    'status', v.status::text,
    'author', jsonb_build_object(
      'handle', v.author_handle,
      'display_name', v.author_display_name,
      'avatar_url', v.author_avatar_url
    ),
    'created_at', v.created_at,
    'updated_at', v.updated_at,
    'head_version_id', v.latest_version_id,
    'head_version', (
      SELECT jsonb_build_object(
        'id', ver.id,
        'version_number', ver.version_number,
        'semver', ver.semver,
        'template_body', ver.template_body,
        'input_contract', ver.input_contract,
        'output_contract', ver.output_contract,
        'created_at', ver.created_at,
        'parameters', COALESCE((
          SELECT jsonb_agg(jsonb_build_object(
                   'id', vp.id,
                   'label', vp.label,
                   'optional', vp.optional
                 ) ORDER BY vp.label)
            FROM lenses.version_parameters vp
           WHERE vp.version_id = ver.id
        ), '[]'::jsonb)
      )
      FROM lenses.versions ver WHERE ver.id = v.latest_version_id
    ),
    'tags', public.fn_mcp_lens_tags(v.id)
  )
  FROM lenses.vw_lenses v
  WHERE v.id = p_lens_id
  LIMIT 1;
$$;
ALTER FUNCTION public.fn_mcp_lens_get(uuid) OWNER TO postgres;
REVOKE ALL    ON FUNCTION public.fn_mcp_lens_get(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.fn_mcp_lens_get(uuid) TO authenticated, service_role;

-- ─────────────────────────────────────────────────────────────────────────────
-- fn_mcp_lens_list — list with title, description, language, author, tags
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.fn_mcp_lens_list(
  p_limit            integer DEFAULT 20,
  p_offset           integer DEFAULT 0,
  p_visibility       text    DEFAULT NULL,
  p_status           text    DEFAULT NULL,
  p_lenser_id        uuid    DEFAULT NULL,
  p_include_archived boolean DEFAULT false
)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER STABLE
SET search_path TO 'lenses', 'content', 'public'
AS $$
DECLARE
  v_total bigint;
  v_rows  jsonb;
BEGIN
  SELECT count(*)
    INTO v_total
    FROM lenses.vw_lenses v
   WHERE (p_include_archived OR v.status::text <> 'archived')
     AND (p_visibility IS NULL OR v.visibility::text = p_visibility)
     AND (p_status     IS NULL OR v.status::text     = p_status)
     AND (p_lenser_id  IS NULL OR v.lenser_id        = p_lenser_id);

  SELECT COALESCE(jsonb_agg(row ORDER BY (row->>'created_at') DESC), '[]'::jsonb)
    INTO v_rows
    FROM (
      SELECT jsonb_build_object(
               'id', v.id,
               'lenser_id', v.lenser_id,
               'title', v.title,
               'description', v.description,
               'language_code', v.language_code,
               'visibility', v.visibility::text,
               'status', v.status::text,
               'author_handle', v.author_handle,
               'created_at', v.created_at,
               'updated_at', v.updated_at,
               'head_version_id', v.latest_version_id,
               'tags', public.fn_mcp_lens_tags(v.id)
             ) AS row
        FROM lenses.vw_lenses v
       WHERE (p_include_archived OR v.status::text <> 'archived')
         AND (p_visibility IS NULL OR v.visibility::text = p_visibility)
         AND (p_status     IS NULL OR v.status::text     = p_status)
         AND (p_lenser_id  IS NULL OR v.lenser_id        = p_lenser_id)
       ORDER BY v.created_at DESC
       LIMIT GREATEST(p_limit, 0) OFFSET GREATEST(p_offset, 0)
    ) sub;

  RETURN jsonb_build_object('data', v_rows, 'count', v_total);
END;
$$;
ALTER FUNCTION public.fn_mcp_lens_list(integer, integer, text, text, uuid, boolean) OWNER TO postgres;
REVOKE ALL    ON FUNCTION public.fn_mcp_lens_list(integer, integer, text, text, uuid, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.fn_mcp_lens_list(integer, integer, text, text, uuid, boolean) TO authenticated, service_role;

-- ─────────────────────────────────────────────────────────────────────────────
-- fn_mcp_lens_search — search title+description+content (uses vw_lenses)
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.fn_mcp_lens_search(
  p_query      text,
  p_visibility text    DEFAULT NULL,
  p_limit      integer DEFAULT 20,
  p_offset     integer DEFAULT 0
)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER STABLE
SET search_path TO 'lenses', 'content', 'public'
AS $$
DECLARE
  v_total bigint;
  v_rows  jsonb;
  v_q     text := lower(trim(p_query));
BEGIN
  SELECT count(*)
    INTO v_total
    FROM lenses.vw_lenses v
   WHERE v.status::text <> 'archived'
     AND (p_visibility IS NULL OR v.visibility::text = p_visibility)
     AND (
       lower(coalesce(v.title, ''))       LIKE '%' || v_q || '%'
       OR lower(coalesce(v.description, '')) LIKE '%' || v_q || '%'
       OR lower(coalesce(v.content, ''))     LIKE '%' || v_q || '%'
     );

  SELECT COALESCE(jsonb_agg(row ORDER BY (row->>'created_at') DESC), '[]'::jsonb)
    INTO v_rows
    FROM (
      SELECT jsonb_build_object(
               'id', v.id,
               'title', v.title,
               'description', v.description,
               'language_code', v.language_code,
               'visibility', v.visibility::text,
               'author_handle', v.author_handle,
               'created_at', v.created_at,
               'head_version_id', v.latest_version_id,
               'tags', public.fn_mcp_lens_tags(v.id)
             ) AS row
        FROM lenses.vw_lenses v
       WHERE v.status::text <> 'archived'
         AND (p_visibility IS NULL OR v.visibility::text = p_visibility)
         AND (
           lower(coalesce(v.title, ''))       LIKE '%' || v_q || '%'
           OR lower(coalesce(v.description, '')) LIKE '%' || v_q || '%'
           OR lower(coalesce(v.content, ''))     LIKE '%' || v_q || '%'
         )
       ORDER BY v.created_at DESC
       LIMIT GREATEST(p_limit, 0) OFFSET GREATEST(p_offset, 0)
    ) sub;

  RETURN jsonb_build_object('data', v_rows, 'count', v_total);
END;
$$;
ALTER FUNCTION public.fn_mcp_lens_search(text, text, integer, integer) OWNER TO postgres;
REVOKE ALL    ON FUNCTION public.fn_mcp_lens_search(text, text, integer, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.fn_mcp_lens_search(text, text, integer, integer) TO authenticated, service_role;

-- ─────────────────────────────────────────────────────────────────────────────
-- fn_mcp_lens_resolve_template — add title + description so lens_run output
-- has enough context for the AI model to know what it's executing
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.fn_mcp_lens_resolve_template(
  p_lens_id    uuid,
  p_version_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER STABLE
SET search_path TO 'lenses', 'content', 'public'
AS $$
DECLARE
  v_version_id  uuid;
  v_body        text;
  v_params      jsonb;
  v_title       text;
  v_description text;
BEGIN
  IF p_version_id IS NOT NULL THEN
    v_version_id := p_version_id;
  ELSE
    SELECT latest_version_id INTO v_version_id
      FROM lenses.vw_lenses
     WHERE id = p_lens_id;
    IF v_version_id IS NULL THEN
      RETURN NULL;
    END IF;
  END IF;

  SELECT template_body INTO v_body FROM lenses.versions WHERE id = v_version_id;
  IF v_body IS NULL THEN
    RETURN NULL;
  END IF;

  SELECT v.title, v.description
    INTO v_title, v_description
    FROM lenses.vw_lenses v
   WHERE v.id = p_lens_id;

  SELECT COALESCE(jsonb_agg(jsonb_build_object(
           'id', vp.id, 'label', vp.label, 'optional', vp.optional
         ) ORDER BY vp.label), '[]'::jsonb)
    INTO v_params
    FROM lenses.version_parameters vp
   WHERE vp.version_id = v_version_id;

  RETURN jsonb_build_object(
    'lens_id', p_lens_id,
    'version_id', v_version_id,
    'title', v_title,
    'description', v_description,
    'template_body', v_body,
    'parameters', v_params
  );
END;
$$;
ALTER FUNCTION public.fn_mcp_lens_resolve_template(uuid, uuid) OWNER TO postgres;
REVOKE ALL    ON FUNCTION public.fn_mcp_lens_resolve_template(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.fn_mcp_lens_resolve_template(uuid, uuid) TO authenticated, service_role;
