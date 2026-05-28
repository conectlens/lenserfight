-- =============================================================================
-- pgTAP — Phase 25: RLS coverage for social graph (lensers.relationships)
-- =============================================================================
BEGIN;

SELECT plan(8);

-- 1. lensers.relationships table exists
SELECT has_table(
  'lensers',
  'relationships',
  'lensers.relationships table should exist'
);

-- 2. lensers.relationships has RLS enabled
SELECT ok(
  (
    SELECT relrowsecurity
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'lensers' AND c.relname = 'relationships'
  ),
  'lensers.relationships should have RLS enabled'
);

-- 3. fn_request_follow exists
SELECT has_function(
  'public',
  'fn_request_follow',
  ARRAY['uuid'],
  'fn_request_follow should exist'
);

-- 4. fn_accept_follow_request exists
SELECT has_function(
  'public',
  'fn_accept_follow_request',
  ARRAY['uuid'],
  'fn_accept_follow_request should exist'
);

-- 5. fn_block_profile exists
SELECT has_function(
  'public',
  'fn_block_profile',
  ARRAY['uuid'],
  'fn_block_profile should exist'
);

-- 6. fn_get_follow_status exists
SELECT has_function(
  'public',
  'fn_get_follow_status',
  ARRAY['uuid'],
  'fn_get_follow_status should exist'
);

-- 7. idx_relationships_accepted_active index exists
SELECT ok(
  EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE schemaname = 'lensers'
      AND tablename  = 'relationships'
      AND indexname  = 'idx_relationships_accepted_active'
  ),
  'idx_relationships_accepted_active index should exist'
);

-- 8. idx_relationships_blocked index exists
SELECT ok(
  EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE schemaname = 'lensers'
      AND tablename  = 'relationships'
      AND indexname  = 'idx_relationships_blocked'
  ),
  'idx_relationships_blocked index should exist'
);

SELECT finish();
ROLLBACK;
