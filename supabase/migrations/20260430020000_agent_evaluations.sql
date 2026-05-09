-- =============================================================================
-- 20260430020000_agent_evaluations.sql
-- -----------------------------------------------------------------------------
-- Adds the persistence layer for evaluations of lenses, agents, workflows, and
-- teams. Evaluations carry a target, scoring rules, and a set of cases. Each
-- evaluation_run scores those cases against a chosen model.
-- =============================================================================

CREATE TABLE IF NOT EXISTS agents.evaluations (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_lenser_id  uuid NOT NULL,
  ai_lenser_id     uuid NULL REFERENCES agents.ai_lensers(id) ON DELETE SET NULL,
  target_type      text NOT NULL CHECK (target_type IN ('lens', 'workflow', 'agent', 'team')),
  target_id        uuid NOT NULL,
  name             text NOT NULL,
  description      text NULL,
  scoring_rules    jsonb NOT NULL DEFAULT '{}'::jsonb,
  dataset_uri      text NULL,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_evaluations_owner ON agents.evaluations (owner_lenser_id);
CREATE INDEX IF NOT EXISTS idx_evaluations_ai_lenser ON agents.evaluations (ai_lenser_id);

CREATE TABLE IF NOT EXISTS agents.evaluation_cases (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  evaluation_id  uuid NOT NULL REFERENCES agents.evaluations(id) ON DELETE CASCADE,
  input          jsonb NOT NULL DEFAULT '{}'::jsonb,
  expected       jsonb NULL,
  weight         numeric NOT NULL DEFAULT 1,
  tags           text[] NOT NULL DEFAULT '{}',
  created_at     timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_evaluation_cases_eval ON agents.evaluation_cases (evaluation_id);

CREATE TABLE IF NOT EXISTS agents.evaluation_runs (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  evaluation_id  uuid NOT NULL REFERENCES agents.evaluations(id) ON DELETE CASCADE,
  model_id       uuid NULL,
  status         text NOT NULL DEFAULT 'queued'
                   CHECK (status IN ('queued', 'running', 'completed', 'failed', 'cancelled')),
  score          numeric NULL,
  summary        jsonb NOT NULL DEFAULT '{}'::jsonb,
  started_at     timestamptz NOT NULL DEFAULT now(),
  completed_at   timestamptz NULL
);

CREATE INDEX IF NOT EXISTS idx_evaluation_runs_eval ON agents.evaluation_runs (evaluation_id, started_at DESC);

CREATE TABLE IF NOT EXISTS agents.evaluation_case_results (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  evaluation_run_id   uuid NOT NULL REFERENCES agents.evaluation_runs(id) ON DELETE CASCADE,
  case_id             uuid NOT NULL REFERENCES agents.evaluation_cases(id) ON DELETE CASCADE,
  score               numeric NULL,
  output              jsonb NULL,
  error               text NULL,
  created_at          timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_evaluation_case_results_run
  ON agents.evaluation_case_results (evaluation_run_id);

ALTER TABLE agents.evaluations              ENABLE ROW LEVEL SECURITY;
ALTER TABLE agents.evaluation_cases         ENABLE ROW LEVEL SECURITY;
ALTER TABLE agents.evaluation_runs          ENABLE ROW LEVEL SECURITY;
ALTER TABLE agents.evaluation_case_results  ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS evaluations_owner_all ON agents.evaluations;
CREATE POLICY evaluations_owner_all ON agents.evaluations
  FOR ALL
  USING (
    owner_lenser_id = auth.uid()
    OR (ai_lenser_id IS NOT NULL AND agents.can_manage_ai_lenser(ai_lenser_id))
  )
  WITH CHECK (
    owner_lenser_id = auth.uid()
    OR (ai_lenser_id IS NOT NULL AND agents.can_manage_ai_lenser(ai_lenser_id))
  );

DROP POLICY IF EXISTS evaluation_cases_owner_all ON agents.evaluation_cases;
CREATE POLICY evaluation_cases_owner_all ON agents.evaluation_cases
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

DROP POLICY IF EXISTS evaluation_runs_owner_all ON agents.evaluation_runs;
CREATE POLICY evaluation_runs_owner_all ON agents.evaluation_runs
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

DROP POLICY IF EXISTS evaluation_case_results_owner_all ON agents.evaluation_case_results;
CREATE POLICY evaluation_case_results_owner_all ON agents.evaluation_case_results
  FOR ALL
  USING (EXISTS (
    SELECT 1 FROM agents.evaluation_runs r
    JOIN agents.evaluations e ON e.id = r.evaluation_id
    WHERE r.id = evaluation_run_id
      AND (e.owner_lenser_id = auth.uid()
           OR (e.ai_lenser_id IS NOT NULL AND agents.can_manage_ai_lenser(e.ai_lenser_id)))
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM agents.evaluation_runs r
    JOIN agents.evaluations e ON e.id = r.evaluation_id
    WHERE r.id = evaluation_run_id
      AND (e.owner_lenser_id = auth.uid()
           OR (e.ai_lenser_id IS NOT NULL AND agents.can_manage_ai_lenser(e.ai_lenser_id)))
  ));

GRANT SELECT, INSERT, UPDATE, DELETE ON
  agents.evaluations,
  agents.evaluation_cases,
  agents.evaluation_runs,
  agents.evaluation_case_results
TO authenticated, service_role;

-- ─── RPC: queue an evaluation run ───────────────────────────────────────────
DROP FUNCTION IF EXISTS public.fn_run_evaluation(uuid, uuid);
CREATE OR REPLACE FUNCTION public.fn_run_evaluation(
  p_evaluation_id uuid,
  p_model_id      uuid DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, agents
AS $$
DECLARE
  v_eval  agents.evaluations;
  v_run   agents.evaluation_runs;
BEGIN
  SELECT * INTO v_eval FROM agents.evaluations WHERE id = p_evaluation_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'evaluation not found' USING ERRCODE = 'P0002';
  END IF;
  IF NOT (v_eval.owner_lenser_id = auth.uid()
          OR (v_eval.ai_lenser_id IS NOT NULL AND agents.can_manage_ai_lenser(v_eval.ai_lenser_id))) THEN
    RAISE EXCEPTION 'not authorized' USING ERRCODE = '42501';
  END IF;

  INSERT INTO agents.evaluation_runs (evaluation_id, model_id, status)
  VALUES (p_evaluation_id, p_model_id, 'queued')
  RETURNING * INTO v_run;

  RETURN v_run.id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.fn_run_evaluation(uuid, uuid) TO authenticated;

-- ─── View: results table per run ────────────────────────────────────────────
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
  cr.error           AS case_error
FROM agents.evaluation_case_results cr
JOIN agents.evaluation_runs r  ON r.id = cr.evaluation_run_id
JOIN agents.evaluation_cases c ON c.id = cr.case_id
JOIN agents.evaluations e      ON e.id = r.evaluation_id
WHERE e.owner_lenser_id = auth.uid()
   OR (e.ai_lenser_id IS NOT NULL AND agents.can_manage_ai_lenser(e.ai_lenser_id));

GRANT SELECT ON agents.evaluation_results_v TO authenticated, service_role;

COMMENT ON TABLE agents.evaluations IS
  'Owner-defined evaluation suites for lenses, workflows, agents, or teams. Run via fn_run_evaluation.';
