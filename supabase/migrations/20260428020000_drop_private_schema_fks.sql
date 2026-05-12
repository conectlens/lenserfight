-- Expose node_count in vw_workflows so direct view queries match the RPC contract.
-- security_invoker omitted — view must run as postgres (owner) so anon callers
-- can read lenses.workflows after the non-public schema anon revoke (20271123).
DROP VIEW IF EXISTS "public"."vw_workflows";
CREATE OR REPLACE VIEW "public"."vw_workflows" AS
SELECT
  w.id,
  w.lenser_id,
  w.title,
  w.description,
  w.visibility,
  w.battle_count,
  (
    SELECT count(*)
    FROM lenses.workflow_nodes wn
    WHERE wn.workflow_id = w.id
  ) AS node_count,
  w.reaction_totals,
  w.fork_count,
  w.parent_workflow_id,
  w.created_at,
  w.updated_at
FROM lenses.workflows w;
