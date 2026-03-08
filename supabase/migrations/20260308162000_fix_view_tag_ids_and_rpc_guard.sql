-- Migration: V8 - Fix Missing Tag ID in Views and Robust RPC
-- Description: Updates public views to include the tag ID in the denormalized JSONB tags array,
-- and updates the activity logging RPC to skip invalid entries.

-- 1. Update vw_content_threads_public
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
       (SELECT jsonb_agg(jsonb_build_object(
            'id', "tg"."id",
            'slug', "tg"."slug", 
            'name', COALESCE((SELECT name FROM content.tag_translations WHERE tag_id = tg.id LIMIT 1), tg.slug)
        ))
        FROM content.tag_map tm 
        JOIN content.tags tg ON tg.id = tm.tag_id
        WHERE tm.entity_type = 'thread' AND tm.entity_id = t.id), '[]'::jsonb
    ) AS "tags"
   FROM "content"."threads" "t"
   LEFT JOIN "content"."thread_translations" "tt" ON "t"."id" = "tt"."thread_id" AND "tt"."is_original" = true
   LEFT JOIN "lensers"."profiles" "prof" ON "t"."lenser_id" = "prof"."id"
  WHERE ("t"."visibility" = 'public'::"content"."visibility_enum");

-- 2. Update vw_prompt_templates_public
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
       (SELECT jsonb_agg(jsonb_build_object(
            'id', "tg"."id",
            'slug', "tg"."slug", 
            'name', COALESCE((SELECT name FROM content.tag_translations WHERE tag_id = tg.id LIMIT 1), tg.slug)
        ))
        FROM content.tag_map tm 
        JOIN content.tags tg ON tg.id = tm.tag_id
        WHERE tm.entity_type = 'prompt_template' AND tm.entity_id = pt.id), '[]'::jsonb
    ) AS "tags"
   FROM "content"."prompt_templates" "pt"
   LEFT JOIN "content"."prompt_translations" "ptr" ON "pt"."id" = "ptr"."prompt_id" AND "ptr"."is_original" = true
   LEFT JOIN "lensers"."profiles" "prof" ON "pt"."lenser_id" = "prof"."id"
  WHERE ("pt"."visibility" = 'public'::"content"."visibility_enum");

-- 3. Robust RPC update
CREATE OR REPLACE FUNCTION "public"."fn_tag_activity_log"("p_events" "jsonb") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET search_path TO 'public', 'content', 'analytics'
AS $$
BEGIN
  INSERT INTO analytics.tag_activity_events (tag_id, entity_type, entity_id, activity_type, actor_id)
  SELECT 
    (e->>'tag_id')::uuid,
    (CASE 
        WHEN e->>'entity_type' = 'prompt' THEN 'prompt_template'::content.entity_type_enum
        ELSE (e->>'entity_type')::content.entity_type_enum
     END),
    (e->>'entity_id')::uuid,
    (e->>'activity_type')::text,
    (e->>'actor_id')::uuid
  FROM jsonb_array_elements(p_events) AS e
  WHERE (e->>'tag_id') IS NOT NULL 
    AND (e->>'entity_id') IS NOT NULL;
END;
$$;
