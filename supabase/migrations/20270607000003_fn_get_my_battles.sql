-- Two compounding bugs meant a battle creator could never see their own
-- non-published battles anywhere in the product:
--
-- 1. fn_get_battles_feed (and the view it queries, v_battle_feed_item) is a
--    PUBLIC feed and deliberately excludes draft/open/executing battles for
--    everyone — correct for that use case, but there was no creator-scoped
--    alternative anywhere: no RPC, no repository method, no UI.
-- 2. The one place that looked like it should fill this gap — the Account
--    Dashboard's "Recent Battles" widget (useAccountSummary.ts) — called
--    "fn_battles_feed", which has never existed (only fn_get_battles_feed
--    does). The call failed and was silently swallowed by a .catch(() =>
--    ({ data: null, error: null })), so the widget always rendered empty,
--    regardless of publish status.
--
-- fn_get_my_battles fixes both: a creator-scoped RPC returning the caller's
-- own battles across every status (including draft), which the web app's
-- useAccountSummary hook now calls instead of the nonexistent function.

CREATE OR REPLACE FUNCTION "public"."fn_get_my_battles"(
  "p_status" "text" DEFAULT NULL::"text",
  "p_limit" integer DEFAULT 20,
  "p_cursor" timestamp with time zone DEFAULT NULL::timestamp with time zone
) RETURNS TABLE(
  "id" "uuid", "slug" "text", "title" "text", "status" "text",
  "battle_type" "text", "voter_eligibility" "text", "total_vote_count" integer,
  "created_at" timestamp with time zone, "published_at" timestamp with time zone,
  "voting_opens_at" timestamp with time zone, "voting_closes_at" timestamp with time zone,
  "contender_a_id" "uuid", "contender_a_name" "text", "contender_a_type" "text",
  "contender_b_id" "uuid", "contender_b_name" "text", "contender_b_type" "text",
  "winner_slot" "text", "content_type" "text"
)
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'battles', 'public', 'lensers'
    AS $$
  SELECT
    b.id, b.slug, b.title, b.status::text,
    b.battle_type::text, b.voter_eligibility::text, b.total_vote_count,
    b.created_at, b.published_at, b.voting_opens_at, b.voting_closes_at,
    ca.id, ca.display_name, ca.contender_type::text,
    cb.id, cb.display_name, cb.contender_type::text,
    CASE
      WHEN b.winner_contender_id = ca.id THEN 'A'
      WHEN b.winner_contender_id = cb.id THEN 'B'
      ELSE NULL
    END,
    b.content_type
  FROM battles.battles b
  LEFT JOIN battles.contenders ca
    ON ca.battle_id = b.id AND ca.slot = 'A' AND ca.contender_status = 'active'
  LEFT JOIN battles.contenders cb
    ON cb.battle_id = b.id AND cb.slot = 'B' AND cb.contender_status = 'active'
  WHERE b.deleted_at IS NULL
    AND b.creator_lenser_id = lensers.get_auth_lenser_id()
    AND (p_status IS NULL OR b.status::text = p_status)
    AND (p_cursor IS NULL OR b.created_at < p_cursor)
  ORDER BY b.created_at DESC
  LIMIT LEAST(COALESCE(p_limit, 20), 100);
$$;

COMMENT ON FUNCTION "public"."fn_get_my_battles"("text", integer, timestamp with time zone)
  IS 'Creator-scoped battle listing — every status including draft/open/executing, unlike fn_get_battles_feed which is public-feed-only. Keyset pagination via p_cursor (created_at of last item).';

GRANT ALL ON FUNCTION "public"."fn_get_my_battles"("text", integer, timestamp with time zone) TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_get_my_battles"("text", integer, timestamp with time zone) TO "service_role";
