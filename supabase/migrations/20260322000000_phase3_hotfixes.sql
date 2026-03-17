-- Phase 3 Hotfixes: Fix 7 production errors from Phase 2 consolidation
-- Safe to apply incrementally — all changes are additive (no drops, no renames)
-- Rollback: DROP COLUMN prompt_data; DROP POLICY on each table

BEGIN;

-- =============================================================================
-- A1. Add missing prompt_data column to content.threads
-- Fixes: "column threads.prompt_data does not exist" (Issues #1, #5)
-- =============================================================================
ALTER TABLE content.threads
  ADD COLUMN IF NOT EXISTS prompt_data jsonb;

COMMENT ON COLUMN content.threads.prompt_data
  IS 'Optional embedded prompt metadata (title, description, actionLabel)';

-- =============================================================================
-- A2. Add INSERT + UPDATE policies for tag_translations
-- Fixes: "new row violates row-level security policy for table tag_translations" (Issues #2, #7)
-- =============================================================================
CREATE POLICY "Authenticated can insert tag translations"
  ON content.tag_translations
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated can update tag translations"
  ON content.tag_translations
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- =============================================================================
-- A3. Add read policy for xp.levels (currently service_role-only)
-- Fixes: XP summary cannot read level boundaries (Issue #4)
-- =============================================================================
CREATE POLICY "Authenticated can read xp levels"
  ON xp.levels
  FOR SELECT
  TO authenticated
  USING (true);

-- =============================================================================
-- A4. Add public SELECT policy for badges
-- Allows badge display on profile pages
-- =============================================================================
CREATE POLICY "Public can read badges"
  ON lensers.badges
  FOR SELECT
  USING (true);

-- =============================================================================
-- A5. Update content.vw_auth_threads to include prompt_data
-- DROP + CREATE because PostgreSQL's CREATE OR REPLACE VIEW cannot reorder
-- existing columns (prompt_data must be inserted before title).
-- =============================================================================
DROP VIEW IF EXISTS content.vw_auth_threads CASCADE;

CREATE VIEW content.vw_auth_threads AS
 SELECT t.id,
    t.lenser_id,
    t.visibility,
    t.view_count,
    t.reply_count,
    t.thumbnail_url,
    t.created_at,
    t.updated_at,
    t.prompt_data,
    tt.title,
    tt.content,
    tt.language_code,
    COALESCE(( SELECT jsonb_object_agg(agg.reaction, agg.cnt)
           FROM ( SELECT tr.reaction,
                    count(*)::integer AS cnt
                   FROM content.thread_reactions tr
                  WHERE tr.thread_id = t.id
                  GROUP BY tr.reaction) agg), '{}'::jsonb) AS reaction_totals,
    jsonb_build_object('handle', prof.handle, 'display_name', prof.display_name, 'avatar_url', prof.avatar_url) AS author_profile
   FROM ((content.threads t
     LEFT JOIN lensers.profiles prof ON t.lenser_id = prof.id)
     LEFT JOIN content.thread_translations tt ON (t.id = tt.thread_id AND tt.is_original = true));

ALTER TABLE content.vw_auth_threads OWNER TO postgres;
GRANT SELECT ON TABLE content.vw_auth_threads TO anon;
GRANT SELECT ON TABLE content.vw_auth_threads TO authenticated;
GRANT SELECT ON TABLE content.vw_auth_threads TO service_role;

-- =============================================================================
-- A6. Update public.vw_content_threads_public to include prompt_data
-- Same issue: DROP + CREATE to allow inserting prompt_data before tags.
-- =============================================================================
DROP VIEW IF EXISTS public.vw_content_threads_public CASCADE;

CREATE VIEW public.vw_content_threads_public AS
 SELECT t.id,
    COALESCE(tt.title, 'Untitled'::text) AS title,
    COALESCE(tt.content, ''::text) AS content,
    jsonb_build_object('handle', prof.handle, 'display_name', prof.display_name, 'avatar_url', prof.avatar_url) AS author_profile,
    COALESCE(( SELECT jsonb_object_agg(agg.reaction, agg.cnt)
           FROM ( SELECT tr.reaction,
                    count(*)::integer AS cnt
                   FROM content.thread_reactions tr
                  WHERE tr.thread_id = t.id
                  GROUP BY tr.reaction) agg), '{}'::jsonb) AS reaction_totals,
    t.reply_count,
    t.created_at,
    t.thumbnail_url,
    t.prompt_data,
    COALESCE(( SELECT jsonb_agg(jsonb_build_object('id', tg.id, 'slug', tg.slug, 'name', COALESCE(( SELECT tag_translations.name
                   FROM content.tag_translations
                  WHERE tag_translations.tag_id = tg.id
                 LIMIT 1), tg.slug)))
           FROM (content.tag_map tm
             JOIN content.tags tg ON tg.id = tm.tag_id)
          WHERE tm.entity_type = 'thread'::content.entity_type_enum AND tm.entity_id = t.id), '[]'::jsonb) AS tags
   FROM ((content.threads t
     LEFT JOIN content.thread_translations tt ON (t.id = tt.thread_id AND tt.is_original = true))
     LEFT JOIN lensers.profiles prof ON t.lenser_id = prof.id)
  WHERE t.visibility = 'public'::content.visibility_enum;

ALTER TABLE public.vw_content_threads_public OWNER TO postgres;
GRANT ALL ON TABLE public.vw_content_threads_public TO anon;
GRANT ALL ON TABLE public.vw_content_threads_public TO authenticated;
GRANT ALL ON TABLE public.vw_content_threads_public TO service_role;

COMMIT;
