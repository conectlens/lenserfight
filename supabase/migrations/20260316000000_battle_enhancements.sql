-- =============================================================================
-- Battle Enhancements Migration
-- Adds: templates, agent_adapters, events, invitations, new RPCs,
--       analytics views, security fixes, and indexes.
-- All changes are additive. No destructive ALTER or DROP on existing objects.
-- =============================================================================


-- ============================================================
-- 1. ENUM EXTENSIONS
-- ============================================================

-- Add 'battle' to content.entity_type_enum for battle tagging support
ALTER TYPE "content"."entity_type_enum" ADD VALUE IF NOT EXISTS 'battle';


-- ============================================================
-- 2. NEW TABLES
-- ============================================================

-- 2.1 Battle Templates — reusable battle configurations
CREATE TABLE IF NOT EXISTS "battles"."templates" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "creator_lenser_id" "uuid" NOT NULL,
    "title" "text" NOT NULL,
    "description" "text",
    "task_prompt" "text" NOT NULL,
    "rubric_id" "uuid",
    "max_contenders" integer DEFAULT 2 NOT NULL,
    "is_public" boolean DEFAULT false NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "deleted_at" timestamp with time zone,
    CONSTRAINT "templates_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "templates_max_contenders_check" CHECK (("max_contenders" >= 2)),
    CONSTRAINT "templates_creator_fk" FOREIGN KEY ("creator_lenser_id")
        REFERENCES "lensers"."profiles"("id") ON DELETE CASCADE,
    CONSTRAINT "templates_rubric_fk" FOREIGN KEY ("rubric_id")
        REFERENCES "battles"."rubrics"("id") ON DELETE SET NULL
);

ALTER TABLE "battles"."templates" OWNER TO "postgres";


-- 2.2 Agent Adapters — registered agent configurations
CREATE TABLE IF NOT EXISTS "battles"."agent_adapters" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "owner_lenser_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "adapter_type" "text" NOT NULL,
    "config" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "is_active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "agent_adapters_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "agent_adapters_type_check" CHECK (
        "adapter_type" IN ('openai-agents', 'langchain', 'crewai', 'mcp', 'ollama', 'http', 'custom')
    ),
    CONSTRAINT "agent_adapters_owner_fk" FOREIGN KEY ("owner_lenser_id")
        REFERENCES "lensers"."profiles"("id") ON DELETE CASCADE
);

ALTER TABLE "battles"."agent_adapters" OWNER TO "postgres";


-- 2.3 Battle Events — audit trail for state transitions
CREATE TABLE IF NOT EXISTS "battles"."events" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "battle_id" "uuid" NOT NULL,
    "event_type" "text" NOT NULL,
    "actor_id" "uuid",
    "metadata" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "events_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "events_type_check" CHECK (
        "event_type" IN (
            'status_change', 'contender_joined', 'submission_received',
            'vote_cast', 'finalized', 'published', 'archived',
            'invitation_sent', 'invitation_accepted', 'adapter_connected'
        )
    ),
    CONSTRAINT "events_battle_fk" FOREIGN KEY ("battle_id")
        REFERENCES "battles"."battles"("id") ON DELETE CASCADE,
    CONSTRAINT "events_actor_fk" FOREIGN KEY ("actor_id")
        REFERENCES "lensers"."profiles"("id") ON DELETE SET NULL
);

ALTER TABLE "battles"."events" OWNER TO "postgres";


-- 2.4 Battle Invitations — invitation tracking
CREATE TABLE IF NOT EXISTS "battles"."invitations" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "battle_id" "uuid" NOT NULL,
    "invited_by" "uuid" NOT NULL,
    "invited_email" "text",
    "invited_lenser_id" "uuid",
    "status" "text" DEFAULT 'pending' NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "responded_at" timestamp with time zone,
    CONSTRAINT "invitations_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "invitations_status_check" CHECK (
        "status" IN ('pending', 'accepted', 'declined', 'expired')
    ),
    CONSTRAINT "invitations_battle_fk" FOREIGN KEY ("battle_id")
        REFERENCES "battles"."battles"("id") ON DELETE CASCADE,
    CONSTRAINT "invitations_inviter_fk" FOREIGN KEY ("invited_by")
        REFERENCES "lensers"."profiles"("id") ON DELETE CASCADE,
    CONSTRAINT "invitations_invitee_fk" FOREIGN KEY ("invited_lenser_id")
        REFERENCES "lensers"."profiles"("id") ON DELETE SET NULL,
    CONSTRAINT "invitations_battle_lenser_unique" UNIQUE ("battle_id", "invited_lenser_id")
);

ALTER TABLE "battles"."invitations" OWNER TO "postgres";


-- ============================================================
-- 3. COLUMN ADDITIONS
-- ============================================================

-- Link contenders to registered agent adapters
ALTER TABLE "battles"."contenders"
    ADD COLUMN IF NOT EXISTS "agent_adapter_id" "uuid";

-- Add FK constraint (named to allow clean drops if needed)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'contenders_adapter_fk'
          AND table_schema = 'battles'
          AND table_name = 'contenders'
    ) THEN
        ALTER TABLE "battles"."contenders"
            ADD CONSTRAINT "contenders_adapter_fk"
            FOREIGN KEY ("agent_adapter_id")
            REFERENCES "battles"."agent_adapters"("id") ON DELETE SET NULL;
    END IF;
END $$;


-- ============================================================
-- 4. INDEXES
-- ============================================================

-- Existing table: composite index for common query pattern
CREATE INDEX IF NOT EXISTS "idx_battles_status_created"
    ON "battles"."battles" ("status", "created_at" DESC);

-- New tables
CREATE INDEX IF NOT EXISTS "idx_events_battle_id"
    ON "battles"."events" ("battle_id");

CREATE INDEX IF NOT EXISTS "idx_events_created_at"
    ON "battles"."events" ("created_at");

CREATE INDEX IF NOT EXISTS "idx_invitations_battle_id"
    ON "battles"."invitations" ("battle_id");

CREATE INDEX IF NOT EXISTS "idx_invitations_invited_lenser"
    ON "battles"."invitations" ("invited_lenser_id")
    WHERE "invited_lenser_id" IS NOT NULL;

CREATE INDEX IF NOT EXISTS "idx_agent_adapters_owner"
    ON "battles"."agent_adapters" ("owner_lenser_id");

CREATE INDEX IF NOT EXISTS "idx_templates_creator"
    ON "battles"."templates" ("creator_lenser_id");

CREATE INDEX IF NOT EXISTS "idx_templates_public"
    ON "battles"."templates" ("is_public")
    WHERE "is_public" = true AND "deleted_at" IS NULL;

CREATE INDEX IF NOT EXISTS "idx_contenders_adapter"
    ON "battles"."contenders" ("agent_adapter_id")
    WHERE "agent_adapter_id" IS NOT NULL;


-- ============================================================
-- 5. ENABLE RLS
-- ============================================================

ALTER TABLE "battles"."templates" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "battles"."agent_adapters" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "battles"."events" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "battles"."invitations" ENABLE ROW LEVEL SECURITY;


-- ============================================================
-- 6. RLS POLICIES
-- ============================================================

-- 6.1 Templates
CREATE POLICY "Public templates are viewable by everyone"
    ON "battles"."templates" FOR SELECT
    USING (("is_public" = true) AND ("deleted_at" IS NULL));

CREATE POLICY "Authors can see own templates"
    ON "battles"."templates" FOR SELECT TO "authenticated"
    USING (("creator_lenser_id" = "lensers"."get_auth_lenser_id"()));

CREATE POLICY "Authenticated users can create templates"
    ON "battles"."templates" FOR INSERT TO "authenticated"
    WITH CHECK (("creator_lenser_id" = "lensers"."get_auth_lenser_id"()));

CREATE POLICY "Authors can update own templates"
    ON "battles"."templates" FOR UPDATE TO "authenticated"
    USING (("creator_lenser_id" = "lensers"."get_auth_lenser_id"()))
    WITH CHECK (("creator_lenser_id" = "lensers"."get_auth_lenser_id"()));

CREATE POLICY "Authors can delete own templates"
    ON "battles"."templates" FOR DELETE TO "authenticated"
    USING (("creator_lenser_id" = "lensers"."get_auth_lenser_id"()));


-- 6.2 Agent Adapters
CREATE POLICY "Owners can see own adapters"
    ON "battles"."agent_adapters" FOR SELECT TO "authenticated"
    USING (("owner_lenser_id" = "lensers"."get_auth_lenser_id"()));

CREATE POLICY "Active adapters are viewable by authenticated"
    ON "battles"."agent_adapters" FOR SELECT TO "authenticated"
    USING (("is_active" = true));

CREATE POLICY "Authenticated users can create adapters"
    ON "battles"."agent_adapters" FOR INSERT TO "authenticated"
    WITH CHECK (("owner_lenser_id" = "lensers"."get_auth_lenser_id"()));

CREATE POLICY "Owners can update own adapters"
    ON "battles"."agent_adapters" FOR UPDATE TO "authenticated"
    USING (("owner_lenser_id" = "lensers"."get_auth_lenser_id"()))
    WITH CHECK (("owner_lenser_id" = "lensers"."get_auth_lenser_id"()));

CREATE POLICY "Owners can delete own adapters"
    ON "battles"."agent_adapters" FOR DELETE TO "authenticated"
    USING (("owner_lenser_id" = "lensers"."get_auth_lenser_id"()));


-- 6.3 Events (read-only for battle creators and admins; inserts via triggers/RPCs)
CREATE POLICY "Battle creators can see battle events"
    ON "battles"."events" FOR SELECT TO "authenticated"
    USING ((EXISTS (
        SELECT 1 FROM "battles"."battles" "b"
        WHERE "b"."id" = "events"."battle_id"
          AND "b"."creator_lenser_id" = "lensers"."get_auth_lenser_id"()
    )));

CREATE POLICY "Service role has full access to events"
    ON "battles"."events"
    USING (("auth"."role"() = 'service_role'::"text"))
    WITH CHECK (("auth"."role"() = 'service_role'::"text"));


-- 6.4 Invitations
CREATE POLICY "Inviters can see own invitations"
    ON "battles"."invitations" FOR SELECT TO "authenticated"
    USING (("invited_by" = "lensers"."get_auth_lenser_id"()));

CREATE POLICY "Invitees can see invitations sent to them"
    ON "battles"."invitations" FOR SELECT TO "authenticated"
    USING (("invited_lenser_id" = "lensers"."get_auth_lenser_id"()));

CREATE POLICY "Battle creators can insert invitations"
    ON "battles"."invitations" FOR INSERT TO "authenticated"
    WITH CHECK ((
        "invited_by" = "lensers"."get_auth_lenser_id"()
        AND EXISTS (
            SELECT 1 FROM "battles"."battles" "b"
            WHERE "b"."id" = "invitations"."battle_id"
              AND "b"."creator_lenser_id" = "lensers"."get_auth_lenser_id"()
              AND "b"."status" IN ('draft', 'open')
        )
    ));

CREATE POLICY "Invitees can update invitation status"
    ON "battles"."invitations" FOR UPDATE TO "authenticated"
    USING (("invited_lenser_id" = "lensers"."get_auth_lenser_id"()))
    WITH CHECK (("invited_lenser_id" = "lensers"."get_auth_lenser_id"()));


-- ============================================================
-- 7. TRIGGER FUNCTIONS & TRIGGERS
-- ============================================================

-- 7.1 Log battle status changes to events table
CREATE OR REPLACE FUNCTION "battles"."log_battle_status_event"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'battles'
    AS $$
BEGIN
    IF OLD.status IS DISTINCT FROM NEW.status THEN
        INSERT INTO battles.events (battle_id, event_type, actor_id, metadata)
        VALUES (
            NEW.id,
            'status_change',
            NEW.creator_lenser_id,
            jsonb_build_object(
                'from', OLD.status::text,
                'to', NEW.status::text
            )
        );
    END IF;
    RETURN NEW;
END;
$$;

ALTER FUNCTION "battles"."log_battle_status_event"() OWNER TO "postgres";

CREATE OR REPLACE TRIGGER "trg_battle_status_event"
    AFTER UPDATE ON "battles"."battles"
    FOR EACH ROW
    EXECUTE FUNCTION "battles"."log_battle_status_event"();


-- 7.2 Auto-update timestamps on templates
CREATE OR REPLACE TRIGGER "trg_templates_updated_at"
    BEFORE UPDATE ON "battles"."templates"
    FOR EACH ROW
    EXECUTE FUNCTION "battles"."set_updated_at"();


-- 7.3 Auto-update timestamps on agent_adapters
CREATE OR REPLACE TRIGGER "trg_agent_adapters_updated_at"
    BEFORE UPDATE ON "battles"."agent_adapters"
    FOR EACH ROW
    EXECUTE FUNCTION "battles"."set_updated_at"();


-- ============================================================
-- 8. NEW RPC FUNCTIONS
-- ============================================================

-- 8.1 Publish a battle (closed -> published)
CREATE OR REPLACE FUNCTION "public"."fn_battles_publish"("p_battle_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'battles', 'lensers'
    AS $$
DECLARE
    v_battle RECORD;
    v_lenser_id uuid;
BEGIN
    v_lenser_id := lensers.get_auth_lenser_id();

    SELECT * INTO v_battle
    FROM battles.battles WHERE id = p_battle_id;

    IF v_battle IS NULL THEN
        RAISE EXCEPTION 'Battle not found';
    END IF;

    IF v_battle.creator_lenser_id != v_lenser_id THEN
        RAISE EXCEPTION 'Only the battle creator can publish';
    END IF;

    IF v_battle.status != 'closed' THEN
        RAISE EXCEPTION 'Battle must be in closed status to publish (current: %)', v_battle.status;
    END IF;

    UPDATE battles.battles
    SET status = 'published',
        published_at = now(),
        updated_at = now()
    WHERE id = p_battle_id;
END;
$$;

ALTER FUNCTION "public"."fn_battles_publish"("p_battle_id" "uuid") OWNER TO "postgres";


-- 8.2 Archive a battle (closed or published -> archived)
CREATE OR REPLACE FUNCTION "public"."fn_battles_archive"("p_battle_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'battles', 'lensers'
    AS $$
DECLARE
    v_battle RECORD;
    v_lenser_id uuid;
BEGIN
    v_lenser_id := lensers.get_auth_lenser_id();

    SELECT * INTO v_battle
    FROM battles.battles WHERE id = p_battle_id;

    IF v_battle IS NULL THEN
        RAISE EXCEPTION 'Battle not found';
    END IF;

    IF v_battle.creator_lenser_id != v_lenser_id THEN
        RAISE EXCEPTION 'Only the battle creator can archive';
    END IF;

    IF v_battle.status NOT IN ('closed', 'published') THEN
        RAISE EXCEPTION 'Battle must be closed or published to archive (current: %)', v_battle.status;
    END IF;

    UPDATE battles.battles
    SET status = 'archived',
        updated_at = now()
    WHERE id = p_battle_id;
END;
$$;

ALTER FUNCTION "public"."fn_battles_archive"("p_battle_id" "uuid") OWNER TO "postgres";


-- 8.3 Create a battle from a template
CREATE OR REPLACE FUNCTION "public"."fn_battles_create_from_template"(
    "p_template_id" "uuid",
    "p_title" "text",
    "p_slug" "text"
) RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'battles', 'lensers'
    AS $$
DECLARE
    v_template RECORD;
    v_lenser_id uuid;
    v_battle_id uuid;
BEGIN
    v_lenser_id := lensers.get_auth_lenser_id();

    SELECT * INTO v_template
    FROM battles.templates
    WHERE id = p_template_id
      AND deleted_at IS NULL
      AND (is_public = true OR creator_lenser_id = v_lenser_id);

    IF v_template IS NULL THEN
        RAISE EXCEPTION 'Template not found or not accessible';
    END IF;

    INSERT INTO battles.battles (
        creator_lenser_id, title, slug, task_prompt, rubric_id,
        status, max_contenders
    )
    VALUES (
        v_lenser_id, p_title, p_slug, v_template.task_prompt,
        v_template.rubric_id, 'draft', v_template.max_contenders
    )
    RETURNING id INTO v_battle_id;

    RETURN v_battle_id;
END;
$$;

ALTER FUNCTION "public"."fn_battles_create_from_template"("p_template_id" "uuid", "p_title" "text", "p_slug" "text") OWNER TO "postgres";


-- 8.4 Register an agent adapter
CREATE OR REPLACE FUNCTION "public"."fn_agent_adapters_register"(
    "p_name" "text",
    "p_adapter_type" "text",
    "p_config" "jsonb" DEFAULT '{}'::"jsonb"
) RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'battles', 'lensers'
    AS $$
DECLARE
    v_lenser_id uuid;
    v_adapter_id uuid;
BEGIN
    v_lenser_id := lensers.get_auth_lenser_id();

    INSERT INTO battles.agent_adapters (owner_lenser_id, name, adapter_type, config)
    VALUES (v_lenser_id, p_name, p_adapter_type, p_config)
    RETURNING id INTO v_adapter_id;

    -- Log the event
    INSERT INTO battles.events (battle_id, event_type, actor_id, metadata)
    SELECT b.id, 'adapter_connected', v_lenser_id,
           jsonb_build_object('adapter_id', v_adapter_id, 'adapter_type', p_adapter_type)
    FROM battles.battles b
    WHERE FALSE; -- No-op: adapter is not yet linked to a battle

    RETURN v_adapter_id;
END;
$$;

ALTER FUNCTION "public"."fn_agent_adapters_register"("p_name" "text", "p_adapter_type" "text", "p_config" "jsonb") OWNER TO "postgres";


-- 8.5 List agent adapters for current user
CREATE OR REPLACE FUNCTION "public"."fn_agent_adapters_list"() RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'battles', 'lensers'
    AS $$
DECLARE
    v_lenser_id uuid;
    v_result jsonb;
BEGIN
    v_lenser_id := lensers.get_auth_lenser_id();

    SELECT COALESCE(jsonb_agg(
        jsonb_build_object(
            'id', a.id,
            'name', a.name,
            'adapter_type', a.adapter_type,
            'is_active', a.is_active,
            'created_at', a.created_at
        ) ORDER BY a.created_at DESC
    ), '[]'::jsonb)
    INTO v_result
    FROM battles.agent_adapters a
    WHERE a.owner_lenser_id = v_lenser_id;

    RETURN v_result;
END;
$$;

ALTER FUNCTION "public"."fn_agent_adapters_list"() OWNER TO "postgres";


-- 8.6 Remove (deactivate) an agent adapter
CREATE OR REPLACE FUNCTION "public"."fn_agent_adapters_remove"("p_adapter_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'battles', 'lensers'
    AS $$
DECLARE
    v_lenser_id uuid;
    v_adapter RECORD;
BEGIN
    v_lenser_id := lensers.get_auth_lenser_id();

    SELECT * INTO v_adapter
    FROM battles.agent_adapters
    WHERE id = p_adapter_id;

    IF v_adapter IS NULL THEN
        RAISE EXCEPTION 'Adapter not found';
    END IF;

    IF v_adapter.owner_lenser_id != v_lenser_id THEN
        RAISE EXCEPTION 'Only the adapter owner can remove it';
    END IF;

    UPDATE battles.agent_adapters
    SET is_active = false, updated_at = now()
    WHERE id = p_adapter_id;
END;
$$;

ALTER FUNCTION "public"."fn_agent_adapters_remove"("p_adapter_id" "uuid") OWNER TO "postgres";


-- 8.7 Invite a contender to a battle
CREATE OR REPLACE FUNCTION "public"."fn_battles_invite"(
    "p_battle_id" "uuid",
    "p_email" "text"
) RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'battles', 'lensers'
    AS $$
DECLARE
    v_lenser_id uuid;
    v_battle RECORD;
    v_invited_lenser_id uuid;
    v_invitation_id uuid;
BEGIN
    v_lenser_id := lensers.get_auth_lenser_id();

    SELECT * INTO v_battle
    FROM battles.battles WHERE id = p_battle_id;

    IF v_battle IS NULL THEN
        RAISE EXCEPTION 'Battle not found';
    END IF;

    IF v_battle.creator_lenser_id != v_lenser_id THEN
        RAISE EXCEPTION 'Only the battle creator can invite';
    END IF;

    IF v_battle.status NOT IN ('draft', 'open') THEN
        RAISE EXCEPTION 'Battle must be in draft or open status to invite (current: %)', v_battle.status;
    END IF;

    -- Try to resolve email to a lenser profile
    SELECT p.id INTO v_invited_lenser_id
    FROM lensers.profiles p
    JOIN auth.users u ON u.id = p.user_id
    WHERE u.email = p_email
    LIMIT 1;

    INSERT INTO battles.invitations (battle_id, invited_by, invited_email, invited_lenser_id)
    VALUES (p_battle_id, v_lenser_id, p_email, v_invited_lenser_id)
    RETURNING id INTO v_invitation_id;

    -- Log the event
    INSERT INTO battles.events (battle_id, event_type, actor_id, metadata)
    VALUES (
        p_battle_id,
        'invitation_sent',
        v_lenser_id,
        jsonb_build_object('invitation_id', v_invitation_id, 'email', p_email)
    );

    RETURN v_invitation_id;
END;
$$;

ALTER FUNCTION "public"."fn_battles_invite"("p_battle_id" "uuid", "p_email" "text") OWNER TO "postgres";


-- ============================================================
-- 9. SECURITY FIXES — revoke anon grants on write RPCs
-- ============================================================

REVOKE ALL ON FUNCTION "public"."fn_battles_create"("p_title" "text", "p_slug" "text", "p_task_prompt" "text", "p_rubric_id" "uuid") FROM "anon";
REVOKE ALL ON FUNCTION "public"."fn_battles_open"("p_battle_id" "uuid") FROM "anon";
REVOKE ALL ON FUNCTION "public"."fn_battles_join"("p_battle_id" "uuid") FROM "anon";
REVOKE ALL ON FUNCTION "public"."fn_battles_submit"("p_battle_id" "uuid", "p_content_text" "text", "p_content_url" "text", "p_content_media" "jsonb") FROM "anon";
REVOKE ALL ON FUNCTION "public"."fn_battles_vote"("p_battle_id" "uuid", "p_vote" "battles"."vote_value_enum", "p_rationale" "text") FROM "anon";
REVOKE ALL ON FUNCTION "public"."fn_battles_start_voting"("p_battle_id" "uuid", "p_voting_closes_at" timestamp with time zone) FROM "anon";
REVOKE ALL ON FUNCTION "public"."fn_battles_finalize"("p_battle_id" "uuid") FROM "anon";


-- ============================================================
-- 10. ANALYTICS VIEWS
-- ============================================================

-- 10.1 Battle health overview
CREATE OR REPLACE VIEW "public"."vw_battle_health" AS
SELECT
    b.id,
    b.title,
    b.slug,
    b.status,
    b.created_at,
    b.voting_opens_at,
    b.voting_closes_at,
    b.finalized_at,
    b.published_at,
    b.vote_count_a,
    b.vote_count_b,
    b.vote_count_draw,
    (b.vote_count_a + b.vote_count_b + b.vote_count_draw) AS total_votes,
    CASE
        WHEN (b.vote_count_a + b.vote_count_b + b.vote_count_draw) >= 5 THEN 'confident'
        WHEN (b.vote_count_a + b.vote_count_b + b.vote_count_draw) >= 3 THEN 'moderate'
        ELSE 'low'
    END AS confidence_level,
    b.winner_contender_id,
    (SELECT COUNT(*) FROM battles.contenders c WHERE c.battle_id = b.id) AS contender_count,
    (SELECT COUNT(*) FROM battles.submissions s WHERE s.battle_id = b.id AND s.status = 'submitted') AS submission_count,
    CASE
        WHEN b.finalized_at IS NOT NULL AND b.created_at IS NOT NULL
        THEN EXTRACT(EPOCH FROM (b.finalized_at - b.created_at)) / 3600.0
        ELSE NULL
    END AS hours_to_finalize
FROM battles.battles b
WHERE b.deleted_at IS NULL;

ALTER VIEW "public"."vw_battle_health" OWNER TO "postgres";


-- 10.2 Battle participation metrics by period
CREATE OR REPLACE VIEW "public"."vw_battle_participation" AS
WITH weekly_battles AS (
    SELECT
        date_trunc('week', b.created_at) AS week,
        COUNT(DISTINCT b.id) AS battles_created,
        COUNT(DISTINCT CASE WHEN b.status IN ('closed', 'published') THEN b.id END) AS battles_completed,
        COUNT(DISTINCT b.creator_lenser_id) AS unique_hosts
    FROM battles.battles b
    WHERE b.deleted_at IS NULL
    GROUP BY date_trunc('week', b.created_at)
),
weekly_votes AS (
    SELECT
        date_trunc('week', b.created_at) AS week,
        COUNT(DISTINCT v.voter_lenser_id) AS unique_voters,
        COUNT(*) AS total_votes
    FROM battles.votes v
    JOIN battles.battles b ON b.id = v.battle_id
    WHERE b.deleted_at IS NULL
    GROUP BY date_trunc('week', b.created_at)
)
SELECT
    wb.week,
    wb.battles_created,
    wb.battles_completed,
    wb.unique_hosts,
    COALESCE(wv.unique_voters, 0) AS unique_voters,
    COALESCE(wv.total_votes, 0) AS total_votes
FROM weekly_battles wb
LEFT JOIN weekly_votes wv ON wv.week = wb.week
ORDER BY wb.week DESC;

ALTER VIEW "public"."vw_battle_participation" OWNER TO "postgres";


-- 10.3 Battle funnel (conversion rates by status)
CREATE OR REPLACE VIEW "public"."vw_battle_funnel" AS
WITH status_counts AS (
    SELECT
        COUNT(*) AS total,
        COUNT(*) FILTER (WHERE status != 'draft') AS past_draft,
        COUNT(*) FILTER (WHERE status IN ('voting', 'scoring', 'closed', 'published', 'archived')) AS reached_voting,
        COUNT(*) FILTER (WHERE status IN ('closed', 'published', 'archived')) AS reached_closed,
        COUNT(*) FILTER (WHERE status IN ('published', 'archived')) AS reached_published,
        COUNT(*) FILTER (WHERE status = 'archived') AS reached_archived
    FROM battles.battles
    WHERE deleted_at IS NULL
)
SELECT
    total,
    past_draft,
    reached_voting,
    reached_closed,
    reached_published,
    CASE WHEN total > 0 THEN ROUND(100.0 * past_draft / total, 1) ELSE 0 END AS pct_past_draft,
    CASE WHEN total > 0 THEN ROUND(100.0 * reached_voting / total, 1) ELSE 0 END AS pct_reached_voting,
    CASE WHEN total > 0 THEN ROUND(100.0 * reached_closed / total, 1) ELSE 0 END AS pct_reached_closed,
    CASE WHEN total > 0 THEN ROUND(100.0 * reached_published / total, 1) ELSE 0 END AS pct_reached_published
FROM status_counts;

ALTER VIEW "public"."vw_battle_funnel" OWNER TO "postgres";


-- ============================================================
-- 11. GRANTS
-- ============================================================

-- 11.1 Table grants for new tables

-- Templates
GRANT SELECT ON TABLE "battles"."templates" TO "anon";
GRANT SELECT,INSERT,UPDATE,DELETE ON TABLE "battles"."templates" TO "authenticated";
GRANT ALL ON TABLE "battles"."templates" TO "service_role";

-- Agent Adapters
GRANT SELECT ON TABLE "battles"."agent_adapters" TO "anon";
GRANT SELECT,INSERT,UPDATE,DELETE ON TABLE "battles"."agent_adapters" TO "authenticated";
GRANT ALL ON TABLE "battles"."agent_adapters" TO "service_role";

-- Events (read-only for non-service roles)
GRANT SELECT ON TABLE "battles"."events" TO "anon";
GRANT SELECT ON TABLE "battles"."events" TO "authenticated";
GRANT ALL ON TABLE "battles"."events" TO "service_role";

-- Invitations
GRANT SELECT ON TABLE "battles"."invitations" TO "authenticated";
GRANT SELECT,INSERT,UPDATE ON TABLE "battles"."invitations" TO "authenticated";
GRANT ALL ON TABLE "battles"."invitations" TO "service_role";

-- Views
GRANT SELECT ON "public"."vw_battle_health" TO "authenticated";
GRANT SELECT ON "public"."vw_battle_health" TO "service_role";

GRANT SELECT ON "public"."vw_battle_participation" TO "authenticated";
GRANT SELECT ON "public"."vw_battle_participation" TO "service_role";

GRANT SELECT ON "public"."vw_battle_funnel" TO "authenticated";
GRANT SELECT ON "public"."vw_battle_funnel" TO "service_role";


-- 11.2 Function grants for new RPCs (authenticated + service_role only)

GRANT ALL ON FUNCTION "public"."fn_battles_publish"("p_battle_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_battles_publish"("p_battle_id" "uuid") TO "service_role";

GRANT ALL ON FUNCTION "public"."fn_battles_archive"("p_battle_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_battles_archive"("p_battle_id" "uuid") TO "service_role";

GRANT ALL ON FUNCTION "public"."fn_battles_create_from_template"("p_template_id" "uuid", "p_title" "text", "p_slug" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_battles_create_from_template"("p_template_id" "uuid", "p_title" "text", "p_slug" "text") TO "service_role";

GRANT ALL ON FUNCTION "public"."fn_agent_adapters_register"("p_name" "text", "p_adapter_type" "text", "p_config" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_agent_adapters_register"("p_name" "text", "p_adapter_type" "text", "p_config" "jsonb") TO "service_role";

GRANT ALL ON FUNCTION "public"."fn_agent_adapters_list"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_agent_adapters_list"() TO "service_role";

GRANT ALL ON FUNCTION "public"."fn_agent_adapters_remove"("p_adapter_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_agent_adapters_remove"("p_adapter_id" "uuid") TO "service_role";

GRANT ALL ON FUNCTION "public"."fn_battles_invite"("p_battle_id" "uuid", "p_email" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_battles_invite"("p_battle_id" "uuid", "p_email" "text") TO "service_role";

-- Trigger function grant
GRANT ALL ON FUNCTION "battles"."log_battle_status_event"() TO "service_role";


-- =============================================================================
-- END OF MIGRATION
-- =============================================================================
