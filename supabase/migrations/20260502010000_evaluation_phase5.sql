-- =============================================================================
-- 20260502010000_evaluation_phase5.sql
-- -----------------------------------------------------------------------------
-- Phase 5: versioned rubrics, baseline snapshots, per-case passed flag,
-- evaluator assignee_kind, and post-run evaluation trigger RPC.
-- =============================================================================

-- ─── evaluation_rubrics ──────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS agents.evaluation_rubrics (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  evaluation_id uuid NOT NULL REFERENCES agents.evaluations(id) ON DELETE CASCADE,
  version       integer NOT NULL DEFAULT 1,
  criteria      jsonb NOT NULL DEFAULT '[]'::jsonb,
                -- Each element: {name: text, weight: numeric, threshold: numeric, operator: ">=" | "<=" | "=="}
  is_current    boolean NOT NULL DEFAULT true,
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_evaluation_rubrics_eval
  ON agents.evaluation_rubrics (evaluation_id, version DESC);

-- ─── evaluation_baselines ────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS agents.evaluation_baselines (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  evaluation_id uuid NOT NULL REFERENCES agents.evaluations(id) ON DELETE CASCADE,
  run_id        uuid NOT NULL REFERENCES agents.evaluation_runs(id) ON DELETE CASCADE,
  score         numeric NULL,
  set_at        timestamptz NOT NULL DEFAULT now(),
  set_by        uuid REFERENCES lensers.profiles(id) ON DELETE SET NULL,
  CONSTRAINT evaluation_baselines_one_per_eval UNIQUE (evaluation_id)
);

-- ─── Extend evaluation_case_results ──────────────────────────────────────────

ALTER TABLE agents.evaluation_case_results
  ADD COLUMN IF NOT EXISTS passed boolean;

-- ─── Extend evaluation_runs ──────────────────────────────────────────────────

ALTER TABLE agents.evaluation_runs
  ADD COLUMN IF NOT EXISTS rubric_id uuid REFERENCES agents.evaluation_rubrics(id) ON DELETE SET NULL;

-- ─── Rebuild evaluation_results_v to include passed ──────────────────────────

DROP VIEW IF EXISTS agents.evaluation_results_v;
CREATE OR REPLACE VIEW agents.evaluation_results_v AS
SELECT
  cr.id              AS result_id,
  r.id               AS run_id,
  r.evaluation_id,
  r.status           AS run_status,
  r.score            AS run_score,
  r.started_at,
  r.completed_at,
  c.id               AS case_id,
  c.input,
  c.expected,
  c.weight,
  c.tags,
  cr.score           AS case_score,
  cr.output          AS case_output,
  cr.error           AS case_error,
  cr.passed          AS passed
FROM agents.evaluation_case_results cr
JOIN agents.evaluation_runs  r ON r.id = cr.evaluation_run_id
JOIN agents.evaluation_cases c ON c.id = cr.case_id
JOIN agents.evaluations      e ON e.id = r.evaluation_id
WHERE e.owner_lenser_id = auth.uid()
   OR (e.ai_lenser_id IS NOT NULL AND agents.can_manage_ai_lenser(e.ai_lenser_id));

GRANT SELECT ON agents.evaluation_results_v TO authenticated, service_role;

-- ─── Extend workflow_assignments: add 'evaluator' kind ───────────────────────

ALTER TABLE agents.workflow_assignments
  DROP CONSTRAINT IF EXISTS workflow_assignments_assignee_kind_check;

ALTER TABLE agents.workflow_assignments
  ADD CONSTRAINT workflow_assignments_assignee_kind_check
  CHECK (assignee_kind = ANY(ARRAY['agent'::text, 'team'::text, 'evaluator'::text]));

ALTER TABLE agents.workflow_assignments
  DROP CONSTRAINT IF EXISTS workflow_assignments_assignee_check;

ALTER TABLE agents.workflow_assignments
  ADD CONSTRAINT workflow_assignments_assignee_check CHECK (
    (assignee_kind = 'agent'     AND assignee_ai_lenser_id IS NOT NULL AND assignee_team_id IS NULL) OR
    (assignee_kind = 'team'      AND assignee_team_id      IS NOT NULL AND assignee_ai_lenser_id IS NULL) OR
    (assignee_kind = 'evaluator' AND assignee_ai_lenser_id IS NOT NULL AND assignee_team_id IS NULL)
  );

-- ─── RLS for new tables ──────────────────────────────────────────────────────

ALTER TABLE agents.evaluation_rubrics  ENABLE ROW LEVEL SECURITY;
ALTER TABLE agents.evaluation_baselines ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS evaluation_rubrics_owner_all ON agents.evaluation_rubrics;
CREATE POLICY evaluation_rubrics_owner_all ON agents.evaluation_rubrics
  FOR ALL
  USING (EXISTS (
    SELECT 1 FROM agents.evaluations e
    WHERE e.id = evaluation_id
      AND (e.owner_lenser_id = auth.uid()
           OR (e.ai_lenser_id IS NOT NULL AND agents.can_manage_ai_lenser(e.ai_lenser_id)))
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM agents.evaluations e
    WHERE e.id = evaluation_id
      AND (e.owner_lenser_id = auth.uid()
           OR (e.ai_lenser_id IS NOT NULL AND agents.can_manage_ai_lenser(e.ai_lenser_id)))
  ));

DROP POLICY IF EXISTS evaluation_baselines_owner_all ON agents.evaluation_baselines;
CREATE POLICY evaluation_baselines_owner_all ON agents.evaluation_baselines
  FOR ALL
  USING (EXISTS (
    SELECT 1 FROM agents.evaluations e
    WHERE e.id = evaluation_id
      AND (e.owner_lenser_id = auth.uid()
           OR (e.ai_lenser_id IS NOT NULL AND agents.can_manage_ai_lenser(e.ai_lenser_id)))
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM agents.evaluations e
    WHERE e.id = evaluation_id
      AND (e.owner_lenser_id = auth.uid()
           OR (e.ai_lenser_id IS NOT NULL AND agents.can_manage_ai_lenser(e.ai_lenser_id)))
  ));

GRANT SELECT, INSERT, UPDATE, DELETE ON
  agents.evaluation_rubrics,
  agents.evaluation_baselines
TO authenticated, service_role;

-- ─── RPC: post-run evaluation trigger ────────────────────────────────────────
-- Called by useTeamRunDispatch (fire-and-forget) after a workflow run completes.
-- Queues one evaluation_run for every evaluation targeting this workflow.

DROP FUNCTION IF EXISTS agents.fn_trigger_post_run_evaluations(uuid, uuid);
CREATE OR REPLACE FUNCTION agents.fn_trigger_post_run_evaluations(
  p_workflow_id  uuid,
  p_team_run_id  uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, agents
AS $$
DECLARE
  v_eval RECORD;
BEGIN
  FOR v_eval IN
    SELECT id FROM agents.evaluations
    WHERE target_type = 'workflow'
      AND target_id = p_workflow_id
  LOOP
    PERFORM public.fn_run_evaluation(v_eval.id, NULL);
  END LOOP;
END;
$$;

GRANT EXECUTE ON FUNCTION agents.fn_trigger_post_run_evaluations(uuid, uuid) TO authenticated;

COMMENT ON TABLE agents.evaluation_rubrics IS
  'Versioned scoring criteria for an evaluation. Each call to createEvaluationRubric bumps version and marks prior rows is_current=false.';

COMMENT ON TABLE agents.evaluation_baselines IS
  'Golden-run snapshot per evaluation. Used to compute regression deltas in the UI.';
