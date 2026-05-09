-- =============================================================================
-- 20260424000000_agent_personality.sql
-- -----------------------------------------------------------------------------
-- Adds personality_note to agents.ai_lensers so each AI agent can carry a
-- free-text role/tone/behavior description that is injected alongside the
-- default lens system prompt at agent runtime.
-- Also exposes fn_update_agent_personality for owner-only updates.
-- =============================================================================

-- ─── 1. Add personality_note column ─────────────────────────────────────────

ALTER TABLE agents.ai_lensers
  ADD COLUMN IF NOT EXISTS personality_note text;

COMMENT ON COLUMN agents.ai_lensers.personality_note IS
  'Free-text role/tone/behavior description authored by the agent owner. Injected as meta-context alongside the default lens system prompt at agent runtime.';

-- ─── 2. Rebuild v_agent_profile to expose personality_note ──────────────────

DROP VIEW IF EXISTS agents.v_agent_profile;

CREATE OR REPLACE VIEW agents.v_agent_profile AS
 SELECT a.id,
    a.id AS ai_lenser_id,
    a.profile_id,
    p.handle,
    p.display_name,
    p.avatar_url,
    p.type AS lenser_type,
    a.runtime_pref,
    a.is_active,
    a.suspended_at,
    a.suspended_reason,
    a.personality_note,
    a.created_at,
    pol.can_join_battles,
    pol.can_vote,
    pol.can_create_battles,
    pol.can_receive_sponsorship,
    pol.model_binding_mode,
    pol.max_daily_battles,
    pol.max_daily_votes,
    pol.spending_limit_credits,
    pol.allowed_battle_types,
    pol.is_public_policy,
    (SELECT COUNT(*) FROM agents.model_bindings mb WHERE mb.ai_lenser_id = a.id) AS model_count,
    (SELECT COUNT(*) FROM agents.lens_bindings lb WHERE lb.ai_lenser_id = a.id) AS lens_count,
    COALESCE(qs.battles_used, 0) AS battles_used,
    COALESCE(qs.votes_used, 0) AS votes_used,
    COALESCE(qs.credits_spent, 0::bigint) AS credits_spent,
    own.owner_lenser_id,
    op.handle AS owner_handle,
    op.display_name AS owner_display_name,
    op.avatar_url AS owner_avatar_url
   FROM agents.ai_lensers a
     JOIN lensers.profiles p ON p.id = a.profile_id
     LEFT JOIN agents.policies pol ON pol.ai_lenser_id = a.id
     LEFT JOIN agents.quota_snapshots qs ON qs.ai_lenser_id = a.id AND qs.period_date = CURRENT_DATE
     LEFT JOIN agents.ownerships own ON own.ai_lenser_id = a.id AND own.role = 'owner'::text AND own.revoked_at IS NULL
     LEFT JOIN lensers.profiles op ON op.id = own.owner_lenser_id;

ALTER VIEW agents.v_agent_profile OWNER TO postgres;

COMMENT ON VIEW agents.v_agent_profile IS
  'Full AI Lenser management profile. Exposes personality_note alongside policy, quota, and ownership fields for the AI workspace management UI.';

-- ─── 3. Owner-only personality update RPC ───────────────────────────────────

CREATE OR REPLACE FUNCTION public.fn_update_agent_personality(
  p_ai_lenser_id uuid,
  p_personality_note text
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'agents', 'lensers'
AS $$
DECLARE
  v_caller_human_id uuid;
BEGIN
  v_caller_human_id := lensers.get_auth_human_lenser_id();
  IF v_caller_human_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM agents.ownerships o
    WHERE o.ai_lenser_id = p_ai_lenser_id
      AND o.owner_lenser_id = v_caller_human_id
      AND o.role IN ('owner', 'co_owner')
      AND o.revoked_at IS NULL
  ) THEN
    RAISE EXCEPTION 'Forbidden: you do not own this AI lenser'
      USING ERRCODE = '42501';
  END IF;

  UPDATE agents.ai_lensers
  SET personality_note = p_personality_note
  WHERE id = p_ai_lenser_id;
END;
$$;

ALTER FUNCTION public.fn_update_agent_personality(uuid, text) OWNER TO postgres;

COMMENT ON FUNCTION public.fn_update_agent_personality(uuid, text) IS
  'Owner-only update of an AI lenser personality_note. Authorizes via the human lenser ownership record.';

GRANT EXECUTE ON FUNCTION public.fn_update_agent_personality(uuid, text) TO authenticated, service_role;
