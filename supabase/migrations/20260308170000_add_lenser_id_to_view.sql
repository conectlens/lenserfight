-- Migration: Add lenser_id to author_profile in vw_prompt_templates_public
-- Description: Includes `id` (lenser_id) in the author_profile JSONB and selects lenser_id
--              so that resolveAuthor() can correctly determine prompt ownership

DROP VIEW IF EXISTS "public"."vw_prompt_templates_public" CASCADE;

CREATE VIEW "public"."vw_prompt_templates_public" AS
 SELECT "pt"."id",
    "pt"."lenser_id",
    COALESCE("ptr"."title", 'Untitled') AS "title",
    "ptr"."description",
    COALESCE("ptr"."content", '') AS "content",
    "jsonb_build_object"('id', "prof"."id", 'handle', "prof"."handle", 'display_name', "prof"."display_name", 'avatar_url', "prof"."avatar_url") AS "author_profile",
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

GRANT SELECT ON "public"."vw_prompt_templates_public" TO anon, authenticated, service_role;
