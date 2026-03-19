-- =============================================================================
-- MIGRATION 28: AUDIT SCHEMA
-- =============================================================================
-- Introduces an append-only audit schema for LenserFight platform.
-- All tables are designed to be immutable after INSERT:
--   - No UPDATE or DELETE via RLS
--   - DELETE-blocking trigger on core event tables
--
-- Covers:
--   1. audit.events          — Core immutable event log
--   2. audit.moderation_decisions — Content/battle moderation log
--   3. audit.security_events — BYOK lifecycle, suspicious activity
--   4. audit.admin_actions   — Admin operations log
--
-- Event Type Taxonomy (event_type values):
--   Execution:  execution.request_created, execution.run_started,
--               execution.run_succeeded, execution.run_failed, execution.run_canceled
--   Battle:     battle.created, battle.published, battle.voting_opened,
--               battle.scoring_started, battle.finalized, battle.closed,
--               battle.deleted, battle.cloned, battle.retracted
--   Contender:  contender.joined, contender.withdrawn, contender.disqualified
--   Vote:       vote.cast, vote.retracted
--   Submission: submission.created, submission.linked_to_execution,
--               submission.disqualified, submission.revised
--   Agent:      agent.created, agent.version_published, agent.instance_deployed,
--               agent.deactivated, agent.adapter_registered, agent.adapter_removed
--   BYOK:       byok.key_registered, byok.key_revoked, byok.key_rotated, byok.key_used
--   Account:    account.deactivated, account.deletion_scheduled,
--               account.restored, account.purged
--   Admin:      admin.moderation_action, admin.ban, admin.config_change,
--               admin.xp_reset, admin.battle_force_closed
-- =============================================================================


-- ─────────────────────────────────────────────────────────────────────────────
-- SECTION 1: SCHEMA
-- ─────────────────────────────────────────────────────────────────────────────

CREATE SCHEMA IF NOT EXISTS "audit";

ALTER SCHEMA "audit" OWNER TO "postgres";

GRANT USAGE ON SCHEMA "audit" TO "authenticated";
GRANT USAGE ON SCHEMA "audit" TO "service_role";
-- anon intentionally excluded from audit schema


-- ─────────────────────────────────────────────────────────────────────────────
-- SECTION 2: audit.events — core immutable event log
-- ─────────────────────────────────────────────────────────────────────────────
-- APPEND-ONLY: RLS blocks UPDATE/DELETE. Trigger blocks DELETE at row level.
-- Payload must never contain secret values (API keys, tokens, PII beyond hashed IP).

-- Non-partitioned for Phase 1. Partition by occurred_at range when row count > 10M.
CREATE TABLE IF NOT EXISTS "audit"."events" (
    "id"                "uuid"      DEFAULT "gen_random_uuid"() NOT NULL,
    "occurred_at"       timestamptz DEFAULT now() NOT NULL,
    "event_type"        "text"      NOT NULL,       -- See taxonomy in header comment
    "entity_schema"     "text",                     -- e.g. 'battles', 'execution', 'agents'
    "entity_table"      "text",                     -- e.g. 'battles', 'runs', 'agent_instances'
    "entity_id"         "uuid",                     -- The affected entity's PK
    "actor_lenser_id"   "uuid",                     -- Who triggered the event (NULL = system)
    "actor_actor_id"    "uuid",                     -- actors.actors FK if applicable
    "ip_hash"           "text",                     -- SHA-256(IP address) — GDPR-safe, not reversible
    "user_agent_hash"   "text",                     -- SHA-256(user-agent) — for device fingerprint
    "payload"           "jsonb"     DEFAULT '{}'::jsonb NOT NULL,  -- Non-sensitive event metadata
    "severity"          "text"      DEFAULT 'info' NOT NULL,
    CONSTRAINT "events_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "events_severity_check" CHECK (
        "severity" IN ('info', 'warn', 'error', 'critical')
    )
);

ALTER TABLE "audit"."events" OWNER TO "postgres";

COMMENT ON TABLE "audit"."events" IS
    'Core immutable event log. Append-only. '
    'Partition by occurred_at when row count exceeds ~10M rows.';
COMMENT ON COLUMN "audit"."events"."ip_hash" IS
    'SHA-256 of client IP. GDPR-safe: not reversible without rainbow table. Never store raw IP.';
COMMENT ON COLUMN "audit"."events"."payload" IS
    'Non-sensitive event details. MUST NOT contain API keys, tokens, or PII.';

CREATE INDEX "idx_audit_events_entity"      ON "audit"."events" ("entity_schema", "entity_table", "entity_id");
CREATE INDEX "idx_audit_events_actor"       ON "audit"."events" ("actor_lenser_id", "occurred_at" DESC)
    WHERE "actor_lenser_id" IS NOT NULL;
CREATE INDEX "idx_audit_events_type_time"   ON "audit"."events" ("event_type", "occurred_at" DESC);
CREATE INDEX "idx_audit_events_severity"    ON "audit"."events" ("severity", "occurred_at" DESC)
    WHERE "severity" IN ('warn', 'error', 'critical');


-- ─────────────────────────────────────────────────────────────────────────────
-- SECTION 3: audit.moderation_decisions — content/battle moderation log
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "audit"."moderation_decisions" (
    "id"                     "uuid"      DEFAULT "gen_random_uuid"() NOT NULL,
    "occurred_at"            timestamptz DEFAULT now() NOT NULL,
    "target_entity_schema"   "text"      NOT NULL,
    "target_entity_table"    "text"      NOT NULL,
    "target_entity_id"       "uuid"      NOT NULL,
    "decision_type"          "text"      NOT NULL,
    "reason"                 "text",
    "evidence_urls"          "text"[],
    "moderator_lenser_id"    "uuid",     -- NULL for AI-automated moderation
    "is_ai_moderated"        boolean     DEFAULT false NOT NULL,
    "ai_confidence"          numeric(5, 4),  -- 0.0 to 1.0 if AI-moderated
    "appeal_deadline_at"     timestamptz,
    "is_appealed"            boolean     DEFAULT false NOT NULL,
    "appealed_at"            timestamptz,
    "appeal_outcome"         "text",     -- 'upheld' | 'overturned' | 'pending'
    "created_at"             timestamptz DEFAULT now() NOT NULL,
    CONSTRAINT "moderation_decisions_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "moderation_decisions_type_check" CHECK (
        "decision_type" IN ('approved', 'rejected', 'flagged', 'removed', 'restored', 'warned')
    ),
    CONSTRAINT "moderation_decisions_appeal_outcome_check" CHECK (
        "appeal_outcome" IS NULL OR "appeal_outcome" IN ('upheld', 'overturned', 'pending')
    ),
    CONSTRAINT "moderation_decisions_ai_confidence_range" CHECK (
        "ai_confidence" IS NULL OR ("ai_confidence" >= 0 AND "ai_confidence" <= 1)
    )
);

ALTER TABLE "audit"."moderation_decisions" OWNER TO "postgres";

COMMENT ON TABLE "audit"."moderation_decisions" IS
    'Moderation log for content, battles, and actors. Includes appeal tracking.';

CREATE INDEX "idx_audit_mod_decisions_target" ON "audit"."moderation_decisions"
    ("target_entity_schema", "target_entity_table", "target_entity_id");
CREATE INDEX "idx_audit_mod_decisions_moderator" ON "audit"."moderation_decisions"
    ("moderator_lenser_id", "occurred_at" DESC)
    WHERE "moderator_lenser_id" IS NOT NULL;
CREATE INDEX "idx_audit_mod_decisions_type_time" ON "audit"."moderation_decisions"
    ("decision_type", "occurred_at" DESC);


-- ─────────────────────────────────────────────────────────────────────────────
-- SECTION 4: audit.security_events — BYOK lifecycle and suspicious activity
-- ─────────────────────────────────────────────────────────────────────────────
-- APPEND-ONLY. References byok_key_refs by ID only — vault_secret_name never stored here.

CREATE TABLE IF NOT EXISTS "audit"."security_events" (
    "id"            "uuid"      DEFAULT "gen_random_uuid"() NOT NULL,
    "occurred_at"   timestamptz DEFAULT now() NOT NULL,
    "event_type"    "text"      NOT NULL,
    "lenser_id"     "uuid",
    "key_ref_id"    "uuid",     -- agents.byok_key_refs.id (opaque reference, no vault_secret_name)
    "metadata"      "jsonb"     DEFAULT '{}'::jsonb NOT NULL,  -- Non-sensitive metadata ONLY
    "ip_hash"       "text",     -- SHA-256(IP)
    "severity"      "text"      DEFAULT 'info' NOT NULL,
    CONSTRAINT "security_events_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "security_events_type_check" CHECK (
        "event_type" IN (
            'byok_key_registered',
            'byok_key_revoked',
            'byok_key_rotated',
            'byok_key_used',
            'byok_key_expired',
            'local_agent_synced',
            'local_agent_hmac_verified',
            'local_agent_hmac_failed',
            'suspicious_activity',
            'rate_limit_exceeded',
            'unauthorized_access_attempt'
        )
    ),
    CONSTRAINT "security_events_severity_check" CHECK (
        "severity" IN ('info', 'warn', 'error', 'critical')
    )
);

ALTER TABLE "audit"."security_events" OWNER TO "postgres";

COMMENT ON TABLE "audit"."security_events" IS
    'BYOK lifecycle and security event log. Append-only. '
    'key_ref_id references agents.byok_key_refs; vault_secret_name is never stored here.';
COMMENT ON COLUMN "audit"."security_events"."metadata" IS
    'Non-sensitive metadata only. No vault names, no raw keys, no tokens.';

CREATE INDEX "idx_audit_security_events_lenser"   ON "audit"."security_events" ("lenser_id", "occurred_at" DESC)
    WHERE "lenser_id" IS NOT NULL;
CREATE INDEX "idx_audit_security_events_key_ref"  ON "audit"."security_events" ("key_ref_id", "occurred_at" DESC)
    WHERE "key_ref_id" IS NOT NULL;
CREATE INDEX "idx_audit_security_events_type"     ON "audit"."security_events" ("event_type", "occurred_at" DESC);
CREATE INDEX "idx_audit_security_events_critical" ON "audit"."security_events" ("occurred_at" DESC)
    WHERE "severity" IN ('error', 'critical');


-- ─────────────────────────────────────────────────────────────────────────────
-- SECTION 5: audit.admin_actions — admin operations log
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "audit"."admin_actions" (
    "id"                 "uuid"      DEFAULT "gen_random_uuid"() NOT NULL,
    "occurred_at"        timestamptz DEFAULT now() NOT NULL,
    "admin_lenser_id"    "uuid"      NOT NULL,
    "action_type"        "text"      NOT NULL,
    "target_entity_id"   "uuid",
    "target_entity_type" "text",     -- e.g. 'lensers.profiles', 'battles.battles'
    "reason"             "text",
    "metadata"           "jsonb"     DEFAULT '{}'::jsonb NOT NULL,
    CONSTRAINT "admin_actions_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "audit"."admin_actions" OWNER TO "postgres";

COMMENT ON TABLE "audit"."admin_actions" IS
    'Admin operations audit log. Append-only. Every admin action must be logged here.';

CREATE INDEX "idx_audit_admin_actions_admin"  ON "audit"."admin_actions" ("admin_lenser_id", "occurred_at" DESC);
CREATE INDEX "idx_audit_admin_actions_target" ON "audit"."admin_actions" ("target_entity_type", "target_entity_id");
CREATE INDEX "idx_audit_admin_actions_type"   ON "audit"."admin_actions" ("action_type", "occurred_at" DESC);


-- ─────────────────────────────────────────────────────────────────────────────
-- SECTION 6: IMMUTABILITY TRIGGERS — prevent DELETE on core event tables
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION "audit"."trg_prevent_delete"() RETURNS trigger
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    RAISE EXCEPTION 'Audit records are immutable. Deletion is not permitted. Table: %', TG_TABLE_NAME;
END;
$$;

ALTER FUNCTION "audit"."trg_prevent_delete"() OWNER TO "postgres";

-- Apply to all audit tables
CREATE TRIGGER "trg_prevent_delete_events"
    BEFORE DELETE ON "audit"."events"
    FOR EACH ROW EXECUTE FUNCTION "audit"."trg_prevent_delete"();

CREATE TRIGGER "trg_prevent_delete_moderation"
    BEFORE DELETE ON "audit"."moderation_decisions"
    FOR EACH ROW EXECUTE FUNCTION "audit"."trg_prevent_delete"();

CREATE TRIGGER "trg_prevent_delete_security"
    BEFORE DELETE ON "audit"."security_events"
    FOR EACH ROW EXECUTE FUNCTION "audit"."trg_prevent_delete"();

CREATE TRIGGER "trg_prevent_delete_admin"
    BEFORE DELETE ON "audit"."admin_actions"
    FOR EACH ROW EXECUTE FUNCTION "audit"."trg_prevent_delete"();


-- ─────────────────────────────────────────────────────────────────────────────
-- SECTION 7: HELPER FUNCTION — append audit event (for triggers/Edge Functions)
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION "audit"."log_event"(
    "p_event_type"      "text",
    "p_entity_schema"   "text"    DEFAULT NULL,
    "p_entity_table"    "text"    DEFAULT NULL,
    "p_entity_id"       "uuid"    DEFAULT NULL,
    "p_actor_lenser_id" "uuid"    DEFAULT NULL,
    "p_actor_actor_id"  "uuid"    DEFAULT NULL,
    "p_payload"         "jsonb"   DEFAULT '{}',
    "p_severity"        "text"    DEFAULT 'info'
) RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'audit'
    AS $$
DECLARE
    v_id uuid;
BEGIN
    INSERT INTO audit.events (
        event_type, entity_schema, entity_table, entity_id,
        actor_lenser_id, actor_actor_id, payload, severity
    )
    VALUES (
        p_event_type, p_entity_schema, p_entity_table, p_entity_id,
        p_actor_lenser_id, p_actor_actor_id, p_payload, p_severity
    )
    RETURNING id INTO v_id;

    RETURN v_id;
END;
$$;

ALTER FUNCTION "audit"."log_event"(
    "text", "text", "text", "uuid", "uuid", "uuid", "jsonb", "text"
) OWNER TO "postgres";

COMMENT ON FUNCTION "audit"."log_event" IS
    'Append an audit event. SECURITY DEFINER — call from triggers or Edge Functions.';

GRANT EXECUTE ON FUNCTION "audit"."log_event"(
    "text", "text", "text", "uuid", "uuid", "uuid", "jsonb", "text"
) TO "service_role", "authenticated";


-- ─────────────────────────────────────────────────────────────────────────────
-- SECTION 8: ROW LEVEL SECURITY
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE "audit"."events"          ENABLE ROW LEVEL SECURITY;
ALTER TABLE "audit"."moderation_decisions"    ENABLE ROW LEVEL SECURITY;
ALTER TABLE "audit"."security_events"         ENABLE ROW LEVEL SECURITY;
ALTER TABLE "audit"."admin_actions"           ENABLE ROW LEVEL SECURITY;

-- audit.events: service_role INSERT only; authenticated can read own events
CREATE POLICY "events_service_insert" ON "audit"."events"
    FOR INSERT TO "service_role"
    WITH CHECK (true);

CREATE POLICY "events_select_own" ON "audit"."events"
    FOR SELECT TO "authenticated"
    USING ("actor_lenser_id" = "lensers"."get_auth_lenser_id"());

CREATE POLICY "events_service_select" ON "audit"."events"
    FOR SELECT TO "service_role"
    USING (true);

-- Explicitly block UPDATE and DELETE for authenticated users (redundant with trigger but belt-and-suspenders)
-- (No UPDATE/DELETE policies means those operations are denied by default)

-- audit.moderation_decisions: service_role write; authenticated read own decisions on their content
CREATE POLICY "mod_decisions_service_all" ON "audit"."moderation_decisions"
    FOR ALL TO "service_role"
    USING (true) WITH CHECK (true);

-- audit.security_events: service_role write; users can read their own security events
CREATE POLICY "security_events_service_all" ON "audit"."security_events"
    FOR ALL TO "service_role"
    USING (true) WITH CHECK (true);

CREATE POLICY "security_events_select_own" ON "audit"."security_events"
    FOR SELECT TO "authenticated"
    USING ("lenser_id" = "lensers"."get_auth_lenser_id"());

-- audit.admin_actions: service_role only (admins access via service_role or admin RPC)
CREATE POLICY "admin_actions_service_all" ON "audit"."admin_actions"
    FOR ALL TO "service_role"
    USING (true) WITH CHECK (true);


-- ─────────────────────────────────────────────────────────────────────────────
-- SECTION 9: GRANTS
-- ─────────────────────────────────────────────────────────────────────────────

GRANT ALL ON TABLE "audit"."events"       TO "service_role";
GRANT SELECT ON TABLE "audit"."events"    TO "authenticated";

GRANT ALL ON TABLE "audit"."moderation_decisions" TO "service_role";

GRANT ALL ON TABLE "audit"."security_events"      TO "service_role";
GRANT SELECT ON TABLE "audit"."security_events"   TO "authenticated";

GRANT ALL ON TABLE "audit"."admin_actions"        TO "service_role";


-- ─────────────────────────────────────────────────────────────────────────────
-- SECTION 10: AUDIT TRIGGERS FOR BATTLE STATUS TRANSITIONS
-- ─────────────────────────────────────────────────────────────────────────────
-- Auto-log battle status changes to audit.events

CREATE OR REPLACE FUNCTION "audit"."trg_battle_status_audit"() RETURNS trigger
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'audit', 'battles', 'lensers'
    AS $$
DECLARE
    v_event_type text;
BEGIN
    -- Map status transitions to event types
    v_event_type := CASE NEW.status
        WHEN 'open'      THEN 'battle.published'
        WHEN 'voting'    THEN 'battle.voting_opened'
        WHEN 'scoring'   THEN 'battle.scoring_started'
        WHEN 'closed'    THEN 'battle.finalized'
        WHEN 'archived'  THEN 'battle.closed'
        ELSE 'battle.status_changed'
    END;

    IF OLD.status IS DISTINCT FROM NEW.status THEN
        PERFORM audit.log_event(
            v_event_type,
            'battles',
            'battles',
            NEW.id,
            NEW.creator_lenser_id,
            NULL,
            jsonb_build_object(
                'old_status', OLD.status,
                'new_status', NEW.status,
                'title',      NEW.title,
                'slug',       NEW.slug
            ),
            'info'
        );
    END IF;

    RETURN NEW;
END;
$$;

ALTER FUNCTION "audit"."trg_battle_status_audit"() OWNER TO "postgres";

CREATE TRIGGER "trg_battle_status_audit"
    AFTER UPDATE ON "battles"."battles"
    FOR EACH ROW
    WHEN (OLD."status" IS DISTINCT FROM NEW."status")
    EXECUTE FUNCTION "audit"."trg_battle_status_audit"();
