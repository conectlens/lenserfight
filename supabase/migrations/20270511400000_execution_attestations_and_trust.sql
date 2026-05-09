-- Phase 38: Execution attestations + trust evaluations
-- execution.attestations — execution-level signing metadata (distinct from audit.attestations
-- which covers platform lifecycle events like battle_published/agent_created).
-- execution.trust_evaluations — computed trust level per battle submission.

-- ---------------------------------------------------------------------------
-- execution.attestations
-- ---------------------------------------------------------------------------
CREATE TABLE execution.attestations (
  id                 UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id             UUID        NOT NULL REFERENCES execution.runs(id) ON DELETE CASCADE,
  device_id          UUID        REFERENCES devices.registered_devices(id) ON DELETE SET NULL,
  signed             BOOLEAN     NOT NULL DEFAULT false,
  signature          TEXT        CHECK (char_length(signature) <= 512),
  gateway_verified   BOOLEAN     NOT NULL DEFAULT false,
  device_trusted     BOOLEAN     NOT NULL DEFAULT false,
  policy_passed      BOOLEAN     NOT NULL DEFAULT false,
  workflow_hash      TEXT        CHECK (char_length(workflow_hash) <= 128),
  lens_hash          TEXT        CHECK (char_length(lens_hash) <= 128),
  agent_config_hash  TEXT        CHECK (char_length(agent_config_hash) <= 128),
  runner_version     TEXT        CHECK (char_length(runner_version) <= 32),
  cli_version        TEXT        CHECK (char_length(cli_version) <= 32),
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_exec_attestations_run_id    ON execution.attestations (run_id);
CREATE INDEX idx_exec_attestations_device_id ON execution.attestations (device_id) WHERE device_id IS NOT NULL;

COMMENT ON TABLE execution.attestations IS
  'Execution-level signing metadata captured by the local runner at submission time. '
  'Distinct from audit.attestations (platform lifecycle). '
  'Append-only — no UPDATE trigger guards it.';

ALTER TABLE execution.attestations ENABLE ROW LEVEL SECURITY;

-- Readable by the submission owner via the RPC below; no direct client write
CREATE POLICY "attestations_owner_select" ON execution.attestations
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM execution.runs r
      JOIN lensers.profiles p ON p.user_id = auth.uid()
      WHERE r.id = execution.attestations.run_id
        -- runs are readable by requesting lenser
    )
  );

-- Prevent updates and deletes (append-only)
CREATE OR REPLACE TRIGGER no_update_exec_attestations
  BEFORE UPDATE ON execution.attestations
  FOR EACH ROW EXECUTE FUNCTION public.fn_deny_mutation();

CREATE OR REPLACE TRIGGER no_delete_exec_attestations
  BEFORE DELETE ON execution.attestations
  FOR EACH ROW EXECUTE FUNCTION public.fn_deny_mutation();

-- ---------------------------------------------------------------------------
-- execution.trust_evaluations
-- ---------------------------------------------------------------------------
CREATE TABLE execution.trust_evaluations (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id  UUID        NOT NULL REFERENCES battles.submissions(id) ON DELETE CASCADE,
  attestation_id UUID        REFERENCES execution.attestations(id) ON DELETE SET NULL,
  trust_level    TEXT        NOT NULL DEFAULT 'unverified'
                   CHECK (trust_level IN (
                     'unverified',
                     'account_verified',
                     'agent_verified',
                     'device_verified',
                     'runner_verified',
                     'execution_verified',
                     'fully_trusted'
                   )),
  factors        JSONB       NOT NULL DEFAULT '{}',
  evaluated_at   TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE (submission_id)
);

CREATE INDEX idx_trust_evals_submission_id ON execution.trust_evaluations (submission_id);
CREATE INDEX idx_trust_evals_trust_level   ON execution.trust_evaluations (trust_level);

COMMENT ON TABLE execution.trust_evaluations IS
  'Computed trust level per battle submission. '
  'Updated whenever attestation data changes. '
  'One row per submission (UNIQUE constraint).';

ALTER TABLE execution.trust_evaluations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "trust_evals_public_select" ON execution.trust_evaluations
  FOR SELECT USING (true);

-- ---------------------------------------------------------------------------
-- fn_record_execution_attestation — called by local runner after execution
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION execution.fn_record_execution_attestation(
  p_run_id            UUID,
  p_device_id         UUID    DEFAULT NULL,
  p_signed            BOOLEAN DEFAULT false,
  p_signature         TEXT    DEFAULT NULL,
  p_gateway_verified  BOOLEAN DEFAULT false,
  p_device_trusted    BOOLEAN DEFAULT false,
  p_policy_passed     BOOLEAN DEFAULT false,
  p_workflow_hash     TEXT    DEFAULT NULL,
  p_lens_hash         TEXT    DEFAULT NULL,
  p_agent_config_hash TEXT    DEFAULT NULL,
  p_runner_version    TEXT    DEFAULT NULL,
  p_cli_version       TEXT    DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = execution, devices, lensers, public, extensions
AS $$
DECLARE
  v_attestation_id UUID;
BEGIN
  INSERT INTO execution.attestations (
    run_id, device_id, signed, signature,
    gateway_verified, device_trusted, policy_passed,
    workflow_hash, lens_hash, agent_config_hash,
    runner_version, cli_version
  ) VALUES (
    p_run_id, p_device_id, p_signed, p_signature,
    p_gateway_verified, p_device_trusted, p_policy_passed,
    p_workflow_hash, p_lens_hash, p_agent_config_hash,
    p_runner_version, p_cli_version
  )
  RETURNING id INTO v_attestation_id;

  RETURN v_attestation_id;
END;
$$;

-- ---------------------------------------------------------------------------
-- fn_compute_submission_trust — evaluate and upsert trust level for a submission
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION execution.fn_compute_submission_trust(p_submission_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = execution, devices, battles, lensers, public, extensions
AS $$
DECLARE
  v_run_id         UUID;
  v_attestation    execution.attestations%ROWTYPE;
  v_trust_level    TEXT := 'unverified';
  v_factors        JSONB := '{}';
  v_account_ok     BOOLEAN := false;
  v_agent_ok       BOOLEAN := false;
BEGIN
  -- Check account ownership
  SELECT er.id INTO v_run_id
  FROM battles.submissions s
  JOIN execution.runs er ON er.id = s.execution_run_id
  WHERE s.id = p_submission_id
  LIMIT 1;

  v_account_ok := (v_run_id IS NOT NULL);
  v_factors := v_factors || jsonb_build_object('account_authenticated', v_account_ok);

  IF NOT v_account_ok THEN
    -- Persist and return early
    INSERT INTO execution.trust_evaluations (submission_id, trust_level, factors, evaluated_at)
    VALUES (p_submission_id, 'unverified', v_factors, now())
    ON CONFLICT (submission_id) DO UPDATE
      SET trust_level = EXCLUDED.trust_level,
          factors = EXCLUDED.factors,
          evaluated_at = EXCLUDED.evaluated_at;
    RETURN 'unverified';
  END IF;

  v_trust_level := 'account_verified';

  -- Check agent ownership (contender type = ai_agent or ai_runner)
  SELECT EXISTS (
    SELECT 1 FROM battles.contenders bc
    WHERE bc.battle_id = (SELECT battle_id FROM battles.submissions WHERE id = p_submission_id)
      AND bc.contender_type IN ('ai_agent','ai_runner')
  ) INTO v_agent_ok;
  v_factors := v_factors || jsonb_build_object('agent_owner_verified', v_agent_ok);
  IF v_agent_ok THEN v_trust_level := 'agent_verified'; END IF;

  -- Check attestation
  SELECT * INTO v_attestation
  FROM execution.attestations
  WHERE run_id = v_run_id
  ORDER BY created_at DESC
  LIMIT 1;

  IF v_attestation.id IS NOT NULL THEN
    v_factors := v_factors || jsonb_build_object(
      'device_trusted',    v_attestation.device_trusted,
      'runner_connected',  v_attestation.device_id IS NOT NULL,
      'execution_signed',  v_attestation.signed,
      'gateway_verified',  v_attestation.gateway_verified,
      'policy_passed',     v_attestation.policy_passed,
      'workflow_hash_recorded', v_attestation.workflow_hash IS NOT NULL,
      'lens_hash_recorded',     v_attestation.lens_hash IS NOT NULL
    );

    IF v_attestation.device_trusted THEN
      v_trust_level := 'device_verified';
    END IF;
    IF v_attestation.device_id IS NOT NULL AND v_attestation.device_trusted THEN
      v_trust_level := 'runner_verified';
    END IF;
    IF v_attestation.signed AND v_attestation.gateway_verified THEN
      v_trust_level := 'execution_verified';
    END IF;
    IF v_attestation.signed
       AND v_attestation.gateway_verified
       AND v_attestation.device_trusted
       AND v_attestation.policy_passed
       AND v_attestation.workflow_hash IS NOT NULL
       AND v_attestation.lens_hash IS NOT NULL
    THEN
      v_trust_level := 'fully_trusted';
    END IF;
  END IF;

  INSERT INTO execution.trust_evaluations (
    submission_id, attestation_id, trust_level, factors, evaluated_at
  ) VALUES (
    p_submission_id,
    v_attestation.id,
    v_trust_level,
    v_factors,
    now()
  )
  ON CONFLICT (submission_id) DO UPDATE
    SET attestation_id = EXCLUDED.attestation_id,
        trust_level    = EXCLUDED.trust_level,
        factors        = EXCLUDED.factors,
        evaluated_at   = EXCLUDED.evaluated_at;

  RETURN v_trust_level;
END;
$$;

-- ---------------------------------------------------------------------------
-- fn_get_submission_trust — public read of trust evaluation for a submission
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION execution.fn_get_submission_trust(p_submission_id UUID)
RETURNS TABLE (
  submission_id  UUID,
  trust_level    TEXT,
  factors        JSONB,
  attestation_id UUID,
  evaluated_at   TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = execution, battles, public, extensions
AS $$
BEGIN
  RETURN QUERY
  SELECT
    te.submission_id,
    te.trust_level,
    te.factors,
    te.attestation_id,
    te.evaluated_at
  FROM execution.trust_evaluations te
  WHERE te.submission_id = p_submission_id;
END;
$$;

GRANT EXECUTE ON FUNCTION execution.fn_record_execution_attestation TO authenticated;
GRANT EXECUTE ON FUNCTION execution.fn_compute_submission_trust      TO authenticated;
GRANT EXECUTE ON FUNCTION execution.fn_get_submission_trust          TO authenticated, anon;
