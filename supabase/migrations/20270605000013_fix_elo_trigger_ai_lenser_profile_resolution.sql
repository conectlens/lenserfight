-- reputation.fn_update_elo_on_finalize (AFTER UPDATE trigger on
-- battles.battles, fires on status -> 'closed') resolved each contender's
-- rating-table identity as:
--
--   COALESCE(em.profile_id, em.ai_lenser_id) AS lenser_id
--
-- battles.contender_entity_map stores profile_id ONLY for human contenders
-- (NULL for ai_model/ai_agent — see 20260520100000_fix_contender_entity_map_ai_resolution.sql)
-- and ai_lenser_id as the resolved agents.ai_lensers.id for AI contenders.
-- So for every AI agent contender, this COALESCE fell through to
-- em.ai_lenser_id and used it directly as reputation.contender_ratings.lenser_id
-- — but that column has a foreign key to lensers.profiles.id, a completely
-- different id space from agents.ai_lensers.id. Every finalize of a battle
-- with an AI contender failed with:
--   "insert or update on table "contender_ratings" violates foreign key
--    constraint "contender_ratings_lenser_id_fkey""
--
-- Fix: resolve ai_lenser_id to its profile_id via agents.ai_lensers before
-- using it as a lenser_id.

CREATE OR REPLACE FUNCTION "reputation"."fn_update_elo_on_finalize"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'reputation', 'battles', 'agents', 'lensers', 'public'
    AS $$
DECLARE
  v_contender_a     RECORD;
  v_contender_b     RECORD;
  v_lenser_a        uuid;
  v_lenser_b        uuid;
  v_score_a         numeric;
  v_score_b         numeric;
  v_rating_a        RECORD;
  v_rating_b        RECORD;
  v_new_a           RECORD;
  v_new_b           RECORD;
  v_category        text;
  v_use_trueskill   boolean;
BEGIN
  IF NEW.status <> 'closed' OR OLD.status = 'closed' THEN
    RETURN NEW;
  END IF;

  -- Resolve contenders via entity map (1v1 assumption). ai_lenser_id is
  -- resolved to its profile_id (agents.ai_lensers.profile_id) — the id space
  -- reputation.contender_ratings.lenser_id actually references — rather than
  -- used directly.
  SELECT em.contender_id,
         COALESCE(em.profile_id, al_a.profile_id) AS lenser_id
  INTO v_contender_a
  FROM battles.contenders c
  JOIN battles.contender_entity_map em ON em.contender_id = c.id
  LEFT JOIN agents.ai_lensers al_a ON al_a.id = em.ai_lenser_id
  WHERE c.battle_id = NEW.id AND c.contender_status = 'active'
    AND COALESCE(em.profile_id, al_a.profile_id) IS NOT NULL
  ORDER BY c.created_at ASC
  LIMIT 1;

  SELECT em.contender_id,
         COALESCE(em.profile_id, al_b.profile_id) AS lenser_id
  INTO v_contender_b
  FROM battles.contenders c
  JOIN battles.contender_entity_map em ON em.contender_id = c.id
  LEFT JOIN agents.ai_lensers al_b ON al_b.id = em.ai_lenser_id
  WHERE c.battle_id = NEW.id AND c.contender_status = 'active'
    AND COALESCE(em.profile_id, al_b.profile_id) IS NOT NULL
    AND c.id <> v_contender_a.contender_id
  ORDER BY c.created_at ASC
  LIMIT 1;

  IF v_contender_a.lenser_id IS NULL OR v_contender_b.lenser_id IS NULL THEN
    RETURN NEW;
  END IF;

  v_lenser_a := v_contender_a.lenser_id;
  v_lenser_b := v_contender_b.lenser_id;

  -- ── Determine outcomes ───────────────────────────────────────────────────
  IF NEW.winner_contender_id IS NULL THEN
    v_score_a := 0.5;
    v_score_b := 0.5;
  ELSIF NEW.winner_contender_id = v_contender_a.contender_id THEN
    v_score_a := 1.0;
    v_score_b := 0.0;
  ELSE
    v_score_a := 0.0;
    v_score_b := 1.0;
  END IF;

  -- ── Derive category from battle_type (fallback to 'general') ────────────
  v_category := coalesce(NEW.content_type, NEW.battle_type::text, 'general');

  -- ── Upsert ratings for both players ─────────────────────────────────────
  INSERT INTO reputation.contender_ratings (lenser_id, category)
  VALUES (v_lenser_a, v_category)
  ON CONFLICT (lenser_id, category) DO NOTHING;

  INSERT INTO reputation.contender_ratings (lenser_id, category)
  VALUES (v_lenser_b, v_category)
  ON CONFLICT (lenser_id, category) DO NOTHING;

  SELECT * INTO v_rating_a
  FROM reputation.contender_ratings
  WHERE lenser_id = v_lenser_a AND category = v_category;

  SELECT * INTO v_rating_b
  FROM reputation.contender_ratings
  WHERE lenser_id = v_lenser_b AND category = v_category;

  v_use_trueskill := (v_rating_a.tau > 0 OR v_rating_b.tau > 0);

  IF v_use_trueskill THEN
    SELECT * INTO v_new_a
    FROM reputation.fn_trueskill_update(
      v_rating_a.elo_rating, v_rating_a.uncertainty,
      v_rating_b.elo_rating, v_rating_b.uncertainty,
      v_score_a,
      greatest(v_rating_a.tau, v_rating_b.tau),
      greatest(v_rating_a.beta, v_rating_b.beta)
    );

    UPDATE reputation.contender_ratings SET
      elo_rating     = v_new_a.new_mu1,
      uncertainty    = v_new_a.new_sigma1,
      battles_played = battles_played + 1,
      wins           = wins + CASE WHEN v_score_a >= 0.99 THEN 1 ELSE 0 END,
      draws          = draws + CASE WHEN v_score_a > 0.01 AND v_score_a < 0.99 THEN 1 ELSE 0 END,
      losses         = losses + CASE WHEN v_score_a <= 0.01 THEN 1 ELSE 0 END,
      updated_at     = now()
    WHERE lenser_id = v_lenser_a AND category = v_category;

    UPDATE reputation.contender_ratings SET
      elo_rating     = v_new_a.new_mu2,
      uncertainty    = v_new_a.new_sigma2,
      battles_played = battles_played + 1,
      wins           = wins + CASE WHEN v_score_b >= 0.99 THEN 1 ELSE 0 END,
      draws          = draws + CASE WHEN v_score_b > 0.01 AND v_score_b < 0.99 THEN 1 ELSE 0 END,
      losses         = losses + CASE WHEN v_score_b <= 0.01 THEN 1 ELSE 0 END,
      updated_at     = now()
    WHERE lenser_id = v_lenser_b AND category = v_category;

  ELSE
    SELECT * INTO v_new_a
    FROM reputation.glicko2_update(
      v_rating_a.elo_rating, v_rating_a.uncertainty, v_rating_a.sigma,
      v_rating_b.elo_rating, v_rating_b.uncertainty,
      v_score_a
    );

    SELECT * INTO v_new_b
    FROM reputation.glicko2_update(
      v_rating_b.elo_rating, v_rating_b.uncertainty, v_rating_b.sigma,
      v_rating_a.elo_rating, v_rating_a.uncertainty,
      v_score_b
    );

    UPDATE reputation.contender_ratings SET
      elo_rating     = v_new_a.new_r,
      uncertainty    = v_new_a.new_rd,
      sigma          = v_new_a.new_sigma,
      battles_played = battles_played + 1,
      wins           = wins + CASE WHEN v_score_a >= 0.99 THEN 1 ELSE 0 END,
      draws          = draws + CASE WHEN v_score_a > 0.01 AND v_score_a < 0.99 THEN 1 ELSE 0 END,
      losses         = losses + CASE WHEN v_score_a <= 0.01 THEN 1 ELSE 0 END,
      updated_at     = now()
    WHERE lenser_id = v_lenser_a AND category = v_category;

    UPDATE reputation.contender_ratings SET
      elo_rating     = v_new_b.new_r,
      uncertainty    = v_new_b.new_rd,
      sigma          = v_new_b.new_sigma,
      battles_played = battles_played + 1,
      wins           = wins + CASE WHEN v_score_b >= 0.99 THEN 1 ELSE 0 END,
      draws          = draws + CASE WHEN v_score_b > 0.01 AND v_score_b < 0.99 THEN 1 ELSE 0 END,
      losses         = losses + CASE WHEN v_score_b <= 0.01 THEN 1 ELSE 0 END,
      updated_at     = now()
    WHERE lenser_id = v_lenser_b AND category = v_category;
  END IF;

  -- ── Upsert lenser_scores with latest ELO ────────────────────────────────
  INSERT INTO reputation.lenser_scores (lenser_id, score_type, score, uncertainty, computed_at)
  VALUES (v_lenser_a, 'elo', v_rating_a.elo_rating, v_rating_a.uncertainty, now())
  ON CONFLICT (lenser_id, score_type) DO UPDATE SET
    score       = EXCLUDED.score,
    uncertainty = EXCLUDED.uncertainty,
    computed_at = now();

  INSERT INTO reputation.lenser_scores (lenser_id, score_type, score, uncertainty, computed_at)
  VALUES (v_lenser_b, 'elo', v_rating_b.elo_rating, v_rating_b.uncertainty, now())
  ON CONFLICT (lenser_id, score_type) DO UPDATE SET
    score       = EXCLUDED.score,
    uncertainty = EXCLUDED.uncertainty,
    computed_at = now();

  RETURN NEW;
END;
$$;
