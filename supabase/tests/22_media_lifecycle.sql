-- =============================================================================
-- pgTAP — Phase AT: media lifecycle governance
-- =============================================================================
BEGIN;

SELECT plan(8);

-- 1. expires_at column exists
SELECT has_column(
  'media', 'objects', 'expires_at',
  'media.objects.expires_at should exist (AT)'
);

-- 2. access_count column exists
SELECT has_column(
  'media', 'objects', 'access_count',
  'media.objects.access_count should exist (AT)'
);

-- 3. fn_delete_media_object exists
SELECT has_function(
  'public',
  'fn_delete_media_object',
  ARRAY['uuid'],
  'fn_delete_media_object should exist'
);

-- 4. fn_toggle_media_visibility exists
SELECT has_function(
  'public',
  'fn_toggle_media_visibility',
  ARRAY['uuid', 'text'],
  'fn_toggle_media_visibility should exist'
);

-- 5. fn_transfer_media_ownership exists
SELECT has_function(
  'public',
  'fn_transfer_media_ownership',
  ARRAY['uuid', 'uuid'],
  'fn_transfer_media_ownership should exist'
);

-- 6. fn_media_proxy_log exists
SELECT has_function(
  'public',
  'fn_media_proxy_log',
  ARRAY['uuid'],
  'fn_media_proxy_log should exist'
);

-- 7. fn_expire_media_objects exists
SELECT has_function(
  'public',
  'fn_expire_media_objects',
  ARRAY[]::text[],
  'fn_expire_media_objects should exist'
);

-- 8. fn_delete_media_object raises for non-owner
SELECT throws_ok(
  $test$
    DO $do$
    BEGIN
      -- Random object_id that does not exist → should raise media_object_not_found
      PERFORM public.fn_delete_media_object('00000000-0000-0000-0000-000000000099'::uuid);
    END;
    $do$
  $test$,
  'P0001',
  NULL,
  'fn_delete_media_object should raise P0001 for unknown object'
);

SELECT finish();
ROLLBACK;
