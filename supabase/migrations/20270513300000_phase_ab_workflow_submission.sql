-- Phase AB: Workflow-as-Submission Engine
-- Extends battles.submissions to support workflow and lens submission types.
-- fn_battle_submit_workflow creates a submission linked to a workflow run.
-- fn_battle_dispatch_workflow_submissions is called by the lifecycle tick
-- to fire workflow runs for agents that have a workflow binding.

-- ─── Extend battles.submissions ─────────────────────────────────────────────

ALTER TABLE battles.submissions
  ADD COLUMN IF NOT EXISTS workflow_id     UUID REFERENCES lenses.workflows(id),
  ADD COLUMN IF NOT EXISTS submission_type TEXT NOT NULL DEFAULT 'text'
    CHECK (submission_type IN ('text', 'workflow', 'lens'));

COMMENT ON COLUMN battles.submissions.workflow_id IS
  'Workflow that produced or defines this submission. Non-null when submission_type=workflow.';
COMMENT ON COLUMN battles.submissions.submission_type IS
  'Content type of the submission: text (default), workflow (DAG output), lens (lens output).';

-- Index for workflow submissions lookup
CREATE INDEX IF NOT EXISTS idx_submissions_workflow
  ON battles.submissions (workflow_id)
  WHERE workflow_id IS NOT NULL;

-- ─── fn_battles_join extended signature ──────────────────────────────────────
-- Overloaded: adds p_workflow_id parameter. The original fn_battles_join
-- (single p_battle_id) remains unchanged for backward compat.

CREATE OR REPLACE FUNCTION public.fn_battles_join(
  p_battle_id   UUID,
  p_agent_id    UUID        DEFAULT NULL,
  p_runner_mode TEXT        DEFAULT 'cloud',
  p_device_id   UUID        DEFAULT NULL,
  p_workflow_id UUID        DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = battles, agents, lensers, public
AS $$
DECLARE
  v_lenser_id    UUID;
  v_contender_id UUID;
  v_battle       battles.battles%ROWTYPE;
BEGIN
  SELECT p.id INTO v_lenser_id
  FROM   lensers.profiles p
  WHERE  p.user_id = auth.uid();

  IF v_lenser_id IS NULL THEN
    RAISE EXCEPTION 'battles_join_unauthenticated';
  END IF;

  SELECT * INTO v_battle FROM battles.battles WHERE id = p_battle_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'battles_join_not_found: %', p_battle_id;
  END IF;

  IF v_battle.status NOT IN ('open', 'executing') THEN
    RAISE EXCEPTION 'battles_join_not_open: status=%', v_battle.status;
  END IF;

  -- Idempotent: return existing contender if already joined
  SELECT id INTO v_contender_id
  FROM   battles.contenders
  WHERE  battle_id = p_battle_id
  AND    lenser_id = v_lenser_id
  LIMIT  1;

  IF v_contender_id IS NOT NULL THEN
    RETURN v_contender_id;
  END IF;

  -- Check max contenders
  IF (SELECT count(*) FROM battles.contenders WHERE battle_id = p_battle_id) >= v_battle.max_contenders THEN
    RAISE EXCEPTION 'battles_join_full: max_contenders=%', v_battle.max_contenders;
  END IF;

  INSERT INTO battles.contenders (
    battle_id,
    lenser_id,
    contender_status
  )
  VALUES (
    p_battle_id,
    v_lenser_id,
    'active'
  )
  RETURNING id INTO v_contender_id;

  INSERT INTO audit.events (event_type, actor_type, actor_id, payload)
  VALUES (
    'battle.joined',
    'lenser',
    v_lenser_id,
    jsonb_build_object(
      'battle_id',    p_battle_id,
      'agent_id',     p_agent_id,
      'runner_mode',  p_runner_mode,
      'device_id',    p_device_id,
      'workflow_id',  p_workflow_id
    )
  );

  RETURN v_contender_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.fn_battles_join(UUID, UUID, TEXT, UUID, UUID) TO authenticated;

-- ─── fn_battle_submit_workflow ────────────────────────────────────────────────
-- Creates a workflow-type submission linked to a workflow.
-- The actual workflow execution happens outside Postgres (CLI / worker).

CREATE OR REPLACE FUNCTION public.fn_battle_submit_workflow(
  p_battle_id   UUID,
  p_workflow_id UUID,
  p_run_id      UUID   DEFAULT NULL,  -- execution.requests id if available
  p_agent_id    UUID   DEFAULT NULL,
  p_content     TEXT   DEFAULT NULL   -- populated after execution completes
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = battles, lenses, lensers, public
AS $$
DECLARE
  v_lenser_id    UUID;
  v_submission_id UUID;
BEGIN
  SELECT p.id INTO v_lenser_id
  FROM   lensers.profiles p
  WHERE  p.user_id = auth.uid();

  -- Verify contender registration
  IF NOT EXISTS (
    SELECT 1 FROM battles.contenders c
    WHERE  c.battle_id  = p_battle_id
    AND    c.lenser_id  = v_lenser_id
  ) THEN
    RAISE EXCEPTION 'submit_workflow_not_registered: join battle first';
  END IF;

  -- Verify workflow ownership or visibility
  IF NOT EXISTS (
    SELECT 1 FROM lenses.workflows w
    WHERE  w.id = p_workflow_id
    AND    (w.lenser_id = v_lenser_id OR w.visibility = 'public')
  ) THEN
    RAISE EXCEPTION 'submit_workflow_not_accessible: workflow % not found or not accessible', p_workflow_id;
  END IF;

  -- Get contender_id
  INSERT INTO battles.submissions (
    battle_id,
    contender_id,
    submission_type,
    workflow_id,
    execution_run_id,
    source_type,
    content_text,
    status
  )
  SELECT
    p_battle_id,
    c.id,
    'workflow',
    p_workflow_id,
    p_run_id,
    CASE WHEN p_run_id IS NOT NULL THEN 'execution_output' ELSE 'manual' END,
    p_content,
    CASE WHEN p_content IS NOT NULL THEN 'submitted' ELSE 'pending' END
  FROM battles.contenders c
  WHERE c.battle_id = p_battle_id
  AND   c.lenser_id = v_lenser_id
  LIMIT 1
  RETURNING id INTO v_submission_id;

  RETURN v_submission_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.fn_battle_submit_workflow(UUID, UUID, UUID, UUID, TEXT) TO authenticated;

-- ─── fn_battle_update_workflow_submission ────────────────────────────────────
-- Called by the CLI after workflow execution completes to fill in content.

CREATE OR REPLACE FUNCTION public.fn_battle_update_workflow_submission(
  p_submission_id  UUID,
  p_content        TEXT,
  p_execution_run_id UUID DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = battles, lensers, public
AS $$
DECLARE
  v_lenser_id UUID;
BEGIN
  SELECT p.id INTO v_lenser_id
  FROM   lensers.profiles p
  WHERE  p.user_id = auth.uid();

  UPDATE battles.submissions s
  SET    content_text      = p_content,
         execution_run_id  = COALESCE(p_execution_run_id, s.execution_run_id),
         status            = 'submitted',
         submitted_at      = now(),
         updated_at        = now()
  FROM   battles.contenders c
  WHERE  s.id         = p_submission_id
  AND    c.id         = s.contender_id
  AND    c.lenser_id  = v_lenser_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'update_workflow_submission_forbidden_or_not_found: %', p_submission_id;
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.fn_battle_update_workflow_submission(UUID, TEXT, UUID) TO authenticated;
