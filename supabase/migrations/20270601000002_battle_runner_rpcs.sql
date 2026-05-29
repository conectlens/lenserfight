-- Phase CT · Battle x Workflow runner backbone
--   1. fn_get_battle_scores RPC — called by VoteCollectorRunner
--   2. workflow_battle_run_log table — operational paper trail
--   3. battles.battles.automation_config column — wizard step 9 persistence
-- Verified schema facts (from 20260519131536_remote_schema.sql):
--   battles.contenders.slot is character(1) (A..Z)
--   battles.votes.voted_contender_id -> battles.contenders.id
--   lenses.workflow_runs.triggered_by is the run owner (nullable for system runs)

BEGIN;

-- ─── 1. fn_get_battle_scores ──────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.fn_get_battle_scores(p_battle_id uuid)
RETURNS TABLE(slot text, vote_count bigint)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, battles
AS $$
  SELECT
    c.slot::text         AS slot,
    COUNT(v.id)::bigint  AS vote_count
  FROM battles.contenders c
  LEFT JOIN battles.votes v
    ON v.voted_contender_id = c.id
   AND v.is_draw = false
  WHERE c.battle_id = p_battle_id
  GROUP BY c.slot
  ORDER BY vote_count DESC, slot ASC;
$$;

REVOKE ALL ON FUNCTION public.fn_get_battle_scores(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.fn_get_battle_scores(uuid) TO service_role;

COMMENT ON FUNCTION public.fn_get_battle_scores(uuid) IS
  'Per-slot vote tallies for a battle. Called by VoteCollectorRunner via service_role only.';

-- ─── 2. workflow_battle_run_log ───────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS lenses.workflow_battle_run_log (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_run_id uuid NOT NULL REFERENCES lenses.workflow_runs(id) ON DELETE CASCADE,
  battle_id       uuid NOT NULL REFERENCES battles.battles(id) ON DELETE CASCADE,
  phase           text NOT NULL CHECK (phase IN ('created','executing','closed','failed')),
  payload         jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_workflow_battle_run_log_run_created
  ON lenses.workflow_battle_run_log (workflow_run_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_workflow_battle_run_log_battle
  ON lenses.workflow_battle_run_log (battle_id);

ALTER TABLE lenses.workflow_battle_run_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS wbrl_owner_select ON lenses.workflow_battle_run_log;
CREATE POLICY wbrl_owner_select ON lenses.workflow_battle_run_log
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM lenses.workflow_runs wr
      WHERE wr.id = lenses.workflow_battle_run_log.workflow_run_id
        AND wr.triggered_by = auth.uid()
    )
  );

DROP POLICY IF EXISTS wbrl_service_insert ON lenses.workflow_battle_run_log;
CREATE POLICY wbrl_service_insert ON lenses.workflow_battle_run_log
  FOR INSERT
  WITH CHECK (current_setting('request.jwt.claim.role', true) = 'service_role');

REVOKE ALL ON TABLE lenses.workflow_battle_run_log FROM PUBLIC;
GRANT SELECT ON TABLE lenses.workflow_battle_run_log TO authenticated;
GRANT SELECT, INSERT ON TABLE lenses.workflow_battle_run_log TO service_role;

COMMENT ON TABLE lenses.workflow_battle_run_log IS
  'Append-only log of battles created or driven by a workflow run. Owner SELECT via workflow_runs join; service_role-only INSERT.';

-- ─── 3. battles.battles.automation_config ─────────────────────────────────────

ALTER TABLE battles.battles
  ADD COLUMN IF NOT EXISTS automation_config jsonb NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE battles.battles
  DROP CONSTRAINT IF EXISTS battles_automation_config_size_check;

ALTER TABLE battles.battles
  ADD CONSTRAINT battles_automation_config_size_check
  CHECK (octet_length(automation_config::text) < 8192);

COMMENT ON COLUMN battles.battles.automation_config IS
  'Wizard step 9 automation settings: { autoAssignContenders, autoPromote, workflowId, schedule }. Size capped at 8KB.';

COMMIT;
