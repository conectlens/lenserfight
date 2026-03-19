-- =============================================================================
-- MIGRATION 26: CLEANUP DEPRECATED TABLES + EXTEND AI SCHEMA
-- =============================================================================
-- 1. Drop ai.generations (deprecated — replaced by execution.* schema)
--    Also drops the two public functions that depend on it.
-- 2. Sever execution.artifacts.media_id FK to content.media_library
--    (execution artifacts manage their own content; content.media_library stays)
-- 3. Create ai.providers — normalized provider registry
-- 4. Extend ai.models — add model_key, provider_id, context_window, capabilities
-- 5. Create ai.model_pricing — provider cost per 1K tokens (time-series)
-- 6. Create ai.execution_margin_policies — platform markup on provider cost
-- 7. Create ai.feature_model_policies — feature key → model routing
-- =============================================================================


-- ─────────────────────────────────────────────────────────────────────────────
-- SECTION 1: DROP DEPRECATED ai.generations AND DEPENDENT FUNCTIONS
-- ─────────────────────────────────────────────────────────────────────────────

-- Drop functions first (they reference ai.generations)
DROP FUNCTION IF EXISTS "public"."fn_ai_create_generation"(
    "text", "uuid", "jsonb", "text", "content"."visibility_enum", "text"
) CASCADE;

DROP FUNCTION IF EXISTS "public"."fn_ai_get_generations_for_prompt"(
    "uuid", "uuid", "integer", "integer", "text", "text"
) CASCADE;

-- Drop the deprecated table (CASCADE removes FK from content.media_library)
DROP TABLE IF EXISTS "ai"."generations" CASCADE;

COMMENT ON TABLE "content"."media_library" IS
    'Media asset storage for user-uploaded files. ai.generations has been dropped; '
    'use execution.artifacts for AI execution outputs.';


-- ─────────────────────────────────────────────────────────────────────────────
-- SECTION 2: SEVER execution.artifacts.media_id FK
-- ─────────────────────────────────────────────────────────────────────────────
-- Remove the FK constraint only — column stays nullable for backward compat.
-- Execution artifacts carry their own content (content_text, content_json);
-- media_id was a leaky coupling to the old generation flow.

ALTER TABLE "execution"."artifacts"
    DROP CONSTRAINT IF EXISTS "artifacts_media_id_fkey";

COMMENT ON COLUMN "execution"."artifacts"."media_id" IS
    'Deprecated reference to content.media_library. FK removed in migration 26. '
    'Column kept for backward compat; prefer content_text or content_json for new artifacts.';


-- ─────────────────────────────────────────────────────────────────────────────
-- SECTION 3: ai.providers — normalized provider registry
-- ─────────────────────────────────────────────────────────────────────────────
-- OSS-SAFE: metadata only, no secrets

CREATE TABLE IF NOT EXISTS "ai"."providers" (
    "id"           "uuid"        DEFAULT "gen_random_uuid"() NOT NULL,
    "key"          "text"        NOT NULL,           -- 'openai' | 'anthropic' | 'google' | etc.
    "display_name" "text"        NOT NULL,
    "base_url"     "text",                           -- optional override for self-hosted endpoints
    "docs_url"     "text",
    "is_active"    boolean       DEFAULT true  NOT NULL,
    "metadata"     "jsonb"       DEFAULT '{}'::jsonb NOT NULL,
    "created_at"   timestamptz   DEFAULT now() NOT NULL,
    "updated_at"   timestamptz   DEFAULT now() NOT NULL,
    CONSTRAINT "providers_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "providers_key_unique" UNIQUE ("key")
);

ALTER TABLE "ai"."providers" OWNER TO "postgres";

COMMENT ON TABLE "ai"."providers" IS 'AI provider registry. OSS-safe: no secrets, metadata only.';
COMMENT ON COLUMN "ai"."providers"."key" IS 'Short machine key, e.g. openai, anthropic, google.';
COMMENT ON COLUMN "ai"."providers"."base_url" IS 'Override for self-hosted or proxy endpoints.';

CREATE TRIGGER "trg_ai_providers_updated_at"
    BEFORE UPDATE ON "ai"."providers"
    FOR EACH ROW EXECUTE FUNCTION "battles"."set_updated_at"();


-- ─────────────────────────────────────────────────────────────────────────────
-- SECTION 4: EXTEND ai.models — add new platform columns
-- ─────────────────────────────────────────────────────────────────────────────
-- The old ai.models table (slug, provider_enum, temperature, max_tokens) stays.
-- New columns are additive. The seed (04_ai_models.sql) checks IF EXISTS ai.providers
-- before inserting into the extended schema — both shapes coexist.

ALTER TABLE "ai"."models"
    ADD COLUMN IF NOT EXISTS "model_key"              "text",
    ADD COLUMN IF NOT EXISTS "provider_id"            "uuid",
    ADD COLUMN IF NOT EXISTS "context_window_tokens"  integer,
    ADD COLUMN IF NOT EXISTS "supports_tools"         boolean DEFAULT false NOT NULL,
    ADD COLUMN IF NOT EXISTS "supports_json_schema"   boolean DEFAULT false NOT NULL,
    ADD COLUMN IF NOT EXISTS "supports_vision"        boolean DEFAULT false NOT NULL,
    ADD COLUMN IF NOT EXISTS "is_active"              boolean DEFAULT false NOT NULL;

-- FK: ai.models.provider_id → ai.providers.id
ALTER TABLE "ai"."models"
    ADD CONSTRAINT "models_provider_id_fkey"
    FOREIGN KEY ("provider_id")
    REFERENCES "ai"."providers"("id") ON DELETE SET NULL;

-- Unique index on model_key (non-null rows only)
CREATE UNIQUE INDEX IF NOT EXISTS "idx_ai_models_model_key"
    ON "ai"."models" ("model_key")
    WHERE "model_key" IS NOT NULL;

-- Index for provider lookups
CREATE INDEX IF NOT EXISTS "idx_ai_models_provider_id"
    ON "ai"."models" ("provider_id")
    WHERE "provider_id" IS NOT NULL;

-- Index for active models
CREATE INDEX IF NOT EXISTS "idx_ai_models_active"
    ON "ai"."models" ("is_active", "provider_id")
    WHERE "is_active" = true;

COMMENT ON COLUMN "ai"."models"."model_key" IS 'Provider API key, e.g. gpt-4o, claude-sonnet-4-6. UNIQUE when non-null.';
COMMENT ON COLUMN "ai"."models"."provider_id" IS 'FK to ai.providers when using the extended schema.';
COMMENT ON COLUMN "ai"."models"."context_window_tokens" IS 'Max context window in tokens.';
COMMENT ON COLUMN "ai"."models"."is_active" IS 'Whether this model is available for platform use.';


-- ─────────────────────────────────────────────────────────────────────────────
-- SECTION 5: ai.model_pricing — provider cost per 1K tokens (time-series)
-- ─────────────────────────────────────────────────────────────────────────────
-- OSS-SAFE: provider list prices, not platform margins (those are in margin_policies)

CREATE TABLE IF NOT EXISTS "ai"."model_pricing" (
    "id"                        "uuid"          DEFAULT "gen_random_uuid"() NOT NULL,
    "model_id"                  "uuid"          NOT NULL,
    "input_cost_per_1k_tokens"  numeric(12, 8)  NOT NULL,
    "output_cost_per_1k_tokens" numeric(12, 8)  NOT NULL,
    "effective_from"            timestamptz     DEFAULT now() NOT NULL,
    "effective_to"              timestamptz,
    "created_at"                timestamptz     DEFAULT now() NOT NULL,
    CONSTRAINT "model_pricing_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "model_pricing_model_id_fkey"
        FOREIGN KEY ("model_id") REFERENCES "ai"."models"("id") ON DELETE CASCADE,
    CONSTRAINT "model_pricing_costs_nonneg"
        CHECK ("input_cost_per_1k_tokens" >= 0 AND "output_cost_per_1k_tokens" >= 0),
    CONSTRAINT "model_pricing_dates_valid"
        CHECK ("effective_to" IS NULL OR "effective_to" > "effective_from")
);

ALTER TABLE "ai"."model_pricing" OWNER TO "postgres";

COMMENT ON TABLE "ai"."model_pricing" IS
    'Provider list prices per 1K tokens. Append-only time-series; close rows by setting effective_to.';

-- Only one active price per model at a time
CREATE UNIQUE INDEX IF NOT EXISTS "idx_ai_model_pricing_active_unique"
    ON "ai"."model_pricing" ("model_id")
    WHERE "effective_to" IS NULL;

-- Lookup index for active pricing
CREATE INDEX IF NOT EXISTS "idx_ai_model_pricing_model_active"
    ON "ai"."model_pricing" ("model_id")
    WHERE "effective_to" IS NULL;


-- ─────────────────────────────────────────────────────────────────────────────
-- SECTION 6: ai.execution_margin_policies — platform markup on provider cost
-- ─────────────────────────────────────────────────────────────────────────────
-- NOTE: This table is OSS-safe structurally, but actual margin values are
-- sensitive business config. Restrict reads to service_role only.

CREATE TABLE IF NOT EXISTS "ai"."execution_margin_policies" (
    "id"                 "uuid"          DEFAULT "gen_random_uuid"() NOT NULL,
    "model_id"           "uuid",                         -- NULL = global default policy
    "markup_percent"     numeric(5, 2)   NOT NULL DEFAULT 0,
    "fixed_fee_usd"      numeric(12, 8)  NOT NULL DEFAULT 0,
    "rounding_mode"      "text"          NOT NULL DEFAULT 'ceil',
    "min_charge_credits" integer         NOT NULL DEFAULT 1,
    "max_charge_credits" integer,
    "effective_from"     timestamptz     DEFAULT now() NOT NULL,
    "effective_to"       timestamptz,
    "is_active"          boolean         DEFAULT true NOT NULL,
    "metadata"           "jsonb"         DEFAULT '{}'::jsonb NOT NULL,
    "created_at"         timestamptz     DEFAULT now() NOT NULL,
    "updated_at"         timestamptz     DEFAULT now() NOT NULL,
    CONSTRAINT "execution_margin_policies_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "margin_policies_model_fkey"
        FOREIGN KEY ("model_id") REFERENCES "ai"."models"("id") ON DELETE CASCADE,
    CONSTRAINT "margin_policies_markup_nonneg"
        CHECK ("markup_percent" >= 0 AND "fixed_fee_usd" >= 0),
    CONSTRAINT "margin_policies_rounding_check"
        CHECK ("rounding_mode" IN ('ceil', 'floor', 'round')),
    CONSTRAINT "margin_policies_min_credits_nonneg"
        CHECK ("min_charge_credits" >= 0),
    CONSTRAINT "margin_policies_max_gte_min"
        CHECK ("max_charge_credits" IS NULL OR "max_charge_credits" >= "min_charge_credits")
);

ALTER TABLE "ai"."execution_margin_policies" OWNER TO "postgres";

COMMENT ON TABLE "ai"."execution_margin_policies" IS
    'Platform markup policies applied on provider cost. model_id=NULL = global default. SERVICE_ROLE ONLY.';

CREATE INDEX IF NOT EXISTS "idx_ai_margin_policies_active"
    ON "ai"."execution_margin_policies" ("model_id", "is_active")
    WHERE "is_active" = true AND "effective_to" IS NULL;

CREATE TRIGGER "trg_ai_margin_policies_updated_at"
    BEFORE UPDATE ON "ai"."execution_margin_policies"
    FOR EACH ROW EXECUTE FUNCTION "battles"."set_updated_at"();


-- ─────────────────────────────────────────────────────────────────────────────
-- SECTION 7: ai.feature_model_policies — feature key → model routing
-- ─────────────────────────────────────────────────────────────────────────────
-- OSS-SAFE: maps platform feature identifiers to models

CREATE TABLE IF NOT EXISTS "ai"."feature_model_policies" (
    "id"          "uuid"    DEFAULT "gen_random_uuid"() NOT NULL,
    "feature_key" "text"    NOT NULL,       -- e.g. 'chat.basic', 'battle.judge', 'reasoning.advanced'
    "model_id"    "uuid"    NOT NULL,
    "priority"    integer   NOT NULL DEFAULT 100,   -- lower = higher priority
    "is_active"   boolean   DEFAULT true NOT NULL,
    "conditions"  "jsonb"   DEFAULT '{}'::jsonb NOT NULL,  -- runtime conditions
    "created_at"  timestamptz DEFAULT now() NOT NULL,
    "updated_at"  timestamptz DEFAULT now() NOT NULL,
    CONSTRAINT "feature_model_policies_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "feature_model_policies_model_fkey"
        FOREIGN KEY ("model_id") REFERENCES "ai"."models"("id") ON DELETE CASCADE,
    CONSTRAINT "feature_model_policies_feature_model_unique"
        UNIQUE ("feature_key", "model_id")
);

ALTER TABLE "ai"."feature_model_policies" OWNER TO "postgres";

COMMENT ON TABLE "ai"."feature_model_policies" IS
    'Routes platform feature keys to specific AI models. Lower priority = higher preference.';
COMMENT ON COLUMN "ai"."feature_model_policies"."conditions" IS
    'Runtime conditions for this routing rule, e.g. {"min_context_tokens": 100000}.';

CREATE INDEX IF NOT EXISTS "idx_ai_feature_policies_key_active"
    ON "ai"."feature_model_policies" ("feature_key", "priority")
    WHERE "is_active" = true;

CREATE TRIGGER "trg_ai_feature_policies_updated_at"
    BEFORE UPDATE ON "ai"."feature_model_policies"
    FOR EACH ROW EXECUTE FUNCTION "battles"."set_updated_at"();


-- ─────────────────────────────────────────────────────────────────────────────
-- SECTION 8: ROW LEVEL SECURITY
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE "ai"."providers" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ai"."model_pricing" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ai"."execution_margin_policies" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ai"."feature_model_policies" ENABLE ROW LEVEL SECURITY;

-- providers: public read (active only), service_role full access
CREATE POLICY "providers_select_active" ON "ai"."providers"
    FOR SELECT TO "authenticated", "anon"
    USING ("is_active" = true);

CREATE POLICY "providers_service_all" ON "ai"."providers"
    FOR ALL TO "service_role"
    USING (true) WITH CHECK (true);

-- model_pricing: authenticated can read active pricing (effective_to IS NULL)
CREATE POLICY "model_pricing_select_active" ON "ai"."model_pricing"
    FOR SELECT TO "authenticated", "anon"
    USING ("effective_to" IS NULL);

CREATE POLICY "model_pricing_service_all" ON "ai"."model_pricing"
    FOR ALL TO "service_role"
    USING (true) WITH CHECK (true);

-- execution_margin_policies: service_role ONLY (sensitive billing logic)
CREATE POLICY "margin_policies_service_all" ON "ai"."execution_margin_policies"
    FOR ALL TO "service_role"
    USING (true) WITH CHECK (true);

-- feature_model_policies: authenticated read active, service_role full access
CREATE POLICY "feature_policies_select_active" ON "ai"."feature_model_policies"
    FOR SELECT TO "authenticated", "anon"
    USING ("is_active" = true);

CREATE POLICY "feature_policies_service_all" ON "ai"."feature_model_policies"
    FOR ALL TO "service_role"
    USING (true) WITH CHECK (true);


-- ─────────────────────────────────────────────────────────────────────────────
-- SECTION 9: GRANTS
-- ─────────────────────────────────────────────────────────────────────────────

GRANT SELECT ON TABLE "ai"."providers" TO "anon", "authenticated";
GRANT ALL    ON TABLE "ai"."providers" TO "service_role";

GRANT SELECT ON TABLE "ai"."model_pricing" TO "anon", "authenticated";
GRANT ALL    ON TABLE "ai"."model_pricing" TO "service_role";

-- margin_policies: service_role only
GRANT ALL ON TABLE "ai"."execution_margin_policies" TO "service_role";

GRANT SELECT ON TABLE "ai"."feature_model_policies" TO "anon", "authenticated";
GRANT ALL    ON TABLE "ai"."feature_model_policies" TO "service_role";
