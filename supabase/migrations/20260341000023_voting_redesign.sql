-- =============================================================================
-- MIGRATION 23: VOTING REDESIGN
-- =============================================================================
-- Adds contender-targeted voting, vote_choices table, vote_aggregates table.
-- Keeps backward-compatible vote_value enum. Updates fn_battles_vote and
-- fn_battles_finalize to use aggregate-based winner determination.
-- =============================================================================

-- ─────────────────────────────────────────────────────────────────────────────
-- SECTION 1: ADD COLUMNS TO battles.votes
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE "battles"."votes"
    ADD COLUMN IF NOT EXISTS "voted_contender_id" "uuid",
    ADD COLUMN IF NOT EXISTS "is_draw" boolean DEFAULT false NOT NULL,
    ADD COLUMN IF NOT EXISTS "voter_actor_id" "uuid",
    ADD COLUMN IF NOT EXISTS "weight" numeric DEFAULT 1.0 NOT NULL,
    ADD COLUMN IF NOT EXISTS "is_ai_vote" boolean DEFAULT false NOT NULL;


-- ─────────────────────────────────────────────────────────────────────────────
-- SECTION 2: NEW TABLES
-- ─────────────────────────────────────────────────────────────────────────────

-- 2.1 battles.vote_choices — for ranked/multi-criteria voting
CREATE TABLE IF NOT EXISTS "battles"."vote_choices" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "vote_id" "uuid" NOT NULL,
    "contender_id" "uuid" NOT NULL,
    "rank_ordinal" integer,
    "score_value" numeric,
    "is_selected" boolean DEFAULT false NOT NULL,
    "rationale" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "vote_choices_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "battles"."vote_choices" OWNER TO "postgres";


-- 2.2 battles.vote_aggregates — materialized vote summary per contender
CREATE TABLE IF NOT EXISTS "battles"."vote_aggregates" (
    "battle_id" "uuid" NOT NULL,
    "contender_id" "uuid" NOT NULL,
    "raw_vote_count" integer DEFAULT 0 NOT NULL,
    "weighted_vote_sum" numeric DEFAULT 0 NOT NULL,
    "draw_count" integer DEFAULT 0 NOT NULL,
    "rank_position" integer,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "vote_aggregates_pkey" PRIMARY KEY ("battle_id", "contender_id")
);

ALTER TABLE "battles"."vote_aggregates" OWNER TO "postgres";


-- ─────────────────────────────────────────────────────────────────────────────
-- SECTION 3: FOREIGN KEYS
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE "battles"."votes"
    ADD CONSTRAINT "votes_voted_contender_id_fkey"
    FOREIGN KEY ("voted_contender_id")
    REFERENCES "battles"."contenders"("id") ON DELETE CASCADE;

ALTER TABLE "battles"."votes"
    ADD CONSTRAINT "votes_voter_actor_id_fkey"
    FOREIGN KEY ("voter_actor_id")
    REFERENCES "actors"."actors"("id") ON DELETE SET NULL;

ALTER TABLE "battles"."vote_choices"
    ADD CONSTRAINT "vote_choices_vote_id_fkey"
    FOREIGN KEY ("vote_id")
    REFERENCES "battles"."votes"("id") ON DELETE CASCADE;

ALTER TABLE "battles"."vote_choices"
    ADD CONSTRAINT "vote_choices_contender_id_fkey"
    FOREIGN KEY ("contender_id")
    REFERENCES "battles"."contenders"("id") ON DELETE CASCADE;

ALTER TABLE "battles"."vote_aggregates"
    ADD CONSTRAINT "vote_aggregates_battle_id_fkey"
    FOREIGN KEY ("battle_id")
    REFERENCES "battles"."battles"("id") ON DELETE CASCADE;

ALTER TABLE "battles"."vote_aggregates"
    ADD CONSTRAINT "vote_aggregates_contender_id_fkey"
    FOREIGN KEY ("contender_id")
    REFERENCES "battles"."contenders"("id") ON DELETE CASCADE;


-- ─────────────────────────────────────────────────────────────────────────────
-- SECTION 4: INDEXES
-- ─────────────────────────────────────────────────────────────────────────────

-- votes
CREATE INDEX "idx_votes_contender" ON "battles"."votes" ("voted_contender_id")
    WHERE "voted_contender_id" IS NOT NULL;
CREATE INDEX "idx_votes_voter_actor" ON "battles"."votes" ("voter_actor_id")
    WHERE "voter_actor_id" IS NOT NULL;
CREATE INDEX "idx_votes_battle_created" ON "battles"."votes" ("battle_id", "created_at" DESC);

-- vote_choices
CREATE UNIQUE INDEX "idx_vote_choices_vote_contender" ON "battles"."vote_choices" ("vote_id", "contender_id");
CREATE INDEX "idx_vote_choices_contender" ON "battles"."vote_choices" ("contender_id");
CREATE INDEX "idx_vote_choices_rank" ON "battles"."vote_choices" ("vote_id", "rank_ordinal")
    WHERE "rank_ordinal" IS NOT NULL;

-- vote_aggregates
CREATE INDEX "idx_vote_aggregates_rank" ON "battles"."vote_aggregates" ("battle_id", "rank_position");
CREATE INDEX "idx_vote_aggregates_score" ON "battles"."vote_aggregates" ("battle_id", "weighted_vote_sum" DESC);


-- ─────────────────────────────────────────────────────────────────────────────
-- SECTION 5: BACKFILL
-- ─────────────────────────────────────────────────────────────────────────────

-- 5.1 Set voted_contender_id from vote_value + slot mapping
UPDATE "battles"."votes" v
SET "voted_contender_id" = c."id",
    "is_draw" = false
FROM "battles"."contenders" c
WHERE c."battle_id" = v."battle_id"
  AND c."slot" = CASE v."vote_value"
    WHEN 'contender_a' THEN 'A'::"bpchar"
    WHEN 'contender_b' THEN 'B'::"bpchar"
  END
  AND v."vote_value" IN ('contender_a', 'contender_b')
  AND v."voted_contender_id" IS NULL;

-- 5.2 Mark draw votes
UPDATE "battles"."votes"
SET "is_draw" = true
WHERE "vote_value" = 'draw'
  AND "is_draw" = false;

-- 5.3 Set voter_actor_id from voter_lenser_id
UPDATE "battles"."votes" v
SET "voter_actor_id" = a."id"
FROM "actors"."actors" a
WHERE a."profile_id" = v."voter_lenser_id"
  AND v."voter_actor_id" IS NULL;

-- 5.4 Populate vote_aggregates from existing votes
INSERT INTO "battles"."vote_aggregates" (
    "battle_id", "contender_id", "raw_vote_count", "weighted_vote_sum", "draw_count"
)
SELECT
    c."battle_id",
    c."id",
    COUNT(*) FILTER (WHERE v."voted_contender_id" = c."id" AND NOT v."is_draw"),
    COALESCE(SUM(v."weight") FILTER (WHERE v."voted_contender_id" = c."id" AND NOT v."is_draw"), 0),
    COUNT(*) FILTER (WHERE v."is_draw" AND v."battle_id" = c."battle_id")
FROM "battles"."contenders" c
LEFT JOIN "battles"."votes" v ON v."battle_id" = c."battle_id"
GROUP BY c."battle_id", c."id"
ON CONFLICT ("battle_id", "contender_id") DO UPDATE
SET "raw_vote_count" = EXCLUDED."raw_vote_count",
    "weighted_vote_sum" = EXCLUDED."weighted_vote_sum",
    "draw_count" = EXCLUDED."draw_count",
    "updated_at" = now();


-- ─────────────────────────────────────────────────────────────────────────────
-- SECTION 6: ROW LEVEL SECURITY
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE "battles"."vote_choices" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "battles"."vote_aggregates" ENABLE ROW LEVEL SECURITY;

-- vote_choices: readable when battle is in voting or later
CREATE POLICY "vote_choices_select_public" ON "battles"."vote_choices"
    FOR SELECT TO "authenticated"
    USING (EXISTS (
        SELECT 1 FROM "battles"."votes" v
        JOIN "battles"."battles" b ON b."id" = v."battle_id"
        WHERE v."id" = "vote_choices"."vote_id"
          AND b."status" IN ('voting', 'scoring', 'closed', 'published')
          AND b."deleted_at" IS NULL
    ));

-- vote_choices: service_role full access
CREATE POLICY "vote_choices_service_all" ON "battles"."vote_choices"
    FOR ALL TO "service_role"
    USING (true)
    WITH CHECK (true);

-- vote_aggregates: readable when battle is in voting or later
CREATE POLICY "vote_aggregates_select_public" ON "battles"."vote_aggregates"
    FOR SELECT TO "authenticated"
    USING (EXISTS (
        SELECT 1 FROM "battles"."battles" b
        WHERE b."id" = "vote_aggregates"."battle_id"
          AND b."status" IN ('voting', 'scoring', 'closed', 'published')
          AND b."deleted_at" IS NULL
    ));

-- vote_aggregates: service_role full access
CREATE POLICY "vote_aggregates_service_all" ON "battles"."vote_aggregates"
    FOR ALL TO "service_role"
    USING (true)
    WITH CHECK (true);


-- ─────────────────────────────────────────────────────────────────────────────
-- SECTION 7: GRANTS
-- ─────────────────────────────────────────────────────────────────────────────

GRANT ALL ON TABLE "battles"."vote_choices" TO "service_role";
GRANT SELECT ON TABLE "battles"."vote_choices" TO "authenticated";

GRANT ALL ON TABLE "battles"."vote_aggregates" TO "service_role";
GRANT SELECT ON TABLE "battles"."vote_aggregates" TO "authenticated";


-- ─────────────────────────────────────────────────────────────────────────────
-- SECTION 8: UPDATE fn_battles_vote — support contender-targeted voting
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION "public"."fn_battles_vote"(
    "p_battle_id" "uuid",
    "p_vote" "battles"."vote_value_enum",
    "p_rationale" "text" DEFAULT NULL::"text",
    "p_contender_id" "uuid" DEFAULT NULL::"uuid"
) RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'battles', 'lensers', 'actors'
    AS $$
DECLARE
    v_lenser_id uuid;
    v_battle RECORD;
    v_voted_contender_id uuid;
    v_is_draw boolean := false;
    v_voter_actor_id uuid;
BEGIN
    v_lenser_id := lensers.get_auth_lenser_id();
    IF v_lenser_id IS NULL THEN
        RAISE EXCEPTION 'Authentication required';
    END IF;

    SELECT * INTO v_battle
    FROM battles.battles WHERE id = p_battle_id;

    IF v_battle IS NULL THEN
        RAISE EXCEPTION 'Battle not found';
    END IF;

    IF v_battle.status <> 'voting' THEN
        RAISE EXCEPTION 'Battle is not in voting phase';
    END IF;

    -- Check voting window
    IF v_battle.voting_closes_at IS NOT NULL AND now() > v_battle.voting_closes_at THEN
        RAISE EXCEPTION 'Voting window has closed';
    END IF;

    -- Prevent contenders from voting on their own battle
    IF EXISTS (
        SELECT 1 FROM battles.contenders c
        WHERE c.battle_id = p_battle_id
          AND (
              c.contender_ref_id = v_lenser_id
              OR c.actor_id = (SELECT id FROM actors.actors WHERE profile_id = v_lenser_id LIMIT 1)
          )
    ) THEN
        RAISE EXCEPTION 'Contenders cannot vote on their own battle';
    END IF;

    -- Resolve voted_contender_id
    IF p_contender_id IS NOT NULL THEN
        -- Direct contender vote
        IF NOT EXISTS (
            SELECT 1 FROM battles.contenders WHERE id = p_contender_id AND battle_id = p_battle_id
        ) THEN
            RAISE EXCEPTION 'Contender not found in this battle';
        END IF;
        v_voted_contender_id := p_contender_id;
        v_is_draw := false;
    ELSIF p_vote = 'draw' THEN
        v_voted_contender_id := NULL;
        v_is_draw := true;
    ELSE
        -- Legacy slot-based vote: resolve from vote_value
        SELECT c.id INTO v_voted_contender_id
        FROM battles.contenders c
        WHERE c.battle_id = p_battle_id
          AND c.slot = CASE p_vote
              WHEN 'contender_a' THEN 'A'::bpchar
              WHEN 'contender_b' THEN 'B'::bpchar
          END;
        v_is_draw := false;
    END IF;

    -- Look up voter actor
    SELECT id INTO v_voter_actor_id
    FROM actors.actors
    WHERE profile_id = v_lenser_id
    LIMIT 1;

    -- Insert the vote
    INSERT INTO battles.votes (
        battle_id, voter_lenser_id, vote_value, rationale,
        voted_contender_id, is_draw, voter_actor_id, weight, is_ai_vote
    )
    VALUES (
        p_battle_id, v_lenser_id, p_vote, p_rationale,
        v_voted_contender_id, v_is_draw, v_voter_actor_id, 1.0, false
    );

    -- Update vote_aggregates
    IF v_voted_contender_id IS NOT NULL AND NOT v_is_draw THEN
        INSERT INTO battles.vote_aggregates (battle_id, contender_id, raw_vote_count, weighted_vote_sum)
        VALUES (p_battle_id, v_voted_contender_id, 1, 1.0)
        ON CONFLICT (battle_id, contender_id) DO UPDATE
        SET raw_vote_count = battles.vote_aggregates.raw_vote_count + 1,
            weighted_vote_sum = battles.vote_aggregates.weighted_vote_sum + 1.0,
            updated_at = now();
    ELSIF v_is_draw THEN
        -- Increment draw_count for all contenders in this battle
        INSERT INTO battles.vote_aggregates (battle_id, contender_id, draw_count)
        SELECT p_battle_id, c.id, 1
        FROM battles.contenders c
        WHERE c.battle_id = p_battle_id
        ON CONFLICT (battle_id, contender_id) DO UPDATE
        SET draw_count = battles.vote_aggregates.draw_count + 1,
            updated_at = now();
    END IF;

    -- Log the vote event
    INSERT INTO battles.events (battle_id, event_type, actor_id, metadata)
    VALUES (
        p_battle_id,
        'vote_cast',
        v_lenser_id,
        jsonb_build_object(
            'vote_value', p_vote::text,
            'contender_id', v_voted_contender_id,
            'is_draw', v_is_draw
        )
    );
END;
$$;

ALTER FUNCTION "public"."fn_battles_vote"("p_battle_id" "uuid", "p_vote" "battles"."vote_value_enum", "p_rationale" "text", "p_contender_id" "uuid") OWNER TO "postgres";

GRANT ALL ON FUNCTION "public"."fn_battles_vote"("p_battle_id" "uuid", "p_vote" "battles"."vote_value_enum", "p_rationale" "text", "p_contender_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."fn_battles_vote"("p_battle_id" "uuid", "p_vote" "battles"."vote_value_enum", "p_rationale" "text", "p_contender_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_battles_vote"("p_battle_id" "uuid", "p_vote" "battles"."vote_value_enum", "p_rationale" "text", "p_contender_id" "uuid") TO "service_role";


-- ─────────────────────────────────────────────────────────────────────────────
-- SECTION 9: UPDATE fn_battles_finalize — aggregate-based winner
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION "public"."fn_battles_finalize"("p_battle_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'battles', 'lensers', 'xp', 'actors'
    AS $$
DECLARE
    v_battle RECORD;
    v_winner_id uuid;
    v_top RECORD;
    v_count_a int;
    v_count_b int;
    v_count_draw int;
    v_contender_a uuid;
    v_contender_b uuid;
BEGIN
    SELECT * INTO v_battle
    FROM battles.battles WHERE id = p_battle_id;

    IF v_battle IS NULL THEN
        RAISE EXCEPTION 'Battle not found';
    END IF;

    IF v_battle.status NOT IN ('voting', 'scoring') THEN
        RAISE EXCEPTION 'Battle must be in voting or scoring status to finalize (current: %)', v_battle.status;
    END IF;

    -- Determine winner from vote_aggregates (highest raw_vote_count)
    SELECT contender_id, raw_vote_count
    INTO v_top
    FROM battles.vote_aggregates
    WHERE battle_id = p_battle_id
    ORDER BY raw_vote_count DESC
    LIMIT 1;

    -- Check if there's a tie
    IF v_top IS NOT NULL THEN
        DECLARE
            v_tie_count int;
        BEGIN
            SELECT COUNT(*) INTO v_tie_count
            FROM battles.vote_aggregates
            WHERE battle_id = p_battle_id
              AND raw_vote_count = v_top.raw_vote_count;

            IF v_tie_count > 1 THEN
                v_winner_id := NULL; -- draw
            ELSE
                v_winner_id := v_top.contender_id;
            END IF;
        END;
    END IF;

    -- Compute rank_positions
    UPDATE battles.vote_aggregates va
    SET rank_position = sub.rk
    FROM (
        SELECT contender_id,
               ROW_NUMBER() OVER (ORDER BY raw_vote_count DESC, weighted_vote_sum DESC) AS rk
        FROM battles.vote_aggregates
        WHERE battle_id = p_battle_id
    ) sub
    WHERE va.battle_id = p_battle_id
      AND va.contender_id = sub.contender_id;

    -- Backward compat: compute legacy vote counts
    SELECT
        COALESCE(COUNT(*) FILTER (WHERE vote_value = 'contender_a'), 0),
        COALESCE(COUNT(*) FILTER (WHERE vote_value = 'contender_b'), 0),
        COALESCE(COUNT(*) FILTER (WHERE vote_value = 'draw'), 0)
    INTO v_count_a, v_count_b, v_count_draw
    FROM battles.votes WHERE battle_id = p_battle_id;

    -- Update battle
    UPDATE battles.battles
    SET status = 'closed',
        vote_count_a = v_count_a,
        vote_count_b = v_count_b,
        vote_count_draw = v_count_draw,
        winner_contender_id = v_winner_id,
        finalized_at = now(),
        updated_at = now()
    WHERE id = p_battle_id;
END;
$$;

ALTER FUNCTION "public"."fn_battles_finalize"("p_battle_id" "uuid") OWNER TO "postgres";
