-- Phase CU — Battle execution reliability hardening
--
-- Fixes two production gaps in the job queue:
--
-- 1. BACKOFF TIMING BUG
--    fn_requeue_battle_job_with_backoff sets claimed_at = now() + backoff_ms
--    to signal "do not pick up before this time". But fn_claim_battle_execution_job
--    queries WHERE status = 'queued' without checking claimed_at, so requeued jobs
--    are re-claimed on the very next worker tick regardless of the intended delay.
--    Fix: re-create the claim function with AND (claimed_at IS NULL OR claimed_at <= now()).
--
-- 2. ORPHANED JOB RECLAMATION
--    If a worker crashes after claiming a job but before calling
--    fn_worker_complete_battle_job, the job remains in 'claimed' status forever.
--    No existing mechanism reclaims such stale jobs, causing the battle to be
--    permanently stuck in 'executing' status.
--    Fix: add battles.fn_reclaim_stale_battle_jobs() + pg_cron every 2 minutes.

-- ─── 1. Fix backoff timing in fn_claim_battle_execution_job ──────────────────
--
-- Re-create with the claimed_at guard so the exponential-backoff mechanism
-- actually delays retries. The DROP is required because we can't OR REPLACE
-- a function whose RETURNS TABLE shape is being amended in the same call.

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
SET search_path = 'battles', 'agents', 'public'
AS $$
DECLARE
  v_job  battles.battle_execution_jobs;
BEGIN
  SELECT j.*
  INTO   v_job
  FROM   battles.battle_execution_jobs j
  WHERE  j.status = 'queued'
    -- Respect backoff: fn_requeue_battle_job_with_backoff encodes the earliest
    -- pickup time in claimed_at. NULL = never been claimed; future = on backoff.
    AND    (j.claimed_at IS NULL OR j.claimed_at <= now())
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
$$;

REVOKE ALL ON FUNCTION battles.fn_claim_battle_execution_job(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION battles.fn_claim_battle_execution_job(text) FROM authenticated;
GRANT  EXECUTE ON FUNCTION battles.fn_claim_battle_execution_job(text) TO service_role;

COMMENT ON FUNCTION battles.fn_claim_battle_execution_job(text) IS
  'CU fix: adds (claimed_at IS NULL OR claimed_at <= now()) guard so '
  'fn_requeue_battle_job_with_backoff exponential delays are respected. '
  'Previously, requeued jobs were immediately re-claimed on the next tick.';

-- ─── 2. fn_reclaim_stale_battle_jobs ─────────────────────────────────────────
--
-- Reclaims jobs stuck in ''claimed'' status because the worker that claimed them
-- crashed before completing the job.
--
-- Logic:
--   - Jobs with status = 'claimed' and claimed_at older than p_stale_after_minutes
--     are considered orphaned.
--   - If retry_count < max_retries - 1: return to 'queued' with retry_count++
--     (the next worker pick-up will retry with fresh exponential backoff).
--   - If retry_count >= max_retries - 1: mark 'failed' and create a DLQ entry.
--
-- Called by pg_cron every 2 minutes (registered below).

CREATE OR REPLACE FUNCTION battles.fn_reclaim_stale_battle_jobs(
  p_stale_after_minutes integer DEFAULT 10
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'battles', 'audit', 'public'
AS $$
DECLARE
  r         RECORD;
  reclaimed integer := 0;
BEGIN
  FOR r IN
    SELECT j.id, j.battle_id, j.contender_id, j.slot, j.retry_count, j.max_retries
    FROM   battles.battle_execution_jobs j
    WHERE  j.status     = 'claimed'
      AND  j.claimed_at < now() - (p_stale_after_minutes || ' minutes')::interval
    FOR UPDATE SKIP LOCKED
  LOOP
    BEGIN
      IF r.retry_count >= r.max_retries - 1 THEN
        -- Max retries exhausted: move to DLQ.
        UPDATE battles.battle_execution_jobs
        SET    status        = 'failed',
               error_message = 'stale_claim: worker did not complete within timeout',
               completed_at  = now()
        WHERE  id = r.id;

        -- Re-use the existing DLQ function (handles the dead-letter insert).
        PERFORM battles.fn_move_battle_job_to_dlq(
          r.id,
          'stale_claim.max_retries_exceeded',
          format(
            'Worker did not complete job within %s minutes (retry_count=%s, max_retries=%s)',
            p_stale_after_minutes, r.retry_count, r.max_retries
          )
        );
      ELSE
        -- Still have retries left: return to queued immediately (no backoff added
        -- here — the worker will apply exponential backoff on its next failure).
        UPDATE battles.battle_execution_jobs
        SET    status        = 'queued',
               worker_id     = NULL,
               claimed_at    = NULL,
               retry_count   = retry_count + 1,
               error_message = format(
                 'stale_claim: requeued after %s-minute worker timeout (attempt %s)',
                 p_stale_after_minutes, retry_count + 1
               )
        WHERE  id = r.id;
      END IF;

      INSERT INTO audit.events (event_type, payload)
      VALUES (
        'battle.stale_job_reclaimed',
        jsonb_build_object(
          'job_id',      r.id,
          'battle_id',   r.battle_id,
          'slot',        r.slot,
          'retry_count', r.retry_count,
          'to_dlq',      r.retry_count >= r.max_retries - 1
        )
      );

      reclaimed := reclaimed + 1;
    EXCEPTION WHEN OTHERS THEN
      -- Per-job errors must not abort the sweep.
      RAISE WARNING 'fn_reclaim_stale_battle_jobs: job % failed: %', r.id, SQLERRM;
    END;
  END LOOP;

  RETURN reclaimed;
END;
$$;

REVOKE ALL ON FUNCTION battles.fn_reclaim_stale_battle_jobs(integer) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION battles.fn_reclaim_stale_battle_jobs(integer) TO service_role;

COMMENT ON FUNCTION battles.fn_reclaim_stale_battle_jobs(integer) IS
  'CU: Reclaims battle execution jobs stuck in ''claimed'' status when a worker '
  'crashes mid-execution. Returns them to ''queued'' (with retry++) or moves '
  'them to the DLQ when max_retries is exhausted. Runs every 2 min via pg_cron.';

-- ─── 3. Schedule reclamation via pg_cron ─────────────────────────────────────

DO $do$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    RETURN;
  END IF;

  PERFORM cron.unschedule('reclaim-stale-battle-jobs')
    WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'reclaim-stale-battle-jobs');

  PERFORM cron.schedule(
    'reclaim-stale-battle-jobs',
    '*/2 * * * *',
    $$SELECT battles.fn_reclaim_stale_battle_jobs()$$
  );
END;
$do$;
