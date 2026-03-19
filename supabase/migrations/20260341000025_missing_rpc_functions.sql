-- =============================================================================
-- MIGRATION 25: MISSING RPC FUNCTIONS
-- =============================================================================
-- Creates the 7 RPC functions referenced by the CLI but missing from migrations:
-- fn_battles_list_public, fn_battles_get_public, fn_battles_leaderboard,
-- fn_battles_clone, fn_battles_close, fn_battles_retract, fn_battles_delete
-- =============================================================================

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. fn_battles_list_public — list public battles with pagination
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION "public"."fn_battles_list_public"(
    "p_limit" integer DEFAULT 20,
    "p_offset" integer DEFAULT 0
) RETURNS TABLE (
    "id" "uuid",
    "title" "text",
    "slug" "text",
    "status" "text",
    "contender_count" bigint,
    "vote_count_a" integer,
    "vote_count_b" integer,
    "vote_count_draw" integer,
    "creator_display_name" "text",
    "created_at" timestamp with time zone,
    "voting_opens_at" timestamp with time zone,
    "voting_closes_at" timestamp with time zone
)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'battles', 'lensers'
    AS $$
BEGIN
    RETURN QUERY
    SELECT
        b.id,
        b.title,
        b.slug,
        b.status::text,
        (SELECT COUNT(*) FROM battles.contenders c WHERE c.battle_id = b.id) AS contender_count,
        b.vote_count_a,
        b.vote_count_b,
        b.vote_count_draw,
        p.display_name AS creator_display_name,
        b.created_at,
        b.voting_opens_at,
        b.voting_closes_at
    FROM battles.battles b
    JOIN lensers.profiles p ON p.id = b.creator_lenser_id
    WHERE b.status IN ('open', 'voting', 'scoring', 'closed', 'published')
      AND b.deleted_at IS NULL
    ORDER BY b.created_at DESC
    LIMIT p_limit
    OFFSET p_offset;
END;
$$;

ALTER FUNCTION "public"."fn_battles_list_public"("p_limit" integer, "p_offset" integer) OWNER TO "postgres";

GRANT ALL ON FUNCTION "public"."fn_battles_list_public"("p_limit" integer, "p_offset" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."fn_battles_list_public"("p_limit" integer, "p_offset" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_battles_list_public"("p_limit" integer, "p_offset" integer) TO "service_role";


-- ─────────────────────────────────────────────────────────────────────────────
-- 2. fn_battles_get_public — full battle detail with contenders and votes
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION "public"."fn_battles_get_public"(
    "p_battle_id" "uuid"
) RETURNS "jsonb"
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
      AND status IN ('open', 'voting', 'scoring', 'closed', 'published')
      AND deleted_at IS NULL;

    IF v_battle IS NULL THEN
        RETURN NULL;
    END IF;

    -- Build contenders array
    SELECT COALESCE(jsonb_agg(jsonb_build_object(
        'id', c.id,
        'slot', c.slot,
        'contender_type', c.contender_type::text,
        'display_name', c.display_name,
        'actor_id', c.actor_id,
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
        'vote_count_a', v_battle.vote_count_a,
        'vote_count_b', v_battle.vote_count_b,
        'vote_count_draw', v_battle.vote_count_draw,
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

ALTER FUNCTION "public"."fn_battles_get_public"("p_battle_id" "uuid") OWNER TO "postgres";

GRANT ALL ON FUNCTION "public"."fn_battles_get_public"("p_battle_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."fn_battles_get_public"("p_battle_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_battles_get_public"("p_battle_id" "uuid") TO "service_role";


-- ─────────────────────────────────────────────────────────────────────────────
-- 3. fn_battles_leaderboard — ranked contenders by votes
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION "public"."fn_battles_leaderboard"(
    "p_battle_id" "uuid"
) RETURNS TABLE (
    "rank" integer,
    "contender_id" "uuid",
    "display_name" "text",
    "score" numeric,
    "vote_count" integer
)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'battles'
    AS $$
BEGIN
    RETURN QUERY
    SELECT
        COALESCE(va.rank_position, 0)::integer AS rank,
        c.id AS contender_id,
        c.display_name,
        va.weighted_vote_sum AS score,
        va.raw_vote_count AS vote_count
    FROM battles.contenders c
    LEFT JOIN battles.vote_aggregates va
        ON va.battle_id = c.battle_id AND va.contender_id = c.id
    WHERE c.battle_id = p_battle_id
    ORDER BY va.rank_position NULLS LAST, va.raw_vote_count DESC NULLS LAST;
END;
$$;

ALTER FUNCTION "public"."fn_battles_leaderboard"("p_battle_id" "uuid") OWNER TO "postgres";

GRANT ALL ON FUNCTION "public"."fn_battles_leaderboard"("p_battle_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."fn_battles_leaderboard"("p_battle_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_battles_leaderboard"("p_battle_id" "uuid") TO "service_role";


-- ─────────────────────────────────────────────────────────────────────────────
-- 4. fn_battles_clone — copy battle as new draft
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION "public"."fn_battles_clone"(
    "p_battle_id" "uuid",
    "p_title" "text",
    "p_slug" "text"
) RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'battles', 'lensers'
    AS $$
DECLARE
    v_lenser_id uuid;
    v_source RECORD;
    v_new_id uuid;
BEGIN
    v_lenser_id := lensers.get_auth_lenser_id();
    IF v_lenser_id IS NULL THEN
        RAISE EXCEPTION 'Authentication required';
    END IF;

    SELECT * INTO v_source
    FROM battles.battles
    WHERE id = p_battle_id
      AND deleted_at IS NULL;

    IF v_source IS NULL THEN
        RAISE EXCEPTION 'Battle not found';
    END IF;

    INSERT INTO battles.battles (
        creator_lenser_id, title, slug, task_prompt,
        rubric_id, status, max_contenders
    )
    VALUES (
        v_lenser_id, p_title, p_slug, v_source.task_prompt,
        v_source.rubric_id, 'draft', v_source.max_contenders
    )
    RETURNING id INTO v_new_id;

    -- Log the event
    INSERT INTO battles.events (battle_id, event_type, actor_id, metadata)
    VALUES (
        v_new_id,
        'status_change',
        v_lenser_id,
        jsonb_build_object('action', 'cloned', 'source_battle_id', p_battle_id)
    );

    RETURN v_new_id;
END;
$$;

ALTER FUNCTION "public"."fn_battles_clone"("p_battle_id" "uuid", "p_title" "text", "p_slug" "text") OWNER TO "postgres";

GRANT ALL ON FUNCTION "public"."fn_battles_clone"("p_battle_id" "uuid", "p_title" "text", "p_slug" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."fn_battles_clone"("p_battle_id" "uuid", "p_title" "text", "p_slug" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_battles_clone"("p_battle_id" "uuid", "p_title" "text", "p_slug" "text") TO "service_role";


-- ─────────────────────────────────────────────────────────────────────────────
-- 5. fn_battles_close — transition scoring → closed
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION "public"."fn_battles_close"(
    "p_battle_id" "uuid"
) RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'battles', 'lensers'
    AS $$
DECLARE
    v_battle RECORD;
    v_lenser_id uuid;
BEGIN
    v_lenser_id := lensers.get_auth_lenser_id();

    SELECT * INTO v_battle
    FROM battles.battles WHERE id = p_battle_id;

    IF v_battle IS NULL THEN
        RAISE EXCEPTION 'Battle not found';
    END IF;

    IF v_battle.creator_lenser_id != v_lenser_id THEN
        RAISE EXCEPTION 'Only the battle creator can close';
    END IF;

    IF v_battle.status NOT IN ('open', 'scoring') THEN
        RAISE EXCEPTION 'Battle must be in open or scoring status to close (current: %)', v_battle.status;
    END IF;

    UPDATE battles.battles
    SET status = 'closed',
        finalized_at = now(),
        updated_at = now()
    WHERE id = p_battle_id;

    -- Log the event
    INSERT INTO battles.events (battle_id, event_type, actor_id, metadata)
    VALUES (
        p_battle_id,
        'status_change',
        v_lenser_id,
        jsonb_build_object('from', v_battle.status::text, 'to', 'closed')
    );
END;
$$;

ALTER FUNCTION "public"."fn_battles_close"("p_battle_id" "uuid") OWNER TO "postgres";

GRANT ALL ON FUNCTION "public"."fn_battles_close"("p_battle_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."fn_battles_close"("p_battle_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_battles_close"("p_battle_id" "uuid") TO "service_role";


-- ─────────────────────────────────────────────────────────────────────────────
-- 6. fn_battles_retract — unpublish / cancel a battle
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION "public"."fn_battles_retract"(
    "p_battle_id" "uuid"
) RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'battles', 'lensers'
    AS $$
DECLARE
    v_battle RECORD;
    v_lenser_id uuid;
BEGIN
    v_lenser_id := lensers.get_auth_lenser_id();

    SELECT * INTO v_battle
    FROM battles.battles WHERE id = p_battle_id;

    IF v_battle IS NULL THEN
        RAISE EXCEPTION 'Battle not found';
    END IF;

    IF v_battle.creator_lenser_id != v_lenser_id THEN
        RAISE EXCEPTION 'Only the battle creator can retract';
    END IF;

    IF v_battle.status NOT IN ('draft', 'open', 'published') THEN
        RAISE EXCEPTION 'Battle must be in draft, open, or published status to retract (current: %)', v_battle.status;
    END IF;

    UPDATE battles.battles
    SET status = 'archived',
        updated_at = now()
    WHERE id = p_battle_id;

    -- Log the event
    INSERT INTO battles.events (battle_id, event_type, actor_id, metadata)
    VALUES (
        p_battle_id,
        'status_change',
        v_lenser_id,
        jsonb_build_object('from', v_battle.status::text, 'to', 'archived', 'action', 'retracted')
    );
END;
$$;

ALTER FUNCTION "public"."fn_battles_retract"("p_battle_id" "uuid") OWNER TO "postgres";

GRANT ALL ON FUNCTION "public"."fn_battles_retract"("p_battle_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."fn_battles_retract"("p_battle_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_battles_retract"("p_battle_id" "uuid") TO "service_role";


-- ─────────────────────────────────────────────────────────────────────────────
-- 7. fn_battles_delete — soft-delete a battle
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION "public"."fn_battles_delete"(
    "p_battle_id" "uuid"
) RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'battles', 'lensers'
    AS $$
DECLARE
    v_battle RECORD;
    v_lenser_id uuid;
BEGIN
    v_lenser_id := lensers.get_auth_lenser_id();

    SELECT * INTO v_battle
    FROM battles.battles WHERE id = p_battle_id;

    IF v_battle IS NULL THEN
        RAISE EXCEPTION 'Battle not found';
    END IF;

    IF v_battle.creator_lenser_id != v_lenser_id THEN
        RAISE EXCEPTION 'Only the battle creator can delete';
    END IF;

    IF v_battle.status NOT IN ('draft', 'open') THEN
        RAISE EXCEPTION 'Only draft or open battles can be deleted (current: %)', v_battle.status;
    END IF;

    UPDATE battles.battles
    SET deleted_at = now(),
        updated_at = now()
    WHERE id = p_battle_id;

    -- Log the event
    INSERT INTO battles.events (battle_id, event_type, actor_id, metadata)
    VALUES (
        p_battle_id,
        'status_change',
        v_lenser_id,
        jsonb_build_object('action', 'deleted', 'previous_status', v_battle.status::text)
    );
END;
$$;

ALTER FUNCTION "public"."fn_battles_delete"("p_battle_id" "uuid") OWNER TO "postgres";

GRANT ALL ON FUNCTION "public"."fn_battles_delete"("p_battle_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."fn_battles_delete"("p_battle_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_battles_delete"("p_battle_id" "uuid") TO "service_role";
