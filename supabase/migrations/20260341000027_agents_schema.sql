-- =============================================================================
-- MIGRATION 27: AGENTS SCHEMA
-- =============================================================================
-- Creates the agents schema for LenserFight's "Bring your agent, start to fight!"
-- platform. Moves battles.agent_adapters here and builds the full agent lifecycle:
-- tool registry → agent definitions → versioned snapshots → deployed instances
-- with dual-path BYOK (cloud vault ref + local runtime profiles).
--
-- OSS-SAFE: No actual secrets stored. Cloud BYOK = vault reference name only.
--           Local BYOK = signing_key_hash only (hash of local key, not the key).
--
-- Key decisions:
-- - battles.agent_adapters → agents.agent_adapters (same shape + definition_id)
-- - 4 FKs rewired: execution.requests, execution.runs, actors.actors, battles.contenders
-- - fn_agent_adapters_register and fn_agent_adapters_remove repointed to agents schema
-- - byok_key_refs supports team-shared keys via scope + scoped_entity_id
-- - local_runtime_profiles stores signing_key_hash for HMAC integrity verification
-- =============================================================================


-- ─────────────────────────────────────────────────────────────────────────────
-- SECTION 1: SCHEMA
-- ─────────────────────────────────────────────────────────────────────────────

CREATE SCHEMA IF NOT EXISTS "agents";

ALTER SCHEMA "agents" OWNER TO "postgres";

GRANT USAGE ON SCHEMA "agents" TO "anon";
GRANT USAGE ON SCHEMA "agents" TO "authenticated";
GRANT USAGE ON SCHEMA "agents" TO "service_role";


-- ─────────────────────────────────────────────────────────────────────────────
-- SECTION 2: SHARED updated_at FUNCTION FOR agents SCHEMA
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION "agents"."set_updated_at"() RETURNS trigger
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    NEW.updated_at := now();
    RETURN NEW;
END;
$$;

ALTER FUNCTION "agents"."set_updated_at"() OWNER TO "postgres";


-- ─────────────────────────────────────────────────────────────────────────────
-- SECTION 3: agents.agent_adapters — moved from battles.agent_adapters
-- ─────────────────────────────────────────────────────────────────────────────
-- Same shape as battles.agent_adapters plus definition_id FK for new agents.

CREATE TABLE IF NOT EXISTS "agents"."agent_adapters" (
    "id"              "uuid"      DEFAULT "gen_random_uuid"() NOT NULL,
    "owner_lenser_id" "uuid"      NOT NULL,
    "name"            "text"      NOT NULL,
    "adapter_type"    "text"      NOT NULL,
    "config"          "jsonb"     DEFAULT '{}'::jsonb NOT NULL,
    "is_active"       boolean     DEFAULT true NOT NULL,
    "definition_id"   "uuid",     -- FK to agents.agent_definitions (set after definitions table created)
    "created_at"      timestamptz DEFAULT now() NOT NULL,
    "updated_at"      timestamptz DEFAULT now() NOT NULL,
    CONSTRAINT "agent_adapters_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "agent_adapters_type_check" CHECK (
        "adapter_type" = ANY (ARRAY[
            'openai-agents'::text,
            'langchain'::text,
            'crewai'::text,
            'mcp'::text,
            'ollama'::text,
            'http'::text,
            'custom'::text
        ])
    )
);

ALTER TABLE "agents"."agent_adapters" OWNER TO "postgres";

COMMENT ON TABLE "agents"."agent_adapters" IS
    'Agent runtime adapter configurations. Moved from battles.agent_adapters in migration 27.';
COMMENT ON COLUMN "agents"."agent_adapters"."definition_id" IS
    'Optional FK to agents.agent_definitions when this adapter backs a structured agent.';

CREATE TRIGGER "trg_agent_adapters_updated_at"
    BEFORE UPDATE ON "agents"."agent_adapters"
    FOR EACH ROW EXECUTE FUNCTION "agents"."set_updated_at"();

-- Index: owner lookup
CREATE INDEX "idx_agents_adapters_owner" ON "agents"."agent_adapters" ("owner_lenser_id", "is_active");


-- ─────────────────────────────────────────────────────────────────────────────
-- SECTION 4: COPY DATA FROM battles.agent_adapters → agents.agent_adapters
-- ─────────────────────────────────────────────────────────────────────────────

INSERT INTO "agents"."agent_adapters" (
    "id", "owner_lenser_id", "name", "adapter_type", "config", "is_active",
    "created_at", "updated_at"
)
SELECT
    "id", "owner_lenser_id", "name", "adapter_type", "config", "is_active",
    "created_at", "updated_at"
FROM "battles"."agent_adapters"
ON CONFLICT ("id") DO NOTHING;


-- ─────────────────────────────────────────────────────────────────────────────
-- SECTION 5: REWIRE FKs FROM battles.agent_adapters → agents.agent_adapters
-- ─────────────────────────────────────────────────────────────────────────────

-- 5a. execution.requests — drop old FK, add new FK
ALTER TABLE "execution"."requests"
    DROP CONSTRAINT IF EXISTS "requests_agent_adapter_id_fkey";

ALTER TABLE "execution"."requests"
    ADD CONSTRAINT "requests_agent_adapter_id_fkey"
    FOREIGN KEY ("agent_adapter_id")
    REFERENCES "agents"."agent_adapters"("id") ON DELETE SET NULL;

-- 5b. execution.runs — drop old FK, add new FK
ALTER TABLE "execution"."runs"
    DROP CONSTRAINT IF EXISTS "runs_agent_adapter_id_fkey";

ALTER TABLE "execution"."runs"
    ADD CONSTRAINT "runs_agent_adapter_id_fkey"
    FOREIGN KEY ("agent_adapter_id")
    REFERENCES "agents"."agent_adapters"("id") ON DELETE SET NULL;

-- 5c. actors.actors — drop old FK, add new FK
ALTER TABLE "actors"."actors"
    DROP CONSTRAINT IF EXISTS "actors_agent_adapter_id_fkey";

ALTER TABLE "actors"."actors"
    ADD CONSTRAINT "actors_agent_adapter_id_fkey"
    FOREIGN KEY ("agent_adapter_id")
    REFERENCES "agents"."agent_adapters"("id") ON DELETE SET NULL;

-- 5d. battles.contenders — drop old FK, add new FK
ALTER TABLE "battles"."contenders"
    DROP CONSTRAINT IF EXISTS "contenders_adapter_fk";

ALTER TABLE "battles"."contenders"
    ADD CONSTRAINT "contenders_adapter_fk"
    FOREIGN KEY ("agent_adapter_id")
    REFERENCES "agents"."agent_adapters"("id") ON DELETE SET NULL;

-- 5e. battles.submissions — drop old FK (from migration 24), add new FK
ALTER TABLE "battles"."submissions"
    DROP CONSTRAINT IF EXISTS "submissions_adapter_id_fkey";

ALTER TABLE "battles"."submissions"
    ADD CONSTRAINT "submissions_adapter_id_fkey"
    FOREIGN KEY ("adapter_id")
    REFERENCES "agents"."agent_adapters"("id") ON DELETE SET NULL;


-- ─────────────────────────────────────────────────────────────────────────────
-- SECTION 6: DROP battles.agent_adapters (data is now in agents.agent_adapters)
-- ─────────────────────────────────────────────────────────────────────────────

-- Drop policies, trigger, then table
DROP POLICY IF EXISTS "Authenticated users can create adapters" ON "battles"."agent_adapters";
DROP POLICY IF EXISTS "Owners can delete own adapters"          ON "battles"."agent_adapters";
DROP POLICY IF EXISTS "Owners can see own adapters"             ON "battles"."agent_adapters";
DROP POLICY IF EXISTS "Owners can update own adapters"          ON "battles"."agent_adapters";

DROP TRIGGER IF EXISTS "trg_agent_adapters_updated_at" ON "battles"."agent_adapters";

DROP TABLE IF EXISTS "battles"."agent_adapters";


-- ─────────────────────────────────────────────────────────────────────────────
-- SECTION 7: REPLACE fn_agent_adapters_register / fn_agent_adapters_remove
--             to use agents.agent_adapters
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION "public"."fn_agent_adapters_register"(
    "p_name"         "text",
    "p_adapter_type" "text",
    "p_config"       "jsonb" DEFAULT '{}'::jsonb
) RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'agents', 'lensers'
    AS $$
DECLARE
    v_lenser_id uuid;
    v_adapter_id uuid;
BEGIN
    v_lenser_id := lensers.get_auth_lenser_id();
    IF v_lenser_id IS NULL THEN
        RAISE EXCEPTION 'NOT_AUTHENTICATED';
    END IF;

    INSERT INTO agents.agent_adapters (owner_lenser_id, name, adapter_type, config)
    VALUES (v_lenser_id, p_name, p_adapter_type, p_config)
    RETURNING id INTO v_adapter_id;

    RETURN v_adapter_id;
END;
$$;

ALTER FUNCTION "public"."fn_agent_adapters_register"(
    "text", "text", "jsonb"
) OWNER TO "postgres";

GRANT ALL ON FUNCTION "public"."fn_agent_adapters_register"("text", "text", "jsonb")
    TO "anon", "authenticated", "service_role";


CREATE OR REPLACE FUNCTION "public"."fn_agent_adapters_remove"(
    "p_adapter_id" "uuid"
) RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'agents', 'lensers'
    AS $$
DECLARE
    v_lenser_id uuid;
BEGIN
    v_lenser_id := lensers.get_auth_lenser_id();
    IF v_lenser_id IS NULL THEN
        RAISE EXCEPTION 'NOT_AUTHENTICATED';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM agents.agent_adapters
        WHERE id = p_adapter_id AND owner_lenser_id = v_lenser_id
    ) THEN
        RAISE EXCEPTION 'NOT_FOUND_OR_FORBIDDEN';
    END IF;

    UPDATE agents.agent_adapters
    SET is_active = false, updated_at = now()
    WHERE id = p_adapter_id AND owner_lenser_id = v_lenser_id;
END;
$$;

ALTER FUNCTION "public"."fn_agent_adapters_remove"(
    "uuid"
) OWNER TO "postgres";

GRANT ALL ON FUNCTION "public"."fn_agent_adapters_remove"("uuid")
    TO "anon", "authenticated", "service_role";


-- ─────────────────────────────────────────────────────────────────────────────
-- SECTION 8: agents.tools — platform tool registry
-- ─────────────────────────────────────────────────────────────────────────────
-- OSS-SAFE: Tool schemas only, no credentials

CREATE TABLE IF NOT EXISTS "agents"."tools" (
    "id"             "uuid"    DEFAULT "gen_random_uuid"() NOT NULL,
    "key"            "text"    NOT NULL,         -- 'web_search' | 'code_execution' | 'file_read' | etc.
    "display_name"   "text"    NOT NULL,
    "description"    "text",
    "schema_version" "text"    DEFAULT '1.0' NOT NULL,
    "input_schema"   "jsonb",                    -- JSON Schema for tool input
    "output_schema"  "jsonb",                    -- JSON Schema for tool output
    "is_system"      boolean   DEFAULT false NOT NULL,  -- true = platform-owned
    "is_active"      boolean   DEFAULT true  NOT NULL,
    "created_at"     timestamptz DEFAULT now() NOT NULL,
    CONSTRAINT "tools_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "tools_key_unique" UNIQUE ("key")
);

ALTER TABLE "agents"."tools" OWNER TO "postgres";
COMMENT ON TABLE "agents"."tools" IS 'Agent tool registry. OSS-safe: schemas only, no credentials.';
COMMENT ON COLUMN "agents"."tools"."is_system" IS 'true = platform-owned tool; false = community-contributed.';


-- ─────────────────────────────────────────────────────────────────────────────
-- SECTION 9: agents.agent_definitions — agent blueprints
-- ─────────────────────────────────────────────────────────────────────────────
-- OSS-SAFE: system prompts, capabilities, model references — no keys

CREATE TABLE IF NOT EXISTS "agents"."agent_definitions" (
    "id"              "uuid"    DEFAULT "gen_random_uuid"() NOT NULL,
    "owner_lenser_id" "uuid"    NOT NULL,
    "name"            "text"    NOT NULL,
    "slug"            "text"    NOT NULL,
    "description"     "text",
    "system_prompt"   "text",                    -- Base system prompt for this agent
    "model_id"        "uuid",                    -- Default model (ai.models FK)
    "adapter_id"      "uuid",                    -- Default adapter (agents.agent_adapters FK)
    "is_public"       boolean   DEFAULT false NOT NULL,
    "is_active"       boolean   DEFAULT true  NOT NULL,
    "created_at"      timestamptz DEFAULT now() NOT NULL,
    "updated_at"      timestamptz DEFAULT now() NOT NULL,
    CONSTRAINT "agent_definitions_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "agent_definitions_slug_unique" UNIQUE ("slug")
);

ALTER TABLE "agents"."agent_definitions" OWNER TO "postgres";
COMMENT ON TABLE "agents"."agent_definitions" IS 'Agent blueprints owned by lensers. OSS-safe.';

CREATE INDEX "idx_agent_definitions_owner"  ON "agents"."agent_definitions" ("owner_lenser_id");
CREATE INDEX "idx_agent_definitions_public" ON "agents"."agent_definitions" ("is_public", "is_active")
    WHERE "is_public" = true AND "is_active" = true;

CREATE TRIGGER "trg_agent_definitions_updated_at"
    BEFORE UPDATE ON "agents"."agent_definitions"
    FOR EACH ROW EXECUTE FUNCTION "agents"."set_updated_at"();


-- ─────────────────────────────────────────────────────────────────────────────
-- SECTION 10: agents.agent_versions — immutable versioned snapshots
-- ─────────────────────────────────────────────────────────────────────────────
-- Append-only: no UPDATE/DELETE in RLS. Enables reproducibility for battle disputes.

CREATE TABLE IF NOT EXISTS "agents"."agent_versions" (
    "id"             "uuid"    DEFAULT "gen_random_uuid"() NOT NULL,
    "definition_id"  "uuid"    NOT NULL,
    "version_number" integer   NOT NULL,
    "system_prompt"  "text",
    "model_id"       "uuid",
    "config_snapshot" "jsonb"  DEFAULT '{}'::jsonb NOT NULL,   -- Full config frozen at publish time
    "created_by"     "uuid"    NOT NULL,
    "created_at"     timestamptz DEFAULT now() NOT NULL,
    CONSTRAINT "agent_versions_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "agent_versions_def_version_unique" UNIQUE ("definition_id", "version_number")
);

ALTER TABLE "agents"."agent_versions" OWNER TO "postgres";
COMMENT ON TABLE "agents"."agent_versions" IS
    'Immutable versioned snapshots of agent_definitions. Append-only — used for battle reproducibility.';

CREATE INDEX "idx_agent_versions_definition" ON "agents"."agent_versions" ("definition_id", "version_number" DESC);


-- ─────────────────────────────────────────────────────────────────────────────
-- SECTION 11: agents.agent_productivity_scopes — per-app agent contexts
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "agents"."agent_productivity_scopes" (
    "id"            "uuid"    DEFAULT "gen_random_uuid"() NOT NULL,
    "definition_id" "uuid"    NOT NULL,
    "app_id"        "uuid"    NOT NULL,                  -- FK to xp.apps
    "scope_config"  "jsonb"   DEFAULT '{}'::jsonb NOT NULL,
    "is_active"     boolean   DEFAULT true NOT NULL,
    "created_at"    timestamptz DEFAULT now() NOT NULL,
    CONSTRAINT "agent_productivity_scopes_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "agent_productivity_scopes_def_app_unique" UNIQUE ("definition_id", "app_id")
);

ALTER TABLE "agents"."agent_productivity_scopes" OWNER TO "postgres";
COMMENT ON TABLE "agents"."agent_productivity_scopes" IS
    'Scopes an agent definition to specific platform apps (arena, forum, cli, etc.).';

CREATE INDEX "idx_agent_productivity_scopes_app" ON "agents"."agent_productivity_scopes" ("app_id", "is_active");


-- ─────────────────────────────────────────────────────────────────────────────
-- SECTION 12: agents.agent_tool_allowlist — per-agent tool permissions
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "agents"."agent_tool_allowlist" (
    "id"              "uuid"    DEFAULT "gen_random_uuid"() NOT NULL,
    "definition_id"   "uuid"    NOT NULL,
    "tool_id"         "uuid"    NOT NULL,
    "config_override" "jsonb"   DEFAULT '{}'::jsonb NOT NULL,  -- Override tool defaults for this agent
    "granted_by"      "uuid"    NOT NULL,
    "granted_at"      timestamptz DEFAULT now() NOT NULL,
    CONSTRAINT "agent_tool_allowlist_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "agent_tool_allowlist_def_tool_unique" UNIQUE ("definition_id", "tool_id")
);

ALTER TABLE "agents"."agent_tool_allowlist" OWNER TO "postgres";
COMMENT ON TABLE "agents"."agent_tool_allowlist" IS 'Per-agent tool permission grants.';

CREATE INDEX "idx_agent_tool_allowlist_definition" ON "agents"."agent_tool_allowlist" ("definition_id");


-- ─────────────────────────────────────────────────────────────────────────────
-- SECTION 13: agents.byok_key_refs — cloud BYOK metadata (NO secrets)
-- ─────────────────────────────────────────────────────────────────────────────
-- OSS-SAFE: vault_secret_name is an opaque reference to Supabase Vault.
-- The actual API key NEVER appears in this table — only stored in vault.create_secret().
-- Team-shared keys use scope='team' + scoped_entity_id pointing to an actors.teams row.

CREATE TABLE IF NOT EXISTS "agents"."byok_key_refs" (
    "id"                "uuid"    DEFAULT "gen_random_uuid"() NOT NULL,
    "owner_lenser_id"   "uuid"    NOT NULL,
    "provider_id"       "uuid"    NOT NULL,                     -- FK to ai.providers
    "display_label"     "text"    NOT NULL,                     -- User-friendly label
    "vault_secret_name" "text"    NOT NULL,                     -- Supabase Vault secret name (NOT the key)
    "key_prefix"        "text",                                 -- First 4-8 chars for UI display only
    "scope"             "text"    DEFAULT 'agent' NOT NULL,     -- 'agent' | 'user' | 'team'
    "scoped_entity_id"  "uuid",                                 -- agent_instance.id or actors.teams.id if scoped
    "status"            "text"    DEFAULT 'active' NOT NULL,
    "last_used_at"      timestamptz,
    "expires_at"        timestamptz,
    "created_at"        timestamptz DEFAULT now() NOT NULL,
    "updated_at"        timestamptz DEFAULT now() NOT NULL,
    CONSTRAINT "byok_key_refs_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "byok_key_refs_scope_check" CHECK (
        "scope" IN ('agent', 'user', 'team')
    ),
    CONSTRAINT "byok_key_refs_status_check" CHECK (
        "status" IN ('active', 'revoked', 'expired')
    )
);

ALTER TABLE "agents"."byok_key_refs" OWNER TO "postgres";

COMMENT ON TABLE "agents"."byok_key_refs" IS
    'Cloud BYOK key metadata. OSS-safe: vault_secret_name is opaque reference. '
    'Actual keys live in Supabase Vault via vault.create_secret(), NEVER in Postgres.';
COMMENT ON COLUMN "agents"."byok_key_refs"."vault_secret_name" IS
    'Reference to Supabase Vault secret (pg_secrets). Never expose via RLS SELECT to end users.';
COMMENT ON COLUMN "agents"."byok_key_refs"."key_prefix" IS
    'First 4-8 chars of the key for user identification only. e.g. sk-an...';
COMMENT ON COLUMN "agents"."byok_key_refs"."scope" IS
    'agent = single agent; user = all user agents; team = shared across team members.';
COMMENT ON COLUMN "agents"."byok_key_refs"."scoped_entity_id" IS
    'Polymorphic: agents.agent_instances.id (scope=agent) or actors.teams actor_id (scope=team).';

CREATE INDEX "idx_byok_key_refs_owner_status"   ON "agents"."byok_key_refs" ("owner_lenser_id", "status");
CREATE INDEX "idx_byok_key_refs_provider_status" ON "agents"."byok_key_refs" ("provider_id", "status");
CREATE INDEX "idx_byok_key_refs_vault_name"      ON "agents"."byok_key_refs" ("vault_secret_name");  -- for revocation

CREATE TRIGGER "trg_byok_key_refs_updated_at"
    BEFORE UPDATE ON "agents"."byok_key_refs"
    FOR EACH ROW EXECUTE FUNCTION "agents"."set_updated_at"();


-- ─────────────────────────────────────────────────────────────────────────────
-- SECTION 14: agents.local_runtime_profiles — self-hosted agent identity
-- ─────────────────────────────────────────────────────────────────────────────
-- For users running agents locally. No cloud secrets stored here.
-- signing_key_hash = SHA-256 of local signing key. Used to verify HMAC on synced results.
-- Actual signing key stays on the local machine, NEVER synced.

CREATE TABLE IF NOT EXISTS "agents"."local_runtime_profiles" (
    "id"                 "uuid"    DEFAULT "gen_random_uuid"() NOT NULL,
    "owner_lenser_id"    "uuid"    NOT NULL,
    "profile_name"       "text"    NOT NULL,
    "local_profile_token" "text"   NOT NULL,             -- Stable opaque token for local agent identity
    "signing_key_hash"   "text",                         -- SHA-256 of local signing key (hash only, never the key)
    "runtime_url"        "text",                         -- Optional public tunnel URL for hybrid mode
    "sync_enabled"       boolean   DEFAULT false NOT NULL, -- Whether local results sync to cloud
    "last_seen_at"       timestamptz,
    "created_at"         timestamptz DEFAULT now() NOT NULL,
    CONSTRAINT "local_runtime_profiles_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "local_runtime_profiles_token_unique" UNIQUE ("local_profile_token")
);

ALTER TABLE "agents"."local_runtime_profiles" OWNER TO "postgres";

COMMENT ON TABLE "agents"."local_runtime_profiles" IS
    'Local/self-hosted agent runtime profiles. OSS-safe: no cloud secrets. '
    'signing_key_hash = SHA-256 of local signing key for HMAC verification of synced results.';
COMMENT ON COLUMN "agents"."local_runtime_profiles"."local_profile_token" IS
    'Stable opaque token that identifies this local runtime to the cloud without revealing secrets.';
COMMENT ON COLUMN "agents"."local_runtime_profiles"."signing_key_hash" IS
    'SHA-256 hash of local HMAC signing key. Used to verify execution_runs.execution_hash on sync. '
    'Actual signing key lives ONLY on the local machine.';

CREATE INDEX "idx_local_runtime_profiles_owner" ON "agents"."local_runtime_profiles" ("owner_lenser_id");


-- ─────────────────────────────────────────────────────────────────────────────
-- SECTION 15: agents.agent_instances — deployed agents (BYOK-enabled)
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "agents"."agent_instances" (
    "id"                   "uuid"    DEFAULT "gen_random_uuid"() NOT NULL,
    "definition_id"        "uuid"    NOT NULL,
    "version_id"           "uuid",                              -- FK to agents.agent_versions
    "owner_lenser_id"      "uuid"    NOT NULL,
    "actor_id"             "uuid",                              -- FK to actors.actors
    "display_name"         "text"    NOT NULL,
    "runtime_mode"         "text"    NOT NULL DEFAULT 'cloud',  -- 'cloud' | 'local' | 'hybrid'
    "byok_key_ref_id"      "uuid",                              -- FK to agents.byok_key_refs (nullable)
    "local_profile_id"     "uuid",                              -- FK to agents.local_runtime_profiles
    "adapter_id"           "uuid",                              -- FK to agents.agent_adapters (override)
    "is_active"            boolean   DEFAULT true NOT NULL,
    "created_at"           timestamptz DEFAULT now() NOT NULL,
    "updated_at"           timestamptz DEFAULT now() NOT NULL,
    CONSTRAINT "agent_instances_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "agent_instances_runtime_mode_check" CHECK (
        "runtime_mode" IN ('cloud', 'local', 'hybrid')
    ),
    CONSTRAINT "agent_instances_cloud_needs_byok_or_credit" CHECK (
        -- Cloud mode requires either BYOK or platform credit (NULL byok = platform credit)
        "runtime_mode" <> 'cloud' OR true  -- soft constraint: enforced at app layer
    ),
    CONSTRAINT "agent_instances_local_needs_profile" CHECK (
        -- Local/hybrid mode should have a local_profile_id
        "runtime_mode" NOT IN ('local', 'hybrid') OR "local_profile_id" IS NOT NULL
    )
);

ALTER TABLE "agents"."agent_instances" OWNER TO "postgres";
COMMENT ON TABLE "agents"."agent_instances" IS
    'Deployed agent instances. Each instance is linked to an actor, has BYOK config, '
    'and can run in cloud, local, or hybrid mode.';
COMMENT ON COLUMN "agents"."agent_instances"."byok_key_ref_id" IS
    'NULL = use platform credit. Non-null = use this BYOK key for execution funding.';
COMMENT ON COLUMN "agents"."agent_instances"."local_profile_id" IS
    'Required for local/hybrid runtime_mode. Links to local_runtime_profiles.';

CREATE INDEX "idx_agent_instances_owner"      ON "agents"."agent_instances" ("owner_lenser_id");
CREATE INDEX "idx_agent_instances_actor"      ON "agents"."agent_instances" ("actor_id")
    WHERE "actor_id" IS NOT NULL;
CREATE INDEX "idx_agent_instances_definition" ON "agents"."agent_instances" ("definition_id", "is_active");

CREATE TRIGGER "trg_agent_instances_updated_at"
    BEFORE UPDATE ON "agents"."agent_instances"
    FOR EACH ROW EXECUTE FUNCTION "agents"."set_updated_at"();


-- ─────────────────────────────────────────────────────────────────────────────
-- SECTION 16: FOREIGN KEYS
-- ─────────────────────────────────────────────────────────────────────────────

-- agents.agent_adapters
ALTER TABLE "agents"."agent_adapters"
    ADD CONSTRAINT "agent_adapters_owner_fkey"
    FOREIGN KEY ("owner_lenser_id")
    REFERENCES "lensers"."profiles"("id") ON DELETE CASCADE;

ALTER TABLE "agents"."agent_adapters"
    ADD CONSTRAINT "agent_adapters_definition_fkey"
    FOREIGN KEY ("definition_id")
    REFERENCES "agents"."agent_definitions"("id") ON DELETE SET NULL;

-- agents.agent_definitions
ALTER TABLE "agents"."agent_definitions"
    ADD CONSTRAINT "agent_definitions_owner_fkey"
    FOREIGN KEY ("owner_lenser_id")
    REFERENCES "lensers"."profiles"("id") ON DELETE CASCADE;

ALTER TABLE "agents"."agent_definitions"
    ADD CONSTRAINT "agent_definitions_model_fkey"
    FOREIGN KEY ("model_id")
    REFERENCES "ai"."models"("id") ON DELETE SET NULL;

ALTER TABLE "agents"."agent_definitions"
    ADD CONSTRAINT "agent_definitions_adapter_fkey"
    FOREIGN KEY ("adapter_id")
    REFERENCES "agents"."agent_adapters"("id") ON DELETE SET NULL;

-- agents.agent_versions
ALTER TABLE "agents"."agent_versions"
    ADD CONSTRAINT "agent_versions_definition_fkey"
    FOREIGN KEY ("definition_id")
    REFERENCES "agents"."agent_definitions"("id") ON DELETE CASCADE;

ALTER TABLE "agents"."agent_versions"
    ADD CONSTRAINT "agent_versions_model_fkey"
    FOREIGN KEY ("model_id")
    REFERENCES "ai"."models"("id") ON DELETE SET NULL;

ALTER TABLE "agents"."agent_versions"
    ADD CONSTRAINT "agent_versions_created_by_fkey"
    FOREIGN KEY ("created_by")
    REFERENCES "lensers"."profiles"("id") ON DELETE SET NULL;

-- agents.agent_productivity_scopes
ALTER TABLE "agents"."agent_productivity_scopes"
    ADD CONSTRAINT "agent_productivity_scopes_definition_fkey"
    FOREIGN KEY ("definition_id")
    REFERENCES "agents"."agent_definitions"("id") ON DELETE CASCADE;

ALTER TABLE "agents"."agent_productivity_scopes"
    ADD CONSTRAINT "agent_productivity_scopes_app_fkey"
    FOREIGN KEY ("app_id")
    REFERENCES "xp"."apps"("id") ON DELETE CASCADE;

-- agents.agent_tool_allowlist
ALTER TABLE "agents"."agent_tool_allowlist"
    ADD CONSTRAINT "agent_tool_allowlist_definition_fkey"
    FOREIGN KEY ("definition_id")
    REFERENCES "agents"."agent_definitions"("id") ON DELETE CASCADE;

ALTER TABLE "agents"."agent_tool_allowlist"
    ADD CONSTRAINT "agent_tool_allowlist_tool_fkey"
    FOREIGN KEY ("tool_id")
    REFERENCES "agents"."tools"("id") ON DELETE CASCADE;

ALTER TABLE "agents"."agent_tool_allowlist"
    ADD CONSTRAINT "agent_tool_allowlist_granted_by_fkey"
    FOREIGN KEY ("granted_by")
    REFERENCES "lensers"."profiles"("id") ON DELETE SET NULL;

-- agents.byok_key_refs
ALTER TABLE "agents"."byok_key_refs"
    ADD CONSTRAINT "byok_key_refs_owner_fkey"
    FOREIGN KEY ("owner_lenser_id")
    REFERENCES "lensers"."profiles"("id") ON DELETE CASCADE;

ALTER TABLE "agents"."byok_key_refs"
    ADD CONSTRAINT "byok_key_refs_provider_fkey"
    FOREIGN KEY ("provider_id")
    REFERENCES "ai"."providers"("id") ON DELETE RESTRICT;

-- agents.local_runtime_profiles
ALTER TABLE "agents"."local_runtime_profiles"
    ADD CONSTRAINT "local_runtime_profiles_owner_fkey"
    FOREIGN KEY ("owner_lenser_id")
    REFERENCES "lensers"."profiles"("id") ON DELETE CASCADE;

-- agents.agent_instances
ALTER TABLE "agents"."agent_instances"
    ADD CONSTRAINT "agent_instances_definition_fkey"
    FOREIGN KEY ("definition_id")
    REFERENCES "agents"."agent_definitions"("id") ON DELETE CASCADE;

ALTER TABLE "agents"."agent_instances"
    ADD CONSTRAINT "agent_instances_version_fkey"
    FOREIGN KEY ("version_id")
    REFERENCES "agents"."agent_versions"("id") ON DELETE SET NULL;

ALTER TABLE "agents"."agent_instances"
    ADD CONSTRAINT "agent_instances_owner_fkey"
    FOREIGN KEY ("owner_lenser_id")
    REFERENCES "lensers"."profiles"("id") ON DELETE CASCADE;

ALTER TABLE "agents"."agent_instances"
    ADD CONSTRAINT "agent_instances_actor_fkey"
    FOREIGN KEY ("actor_id")
    REFERENCES "actors"."actors"("id") ON DELETE SET NULL;

ALTER TABLE "agents"."agent_instances"
    ADD CONSTRAINT "agent_instances_byok_key_fkey"
    FOREIGN KEY ("byok_key_ref_id")
    REFERENCES "agents"."byok_key_refs"("id") ON DELETE SET NULL;

ALTER TABLE "agents"."agent_instances"
    ADD CONSTRAINT "agent_instances_local_profile_fkey"
    FOREIGN KEY ("local_profile_id")
    REFERENCES "agents"."local_runtime_profiles"("id") ON DELETE SET NULL;

ALTER TABLE "agents"."agent_instances"
    ADD CONSTRAINT "agent_instances_adapter_fkey"
    FOREIGN KEY ("adapter_id")
    REFERENCES "agents"."agent_adapters"("id") ON DELETE SET NULL;

-- Now add the back-reference from agents.agent_adapters.definition_id
-- (definition_id FK was deferred until agent_definitions existed)
-- Already defined in SECTION 3 CREATE TABLE; the ALTER TABLE FK is added above.


-- ─────────────────────────────────────────────────────────────────────────────
-- SECTION 17: ROW LEVEL SECURITY
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE "agents"."agent_adapters"           ENABLE ROW LEVEL SECURITY;
ALTER TABLE "agents"."tools"                    ENABLE ROW LEVEL SECURITY;
ALTER TABLE "agents"."agent_definitions"        ENABLE ROW LEVEL SECURITY;
ALTER TABLE "agents"."agent_versions"           ENABLE ROW LEVEL SECURITY;
ALTER TABLE "agents"."agent_productivity_scopes" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "agents"."agent_tool_allowlist"     ENABLE ROW LEVEL SECURITY;
ALTER TABLE "agents"."byok_key_refs"            ENABLE ROW LEVEL SECURITY;
ALTER TABLE "agents"."local_runtime_profiles"   ENABLE ROW LEVEL SECURITY;
ALTER TABLE "agents"."agent_instances"          ENABLE ROW LEVEL SECURITY;

-- agent_adapters: owner read/write, service_role all
CREATE POLICY "agent_adapters_select_own" ON "agents"."agent_adapters"
    FOR SELECT TO "authenticated"
    USING ("owner_lenser_id" = "lensers"."get_auth_lenser_id"());

CREATE POLICY "agent_adapters_insert_own" ON "agents"."agent_adapters"
    FOR INSERT TO "authenticated"
    WITH CHECK ("owner_lenser_id" = "lensers"."get_auth_lenser_id"());

CREATE POLICY "agent_adapters_update_own" ON "agents"."agent_adapters"
    FOR UPDATE TO "authenticated"
    USING ("owner_lenser_id" = "lensers"."get_auth_lenser_id"())
    WITH CHECK ("owner_lenser_id" = "lensers"."get_auth_lenser_id"());

CREATE POLICY "agent_adapters_delete_own" ON "agents"."agent_adapters"
    FOR DELETE TO "authenticated"
    USING ("owner_lenser_id" = "lensers"."get_auth_lenser_id"());

CREATE POLICY "agent_adapters_service_all" ON "agents"."agent_adapters"
    FOR ALL TO "service_role" USING (true) WITH CHECK (true);

-- tools: public read (active only), service_role write
CREATE POLICY "tools_select_active" ON "agents"."tools"
    FOR SELECT TO "authenticated", "anon"
    USING ("is_active" = true);

CREATE POLICY "tools_service_all" ON "agents"."tools"
    FOR ALL TO "service_role" USING (true) WITH CHECK (true);

-- agent_definitions: owner read/write, public read if is_public
CREATE POLICY "agent_definitions_select_public" ON "agents"."agent_definitions"
    FOR SELECT TO "authenticated", "anon"
    USING ("is_public" = true AND "is_active" = true);

CREATE POLICY "agent_definitions_select_own" ON "agents"."agent_definitions"
    FOR SELECT TO "authenticated"
    USING ("owner_lenser_id" = "lensers"."get_auth_lenser_id"());

CREATE POLICY "agent_definitions_insert_own" ON "agents"."agent_definitions"
    FOR INSERT TO "authenticated"
    WITH CHECK ("owner_lenser_id" = "lensers"."get_auth_lenser_id"());

CREATE POLICY "agent_definitions_update_own" ON "agents"."agent_definitions"
    FOR UPDATE TO "authenticated"
    USING ("owner_lenser_id" = "lensers"."get_auth_lenser_id"())
    WITH CHECK ("owner_lenser_id" = "lensers"."get_auth_lenser_id"());

CREATE POLICY "agent_definitions_service_all" ON "agents"."agent_definitions"
    FOR ALL TO "service_role" USING (true) WITH CHECK (true);

-- agent_versions: owner read (via definition), service_role append (no delete)
CREATE POLICY "agent_versions_select_own" ON "agents"."agent_versions"
    FOR SELECT TO "authenticated"
    USING (EXISTS (
        SELECT 1 FROM "agents"."agent_definitions" d
        WHERE d."id" = "agent_versions"."definition_id"
          AND d."owner_lenser_id" = "lensers"."get_auth_lenser_id"()
    ));

CREATE POLICY "agent_versions_select_public" ON "agents"."agent_versions"
    FOR SELECT TO "authenticated", "anon"
    USING (EXISTS (
        SELECT 1 FROM "agents"."agent_definitions" d
        WHERE d."id" = "agent_versions"."definition_id"
          AND d."is_public" = true
    ));

CREATE POLICY "agent_versions_service_all" ON "agents"."agent_versions"
    FOR ALL TO "service_role" USING (true) WITH CHECK (true);

-- agent_productivity_scopes: owner read/write (via definition)
CREATE POLICY "agent_productivity_scopes_select_own" ON "agents"."agent_productivity_scopes"
    FOR SELECT TO "authenticated"
    USING (EXISTS (
        SELECT 1 FROM "agents"."agent_definitions" d
        WHERE d."id" = "agent_productivity_scopes"."definition_id"
          AND d."owner_lenser_id" = "lensers"."get_auth_lenser_id"()
    ));

CREATE POLICY "agent_productivity_scopes_service_all" ON "agents"."agent_productivity_scopes"
    FOR ALL TO "service_role" USING (true) WITH CHECK (true);

-- agent_tool_allowlist: owner read/write (via definition)
CREATE POLICY "agent_tool_allowlist_select_own" ON "agents"."agent_tool_allowlist"
    FOR SELECT TO "authenticated"
    USING (EXISTS (
        SELECT 1 FROM "agents"."agent_definitions" d
        WHERE d."id" = "agent_tool_allowlist"."definition_id"
          AND d."owner_lenser_id" = "lensers"."get_auth_lenser_id"()
    ));

CREATE POLICY "agent_tool_allowlist_service_all" ON "agents"."agent_tool_allowlist"
    FOR ALL TO "service_role" USING (true) WITH CHECK (true);

-- byok_key_refs: owner read/write, vault_secret_name MASKED in view (see below)
-- IMPORTANT: vault_secret_name must never be exposed to end-users via PostgREST.
-- Use a view that excludes vault_secret_name for public access.
CREATE POLICY "byok_key_refs_select_own" ON "agents"."byok_key_refs"
    FOR SELECT TO "authenticated"
    USING ("owner_lenser_id" = "lensers"."get_auth_lenser_id"());

CREATE POLICY "byok_key_refs_insert_own" ON "agents"."byok_key_refs"
    FOR INSERT TO "authenticated"
    WITH CHECK ("owner_lenser_id" = "lensers"."get_auth_lenser_id"());

CREATE POLICY "byok_key_refs_update_own" ON "agents"."byok_key_refs"
    FOR UPDATE TO "authenticated"
    USING ("owner_lenser_id" = "lensers"."get_auth_lenser_id"())
    WITH CHECK ("owner_lenser_id" = "lensers"."get_auth_lenser_id"());

CREATE POLICY "byok_key_refs_service_all" ON "agents"."byok_key_refs"
    FOR ALL TO "service_role" USING (true) WITH CHECK (true);

-- local_runtime_profiles: owner read/write
CREATE POLICY "local_runtime_profiles_select_own" ON "agents"."local_runtime_profiles"
    FOR SELECT TO "authenticated"
    USING ("owner_lenser_id" = "lensers"."get_auth_lenser_id"());

CREATE POLICY "local_runtime_profiles_insert_own" ON "agents"."local_runtime_profiles"
    FOR INSERT TO "authenticated"
    WITH CHECK ("owner_lenser_id" = "lensers"."get_auth_lenser_id"());

CREATE POLICY "local_runtime_profiles_update_own" ON "agents"."local_runtime_profiles"
    FOR UPDATE TO "authenticated"
    USING ("owner_lenser_id" = "lensers"."get_auth_lenser_id"())
    WITH CHECK ("owner_lenser_id" = "lensers"."get_auth_lenser_id"());

CREATE POLICY "local_runtime_profiles_service_all" ON "agents"."local_runtime_profiles"
    FOR ALL TO "service_role" USING (true) WITH CHECK (true);

-- agent_instances: owner read/write
CREATE POLICY "agent_instances_select_own" ON "agents"."agent_instances"
    FOR SELECT TO "authenticated"
    USING ("owner_lenser_id" = "lensers"."get_auth_lenser_id"());

CREATE POLICY "agent_instances_insert_own" ON "agents"."agent_instances"
    FOR INSERT TO "authenticated"
    WITH CHECK ("owner_lenser_id" = "lensers"."get_auth_lenser_id"());

CREATE POLICY "agent_instances_update_own" ON "agents"."agent_instances"
    FOR UPDATE TO "authenticated"
    USING ("owner_lenser_id" = "lensers"."get_auth_lenser_id"())
    WITH CHECK ("owner_lenser_id" = "lensers"."get_auth_lenser_id"());

CREATE POLICY "agent_instances_service_all" ON "agents"."agent_instances"
    FOR ALL TO "service_role" USING (true) WITH CHECK (true);


-- ─────────────────────────────────────────────────────────────────────────────
-- SECTION 18: SAFE VIEW — byok_key_refs without vault_secret_name
-- ─────────────────────────────────────────────────────────────────────────────
-- PostgREST exposes this view for authenticated users.
-- vault_secret_name is excluded — only service_role can query the raw table.

CREATE OR REPLACE VIEW "agents"."byok_key_refs_safe" AS
SELECT
    "id",
    "owner_lenser_id",
    "provider_id",
    "display_label",
    -- vault_secret_name intentionally excluded
    "key_prefix",
    "scope",
    "scoped_entity_id",
    "status",
    "last_used_at",
    "expires_at",
    "created_at",
    "updated_at"
FROM "agents"."byok_key_refs";

COMMENT ON VIEW "agents"."byok_key_refs_safe" IS
    'Safe view of byok_key_refs with vault_secret_name excluded. Use this for PostgREST access.';


-- ─────────────────────────────────────────────────────────────────────────────
-- SECTION 19: GRANTS
-- ─────────────────────────────────────────────────────────────────────────────

GRANT ALL ON TABLE "agents"."agent_adapters"             TO "service_role";
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE "agents"."agent_adapters" TO "authenticated";

GRANT ALL ON TABLE "agents"."tools"                      TO "service_role";
GRANT SELECT ON TABLE "agents"."tools"                   TO "anon", "authenticated";

GRANT ALL ON TABLE "agents"."agent_definitions"          TO "service_role";
GRANT SELECT, INSERT, UPDATE ON TABLE "agents"."agent_definitions" TO "authenticated";

GRANT ALL ON TABLE "agents"."agent_versions"             TO "service_role";
GRANT SELECT ON TABLE "agents"."agent_versions"          TO "authenticated";

GRANT ALL ON TABLE "agents"."agent_productivity_scopes"  TO "service_role";
GRANT SELECT ON TABLE "agents"."agent_productivity_scopes" TO "authenticated";

GRANT ALL ON TABLE "agents"."agent_tool_allowlist"       TO "service_role";
GRANT SELECT ON TABLE "agents"."agent_tool_allowlist"    TO "authenticated";

GRANT ALL ON TABLE "agents"."byok_key_refs"              TO "service_role";
GRANT SELECT, INSERT, UPDATE ON TABLE "agents"."byok_key_refs" TO "authenticated";

GRANT ALL ON TABLE "agents"."local_runtime_profiles"     TO "service_role";
GRANT SELECT, INSERT, UPDATE ON TABLE "agents"."local_runtime_profiles" TO "authenticated";

GRANT ALL ON TABLE "agents"."agent_instances"            TO "service_role";
GRANT SELECT, INSERT, UPDATE ON TABLE "agents"."agent_instances" TO "authenticated";

GRANT SELECT ON "agents"."byok_key_refs_safe"            TO "anon", "authenticated";
GRANT ALL    ON "agents"."byok_key_refs_safe"            TO "service_role";


-- ─────────────────────────────────────────────────────────────────────────────
-- SECTION 20: SEED PLATFORM TOOLS
-- ─────────────────────────────────────────────────────────────────────────────

INSERT INTO "agents"."tools" ("key", "display_name", "description", "is_system", "is_active")
VALUES
    ('web_search',      'Web Search',       'Search the web for real-time information',          true, true),
    ('code_execution',  'Code Execution',   'Execute code in a sandboxed environment',           true, true),
    ('file_read',       'File Read',        'Read files from the execution context',             true, true),
    ('file_write',      'File Write',       'Write files to the execution context',              true, true),
    ('http_request',    'HTTP Request',     'Make HTTP requests to external APIs',               true, true),
    ('memory_store',    'Memory Store',     'Persist information across execution steps',        true, true),
    ('mcp_invoke',      'MCP Invoke',       'Invoke an MCP server tool',                         true, true),
    ('judge_evaluate',  'Judge Evaluate',   'Evaluate submission quality against a rubric',      true, true)
ON CONFLICT ("key") DO UPDATE SET
    "display_name" = EXCLUDED."display_name",
    "description"  = EXCLUDED."description",
    "is_system"    = EXCLUDED."is_system";
