-- Phase 28-A: Admin SECURITY DEFINER RPCs + is_super_admin column.
-- All RPCs check lensers.profiles.is_super_admin for the calling user
-- before delegating to service-role-only internal functions.
-- Non-admins receive INSUFFICIENT_PRIVILEGE instead of data or schema hints.

-- ─── 1. Add is_super_admin column to lensers.profiles ────────────────────────
-- Only service_role migrations can SET this flag; fn_update_profile must not
-- expose it as a writable field (the column has no user-facing default path).

ALTER TABLE lensers.profiles
  ADD COLUMN IF NOT EXISTS is_super_admin BOOLEAN NOT NULL DEFAULT FALSE;

-- ─── 2. Helper — inline admin check ─────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.fn_is_super_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = lensers, public
AS $$
  SELECT COALESCE(
    (SELECT is_super_admin FROM lensers.profiles WHERE id = auth.uid() LIMIT 1),
    FALSE
  );
$$;

REVOKE ALL ON FUNCTION public.fn_is_super_admin() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.fn_is_super_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.fn_is_super_admin() TO service_role;

-- ─── 3. fn_admin_get_worker_health ───────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.fn_admin_get_worker_health()
RETURNS TABLE (
  worker_id     TEXT,
  worker_type   TEXT,
  last_seen_at  TIMESTAMPTZ,
  is_healthy    BOOLEAN,
  seconds_since NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = platform, lensers, public
AS $$
BEGIN
  IF NOT public.fn_is_super_admin() THEN
    RAISE EXCEPTION 'INSUFFICIENT_PRIVILEGE';
  END IF;
  RETURN QUERY SELECT * FROM platform.fn_get_worker_health();
END;
$$;

REVOKE ALL ON FUNCTION public.fn_admin_get_worker_health() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.fn_admin_get_worker_health() TO authenticated;
GRANT EXECUTE ON FUNCTION public.fn_admin_get_worker_health() TO service_role;

-- ─── 4. fn_admin_get_dlq_entries ─────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.fn_admin_get_dlq_entries(
  p_unresolved_only BOOLEAN DEFAULT TRUE
)
RETURNS TABLE (
  id            UUID,
  job_id        UUID,
  battle_id     UUID,
  contender_id  UUID,
  slot          TEXT,
  error_code    TEXT,
  error_message TEXT,
  attempt_count INT,
  payload       JSONB,
  resolved_at   TIMESTAMPTZ,
  created_at    TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = battles, lensers, public
AS $$
BEGIN
  IF NOT public.fn_is_super_admin() THEN
    RAISE EXCEPTION 'INSUFFICIENT_PRIVILEGE';
  END IF;
  RETURN QUERY
    SELECT
      d.id, d.job_id, d.battle_id, d.contender_id, d.slot,
      d.error_code, d.error_message, d.attempt_count, d.payload,
      d.resolved_at, d.created_at
    FROM battles.battle_execution_dead_letters d
    WHERE (NOT p_unresolved_only OR d.resolved_at IS NULL)
    ORDER BY d.created_at DESC
    LIMIT 200;
END;
$$;

REVOKE ALL ON FUNCTION public.fn_admin_get_dlq_entries(BOOLEAN) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.fn_admin_get_dlq_entries(BOOLEAN) TO authenticated;
GRANT EXECUTE ON FUNCTION public.fn_admin_get_dlq_entries(BOOLEAN) TO service_role;

-- ─── 5. fn_admin_retry_dlq ────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.fn_admin_retry_dlq(p_dead_letter_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = battles, lensers, public
AS $$
BEGIN
  IF NOT public.fn_is_super_admin() THEN
    RAISE EXCEPTION 'INSUFFICIENT_PRIVILEGE';
  END IF;
  PERFORM battles.fn_retry_dead_letter_battle_job(p_dead_letter_id);
END;
$$;

REVOKE ALL ON FUNCTION public.fn_admin_retry_dlq(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.fn_admin_retry_dlq(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.fn_admin_retry_dlq(UUID) TO service_role;

-- ─── 6. fn_admin_get_stuck_battles ───────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.fn_admin_get_stuck_battles(
  p_threshold_minutes INT DEFAULT 30
)
RETURNS TABLE (
  id             UUID,
  slug           TEXT,
  title          TEXT,
  status         TEXT,
  updated_at     TIMESTAMPTZ,
  stale_seconds  NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = battles, lensers, public
AS $$
BEGIN
  IF NOT public.fn_is_super_admin() THEN
    RAISE EXCEPTION 'INSUFFICIENT_PRIVILEGE';
  END IF;
  RETURN QUERY
    SELECT
      b.id,
      b.slug,
      b.title,
      b.status::TEXT,
      b.updated_at,
      ROUND(EXTRACT(EPOCH FROM (now() - b.updated_at))::NUMERIC, 1) AS stale_seconds
    FROM battles.battles b
    WHERE b.status IN ('executing', 'scoring')
      AND b.updated_at < now() - (p_threshold_minutes || ' minutes')::INTERVAL
    ORDER BY b.updated_at ASC;
END;
$$;

REVOKE ALL ON FUNCTION public.fn_admin_get_stuck_battles(INT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.fn_admin_get_stuck_battles(INT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.fn_admin_get_stuck_battles(INT) TO service_role;
