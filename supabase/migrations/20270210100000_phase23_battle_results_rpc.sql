-- Phase 23-I: fn_get_battle_results consolidated RPC
-- Returns all data needed for BattleResultPage in a single call,
-- replacing 4 separate fetches. Only published/closed battles are served.

CREATE OR REPLACE FUNCTION public.fn_get_battle_results(p_battle_slug TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = battles, public
AS $$
DECLARE
  v_battle        battles.battles;
  v_battle_id     UUID;
  v_contenders    JSONB;
  v_submissions   JSONB;
  v_aggregates    JSONB;
  v_scorecards    JSONB;
  v_criteria      JSONB;
  v_verdicts      JSONB;
BEGIN
  -- Fetch battle and enforce status guard
  SELECT * INTO v_battle
  FROM battles.battles
  WHERE slug = p_battle_slug
    AND status IN ('published', 'closed');

  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  v_battle_id := v_battle.id;

  SELECT COALESCE(jsonb_agg(row_to_json(c)), '[]')
  INTO v_contenders
  FROM (
    SELECT id, battle_id, slot, contender_type, display_name, lenser_id,
           contender_ref_id, status, invited_at, joined_at
    FROM battles.contenders
    WHERE battle_id = v_battle_id
    ORDER BY slot
  ) c;

  SELECT COALESCE(jsonb_agg(row_to_json(s)), '[]')
  INTO v_submissions
  FROM (
    SELECT id, battle_id, contender_id, content_text, content_url,
           submitted_at, word_count, char_count
    FROM battles.submissions
    WHERE battle_id = v_battle_id
  ) s;

  SELECT COALESCE(jsonb_agg(row_to_json(a)), '[]')
  INTO v_aggregates
  FROM (
    SELECT battle_id, contender_id, raw_vote_count, weighted_vote_sum,
           draw_count, rank_position
    FROM battles.vote_aggregates
    WHERE battle_id = v_battle_id
  ) a;

  SELECT COALESCE(jsonb_agg(row_to_json(sc)), '[]')
  INTO v_scorecards
  FROM (
    SELECT id, battle_id, contender_id, rubric_criterion_id, result, explanation
    FROM battles.scorecards
    WHERE battle_id = v_battle_id
  ) sc;

  SELECT COALESCE(jsonb_agg(row_to_json(cr)), '[]')
  INTO v_criteria
  FROM (
    SELECT id, title AS name, description, weight
    FROM battles.rubric_criteria
    WHERE id IN (
      SELECT rubric_criterion_id FROM battles.scorecards WHERE battle_id = v_battle_id
    )
  ) cr;

  SELECT COALESCE(jsonb_agg(row_to_json(v)), '[]')
  INTO v_verdicts
  FROM (
    SELECT id, contender_id, criterion_id, score, rationale, model_key, run_id, created_at
    FROM battles.ai_judge_verdicts
    WHERE battle_id = v_battle_id
  ) v;

  RETURN jsonb_build_object(
    'battle',       row_to_json(v_battle),
    'contenders',   v_contenders,
    'submissions',  v_submissions,
    'aggregates',   v_aggregates,
    'scorecards',   v_scorecards,
    'criteria',     v_criteria,
    'verdicts',     v_verdicts
  );
END;
$$;

REVOKE ALL ON FUNCTION public.fn_get_battle_results(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.fn_get_battle_results(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.fn_get_battle_results(TEXT) TO service_role;
