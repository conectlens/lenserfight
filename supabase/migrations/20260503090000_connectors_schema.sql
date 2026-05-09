-- Phase 10: Connectors schema (RFC-0001)
--
-- Creates the `connectors` schema, the workspace-scoped `connectors` table,
-- and the `connector_tokens` table. Tokens store only a sha-256 hash —
-- raw service tokens are returned exactly once at create/rotate time.
--
-- Rollback strategy
-- -----------------
-- 1. DROP TABLE connectors.connector_tokens CASCADE;
-- 2. DROP TABLE connectors.connectors CASCADE;
-- 3. DROP SCHEMA connectors CASCADE;
-- No data lives outside this schema; rollback is non-destructive to other
-- schemas. Re-running this migration is idempotent (`IF NOT EXISTS`).

CREATE SCHEMA IF NOT EXISTS "connectors";

REVOKE ALL ON SCHEMA "connectors" FROM PUBLIC, anon, authenticated;
GRANT USAGE ON SCHEMA "connectors" TO authenticated, service_role;

CREATE TABLE IF NOT EXISTS "connectors"."connectors" (
    "id"             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    "workspace_id"   uuid NOT NULL REFERENCES "tenancy"."workspaces"("id") ON DELETE CASCADE,
    "slug"           text NOT NULL,
    "name"           text NOT NULL,
    "description"    text,
    "kind"           text NOT NULL DEFAULT 'api',
    "is_active"      boolean NOT NULL DEFAULT true,
    "metadata"       jsonb NOT NULL DEFAULT '{}'::jsonb,
    "created_by"     uuid REFERENCES "auth"."users"("id") ON DELETE SET NULL,
    "created_at"     timestamptz NOT NULL DEFAULT now(),
    "last_used_at"   timestamptz,
    CONSTRAINT "connectors_kind_check" CHECK ("kind" = ANY (ARRAY['api','webhook'])),
    CONSTRAINT "connectors_slug_format" CHECK (
        "slug" ~ '^[a-z0-9]+([_-][a-z0-9]+)*$'
        AND char_length("slug") BETWEEN 3 AND 64
    ),
    CONSTRAINT "connectors_workspace_slug_unique" UNIQUE ("workspace_id", "slug")
);

COMMENT ON TABLE "connectors"."connectors" IS
  'Workspace-scoped service connectors. One row per registered integration; tokens stored separately.';

CREATE INDEX IF NOT EXISTS "connectors_workspace_active_idx"
    ON "connectors"."connectors" ("workspace_id") WHERE "is_active" = true;

CREATE TABLE IF NOT EXISTS "connectors"."connector_tokens" (
    "id"           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    "connector_id" uuid NOT NULL REFERENCES "connectors"."connectors"("id") ON DELETE CASCADE,
    "token_hash"   text NOT NULL,
    "token_prefix" text NOT NULL,
    "scopes"       text[] NOT NULL,
    "revoked_at"   timestamptz,
    "created_at"   timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT "connector_tokens_hash_unique" UNIQUE ("token_hash"),
    CONSTRAINT "connector_tokens_scopes_nonempty" CHECK (cardinality("scopes") > 0)
);

COMMENT ON TABLE "connectors"."connector_tokens" IS
  'Hashed service tokens for connectors. Raw tokens are returned only once; lookup uses token_hash = sha256(token).';

CREATE INDEX IF NOT EXISTS "connector_tokens_connector_active_idx"
    ON "connectors"."connector_tokens" ("connector_id") WHERE "revoked_at" IS NULL;

ALTER TABLE "connectors"."connectors" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "connectors"."connector_tokens" ENABLE ROW LEVEL SECURITY;

-- No direct table access from anon/authenticated. All reads/writes go
-- through the SECURITY DEFINER RPCs in 20260503100000_connectors_rpcs.sql.
-- service_role bypasses RLS and is used by the platform API for token
-- verification on incoming requests.

REVOKE ALL ON ALL TABLES IN SCHEMA "connectors" FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA "connectors" TO service_role;
