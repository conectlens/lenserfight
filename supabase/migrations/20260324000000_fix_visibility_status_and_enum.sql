-- Migration: fix_visibility_status_and_enum
-- Purpose:
--   1. Fix critical enum type bug in thread_reply_counts_as_public
--      (compared thread_reply_status against thread_visibility — different types)
--   2. Add status = 'published' guard to all public RLS SELECT policies
--      (threads, prompt_templates, thread_replies)
--   3. Add status = 'published' filter to all public-facing views
--   4. Add status column to owner-facing auth views (vw_auth_prompts, vw_auth_threads)
--   5. Consolidate duplicate prompt SELECT policies
--
-- Owner policies are intentionally NOT modified:
--   threads_owner_select, "Authors can see own prompts", prompt_templates_owner_*
--   These correctly allow owners to see their own content regardless of status.
--
-- This migration supersedes:
--   - phase3_hotfixes A5: content.vw_auth_threads
--   - phase3_hotfixes A6: public.vw_content_threads_public

BEGIN;

-- =============================================================================
-- 1. Fix thread_reply_counts_as_public: wrong enum type comparison
--    Bug:  r.status = 'public'::content.thread_visibility
--          (thread_reply_status vs thread_visibility — different enums)
--    Fix:  r.status = 'published'::content.thread_reply_status
-- =============================================================================
CREATE OR REPLACE FUNCTION "content"."thread_reply_counts_as_public"("r" "content"."thread_replies")
  RETURNS boolean
  LANGUAGE "sql"
  AS $$
    SELECT (r.status = 'published'::content.thread_reply_status) AND r.deleted_at IS NULL;
  $$;

ALTER FUNCTION "content"."thread_reply_counts_as_public"("r" "content"."thread_replies") OWNER TO "postgres";


-- =============================================================================
-- 2. content.vw_prompts_hot_scores — add status = 'published' filter
--    Base: phase2_status_model lines 5738–5750
-- =============================================================================
CREATE OR REPLACE VIEW "content"."vw_prompts_hot_scores" AS
 SELECT "pt"."id",
    "ptt_orig"."language_code" AS "primary_language",
    ("log"(GREATEST((1)::numeric, (((4.0 * (COALESCE("r"."copy_count", (0)::bigint))::numeric) + (2.0 * (COALESCE("r"."like_count", (0)::bigint))::numeric)) + (1.0 * (COALESCE("r"."saved_count", (0)::bigint))::numeric)))) / "pow"(((EXTRACT(epoch FROM ("now"() - "pt"."created_at")) / 3600.0) + (2)::numeric), 1.5)) AS "hot_score"
   FROM (("content"."prompt_templates" "pt"
     LEFT JOIN "content"."prompt_translations" "ptt_orig" ON ((("ptt_orig"."prompt_id" = "pt"."id") AND ("ptt_orig"."is_original" = true))))
     LEFT JOIN ( SELECT "prompt_reactions"."prompt_id",
            "count"(*) FILTER (WHERE ("prompt_reactions"."reaction" = 'copy'::"content"."reaction_enum")) AS "copy_count",
            "count"(*) FILTER (WHERE ("prompt_reactions"."reaction" = 'like'::"content"."reaction_enum")) AS "like_count",
            "count"(*) FILTER (WHERE ("prompt_reactions"."reaction" = 'saved'::"content"."reaction_enum")) AS "saved_count"
           FROM "content"."prompt_reactions"
          GROUP BY "prompt_reactions"."prompt_id") "r" ON (("r"."prompt_id" = "pt"."id")))
  WHERE ("pt"."visibility" = 'public'::"content"."visibility_enum")
    AND ("pt"."status" = 'published'::"content"."content_status");

ALTER TABLE "content"."vw_prompts_hot_scores" OWNER TO "postgres";


-- =============================================================================
-- 3. content.vw_threads_hot_scores — add status = 'published' filter
--    Base: phase2_status_model lines 5768–5778
-- =============================================================================
CREATE OR REPLACE VIEW "content"."vw_threads_hot_scores" AS
 SELECT "t"."id",
    "tt_orig"."language_code" AS "primary_language",
    ("log"(GREATEST((1)::numeric, (((2.0 * (COALESCE("r"."like_count", (0)::bigint))::numeric) + (3.0 * (COALESCE("t"."reply_count", 0))::numeric)) + (0.5 * (COALESCE("t"."view_count", 0))::numeric)))) / "pow"(((EXTRACT(epoch FROM ("now"() - "t"."created_at")) / 3600.0) + (2)::numeric), 1.5)) AS "hot_score"
   FROM (("content"."threads" "t"
     LEFT JOIN "content"."thread_translations" "tt_orig" ON ((("tt_orig"."thread_id" = "t"."id") AND ("tt_orig"."is_original" = true))))
     LEFT JOIN ( SELECT "thread_reactions"."thread_id",
            "count"(*) FILTER (WHERE ("thread_reactions"."reaction" = 'like'::"content"."reaction_enum")) AS "like_count"
           FROM "content"."thread_reactions"
          GROUP BY "thread_reactions"."thread_id") "r" ON (("r"."thread_id" = "t"."id")))
  WHERE ("t"."visibility" = 'public'::"content"."visibility_enum")
    AND ("t"."status" = 'published'::"content"."content_status");

ALTER TABLE "content"."vw_threads_hot_scores" OWNER TO "postgres";


-- =============================================================================
-- 4. content.vw_auth_prompts — add status column
--    Base: phase2_status_model lines 5686–5705
--    Change: insert p.status after p.visibility
--    DROP CASCADE required (PostgreSQL cannot add columns via CREATE OR REPLACE VIEW)
-- =============================================================================
DROP VIEW IF EXISTS "content"."vw_auth_prompts" CASCADE;

CREATE VIEW "content"."vw_auth_prompts" AS
 SELECT "p"."id",
    "p"."lenser_id",
    "p"."visibility",
    "p"."status",
    "p"."created_at",
    "p"."updated_at",
    "pt"."title",
    "pt"."description",
    "pt"."content",
    "pt"."language_code",
    COALESCE(( SELECT "jsonb_object_agg"("agg"."reaction", "agg"."cnt") AS "jsonb_object_agg"
           FROM ( SELECT "pr"."reaction",
                    ("count"(*))::integer AS "cnt"
                   FROM "content"."prompt_reactions" "pr"
                  WHERE ("pr"."prompt_id" = "p"."id")
                  GROUP BY "pr"."reaction") "agg"), '{}'::"jsonb") AS "reaction_totals",
    "jsonb_build_object"('handle', "prof"."handle", 'display_name', "prof"."display_name", 'avatar_url', "prof"."avatar_url") AS "author_profile"
   FROM (("content"."prompt_templates" "p"
     LEFT JOIN "lensers"."profiles" "prof" ON (("p"."lenser_id" = "prof"."id")))
     LEFT JOIN "content"."prompt_translations" "pt" ON ((("p"."id" = "pt"."prompt_id") AND ("pt"."is_original" = true))));

ALTER TABLE "content"."vw_auth_prompts" OWNER TO "postgres";


-- =============================================================================
-- 5. content.vw_auth_threads — add status column
--    Base: phase3_hotfixes A5 (lines 60–82) which added prompt_data
--    Change: insert t.status after t.visibility
--    DROP CASCADE required
-- =============================================================================
DROP VIEW IF EXISTS "content"."vw_auth_threads" CASCADE;

CREATE VIEW "content"."vw_auth_threads" AS
 SELECT "t"."id",
    "t"."lenser_id",
    "t"."visibility",
    "t"."status",
    "t"."view_count",
    "t"."reply_count",
    "t"."thumbnail_url",
    "t"."created_at",
    "t"."updated_at",
    "t"."prompt_data",
    "tt"."title",
    "tt"."content",
    "tt"."language_code",
    COALESCE(( SELECT "jsonb_object_agg"("agg"."reaction", "agg"."cnt")
           FROM ( SELECT "tr"."reaction",
                    "count"(*)::integer AS "cnt"
                   FROM "content"."thread_reactions" "tr"
                  WHERE "tr"."thread_id" = "t"."id"
                  GROUP BY "tr"."reaction") "agg"), '{}'::jsonb) AS "reaction_totals",
    "jsonb_build_object"('handle', "prof"."handle", 'display_name', "prof"."display_name", 'avatar_url', "prof"."avatar_url") AS "author_profile"
   FROM (("content"."threads" "t"
     LEFT JOIN "lensers"."profiles" "prof" ON ("t"."lenser_id" = "prof"."id"))
     LEFT JOIN "content"."thread_translations" "tt" ON (("t"."id" = "tt"."thread_id") AND ("tt"."is_original" = true)));

ALTER TABLE "content"."vw_auth_threads" OWNER TO "postgres";


-- =============================================================================
-- 6. public.vw_content_thread_replies_public — add reply status filter
--    Base: phase2_status_model lines 6144–6163
--    Change: add r.status = 'published' and thread status = 'published' to WHERE
--    DROP CASCADE required
-- =============================================================================
DROP VIEW IF EXISTS "public"."vw_content_thread_replies_public" CASCADE;

CREATE VIEW "public"."vw_content_thread_replies_public" AS
 SELECT "r"."id",
    "r"."thread_id",
    "r"."parent_reply_id",
    "r"."lenser_id",
    "r"."content",
    "r"."content_html",
    COALESCE(( SELECT "jsonb_object_agg"("agg"."reaction", "agg"."cnt") AS "jsonb_object_agg"
           FROM ( SELECT "trr"."reaction",
                    ("count"(*))::integer AS "cnt"
                   FROM "content"."thread_reply_reactions" "trr"
                  WHERE ("trr"."reply_id" = "r"."id")
                  GROUP BY "trr"."reaction") "agg"), '{}'::"jsonb") AS "reaction_totals",
    "r"."created_at",
    "jsonb_build_object"('handle', "prof"."handle", 'display_name', "prof"."display_name", 'avatar_url', "prof"."avatar_url") AS "author_profile"
   FROM (("content"."thread_replies" "r"
     JOIN "content"."threads" "t" ON (("t"."id" = "r"."thread_id")))
     LEFT JOIN "lensers"."profiles" "prof" ON (("r"."lenser_id" = "prof"."id")))
  WHERE ("t"."visibility" = 'public'::"content"."visibility_enum")
    AND ("t"."status" = 'published'::"content"."content_status")
    AND ("r"."status" = 'published'::"content"."thread_reply_status")
    AND ("r"."deleted_at" IS NULL)
  ORDER BY "r"."created_at";

ALTER TABLE "public"."vw_content_thread_replies_public" OWNER TO "postgres";


-- =============================================================================
-- 7. public.vw_content_threads_public — add thread status filter
--    Base: phase3_hotfixes A6 (lines 95–120) which added prompt_data
--    Change: add AND t.status = 'published' to WHERE
--    DROP CASCADE required
-- =============================================================================
DROP VIEW IF EXISTS "public"."vw_content_threads_public" CASCADE;

CREATE VIEW "public"."vw_content_threads_public" AS
 SELECT "t"."id",
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
    "t"."created_at",
    "t"."thumbnail_url",
    "t"."prompt_data",
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


-- =============================================================================
-- 8. public.vw_prompt_templates_public — add prompt status filter
--    Base: phase2_status_model lines 6303–6327
--    Change: add AND pt.status = 'published' to WHERE
--    DROP CASCADE required
-- =============================================================================
DROP VIEW IF EXISTS "public"."vw_prompt_templates_public" CASCADE;

CREATE VIEW "public"."vw_prompt_templates_public" AS
 SELECT "pt"."id",
    "pt"."lenser_id",
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


-- =============================================================================
-- 9. GRANT statements — re-apply after DROP/CREATE
-- =============================================================================
GRANT SELECT ON TABLE "content"."vw_auth_prompts" TO "anon";
GRANT SELECT ON TABLE "content"."vw_auth_prompts" TO "authenticated";
GRANT SELECT ON TABLE "content"."vw_auth_prompts" TO "service_role";

GRANT SELECT ON TABLE "content"."vw_auth_threads" TO "anon";
GRANT SELECT ON TABLE "content"."vw_auth_threads" TO "authenticated";
GRANT SELECT ON TABLE "content"."vw_auth_threads" TO "service_role";

GRANT ALL ON TABLE "public"."vw_content_thread_replies_public" TO "anon";
GRANT ALL ON TABLE "public"."vw_content_thread_replies_public" TO "authenticated";
GRANT ALL ON TABLE "public"."vw_content_thread_replies_public" TO "service_role";

GRANT ALL ON TABLE "public"."vw_content_threads_public" TO "anon";
GRANT ALL ON TABLE "public"."vw_content_threads_public" TO "authenticated";
GRANT ALL ON TABLE "public"."vw_content_threads_public" TO "service_role";

GRANT ALL ON TABLE "public"."vw_prompt_templates_public" TO "anon";
GRANT ALL ON TABLE "public"."vw_prompt_templates_public" TO "authenticated";
GRANT ALL ON TABLE "public"."vw_prompt_templates_public" TO "service_role";


-- =============================================================================
-- 10. RLS policy fixes
--     PostgreSQL has no CREATE OR REPLACE POLICY — must DROP then CREATE.
-- =============================================================================

-- 10a. content.threads — add status = 'published' to public SELECT
DROP POLICY "Public threads are viewable by everyone" ON "content"."threads";

CREATE POLICY "Public threads are viewable by everyone"
  ON "content"."threads"
  FOR SELECT
  USING (
    "visibility" = ANY (ARRAY['public'::"content"."visibility_enum", 'community'::"content"."visibility_enum"])
    AND "status" = 'published'::"content"."content_status"
  );


-- 10b. content.prompt_templates — consolidate two overlapping SELECT policies,
--      add status = 'published' to both.
--      "Public prompts are viewable by everyone" covered public + community.
--      "prompt_templates_select_public" covered public only (subset, redundant).
--      Both lacked a status check. Dropping both; recreating as one unified policy.

DROP POLICY "Public prompts are viewable by everyone" ON "content"."prompt_templates";
DROP POLICY "prompt_templates_select_public"          ON "content"."prompt_templates";

CREATE POLICY "Public prompts are viewable by everyone"
  ON "content"."prompt_templates"
  FOR SELECT
  USING (
    "visibility" = ANY (ARRAY['public'::"content"."visibility_enum", 'community'::"content"."visibility_enum"])
    AND "status" = 'published'::"content"."content_status"
  );

-- Note: "Authors can see own prompts" (lenser_id = get_auth_lenser_id()) is
-- intentionally NOT modified — owners can see their own drafts/archived content.


-- 10c. content.thread_replies — add reply status check + include 'community' threads
DROP POLICY "thread_replies_public_select" ON "content"."thread_replies";

CREATE POLICY "thread_replies_public_select"
  ON "content"."thread_replies"
  FOR SELECT
  TO "authenticated", "anon"
  USING (
    EXISTS (
      SELECT 1
      FROM "content"."threads" "t"
      WHERE "t"."id" = "thread_replies"."thread_id"
        AND "t"."visibility" = ANY (ARRAY[
              'public'::"content"."visibility_enum",
              'community'::"content"."visibility_enum"
            ])
        AND "t"."status" = 'published'::"content"."content_status"
    )
    AND "thread_replies"."status"     = 'published'::"content"."thread_reply_status"
    AND "thread_replies"."deleted_at" IS NULL
  );


COMMIT;

-- =============================================================================
-- ROLLBACK SCRIPT (apply manually if needed — do NOT auto-apply)
-- =============================================================================
-- BEGIN;
--
-- -- Revert function to original (buggy) state
-- CREATE OR REPLACE FUNCTION "content"."thread_reply_counts_as_public"("r" "content"."thread_replies")
--   RETURNS boolean LANGUAGE "sql"
--   AS $$select (r.status = 'public'::content.thread_visibility) and r.deleted_at is null;$$;
--
-- -- Revert RLS: threads
-- DROP POLICY "Public threads are viewable by everyone" ON "content"."threads";
-- CREATE POLICY "Public threads are viewable by everyone" ON "content"."threads"
--   FOR SELECT USING (visibility = ANY (ARRAY['public'::content.visibility_enum,'community'::content.visibility_enum]));
--
-- -- Revert RLS: prompts (restore two overlapping policies as they were)
-- DROP POLICY "Public prompts are viewable by everyone" ON "content"."prompt_templates";
-- CREATE POLICY "Public prompts are viewable by everyone" ON "content"."prompt_templates"
--   FOR SELECT USING (visibility = ANY (ARRAY['public'::content.visibility_enum,'community'::content.visibility_enum]));
-- CREATE POLICY "prompt_templates_select_public" ON "content"."prompt_templates"
--   FOR SELECT TO authenticated, anon USING (visibility = 'public'::content.visibility_enum);
--
-- -- Revert RLS: thread replies
-- DROP POLICY "thread_replies_public_select" ON "content"."thread_replies";
-- CREATE POLICY "thread_replies_public_select" ON "content"."thread_replies"
--   FOR SELECT TO authenticated, anon
--   USING (EXISTS (SELECT 1 FROM content.threads t WHERE t.id = thread_replies.thread_id AND t.visibility = 'public'::content.visibility_enum));
--
-- -- Revert views: re-run phase3_hotfixes A5 and A6 sections,
-- -- and phase2_status_model for vw_auth_prompts, vw_prompt_templates_public,
-- -- vw_content_thread_replies_public, vw_prompts_hot_scores, vw_threads_hot_scores.
--
-- COMMIT;
