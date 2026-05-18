-- =============================================================================
-- pgTAP — Phase 59: BYOK key isolation (fn_worker_get_ai_key_secret)
-- =============================================================================
-- The worker-side BYOK decrypt RPC must:
--   * exist and be SECURITY DEFINER (only service_role calls it)
--   * SET search_path (defense vs hijacked schemas)
--   * NOT be granted to anon or authenticated
--   * BE granted to service_role
--
-- Function-privilege checks use the OID-based form
-- `has_function_privilege(role, oid, priv)` because passing the rendered
-- signature string trips PostgreSQL's type parser on argname-and-type pairs
-- ("p_ai_key_id uuid").
-- =============================================================================
BEGIN;

SELECT plan(6);

-- 1. function exists
SELECT ok(
  EXISTS (
    SELECT 1 FROM pg_proc p
    WHERE p.proname = 'fn_worker_get_ai_key_secret'
  ),
  'fn_worker_get_ai_key_secret must exist'
);

-- 2. function is SECURITY DEFINER
SELECT ok(
  EXISTS (
    SELECT 1 FROM pg_proc p
    WHERE p.proname = 'fn_worker_get_ai_key_secret' AND p.prosecdef = true
  ),
  'fn_worker_get_ai_key_secret must be SECURITY DEFINER'
);

-- 3. function has search_path locked
SELECT ok(
  EXISTS (
    SELECT 1 FROM pg_proc p
    WHERE p.proname = 'fn_worker_get_ai_key_secret'
      AND p.proconfig IS NOT NULL
      AND EXISTS (
        SELECT 1 FROM unnest(p.proconfig) AS c
        WHERE c LIKE 'search_path=%'
      )
  ),
  'fn_worker_get_ai_key_secret must SET search_path'
);

-- 4. anon role has NO EXECUTE on any overload of the function
SELECT ok(
  NOT EXISTS (
    SELECT 1
    FROM pg_proc p
    WHERE p.proname = 'fn_worker_get_ai_key_secret'
      AND has_function_privilege('anon', p.oid, 'EXECUTE')
  ),
  'anon must NOT have EXECUTE on fn_worker_get_ai_key_secret'
);

-- 5. authenticated has NO EXECUTE either
SELECT ok(
  NOT EXISTS (
    SELECT 1
    FROM pg_proc p
    WHERE p.proname = 'fn_worker_get_ai_key_secret'
      AND has_function_privilege('authenticated', p.oid, 'EXECUTE')
  ),
  'authenticated must NOT have EXECUTE on fn_worker_get_ai_key_secret'
);

-- 6. service_role HAS EXECUTE on at least one overload
SELECT ok(
  EXISTS (
    SELECT 1
    FROM pg_proc p
    WHERE p.proname = 'fn_worker_get_ai_key_secret'
      AND has_function_privilege('service_role', p.oid, 'EXECUTE')
  ),
  'service_role MUST have EXECUTE on fn_worker_get_ai_key_secret'
);

SELECT * FROM finish();
ROLLBACK;
