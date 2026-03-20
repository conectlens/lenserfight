-- M2: Forum prompt execution tracking
-- Purpose: Track "Run this prompt" actions from the forum
-- Links prompts to execution runs with payment method context
-- Self-hosted mode: payment_method defaults to 'free'

CREATE TYPE "content"."payment_method_enum" AS ENUM ('byok', 'wallet', 'free');

CREATE TABLE IF NOT EXISTS "content"."prompt_executions" (
    "id"               "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "prompt_id"        "uuid" NOT NULL,
    "lenser_id"        "uuid" NOT NULL,
    "execution_run_id" "uuid",
    "payment_method"   "content"."payment_method_enum" NOT NULL DEFAULT 'free',
    "created_at"       timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "prompt_executions_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "prompt_executions_prompt_id_fkey"
        FOREIGN KEY ("prompt_id") REFERENCES "content"."prompt_templates"("id") ON DELETE CASCADE,
    CONSTRAINT "prompt_executions_lenser_id_fkey"
        FOREIGN KEY ("lenser_id") REFERENCES "lensers"."profiles"("id") ON DELETE CASCADE,
    CONSTRAINT "prompt_executions_execution_run_id_fkey"
        FOREIGN KEY ("execution_run_id") REFERENCES "execution"."runs"("id") ON DELETE SET NULL
);

ALTER TABLE "content"."prompt_executions" OWNER TO "postgres";

COMMENT ON TABLE "content"."prompt_executions" IS 'Tracks forum "Run this prompt" actions. Immutable records — no UPDATE/DELETE for authenticated users.';

-- Indexes
CREATE INDEX "idx_prompt_exec_lenser"
    ON "content"."prompt_executions" ("lenser_id", "created_at" DESC);

CREATE INDEX "idx_prompt_exec_prompt"
    ON "content"."prompt_executions" ("prompt_id", "created_at" DESC);

CREATE INDEX "idx_prompt_exec_run"
    ON "content"."prompt_executions" ("execution_run_id")
    WHERE "execution_run_id" IS NOT NULL;

-- RLS
ALTER TABLE "content"."prompt_executions" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "prompt_exec_select_own"
    ON "content"."prompt_executions"
    FOR SELECT TO "authenticated"
    USING ("lenser_id" = "lensers"."get_auth_lenser_id"());

CREATE POLICY "prompt_exec_insert_own"
    ON "content"."prompt_executions"
    FOR INSERT TO "authenticated"
    WITH CHECK ("lenser_id" = "lensers"."get_auth_lenser_id"());

CREATE POLICY "prompt_exec_service_all"
    ON "content"."prompt_executions"
    TO "service_role"
    USING (true) WITH CHECK (true);

-- No UPDATE/DELETE policies for authenticated — records are immutable

-- Grants: authenticated role needs table-level SELECT/INSERT to satisfy PostgREST + RLS
GRANT SELECT, INSERT ON TABLE "content"."prompt_executions" TO "authenticated";
GRANT ALL ON TABLE "content"."prompt_executions" TO "service_role";
GRANT ALL ON TYPE "content"."payment_method_enum" TO "authenticated";
