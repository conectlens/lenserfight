-- Phase AW — Public template gallery.
--
-- Adds a `category` column to battles.templates so the templates page can
-- offer Creative / Technical / Business / Gaming filter tabs, and a new
-- public-only RPC fn_list_public_battle_templates which is the one the
-- gallery UI calls (anon-safe; only public, non-deleted rows).

-- ── 1. category column ──────────────────────────────────────────────────────
ALTER TABLE battles.templates
  ADD COLUMN IF NOT EXISTS category TEXT
    CHECK (category IS NULL OR char_length(category) BETWEEN 1 AND 32);

COMMENT ON COLUMN battles.templates.category IS
  'Optional taxonomy bucket for the public template gallery (Phase AW). '
  'Examples: ''creative'', ''technical'', ''business'', ''gaming''. NULL = uncategorized.';

CREATE INDEX IF NOT EXISTS idx_battles_templates_public_category
  ON battles.templates (category, created_at DESC)
  WHERE is_public = true AND deleted_at IS NULL;

-- ── 2. fn_list_public_battle_templates ──────────────────────────────────────
CREATE OR REPLACE FUNCTION public.fn_list_public_battle_templates(
  p_category TEXT DEFAULT NULL,
  p_limit    INTEGER DEFAULT 20
)
RETURNS TABLE (
  id             uuid,
  title          text,
  description    text,
  task_prompt    text,
  category       text,
  is_public      boolean,
  max_contenders integer,
  created_at     timestamptz,
  updated_at     timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, battles
AS $$
  SELECT t.id, t.title, t.description, t.task_prompt,
         t.category, t.is_public, t.max_contenders, t.created_at, t.updated_at
    FROM battles.templates t
   WHERE t.is_public = true
     AND t.deleted_at IS NULL
     AND (p_category IS NULL OR t.category = p_category)
   ORDER BY t.created_at DESC
   LIMIT LEAST(GREATEST(COALESCE(p_limit, 20), 1), 100);
$$;

ALTER FUNCTION public.fn_list_public_battle_templates(TEXT, INTEGER) OWNER TO postgres;
GRANT EXECUTE ON FUNCTION public.fn_list_public_battle_templates(TEXT, INTEGER)
  TO anon, authenticated, service_role;
