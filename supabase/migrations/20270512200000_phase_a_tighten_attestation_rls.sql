-- Phase A (Trust Gateway): tighten RLS on execution.attestations and
-- execution.trust_evaluations.
--
-- Background:
--   The original 20270511400000_execution_attestations_and_trust.sql migration
--   shipped two policies that are too permissive:
--
--     * attestations_owner_select — only checks that the caller has a profile,
--       not that the run actually belongs to them.
--     * trust_evals_public_select — `USING (true)` exposes every submission's
--       trust evaluation to every authenticated caller.
--
--   RFC-0003 §6 (Gaps to repair) and security-rules.md require ownership-based
--   access; trust evaluations should be exposed only via the existing
--   fn_get_submission_trust function. We close both gaps without breaking the
--   existing CLI surface (which already routes via the function).

-- ─── 1. Tighten attestations_owner_select ─────────────────────────────────────
-- Caller must own the run that the attestation references. Ownership flows
-- through execution.requests.requester_lenser_id (the canonical run-owner column).

DROP POLICY IF EXISTS "attestations_owner_select" ON execution.attestations;

CREATE POLICY "attestations_owner_select" ON execution.attestations
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
        FROM execution.runs r
        JOIN execution.requests req ON req.id = r.request_id
        JOIN lensers.profiles p     ON p.id   = req.requester_lenser_id
       WHERE r.id = execution.attestations.run_id
         AND p.user_id = auth.uid()
    )
  );

-- ─── 2. Tighten trust_evals_public_select ─────────────────────────────────────
-- Drop the "USING (true)" policy. Direct table reads are no longer permitted.
-- Consumers must use execution.fn_get_submission_trust which performs the
-- caller-scoped check. Service-role retains full read for back-office tooling.

DROP POLICY IF EXISTS "trust_evals_public_select" ON execution.trust_evaluations;

CREATE POLICY "trust_evals_owner_select" ON execution.trust_evaluations
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
        FROM battles.submissions s
        JOIN execution.runs r       ON r.id   = s.execution_run_id
        JOIN execution.requests req ON req.id = r.request_id
        JOIN lensers.profiles p     ON p.id   = req.requester_lenser_id
       WHERE s.id = execution.trust_evaluations.submission_id
         AND p.user_id = auth.uid()
    )
  );

-- ─── 3. Re-grant function so it remains the canonical read path ───────────────
-- (idempotent — original migration already granted; this re-asserts intent
-- and lets fn_get_submission_trust return rows for anonymous viewers when
-- the submission is part of a public battle.)

GRANT EXECUTE ON FUNCTION execution.fn_get_submission_trust(UUID) TO authenticated, anon;

-- ─── 4. Optional convenience: harden fn_get_submission_trust ─────────────────
-- Wrap the trust read so that anon callers see a redacted shape (only
-- trust_level + evaluated_at), authenticated owners see full factors.

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
SET search_path = execution, battles, lensers, public, extensions
AS $$
DECLARE
  v_caller_lenser_id UUID;
  v_owner_lenser_id  UUID;
BEGIN
  SELECT lp.id INTO v_caller_lenser_id
  FROM lensers.profiles lp
  WHERE lp.user_id = auth.uid()
  LIMIT 1;

  SELECT req.requester_lenser_id INTO v_owner_lenser_id
  FROM battles.submissions s
  JOIN execution.runs r       ON r.id   = s.execution_run_id
  JOIN execution.requests req ON req.id = r.request_id
  WHERE s.id = p_submission_id
  LIMIT 1;

  RETURN QUERY
  SELECT
    te.submission_id,
    te.trust_level,
    CASE
      WHEN v_caller_lenser_id IS NOT NULL
       AND v_caller_lenser_id = v_owner_lenser_id THEN te.factors
      ELSE jsonb_build_object('redacted', true)
    END AS factors,
    CASE
      WHEN v_caller_lenser_id IS NOT NULL
       AND v_caller_lenser_id = v_owner_lenser_id THEN te.attestation_id
      ELSE NULL::UUID
    END AS attestation_id,
    te.evaluated_at
  FROM execution.trust_evaluations te
  WHERE te.submission_id = p_submission_id;
END;
$$;

GRANT EXECUTE ON FUNCTION execution.fn_get_submission_trust(UUID) TO authenticated, anon;

COMMENT ON FUNCTION execution.fn_get_submission_trust(UUID) IS
  'Phase A (RFC-0003): owner-scoped read of submission trust. Anonymous and '
  'non-owner callers receive a redacted factors object. Direct table reads '
  'are no longer permitted by RLS.';
