-- Fix PGRST203: drop legacy 4-arg public.fn_start_workflow_run overload.
--
-- Root cause:
--   20260417170000_fix_fn_start_workflow_run_overload.sql created a 4-arg
--   public wrapper: fn_start_workflow_run(uuid, jsonb, text, text).
--   20271231000001_workflow_versioning_public_api.sql added a 5-arg wrapper:
--   fn_start_workflow_run(uuid, jsonb, text, text, uuid) but never dropped the
--   4-arg one. PostgREST raises PGRST203 because both signatures match a
--   4-argument call (p_version_id is optional/DEFAULT NULL in the 5-arg form).
--
-- Fix:
--   Drop the 4-arg overload. The 5-arg wrapper (p_version_id DEFAULT NULL)
--   handles all existing callers transparently — omitting p_version_id is
--   identical in behaviour to the old 4-arg signature.
--
-- Rollback (only if needed for emergency; the 5-arg form is a strict superset):
--   See 20260417170000_fix_fn_start_workflow_run_overload.sql for the original.

DROP FUNCTION IF EXISTS public.fn_start_workflow_run(uuid, jsonb, text, text);

COMMENT ON FUNCTION public.fn_start_workflow_run(uuid, jsonb, text, text, uuid) IS
  'Canonical workflow-start RPC (single overload). Accepts optional p_version_id to pin '
  'execution to a specific immutable version; NULL resolves to head_version_id. '
  'D2+D4+Z2: anon callers rejected; idempotency_key window capped at 24h.';
