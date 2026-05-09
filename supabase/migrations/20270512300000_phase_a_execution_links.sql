-- Phase A (Trust Gateway): create the missing execution.links table.
--
-- Background:
--   public.fn_battles_submit (introduced in 20260329120000_community_base_schema.sql,
--   line 9172) writes:
--
--     INSERT INTO execution.links (run_id, entity_type, entity_id)
--     VALUES (p_execution_run_id, 'submission', v_submission_id)
--     ON CONFLICT DO NOTHING;
--
--   No migration ever creates execution.links. The RPC silently fails when the
--   submission attempts to link the run, breaking the trust evaluation chain
--   from execution → battle → trust_evaluations.
--
--   RFC-0003 §6 (Gaps to repair) calls for either restoring the table or
--   refactoring the RPC. This migration restores the table with a minimal,
--   forward-compatible shape and a UNIQUE constraint that matches the existing
--   ON CONFLICT DO NOTHING usage.

CREATE TABLE IF NOT EXISTS execution.links (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id       UUID        NOT NULL REFERENCES execution.runs(id) ON DELETE CASCADE,
  entity_type  TEXT        NOT NULL CHECK (
                 entity_type IN (
                   'submission',     -- battles.submissions row
                   'workflow_run',   -- lenses.workflow_runs row
                   'team_run',       -- agents.team_runs row
                   'attestation'     -- execution.attestations row (forward use)
                 )
               ),
  entity_id    UUID        NOT NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE (run_id, entity_type, entity_id)
);

CREATE INDEX IF NOT EXISTS idx_execution_links_run_id
  ON execution.links (run_id);
CREATE INDEX IF NOT EXISTS idx_execution_links_entity
  ON execution.links (entity_type, entity_id);

COMMENT ON TABLE execution.links IS
  'Link table joining execution.runs to consumer entities (battle submissions, '
  'workflow runs, team runs, attestations). Written by SECURITY DEFINER RPCs '
  'such as fn_battles_submit. ON CONFLICT DO NOTHING semantics rely on the '
  'UNIQUE (run_id, entity_type, entity_id) constraint.';

ALTER TABLE execution.links ENABLE ROW LEVEL SECURITY;

-- Read access: caller must own the linked run (via execution.requests).
CREATE POLICY "execution_links_owner_select" ON execution.links
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
        FROM execution.runs r
        JOIN execution.requests req ON req.id = r.request_id
        JOIN lensers.profiles p     ON p.id   = req.requester_lenser_id
       WHERE r.id = execution.links.run_id
         AND p.user_id = auth.uid()
    )
  );

-- No direct INSERT/UPDATE/DELETE; mutations only via DEFINER RPCs (fn_battles_submit etc.).

-- Append-only enforcement: links should not be edited or removed after creation.
-- Deletion via ON DELETE CASCADE on the run is permitted (cleanup).
CREATE OR REPLACE TRIGGER execution_links_no_update
  BEFORE UPDATE ON execution.links
  FOR EACH ROW EXECUTE FUNCTION public.fn_deny_mutation();
