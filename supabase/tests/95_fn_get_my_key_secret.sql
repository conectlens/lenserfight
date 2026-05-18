-- =============================================================================
-- pgTAP — fn_get_my_key_secret (local dev BYOK key resolver)
-- Migration 20271226000000.
-- =============================================================================
BEGIN;

SELECT plan(4);

-- 1. public.fn_get_my_key_secret exists with (uuid) signature
SELECT has_function(
  'public',
  'fn_get_my_key_secret',
  ARRAY['uuid'],
  'public.fn_get_my_key_secret(uuid) should exist'
);

-- 2. The ai-schema variant must NOT exist (we keep a single public definition
--    to avoid drifting bodies — see migration header comment).
SELECT hasnt_function(
  'ai',
  'fn_get_my_key_secret',
  ARRAY['uuid'],
  'ai.fn_get_my_key_secret(uuid) must NOT exist (PostgREST only exposes public)'
);

-- 3. EXECUTE is granted to authenticated (this is the intended REST surface)
SELECT ok(
  has_function_privilege(
    'authenticated',
    'public.fn_get_my_key_secret(uuid)',
    'EXECUTE'
  ),
  'authenticated should have EXECUTE on public.fn_get_my_key_secret(uuid)'
);

-- 4. SECURITY DEFINER (definer-side ownership check is the real guard;
--    EXECUTE may bleed to anon via DEFAULT PRIVILEGES, matching project-wide
--    pattern on similar functions like fn_worker_decrypt_api_key).
SELECT is(
  (SELECT prosecdef FROM pg_proc
   WHERE proname = 'fn_get_my_key_secret'
     AND pronamespace = 'public'::regnamespace),
  true,
  'public.fn_get_my_key_secret must be SECURITY DEFINER'
);

SELECT * FROM finish();
ROLLBACK;
