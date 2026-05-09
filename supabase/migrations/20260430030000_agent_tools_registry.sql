-- =============================================================================
-- 20260430030000_agent_tools_registry.sql
-- -----------------------------------------------------------------------------
-- Adds the tool registry and per-agent tool assignments. The existing
-- agents.tool_profiles table holds policy (allow/deny groups). The registry
-- here holds concrete tool definitions: name, schemas, auth method, and
-- approval/danger flags. Assignments wire a registered tool to an ai_lenser.
-- =============================================================================

CREATE TABLE IF NOT EXISTS agents.tools_registry (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_lenser_id   uuid NOT NULL,
  key               text NOT NULL,
  name              text NOT NULL,
  description       text NULL,
  category          text NOT NULL DEFAULT 'general',
  schema_input      jsonb NOT NULL DEFAULT '{}'::jsonb,
  schema_output     jsonb NOT NULL DEFAULT '{}'::jsonb,
  auth_method       text NOT NULL DEFAULT 'none'
                      CHECK (auth_method IN ('none', 'api_key', 'oauth', 'service_account')),
  requires_approval boolean NOT NULL DEFAULT false,
  is_dangerous      boolean NOT NULL DEFAULT false,
  status            text NOT NULL DEFAULT 'active'
                      CHECK (status IN ('active', 'disabled', 'deprecated')),
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now(),
  UNIQUE (owner_lenser_id, key)
);

CREATE INDEX IF NOT EXISTS idx_tools_registry_owner ON agents.tools_registry (owner_lenser_id);

CREATE TABLE IF NOT EXISTS agents.tool_assignments (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ai_lenser_id  uuid NOT NULL REFERENCES agents.ai_lensers(id) ON DELETE CASCADE,
  tool_id       uuid NOT NULL REFERENCES agents.tools_registry(id) ON DELETE CASCADE,
  profile_id    uuid NULL REFERENCES agents.tool_profiles(id) ON DELETE SET NULL,
  allowed       boolean NOT NULL DEFAULT true,
  created_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE (ai_lenser_id, tool_id)
);

CREATE INDEX IF NOT EXISTS idx_tool_assignments_agent ON agents.tool_assignments (ai_lenser_id);

ALTER TABLE agents.tools_registry   ENABLE ROW LEVEL SECURITY;
ALTER TABLE agents.tool_assignments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tools_registry_owner_all ON agents.tools_registry;
CREATE POLICY tools_registry_owner_all ON agents.tools_registry
  FOR ALL
  USING (owner_lenser_id = auth.uid())
  WITH CHECK (owner_lenser_id = auth.uid());

DROP POLICY IF EXISTS tool_assignments_owner_all ON agents.tool_assignments;
CREATE POLICY tool_assignments_owner_all ON agents.tool_assignments
  FOR ALL
  USING (agents.can_manage_ai_lenser(ai_lenser_id))
  WITH CHECK (agents.can_manage_ai_lenser(ai_lenser_id));

GRANT SELECT, INSERT, UPDATE, DELETE ON agents.tools_registry TO authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON agents.tool_assignments TO authenticated, service_role;

-- ─── RPC: register a tool ───────────────────────────────────────────────────
DROP FUNCTION IF EXISTS public.fn_register_tool(text, text, text, text, jsonb, jsonb, text, boolean, boolean);
CREATE OR REPLACE FUNCTION public.fn_register_tool(
  p_key               text,
  p_name              text,
  p_description       text DEFAULT NULL,
  p_category          text DEFAULT 'general',
  p_schema_input      jsonb DEFAULT '{}'::jsonb,
  p_schema_output     jsonb DEFAULT '{}'::jsonb,
  p_auth_method       text DEFAULT 'none',
  p_requires_approval boolean DEFAULT false,
  p_is_dangerous      boolean DEFAULT false
)
RETURNS agents.tools_registry
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, agents
AS $$
DECLARE
  v_actor uuid := auth.uid();
  v_row   agents.tools_registry;
BEGIN
  IF v_actor IS NULL THEN
    RAISE EXCEPTION 'authentication required' USING ERRCODE = '42501';
  END IF;

  INSERT INTO agents.tools_registry (
    owner_lenser_id, key, name, description, category,
    schema_input, schema_output, auth_method, requires_approval, is_dangerous
  )
  VALUES (
    v_actor, p_key, p_name, p_description, COALESCE(p_category, 'general'),
    COALESCE(p_schema_input, '{}'::jsonb), COALESCE(p_schema_output, '{}'::jsonb),
    COALESCE(p_auth_method, 'none'),
    COALESCE(p_requires_approval, false),
    COALESCE(p_is_dangerous, false)
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

-- ─── RPC: assign a tool to an agent ─────────────────────────────────────────
DROP FUNCTION IF EXISTS public.fn_assign_tool(uuid, uuid, uuid, boolean);
CREATE OR REPLACE FUNCTION public.fn_assign_tool(
  p_ai_lenser_id uuid,
  p_tool_id      uuid,
  p_profile_id   uuid DEFAULT NULL,
  p_allowed      boolean DEFAULT true
)
RETURNS agents.tool_assignments
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, agents
AS $$
DECLARE
  v_row agents.tool_assignments;
BEGIN
  IF NOT agents.can_manage_ai_lenser(p_ai_lenser_id) THEN
    RAISE EXCEPTION 'not authorized for this agent' USING ERRCODE = '42501';
  END IF;

  INSERT INTO agents.tool_assignments (ai_lenser_id, tool_id, profile_id, allowed)
  VALUES (p_ai_lenser_id, p_tool_id, p_profile_id, COALESCE(p_allowed, true))
  ON CONFLICT (ai_lenser_id, tool_id)
  DO UPDATE SET
    profile_id = EXCLUDED.profile_id,
    allowed    = EXCLUDED.allowed
  RETURNING * INTO v_row;

  RETURN v_row;
END;
$$;

GRANT EXECUTE ON FUNCTION public.fn_assign_tool(uuid, uuid, uuid, boolean) TO authenticated;

-- ─── RPC: revoke a tool assignment ──────────────────────────────────────────
DROP FUNCTION IF EXISTS public.fn_revoke_tool(uuid, uuid);
CREATE OR REPLACE FUNCTION public.fn_revoke_tool(
  p_ai_lenser_id uuid,
  p_tool_id      uuid
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, agents
AS $$
BEGIN
  IF NOT agents.can_manage_ai_lenser(p_ai_lenser_id) THEN
    RAISE EXCEPTION 'not authorized for this agent' USING ERRCODE = '42501';
  END IF;
  DELETE FROM agents.tool_assignments
   WHERE ai_lenser_id = p_ai_lenser_id
     AND tool_id      = p_tool_id;
  RETURN true;
END;
$$;

GRANT EXECUTE ON FUNCTION public.fn_revoke_tool(uuid, uuid) TO authenticated;

COMMENT ON TABLE agents.tools_registry IS
  'Per-owner registry of tool definitions. Tool assignments bind a registered tool to an agent.';
