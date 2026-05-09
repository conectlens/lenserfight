-- Developer journey state: per-lenser JSONB tracking of product onboarding steps
-- and referral source captured at registration.
-- Adds fn_journey_state_get() and fn_journey_state_mark(step, done) RPCs
-- consumed by `lf setup`, `lf status`, and `lf doctor --check journey`.

-- ── Schema additions ─────────────────────────────────────────────────────────

ALTER TABLE lensers.profiles
  ADD COLUMN IF NOT EXISTS journey_state   JSONB        NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS referral_source TEXT;

COMMENT ON COLUMN lensers.profiles.journey_state   IS 'Per-step boolean map written by fn_journey_state_mark; keys match OnboardingStepId product journey steps.';
COMMENT ON COLUMN lensers.profiles.referral_source IS 'UTM / referral token captured at account creation from a battle invite link.';

-- ── fn_journey_state_get ─────────────────────────────────────────────────────
-- Returns the full journey_state JSONB for the authenticated lenser.
-- Returns '{}' when no row exists (e.g., first call before any step is marked).

CREATE OR REPLACE FUNCTION public.fn_journey_state_get()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, lensers
AS $$
DECLARE
  v_state JSONB;
BEGIN
  SELECT journey_state
    INTO v_state
    FROM lensers.profiles
   WHERE user_id = auth.uid();

  RETURN COALESCE(v_state, '{}'::JSONB);
END;
$$;

REVOKE ALL ON FUNCTION public.fn_journey_state_get() FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.fn_journey_state_get() TO authenticated;

COMMENT ON FUNCTION public.fn_journey_state_get() IS
  'Returns the journey_state JSONB for the calling lenser. Safe to call before any step is marked.';

-- ── fn_journey_state_mark ────────────────────────────────────────────────────
-- Sets or clears a single step key in journey_state.
-- p_step  : step identifier, e.g. ''lens_created'', ''battle_joined''
-- p_done  : true = mark complete, false = clear

CREATE OR REPLACE FUNCTION public.fn_journey_state_mark(
  p_step TEXT,
  p_done BOOLEAN DEFAULT TRUE
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, lensers
AS $$
BEGIN
  UPDATE lensers.profiles
     SET journey_state = journey_state || jsonb_build_object(p_step, p_done),
         updated_at    = NOW()
   WHERE user_id = auth.uid();

  -- Silently no-op if the profile row doesn't exist yet; the CLI handles null.
  IF NOT FOUND THEN
    NULL;
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.fn_journey_state_mark(TEXT, BOOLEAN) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.fn_journey_state_mark(TEXT, BOOLEAN) TO authenticated;

COMMENT ON FUNCTION public.fn_journey_state_mark(TEXT, BOOLEAN) IS
  'Sets or clears a journey step key for the calling lenser. Idempotent; no-ops on missing profile.';
