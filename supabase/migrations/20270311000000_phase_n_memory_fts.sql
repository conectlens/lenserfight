-- Phase N1: Full-text search over agents.memories.content
--
-- Adds a GIN index on `to_tsvector('english', content)` and a SECURITY INVOKER
-- RPC that runs `plainto_tsquery` against the indexed expression. RLS on
-- `agents.memories` is preserved (the function is INVOKER, so the caller's
-- session identity is what the policy sees).
--
-- The CLI exposes this via `lf memory search <query> [--profile <id>]`.

-- ─── 1. GIN index ─────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_agents_memories_fts
  ON agents.memories
  USING GIN (to_tsvector('english', content));

COMMENT ON INDEX agents.idx_agents_memories_fts IS
  'Phase N1: GIN index on to_tsvector(english, content) for full-text search '
  'via fn_search_memory_entries.';

-- ─── 2. fn_search_memory_entries ──────────────────────────────────────────────

DROP FUNCTION IF EXISTS public.fn_search_memory_entries(uuid, text, integer);

CREATE OR REPLACE FUNCTION public.fn_search_memory_entries(
  p_query   text,
  p_profile_id uuid DEFAULT NULL,
  p_limit   integer DEFAULT 20
)
RETURNS TABLE (
  id            uuid,
  profile_id    uuid,
  ai_lenser_id  uuid,
  scope         text,
  source        text,
  content       text,
  confidence    numeric,
  is_redacted   boolean,
  created_at    timestamptz,
  rank          real
)
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = agents, public
AS $$
DECLARE
  v_limit integer := LEAST(GREATEST(COALESCE(p_limit, 20), 1), 50);
  v_query tsquery;
BEGIN
  IF p_query IS NULL OR length(trim(p_query)) = 0 THEN
    RETURN;
  END IF;

  v_query := plainto_tsquery('english', p_query);

  IF v_query::text = '' THEN
    -- The query string contained only stopwords; nothing to search for.
    RETURN;
  END IF;

  RETURN QUERY
    SELECT
      m.id,
      m.profile_id,
      m.ai_lenser_id,
      m.scope,
      m.source,
      m.content,
      m.confidence,
      m.is_redacted,
      m.created_at,
      ts_rank(to_tsvector('english', m.content), v_query) AS rank
    FROM agents.memories m
    WHERE
      (p_profile_id IS NULL OR m.profile_id = p_profile_id)
      AND m.is_redacted = false
      AND to_tsvector('english', m.content) @@ v_query
    ORDER BY rank DESC, m.created_at DESC
    LIMIT v_limit;
END;
$$;

ALTER FUNCTION public.fn_search_memory_entries(text, uuid, integer) OWNER TO postgres;

COMMENT ON FUNCTION public.fn_search_memory_entries(text, uuid, integer) IS
  'Phase N1: Full-text search over agents.memories.content using a plain '
  'english tsquery. Honors RLS via SECURITY INVOKER. Returns up to 50 rows '
  'ranked by ts_rank.';

GRANT EXECUTE ON FUNCTION public.fn_search_memory_entries(text, uuid, integer)
  TO authenticated, service_role;
