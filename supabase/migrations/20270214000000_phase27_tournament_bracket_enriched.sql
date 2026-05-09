-- Phase 27-A: Enrich fn_get_tournament_bracket with handle and avatar_url columns.
-- Extends the existing RPC with triple-JOIN to lensers.profiles so the frontend
-- can render avatars and handles directly without secondary fetches.
-- DROP required because return type (OUT columns) changed from the original definition.

DROP FUNCTION IF EXISTS public.fn_get_tournament_bracket(UUID);

CREATE OR REPLACE FUNCTION public.fn_get_tournament_bracket(p_tournament_id UUID)
RETURNS TABLE (
  round_number           INT,
  round_status           TEXT,
  match_id               UUID,
  battle_id              UUID,
  battle_slug            TEXT,
  contender_a_lenser_id  UUID,
  contender_a_handle     TEXT,
  contender_a_avatar_url TEXT,
  contender_b_lenser_id  UUID,
  contender_b_handle     TEXT,
  contender_b_avatar_url TEXT,
  winner_lenser_id       UUID,
  winner_handle          TEXT,
  winner_avatar_url      TEXT
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = battles, lensers, public
AS $$
  SELECT
    tr.round_number,
    tr.status::TEXT          AS round_status,
    tm.id                    AS match_id,
    tm.battle_id,
    b.slug                   AS battle_slug,
    tca.lenser_id            AS contender_a_lenser_id,
    pa.handle                AS contender_a_handle,
    pa.avatar_url            AS contender_a_avatar_url,
    tcb.lenser_id            AS contender_b_lenser_id,
    pb.handle                AS contender_b_handle,
    pb.avatar_url            AS contender_b_avatar_url,
    tcw.lenser_id            AS winner_lenser_id,
    pw.handle                AS winner_handle,
    pw.avatar_url            AS winner_avatar_url
  FROM battles.tournament_rounds tr
  JOIN  battles.tournament_matches tm    ON tm.round_id = tr.id
  LEFT JOIN battles.battles b            ON b.id = tm.battle_id
  LEFT JOIN battles.tournament_contenders tca ON tca.id = tm.contender_a_id
  LEFT JOIN battles.tournament_contenders tcb ON tcb.id = tm.contender_b_id
  LEFT JOIN battles.tournament_contenders tcw ON tcw.id = tm.winner_tournament_contender_id
  LEFT JOIN lensers.profiles pa ON pa.id = tca.lenser_id
  LEFT JOIN lensers.profiles pb ON pb.id = tcb.lenser_id
  LEFT JOIN lensers.profiles pw ON pw.id = tcw.lenser_id
  WHERE tr.tournament_id = p_tournament_id
  ORDER BY tr.round_number, tm.created_at;
$$;
