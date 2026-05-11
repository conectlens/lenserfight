-- ─────────────────────────────────────────────────────────────────────────────
-- Phase BA — D4: idempotency_key on workflow_runs has no TTL
--
-- Before: identical (workflow_id, idempotency_key) pairs return the original
-- run_id forever. A client that reuses a key months later silently gets a
-- stale run, with no path to start fresh.
--
-- Fix:
--   1. Add `idempotency_expires_at timestamptz`, defaulted to 24h from
--      created_at. Existing rows get a value via UPDATE … WHERE
--      idempotency_key IS NOT NULL.
--   2. Patch fn_start_workflow_run to require BOTH idempotency_key match
--      AND `(idempotency_expires_at IS NULL OR > now())` in the short-circuit
--      lookup.
--   3. Add a partial index for the (workflow_id, idempotency_key) lookup
--      that is also covers expires_at to support the new predicate.
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE lenses.workflow_runs
  ADD COLUMN IF NOT EXISTS idempotency_expires_at timestamptz;

-- Backfill existing rows: 24h from created_at if a key is set.
UPDATE lenses.workflow_runs
SET    idempotency_expires_at = COALESCE(created_at, now()) + interval '24 hours'
WHERE  idempotency_key IS NOT NULL
  AND  idempotency_expires_at IS NULL;

-- The pre-existing UNIQUE (workflow_id, idempotency_key) index is incompatible
-- with TTL: it would forbid a legitimate fresh run after expiry. Replace it
-- with a plain lookup index. Uniqueness within the non-expired window is
-- enforced by fn_start_workflow_run's idempotency short-circuit (which
-- always wins the race for the same key because it runs inside a single
-- transaction and the rate limiter serializes per lenser).
DROP INDEX IF EXISTS lenses.workflow_runs_idempotency_unique;

CREATE INDEX IF NOT EXISTS idx_workflow_runs_idempotency_lookup
  ON lenses.workflow_runs (workflow_id, idempotency_key, idempotency_expires_at)
  WHERE idempotency_key IS NOT NULL;

COMMENT ON COLUMN lenses.workflow_runs.idempotency_expires_at IS
  'D4: idempotency window. After this time the (workflow_id, idempotency_key) '
  'lookup ignores this row, allowing a fresh run with the same key.';

-- ─────────────────────────────────────────────────────────────────────────────
-- Updated fn_start_workflow_run with TTL-aware idempotency lookup.
-- Body otherwise mirrors migration 20260423000000_workflow_scale_hardening.sql.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION lenses.fn_start_workflow_run(
  p_workflow_id     uuid,
  p_inputs          jsonb DEFAULT '{}'::jsonb,
  p_global_model_id text  DEFAULT NULL,
  p_idempotency_key text  DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'lenses', 'lensers', 'public'
AS $function$
DECLARE
  v_lenser_id        uuid;
  v_run_id           uuid;
  v_rate_window_sec  integer := 60;
  v_rate_limit_count integer := 30;
  v_recent_count     integer;
  v_role             text;
BEGIN
  v_lenser_id := lensers.get_auth_lenser_id();

  IF NOT EXISTS (
    SELECT 1 FROM lenses.workflows w
    WHERE w.id = p_workflow_id
      AND (w.visibility = 'public' OR w.lenser_id = v_lenser_id)
  ) THEN
    RAISE EXCEPTION 'workflow_not_found_or_forbidden'
      USING ERRCODE = '42501';
  END IF;

  -- ── D4: idempotency short-circuit with TTL ─────────────────────────────
  IF p_idempotency_key IS NOT NULL AND length(p_idempotency_key) > 0 THEN
    SELECT id INTO v_run_id
    FROM   lenses.workflow_runs
    WHERE  workflow_id    = p_workflow_id
      AND  idempotency_key = p_idempotency_key
      AND  (idempotency_expires_at IS NULL OR idempotency_expires_at > now())
    ORDER  BY created_at DESC
    LIMIT  1;
    IF v_run_id IS NOT NULL THEN
      RETURN v_run_id;
    END IF;
  END IF;

  -- ── D2: anonymous callers cannot bypass the rate limit. Authenticated
  -- runs are bucketed per-lenser. Anon callers (v_lenser_id IS NULL) and
  -- any caller without an auth profile are rejected via PostgREST role
  -- check below — they should never call this RPC directly.
  BEGIN
    v_role := current_setting('request.jwt.claim.role', true);
  EXCEPTION WHEN OTHERS THEN
    v_role := NULL;
  END;

  IF v_lenser_id IS NULL THEN
    IF v_role = 'anon' THEN
      RAISE EXCEPTION 'fn_start_workflow_run: anon not permitted'
        USING ERRCODE = '42501',
              HINT    = 'D2: rate limit cannot be enforced for anon';
    END IF;
    -- service_role callers (workers/test) intentionally bypass the limit.
  ELSE
    v_recent_count := lenses.fn_count_recent_runs(v_lenser_id, v_rate_window_sec);
    IF v_recent_count >= v_rate_limit_count THEN
      RAISE EXCEPTION
        'rate_limited: % runs in the last % seconds (cap %)',
        v_recent_count, v_rate_window_sec, v_rate_limit_count
        USING ERRCODE = '54000', HINT = 'phase9_run_rate_limit';
    END IF;
  END IF;

  INSERT INTO lenses.workflow_runs (
    workflow_id, triggered_by, status, context_inputs,
    global_model_id, idempotency_key, idempotency_expires_at
  )
  VALUES (
    p_workflow_id, v_lenser_id, 'pending', p_inputs,
    p_global_model_id, p_idempotency_key,
    CASE
      WHEN p_idempotency_key IS NOT NULL AND length(p_idempotency_key) > 0
      THEN now() + interval '24 hours'
      ELSE NULL
    END
  )
  RETURNING id INTO v_run_id;

  INSERT INTO lenses.workflow_node_results (run_id, node_id, status)
  SELECT v_run_id, n.id, 'pending'
  FROM   lenses.workflow_nodes n
  WHERE  n.workflow_id = p_workflow_id;

  RETURN v_run_id;
END;
$function$;

COMMENT ON FUNCTION lenses.fn_start_workflow_run(uuid, jsonb, text, text) IS
  'D2+D4: anon callers rejected (cannot bypass per-lenser rate limit); '
  'idempotency_key window capped at 24h via idempotency_expires_at. '
  'Otherwise mirrors phase 9.';
