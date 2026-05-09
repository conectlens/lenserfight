-- Fix: protect_sensitive_lenser_fields blocked handle updates from SECURITY DEFINER RPCs.
-- The trigger checked request.jwt.claim.role (always 'authenticated' for callers), but
-- SECURITY DEFINER functions run as postgres (current_user = 'postgres').
-- Allow handle changes when current_user is 'postgres' so trusted RPCs like
-- fn_complete_onboarding and fn_upsert_profile_from_chainabit can set the handle.

CREATE OR REPLACE FUNCTION lensers.protect_sensitive_lenser_fields()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'lensers', 'public', 'auth'
AS $$
DECLARE
  jwt_role text := current_setting('request.jwt.claim.role', true);
BEGIN
  -- Allow SECURITY DEFINER functions (run as postgres) and direct service_role calls
  IF current_user = 'postgres' OR jwt_role = 'service_role' THEN
    RETURN NEW;
  END IF;

  IF NEW.handle IS DISTINCT FROM OLD.handle THEN
    RAISE EXCEPTION 'handle can only be modified by service_role';
  END IF;

  RETURN NEW;
END;
$$;
