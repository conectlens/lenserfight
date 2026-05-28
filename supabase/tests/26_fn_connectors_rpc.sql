-- =============================================================================
-- pgTAP — Phase 26: Connectors RPC structural coverage
-- =============================================================================
BEGIN;

SELECT plan(7);

-- 1. fn_connectors_list exists
SELECT has_function(
  'public',
  'fn_connectors_list',
  ARRAY[]::text[],
  'fn_connectors_list should exist'
);

-- 2. fn_connector_create exists
SELECT has_function(
  'public',
  'fn_connector_create',
  ARRAY['text', 'text', 'text', 'text[]'],
  'fn_connector_create should exist'
);

-- 3. fn_connector_get exists
SELECT has_function(
  'public',
  'fn_connector_get',
  ARRAY['text'],
  'fn_connector_get should exist'
);

-- 4. fn_connector_rotate exists
SELECT has_function(
  'public',
  'fn_connector_rotate',
  ARRAY['text'],
  'fn_connector_rotate should exist'
);

-- 5. fn_connector_remove exists
SELECT has_function(
  'public',
  'fn_connector_remove',
  ARRAY['text'],
  'fn_connector_remove should exist'
);

-- 6. fn_connector_create is SECURITY DEFINER
SELECT ok(
  (
    SELECT prosecdef
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname = 'fn_connector_create'
  ),
  'fn_connector_create should be SECURITY DEFINER'
);

-- 7. fn_connector_rotate is SECURITY DEFINER (ownership enforced)
SELECT ok(
  (
    SELECT prosecdef
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname = 'fn_connector_rotate'
  ),
  'fn_connector_rotate should be SECURITY DEFINER'
);

SELECT finish();
ROLLBACK;
