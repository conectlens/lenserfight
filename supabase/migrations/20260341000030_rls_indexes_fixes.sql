-- =============================================================================
-- MIGRATION 30: RLS, INDEXES, AND RELATIONSHIP FIXES
-- =============================================================================
-- Final wiring pass after agents and audit schemas are in place:
--
-- 1. execution.requests — add byok_key_ref_id FK → agents.byok_key_refs
--    (ties BYOK funding to the execution request that used it)
-- 2. actors.actors — add agent_instance_id FK → agents.agent_instances
--    (completes the actor ↔ agent instance bidirectional link)
-- 3. actors.actors — relax agents_agent_requires_ref constraint to allow
--    agent_instance_id as a valid reference
-- 4. Additional performance indexes for new schemas
-- 5. PostgREST schema exposure for agents (via config.toml would be preferred,
--    but we add GRANT/USAGE here for runtime access)
-- 6. Expose audit.events and audit.security_events safely (own-events only)
-- =============================================================================


-- ─────────────────────────────────────────────────────────────────────────────
-- SECTION 1: execution.requests — add byok_key_ref_id
-- ─────────────────────────────────────────────────────────────────────────────
-- When funding_source = 'user_byok_cloud', this column points to the BYOK key used.
-- NULL = platform credit or local BYOK (key never in cloud DB for local mode).

ALTER TABLE "execution"."requests"
    ADD COLUMN IF NOT EXISTS "byok_key_ref_id" "uuid";

ALTER TABLE "execution"."requests"
    ADD CONSTRAINT "requests_byok_key_ref_fkey"
    FOREIGN KEY ("byok_key_ref_id")
    REFERENCES "agents"."byok_key_refs"("id") ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS "idx_exec_requests_byok_key" ON "execution"."requests" ("byok_key_ref_id")
    WHERE "byok_key_ref_id" IS NOT NULL;

COMMENT ON COLUMN "execution"."requests"."byok_key_ref_id" IS
    'FK to agents.byok_key_refs when funding_source=user_byok_cloud. '
    'NULL for platform_credit, user_byok_local (key never reaches cloud DB), or sponsored.';


-- ─────────────────────────────────────────────────────────────────────────────
-- SECTION 2: actors.actors — add agent_instance_id
-- ─────────────────────────────────────────────────────────────────────────────
-- Completes the actor ↔ agent_instance bidirectional link.
-- actors.actors.agent_instance_id → agents.agent_instances.id (actor knows its instance)
-- agents.agent_instances.actor_id → actors.actors.id (instance knows its actor)

ALTER TABLE "actors"."actors"
    ADD COLUMN IF NOT EXISTS "agent_instance_id" "uuid";

ALTER TABLE "actors"."actors"
    ADD CONSTRAINT "actors_agent_instance_id_fkey"
    FOREIGN KEY ("agent_instance_id")
    REFERENCES "agents"."agent_instances"("id") ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS "idx_actors_agent_instance" ON "actors"."actors" ("agent_instance_id")
    WHERE "agent_instance_id" IS NOT NULL;

COMMENT ON COLUMN "actors"."actors"."agent_instance_id" IS
    'FK to agents.agent_instances when actor_type=agent and backed by a deployed instance. '
    'Allows actors to find their BYOK config and runtime profile.';


-- ─────────────────────────────────────────────────────────────────────────────
-- SECTION 3: actors.actors — update agent constraint to allow agent_instance_id
-- ─────────────────────────────────────────────────────────────────────────────
-- Old constraint: agent actors must have ai_model_id OR agent_adapter_id
-- New constraint: agent actors must have ai_model_id OR agent_adapter_id OR agent_instance_id

ALTER TABLE "actors"."actors"
    DROP CONSTRAINT IF EXISTS "actors_agent_requires_ref";

ALTER TABLE "actors"."actors"
    ADD CONSTRAINT "actors_agent_requires_ref" CHECK (
        "actor_type" <> 'agent'
        OR (
            "ai_model_id"       IS NOT NULL
            OR "agent_adapter_id"   IS NOT NULL
            OR "agent_instance_id"  IS NOT NULL
        )
    );

COMMENT ON CONSTRAINT "actors_agent_requires_ref" ON "actors"."actors" IS
    'Agent actors must be backed by an ai_model, agent_adapter, or agent_instance.';


-- ─────────────────────────────────────────────────────────────────────────────
-- SECTION 4: PERFORMANCE INDEXES — agents schema
-- ─────────────────────────────────────────────────────────────────────────────

-- byok_key_refs: look up active keys for a provider
CREATE INDEX IF NOT EXISTS "idx_byok_key_refs_provider_active"
    ON "agents"."byok_key_refs" ("provider_id", "owner_lenser_id")
    WHERE "status" = 'active';

-- agent_instances: find active instances for an owner
CREATE INDEX IF NOT EXISTS "idx_agent_instances_owner_active"
    ON "agents"."agent_instances" ("owner_lenser_id")
    WHERE "is_active" = true;

-- agent_instances: find instances by byok_key
CREATE INDEX IF NOT EXISTS "idx_agent_instances_byok_key"
    ON "agents"."agent_instances" ("byok_key_ref_id")
    WHERE "byok_key_ref_id" IS NOT NULL;

-- agent_definitions: text search readiness on slug
CREATE INDEX IF NOT EXISTS "idx_agent_definitions_slug_trgm"
    ON "agents"."agent_definitions" USING gin (("slug") gin_trgm_ops)
    WHERE "is_active" = true;

-- agent_adapters: adapter_type lookup
CREATE INDEX IF NOT EXISTS "idx_agents_adapters_type"
    ON "agents"."agent_adapters" ("adapter_type", "is_active");


-- ─────────────────────────────────────────────────────────────────────────────
-- SECTION 5: PERFORMANCE INDEXES — execution schema additions
-- ─────────────────────────────────────────────────────────────────────────────

-- execution.requests: covering index for requester + origin_type + timestamp
CREATE INDEX IF NOT EXISTS "idx_exec_requests_requester_origin"
    ON "execution"."requests" ("requester_lenser_id", "origin_type", "created_at" DESC);

-- execution.runs: request_id + status for polling
CREATE INDEX IF NOT EXISTS "idx_exec_runs_request_status"
    ON "execution"."runs" ("request_id", "status");


-- ─────────────────────────────────────────────────────────────────────────────
-- SECTION 6: PERFORMANCE INDEXES — audit schema
-- ─────────────────────────────────────────────────────────────────────────────

-- audit.events: recent events per entity (dispute resolution lookups)
CREATE INDEX IF NOT EXISTS "idx_audit_events_entity_time"
    ON "audit"."events" ("entity_id", "occurred_at" DESC)
    WHERE "entity_id" IS NOT NULL;


-- ─────────────────────────────────────────────────────────────────────────────
-- SECTION 7: PostgREST SCHEMA EXPOSURE
-- ─────────────────────────────────────────────────────────────────────────────
-- Note: supabase/config.toml controls which schemas PostgREST exposes via
-- `exposed_schemas`. Adding GRANT USAGE here ensures runtime access works
-- even before config.toml is updated.
--
-- Schemas to add to config.toml → db.settings.pgrst.db-schemas:
--   agents (via byok_key_refs_safe view — NOT raw byok_key_refs)
--   audit  (audit.events, audit.security_events — own-events only via RLS)

-- agents schema: grant usage for PostgREST
GRANT USAGE ON SCHEMA "agents" TO "anon", "authenticated";

-- Grant select on the safe BYOK view (vault_secret_name excluded)
GRANT SELECT ON "agents"."byok_key_refs_safe" TO "anon", "authenticated";

-- audit schema: grant usage for PostgREST (own-events via RLS)
GRANT USAGE ON SCHEMA "audit" TO "authenticated";

-- These SELECT grants are complementary to the RLS policies in migration 28.
-- RLS is the enforcement; GRANT is the access prerequisite.
GRANT SELECT ON "audit"."events"    TO "authenticated";
GRANT SELECT ON "audit"."security_events"   TO "authenticated";


-- ─────────────────────────────────────────────────────────────────────────────
-- SECTION 8: ACTORS SCHEMA — anon read grant for public actors
-- ─────────────────────────────────────────────────────────────────────────────
-- Public actors (visibility=public, status=active) should be readable by anon
-- for battle display pages. Existing RLS policy covers authenticated; add anon.

CREATE POLICY "actors_select_public_anon" ON "actors"."actors"
    FOR SELECT TO "anon"
    USING ("status" = 'active' AND "visibility" = 'public');


-- ─────────────────────────────────────────────────────────────────────────────
-- SECTION 9: ai schema — update actors constraint check for ANON
-- ─────────────────────────────────────────────────────────────────────────────
-- Add anon SELECT grant for ai.models (needed for battle display without auth)

CREATE POLICY "ai_models_select_public_anon" ON "ai"."models"
    FOR SELECT TO "anon"
    USING ("is_public" = true);

GRANT SELECT ON TABLE "ai"."models" TO "anon";
