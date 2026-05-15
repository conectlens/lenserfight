-- Phase Z2: Tighten anonymous surface on fn_start_workflow_run.
--
-- The 4-arg public wrapper is SECURITY DEFINER and was historically granted
-- EXECUTE to `anon`, even though the function body rejects anon callers at
-- runtime via `RAISE EXCEPTION 'fn_start_workflow_run: anon not permitted'`
-- (see 20270901000001_workflow_idempotency_ttl.sql).
--
-- The runtime check is a defense in depth, not the primary boundary.
-- Principle of least privilege requires the grant itself to be removed so
-- the function is no longer reachable from PostgREST without authentication.
--
-- Rollback:
--   GRANT EXECUTE ON FUNCTION public.fn_start_workflow_run(uuid, jsonb, text, text) TO anon;

REVOKE EXECUTE
  ON FUNCTION public.fn_start_workflow_run(uuid, jsonb, text, text)
  FROM anon;

COMMENT ON FUNCTION public.fn_start_workflow_run(uuid, jsonb, text, text) IS
  'D2+D4+Z2: anon callers rejected at runtime AND no longer granted EXECUTE; '
  'idempotency_key window capped at 24h via idempotency_expires_at.';
