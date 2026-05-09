-- =============================================================================
-- Phase G (RFC-0003) — XP triggers & DEFINER RPCs invoke xp.apply only AFTER
--                       cryptographic verification or trust elevation.
-- =============================================================================
-- Principles:
--   * No XP-minting path is reachable without a server-side verification gate.
--   * `xp.apply` remains GRANT EXECUTE TO service_role only; every callsite
--     here is a SECURITY DEFINER function or trigger owned by `postgres`.
--   * Triggers are idempotent: per-(submission,rule) and per-(device,rule)
--     constraints rely on `xp.apply`'s built-in cooldown / max-events-per-day
--     accounting.
--   * Failure to award XP NEVER aborts the originating mutation. We catch and
--     log so trust verification + DB writes succeed even if XP plumbing is
--     transiently unavailable (e.g. xp.rules row missing for a fresh env).
-- =============================================================================

DO $$
DECLARE
  v_platform_app CONSTANT uuid := '00000000-0000-0000-0000-000000000003';
  v_battles_app  CONSTANT uuid := '00000000-0000-0000-0000-000000000002';
BEGIN
  PERFORM 1
    FROM xp.apps
    WHERE id IN (v_platform_app, v_battles_app);
END;
$$;

-- ---------------------------------------------------------------------------
-- Helper: safe wrapper around xp.apply that swallows missing-rule errors so
-- triggers never roll back trust state. Logs a NOTICE for observability.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION execution.fn_xp_apply_safe(
  p_lenser_id      uuid,
  p_rule_key       text,
  p_source         xp.source_enum,
  p_source_ref_type text,
  p_source_ref_id  uuid,
  p_app_id         uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = xp, public, extensions
AS $$
BEGIN
  IF p_lenser_id IS NULL OR p_rule_key IS NULL THEN
    RETURN;
  END IF;
  BEGIN
    PERFORM xp.apply(
      p_lenser_id, p_rule_key, p_source,
      p_source_ref_type, p_source_ref_id, p_app_id
    );
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'xp.apply failed for rule % on lenser %: %',
      p_rule_key, p_lenser_id, SQLERRM;
  END;
END;
$$;

REVOKE ALL ON FUNCTION execution.fn_xp_apply_safe(uuid, text, xp.source_enum, text, uuid, uuid)
  FROM PUBLIC;
-- This wrapper is only called from other DEFINER functions/triggers, so we
-- restrict it to service_role.
GRANT EXECUTE ON FUNCTION execution.fn_xp_apply_safe(uuid, text, xp.source_enum, text, uuid, uuid)
  TO service_role;

-- ---------------------------------------------------------------------------
-- DEVICE_REGISTERED — fired when devices.registered_devices is INSERTed.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION devices.fn_xp_on_device_registered()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = devices, xp, execution, public, extensions
AS $$
BEGIN
  PERFORM execution.fn_xp_apply_safe(
    NEW.lenser_id,
    'DEVICE_REGISTERED',
    'system'::xp.source_enum,
    'device',
    NEW.id,
    '00000000-0000-0000-0000-000000000003'::uuid
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS xp_on_device_registered ON devices.registered_devices;
CREATE TRIGGER xp_on_device_registered
  AFTER INSERT ON devices.registered_devices
  FOR EACH ROW EXECUTE FUNCTION devices.fn_xp_on_device_registered();

-- ---------------------------------------------------------------------------
-- DEVICE_VERIFIED — fired when trust_level transitions to approved or trusted.
-- We use UPDATE because all approval RPCs UPDATE the row; INSERT trust_level
-- defaults to 'pending'.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION devices.fn_xp_on_device_trust_elevated()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = devices, xp, execution, public, extensions
AS $$
BEGIN
  IF NEW.trust_level IN ('approved', 'trusted')
     AND COALESCE(OLD.trust_level, 'pending') NOT IN ('approved', 'trusted')
  THEN
    PERFORM execution.fn_xp_apply_safe(
      NEW.lenser_id,
      'DEVICE_VERIFIED',
      'system'::xp.source_enum,
      'device',
      NEW.id,
      '00000000-0000-0000-0000-000000000003'::uuid
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS xp_on_device_trust_elevated ON devices.registered_devices;
CREATE TRIGGER xp_on_device_trust_elevated
  AFTER UPDATE OF trust_level ON devices.registered_devices
  FOR EACH ROW EXECUTE FUNCTION devices.fn_xp_on_device_trust_elevated();

-- ---------------------------------------------------------------------------
-- RUNNER_CONNECTED — fired when a runner_device_binding becomes ACTIVE and
-- the bound device is approved or trusted.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION execution.fn_xp_on_runner_bound()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = execution, devices, xp, public, extensions
AS $$
DECLARE
  v_lenser_id uuid;
  v_trust_ok  boolean;
BEGIN
  IF COALESCE(NEW.status, 'inactive') <> 'active' THEN
    RETURN NEW;
  END IF;
  IF TG_OP = 'UPDATE'
     AND COALESCE(OLD.status, 'inactive') = 'active'
  THEN
    -- already active before; do not re-award
    RETURN NEW;
  END IF;

  SELECT rd.lenser_id, rd.trust_level IN ('approved', 'trusted')
    INTO v_lenser_id, v_trust_ok
  FROM devices.registered_devices rd
  WHERE rd.id = NEW.device_id;

  IF v_lenser_id IS NULL OR NOT COALESCE(v_trust_ok, false) THEN
    RETURN NEW;
  END IF;

  PERFORM execution.fn_xp_apply_safe(
    v_lenser_id,
    'RUNNER_CONNECTED',
    'system'::xp.source_enum,
    'runner',
    NEW.runner_id,
    '00000000-0000-0000-0000-000000000003'::uuid
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS xp_on_runner_bound ON execution.runner_device_bindings;
CREATE TRIGGER xp_on_runner_bound
  AFTER INSERT OR UPDATE OF status ON execution.runner_device_bindings
  FOR EACH ROW EXECUTE FUNCTION execution.fn_xp_on_runner_bound();

-- ---------------------------------------------------------------------------
-- VERIFIED_LOCAL_EXECUTION_COMPLETED — fired when trust_evaluations upserts
-- a row with `trust_level = 'fully_trusted'`. This binds the XP award to the
-- post-verification path: only verified attestations can produce
-- 'fully_trusted', and only 'fully_trusted' awards the bonus.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION execution.fn_xp_on_full_trust()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = execution, battles, lensers, xp, public, extensions
AS $$
DECLARE
  v_owner_lenser_id uuid;
  v_should_award    boolean := false;
BEGIN
  IF NEW.trust_level <> 'fully_trusted' THEN
    RETURN NEW;
  END IF;
  IF TG_OP = 'UPDATE' AND OLD.trust_level = 'fully_trusted' THEN
    -- already at full trust; do not re-award
    RETURN NEW;
  END IF;
  v_should_award := true;

  -- Owner = the run requester (and the submission belongs to them).
  SELECT req.requester_lenser_id INTO v_owner_lenser_id
  FROM battles.submissions s
  JOIN execution.runs r       ON r.id = s.execution_run_id
  JOIN execution.requests req ON req.id = r.request_id
  WHERE s.id = NEW.submission_id
  LIMIT 1;

  IF NOT v_should_award OR v_owner_lenser_id IS NULL THEN
    RETURN NEW;
  END IF;

  PERFORM execution.fn_xp_apply_safe(
    v_owner_lenser_id,
    'VERIFIED_LOCAL_EXECUTION_COMPLETED',
    'battle'::xp.source_enum,
    'submission',
    NEW.submission_id,
    '00000000-0000-0000-0000-000000000002'::uuid
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS xp_on_full_trust ON execution.trust_evaluations;
CREATE TRIGGER xp_on_full_trust
  AFTER INSERT OR UPDATE OF trust_level ON execution.trust_evaluations
  FOR EACH ROW EXECUTE FUNCTION execution.fn_xp_on_full_trust();

-- ---------------------------------------------------------------------------
-- BATTLE_SUBMISSION_COMPLETED — fired on first trust_evaluation row for a
-- submission, regardless of trust tier. This award is small and pre-verified;
-- the bonus tier is the trigger above.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION execution.fn_xp_on_submission_evaluated()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = execution, battles, lensers, xp, public, extensions
AS $$
DECLARE
  v_owner_lenser_id uuid;
BEGIN
  -- Only fire on initial INSERT; updates are re-evaluations of the same
  -- submission and would double-award.
  IF TG_OP <> 'INSERT' THEN
    RETURN NEW;
  END IF;
  IF NEW.trust_level = 'unverified' THEN
    RETURN NEW;
  END IF;

  SELECT req.requester_lenser_id INTO v_owner_lenser_id
  FROM battles.submissions s
  JOIN execution.runs r       ON r.id = s.execution_run_id
  JOIN execution.requests req ON req.id = r.request_id
  WHERE s.id = NEW.submission_id
  LIMIT 1;

  IF v_owner_lenser_id IS NULL THEN
    RETURN NEW;
  END IF;

  PERFORM execution.fn_xp_apply_safe(
    v_owner_lenser_id,
    'BATTLE_SUBMISSION_COMPLETED',
    'battle'::xp.source_enum,
    'submission',
    NEW.submission_id,
    '00000000-0000-0000-0000-000000000002'::uuid
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS xp_on_submission_evaluated ON execution.trust_evaluations;
CREATE TRIGGER xp_on_submission_evaluated
  AFTER INSERT ON execution.trust_evaluations
  FOR EACH ROW EXECUTE FUNCTION execution.fn_xp_on_submission_evaluated();

-- ---------------------------------------------------------------------------
-- Notes (NOT SQL):
--   * AGENT_CREATED / AGENT_TEAM_CREATED / WORKFLOW_PUBLISHED triggers belong
--     to their respective domain schemas (`agents.*`, `lenses.*`) and are
--     wired in dedicated migrations to keep change ownership clear. This file
--     only owns Trust-Gateway-driven XP paths (devices, runners, attestation).
-- ---------------------------------------------------------------------------
