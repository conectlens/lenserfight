-- =============================================================================
-- 20260430050000_agent_settings.sql
-- -----------------------------------------------------------------------------
-- Adds the per-workspace settings container backing the Configure → Settings
-- section. Default model/provider, approval default, retention, daily-budget,
-- webhook list, and API access flag.
-- =============================================================================

CREATE TABLE IF NOT EXISTS agents.workspace_settings (
  ai_lenser_id        uuid PRIMARY KEY REFERENCES agents.ai_lensers(id) ON DELETE CASCADE,
  default_model_id    uuid NULL,
  default_provider_key text NULL,
  approval_default    text NOT NULL DEFAULT 'require_human'
                        CHECK (approval_default IN ('auto', 'require_human', 'deny')),
  retention_days      integer NOT NULL DEFAULT 90,
  max_daily_credits   integer NOT NULL DEFAULT 1000,
  webhooks            jsonb NOT NULL DEFAULT '[]'::jsonb,
  api_access_enabled  boolean NOT NULL DEFAULT false,
  metadata            jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE agents.workspace_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS workspace_settings_owner_all ON agents.workspace_settings;
CREATE POLICY workspace_settings_owner_all ON agents.workspace_settings
  FOR ALL
  USING (agents.can_manage_ai_lenser(ai_lenser_id))
  WITH CHECK (agents.can_manage_ai_lenser(ai_lenser_id));

GRANT SELECT, INSERT, UPDATE, DELETE ON agents.workspace_settings TO authenticated, service_role;

-- ─── RPC: upsert settings ───────────────────────────────────────────────────
DROP FUNCTION IF EXISTS public.fn_update_workspace_settings(uuid, jsonb);
CREATE OR REPLACE FUNCTION public.fn_update_workspace_settings(
  p_ai_lenser_id uuid,
  p_patch        jsonb
)
RETURNS agents.workspace_settings
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, agents
AS $$
DECLARE
  v_row agents.workspace_settings;
BEGIN
  IF NOT agents.can_manage_ai_lenser(p_ai_lenser_id) THEN
    RAISE EXCEPTION 'not authorized for this agent' USING ERRCODE = '42501';
  END IF;

  INSERT INTO agents.workspace_settings (ai_lenser_id)
  VALUES (p_ai_lenser_id)
  ON CONFLICT (ai_lenser_id) DO NOTHING;

  UPDATE agents.workspace_settings
  SET default_model_id     = COALESCE((p_patch->>'default_model_id')::uuid,    default_model_id),
      default_provider_key = COALESCE(p_patch->>'default_provider_key',        default_provider_key),
      approval_default     = COALESCE(p_patch->>'approval_default',            approval_default),
      retention_days       = COALESCE((p_patch->>'retention_days')::int,       retention_days),
      max_daily_credits    = COALESCE((p_patch->>'max_daily_credits')::int,    max_daily_credits),
      webhooks             = COALESCE(p_patch->'webhooks',                     webhooks),
      api_access_enabled   = COALESCE((p_patch->>'api_access_enabled')::bool,  api_access_enabled),
      metadata             = COALESCE(p_patch->'metadata',                     metadata),
      updated_at           = now()
  WHERE ai_lenser_id = p_ai_lenser_id
  RETURNING * INTO v_row;

  RETURN v_row;
END;
$$;

GRANT EXECUTE ON FUNCTION public.fn_update_workspace_settings(uuid, jsonb) TO authenticated;

-- ─── RPC: export workspace as a json bundle ─────────────────────────────────
DROP FUNCTION IF EXISTS public.fn_export_workspace(uuid);
CREATE OR REPLACE FUNCTION public.fn_export_workspace(p_ai_lenser_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, agents
AS $$
DECLARE
  v_bundle jsonb;
BEGIN
  IF NOT agents.can_manage_ai_lenser(p_ai_lenser_id) THEN
    RAISE EXCEPTION 'not authorized for this agent' USING ERRCODE = '42501';
  END IF;

  SELECT jsonb_build_object(
    'ai_lenser',        to_jsonb(al),
    'settings',         to_jsonb(ws),
    'teams',            COALESCE((SELECT jsonb_agg(to_jsonb(t))  FROM agents.teams t  WHERE t.ai_lenser_id = al.id), '[]'::jsonb),
    'memory_profiles',  COALESCE((SELECT jsonb_agg(to_jsonb(m))  FROM agents.memory_profiles m WHERE m.ai_lenser_id = al.id), '[]'::jsonb),
    'personality',      COALESCE((SELECT jsonb_agg(to_jsonb(p))  FROM agents.personality_profiles p WHERE p.ai_lenser_id = al.id), '[]'::jsonb),
    'tool_profiles',    COALESCE((SELECT jsonb_agg(to_jsonb(tp)) FROM agents.tool_profiles tp WHERE tp.ai_lenser_id = al.id), '[]'::jsonb),
    'model_profiles',   COALESCE((SELECT jsonb_agg(to_jsonb(mp)) FROM agents.model_profiles mp WHERE mp.ai_lenser_id = al.id), '[]'::jsonb),
    'tool_assignments', COALESCE((SELECT jsonb_agg(to_jsonb(ta)) FROM agents.tool_assignments ta WHERE ta.ai_lenser_id = al.id), '[]'::jsonb),
    'exported_at',      now()
  )
  INTO v_bundle
  FROM agents.ai_lensers al
  LEFT JOIN agents.workspace_settings ws ON ws.ai_lenser_id = al.id
  WHERE al.id = p_ai_lenser_id;

  RETURN v_bundle;
END;
$$;

GRANT EXECUTE ON FUNCTION public.fn_export_workspace(uuid) TO authenticated;

-- ─── RPC: request deletion (soft-flag; manual review) ──────────────────────
DROP FUNCTION IF EXISTS public.fn_request_workspace_deletion(uuid, text);
CREATE OR REPLACE FUNCTION public.fn_request_workspace_deletion(
  p_ai_lenser_id uuid,
  p_reason       text DEFAULT NULL
)
RETURNS agents.workspace_settings
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, agents
AS $$
DECLARE
  v_row agents.workspace_settings;
BEGIN
  IF NOT agents.can_manage_ai_lenser(p_ai_lenser_id) THEN
    RAISE EXCEPTION 'not authorized for this agent' USING ERRCODE = '42501';
  END IF;

  INSERT INTO agents.workspace_settings (ai_lenser_id)
  VALUES (p_ai_lenser_id)
  ON CONFLICT (ai_lenser_id) DO NOTHING;

  UPDATE agents.workspace_settings
  SET metadata = metadata || jsonb_build_object(
        'deletion_requested_at', now(),
        'deletion_reason',       p_reason
      ),
      updated_at = now()
  WHERE ai_lenser_id = p_ai_lenser_id
  RETURNING * INTO v_row;

  RETURN v_row;
END;
$$;

GRANT EXECUTE ON FUNCTION public.fn_request_workspace_deletion(uuid, text) TO authenticated;

COMMENT ON TABLE agents.workspace_settings IS
  'Per-agent workspace settings: default model/provider, approval default, retention, daily budget, webhooks, API access. Owner-only via RLS.';
