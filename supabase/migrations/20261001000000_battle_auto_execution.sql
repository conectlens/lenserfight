-- Phase 17: Autonomous Battle Execution Engine
-- Adds execution_starts_at scheduling, server-side job queue, and auto-publish
-- to the battles schema. pg_cron functions drive the full lifecycle without
-- human intervention.

-- ─── 1. Schema columns ──────────────────────────────────────────────────────

ALTER TABLE battles.battles
  ADD COLUMN IF NOT EXISTS execution_starts_at    TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS executing_started_at   TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS auto_publish            BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS voting_duration_hours   INT     NOT NULL DEFAULT 24;

-- ─── 2. Execution jobs queue ─────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS battles.battle_execution_jobs (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  battle_id     UUID        NOT NULL REFERENCES battles.battles(id) ON DELETE CASCADE,
  contender_id  UUID        NOT NULL REFERENCES battles.contenders(id) ON DELETE CASCADE,
  slot          TEXT        NOT NULL CHECK (slot IN ('A','B')),
  status        TEXT        NOT NULL DEFAULT 'queued'
                              CHECK (status IN ('queued','claimed','running','completed','failed')),
  worker_id     TEXT,
  claimed_at    TIMESTAMPTZ,
  completed_at  TIMESTAMPTZ,
  retry_count   INT         NOT NULL DEFAULT 0,
  max_retries   INT         NOT NULL DEFAULT 3,
  error_message TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (battle_id, contender_id)
);

-- Only the service role (platform-api worker) can touch this table.
ALTER TABLE battles.battle_execution_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_role_all_battle_execution_jobs"
  ON battles.battle_execution_jobs
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_battle_execution_jobs_queued
  ON battles.battle_execution_jobs (created_at)
  WHERE status = 'queued';

CREATE INDEX IF NOT EXISTS idx_battle_execution_jobs_battle
  ON battles.battle_execution_jobs (battle_id);

-- ─── 3. fn_auto_start_battles ────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION battles.fn_auto_start_battles()
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = battles, public
AS $$
DECLARE
  r          RECORD;
  started    INT := 0;
  cont       RECORD;
BEGIN
  FOR r IN
    SELECT b.id, b.voting_duration_hours
    FROM   battles.battles b
    WHERE  b.status = 'open'
    AND    b.execution_starts_at <= now()
    AND    b.battle_type IN ('ai_vs_ai', 'workflow_battle')
    FOR UPDATE SKIP LOCKED
  LOOP
    BEGIN
      -- Transition to executing
      UPDATE battles.battles
      SET    status               = 'executing',
             executing_started_at = now()
      WHERE  id = r.id;

      -- Create one job per contender
      FOR cont IN
        SELECT id, slot
        FROM   battles.contenders
        WHERE  battle_id = r.id
        ORDER  BY slot
      LOOP
        INSERT INTO battles.battle_execution_jobs
          (battle_id, contender_id, slot, status)
        VALUES
          (r.id, cont.id, cont.slot, 'queued')
        ON CONFLICT (battle_id, contender_id) DO NOTHING;
      END LOOP;

      -- Audit log
      INSERT INTO audit.events (event_type, payload)
      VALUES ('battle.auto_started', jsonb_build_object('battle_id', r.id));

      started := started + 1;
    EXCEPTION WHEN OTHERS THEN
      -- Per-battle errors must not abort the whole sweep.
      RAISE WARNING 'fn_auto_start_battles: battle % failed: %', r.id, SQLERRM;
    END;
  END LOOP;

  RETURN started;
END;
$$;

-- ─── 4. fn_claim_battle_execution_job ────────────────────────────────────────

CREATE OR REPLACE FUNCTION battles.fn_claim_battle_execution_job(p_worker_id TEXT)
RETURNS TABLE (
  job_id            UUID,
  battle_id         UUID,
  contender_id      UUID,
  slot              TEXT,
  task_prompt       TEXT,
  provider_key      TEXT,
  model_key         TEXT,
  byok_key_ref_id   TEXT,
  lens_id           UUID,
  version_id        UUID,
  max_tokens        INT,
  temperature       NUMERIC,
  retry_count       INT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = battles, execution, public
AS $$
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
      COALESCE(ec.max_tokens, 4096),
      COALESCE(ec.temperature, 0.7),
      v_job.retry_count
    FROM battles.battles b
    LEFT JOIN execution.execution_configs ec
           ON ec.battle_id    = v_job.battle_id
          AND (ec.contender_id = v_job.contender_id OR ec.contender_id IS NULL)
    LEFT JOIN battles.contender_lens_assignments cla
           ON cla.contender_id = v_job.contender_id
    WHERE b.id = v_job.battle_id
    ORDER BY ec.contender_id NULLS LAST   -- contender-specific config wins
    LIMIT 1;
END;
$$;

-- ─── 5. fn_battles_start_voting_internal ─────────────────────────────────────
-- Internal variant — no auth guard. Used by fn_complete_battle_execution_job.

CREATE OR REPLACE FUNCTION battles.fn_battles_start_voting_internal(
  p_battle_id          UUID,
  p_voting_closes_at   TIMESTAMPTZ
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = battles, public
AS $$
BEGIN
  UPDATE battles.battles
  SET    status           = 'voting',
         voting_opens_at  = now(),
         voting_closes_at = p_voting_closes_at
  WHERE  id     = p_battle_id
  AND    status = 'executing';

  INSERT INTO audit.events (event_type, payload)
  VALUES ('battle.voting_started_internal', jsonb_build_object(
    'battle_id',        p_battle_id,
    'voting_closes_at', p_voting_closes_at
  ));
END;
$$;

-- ─── 6. fn_complete_battle_execution_job ─────────────────────────────────────

CREATE OR REPLACE FUNCTION battles.fn_complete_battle_execution_job(
  p_job_id      UUID,
  p_status      TEXT,  -- 'completed' | 'failed'
  p_output_text TEXT   DEFAULT NULL,
  p_error       TEXT   DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = battles, public
AS $$
DECLARE
  v_job           battles.battle_execution_jobs;
  v_battle        battles.battles;
  v_pending_count INT;
BEGIN
  SELECT * INTO v_job FROM battles.battle_execution_jobs WHERE id = p_job_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'job not found: %', p_job_id; END IF;

  SELECT * INTO v_battle FROM battles.battles WHERE id = v_job.battle_id;

  -- Update job terminal state
  UPDATE battles.battle_execution_jobs
  SET    status       = p_status,
         completed_at = now(),
         error_message = p_error
  WHERE  id = p_job_id;

  -- On success: record the submission
  IF p_status = 'completed' AND p_output_text IS NOT NULL THEN
    INSERT INTO battles.submissions (battle_id, contender_id, content_text, content_url, status)
    VALUES (v_job.battle_id, v_job.contender_id, p_output_text, NULL, 'submitted')
    ON CONFLICT (battle_id, contender_id) DO UPDATE SET content_text = EXCLUDED.content_text, status = 'submitted';
  END IF;

  -- If both jobs are now done (completed or failed), auto-start voting
  SELECT COUNT(*)
  INTO   v_pending_count
  FROM   battles.battle_execution_jobs
  WHERE  battle_id = v_job.battle_id
  AND    status    NOT IN ('completed','failed');

  IF v_pending_count = 0 AND v_battle.status = 'executing' THEN
    PERFORM battles.fn_battles_start_voting_internal(
      v_job.battle_id,
      now() + (v_battle.voting_duration_hours || ' hours')::INTERVAL
    );
  END IF;

  INSERT INTO audit.events (event_type, payload)
  VALUES ('battle.execution_job_completed', jsonb_build_object(
    'job_id',     p_job_id,
    'battle_id',  v_job.battle_id,
    'slot',       v_job.slot,
    'status',     p_status
  ));
END;
$$;

-- ─── 7. fn_requeue_battle_job_with_backoff ───────────────────────────────────
-- Called by the platform-api battle worker on transient failure to schedule a
-- retry after an exponential backoff delay.

CREATE OR REPLACE FUNCTION battles.fn_requeue_battle_job_with_backoff(
  p_job_id     UUID,
  p_backoff_ms INT,
  p_error      TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = battles
AS $$
BEGIN
  UPDATE battles.battle_execution_jobs
  SET    status        = 'queued',
         worker_id     = NULL,
         claimed_at    = now() + (p_backoff_ms || ' milliseconds')::INTERVAL,
         retry_count   = retry_count + 1,
         error_message = p_error
  WHERE  id = p_job_id;
END;
$$;


-- ─── 8. fn_battles_publish_internal ──────────────────────────────────────────
-- SECURITY DEFINER variant of fn_battles_publish — no caller auth check.
-- Only called from server-side cron / auto-publish path.

CREATE OR REPLACE FUNCTION battles.fn_battles_publish_internal(p_battle_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = battles, public
AS $$
BEGIN
  UPDATE battles.battles
  SET    status       = 'published',
         published_at = now()
  WHERE  id     = p_battle_id
  AND    status = 'closed';

  -- Notify participants (Phase 18 adds fn_notify_battle_result; guard with IF EXISTS)
  IF EXISTS (
    SELECT 1 FROM pg_proc
    WHERE  proname = 'fn_notify_battle_result'
    AND    pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
  ) THEN
    PERFORM public.fn_notify_battle_result(p_battle_id);
  END IF;

  INSERT INTO audit.events (event_type, payload)
  VALUES ('battle.auto_published', jsonb_build_object('battle_id', p_battle_id));
END;
$$;

-- ─── 8. fn_auto_publish_battles ──────────────────────────────────────────────

CREATE OR REPLACE FUNCTION battles.fn_auto_publish_battles()
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = battles, public
AS $$
DECLARE
  r         RECORD;
  published INT := 0;
BEGIN
  FOR r IN
    SELECT id
    FROM   battles.battles
    WHERE  status       = 'closed'
    AND    auto_publish = TRUE
    FOR UPDATE SKIP LOCKED
  LOOP
    BEGIN
      PERFORM battles.fn_battles_publish_internal(r.id);
      published := published + 1;
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'fn_auto_publish_battles: battle % failed: %', r.id, SQLERRM;
    END;
  END LOOP;

  RETURN published;
END;
$$;

-- ─── 9. pg_cron registrations ────────────────────────────────────────────────

-- Guard: only register if pg_cron extension is present (avoids errors in local dev)
DO $do$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    PERFORM cron.schedule(
      'auto-start-battles',
      '*/2 * * * *',
      $$SELECT battles.fn_auto_start_battles()$$
    );

    PERFORM cron.schedule(
      'auto-publish-battles',
      '*/5 * * * *',
      $$SELECT battles.fn_auto_publish_battles()$$
    );
  END IF;
END;
$do$;
