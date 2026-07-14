-- =============================================================================
-- pgTAP — Workflow worker function grant hardening
-- Migration 20270603000000_workflow_worker_grant_hardening.sql
--
-- Verifies that worker-only SECURITY DEFINER functions in the `public` schema
-- are not EXECUTEable by the public API roles (`anon`, `authenticated`) and
-- remain EXECUTEable by `service_role` (the role the worker authenticates as).
--
-- The worker-only set is defined structurally: every `public.fn_worker_*`
-- function plus three non-prefixed worker/dispatch helpers. Defining it by
-- shape rather than by an enumerated list makes this a standing regression
-- guard — a newly added worker function that is mistakenly granted to a public
-- role will fail this test.
-- =============================================================================
BEGIN;

SELECT plan(5);

-- 1. No worker-only function is EXECUTEable by anon.
SELECT is(
  (SELECT count(*)::int
     FROM pg_proc p
     JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND (p.proname LIKE 'fn_worker_%'
           OR p.proname IN ('fn_claim_stale_workflow_run',
                            'fn_heartbeat_workflow_run',
                            'fn_workflows_dispatch_on_event'))
      AND has_function_privilege('anon', p.oid, 'EXECUTE')),
  0,
  'no worker-only function is EXECUTEable by anon'
);

-- 2. No worker-only function is EXECUTEable by authenticated.
SELECT is(
  (SELECT count(*)::int
     FROM pg_proc p
     JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND (p.proname LIKE 'fn_worker_%'
           OR p.proname IN ('fn_claim_stale_workflow_run',
                            'fn_heartbeat_workflow_run',
                            'fn_workflows_dispatch_on_event'))
      AND has_function_privilege('authenticated', p.oid, 'EXECUTE')),
  0,
  'no worker-only function is EXECUTEable by authenticated'
);

-- 3. service_role retains EXECUTE on every worker-only function (worker not broken).
SELECT is(
  (SELECT count(*)::int
     FROM pg_proc p
     JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND (p.proname LIKE 'fn_worker_%'
           OR p.proname IN ('fn_claim_stale_workflow_run',
                            'fn_heartbeat_workflow_run',
                            'fn_workflows_dispatch_on_event'))
      AND NOT has_function_privilege('service_role', p.oid, 'EXECUTE')),
  0,
  'service_role retains EXECUTE on every worker-only function'
);

-- 4. Crown jewel: anon cannot decrypt stored BYOK provider keys.
SELECT ok(
  NOT has_function_privilege('anon', 'public.fn_worker_decrypt_api_key(uuid)', 'EXECUTE'),
  'anon cannot EXECUTE fn_worker_decrypt_api_key'
);

-- 5. Crown jewel: authenticated cannot read arbitrary lens template bodies.
SELECT ok(
  NOT has_function_privilege('authenticated', 'public.fn_worker_get_lens_template_body(uuid, uuid)', 'EXECUTE'),
  'authenticated cannot EXECUTE fn_worker_get_lens_template_body'
);

SELECT * FROM finish();
ROLLBACK;
