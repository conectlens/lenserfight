-- ─────────────────────────────────────────────────────────────────────────────
-- pgTAP: 56_rpc_coverage_audit.sql — Phase BO
--
-- Baseline catalog query — proves the RPC introspection path runs and the
-- routine catalog is reachable. Not an exhaustive coverage audit on its own.
-- The shell-side scripts/coverage-gate.sh enforces test references.
-- ─────────────────────────────────────────────────────────────────────────────
BEGIN;

SELECT plan(1);

SELECT lives_ok(
  $$ SELECT routine_name
       FROM information_schema.routines
      WHERE routine_schema IN ('public','agents','battles')
      ORDER BY 1 $$,
  'fn catalog query lives across public, agents, and battles schemas'
);

SELECT * FROM finish();
ROLLBACK;
