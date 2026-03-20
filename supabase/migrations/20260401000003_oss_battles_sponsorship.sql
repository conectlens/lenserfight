-- M3: Battle sponsorship system
-- Purpose: Credit pools for battle sponsorship — winners earn from pool, platform takes fee
-- OSS-safe: stores credit amounts as plain bigint (no FK to wallet schema)
-- All mutations via CF Worker (service_role) — authenticated users can only SELECT
-- Self-hosted mode: tables exist but pools stay empty without wallet integration

-- ============================================================================
-- ENUM
-- ============================================================================

CREATE TYPE "battles"."sponsorship_pool_status_enum" AS ENUM
    ('open', 'locked', 'distributing', 'distributed', 'refunded');

-- ============================================================================
-- TABLE: sponsorship_pools — one pool per battle
-- ============================================================================

CREATE TABLE IF NOT EXISTS "battles"."sponsorship_pools" (
    "id"               "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "battle_id"        "uuid" NOT NULL,
    "total_credits"    bigint NOT NULL DEFAULT 0,
    "platform_fee_pct" smallint NOT NULL DEFAULT 10,
    "status"           "battles"."sponsorship_pool_status_enum" NOT NULL DEFAULT 'open',
    "locked_at"        timestamp with time zone,
    "distributed_at"   timestamp with time zone,
    "created_at"       timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at"       timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "sponsorship_pools_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "sponsorship_pools_battle_id_key" UNIQUE ("battle_id"),
    CONSTRAINT "sponsorship_pools_battle_id_fkey"
        FOREIGN KEY ("battle_id") REFERENCES "battles"."battles"("id") ON DELETE CASCADE,
    CONSTRAINT "sponsorship_pools_total_credits_check" CHECK ("total_credits" >= 0),
    CONSTRAINT "sponsorship_pools_platform_fee_pct_check"
        CHECK ("platform_fee_pct" >= 0 AND "platform_fee_pct" <= 50)
);

ALTER TABLE "battles"."sponsorship_pools" OWNER TO "postgres";

COMMENT ON TABLE "battles"."sponsorship_pools" IS 'Credit pool for battle sponsorship. platform_fee_pct is the percentage taken by the platform on distribution. Managed by CF Worker only.';

-- ============================================================================
-- TABLE: sponsorship_contributions — who deposited how much
-- ============================================================================

CREATE TABLE IF NOT EXISTS "battles"."sponsorship_contributions" (
    "id"                     "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "pool_id"                "uuid" NOT NULL,
    "contributor_lenser_id"  "uuid" NOT NULL,
    "amount_credits"         bigint NOT NULL,
    "external_tx_ref"        "text",
    "created_at"             timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "sponsorship_contributions_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "sponsorship_contributions_pool_id_fkey"
        FOREIGN KEY ("pool_id") REFERENCES "battles"."sponsorship_pools"("id") ON DELETE CASCADE,
    CONSTRAINT "sponsorship_contributions_contributor_fkey"
        FOREIGN KEY ("contributor_lenser_id") REFERENCES "lensers"."profiles"("id") ON DELETE CASCADE,
    CONSTRAINT "sponsorship_contributions_amount_check" CHECK ("amount_credits" > 0)
);

-- Idempotency: prevent duplicate wallet transactions per pool
CREATE UNIQUE INDEX "uq_sponsorship_contribs_pool_tx"
    ON "battles"."sponsorship_contributions" ("pool_id", "external_tx_ref")
    WHERE "external_tx_ref" IS NOT NULL;

ALTER TABLE "battles"."sponsorship_contributions" OWNER TO "postgres";

COMMENT ON TABLE "battles"."sponsorship_contributions" IS 'Individual credit deposits into a battle sponsorship pool. external_tx_ref is an opaque wallet transaction ID (not an FK).';

-- ============================================================================
-- TABLE: sponsorship_payouts — winner payouts after battle closes
-- ============================================================================

CREATE TABLE IF NOT EXISTS "battles"."sponsorship_payouts" (
    "id"                    "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "pool_id"               "uuid" NOT NULL,
    "recipient_lenser_id"   "uuid" NOT NULL,
    "amount_credits"        bigint NOT NULL,
    "platform_fee_credits"  bigint NOT NULL DEFAULT 0,
    "payout_type"           "text" NOT NULL,
    "external_tx_ref"       "text",
    "created_at"            timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "sponsorship_payouts_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "sponsorship_payouts_pool_id_fkey"
        FOREIGN KEY ("pool_id") REFERENCES "battles"."sponsorship_pools"("id") ON DELETE CASCADE,
    CONSTRAINT "sponsorship_payouts_recipient_fkey"
        FOREIGN KEY ("recipient_lenser_id") REFERENCES "lensers"."profiles"("id") ON DELETE CASCADE,
    CONSTRAINT "sponsorship_payouts_amount_check" CHECK ("amount_credits" > 0),
    CONSTRAINT "sponsorship_payouts_fee_check" CHECK ("platform_fee_credits" >= 0),
    CONSTRAINT "sponsorship_payouts_type_check"
        CHECK ("payout_type" IN ('winner', 'runner_up', 'refund', 'platform_fee'))
);

-- Idempotency: prevent duplicate wallet transactions per pool
CREATE UNIQUE INDEX "uq_sponsorship_payouts_pool_tx"
    ON "battles"."sponsorship_payouts" ("pool_id", "external_tx_ref")
    WHERE "external_tx_ref" IS NOT NULL;

ALTER TABLE "battles"."sponsorship_payouts" OWNER TO "postgres";

COMMENT ON TABLE "battles"."sponsorship_payouts" IS 'Credit payouts from sponsorship pool after battle closes. Includes winner, runner_up, refund, and platform_fee entries.';

-- ============================================================================
-- INDEXES
-- ============================================================================

CREATE INDEX "idx_sponsorship_pools_battle"
    ON "battles"."sponsorship_pools" ("battle_id");

CREATE INDEX "idx_sponsorship_pools_status"
    ON "battles"."sponsorship_pools" ("status", "created_at" DESC)
    WHERE "status" NOT IN ('distributed', 'refunded');

CREATE INDEX "idx_sponsorship_contribs_pool"
    ON "battles"."sponsorship_contributions" ("pool_id");

CREATE INDEX "idx_sponsorship_contribs_lenser"
    ON "battles"."sponsorship_contributions" ("contributor_lenser_id", "created_at" DESC);

CREATE INDEX "idx_sponsorship_payouts_pool"
    ON "battles"."sponsorship_payouts" ("pool_id");

CREATE INDEX "idx_sponsorship_payouts_recipient"
    ON "battles"."sponsorship_payouts" ("recipient_lenser_id", "created_at" DESC);

-- ============================================================================
-- RLS: All mutations via service_role (CF Worker). Authenticated can only SELECT.
-- ============================================================================

ALTER TABLE "battles"."sponsorship_pools" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "battles"."sponsorship_contributions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "battles"."sponsorship_payouts" ENABLE ROW LEVEL SECURITY;

-- sponsorship_pools: visible for active/closed battles
CREATE POLICY "pools_select_public"
    ON "battles"."sponsorship_pools"
    FOR SELECT TO "authenticated"
    USING (EXISTS (
        SELECT 1 FROM "battles"."battles" "b"
        WHERE "b"."id" = "battle_id"
          AND "b"."status" IN ('open', 'voting', 'scoring', 'closed', 'published')
          AND "b"."deleted_at" IS NULL
    ));

CREATE POLICY "pools_select_creator"
    ON "battles"."sponsorship_pools"
    FOR SELECT TO "authenticated"
    USING (EXISTS (
        SELECT 1 FROM "battles"."battles" "b"
        WHERE "b"."id" = "battle_id"
          AND "b"."creator_lenser_id" = "lensers"."get_auth_lenser_id"()
    ));

CREATE POLICY "pools_service_all"
    ON "battles"."sponsorship_pools"
    TO "service_role"
    USING (true) WITH CHECK (true);

-- sponsorship_contributions: users see own + public pools
CREATE POLICY "contribs_select_own"
    ON "battles"."sponsorship_contributions"
    FOR SELECT TO "authenticated"
    USING ("contributor_lenser_id" = "lensers"."get_auth_lenser_id"());

CREATE POLICY "contribs_select_pool"
    ON "battles"."sponsorship_contributions"
    FOR SELECT TO "authenticated"
    USING (EXISTS (
        SELECT 1 FROM "battles"."sponsorship_pools" "p"
        JOIN "battles"."battles" "b" ON "b"."id" = "p"."battle_id"
        WHERE "p"."id" = "pool_id"
          AND "b"."status" IN ('open', 'voting', 'scoring', 'closed', 'published')
          AND "b"."deleted_at" IS NULL
    ));

CREATE POLICY "contribs_service_all"
    ON "battles"."sponsorship_contributions"
    TO "service_role"
    USING (true) WITH CHECK (true);

-- sponsorship_payouts: users see own + closed/published battles
CREATE POLICY "payouts_select_own"
    ON "battles"."sponsorship_payouts"
    FOR SELECT TO "authenticated"
    USING ("recipient_lenser_id" = "lensers"."get_auth_lenser_id"());

CREATE POLICY "payouts_select_pool"
    ON "battles"."sponsorship_payouts"
    FOR SELECT TO "authenticated"
    USING (EXISTS (
        SELECT 1 FROM "battles"."sponsorship_pools" "p"
        JOIN "battles"."battles" "b" ON "b"."id" = "p"."battle_id"
        WHERE "p"."id" = "pool_id"
          AND "b"."status" IN ('closed', 'published')
          AND "b"."deleted_at" IS NULL
    ));

CREATE POLICY "payouts_service_all"
    ON "battles"."sponsorship_payouts"
    TO "service_role"
    USING (true) WITH CHECK (true);
