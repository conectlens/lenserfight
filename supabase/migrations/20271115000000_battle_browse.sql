-- Phase BP — Battle browse RPC for anon/auth users.
--
-- Single SECURITY DEFINER function that returns a paginated list of battles
-- filtered by category / status / FTS query. Keyset paginated on
-- (created_at DESC, id DESC) — mirrors the pattern used elsewhere in the
-- platform (fn_get_notifications).
--
-- The FTS index uses the 'simple' configuration so titles in any language
-- (English, Turkish, …) are tokenised consistently. Switching to a per-row
-- language configuration is a Phase-post-OSS upgrade.

-- ── 1. FTS index ────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_battles_title_fts
  ON battles.battles USING GIN (to_tsvector('simple', title));

CREATE INDEX IF NOT EXISTS idx_battles_status_created_at
  ON battles.battles (status, created_at DESC, id DESC)
  WHERE deleted_at IS NULL;

-- ── 2. fn_browse_battles ────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.fn_browse_battles(
  p_category       TEXT  DEFAULT NULL,
  p_status         TEXT  DEFAULT NULL,
  p_q              TEXT  DEFAULT NULL,
  p_after_created  TIMESTAMPTZ DEFAULT NULL,
  p_after_id       UUID  DEFAULT NULL,
  p_limit          INT   DEFAULT 20
)
RETURNS TABLE(
  id              UUID,
  title           TEXT,
  slug            TEXT,
  status          TEXT,
  category        TEXT,
  contender_count INT,
  vote_count      INT,
  created_at      TIMESTAMPTZ,
  template_title  TEXT
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, battles, extensions
AS $$
  WITH bounded AS (
    SELECT
      b.id,
      b.title,
      b.slug,
      b.status::text,
      t.category,
      b.total_vote_count,
      b.created_at,
      t.title AS template_title
    FROM battles.battles b
    LEFT JOIN battles.templates t ON t.id = b.template_id
    WHERE b.deleted_at IS NULL
      AND (
        -- Anonymous browse only exposes published / voting battles. Owners
        -- can see all their own via the existing repository methods.
        b.status::text IN ('open', 'voting', 'scoring', 'published')
      )
      AND (p_category IS NULL OR t.category = p_category)
      AND (p_status   IS NULL OR b.status::text = p_status)
      AND (
        p_q IS NULL
        OR to_tsvector('simple', b.title) @@ plainto_tsquery('simple', p_q)
      )
      AND (
        p_after_created IS NULL
        OR (b.created_at, b.id) < (p_after_created, COALESCE(p_after_id, '00000000-0000-0000-0000-000000000000'::uuid))
      )
    ORDER BY b.created_at DESC, b.id DESC
    LIMIT LEAST(GREATEST(p_limit, 1), 100)
  )
  SELECT
    bounded.id,
    bounded.title,
    bounded.slug,
    bounded.status,
    bounded.category,
    COALESCE((SELECT count(*)::int FROM battles.contenders c WHERE c.battle_id = bounded.id), 0)
      AS contender_count,
    COALESCE(bounded.total_vote_count, 0) AS vote_count,
    bounded.created_at,
    bounded.template_title
  FROM bounded
  ORDER BY bounded.created_at DESC, bounded.id DESC;
$$;

ALTER FUNCTION public.fn_browse_battles(TEXT, TEXT, TEXT, TIMESTAMPTZ, UUID, INT) OWNER TO postgres;
GRANT EXECUTE ON FUNCTION public.fn_browse_battles(TEXT, TEXT, TEXT, TIMESTAMPTZ, UUID, INT)
  TO anon, authenticated, service_role;
