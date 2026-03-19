-- =============================================================================
-- MIGRATION 22: CONTENDER REFACTOR
-- =============================================================================
-- Adds actor_id FK to battles.contenders, replacing the polymorphic
-- contender_type + contender_ref_id pattern. Backfills from actors table.
-- Updates fn_battles_join and award_battle_xp to use actor-based lookups.
-- =============================================================================

-- ─────────────────────────────────────────────────────────────────────────────
-- SECTION 1: ADD COLUMNS TO battles.contenders
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE "battles"."contenders"
    ADD COLUMN IF NOT EXISTS "actor_id" "uuid",
    ADD COLUMN IF NOT EXISTS "team_id" "uuid",
    ADD COLUMN IF NOT EXISTS "entry_mode" "text" DEFAULT 'direct'::"text" NOT NULL,
    ADD COLUMN IF NOT EXISTS "contender_status" "text" DEFAULT 'active'::"text" NOT NULL,
    ADD COLUMN IF NOT EXISTS "joined_at" timestamp with time zone DEFAULT "now"(),
    ADD COLUMN IF NOT EXISTS "accepted_at" timestamp with time zone,
    ADD COLUMN IF NOT EXISTS "withdrawn_at" timestamp with time zone;

-- Constraints on new columns
ALTER TABLE "battles"."contenders"
    ADD CONSTRAINT "contenders_entry_mode_check" CHECK (
        "entry_mode" = ANY (ARRAY[
            'direct'::"text",
            'invited'::"text",
            'qualified'::"text",
            'wildcard'::"text",
            'auto_join'::"text"
        ])
    ),
    ADD CONSTRAINT "contenders_status_check" CHECK (
        "contender_status" = ANY (ARRAY[
            'pending'::"text",
            'accepted'::"text",
            'active'::"text",
            'withdrawn'::"text",
            'disqualified'::"text",
            'eliminated'::"text"
        ])
    );


-- ─────────────────────────────────────────────────────────────────────────────
-- SECTION 2: FOREIGN KEYS
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE "battles"."contenders"
    ADD CONSTRAINT "contenders_actor_id_fkey"
    FOREIGN KEY ("actor_id")
    REFERENCES "actors"."actors"("id") ON DELETE SET NULL;

ALTER TABLE "battles"."contenders"
    ADD CONSTRAINT "contenders_team_id_fkey"
    FOREIGN KEY ("team_id")
    REFERENCES "actors"."teams"("id") ON DELETE SET NULL;


-- ─────────────────────────────────────────────────────────────────────────────
-- SECTION 3: BACKFILL actor_id FROM existing contender data
-- ─────────────────────────────────────────────────────────────────────────────

-- Link human contenders to their actor row via profile_id
UPDATE "battles"."contenders" c
SET "actor_id" = a."id"
FROM "actors"."actors" a
WHERE a."profile_id" = c."contender_ref_id"
  AND c."contender_type" = 'human'
  AND c."actor_id" IS NULL;

-- Link AI model contenders to their actor row via ai_model_id
-- First, create actor rows for AI models that were used as contenders but don't
-- have actor entries yet (e.g. ai_model contenders referencing ai.models directly)
INSERT INTO "actors"."actors" ("id", "actor_type", "display_name", "ai_model_id")
SELECT DISTINCT "gen_random_uuid"(), 'agent', c."display_name", c."contender_ref_id"
FROM "battles"."contenders" c
WHERE c."contender_type" IN ('ai_model', 'ai_agent')
  AND NOT EXISTS (
      SELECT 1 FROM "actors"."actors" a
      WHERE a."ai_model_id" = c."contender_ref_id"
  )
ON CONFLICT DO NOTHING;

-- Now link AI contenders to their actor rows
UPDATE "battles"."contenders" c
SET "actor_id" = a."id"
FROM "actors"."actors" a
WHERE a."ai_model_id" = c."contender_ref_id"
  AND c."contender_type" IN ('ai_model', 'ai_agent')
  AND c."actor_id" IS NULL;


-- ─────────────────────────────────────────────────────────────────────────────
-- SECTION 4: INDEXES
-- ─────────────────────────────────────────────────────────────────────────────

CREATE UNIQUE INDEX "idx_contenders_battle_actor"
    ON "battles"."contenders" ("battle_id", "actor_id")
    WHERE "actor_id" IS NOT NULL AND "team_id" IS NULL;

CREATE UNIQUE INDEX "idx_contenders_battle_team"
    ON "battles"."contenders" ("battle_id", "team_id")
    WHERE "team_id" IS NOT NULL;

CREATE INDEX "idx_contenders_actor_joined"
    ON "battles"."contenders" ("actor_id", "joined_at" DESC)
    WHERE "actor_id" IS NOT NULL;

CREATE INDEX "idx_contenders_battle_status"
    ON "battles"."contenders" ("battle_id", "contender_status");


-- ─────────────────────────────────────────────────────────────────────────────
-- SECTION 5: UPDATE fn_battles_join — also set actor_id
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION "public"."fn_battles_join"("p_battle_id" "uuid") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'battles', 'lensers', 'actors'
    AS $$
DECLARE
    v_lenser_id uuid;
    v_lenser RECORD;
    v_battle RECORD;
    v_count int;
    v_next_slot char(1);
    v_contender_id uuid;
    v_actor_id uuid;
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

    -- Check if already a contender (check both old and new patterns)
    IF EXISTS (
        SELECT 1 FROM battles.contenders
        WHERE battle_id = p_battle_id
          AND (contender_ref_id = v_lenser_id OR actor_id = (
              SELECT id FROM actors.actors WHERE profile_id = v_lenser_id LIMIT 1
          ))
    ) THEN
        RAISE EXCEPTION 'Already a contender in this battle';
    END IF;

    -- Check contender count
    SELECT COUNT(*) INTO v_count
    FROM battles.contenders WHERE battle_id = p_battle_id;

    IF v_count >= v_battle.max_contenders THEN
        RAISE EXCEPTION 'Battle is full (% / %)', v_count, v_battle.max_contenders;
    END IF;

    -- Look up or create actor
    SELECT id INTO v_actor_id
    FROM actors.actors
    WHERE profile_id = v_lenser_id
    LIMIT 1;

    IF v_actor_id IS NULL THEN
        INSERT INTO actors.actors (actor_type, display_name, owner_lenser_id, profile_id)
        VALUES ('human', v_lenser.display_name, v_lenser_id, v_lenser_id)
        RETURNING id INTO v_actor_id;
    END IF;

    -- Assign next slot (A, B, C, ...)
    v_next_slot := chr(65 + v_count);

    INSERT INTO battles.contenders (
        battle_id, slot, contender_type, contender_ref_id,
        display_name, actor_id, entry_mode, contender_status, joined_at
    )
    VALUES (
        p_battle_id, v_next_slot, 'human', v_lenser_id,
        v_lenser.display_name, v_actor_id, 'direct', 'active', now()
    )
    RETURNING id INTO v_contender_id;

    -- Auto-create pending submission
    INSERT INTO battles.submissions (battle_id, contender_id, status)
    VALUES (p_battle_id, v_contender_id, 'pending');

    RETURN v_contender_id;
END;
$$;

ALTER FUNCTION "public"."fn_battles_join"("p_battle_id" "uuid") OWNER TO "postgres";


-- ─────────────────────────────────────────────────────────────────────────────
-- SECTION 6: UPDATE award_battle_xp — use actor-based lookups
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION battles.award_battle_xp() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'public', 'battles', 'xp', 'lensers', 'actors'
AS $$
DECLARE
  v_contender RECORD;
  v_voter     RECORD;
BEGIN
  -- Only fire when status transitions to 'closed'
  IF NEW.status <> 'closed' OR OLD.status = 'closed' THEN
    RETURN NEW;
  END IF;

  -- Award XP to all human contenders (actor-based lookup with fallback)
  FOR v_contender IN
    SELECT COALESCE(a.profile_id, c.contender_ref_id) AS lenser_id
    FROM battles.contenders c
    LEFT JOIN actors.actors a ON a.id = c.actor_id
    WHERE c.battle_id = NEW.id
      AND (
          (a.id IS NOT NULL AND a.actor_type = 'human' AND a.profile_id IS NOT NULL)
          OR (a.id IS NULL AND c.contender_type = 'human')
      )
  LOOP
    PERFORM xp.apply(
      p_lenser_id       := v_contender.lenser_id,
      p_rule_key        := 'BATTLE_PARTICIPATED',
      p_source          := 'battle'::xp.source_enum,
      p_source_ref_type := 'battle',
      p_source_ref_id   := NEW.id,
      p_app_id          := '00000000-0000-0000-0000-000000000002'::uuid
    );
  END LOOP;

  -- Award XP to the winner (if human)
  IF NEW.winner_contender_id IS NOT NULL THEN
    DECLARE
      v_winner RECORD;
    BEGIN
      SELECT
          COALESCE(a.profile_id, c.contender_ref_id) AS lenser_id,
          COALESCE(a.actor_type, c.contender_type::text) AS resolved_type
      INTO v_winner
      FROM battles.contenders c
      LEFT JOIN actors.actors a ON a.id = c.actor_id
      WHERE c.id = NEW.winner_contender_id;

      IF v_winner.resolved_type = 'human' AND v_winner.lenser_id IS NOT NULL THEN
        PERFORM xp.apply(
          p_lenser_id       := v_winner.lenser_id,
          p_rule_key        := 'BATTLE_WON',
          p_source          := 'battle'::xp.source_enum,
          p_source_ref_type := 'battle',
          p_source_ref_id   := NEW.id,
          p_app_id          := '00000000-0000-0000-0000-000000000002'::uuid
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
      p_rule_key        := 'BATTLE_VOTED',
      p_source          := 'battle'::xp.source_enum,
      p_source_ref_type := 'battle',
      p_source_ref_id   := NEW.id,
      p_app_id          := '00000000-0000-0000-0000-000000000002'::uuid
    );
  END LOOP;

  RETURN NEW;
END;
$$;

ALTER FUNCTION battles.award_battle_xp() OWNER TO postgres;
