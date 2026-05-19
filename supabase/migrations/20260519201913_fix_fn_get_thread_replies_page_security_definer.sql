-- Fix fn_get_thread_replies_page: switch to SECURITY DEFINER so anon can call it
-- without needing a direct SELECT grant on lensers.profiles.
-- All other public thread functions use SECURITY DEFINER for the same reason.
-- Public-thread visibility is still enforced by the view (vw_content_thread_replies_public)
-- and the WHERE filters (status = 'published', deleted_at IS NULL).

CREATE OR REPLACE FUNCTION "public"."fn_get_thread_replies_page"(
  "p_thread_id" "uuid",
  "p_limit"     integer DEFAULT 20,
  "p_offset"    integer DEFAULT 0
)
RETURNS TABLE(
  "id"               "uuid",
  "thread_id"        "uuid",
  "parent_reply_id"  "uuid",
  "lenser_id"        "uuid",
  "content"          "text",
  "content_html"     "text",
  "reaction_totals"  "jsonb",
  "created_at"       timestamp with time zone,
  "author_profile"   "jsonb"
)
LANGUAGE "sql" STABLE
SECURITY DEFINER
SET "search_path" TO 'public', 'content', 'lensers', 'auth'
AS $$
  WITH RECURSIVE root_page AS (
    -- Select only top-level (root) replies for this page
    SELECT r.id
    FROM content.thread_replies r
    WHERE r.thread_id        = p_thread_id
      AND r.parent_reply_id  IS NULL
      AND r.status           = 'published'
      AND r.deleted_at       IS NULL
    ORDER BY r.created_at ASC
    LIMIT  LEAST(p_limit, 50)
    OFFSET p_offset
  ),
  descendants AS (
    -- Seed: the root replies for this page
    SELECT r.id, r.parent_reply_id
    FROM content.thread_replies r
    WHERE r.id IN (SELECT id FROM root_page)
    UNION ALL
    -- Recurse: children of already-selected replies
    SELECT r.id, r.parent_reply_id
    FROM content.thread_replies r
    INNER JOIN descendants d ON r.parent_reply_id = d.id
    WHERE r.status     = 'published'
      AND r.deleted_at IS NULL
  )
  SELECT
    v.id,
    v.thread_id,
    v.parent_reply_id,
    v.lenser_id,
    v.content,
    v.content_html,
    v.reaction_totals,
    v.created_at,
    v.author_profile
  FROM public.vw_content_thread_replies_public v
  WHERE v.id IN (SELECT id FROM descendants)
  ORDER BY v.created_at ASC;
$$;

ALTER FUNCTION "public"."fn_get_thread_replies_page"("p_thread_id" "uuid", "p_limit" integer, "p_offset" integer)
  OWNER TO "postgres";

COMMENT ON FUNCTION "public"."fn_get_thread_replies_page"("p_thread_id" "uuid", "p_limit" integer, "p_offset" integer)
  IS 'Paginated thread replies. Paginates by root reply count (LIMIT/OFFSET on root-level entries), then recursively fetches all descendants of the selected roots. Hard cap: 50 root replies per call. Uses SECURITY DEFINER so anon can read public threads without a direct grant on lensers.profiles.';
