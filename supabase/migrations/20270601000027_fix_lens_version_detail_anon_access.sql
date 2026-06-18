-- Fix anon access to fn_get_lens_version_detail and fn_get_lens_version_parameters.
--
-- Root causes:
--
-- 1. fn_get_lens_version_detail: prior version (migration 024) lacked
--    SET row_security TO off. lenses.versions has FORCE ROW LEVEL SECURITY,
--    which blocks even the postgres superuser when row_security is on inside a
--    SECURITY DEFINER function. Result: empty set for all callers including anon
--    on public lenses.
--
-- 2. fn_get_lens_version_parameters / fn_get_version_params_with_tools: both
--    lacked SET row_security TO off AND lacked any visibility check. lenses.version_parameters
--    has FORCE RLS with no anon policy → always empty for anon users. Also a security
--    hole: any caller could enumerate parameters for private lenses by supplying a
--    known version UUID.
--
-- Visibility rules (mirrors fn_get_lens_detail_bootstrap):
--   public     → anon + authenticated, published only
--   community  → authenticated only, published only
--   followers  → accepted followers only, published only
--   private    → owner only (any status)

-- ── fn_get_lens_version_detail ────────────────────────────────────────────────

DROP FUNCTION IF EXISTS public.fn_get_lens_version_detail(uuid);

CREATE FUNCTION public.fn_get_lens_version_detail(p_version_id uuid)
RETURNS TABLE(
  id                uuid,
  lens_id           uuid,
  version_number    integer,
  status            text,
  template_body     text,
  changelog         text,
  parent_version_id uuid,
  published_at      timestamptz,
  created_at        timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public', 'lenses', 'content', 'lensers'
SET row_security TO off
AS $$
  SELECT
    v.id,
    v.lens_id,
    v.version_number,
    v.status::text,
    v.template_body,
    v.changelog,
    v.parent_version_id,
    v.published_at,
    v.created_at
  FROM lenses.versions v
  JOIN lenses.lenses  l ON l.id = v.lens_id
  WHERE v.id = p_version_id
    AND (
      -- Owner sees their own versions regardless of status or visibility
      l.lenser_id = lensers.get_auth_lenser_id()
      -- Public lenses: everyone (anon + authenticated), published only
      OR (
        l.visibility = 'public'::content.visibility_enum
        AND v.status  = 'published'::content.content_status
      )
      -- Community lenses: authenticated users, published only
      OR (
        l.visibility = 'community'::content.visibility_enum
        AND v.status  = 'published'::content.content_status
        AND lensers.get_auth_lenser_id() IS NOT NULL
      )
      -- Followers-only lenses: accepted followers, published only
      OR (
        l.visibility = 'followers'::content.visibility_enum
        AND v.status  = 'published'::content.content_status
        AND lensers.get_auth_lenser_id() IS NOT NULL
        AND lensers.fn_viewer_follows_owner(lensers.get_auth_lenser_id(), l.lenser_id)
      )
    );
$$;

ALTER FUNCTION public.fn_get_lens_version_detail(uuid) OWNER TO postgres;
GRANT EXECUTE ON FUNCTION public.fn_get_lens_version_detail(uuid) TO anon, authenticated, service_role;

-- ── fn_get_version_params_with_tools ─────────────────────────────────────────
-- Visibility-gated helper. Callers (fn_get_lens_version_parameters) rely on this.

DROP FUNCTION IF EXISTS lenses.fn_get_version_params_with_tools(uuid);

CREATE FUNCTION lenses.fn_get_version_params_with_tools(p_version_id uuid)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'lenses', 'content', 'lensers', 'public'
SET row_security TO off
AS $$
  SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object(
        'id',         vp.id,
        'version_id', vp.version_id,
        'label',      vp.label,
        'tool_id',    vp.tool_id,
        'optional',   COALESCE(vp.optional, false),
        'tool', jsonb_build_object(
          'id',                t.id,
          'key',               t.key,
          'label',             t.label,
          'description',       t.description,
          'category',          t.category,
          'type',              t.type,
          'required',          t.required,
          'min_length',        t.min_length,
          'max_length',        t.max_length,
          'placeholder',       t.placeholder,
          'help_text',         t.help_text,
          'validation_schema', t.validation_schema,
          'options',           COALESCE(vp.options, t.options),
          'sort_order',        t.sort_order,
          'is_system',         t.is_system,
          'icon',              t.icon,
          'color',             t.color
        )
      )
      ORDER BY t.sort_order, vp.label
    ),
    '[]'::jsonb
  )
  FROM lenses.version_parameters vp
  JOIN lenses.tools               t  ON t.id  = vp.tool_id
  JOIN lenses.versions            v  ON v.id  = vp.version_id
  JOIN lenses.lenses              l  ON l.id  = v.lens_id
  WHERE vp.version_id = p_version_id
    AND (
      l.lenser_id = lensers.get_auth_lenser_id()
      OR (
        l.visibility = 'public'::content.visibility_enum
        AND v.status  = 'published'::content.content_status
      )
      OR (
        l.visibility = 'community'::content.visibility_enum
        AND v.status  = 'published'::content.content_status
        AND lensers.get_auth_lenser_id() IS NOT NULL
      )
      OR (
        l.visibility = 'followers'::content.visibility_enum
        AND v.status  = 'published'::content.content_status
        AND lensers.get_auth_lenser_id() IS NOT NULL
        AND lensers.fn_viewer_follows_owner(lensers.get_auth_lenser_id(), l.lenser_id)
      )
    );
$$;

ALTER FUNCTION lenses.fn_get_version_params_with_tools(uuid) OWNER TO postgres;
GRANT EXECUTE ON FUNCTION lenses.fn_get_version_params_with_tools(uuid) TO anon, authenticated, service_role;

-- ── fn_get_lens_version_parameters (public wrapper) ──────────────────────────

DROP FUNCTION IF EXISTS public.fn_get_lens_version_parameters(uuid);

CREATE FUNCTION public.fn_get_lens_version_parameters(p_version_id uuid)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public', 'lenses', 'lensers'
SET row_security TO off
AS $$
  SELECT lenses.fn_get_version_params_with_tools(p_version_id);
$$;

ALTER FUNCTION public.fn_get_lens_version_parameters(uuid) OWNER TO postgres;
GRANT EXECUTE ON FUNCTION public.fn_get_lens_version_parameters(uuid) TO anon, authenticated, service_role;
