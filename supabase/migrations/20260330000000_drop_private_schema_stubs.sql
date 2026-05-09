-- Drop Chainabit-private schema stubs created by community_base_schema.
--
-- authz, billing, organizations, wallet belong to the Chainabit commercial backend
-- and must not exist in a Community Edition database. They were scaffolded in the
-- initial base schema before the OSS/private split was formalised. This migration
-- removes them immediately after so that `pnpm supabase:db:reset` produces a
-- clean Community Edition schema with no private stubs.
--
-- battles, xp, benchmark are Community Edition features and are NOT dropped here.
--
-- CASCADE is safe: no Community Edition migration creates objects that reference
-- tables or functions in these four schemas. Verified by audit on 2026-05-09.

DROP SCHEMA IF EXISTS "authz"       CASCADE;
DROP SCHEMA IF EXISTS "billing"     CASCADE;
DROP SCHEMA IF EXISTS "organizations" CASCADE;
DROP SCHEMA IF EXISTS "wallet"      CASCADE;
