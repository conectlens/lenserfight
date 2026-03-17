-- Migration: fix_personal_feed_rpc_permissions
-- Problem: fn_content_get_personal_threads, fn_content_get_personal_prompts,
--          fn_content_get_followed_tags, and fn_lensers_get_suggested are
--          LANGUAGE sql STABLE without SECURITY DEFINER (i.e. SECURITY INVOKER).
--          They internally access lensers.tag_follows, lensers.follows,
--          lensers.vw_lensers_score, content.vw_threads_hot_scores, and
--          content.vw_prompts_hot_scores — none of which have SELECT grants for
--          the "authenticated" role.  PostgreSQL raises "permission denied" (42501),
--          which PostgREST maps to 403 Forbidden.
--
-- Fix: switch all four functions to SECURITY DEFINER so they execute as the
--      postgres owner (who has unrestricted access).  The existing SET search_path
--      clauses already guard against search-path injection, so this is safe.

ALTER FUNCTION "public"."fn_content_get_followed_tags"("p_lenser_id" "uuid")
  SECURITY DEFINER;

ALTER FUNCTION "public"."fn_lensers_get_suggested"("p_lenser_id" "uuid", "p_limit" integer)
  SECURITY DEFINER;

ALTER FUNCTION "public"."fn_content_get_personal_threads"("p_limit" integer, "p_offset" integer)
  SECURITY DEFINER;

ALTER FUNCTION "public"."fn_content_get_personal_prompts"("p_limit" integer, "p_offset" integer)
  SECURITY DEFINER;
