-- =============================================================================
-- Migration: 20260315000000_battles_schema.sql
-- Purpose:   Create the battles domain — LenserFight's core product layer.
--            Covers rubrics, battles, contenders, submissions, votes,
--            scorecards, RLS, RPCs, XP integration, and grants.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. SCHEMA
-- ---------------------------------------------------------------------------

CREATE SCHEMA IF NOT EXISTS "battles";
ALTER SCHEMA "battles" OWNER TO "postgres";

-- ---------------------------------------------------------------------------
-- 2. ENUMS
-- ---------------------------------------------------------------------------

CREATE TYPE "battles"."battle_status_enum" AS ENUM (
    'draft',
    'open',
    'voting',
    'scoring',
    'closed',
    'published',
    'archived'
);
ALTER TYPE "battles"."battle_status_enum" OWNER TO "postgres";

CREATE TYPE "battles"."contender_type_enum" AS ENUM (
    'human',
    'ai_model',
    'ai_agent'
);
ALTER TYPE "battles"."contender_type_enum" OWNER TO "postgres";

CREATE TYPE "battles"."submission_status_enum" AS ENUM (
    'pending',
    'submitted',
    'withdrawn',
    'disqualified'
);
ALTER TYPE "battles"."submission_status_enum" OWNER TO "postgres";

CREATE TYPE "battles"."vote_value_enum" AS ENUM (
    'contender_a',
    'contender_b',
    'draw'
);
ALTER TYPE "battles"."vote_value_enum" OWNER TO "postgres";

CREATE TYPE "battles"."scorecard_result_enum" AS ENUM (
    'pass',
    'fail',
    'partial',
    'skipped'
);
ALTER TYPE "battles"."scorecard_result_enum" OWNER TO "postgres";

-- ---------------------------------------------------------------------------
-- 3. HELPER FUNCTIONS
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION "battles"."set_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;
ALTER FUNCTION "battles"."set_updated_at"() OWNER TO "postgres";

-- ---------------------------------------------------------------------------
-- 4. TABLES
-- ---------------------------------------------------------------------------

-- 4.1  Rubrics — reusable evaluation templates
CREATE TABLE IF NOT EXISTS "battles"."rubrics" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "creator_lenser_id" "uuid" NOT NULL,
    "title" "text" NOT NULL,
    "description" "text",
    "is_public" boolean DEFAULT true NOT NULL,
    "version" integer DEFAULT 1 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "deleted_at" timestamp with time zone,
    CONSTRAINT "rubrics_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "rubrics_creator_lenser_id_fkey"
        FOREIGN KEY ("creator_lenser_id") REFERENCES "lensers"."profiles"("id") ON DELETE CASCADE
);
ALTER TABLE "battles"."rubrics" OWNER TO "postgres";

-- 4.2  Rubric criteria — ordered evaluation items per rubric
CREATE TABLE IF NOT EXISTS "battles"."rubric_criteria" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "rubric_id" "uuid" NOT NULL,
    "ordinal" integer NOT NULL,
    "title" "text" NOT NULL,
    "description" "text",
    "weight" numeric DEFAULT 1.0 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "rubric_criteria_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "rubric_criteria_rubric_id_fkey"
        FOREIGN KEY ("rubric_id") REFERENCES "battles"."rubrics"("id") ON DELETE CASCADE,
    CONSTRAINT "rubric_criteria_rubric_ordinal_unique"
        UNIQUE ("rubric_id", "ordinal"),
    CONSTRAINT "rubric_criteria_weight_positive" CHECK ("weight" > 0)
);
ALTER TABLE "battles"."rubric_criteria" OWNER TO "postgres";

-- 4.3  Battles — core arena entity
CREATE TABLE IF NOT EXISTS "battles"."battles" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "creator_lenser_id" "uuid" DEFAULT "lensers"."get_auth_lenser_id"() NOT NULL,
    "title" "text" NOT NULL,
    "slug" "text" NOT NULL,
    "task_prompt" "text" NOT NULL,
    "rubric_id" "uuid",
    "status" "battles"."battle_status_enum" DEFAULT 'draft'::"battles"."battle_status_enum" NOT NULL,
    "invite_code" "text",
    "forum_thread_id" "uuid",
    "max_contenders" integer DEFAULT 2 NOT NULL,
    "voting_opens_at" timestamp with time zone,
    "voting_closes_at" timestamp with time zone,
    "published_at" timestamp with time zone,
    "finalized_at" timestamp with time zone,
    "winner_contender_id" "uuid",
    "vote_count_a" integer DEFAULT 0 NOT NULL,
    "vote_count_b" integer DEFAULT 0 NOT NULL,
    "vote_count_draw" integer DEFAULT 0 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "deleted_at" timestamp with time zone,
    CONSTRAINT "battles_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "battles_slug_unique" UNIQUE ("slug"),
    CONSTRAINT "battles_invite_code_unique" UNIQUE ("invite_code"),
    CONSTRAINT "battles_creator_lenser_id_fkey"
        FOREIGN KEY ("creator_lenser_id") REFERENCES "lensers"."profiles"("id") ON DELETE CASCADE,
    CONSTRAINT "battles_rubric_id_fkey"
        FOREIGN KEY ("rubric_id") REFERENCES "battles"."rubrics"("id") ON DELETE SET NULL,
    CONSTRAINT "battles_forum_thread_id_fkey"
        FOREIGN KEY ("forum_thread_id") REFERENCES "content"."threads"("id") ON DELETE SET NULL,
    CONSTRAINT "battles_max_contenders_min" CHECK ("max_contenders" >= 2),
    CONSTRAINT "battles_voting_window_order"
        CHECK ("voting_opens_at" IS NULL OR "voting_closes_at" IS NULL
               OR "voting_opens_at" < "voting_closes_at")
);
ALTER TABLE "battles"."battles" OWNER TO "postgres";

-- 4.4  Contenders — battle participants (human or AI)
CREATE TABLE IF NOT EXISTS "battles"."contenders" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "battle_id" "uuid" NOT NULL,
    "slot" char(1) NOT NULL,
    "contender_type" "battles"."contender_type_enum" NOT NULL,
    "contender_ref_id" "uuid" NOT NULL,
    "display_name" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "contenders_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "contenders_battle_id_fkey"
        FOREIGN KEY ("battle_id") REFERENCES "battles"."battles"("id") ON DELETE CASCADE,
    CONSTRAINT "contenders_battle_slot_unique" UNIQUE ("battle_id", "slot"),
    CONSTRAINT "contenders_battle_ref_unique" UNIQUE ("battle_id", "contender_ref_id"),
    CONSTRAINT "contenders_slot_letter" CHECK ("slot" >= 'A' AND "slot" <= 'Z')
);
ALTER TABLE "battles"."contenders" OWNER TO "postgres";

-- Deferred FK: battles.winner_contender_id → contenders
ALTER TABLE "battles"."battles"
    ADD CONSTRAINT "battles_winner_contender_id_fkey"
    FOREIGN KEY ("winner_contender_id") REFERENCES "battles"."contenders"("id") ON DELETE SET NULL;

-- 4.5  Submissions — content submitted by each contender
CREATE TABLE IF NOT EXISTS "battles"."submissions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "battle_id" "uuid" NOT NULL,
    "contender_id" "uuid" NOT NULL,
    "status" "battles"."submission_status_enum" DEFAULT 'pending'::"battles"."submission_status_enum" NOT NULL,
    "content_text" "text",
    "content_url" "text",
    "content_media" "jsonb" DEFAULT '[]'::"jsonb",
    "submitted_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "submissions_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "submissions_battle_id_fkey"
        FOREIGN KEY ("battle_id") REFERENCES "battles"."battles"("id") ON DELETE CASCADE,
    CONSTRAINT "submissions_contender_id_fkey"
        FOREIGN KEY ("contender_id") REFERENCES "battles"."contenders"("id") ON DELETE CASCADE,
    CONSTRAINT "submissions_battle_contender_unique" UNIQUE ("battle_id", "contender_id"),
    CONSTRAINT "submissions_content_required"
        CHECK ("status" = 'pending' OR "content_text" IS NOT NULL OR "content_url" IS NOT NULL)
);
ALTER TABLE "battles"."submissions" OWNER TO "postgres";

-- 4.6  Votes — community votes on battles (immutable: delete + re-insert to change)
CREATE TABLE IF NOT EXISTS "battles"."votes" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "battle_id" "uuid" NOT NULL,
    "voter_lenser_id" "uuid" NOT NULL,
    "vote_value" "battles"."vote_value_enum" NOT NULL,
    "rationale" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "votes_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "votes_battle_id_fkey"
        FOREIGN KEY ("battle_id") REFERENCES "battles"."battles"("id") ON DELETE CASCADE,
    CONSTRAINT "votes_voter_lenser_id_fkey"
        FOREIGN KEY ("voter_lenser_id") REFERENCES "lensers"."profiles"("id") ON DELETE CASCADE,
    CONSTRAINT "votes_battle_voter_unique" UNIQUE ("battle_id", "voter_lenser_id")
);
ALTER TABLE "battles"."votes" OWNER TO "postgres";

-- 4.7  Scorecards — per-criterion AI/judge evaluation scores
CREATE TABLE IF NOT EXISTS "battles"."scorecards" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "battle_id" "uuid" NOT NULL,
    "contender_id" "uuid" NOT NULL,
    "rubric_criterion_id" "uuid" NOT NULL,
    "result" "battles"."scorecard_result_enum" NOT NULL,
    "scorer_model_id" "uuid",
    "explanation" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "scorecards_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "scorecards_battle_id_fkey"
        FOREIGN KEY ("battle_id") REFERENCES "battles"."battles"("id") ON DELETE CASCADE,
    CONSTRAINT "scorecards_contender_id_fkey"
        FOREIGN KEY ("contender_id") REFERENCES "battles"."contenders"("id") ON DELETE CASCADE,
    CONSTRAINT "scorecards_rubric_criterion_id_fkey"
        FOREIGN KEY ("rubric_criterion_id") REFERENCES "battles"."rubric_criteria"("id") ON DELETE CASCADE,
    CONSTRAINT "scorecards_scorer_model_id_fkey"
        FOREIGN KEY ("scorer_model_id") REFERENCES "ai"."models"("id") ON DELETE SET NULL,
    CONSTRAINT "scorecards_unique_per_criterion"
        UNIQUE ("battle_id", "contender_id", "rubric_criterion_id")
);
ALTER TABLE "battles"."scorecards" OWNER TO "postgres";

-- ---------------------------------------------------------------------------
-- 5. INDEXES
-- ---------------------------------------------------------------------------

CREATE INDEX "idx_battles_status" ON "battles"."battles" ("status");
CREATE INDEX "idx_battles_creator" ON "battles"."battles" ("creator_lenser_id");
CREATE INDEX "idx_battles_slug" ON "battles"."battles" ("slug");
CREATE INDEX "idx_contenders_battle" ON "battles"."contenders" ("battle_id");
CREATE INDEX "idx_submissions_battle" ON "battles"."submissions" ("battle_id");
CREATE INDEX "idx_submissions_contender" ON "battles"."submissions" ("contender_id");
CREATE INDEX "idx_votes_battle" ON "battles"."votes" ("battle_id");
CREATE INDEX "idx_votes_voter" ON "battles"."votes" ("voter_lenser_id");
CREATE INDEX "idx_scorecards_battle_contender" ON "battles"."scorecards" ("battle_id", "contender_id");
CREATE INDEX "idx_rubrics_creator" ON "battles"."rubrics" ("creator_lenser_id");

-- ---------------------------------------------------------------------------
-- 6. UPDATED_AT TRIGGERS
-- ---------------------------------------------------------------------------

CREATE OR REPLACE TRIGGER "trg_rubrics_updated_at"
    BEFORE UPDATE ON "battles"."rubrics"
    FOR EACH ROW EXECUTE FUNCTION "battles"."set_updated_at"();

CREATE OR REPLACE TRIGGER "trg_battles_updated_at"
    BEFORE UPDATE ON "battles"."battles"
    FOR EACH ROW EXECUTE FUNCTION "battles"."set_updated_at"();

CREATE OR REPLACE TRIGGER "trg_submissions_updated_at"
    BEFORE UPDATE ON "battles"."submissions"
    FOR EACH ROW EXECUTE FUNCTION "battles"."set_updated_at"();

-- ---------------------------------------------------------------------------
-- 7. ROW LEVEL SECURITY
-- ---------------------------------------------------------------------------

-- 7.1  Rubrics
ALTER TABLE "battles"."rubrics" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public rubrics are viewable by everyone"
    ON "battles"."rubrics" FOR SELECT
    USING ("is_public" = true AND "deleted_at" IS NULL);

CREATE POLICY "Authors can see own rubrics"
    ON "battles"."rubrics" FOR SELECT TO "authenticated"
    USING ("creator_lenser_id" = "lensers"."get_auth_lenser_id"());

CREATE POLICY "Authenticated users can create rubrics"
    ON "battles"."rubrics" FOR INSERT TO "authenticated"
    WITH CHECK ("creator_lenser_id" = "lensers"."get_auth_lenser_id"());

CREATE POLICY "Authors can update own rubrics"
    ON "battles"."rubrics" FOR UPDATE TO "authenticated"
    USING ("creator_lenser_id" = "lensers"."get_auth_lenser_id"())
    WITH CHECK ("creator_lenser_id" = "lensers"."get_auth_lenser_id"());

-- 7.2  Rubric criteria
ALTER TABLE "battles"."rubric_criteria" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Criteria of public rubrics are viewable"
    ON "battles"."rubric_criteria" FOR SELECT
    USING (EXISTS (
        SELECT 1 FROM "battles"."rubrics" "r"
        WHERE "r"."id" = "rubric_criteria"."rubric_id"
          AND "r"."is_public" = true AND "r"."deleted_at" IS NULL
    ));

CREATE POLICY "Authors can see own rubric criteria"
    ON "battles"."rubric_criteria" FOR SELECT TO "authenticated"
    USING (EXISTS (
        SELECT 1 FROM "battles"."rubrics" "r"
        WHERE "r"."id" = "rubric_criteria"."rubric_id"
          AND "r"."creator_lenser_id" = "lensers"."get_auth_lenser_id"()
    ));

CREATE POLICY "Authors can insert criteria on own rubrics"
    ON "battles"."rubric_criteria" FOR INSERT TO "authenticated"
    WITH CHECK (EXISTS (
        SELECT 1 FROM "battles"."rubrics" "r"
        WHERE "r"."id" = "rubric_criteria"."rubric_id"
          AND "r"."creator_lenser_id" = "lensers"."get_auth_lenser_id"()
    ));

CREATE POLICY "Authors can update criteria on own rubrics"
    ON "battles"."rubric_criteria" FOR UPDATE TO "authenticated"
    USING (EXISTS (
        SELECT 1 FROM "battles"."rubrics" "r"
        WHERE "r"."id" = "rubric_criteria"."rubric_id"
          AND "r"."creator_lenser_id" = "lensers"."get_auth_lenser_id"()
    ));

-- 7.3  Battles
ALTER TABLE "battles"."battles" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public battles are viewable by everyone"
    ON "battles"."battles" FOR SELECT
    USING ("status" IN ('voting', 'scoring', 'closed', 'published')
           AND "deleted_at" IS NULL);

CREATE POLICY "Authors can see own battles"
    ON "battles"."battles" FOR SELECT TO "authenticated"
    USING ("creator_lenser_id" = "lensers"."get_auth_lenser_id"());

CREATE POLICY "Authenticated users can create battles"
    ON "battles"."battles" FOR INSERT TO "authenticated"
    WITH CHECK ("creator_lenser_id" = "lensers"."get_auth_lenser_id"());

CREATE POLICY "Authors can update own draft or open battles"
    ON "battles"."battles" FOR UPDATE TO "authenticated"
    USING ("creator_lenser_id" = "lensers"."get_auth_lenser_id"()
           AND "status" IN ('draft', 'open'))
    WITH CHECK ("creator_lenser_id" = "lensers"."get_auth_lenser_id"());

-- 7.4  Contenders
ALTER TABLE "battles"."contenders" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Contenders on public battles are viewable"
    ON "battles"."contenders" FOR SELECT
    USING (EXISTS (
        SELECT 1 FROM "battles"."battles" "b"
        WHERE "b"."id" = "contenders"."battle_id"
          AND "b"."status" IN ('voting', 'scoring', 'closed', 'published')
          AND "b"."deleted_at" IS NULL
    ));

CREATE POLICY "Battle creators can see own battle contenders"
    ON "battles"."contenders" FOR SELECT TO "authenticated"
    USING (EXISTS (
        SELECT 1 FROM "battles"."battles" "b"
        WHERE "b"."id" = "contenders"."battle_id"
          AND "b"."creator_lenser_id" = "lensers"."get_auth_lenser_id"()
    ));

CREATE POLICY "Contenders can see themselves"
    ON "battles"."contenders" FOR SELECT TO "authenticated"
    USING ("contender_type" = 'human'
           AND "contender_ref_id" = (SELECT "id" FROM "lensers"."profiles"
                                     WHERE "user_id" = "auth"."uid"() LIMIT 1));

CREATE POLICY "Authenticated can insert contenders on open battles"
    ON "battles"."contenders" FOR INSERT TO "authenticated"
    WITH CHECK (EXISTS (
        SELECT 1 FROM "battles"."battles" "b"
        WHERE "b"."id" = "contenders"."battle_id"
          AND ("b"."creator_lenser_id" = "lensers"."get_auth_lenser_id"()
               OR "b"."status" = 'open')
    ));

-- 7.5  Submissions
ALTER TABLE "battles"."submissions" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Submissions on voting+ battles are viewable"
    ON "battles"."submissions" FOR SELECT
    USING (EXISTS (
        SELECT 1 FROM "battles"."battles" "b"
        WHERE "b"."id" = "submissions"."battle_id"
          AND "b"."status" IN ('voting', 'scoring', 'closed', 'published')
          AND "b"."deleted_at" IS NULL
    ));

CREATE POLICY "Contenders can see own submissions"
    ON "battles"."submissions" FOR SELECT TO "authenticated"
    USING (EXISTS (
        SELECT 1 FROM "battles"."contenders" "c"
        WHERE "c"."id" = "submissions"."contender_id"
          AND "c"."contender_type" = 'human'
          AND "c"."contender_ref_id" = "lensers"."get_auth_lenser_id"()
    ));

CREATE POLICY "Battle creators can see submissions"
    ON "battles"."submissions" FOR SELECT TO "authenticated"
    USING (EXISTS (
        SELECT 1 FROM "battles"."battles" "b"
        WHERE "b"."id" = "submissions"."battle_id"
          AND "b"."creator_lenser_id" = "lensers"."get_auth_lenser_id"()
    ));

CREATE POLICY "Contenders can insert submissions on open battles"
    ON "battles"."submissions" FOR INSERT TO "authenticated"
    WITH CHECK (EXISTS (
        SELECT 1 FROM "battles"."contenders" "c"
        JOIN "battles"."battles" "b" ON "b"."id" = "c"."battle_id"
        WHERE "c"."id" = "submissions"."contender_id"
          AND "c"."contender_type" = 'human'
          AND "c"."contender_ref_id" = "lensers"."get_auth_lenser_id"()
          AND "b"."status" = 'open'
    ));

CREATE POLICY "Contenders can update own submissions on open battles"
    ON "battles"."submissions" FOR UPDATE TO "authenticated"
    USING (EXISTS (
        SELECT 1 FROM "battles"."contenders" "c"
        JOIN "battles"."battles" "b" ON "b"."id" = "c"."battle_id"
        WHERE "c"."id" = "submissions"."contender_id"
          AND "c"."contender_type" = 'human'
          AND "c"."contender_ref_id" = "lensers"."get_auth_lenser_id"()
          AND "b"."status" = 'open'
    ));

-- 7.6  Votes
ALTER TABLE "battles"."votes" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Votes on closed+ battles are viewable"
    ON "battles"."votes" FOR SELECT
    USING (EXISTS (
        SELECT 1 FROM "battles"."battles" "b"
        WHERE "b"."id" = "votes"."battle_id"
          AND "b"."status" IN ('closed', 'published')
          AND "b"."deleted_at" IS NULL
    ));

CREATE POLICY "Voters can see own votes"
    ON "battles"."votes" FOR SELECT TO "authenticated"
    USING ("voter_lenser_id" = "lensers"."get_auth_lenser_id"());

CREATE POLICY "Non-contenders can vote during voting window"
    ON "battles"."votes" FOR INSERT TO "authenticated"
    WITH CHECK (
        "voter_lenser_id" = "lensers"."get_auth_lenser_id"()
        AND EXISTS (
            SELECT 1 FROM "battles"."battles" "b"
            WHERE "b"."id" = "votes"."battle_id"
              AND "b"."status" = 'voting'
        )
        AND NOT EXISTS (
            SELECT 1 FROM "battles"."contenders" "c"
            WHERE "c"."battle_id" = "votes"."battle_id"
              AND "c"."contender_type" = 'human'
              AND "c"."contender_ref_id" = "lensers"."get_auth_lenser_id"()
        )
    );

CREATE POLICY "Voters can delete own vote during voting"
    ON "battles"."votes" FOR DELETE TO "authenticated"
    USING (
        "voter_lenser_id" = "lensers"."get_auth_lenser_id"()
        AND EXISTS (
            SELECT 1 FROM "battles"."battles" "b"
            WHERE "b"."id" = "votes"."battle_id"
              AND "b"."status" = 'voting'
        )
    );

-- 7.7  Scorecards (service_role write only — no authenticated write policies)
ALTER TABLE "battles"."scorecards" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Scorecards on closed+ battles are viewable"
    ON "battles"."scorecards" FOR SELECT
    USING (EXISTS (
        SELECT 1 FROM "battles"."battles" "b"
        WHERE "b"."id" = "scorecards"."battle_id"
          AND "b"."status" IN ('closed', 'published')
          AND "b"."deleted_at" IS NULL
    ));

-- ---------------------------------------------------------------------------
-- 8. XP INTEGRATION
-- ---------------------------------------------------------------------------

-- 8.1  Seed battle XP rules
INSERT INTO "xp"."rules" ("app_id", "action_key", "name", "description", "base_xp", "max_xp_per_day", "max_events_per_day", "is_active")
VALUES
    ('00000000-0000-0000-0000-000000000000', 'battle_participated', 'Battle Participated', 'XP awarded for participating in a battle as a contender', 50, 100, 2, true),
    ('00000000-0000-0000-0000-000000000000', 'battle_won', 'Battle Won', 'XP awarded for winning a battle', 200, 200, 1, true),
    ('00000000-0000-0000-0000-000000000000', 'battle_voted', 'Battle Voted', 'XP awarded for voting on a battle', 10, 50, 5, true)
ON CONFLICT DO NOTHING;

-- 8.2  XP trigger function — fires after a battle is finalized
CREATE OR REPLACE FUNCTION "battles"."award_battle_xp"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'battles', 'xp', 'lensers'
    AS $$
DECLARE
    v_contender RECORD;
    v_voter RECORD;
BEGIN
    -- Only fire when status transitions to 'closed'
    IF NEW.status <> 'closed' OR OLD.status = 'closed' THEN
        RETURN NEW;
    END IF;

    -- Award XP to all human contenders
    FOR v_contender IN
        SELECT c.contender_ref_id AS lenser_id
        FROM battles.contenders c
        WHERE c.battle_id = NEW.id
          AND c.contender_type = 'human'
    LOOP
        PERFORM xp.apply(
            p_lenser_id       := v_contender.lenser_id,
            p_rule_key        := 'battle_participated',
            p_source          := 'battle'::xp.source_enum,
            p_source_ref_type := 'battle',
            p_source_ref_id   := NEW.id
        );
    END LOOP;

    -- Award XP to the winner (if a human won)
    IF NEW.winner_contender_id IS NOT NULL THEN
        DECLARE
            v_winner RECORD;
        BEGIN
            SELECT c.contender_ref_id AS lenser_id, c.contender_type
            INTO v_winner
            FROM battles.contenders c
            WHERE c.id = NEW.winner_contender_id;

            IF v_winner.contender_type = 'human' THEN
                PERFORM xp.apply(
                    p_lenser_id       := v_winner.lenser_id,
                    p_rule_key        := 'battle_won',
                    p_source          := 'battle'::xp.source_enum,
                    p_source_ref_type := 'battle',
                    p_source_ref_id   := NEW.id
                );
            END IF;
        END;
    END IF;

    -- Award XP to all voters
    FOR v_voter IN
        SELECT v.voter_lenser_id AS lenser_id
        FROM battles.votes v
        WHERE v.battle_id = NEW.id
    LOOP
        PERFORM xp.apply(
            p_lenser_id       := v_voter.lenser_id,
            p_rule_key        := 'battle_voted',
            p_source          := 'battle'::xp.source_enum,
            p_source_ref_type := 'battle',
            p_source_ref_id   := NEW.id
        );
    END LOOP;

    RETURN NEW;
END;
$$;
ALTER FUNCTION "battles"."award_battle_xp"() OWNER TO "postgres";

CREATE OR REPLACE TRIGGER "trg_award_battle_xp"
    AFTER UPDATE ON "battles"."battles"
    FOR EACH ROW EXECUTE FUNCTION "battles"."award_battle_xp"();

-- ---------------------------------------------------------------------------
-- 9. RPC FUNCTIONS (public schema, SECURITY DEFINER)
-- ---------------------------------------------------------------------------

-- 9.1  Create a new battle
CREATE OR REPLACE FUNCTION "public"."fn_battles_create"(
    "p_title" "text",
    "p_slug" "text",
    "p_task_prompt" "text",
    "p_rubric_id" "uuid" DEFAULT NULL
) RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'battles', 'lensers'
    AS $$
DECLARE
    v_lenser_id uuid;
    v_battle_id uuid;
BEGIN
    v_lenser_id := lensers.get_auth_lenser_id();
    IF v_lenser_id IS NULL THEN
        RAISE EXCEPTION 'Authentication required';
    END IF;

    INSERT INTO battles.battles (creator_lenser_id, title, slug, task_prompt, rubric_id, status)
    VALUES (v_lenser_id, p_title, p_slug, p_task_prompt, p_rubric_id, 'draft')
    RETURNING id INTO v_battle_id;

    RETURN v_battle_id;
END;
$$;
ALTER FUNCTION "public"."fn_battles_create"("text", "text", "text", "uuid") OWNER TO "postgres";

-- 9.2  Transition battle: draft → open
CREATE OR REPLACE FUNCTION "public"."fn_battles_open"(
    "p_battle_id" "uuid"
) RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'battles', 'lensers'
    AS $$
DECLARE
    v_battle RECORD;
    v_code text;
BEGIN
    SELECT * INTO v_battle
    FROM battles.battles
    WHERE id = p_battle_id;

    IF v_battle IS NULL THEN
        RAISE EXCEPTION 'Battle not found';
    END IF;

    IF v_battle.creator_lenser_id <> lensers.get_auth_lenser_id() THEN
        RAISE EXCEPTION 'Only the battle creator can open a battle';
    END IF;

    IF v_battle.status <> 'draft' THEN
        RAISE EXCEPTION 'Battle must be in draft status to open (current: %)', v_battle.status;
    END IF;

    -- Generate invite code if not set
    v_code := v_battle.invite_code;
    IF v_code IS NULL THEN
        v_code := upper(substr(md5(gen_random_uuid()::text), 1, 8));
    END IF;

    UPDATE battles.battles
    SET status = 'open', invite_code = v_code, updated_at = now()
    WHERE id = p_battle_id;
END;
$$;
ALTER FUNCTION "public"."fn_battles_open"("uuid") OWNER TO "postgres";

-- 9.3  Join a battle as a human contender
CREATE OR REPLACE FUNCTION "public"."fn_battles_join"(
    "p_battle_id" "uuid"
) RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'battles', 'lensers'
    AS $$
DECLARE
    v_lenser_id uuid;
    v_lenser RECORD;
    v_battle RECORD;
    v_count int;
    v_next_slot char(1);
    v_contender_id uuid;
BEGIN
    v_lenser_id := lensers.get_auth_lenser_id();
    IF v_lenser_id IS NULL THEN
        RAISE EXCEPTION 'Authentication required';
    END IF;

    SELECT display_name INTO v_lenser
    FROM lensers.profiles WHERE id = v_lenser_id;

    SELECT * INTO v_battle
    FROM battles.battles WHERE id = p_battle_id;

    IF v_battle IS NULL THEN
        RAISE EXCEPTION 'Battle not found';
    END IF;

    IF v_battle.status <> 'open' THEN
        RAISE EXCEPTION 'Battle is not open for joining';
    END IF;

    -- Check if already a contender
    IF EXISTS (
        SELECT 1 FROM battles.contenders
        WHERE battle_id = p_battle_id AND contender_ref_id = v_lenser_id
    ) THEN
        RAISE EXCEPTION 'Already a contender in this battle';
    END IF;

    -- Check contender count
    SELECT COUNT(*) INTO v_count
    FROM battles.contenders WHERE battle_id = p_battle_id;

    IF v_count >= v_battle.max_contenders THEN
        RAISE EXCEPTION 'Battle is full (% / %)', v_count, v_battle.max_contenders;
    END IF;

    -- Assign next slot (A, B, C, ...)
    v_next_slot := chr(65 + v_count);

    INSERT INTO battles.contenders (battle_id, slot, contender_type, contender_ref_id, display_name)
    VALUES (p_battle_id, v_next_slot, 'human', v_lenser_id, v_lenser.display_name)
    RETURNING id INTO v_contender_id;

    -- Auto-create pending submission
    INSERT INTO battles.submissions (battle_id, contender_id, status)
    VALUES (p_battle_id, v_contender_id, 'pending');

    RETURN v_contender_id;
END;
$$;
ALTER FUNCTION "public"."fn_battles_join"("uuid") OWNER TO "postgres";

-- 9.4  Submit battle content
CREATE OR REPLACE FUNCTION "public"."fn_battles_submit"(
    "p_battle_id" "uuid",
    "p_content_text" "text" DEFAULT NULL,
    "p_content_url" "text" DEFAULT NULL,
    "p_content_media" "jsonb" DEFAULT NULL
) RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'battles', 'lensers'
    AS $$
DECLARE
    v_lenser_id uuid;
    v_contender RECORD;
    v_battle RECORD;
    v_submission_id uuid;
BEGIN
    v_lenser_id := lensers.get_auth_lenser_id();
    IF v_lenser_id IS NULL THEN
        RAISE EXCEPTION 'Authentication required';
    END IF;

    SELECT * INTO v_battle
    FROM battles.battles WHERE id = p_battle_id;

    IF v_battle IS NULL OR v_battle.status <> 'open' THEN
        RAISE EXCEPTION 'Battle is not open for submissions';
    END IF;

    SELECT * INTO v_contender
    FROM battles.contenders
    WHERE battle_id = p_battle_id
      AND contender_type = 'human'
      AND contender_ref_id = v_lenser_id;

    IF v_contender IS NULL THEN
        RAISE EXCEPTION 'You are not a contender in this battle';
    END IF;

    IF p_content_text IS NULL AND p_content_url IS NULL THEN
        RAISE EXCEPTION 'At least content_text or content_url is required';
    END IF;

    UPDATE battles.submissions
    SET status = 'submitted',
        content_text = p_content_text,
        content_url = p_content_url,
        content_media = COALESCE(p_content_media, '[]'::jsonb),
        submitted_at = now(),
        updated_at = now()
    WHERE battle_id = p_battle_id AND contender_id = v_contender.id
    RETURNING id INTO v_submission_id;

    RETURN v_submission_id;
END;
$$;
ALTER FUNCTION "public"."fn_battles_submit"("uuid", "text", "text", "jsonb") OWNER TO "postgres";

-- 9.5  Transition battle: open → voting
CREATE OR REPLACE FUNCTION "public"."fn_battles_start_voting"(
    "p_battle_id" "uuid",
    "p_voting_closes_at" timestamp with time zone DEFAULT NULL
) RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'battles', 'lensers'
    AS $$
DECLARE
    v_battle RECORD;
    v_pending int;
BEGIN
    SELECT * INTO v_battle
    FROM battles.battles WHERE id = p_battle_id;

    IF v_battle IS NULL THEN
        RAISE EXCEPTION 'Battle not found';
    END IF;

    IF v_battle.creator_lenser_id <> lensers.get_auth_lenser_id() THEN
        RAISE EXCEPTION 'Only the battle creator can start voting';
    END IF;

    IF v_battle.status <> 'open' THEN
        RAISE EXCEPTION 'Battle must be open to start voting (current: %)', v_battle.status;
    END IF;

    -- Check all contenders have submitted
    SELECT COUNT(*) INTO v_pending
    FROM battles.submissions s
    WHERE s.battle_id = p_battle_id AND s.status = 'pending';

    IF v_pending > 0 THEN
        RAISE EXCEPTION '% contender(s) have not submitted yet', v_pending;
    END IF;

    UPDATE battles.battles
    SET status = 'voting',
        voting_opens_at = now(),
        voting_closes_at = p_voting_closes_at,
        updated_at = now()
    WHERE id = p_battle_id;
END;
$$;
ALTER FUNCTION "public"."fn_battles_start_voting"("uuid", timestamp with time zone) OWNER TO "postgres";

-- 9.6  Cast or change a vote (delete + insert for immutability)
CREATE OR REPLACE FUNCTION "public"."fn_battles_vote"(
    "p_battle_id" "uuid",
    "p_vote" "battles"."vote_value_enum",
    "p_rationale" "text" DEFAULT NULL
) RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'battles', 'lensers'
    AS $$
DECLARE
    v_lenser_id uuid;
    v_battle RECORD;
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
          AND c.contender_type = 'human'
          AND c.contender_ref_id = v_lenser_id
    ) THEN
        RAISE EXCEPTION 'Contenders cannot vote on their own battle';
    END IF;

    -- Delete existing vote if any, then insert new
    DELETE FROM battles.votes
    WHERE battle_id = p_battle_id AND voter_lenser_id = v_lenser_id;

    INSERT INTO battles.votes (battle_id, voter_lenser_id, vote_value, rationale)
    VALUES (p_battle_id, v_lenser_id, p_vote, p_rationale);
END;
$$;
ALTER FUNCTION "public"."fn_battles_vote"("uuid", "battles"."vote_value_enum", "text") OWNER TO "postgres";

-- 9.7  Finalize a battle — service_role only
CREATE OR REPLACE FUNCTION "public"."fn_battles_finalize"(
    "p_battle_id" "uuid"
) RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'battles', 'lensers', 'xp'
    AS $$
DECLARE
    v_battle RECORD;
    v_count_a int;
    v_count_b int;
    v_count_draw int;
    v_winner_id uuid;
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

    -- Count votes
    SELECT
        COUNT(*) FILTER (WHERE vote_value = 'contender_a'),
        COUNT(*) FILTER (WHERE vote_value = 'contender_b'),
        COUNT(*) FILTER (WHERE vote_value = 'draw')
    INTO v_count_a, v_count_b, v_count_draw
    FROM battles.votes WHERE battle_id = p_battle_id;

    -- Look up contender IDs by slot
    SELECT id INTO v_contender_a
    FROM battles.contenders WHERE battle_id = p_battle_id AND slot = 'A';

    SELECT id INTO v_contender_b
    FROM battles.contenders WHERE battle_id = p_battle_id AND slot = 'B';

    -- Determine winner
    IF v_count_a > v_count_b THEN
        v_winner_id := v_contender_a;
    ELSIF v_count_b > v_count_a THEN
        v_winner_id := v_contender_b;
    ELSE
        v_winner_id := NULL; -- draw
    END IF;

    -- Update battle — the trg_award_battle_xp trigger handles XP
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
ALTER FUNCTION "public"."fn_battles_finalize"("uuid") OWNER TO "postgres";

-- 9.8  Get a public battle with all related data
CREATE OR REPLACE FUNCTION "public"."fn_battles_get_public"(
    "p_battle_id" "uuid"
) RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'battles'
    AS $$
DECLARE
    v_battle RECORD;
    v_result jsonb;
BEGIN
    SELECT * INTO v_battle
    FROM battles.battles
    WHERE id = p_battle_id
      AND status IN ('voting', 'scoring', 'closed', 'published')
      AND deleted_at IS NULL;

    IF v_battle IS NULL THEN
        RETURN NULL;
    END IF;

    v_result := jsonb_build_object(
        'id', v_battle.id,
        'title', v_battle.title,
        'slug', v_battle.slug,
        'task_prompt', v_battle.task_prompt,
        'status', v_battle.status,
        'max_contenders', v_battle.max_contenders,
        'voting_opens_at', v_battle.voting_opens_at,
        'voting_closes_at', v_battle.voting_closes_at,
        'published_at', v_battle.published_at,
        'finalized_at', v_battle.finalized_at,
        'vote_count_a', v_battle.vote_count_a,
        'vote_count_b', v_battle.vote_count_b,
        'vote_count_draw', v_battle.vote_count_draw,
        'winner_contender_id', v_battle.winner_contender_id,
        'created_at', v_battle.created_at,
        'contenders', (
            SELECT COALESCE(jsonb_agg(jsonb_build_object(
                'id', c.id,
                'slot', c.slot,
                'contender_type', c.contender_type,
                'display_name', c.display_name
            ) ORDER BY c.slot), '[]'::jsonb)
            FROM battles.contenders c WHERE c.battle_id = p_battle_id
        ),
        'submissions', CASE
            WHEN v_battle.status IN ('voting', 'scoring', 'closed', 'published') THEN (
                SELECT COALESCE(jsonb_agg(jsonb_build_object(
                    'id', s.id,
                    'contender_id', s.contender_id,
                    'status', s.status,
                    'content_text', s.content_text,
                    'content_url', s.content_url,
                    'submitted_at', s.submitted_at
                )), '[]'::jsonb)
                FROM battles.submissions s WHERE s.battle_id = p_battle_id AND s.status = 'submitted'
            )
            ELSE '[]'::jsonb
        END,
        'votes', CASE
            WHEN v_battle.status IN ('closed', 'published') THEN (
                SELECT COALESCE(jsonb_agg(jsonb_build_object(
                    'id', v.id,
                    'voter_lenser_id', v.voter_lenser_id,
                    'vote_value', v.vote_value,
                    'rationale', v.rationale
                )), '[]'::jsonb)
                FROM battles.votes v WHERE v.battle_id = p_battle_id
            )
            ELSE '[]'::jsonb
        END,
        'scorecards', CASE
            WHEN v_battle.status IN ('closed', 'published') THEN (
                SELECT COALESCE(jsonb_agg(jsonb_build_object(
                    'id', sc.id,
                    'contender_id', sc.contender_id,
                    'rubric_criterion_id', sc.rubric_criterion_id,
                    'result', sc.result,
                    'explanation', sc.explanation
                )), '[]'::jsonb)
                FROM battles.scorecards sc WHERE sc.battle_id = p_battle_id
            )
            ELSE '[]'::jsonb
        END
    );

    RETURN v_result;
END;
$$;
ALTER FUNCTION "public"."fn_battles_get_public"("uuid") OWNER TO "postgres";

-- 9.9  List public battles (paginated)
CREATE OR REPLACE FUNCTION "public"."fn_battles_list_public"(
    "p_limit" integer DEFAULT 20,
    "p_offset" integer DEFAULT 0
) RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'battles'
    AS $$
DECLARE
    v_result jsonb;
BEGIN
    SELECT COALESCE(jsonb_agg(row_data), '[]'::jsonb) INTO v_result
    FROM (
        SELECT jsonb_build_object(
            'id', b.id,
            'title', b.title,
            'slug', b.slug,
            'status', b.status,
            'creator_lenser_id', b.creator_lenser_id,
            'vote_count_a', b.vote_count_a,
            'vote_count_b', b.vote_count_b,
            'vote_count_draw', b.vote_count_draw,
            'created_at', b.created_at,
            'contender_count', (
                SELECT COUNT(*) FROM battles.contenders c WHERE c.battle_id = b.id
            )
        ) AS row_data
        FROM battles.battles b
        WHERE b.status IN ('voting', 'scoring', 'closed', 'published')
          AND b.deleted_at IS NULL
        ORDER BY b.created_at DESC
        LIMIT p_limit OFFSET p_offset
    ) sub;

    RETURN v_result;
END;
$$;
ALTER FUNCTION "public"."fn_battles_list_public"(integer, integer) OWNER TO "postgres";

-- ---------------------------------------------------------------------------
-- 10. EXTEND EXISTING ENUMS
-- ---------------------------------------------------------------------------

ALTER TYPE "public"."page_view_target_enum" ADD VALUE IF NOT EXISTS 'battle';

-- ---------------------------------------------------------------------------
-- 11. GRANTS
-- ---------------------------------------------------------------------------

-- Schema usage
GRANT USAGE ON SCHEMA "battles" TO "anon";
GRANT USAGE ON SCHEMA "battles" TO "authenticated";
GRANT USAGE ON SCHEMA "battles" TO "service_role";

-- Tables: anon = SELECT, authenticated = SELECT/INSERT/UPDATE/DELETE, service_role = ALL
GRANT SELECT ON TABLE "battles"."rubrics" TO "anon";
GRANT SELECT, INSERT, UPDATE ON TABLE "battles"."rubrics" TO "authenticated";
GRANT ALL ON TABLE "battles"."rubrics" TO "service_role";

GRANT SELECT ON TABLE "battles"."rubric_criteria" TO "anon";
GRANT SELECT, INSERT, UPDATE ON TABLE "battles"."rubric_criteria" TO "authenticated";
GRANT ALL ON TABLE "battles"."rubric_criteria" TO "service_role";

GRANT SELECT ON TABLE "battles"."battles" TO "anon";
GRANT SELECT, INSERT, UPDATE ON TABLE "battles"."battles" TO "authenticated";
GRANT ALL ON TABLE "battles"."battles" TO "service_role";

GRANT SELECT ON TABLE "battles"."contenders" TO "anon";
GRANT SELECT, INSERT ON TABLE "battles"."contenders" TO "authenticated";
GRANT ALL ON TABLE "battles"."contenders" TO "service_role";

GRANT SELECT ON TABLE "battles"."submissions" TO "anon";
GRANT SELECT, INSERT, UPDATE ON TABLE "battles"."submissions" TO "authenticated";
GRANT ALL ON TABLE "battles"."submissions" TO "service_role";

GRANT SELECT ON TABLE "battles"."votes" TO "anon";
GRANT SELECT, INSERT, DELETE ON TABLE "battles"."votes" TO "authenticated";
GRANT ALL ON TABLE "battles"."votes" TO "service_role";

GRANT SELECT ON TABLE "battles"."scorecards" TO "anon";
GRANT SELECT ON TABLE "battles"."scorecards" TO "authenticated";
GRANT ALL ON TABLE "battles"."scorecards" TO "service_role";

-- RPC functions: public access (internal auth checks) except fn_battles_finalize
GRANT ALL ON FUNCTION "public"."fn_battles_create"("text", "text", "text", "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."fn_battles_create"("text", "text", "text", "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_battles_create"("text", "text", "text", "uuid") TO "service_role";

GRANT ALL ON FUNCTION "public"."fn_battles_open"("uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."fn_battles_open"("uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_battles_open"("uuid") TO "service_role";

GRANT ALL ON FUNCTION "public"."fn_battles_join"("uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."fn_battles_join"("uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_battles_join"("uuid") TO "service_role";

GRANT ALL ON FUNCTION "public"."fn_battles_submit"("uuid", "text", "text", "jsonb") TO "anon";
GRANT ALL ON FUNCTION "public"."fn_battles_submit"("uuid", "text", "text", "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_battles_submit"("uuid", "text", "text", "jsonb") TO "service_role";

GRANT ALL ON FUNCTION "public"."fn_battles_start_voting"("uuid", timestamp with time zone) TO "anon";
GRANT ALL ON FUNCTION "public"."fn_battles_start_voting"("uuid", timestamp with time zone) TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_battles_start_voting"("uuid", timestamp with time zone) TO "service_role";

GRANT ALL ON FUNCTION "public"."fn_battles_vote"("uuid", "battles"."vote_value_enum", "text") TO "anon";
GRANT ALL ON FUNCTION "public"."fn_battles_vote"("uuid", "battles"."vote_value_enum", "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_battles_vote"("uuid", "battles"."vote_value_enum", "text") TO "service_role";

-- fn_battles_finalize: service_role ONLY
GRANT ALL ON FUNCTION "public"."fn_battles_finalize"("uuid") TO "service_role";

GRANT ALL ON FUNCTION "public"."fn_battles_get_public"("uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."fn_battles_get_public"("uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_battles_get_public"("uuid") TO "service_role";

GRANT ALL ON FUNCTION "public"."fn_battles_list_public"(integer, integer) TO "anon";
GRANT ALL ON FUNCTION "public"."fn_battles_list_public"(integer, integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_battles_list_public"(integer, integer) TO "service_role";

-- Internal functions
GRANT ALL ON FUNCTION "battles"."set_updated_at"() TO "service_role";
GRANT ALL ON FUNCTION "battles"."award_battle_xp"() TO "service_role";

-- Default privileges for future objects in battles schema
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "battles"
    GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "battles"
    GRANT SELECT ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "battles"
    GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "battles"
    GRANT ALL ON TABLES TO "service_role";

ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "battles"
    GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "battles"
    GRANT ALL ON FUNCTIONS TO "service_role";

-- =============================================================================
-- END OF MIGRATION
-- =============================================================================
