-- =============================================================================
-- pgTAP — Phase AQ: fn_poll_async_run extended (video/audio + skip-locked)
-- =============================================================================
BEGIN;

SELECT plan(5);

-- 1. fn_poll_async_run exists with correct signature
SELECT has_function(
  'execution',
  'fn_poll_async_run',
  ARRAY['integer', 'integer'],
  'execution.fn_poll_async_run(int,int) should exist'
);

-- 2. fn_complete_async_run exists
SELECT has_function(
  'execution',
  'fn_complete_async_run',
  ARRAY['uuid', 'text', 'text', 'bigint', 'integer', 'integer', 'numeric'],
  'execution.fn_complete_async_run should exist with AN columns'
);

-- 3. fn_poll_async_run is granted to service_role only
SELECT ok(
  NOT has_function_privilege(
    'authenticated',
    'execution.fn_poll_async_run(integer, integer)',
    'EXECUTE'
  ),
  'fn_poll_async_run should NOT be executable by authenticated'
);

-- 4. fn_complete_async_run is granted to service_role only
SELECT ok(
  NOT has_function_privilege(
    'authenticated',
    'execution.fn_complete_async_run(uuid, text, text, bigint, integer, integer, numeric)',
    'EXECUTE'
  ),
  'fn_complete_async_run should NOT be executable by authenticated'
);

-- 5. media.objects has duration_seconds column (from AN)
SELECT has_column(
  'media', 'objects', 'duration_seconds',
  'media.objects.duration_seconds should exist (AN)'
);

SELECT finish();
ROLLBACK;
