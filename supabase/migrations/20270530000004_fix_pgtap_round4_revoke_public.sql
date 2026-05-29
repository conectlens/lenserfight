-- ─────────────────────────────────────────────────────────────────────────────
-- Fix pgTAP smoke test failures (round 4)
--
-- Root cause: PostgreSQL auto-grants EXECUTE to PUBLIC when functions are
-- created. Prior fix rounds revoked from the named `anon` role, but
-- `has_function_privilege('anon', ..., 'EXECUTE')` returns true when `anon`
-- inherits EXECUTE via PUBLIC.  We must REVOKE FROM PUBLIC first so that
-- `anon` (which is in the PUBLIC group) loses the privilege entirely.
--
-- Tests fixed:
--   86  tests 10-13  anon role must not have EXECUTE on emergency-stop fns
--   98  tests 6-7    anon role must not have EXECUTE on snapshot fns
-- ─────────────────────────────────────────────────────────────────────────────

-- ── 86/10-13: Emergency-stop / execution-control functions ───────────────────

REVOKE ALL ON FUNCTION public.fn_emergency_stop(text, boolean)      FROM PUBLIC;
REVOKE ALL ON FUNCTION public.fn_cancel_all_active_runs(text)        FROM PUBLIC;
REVOKE ALL ON FUNCTION public.fn_queue_freeze(text)                  FROM PUBLIC;
REVOKE ALL ON FUNCTION public.fn_queue_unfreeze()                    FROM PUBLIC;

-- Re-grant only to the roles that should have access
GRANT EXECUTE ON FUNCTION public.fn_emergency_stop(text, boolean)   TO service_role;
GRANT EXECUTE ON FUNCTION public.fn_cancel_all_active_runs(text)     TO service_role;
GRANT EXECUTE ON FUNCTION public.fn_queue_freeze(text)               TO service_role;
GRANT EXECUTE ON FUNCTION public.fn_queue_unfreeze()                 TO service_role;

-- ── 98/6-7: Agent snapshot functions ─────────────────────────────────────────

REVOKE ALL ON FUNCTION public.fn_redacted_agent_snapshot(uuid)      FROM PUBLIC;
REVOKE ALL ON FUNCTION public.fn_redacted_agent_snapshot_hash(uuid) FROM PUBLIC;

-- Re-grant only to authenticated (anon must not have access)
GRANT EXECUTE ON FUNCTION public.fn_redacted_agent_snapshot(uuid)      TO authenticated;
GRANT EXECUTE ON FUNCTION public.fn_redacted_agent_snapshot(uuid)      TO service_role;
GRANT EXECUTE ON FUNCTION public.fn_redacted_agent_snapshot_hash(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.fn_redacted_agent_snapshot_hash(uuid) TO service_role;
