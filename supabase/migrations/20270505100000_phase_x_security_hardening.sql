-- =============================================================================
-- 20270505100000_phase_x_security_hardening.sql
-- -----------------------------------------------------------------------------
-- Hardening follow-up to 20270505000000_phase_x_agent_messages.sql.
--
-- Critical fixes:
--   1. SECURITY DEFINER role helpers (fn_get_team_member_role,
--      fn_node_requires_review) leaked role/team-membership info to any
--      authenticated caller because they bypass team_members RLS without an
--      ownership guard. Wrap with agents.can_manage_ai_lenser(team_run.owner)
--      so strangers probing arbitrary (team_run_id, agent_id) tuples cannot
--      learn role assignments across tenants.
--   2. team_messages_owner_insert did not enforce that from_agent_id belongs
--      to the team backing the team_run. Tighten WITH CHECK so an owner
--      cannot forge a message attributed to an agent that is not a member of
--      that team's roster.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Fix #1: scope SECURITY DEFINER role helpers to the calling owner.
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION agents.fn_get_team_member_role(
  p_team_run_id uuid,
  p_agent_id    uuid
)
RETURNS text
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = agents, public
AS $$
DECLARE
  v_role          text;
  v_ai_lenser_id  uuid;
  v_is_service    boolean := (current_setting('request.jwt.claim.role', true) = 'service_role');
BEGIN
  SELECT tr.ai_lenser_id
    INTO v_ai_lenser_id
    FROM agents.team_runs tr
   WHERE tr.id = p_team_run_id;

  IF v_ai_lenser_id IS NULL THEN
    -- Unknown team_run — do not distinguish from "not yours".
    RETURN 'operator';
  END IF;

  -- Service role keeps full access for the execution engine.
  IF NOT v_is_service AND NOT agents.can_manage_ai_lenser(v_ai_lenser_id) THEN
    RETURN 'operator';
  END IF;

  SELECT tm.role
    INTO v_role
    FROM agents.team_runs    tr
    JOIN agents.team_members tm
      ON tm.team_id  = tr.team_id
     AND tm.agent_id = p_agent_id
   WHERE tr.id = p_team_run_id
   LIMIT 1;

  RETURN COALESCE(v_role, 'operator');
END;
$$;

ALTER FUNCTION agents.fn_get_team_member_role(uuid, uuid) OWNER TO postgres;
REVOKE ALL ON FUNCTION agents.fn_get_team_member_role(uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION agents.fn_get_team_member_role(uuid, uuid)
  TO authenticated, service_role;

COMMENT ON FUNCTION agents.fn_get_team_member_role(uuid, uuid) IS
  'Phase X4 (hardened): returns role only when caller owns the team_run or is '
  'service_role. Strangers probing arbitrary IDs receive ''operator'' and learn '
  'nothing about cross-tenant team membership.';


CREATE OR REPLACE FUNCTION agents.fn_node_requires_review(
  p_team_run_id uuid
)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = agents, public
AS $$
DECLARE
  v_exists        boolean;
  v_ai_lenser_id  uuid;
  v_is_service    boolean := (current_setting('request.jwt.claim.role', true) = 'service_role');
BEGIN
  SELECT tr.ai_lenser_id
    INTO v_ai_lenser_id
    FROM agents.team_runs tr
   WHERE tr.id = p_team_run_id;

  IF v_ai_lenser_id IS NULL THEN
    RETURN false;
  END IF;

  IF NOT v_is_service AND NOT agents.can_manage_ai_lenser(v_ai_lenser_id) THEN
    RETURN false;
  END IF;

  SELECT EXISTS (
    SELECT 1
    FROM   agents.team_runs    tr
    JOIN   agents.team_members tm ON tm.team_id = tr.team_id
    WHERE  tr.id        = p_team_run_id
      AND  tm.role      = 'reviewer'
      AND  tm.is_active = true
  )
  INTO v_exists;

  RETURN COALESCE(v_exists, false);
END;
$$;

ALTER FUNCTION agents.fn_node_requires_review(uuid) OWNER TO postgres;
REVOKE ALL ON FUNCTION agents.fn_node_requires_review(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION agents.fn_node_requires_review(uuid)
  TO authenticated, service_role;

COMMENT ON FUNCTION agents.fn_node_requires_review(uuid) IS
  'Phase X4 (hardened): true only when caller owns the team_run (or is '
  'service_role) AND the team has an active reviewer. Returns false to '
  'strangers regardless of true state.';

-- ---------------------------------------------------------------------------
-- Fix #2: tighten team_messages INSERT — from_agent_id must be on the roster.
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS team_messages_owner_insert ON agents.team_messages;
CREATE POLICY team_messages_owner_insert ON agents.team_messages
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM   agents.team_runs    tr
      JOIN   agents.team_members tm
        ON   tm.team_id  = tr.team_id
       AND   tm.agent_id = team_messages.from_agent_id
      WHERE  tr.id = team_messages.team_run_id
        AND  agents.can_manage_ai_lenser(tr.ai_lenser_id)
    )
  );

COMMENT ON POLICY team_messages_owner_insert ON agents.team_messages IS
  'Phase X1 (hardened): owner may INSERT only if from_agent_id is a member of '
  'the team backing the team_run. Prevents forged sender attribution.';

-- ---------------------------------------------------------------------------
-- Fix #3: ensure agents.v_team_run_conversation enforces RLS as the caller.
-- Postgres-owned views default to security_invoker=off, which bypasses RLS on
-- agents.team_messages. Pin the view to security_invoker=on so SELECT through
-- the view honors the caller's RLS context (PG15+ feature).
-- ---------------------------------------------------------------------------

ALTER VIEW agents.v_team_run_conversation SET (security_invoker = on);

COMMENT ON VIEW agents.v_team_run_conversation IS
  'Phase X1 (hardened): security_invoker=on. SELECT through this view is '
  'evaluated under the caller''s RLS context against agents.team_messages.';
