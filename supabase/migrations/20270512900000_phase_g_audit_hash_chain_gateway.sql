-- =============================================================================
-- Phase G+ (RFC-0003) — extend audit.hash_chains with `chain_kind = 'gateway'`
--                       so device trust transitions, attestation verifications,
--                       and daemon lifecycle events are tamper-evident.
-- =============================================================================
-- Goals:
--   1. Add `chain_kind`, `subject_lenser_id`, `subject_device_id` columns so
--      we can scope chains per-subject without joining audit.events.
--   2. Provide `audit.fn_append_gateway_event(...)` that wraps log_event_v2
--      and chains the result by computing
--      payload_hash = sha256(prev_hash || canonical_payload).
--   3. Wire triggers on:
--        - devices.registered_devices (insert + trust_level update),
--        - execution.attestation_verifications (insert).
--      Each trigger appends one row to the gateway chain for its lenser.
--   4. Provide `audit.fn_chain_verify(p_lenser_id, p_chain_kind)` for incident
--      response — walks the chain and verifies every link.
--
-- Constraints:
--   - audit.hash_chains.event_id is NOT NULL — we always create an audit.events
--     row first via audit.log_event_v2().
--   - Append-only: trigger fn_deny_mutation guards UPDATE/DELETE.
--   - Chain failures NEVER abort the originating mutation: helpers swallow
--     and emit RAISE NOTICE so trust state is preserved if extensions.digest()
--     is briefly unavailable.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. Schema changes on audit.hash_chains
-- ---------------------------------------------------------------------------
ALTER TABLE audit.hash_chains
  ADD COLUMN IF NOT EXISTS chain_kind         TEXT
    NOT NULL DEFAULT 'event'
    CHECK (chain_kind IN ('event', 'gateway')),
  ADD COLUMN IF NOT EXISTS subject_lenser_id  UUID,
  ADD COLUMN IF NOT EXISTS subject_device_id  UUID,
  ADD COLUMN IF NOT EXISTS sub_sequence_no    BIGINT;

CREATE INDEX IF NOT EXISTS idx_hash_chains_kind_subject_seq
  ON audit.hash_chains (chain_kind, subject_lenser_id, sub_sequence_no DESC)
  WHERE chain_kind = 'gateway';

COMMENT ON COLUMN audit.hash_chains.chain_kind IS
  'Logical chain identifier. ''event'' is the original global chain. ''gateway'' '
  'scopes per-Lenser sub-chains for Trust-Gateway events (device registration, '
  'trust elevation, attestation verification, daemon lifecycle).';
COMMENT ON COLUMN audit.hash_chains.sub_sequence_no IS
  'Per-(chain_kind, subject_lenser_id) monotonic sequence. NULL for legacy '
  '''event'' chain where global sequence_no is the source of truth.';

-- Append-only guards (additive; existing chain may already have these).
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgrelid = 'audit.hash_chains'::regclass
      AND tgname = 'no_update_audit_hash_chains'
  ) THEN
    CREATE TRIGGER no_update_audit_hash_chains
      BEFORE UPDATE ON audit.hash_chains
      FOR EACH ROW EXECUTE FUNCTION public.fn_deny_mutation();
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgrelid = 'audit.hash_chains'::regclass
      AND tgname = 'no_delete_audit_hash_chains'
  ) THEN
    CREATE TRIGGER no_delete_audit_hash_chains
      BEFORE DELETE ON audit.hash_chains
      FOR EACH ROW EXECUTE FUNCTION public.fn_deny_mutation();
  END IF;
END;
$$;

-- ---------------------------------------------------------------------------
-- 2. fn_append_gateway_event — wrap log_event_v2 + append to gateway chain
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION audit.fn_append_gateway_event(
  p_event_type     TEXT,
  p_lenser_id      UUID,
  p_device_id      UUID,
  p_payload        JSONB
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = audit, devices, public, extensions
AS $$
DECLARE
  v_event_id    UUID;
  v_prev_hash   TEXT;
  v_payload_hex TEXT;
  v_seq         BIGINT;
  v_sub_seq     BIGINT;
  v_canonical   TEXT;
  v_chain_id    UUID;
BEGIN
  IF p_event_type IS NULL OR p_lenser_id IS NULL THEN
    RAISE EXCEPTION 'invalid_input' USING ERRCODE = '22023';
  END IF;

  -- 2a. Insert the underlying audit.events row.
  v_event_id := audit.log_event_v2(
    p_event_type      := p_event_type,
    p_actor_type      := 'lenser',
    p_actor_id        := p_lenser_id,
    p_entity_schema   := CASE WHEN p_device_id IS NOT NULL THEN 'devices' END,
    p_entity_table    := CASE WHEN p_device_id IS NOT NULL THEN 'registered_devices' END,
    p_entity_id       := p_device_id,
    p_payload         := COALESCE(p_payload, '{}'::jsonb),
    p_severity        := 'info'
  );

  -- 2b. Compute prev_hash from the latest gateway-chain row for this lenser.
  SELECT payload_hash, sub_sequence_no
    INTO v_prev_hash, v_sub_seq
  FROM audit.hash_chains
  WHERE chain_kind = 'gateway'
    AND subject_lenser_id = p_lenser_id
  ORDER BY sub_sequence_no DESC NULLS LAST
  LIMIT 1;

  v_sub_seq := COALESCE(v_sub_seq, 0) + 1;

  -- 2c. Canonical payload — JSON object with stable field ordering. We rely on
  --     jsonb_build_object's deterministic key order (alphabetical insertion)
  --     and jsonb_strip_nulls to keep the chain reproducible.
  v_canonical := jsonb_strip_nulls(jsonb_build_object(
    'event_id',      v_event_id,
    'event_type',    p_event_type,
    'lenser_id',     p_lenser_id,
    'device_id',     p_device_id,
    'payload',       COALESCE(p_payload, '{}'::jsonb),
    'sub_seq',       v_sub_seq
  ))::text;

  v_payload_hex := encode(
    extensions.digest(
      COALESCE(v_prev_hash, '') || v_canonical, 'sha256'
    ),
    'hex'
  );

  -- 2d. Allocate global sequence_no (advisory lock keeps it monotonic).
  PERFORM pg_advisory_xact_lock(hashtext('audit.hash_chains.sequence_no')::bigint);
  SELECT COALESCE(MAX(sequence_no), 0) + 1 INTO v_seq FROM audit.hash_chains;

  INSERT INTO audit.hash_chains (
    event_id, prev_hash, payload_hash, sequence_no,
    chain_kind, subject_lenser_id, subject_device_id, sub_sequence_no
  ) VALUES (
    v_event_id, v_prev_hash, v_payload_hex, v_seq,
    'gateway', p_lenser_id, p_device_id, v_sub_seq
  )
  RETURNING id INTO v_chain_id;

  RETURN v_chain_id;
END;
$$;

REVOKE ALL ON FUNCTION audit.fn_append_gateway_event(TEXT, UUID, UUID, JSONB)
  FROM PUBLIC;
GRANT EXECUTE ON FUNCTION audit.fn_append_gateway_event(TEXT, UUID, UUID, JSONB)
  TO service_role;

COMMENT ON FUNCTION audit.fn_append_gateway_event IS
  'Append a Trust-Gateway event to audit.events AND chain it on the per-Lenser '
  'gateway sub-chain. Used by triggers on devices.registered_devices and '
  'execution.attestation_verifications.';

-- Safe wrapper used by triggers — never aborts the originating mutation.
CREATE OR REPLACE FUNCTION audit.fn_append_gateway_event_safe(
  p_event_type     TEXT,
  p_lenser_id      UUID,
  p_device_id      UUID,
  p_payload        JSONB
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = audit, public
AS $$
BEGIN
  BEGIN
    PERFORM audit.fn_append_gateway_event(p_event_type, p_lenser_id, p_device_id, p_payload);
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'gateway hash chain append failed (%): %', p_event_type, SQLERRM;
  END;
END;
$$;

REVOKE ALL ON FUNCTION audit.fn_append_gateway_event_safe(TEXT, UUID, UUID, JSONB)
  FROM PUBLIC;
GRANT EXECUTE ON FUNCTION audit.fn_append_gateway_event_safe(TEXT, UUID, UUID, JSONB)
  TO service_role;

-- ---------------------------------------------------------------------------
-- 3. Triggers
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION devices.fn_chain_on_device_registered()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = devices, audit, public
AS $$
BEGIN
  PERFORM audit.fn_append_gateway_event_safe(
    'GATEWAY_DEVICE_REGISTERED',
    NEW.lenser_id,
    NEW.id,
    jsonb_build_object(
      'name',          NEW.name,
      'device_type',   NEW.device_type,
      'os',            NEW.os,
      'cli_version',   NEW.cli_version
    )
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS chain_on_device_registered ON devices.registered_devices;
CREATE TRIGGER chain_on_device_registered
  AFTER INSERT ON devices.registered_devices
  FOR EACH ROW EXECUTE FUNCTION devices.fn_chain_on_device_registered();

CREATE OR REPLACE FUNCTION devices.fn_chain_on_device_trust_changed()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = devices, audit, public
AS $$
BEGIN
  IF NEW.trust_level IS DISTINCT FROM OLD.trust_level THEN
    PERFORM audit.fn_append_gateway_event_safe(
      'GATEWAY_DEVICE_TRUST_CHANGED',
      NEW.lenser_id,
      NEW.id,
      jsonb_build_object(
        'from', OLD.trust_level,
        'to',   NEW.trust_level
      )
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS chain_on_device_trust_changed ON devices.registered_devices;
CREATE TRIGGER chain_on_device_trust_changed
  AFTER UPDATE OF trust_level ON devices.registered_devices
  FOR EACH ROW EXECUTE FUNCTION devices.fn_chain_on_device_trust_changed();

CREATE OR REPLACE FUNCTION execution.fn_chain_on_attestation_verified()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = execution, devices, audit, public
AS $$
DECLARE
  v_lenser_id UUID;
BEGIN
  SELECT rd.lenser_id INTO v_lenser_id
  FROM devices.registered_devices rd
  WHERE rd.id = NEW.device_id;

  IF v_lenser_id IS NULL THEN
    RETURN NEW;
  END IF;

  PERFORM audit.fn_append_gateway_event_safe(
    CASE WHEN NEW.verified
         THEN 'GATEWAY_ATTESTATION_VERIFIED'
         ELSE 'GATEWAY_ATTESTATION_REJECTED'
    END,
    v_lenser_id,
    NEW.device_id,
    jsonb_build_object(
      'attestation_id', NEW.attestation_id,
      'envelope_kid',   NEW.envelope_kid,
      'envelope_iat',   NEW.envelope_iat,
      'invalid_reason', NEW.invalid_reason
    )
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS chain_on_attestation_verified
  ON execution.attestation_verifications;
CREATE TRIGGER chain_on_attestation_verified
  AFTER INSERT ON execution.attestation_verifications
  FOR EACH ROW EXECUTE FUNCTION execution.fn_chain_on_attestation_verified();

-- ---------------------------------------------------------------------------
-- 4. fn_chain_verify — walk the gateway chain for a Lenser and assert each
--    link's payload_hash matches sha256(prev_hash || canonical(row)).
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION audit.fn_chain_verify(
  p_lenser_id UUID,
  p_chain_kind TEXT DEFAULT 'gateway'
)
RETURNS TABLE (
  ok                BOOLEAN,
  total_rows        BIGINT,
  first_break_id    UUID,
  first_break_seq   BIGINT,
  reason            TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = audit, public, extensions
AS $$
DECLARE
  v_row             audit.hash_chains%ROWTYPE;
  v_event           audit.events%ROWTYPE;
  v_prev_hash       TEXT;
  v_canonical       TEXT;
  v_expected_hash   TEXT;
  v_total           BIGINT := 0;
  v_break_id        UUID;
  v_break_seq       BIGINT;
  v_break_reason    TEXT;
BEGIN
  IF p_chain_kind NOT IN ('gateway') THEN
    RAISE EXCEPTION 'unsupported_chain_kind';
  END IF;

  v_prev_hash := NULL;
  FOR v_row IN
    SELECT *
    FROM audit.hash_chains
    WHERE chain_kind = p_chain_kind
      AND subject_lenser_id = p_lenser_id
    ORDER BY sub_sequence_no ASC
  LOOP
    v_total := v_total + 1;
    SELECT * INTO v_event FROM audit.events WHERE id = v_row.event_id;
    IF v_event.id IS NULL THEN
      v_break_id := v_row.id;
      v_break_seq := v_row.sub_sequence_no;
      v_break_reason := 'event_missing';
      EXIT;
    END IF;

    v_canonical := jsonb_strip_nulls(jsonb_build_object(
      'event_id',   v_event.id,
      'event_type', v_event.event_type,
      'lenser_id',  v_row.subject_lenser_id,
      'device_id',  v_row.subject_device_id,
      'payload',    v_event.payload,
      'sub_seq',    v_row.sub_sequence_no
    ))::text;

    v_expected_hash := encode(
      extensions.digest(COALESCE(v_prev_hash, '') || v_canonical, 'sha256'),
      'hex'
    );

    IF v_expected_hash IS DISTINCT FROM v_row.payload_hash THEN
      v_break_id := v_row.id;
      v_break_seq := v_row.sub_sequence_no;
      v_break_reason := 'payload_hash_mismatch';
      EXIT;
    END IF;
    IF COALESCE(v_row.prev_hash, '') IS DISTINCT FROM COALESCE(v_prev_hash, '') THEN
      v_break_id := v_row.id;
      v_break_seq := v_row.sub_sequence_no;
      v_break_reason := 'prev_hash_mismatch';
      EXIT;
    END IF;

    v_prev_hash := v_row.payload_hash;
  END LOOP;

  IF v_break_id IS NULL THEN
    RETURN QUERY SELECT true, v_total, NULL::UUID, NULL::BIGINT, NULL::TEXT;
  ELSE
    RETURN QUERY SELECT false, v_total, v_break_id, v_break_seq, v_break_reason;
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION audit.fn_chain_verify(UUID, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION audit.fn_chain_verify(UUID, TEXT)
  TO authenticated, service_role;

COMMENT ON FUNCTION audit.fn_chain_verify IS
  'Walk the gateway hash chain for a Lenser and verify every link. Returns '
  '(ok, total_rows, first_break_id, first_break_seq, reason). Read-only.';
