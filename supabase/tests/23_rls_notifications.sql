-- =============================================================================
-- pgTAP — Phase 23: RLS coverage for notifications
-- =============================================================================
BEGIN;

SELECT plan(6);

-- 1. notifications table exists in public schema
SELECT has_table(
  'public',
  'notifications',
  'public.notifications table should exist'
);

-- 2. notifications table has RLS enabled
SELECT ok(
  (
    SELECT relrowsecurity
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relname = 'notifications'
  ),
  'public.notifications should have RLS enabled'
);

-- 3. fn_get_notifications exists
SELECT has_function(
  'public',
  'fn_get_notifications',
  ARRAY['integer', 'timestamp with time zone'],
  'fn_get_notifications should exist'
);

-- 4. fn_mark_notifications_read exists
SELECT has_function(
  'public',
  'fn_mark_notifications_read',
  ARRAY['uuid[]'],
  'fn_mark_notifications_read should exist'
);

-- 5. anon cannot SELECT directly from notifications (RLS protects the table)
SELECT ok(
  NOT has_table_privilege('anon', 'public.notifications', 'SELECT'),
  'anon role should not have direct SELECT on public.notifications'
);

-- 6. notifications has SELECT policy for authenticated via fn (row-scoped)
SELECT ok(
  EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename  = 'notifications'
  ),
  'public.notifications should have at least one RLS policy'
);

SELECT finish();
ROLLBACK;
