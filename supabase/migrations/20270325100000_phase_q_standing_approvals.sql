-- Phase Q2: Standing approvals
--
-- Lets a workflow owner pre-approve a workflow / gate_kind for an AI lenser
-- so future scheduled dispatches that would otherwise be blocked on a human
-- approval pass through automatically until the standing approval expires
-- or is revoked.
--
-- Implementation strategy
--   * Owner-managed table agents.standing_approvals + helper function
--     agents.fn_has_standing_approval().
--   * Rather than re-defining the ~350-line lenses.fn_dispatch_scheduled_
--     workflows() (last redefined in 20270304000000), we install a BEFORE
--     INSERT trigger on agents.team_runs that flips approval_status from
--     'pending' to 'approved' when a standing approval matches. This runs
--     before the AFTER INSERT approval-webhook trigger (Phase K2 / P3),
--     whose WHEN clause is approval_status='pending' — so the webhook is
--     correctly skipped for pre-approved runs.
--   * Standing approvals can target a workflow_id, a gate_kind, or both.
--     gate_kind is read from team_runs.metadata->>'gate_kind'.
--   * Two RPCs let owners grant and revoke; both write agents.action_logs.
--
-- Action-log constraint
--   Extends action_logs_type_check to allow 'standing_approval_granted' and
--   'standing_approval_revoked'. Other allowed types are preserved verbatim.

-- ─── 1. Table ──────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS agents.standing_approvals (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  ai_lenser_id  uuid        NOT NULL REFERENCES agents.ai_lensers(id) ON DELETE CASCADE,
  workflow_id   uuid        REFERENCES lenses.workflows(id) ON DELETE CASCADE,
  gate_kind     text,
  expires_at    timestamptz,
  created_by    uuid        NOT NULL REFERENCES lensers.profiles(id),
  created_at    timestamptz NOT NULL DEFAULT now(),
  revoked_at    timestamptz,
  CONSTRAINT standing_approvals_target_required
    CHECK (workflow_id IS NOT NULL OR gate_kind IS NOT NULL)
);

ALTER TABLE agents.standing_approvals OWNER TO postgres;

CREATE INDEX IF NOT EXISTS idx_standing_approvals_active
  ON agents.standing_approvals (ai_lenser_id, workflow_id, gate_kind)
  WHERE revoked_at IS NULL;

COMMENT ON TABLE agents.standing_approvals IS
  'Phase Q2: pre-granted approvals for AI lenser workflow dispatches. '
  'A row matches when ai_lenser_id matches and (workflow_id or gate_kind) '
  'aligns. NULL expires_at means the approval never expires until revoked.';

-- ─── 2. RLS ────────────────────────────────────────────────────────────────

ALTER TABLE agents.standing_approvals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS standing_approvals_owner_all ON agents.standing_approvals;
CREATE POLICY standing_approvals_owner_all ON agents.standing_approvals
  FOR ALL
  TO authenticated
  USING (agents.can_manage_ai_lenser(ai_lenser_id))
  WITH CHECK (agents.can_manage_ai_lenser(ai_lenser_id));

GRANT SELECT, INSERT, UPDATE, DELETE
  ON TABLE agents.standing_approvals TO authenticated;

-- ─── 3. Helper: has-standing-approval ──────────────────────────────────────

CREATE OR REPLACE FUNCTION agents.fn_has_standing_approval(
  p_ai_lenser_id uuid,
  p_workflow_id  uuid,
  p_gate_kind    text
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = agents, public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM   agents.standing_approvals sa
    WHERE  sa.ai_lenser_id = p_ai_lenser_id
      AND  sa.revoked_at IS NULL
      AND  (sa.expires_at IS NULL OR sa.expires_at > now())
      AND  (
        (sa.workflow_id IS NOT NULL AND sa.workflow_id = p_workflow_id)
        OR (sa.gate_kind IS NOT NULL AND sa.gate_kind  = p_gate_kind)
      )
  );
$$;

ALTER FUNCTION agents.fn_has_standing_approval(uuid, uuid, text) OWNER TO postgres;

GRANT EXECUTE ON FUNCTION agents.fn_has_standing_approval(uuid, uuid, text)
  TO authenticated, service_role;

COMMENT ON FUNCTION agents.fn_has_standing_approval(uuid, uuid, text) IS
  'Phase Q2: returns true when a non-revoked, non-expired standing approval '
  'exists for (ai_lenser_id, workflow_id) or (ai_lenser_id, gate_kind).';

-- ─── 4. BEFORE INSERT trigger on team_runs ─────────────────────────────────
-- Flips approval_status pending -> approved when a standing approval matches.
-- Runs BEFORE the AFTER INSERT webhook trigger so the latter's WHEN clause
-- (approval_status='pending') correctly excludes the pre-approved row.

CREATE OR REPLACE FUNCTION agents.fn_apply_standing_approval()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = agents, public
AS $$
DECLARE
  v_gate_kind text;
BEGIN
  IF NEW.approval_status IS DISTINCT FROM 'pending' THEN
    RETURN NEW;
  END IF;

  v_gate_kind := NEW.metadata->>'gate_kind';

  IF agents.fn_has_standing_approval(NEW.ai_lenser_id, NEW.workflow_id, v_gate_kind) THEN
    NEW.approval_status := 'approved';
    -- 'queued' is the canonical post-approval status used elsewhere in the
    -- pipeline (see fn_dispatch_scheduled_workflows). Only flip when the
    -- caller left it at the blocked-on-approval default.
    IF NEW.status = 'blocked' THEN
      NEW.status := 'queued';
    END IF;
    NEW.metadata := COALESCE(NEW.metadata, '{}'::jsonb)
      || jsonb_build_object('standing_approval_used', true);
  END IF;

  RETURN NEW;
END;
$$;

ALTER FUNCTION agents.fn_apply_standing_approval() OWNER TO postgres;

COMMENT ON FUNCTION agents.fn_apply_standing_approval() IS
  'Phase Q2: BEFORE INSERT trigger on agents.team_runs. Promotes pending '
  'rows to approved when agents.fn_has_standing_approval() matches; sets '
  'metadata.standing_approval_used=true and unblocks the run.';

DROP TRIGGER IF EXISTS trg_team_runs_apply_standing_approval ON agents.team_runs;

CREATE TRIGGER trg_team_runs_apply_standing_approval
  BEFORE INSERT ON agents.team_runs
  FOR EACH ROW
  WHEN (NEW.approval_status = 'pending')
  EXECUTE FUNCTION agents.fn_apply_standing_approval();

-- ─── 5. action_logs constraint extension ───────────────────────────────────
-- Preserve every previously allowed value (see 20260503070000 fix), then add
-- the two new entries.

ALTER TABLE agents.action_logs
  DROP CONSTRAINT IF EXISTS action_logs_type_check,
  ADD CONSTRAINT action_logs_type_check CHECK (
    action_type = ANY (ARRAY[
      'join_battle', 'cast_vote', 'submit_entry', 'create_battle', 'spend_credits',
      'dispatch_schedule', 'schedule_skipped', 'policy_updated',
      'run_lens', 'run_workflow', 'pause_schedule', 'resume_schedule',
      'binding_updated',
      'standing_approval_granted', 'standing_approval_revoked'
    ])
  );

-- ─── 6. RPCs: grant / revoke ───────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.fn_grant_standing_approval(
  p_ai_lenser_id uuid,
  p_workflow_id  uuid    DEFAULT NULL,
  p_gate_kind    text    DEFAULT NULL,
  p_hours        int     DEFAULT 24
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, agents
AS $$
DECLARE
  v_caller     uuid := lensers.get_auth_lenser_id();
  v_id         uuid;
  v_expires    timestamptz;
BEGIN
  IF v_caller IS NULL THEN
    RAISE EXCEPTION 'not_authenticated' USING ERRCODE = '42501';
  END IF;

  IF NOT agents.can_manage_ai_lenser(p_ai_lenser_id) THEN
    RAISE EXCEPTION 'not_owner_of_ai_lenser' USING ERRCODE = '42501';
  END IF;

  IF p_workflow_id IS NULL AND (p_gate_kind IS NULL OR length(trim(p_gate_kind)) = 0) THEN
    RAISE EXCEPTION 'standing approval requires workflow_id or gate_kind' USING ERRCODE = '22023';
  END IF;

  v_expires := CASE
    WHEN p_hours IS NULL OR p_hours <= 0 THEN NULL
    ELSE now() + (p_hours::text || ' hours')::interval
  END;

  INSERT INTO agents.standing_approvals (
    ai_lenser_id, workflow_id, gate_kind, expires_at, created_by
  ) VALUES (
    p_ai_lenser_id, p_workflow_id, NULLIF(trim(p_gate_kind), ''), v_expires, v_caller
  )
  RETURNING id INTO v_id;

  INSERT INTO agents.action_logs (
    ai_lenser_id, action_type, result, metadata
  ) VALUES (
    p_ai_lenser_id,
    'standing_approval_granted',
    'success',
    jsonb_build_object(
      'standing_approval_id', v_id,
      'workflow_id',          p_workflow_id,
      'gate_kind',            NULLIF(trim(p_gate_kind), ''),
      'expires_at',            v_expires,
      'granted_by',            v_caller
    )
  );

  RETURN v_id;
END;
$$;

ALTER FUNCTION public.fn_grant_standing_approval(uuid, uuid, text, int) OWNER TO postgres;

GRANT EXECUTE ON FUNCTION public.fn_grant_standing_approval(uuid, uuid, text, int)
  TO authenticated;

COMMENT ON FUNCTION public.fn_grant_standing_approval(uuid, uuid, text, int) IS
  'Phase Q2: grants a standing approval for an AI lenser. p_hours<=0 or NULL '
  'means no expiry. Returns the standing_approvals.id. Owner-only via '
  'agents.can_manage_ai_lenser; writes an action_logs entry.';

CREATE OR REPLACE FUNCTION public.fn_revoke_standing_approval(p_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, agents
AS $$
DECLARE
  v_caller       uuid := lensers.get_auth_lenser_id();
  v_ai_lenser_id uuid;
BEGIN
  IF v_caller IS NULL THEN
    RAISE EXCEPTION 'not_authenticated' USING ERRCODE = '42501';
  END IF;

  SELECT ai_lenser_id INTO v_ai_lenser_id
  FROM   agents.standing_approvals
  WHERE  id = p_id;

  IF v_ai_lenser_id IS NULL THEN
    RAISE EXCEPTION 'standing_approval_not_found' USING ERRCODE = 'P0002';
  END IF;

  IF NOT agents.can_manage_ai_lenser(v_ai_lenser_id) THEN
    RAISE EXCEPTION 'not_owner_of_ai_lenser' USING ERRCODE = '42501';
  END IF;

  UPDATE agents.standing_approvals
  SET    revoked_at = now()
  WHERE  id = p_id
    AND  revoked_at IS NULL;

  INSERT INTO agents.action_logs (
    ai_lenser_id, action_type, result, metadata
  ) VALUES (
    v_ai_lenser_id,
    'standing_approval_revoked',
    'success',
    jsonb_build_object(
      'standing_approval_id', p_id,
      'revoked_by',           v_caller
    )
  );
END;
$$;

ALTER FUNCTION public.fn_revoke_standing_approval(uuid) OWNER TO postgres;

GRANT EXECUTE ON FUNCTION public.fn_revoke_standing_approval(uuid)
  TO authenticated;

COMMENT ON FUNCTION public.fn_revoke_standing_approval(uuid) IS
  'Phase Q2: revokes a standing approval (sets revoked_at=now()). Owner-only; '
  'writes an action_logs entry.';
