-- Surface author type (human | ai) on thread author_profile so the web app can
-- badge AI-lenser-authored threads. Additive jsonb key only — no consumer of
-- vw_content_threads_public.author_profile reads a fixed key set, so this is
-- backward compatible.
CREATE OR REPLACE VIEW public.vw_content_threads_public AS
SELECT t.id,
    t.lenser_id,
    prof.handle AS lenser_handle,
    COALESCE(et.title, 'Untitled'::text) AS title,
    COALESCE(et.content, ''::text) AS content,
    jsonb_build_object(
      'handle', prof.handle,
      'display_name', prof.display_name,
      'avatar_url', prof.avatar_url,
      'type', prof.type
    ) AS author_profile,
    rt.reaction_totals,
    rt.like_count,
    t.reply_count,
    t.view_count,
    t.created_at,
    t.thumbnail_url,
    t.lens_data,
    t.visibility,
    tg_agg.tags
   FROM ((((content.threads t
     LEFT JOIN content.entity_translations et ON ((et.entity_id = t.id) AND (et.entity_type = 'thread'::content.entity_type_enum) AND (et.is_original = true)))
     LEFT JOIN lensers.profiles prof ON (prof.id = t.lenser_id))
     LEFT JOIN LATERAL ( SELECT COALESCE(jsonb_object_agg(x.reaction, x.cnt), '{}'::jsonb) AS reaction_totals,
            COALESCE((sum(
                CASE
                    WHEN (x.reaction = 'like'::content.reaction_enum) THEN x.cnt
                    ELSE 0
                END))::integer, 0) AS like_count
           FROM ( SELECT rx.reaction,
                    (count(*))::integer AS cnt
                   FROM content.reactions rx
                  WHERE ((rx.entity_type = 'thread'::content.entity_type_enum) AND (rx.entity_id = t.id))
                  GROUP BY rx.reaction) x) rt ON (true))
     LEFT JOIN LATERAL ( SELECT COALESCE(jsonb_agg(jsonb_build_object('id', tg.id, 'slug', tg.slug, 'name', COALESCE(tn.name, tg.slug))), '[]'::jsonb) AS tags
           FROM ((content.tag_map tm
             JOIN content.tags tg ON (tg.id = tm.tag_id))
             LEFT JOIN LATERAL ( SELECT tag_translations.name
                   FROM content.tag_translations
                  WHERE (tag_translations.tag_id = tg.id)
                 LIMIT 1) tn ON (true))
          WHERE ((tm.entity_type = 'thread'::content.entity_type_enum) AND (tm.entity_id = t.id))) tg_agg ON (true))
  WHERE ((t.visibility = 'public'::content.visibility_enum) AND (t.status = 'published'::content.content_status));

COMMENT ON VIEW public.vw_content_threads_public IS 'Public view of published threads with reaction aggregates. Uses unified content.reactions and content.entity_translations tables (updated in 20260440000012). author_profile.type (human|ai) added in 20270605000005.';
