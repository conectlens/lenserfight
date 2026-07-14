-- =============================================================================
-- pgTAP — Headless (MCP/webhook) workflow run execution
-- Migrations 20270603000001 (idempotency lock) + 20270603000002 (headless 'api').
--
-- Smoke-level structural guards. End-to-end execution semantics (an MCP/webhook
-- run actually reaching a terminal status) require an integration run against a
-- live worker and are out of scope for pgTAP.
-- =============================================================================
BEGIN;

SELECT plan(4);

-- 1. The trigger_mode CHECK permits the new headless 'api' mode.
SELECT ok(
  EXISTS (
    SELECT 1 FROM pg_constraint c
    WHERE c.conname = 'workflow_runs_trigger_mode_check'
      AND c.conrelid = 'lenses.workflow_runs'::regclass
      AND pg_get_constraintdef(c.oid) LIKE '%api%'
  ),
  'lenses.workflow_runs trigger_mode CHECK permits api'
);

-- 2. The headless run creator exists with the expected signature.
SELECT has_function(
  'public', 'fn_mcp_workflow_run_start',
  ARRAY['uuid', 'jsonb', 'text', 'text', 'jsonb'],
  'public.fn_mcp_workflow_run_start(uuid,jsonb,text,text,jsonb) exists'
);

-- 3. The claimer exists.
SELECT has_function(
  'lenses', 'fn_claim_scheduled_workflow_run',
  ARRAY['text'],
  'lenses.fn_claim_scheduled_workflow_run(text) exists'
);

-- 4. The claimer body picks up trigger_mode 'api' (not schedule-only).
SELECT ok(
  EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'lenses'
      AND p.proname = 'fn_claim_scheduled_workflow_run'
      AND pg_get_functiondef(p.oid) LIKE '%''api''%'
  ),
  'fn_claim_scheduled_workflow_run claims trigger_mode api'
);

SELECT * FROM finish();
ROLLBACK;
