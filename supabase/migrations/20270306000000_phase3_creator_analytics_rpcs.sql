-- Phase 3 — L36: Creator analytics RPCs
--
-- fn_get_creator_timeseries: daily series for a lenser over p_days days.
--   Columns: day, battles, wins, votes_received, xp_earned.
--   Joined from battles.contenders (battles + wins), battles.votes (votes_received),
--   and lensers.xp_ledger (xp_earned).
--
-- fn_get_head_to_head: aggregate win/loss/draw stats for two lensers.
--   Only counts battles where both lensers participated as contenders.

-- ── fn_get_creator_timeseries ────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.fn_get_creator_timeseries(
  p_lenser_id uuid,
  p_days      integer DEFAULT 30
)
RETURNS TABLE (
  day              date,
  battles          bigint,
  wins             bigint,
  votes_received   bigint,
  xp_earned        bigint
)
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path TO 'battles', 'lensers', 'xp', 'public'
AS $$
  WITH date_series AS (
    SELECT generate_series(
      CURRENT_DATE - (p_days - 1) * INTERVAL '1 day',
      CURRENT_DATE,
      INTERVAL '1 day'
    )::date AS day
  ),
  battle_stats AS (
    SELECT
      b.published_at::date       AS day,
      COUNT(*)                   AS battles,
      COUNT(*) FILTER (
        WHERE b.winner_contender_id = c.id
      )                          AS wins
    FROM battles.contenders c
    JOIN battles.battles b ON b.id = c.battle_id
    WHERE c.contender_ref_id = p_lenser_id
      AND b.status IN ('closed', 'published')
      AND b.published_at >= CURRENT_DATE - p_days * INTERVAL '1 day'
    GROUP BY 1
  ),
  vote_stats AS (
    SELECT
      v.created_at::date AS day,
      COUNT(*)           AS votes_received
    FROM battles.votes v
    JOIN battles.contenders c ON c.id = v.voted_contender_id
    WHERE c.contender_ref_id = p_lenser_id
      AND v.created_at >= CURRENT_DATE - p_days * INTERVAL '1 day'
    GROUP BY 1
  ),
  xp_stats AS (
    SELECT
      x.created_at::date AS day,
      COALESCE(SUM(x.xp), 0) AS xp_earned
    FROM xp.events x
    WHERE x.lenser_id = p_lenser_id
      AND x.created_at >= CURRENT_DATE - p_days * INTERVAL '1 day'
    GROUP BY 1
  )
  SELECT
    ds.day,
    COALESCE(bs.battles, 0)        AS battles,
    COALESCE(bs.wins, 0)           AS wins,
    COALESCE(vs.votes_received, 0) AS votes_received,
    COALESCE(xs.xp_earned, 0)      AS xp_earned
  FROM date_series ds
  LEFT JOIN battle_stats bs ON bs.day = ds.day
  LEFT JOIN vote_stats    vs ON vs.day = ds.day
  LEFT JOIN xp_stats      xs ON xs.day = ds.day
  ORDER BY ds.day ASC
$$;

GRANT EXECUTE ON FUNCTION public.fn_get_creator_timeseries(uuid, integer)
  TO authenticated;

COMMENT ON FUNCTION public.fn_get_creator_timeseries(uuid, integer) IS
  'Returns a daily timeseries of battles, wins, votes received, and XP earned '
  'for a given lenser over the last p_days days. SECURITY DEFINER — no RLS bypass needed.';

-- ── fn_get_head_to_head ──────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.fn_get_head_to_head(
  p_lenser_a uuid,
  p_lenser_b uuid
)
RETURNS TABLE (
  total_battles  bigint,
  a_wins         bigint,
  b_wins         bigint,
  draws          bigint
)
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path TO 'battles', 'public'
AS $$
  WITH shared_battles AS (
    -- Battles where both lensers participated
    SELECT ca.battle_id
    FROM battles.contenders ca
    JOIN battles.contenders cb ON cb.battle_id = ca.battle_id
      AND cb.contender_ref_id = p_lenser_b
    WHERE ca.contender_ref_id = p_lenser_a
  ),
  outcomes AS (
    SELECT
      b.id AS battle_id,
      MAX(CASE WHEN c.contender_ref_id = p_lenser_a AND b.winner_contender_id = c.id THEN 1 ELSE 0 END) AS a_won,
      MAX(CASE WHEN c.contender_ref_id = p_lenser_b AND b.winner_contender_id = c.id THEN 1 ELSE 0 END) AS b_won
    FROM shared_battles sb
    JOIN battles.battles b ON b.id = sb.battle_id
    JOIN battles.contenders c ON c.battle_id = b.id
      AND c.contender_ref_id IN (p_lenser_a, p_lenser_b)
    WHERE b.status IN ('closed', 'published')
    GROUP BY b.id
  )
  SELECT
    COUNT(*)                               AS total_battles,
    SUM(CASE WHEN a_won = 1 AND b_won = 0 THEN 1 ELSE 0 END) AS a_wins,
    SUM(CASE WHEN b_won = 1 AND a_won = 0 THEN 1 ELSE 0 END) AS b_wins,
    SUM(CASE WHEN a_won = b_won           THEN 1 ELSE 0 END) AS draws
  FROM outcomes
$$;

GRANT EXECUTE ON FUNCTION public.fn_get_head_to_head(uuid, uuid)
  TO authenticated;

COMMENT ON FUNCTION public.fn_get_head_to_head(uuid, uuid) IS
  'Returns aggregate win/loss/draw stats for two lensers across all battles '
  'where both participated. SECURITY DEFINER — caller visibility is public.';
