-- =============================================================================
-- SEO: anon-safe public LIST functions for dynamic sitemap generation
-- -----------------------------------------------------------------------------
-- The crawler/answer-engine sitemap (moon.lenserfight.com/sitemap.xml) is a
-- sitemap-index → per-type sharded children. Each shard is filled by one of the
-- functions below, invoked with the Supabase ANON key from the edge Worker.
--
-- Contract for every fn_list_public_* function:
--   • Returns (entity_key text, lastmod timestamptz, sort_id uuid).
--       entity_key = the value that fills the route param
--                    (lens/workflow/thread → uuid::text; battle → slug;
--                     lenser → handle; ray → tag slug)
--       lastmod    = honest row timestamp (updated_at, or created_at where the
--                    table has no updated_at). NEVER now()/build time — search
--                    engines only trust <lastmod> for recrawl when it is real.
--       sort_id    = the row uuid, used as the keyset cursor.
--   • Emits ONLY rows an anonymous user may see. Predicates mirror each table's
--     RLS SELECT policy for the anon role (community/followers/private excluded
--     — those need an authenticated viewer and must not appear in a public
--     sitemap).
--   • Keyset pagination by uuid: WHERE (p_after IS NULL OR id > p_after)
--     ORDER BY id LIMIT ≤50000. This yields STABLE, immutable id-range shards
--     (-1, -2, …) so cold archive shards are never rewritten and crawler
--     If-Modified-Since / <lastmod> short-circuits work.
--   • SECURITY DEFINER, pinned search_path, REVOKE ALL FROM public, then
--     GRANT EXECUTE TO anon, authenticated, service_role.
--
-- SECURITY NOTE (see memory: supabase-definer-force-rls-row-security):
--   lenses.lenses has FORCE ROW LEVEL SECURITY, so its function (and the lens
--   branch of fn_list_recent_public) MUST `SET row_security TO off` and
--   re-encode the public predicate in WHERE — mirroring public.fn_search_lenses.
--   The other five tables are not FORCE-RLS; the definer (postgres) bypasses
--   RLS, so we re-apply the public predicate explicitly and do NOT rely on the
--   role-scoped policies.
--
-- PERFORMANCE (see CLAUDE.md §4): each list fn does an indexed keyset walk by
--   PK. Partial indexes matching the public predicate (bottom of this file)
--   keep the WHERE selective when public rows are sparse. On a LARGE existing
--   prod table a plain CREATE INDEX write-locks the table; if these tables are
--   already big, apply the indexes out-of-band with CREATE INDEX CONCURRENTLY
--   instead of inside this migration. Run migration-risk-reviewer before
--   applying to a shared environment.
-- =============================================================================

-- ── 1. Lenses  /lenses/:id  (FORCE-RLS → row_security off) ────────────────────
CREATE OR REPLACE FUNCTION public.fn_list_public_lenses(
  p_after uuid DEFAULT NULL,
  p_limit integer DEFAULT 50000
)
RETURNS TABLE (entity_key text, lastmod timestamptz, sort_id uuid)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'lenses', 'lensers', 'content', 'public'
SET row_security TO off
AS $$
  SELECT l.id::text, l.updated_at, l.id
  FROM lenses.lenses l
  WHERE l.visibility = 'public'::content.visibility_enum
    AND l.status = 'published'::content.content_status
    AND l.deleted_at IS NULL
    AND EXISTS (
      SELECT 1 FROM lensers.profiles p
      WHERE p.id = l.lenser_id AND p.status = 'active'
    )
    AND (p_after IS NULL OR l.id > p_after)
  ORDER BY l.id
  LIMIT LEAST(GREATEST(p_limit, 1), 50000);
$$;

-- ── 2. Battles  /battles/:slug  (via vw_battles_public — slug + updated_at) ───
CREATE OR REPLACE FUNCTION public.fn_list_public_battles(
  p_after uuid DEFAULT NULL,
  p_limit integer DEFAULT 50000
)
RETURNS TABLE (entity_key text, lastmod timestamptz, sort_id uuid)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public', 'battles', 'lensers'
AS $$
  SELECT b.slug, b.updated_at, b.id
  FROM public.vw_battles_public b
  WHERE (p_after IS NULL OR b.id > p_after)
  ORDER BY b.id
  LIMIT LEAST(GREATEST(p_limit, 1), 50000);
$$;

-- ── 3. Lenser profiles  /lenser/:handle  (public visibility only) ─────────────
CREATE OR REPLACE FUNCTION public.fn_list_public_lensers(
  p_after uuid DEFAULT NULL,
  p_limit integer DEFAULT 50000
)
RETURNS TABLE (entity_key text, lastmod timestamptz, sort_id uuid)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public', 'lensers'
AS $$
  SELECT p.handle, p.updated_at, p.id
  FROM lensers.profiles p
  WHERE p.status = 'active'
    AND p.deletion_requested_at IS NULL
    AND p.visibility = 'public'::lensers.lenser_visibility
    AND (p_after IS NULL OR p.id > p_after)
  ORDER BY p.id
  LIMIT LEAST(GREATEST(p_limit, 1), 50000);
$$;

-- ── 4. Workflows  /workflows/:id  (visibility is text: public|private|unlisted)
CREATE OR REPLACE FUNCTION public.fn_list_public_workflows(
  p_after uuid DEFAULT NULL,
  p_limit integer DEFAULT 50000
)
RETURNS TABLE (entity_key text, lastmod timestamptz, sort_id uuid)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public', 'lenses', 'lensers'
AS $$
  SELECT w.id::text, w.updated_at, w.id
  FROM lenses.workflows w
  WHERE w.visibility = 'public'          -- excludes 'unlisted' and 'private'
    AND w.deleted_at IS NULL
    AND EXISTS (
      SELECT 1 FROM lensers.profiles p
      WHERE p.id = w.lenser_id AND p.status = 'active'
    )
    AND (p_after IS NULL OR w.id > p_after)
  ORDER BY w.id
  LIMIT LEAST(GREATEST(p_limit, 1), 50000);
$$;

-- ── 5. Threads  /threads/:threadId  (public + published + active author) ──────
CREATE OR REPLACE FUNCTION public.fn_list_public_threads(
  p_after uuid DEFAULT NULL,
  p_limit integer DEFAULT 50000
)
RETURNS TABLE (entity_key text, lastmod timestamptz, sort_id uuid)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public', 'content', 'lensers'
AS $$
  SELECT t.id::text, t.updated_at, t.id
  FROM content.threads t
  WHERE t.visibility = 'public'::content.visibility_enum
    AND t.status = 'published'::content.content_status
    AND EXISTS (
      SELECT 1 FROM lensers.profiles p
      WHERE p.id = t.lenser_id AND p.status = 'active'
    )
    AND (p_after IS NULL OR t.id > p_after)
  ORDER BY t.id
  LIMIT LEAST(GREATEST(p_limit, 1), 50000);
$$;

-- ── 6. Rays (tags)  /ray/:slug  (content.tags — no updated_at, use created_at) ─
CREATE OR REPLACE FUNCTION public.fn_list_public_rays(
  p_after uuid DEFAULT NULL,
  p_limit integer DEFAULT 50000
)
RETURNS TABLE (entity_key text, lastmod timestamptz, sort_id uuid)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public', 'content'
AS $$
  SELECT t.slug, t.created_at, t.id
  FROM content.tags t
  WHERE t.visibility = 'public'::content.tag_visibility_enum
    AND (p_after IS NULL OR t.id > p_after)
  ORDER BY t.id
  LIMIT LEAST(GREATEST(p_limit, 1), 50000);
$$;

-- ── 7. Recent union  → /sitemaps/recent.xml  (fast-refresh fresh shard) ───────
--   Reddit/X "fresh sitemap" pattern: newly created/updated public entities of
--   every type in one small, frequently-regenerated shard so a brand-new item
--   is crawlable within minutes without touching any archive shard. Ordered by
--   lastmod DESC (NOT by id) and hard-capped at 5000. Touches lenses → needs
--   row_security off, like fn_search_lenses / fn_list_public_lenses.
CREATE OR REPLACE FUNCTION public.fn_list_recent_public(
  p_since timestamptz,
  p_limit integer DEFAULT 5000
)
RETURNS TABLE (kind text, entity_key text, lastmod timestamptz)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'lenses', 'lensers', 'content', 'battles', 'public'
SET row_security TO off
AS $$
  WITH unioned AS (
    SELECT 'lens'::text AS kind, l.id::text AS entity_key, l.updated_at AS lastmod
    FROM lenses.lenses l
    WHERE l.visibility = 'public'::content.visibility_enum
      AND l.status = 'published'::content.content_status
      AND l.deleted_at IS NULL
      AND EXISTS (SELECT 1 FROM lensers.profiles p WHERE p.id = l.lenser_id AND p.status = 'active')
      AND l.updated_at >= p_since
    UNION ALL
    SELECT 'battle', b.slug, b.updated_at
    FROM public.vw_battles_public b
    WHERE b.updated_at >= p_since
    UNION ALL
    SELECT 'lenser', p.handle, p.updated_at
    FROM lensers.profiles p
    WHERE p.status = 'active'
      AND p.deletion_requested_at IS NULL
      AND p.visibility = 'public'::lensers.lenser_visibility
      AND p.updated_at >= p_since
    UNION ALL
    SELECT 'workflow', w.id::text, w.updated_at
    FROM lenses.workflows w
    WHERE w.visibility = 'public'
      AND w.deleted_at IS NULL
      AND EXISTS (SELECT 1 FROM lensers.profiles p WHERE p.id = w.lenser_id AND p.status = 'active')
      AND w.updated_at >= p_since
    UNION ALL
    SELECT 'thread', t.id::text, t.updated_at
    FROM content.threads t
    WHERE t.visibility = 'public'::content.visibility_enum
      AND t.status = 'published'::content.content_status
      AND EXISTS (SELECT 1 FROM lensers.profiles p WHERE p.id = t.lenser_id AND p.status = 'active')
      AND t.updated_at >= p_since
    UNION ALL
    SELECT 'ray', tg.slug, tg.created_at
    FROM content.tags tg
    WHERE tg.visibility = 'public'::content.tag_visibility_enum
      AND tg.created_at >= p_since
  )
  SELECT kind, entity_key, lastmod
  FROM unioned
  ORDER BY lastmod DESC
  LIMIT LEAST(GREATEST(p_limit, 1), 5000);
$$;

-- ── Ownership + grants ────────────────────────────────────────────────────────
ALTER FUNCTION public.fn_list_public_lenses(uuid, integer)    OWNER TO postgres;
ALTER FUNCTION public.fn_list_public_battles(uuid, integer)   OWNER TO postgres;
ALTER FUNCTION public.fn_list_public_lensers(uuid, integer)   OWNER TO postgres;
ALTER FUNCTION public.fn_list_public_workflows(uuid, integer) OWNER TO postgres;
ALTER FUNCTION public.fn_list_public_threads(uuid, integer)   OWNER TO postgres;
ALTER FUNCTION public.fn_list_public_rays(uuid, integer)      OWNER TO postgres;
ALTER FUNCTION public.fn_list_recent_public(timestamptz, integer) OWNER TO postgres;

REVOKE ALL ON FUNCTION public.fn_list_public_lenses(uuid, integer)    FROM public;
REVOKE ALL ON FUNCTION public.fn_list_public_battles(uuid, integer)   FROM public;
REVOKE ALL ON FUNCTION public.fn_list_public_lensers(uuid, integer)   FROM public;
REVOKE ALL ON FUNCTION public.fn_list_public_workflows(uuid, integer) FROM public;
REVOKE ALL ON FUNCTION public.fn_list_public_threads(uuid, integer)   FROM public;
REVOKE ALL ON FUNCTION public.fn_list_public_rays(uuid, integer)      FROM public;
REVOKE ALL ON FUNCTION public.fn_list_recent_public(timestamptz, integer) FROM public;

GRANT EXECUTE ON FUNCTION public.fn_list_public_lenses(uuid, integer)    TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.fn_list_public_battles(uuid, integer)   TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.fn_list_public_lensers(uuid, integer)   TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.fn_list_public_workflows(uuid, integer) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.fn_list_public_threads(uuid, integer)   TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.fn_list_public_rays(uuid, integer)      TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.fn_list_recent_public(timestamptz, integer) TO anon, authenticated, service_role;

COMMENT ON FUNCTION public.fn_list_public_lenses(uuid, integer) IS
  'SEO sitemap source. Keyset-paginated (id) list of PUBLIC published lenses with active authors. Returns (entity_key=id::text, lastmod=updated_at, sort_id=id). SECURITY DEFINER + row_security off (lenses.lenses is FORCE-RLS); predicate mirrors the anon RLS policy. anon-executable.';
COMMENT ON FUNCTION public.fn_list_public_battles(uuid, integer) IS
  'SEO sitemap source. Keyset-paginated list of public battles via vw_battles_public (status voting/scoring/closed/published, not deleted). entity_key=slug, lastmod=updated_at. anon-executable.';
COMMENT ON FUNCTION public.fn_list_public_lensers(uuid, integer) IS
  'SEO sitemap source. Keyset-paginated list of active, public-visibility lenser profiles. entity_key=handle, lastmod=updated_at. Community/followers/private excluded (need an authenticated viewer). anon-executable.';
COMMENT ON FUNCTION public.fn_list_public_workflows(uuid, integer) IS
  'SEO sitemap source. Keyset-paginated list of public workflows (visibility=public, not unlisted/private) with active authors. entity_key=id::text, lastmod=updated_at. anon-executable.';
COMMENT ON FUNCTION public.fn_list_public_threads(uuid, integer) IS
  'SEO sitemap source. Keyset-paginated list of public+published threads with active authors. entity_key=id::text, lastmod=updated_at. anon-executable.';
COMMENT ON FUNCTION public.fn_list_public_rays(uuid, integer) IS
  'SEO sitemap source. Keyset-paginated list of public tags (rays). entity_key=slug, lastmod=created_at (tags have no updated_at). anon-executable.';
COMMENT ON FUNCTION public.fn_list_recent_public(timestamptz, integer) IS
  'SEO fresh-shard source (/sitemaps/recent.xml). Union of public entities of every type created/updated since p_since, ordered lastmod DESC, capped 5000. row_security off for the lenses branch. anon-executable.';

-- ── Partial indexes matching the public predicates (keyset walk selectivity) ──
-- NOTE: plain CREATE INDEX write-locks the table for the build. If any of these
-- tables is already large in prod, DROP the matching statement here and create
-- it out-of-band with CREATE INDEX CONCURRENTLY. See migration-risk-reviewer.
CREATE INDEX IF NOT EXISTS ix_lenses_public_sitemap
  ON lenses.lenses (id)
  WHERE visibility = 'public'::content.visibility_enum
    AND status = 'published'::content.content_status
    AND deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS ix_workflows_public_sitemap
  ON lenses.workflows (id)
  WHERE visibility = 'public' AND deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS ix_threads_public_sitemap
  ON content.threads (id)
  WHERE visibility = 'public'::content.visibility_enum
    AND status = 'published'::content.content_status;

CREATE INDEX IF NOT EXISTS ix_profiles_public_sitemap
  ON lensers.profiles (id)
  WHERE status = 'active'
    AND deletion_requested_at IS NULL
    AND visibility = 'public'::lensers.lenser_visibility;

CREATE INDEX IF NOT EXISTS ix_tags_public_sitemap
  ON content.tags (id)
  WHERE visibility = 'public'::content.tag_visibility_enum;

-- ── Anon thread DETAIL read (bot-render gap) ─────────────────────────────────
-- Threads have no anon-callable single-thread read (fn_get_thread_by_id_private
-- is owner-only). This public-safe reader builds on the already-vetted
-- public.vw_content_threads_public view (visibility='public' AND status='published'),
-- returning only SEO-safe fields. anon-executable.
CREATE OR REPLACE FUNCTION public.fn_get_thread_public(p_thread_id uuid)
RETURNS TABLE (
  id uuid,
  title text,
  body_preview text,
  author_handle text,
  author_display_name text,
  created_at timestamptz,
  tags jsonb
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public', 'content', 'lensers'
AS $$
  SELECT v.id,
         v.title,
         NULL::text AS body_preview,
         v.lenser_handle AS author_handle,
         p.display_name AS author_display_name,
         v.created_at,
         v.tags
  FROM public.vw_content_threads_public v
  JOIN lensers.profiles p ON p.id = v.lenser_id
  WHERE v.id = p_thread_id;
$$;

ALTER FUNCTION public.fn_get_thread_public(uuid) OWNER TO postgres;
REVOKE ALL ON FUNCTION public.fn_get_thread_public(uuid) FROM public;
GRANT EXECUTE ON FUNCTION public.fn_get_thread_public(uuid) TO anon, authenticated, service_role;
COMMENT ON FUNCTION public.fn_get_thread_public(uuid) IS
  'SEO bot-render detail read for a single public thread via vw_content_threads_public (public+published only). Returns SEO-safe fields (title, author, created_at, tags). anon-executable.';
