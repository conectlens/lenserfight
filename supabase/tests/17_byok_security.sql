-- =============================================================================
-- pgTAP — Phase AR: BYOK Security Hardening
-- =============================================================================
BEGIN;

SELECT plan(8);

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

SELECT finish();
ROLLBACK;
