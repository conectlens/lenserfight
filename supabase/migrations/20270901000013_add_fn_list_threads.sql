-- fn_list_threads was called in threadsRepository.getByLenser(includePrivate=true)
-- but was never defined. It only fires when the viewer IS the profile owner,
-- so it returns the current authenticated user's own threads (all visibilities).
-- title, content, lenser_handle are pre-joined from entity_translations and
-- lensers.profiles so private threads hydrate correctly without a second
-- round-trip to vw_content_threads_public (which only exposes public ones).

DROP FUNCTION IF EXISTS public.fn_list_threads(uuid, int, text);

CREATE OR REPLACE FUNCTION public.fn_list_threads(
  p_cursor   uuid DEFAULT NULL,
  p_limit    int  DEFAULT 20,
  p_tag_slug text DEFAULT NULL
) RETURNS TABLE(
  id               uuid,
  author_lenser_id uuid,
  lenser_id        uuid,
  visibility       text,
  title            text,
  content          text,
  lenser_handle    text,
  created_at       timestamptz,
  updated_at       timestamptz,
  reply_count      int,
  view_count       int,
  thumbnail_url    text,
  linked_lens_id   uuid,
  lens_data        jsonb
)
  LANGUAGE sql STABLE SECURITY DEFINER
  SET search_path TO 'public', 'content', 'lensers'
AS $$
  SELECT
    t.id,
    t.lenser_id  AS author_lenser_id,
    t.lenser_id,
    t.visibility::text,
    COALESCE(et.title, 'Untitled') AS title,
    COALESCE(et.content, '')       AS content,
    prof.handle                    AS lenser_handle,
    t.created_at,
    t.updated_at,
    t.reply_count,
    t.view_count,
    t.thumbnail_url,
    t.linked_lens_id,
    t.lens_data
  FROM content.threads t
  LEFT JOIN content.entity_translations et
         ON et.entity_id   = t.id
        AND et.entity_type = 'thread'::content.entity_type_enum
        AND et.is_original = true
  LEFT JOIN lensers.profiles prof ON prof.id = t.lenser_id
  WHERE t.lenser_id = lensers.get_auth_lenser_id()
    AND (
      p_cursor IS NULL
      OR t.created_at < (SELECT ct.created_at FROM content.threads ct WHERE ct.id = p_cursor)
    )
    AND (
      p_tag_slug IS NULL
      OR EXISTS (
        SELECT 1
        FROM content.tag_map tm
        JOIN content.tags tg ON tg.id = tm.tag_id
        WHERE tm.entity_id   = t.id
          AND tm.entity_type = 'thread'::content.entity_type_enum
          AND tg.slug = p_tag_slug
      )
    )
  ORDER BY t.created_at DESC
  LIMIT p_limit;
$$;

ALTER FUNCTION public.fn_list_threads(uuid, int, text) OWNER TO postgres;

GRANT EXECUTE ON FUNCTION public.fn_list_threads(uuid, int, text)
  TO authenticated;

COMMENT ON FUNCTION public.fn_list_threads(uuid, int, text) IS
  'Lists threads owned by the current authenticated user (all visibilities) with title, content, and lenser_handle pre-joined. Used by threadsRepository.getByLenser(includePrivate=true) when the viewer is the profile owner. Supports cursor pagination and optional tag-slug filtering. Title/content come from entity_translations so private threads hydrate correctly without a second public-view lookup.';
