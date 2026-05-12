-- =============================================================================
-- Security hardening (round 2): remaining anon GraphQL exposure
-- =============================================================================
-- Resolves Supabase linter warning 0026 pg_graphql_anon_table_exposed across
-- every non-public schema still showing up in the GraphQL introspection schema
-- for unauthenticated clients.
--
-- Continues the policy established by 20271122000000_security_search_path_and_anon_revoke:
--   "Only the `public` and `graphql_public` schemas are exposed via PostgREST /
--   pg_graphql. All other schemas are accessed through SECURITY DEFINER RPCs in
--   the public schema, which run as `postgres` and are unaffected by REVOKE."
--
-- Schemas covered here (not yet covered in 20271122):
--   billing, content, core, execution, integrations, lensers, lenses,
--   media, organizations, xp
--
-- Schemas already covered in 20271122: agents, ai, analytics, battles, reputation.
--
-- IMPORTANT: 20271116000000_anon_read_policies set up explicit anon SELECT
-- policies on battles.battles, battles.templates, and lensers.profiles. Those
-- policies become inert once the underlying GRANT is revoked, which is the
-- intended behavior — anon discovery moves to public-schema RPCs / views
-- (fn_browse_battles, vw_lensers_public_recent, etc.) that run as postgres.
-- The dead policies are dropped at the bottom of this migration to keep the
-- catalog clean.
-- =============================================================================


-- -----------------------------------------------------------------------------
-- 1. Bulk revoke + default-privilege scrub
--    Strip anon SELECT from every existing table/view in each schema, and
--    remove the auto-grant rule so future tables created by `postgres` are
--    not silently re-exposed.
-- -----------------------------------------------------------------------------

DO $$
DECLARE
  s text;
BEGIN
  FOREACH s IN ARRAY ARRAY[
    'billing',
    'content',
    'core',
    'execution',
    'integrations',
    'lensers',
    'lenses',
    'media',
    'organizations',
    'xp'
  ] LOOP
    EXECUTE format(
      'ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA %I REVOKE SELECT ON TABLES FROM anon',
      s
    );
    EXECUTE format(
      'REVOKE SELECT ON ALL TABLES IN SCHEMA %I FROM anon',
      s
    );
  END LOOP;
END $$;


-- -----------------------------------------------------------------------------
-- 2. Plug the lone non-public anon grant that lives outside its home schema
--    20260417160000_workflow_observability.sql granted SELECT on
--    execution.vw_workflow_run_timeline directly to anon. The bulk REVOKE
--    above covers it, but call it out explicitly so future readers see why
--    the view is no longer GraphQL-discoverable.
-- -----------------------------------------------------------------------------

REVOKE SELECT ON execution.vw_workflow_run_timeline FROM anon;


-- -----------------------------------------------------------------------------
-- 3. Drop the now-inert anon SELECT policies from 20271116
--    Without an underlying GRANT, RLS policies for the anon role never fire.
--    Leaving them on the table just confuses future readers and lints.
-- -----------------------------------------------------------------------------

DROP POLICY IF EXISTS anon_lenser_profiles_public_read ON lensers.profiles;

-- battles policies were already made inert by 20271122's
-- "REVOKE SELECT ON ALL TABLES IN SCHEMA battles FROM anon"; drop them too.
DROP POLICY IF EXISTS anon_battles_public_read   ON battles.battles;
DROP POLICY IF EXISTS anon_templates_public_read ON battles.templates;


-- -----------------------------------------------------------------------------
-- 4. Public-schema internal views — revoke anon SELECT where the view's
--    purpose is administrative / observability / authenticated-only.
--
-- Decision matrix:
--   contact_messages           → admin view of writes; writes go through
--                                fn_send_contact_message; anon read is wrong.
--   notifications              → per-user inbox, read via fn_get_notifications;
--                                Realtime subscribes as authenticated, not anon.
--   v_workflow_run_*           → run observability; service_role + authenticated.
--   vw_auth_lenser             → name says it: requires auth context.
--   vw_battle_funnel / health  → internal analytics dashboards.
--
-- Left intentionally anon-readable (NOT revoked, do not add here):
--   vw_ai_models_public, vw_battles_public, vw_battle_participation,
--   vw_content_tags_public, vw_content_thread_replies_public,
--   vw_content_threads_public, vw_lensers_public_recent,
--   vw_lensers_social_links_public, vw_lenses_public,
--   vw_tags_public_extended, vw_tags_public_stats, vw_workflows,
--   vw_xp_leaderboard_global, vw_xp_leaderboard_season,
--   vw_global_messages, vw_feedback_user.
-- -----------------------------------------------------------------------------

REVOKE SELECT ON public.contact_messages               FROM anon;
REVOKE SELECT ON public.notifications                  FROM anon;
REVOKE SELECT ON public.v_workflow_run_cost_breakdown  FROM anon;
REVOKE SELECT ON public.v_workflow_run_health          FROM anon;
REVOKE SELECT ON public.v_workflow_run_timeline        FROM anon;
REVOKE SELECT ON public.vw_auth_lenser                 FROM anon;
REVOKE SELECT ON public.vw_battle_funnel               FROM anon;
REVOKE SELECT ON public.vw_battle_health               FROM anon;

-- vw_feedback_admin is an admin view but had GRANT ALL TO anon from the base
-- schema dump. Revoke it too — admin views must never be anon-discoverable.
REVOKE SELECT ON public.vw_feedback_admin              FROM anon;


-- -----------------------------------------------------------------------------
-- Behavioral note (follow-up tracked separately)
--
-- Several public-schema views are declared WITH (security_invoker = 'on') and
-- join into the non-public schemas we just revoked from anon. For unauth
-- visitors those views will now silently return 0 rows under RLS even though
-- the public-schema GRANT to anon is still in place. This mirrors the prior
-- state set up by 20271122 for analytics-backed views and is the team's
-- intentional posture: anon discovery happens via SECURITY DEFINER RPCs in
-- the public schema, not via cross-schema view fan-out.
--
-- Views that will fall under this new constraint for anon (non-exhaustive):
--   public.vw_lensers_public_recent   (joins lensers.profiles, xp.totals, analytics.*)
--   public.vw_xp_leaderboard_global   (joins xp.*)
--   public.vw_xp_leaderboard_season   (joins xp.*, lensers.profiles)
--   public.vw_battles_public          (joins battles.*)
--   public.vw_content_threads_public  (joins content.threads)
--   public.vw_lenses_public           (joins lenses.lenses, lenses.versions)
--
-- If anon access to any of these is required, the canonical fix is to
-- migrate the consumer to a SECURITY DEFINER RPC (pattern: fn_browse_battles)
-- or convert the view to SECURITY DEFINER after auditing its column list.
-- Do NOT re-add per-table anon GRANTs in non-public schemas — that just
-- reintroduces the GraphQL exposure this migration removes.
-- -----------------------------------------------------------------------------
