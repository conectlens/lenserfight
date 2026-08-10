-- Migration: global product-tour opt-out flag (issue #483)
-- Adds a tours_opted_out boolean column to lensers.preferences so a user can
-- turn off all future auto-run tours in one action instead of dismissing an
-- identical modal on every route they visit.
--
-- Follows the same isolated pattern as tours_seen
-- (20270605000001_lenser_tours_seen.sql): a dedicated RPC, not the generic
-- fn_lensers_update_preferences whitelist, since the tour feature owns this
-- column's read/write path end-to-end.

ALTER TABLE lensers.preferences
  ADD COLUMN IF NOT EXISTS tours_opted_out boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN lensers.preferences.tours_opted_out IS
  'When true, no product tour auto-starts for this user on any route until re-enabled.';

-- ─── fn_lensers_set_tours_opted_out ────────────────────────────────────────
-- Sets (or clears) the calling user's global tour opt-out flag.

CREATE OR REPLACE FUNCTION public.fn_lensers_set_tours_opted_out(p_opted_out boolean)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, lensers, auth
AS $$
DECLARE
  v_uid       uuid;
  v_lenser_id uuid;
BEGIN
  v_uid := auth.uid();
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  SELECT id INTO v_lenser_id
    FROM lensers.profiles
   WHERE user_id = v_uid
     AND type    = 'human'
   LIMIT 1;

  IF v_lenser_id IS NULL THEN
    RAISE EXCEPTION 'Profile not found';
  END IF;

  UPDATE lensers.preferences SET
    tours_opted_out = p_opted_out,
    updated_at      = now()
  WHERE lenser_id = v_lenser_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'no preferences row found for calling user';
  END IF;
END;
$$;

REVOKE ALL     ON FUNCTION public.fn_lensers_set_tours_opted_out(boolean) FROM anon, PUBLIC;
GRANT  EXECUTE ON FUNCTION public.fn_lensers_set_tours_opted_out(boolean) TO   authenticated;
