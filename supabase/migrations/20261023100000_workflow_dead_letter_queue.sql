-- Phase 19: Workflow Autonomous Hardening
-- Adds dead-letter queues for battle execution jobs and workflow runs,
-- worker heartbeat table for health monitoring.

-- ─── 1. Worker heartbeats ─────────────────────────────────────────────────────

CREATE SCHEMA IF NOT EXISTS platform;

CREATE TABLE IF NOT EXISTS platform.api_worker_heartbeats (
  worker_id    TEXT        PRIMARY KEY,
  worker_type  TEXT        NOT NULL DEFAULT 'workflow',
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  metadata     JSONB       NOT NULL DEFAULT '{}'
);

-- Only service_role touches this (platform-api worker)
ALTER TABLE platform.api_worker_heartbeats ENABLE ROW LEVEL SECURITY;

CREATE POLICY "heartbeats_service_all"
  ON platform.api_worker_heartbeats
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ─── 2. Battle execution dead-letter queue ────────────────────────────────────

CREATE TABLE IF NOT EXISTS battles.battle_execution_dead_letters (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id        UUID        NOT NULL REFERENCES battles.battle_execution_jobs(id) ON DELETE CASCADE,
  battle_id     UUID        NOT NULL,
  contender_id  UUID        NOT NULL,
  slot          TEXT,
  error_code    TEXT,
  error_message TEXT,
  attempt_count INT         NOT NULL DEFAULT 1,
  payload       JSONB       NOT NULL DEFAULT '{}',
  resolved_at   TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_battle_dlq_unresolved
  ON battles.battle_execution_dead_letters (created_at DESC)
  WHERE resolved_at IS NULL;

ALTER TABLE battles.battle_execution_dead_letters ENABLE ROW LEVEL SECURITY;

CREATE POLICY "battle_dlq_service_all"
  ON battles.battle_execution_dead_letters
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ─── 3. Workflow run dead-letter queue ────────────────────────────────────────

CREATE TABLE IF NOT EXISTS lenses.workflow_run_dead_letters (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id           UUID        NOT NULL REFERENCES lenses.workflow_runs(id) ON DELETE CASCADE,
  node_id          TEXT,
  error_code       TEXT,
  error_message    TEXT,
  last_attempt_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  attempt_count    INT         NOT NULL DEFAULT 1,
  payload          JSONB       NOT NULL DEFAULT '{}',
  resolved_at      TIMESTAMPTZ,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_workflow_dlq_unresolved
  ON lenses.workflow_run_dead_letters (created_at DESC)
  WHERE resolved_at IS NULL;

ALTER TABLE lenses.workflow_run_dead_letters ENABLE ROW LEVEL SECURITY;

CREATE POLICY "workflow_dlq_service_all"
  ON lenses.workflow_run_dead_letters
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ─── 4. fn_move_battle_job_to_dlq ────────────────────────────────────────────

CREATE OR REPLACE FUNCTION battles.fn_move_battle_job_to_dlq(
  p_job_id      UUID,
  p_error_code  TEXT DEFAULT NULL,
  p_error_msg   TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = battles
AS $$
DECLARE
  v_job battles.battle_execution_jobs;
  v_dlq_id UUID;
BEGIN
  SELECT * INTO v_job FROM battles.battle_execution_jobs WHERE id = p_job_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'job not found: %', p_job_id; END IF;

  INSERT INTO battles.battle_execution_dead_letters
    (job_id, battle_id, contender_id, slot, error_code, error_message, attempt_count)
  VALUES
    (p_job_id, v_job.battle_id, v_job.contender_id, v_job.slot,
     p_error_code, p_error_msg, v_job.retry_count + 1)
  RETURNING id INTO v_dlq_id;

  UPDATE battles.battle_execution_jobs
  SET    status = 'failed', error_message = p_error_msg
  WHERE  id = p_job_id;

  RETURN v_dlq_id;
END;
$$;

-- ─── 5. fn_retry_dead_letter_battle_job ──────────────────────────────────────

CREATE OR REPLACE FUNCTION battles.fn_retry_dead_letter_battle_job(p_dead_letter_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = battles
AS $$
DECLARE
  v_dlq battles.battle_execution_dead_letters;
BEGIN
  SELECT * INTO v_dlq FROM battles.battle_execution_dead_letters WHERE id = p_dead_letter_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'dead letter not found: %', p_dead_letter_id; END IF;
  IF v_dlq.resolved_at IS NOT NULL THEN RAISE EXCEPTION 'dead letter already resolved'; END IF;

  -- Requeue the original job
  UPDATE battles.battle_execution_jobs
  SET    status        = 'queued',
         worker_id     = NULL,
         claimed_at    = NULL,
         retry_count   = retry_count + 1,
         error_message = NULL
  WHERE  id = v_dlq.job_id;

  -- Mark DLQ entry as resolved
  UPDATE battles.battle_execution_dead_letters
  SET    resolved_at = now()
  WHERE  id = p_dead_letter_id;
END;
$$;

-- ─── 6. fn_move_workflow_run_to_dlq ──────────────────────────────────────────

CREATE OR REPLACE FUNCTION lenses.fn_move_workflow_run_to_dlq(
  p_run_id      UUID,
  p_node_id     TEXT    DEFAULT NULL,
  p_error_code  TEXT    DEFAULT NULL,
  p_error_msg   TEXT    DEFAULT NULL,
  p_payload     JSONB   DEFAULT '{}'
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = lenses
AS $$
DECLARE
  v_dlq_id UUID;
BEGIN
  INSERT INTO lenses.workflow_run_dead_letters
    (run_id, node_id, error_code, error_message, payload)
  VALUES
    (p_run_id, p_node_id, p_error_code, p_error_msg, p_payload)
  RETURNING id INTO v_dlq_id;

  RETURN v_dlq_id;
END;
$$;

-- ─── 7. fn_upsert_worker_heartbeat ───────────────────────────────────────────

CREATE OR REPLACE FUNCTION platform.fn_upsert_worker_heartbeat(
  p_worker_id   TEXT,
  p_worker_type TEXT  DEFAULT 'workflow',
  p_metadata    JSONB DEFAULT '{}'
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = platform
AS $$
BEGIN
  INSERT INTO platform.api_worker_heartbeats (worker_id, worker_type, last_seen_at, metadata)
  VALUES (p_worker_id, p_worker_type, now(), p_metadata)
  ON CONFLICT (worker_id) DO UPDATE
  SET last_seen_at = now(),
      worker_type  = EXCLUDED.worker_type,
      metadata     = EXCLUDED.metadata;
END;
$$;

-- ─── 8. fn_get_worker_health ─────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION platform.fn_get_worker_health()
RETURNS TABLE (
  worker_id       TEXT,
  worker_type     TEXT,
  last_seen_at    TIMESTAMPTZ,
  is_healthy      BOOLEAN,
  seconds_since   NUMERIC
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = platform
AS $$
  SELECT
    worker_id,
    worker_type,
    last_seen_at,
    (EXTRACT(EPOCH FROM (now() - last_seen_at)) < 30) AS is_healthy,
    ROUND(EXTRACT(EPOCH FROM (now() - last_seen_at))::NUMERIC, 1) AS seconds_since
  FROM platform.api_worker_heartbeats
  ORDER BY last_seen_at DESC;
$$;
