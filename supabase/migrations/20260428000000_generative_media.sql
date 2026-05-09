-- =============================================================================
-- Generative Media Support
-- =============================================================================
-- Extends the execution schema to handle image / video / audio generation:
--   1. execution.requests.output_modality     — what kind of output is requested
--   2. execution.runs.is_async                — true for video/audio (minutes, not seconds)
--   3. execution.runs.provider_task_id        — opaque task ID from async provider
--   4. agents.policies.allowed_output_modalities — per-agent output type guard
--   5. ai.modality_pricing                    — per-model credit rates for media
--   6. fn_complete_async_run()                — called by poll worker when done
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. Output modality on execution requests
-- ---------------------------------------------------------------------------
ALTER TABLE execution.requests
  ADD COLUMN IF NOT EXISTS output_modality TEXT
  CHECK (output_modality IN ('text','image','video','audio','music'));

COMMENT ON COLUMN execution.requests.output_modality IS
  'Output media type requested. NULL means text (backward compat). '
  'Set for generative media executions.';

-- ---------------------------------------------------------------------------
-- 2 & 3. Async execution columns on execution.runs
-- ---------------------------------------------------------------------------
ALTER TABLE execution.runs
  ADD COLUMN IF NOT EXISTS is_async        BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS provider_task_id TEXT;

COMMENT ON COLUMN execution.runs.is_async IS
  'TRUE for video/audio providers that return a task ID and require polling.';
COMMENT ON COLUMN execution.runs.provider_task_id IS
  'Provider-specific task/job ID returned by async generation APIs (Sora, Veo, Kling, etc).';

-- Index for the poll worker query
CREATE INDEX IF NOT EXISTS idx_execution_runs_async_pending
  ON execution.runs (is_async, status, started_at)
  WHERE is_async = TRUE AND status = 'running';

-- ---------------------------------------------------------------------------
-- 4. Per-agent output modality guard
-- ---------------------------------------------------------------------------
ALTER TABLE agents.policies
  ADD COLUMN IF NOT EXISTS allowed_output_modalities TEXT[]
  NOT NULL DEFAULT ARRAY['text'];

COMMENT ON COLUMN agents.policies.allowed_output_modalities IS
  'Modalities this agent is permitted to request. Defaults to [''text''] so '
  'existing agents are unaffected. Add ''image'', ''video'', ''audio'', ''music'' '
  'to unlock generative media for this agent.';

-- ---------------------------------------------------------------------------
-- 5. Per-model modality pricing
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS ai.modality_pricing (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  model_id        UUID        NOT NULL REFERENCES ai.models(id) ON DELETE CASCADE,
  output_modality TEXT        NOT NULL CHECK (output_modality IN ('text','image','video','audio','music')),
  credit_rate     NUMERIC     NOT NULL CHECK (credit_rate >= 0),
  rate_unit       TEXT        NOT NULL CHECK (rate_unit IN ('per_image','per_second','per_1k_chars','per_request')),
  is_active       BOOLEAN     NOT NULL DEFAULT TRUE,
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (model_id, output_modality)
);

COMMENT ON TABLE ai.modality_pricing IS
  'Credit pricing per output unit for each model+modality combination. '
  'fn_complete_async_run() reads this to compute credit_cost at completion time.';

-- ---------------------------------------------------------------------------
-- 6. fn_complete_async_run — called by the poll Edge Function when done
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION execution.fn_complete_async_run(
  p_run_id      UUID,
  p_media_url   TEXT,
  p_mime_type   TEXT,
  p_bytes       BIGINT DEFAULT NULL,
  p_width       INT    DEFAULT NULL,
  p_height      INT    DEFAULT NULL,
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
      WHEN 'per_1k_chars' THEN 0  -- not applicable for media
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

  -- Create media.objects row for the generated asset
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
    request_id
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
      'width', p_width,
      'height', p_height,
      'duration_s', p_duration_s
    ),
    v_request_id
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
    p_media_url,          -- fallback content_text = external URL
    'private',
    TRUE,
    v_media_object_id,
    COALESCE(v_output_modality, 'image')
  );

  -- Mark run succeeded
  UPDATE execution.runs
  SET
    status        = 'succeeded',
    completed_at  = now(),
    latency_ms    = EXTRACT(EPOCH FROM (now() - started_at))::BIGINT * 1000,
    credit_cost   = v_credit_cost,
    billing_status = CASE WHEN v_credit_cost > 0 THEN 'pending' ELSE 'free' END
  WHERE id = p_run_id;
END;
$$;

GRANT EXECUTE ON FUNCTION execution.fn_complete_async_run TO service_role;

-- ---------------------------------------------------------------------------
-- fn_poll_async_run — returns pending async runs for the Edge Function to poll
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION execution.fn_poll_async_run(
  p_stale_after_seconds INT DEFAULT 30,
  p_limit               INT DEFAULT 50
)
RETURNS TABLE (
  run_id            UUID,
  provider_task_id  TEXT,
  model_key         TEXT,
  provider_key      TEXT,
  output_modality   TEXT,
  started_at        TIMESTAMPTZ
)
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = execution, ai, public
AS $$
  SELECT
    r.id                AS run_id,
    r.provider_task_id,
    m.key               AS model_key,
    p.key               AS provider_key,
    req.output_modality,
    r.started_at
  FROM execution.runs r
  JOIN execution.requests req ON req.id = r.request_id
  LEFT JOIN ai.models   m ON m.id = req.model_id
  LEFT JOIN ai.providers p ON p.id = m.provider_id
  WHERE r.is_async = TRUE
    AND r.status   = 'running'
    AND r.provider_task_id IS NOT NULL
    AND r.started_at < now() - (p_stale_after_seconds || ' seconds')::INTERVAL
  ORDER BY r.started_at
  LIMIT p_limit;
$$;

GRANT EXECUTE ON FUNCTION execution.fn_poll_async_run TO service_role;

-- ---------------------------------------------------------------------------
-- fn_timeout_stale_runs — marks runs timed_out after 15 minutes
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION execution.fn_timeout_stale_runs()
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = execution, public
AS $$
DECLARE
  v_count INT;
BEGIN
  UPDATE execution.runs
  SET status = 'timed_out', completed_at = now()
  WHERE is_async = TRUE
    AND status = 'running'
    AND started_at < now() - INTERVAL '15 minutes';
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

GRANT EXECUTE ON FUNCTION execution.fn_timeout_stale_runs TO service_role;
