-- Expose node_count in vw_workflows so direct view queries match the RPC contract.
DROP VIEW IF EXISTS "public"."vw_workflows";
CREATE OR REPLACE VIEW "public"."vw_workflows" WITH (security_invoker = on) AS
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
