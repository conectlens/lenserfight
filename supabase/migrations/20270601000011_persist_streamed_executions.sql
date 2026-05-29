-- Persist streamed TEXT executions (platform_credit + cloud BYOK + local BYOK) so
-- they appear in per-lens execution history.
--
-- Background: execute-stream emits a synthetic run_id and never wrote to
-- execution.requests, so platform_credit / cloud BYOK text runs were never
-- recorded. The legacy execution.fn_persist_local_execution had no PUBLIC wrapper,
-- so the client's supabase.rpc() call 404'd and was swallowed — local BYOK runs
-- were never recorded either. As a result fn_get_lens_execution_history always
-- returned an empty set.
--
-- This migration adds a single idempotent persist path, callable from:
--   * the client (authenticated)  → public.fn_persist_streamed_execution
--   * the edge fn (service role)   → public.fn_worker_persist_streamed_execution
--
-- Both converge on the SAME run_id (the id from the stream's `start` event), so
-- the server (source of truth) and the client (fallback) never produce duplicate
-- rows. A transaction-scoped advisory lock keyed on the run_id serialises the two
-- writers; the second one to arrive sees the run and no-ops, backfilling the
-- primary text artifact only if it is still missing.

-- ─── Internal implementation (not granted to clients) ────────────────────────

CREATE OR REPLACE FUNCTION "public"."fn_persist_streamed_execution_impl"(
  "p_run_id"        "uuid",
  "p_lenser_id"     "uuid",
  "p_lens_id"       "uuid",
  "p_version_id"    "uuid",
  "p_provider"      "text",
  "p_model"         "text",
  "p_content_text"  "text",
  "p_token_input"   integer,
  "p_token_output"  integer,
  "p_credit_cost"   bigint,
  "p_funding_source" "text"
) RETURNS "uuid"
  LANGUAGE "plpgsql" SECURITY DEFINER
  SET "search_path" TO 'execution', 'ai', 'lensers', 'public'
AS $$
DECLARE
  v_request_id     uuid;
  v_model_id       uuid;
  v_now            timestamptz := now();
  v_runtime_origin text;
  v_run_exists     boolean;
BEGIN
  IF p_lenser_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required' USING ERRCODE = 'insufficient_privilege';
  END IF;
  IF p_run_id IS NULL THEN
    RAISE EXCEPTION 'run_id is required';
  END IF;

  -- platform_credit / cloud BYOK stream over the network ('cloud'); local BYOK
  -- streams browser→provider directly ('local').
  v_runtime_origin := CASE WHEN p_funding_source = 'user_byok_local' THEN 'local' ELSE 'cloud' END;

  -- Serialise the server + client writers for this run.
  PERFORM pg_advisory_xact_lock(hashtext(p_run_id::text)::bigint);

  SELECT true INTO v_run_exists FROM "execution"."runs" WHERE "id" = p_run_id;

  IF v_run_exists THEN
    -- The other writer already recorded this run. Backfill the primary text
    -- artifact (and run response_text) if it is still missing and we have content.
    IF p_content_text IS NOT NULL AND length(p_content_text) > 0
       AND NOT EXISTS (
         SELECT 1 FROM "execution"."artifacts"
         WHERE "run_id" = p_run_id AND "artifact_kind" = 'text' AND "is_primary_output"
       )
    THEN
      INSERT INTO "execution"."artifacts" (
        "run_id", "artifact_kind", "content_text", "visibility", "is_primary_output", "output_type", "created_at"
      ) VALUES (
        p_run_id, 'text', p_content_text, 'private', true, 'text', v_now
      );
      UPDATE "execution"."runs"
        SET "response_text" = p_content_text
        WHERE "id" = p_run_id AND ("response_text" IS NULL OR "response_text" = '');
    END IF;
    RETURN p_run_id;
  END IF;

  -- Best-effort model resolution so history rows carry provider/model badges.
  SELECT m."id" INTO v_model_id
  FROM "ai"."models" m
  JOIN "ai"."providers" p ON p."id" = m."provider_id"
  WHERE p."key" = p_provider AND m."key" = p_model
  LIMIT 1;

  INSERT INTO "execution"."requests" (
    "requester_lenser_id", "origin_type", "model_id", "lens_id", "version_id",
    "input_snapshot", "runtime_origin", "funding_source", "created_at"
  ) VALUES (
    p_lenser_id, 'lens_preview', v_model_id, p_lens_id, p_version_id,
    '{}'::jsonb, v_runtime_origin, COALESCE(p_funding_source, 'platform_credit'), v_now
  )
  RETURNING "id" INTO v_request_id;

  INSERT INTO "execution"."runs" (
    "id", "request_id", "model_id", "status", "started_at", "completed_at",
    "token_input", "token_output", "credit_cost", "billing_status",
    "response_text", "response_meta", "created_at"
  ) VALUES (
    p_run_id, v_request_id, v_model_id, 'succeeded', v_now, v_now,
    p_token_input, p_token_output, COALESCE(p_credit_cost, 0),
    CASE WHEN COALESCE(p_credit_cost, 0) > 0 THEN 'charged' ELSE 'free' END,
    NULLIF(p_content_text, ''),
    jsonb_build_object('provider', p_provider, 'model', p_model, 'source', 'stream'),
    v_now
  );

  IF p_content_text IS NOT NULL AND length(p_content_text) > 0 THEN
    INSERT INTO "execution"."artifacts" (
      "run_id", "artifact_kind", "content_text", "visibility", "is_primary_output", "output_type", "created_at"
    ) VALUES (
      p_run_id, 'text', p_content_text, 'private', true, 'text', v_now
    );
  END IF;

  RETURN p_run_id;
END;
$$;

ALTER FUNCTION "public"."fn_persist_streamed_execution_impl"(
  "uuid", "uuid", "uuid", "uuid", "text", "text", "text", integer, integer, bigint, "text"
) OWNER TO "postgres";

-- Internal only — clients call the wrappers below, never the impl directly.
REVOKE ALL ON FUNCTION "public"."fn_persist_streamed_execution_impl"(
  "uuid", "uuid", "uuid", "uuid", "text", "text", "text", integer, integer, bigint, "text"
) FROM PUBLIC, "anon", "authenticated";

-- ─── Authenticated client wrapper (onEnd fallback / local BYOK) ──────────────

CREATE OR REPLACE FUNCTION "public"."fn_persist_streamed_execution"(
  "p_run_id"        "uuid",
  "p_lens_id"       "uuid",
  "p_version_id"    "uuid" DEFAULT NULL,
  "p_provider"      "text" DEFAULT '',
  "p_model"         "text" DEFAULT '',
  "p_content_text"  "text" DEFAULT '',
  "p_token_input"   integer DEFAULT 0,
  "p_token_output"  integer DEFAULT 0,
  "p_credit_cost"   bigint DEFAULT 0,
  "p_funding_source" "text" DEFAULT 'platform_credit'
) RETURNS "uuid"
  LANGUAGE "plpgsql" SECURITY DEFINER
  SET "search_path" TO 'execution', 'ai', 'lensers', 'public'
AS $$
DECLARE
  v_caller_id uuid := "lensers"."get_auth_lenser_id"();
BEGIN
  RETURN "public"."fn_persist_streamed_execution_impl"(
    p_run_id, v_caller_id, p_lens_id, p_version_id, p_provider, p_model,
    p_content_text, p_token_input, p_token_output, p_credit_cost, p_funding_source
  );
END;
$$;

ALTER FUNCTION "public"."fn_persist_streamed_execution"(
  "uuid", "uuid", "uuid", "text", "text", "text", integer, integer, bigint, "text"
) OWNER TO "postgres";

COMMENT ON FUNCTION "public"."fn_persist_streamed_execution"(
  "uuid", "uuid", "uuid", "text", "text", "text", integer, integer, bigint, "text"
) IS 'Idempotent client-side persist for completed streamed TEXT executions (platform_credit / cloud BYOK / local BYOK). Keyed on the stream start run_id so it dedups against the server-side edge-function write. SECURITY DEFINER: resolves requester from auth.uid() via lensers.get_auth_lenser_id().';

GRANT EXECUTE ON FUNCTION "public"."fn_persist_streamed_execution"(
  "uuid", "uuid", "uuid", "text", "text", "text", integer, integer, bigint, "text"
) TO "authenticated", "service_role";

-- ─── Service-role worker wrapper (execute-stream edge function) ──────────────

CREATE OR REPLACE FUNCTION "public"."fn_worker_persist_streamed_execution"(
  "p_run_id"        "uuid",
  "p_user_id"       "uuid",
  "p_lens_id"       "uuid",
  "p_version_id"    "uuid" DEFAULT NULL,
  "p_provider"      "text" DEFAULT '',
  "p_model"         "text" DEFAULT '',
  "p_content_text"  "text" DEFAULT '',
  "p_token_input"   integer DEFAULT 0,
  "p_token_output"  integer DEFAULT 0,
  "p_credit_cost"   bigint DEFAULT 0,
  "p_funding_source" "text" DEFAULT 'platform_credit'
) RETURNS "uuid"
  LANGUAGE "plpgsql" SECURITY DEFINER
  SET "search_path" TO 'execution', 'ai', 'lensers', 'public'
AS $$
DECLARE
  v_lenser_id uuid;
BEGIN
  -- Mirror lensers.get_auth_lenser_id() for an explicit user (no JWT in the
  -- edge function's service-role context): active selection, else human profile.
  SELECT COALESCE(
    (
      SELECT pref."active_lenser_id"
      FROM "lensers"."preferences" pref
      JOIN "lensers"."profiles" human_p ON human_p."id" = pref."lenser_id"
      WHERE human_p."user_id" = p_user_id
        AND pref."active_lenser_id" IS NOT NULL
        AND EXISTS (
          SELECT 1 FROM "lensers"."profiles" target
          WHERE target."id" = pref."active_lenser_id" AND target."status" = 'active'
        )
      LIMIT 1
    ),
    (
      SELECT "id" FROM "lensers"."profiles"
      WHERE "user_id" = p_user_id AND "type" = 'human'
      LIMIT 1
    )
  ) INTO v_lenser_id;

  RETURN "public"."fn_persist_streamed_execution_impl"(
    p_run_id, v_lenser_id, p_lens_id, p_version_id, p_provider, p_model,
    p_content_text, p_token_input, p_token_output, p_credit_cost, p_funding_source
  );
END;
$$;

ALTER FUNCTION "public"."fn_worker_persist_streamed_execution"(
  "uuid", "uuid", "uuid", "uuid", "text", "text", "text", integer, integer, bigint, "text"
) OWNER TO "postgres";

COMMENT ON FUNCTION "public"."fn_worker_persist_streamed_execution"(
  "uuid", "uuid", "uuid", "uuid", "text", "text", "text", integer, integer, bigint, "text"
) IS 'Service-role variant of fn_persist_streamed_execution for the execute-stream edge function (platform_credit source of truth). Resolves the lenser from an explicit auth user id. Idempotent + advisory-locked on run_id so it dedups against the authenticated client fallback.';

REVOKE ALL ON FUNCTION "public"."fn_worker_persist_streamed_execution"(
  "uuid", "uuid", "uuid", "uuid", "text", "text", "text", integer, integer, bigint, "text"
) FROM PUBLIC, "anon", "authenticated";

GRANT EXECUTE ON FUNCTION "public"."fn_worker_persist_streamed_execution"(
  "uuid", "uuid", "uuid", "uuid", "text", "text", "text", integer, integer, bigint, "text"
) TO "service_role";
