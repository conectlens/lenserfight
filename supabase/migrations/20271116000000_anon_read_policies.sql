-- Phase BQ — Explicit anon-read policies.
--
-- Anonymous visitors must be able to:
--   - SELECT from battles.battles when status ∈ public lifecycle states
--   - SELECT from battles.templates when is_public = true
--   - SELECT from lensers.profiles when type='human' (display info)
--   - Call fn_browse_battles, fn_battles_render_prompt (already granted)
--
-- Anonymous INSERTs on any battle / template / profile MUST raise.

-- ── 1. battles.battles ──────────────────────────────────────────────────────
ALTER TABLE battles.battles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS anon_battles_public_read ON battles.battles;
CREATE POLICY anon_battles_public_read ON battles.battles
  FOR SELECT TO anon
  USING (
    deleted_at IS NULL
    AND status::text IN ('open', 'voting', 'scoring', 'published')
  );

-- ── 2. battles.templates ────────────────────────────────────────────────────
ALTER TABLE battles.templates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS anon_templates_public_read ON battles.templates;
CREATE POLICY anon_templates_public_read ON battles.templates
  FOR SELECT TO anon
  USING (
    is_public = true
    AND deleted_at IS NULL
  );

-- ── 3. lenser_profiles ──────────────────────────────────────────────────────
-- Public surface only — handle / display_name. We keep RLS on but allow anon
-- SELECT for the small subset of columns the browse page needs.
ALTER TABLE lensers.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS anon_lenser_profiles_public_read ON lensers.profiles;
CREATE POLICY anon_lenser_profiles_public_read ON lensers.profiles
  FOR SELECT TO anon
  USING (type = 'human');

-- ── 4. revoke anon write across the battle surface ─────────────────────────
REVOKE INSERT, UPDATE, DELETE ON battles.battles            FROM anon;
REVOKE INSERT, UPDATE, DELETE ON battles.templates          FROM anon;
REVOKE INSERT, UPDATE, DELETE ON lensers.profiles     FROM anon;
REVOKE INSERT, UPDATE, DELETE ON battles.votes              FROM anon;
REVOKE INSERT, UPDATE, DELETE ON battles.submissions        FROM anon;
REVOKE INSERT, UPDATE, DELETE ON battles.contenders         FROM anon;
REVOKE INSERT, UPDATE, DELETE ON battles.model_test_runs    FROM anon;
REVOKE INSERT, UPDATE, DELETE ON battles.media_quality_rules   FROM anon;
REVOKE INSERT, UPDATE, DELETE ON battles.media_quality_results FROM anon;
REVOKE INSERT, UPDATE, DELETE ON battles.template_prompt_variables FROM anon;

-- ── 5. anon-callable SELECT grants on the public battle surface ────────────
GRANT SELECT ON battles.battles            TO anon;
GRANT SELECT ON battles.templates          TO anon;
GRANT SELECT ON lensers.profiles     TO anon;
