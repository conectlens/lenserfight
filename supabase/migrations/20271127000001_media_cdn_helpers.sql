-- =============================================================================
-- Phase CC — Smooth Generative Media: CDN helpers
-- =============================================================================
-- 1. fn_get_media_thumbnail_url — returns CDN URL with image transforms
-- =============================================================================

CREATE OR REPLACE FUNCTION public.fn_get_media_thumbnail_url(
  p_media_id UUID,
  p_width    INT DEFAULT 400
)
RETURNS TEXT
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = media, public
AS $$
DECLARE
  v_obj    RECORD;
  v_base   TEXT;
  v_url    TEXT;
BEGIN
  SELECT media_type, bucket, object_key, external_url, lifecycle_state
    INTO v_obj
    FROM media.objects
   WHERE id = p_media_id;

  IF NOT FOUND OR v_obj.lifecycle_state = 'deleted' THEN
    RETURN NULL;
  END IF;

  -- Use external_url as-is for non-storage objects
  IF v_obj.external_url IS NOT NULL THEN
    RETURN v_obj.external_url;
  END IF;

  -- Needs a storage object_key to generate CDN URL
  IF v_obj.bucket IS NULL OR v_obj.object_key IS NULL THEN
    RETURN NULL;
  END IF;

  v_base := current_setting('app.supabase_url', TRUE);
  IF v_base IS NULL OR v_base = '' THEN
    -- Fall back: return null so callers use original URL path
    RETURN NULL;
  END IF;

  -- Image: return webp transform URL
  IF v_obj.media_type = 'image' THEN
    v_url := v_base
      || '/storage/v1/object/public/'
      || v_obj.bucket
      || '/'
      || v_obj.object_key
      || '?width=' || p_width
      || '&format=webp&quality=80';
    RETURN v_url;
  END IF;

  -- Video and audio: return original CDN URL without transforms
  v_url := v_base
    || '/storage/v1/object/public/'
    || v_obj.bucket
    || '/'
    || v_obj.object_key;

  RETURN v_url;
END;
$$;

ALTER FUNCTION public.fn_get_media_thumbnail_url(UUID, INT)
  OWNER TO postgres;

GRANT EXECUTE ON FUNCTION public.fn_get_media_thumbnail_url(UUID, INT)
  TO authenticated, service_role, anon;

COMMENT ON FUNCTION public.fn_get_media_thumbnail_url(UUID, INT) IS
  'CC: Returns CDN URL with ?width=<n>&format=webp&quality=80 for images; '
  'original URL for video/audio; NULL if not found or deleted.';
