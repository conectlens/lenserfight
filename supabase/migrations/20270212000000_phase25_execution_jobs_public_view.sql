-- Phase 25-A: v_execution_jobs_public view
-- Exposes a safe subset of battle_execution_jobs columns to authenticated
-- spectators during executing/voting/scoring/closed/published battles.
-- Omits: worker_id, contender_id, error_message, max_retries (internal fields).
--
-- Views do not support RLS or CREATE POLICY in Postgres.
-- Row-level filtering is enforced by fn_get_public_execution_jobs (SECURITY DEFINER)
-- below, which includes an inline battle status guard.

CREATE OR REPLACE VIEW battles.v_execution_jobs_public AS
  SELECT
    j.id,
    j.battle_id,
    j.slot,
    j.status,
    j.claimed_at,
    j.completed_at,
    j.retry_count,
    j.created_at
  FROM battles.battle_execution_jobs j;

ALTER VIEW battles.v_execution_jobs_public OWNER TO postgres;

-- ─── Fallback RPC (use if view-level RLS is unreliable) ───────────────────────
-- Returns public job fields for a specific battle with an inline status guard.

CREATE OR REPLACE FUNCTION battles.fn_get_public_execution_jobs(p_battle_id UUID)
RETURNS TABLE (
  id           UUID,
  battle_id    UUID,
  slot         TEXT,
  status       TEXT,
  claimed_at   TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  retry_count  INT,
  created_at   TIMESTAMPTZ
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = battles, public
AS $$
  SELECT
    j.id,
    j.battle_id,
    j.slot,
    j.status,
    j.claimed_at,
    j.completed_at,
    j.retry_count,
    j.created_at
  FROM battles.battle_execution_jobs j
  WHERE j.battle_id = p_battle_id
    AND EXISTS (
      SELECT 1
      FROM battles.battles b
      WHERE b.id = p_battle_id
        AND b.status IN ('executing', 'voting', 'scoring', 'closed', 'published')
    )
  ORDER BY j.slot;
$$;

REVOKE ALL ON FUNCTION battles.fn_get_public_execution_jobs(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION battles.fn_get_public_execution_jobs(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION battles.fn_get_public_execution_jobs(UUID) TO service_role;
