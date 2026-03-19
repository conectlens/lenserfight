-- =============================================================================
-- MIGRATION 24: SUBMISSION TRUST LINK
-- =============================================================================
-- Links submissions to execution runs and artifacts for provenance tracking.
-- Adds source metadata, revision chain support, and integrity hashing.
-- =============================================================================

-- ─────────────────────────────────────────────────────────────────────────────
-- SECTION 1: ADD COLUMNS TO battles.submissions
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE "battles"."submissions"
    ADD COLUMN IF NOT EXISTS "execution_run_id" "uuid",
    ADD COLUMN IF NOT EXISTS "artifact_id" "uuid",
    ADD COLUMN IF NOT EXISTS "source_type" "text" DEFAULT 'manual'::"text" NOT NULL,
    ADD COLUMN IF NOT EXISTS "adapter_id" "uuid",
    ADD COLUMN IF NOT EXISTS "model_id" "uuid",
    ADD COLUMN IF NOT EXISTS "integrity_hash" "text",
    ADD COLUMN IF NOT EXISTS "is_final" boolean DEFAULT true NOT NULL,
    ADD COLUMN IF NOT EXISTS "revision_of_id" "uuid",
    ADD COLUMN IF NOT EXISTS "metadata" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL;

-- Constraints on new columns
ALTER TABLE "battles"."submissions"
    ADD CONSTRAINT "submissions_source_type_check" CHECK (
        "source_type" = ANY (ARRAY[
            'manual'::"text",
            'execution_output'::"text",
            'hybrid'::"text",
            'imported'::"text"
        ])
    );


-- ─────────────────────────────────────────────────────────────────────────────
-- SECTION 2: FOREIGN KEYS
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE "battles"."submissions"
    ADD CONSTRAINT "submissions_execution_run_id_fkey"
    FOREIGN KEY ("execution_run_id")
    REFERENCES "execution"."runs"("id") ON DELETE SET NULL;

ALTER TABLE "battles"."submissions"
    ADD CONSTRAINT "submissions_artifact_id_fkey"
    FOREIGN KEY ("artifact_id")
    REFERENCES "execution"."artifacts"("id") ON DELETE SET NULL;

ALTER TABLE "battles"."submissions"
    ADD CONSTRAINT "submissions_adapter_id_fkey"
    FOREIGN KEY ("adapter_id")
    REFERENCES "battles"."agent_adapters"("id") ON DELETE SET NULL;

ALTER TABLE "battles"."submissions"
    ADD CONSTRAINT "submissions_model_id_fkey"
    FOREIGN KEY ("model_id")
    REFERENCES "ai"."models"("id") ON DELETE SET NULL;

ALTER TABLE "battles"."submissions"
    ADD CONSTRAINT "submissions_revision_of_id_fkey"
    FOREIGN KEY ("revision_of_id")
    REFERENCES "battles"."submissions"("id") ON DELETE SET NULL;


-- ─────────────────────────────────────────────────────────────────────────────
-- SECTION 3: INDEXES
-- ─────────────────────────────────────────────────────────────────────────────

-- Replace the existing unique constraint with partial unique for is_final
-- First check if we need to handle the existing constraint
DO $$
BEGIN
    -- Drop the existing unique constraint on (battle_id, contender_id) if it exists
    IF EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'submissions_battle_id_contender_id_key'
          AND conrelid = 'battles.submissions'::regclass
    ) THEN
        ALTER TABLE "battles"."submissions"
            DROP CONSTRAINT "submissions_battle_id_contender_id_key";
    END IF;
END
$$;

-- One final submission per contender per battle
CREATE UNIQUE INDEX "idx_submissions_battle_contender_final"
    ON "battles"."submissions" ("battle_id", "contender_id")
    WHERE "is_final" = true;

-- Execution run link (one submission per run)
CREATE UNIQUE INDEX "idx_submissions_execution_run"
    ON "battles"."submissions" ("execution_run_id")
    WHERE "execution_run_id" IS NOT NULL;

-- Contender submission history
CREATE INDEX "idx_submissions_contender_time"
    ON "battles"."submissions" ("contender_id", "submitted_at" DESC);


-- ─────────────────────────────────────────────────────────────────────────────
-- SECTION 4: TRIGGER — validate execution link
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION "battles"."trg_submissions_validate_execution_link"() RETURNS trigger
    LANGUAGE "plpgsql"
    AS $$
DECLARE
    v_run RECORD;
BEGIN
    -- Only validate if execution_run_id is set
    IF NEW.execution_run_id IS NULL THEN
        RETURN NEW;
    END IF;

    -- Verify run exists and succeeded
    SELECT r.status, r.request_id, rq.requester_lenser_id
    INTO v_run
    FROM execution.runs r
    JOIN execution.requests rq ON rq.id = r.request_id
    WHERE r.id = NEW.execution_run_id;

    IF v_run IS NULL THEN
        RAISE EXCEPTION 'Execution run not found: %', NEW.execution_run_id;
    END IF;

    IF v_run.status <> 'succeeded' THEN
        RAISE EXCEPTION 'Execution run must have succeeded status (current: %)', v_run.status;
    END IF;

    RETURN NEW;
END;
$$;

ALTER FUNCTION "battles"."trg_submissions_validate_execution_link"() OWNER TO "postgres";

CREATE TRIGGER "trg_submissions_validate_execution_link"
    BEFORE INSERT OR UPDATE ON "battles"."submissions"
    FOR EACH ROW
    EXECUTE FUNCTION "battles"."trg_submissions_validate_execution_link"();


-- ─────────────────────────────────────────────────────────────────────────────
-- SECTION 5: UPDATE fn_battles_submit — accept execution metadata
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION "public"."fn_battles_submit"(
    "p_battle_id" "uuid",
    "p_content_text" "text" DEFAULT NULL::"text",
    "p_content_url" "text" DEFAULT NULL::"text",
    "p_content_media" "jsonb" DEFAULT NULL::"jsonb",
    "p_execution_run_id" "uuid" DEFAULT NULL::"uuid",
    "p_artifact_id" "uuid" DEFAULT NULL::"uuid",
    "p_source_type" "text" DEFAULT 'manual'::"text",
    "p_adapter_id" "uuid" DEFAULT NULL::"uuid",
    "p_model_id" "uuid" DEFAULT NULL::"uuid"
) RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'battles', 'lensers', 'execution'
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
      AND (
          contender_ref_id = v_lenser_id
          OR actor_id = (SELECT id FROM actors.actors WHERE profile_id = v_lenser_id LIMIT 1)
      );

    IF v_contender IS NULL THEN
        RAISE EXCEPTION 'You are not a contender in this battle';
    END IF;

    IF p_content_text IS NULL AND p_content_url IS NULL AND p_execution_run_id IS NULL THEN
        RAISE EXCEPTION 'At least content_text, content_url, or execution_run_id is required';
    END IF;

    UPDATE battles.submissions
    SET status = 'submitted',
        content_text = p_content_text,
        content_url = p_content_url,
        content_media = COALESCE(p_content_media, '[]'::jsonb),
        submitted_at = now(),
        updated_at = now(),
        execution_run_id = p_execution_run_id,
        artifact_id = p_artifact_id,
        source_type = p_source_type,
        adapter_id = p_adapter_id,
        model_id = p_model_id
    WHERE battle_id = p_battle_id AND contender_id = v_contender.id
    RETURNING id INTO v_submission_id;

    -- Link execution to submission if provided
    IF p_execution_run_id IS NOT NULL THEN
        INSERT INTO execution.links (run_id, entity_type, entity_id)
        VALUES (p_execution_run_id, 'submission', v_submission_id)
        ON CONFLICT DO NOTHING;
    END IF;

    RETURN v_submission_id;
END;
$$;

ALTER FUNCTION "public"."fn_battles_submit"("p_battle_id" "uuid", "p_content_text" "text", "p_content_url" "text", "p_content_media" "jsonb", "p_execution_run_id" "uuid", "p_artifact_id" "uuid", "p_source_type" "text", "p_adapter_id" "uuid", "p_model_id" "uuid") OWNER TO "postgres";

GRANT ALL ON FUNCTION "public"."fn_battles_submit"("p_battle_id" "uuid", "p_content_text" "text", "p_content_url" "text", "p_content_media" "jsonb", "p_execution_run_id" "uuid", "p_artifact_id" "uuid", "p_source_type" "text", "p_adapter_id" "uuid", "p_model_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."fn_battles_submit"("p_battle_id" "uuid", "p_content_text" "text", "p_content_url" "text", "p_content_media" "jsonb", "p_execution_run_id" "uuid", "p_artifact_id" "uuid", "p_source_type" "text", "p_adapter_id" "uuid", "p_model_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_battles_submit"("p_battle_id" "uuid", "p_content_text" "text", "p_content_url" "text", "p_content_media" "jsonb", "p_execution_run_id" "uuid", "p_artifact_id" "uuid", "p_source_type" "text", "p_adapter_id" "uuid", "p_model_id" "uuid") TO "service_role";
