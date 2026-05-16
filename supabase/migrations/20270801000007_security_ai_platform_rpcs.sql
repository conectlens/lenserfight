-- Security hardening: public SECURITY DEFINER wrappers for ai, execution, platform,
-- and vault schemas.
--
-- Covers: generationRepository (ai.models, ai.providers),
-- apps/platform-api/src/lib/execution/helpers.ts (lenses.lenses, ai schema),
-- apps/platform-api/src/worker/main.ts (platform, ai, execution, lenses RPCs),
-- supabase/functions/test-provider/index.ts (ai.keys, vault.decrypted_secrets),
-- apps/cli/src/commands/battle.ts (battles.battles UPDATE, battle_execution_jobs SELECT).
--
-- Note: fn_worker_render_template (lenses.fn_render_template) is in migration 03.
-- Note: fn_worker_decrypt_api_key wraps ai.fn_decrypt_api_key for BYOK resolution
--       in battle-worker.ts.

-- ─── AI CATALOG (User-Facing) ─────────────────────────────────────────────────

-- ─── 1. fn_get_ai_model ───────────────────────────────────────────────────────
-- Fetch an AI model by ID (generationRepository.getModelById).

CREATE OR REPLACE FUNCTION public.fn_get_ai_model(p_model_id uuid)
RETURNS TABLE(
  id                    uuid,
  key                   text,
  name                  text,
  provider_id           uuid,
  description           text,
  capabilities          text[],
  temperature           numeric,
  max_tokens            integer,
  context_window_tokens integer,
  supports_tools        boolean,
  supports_vision       boolean,
  is_active             boolean,
  input_modalities      text[],
  output_modalities     text[],
  created_at            timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public', 'ai'
AS $$
  SELECT
    m.id, m.key, m.name, m.provider_id, m.description,
    m.capabilities, m.temperature, m.max_tokens, m.context_window_tokens,
    m.supports_tools, m.supports_vision,
    m.is_active, m.input_modalities, m.output_modalities,
    m.created_at
  FROM ai.models m
  WHERE m.id = p_model_id;
$$;

ALTER FUNCTION public.fn_get_ai_model(uuid) OWNER TO postgres;
GRANT EXECUTE ON FUNCTION public.fn_get_ai_model(uuid)
  TO authenticated, anon, service_role;

COMMENT ON FUNCTION public.fn_get_ai_model(uuid) IS
  'Security wrapper: fetch an AI model row by ID.';

-- ─── 2. fn_get_ai_provider ───────────────────────────────────────────────────
-- Fetch AI provider key + display name (generationRepository.getProviderById).

CREATE OR REPLACE FUNCTION public.fn_get_ai_provider(p_provider_id uuid)
RETURNS TABLE(
  id           uuid,
  key          text,
  display_name text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public', 'ai'
AS $$
  SELECT p.id, p.key, p.display_name
  FROM ai.providers p
  WHERE p.id = p_provider_id;
$$;

ALTER FUNCTION public.fn_get_ai_provider(uuid) OWNER TO postgres;
GRANT EXECUTE ON FUNCTION public.fn_get_ai_provider(uuid)
  TO authenticated, anon, service_role;

COMMENT ON FUNCTION public.fn_get_ai_provider(uuid) IS
  'Security wrapper: fetch AI provider id, key, and display_name by provider UUID.';

-- ─── 3. fn_get_lens_for_execution ────────────────────────────────────────────
-- Fetch a lens by ID, returning id and current head_version_id.
-- Used by platform-api execution/helpers.ts to resolve the lens before running.

CREATE OR REPLACE FUNCTION public.fn_get_lens_for_execution(p_lens_id uuid)
RETURNS TABLE(
  id              uuid,
  head_version_id uuid
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public', 'lenses'
AS $$
  SELECT l.id, l.head_version_id
  FROM lenses.lenses l
  WHERE l.id = p_lens_id
  LIMIT 1;
$$;

ALTER FUNCTION public.fn_get_lens_for_execution(uuid) OWNER TO postgres;
GRANT EXECUTE ON FUNCTION public.fn_get_lens_for_execution(uuid)
  TO authenticated, service_role;

COMMENT ON FUNCTION public.fn_get_lens_for_execution(uuid) IS
  'Security wrapper: fetch a lens by ID and return its head_version_id. '
  'Used by the execution pipeline before queuing a run.';

-- ─── 4. fn_resolve_execution_model ───────────────────────────────────────────
-- Resolve the best active AI model, optionally constrained by provider and/or
-- model key/ID override (platform-api execution/helpers.ts).
-- Returns: model_id, model_key, provider_id, provider_key.

CREATE OR REPLACE FUNCTION public.fn_resolve_execution_model(
  p_provider_override text DEFAULT NULL,
  p_model_override    text DEFAULT NULL
)
RETURNS TABLE(
  model_id     uuid,
  model_key    text,
  provider_id  uuid,
  provider_key text
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public', 'ai'
AS $$
DECLARE
  v_provider_id uuid;
BEGIN
  -- Resolve optional provider override to a provider_id
  IF p_provider_override IS NOT NULL THEN
    SELECT p.id INTO v_provider_id
    FROM ai.providers p
    WHERE p.key = p_provider_override
    LIMIT 1;
  END IF;

  RETURN QUERY
  SELECT m.id, m.key, m.provider_id,
         (SELECT pr.key FROM ai.providers pr WHERE pr.id = m.provider_id LIMIT 1)
  FROM ai.models m
  WHERE m.is_active = true
    AND (v_provider_id IS NULL OR m.provider_id = v_provider_id)
    AND (
      p_model_override IS NULL
      OR m.id::text = p_model_override
      OR m.key      = p_model_override
    )
  ORDER BY m.created_at ASC
  LIMIT 1;
END;
$$;

ALTER FUNCTION public.fn_resolve_execution_model(text, text) OWNER TO postgres;
GRANT EXECUTE ON FUNCTION public.fn_resolve_execution_model(text, text)
  TO authenticated, service_role;

COMMENT ON FUNCTION public.fn_resolve_execution_model(text, text) IS
  'Security wrapper: resolve the best active AI model, optionally filtered by '
  'provider key and/or model key/id. Returns model_id, model_key, provider_id, provider_key.';

-- ─── 5. fn_update_battle_execution_settings ──────────────────────────────────
-- Update scheduling metadata on a battle (apps/cli/src/commands/battle.ts).
-- Replaces: .schema('battles').from('battles').update({...}).eq('id', args.id).

CREATE OR REPLACE FUNCTION public.fn_update_battle_execution_settings(
  p_battle_id              uuid,
  p_execution_starts_at    timestamptz,
  p_voting_duration_hours  integer,
  p_auto_publish           boolean
) RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'public', 'battles', 'lensers'
AS $$
  UPDATE battles.battles
  SET    execution_starts_at   = p_execution_starts_at,
         voting_duration_hours = p_voting_duration_hours,
         auto_publish          = p_auto_publish,
         updated_at            = now()
  WHERE  id = p_battle_id
    AND  creator_lenser_id = lensers.get_auth_lenser_id();
$$;

ALTER FUNCTION public.fn_update_battle_execution_settings(uuid, timestamptz, integer, boolean)
  OWNER TO postgres;
GRANT EXECUTE ON FUNCTION public.fn_update_battle_execution_settings(uuid, timestamptz, integer, boolean)
  TO authenticated, service_role;

COMMENT ON FUNCTION public.fn_update_battle_execution_settings(uuid, timestamptz, integer, boolean) IS
  'Security wrapper: update execution scheduling fields on a battle owned by the current user.';

-- ─── WORKER-ONLY RPCs ─────────────────────────────────────────────────────────
-- All functions below are SECURITY DEFINER with REVOKE FROM PUBLIC.
-- Called from platform-api workers and edge functions using the service_role key.

-- ─── 7. fn_worker_decrypt_api_key ────────────────────────────────────────────
-- Decrypt a BYOK API key (battle-worker.ts, main.ts).
-- Replaces: .schema('ai').rpc('fn_decrypt_api_key', { p_key_id }).

CREATE OR REPLACE FUNCTION public.fn_worker_decrypt_api_key(p_key_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'ai'
AS $$
DECLARE
  v_result text;
BEGIN
  SELECT ai.fn_decrypt_api_key(p_key_id) INTO v_result;
  RETURN v_result;
END;
$$;

ALTER FUNCTION public.fn_worker_decrypt_api_key(uuid) OWNER TO postgres;
REVOKE ALL ON FUNCTION public.fn_worker_decrypt_api_key(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.fn_worker_decrypt_api_key(uuid) TO service_role;

COMMENT ON FUNCTION public.fn_worker_decrypt_api_key(uuid) IS
  'Worker-only: decrypt a stored BYOK API key. Delegates to ai.fn_decrypt_api_key.';

-- ─── 8. fn_worker_upsert_heartbeat ───────────────────────────────────────────
-- Record/refresh a worker heartbeat (main.ts).
-- Replaces: .schema('platform').rpc('fn_upsert_worker_heartbeat', {...}).

CREATE OR REPLACE FUNCTION public.fn_worker_upsert_heartbeat(
  p_worker_id   text,
  p_worker_type text,
  p_metadata    jsonb DEFAULT '{}'::jsonb
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'platform'
AS $$
BEGIN
  PERFORM platform.fn_upsert_worker_heartbeat(p_worker_id, p_worker_type, p_metadata);
END;
$$;

ALTER FUNCTION public.fn_worker_upsert_heartbeat(text, text, jsonb) OWNER TO postgres;
REVOKE ALL ON FUNCTION public.fn_worker_upsert_heartbeat(text, text, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.fn_worker_upsert_heartbeat(text, text, jsonb) TO service_role;

COMMENT ON FUNCTION public.fn_worker_upsert_heartbeat(text, text, jsonb) IS
  'Worker-only: upsert a worker heartbeat record. Delegates to platform.fn_upsert_worker_heartbeat.';

-- ─── 9. fn_worker_claim_queued_run ───────────────────────────────────────────
-- Claim the next pending execution run (main.ts).
-- Replaces: .schema('execution').rpc('fn_claim_queued_run').

CREATE OR REPLACE FUNCTION public.fn_worker_claim_queued_run()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'execution'
AS $$
DECLARE
  v_result jsonb;
BEGIN
  SELECT to_jsonb(r.*) INTO v_result
  FROM execution.fn_claim_queued_run() r;
  RETURN v_result;
END;
$$;

ALTER FUNCTION public.fn_worker_claim_queued_run() OWNER TO postgres;
REVOKE ALL ON FUNCTION public.fn_worker_claim_queued_run() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.fn_worker_claim_queued_run() TO service_role;

COMMENT ON FUNCTION public.fn_worker_claim_queued_run() IS
  'Worker-only: claim the next queued execution run. Returns the claimed run as jsonb.';

-- ─── 10. fn_worker_complete_execution_run ────────────────────────────────────
-- Mark an execution run as complete (main.ts success and error paths).
-- Replaces: .schema('execution').rpc('fn_complete_execution_run', {...}).

CREATE OR REPLACE FUNCTION public.fn_worker_complete_execution_run(
  p_run_id        uuid,
  p_status        text,
  p_token_input   integer   DEFAULT NULL,
  p_token_output  integer   DEFAULT NULL,
  p_credit_cost   bigint    DEFAULT NULL,
  p_billing_status text     DEFAULT NULL,
  p_response_text text      DEFAULT NULL,
  p_response_meta jsonb     DEFAULT NULL,
  p_error_code    text      DEFAULT NULL,
  p_error_message text      DEFAULT NULL,
  p_latency_ms    integer   DEFAULT NULL
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'execution'
AS $$
BEGIN
  PERFORM execution.fn_complete_execution_run(
    p_run_id, p_status, p_token_input, p_token_output, p_credit_cost,
    p_billing_status, p_response_text, p_response_meta,
    p_error_code, p_error_message, p_latency_ms
  );
END;
$$;

ALTER FUNCTION public.fn_worker_complete_execution_run(uuid, text, integer, integer, bigint, text, text, jsonb, text, text, integer)
  OWNER TO postgres;
REVOKE ALL ON FUNCTION public.fn_worker_complete_execution_run(uuid, text, integer, integer, bigint, text, text, jsonb, text, text, integer)
  FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.fn_worker_complete_execution_run(uuid, text, integer, integer, bigint, text, text, jsonb, text, text, integer)
  TO service_role;

COMMENT ON FUNCTION public.fn_worker_complete_execution_run(uuid, text, integer, integer, bigint, text, text, jsonb, text, text, integer) IS
  'Worker-only: mark an execution run terminal (completed or failed). '
  'Delegates to execution.fn_complete_execution_run.';

-- ─── 11. fn_worker_persist_execution_artifacts ───────────────────────────────
-- Store artifacts from a completed execution run (main.ts).
-- Replaces: .schema('execution').rpc('fn_persist_execution_artifacts', {...}).

CREATE OR REPLACE FUNCTION public.fn_worker_persist_execution_artifacts(
  p_run_id       uuid,
  p_lenser_id    uuid,
  p_workspace_id uuid,
  p_ai_model_id  uuid,
  p_kind         text,
  p_content_text text    DEFAULT NULL,
  p_content_json jsonb   DEFAULT NULL,
  p_media_ids    uuid[]  DEFAULT NULL
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'execution'
AS $$
BEGIN
  PERFORM execution.fn_persist_execution_artifacts(
    p_run_id, p_lenser_id, p_workspace_id, p_ai_model_id,
    p_kind, p_content_text, p_content_json, p_media_ids
  );
END;
$$;

ALTER FUNCTION public.fn_worker_persist_execution_artifacts(uuid, uuid, uuid, uuid, text, text, jsonb, uuid[])
  OWNER TO postgres;
REVOKE ALL ON FUNCTION public.fn_worker_persist_execution_artifacts(uuid, uuid, uuid, uuid, text, text, jsonb, uuid[])
  FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.fn_worker_persist_execution_artifacts(uuid, uuid, uuid, uuid, text, text, jsonb, uuid[])
  TO service_role;

COMMENT ON FUNCTION public.fn_worker_persist_execution_artifacts(uuid, uuid, uuid, uuid, text, text, jsonb, uuid[]) IS
  'Worker-only: persist execution artifacts to the DB. '
  'Delegates to execution.fn_persist_execution_artifacts.';

-- ─── 12. fn_worker_get_ai_key_secret ─────────────────────────────────────────
-- Resolve and decrypt an AI key from ai.keys + vault.decrypted_secrets, with
-- mandatory ownership enforcement.
--
-- Security history: prior to 2026-05-16 this function accepted only p_ai_key_id
-- and performed no ownership check. A service_role caller (e.g. an edge function
-- using a client-supplied UUID) could therefore decrypt ANY user's stored key —
-- a cross-tenant IDOR. The current version requires the worker to pass the
-- authenticated user's auth.uid() so the function can verify the key belongs
-- to that user before touching the vault.
--
-- Worker contract: callers MUST pass auth.uid() of the authenticated request.
-- Passing NULL or a wrong UUID will fail the ownership check.

DROP FUNCTION IF EXISTS public.fn_worker_get_ai_key_secret(uuid);

CREATE OR REPLACE FUNCTION public.fn_worker_get_ai_key_secret(
  p_ai_key_id uuid,
  p_user_id   uuid
)
RETURNS text
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public', 'ai', 'vault', 'lensers'
AS $$
DECLARE
  v_lenser_id    uuid;
  v_encrypted_id uuid;
  v_decrypted    text;
BEGIN
  IF p_ai_key_id IS NULL OR p_user_id IS NULL THEN
    RAISE EXCEPTION 'p_ai_key_id and p_user_id are required';
  END IF;

  -- Resolve the human profile for the authenticated user; ai.keys are owned
  -- by the human profile (not an agent workspace profile).
  SELECT p.id INTO v_lenser_id
  FROM lensers.profiles p
  WHERE p.user_id = p_user_id
    AND p.type = 'human'
  LIMIT 1;

  IF v_lenser_id IS NULL THEN
    RAISE EXCEPTION 'Key owner profile not found';
  END IF;

  -- Ownership check: key must belong to caller AND be active.
  SELECT k.encrypted_key_id INTO v_encrypted_id
  FROM ai.keys k
  WHERE k.id = p_ai_key_id
    AND k.lenser_id = v_lenser_id
    AND k.is_active = true
  LIMIT 1;

  IF v_encrypted_id IS NULL THEN
    -- Generic message: do not disclose whether the key exists for another user.
    RAISE EXCEPTION 'Key not found, revoked, or not owned by caller';
  END IF;

  SELECT decrypted_secret INTO v_decrypted
  FROM vault.decrypted_secrets
  WHERE id = v_encrypted_id;

  IF v_decrypted IS NULL THEN
    RAISE EXCEPTION 'Failed to decrypt key from vault';
  END IF;

  RETURN v_decrypted;
END;
$$;

ALTER FUNCTION public.fn_worker_get_ai_key_secret(uuid, uuid) OWNER TO postgres;
REVOKE ALL ON FUNCTION public.fn_worker_get_ai_key_secret(uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.fn_worker_get_ai_key_secret(uuid, uuid) TO service_role;

COMMENT ON FUNCTION public.fn_worker_get_ai_key_secret(uuid, uuid) IS
  'Worker-only: resolve and decrypt a BYOK API key from ai.keys via vault.decrypted_secrets. '
  'Requires p_user_id (the authenticated caller''s auth.uid()) and verifies '
  'the key belongs to that user. Patched 2026-05-16 to close cross-user IDOR.';

-- ─── EDGE FUNCTION WORKER RPCs ───────────────────────────────────────────────

-- ─── fn_worker_set_battle_og_image ───────────────────────────────────────────
-- Update og_image_url on a battle (generate-battle-og-image edge function).

CREATE OR REPLACE FUNCTION public.fn_worker_set_battle_og_image(
  p_battle_id    uuid,
  p_og_image_url text
) RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'public', 'battles'
AS $$
  UPDATE battles.battles
  SET og_image_url = p_og_image_url
  WHERE id = p_battle_id;
$$;

ALTER FUNCTION public.fn_worker_set_battle_og_image(uuid, text) OWNER TO postgres;
REVOKE ALL ON FUNCTION public.fn_worker_set_battle_og_image(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.fn_worker_set_battle_og_image(uuid, text) TO service_role;

COMMENT ON FUNCTION public.fn_worker_set_battle_og_image(uuid, text) IS
  'Worker-only: set og_image_url on a battle. Called by the generate-battle-og-image edge function.';

-- ─── fn_worker_get_voter_stats ────────────────────────────────────────────────
-- Vote statistics for fraud scoring (score-vote-risk edge function).
-- Returns recent_count (votes since p_since_ts), total_count, draw_count.

CREATE OR REPLACE FUNCTION public.fn_worker_get_voter_stats(
  p_voter_lenser_id uuid,
  p_since_ts        timestamptz
)
RETURNS TABLE(
  recent_count bigint,
  total_count  bigint,
  draw_count   bigint
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public', 'battles'
AS $$
  SELECT
    COUNT(*) FILTER (WHERE v.created_at >= p_since_ts) AS recent_count,
    COUNT(*)                                            AS total_count,
    COUNT(*) FILTER (WHERE v.is_draw = true)            AS draw_count
  FROM battles.votes v
  WHERE v.voter_lenser_id = p_voter_lenser_id;
$$;

ALTER FUNCTION public.fn_worker_get_voter_stats(uuid, timestamptz) OWNER TO postgres;
REVOKE ALL ON FUNCTION public.fn_worker_get_voter_stats(uuid, timestamptz) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.fn_worker_get_voter_stats(uuid, timestamptz) TO service_role;

COMMENT ON FUNCTION public.fn_worker_get_voter_stats(uuid, timestamptz) IS
  'Worker-only: return recent/total/draw vote counts for a voter in one query.';

-- ─── fn_worker_update_vote_risk_score ─────────────────────────────────────────
-- Persist fraud risk assessment (score-vote-risk edge function).

CREATE OR REPLACE FUNCTION public.fn_worker_update_vote_risk_score(
  p_vote_id       uuid,
  p_risk_score    numeric,
  p_risk_factors  text[],
  p_review_status text
) RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'public', 'reputation'
AS $$
  UPDATE reputation.vote_risk_scores
  SET risk_score    = p_risk_score,
      risk_factors  = p_risk_factors,
      review_status = p_review_status
  WHERE vote_id = p_vote_id;
$$;

ALTER FUNCTION public.fn_worker_update_vote_risk_score(uuid, numeric, text[], text) OWNER TO postgres;
REVOKE ALL ON FUNCTION public.fn_worker_update_vote_risk_score(uuid, numeric, text[], text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.fn_worker_update_vote_risk_score(uuid, numeric, text[], text) TO service_role;

COMMENT ON FUNCTION public.fn_worker_update_vote_risk_score(uuid, numeric, text[], text) IS
  'Worker-only: update risk_score, risk_factors, and review_status on a vote_risk_scores row.';
