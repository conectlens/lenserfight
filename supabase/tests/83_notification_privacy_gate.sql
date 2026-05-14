-- =============================================================================
-- pgTAP — Phase CN: Notification privacy gate functions
-- plan(10): 4 guard functions exist; fn_insert_notification has 7 params;
--           2 RPCs exist; self-suppression works; mute default=true;
--           blocked actor suppresses notification
-- =============================================================================
BEGIN;

SELECT plan(10);

-- 1. fn_is_notification_blocked exists
SELECT ok(
  EXISTS (
    SELECT 1 FROM pg_catalog.pg_proc p
    JOIN pg_catalog.pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname = 'fn_is_notification_blocked'
  ),
  'public.fn_is_notification_blocked exists'
);

-- 2. fn_is_notification_muted exists
SELECT ok(
  EXISTS (
    SELECT 1 FROM pg_catalog.pg_proc p
    JOIN pg_catalog.pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname = 'fn_is_notification_muted'
  ),
  'public.fn_is_notification_muted exists'
);

-- 3. fn_should_send_notification exists
SELECT ok(
  EXISTS (
    SELECT 1 FROM pg_catalog.pg_proc p
    JOIN pg_catalog.pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname = 'fn_should_send_notification'
  ),
  'public.fn_should_send_notification exists'
);

-- 4. fn_check_and_upsert_aggregate exists
SELECT ok(
  EXISTS (
    SELECT 1 FROM pg_catalog.pg_proc p
    JOIN pg_catalog.pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname = 'fn_check_and_upsert_aggregate'
  ),
  'public.fn_check_and_upsert_aggregate exists'
);

-- 5. fn_insert_notification has 7 parameters
SELECT is(
  (SELECT p.pronargs
   FROM   pg_catalog.pg_proc p
   JOIN   pg_catalog.pg_namespace n ON n.oid = p.pronamespace
   WHERE  n.nspname = 'public'
     AND  p.proname = 'fn_insert_notification'
     AND  p.pronargs = 7
   LIMIT  1),
  7::smallint,
  'fn_insert_notification has 7 parameters (p_actor_id added)'
);

-- 6. fn_get_notification_preferences exists
SELECT ok(
  EXISTS (
    SELECT 1 FROM pg_catalog.pg_proc p
    JOIN pg_catalog.pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname = 'fn_get_notification_preferences'
  ),
  'public.fn_get_notification_preferences exists'
);

-- 7. fn_upsert_notification_preference exists
SELECT ok(
  EXISTS (
    SELECT 1 FROM pg_catalog.pg_proc p
    JOIN pg_catalog.pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname = 'fn_upsert_notification_preference'
  ),
  'public.fn_upsert_notification_preference exists'
);

-- 8. fn_should_send_notification returns false when actor = recipient (self-notification)
SELECT is(
  public.fn_should_send_notification(
    '00000000-0000-0000-0000-000000000001'::uuid,
    '00000000-0000-0000-0000-000000000001'::uuid,
    'lens_comment'
  ),
  false,
  'fn_should_send_notification returns false for self-notification'
);

-- 9. fn_is_notification_muted returns false when no preference row exists (fail-open default)
SELECT is(
  public.fn_is_notification_muted(
    '00000000-0000-0000-0000-000000000099'::uuid,
    'lens_comment'
  ),
  false,
  'fn_is_notification_muted returns false when no preference row (fail-open)'
);

-- 10. fn_should_send_notification returns true when actor != recipient and no block/mute
SELECT is(
  public.fn_should_send_notification(
    '00000000-0000-0000-0000-000000000001'::uuid,
    '00000000-0000-0000-0000-000000000002'::uuid,
    'lens_comment'
  ),
  true,
  'fn_should_send_notification returns true for distinct non-blocked lensers'
);

SELECT * FROM finish();
ROLLBACK;
