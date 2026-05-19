-- =============================================================================
-- OSS Launch Security Hardening
-- Remediates all 15 findings from the pre-launch Supabase security audit.
-- Each section references the finding number and severity.
-- Rollback notes are inline where applicable.
-- =============================================================================

-- ═════════════════════════════════════════════════════════════════════════════
-- Finding 1 (CRITICAL): Revoke anon from fn_resolve_handle_to_email
-- Risk: Any unauthenticated caller can resolve a handle to an email address.
-- Rollback: GRANT EXECUTE ON FUNCTION public.fn_resolve_handle_to_email(text) TO anon;
-- ═════════════════════════════════════════════════════════════════════════════

REVOKE EXECUTE ON FUNCTION public.fn_resolve_handle_to_email(text) FROM anon;

-- ═════════════════════════════════════════════════════════════════════════════
-- Finding 2 (CRITICAL): Migrate service_role_key reads from GUC to Vault
-- Risk: current_setting('app.service_role_key') readable by any SECURITY
--       DEFINER function; exfiltration possible via search-path hijack.
-- Approach: Create internal.get_service_role_key() with Vault-first + GUC
--           fallback, then dynamically patch all functions that read the GUC.
-- Rollback: DROP FUNCTION internal.get_service_role_key(); then re-apply
--           original function definitions from their source migrations.
-- ═════════════════════════════════════════════════════════════════════════════

CREATE SCHEMA IF NOT EXISTS internal;
COMMENT ON SCHEMA internal IS 'Private helper functions. Not exposed via PostgREST.';
REVOKE USAGE ON SCHEMA internal FROM anon, authenticated;
GRANT USAGE ON SCHEMA internal TO service_role;

CREATE OR REPLACE FUNCTION internal.get_service_role_key()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
STABLE
AS $$
DECLARE
  v_key text;
BEGIN
  -- Prefer Vault (operator inserts: INSERT INTO vault.secrets(name,secret)
  -- VALUES ('service_role_key','<key>'))
  BEGIN
    SELECT decrypted_secret INTO v_key
    FROM vault.decrypted_secrets
    WHERE name = 'service_role_key'
    LIMIT 1;
  EXCEPTION WHEN undefined_table OR insufficient_privilege THEN
    v_key := NULL;
  END;

  -- Fallback to GUC during migration period
  IF v_key IS NULL OR v_key = '' THEN
    v_key := current_setting('app.service_role_key', true);
  END IF;

  RETURN v_key;
END;
$$;

REVOKE ALL ON FUNCTION internal.get_service_role_key() FROM PUBLIC;
REVOKE ALL ON FUNCTION internal.get_service_role_key() FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION internal.get_service_role_key() TO service_role;

-- Dynamically patch every function that reads the GUC.
DO $$
DECLARE
  fn record;
  fn_def text;
  new_def text;
  patched int := 0;
BEGIN
  FOR fn IN
    SELECT p.oid, n.nspname, p.proname
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname NOT IN (
      'pg_catalog','information_schema','extensions','vault','pgsodium',
      'net','graphql','graphql_public','realtime','storage',
      'supabase_functions','internal','auth','cron','pg_net',
      'pgsodium_masks','pgbouncer','_realtime','supabase_migrations'
    )
  LOOP
    fn_def := pg_get_functiondef(fn.oid);
    IF fn_def LIKE '%app.service_role_key%' THEN
      -- Replace current_setting('app.service_role_key', true)
      new_def := regexp_replace(
        fn_def,
        E'current_setting\\(\\s*''app\\.service_role_key''\\s*,\\s*true\\s*\\)',
        'internal.get_service_role_key()',
        'g'
      );
      -- Replace current_setting('app.service_role_key') without missing_ok
      new_def := regexp_replace(
        new_def,
        E'current_setting\\(\\s*''app\\.service_role_key''\\s*\\)',
        'internal.get_service_role_key()',
        'g'
      );
      IF new_def IS DISTINCT FROM fn_def THEN
        EXECUTE new_def;
        patched := patched + 1;
        RAISE NOTICE 'F2: Patched GUC -> Vault in %.%', fn.nspname, fn.proname;
      END IF;
    END IF;
  END LOOP;
  RAISE NOTICE 'F2: Total functions patched for service_role_key: %', patched;
END $$;

-- ═════════════════════════════════════════════════════════════════════════════
-- Finding 3 (HIGH): Revoke anon from lenses.* schema tables
-- Risk: Table structure exposed to unauthenticated GraphQL introspection.
-- Rollback: GRANT USAGE ON SCHEMA lenses TO anon; GRANT SELECT ON ... TO anon;
-- ═════════════════════════════════════════════════════════════════════════════

REVOKE USAGE ON SCHEMA lenses FROM anon;
REVOKE SELECT ON lenses.contracts               FROM anon;
REVOKE SELECT ON lenses.parameter_contracts     FROM anon;
REVOKE SELECT ON lenses.contract_channels       FROM anon;
REVOKE SELECT ON lenses.contract_signatures     FROM anon;
REVOKE SELECT ON lenses.dependency_edges        FROM anon;
REVOKE SELECT ON lenses.parameter_deprecations  FROM anon;
REVOKE SELECT ON lenses.security_scopes         FROM anon;
REVOKE SELECT ON lenses.capability_index        FROM anon;

-- ═════════════════════════════════════════════════════════════════════════════
-- Finding 4 (HIGH): Protect lensers.profiles identity columns from
--                   self-mutation by authenticated users.
-- Risk: Users can UPDATE id, user_id, type, status, join_order, login_count,
--        created_at on their own profile row via PostgREST.
-- Approach: BEFORE UPDATE trigger blocks changes to protected columns.
--           SECURITY DEFINER functions (current_user = postgres) bypass.
-- Rollback: DROP TRIGGER trg_guard_profile_identity ON lensers.profiles;
--           DROP FUNCTION lensers.guard_profile_identity_columns();
-- ═════════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION lensers.guard_profile_identity_columns()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  -- SECURITY DEFINER functions and service_role may update any column
  IF current_user IN ('postgres', 'supabase_admin', 'service_role') THEN
    RETURN NEW;
  END IF;

  IF NEW.id             IS DISTINCT FROM OLD.id
    OR NEW.user_id      IS DISTINCT FROM OLD.user_id
    OR NEW.type         IS DISTINCT FROM OLD.type
    OR NEW.status       IS DISTINCT FROM OLD.status
    OR NEW.join_order   IS DISTINCT FROM OLD.join_order
    OR NEW.login_count  IS DISTINCT FROM OLD.login_count
    OR NEW.created_at   IS DISTINCT FROM OLD.created_at
  THEN
    RAISE EXCEPTION 'Cannot modify protected profile columns (id, user_id, type, status, join_order, login_count, created_at)'
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_guard_profile_identity ON lensers.profiles;
CREATE TRIGGER trg_guard_profile_identity
  BEFORE UPDATE ON lensers.profiles
  FOR EACH ROW
  EXECUTE FUNCTION lensers.guard_profile_identity_columns();

-- ═════════════════════════════════════════════════════════════════════════════
-- Finding 5 (MEDIUM): Revoke anon from fn_list_agent_incidents and
--                      fn_list_policy_evaluations; narrow GRANT ALL to EXECUTE.
-- ═════════════════════════════════════════════════════════════════════════════

REVOKE ALL ON FUNCTION public.fn_list_agent_incidents(uuid, integer, timestamp with time zone) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.fn_list_agent_incidents(uuid, integer, timestamp with time zone) FROM anon;
REVOKE ALL ON FUNCTION public.fn_list_agent_incidents(uuid, integer, timestamp with time zone) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.fn_list_agent_incidents(uuid, integer, timestamp with time zone) TO authenticated;
GRANT EXECUTE ON FUNCTION public.fn_list_agent_incidents(uuid, integer, timestamp with time zone) TO service_role;

REVOKE ALL ON FUNCTION public.fn_list_policy_evaluations(uuid, integer, timestamp with time zone) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.fn_list_policy_evaluations(uuid, integer, timestamp with time zone) FROM anon;
REVOKE ALL ON FUNCTION public.fn_list_policy_evaluations(uuid, integer, timestamp with time zone) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.fn_list_policy_evaluations(uuid, integer, timestamp with time zone) TO authenticated;
GRANT EXECUTE ON FUNCTION public.fn_list_policy_evaluations(uuid, integer, timestamp with time zone) TO service_role;

-- ═════════════════════════════════════════════════════════════════════════════
-- Finding 6 (MEDIUM): Revoke anon from fn_switch_active_lenser
-- ═════════════════════════════════════════════════════════════════════════════

REVOKE ALL ON FUNCTION public.fn_switch_active_lenser(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.fn_switch_active_lenser(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.fn_switch_active_lenser(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.fn_switch_active_lenser(uuid) TO service_role;

-- ═════════════════════════════════════════════════════════════════════════════
-- Finding 7 (MEDIUM): Restrict notifications UPDATE to read_at only
-- Risk: Authenticated users can overwrite lenser_id, type, title, body etc.
-- Approach: BEFORE UPDATE trigger silently resets protected columns.
-- Rollback: DROP TRIGGER trg_guard_notification_fields ON public.notifications;
--           DROP FUNCTION public.guard_notification_fields();
-- ═════════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.guard_notification_fields()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  -- Service-role and internal functions may update any column
  IF current_user IN ('postgres', 'supabase_admin', 'service_role') THEN
    RETURN NEW;
  END IF;

  -- Silently reset protected columns to their original values.
  -- Only read_at is allowed to change for authenticated users.
  NEW.id         := OLD.id;
  NEW.lenser_id  := OLD.lenser_id;
  NEW.type       := OLD.type;
  NEW.title      := OLD.title;
  NEW.body       := OLD.body;
  NEW.action_url := OLD.action_url;
  NEW.metadata   := OLD.metadata;
  NEW.created_at := OLD.created_at;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_guard_notification_fields ON public.notifications;
CREATE TRIGGER trg_guard_notification_fields
  BEFORE UPDATE ON public.notifications
  FOR EACH ROW
  EXECUTE FUNCTION public.guard_notification_fields();

-- ═════════════════════════════════════════════════════════════════════════════
-- Finding 8 (MEDIUM): Fix automation.events RLS UUID mismatch
-- Bug: Policy compares source_lenser_id (profiles UUID) to auth.uid() (auth
--      user UUID) — always evaluates false, silently blocking all reads.
-- Rollback: Recreate with auth.uid() if needed.
-- ═════════════════════════════════════════════════════════════════════════════

DROP POLICY IF EXISTS automation_events_owner_select ON automation.events;
CREATE POLICY automation_events_owner_select
  ON automation.events
  FOR SELECT
  TO authenticated
  USING (source_lenser_id = lensers.get_auth_lenser_id());

-- ═════════════════════════════════════════════════════════════════════════════
-- Finding 9 (MEDIUM): Add explicit policy to notification_aggregates
-- Currently RLS-enabled with zero policies; only service_role can access.
-- Add an explicit service_role policy for documentation and an owner SELECT.
-- ═════════════════════════════════════════════════════════════════════════════

CREATE POLICY notification_aggregates_service_all
  ON public.notification_aggregates
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY notification_aggregates_owner_select
  ON public.notification_aggregates
  FOR SELECT
  TO authenticated
  USING (recipient_id = lensers.get_auth_lenser_id());

-- ═════════════════════════════════════════════════════════════════════════════
-- Finding 10/12 (MEDIUM): Restrict open USING(true) SELECT policies on
-- analytics, xp, reputation, and audit tables to authenticated-only.
-- These policies had no role restriction; now explicitly scoped.
-- ═════════════════════════════════════════════════════════════════════════════

-- analytics.tag_activity_events
DROP POLICY IF EXISTS "events_public_select" ON analytics.tag_activity_events;
CREATE POLICY "events_authenticated_select" ON analytics.tag_activity_events
  FOR SELECT TO authenticated USING (true);

-- analytics.lenser_join_log
DROP POLICY IF EXISTS "join_log_public_select" ON analytics.lenser_join_log;
CREATE POLICY "join_log_authenticated_select" ON analytics.lenser_join_log
  FOR SELECT TO authenticated USING (true);

-- analytics.lenser_stats
DROP POLICY IF EXISTS "public_can_read_engagement" ON analytics.lenser_stats;
CREATE POLICY "authenticated_can_read_engagement" ON analytics.lenser_stats
  FOR SELECT TO authenticated USING (true);

-- reputation.contender_ratings
DROP POLICY IF EXISTS "contender_ratings_public_read" ON reputation.contender_ratings;
CREATE POLICY "contender_ratings_authenticated_read" ON reputation.contender_ratings
  FOR SELECT TO authenticated USING (true);

-- reputation.judge_calibrations
DROP POLICY IF EXISTS "judge_calibrations_public_read" ON reputation.judge_calibrations;
CREATE POLICY "judge_calibrations_authenticated_read" ON reputation.judge_calibrations
  FOR SELECT TO authenticated USING (true);

-- reputation.lenser_scores
DROP POLICY IF EXISTS "lenser_scores_public_read" ON reputation.lenser_scores;
CREATE POLICY "lenser_scores_authenticated_read" ON reputation.lenser_scores
  FOR SELECT TO authenticated USING (true);

-- xp.season_totals (leaderboard)
DROP POLICY IF EXISTS "xp_season_totals_leaderboard_select" ON xp.season_totals;
CREATE POLICY "xp_season_totals_authenticated_select" ON xp.season_totals
  FOR SELECT TO authenticated USING (true);

-- xp.seasons (public season metadata)
DROP POLICY IF EXISTS "xp_seasons_select_public" ON xp.seasons;
CREATE POLICY "xp_seasons_select_authenticated" ON xp.seasons
  FOR SELECT TO authenticated USING (true);

-- xp.totals (leaderboard)
DROP POLICY IF EXISTS "xp_totals_leaderboard_select" ON xp.totals;
CREATE POLICY "xp_totals_authenticated_select" ON xp.totals
  FOR SELECT TO authenticated USING (true);

-- ═════════════════════════════════════════════════════════════════════════════
-- Finding 11 (HIGH): SECURITY DEFINER search_path sweep
-- Approach: ALTER every SECURITY DEFINER function in non-system schemas that
--           has NO explicit search_path to SET search_path = '<own_schema>'.
--           Functions that already have a search_path (even one including
--           public) are left unchanged — the Supabase authenticated role
--           cannot CREATE objects in public, so the hijack vector is
--           theoretical in this context.
-- ═════════════════════════════════════════════════════════════════════════════

DO $$
DECLARE
  fn record;
  cnt int := 0;
BEGIN
  FOR fn IN
    SELECT n.nspname, p.proname, pg_get_function_identity_arguments(p.oid) AS args
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
  LOOP
    EXECUTE format(
      'ALTER FUNCTION %I.%I(%s) SET search_path = %L;',
      fn.nspname, fn.proname, fn.args, fn.nspname
    );
    cnt := cnt + 1;
  END LOOP;
  RAISE NOTICE 'F11: Hardened search_path on % SECURITY DEFINER function(s) that had no prior setting', cnt;
END $$;

-- Report remaining functions with search_path including 'public' (accepted risk)
DO $$
DECLARE
  fn record;
  cnt int := 0;
BEGIN
  FOR fn IN
    SELECT n.nspname, p.proname
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE p.prosecdef = true
      AND n.nspname NOT IN (
        'pg_catalog','information_schema','pgsodium','vault','extensions',
        'graphql','graphql_public','realtime','storage','supabase_functions',
        'net','internal','auth','cron','pg_net','pgsodium_masks','pgbouncer',
        '_realtime','supabase_migrations'
      )
      AND EXISTS (
        SELECT 1 FROM unnest(coalesce(p.proconfig, ARRAY[]::text[])) AS c
        WHERE c LIKE 'search_path=%' AND c LIKE '%public%'
      )
  LOOP
    cnt := cnt + 1;
  END LOOP;
  IF cnt > 0 THEN
    RAISE NOTICE 'F11: % SECURITY DEFINER function(s) still have public in search_path (accepted: authenticated cannot CREATE in public schema)', cnt;
  END IF;
END $$;

-- ═════════════════════════════════════════════════════════════════════════════
-- Finding 13 (LOW): Restrict audit attestation/hash_chain read to
--                    authenticated only.
-- ═════════════════════════════════════════════════════════════════════════════

DROP POLICY IF EXISTS "attestations_public_read" ON audit.attestations;
CREATE POLICY "attestations_authenticated_read" ON audit.attestations
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "hash_chains_public_read" ON audit.hash_chains;
CREATE POLICY "hash_chains_authenticated_read" ON audit.hash_chains
  FOR SELECT TO authenticated USING (true);

-- ═════════════════════════════════════════════════════════════════════════════
-- Finding 14 (LOW): Fix v_battle_feed_item grants
-- Risk: INSERT/UPDATE/DELETE granted on a non-updatable view.
-- ═════════════════════════════════════════════════════════════════════════════

REVOKE INSERT, UPDATE, DELETE ON battles.v_battle_feed_item FROM authenticated;

-- ═════════════════════════════════════════════════════════════════════════════
-- Finding 15 (LOW): Revoke anon from trigger functions
-- Trigger functions cannot be called directly by clients, but the grants
-- are unnecessary noise and increase the attack surface metadata.
-- ═════════════════════════════════════════════════════════════════════════════

REVOKE ALL ON FUNCTION analytics.protect_feedback_system_fields()                 FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION analytics.set_feedback_user_id()                           FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION content.ensure_public_tag()                                FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION content.normalize_website_url()                            FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION content.set_updated_at()                                   FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION content.sync_thread_count()                                FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION content.thread_replies_after_delete_trigger()               FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION content.thread_replies_after_insert_trigger()               FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION content.thread_replies_after_update_trigger()               FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION lensers.enforce_lensers_protections()                       FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION lensers.protect_sensitive_lenser_fields()                   FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION lensers.sync_join_order()                                   FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION media.set_updated_at()                                      FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.set_updated_at()                                     FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION tenancy.set_updated_at()                                    FROM PUBLIC, anon;

-- Also revoke unnecessary anon grants on non-trigger functions
REVOKE ALL ON FUNCTION public.fn_lensers_sync_social_links(jsonb)                  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.fn_lensers_sync_social_links(jsonb)               TO authenticated, service_role;

-- =============================================================================
-- End of OSS Launch Security Hardening
-- =============================================================================
