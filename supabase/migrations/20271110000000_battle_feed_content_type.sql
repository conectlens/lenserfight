-- =============================================================================
-- Migration: expose content_type in battle feed view + RPC
-- Phase: demo-readiness — makes multi-modal battle categories visible in cards
-- =============================================================================

-- 1. Recreate v_battle_feed_item with content_type added.
--    DROP + CREATE required: Postgres forbids CREATE OR REPLACE VIEW when column
--    order changes (existing view had content_type absent; adding it mid-list
--    triggers "cannot change name of view column" error).
--    fn_get_battles_feed is recreated below so the CASCADE drop is safe.
DROP VIEW IF EXISTS "battles"."v_battle_feed_item" CASCADE;

CREATE VIEW "battles"."v_battle_feed_item" AS
  SELECT
    "b"."id",
    "b"."slug",
    "b"."title",
    "b"."status",
    "b"."battle_type",
    "b"."voter_eligibility",
    "b"."total_vote_count",
    "b"."published_at",
    "b"."voting_opens_at",
    "b"."voting_closes_at",
    "b"."winner_contender_id",
    "b"."created_at",
    "b"."content_type",
    "ca"."id"              AS "contender_a_id",
    "ca"."display_name"    AS "contender_a_name",
    "ca"."contender_type"  AS "contender_a_type",
    "cb"."id"              AS "contender_b_id",
    "cb"."display_name"    AS "contender_b_name",
    "cb"."contender_type"  AS "contender_b_type",
    CASE
      WHEN "b"."winner_contender_id" = "ca"."id" THEN 'A'::"text"
      WHEN "b"."winner_contender_id" = "cb"."id" THEN 'B'::"text"
      ELSE NULL::"text"
    END AS "winner_slot"
  FROM (
    ("battles"."battles" "b"
      LEFT JOIN "battles"."contenders" "ca"
        ON "ca"."battle_id" = "b"."id" AND "ca"."slot" = 'A'::"bpchar" AND "ca"."contender_status" = 'active'::"text"
    )
    LEFT JOIN "battles"."contenders" "cb"
      ON "cb"."battle_id" = "b"."id" AND "cb"."slot" = 'B'::"bpchar" AND "cb"."contender_status" = 'active'::"text"
  )
  WHERE
    "b"."deleted_at" IS NULL
    AND "b"."status" = ANY (ARRAY[
      'voting'::"battles"."battle_status_enum",
      'scoring'::"battles"."battle_status_enum",
      'closed'::"battles"."battle_status_enum",
      'published'::"battles"."battle_status_enum",
      'archived'::"battles"."battle_status_enum"
    ]);

COMMENT ON VIEW "battles"."v_battle_feed_item" IS
  'Denormalized battle card for BattlesFeedPage. Used by fn_get_battles_feed. '
  'Includes contender names, winner_slot, and content_type for media-type badges. '
  'Only exposes post-draft statuses (voting, scoring, closed, published, archived).';

-- Re-grant so RLS is unaffected after replace.
GRANT SELECT ON TABLE "battles"."v_battle_feed_item" TO "anon";
GRANT SELECT, INSERT, DELETE, UPDATE ON TABLE "battles"."v_battle_feed_item" TO "authenticated";
GRANT ALL ON TABLE "battles"."v_battle_feed_item" TO "service_role";


-- 2. Recreate fn_get_battles_feed with content_type added to TABLE return.
--    DROP required: Postgres forbids changing a function's return type in place.
DROP FUNCTION IF EXISTS "public"."fn_get_battles_feed"(
  "text", "text", integer, timestamp with time zone
);

CREATE FUNCTION "public"."fn_get_battles_feed"(
  "p_status"      "text"               DEFAULT NULL::"text",
  "p_battle_type" "text"               DEFAULT NULL::"text",
  "p_limit"       integer              DEFAULT 20,
  "p_cursor"      timestamp with time zone DEFAULT NULL::timestamp with time zone
)
RETURNS TABLE (
  "id"               "uuid",
  "slug"             "text",
  "title"            "text",
  "status"           "text",
  "published_at"     timestamp with time zone,
  "battle_type"      "text",
  "voter_eligibility" "text",
  "total_vote_count" integer,
  "voting_opens_at"  timestamp with time zone,
  "voting_closes_at" timestamp with time zone,
  "contender_a_id"   "uuid",
  "contender_a_name" "text",
  "contender_a_type" "text",
  "contender_b_id"   "uuid",
  "contender_b_name" "text",
  "contender_b_type" "text",
  "winner_slot"      "text",
  "content_type"     "text"
)
LANGUAGE "sql" STABLE SECURITY DEFINER
SET "search_path" TO 'battles', 'public'
AS $$
  SELECT
    v.id,
    v.slug,
    v.title,
    v.status::text,
    v.published_at,
    v.battle_type::text,
    v.voter_eligibility::text,
    v.total_vote_count,
    v.voting_opens_at,
    v.voting_closes_at,
    v.contender_a_id,
    v.contender_a_name,
    v.contender_a_type::text,
    v.contender_b_id,
    v.contender_b_name,
    v.contender_b_type::text,
    v.winner_slot,
    v.content_type
  FROM battles.v_battle_feed_item v
  WHERE
    -- Defence-in-depth: always exclude draft/open regardless of p_status parameter
    v.status::text IN ('voting', 'scoring', 'closed', 'published', 'archived')
    AND (p_status      IS NULL OR v.status::text      = p_status)
    AND (p_battle_type IS NULL OR v.battle_type::text = p_battle_type)
    AND (p_cursor      IS NULL OR v.published_at      < p_cursor)
  ORDER BY v.published_at DESC NULLS LAST
  LIMIT LEAST(COALESCE(p_limit, 20), 100);
$$;

ALTER FUNCTION "public"."fn_get_battles_feed"(
  "text", "text", integer, timestamp with time zone
) OWNER TO "postgres";

COMMENT ON FUNCTION "public"."fn_get_battles_feed"(
  "text", "text", integer, timestamp with time zone
) IS
  'Paginated battle feed. Filters by status and battle_type (both optional text). '
  'Always excludes draft/open battles. Keyset pagination via p_cursor (published_at of last item). '
  'LIMIT capped at 100. Returns content_type for client-side category badges. SECURITY DEFINER.';

GRANT EXECUTE ON FUNCTION "public"."fn_get_battles_feed"(
  "text", "text", integer, timestamp with time zone
) TO "anon";
GRANT EXECUTE ON FUNCTION "public"."fn_get_battles_feed"(
  "text", "text", integer, timestamp with time zone
) TO "authenticated";
GRANT EXECUTE ON FUNCTION "public"."fn_get_battles_feed"(
  "text", "text", integer, timestamp with time zone
) TO "service_role";
