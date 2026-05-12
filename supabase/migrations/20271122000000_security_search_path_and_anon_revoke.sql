-- =============================================================================
-- Security hardening: mutable search_path + anon GraphQL exposure + bucket
-- =============================================================================
-- Addresses Supabase linter warnings:
--   0011 function_search_path_mutable  — 22 functions across 7 schemas
--   0026 pg_graphql_anon_table_exposed — all non-public schema tables visible
--                                        to the anon key via GraphQL
--   0025 public_bucket_allows_listing  — public-assets bucket allows enumeration
--
-- NOT addressed here (requires a separate maintenance window):
--   0014 extension_in_public (btree_gist) — moving an extension requires
--   DROP + recreate with index rebuild; schedule as a dedicated migration.
-- =============================================================================


-- -----------------------------------------------------------------------------
-- 1. Fix mutable search_path on flagged functions
--    Each function gets its own schema (+ pg_catalog) pinned so a rogue
--    search_path cannot shadow built-ins or inject a different schema's objects.
-- -----------------------------------------------------------------------------

-- agents
ALTER FUNCTION agents.fn_tools_registry_egress_guard()
  SET search_path = agents, pg_catalog;

-- connectors
ALTER FUNCTION connectors.fn_valid_scopes()
  SET search_path = connectors, pg_catalog;

ALTER FUNCTION connectors.fn_assert_known_scopes(text[])
  SET search_path = connectors, pg_catalog;

ALTER FUNCTION connectors.fn_hash_token(text)
  SET search_path = connectors, pg_catalog;

ALTER FUNCTION connectors.fn_assert_scope(text[], text)
  SET search_path = connectors, pg_catalog;

-- battles
ALTER FUNCTION battles.trg_refresh_vote_velocity()
  SET search_path = battles, pg_catalog;

ALTER FUNCTION battles.fn_series_touch_updated()
  SET search_path = battles, pg_catalog;

ALTER FUNCTION battles.fn_votes_set_updated_at()
  SET search_path = battles, pg_catalog;

ALTER FUNCTION battles.fn_model_test_runs_immutable()
  SET search_path = battles, pg_catalog;

-- automation
ALTER FUNCTION automation.trg_trigger_rules_touch_updated_at()
  SET search_path = automation, pg_catalog;

-- lenses
ALTER FUNCTION lenses.fn_schedule_calendars_touch_updated()
  SET search_path = lenses, pg_catalog;

ALTER FUNCTION lenses.trg_workflow_version_immutable_fn()
  SET search_path = lenses, pg_catalog;

ALTER FUNCTION lenses.fn_cron_field_matches(text, integer)
  SET search_path = lenses, pg_catalog;

ALTER FUNCTION lenses.fn_cron_matches_now(text, timestamptz)
  SET search_path = lenses, pg_catalog;

ALTER FUNCTION lenses.fn_workflow_has_cycle(uuid)
  SET search_path = lenses, pg_catalog;

ALTER FUNCTION lenses.set_updated_at()
  SET search_path = lenses, pg_catalog;

-- i18n
ALTER FUNCTION i18n.fn_is_supported_language(text)
  SET search_path = i18n, pg_catalog;

-- reputation (numeric math — keeps pg_catalog for built-in operators)
ALTER FUNCTION reputation.std_normal_cdf(numeric)
  SET search_path = reputation, pg_catalog;

ALTER FUNCTION reputation.std_normal_pdf(numeric)
  SET search_path = reputation, pg_catalog;

-- cron safe-wrappers were created conditionally; use a DO block to guard
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'battles' AND p.proname = 'fn_auto_close_voting_safe'
  ) THEN
    EXECUTE $f$
      ALTER FUNCTION battles.fn_auto_close_voting_safe()
        SET search_path = battles, automation, pg_catalog
    $f$;
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'battles' AND p.proname = 'fn_auto_finalize_battles_safe'
  ) THEN
    EXECUTE $f$
      ALTER FUNCTION battles.fn_auto_finalize_battles_safe()
        SET search_path = battles, automation, pg_catalog
    $f$;
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'lenses' AND p.proname = 'fn_dispatch_scheduled_workflows_safe'
  ) THEN
    EXECUTE $f$
      ALTER FUNCTION lenses.fn_dispatch_scheduled_workflows_safe()
        SET search_path = lenses, automation, pg_catalog
    $f$;
  END IF;
END $$;


-- -----------------------------------------------------------------------------
-- 2. Remove anon SELECT grants from non-public-schema tables
--
-- Policy: only the "public" and "graph_public" schemas are exposed via
-- PostgREST / pg_graphql. All other schemas are accessed exclusively through
-- SECURITY DEFINER RPCs that live in the public schema. Direct SELECT grants
-- to the anon role in non-public schemas cause those tables to appear in the
-- GraphQL introspection schema for unauthenticated clients.
--
-- The SECURITY DEFINER RPCs (fn_browse_battles, fn_battles_render_prompt, etc.)
-- run as the postgres role and are unaffected by these revokes.
-- -----------------------------------------------------------------------------

-- ── agents schema ─────────────────────────────────────────────────────────────
REVOKE SELECT ON agents.ai_lensers     FROM anon;
REVOKE SELECT ON agents.lens_bindings  FROM anon;
REVOKE SELECT ON agents.model_bindings FROM anon;

-- ── ai schema ─────────────────────────────────────────────────────────────────
REVOKE SELECT ON ai.model_pricing FROM anon;

-- ── analytics schema ──────────────────────────────────────────────────────────
REVOKE SELECT ON analytics.lenser_join_log     FROM anon;
REVOKE SELECT ON analytics.lenser_stats        FROM anon;
REVOKE SELECT ON analytics.tag_activity_events FROM anon;

-- ── battles schema ────────────────────────────────────────────────────────────
-- Remove the default-privilege rule that auto-grants SELECT to anon for every
-- new table created by postgres in this schema (the source of most warnings).
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA battles
  REVOKE SELECT ON TABLES FROM anon;

-- Revoke from all existing battles tables (covers both explicit grants and
-- any that were auto-granted via the DEFAULT PRIVILEGES above).
REVOKE SELECT ON ALL TABLES IN SCHEMA battles FROM anon;

-- ── reputation schema ─────────────────────────────────────────────────────────
REVOKE SELECT ON reputation.lenser_scores      FROM anon;
REVOKE SELECT ON reputation.contender_ratings  FROM anon;
-- v_trueskill_leaderboard is a view; revoke is safe — public leaderboard
-- data is served through the public-schema fn_get_leaderboard RPC.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'reputation' AND c.relname = 'v_trueskill_leaderboard'
  ) THEN
    EXECUTE 'REVOKE SELECT ON reputation.v_trueskill_leaderboard FROM anon';
  END IF;
END $$;


-- -----------------------------------------------------------------------------
-- 3. Tighten public-assets bucket SELECT policy
--
-- A public bucket (public = true) serves file URLs directly through the
-- Storage CDN — no SELECT policy is needed for that. The broad SELECT policy
-- "public_read_public_assets" additionally lets the anon role LIST all object
-- names in the bucket via PostgREST, which may expose unintended paths.
-- Dropping it removes listing while preserving URL-based access.
-- -----------------------------------------------------------------------------

DROP POLICY IF EXISTS "public_read_public_assets" ON storage.objects;
