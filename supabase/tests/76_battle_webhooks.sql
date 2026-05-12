-- =============================================================================
-- pgTAP — Phase CB: Battle webhook subscriptions
-- plan(5): fn_battles_subscribe_webhook exists; fn_battles_notify_webhooks exists;
--          webhook outbox table exists; trigger exists; RLS on subscriptions
-- =============================================================================
BEGIN;

SELECT plan(5);

-- 1. fn_battles_subscribe_webhook exists
SELECT ok(
  EXISTS (
    SELECT 1 FROM pg_catalog.pg_proc p
    JOIN pg_catalog.pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname = 'fn_battles_subscribe_webhook'
  ),
  'public.fn_battles_subscribe_webhook() exists'
);

-- 2. fn_battles_notify_webhooks exists
SELECT ok(
  EXISTS (
    SELECT 1 FROM pg_catalog.pg_proc p
    JOIN pg_catalog.pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname = 'fn_battles_notify_webhooks'
  ),
  'public.fn_battles_notify_webhooks() exists'
);

-- 3. audit.webhook_outbox table exists
SELECT ok(
  EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'audit'
      AND table_name   = 'webhook_outbox'
  ),
  'audit.webhook_outbox table exists'
);

-- 4. trg_battles_status_webhook trigger exists
SELECT ok(
  EXISTS (
    SELECT 1 FROM pg_catalog.pg_trigger t
    JOIN pg_catalog.pg_class c ON c.oid = t.tgrelid
    JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'battles'
      AND c.relname = 'battles'
      AND t.tgname  = 'trg_battles_status_webhook'
  ),
  'trg_battles_status_webhook trigger exists on battles.battles'
);

-- 5. RLS is enabled on battles.battle_event_subscriptions
SELECT ok(
  (
    SELECT relrowsecurity
    FROM pg_catalog.pg_class c
    JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'battles'
      AND c.relname = 'battle_event_subscriptions'
  ),
  'RLS is enabled on battles.battle_event_subscriptions'
);

SELECT finish();
ROLLBACK;
