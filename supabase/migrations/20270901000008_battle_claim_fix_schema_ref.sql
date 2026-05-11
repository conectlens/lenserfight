-- ─────────────────────────────────────────────────────────────────────────────
-- Phase BA — D9: fix schema reference in battles.fn_claim_battle_execution_job
--
-- Surfaced by pgTAP 33_automation_claim.sql. The function references
-- `execution.execution_configs`, but the table actually lives at
-- `battles.execution_configs`. There is no `execution_configs` table in
-- the `execution` schema (verified via information_schema).
--
-- Consequence: any call to fn_claim_battle_execution_job that returns a row
-- raises ERROR "relation execution.execution_configs does not exist". Battle
-- automation is unreachable until this is fixed.
--
-- Fix: re-create the function with the JOIN qualified to battles.execution_configs,
-- and correct byok_key_ref_id return type from text → uuid (matches the table).
-- The legacy text-typed signature must be dropped first (PG cannot change a
-- RETURNS TABLE column type via CREATE OR REPLACE).
-- ─────────────────────────────────────────────────────────────────────────────
DROP FUNCTION IF EXISTS battles.fn_claim_battle_execution_job(text);

CREATE OR REPLACE FUNCTION battles.fn_claim_battle_execution_job(p_worker_id text)
RETURNS TABLE (
  job_id                 uuid,
  battle_id              uuid,
  contender_id           uuid,
  slot                   text,
  task_prompt            text,
  provider_key           text,
  model_key              text,
  byok_key_ref_id        uuid,
  lens_id                uuid,
  version_id             uuid,
  max_tokens             integer,
  temperature            numeric,
  retry_count            integer,
  ai_lenser_id           uuid,
  personality_note       text,
  personality_version_id uuid
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'battles', 'agents', 'execution', 'public'
AS $function$
DECLARE
  v_job  battles.battle_execution_jobs;
BEGIN
  SELECT j.*
  INTO   v_job
  FROM   battles.battle_execution_jobs j
  WHERE  j.status = 'queued'
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
      COALESCE(ec.max_tokens,   4096),
      COALESCE(ec.temperature,  0.7),
      v_job.retry_count,
      al.id,
      al.personality_note,
      plb.version_id
    FROM battles.battles b
    LEFT JOIN battles.execution_configs ec
           ON ec.battle_id    = v_job.battle_id
          AND (ec.contender_id = v_job.contender_id OR ec.contender_id IS NULL)
    LEFT JOIN battles.contender_lens_assignments cla
           ON cla.contender_id = v_job.contender_id
    LEFT JOIN battles.contenders con
           ON con.id              = v_job.contender_id
          AND con.contender_type  = 'ai_agent'
    LEFT JOIN agents.ai_lensers al
           ON al.profile_id      = con.contender_ref_id
    LEFT JOIN agents.lens_bindings plb
           ON plb.ai_lenser_id   = al.id
          AND plb.is_default     = TRUE
          AND 'personality'      = ANY(plb.category_tags)
    WHERE b.id = v_job.battle_id
    ORDER BY ec.contender_id NULLS LAST
    LIMIT 1;
END;
$function$;

REVOKE ALL ON FUNCTION battles.fn_claim_battle_execution_job(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION battles.fn_claim_battle_execution_job(text) FROM authenticated;
GRANT  EXECUTE ON FUNCTION battles.fn_claim_battle_execution_job(text) TO service_role;

COMMENT ON FUNCTION battles.fn_claim_battle_execution_job(text) IS
  'D9 fix: schema-qualifies execution_configs to battles.* (formerly '
  'execution.* which never existed), and corrects byok_key_ref_id return '
  'type uuid (formerly text, would have failed at first row). Service-role '
  'worker claim primitive: FOR UPDATE SKIP LOCKED on one queued job.';
