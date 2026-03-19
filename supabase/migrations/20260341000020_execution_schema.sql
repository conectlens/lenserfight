-- =============================================================================
-- MIGRATION 20: EXECUTION SCHEMA
-- =============================================================================
-- Introduces the execution schema for tracking AI generation provenance,
-- reproducibility, and trust linkage for battle submissions and content.
-- =============================================================================

-- ─────────────────────────────────────────────────────────────────────────────
-- SECTION 1: SCHEMA
-- ─────────────────────────────────────────────────────────────────────────────

CREATE SCHEMA IF NOT EXISTS "execution";

ALTER SCHEMA "execution" OWNER TO "postgres";

GRANT USAGE ON SCHEMA "execution" TO "anon";
GRANT USAGE ON SCHEMA "execution" TO "authenticated";
GRANT USAGE ON SCHEMA "execution" TO "service_role";


-- ─────────────────────────────────────────────────────────────────────────────
-- SECTION 2: TABLES
-- ─────────────────────────────────────────────────────────────────────────────

-- 2.1 execution.requests — intent to execute
CREATE TABLE IF NOT EXISTS "execution"."requests" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "requester_lenser_id" "uuid" NOT NULL,
    "origin_type" "text" NOT NULL,
    "origin_id" "uuid",
    "agent_adapter_id" "uuid",
    "model_id" "uuid",
    "prompt_template_id" "uuid",
    "input_snapshot" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "runtime_origin" "text" DEFAULT 'cloud'::"text" NOT NULL,
    "funding_source" "text" DEFAULT 'platform_credit'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "requests_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "requests_origin_type_check" CHECK (
        "origin_type" = ANY (ARRAY[
            'battle'::"text",
            'content_preview'::"text",
            'template_test'::"text",
            'forum'::"text",
            'api'::"text",
            'cli'::"text"
        ])
    ),
    CONSTRAINT "requests_runtime_origin_check" CHECK (
        "runtime_origin" = ANY (ARRAY[
            'cloud'::"text",
            'local'::"text",
            'hybrid'::"text",
            'offline_import'::"text"
        ])
    ),
    CONSTRAINT "requests_funding_source_check" CHECK (
        "funding_source" = ANY (ARRAY[
            'user_byok_cloud'::"text",
            'user_byok_local'::"text",
            'platform_credit'::"text",
            'sponsored'::"text"
        ])
    )
);

ALTER TABLE "execution"."requests" OWNER TO "postgres";


-- 2.2 execution.runs — actual execution attempt
CREATE TABLE IF NOT EXISTS "execution"."runs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "request_id" "uuid" NOT NULL,
    "status" "text" DEFAULT 'queued'::"text" NOT NULL,
    "model_id" "uuid",
    "agent_adapter_id" "uuid",
    "provider_request_id" "text",
    "execution_hash" "text",
    "input_hash" "text",
    "output_hash" "text",
    "started_at" timestamp with time zone,
    "completed_at" timestamp with time zone,
    "latency_ms" integer,
    "error_code" "text",
    "error_message" "text",
    "cost_estimate" numeric,
    "token_input" integer,
    "token_output" integer,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "runs_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "runs_status_check" CHECK (
        "status" = ANY (ARRAY[
            'queued'::"text",
            'running'::"text",
            'succeeded'::"text",
            'failed'::"text",
            'canceled'::"text",
            'timed_out'::"text"
        ])
    )
);

ALTER TABLE "execution"."runs" OWNER TO "postgres";


-- 2.3 execution.steps — internal steps of agentic runs
CREATE TABLE IF NOT EXISTS "execution"."steps" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "run_id" "uuid" NOT NULL,
    "ordinal" integer NOT NULL,
    "step_type" "text" NOT NULL,
    "tool_name" "text",
    "input_snapshot" "jsonb",
    "output_snapshot" "jsonb",
    "input_hash" "text",
    "output_hash" "text",
    "started_at" timestamp with time zone,
    "completed_at" timestamp with time zone,
    "latency_ms" integer,
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "steps_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "steps_step_type_check" CHECK (
        "step_type" = ANY (ARRAY[
            'prompt'::"text",
            'tool_call'::"text",
            'tool_result'::"text",
            'model_call'::"text",
            'judge_call'::"text",
            'retrieval'::"text",
            'transform'::"text"
        ])
    ),
    CONSTRAINT "steps_status_check" CHECK (
        "status" = ANY (ARRAY[
            'pending'::"text",
            'running'::"text",
            'succeeded'::"text",
            'failed'::"text"
        ])
    )
);

ALTER TABLE "execution"."steps" OWNER TO "postgres";


-- 2.4 execution.artifacts — output and trace artifacts
CREATE TABLE IF NOT EXISTS "execution"."artifacts" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "run_id" "uuid" NOT NULL,
    "artifact_kind" "text" NOT NULL,
    "media_id" "uuid",
    "content_text" "text",
    "content_json" "jsonb",
    "visibility" "text" DEFAULT 'private'::"text" NOT NULL,
    "is_primary_output" boolean DEFAULT false NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "artifacts_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "artifacts_kind_check" CHECK (
        "artifact_kind" = ANY (ARRAY[
            'text'::"text",
            'image'::"text",
            'audio'::"text",
            'video'::"text",
            'json'::"text",
            'trace'::"text",
            'tool_log'::"text",
            'rubric_result'::"text"
        ])
    ),
    CONSTRAINT "artifacts_visibility_check" CHECK (
        "visibility" = ANY (ARRAY[
            'private'::"text",
            'public'::"text",
            'contender_only'::"text"
        ])
    )
);

ALTER TABLE "execution"."artifacts" OWNER TO "postgres";


-- 2.5 execution.links — connect execution to domain entities
CREATE TABLE IF NOT EXISTS "execution"."links" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "run_id" "uuid" NOT NULL,
    "entity_type" "text" NOT NULL,
    "entity_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "links_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "links_entity_type_check" CHECK (
        "entity_type" = ANY (ARRAY[
            'battle'::"text",
            'submission'::"text",
            'thread'::"text",
            'prompt_template'::"text"
        ])
    )
);

ALTER TABLE "execution"."links" OWNER TO "postgres";


-- ─────────────────────────────────────────────────────────────────────────────
-- SECTION 3: FOREIGN KEYS
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE "execution"."requests"
    ADD CONSTRAINT "requests_requester_lenser_id_fkey"
    FOREIGN KEY ("requester_lenser_id")
    REFERENCES "lensers"."profiles"("id") ON DELETE CASCADE;

ALTER TABLE "execution"."requests"
    ADD CONSTRAINT "requests_agent_adapter_id_fkey"
    FOREIGN KEY ("agent_adapter_id")
    REFERENCES "battles"."agent_adapters"("id") ON DELETE SET NULL;

ALTER TABLE "execution"."requests"
    ADD CONSTRAINT "requests_model_id_fkey"
    FOREIGN KEY ("model_id")
    REFERENCES "ai"."models"("id") ON DELETE SET NULL;

ALTER TABLE "execution"."requests"
    ADD CONSTRAINT "requests_prompt_template_id_fkey"
    FOREIGN KEY ("prompt_template_id")
    REFERENCES "content"."prompt_templates"("id") ON DELETE SET NULL;

ALTER TABLE "execution"."runs"
    ADD CONSTRAINT "runs_request_id_fkey"
    FOREIGN KEY ("request_id")
    REFERENCES "execution"."requests"("id") ON DELETE CASCADE;

ALTER TABLE "execution"."runs"
    ADD CONSTRAINT "runs_model_id_fkey"
    FOREIGN KEY ("model_id")
    REFERENCES "ai"."models"("id") ON DELETE SET NULL;

ALTER TABLE "execution"."runs"
    ADD CONSTRAINT "runs_agent_adapter_id_fkey"
    FOREIGN KEY ("agent_adapter_id")
    REFERENCES "battles"."agent_adapters"("id") ON DELETE SET NULL;

ALTER TABLE "execution"."steps"
    ADD CONSTRAINT "steps_run_id_fkey"
    FOREIGN KEY ("run_id")
    REFERENCES "execution"."runs"("id") ON DELETE CASCADE;

ALTER TABLE "execution"."artifacts"
    ADD CONSTRAINT "artifacts_run_id_fkey"
    FOREIGN KEY ("run_id")
    REFERENCES "execution"."runs"("id") ON DELETE CASCADE;

ALTER TABLE "execution"."artifacts"
    ADD CONSTRAINT "artifacts_media_id_fkey"
    FOREIGN KEY ("media_id")
    REFERENCES "content"."media_library"("id") ON DELETE SET NULL;

ALTER TABLE "execution"."links"
    ADD CONSTRAINT "links_run_id_fkey"
    FOREIGN KEY ("run_id")
    REFERENCES "execution"."runs"("id") ON DELETE CASCADE;


-- ─────────────────────────────────────────────────────────────────────────────
-- SECTION 4: INDEXES
-- ─────────────────────────────────────────────────────────────────────────────

-- requests
CREATE INDEX "idx_exec_requests_requester" ON "execution"."requests" ("requester_lenser_id", "created_at" DESC);
CREATE INDEX "idx_exec_requests_origin" ON "execution"."requests" ("origin_type", "origin_id");
CREATE INDEX "idx_exec_requests_adapter" ON "execution"."requests" ("agent_adapter_id", "created_at" DESC)
    WHERE "agent_adapter_id" IS NOT NULL;

-- runs
CREATE INDEX "idx_exec_runs_request" ON "execution"."runs" ("request_id");
CREATE INDEX "idx_exec_runs_status" ON "execution"."runs" ("status", "started_at" DESC);
CREATE INDEX "idx_exec_runs_model" ON "execution"."runs" ("model_id", "started_at" DESC)
    WHERE "model_id" IS NOT NULL;
CREATE INDEX "idx_exec_runs_adapter" ON "execution"."runs" ("agent_adapter_id", "started_at" DESC)
    WHERE "agent_adapter_id" IS NOT NULL;
CREATE UNIQUE INDEX "idx_exec_runs_execution_hash" ON "execution"."runs" ("execution_hash")
    WHERE "execution_hash" IS NOT NULL;
CREATE UNIQUE INDEX "idx_exec_runs_provider_request" ON "execution"."runs" ("provider_request_id")
    WHERE "provider_request_id" IS NOT NULL;

-- steps
CREATE UNIQUE INDEX "idx_exec_steps_run_ordinal" ON "execution"."steps" ("run_id", "ordinal");
CREATE INDEX "idx_exec_steps_run_type" ON "execution"."steps" ("run_id", "step_type");

-- artifacts
CREATE INDEX "idx_exec_artifacts_run_primary" ON "execution"."artifacts" ("run_id", "is_primary_output" DESC);
CREATE INDEX "idx_exec_artifacts_kind" ON "execution"."artifacts" ("artifact_kind", "created_at" DESC);

-- links
CREATE INDEX "idx_exec_links_entity" ON "execution"."links" ("entity_type", "entity_id");
CREATE INDEX "idx_exec_links_run" ON "execution"."links" ("run_id");
CREATE UNIQUE INDEX "idx_exec_links_unique" ON "execution"."links" ("run_id", "entity_type", "entity_id");


-- ─────────────────────────────────────────────────────────────────────────────
-- SECTION 5: TRIGGER — auto-set completed_at on terminal status
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION "execution"."trg_runs_set_completed_at"() RETURNS trigger
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    IF NEW.status IN ('succeeded', 'failed', 'canceled', 'timed_out')
       AND OLD.status NOT IN ('succeeded', 'failed', 'canceled', 'timed_out')
       AND NEW.completed_at IS NULL THEN
        NEW.completed_at := now();
    END IF;
    RETURN NEW;
END;
$$;

ALTER FUNCTION "execution"."trg_runs_set_completed_at"() OWNER TO "postgres";

CREATE TRIGGER "trg_runs_set_completed_at"
    BEFORE UPDATE ON "execution"."runs"
    FOR EACH ROW
    EXECUTE FUNCTION "execution"."trg_runs_set_completed_at"();


-- ─────────────────────────────────────────────────────────────────────────────
-- SECTION 6: ROW LEVEL SECURITY
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE "execution"."requests" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "execution"."runs" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "execution"."steps" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "execution"."artifacts" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "execution"."links" ENABLE ROW LEVEL SECURITY;

-- requests: owner can read their own
CREATE POLICY "requests_select_own" ON "execution"."requests"
    FOR SELECT TO "authenticated"
    USING ("requester_lenser_id" = "lensers"."get_auth_lenser_id"());

-- requests: authenticated can create their own
CREATE POLICY "requests_insert_own" ON "execution"."requests"
    FOR INSERT TO "authenticated"
    WITH CHECK ("requester_lenser_id" = "lensers"."get_auth_lenser_id"());

-- requests: service_role full access
CREATE POLICY "requests_service_all" ON "execution"."requests"
    FOR ALL TO "service_role"
    USING (true)
    WITH CHECK (true);

-- runs: owner can read via request join
CREATE POLICY "runs_select_own" ON "execution"."runs"
    FOR SELECT TO "authenticated"
    USING (EXISTS (
        SELECT 1 FROM "execution"."requests" r
        WHERE r."id" = "runs"."request_id"
          AND r."requester_lenser_id" = "lensers"."get_auth_lenser_id"()
    ));

-- runs: service_role full access (execution is server-side)
CREATE POLICY "runs_service_all" ON "execution"."runs"
    FOR ALL TO "service_role"
    USING (true)
    WITH CHECK (true);

-- steps: owner can read via run→request join
CREATE POLICY "steps_select_own" ON "execution"."steps"
    FOR SELECT TO "authenticated"
    USING (EXISTS (
        SELECT 1 FROM "execution"."runs" ru
        JOIN "execution"."requests" rq ON rq."id" = ru."request_id"
        WHERE ru."id" = "steps"."run_id"
          AND rq."requester_lenser_id" = "lensers"."get_auth_lenser_id"()
    ));

-- steps: service_role full access
CREATE POLICY "steps_service_all" ON "execution"."steps"
    FOR ALL TO "service_role"
    USING (true)
    WITH CHECK (true);

-- artifacts: owner can read via run→request join
CREATE POLICY "artifacts_select_own" ON "execution"."artifacts"
    FOR SELECT TO "authenticated"
    USING (EXISTS (
        SELECT 1 FROM "execution"."runs" ru
        JOIN "execution"."requests" rq ON rq."id" = ru."request_id"
        WHERE ru."id" = "artifacts"."run_id"
          AND rq."requester_lenser_id" = "lensers"."get_auth_lenser_id"()
    ));

-- artifacts: public artifacts readable by all authenticated
CREATE POLICY "artifacts_select_public" ON "execution"."artifacts"
    FOR SELECT TO "authenticated"
    USING ("visibility" = 'public');

-- artifacts: service_role full access
CREATE POLICY "artifacts_service_all" ON "execution"."artifacts"
    FOR ALL TO "service_role"
    USING (true)
    WITH CHECK (true);

-- links: owner can read via run→request join
CREATE POLICY "links_select_own" ON "execution"."links"
    FOR SELECT TO "authenticated"
    USING (EXISTS (
        SELECT 1 FROM "execution"."runs" ru
        JOIN "execution"."requests" rq ON rq."id" = ru."request_id"
        WHERE ru."id" = "links"."run_id"
          AND rq."requester_lenser_id" = "lensers"."get_auth_lenser_id"()
    ));

-- links: service_role full access
CREATE POLICY "links_service_all" ON "execution"."links"
    FOR ALL TO "service_role"
    USING (true)
    WITH CHECK (true);


-- ─────────────────────────────────────────────────────────────────────────────
-- SECTION 7: GRANTS
-- ─────────────────────────────────────────────────────────────────────────────

GRANT ALL ON TABLE "execution"."requests" TO "service_role";
GRANT SELECT, INSERT ON TABLE "execution"."requests" TO "authenticated";

GRANT ALL ON TABLE "execution"."runs" TO "service_role";
GRANT SELECT ON TABLE "execution"."runs" TO "authenticated";

GRANT ALL ON TABLE "execution"."steps" TO "service_role";
GRANT SELECT ON TABLE "execution"."steps" TO "authenticated";

GRANT ALL ON TABLE "execution"."artifacts" TO "service_role";
GRANT SELECT ON TABLE "execution"."artifacts" TO "authenticated";

GRANT ALL ON TABLE "execution"."links" TO "service_role";
GRANT SELECT ON TABLE "execution"."links" TO "authenticated";
