-- Migration: 20260336000000_fix_security_lints.sql
-- Purpose: Fix all Supabase security linter ERRORs and actionable WARNINGs:
--   1. security_definer_view (ERROR)  – 17 views → switch to security_invoker
--   2. auth_users_exposed (ERROR)     – vw_auth_lenser → revoke anon SELECT
--   3. function_search_path_mutable (WARN) – 47 functions → set explicit search_path
--   4. rls_policy_always_true (WARN)  – tag_translations + lensers.profiles → tighten

-- ============================================================
-- SECTION 1: Fix SECURITY DEFINER views → security_invoker
-- ============================================================
-- All 17 views were defaulting to SECURITY DEFINER because no
-- WITH (security_invoker) option was set. Switch them to
-- SECURITY INVOKER so RLS of the calling user is enforced.

ALTER VIEW "public"."vw_ai_models_public"                  SET (security_invoker = on);
ALTER VIEW "public"."vw_auth_lenser"                       SET (security_invoker = on);
ALTER VIEW "public"."vw_battle_funnel"                     SET (security_invoker = on);
ALTER VIEW "public"."vw_battle_health"                     SET (security_invoker = on);
ALTER VIEW "public"."vw_battle_participation"              SET (security_invoker = on);
ALTER VIEW "public"."vw_battles_public"                    SET (security_invoker = on);
ALTER VIEW "public"."vw_content_tags_public"               SET (security_invoker = on);
ALTER VIEW "public"."vw_content_thread_replies_public"     SET (security_invoker = on);
ALTER VIEW "public"."vw_content_threads_public"            SET (security_invoker = on);
ALTER VIEW "public"."vw_lensers_public_recent"             SET (security_invoker = on);
ALTER VIEW "public"."vw_lensers_social_links_private"      SET (security_invoker = on);
ALTER VIEW "public"."vw_lensers_social_links_public"       SET (security_invoker = on);
ALTER VIEW "public"."vw_prompt_templates_public"           SET (security_invoker = on);
ALTER VIEW "public"."vw_tags_public_extended"              SET (security_invoker = on);
ALTER VIEW "public"."vw_tags_public_stats"                 SET (security_invoker = on);
ALTER VIEW "public"."vw_xp_leaderboard_global"             SET (security_invoker = on);
ALTER VIEW "public"."vw_xp_leaderboard_season"             SET (security_invoker = on);


-- ============================================================
-- SECTION 2: Fix auth_users_exposed → revoke anon access
-- ============================================================
-- vw_auth_lenser joins auth.users directly and was reachable by
-- the anon role via PostgREST. Revoke SELECT so only authenticated
-- callers can use it (they are further restricted by underlying RLS).

REVOKE SELECT ON "public"."vw_auth_lenser" FROM "anon";


-- ============================================================
-- SECTION 3: Fix function_search_path_mutable (47 functions)
-- ============================================================
-- Add an explicit SET search_path to each flagged function so that
-- schema-search-path hijacking is not possible. Uses the same
-- ALTER FUNCTION pattern already established in migration 20260335.

-- ai schema
ALTER FUNCTION "ai"."ai_generations_media_owner_check"()
  SET search_path TO 'ai', 'public', 'auth';

-- analytics schema
ALTER FUNCTION "analytics"."log_tag_view"("content"."entity_type_enum", "uuid", "uuid")
  SET search_path TO 'analytics', 'content', 'public', 'auth';

ALTER FUNCTION "analytics"."protect_feedback_system_fields"()
  SET search_path TO 'analytics', 'public', 'auth';

ALTER FUNCTION "analytics"."set_feedback_user_id"()
  SET search_path TO 'analytics', 'public', 'auth';

-- battles schema
ALTER FUNCTION "battles"."set_updated_at"()
  SET search_path TO 'battles', 'public';

-- content schema
ALTER FUNCTION "content"."ensure_public_tag"()
  SET search_path TO 'content', 'lensers', 'public', 'auth';

ALTER FUNCTION "content"."normalize_website_url"()
  SET search_path TO 'content', 'public';

ALTER FUNCTION "content"."set_updated_at"()
  SET search_path TO 'content', 'public';

ALTER FUNCTION "content"."thread_replies_after_delete_trigger"()
  SET search_path TO 'content', 'lensers', 'public', 'auth';

ALTER FUNCTION "content"."thread_replies_after_insert_trigger"()
  SET search_path TO 'content', 'lensers', 'public', 'auth';

ALTER FUNCTION "content"."thread_replies_after_update_trigger"()
  SET search_path TO 'content', 'lensers', 'public', 'auth';

ALTER FUNCTION "content"."thread_reply_counts_as_public"("content"."thread_replies")
  SET search_path TO 'content', 'lensers', 'public', 'auth';

ALTER FUNCTION "content"."toggle_reaction"("uuid", "text", "uuid", "content"."reaction_enum")
  SET search_path TO 'content', 'lensers', 'public', 'auth';

ALTER FUNCTION "content"."update_prompt_template_reaction_counters"()
  SET search_path TO 'content', 'public';

ALTER FUNCTION "content"."user_owns_prompt"("uuid")
  SET search_path TO 'content', 'lensers', 'public', 'auth';

ALTER FUNCTION "content"."user_owns_thread"("uuid")
  SET search_path TO 'content', 'lensers', 'public', 'auth';

-- lensers schema
ALTER FUNCTION "lensers"."build_author_profile"("uuid")
  SET search_path TO 'lensers', 'content', 'xp', 'public', 'auth';

ALTER FUNCTION "lensers"."current_active_lenser_id"()
  SET search_path TO 'lensers', 'public', 'auth';

ALTER FUNCTION "lensers"."enforce_deletion_request"()
  SET search_path TO 'lensers', 'public', 'auth';

ALTER FUNCTION "lensers"."enforce_lensers_protections"()
  SET search_path TO 'lensers', 'public', 'auth';

ALTER FUNCTION "lensers"."is_active_lenser"("uuid")
  SET search_path TO 'lensers', 'public', 'auth';

ALTER FUNCTION "lensers"."prevent_lenser_join_log_delete"()
  SET search_path TO 'lensers', 'public', 'auth';

ALTER FUNCTION "lensers"."prevent_lenser_join_log_update"()
  SET search_path TO 'lensers', 'public', 'auth';

ALTER FUNCTION "lensers"."protect_sensitive_lenser_fields"()
  SET search_path TO 'lensers', 'public', 'auth';

ALTER FUNCTION "lensers"."sync_join_order"()
  SET search_path TO 'lensers', 'public';

ALTER FUNCTION "lensers"."sync_profile_from_auth_metadata"()
  SET search_path TO 'lensers', 'public', 'auth';

ALTER FUNCTION "lensers"."trg_log_login_from_auth"()
  SET search_path TO 'lensers', 'analytics', 'public', 'auth';

ALTER FUNCTION "lensers"."user_owns_lenser"("uuid")
  SET search_path TO 'lensers', 'public', 'auth';

-- public schema
ALTER FUNCTION "public"."fn_ai_create_generation"("text", "uuid", "jsonb", "text", "content"."visibility_enum", "text")
  SET search_path TO 'public', 'ai', 'content', 'lensers', 'analytics', 'auth';

ALTER FUNCTION "public"."fn_ai_get_generations_for_prompt"("uuid", "uuid", integer, integer, "text", "text")
  SET search_path TO 'public', 'ai', 'content', 'lensers', 'auth';

ALTER FUNCTION "public"."fn_lensers_waiting_list_create"("text", boolean, "text", "text", "text", "text")
  SET search_path TO 'public', 'lensers', 'auth';

ALTER FUNCTION "public"."fn_lensers_waiting_list_verify_token"("text")
  SET search_path TO 'public', 'lensers', 'auth';

ALTER FUNCTION "public"."is_admin"()
  SET search_path TO 'public', 'lensers', 'auth';

-- system schema
ALTER FUNCTION "system"."get_localized"("system"."entity_type_enum", "uuid", "text", "text")
  SET search_path TO 'system', 'public';

ALTER FUNCTION "system"."get_localized_fields"("system"."entity_type_enum", "uuid", "text")
  SET search_path TO 'system', 'public';

ALTER FUNCTION "system"."touch_updated_at"()
  SET search_path TO 'system', 'public';

-- xp schema
ALTER FUNCTION "xp"."apply"("uuid", "text", "xp"."source_enum", "text", "uuid", "uuid")
  SET search_path TO 'xp', 'lensers', 'content', 'public', 'auth';

ALTER FUNCTION "xp"."check_and_rollover_season"("uuid")
  SET search_path TO 'xp', 'lensers', 'public';

ALTER FUNCTION "xp"."compute_level_from"("uuid", bigint)
  SET search_path TO 'xp', 'public';

ALTER FUNCTION "xp"."generate_levels"("uuid", integer, integer)
  SET search_path TO 'xp', 'public';

ALTER FUNCTION "xp"."get_active_season_id"("uuid")
  SET search_path TO 'xp', 'public';

ALTER FUNCTION "xp"."mark_event_verified"("uuid", boolean, "text", "jsonb")
  SET search_path TO 'xp', 'public';

ALTER FUNCTION "xp"."on_reaction_added"()
  SET search_path TO 'xp', 'content', 'lensers', 'public', 'auth';

ALTER FUNCTION "xp"."prevent_event_mutations"()
  SET search_path TO 'xp', 'public', 'auth';

ALTER FUNCTION "xp"."rollback_event"("uuid", "text")
  SET search_path TO 'xp', 'lensers', 'public';

ALTER FUNCTION "xp"."rollover_season"("uuid")
  SET search_path TO 'xp', 'lensers', 'public';

ALTER FUNCTION "xp"."seed_default_curve"("uuid", integer, numeric, numeric)
  SET search_path TO 'xp', 'public';

ALTER FUNCTION "xp"."sync_total"()
  SET search_path TO 'xp', 'lensers', 'public';

ALTER FUNCTION "xp"."update_daily_streak"("uuid", "uuid", "text", "date")
  SET search_path TO 'xp', 'lensers', 'public';

ALTER FUNCTION "xp"."update_season_totals"("uuid", "uuid", bigint)
  SET search_path TO 'xp', 'lensers', 'public';

ALTER FUNCTION "xp"."verify_signature"("text", "jsonb")
  SET search_path TO 'xp', 'public';


-- ============================================================
-- SECTION 4: Fix rls_policy_always_true (actionable policies)
-- ============================================================

-- content.tag_translations
-- Any authenticated user could insert/update any tag translation with
-- no constraints. Restrict to service_role (translations managed via
-- admin backend or Edge Functions, not direct client writes).
DROP POLICY IF EXISTS "Authenticated can insert tag translations" ON "content"."tag_translations";
DROP POLICY IF EXISTS "Authenticated can update tag translations" ON "content"."tag_translations";

CREATE POLICY "service_role_can_manage_tag_translations"
  ON "content"."tag_translations"
  FOR ALL
  USING ((SELECT "auth"."role"()) = 'service_role')
  WITH CHECK ((SELECT "auth"."role"()) = 'service_role');


-- lensers.profiles — allow_update_except_handle
-- USING clause was (true), meaning any caller could target any row
-- for UPDATE. The WITH CHECK was already restricted to service_role,
-- so align USING to match, making the intent unambiguous.
DROP POLICY IF EXISTS "allow_update_except_handle" ON "lensers"."profiles";

CREATE POLICY "allow_update_except_handle"
  ON "lensers"."profiles"
  FOR UPDATE
  USING ((SELECT "auth"."role"()) = 'service_role')
  WITH CHECK ((SELECT "auth"."role"()) = 'service_role');


-- ============================================================
-- SECTION 5: Grant missing table privileges exposed by security_invoker
-- ============================================================
-- vw_tags_public_stats and vw_tags_public_extended access these
-- analytics tables. Previously hidden by SECURITY DEFINER; now that
-- views run as the caller (security_invoker), anon/authenticated
-- must have SELECT. Both tables have RLS enabled with public-select
-- policies, so this only surfaces what was already intentionally public.

GRANT SELECT ON TABLE "analytics"."tag_activity_events" TO "anon";
GRANT SELECT ON TABLE "analytics"."tag_activity_events" TO "authenticated";

GRANT SELECT ON TABLE "analytics"."tag_activity_daily" TO "anon";
GRANT SELECT ON TABLE "analytics"."tag_activity_daily" TO "authenticated";

-- analytics.lenser_join_log has RLS enabled with a public SELECT policy
-- (join_log_public_select USING true). Grant SELECT so anon/authenticated
-- can reach it now that views run as security_invoker.
GRANT SELECT ON TABLE "analytics"."lenser_join_log" TO "anon";
GRANT SELECT ON TABLE "analytics"."lenser_join_log" TO "authenticated";
