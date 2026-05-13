-- =============================================================================
-- pgTAP — Phase CN: Battle notification triggers
-- plan(8): 3 new triggers exist; 3 functions are SECURITY DEFINER;
--          fn_notify_battle_result is SECURITY DEFINER; battle_won in CHECK
-- =============================================================================
BEGIN;

SELECT plan(8);

-- 1. trg_notify_battle_started exists on battles.battles
SELECT ok(
  EXISTS (
    SELECT 1 FROM information_schema.triggers
    WHERE trigger_schema     = 'battles'
      AND event_object_table = 'battles'
      AND trigger_name       = 'trg_notify_battle_started'
  ),
  'trg_notify_battle_started exists on battles.battles'
);

-- 2. trg_notify_battle_joined exists on battles.contender_entity_map
SELECT ok(
  EXISTS (
    SELECT 1 FROM information_schema.triggers
    WHERE trigger_schema     = 'battles'
      AND event_object_table = 'contender_entity_map'
      AND trigger_name       = 'trg_notify_battle_joined'
  ),
  'trg_notify_battle_joined exists on battles.contender_entity_map'
);

-- 3. trg_notify_battle_comment exists on battles.comments
SELECT ok(
  EXISTS (
    SELECT 1 FROM information_schema.triggers
    WHERE trigger_schema     = 'battles'
      AND event_object_table = 'comments'
      AND trigger_name       = 'trg_notify_battle_comment'
  ),
  'trg_notify_battle_comment exists on battles.comments'
);

-- 4. battles.fn_trg_notify_battle_started is SECURITY DEFINER
SELECT ok(
  EXISTS (
    SELECT 1 FROM pg_catalog.pg_proc p
    JOIN pg_catalog.pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname   = 'battles'
      AND p.proname   = 'fn_trg_notify_battle_started'
      AND p.prosecdef = true
  ),
  'battles.fn_trg_notify_battle_started is SECURITY DEFINER'
);

-- 5. battles.fn_trg_notify_battle_joined is SECURITY DEFINER
SELECT ok(
  EXISTS (
    SELECT 1 FROM pg_catalog.pg_proc p
    JOIN pg_catalog.pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname   = 'battles'
      AND p.proname   = 'fn_trg_notify_battle_joined'
      AND p.prosecdef = true
  ),
  'battles.fn_trg_notify_battle_joined is SECURITY DEFINER'
);

-- 6. battles.fn_trg_notify_battle_comment is SECURITY DEFINER
SELECT ok(
  EXISTS (
    SELECT 1 FROM pg_catalog.pg_proc p
    JOIN pg_catalog.pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname   = 'battles'
      AND p.proname   = 'fn_trg_notify_battle_comment'
      AND p.prosecdef = true
  ),
  'battles.fn_trg_notify_battle_comment is SECURITY DEFINER'
);

-- 7. public.fn_notify_battle_result remains SECURITY DEFINER after refactor
SELECT ok(
  EXISTS (
    SELECT 1 FROM pg_catalog.pg_proc p
    JOIN pg_catalog.pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname   = 'public'
      AND p.proname   = 'fn_notify_battle_result'
      AND p.prosecdef = true
  ),
  'public.fn_notify_battle_result is SECURITY DEFINER after refactor'
);

-- 8. 'battle_won' is accepted by notifications_type_check constraint
SELECT ok(
  EXISTS (
    SELECT 1 FROM pg_catalog.pg_constraint c
    JOIN pg_catalog.pg_class cl ON cl.oid = c.conrelid
    JOIN pg_catalog.pg_namespace n ON n.oid = cl.relnamespace
    WHERE n.nspname  = 'public'
      AND cl.relname = 'notifications'
      AND c.conname  = 'notifications_type_check'
      AND c.consrc   LIKE '%battle_won%'
  ),
  'battle_won is present in notifications_type_check'
);

SELECT * FROM finish();
ROLLBACK;
