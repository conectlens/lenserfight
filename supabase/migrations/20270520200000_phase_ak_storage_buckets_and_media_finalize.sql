-- =============================================================================
-- Phase AK — Generative Media Foundation: storage buckets + sync finalize RPC
-- =============================================================================
-- Provides the runtime substrate the media providers need:
--
--   1. `generated-media` storage bucket (private; service_role writes; owner reads)
--      — name aligns with the existing fn_complete_async_run() target so async
--        and sync providers share one canonical bucket.
--   2. `public-assets` storage bucket (public read; service_role writes)
--      — already referenced by base-schema RLS policies; we only insert the row.
--   3. fn_media_finalize_sync_upload() — thin wrapper around the existing
--      fn_complete_async_run path for SYNCHRONOUS providers (TTS, sync image)
--      that hand back a buffer instead of a task ID. Reuses the credit-cost
--      and artifact-write logic by sharing a private helper.
--
-- Ground-truth alignment:
--   - Existing fn_complete_async_run (20260428000000_generative_media.sql) writes
--     to bucket 'generated-media' — we register that name, not 'ai-media'.
--   - media.objects already has visibility + lifecycle_state columns; no schema
--     change needed.
--   - artifact_medias join model is preserved; this RPC returns the new
--     media_object_id so callers can wire it however they need.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. Storage buckets (idempotent INSERT … ON CONFLICT)
-- ---------------------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  (
    'generated-media', 'generated-media', FALSE, 52428800,  -- 50 MB
    ARRAY[
      'image/png','image/jpeg','image/webp','image/gif',
      'video/mp4','video/webm','video/quicktime',
      'audio/mpeg','audio/wav','audio/ogg','audio/mp4'
    ]
  ),
  (
    'public-assets', 'public-assets', TRUE, 10485760,         -- 10 MB
    ARRAY['image/png','image/jpeg','image/webp','image/svg+xml']
  )
ON CONFLICT (id) DO UPDATE
SET file_size_limit    = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types,
    public             = EXCLUDED.public;

-- ---------------------------------------------------------------------------
-- 2. RLS policies for the `generated-media` bucket.
--    Reads are gated by ownership in media.objects; writes are service_role only.
--    `public-assets` already has policies in the base-schema migration
--    (auth_upload_public_assets, public_read_public_assets).
-- ---------------------------------------------------------------------------

-- Drop-and-create pattern is intentional: makes the migration re-runnable in
-- local dev where policies may already exist with stale predicates.
DROP POLICY IF EXISTS "generated_media_owner_read" ON storage.objects;
CREATE POLICY "generated_media_owner_read"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'generated-media'
    AND EXISTS (
      SELECT 1 FROM media.objects mo
      JOIN lensers.profiles p ON p.id = mo.owner_lenser_id
      WHERE mo.bucket = 'generated-media'
        AND mo.object_key = storage.objects.name
        AND p.user_id = auth.uid()
    )
  );

-- Authenticated users CANNOT directly INSERT into generated-media — the worker
-- uploads on their behalf via service_role. We deliberately add no INSERT
-- policy for this role; absence == denial under default-deny RLS.

-- ---------------------------------------------------------------------------
-- 3. fn_media_finalize_sync_upload — for sync providers
-- ---------------------------------------------------------------------------
-- Sync providers (ElevenLabs TTS, sync image gen) return the asset bytes
-- directly. The worker uploads to storage, then calls this RPC to:
--   a) insert media.objects (private, active)
--   b) insert execution.artifacts row (primary output)
--   c) compute credit cost via ai.modality_pricing (same lookup as async)
--   d) mark execution.runs as succeeded
--
-- This intentionally mirrors fn_complete_async_run's semantics so callers
-- don't need to branch on sync vs async.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION execution.fn_media_finalize_sync_upload(
  p_run_id      UUID,
  p_object_key  TEXT,
  p_mime_type   TEXT,
  p_bytes       BIGINT  DEFAULT NULL,
  p_width       INT     DEFAULT NULL,
  p_height      INT     DEFAULT NULL,
  p_duration_s  NUMERIC DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = execution, media, ai, public
AS $$
DECLARE
  v_request_id      UUID;
  v_model_id        UUID;
  v_output_modality TEXT;
  v_owner_lenser_id UUID;
  v_workspace_id    UUID;
  v_media_object_id UUID;
  v_credit_cost     NUMERIC := 0;
  v_rate            NUMERIC;
  v_rate_unit       TEXT;
  v_media_type      TEXT;
BEGIN
  -- Validate MIME type against the bucket's allowed list. We re-check at the
  -- RPC layer because storage.objects-level enforcement happens at upload
  -- time and a buggy worker might call this RPC with a mismatched type.
  IF p_mime_type IS NULL OR NOT (
    p_mime_type LIKE 'image/%' OR
    p_mime_type LIKE 'video/%' OR
    p_mime_type LIKE 'audio/%'
  ) THEN
    RAISE EXCEPTION 'Unsupported MIME type for sync media finalize: %', p_mime_type
      USING ERRCODE = 'check_violation';
  END IF;

  IF p_object_key IS NULL OR length(p_object_key) = 0 THEN
    RAISE EXCEPTION 'object_key is required'
      USING ERRCODE = 'check_violation';
  END IF;

  -- Lock the running row. Sync runs are typically `is_async = FALSE` but we
  -- accept both — the discriminator is `status = 'running'`.
  SELECT request_id
  INTO v_request_id
  FROM execution.runs
  WHERE id = p_run_id AND status = 'running'
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Run % not found or not in running state', p_run_id;
  END IF;

  -- requester_lenser_id + workspace_id live on execution.requests (not runs).
  SELECT model_id, output_modality, requester_lenser_id, workspace_id
  INTO v_model_id, v_output_modality, v_owner_lenser_id, v_workspace_id
  FROM execution.requests
  WHERE id = v_request_id;

  -- Credit cost lookup mirrors fn_complete_async_run exactly.
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

  v_media_type := CASE
    WHEN p_mime_type LIKE 'image/%' THEN 'image'
    WHEN p_mime_type LIKE 'video/%' THEN 'video'
    WHEN p_mime_type LIKE 'audio/%' THEN 'audio'
    ELSE 'binary'
  END;

  INSERT INTO media.objects (
    workspace_id,
    owner_lenser_id,
    bucket,
    object_key,
    mime_type,
    media_type,
    byte_size,
    visibility,
    lifecycle_state,
    metadata,
    request_id
  )
  VALUES (
    v_workspace_id,
    v_owner_lenser_id,
    'generated-media',
    p_object_key,
    p_mime_type,
    v_media_type,
    p_bytes,
    'private',
    'active',
    jsonb_build_object(
      'width', p_width,
      'height', p_height,
      'duration_s', p_duration_s,
      'finalize_path', 'sync'
    ),
    v_request_id
  )
  RETURNING id INTO v_media_object_id;

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
    NULL,                       -- sync uploads have no external_url
    'private',
    TRUE,
    v_media_object_id,
    COALESCE(v_output_modality, 'image')
  );

  UPDATE execution.runs
  SET status         = 'succeeded',
      completed_at   = now(),
      latency_ms     = EXTRACT(EPOCH FROM (now() - started_at))::BIGINT * 1000,
      credit_cost    = v_credit_cost,
      billing_status = CASE WHEN v_credit_cost > 0 THEN 'pending' ELSE 'free' END
  WHERE id = p_run_id;

  RETURN v_media_object_id;
END;
$$;

REVOKE ALL ON FUNCTION execution.fn_media_finalize_sync_upload(UUID, TEXT, TEXT, BIGINT, INT, INT, NUMERIC) FROM PUBLIC;
REVOKE ALL ON FUNCTION execution.fn_media_finalize_sync_upload(UUID, TEXT, TEXT, BIGINT, INT, INT, NUMERIC) FROM authenticated;
GRANT  EXECUTE ON FUNCTION execution.fn_media_finalize_sync_upload(UUID, TEXT, TEXT, BIGINT, INT, INT, NUMERIC) TO service_role;

COMMENT ON FUNCTION execution.fn_media_finalize_sync_upload IS
  'Phase AK: sync-provider counterpart to fn_complete_async_run. Called by the '
  'platform-api worker after uploading a synchronously-generated asset (TTS, '
  'sync image) to the generated-media bucket. Inserts media.objects + '
  'execution.artifacts, computes credit cost via ai.modality_pricing, and '
  'marks the run succeeded. service_role only.';
