-- fn_get_lens_version_detail: extend visibility check to include community lenses.
--
-- The previous function only returned version data for:
--   - lenses owned by the caller, OR
--   - public lenses with a published version
--
-- Community lenses were excluded, causing getVersion() to return null even after
-- fn_get_lens_detail_bootstrap correctly resolved the head_version_id.

DROP FUNCTION IF EXISTS public.fn_get_lens_version_detail(uuid);

CREATE FUNCTION public.fn_get_lens_version_detail(p_version_id uuid)
RETURNS TABLE(
  id               uuid,
  lens_id          uuid,
  version_number   integer,
  status           text,
  template_body    text,
  changelog        text,
  parent_version_id uuid,
  published_at     timestamptz,
  created_at       timestamptz
)
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path TO 'public', 'lenses', 'lensers'
AS $$
  SELECT
    v.id, v.lens_id, v.version_number, v.status::text,
    v.template_body, v.changelog, v.parent_version_id,
    v.published_at, v.created_at
  FROM lenses.versions v
  JOIN lenses.lenses l ON l.id = v.lens_id
  WHERE v.id = p_version_id
    AND (
      l.lenser_id = lensers.get_auth_lenser_id()
      OR (l.visibility IN ('public', 'community') AND v.status = 'published')
    );
$$;

ALTER FUNCTION public.fn_get_lens_version_detail(uuid) OWNER TO postgres;
GRANT ALL ON FUNCTION public.fn_get_lens_version_detail(uuid) TO anon, authenticated, service_role;
