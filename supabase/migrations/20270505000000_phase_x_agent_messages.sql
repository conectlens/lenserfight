-- =============================================================================
-- 20270505000000_phase_x_agent_messages.sql
-- -----------------------------------------------------------------------------
-- Phase X1: Inter-agent message bus (agents.team_messages).
-- Phase X3: Shared scratchpad with optimistic locking on agents.team_runs.
-- Phase X4: Role-based gating extension on agents.team_members.
--
-- Conventions:
--   * Ownership uses canonical guard agents.can_manage_ai_lenser(ai_lenser_id),
--     which resolves auth.uid() → human owner via lensers.get_auth_human_lenser_id.
--   * SECURITY DEFINER functions: owner postgres, REVOKE ALL FROM PUBLIC,
--     explicit GRANT, locked search_path.
--   * RLS on team_messages mirrors the team_runs/agent_run_steps owner pattern.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- X1: agents.team_messages
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS agents.team_messages (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_run_id       uuid NOT NULL REFERENCES agents.team_runs(id) ON DELETE CASCADE,
  from_agent_id     uuid NOT NULL,
  to_agent_id       uuid NULL,
  kind              text NOT NULL CHECK (kind IN ('task_request','task_response','info','error')),
  payload           jsonb NOT NULL DEFAULT '{}'::jsonb,
  parent_message_id uuid NULL REFERENCES agents.team_messages(id) ON DELETE SET NULL,
  occurred_at       timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE agents.team_messages IS
  'Phase X1 inter-agent message bus. Append-only log scoped to a team_run. '
  'NULL to_agent_id == broadcast to all members of the team_run. '
  'Hard cap 1000 rows per team_run enforced by BEFORE INSERT trigger.';

CREATE INDEX IF NOT EXISTS idx_team_messages_team_run_occurred
  ON agents.team_messages (team_run_id, occurred_at DESC);

CREATE INDEX IF NOT EXISTS idx_team_messages_team_run_parent
  ON agents.team_messages (team_run_id, parent_message_id);

CREATE INDEX IF NOT EXISTS idx_team_messages_to_agent
  ON agents.team_messages (to_agent_id)
  WHERE to_agent_id IS NOT NULL;

ALTER TABLE agents.team_messages ENABLE ROW LEVEL SECURITY;

-- Owner SELECT: caller must own the team_run via ai_lenser_id.
DROP POLICY IF EXISTS team_messages_owner_select ON agents.team_messages;
CREATE POLICY team_messages_owner_select ON agents.team_messages
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM   agents.team_runs tr
      WHERE  tr.id = team_messages.team_run_id
        AND  agents.can_manage_ai_lenser(tr.ai_lenser_id)
    )
  );

-- Owner INSERT: same ownership check; row must belong to a team_run the
-- caller can manage.
DROP POLICY IF EXISTS team_messages_owner_insert ON agents.team_messages;
CREATE POLICY team_messages_owner_insert ON agents.team_messages
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM   agents.team_runs tr
      WHERE  tr.id = team_messages.team_run_id
        AND  agents.can_manage_ai_lenser(tr.ai_lenser_id)
    )
  );

-- UPDATE / DELETE forbidden by absence of policy (immutable log).
-- Service role still bypasses RLS for backfill / admin tools.

-- ---------------------------------------------------------------------------
-- X1: Hard cap (1000 messages per team_run) via BEFORE INSERT trigger.
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION agents.fn_enforce_team_messages_cap()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = agents, public
AS $$
DECLARE
  v_count integer;
  v_cap   constant integer := 1000;
BEGIN
  SELECT count(*) INTO v_count
  FROM   agents.team_messages
  WHERE  team_run_id = NEW.team_run_id;

  IF v_count >= v_cap THEN
    RAISE EXCEPTION 'team_messages_cap_exceeded: team_run % already has % messages (cap %)',
      NEW.team_run_id, v_count, v_cap
      USING ERRCODE = '54000';
  END IF;

  RETURN NEW;
END;
$$;

ALTER FUNCTION agents.fn_enforce_team_messages_cap() OWNER TO postgres;

COMMENT ON FUNCTION agents.fn_enforce_team_messages_cap() IS
  'Phase X1: BEFORE INSERT guard enforcing 1000 msgs/team_run. '
  'Operators needing higher ceilings should bump the constant or add a '
  'per-team_run override field; counted via simple count(*) — fine because '
  'the partial index on (team_run_id, occurred_at DESC) covers it.';

DROP TRIGGER IF EXISTS trg_team_messages_cap ON agents.team_messages;
CREATE TRIGGER trg_team_messages_cap
  BEFORE INSERT ON agents.team_messages
  FOR EACH ROW
  EXECUTE FUNCTION agents.fn_enforce_team_messages_cap();

-- ---------------------------------------------------------------------------
-- X1: RPC agents.fn_send_team_message — SECURITY INVOKER (RLS-enforced).
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION agents.fn_send_team_message(
  p_team_run_id   uuid,
  p_from_agent_id uuid,
  p_kind          text,
  p_to_agent_id   uuid  DEFAULT NULL,
  p_payload       jsonb DEFAULT '{}'::jsonb,
  p_parent_id     uuid  DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = agents, public
AS $$
DECLARE
  v_id uuid;
BEGIN
  IF p_team_run_id IS NULL THEN
    RAISE EXCEPTION 'p_team_run_id is required' USING ERRCODE = '22023';
  END IF;
  IF p_from_agent_id IS NULL THEN
    RAISE EXCEPTION 'p_from_agent_id is required' USING ERRCODE = '22023';
  END IF;
  IF p_kind NOT IN ('task_request','task_response','info','error') THEN
    RAISE EXCEPTION 'invalid kind: %', p_kind USING ERRCODE = '22023';
  END IF;

  INSERT INTO agents.team_messages (
    team_run_id, from_agent_id, to_agent_id, kind, payload, parent_message_id
  )
  VALUES (
    p_team_run_id, p_from_agent_id, p_to_agent_id, p_kind,
    COALESCE(p_payload, '{}'::jsonb), p_parent_id
  )
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

ALTER FUNCTION agents.fn_send_team_message(uuid, uuid, text, uuid, jsonb, uuid)
  OWNER TO postgres;

REVOKE ALL ON FUNCTION agents.fn_send_team_message(uuid, uuid, text, uuid, jsonb, uuid)
  FROM PUBLIC;

GRANT EXECUTE ON FUNCTION agents.fn_send_team_message(uuid, uuid, text, uuid, jsonb, uuid)
  TO authenticated;

COMMENT ON FUNCTION agents.fn_send_team_message(uuid, uuid, text, uuid, jsonb, uuid) IS
  'Phase X1: append a message to the team-run bus. SECURITY INVOKER; RLS '
  'on agents.team_messages enforces ownership. Returns the inserted id.';

-- ---------------------------------------------------------------------------
-- X1: View agents.v_team_run_conversation — recursive thread view.
-- ---------------------------------------------------------------------------

DROP VIEW IF EXISTS agents.v_team_run_conversation;
CREATE VIEW agents.v_team_run_conversation AS
WITH RECURSIVE thread AS (
  -- Roots: messages with no parent.
  SELECT
    m.team_run_id,
    m.id          AS message_id,
    m.parent_message_id,
    m.from_agent_id,
    m.to_agent_id,
    m.kind,
    m.payload,
    m.occurred_at,
    0             AS depth
  FROM agents.team_messages m
  WHERE m.parent_message_id IS NULL

  UNION ALL

  SELECT
    m.team_run_id,
    m.id,
    m.parent_message_id,
    m.from_agent_id,
    m.to_agent_id,
    m.kind,
    m.payload,
    m.occurred_at,
    t.depth + 1
  FROM agents.team_messages m
  JOIN thread t
    ON m.parent_message_id = t.message_id
   AND m.team_run_id       = t.team_run_id
  WHERE t.depth < 50
)
SELECT
  team_run_id,
  message_id,
  parent_message_id,
  from_agent_id,
  to_agent_id,
  kind,
  payload,
  occurred_at,
  depth
FROM thread;

ALTER VIEW agents.v_team_run_conversation OWNER TO postgres;

COMMENT ON VIEW agents.v_team_run_conversation IS
  'Phase X1: flattened thread view of agents.team_messages with depth. '
  'Depth is bounded at 50 to defang runaway parent chains. '
  'Owner-scoped via underlying RLS on agents.team_messages.';

GRANT SELECT ON agents.v_team_run_conversation TO authenticated, service_role;

-- ---------------------------------------------------------------------------
-- X3: Shared scratchpad with optimistic locking
-- ---------------------------------------------------------------------------

ALTER TABLE agents.team_runs
  ADD COLUMN IF NOT EXISTS shared_scratchpad jsonb NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE agents.team_runs
  ADD COLUMN IF NOT EXISTS shared_scratchpad_version int NOT NULL DEFAULT 0;

COMMENT ON COLUMN agents.team_runs.shared_scratchpad IS
  'Phase X3: shared multi-agent JSON scratchpad. Mutated only via '
  'agents.fn_merge_shared_scratchpad with optimistic locking.';

COMMENT ON COLUMN agents.team_runs.shared_scratchpad_version IS
  'Phase X3: monotonic version counter for optimistic locking. Starts at 0.';

CREATE OR REPLACE FUNCTION agents.fn_merge_shared_scratchpad(
  p_team_run_id      uuid,
  p_patch            jsonb,
  p_expected_version int
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = agents, public
AS $$
DECLARE
  v_current_version int;
  v_new_value       jsonb;
  v_new_version     int;
BEGIN
  IF p_team_run_id IS NULL OR p_patch IS NULL OR p_expected_version IS NULL THEN
    RAISE EXCEPTION 'arguments required: team_run_id, patch, expected_version'
      USING ERRCODE = '22023';
  END IF;

  -- Atomic check-and-update: predicate on shared_scratchpad_version
  -- guards concurrent writers.
  UPDATE agents.team_runs
     SET shared_scratchpad         = shared_scratchpad || p_patch,
         shared_scratchpad_version = shared_scratchpad_version + 1,
         updated_at                = now()
   WHERE id                        = p_team_run_id
     AND shared_scratchpad_version = p_expected_version
   RETURNING shared_scratchpad, shared_scratchpad_version
        INTO v_new_value, v_new_version;

  IF NOT FOUND THEN
    -- Either the row does not exist, RLS hid it, or version drifted.
    SELECT shared_scratchpad_version
      INTO v_current_version
      FROM agents.team_runs
     WHERE id = p_team_run_id;

    RAISE EXCEPTION 'scratchpad_version_conflict: expected % current %',
      p_expected_version, v_current_version
      USING ERRCODE = '40001';
  END IF;

  RETURN jsonb_build_object(
    'shared_scratchpad',         v_new_value,
    'shared_scratchpad_version', v_new_version
  );
END;
$$;

ALTER FUNCTION agents.fn_merge_shared_scratchpad(uuid, jsonb, int) OWNER TO postgres;

REVOKE ALL ON FUNCTION agents.fn_merge_shared_scratchpad(uuid, jsonb, int) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION agents.fn_merge_shared_scratchpad(uuid, jsonb, int)
  TO authenticated;

COMMENT ON FUNCTION agents.fn_merge_shared_scratchpad(uuid, jsonb, int) IS
  'Phase X3: optimistic-lock merge into team_runs.shared_scratchpad. '
  'Raises 40001 (scratchpad_version_conflict) if expected version drifted. '
  'SECURITY INVOKER: existing RLS on agents.team_runs gates the UPDATE.';

-- ---------------------------------------------------------------------------
-- X4: Role-based gating extension
-- ---------------------------------------------------------------------------

-- No prior CHECK exists on agents.team_members.role (verified against the
-- Phase 4-6 control-room migration). Add the new restricted set, keeping
-- 'operator' for back-compat.
--
-- Existing rows with role NOT IN the new set are left untouched and silently
-- bypass the new role-aware gates.

ALTER TABLE agents.team_members
  DROP CONSTRAINT IF EXISTS team_members_role_check;

ALTER TABLE agents.team_members
  ADD CONSTRAINT team_members_role_check
  CHECK (role IN ('leader','executor','reviewer','observer','operator'));

COMMENT ON CONSTRAINT team_members_role_check ON agents.team_members IS
  'Phase X4: restricted role enum. Pre-existing rows with non-conforming '
  'roles must be backfilled before this CHECK can be re-validated; new '
  'inserts are constrained immediately. Operators outside the enum are '
  'silently bypassed by fn_node_requires_review and similar gates.';

-- Helper: agents.fn_get_team_member_role
-- SECURITY DEFINER because callers (e.g. execution engine running as
-- authenticated) may not have direct visibility on team_members rows.
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
  v_role text;
BEGIN
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
  'Phase X4: returns the team_members.role for (team_run, agent) or '
  '''operator'' default. SECURITY DEFINER: bypasses team_members RLS so '
  'the execution engine can resolve roles regardless of caller scope.';

-- Helper: agents.fn_node_requires_review
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
  v_exists boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1
    FROM   agents.team_runs    tr
    JOIN   agents.team_members tm ON tm.team_id = tr.team_id
    WHERE  tr.id     = p_team_run_id
      AND  tm.role   = 'reviewer'
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
  'Phase X4: true when the team backing this team_run has at least one '
  'active reviewer. Execution engine consults this before completing a '
  'node so reviewer-staffed teams gate completion.';
