-- =============================================================================
-- OSS / local: reputation schema visibility for anon + authenticated
-- =============================================================================
-- RLS policies allow SELECT, but roles still need USAGE on the schema and
-- table-level SELECT grants (otherwise queries fail with 42501 before RLS).
-- =============================================================================

GRANT USAGE ON SCHEMA reputation TO anon, authenticated, service_role;

GRANT SELECT ON TABLE reputation.lenser_scores TO anon, authenticated, service_role;
GRANT SELECT ON TABLE reputation.contender_ratings TO anon, authenticated, service_role;
