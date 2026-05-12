-- =============================================================================
-- Phase CA — Manipulation Resistance
-- =============================================================================
-- 1. audit.vote_anomalies table
-- 2. fn_check_vote_velocity  — raises P0001 rate_limit_exceeded if >3 votes/60s
-- 3. fn_detect_suspicious_voting — emits anomaly signals for a battle
-- 4. fn_flag_vote_anomaly    — inserts anomaly record (service_role only)
-- 5. fn_resolve_vote_anomaly — marks anomaly resolved (super_admin only)
-- 6. trg_votes_velocity_check BEFORE INSERT on battles.votes
-- 7. RLS on audit.vote_anomalies
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. audit.vote_anomalies
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS audit.vote_anomalies (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  battle_id    UUID        NOT NULL REFERENCES battles.battles(id)   ON DELETE CASCADE,
  voter_lenser_id UUID     NOT NULL REFERENCES lensers.profiles(id)   ON DELETE CASCADE,
  anomaly_type TEXT        NOT NULL,
  score        FLOAT4      NOT NULL DEFAULT 0,
  detected_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  resolved_at  TIMESTAMPTZ,
  resolved_by  UUID        REFERENCES auth.users(id) ON DELETE SET NULL
);

ALTER TABLE audit.vote_anomalies ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE audit.vote_anomalies IS
  'CA: Vote manipulation anomaly records. Populated by service_role worker; '
  'resolved by super_admin only.';

-- ---------------------------------------------------------------------------
-- 2. fn_check_vote_velocity
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.fn_check_vote_velocity(
  p_voter_id UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = battles, audit, public
AS $$
DECLARE
  v_recent_count INT;
BEGIN
  SELECT COUNT(*)
    INTO v_recent_count
    FROM battles.votes
   WHERE voter_lenser_id = p_voter_id
     AND created_at >= now() - INTERVAL '60 seconds';

  IF v_recent_count >= 3 THEN
    RAISE EXCEPTION 'rate_limit_exceeded'
      USING ERRCODE = 'P0001',
            DETAIL  = 'You are voting too fast. Please wait before casting another vote.',
            HINT    = 'rate_limit_exceeded';
  END IF;
END;
$$;

ALTER FUNCTION public.fn_check_vote_velocity(UUID)
  OWNER TO postgres;

COMMENT ON FUNCTION public.fn_check_vote_velocity(UUID) IS
  'CA: Raises P0001 rate_limit_exceeded when voter has cast ≥3 votes in the last 60s.';

-- ---------------------------------------------------------------------------
-- 3. fn_detect_suspicious_voting
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.fn_detect_suspicious_voting(
  p_battle_id UUID
)
RETURNS SETOF JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = battles, auth, public
AS $$
DECLARE
  rec RECORD;
BEGIN
  -- Pattern: new account (<24h old)
  FOR rec IN
    SELECT DISTINCT v.voter_lenser_id
      FROM battles.votes v
      JOIN lensers.profiles p ON p.id = v.voter_lenser_id
      JOIN auth.users u ON u.id = p.user_id
     WHERE v.battle_id = p_battle_id
       AND u.created_at >= now() - INTERVAL '24 hours'
  LOOP
    RETURN NEXT jsonb_build_object(
      'voter_lenser_id', rec.voter_lenser_id,
      'reason',   'new_account',
      'score',    0.7
    );
  END LOOP;

  -- Pattern: 0 battles participated (voter never submitted an entry)
  FOR rec IN
    SELECT DISTINCT v.voter_lenser_id
      FROM battles.votes v
     WHERE v.battle_id = p_battle_id
       AND NOT EXISTS (
         SELECT 1 FROM battles.contenders c
          WHERE c.contender_ref_id = v.voter_lenser_id
       )
       AND NOT EXISTS (
         SELECT 1 FROM battles.votes v2
          WHERE v2.voter_lenser_id = v.voter_lenser_id
            AND v2.battle_id <> p_battle_id
       )
  LOOP
    RETURN NEXT jsonb_build_object(
      'voter_lenser_id', rec.voter_lenser_id,
      'reason',   'zero_battles_participated',
      'score',    0.5
    );
  END LOOP;

  -- Pattern: >80% votes to single contender
  FOR rec IN
    SELECT
      v.voter_lenser_id,
      MAX(cnt)::float / NULLIF(SUM(cnt)::float, 0) AS concentration
    FROM (
      SELECT voter_lenser_id, voted_contender_id, COUNT(*) AS cnt
        FROM battles.votes
       WHERE battle_id = p_battle_id
       GROUP BY voter_lenser_id, voted_contender_id
    ) v
    GROUP BY v.voter_lenser_id
    HAVING MAX(cnt)::float / NULLIF(SUM(cnt)::float, 0) > 0.8
  LOOP
    RETURN NEXT jsonb_build_object(
      'voter_lenser_id', rec.voter_lenser_id,
      'reason',   'high_concentration',
      'score',    LEAST(1.0, rec.concentration)
    );
  END LOOP;

  -- Pattern: votes spaced <2s apart
  FOR rec IN
    SELECT DISTINCT v1.voter_lenser_id
      FROM battles.votes v1
      JOIN battles.votes v2
        ON v2.voter_lenser_id = v1.voter_lenser_id
       AND v2.battle_id       = v1.battle_id
       AND v2.id             <> v1.id
       AND ABS(EXTRACT(EPOCH FROM (v2.created_at - v1.created_at))) < 2
     WHERE v1.battle_id = p_battle_id
  LOOP
    RETURN NEXT jsonb_build_object(
      'voter_lenser_id', rec.voter_lenser_id,
      'reason',   'rapid_succession',
      'score',    0.8
    );
  END LOOP;
END;
$$;

ALTER FUNCTION public.fn_detect_suspicious_voting(UUID)
  OWNER TO postgres;

REVOKE ALL   ON FUNCTION public.fn_detect_suspicious_voting(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.fn_detect_suspicious_voting(UUID) TO service_role;

COMMENT ON FUNCTION public.fn_detect_suspicious_voting(UUID) IS
  'CA: Emits anomaly signals for a battle. service_role only.';

-- ---------------------------------------------------------------------------
-- 4. fn_flag_vote_anomaly
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.fn_flag_vote_anomaly(
  p_battle_id UUID,
  p_voter_id  UUID,
  p_type      TEXT,
  p_score     FLOAT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = audit, public
AS $$
BEGIN
  INSERT INTO audit.vote_anomalies (battle_id, voter_lenser_id, anomaly_type, score)
  VALUES (p_battle_id, p_voter_id, p_type, p_score);
END;
$$;

ALTER FUNCTION public.fn_flag_vote_anomaly(UUID, UUID, TEXT, FLOAT)
  OWNER TO postgres;

REVOKE ALL   ON FUNCTION public.fn_flag_vote_anomaly(UUID, UUID, TEXT, FLOAT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.fn_flag_vote_anomaly(UUID, UUID, TEXT, FLOAT) TO service_role;

COMMENT ON FUNCTION public.fn_flag_vote_anomaly(UUID, UUID, TEXT, FLOAT) IS
  'CA: Inserts a vote anomaly record. service_role only.';

-- ---------------------------------------------------------------------------
-- 5. fn_resolve_vote_anomaly
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.fn_resolve_vote_anomaly(
  p_anomaly_id UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = audit, public
AS $$
DECLARE
  v_actor UUID;
BEGIN
  v_actor := auth.uid();
  IF v_actor IS NULL THEN
    RAISE EXCEPTION 'Authentication required' USING ERRCODE = 'P0001';
  END IF;

  IF NOT public.fn_is_super_admin() THEN
    RAISE EXCEPTION 'Forbidden: super_admin required' USING ERRCODE = 'P0003';
  END IF;

  UPDATE audit.vote_anomalies
     SET resolved_at  = now(),
         resolved_by  = v_actor
   WHERE id = p_anomaly_id
     AND resolved_at IS NULL;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Anomaly not found or already resolved' USING ERRCODE = 'P0002';
  END IF;
END;
$$;

ALTER FUNCTION public.fn_resolve_vote_anomaly(UUID)
  OWNER TO postgres;

REVOKE ALL   ON FUNCTION public.fn_resolve_vote_anomaly(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.fn_resolve_vote_anomaly(UUID) TO authenticated, service_role;

COMMENT ON FUNCTION public.fn_resolve_vote_anomaly(UUID) IS
  'CA: Marks an anomaly resolved. Requires super_admin.';

-- ---------------------------------------------------------------------------
-- 6. Trigger: trg_votes_velocity_check
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.fn_trg_votes_velocity_check()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = battles, public
AS $$
BEGIN
  -- Skip rate-limit check for service_role and postgres (seed/admin inserts)
  IF auth.role() = 'authenticated' THEN
    PERFORM public.fn_check_vote_velocity(NEW.voter_lenser_id);
  END IF;
  RETURN NEW;
END;
$$;

ALTER FUNCTION public.fn_trg_votes_velocity_check()
  OWNER TO postgres;

DROP TRIGGER IF EXISTS trg_votes_velocity_check ON battles.votes;
CREATE TRIGGER trg_votes_velocity_check
  BEFORE INSERT ON battles.votes
  FOR EACH ROW EXECUTE FUNCTION public.fn_trg_votes_velocity_check();

-- ---------------------------------------------------------------------------
-- 7. RLS policies on audit.vote_anomalies
-- ---------------------------------------------------------------------------

-- Authenticated users can see anomaly rows where they are the voter
DROP POLICY IF EXISTS vote_anomalies_own_select ON audit.vote_anomalies;
CREATE POLICY vote_anomalies_own_select
  ON audit.vote_anomalies
  FOR SELECT
  TO authenticated
  USING (voter_lenser_id = lensers.get_auth_lenser_id());

-- Super admins can see all rows
DROP POLICY IF EXISTS vote_anomalies_admin_select ON audit.vote_anomalies;
CREATE POLICY vote_anomalies_admin_select
  ON audit.vote_anomalies
  FOR SELECT
  TO authenticated
  USING (public.fn_is_super_admin());

-- No public INSERT/UPDATE/DELETE (only service_role via fn_flag_vote_anomaly)
DROP POLICY IF EXISTS vote_anomalies_deny_write ON audit.vote_anomalies;
CREATE POLICY vote_anomalies_deny_write
  ON audit.vote_anomalies
  FOR ALL
  TO authenticated
  USING (FALSE)
  WITH CHECK (FALSE);

-- service_role full access
REVOKE ALL   ON TABLE audit.vote_anomalies FROM PUBLIC;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE audit.vote_anomalies TO service_role;
GRANT SELECT                          ON TABLE audit.vote_anomalies TO authenticated;

-- ---------------------------------------------------------------------------
-- 8. fn_admin_get_vote_anomalies — super_admin pagination helper for CLI
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.fn_admin_get_vote_anomalies(
  p_status    TEXT    DEFAULT 'pending',
  p_battle_id UUID    DEFAULT NULL,
  p_limit     INT     DEFAULT 100
)
RETURNS SETOF audit.vote_anomalies
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = audit, public
AS $$
BEGIN
  IF NOT public.fn_is_super_admin() THEN
    RAISE EXCEPTION 'Forbidden: super_admin required' USING ERRCODE = 'P0003';
  END IF;

  RETURN QUERY
    SELECT *
      FROM audit.vote_anomalies
     WHERE (
       p_status = 'all'
       OR (p_status = 'pending'  AND resolved_at IS NULL)
       OR (p_status = 'resolved' AND resolved_at IS NOT NULL)
     )
       AND (p_battle_id IS NULL OR battle_id = p_battle_id)
     ORDER BY detected_at DESC
     LIMIT LEAST(p_limit, 500);
END;
$$;

ALTER FUNCTION public.fn_admin_get_vote_anomalies(TEXT, UUID, INT)
  OWNER TO postgres;

REVOKE ALL    ON FUNCTION public.fn_admin_get_vote_anomalies(TEXT, UUID, INT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.fn_admin_get_vote_anomalies(TEXT, UUID, INT) TO authenticated, service_role;

COMMENT ON FUNCTION public.fn_admin_get_vote_anomalies(TEXT, UUID, INT) IS
  'CA: Super-admin list helper for vote anomalies. Used by CLI and admin UI.';
