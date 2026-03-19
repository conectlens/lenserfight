-- Migration: fn_create_tag
-- Adds a language-aware SECURITY DEFINER RPC for atomic tag + translation creation.
-- Replaces direct table INSERTs from the frontend which fail RLS on tag_translations
-- (policy: tag_translations_service_write only allows service_role for INSERT).

CREATE OR REPLACE FUNCTION public.fn_create_tag(
  p_name          TEXT,
  p_slug          TEXT,
  p_language_code TEXT DEFAULT 'en'
)
RETURNS TABLE (id UUID, slug TEXT, name TEXT, visibility TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, content
AS $$
DECLARE
  v_tag_id uuid;
BEGIN
  IF btrim(p_name) = '' OR p_name IS NULL THEN
    RAISE EXCEPTION 'Tag name is required';
  END IF;
  IF btrim(p_slug) = '' OR p_slug IS NULL THEN
    RAISE EXCEPTION 'Tag slug is required';
  END IF;

  -- Idempotent insert of base tag
  INSERT INTO content.tags (slug, visibility)
  VALUES (btrim(p_slug), 'public')
  ON CONFLICT ON CONSTRAINT tags_slug_key DO NOTHING;

  -- Resolve tag id (handles both new insert and pre-existing slug)
  SELECT t.id INTO v_tag_id
  FROM content.tags t
  WHERE t.slug = btrim(p_slug);

  IF v_tag_id IS NULL THEN
    RAISE EXCEPTION 'Failed to resolve tag for slug: %', p_slug;
  END IF;

  -- Idempotent insert of translation for the requested language
  INSERT INTO content.tag_translations (tag_id, language_code, name)
  VALUES (v_tag_id, btrim(p_language_code), btrim(p_name))
  ON CONFLICT ON CONSTRAINT tag_translations_tag_id_language_id_key DO NOTHING;

  -- Return resolved row from the public view
  RETURN QUERY
    SELECT v.id, v.slug, v.name, v.visibility
    FROM public.vw_tags_public_stats v
    WHERE v.id = v_tag_id;
END;
$$;

REVOKE ALL ON FUNCTION public.fn_create_tag(text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.fn_create_tag(text, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.fn_create_tag(text, text, text) TO service_role;
