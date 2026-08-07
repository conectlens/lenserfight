-- fn_battles_get_public's status whitelist never included 'executing', even
-- though the base battles_select RLS policy and the status enum itself both
-- treat 'executing' as a normal public-visible state between 'open' and
-- 'voting'. Every consumer of this RPC (CLI `battle view`/`battle status`,
-- and anything else calling fn_battles_get_public) returned "not found" for
-- the entire duration a battle was actually running — the one moment users
-- most want to check on it.

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
