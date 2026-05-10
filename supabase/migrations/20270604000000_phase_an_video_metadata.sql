-- =============================================================================
-- Phase AN — Video Generation Workflows: metadata columns + modality pricing
-- =============================================================================
-- 1. Promote video metadata (duration, dimensions) to first-class columns on
--    media.objects so queries don't need to reach into the metadata JSONB.
-- 2. Register ai.modality_pricing rows for Sora, Veo, and Kling so that
--    fn_complete_async_run() can compute credit costs on completion.
-- 3. Update fn_complete_async_run() to populate the new columns.
--
-- Ground-truth alignment:
--   - ai.models already has sora-2.0 (openai), veo-3 (google), kling-2.0 (kling)
--     from seeds/04b_ai_models.sql.
--   - media.objects stores dimensions in metadata JSONB today; AN promotes them.
--   - The existing CHECK duration_s > 0 comes from the RPC guard; we add it as
--     a table constraint so the data layer also enforces it.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. New columns on media.objects
-- ---------------------------------------------------------------------------
ALTER TABLE media.objects
  ADD COLUMN IF NOT EXISTS duration_seconds NUMERIC
    CONSTRAINT objects_duration_positive CHECK (duration_seconds IS NULL OR (duration_seconds > 0 AND duration_seconds <= 300)),
  ADD COLUMN IF NOT EXISTS video_width  INT
    CONSTRAINT objects_video_width_positive  CHECK (video_width  IS NULL OR video_width  > 0),
  ADD COLUMN IF NOT EXISTS video_height INT
    CONSTRAINT objects_video_height_positive CHECK (video_height IS NULL OR video_height > 0);

COMMENT ON COLUMN media.objects.duration_seconds IS
  'AN: Duration in seconds for video/audio media. NULL for images. Max 300 (5 min).';
COMMENT ON COLUMN media.objects.video_width IS
  'AN: Pixel width of video/image. NULL when unknown.';
COMMENT ON COLUMN media.objects.video_height IS
  'AN: Pixel height of video/image. NULL when unknown.';

-- ---------------------------------------------------------------------------
-- 2. ai.modality_pricing rows for video providers
--    Uses a CTE to resolve model UUIDs from (provider.key, model.key) pairs.
-- ---------------------------------------------------------------------------
WITH model_ref AS (
  SELECT m.id AS model_id, p.key AS provider_key, m.key AS model_key
  FROM ai.models m
  JOIN ai.providers p ON p.id = m.provider_id
  WHERE (p.key, m.key) IN (
    ('openai', 'sora-2.0'),
    ('google',  'veo-3'),
    ('kling',   'kling-2.0')
  )
),
pricing_data (provider_key, model_key, output_modality, credit_rate, rate_unit) AS (
  VALUES
    ('openai', 'sora-2.0',  'video', 0.25::NUMERIC, 'per_second'),
    ('google',  'veo-3',    'video', 0.20::NUMERIC, 'per_second'),
    ('kling',   'kling-2.0','video', 0.18::NUMERIC, 'per_second')
)
INSERT INTO ai.modality_pricing (model_id, output_modality, credit_rate, rate_unit)
SELECT mr.model_id, pd.output_modality, pd.credit_rate, pd.rate_unit
FROM pricing_data pd
JOIN model_ref mr ON mr.provider_key = pd.provider_key AND mr.model_key = pd.model_key
ON CONFLICT (model_id, output_modality) DO UPDATE
  SET credit_rate = EXCLUDED.credit_rate,
      rate_unit   = EXCLUDED.rate_unit,
      updated_at  = now();

-- ---------------------------------------------------------------------------
-- 3. Update fn_complete_async_run to populate the new columns
-- ---------------------------------------------------------------------------
-- We replace the existing function from 20260428000000_generative_media.sql.
-- Only the INSERT into media.objects changes — all other logic is preserved.
CREATE OR REPLACE FUNCTION execution.fn_complete_async_run(
  p_run_id      UUID,
  p_media_url   TEXT,
  p_mime_type   TEXT,
  p_bytes       BIGINT  DEFAULT NULL,
  p_width       INT     DEFAULT NULL,
  p_height      INT     DEFAULT NULL,
  p_duration_s  NUMERIC DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = execution, media, public
AS $$
DECLARE
  v_request_id      UUID;
  v_model_id        UUID;
  v_output_modality TEXT;
  v_media_object_id UUID;
  v_credit_cost     NUMERIC := 0;
  v_rate            NUMERIC;
  v_rate_unit       TEXT;
  v_media_type      TEXT;
BEGIN
  -- Lock the run row
  SELECT request_id INTO v_request_id
  FROM execution.runs
  WHERE id = p_run_id AND is_async = TRUE AND status = 'running'
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Run % not found or not in running/async state', p_run_id;
  END IF;

  -- Pull model_id and output_modality from the request
  SELECT model_id, output_modality
  INTO v_model_id, v_output_modality
  FROM execution.requests
  WHERE id = v_request_id;

  -- Resolve credit cost from modality_pricing
  SELECT credit_rate, rate_unit
  INTO v_rate, v_rate_unit
  FROM ai.modality_pricing
  WHERE model_id = v_model_id
    AND output_modality = COALESCE(v_output_modality, 'image')
    AND is_active = TRUE
  LIMIT 1;

  IF FOUND THEN
    v_credit_cost := CASE v_rate_unit
      WHEN 'per_image'    THEN v_rate
      WHEN 'per_second'   THEN v_rate * COALESCE(p_duration_s, 0)
      WHEN 'per_1k_chars' THEN 0
      WHEN 'per_request'  THEN v_rate
      ELSE 0
    END;
  END IF;

  -- Determine media_type for media.objects
  v_media_type := CASE
    WHEN p_mime_type LIKE 'image/%' THEN 'image'
    WHEN p_mime_type LIKE 'video/%' THEN 'video'
    WHEN p_mime_type LIKE 'audio/%' THEN 'audio'
    ELSE 'binary'
  END;

  -- Create media.objects row — AN: populate first-class dimension/duration columns
  INSERT INTO media.objects (
    bucket,
    object_key,
    external_url,
    mime_type,
    media_type,
    byte_size,
    visibility,
    lifecycle_state,
    metadata,
    request_id,
    duration_seconds,
    video_width,
    video_height
  )
  VALUES (
    'generated-media',
    'async/' || p_run_id::TEXT || '.' || split_part(p_mime_type, '/', 2),
    p_media_url,
    p_mime_type,
    v_media_type,
    p_bytes,
    'private',
    'active',
    jsonb_build_object(
      'width',      p_width,
      'height',     p_height,
      'duration_s', p_duration_s
    ),
    v_request_id,
    p_duration_s,
    p_width,
    p_height
  )
  RETURNING id INTO v_media_object_id;

  -- Write primary artifact
  INSERT INTO execution.artifacts (
    run_id,
    artifact_kind,
    content_text,
    visibility,
    is_primary_output,
    media_object_id,
    output_type
  )
  VALUES (
    p_run_id,
    COALESCE(v_output_modality, 'image')::TEXT,
    p_media_url,
    'private',
    TRUE,
    v_media_object_id,
    COALESCE(v_output_modality, 'image')
  );

  -- Mark run succeeded
  UPDATE execution.runs
  SET
    status         = 'succeeded',
    completed_at   = now(),
    latency_ms     = EXTRACT(EPOCH FROM (now() - started_at))::BIGINT * 1000,
    credit_cost    = v_credit_cost,
    billing_status = CASE WHEN v_credit_cost > 0 THEN 'pending' ELSE 'free' END
  WHERE id = p_run_id;
END;
$$;

COMMENT ON FUNCTION execution.fn_complete_async_run IS
  'AN: Updated to populate media.objects.duration_seconds, video_width, video_height. '
  'Called by poll-async-executions Edge Function when a video/audio provider signals done.';
