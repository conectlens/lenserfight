-- Migration: expose_missing_view_columns
-- Purpose:
--   Fix vw_content_threads_public and vw_prompt_templates_public to expose columns
--   required by repository layers:
--   1. vw_prompt_templates_public: add visibility column
--   2. vw_content_threads_public: add lenser_id column
--
-- These columns are needed for filtering and ownership checks in application code.
-- RLS + view definition already enforce security; exposing these columns does not
-- increase attack surface—they are sourced from the underlying tables which RLS guards.

BEGIN;

-- =============================================================================
-- 1. vw_prompt_templates_public — add visibility column
--    Reason: repositories query the listPromptSelect which includes visibility
--            for client-side conditional rendering and ownership checks.
-- =============================================================================
DROP VIEW IF EXISTS "public"."vw_prompt_templates_public" CASCADE;

CREATE VIEW "public"."vw_prompt_templates_public" AS
 SELECT "pt"."id",
    "pt"."lenser_id",
    "pt"."visibility",
    COALESCE("ptr"."title", 'Untitled'::"text") AS "title",
    "ptr"."description",
    COALESCE("ptr"."content", ''::"text") AS "content",
    "jsonb_build_object"('id', "prof"."id", 'handle', "prof"."handle", 'display_name', "prof"."display_name", 'avatar_url', "prof"."avatar_url") AS "author_profile",
    COALESCE(( SELECT "jsonb_object_agg"("agg"."reaction", "agg"."cnt") AS "jsonb_object_agg"
           FROM ( SELECT "pr"."reaction",
                    ("count"(*))::integer AS "cnt"
                   FROM "content"."prompt_reactions" "pr"
                  WHERE ("pr"."prompt_id" = "pt"."id")
                  GROUP BY "pr"."reaction") "agg"), '{}'::"jsonb") AS "reaction_totals",
    "pt"."created_at",
    COALESCE(( SELECT "jsonb_agg"("jsonb_build_object"('id', "tg"."id", 'slug', "tg"."slug", 'name', COALESCE(( SELECT "tag_translations"."name"
                   FROM "content"."tag_translations"
                  WHERE "tag_translations"."tag_id" = "tg"."id"
                 LIMIT 1), "tg"."slug")))
           FROM ("content"."tag_map" "tm"
             JOIN "content"."tags" "tg" ON (("tg"."id" = "tm"."tag_id")))
          WHERE (("tm"."entity_type" = 'prompt_template'::"content"."entity_type_enum") AND ("tm"."entity_id" = "pt"."id"))), '[]'::"jsonb") AS "tags"
   FROM (("content"."prompt_templates" "pt"
     LEFT JOIN "content"."prompt_translations" "ptr" ON ((("pt"."id" = "ptr"."prompt_id") AND ("ptr"."is_original" = true))))
     LEFT JOIN "lensers"."profiles" "prof" ON (("pt"."lenser_id" = "prof"."id")))
  WHERE ("pt"."visibility" = 'public'::"content"."visibility_enum")
    AND ("pt"."status" = 'published'::"content"."content_status");

ALTER TABLE "public"."vw_prompt_templates_public" OWNER TO "postgres";

GRANT SELECT ON TABLE "public"."vw_prompt_templates_public" TO "anon";
GRANT SELECT ON TABLE "public"."vw_prompt_templates_public" TO "authenticated";
GRANT SELECT ON TABLE "public"."vw_prompt_templates_public" TO "service_role";


-- =============================================================================
-- 2. vw_content_threads_public — add lenser_id column
--    Reason: repositories query listThreadSelect which includes lenser_id
--            for ownership checks and profile association.
-- =============================================================================
DROP VIEW IF EXISTS "public"."vw_content_threads_public" CASCADE;

CREATE VIEW "public"."vw_content_threads_public" AS
 SELECT "t"."id",
    "t"."lenser_id",
    COALESCE("tt"."title", 'Untitled'::"text") AS "title",
    COALESCE("tt"."content", ''::"text") AS "content",
    "jsonb_build_object"('handle', "prof"."handle", 'display_name', "prof"."display_name", 'avatar_url', "prof"."avatar_url") AS "author_profile",
    COALESCE(( SELECT "jsonb_object_agg"("agg"."reaction", "agg"."cnt")
           FROM ( SELECT "tr"."reaction",
                    "count"(*)::integer AS "cnt"
                   FROM "content"."thread_reactions" "tr"
                  WHERE "tr"."thread_id" = "t"."id"
                  GROUP BY "tr"."reaction") "agg"), '{}'::jsonb) AS "reaction_totals",
    "t"."reply_count",
    "t"."view_count",
    "t"."created_at",
    "t"."thumbnail_url",
    "t"."prompt_data",
    "t"."visibility",
    COALESCE(( SELECT "jsonb_agg"("jsonb_build_object"('id', "tg"."id", 'slug', "tg"."slug", 'name', COALESCE(( SELECT "tag_translations"."name"
                   FROM "content"."tag_translations"
                  WHERE "tag_translations"."tag_id" = "tg"."id"
                 LIMIT 1), "tg"."slug")))
           FROM ("content"."tag_map" "tm"
             JOIN "content"."tags" "tg" ON ("tg"."id" = "tm"."tag_id"))
          WHERE "tm"."entity_type" = 'thread'::"content"."entity_type_enum" AND "tm"."entity_id" = "t"."id"), '[]'::jsonb) AS "tags"
   FROM (("content"."threads" "t"
     LEFT JOIN "content"."thread_translations" "tt" ON (("t"."id" = "tt"."thread_id") AND ("tt"."is_original" = true)))
     LEFT JOIN "lensers"."profiles" "prof" ON ("t"."lenser_id" = "prof"."id"))
  WHERE ("t"."visibility" = 'public'::"content"."visibility_enum")
    AND ("t"."status" = 'published'::"content"."content_status");

ALTER TABLE "public"."vw_content_threads_public" OWNER TO "postgres";

GRANT SELECT ON TABLE "public"."vw_content_threads_public" TO "anon";
GRANT SELECT ON TABLE "public"."vw_content_threads_public" TO "authenticated";
GRANT SELECT ON TABLE "public"."vw_content_threads_public" TO "service_role";

COMMIT;
