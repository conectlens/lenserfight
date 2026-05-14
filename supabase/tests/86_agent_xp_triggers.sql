-- =============================================================================
-- pgTAP — Phase CN: Agent & XP notification triggers
-- plan(7): 3 triggers exist on correct tables; 3 functions are SECURITY DEFINER;
--          trg_notify_agent_created fires on agents.ownerships
-- =============================================================================
BEGIN;

SELECT plan(7);

-- 1. trg_notify_agent_created exists on agents.ownerships
SELECT ok(
  EXISTS (
    SELECT 1 FROM information_schema.triggers
    WHERE trigger_schema     = 'agents'
      AND event_object_table = 'ownerships'
      AND trigger_name       = 'trg_notify_agent_created'
  ),
  'trg_notify_agent_created exists on agents.ownerships'
);

-- 2. trg_notify_agent_battle_won exists on battles.battles
SELECT ok(
  EXISTS (
    SELECT 1 FROM information_schema.triggers
    WHERE trigger_schema     = 'battles'
      AND event_object_table = 'battles'
      AND trigger_name       = 'trg_notify_agent_battle_won'
  ),
  'trg_notify_agent_battle_won exists on battles.battles'
);

-- 3. trg_notify_badge_awarded exists on lensers.badges
SELECT ok(
  EXISTS (
    SELECT 1 FROM information_schema.triggers
    WHERE trigger_schema     = 'lensers'
      AND event_object_table = 'badges'
      AND trigger_name       = 'trg_notify_badge_awarded'
  ),
  'trg_notify_badge_awarded exists on lensers.badges'
);

-- 4. agents.fn_trg_notify_agent_created is SECURITY DEFINER
SELECT ok(
  EXISTS (
    SELECT 1 FROM pg_catalog.pg_proc p
    JOIN pg_catalog.pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname   = 'agents'
      AND p.proname   = 'fn_trg_notify_agent_created'
      AND p.prosecdef = true
  ),
  'agents.fn_trg_notify_agent_created is SECURITY DEFINER'
);

-- 5. battles.fn_trg_notify_agent_battle_won is SECURITY DEFINER
SELECT ok(
  EXISTS (
    SELECT 1 FROM pg_catalog.pg_proc p
    JOIN pg_catalog.pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname   = 'battles'
      AND p.proname   = 'fn_trg_notify_agent_battle_won'
      AND p.prosecdef = true
  ),
  'battles.fn_trg_notify_agent_battle_won is SECURITY DEFINER'
);

-- 6. lensers.fn_trg_notify_badge_awarded is SECURITY DEFINER
SELECT ok(
  EXISTS (
    SELECT 1 FROM pg_catalog.pg_proc p
    JOIN pg_catalog.pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname   = 'lensers'
      AND p.proname   = 'fn_trg_notify_badge_awarded'
      AND p.prosecdef = true
  ),
  'lensers.fn_trg_notify_badge_awarded is SECURITY DEFINER'
);

-- 7. 'agent_created' is present in notifications_type_check constraint
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
  'agent_created is present in notifications_type_check'
);

SELECT * FROM finish();
ROLLBACK;
