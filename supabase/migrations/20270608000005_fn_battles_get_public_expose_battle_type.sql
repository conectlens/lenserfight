-- fn_battles_get_public's hand-built jsonb_build_object omits battle_type
-- entirely, even though it's the one field that lets a caller sanity-check
-- what kind of battle they're about to join (ai_vs_ai, human_vs_ai, etc.)
-- against what they're actually seeing. See GitHub issue #495: an AI agent
-- joined a battle whose declared type required human contenders, with no
-- way to have caught the mismatch beforehand via `lf battle view` because
-- this RPC never returned battle_type in the first place.

CREATE OR REPLACE FUNCTION "public"."fn_battles_get_public"("p_battle_id" "uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'battles', 'lensers'
    AS $$
DECLARE
    v_battle RECORD;
    v_contenders jsonb;
    v_aggregates jsonb;
    v_result jsonb;
BEGIN
    SELECT * INTO v_battle
    FROM battles.battles
    WHERE id = p_battle_id
      AND status IN ('open', 'executing', 'voting', 'scoring', 'closed', 'published')
      AND deleted_at IS NULL;

    IF v_battle IS NULL THEN
        RETURN NULL;
    END IF;

    -- Build contenders array (no actor_id)
    SELECT COALESCE(jsonb_agg(jsonb_build_object(
        'id', c.id,
        'slot', c.slot,
        'contender_type', c.contender_type::text,
        'display_name', c.display_name,
        'contender_status', c.contender_status
    ) ORDER BY c.slot), '[]'::jsonb)
    INTO v_contenders
    FROM battles.contenders c
    WHERE c.battle_id = p_battle_id;

    -- Build vote aggregates array
    SELECT COALESCE(jsonb_agg(jsonb_build_object(
        'contender_id', va.contender_id,
        'raw_vote_count', va.raw_vote_count,
        'weighted_vote_sum', va.weighted_vote_sum,
        'draw_count', va.draw_count,
        'rank_position', va.rank_position
    ) ORDER BY va.rank_position NULLS LAST), '[]'::jsonb)
    INTO v_aggregates
    FROM battles.vote_aggregates va
    WHERE va.battle_id = p_battle_id;

    -- Compose result
    v_result := jsonb_build_object(
        'id', v_battle.id,
        'title', v_battle.title,
        'slug', v_battle.slug,
        'status', v_battle.status,
        'battle_type', v_battle.battle_type,
        'task_prompt', v_battle.task_prompt,
        'max_contenders', v_battle.max_contenders,
        'invite_code', v_battle.invite_code,
        'total_vote_count', v_battle.total_vote_count,
        'winner_contender_id', v_battle.winner_contender_id,
        'voting_opens_at', v_battle.voting_opens_at,
        'voting_closes_at', v_battle.voting_closes_at,
        'published_at', v_battle.published_at,
        'finalized_at', v_battle.finalized_at,
        'created_at', v_battle.created_at,
        'contenders', v_contenders,
        'vote_aggregates', v_aggregates
    );

    RETURN v_result;
END;
$$;
