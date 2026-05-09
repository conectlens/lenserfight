-- Phase 23-A: fn_get_ai_judge_verdicts RPC
-- Exposes AI judge scores and rationale for published/closed battles.
-- SECURITY DEFINER so callers do not need direct table access;
-- the explicit status guard re-enforces the existing RLS condition.

CREATE OR REPLACE FUNCTION battles.fn_get_ai_judge_verdicts(p_battle_id UUID)
RETURNS TABLE (
  id           UUID,
  contender_id UUID,
  criterion_id UUID,
  score        NUMERIC,
  rationale    TEXT,
  model_key    TEXT,
  run_id       UUID,
  created_at   TIMESTAMPTZ
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = battles, public
AS $$
  SELECT
    v.id,
    v.contender_id,
    v.criterion_id,
    v.score,
    v.rationale,
    v.model_key,
    v.run_id,
    v.created_at
  FROM battles.ai_judge_verdicts v
  WHERE v.battle_id = p_battle_id
    AND EXISTS (
      SELECT 1
      FROM battles.battles b
      WHERE b.id = p_battle_id
        AND b.status IN ('published', 'closed')
    )
  ORDER BY v.contender_id, v.criterion_id NULLS LAST;
$$;

REVOKE ALL ON FUNCTION battles.fn_get_ai_judge_verdicts(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION battles.fn_get_ai_judge_verdicts(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION battles.fn_get_ai_judge_verdicts(UUID) TO service_role;
