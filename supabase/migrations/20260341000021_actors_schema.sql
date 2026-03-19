-- =============================================================================
-- MIGRATION 21: ACTORS SCHEMA
-- =============================================================================
-- Introduces a unified actor abstraction for humans, AI agents, teams, and
-- communities. All battle participation flows through actors.actors.
-- =============================================================================

-- ─────────────────────────────────────────────────────────────────────────────
-- SECTION 1: SCHEMA
-- ─────────────────────────────────────────────────────────────────────────────

CREATE SCHEMA IF NOT EXISTS "actors";

ALTER SCHEMA "actors" OWNER TO "postgres";

GRANT USAGE ON SCHEMA "actors" TO "anon";
GRANT USAGE ON SCHEMA "actors" TO "authenticated";
GRANT USAGE ON SCHEMA "actors" TO "service_role";


-- ─────────────────────────────────────────────────────────────────────────────
-- SECTION 2: TABLES
-- ─────────────────────────────────────────────────────────────────────────────

-- 2.1 actors.actors — canonical participant identity
CREATE TABLE IF NOT EXISTS "actors"."actors" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "actor_type" "text" NOT NULL,
    "display_name" "text" NOT NULL,
    "owner_lenser_id" "uuid",
    "profile_id" "uuid",
    "ai_model_id" "uuid",
    "agent_adapter_id" "uuid",
    "visibility" "text" DEFAULT 'public'::"text" NOT NULL,
    "status" "text" DEFAULT 'active'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "actors_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "actors_type_check" CHECK (
        "actor_type" = ANY (ARRAY[
            'human'::"text",
            'agent'::"text",
            'team'::"text",
            'community'::"text",
            'system'::"text"
        ])
    ),
    CONSTRAINT "actors_visibility_check" CHECK (
        "visibility" = ANY (ARRAY[
            'public'::"text",
            'community'::"text",
            'private'::"text"
        ])
    ),
    CONSTRAINT "actors_status_check" CHECK (
        "status" = ANY (ARRAY[
            'active'::"text",
            'inactive'::"text",
            'suspended'::"text"
        ])
    ),
    CONSTRAINT "actors_human_requires_profile" CHECK (
        "actor_type" <> 'human' OR "profile_id" IS NOT NULL
    ),
    CONSTRAINT "actors_agent_requires_ref" CHECK (
        "actor_type" <> 'agent' OR ("ai_model_id" IS NOT NULL OR "agent_adapter_id" IS NOT NULL)
    )
);

ALTER TABLE "actors"."actors" OWNER TO "postgres";


-- 2.2 actors.teams — battle teams
CREATE TABLE IF NOT EXISTS "actors"."teams" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "actor_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "slug" "text" NOT NULL,
    "owner_actor_id" "uuid" NOT NULL,
    "visibility" "text" DEFAULT 'public'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "teams_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "teams_visibility_check" CHECK (
        "visibility" = ANY (ARRAY[
            'public'::"text",
            'private'::"text",
            'invite_only'::"text"
        ])
    )
);

ALTER TABLE "actors"."teams" OWNER TO "postgres";


-- 2.3 actors.team_members — team membership
CREATE TABLE IF NOT EXISTS "actors"."team_members" (
    "team_id" "uuid" NOT NULL,
    "actor_id" "uuid" NOT NULL,
    "role" "text" DEFAULT 'member'::"text" NOT NULL,
    "joined_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "team_members_pkey" PRIMARY KEY ("team_id", "actor_id"),
    CONSTRAINT "team_members_role_check" CHECK (
        "role" = ANY (ARRAY[
            'leader'::"text",
            'member'::"text",
            'agent'::"text",
            'judge'::"text"
        ])
    )
);

ALTER TABLE "actors"."team_members" OWNER TO "postgres";


-- 2.4 actors.communities — larger social/brand/group entities
CREATE TABLE IF NOT EXISTS "actors"."communities" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "actor_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "slug" "text" NOT NULL,
    "owner_lenser_id" "uuid" NOT NULL,
    "visibility" "text" DEFAULT 'public'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "communities_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "communities_visibility_check" CHECK (
        "visibility" = ANY (ARRAY[
            'public'::"text",
            'private'::"text",
            'invite_only'::"text"
        ])
    )
);

ALTER TABLE "actors"."communities" OWNER TO "postgres";


-- 2.5 actors.community_members — community membership
CREATE TABLE IF NOT EXISTS "actors"."community_members" (
    "community_id" "uuid" NOT NULL,
    "actor_id" "uuid" NOT NULL,
    "role" "text" DEFAULT 'member'::"text" NOT NULL,
    "joined_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "community_members_pkey" PRIMARY KEY ("community_id", "actor_id"),
    CONSTRAINT "community_members_role_check" CHECK (
        "role" = ANY (ARRAY[
            'admin'::"text",
            'moderator'::"text",
            'member'::"text"
        ])
    )
);

ALTER TABLE "actors"."community_members" OWNER TO "postgres";


-- ─────────────────────────────────────────────────────────────────────────────
-- SECTION 3: FOREIGN KEYS
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE "actors"."actors"
    ADD CONSTRAINT "actors_owner_lenser_id_fkey"
    FOREIGN KEY ("owner_lenser_id")
    REFERENCES "lensers"."profiles"("id") ON DELETE SET NULL;

ALTER TABLE "actors"."actors"
    ADD CONSTRAINT "actors_profile_id_fkey"
    FOREIGN KEY ("profile_id")
    REFERENCES "lensers"."profiles"("id") ON DELETE SET NULL;

ALTER TABLE "actors"."actors"
    ADD CONSTRAINT "actors_ai_model_id_fkey"
    FOREIGN KEY ("ai_model_id")
    REFERENCES "ai"."models"("id") ON DELETE SET NULL;

ALTER TABLE "actors"."actors"
    ADD CONSTRAINT "actors_agent_adapter_id_fkey"
    FOREIGN KEY ("agent_adapter_id")
    REFERENCES "battles"."agent_adapters"("id") ON DELETE SET NULL;

ALTER TABLE "actors"."teams"
    ADD CONSTRAINT "teams_actor_id_fkey"
    FOREIGN KEY ("actor_id")
    REFERENCES "actors"."actors"("id") ON DELETE CASCADE;

ALTER TABLE "actors"."teams"
    ADD CONSTRAINT "teams_owner_actor_id_fkey"
    FOREIGN KEY ("owner_actor_id")
    REFERENCES "actors"."actors"("id") ON DELETE CASCADE;

ALTER TABLE "actors"."team_members"
    ADD CONSTRAINT "team_members_team_id_fkey"
    FOREIGN KEY ("team_id")
    REFERENCES "actors"."teams"("id") ON DELETE CASCADE;

ALTER TABLE "actors"."team_members"
    ADD CONSTRAINT "team_members_actor_id_fkey"
    FOREIGN KEY ("actor_id")
    REFERENCES "actors"."actors"("id") ON DELETE CASCADE;

ALTER TABLE "actors"."communities"
    ADD CONSTRAINT "communities_actor_id_fkey"
    FOREIGN KEY ("actor_id")
    REFERENCES "actors"."actors"("id") ON DELETE CASCADE;

ALTER TABLE "actors"."communities"
    ADD CONSTRAINT "communities_owner_lenser_id_fkey"
    FOREIGN KEY ("owner_lenser_id")
    REFERENCES "lensers"."profiles"("id") ON DELETE CASCADE;

ALTER TABLE "actors"."community_members"
    ADD CONSTRAINT "community_members_community_id_fkey"
    FOREIGN KEY ("community_id")
    REFERENCES "actors"."communities"("id") ON DELETE CASCADE;

ALTER TABLE "actors"."community_members"
    ADD CONSTRAINT "community_members_actor_id_fkey"
    FOREIGN KEY ("actor_id")
    REFERENCES "actors"."actors"("id") ON DELETE CASCADE;


-- ─────────────────────────────────────────────────────────────────────────────
-- SECTION 4: INDEXES
-- ─────────────────────────────────────────────────────────────────────────────

-- actors
CREATE INDEX "idx_actors_type_created" ON "actors"."actors" ("actor_type", "created_at" DESC);
CREATE INDEX "idx_actors_owner" ON "actors"."actors" ("owner_lenser_id", "actor_type")
    WHERE "owner_lenser_id" IS NOT NULL;
CREATE UNIQUE INDEX "idx_actors_profile_unique" ON "actors"."actors" ("profile_id")
    WHERE "profile_id" IS NOT NULL;
CREATE INDEX "idx_actors_model" ON "actors"."actors" ("ai_model_id")
    WHERE "ai_model_id" IS NOT NULL;

-- teams
CREATE INDEX "idx_teams_owner" ON "actors"."teams" ("owner_actor_id");
CREATE UNIQUE INDEX "idx_teams_slug" ON "actors"."teams" ("slug");
CREATE UNIQUE INDEX "idx_teams_actor" ON "actors"."teams" ("actor_id");

-- team_members
CREATE INDEX "idx_team_members_actor" ON "actors"."team_members" ("actor_id");
CREATE INDEX "idx_team_members_role" ON "actors"."team_members" ("team_id", "role");

-- communities
CREATE UNIQUE INDEX "idx_communities_slug" ON "actors"."communities" ("slug");
CREATE UNIQUE INDEX "idx_communities_actor" ON "actors"."communities" ("actor_id");
CREATE INDEX "idx_communities_owner" ON "actors"."communities" ("owner_lenser_id");

-- community_members
CREATE INDEX "idx_community_members_actor" ON "actors"."community_members" ("actor_id");
CREATE INDEX "idx_community_members_role" ON "actors"."community_members" ("community_id", "role");


-- ─────────────────────────────────────────────────────────────────────────────
-- SECTION 5: BACKFILL — seed actors from existing profiles
-- ─────────────────────────────────────────────────────────────────────────────

-- Create actor rows for all active human profiles
INSERT INTO "actors"."actors" ("id", "actor_type", "display_name", "owner_lenser_id", "profile_id")
SELECT "gen_random_uuid"(), 'human', p."display_name", p."id", p."id"
FROM "lensers"."profiles" p
WHERE p."type" = 'human' AND p."status" IN ('active', 'deactivated')
ON CONFLICT DO NOTHING;

-- Create actor rows for AI lenser profiles
INSERT INTO "actors"."actors" ("id", "actor_type", "display_name", "owner_lenser_id", "profile_id", "ai_model_id")
SELECT "gen_random_uuid"(), 'agent', p."display_name", p."id", p."id", p."ai_model_id"
FROM "lensers"."profiles" p
WHERE p."type" = 'ai' AND p."status" IN ('active', 'deactivated')
ON CONFLICT DO NOTHING;


-- ─────────────────────────────────────────────────────────────────────────────
-- SECTION 6: TRIGGER — auto-create actor on profile insert
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION "actors"."trg_auto_create_actor_for_profile"() RETURNS trigger
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'actors', 'lensers'
    AS $$
BEGIN
    -- Only create actor for completed onboarding (step >= 2) or any insert
    IF NEW.status IN ('active', 'deactivated') THEN
        INSERT INTO actors.actors (actor_type, display_name, owner_lenser_id, profile_id, ai_model_id)
        VALUES (
            CASE WHEN NEW.type = 'ai' THEN 'agent' ELSE 'human' END,
            NEW.display_name,
            NEW.id,
            NEW.id,
            NEW.ai_model_id
        )
        ON CONFLICT DO NOTHING;
    END IF;
    RETURN NEW;
END;
$$;

ALTER FUNCTION "actors"."trg_auto_create_actor_for_profile"() OWNER TO "postgres";

CREATE TRIGGER "trg_auto_create_actor_for_profile"
    AFTER INSERT ON "lensers"."profiles"
    FOR EACH ROW
    EXECUTE FUNCTION "actors"."trg_auto_create_actor_for_profile"();


-- ─────────────────────────────────────────────────────────────────────────────
-- SECTION 7: ROW LEVEL SECURITY
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE "actors"."actors" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "actors"."teams" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "actors"."team_members" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "actors"."communities" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "actors"."community_members" ENABLE ROW LEVEL SECURITY;

-- actors: anyone authenticated can read active/public actors
CREATE POLICY "actors_select_public" ON "actors"."actors"
    FOR SELECT TO "authenticated"
    USING ("status" = 'active' AND "visibility" IN ('public', 'community'));

-- actors: owner can read all their own actors
CREATE POLICY "actors_select_own" ON "actors"."actors"
    FOR SELECT TO "authenticated"
    USING ("owner_lenser_id" = "lensers"."get_auth_lenser_id"());

-- actors: owner can insert their own actors
CREATE POLICY "actors_insert_own" ON "actors"."actors"
    FOR INSERT TO "authenticated"
    WITH CHECK ("owner_lenser_id" = "lensers"."get_auth_lenser_id"());

-- actors: owner can update their own actors
CREATE POLICY "actors_update_own" ON "actors"."actors"
    FOR UPDATE TO "authenticated"
    USING ("owner_lenser_id" = "lensers"."get_auth_lenser_id"())
    WITH CHECK ("owner_lenser_id" = "lensers"."get_auth_lenser_id"());

-- actors: service_role full access
CREATE POLICY "actors_service_all" ON "actors"."actors"
    FOR ALL TO "service_role"
    USING (true)
    WITH CHECK (true);

-- teams: public teams readable by all
CREATE POLICY "teams_select_public" ON "actors"."teams"
    FOR SELECT TO "authenticated"
    USING ("visibility" = 'public');

-- teams: owner can manage
CREATE POLICY "teams_select_own" ON "actors"."teams"
    FOR SELECT TO "authenticated"
    USING (EXISTS (
        SELECT 1 FROM "actors"."actors" a
        WHERE a."id" = "teams"."owner_actor_id"
          AND a."owner_lenser_id" = "lensers"."get_auth_lenser_id"()
    ));

CREATE POLICY "teams_insert_own" ON "actors"."teams"
    FOR INSERT TO "authenticated"
    WITH CHECK (EXISTS (
        SELECT 1 FROM "actors"."actors" a
        WHERE a."id" = "teams"."owner_actor_id"
          AND a."owner_lenser_id" = "lensers"."get_auth_lenser_id"()
    ));

CREATE POLICY "teams_update_own" ON "actors"."teams"
    FOR UPDATE TO "authenticated"
    USING (EXISTS (
        SELECT 1 FROM "actors"."actors" a
        WHERE a."id" = "teams"."owner_actor_id"
          AND a."owner_lenser_id" = "lensers"."get_auth_lenser_id"()
    ))
    WITH CHECK (EXISTS (
        SELECT 1 FROM "actors"."actors" a
        WHERE a."id" = "teams"."owner_actor_id"
          AND a."owner_lenser_id" = "lensers"."get_auth_lenser_id"()
    ));

-- teams: service_role full access
CREATE POLICY "teams_service_all" ON "actors"."teams"
    FOR ALL TO "service_role"
    USING (true)
    WITH CHECK (true);

-- team_members: members can read their own team membership
CREATE POLICY "team_members_select_member" ON "actors"."team_members"
    FOR SELECT TO "authenticated"
    USING (EXISTS (
        SELECT 1 FROM "actors"."actors" a
        WHERE a."id" = "team_members"."actor_id"
          AND a."owner_lenser_id" = "lensers"."get_auth_lenser_id"()
    ));

-- team_members: team leader can read all members
CREATE POLICY "team_members_select_leader" ON "actors"."team_members"
    FOR SELECT TO "authenticated"
    USING (EXISTS (
        SELECT 1 FROM "actors"."teams" t
        JOIN "actors"."actors" a ON a."id" = t."owner_actor_id"
        WHERE t."id" = "team_members"."team_id"
          AND a."owner_lenser_id" = "lensers"."get_auth_lenser_id"()
    ));

-- team_members: service_role full access
CREATE POLICY "team_members_service_all" ON "actors"."team_members"
    FOR ALL TO "service_role"
    USING (true)
    WITH CHECK (true);

-- communities: public communities readable by all
CREATE POLICY "communities_select_public" ON "actors"."communities"
    FOR SELECT TO "authenticated"
    USING ("visibility" = 'public');

-- communities: owner can manage
CREATE POLICY "communities_select_own" ON "actors"."communities"
    FOR SELECT TO "authenticated"
    USING ("owner_lenser_id" = "lensers"."get_auth_lenser_id"());

CREATE POLICY "communities_insert_own" ON "actors"."communities"
    FOR INSERT TO "authenticated"
    WITH CHECK ("owner_lenser_id" = "lensers"."get_auth_lenser_id"());

CREATE POLICY "communities_update_own" ON "actors"."communities"
    FOR UPDATE TO "authenticated"
    USING ("owner_lenser_id" = "lensers"."get_auth_lenser_id"())
    WITH CHECK ("owner_lenser_id" = "lensers"."get_auth_lenser_id"());

-- communities: service_role full access
CREATE POLICY "communities_service_all" ON "actors"."communities"
    FOR ALL TO "service_role"
    USING (true)
    WITH CHECK (true);

-- community_members: members can read their own membership
CREATE POLICY "community_members_select_member" ON "actors"."community_members"
    FOR SELECT TO "authenticated"
    USING (EXISTS (
        SELECT 1 FROM "actors"."actors" a
        WHERE a."id" = "community_members"."actor_id"
          AND a."owner_lenser_id" = "lensers"."get_auth_lenser_id"()
    ));

-- community_members: community owner can read all members
CREATE POLICY "community_members_select_owner" ON "actors"."community_members"
    FOR SELECT TO "authenticated"
    USING (EXISTS (
        SELECT 1 FROM "actors"."communities" c
        WHERE c."id" = "community_members"."community_id"
          AND c."owner_lenser_id" = "lensers"."get_auth_lenser_id"()
    ));

-- community_members: service_role full access
CREATE POLICY "community_members_service_all" ON "actors"."community_members"
    FOR ALL TO "service_role"
    USING (true)
    WITH CHECK (true);


-- ─────────────────────────────────────────────────────────────────────────────
-- SECTION 8: GRANTS
-- ─────────────────────────────────────────────────────────────────────────────

GRANT ALL ON TABLE "actors"."actors" TO "service_role";
GRANT SELECT, INSERT, UPDATE ON TABLE "actors"."actors" TO "authenticated";

GRANT ALL ON TABLE "actors"."teams" TO "service_role";
GRANT SELECT, INSERT, UPDATE ON TABLE "actors"."teams" TO "authenticated";

GRANT ALL ON TABLE "actors"."team_members" TO "service_role";
GRANT SELECT ON TABLE "actors"."team_members" TO "authenticated";

GRANT ALL ON TABLE "actors"."communities" TO "service_role";
GRANT SELECT, INSERT, UPDATE ON TABLE "actors"."communities" TO "authenticated";

GRANT ALL ON TABLE "actors"."community_members" TO "service_role";
GRANT SELECT ON TABLE "actors"."community_members" TO "authenticated";
