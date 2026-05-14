-- =============================================================================
-- Phase NG-P1: Governance guard on fn_lensers_get_public_profile
--
-- Adds an identity_gov.fn_validate_handle gate as the first step in the
-- public profile lookup RPC. A 'deny' verdict returns null — identical to the
-- not-found/private-profile path — so callers cannot enumerate protected
-- namespaces through the profile API.
--
-- Why here and not in fn_lensers_get_profile:
--   fn_lensers_get_public_profile is the unauthenticated surface (anon+auth,
--   no privilege checks). fn_lensers_get_profile is an internal helper with
--   its own auth-aware route-state logic. The governance gate belongs at the
--   public API boundary.
--
-- Failure policy: on any error inside fn_validate_handle (it already fails
-- CLOSED and returns deny), the outer EXCEPTION block returns null so the
-- profile endpoint never leaks an internal error stack.
-- =============================================================================

BEGIN;

CREATE OR REPLACE FUNCTION "public"."fn_lensers_get_public_profile"("p_handle" text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_verdict     text;
  v_result      jsonb;
  v_route_state text;
BEGIN
  -- ── Governance gate ────────────────────────────────────────────────────────
  -- Validate the incoming handle against the identity_gov registry before
  -- touching the profile table. A 'deny' verdict returns null — same as the
  -- not-found or private-profile path — preventing namespace enumeration.
  SELECT verdict
  INTO   v_verdict
  FROM   identity_gov.fn_validate_handle(p_handle)
  LIMIT  1;

  IF v_verdict = 'deny' THEN
    RETURN null;
  END IF;

  -- ── Normal profile lookup ─────────────────────────────────────────────────
  v_result      := public.fn_lensers_get_profile(p_handle);
  v_route_state := v_result->>'route_state';

  IF v_route_state = 'FULL_PROFILE' THEN
    RETURN v_result->'profile';
  ELSE
    RETURN null;
  END IF;

EXCEPTION WHEN OTHERS THEN
  -- Fail safe: governance error or profile error returns null, not a 500.
  RETURN null;
END;
$$;

COMMENT ON FUNCTION "public"."fn_lensers_get_public_profile"(text) IS
  'Public profile lookup with identity_gov namespace guard. '
  'Returns null for denied handles (reserved, impersonation) and for '
  'non-FULL_PROFILE route states (private, deactivated, deleted). '
  'Callers cannot distinguish denied-by-governance from not-found.';

COMMIT;
