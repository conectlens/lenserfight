-- =============================================================================
-- Migration: fix worker-only function grant leak
--
-- Bug:
--   `ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON
--   FUNCTIONS TO anon, authenticated` (see 20260519131536_remote_schema.sql)
--   grants EXECUTE directly to the named roles `anon` and `authenticated` on
--   every new function created by `postgres` in `public` — NOT via the PUBLIC
--   pseudo-role. Five worker-only functions were hardened with
--   `REVOKE ALL ... FROM PUBLIC` only, which is a no-op against those direct
--   default-privilege grants, leaving them EXECUTEable by anon/authenticated
--   over PostgREST RPC:
--     - fn_worker_finalize_team_run(uuid, text, text)
--     - fn_worker_get_run_exec_context(uuid)
--     - fn_worker_create_team_run_workflow_run(uuid, text)
--     - fn_worker_set_workflow_run_status(uuid, text)
--     - fn_worker_render_template(text, jsonb)   -- body-based overload only;
--       the version-based fn_worker_render_template(uuid, jsonb) overload was
--       already correctly hardened in 20270603000000.
--
-- Fix: explicitly revoke from anon/authenticated (the same pattern already
-- used correctly by 20270603000000_workflow_worker_grant_hardening.sql).
-- REVOKE of an absent grant is a no-op, so this is safe regardless of the
-- actual grant state on any given environment.
-- =============================================================================

REVOKE ALL     ON FUNCTION "public"."fn_worker_finalize_team_run"("uuid", "text", "text") FROM "anon", "authenticated";
GRANT  EXECUTE ON FUNCTION "public"."fn_worker_finalize_team_run"("uuid", "text", "text") TO   "service_role";

REVOKE ALL     ON FUNCTION "public"."fn_worker_get_run_exec_context"("uuid") FROM "anon", "authenticated";
GRANT  EXECUTE ON FUNCTION "public"."fn_worker_get_run_exec_context"("uuid") TO   "service_role";

REVOKE ALL     ON FUNCTION "public"."fn_worker_create_team_run_workflow_run"("uuid", "text") FROM "anon", "authenticated";
GRANT  EXECUTE ON FUNCTION "public"."fn_worker_create_team_run_workflow_run"("uuid", "text") TO   "service_role";

REVOKE ALL     ON FUNCTION "public"."fn_worker_set_workflow_run_status"("uuid", "text") FROM "anon", "authenticated";
GRANT  EXECUTE ON FUNCTION "public"."fn_worker_set_workflow_run_status"("uuid", "text") TO   "service_role";

REVOKE ALL     ON FUNCTION "public"."fn_worker_render_template"("text", "jsonb") FROM "anon", "authenticated";
GRANT  EXECUTE ON FUNCTION "public"."fn_worker_render_template"("text", "jsonb") TO   "service_role";
