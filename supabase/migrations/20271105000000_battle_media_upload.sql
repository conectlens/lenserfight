-- Phase BC — Battle media upload.
--
-- 1. Provisions the `battles-media` private storage bucket (50 MB, image/*,
--    video/*, audio/* MIME prefixes).
-- 2. Adds storage RLS so a contender can upload only under their own
--    battle_id/contender_id/* prefix, and so authenticated readers can fetch
--    media for battles whose status is voting | scoring | closed | published.
-- 3. Adds public.fn_battles_submit_media — a contender-callable RPC that
--    upserts the media columns onto battles.submissions and stamps the row
--    as 'submitted'.

-- ── 1. storage bucket ───────────────────────────────────────────────────────
-- 50 MB cap; allowed_mime_types is matched as a glob list by storage.objects
-- triggers.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'battles-media',
  'battles-media',
  false,
  52428800,
  ARRAY['image/*', 'video/*', 'audio/*']
)
ON CONFLICT (id) DO UPDATE
  SET public            = EXCLUDED.public,
      file_size_limit   = EXCLUDED.file_size_limit,
      allowed_mime_types = EXCLUDED.allowed_mime_types;

-- ── 2. storage RLS — upload + read paths ────────────────────────────────────
-- Path convention: <battle_id>/<contender_id>/<arbitrary file>
--   storage.foldername(name) returns the path segments; element 1 = battle,
--   element 2 = contender.

DROP POLICY IF EXISTS battles_media_upload ON storage.objects;
CREATE POLICY battles_media_upload ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'battles-media'
    AND auth.uid() IS NOT NULL
    AND EXISTS (
      SELECT 1
        FROM battles.contenders c
        JOIN battles.contender_entity_map cem ON cem.contender_id = c.id
       WHERE c.battle_id::text   = (storage.foldername(name))[1]
         AND c.id::text          = (storage.foldername(name))[2]
         AND cem.profile_id      = auth.uid()
    )
  );

DROP POLICY IF EXISTS battles_media_read_published ON storage.objects;
CREATE POLICY battles_media_read_published ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'battles-media'
    AND EXISTS (
      SELECT 1
        FROM battles.battles b
       WHERE b.id::text = (storage.foldername(name))[1]
         AND b.status::text IN ('voting', 'scoring', 'closed', 'published')
    )
  );

-- ── 3. fn_battles_submit_media ──────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.fn_battles_submit_media(
  p_battle_id        UUID,
  p_contender_id     UUID,
  p_media_url        TEXT,
  p_mime_type        TEXT,
  p_output_modality  TEXT
)
RETURNS battles.submissions
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, battles, extensions
AS $$
DECLARE
  v_uid       UUID := auth.uid();
  v_row       battles.submissions%ROWTYPE;
  v_is_owner  BOOLEAN;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'auth_required' USING ERRCODE = '42501';
  END IF;
  IF p_output_modality IS NULL
     OR p_output_modality NOT IN ('image', 'video', 'audio') THEN
    RAISE EXCEPTION 'invalid_output_modality: %', p_output_modality
      USING ERRCODE = '22023';
  END IF;
  IF p_media_url IS NULL OR char_length(p_media_url) = 0 THEN
    RAISE EXCEPTION 'media_url_required' USING ERRCODE = '22023';
  END IF;

  -- Caller must be the human-contender owner. AI contenders submit media
  -- via worker-side RPCs that run under service_role and do not use this
  -- entry point.
  SELECT EXISTS (
    SELECT 1
      FROM battles.contenders c
      JOIN battles.contender_entity_map cem ON cem.contender_id = c.id
     WHERE c.id          = p_contender_id
       AND c.battle_id   = p_battle_id
       AND cem.profile_id = v_uid
  )
  INTO v_is_owner;

  IF NOT v_is_owner THEN
    RAISE EXCEPTION 'contender_not_owned' USING ERRCODE = '42501';
  END IF;

  INSERT INTO battles.submissions (
    battle_id, contender_id, media_url, mime_type, output_modality, status
  ) VALUES (
    p_battle_id, p_contender_id, p_media_url, p_mime_type, p_output_modality, 'submitted'
  )
  ON CONFLICT (battle_id, contender_id) DO UPDATE
    SET media_url       = EXCLUDED.media_url,
        mime_type       = EXCLUDED.mime_type,
        output_modality = EXCLUDED.output_modality,
        status          = 'submitted',
        submitted_at    = COALESCE(battles.submissions.submitted_at, now())
  RETURNING * INTO v_row;

  RETURN v_row;
END $$;

ALTER FUNCTION public.fn_battles_submit_media(UUID, UUID, TEXT, TEXT, TEXT) OWNER TO postgres;
GRANT EXECUTE ON FUNCTION public.fn_battles_submit_media(UUID, UUID, TEXT, TEXT, TEXT)
  TO authenticated, service_role;
