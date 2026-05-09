-- Execution gateway support for the OSS platform API.
-- Adds:
--   1. request_id traceability on media.objects
--   2. idempotency support for API-triggered lens runs
--   3. secure run details RPC for /v1/runs/:id
--   4. service-role queue claim RPC for the worker

ALTER TABLE media.objects
  ADD COLUMN IF NOT EXISTS request_id uuid NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'media_objects_request_id_fkey'
  ) THEN
    ALTER TABLE media.objects
      ADD CONSTRAINT media_objects_request_id_fkey
      FOREIGN KEY (request_id)
      REFERENCES execution.requests(id)
      ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_media_objects_request_id
  ON media.objects (request_id)
  WHERE request_id IS NOT NULL;

ALTER TABLE execution.requests
  ADD COLUMN IF NOT EXISTS idempotency_key text NULL;

CREATE INDEX IF NOT EXISTS idx_execution_requests_idempotency
  ON execution.requests (requester_lenser_id, idempotency_key)
  WHERE idempotency_key IS NOT NULL AND is_active = true;

CREATE OR REPLACE FUNCTION execution.fn_run_lens_api(
  p_lens_id uuid,
  p_version_id uuid,
  p_model_id uuid,
  p_inputs jsonb DEFAULT '{}'::jsonb,
  p_funding_source text DEFAULT 'platform_credit',
  p_byok_key_id uuid DEFAULT NULL::uuid,
  p_idempotency_key text DEFAULT NULL::text
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'execution', 'lenses', 'lensers', 'tenancy', 'public'
AS $$
DECLARE
  v_lenser_id uuid := lensers.get_auth_lenser_id();
  v_workspace_id uuid;
  v_request_id uuid;
  v_run_id uuid;
  v_existing_run_id uuid;
  v_param_rec RECORD;
  v_value text;
BEGIN
  IF v_lenser_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required'
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  IF p_idempotency_key IS NOT NULL THEN
    SELECT r.id
      INTO v_existing_run_id
    FROM execution.requests req
    JOIN execution.runs r
      ON r.request_id = req.id
     AND r.is_active = true
    WHERE req.requester_lenser_id = v_lenser_id
      AND req.idempotency_key = p_idempotency_key
      AND req.lens_id = p_lens_id
      AND req.is_active = true
    ORDER BY req.created_at DESC
    LIMIT 1;

    IF v_existing_run_id IS NOT NULL THEN
      RETURN v_existing_run_id;
    END IF;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM lenses.lenses l
    WHERE l.id = p_lens_id
      AND (l.visibility = 'public' OR l.lenser_id = v_lenser_id)
  ) THEN
    RAISE EXCEPTION 'Lens % not found or access denied', p_lens_id
      USING ERRCODE = 'no_data_found';
  END IF;

  PERFORM lenses.fn_validate_inputs(p_version_id, p_inputs);

  v_workspace_id := (
    SELECT w.id
    FROM tenancy.workspaces w
    WHERE w.owner_lenser_id = v_lenser_id
      AND w.type = 'personal'
      AND w.status = 'active'
    ORDER BY w.created_at ASC
    LIMIT 1
  );

  INSERT INTO execution.requests (
    requester_lenser_id,
    lens_id,
    version_id,
    model_id,
    input_snapshot,
    funding_source,
    byok_key_ref_id,
    workspace_id,
    origin_type,
    runtime_origin,
    idempotency_key
  ) VALUES (
    v_lenser_id,
    p_lens_id,
    p_version_id,
    p_model_id,
    p_inputs,
    p_funding_source,
    p_byok_key_id,
    v_workspace_id,
    'api',
    'cloud',
    p_idempotency_key
  )
  RETURNING id INTO v_request_id;

  INSERT INTO execution.runs (
    request_id,
    model_id,
    status,
    created_at
  ) VALUES (
    v_request_id,
    p_model_id,
    'queued',
    now()
  )
  RETURNING id INTO v_run_id;

  IF p_version_id IS NOT NULL AND v_workspace_id IS NOT NULL THEN
    FOR v_param_rec IN
      SELECT id, key
      FROM lenses.version_parameters
      WHERE version_id = p_version_id
    LOOP
      v_value := p_inputs->>v_param_rec.key;
      CONTINUE WHEN v_value IS NULL;

      INSERT INTO lenses.version_parameter_contents (
        parameter_id,
        lenser_id,
        workspace_id,
        contents
      ) VALUES (
        v_param_rec.id,
        v_lenser_id,
        v_workspace_id,
        jsonb_build_object('value', v_value)
      )
      ON CONFLICT (parameter_id, workspace_id, lenser_id)
      DO UPDATE SET
        contents = jsonb_build_object('value', v_value),
        updated_at = now();
    END LOOP;
  END IF;

  RETURN v_run_id;
END;
$$;

ALTER FUNCTION execution.fn_run_lens_api(uuid, uuid, uuid, jsonb, text, uuid, text) OWNER TO postgres;
GRANT EXECUTE ON FUNCTION execution.fn_run_lens_api(uuid, uuid, uuid, jsonb, text, uuid, text) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION execution.fn_get_run_details(
  p_run_id uuid
) RETURNS TABLE (
  id uuid,
  request_id uuid,
  status text,
  model_id uuid,
  model_key text,
  provider_key text,
  started_at timestamptz,
  completed_at timestamptz,
  latency_ms integer,
  token_input integer,
  token_output integer,
  credit_cost bigint,
  billing_status text,
  error_code text,
  error_message text,
  artifacts jsonb
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'execution', 'lenses', 'lensers', 'ai', 'public'
AS $$
DECLARE
  v_caller_id uuid := lensers.get_auth_lenser_id();
BEGIN
  IF v_caller_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required'
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  RETURN QUERY
  SELECT
    r.id,
    r.request_id,
    r.status,
    r.model_id,
    m.key AS model_key,
    p.key AS provider_key,
    r.started_at,
    r.completed_at,
    r.latency_ms,
    r.token_input,
    r.token_output,
    r.credit_cost,
    r.billing_status,
    r.error_code,
    r.error_message,
    COALESCE(
      jsonb_agg(
        jsonb_build_object(
          'id', a.id,
          'artifactKind', a.artifact_kind,
          'contentText', a.content_text,
          'contentJson', a.content_json,
          'visibility', a.visibility,
          'isPrimaryOutput', a.is_primary_output,
          'createdAt', a.created_at
        )
      ) FILTER (WHERE a.id IS NOT NULL),
      '[]'::jsonb
    ) AS artifacts
  FROM execution.runs r
  JOIN execution.requests req
    ON req.id = r.request_id
  LEFT JOIN ai.models m
    ON m.id = r.model_id
  LEFT JOIN ai.providers p
    ON p.id = m.provider_id
  LEFT JOIN execution.artifacts a
    ON a.run_id = r.id
  WHERE r.id = p_run_id
    AND req.requester_lenser_id = v_caller_id
    AND req.is_active = true
    AND r.is_active = true
  GROUP BY
    r.id, r.request_id, r.status, r.model_id, m.key, p.key, r.started_at,
    r.completed_at, r.latency_ms, r.token_input, r.token_output, r.credit_cost,
    r.billing_status, r.error_code, r.error_message;
END;
$$;

ALTER FUNCTION execution.fn_get_run_details(uuid) OWNER TO postgres;
GRANT EXECUTE ON FUNCTION execution.fn_get_run_details(uuid) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION execution.fn_claim_queued_run()
RETURNS TABLE (
  run_id uuid,
  request_id uuid,
  requester_lenser_id uuid,
  workspace_id uuid,
  lens_id uuid,
  version_id uuid,
  model_id uuid,
  model_key text,
  provider_key text,
  funding_source text,
  byok_key_ref_id uuid,
  input_snapshot jsonb
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'execution', 'ai', 'public'
AS $$
DECLARE
  v_run_id uuid;
BEGIN
  IF auth.role() IS DISTINCT FROM 'service_role' THEN
    RAISE EXCEPTION 'Forbidden: only service_role can claim queued runs';
  END IF;

  WITH next_run AS (
    SELECT r.id
    FROM execution.runs r
    JOIN execution.requests req
      ON req.id = r.request_id
    WHERE r.status = 'queued'
      AND r.is_active = true
      AND req.is_active = true
    ORDER BY r.created_at ASC
    FOR UPDATE SKIP LOCKED
    LIMIT 1
  )
  UPDATE execution.runs r
     SET status = 'running',
         started_at = COALESCE(r.started_at, now())
    FROM next_run nr
   WHERE r.id = nr.id
  RETURNING r.id INTO v_run_id;

  IF v_run_id IS NULL THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT
    r.id AS run_id,
    req.id AS request_id,
    req.requester_lenser_id,
    req.workspace_id,
    req.lens_id,
    req.version_id,
    r.model_id,
    m.key AS model_key,
    p.key AS provider_key,
    req.funding_source,
    req.byok_key_ref_id,
    req.input_snapshot
  FROM execution.runs r
  JOIN execution.requests req
    ON req.id = r.request_id
  LEFT JOIN ai.models m
    ON m.id = r.model_id
  LEFT JOIN ai.providers p
    ON p.id = m.provider_id
  WHERE r.id = v_run_id;
END;
$$;

ALTER FUNCTION execution.fn_claim_queued_run() OWNER TO postgres;
REVOKE ALL ON FUNCTION execution.fn_claim_queued_run() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION execution.fn_claim_queued_run() TO service_role;
