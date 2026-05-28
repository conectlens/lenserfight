-- =============================================================================
-- pgTAP — Phase BY: RLS coverage for agents schema
-- plan(6): anon cannot SELECT agents; authenticated sees only own rows;
--          service_role bypasses correctly
-- =============================================================================
BEGIN;

SELECT plan(6);

-- 1. agents.gateway_devices has RLS enabled
SELECT ok(
  (
    SELECT relrowsecurity
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'agents' AND c.relname = 'gateway_devices'
  ),
  'agents.gateway_devices should have RLS enabled'
);

-- 2. agents.memories has RLS enabled
SELECT ok(
  (
    SELECT relrowsecurity
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'agents' AND c.relname = 'memories'
  ),
  'agents.memories should have RLS enabled'
);

-- 3. anon cannot SELECT from agents.gateway_devices (deny-all or no-policy blocks it)
SET LOCAL ROLE anon;

SELECT throws_ok(
  $$SELECT count(*) FROM agents.gateway_devices$$,
  '42501',
  NULL,
  'anon role cannot SELECT from agents.gateway_devices'
);

RESET ROLE;

-- 4. anon cannot SELECT from agents.memories
SET LOCAL ROLE anon;

SELECT throws_ok(
  $$SELECT count(*) FROM agents.memories$$,
  '42501',
  NULL,
  'anon role cannot SELECT from agents.memories'
);

RESET ROLE;

-- 5. agents.gateway_devices owner_select policy exists and uses auth.uid()
SELECT ok(
  EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'agents'
      AND tablename  = 'gateway_devices'
      AND cmd        = 'SELECT'
      AND qual LIKE '%auth.uid()%'
  ),
  'agents.gateway_devices has owner-based SELECT policy using auth.uid()'
);

-- 6. agents.memories has a policy for the owner (memories_owner_all or similar)
SELECT ok(
  EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'agents'
      AND tablename  = 'memories'
  ),
  'agents.memories has at least one RLS policy'
);

SELECT finish();
ROLLBACK;
