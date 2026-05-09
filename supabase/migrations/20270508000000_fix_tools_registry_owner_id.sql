-- =============================================================================
-- 20270508000000_fix_tools_registry_owner_id.sql
-- -----------------------------------------------------------------------------
-- BUG: tools_registry.owner_lenser_id was being set to auth.uid() (the auth
-- user UUID, a1000000-...) instead of the lenser profile ID (b2000000-...).
-- This caused GET queries filtering on the lenser profile ID to return [].
--
-- Fix: use lensers.get_auth_human_lenser_id() in both the RLS policy and the
-- fn_register_tool function so owner_lenser_id holds the lenser profile ID.
-- =============================================================================

-- ─── RLS: rewrite to compare against lenser profile ID ───────────────────────
DROP POLICY IF EXISTS tools_registry_owner_all ON agents.tools_registry;
CREATE POLICY tools_registry_owner_all ON agents.tools_registry
  FOR ALL
  USING  (owner_lenser_id = lensers.get_auth_human_lenser_id())
  WITH CHECK (owner_lenser_id = lensers.get_auth_human_lenser_id());

-- ─── RPC: fix fn_register_tool to store lenser profile ID ────────────────────
DROP FUNCTION IF EXISTS public.fn_register_tool(text, text, text, text, jsonb, jsonb, text, boolean, boolean);
CREATE OR REPLACE FUNCTION public.fn_register_tool(
  p_key               text,
  p_name              text,
  p_description       text    DEFAULT NULL,
  p_category          text    DEFAULT 'general',
  p_schema_input      jsonb   DEFAULT '{}'::jsonb,
  p_schema_output     jsonb   DEFAULT '{}'::jsonb,
  p_auth_method       text    DEFAULT 'none',
  p_requires_approval boolean DEFAULT false,
  p_is_dangerous      boolean DEFAULT false
)
RETURNS agents.tools_registry
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, agents, lensers
AS $$
DECLARE
  v_owner uuid := lensers.get_auth_human_lenser_id();
  v_row   agents.tools_registry;
BEGIN
  IF v_owner IS NULL THEN
    RAISE EXCEPTION 'authentication required or no human lenser profile found'
      USING ERRCODE = '42501';
  END IF;

  INSERT INTO agents.tools_registry (
    owner_lenser_id, key, name, description, category,
    schema_input, schema_output, auth_method, requires_approval, is_dangerous
  )
  VALUES (
    v_owner, p_key, p_name, p_description, COALESCE(p_category, 'general'),
    COALESCE(p_schema_input,      '{}'::jsonb),
    COALESCE(p_schema_output,     '{}'::jsonb),
    COALESCE(p_auth_method,       'none'),
    COALESCE(p_requires_approval, false),
    COALESCE(p_is_dangerous,      false)
  )
  ON CONFLICT (owner_lenser_id, key)
  DO UPDATE SET
    name              = EXCLUDED.name,
    description       = EXCLUDED.description,
    category          = EXCLUDED.category,
    schema_input      = EXCLUDED.schema_input,
    schema_output     = EXCLUDED.schema_output,
    auth_method       = EXCLUDED.auth_method,
    requires_approval = EXCLUDED.requires_approval,
    is_dangerous      = EXCLUDED.is_dangerous,
    updated_at        = now()
  RETURNING * INTO v_row;

  RETURN v_row;
END;
$$;

GRANT EXECUTE ON FUNCTION public.fn_register_tool(text, text, text, text, jsonb, jsonb, text, boolean, boolean) TO authenticated;

-- ─── Backfill: fix any rows already stored with auth.uid() ───────────────────
-- Corrects existing rows where owner_lenser_id = auth user UUID instead of
-- the lenser profile UUID, by joining auth.users → lensers.profiles.
UPDATE agents.tools_registry tr
SET owner_lenser_id = p.id
FROM auth.users u
JOIN lensers.profiles p ON p.user_id = u.id AND p.type = 'human'
WHERE tr.owner_lenser_id = u.id   -- currently holds the auth UID
  AND tr.owner_lenser_id != p.id; -- not already correct
