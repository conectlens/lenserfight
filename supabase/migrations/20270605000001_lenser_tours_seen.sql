-- Migration: per-user product-tour seen markers (issue #430)
-- Adds a tours_seen jsonb column to lensers.preferences so the product-tour
-- system can persist which tours a lenser has completed or dismissed, keyed by
-- tour id with the ISO timestamp of the mark.
--
-- Writes go through the dedicated RPC public.fn_lensers_mark_tour_seen, which
-- merges a single key without clobbering existing ones. Reads come free via
-- public.fn_lensers_get_preferences (returns the full row). The
-- fn_lensers_update_preferences whitelist is intentionally NOT extended.

ALTER TABLE lensers.preferences
  ADD COLUMN IF NOT EXISTS tours_seen jsonb NOT NULL DEFAULT '{}'::jsonb;

COMMENT ON COLUMN lensers.preferences.tours_seen IS
  'Per-user product-tour seen markers: tour id -> ISO timestamp of completion/dismissal.';

-- ─── fn_lensers_mark_tour_seen ─────────────────────────────────────────────
-- Marks a product tour as seen for the calling user's own human profile.
-- Merges { p_tour_id: now() } into tours_seen without dropping other keys.
-- Re-marking the same tour refreshes its timestamp.

CREATE OR REPLACE FUNCTION public.fn_lensers_mark_tour_seen(p_tour_id text)
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

  IF p_tour_id IS NULL
     OR length(p_tour_id) = 0
     OR length(p_tour_id) > 200
     OR p_tour_id !~ '^[a-z0-9.\-]+$'
  THEN
    RAISE EXCEPTION 'invalid tour id: %', p_tour_id;
  END IF;

  UPDATE lensers.preferences SET
    tours_seen = tours_seen || jsonb_build_object(p_tour_id, now()),
    updated_at = now()
  WHERE lenser_id = v_lenser_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'no preferences row found for calling user';
  END IF;
END;
$$;

-- Default privileges grant EXECUTE on new public functions to anon (see
-- 20270604000002_fix_worker_fn_grant_leak.sql) — revoke explicitly, plus the
-- PUBLIC pseudo-role granted at function creation (pattern from
-- 20270603000000_workflow_worker_grant_hardening.sql).
REVOKE ALL     ON FUNCTION public.fn_lensers_mark_tour_seen(text) FROM anon, PUBLIC;
GRANT  EXECUTE ON FUNCTION public.fn_lensers_mark_tour_seen(text) TO   authenticated;
