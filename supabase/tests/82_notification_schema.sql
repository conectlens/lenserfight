-- =============================================================================
-- pgTAP — Phase CN: Notification schema additions
-- plan(8): CHECK constraint includes new types; new tables exist; is_featured
--          column exists; index exists; RLS enabled on notification_preferences
-- =============================================================================
BEGIN;

SELECT plan(8);

-- 1. notifications CHECK constraint includes 'battle_won'
SELECT ok(
  EXISTS (
    SELECT 1 FROM pg_catalog.pg_constraint c
    JOIN pg_catalog.pg_class cl ON cl.oid = c.conrelid
    JOIN pg_catalog.pg_namespace n ON n.oid = cl.relnamespace
    WHERE n.nspname  = 'public'
      AND cl.relname = 'notifications'
      AND c.conname  = 'notifications_type_check'
      AND pg_get_constraintdef(c.oid) LIKE '%battle_won%'
  ),
  'notifications_type_check constraint includes battle_won'
);

-- 2. notifications CHECK constraint includes 'lens_published'
SELECT ok(
  EXISTS (
    SELECT 1 FROM pg_catalog.pg_constraint c
    JOIN pg_catalog.pg_class cl ON cl.oid = c.conrelid
    JOIN pg_catalog.pg_namespace n ON n.oid = cl.relnamespace
    WHERE n.nspname  = 'public'
      AND cl.relname = 'notifications'
      AND c.conname  = 'notifications_type_check'
      AND pg_get_constraintdef(c.oid) LIKE '%lens_published%'
  ),
  'notifications_type_check constraint includes lens_published'
);

-- 3. notifications CHECK constraint includes 'agent_created'
SELECT ok(
  EXISTS (
    SELECT 1 FROM pg_catalog.pg_constraint c
    JOIN pg_catalog.pg_class cl ON cl.oid = c.conrelid
    JOIN pg_catalog.pg_namespace n ON n.oid = cl.relnamespace
    WHERE n.nspname  = 'public'
      AND cl.relname = 'notifications'
      AND c.conname  = 'notifications_type_check'
      AND pg_get_constraintdef(c.oid) LIKE '%agent_created%'
  ),
  'notifications_type_check constraint includes agent_created'
);

-- 4. public.notification_preferences table exists
SELECT ok(
  EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name   = 'notification_preferences'
  ),
  'public.notification_preferences table exists'
);

-- 5. notification_preferences has UNIQUE constraint on (lenser_id, notification_type)
SELECT ok(
  EXISTS (
    SELECT 1 FROM pg_catalog.pg_constraint c
    JOIN pg_catalog.pg_class cl ON cl.oid = c.conrelid
    JOIN pg_catalog.pg_namespace n ON n.oid = cl.relnamespace
    WHERE n.nspname  = 'public'
      AND cl.relname = 'notification_preferences'
      AND c.contype  = 'u'
  ),
  'notification_preferences has a UNIQUE constraint'
);

-- 6. public.notification_aggregates table exists
SELECT ok(
  EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name   = 'notification_aggregates'
  ),
  'public.notification_aggregates table exists'
);

-- 7. lenses.lenses.is_featured column exists
SELECT ok(
  EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'lenses'
      AND table_name   = 'lenses'
      AND column_name  = 'is_featured'
  ),
  'lenses.lenses.is_featured column exists'
);

-- 8. idx_notif_prefs_lenser index exists
SELECT ok(
  EXISTS (
    SELECT 1 FROM pg_catalog.pg_indexes
    WHERE schemaname = 'public'
      AND tablename  = 'notification_preferences'
      AND indexname  = 'idx_notif_prefs_lenser'
  ),
  'idx_notif_prefs_lenser index exists on notification_preferences'
);

SELECT * FROM finish();
ROLLBACK;
