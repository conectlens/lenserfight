-- Hydrate a battle contender's lens template against the battle's shared inputs.
--
-- battles.shared_input_snapshot exists to hold "immutable snapshot of shared Lens
-- [[parameter]] values resolved at battle creation time" and
-- battles.contender_lens_assignments binds a contender to a lens version — but the
-- worker never used either. It rendered the battle's own task_prompt as a template
-- against itself with a single {prompt} input, which is a no-op unless task_prompt
-- literally contains the token [[prompt]]. A lens-bound battle therefore executed
-- with the raw task_prompt and the lens's [[Parameter]] template was never applied.
--
-- Three things are needed to close that gap, and only one of them is new code:
--
-- 1. public.fn_worker_render_template(uuid, jsonb) already renders a lens version by
--    id and is already service_role-only (20270603000000). It could not work, though:
--    it delegates to lenses.fn_render_template, which reads lenses.versions, and that
--    table has FORCE ROW LEVEL SECURITY. As 20270601000027 records, FORCE RLS blocks
--    even the postgres superuser inside a SECURITY DEFINER function when row_security
--    is on, so the inner SELECT ... INTO STRICT found no row and raised NO_DATA_FOUND.
--    A function's SET clause is inherited by nested calls it makes, so setting
--    row_security TO off on this wrapper is enough — lenses.fn_render_template is left
--    untouched, and its own grants (which still include authenticated) are unchanged.
--    Scoping the bypass to this wrapper matters: the wrapper is service_role-only, so
--    turning RLS off here cannot let an end user render a lens version they cannot see.
--
-- 2. The claim functions must return the battle's shared_input_snapshot so the worker
--    has something to render with. They already return lens_id/version_id.
--
-- 3. public.fn_worker_claim_battle_job declared byok_key_ref_id as text while the
--    battles function it does RETURN QUERY SELECT * from returns uuid. uuid is not
--    binary-coercible to text, so PL/pgSQL raised "structure of query does not match
--    function result type" on every call — the worker's only claim entry point. The
--    wrapper is re-declared to uuid here to match. Both signatures have to be rebuilt
--    anyway to add a column, since RETURNS TABLE cannot be changed by CREATE OR REPLACE.

-- ── 1. Render wrapper: see through FORCE RLS on lenses.versions ───────────────
-- Same signature, so CREATE OR REPLACE keeps existing grants; they are re-asserted
-- below regardless so this migration is self-contained.

CREATE OR REPLACE FUNCTION "public"."fn_worker_render_template"(
  "p_version_id" "uuid",
  "p_inputs" "jsonb" DEFAULT '{}'::"jsonb"
) RETURNS "text"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'lenses'
    SET "row_security" TO off
    AS $$
DECLARE
  v_result text;
BEGIN
  SELECT lenses.fn_render_template(p_version_id, p_inputs) INTO v_result;
  RETURN v_result;
END;
$$;

ALTER FUNCTION "public"."fn_worker_render_template"("p_version_id" "uuid", "p_inputs" "jsonb") OWNER TO "postgres";
REVOKE ALL     ON FUNCTION "public"."fn_worker_render_template"("p_version_id" "uuid", "p_inputs" "jsonb") FROM "anon", "authenticated", PUBLIC;
GRANT  EXECUTE ON FUNCTION "public"."fn_worker_render_template"("p_version_id" "uuid", "p_inputs" "jsonb") TO   "service_role";

COMMENT ON FUNCTION "public"."fn_worker_render_template"("p_version_id" "uuid", "p_inputs" "jsonb") IS
  'Worker-only: render a lens version template with the supplied inputs. Delegates to lenses.fn_render_template. Sets row_security off because lenses.versions has FORCE RLS, which otherwise blocks the read even for the definer; safe because this wrapper is service_role-only.';

-- ── 2. Claim functions: also return the battle's shared input snapshot ────────

DROP FUNCTION IF EXISTS "public"."fn_worker_claim_battle_job"("p_worker_id" "text");
DROP FUNCTION IF EXISTS "battles"."fn_claim_battle_execution_job"("p_worker_id" "text");

CREATE FUNCTION "battles"."fn_claim_battle_execution_job"("p_worker_id" "text")
RETURNS TABLE(
  "job_id"                  "uuid",
  "battle_id"               "uuid",
  "contender_id"            "uuid",
  "slot"                    "text",
  "task_prompt"             "text",
  "provider_key"            "text",
  "model_key"               "text",
  "byok_key_ref_id"         "uuid",
  "lens_id"                 "uuid",
  "version_id"              "uuid",
  "max_tokens"              integer,
  "temperature"             numeric,
  "retry_count"             integer,
  "ai_lenser_id"            "uuid",
  "personality_note"        "text",
  "personality_version_id"  "uuid",
  "shared_input_snapshot"   "jsonb"
)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'battles', 'agents', 'public'
    AS $$
DECLARE
  v_job battles.battle_execution_jobs;
BEGIN
  -- GUARD: system kill switch blocks all battle job claims immediately.
  IF public.fn_kill_switch_active('system') THEN
    RETURN;  -- empty result set — worker backs off silently
  END IF;

  SELECT j.*
  INTO   v_job
  FROM   battles.battle_execution_jobs j
  WHERE  j.status = 'queued'
    -- Respect backoff: fn_requeue_battle_job_with_backoff encodes the earliest
    -- pickup time in claimed_at. NULL = never been claimed; future = on backoff.
    AND  (j.claimed_at IS NULL OR j.claimed_at <= now())
  ORDER  BY j.created_at
  LIMIT  1
  FOR UPDATE SKIP LOCKED;

  IF NOT FOUND THEN
    RETURN;
  END IF;

  UPDATE battles.battle_execution_jobs
  SET    status     = 'claimed',
         worker_id  = p_worker_id,
         claimed_at = now()
  WHERE  id = v_job.id;

  RETURN QUERY
    SELECT
      v_job.id,
      v_job.battle_id,
      v_job.contender_id,
      v_job.slot,
      b.task_prompt,
      COALESCE(ec.provider_key, ''),
      COALESCE(ec.model_key,    ''),
      ec.byok_key_ref_id,
      cla.lens_id,
      cla.version_id,
      COALESCE(ec.max_tokens,  4096),
      COALESCE(ec.temperature, 0.7),
      v_job.retry_count,
      al.id,
      al.personality_note,
      plb.version_id,
      -- Shared [[parameter]] values resolved at battle creation time. Every
      -- contender renders its lens against this identical input set.
      COALESCE(b.shared_input_snapshot, '{}'::jsonb)
    FROM battles.battles b
    LEFT JOIN battles.execution_configs ec
           ON ec.battle_id    = v_job.battle_id
          AND (ec.contender_id = v_job.contender_id OR ec.contender_id IS NULL)
    LEFT JOIN battles.contender_lens_assignments cla
           ON cla.contender_id = v_job.contender_id
    LEFT JOIN battles.contenders con
           ON con.id             = v_job.contender_id
          AND con.contender_type = 'ai_agent'
    LEFT JOIN agents.ai_lensers al
           ON al.profile_id     = con.contender_ref_id
    LEFT JOIN agents.lens_bindings plb
           ON plb.ai_lenser_id  = al.id
          AND plb.is_default    = TRUE
          AND 'personality'     = ANY(plb.category_tags)
    WHERE b.id = v_job.battle_id
    ORDER BY ec.contender_id NULLS LAST
    LIMIT 1;
END;
$$;

ALTER FUNCTION "battles"."fn_claim_battle_execution_job"("p_worker_id" "text") OWNER TO "postgres";
REVOKE ALL     ON FUNCTION "battles"."fn_claim_battle_execution_job"("p_worker_id" "text") FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION "battles"."fn_claim_battle_execution_job"("p_worker_id" "text") TO "service_role";

COMMENT ON FUNCTION "battles"."fn_claim_battle_execution_job"("p_worker_id" "text") IS
  'CU fix (backoff timing) + Emergency Stop kill-switch guard. Also returns the battle''s shared_input_snapshot so the worker can hydrate the contender''s lens version template against the shared [[parameter]] values.';

-- ── 3. Public worker wrapper, byok_key_ref_id corrected to uuid ───────────────

CREATE FUNCTION "public"."fn_worker_claim_battle_job"("p_worker_id" "text")
RETURNS TABLE(
  "job_id"                  "uuid",
  "battle_id"               "uuid",
  "contender_id"            "uuid",
  "slot"                    "text",
  "task_prompt"             "text",
  "provider_key"            "text",
  "model_key"               "text",
  "byok_key_ref_id"         "uuid",
  "lens_id"                 "uuid",
  "version_id"              "uuid",
  "max_tokens"              integer,
  "temperature"             numeric,
  "retry_count"             integer,
  "ai_lenser_id"            "uuid",
  "personality_note"        "text",
  "personality_version_id"  "uuid",
  "shared_input_snapshot"   "jsonb"
)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'battles'
    AS $$
BEGIN
  RETURN QUERY SELECT * FROM battles.fn_claim_battle_execution_job(p_worker_id);
END;
$$;

ALTER FUNCTION "public"."fn_worker_claim_battle_job"("p_worker_id" "text") OWNER TO "postgres";
REVOKE ALL     ON FUNCTION "public"."fn_worker_claim_battle_job"("p_worker_id" "text") FROM "anon", "authenticated", PUBLIC;
GRANT  EXECUTE ON FUNCTION "public"."fn_worker_claim_battle_job"("p_worker_id" "text") TO   "service_role";

COMMENT ON FUNCTION "public"."fn_worker_claim_battle_job"("p_worker_id" "text") IS
  'Worker-only: claim the next queued battle execution job. Delegates to battles.fn_claim_battle_execution_job. Returns shared_input_snapshot for lens template hydration.';
