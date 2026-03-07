-- Migration: V5 - View Layer & Triggers Update
-- Description: Drops old `jsonb` denormalization columns, deletes complex triggers, and creates secure enriched views for frontend consumption.

-- 1. Drop old explicit functions and triggers
DO $$
BEGIN
  -- We don't need reactions triggers anymore, dropping the functions
  DROP FUNCTION IF EXISTS "content"."adjust_reaction_totals" CASCADE;
  DROP FUNCTION IF EXISTS "content"."reactions_after_delete_trigger" CASCADE;
  DROP FUNCTION IF EXISTS "content"."reactions_after_insert_trigger" CASCADE;
  DROP FUNCTION IF EXISTS "content"."reactions_after_update_trigger" CASCADE;
  DROP FUNCTION IF EXISTS "content"."refresh_reaction_totals" CASCADE;
  DROP FUNCTION IF EXISTS "content"."prevent_protected_prompt_fields" CASCADE;

  -- Dropping author profile triggers
  DROP FUNCTION IF EXISTS "content"."set_prompt_author_profile" CASCADE;
  DROP FUNCTION IF EXISTS "content"."set_thread_author_profile" CASCADE;
  DROP FUNCTION IF EXISTS "content"."set_thread_reply_author_profile" CASCADE;
END $$;

-- 2. Drop old JSON columns safely
DO $$
BEGIN
  -- From prompt_templates
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'content' AND table_name = 'prompt_templates' AND column_name = 'reaction_totals') THEN
    ALTER TABLE "content"."prompt_templates" DROP COLUMN "reaction_totals" CASCADE;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'content' AND table_name = 'prompt_templates' AND column_name = 'author_profile') THEN
    ALTER TABLE "content"."prompt_templates" DROP COLUMN "author_profile" CASCADE;
  END IF;

  -- From threads
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'content' AND table_name = 'threads' AND column_name = 'reaction_totals') THEN
    ALTER TABLE "content"."threads" DROP COLUMN "reaction_totals" CASCADE;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'content' AND table_name = 'threads' AND column_name = 'author_profile') THEN
    ALTER TABLE "content"."threads" DROP COLUMN "author_profile" CASCADE;
  END IF;

  -- From thread_replies
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'content' AND table_name = 'thread_replies' AND column_name = 'reaction_totals') THEN
    ALTER TABLE "content"."thread_replies" DROP COLUMN "reaction_totals" CASCADE;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'content' AND table_name = 'thread_replies' AND column_name = 'author_profile') THEN
    ALTER TABLE "content"."thread_replies" DROP COLUMN "author_profile" CASCADE;
  END IF;
END $$;

-- 3. Create enriched views for the frontend to consume (Joining default language if needed)
-- Note: Supabase can query these directly via PostgREST

CREATE OR REPLACE VIEW "content"."vw_auth_prompts" AS
SELECT 
    p.id,
    p.lenser_id,
    p.visibility,
    p.created_at,
    p.updated_at,
    -- Translation join (falling back to original or first available)
    pt.title,
    pt.description,
    pt.content,
    pt.language_id,
    -- Dynamic Reaction Aggregation
    COALESCE(
        (SELECT jsonb_object_agg(reaction, cnt) 
         FROM (SELECT reaction, count(*)::int as cnt FROM "content"."prompt_reactions" pr WHERE pr.prompt_id = p.id GROUP BY reaction) as agg),
        '{}'::jsonb
    ) as reaction_totals,
    -- Dynamic Author Profile Aggregation
    jsonb_build_object(
        'handle', prof.handle,
        'display_name', prof.display_name,
        'avatar_url', prof.avatar_url
    ) as author_profile
FROM "content"."prompt_templates" p
LEFT JOIN "lensers"."profiles" prof ON p.lenser_id = prof.id
LEFT JOIN "content"."prompt_translations" pt ON p.id = pt.prompt_id AND pt.is_original = true; -- Simplified to show the original initially

GRANT SELECT ON "content"."vw_auth_prompts" TO anon, authenticated, service_role;


CREATE OR REPLACE VIEW "content"."vw_auth_threads" AS
SELECT 
    t.id,
    t.lenser_id,
    t.visibility,
    t.view_count,
    t.reply_count,
    t.thumbnail_url,
    t.created_at,
    t.updated_at,
    -- Translation
    tt.title,
    tt.content,
    tt.language_id,
    -- Reactions
    COALESCE(
        (SELECT jsonb_object_agg(reaction, cnt) 
         FROM (SELECT reaction, count(*)::int as cnt FROM "content"."thread_reactions" tr WHERE tr.thread_id = t.id GROUP BY reaction) as agg),
        '{}'::jsonb
    ) as reaction_totals,
    -- Profile
    jsonb_build_object(
        'handle', prof.handle,
        'display_name', prof.display_name,
        'avatar_url', prof.avatar_url
    ) as author_profile
FROM "content"."threads" t
LEFT JOIN "lensers"."profiles" prof ON t.lenser_id = prof.id
LEFT JOIN "content"."thread_translations" tt ON t.id = tt.thread_id AND tt.is_original = true;

GRANT SELECT ON "content"."vw_auth_threads" TO anon, authenticated, service_role;

-- 4. Recreate dependent views destroyed sequentially during column drops in V3
-- Recreate vw_content_tags_public
CREATE OR REPLACE VIEW "public"."vw_content_tags_public" AS
 SELECT "t"."id",
    "t"."slug",
    COALESCE((SELECT name FROM "content"."tag_translations" WHERE tag_id = "t"."id" LIMIT 1), "t"."slug") AS "name",
    "t"."visibility"
   FROM "content"."tags" "t"
  WHERE ("t"."visibility" = 'public'::"content"."tag_visibility_enum");

GRANT SELECT ON "public"."vw_content_tags_public" TO anon, authenticated, service_role;

-- Recreate vw_content_threads_public
CREATE OR REPLACE VIEW "public"."vw_content_threads_public" AS
 SELECT "t"."id",
    COALESCE("tt"."title", 'Untitled') AS "title",
    COALESCE("tt"."content", '') AS "content",
    "jsonb_build_object"('handle', "prof"."handle", 'display_name', "prof"."display_name", 'avatar_url', "prof"."avatar_url") AS "author_profile",
    COALESCE(
        (SELECT jsonb_object_agg(reaction, cnt) 
         FROM (SELECT reaction, count(*)::int as cnt FROM "content"."thread_reactions" tr WHERE tr.thread_id = t.id GROUP BY reaction) as agg),
        '{}'::jsonb
    ) as reaction_totals,
    "t"."reply_count",
    "t"."created_at",
    "t"."thumbnail_url",
    COALESCE(
       (SELECT jsonb_agg(jsonb_build_object('slug', "tg"."slug", 'name', COALESCE((SELECT name FROM content.tag_translations WHERE tag_id = tg.id LIMIT 1), tg.slug)))
        FROM content.tag_map tm 
        JOIN content.tags tg ON tg.id = tm.tag_id
        WHERE tm.entity_type = 'thread' AND tm.entity_id = t.id), '[]'::jsonb
    ) AS "tags"
   FROM "content"."threads" "t"
   LEFT JOIN "content"."thread_translations" "tt" ON "t"."id" = "tt"."thread_id" AND "tt"."is_original" = true
   LEFT JOIN "lensers"."profiles" "prof" ON "t"."lenser_id" = "prof"."id"
  WHERE ("t"."visibility" = 'public'::"content"."visibility_enum");

GRANT SELECT ON "public"."vw_content_threads_public" TO anon, authenticated, service_role;

-- Recreate vw_content_thread_replies_public
CREATE OR REPLACE VIEW "public"."vw_content_thread_replies_public" AS
 SELECT "r"."id",
    "r"."thread_id",
    "r"."parent_reply_id",
    "r"."lenser_id",
    "r"."content",
    "r"."content_html",
    COALESCE(
        (SELECT jsonb_object_agg(reaction, cnt) 
         FROM (SELECT reaction, count(*)::int as cnt FROM "content"."thread_reply_reactions" trr WHERE trr.reply_id = r.id GROUP BY reaction) as agg),
        '{}'::jsonb
    ) as reaction_totals,
    "r"."created_at",
    "jsonb_build_object"('handle', "prof"."handle", 'display_name', "prof"."display_name", 'avatar_url', "prof"."avatar_url") AS "author_profile"
   FROM ("content"."thread_replies" "r"
     JOIN "content"."threads" "t" ON (("t"."id" = "r"."thread_id")))
   LEFT JOIN "lensers"."profiles" "prof" ON "r"."lenser_id" = "prof"."id"
  WHERE (("t"."visibility" = 'public'::"content"."visibility_enum") AND ("r"."deleted_at" IS NULL))
  ORDER BY "r"."created_at";

GRANT SELECT ON "public"."vw_content_thread_replies_public" TO anon, authenticated, service_role;

-- Recreate vw_prompt_templates_public
CREATE OR REPLACE VIEW "public"."vw_prompt_templates_public" AS
 SELECT "pt"."id",
    COALESCE("ptr"."title", 'Untitled') AS "title",
    "ptr"."description",
    COALESCE("ptr"."content", '') AS "content",
    "jsonb_build_object"('handle', "prof"."handle", 'display_name', "prof"."display_name", 'avatar_url', "prof"."avatar_url") AS "author_profile",
    COALESCE(
        (SELECT jsonb_object_agg(reaction, cnt) 
         FROM (SELECT reaction, count(*)::int as cnt FROM "content"."prompt_reactions" pr WHERE pr.prompt_id = pt.id GROUP BY reaction) as agg),
        '{}'::jsonb
    ) as reaction_totals,
    "pt"."created_at",
    COALESCE(
       (SELECT jsonb_agg(jsonb_build_object('slug', "tg"."slug", 'name', COALESCE((SELECT name FROM content.tag_translations WHERE tag_id = tg.id LIMIT 1), tg.slug)))
        FROM content.tag_map tm 
        JOIN content.tags tg ON tg.id = tm.tag_id
        WHERE tm.entity_type = 'prompt_template' AND tm.entity_id = pt.id), '[]'::jsonb
    ) AS "tags"
   FROM "content"."prompt_templates" "pt"
   LEFT JOIN "content"."prompt_translations" "ptr" ON "pt"."id" = "ptr"."prompt_id" AND "ptr"."is_original" = true
   LEFT JOIN "lensers"."profiles" "prof" ON "pt"."lenser_id" = "prof"."id"
  WHERE ("pt"."visibility" = 'public'::"content"."visibility_enum");

GRANT SELECT ON "public"."vw_prompt_templates_public" TO anon, authenticated, service_role;

-- Recreate vw_tags_public_extended
CREATE OR REPLACE VIEW "public"."vw_tags_public_extended" AS
 WITH "daily" AS (
         SELECT "tag_activity_daily"."tag_id",
            "sum"("tag_activity_daily"."created_count") AS "created_total",
            "sum"("tag_activity_daily"."viewed_count") AS "viewed_total",
            "sum"("tag_activity_daily"."reacted_count") AS "reacted_total"
           FROM "analytics"."tag_activity_daily"
          GROUP BY "tag_activity_daily"."tag_id"
        ), "recent_7d" AS (
         SELECT "tag_activity_daily"."tag_id",
            "sum"(((("tag_activity_daily"."created_count" * 1) + ("tag_activity_daily"."viewed_count" * 2)) + ("tag_activity_daily"."reacted_count" * 3))) AS "trend_score_7d"
           FROM "analytics"."tag_activity_daily"
          WHERE ("tag_activity_daily"."activity_date" >= (CURRENT_DATE - '7 days'::interval))
          GROUP BY "tag_activity_daily"."tag_id"
        )
 SELECT "t"."id",
    "t"."slug",
    COALESCE((SELECT name FROM "content"."tag_translations" WHERE tag_id = "t"."id" LIMIT 1), "t"."slug") AS "name",
    "t"."created_at",
    'public'::"text" AS "visibility",
    COALESCE("d"."created_total", (0)::bigint) AS "created_count",
    COALESCE("d"."viewed_total", (0)::bigint) AS "viewed_count",
    COALESCE("d"."reacted_total", (0)::bigint) AS "reacted_count",
    ((COALESCE("d"."created_total", (0)::bigint) + COALESCE("d"."viewed_total", (0)::bigint)) + COALESCE("d"."reacted_total", (0)::bigint)) AS "total_usage",
    COALESCE("r"."trend_score_7d", (0)::bigint) AS "trend_score"
   FROM (("content"."tags" "t"
     LEFT JOIN "daily" "d" ON (("d"."tag_id" = "t"."id")))
     LEFT JOIN "recent_7d" "r" ON (("r"."tag_id" = "t"."id")))
  WHERE ("t"."visibility" = 'public'::"content"."tag_visibility_enum");

GRANT SELECT ON "public"."vw_tags_public_extended" TO anon, authenticated, service_role;

-- Recreate vw_tags_public_stats
CREATE OR REPLACE VIEW "public"."vw_tags_public_stats" AS
 WITH "events_filtered" AS (
         SELECT "e"."tag_id",
            "e"."activity_type",
            ("e"."occurred_at")::"date" AS "activity_date"
           FROM ((("analytics"."tag_activity_events" "e"
             JOIN "content"."tags" "t_1" ON ((("t_1"."id" = "e"."tag_id") AND ("t_1"."visibility" = 'public'::"content"."tag_visibility_enum"))))
             LEFT JOIN "content"."prompt_templates" "p" ON ((("e"."entity_type" = 'prompt_template'::"content"."entity_type_enum") AND ("e"."entity_id" = "p"."id"))))
             LEFT JOIN "content"."threads" "th" ON ((("e"."entity_type" = 'thread'::"content"."entity_type_enum") AND ("e"."entity_id" = "th"."id"))))
          WHERE ((("e"."entity_type" = 'prompt_template'::"content"."entity_type_enum") AND ("p"."visibility" = 'public'::"content"."visibility_enum")) OR (("e"."entity_type" = 'thread'::"content"."entity_type_enum") AND ("th"."visibility" = 'public'::"content"."visibility_enum")))
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
    COALESCE((SELECT name FROM "content"."tag_translations" WHERE tag_id = "t"."id" LIMIT 1), "t"."slug") AS "name",
    "t"."created_at",
    'public'::"text" AS "visibility",
    COALESCE("l"."created_count", (0)::bigint) AS "created_count",
    COALESCE("l"."viewed_count", (0)::bigint) AS "viewed_count",
    COALESCE("l"."reacted_count", (0)::bigint) AS "reacted_count",
    ((COALESCE("l"."created_count", (0)::bigint) + COALESCE("l"."viewed_count", (0)::bigint)) + COALESCE("l"."reacted_count", (0)::bigint)) AS "total_usage",
    COALESCE("r"."trend_score_7d", (0)::bigint) AS "trend_score_7d"
   FROM (("content"."tags" "t"
     LEFT JOIN "lifetime" "l" ON (("l"."tag_id" = "t"."id")))
     LEFT JOIN "recent_7d" "r" ON (("r"."tag_id" = "t"."id")))
  WHERE ("t"."visibility" = 'public'::"content"."tag_visibility_enum");

GRANT SELECT ON "public"."vw_tags_public_stats" TO anon, authenticated, service_role;

-- 5. Recreate Reaction RPCs with the new de-polymorphed tables
-- Drop old RPCs returning SETOF content.reactions (these were dropped by CASCADE from content.reactions, but clean up just in case)
DROP FUNCTION IF EXISTS "public"."fn_content_reactions_get_batch_user"(text, uuid[]);
DROP FUNCTION IF EXISTS "public"."fn_content_reactions_get_for_target"(text, uuid);
DROP FUNCTION IF EXISTS "public"."fn_content_reactions_get_user_for_target"(text, uuid);
DROP FUNCTION IF EXISTS "public"."fn_content_reactions_get_lenser_history"(text, integer, integer);
DROP FUNCTION IF EXISTS "public"."fn_content_reactions_get_summary"(text, uuid, uuid);
DROP FUNCTION IF EXISTS "public"."fn_content_reactions_toggle"(text, uuid, "content"."reaction_enum");

CREATE OR REPLACE FUNCTION "public"."fn_content_reactions_toggle"("p_target_type" text, "p_target_id" uuid, "p_reaction" "content"."reaction_enum") RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'content', 'lensers', 'auth'
AS $$
DECLARE
  v_user_id uuid;
  v_existing_id uuid;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  IF p_target_type NOT IN ('thread', 'thread_reply', 'prompt_template') THEN
    RAISE EXCEPTION 'Invalid target_type %', p_target_type;
  END IF;

  IF p_target_type = 'prompt_template' THEN
    SELECT id INTO v_existing_id FROM content.prompt_reactions WHERE prompt_id = p_target_id AND user_id = v_user_id AND reaction = p_reaction;
    IF v_existing_id IS NOT NULL THEN
      DELETE FROM content.prompt_reactions WHERE id = v_existing_id;
      RETURN jsonb_build_object('status','removed');
    ELSE
      INSERT INTO content.prompt_reactions (prompt_id, user_id, reaction) VALUES (p_target_id, v_user_id, p_reaction);
      RETURN jsonb_build_object('status','added');
    END IF;
  ELSIF p_target_type = 'thread' THEN
    SELECT id INTO v_existing_id FROM content.thread_reactions WHERE thread_id = p_target_id AND user_id = v_user_id AND reaction = p_reaction;
    IF v_existing_id IS NOT NULL THEN
      DELETE FROM content.thread_reactions WHERE id = v_existing_id;
      RETURN jsonb_build_object('status','removed');
    ELSE
      INSERT INTO content.thread_reactions (thread_id, user_id, reaction) VALUES (p_target_id, v_user_id, p_reaction);
      RETURN jsonb_build_object('status','added');
    END IF;
  ELSIF p_target_type = 'thread_reply' THEN
    SELECT id INTO v_existing_id FROM content.thread_reply_reactions WHERE reply_id = p_target_id AND user_id = v_user_id AND reaction = p_reaction;
    IF v_existing_id IS NOT NULL THEN
      DELETE FROM content.thread_reply_reactions WHERE id = v_existing_id;
      RETURN jsonb_build_object('status','removed');
    ELSE
      INSERT INTO content.thread_reply_reactions (reply_id, user_id, reaction) VALUES (p_target_id, v_user_id, p_reaction);
      RETURN jsonb_build_object('status','added');
    END IF;
  END IF;
END;
$$;
GRANT ALL ON FUNCTION "public"."fn_content_reactions_toggle"("p_target_type" text, "p_target_id" uuid, "p_reaction" "content"."reaction_enum") TO anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION "public"."fn_content_reactions_get_user_for_target"("p_target_type" text, "p_target_id" uuid)
RETURNS TABLE("id" uuid, "target_id" uuid, "user_id" uuid, "reaction" "content"."reaction_enum", "created_at" timestamptz)
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'content', 'lensers', 'auth'
AS $$
DECLARE
  v_user_id uuid;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN RETURN; END IF;

  IF p_target_type = 'prompt_template' THEN
    RETURN QUERY SELECT pr.id, pr.prompt_id, pr.user_id, pr.reaction, pr.created_at FROM content.prompt_reactions pr WHERE pr.prompt_id = p_target_id AND pr.user_id = v_user_id;
  ELSIF p_target_type = 'thread' THEN
    RETURN QUERY SELECT tr.id, tr.thread_id, tr.user_id, tr.reaction, tr.created_at FROM content.thread_reactions tr WHERE tr.thread_id = p_target_id AND tr.user_id = v_user_id;
  ELSIF p_target_type = 'thread_reply' THEN
    RETURN QUERY SELECT trr.id, trr.reply_id, trr.user_id, trr.reaction, trr.created_at FROM content.thread_reply_reactions trr WHERE trr.reply_id = p_target_id AND trr.user_id = v_user_id;
  END IF;
END;
$$;
GRANT ALL ON FUNCTION "public"."fn_content_reactions_get_user_for_target"("p_target_type" text, "p_target_id" uuid) TO anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION "public"."fn_content_tags_create"("p_name" text, "p_slug" text) RETURNS uuid
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'content', 'public'
AS $$
DECLARE
  v_id uuid;
BEGIN
  if p_name is null or btrim(p_name) = '' then
    raise exception 'Tag name is required';
  end if;

  if p_slug is null or btrim(p_slug) = '' then
    raise exception 'Tag slug is required';
  end if;

  insert into content.tags (slug, visibility)
  values (btrim(p_slug), 'public')
  returning id into v_id;

  insert into content.tag_translations (tag_id, language_id, name)
  values (
    v_id,
    COALESCE((SELECT id FROM core.languages WHERE code = 'en' LIMIT 1), (SELECT id FROM core.languages LIMIT 1)),
    btrim(p_name)
  );

  return v_id;
EXCEPTION
  when unique_violation then
    select id into v_id from content.tags where slug = p_slug;
    if v_id is not null then return v_id; end if;
    raise;
END;
$$;
GRANT ALL ON FUNCTION "public"."fn_content_tags_create"("p_name" text, "p_slug" text) TO anon, authenticated, service_role;
