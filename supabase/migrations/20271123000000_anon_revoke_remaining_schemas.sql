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
-- 5. Convert anon-readable public views from security_invoker to security
--    definer (owner = postgres).
--
--    The revokes above strip anon SELECT from every non-public schema. Views
--    declared WITH (security_invoker = 'on') run as the calling role, so an
--    anon caller gets "permission denied" when the view touches lensers, xp,
--    content, battles, lenses, or analytics tables.
--
--    Fix: recreate each intentionally-public view WITHOUT security_invoker so
--    it executes as its owner (postgres). The views live in the exposed public
--    schema — their column list is the access-control boundary. Do NOT add
--    per-table anon GRANTs in non-public schemas; that reintroduces GraphQL
--    exposure.
--
--    Views that remain security_invoker (authenticated/admin-only):
--      vw_auth_lenser, vw_battle_funnel, vw_battle_health, vw_feedback_admin,
--      vw_lensers_social_links_private, contact_messages, notifications,
--      v_workflow_run_*
-- -----------------------------------------------------------------------------

-- ── vw_battle_participation ───────────────────────────────────────────────────
CREATE OR REPLACE VIEW "public"."vw_battle_participation" AS
 WITH "weekly_battles" AS (
         SELECT "date_trunc"('week'::"text", "b"."created_at") AS "week",
            "count"(DISTINCT "b"."id") AS "battles_created",
            "count"(DISTINCT
                CASE
                    WHEN ("b"."status" = ANY (ARRAY['closed'::"battles"."battle_status_enum", 'published'::"battles"."battle_status_enum"])) THEN "b"."id"
                    ELSE NULL::"uuid"
                END) AS "battles_completed",
            "count"(DISTINCT "b"."creator_lenser_id") AS "unique_hosts"
           FROM "battles"."battles" "b"
          WHERE ("b"."deleted_at" IS NULL)
          GROUP BY ("date_trunc"('week'::"text", "b"."created_at"))
        ), "weekly_votes" AS (
         SELECT "date_trunc"('week'::"text", "b"."created_at") AS "week",
            "count"(DISTINCT "v"."voter_lenser_id") AS "unique_voters",
            "count"(*) AS "total_votes"
           FROM ("battles"."votes" "v"
             JOIN "battles"."battles" "b" ON (("b"."id" = "v"."battle_id")))
          WHERE ("b"."deleted_at" IS NULL)
          GROUP BY ("date_trunc"('week'::"text", "b"."created_at"))
        )
 SELECT "wb"."week",
    "wb"."battles_created",
    "wb"."battles_completed",
    "wb"."unique_hosts",
    COALESCE("wv"."unique_voters", (0)::bigint) AS "unique_voters",
    COALESCE("wv"."total_votes", (0)::bigint) AS "total_votes"
   FROM ("weekly_battles" "wb"
     LEFT JOIN "weekly_votes" "wv" ON (("wv"."week" = "wb"."week")))
  ORDER BY "wb"."week" DESC;

ALTER VIEW "public"."vw_battle_participation" OWNER TO "postgres";

-- ── vw_battles_public ─────────────────────────────────────────────────────────
CREATE OR REPLACE VIEW "public"."vw_battles_public" AS
 SELECT "b"."id",
    "b"."title",
    "b"."slug",
    "b"."status",
    "b"."creator_lenser_id",
    "b"."total_vote_count",
    "b"."created_at",
    "b"."updated_at",
    "cc"."contender_count"
   FROM ("battles"."battles" "b"
     LEFT JOIN LATERAL ( SELECT "count"(*) AS "contender_count"
           FROM "battles"."contenders" "c"
          WHERE ("c"."battle_id" = "b"."id")) "cc" ON (true))
  WHERE (("b"."status" = ANY (ARRAY['voting'::"battles"."battle_status_enum", 'scoring'::"battles"."battle_status_enum", 'closed'::"battles"."battle_status_enum", 'published'::"battles"."battle_status_enum"])) AND ("b"."deleted_at" IS NULL));

ALTER VIEW "public"."vw_battles_public" OWNER TO "postgres";

-- ── vw_content_tags_public ────────────────────────────────────────────────────
CREATE OR REPLACE VIEW "public"."vw_content_tags_public" AS
 SELECT "t"."id",
    "t"."slug",
    COALESCE("tn"."name", "t"."slug") AS "name",
    "t"."visibility"
   FROM ("content"."tags" "t"
     LEFT JOIN LATERAL ( SELECT "tag_translations"."name"
           FROM "content"."tag_translations"
          WHERE ("tag_translations"."tag_id" = "t"."id")
         LIMIT 1) "tn" ON (true))
  WHERE ("t"."visibility" = 'public'::"content"."tag_visibility_enum");

ALTER VIEW "public"."vw_content_tags_public" OWNER TO "postgres";

-- ── vw_content_thread_replies_public ──────────────────────────────────────────
CREATE OR REPLACE VIEW "public"."vw_content_thread_replies_public" AS
 SELECT "r"."id",
    "r"."thread_id",
    "r"."parent_reply_id",
    "r"."lenser_id",
    "r"."content",
    "r"."content_html",
    "rt"."reaction_totals",
    "r"."created_at",
    "jsonb_build_object"('handle', "prof"."handle", 'display_name', "prof"."display_name", 'avatar_url', "prof"."avatar_url") AS "author_profile"
   FROM ((("content"."thread_replies" "r"
     JOIN "content"."threads" "t" ON (("t"."id" = "r"."thread_id")))
     LEFT JOIN "lensers"."profiles" "prof" ON (("prof"."id" = "r"."lenser_id")))
     LEFT JOIN LATERAL ( SELECT COALESCE("jsonb_object_agg"("x"."reaction", "x"."cnt"), '{}'::"jsonb") AS "reaction_totals"
           FROM ( SELECT "rx"."reaction",
                    ("count"(*))::integer AS "cnt"
                   FROM "content"."reactions" "rx"
                  WHERE (("rx"."entity_type" = 'thread_reply'::"content"."entity_type_enum") AND ("rx"."entity_id" = "r"."id"))
                  GROUP BY "rx"."reaction") "x") "rt" ON (true))
  WHERE (("t"."visibility" = 'public'::"content"."visibility_enum") AND ("t"."status" = 'published'::"content"."content_status") AND ("r"."status" = 'published'::"content"."thread_reply_status") AND ("r"."deleted_at" IS NULL))
  ORDER BY "r"."created_at";

ALTER VIEW "public"."vw_content_thread_replies_public" OWNER TO "postgres";

-- ── vw_content_threads_public ─────────────────────────────────────────────────
CREATE OR REPLACE VIEW "public"."vw_content_threads_public" AS
 SELECT "t"."id",
    "t"."lenser_id",
    "prof"."handle" AS "lenser_handle",
    COALESCE("et"."title", 'Untitled'::"text") AS "title",
    COALESCE("et"."content", ''::"text") AS "content",
    "jsonb_build_object"('handle', "prof"."handle", 'display_name', "prof"."display_name", 'avatar_url', "prof"."avatar_url") AS "author_profile",
    "rt"."reaction_totals",
    "rt"."like_count",
    "t"."reply_count",
    "t"."view_count",
    "t"."created_at",
    "t"."thumbnail_url",
    "t"."lens_data",
    "t"."visibility",
    "tg_agg"."tags"
   FROM (((("content"."threads" "t"
     LEFT JOIN "content"."entity_translations" "et" ON ((("et"."entity_id" = "t"."id") AND ("et"."entity_type" = 'thread'::"content"."entity_type_enum") AND ("et"."is_original" = true))))
     LEFT JOIN "lensers"."profiles" "prof" ON (("prof"."id" = "t"."lenser_id")))
     LEFT JOIN LATERAL ( SELECT COALESCE("jsonb_object_agg"("x"."reaction", "x"."cnt"), '{}'::"jsonb") AS "reaction_totals",
            COALESCE(("sum"(
                CASE
                    WHEN ("x"."reaction" = 'like'::"content"."reaction_enum") THEN "x"."cnt"
                    ELSE 0
                END))::integer, 0) AS "like_count"
           FROM ( SELECT "rx"."reaction",
                    ("count"(*))::integer AS "cnt"
                   FROM "content"."reactions" "rx"
                  WHERE (("rx"."entity_type" = 'thread'::"content"."entity_type_enum") AND ("rx"."entity_id" = "t"."id"))
                  GROUP BY "rx"."reaction") "x") "rt" ON (true))
     LEFT JOIN LATERAL ( SELECT COALESCE("jsonb_agg"("jsonb_build_object"('id', "tg"."id", 'slug', "tg"."slug", 'name', COALESCE("tn"."name", "tg"."slug"))), '[]'::"jsonb") AS "tags"
           FROM (("content"."tag_map" "tm"
             JOIN "content"."tags" "tg" ON (("tg"."id" = "tm"."tag_id")))
             LEFT JOIN LATERAL ( SELECT "tag_translations"."name"
                   FROM "content"."tag_translations"
                  WHERE ("tag_translations"."tag_id" = "tg"."id")
                 LIMIT 1) "tn" ON (true))
          WHERE (("tm"."entity_type" = 'thread'::"content"."entity_type_enum") AND ("tm"."entity_id" = "t"."id"))) "tg_agg" ON (true))
  WHERE (("t"."visibility" = 'public'::"content"."visibility_enum") AND ("t"."status" = 'published'::"content"."content_status"));

ALTER VIEW "public"."vw_content_threads_public" OWNER TO "postgres";

-- ── vw_feedback_user ──────────────────────────────────────────────────────────
-- Own-rows-only; anon gets 0 rows (auth.uid() = NULL). Endpoint stays 200.
CREATE OR REPLACE VIEW "public"."vw_feedback_user" AS
 SELECT "product_tag",
    "page",
    "message",
    "start_date",
    "end_date",
    "status",
    "created_at"
   FROM "analytics"."product_feedback"
  WHERE ("user_id" = "auth"."uid"());

ALTER VIEW "public"."vw_feedback_user" OWNER TO "postgres";

-- ── vw_global_messages ────────────────────────────────────────────────────────
CREATE OR REPLACE VIEW "public"."vw_global_messages" AS
 SELECT "id",
    "battle_id",
    "sender_id",
    "sender_handle",
    "sender_role",
    "body",
    "created_at"
   FROM "battles"."global_messages";

ALTER VIEW "public"."vw_global_messages" OWNER TO "postgres";

-- ── vw_lensers_public_recent ──────────────────────────────────────────────────
CREATE OR REPLACE VIEW "public"."vw_lensers_public_recent" AS
 SELECT "l"."handle",
    "l"."display_name",
    "l"."avatar_url",
    "l"."headline",
    "l"."status",
    "l"."created_at",
    "t"."lenser_id",
    "t"."total_xp",
    "t"."current_level",
    "t"."app_id",
    "lv"."min_total_xp" AS "min_xp",
    "lv"."max_total_xp" AS "max_xp",
    "jl"."join_order",
    "jl"."joined_at",
    "s"."thread_count",
    "s"."lens_count",
    "s"."follower_count",
    "s"."following_count"
   FROM (((("lensers"."profiles" "l"
     LEFT JOIN "xp"."totals" "t" ON (("t"."lenser_id" = "l"."id")))
     LEFT JOIN "xp"."levels" "lv" ON ((("lv"."app_id" = "t"."app_id") AND ("lv"."level" = "t"."current_level"))))
     LEFT JOIN "analytics"."lenser_join_log" "jl" ON (("jl"."lenser_id" = "l"."id")))
     LEFT JOIN "analytics"."lenser_stats" "s" ON (("s"."lenser_id" = "l"."id")))
  WHERE (("l"."status" = 'active'::"lensers"."lenser_status") AND ("l"."deletion_requested_at" IS NULL))
  ORDER BY "l"."created_at" DESC
 LIMIT 5;

ALTER VIEW "public"."vw_lensers_public_recent" OWNER TO "postgres";

-- ── vw_lensers_social_links_public ────────────────────────────────────────────
CREATE OR REPLACE VIEW "public"."vw_lensers_social_links_public" AS
 SELECT "p"."handle",
    "l"."platform",
    "l"."url",
    "l"."label"
   FROM ("lensers"."profiles" "p"
     JOIN "lensers"."social_links" "l" ON (("l"."lenser_id" = "p"."id")))
  WHERE (("p"."status" = 'active'::"lensers"."lenser_status") AND ("p"."deletion_requested_at" IS NULL) AND ("p"."visibility" = 'public'::"lensers"."lenser_visibility"));

ALTER VIEW "public"."vw_lensers_social_links_public" OWNER TO "postgres";

-- ── vw_lenses_public ──────────────────────────────────────────────────────────
CREATE OR REPLACE VIEW "public"."vw_lenses_public" AS
 SELECT "pt"."id",
    "pt"."lenser_id",
    "prof"."handle" AS "lenser_handle",
    "pt"."visibility",
    COALESCE("et"."title", 'Untitled'::"text") AS "title",
    "et"."description",
    COALESCE("et"."content", ''::"text") AS "content",
    "jsonb_build_object"('id', "prof"."id", 'handle', "prof"."handle", 'display_name', "prof"."display_name", 'avatar_url', "prof"."avatar_url") AS "author_profile",
    "rt"."reaction_totals",
    "rt"."copy_count",
    "rt"."like_count",
    "rt"."saved_count",
    "pt"."created_at",
    "tg_agg"."tags"
   FROM (((("lenses"."lenses" "pt"
     LEFT JOIN "content"."entity_translations" "et" ON ((("et"."entity_id" = "pt"."id") AND ("et"."entity_type" = 'lens'::"content"."entity_type_enum") AND ("et"."is_original" = true))))
     LEFT JOIN "lensers"."profiles" "prof" ON (("prof"."id" = "pt"."lenser_id")))
     LEFT JOIN LATERAL ( SELECT COALESCE("jsonb_object_agg"("x"."reaction", "x"."cnt"), '{}'::"jsonb") AS "reaction_totals",
            COALESCE(("sum"(
                CASE
                    WHEN ("x"."reaction" = 'copy'::"content"."reaction_enum") THEN "x"."cnt"
                    ELSE 0
                END))::integer, 0) AS "copy_count",
            COALESCE(("sum"(
                CASE
                    WHEN ("x"."reaction" = 'like'::"content"."reaction_enum") THEN "x"."cnt"
                    ELSE 0
                END))::integer, 0) AS "like_count",
            COALESCE(("sum"(
                CASE
                    WHEN ("x"."reaction" = 'saved'::"content"."reaction_enum") THEN "x"."cnt"
                    ELSE 0
                END))::integer, 0) AS "saved_count"
           FROM ( SELECT "rx"."reaction",
                    ("count"(*))::integer AS "cnt"
                   FROM "content"."reactions" "rx"
                  WHERE (("rx"."entity_type" = 'lens'::"content"."entity_type_enum") AND ("rx"."entity_id" = "pt"."id"))
                  GROUP BY "rx"."reaction") "x") "rt" ON (true))
     LEFT JOIN LATERAL ( SELECT COALESCE("jsonb_agg"("jsonb_build_object"('id', "tg"."id", 'slug', "tg"."slug", 'name', COALESCE("tn"."name", "tg"."slug"))), '[]'::"jsonb") AS "tags"
           FROM (("content"."tag_map" "tm"
             JOIN "content"."tags" "tg" ON (("tg"."id" = "tm"."tag_id")))
             LEFT JOIN LATERAL ( SELECT "tag_translations"."name"
                   FROM "content"."tag_translations"
                  WHERE ("tag_translations"."tag_id" = "tg"."id")
                 LIMIT 1) "tn" ON (true))
          WHERE (("tm"."entity_type" = 'lens'::"content"."entity_type_enum") AND ("tm"."entity_id" = "pt"."id"))) "tg_agg" ON (true))
  WHERE (("pt"."visibility" = 'public'::"content"."visibility_enum") AND ("pt"."status" = 'published'::"content"."content_status"));

ALTER VIEW "public"."vw_lenses_public" OWNER TO "postgres";

-- ── vw_tags_public_extended ───────────────────────────────────────────────────
CREATE OR REPLACE VIEW "public"."vw_tags_public_extended" AS
 SELECT "t"."id",
    "t"."slug",
    COALESCE("tn"."name", "t"."slug") AS "name",
    "t"."created_at",
    'public'::"text" AS "visibility",
    (0)::bigint AS "created_count",
    (0)::bigint AS "viewed_count",
    (0)::bigint AS "reacted_count",
    (0)::bigint AS "total_usage",
    (0)::bigint AS "trend_score"
   FROM ("content"."tags" "t"
     LEFT JOIN LATERAL ( SELECT "tag_translations"."name"
           FROM "content"."tag_translations"
          WHERE ("tag_translations"."tag_id" = "t"."id")
         LIMIT 1) "tn" ON (true))
  WHERE ("t"."visibility" = 'public'::"content"."tag_visibility_enum");

ALTER VIEW "public"."vw_tags_public_extended" OWNER TO "postgres";

-- ── vw_tags_public_stats ──────────────────────────────────────────────────────
CREATE OR REPLACE VIEW "public"."vw_tags_public_stats" AS
 WITH "events_filtered" AS (
         SELECT "e"."tag_id",
            "e"."activity_type",
            ("e"."occurred_at")::"date" AS "activity_date"
           FROM ((("analytics"."tag_activity_events" "e"
             JOIN "content"."tags" "t_1" ON ((("t_1"."id" = "e"."tag_id") AND ("t_1"."visibility" = 'public'::"content"."tag_visibility_enum"))))
             LEFT JOIN "lenses"."lenses" "p" ON ((("e"."entity_type" = 'lens'::"content"."entity_type_enum") AND ("e"."entity_id" = "p"."id"))))
             LEFT JOIN "content"."threads" "th" ON ((("e"."entity_type" = 'thread'::"content"."entity_type_enum") AND ("e"."entity_id" = "th"."id"))))
          WHERE ((("e"."entity_type" = 'lens'::"content"."entity_type_enum") AND ("p"."visibility" = 'public'::"content"."visibility_enum")) OR (("e"."entity_type" = 'thread'::"content"."entity_type_enum") AND ("th"."visibility" = 'public'::"content"."visibility_enum")))
        ), "lifetime" AS (
         SELECT "events_filtered"."tag_id",
            "count"(*) FILTER (WHERE ("events_filtered"."activity_type" = 'created'::"text")) AS "created_count",
            "count"(*) FILTER (WHERE ("events_filtered"."activity_type" = 'viewed'::"text")) AS "viewed_count",
            "count"(*) FILTER (WHERE ("events_filtered"."activity_type" = 'reacted'::"text")) AS "reacted_count"
           FROM "events_filtered"
          GROUP BY "events_filtered"."tag_id"
        ), "recent_7d" AS (
         SELECT "events_filtered"."tag_id",
            "sum"(((
                CASE
                    WHEN ("events_filtered"."activity_type" = 'created'::"text") THEN 1
                    ELSE 0
                END +
                CASE
                    WHEN ("events_filtered"."activity_type" = 'viewed'::"text") THEN 2
                    ELSE 0
                END) +
                CASE
                    WHEN ("events_filtered"."activity_type" = 'reacted'::"text") THEN 3
                    ELSE 0
                END)) AS "trend_score_7d"
           FROM "events_filtered"
          WHERE ("events_filtered"."activity_date" >= (CURRENT_DATE - '7 days'::interval))
          GROUP BY "events_filtered"."tag_id"
        )
 SELECT "t"."id",
    "t"."slug",
    COALESCE("tn"."name", "t"."slug") AS "name",
    "t"."created_at",
    'public'::"text" AS "visibility",
    COALESCE("l"."created_count", (0)::bigint) AS "created_count",
    COALESCE("l"."viewed_count", (0)::bigint) AS "viewed_count",
    COALESCE("l"."reacted_count", (0)::bigint) AS "reacted_count",
    ((COALESCE("l"."created_count", (0)::bigint) + COALESCE("l"."viewed_count", (0)::bigint)) + COALESCE("l"."reacted_count", (0)::bigint)) AS "total_usage",
    COALESCE("r"."trend_score_7d", (0)::bigint) AS "trend_score_7d"
   FROM ((("content"."tags" "t"
     LEFT JOIN LATERAL ( SELECT "tag_translations"."name"
           FROM "content"."tag_translations"
          WHERE ("tag_translations"."tag_id" = "t"."id")
         LIMIT 1) "tn" ON (true))
     LEFT JOIN "lifetime" "l" ON (("l"."tag_id" = "t"."id")))
     LEFT JOIN "recent_7d" "r" ON (("r"."tag_id" = "t"."id")))
  WHERE ("t"."visibility" = 'public'::"content"."tag_visibility_enum");

ALTER VIEW "public"."vw_tags_public_stats" OWNER TO "postgres";

-- ── vw_xp_leaderboard_global ──────────────────────────────────────────────────
CREATE OR REPLACE VIEW "public"."vw_xp_leaderboard_global" AS
 WITH "ranked" AS (
         SELECT "t"."app_id",
            "t"."lenser_id",
            "t"."total_xp",
            "t"."current_level",
            "rank"() OVER (PARTITION BY "t"."app_id" ORDER BY "t"."total_xp" DESC, "t"."lenser_id") AS "rank"
           FROM "xp"."totals" "t"
        )
 SELECT "r"."app_id",
    "r"."rank",
    "r"."lenser_id",
    "r"."total_xp",
    "r"."current_level",
    "jsonb_build_object"('display_name', "l"."display_name", 'handle', "l"."handle", 'avatar_url', "l"."avatar_url") AS "user"
   FROM ("ranked" "r"
     JOIN "lensers"."profiles" "l" ON (("l"."id" = "r"."lenser_id")))
  WHERE ("r"."rank" <= 100);

ALTER VIEW "public"."vw_xp_leaderboard_global" OWNER TO "postgres";
