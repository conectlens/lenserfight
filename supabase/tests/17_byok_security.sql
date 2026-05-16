-- =============================================================================
-- pgTAP — Phase AR: BYOK Security Hardening
-- 2026-05-16: extended with IDOR-guard coverage on fn_worker_get_ai_key_secret
--             and env-gate coverage on fn_get_my_key_secret.
-- =============================================================================
BEGIN;

SELECT plan(15);

-- 1. allowed_model_ids column exists
SELECT has_column(
  'execution', 'byok_keys', 'allowed_model_ids',
  'execution.byok_keys.allowed_model_ids should exist (AR)'
);

-- 2. fn_byok_key_rotate exists
SELECT has_function(
  'public',
  'fn_byok_key_rotate',
  ARRAY['uuid', 'text', 'text', 'text'],
  'fn_byok_key_rotate should exist'
);

-- 3. fn_byok_key_resolve exists
SELECT has_function(
  'public',
  'fn_byok_key_resolve',
  ARRAY['uuid', 'text', 'text'],
  'fn_byok_key_resolve should exist'
);

-- 4. fn_expire_byok_keys exists
SELECT has_function(
  'public',
  'fn_expire_byok_keys',
  ARRAY[]::text[],
  'fn_expire_byok_keys should exist'
);

-- 5. fn_byok_key_resolve is NOT executable by authenticated
SELECT ok(
  NOT has_function_privilege(
    'authenticated',
    'public.fn_byok_key_resolve(uuid, text, text)',
    'EXECUTE'
  ),
  'fn_byok_key_resolve should NOT be executable by authenticated'
);

-- 6. fn_expire_byok_keys is NOT executable by authenticated
SELECT ok(
  NOT has_function_privilege(
    'authenticated',
    'public.fn_expire_byok_keys()',
    'EXECUTE'
  ),
  'fn_expire_byok_keys should NOT be executable by authenticated'
);

-- 7. fn_byok_key_rotate IS executable by authenticated
SELECT ok(
  has_function_privilege(
    'authenticated',
    'public.fn_byok_key_rotate(uuid, text, text, text)',
    'EXECUTE'
  ),
  'fn_byok_key_rotate should be executable by authenticated'
);

-- 8. pg_cron job byok-key-expiry is registered
SELECT ok(
  EXISTS (
    SELECT 1 FROM cron.job
    WHERE jobname = 'byok-key-expiry'
  ),
  'pg_cron job byok-key-expiry should be registered'
);

-- ─── IDOR guard on fn_worker_get_ai_key_secret (patched 2026-05-16) ──────────

-- 9. The new two-argument signature exists.
SELECT has_function(
  'public',
  'fn_worker_get_ai_key_secret',
  ARRAY['uuid', 'uuid'],
  'fn_worker_get_ai_key_secret(p_ai_key_id uuid, p_user_id uuid) should exist'
);

-- 10. The legacy single-argument signature is gone — preventing accidental
--     call sites that omit the ownership-binding user id.
SELECT hasnt_function(
  'public',
  'fn_worker_get_ai_key_secret',
  ARRAY['uuid'],
  'legacy fn_worker_get_ai_key_secret(uuid) should be removed'
);

-- 11. Not executable by authenticated — only service_role workers may call it.
SELECT ok(
  NOT has_function_privilege(
    'authenticated',
    'public.fn_worker_get_ai_key_secret(uuid, uuid)',
    'EXECUTE'
  ),
  'fn_worker_get_ai_key_secret should NOT be executable by authenticated'
);

-- 12. Not executable by anon (was previously granted in schema.sql drift).
SELECT ok(
  NOT has_function_privilege(
    'anon',
    'public.fn_worker_get_ai_key_secret(uuid, uuid)',
    'EXECUTE'
  ),
  'fn_worker_get_ai_key_secret should NOT be executable by anon'
);

-- 13. Calling with NULL parameters raises an explicit error (defence-in-depth
--     against accidental empty arguments from a misconfigured worker).
SET LOCAL ROLE service_role;
SELECT throws_ok(
  $$ SELECT public.fn_worker_get_ai_key_secret(NULL, NULL) $$,
  NULL,
  'p_ai_key_id and p_user_id are required',
  'fn_worker_get_ai_key_secret rejects NULL parameters'
);

-- 14. Cross-user IDOR: a random key UUID + random user UUID hits the
--     ownership branch and raises "not owned by caller" — confirming the
--     ownership check fires before any vault lookup.
SELECT throws_ok(
  $$ SELECT public.fn_worker_get_ai_key_secret(
       '00000000-0000-0000-0000-0000000000aa'::uuid,
       '00000000-0000-0000-0000-0000000000bb'::uuid
     ) $$,
  NULL,
  'Key owner profile not found',
  'fn_worker_get_ai_key_secret rejects unknown user before touching vault'
);
RESET ROLE;

-- ─── Env-gate on fn_get_my_key_secret (local dev resolver) ───────────────────

-- 15. With app.allow_dev_byok_resolver unset (default), the function refuses
--     to run — closing the staging/preview key-exfiltration path.
SELECT throws_ok(
  $$ SELECT public.fn_get_my_key_secret('00000000-0000-0000-0000-0000000000cc'::uuid) $$,
  '42501',
  'fn_get_my_key_secret is disabled in this environment',
  'fn_get_my_key_secret refuses when app.allow_dev_byok_resolver is not enabled'
);

SELECT finish();
ROLLBACK;
