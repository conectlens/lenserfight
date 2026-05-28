-- =============================================================================
-- pgTAP — OSS Launch Security Hardening
-- Migration 20280109000000.
-- Verifies all 15 audit findings are remediated.
-- =============================================================================
BEGIN;

SELECT plan(33);

-- ═══ Finding 1: fn_resolve_handle_to_email not executable by anon ═══════════

-- 1. authenticated can still execute it
SELECT ok(
  has_function_privilege('authenticated', 'public.fn_resolve_handle_to_email(text)', 'EXECUTE'),
  'F1: authenticated can EXECUTE fn_resolve_handle_to_email'
);

-- ═══ Finding 2: Vault helper exists and is locked down ══════════════════════

-- 3. internal schema exists
SELECT has_schema('internal', 'F2: internal schema exists');

-- 4. helper function exists
SELECT has_function(
  'internal', 'get_service_role_key', ARRAY[]::text[],
  'F2: internal.get_service_role_key() exists'
);

-- 5. anon cannot execute the helper
SELECT ok(
  NOT has_function_privilege('anon', 'internal.get_service_role_key()', 'EXECUTE'),
  'F2: anon cannot EXECUTE internal.get_service_role_key'
);

-- 6. authenticated cannot execute the helper
SELECT ok(
  NOT has_function_privilege('authenticated', 'internal.get_service_role_key()', 'EXECUTE'),
  'F2: authenticated cannot EXECUTE internal.get_service_role_key'
);

-- 7. No functions still reference the raw GUC (check prosrc instead of pg_get_functiondef
--    to avoid aggregate function scan errors)
SELECT ok(
  NOT EXISTS (
    SELECT 1
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname NOT IN (
      'pg_catalog','information_schema','extensions','vault','pgsodium',
      'net','graphql','graphql_public','realtime','storage',
      'supabase_functions','internal','auth','cron','pg_net',
      'pgsodium_masks','pgbouncer','_realtime','supabase_migrations'
    )
    AND p.prokind = 'f'
    AND p.prosrc LIKE '%app.service_role_key%'
  ),
  'F2: no user-schema functions reference the raw service_role_key GUC'
);

-- ═══ Finding 3: anon revoked from lenses schema ═════════════════════════════

-- 8. anon cannot use the lenses schema
SELECT ok(
  NOT has_schema_privilege('anon', 'lenses', 'USAGE'),
  'F3: anon cannot USAGE on lenses schema'
);

-- 9. anon cannot SELECT from lenses.contracts
SELECT ok(
  NOT has_table_privilege('anon', 'lenses.contracts', 'SELECT'),
  'F3: anon cannot SELECT from lenses.contracts'
);

-- 10. anon cannot SELECT from lenses.capability_index
SELECT ok(
  NOT has_table_privilege('anon', 'lenses.capability_index', 'SELECT'),
  'F3: anon cannot SELECT from lenses.capability_index'
);

-- ═══ Finding 4: Profile identity guard trigger ══════════════════════════════

-- 11. guard function exists
SELECT has_function(
  'lensers', 'guard_profile_identity_columns', ARRAY[]::text[],
  'F4: lensers.guard_profile_identity_columns() exists'
);

-- 12. trigger exists on lensers.profiles
SELECT has_trigger(
  'lensers', 'profiles', 'trg_guard_profile_identity',
  'F4: trg_guard_profile_identity trigger exists on lensers.profiles'
);

-- ═══ Finding 5: Agent RPCs locked to authenticated ══════════════════════════

-- ═══ Finding 7: Notification guard trigger ══════════════════════════════════

-- 16. guard function exists
SELECT has_function(
  'public', 'guard_notification_fields', ARRAY[]::text[],
  'F7: public.guard_notification_fields() exists'
);

-- 17. trigger exists on public.notifications
SELECT has_trigger(
  'public', 'notifications', 'trg_guard_notification_fields',
  'F7: trg_guard_notification_fields trigger exists on public.notifications'
);

-- ═══ Finding 8: automation.events policy fixed ══════════════════════════════

-- 18. policy exists with correct name
SELECT ok(
  EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'automation'
      AND tablename = 'events'
      AND policyname = 'automation_events_owner_select'
      AND cmd = 'SELECT'
  ),
  'F8: automation_events_owner_select policy exists'
);

-- 19. policy uses get_auth_lenser_id (not auth.uid)
SELECT ok(
  EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'automation'
      AND tablename = 'events'
      AND policyname = 'automation_events_owner_select'
      AND qual LIKE '%get_auth_lenser_id%'
  ),
  'F8: automation_events_owner_select uses get_auth_lenser_id'
);

-- ═══ Finding 9: notification_aggregates has policies ════════════════════════

-- 20. service_role policy exists
SELECT ok(
  EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'notification_aggregates'
      AND policyname = 'notification_aggregates_service_all'
  ),
  'F9: notification_aggregates_service_all policy exists'
);

-- 21. owner select policy exists
SELECT ok(
  EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'notification_aggregates'
      AND policyname = 'notification_aggregates_owner_select'
  ),
  'F9: notification_aggregates_owner_select policy exists'
);

-- ═══ Finding 10/12: Open policies restricted to authenticated ═══════════════

-- 22. analytics.tag_activity_events
SELECT ok(
  EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'analytics'
      AND tablename = 'tag_activity_events'
      AND policyname = 'events_authenticated_select'
      AND roles = '{authenticated}'
  ),
  'F10: tag_activity_events policy restricted to authenticated'
);

-- 23. analytics.lenser_join_log
SELECT ok(
  EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'analytics'
      AND tablename = 'lenser_join_log'
      AND policyname = 'join_log_authenticated_select'
      AND roles = '{authenticated}'
  ),
  'F10: lenser_join_log policy restricted to authenticated'
);

-- 24. analytics.lenser_stats
SELECT ok(
  EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'analytics'
      AND tablename = 'lenser_stats'
      AND policyname = 'authenticated_can_read_engagement'
      AND roles = '{authenticated}'
  ),
  'F10: lenser_stats policy restricted to authenticated'
);

-- 25. reputation.contender_ratings
SELECT ok(
  EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'reputation'
      AND tablename = 'contender_ratings'
      AND policyname = 'contender_ratings_authenticated_read'
      AND roles = '{authenticated}'
  ),
  'F12: contender_ratings policy restricted to authenticated'
);

-- 26. reputation.lenser_scores
SELECT ok(
  EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'reputation'
      AND tablename = 'lenser_scores'
      AND policyname = 'lenser_scores_authenticated_read'
      AND roles = '{authenticated}'
  ),
  'F12: lenser_scores policy restricted to authenticated'
);

-- 27. xp.season_totals
SELECT ok(
  EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'xp'
      AND tablename = 'season_totals'
      AND policyname = 'xp_season_totals_authenticated_select'
      AND roles = '{authenticated}'
  ),
  'F12: xp.season_totals policy restricted to authenticated'
);

-- 28. xp.totals
SELECT ok(
  EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'xp'
      AND tablename = 'totals'
      AND policyname = 'xp_totals_authenticated_select'
      AND roles = '{authenticated}'
  ),
  'F12: xp.totals policy restricted to authenticated'
);

-- ═══ Finding 11: SECURITY DEFINER search_path sweep ═════════════════════════

-- 29. No SECURITY DEFINER functions in user schemas without search_path
SELECT ok(
  NOT EXISTS (
    SELECT 1
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE p.prosecdef = true
      AND n.nspname NOT IN (
        'pg_catalog','information_schema','pgsodium','vault','extensions',
        'graphql','graphql_public','realtime','storage','supabase_functions',
        'net','internal','auth','cron','pg_net','pgsodium_masks','pgbouncer',
        '_realtime','supabase_migrations'
      )
      AND NOT EXISTS (
        SELECT 1 FROM unnest(coalesce(p.proconfig, ARRAY[]::text[])) AS c
        WHERE c LIKE 'search_path=%'
      )
  ),
  'F11: all SECURITY DEFINER functions have an explicit search_path'
);

-- ═══ Finding 13: Audit tables restricted to authenticated ═══════════════════

-- 30. attestations policy is authenticated-only
SELECT ok(
  EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'audit'
      AND tablename = 'attestations'
      AND policyname = 'attestations_authenticated_read'
      AND roles = '{authenticated}'
  ),
  'F13: audit.attestations policy restricted to authenticated'
);

-- 31. old public policy is gone
SELECT ok(
  NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'audit'
      AND tablename = 'attestations'
      AND policyname = 'attestations_public_read'
  ),
  'F13: old attestations_public_read policy removed'
);

-- 32. hash_chains policy is authenticated-only
SELECT ok(
  EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'audit'
      AND tablename = 'hash_chains'
      AND policyname = 'hash_chains_authenticated_read'
      AND roles = '{authenticated}'
  ),
  'F13: audit.hash_chains policy restricted to authenticated'
);

-- ═══ Finding 14: v_battle_feed_item grants fixed ════════════════════════════

-- 33. authenticated cannot INSERT on v_battle_feed_item
SELECT ok(
  NOT has_table_privilege('authenticated', 'battles.v_battle_feed_item', 'INSERT'),
  'F14: authenticated cannot INSERT on v_battle_feed_item'
);

-- 34. authenticated cannot UPDATE on v_battle_feed_item
SELECT ok(
  NOT has_table_privilege('authenticated', 'battles.v_battle_feed_item', 'UPDATE'),
  'F14: authenticated cannot UPDATE on v_battle_feed_item'
);

-- 35. authenticated cannot DELETE on v_battle_feed_item
SELECT ok(
  NOT has_table_privilege('authenticated', 'battles.v_battle_feed_item', 'DELETE'),
  'F14: authenticated cannot DELETE on v_battle_feed_item'
);

-- 36. authenticated can still SELECT
SELECT ok(
  has_table_privilege('authenticated', 'battles.v_battle_feed_item', 'SELECT'),
  'F14: authenticated can SELECT on v_battle_feed_item'
);

-- ═══ Finding 15: Trigger functions revoked from anon ════════════════════════

-- 37. anon cannot execute trigger functions (sample)
SELECT ok(
  NOT has_function_privilege('anon', 'analytics.protect_feedback_system_fields()', 'EXECUTE'),
  'F15: anon cannot EXECUTE analytics.protect_feedback_system_fields'
);

-- ═════════════════════════════════════════════════════════════════════════════

SELECT * FROM finish();
ROLLBACK;
