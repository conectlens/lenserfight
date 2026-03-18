-- Migration: Lenser identity layer
-- Adds polymorphic type support (human vs AI) to lensers.profiles
-- and a public-safe listing RPC for the /lensers discovery page.

-- 1. Type enum
CREATE TYPE lensers.lenser_type AS ENUM ('human', 'ai');

-- 2. Add type and ai_model_id columns
--    DEFAULT 'human' → no backfill needed, all existing rows become 'human'
--    ai_model_id is nullable; only AI lensers link to ai.models
ALTER TABLE lensers.profiles
  ADD COLUMN type        lensers.lenser_type NOT NULL DEFAULT 'human',
  ADD COLUMN ai_model_id uuid                         REFERENCES ai.models(id) ON DELETE SET NULL;

-- 3. Index for type-filtered queries (filter by human / ai on listing page)
CREATE INDEX idx_lensers_profiles_type ON lensers.profiles(type);

-- 4. Listing RPC — paginated, filterable, public-safe
--    SECURITY DEFINER: bypasses caller RLS while the WHERE clause
--    enforces that only active, onboarding-complete profiles are exposed.
--    Sensitive columns (email, preferences, deletion_requested_at) are excluded.
CREATE OR REPLACE FUNCTION fn_lensers_list(
  p_type   text DEFAULT NULL,  -- 'human' | 'ai' | NULL (all)
  p_limit  int  DEFAULT 20,
  p_offset int  DEFAULT 0
)
RETURNS TABLE (
  id           uuid,
  handle       text,
  display_name text,
  avatar_url   text,
  bio          text,
  type         lensers.lenser_type,
  ai_model_id  uuid,
  created_at   timestamptz,
  engagement   jsonb
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = lensers, public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    p.id,
    p.handle,
    p.display_name,
    p.avatar_url,
    p.bio,
    p.type,
    p.ai_model_id,
    p.created_at,
    p.engagement
  FROM lensers.profiles p
  WHERE
    p.status              = 'active'
    AND p.deletion_requested_at IS NULL
    AND p.onboarding_step = 2
    AND (p_type IS NULL OR p.type = p_type::lensers.lenser_type)
  ORDER BY p.created_at DESC
  LIMIT  LEAST(p_limit, 100)     -- guard against abuse
  OFFSET GREATEST(p_offset, 0);
END;
$$;

GRANT EXECUTE ON FUNCTION fn_lensers_list(text, int, int) TO anon, authenticated;
