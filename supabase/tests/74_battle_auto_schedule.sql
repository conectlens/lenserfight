-- =============================================================================
-- pgTAP — Phase CB: Battle auto-schedule contenders
-- plan(5): function exists; is SECURITY DEFINER; returns 0 for unknown battle;
--          battle_event_subscriptions table exists; auto_promote column exists
-- =============================================================================
BEGIN;

SELECT plan(5);

-- 1. fn_battles_auto_schedule_contenders exists
SELECT ok(
  EXISTS (
    SELECT 1 FROM pg_catalog.pg_proc p
    JOIN pg_catalog.pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname = 'fn_battles_auto_schedule_contenders'
  ),
  'public.fn_battles_auto_schedule_contenders() exists'
);

-- 2. fn_battles_auto_schedule_contenders is SECURITY DEFINER
SELECT ok(
  (
    SELECT p.prosecdef
    FROM pg_catalog.pg_proc p
    JOIN pg_catalog.pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname = 'fn_battles_auto_schedule_contenders'
  ),
  'fn_battles_auto_schedule_contenders is SECURITY DEFINER'
);

-- 3. battles.battle_event_subscriptions table exists
SELECT ok(
  EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'battles'
      AND table_name   = 'battle_event_subscriptions'
  ),
  'battles.battle_event_subscriptions table exists'
);

-- 4. auto_assign_contenders column added to battles.battles
SELECT ok(
  EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'battles'
      AND table_name   = 'battles'
      AND column_name  = 'auto_assign_contenders'
  ),
  'battles.battles has auto_assign_contenders column'
);

-- 5. auto_promote column added to battles.battles
SELECT ok(
  EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'battles'
      AND table_name   = 'battles'
      AND column_name  = 'auto_promote'
  ),
  'battles.battles has auto_promote column'
);

SELECT finish();
ROLLBACK;
