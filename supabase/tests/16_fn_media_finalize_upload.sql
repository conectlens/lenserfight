-- =============================================================================
-- pgTAP — Phase AQ: fn_media_finalize_sync_upload
-- =============================================================================
BEGIN;

SELECT plan(4);

-- 1. fn_media_finalize_sync_upload exists
SELECT has_function(
  'execution',
  'fn_media_finalize_sync_upload',
  ARRAY['uuid', 'text', 'text', 'bigint', 'integer', 'integer', 'numeric'],
  'execution.fn_media_finalize_sync_upload should exist'
);

-- 2. Blocked MIME type raises exception
SELECT throws_ok(
  $$
    SELECT execution.fn_media_finalize_sync_upload(
      gen_random_uuid(),   -- p_run_id (does not exist → FOUND check fires first)
      'some/key.txt',
      'text/plain',        -- invalid MIME
      NULL, NULL, NULL, NULL
    )
  $$,
  '23514',  -- check_violation
  NULL,
  'fn_media_finalize_sync_upload should reject text/plain MIME type'
);

-- 3. NULL object_key raises exception
SELECT throws_ok(
  $$
    SELECT execution.fn_media_finalize_sync_upload(
      gen_random_uuid(),
      NULL,               -- object_key = NULL
      'image/png',
      NULL, NULL, NULL, NULL
    )
  $$,
  '23514',
  NULL,
  'fn_media_finalize_sync_upload should reject NULL object_key'
);

-- 4. fn_media_finalize_sync_upload is service_role only
SELECT ok(
  NOT has_function_privilege(
    'authenticated',
    'execution.fn_media_finalize_sync_upload(uuid, text, text, bigint, integer, integer, numeric)',
    'EXECUTE'
  ),
  'fn_media_finalize_sync_upload should NOT be executable by authenticated'
);

SELECT finish();
ROLLBACK;
