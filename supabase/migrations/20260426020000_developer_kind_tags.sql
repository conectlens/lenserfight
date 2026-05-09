-- =============================================================================
-- Developer Kind Tags
-- =============================================================================
-- Adds kind-* tags needed by the developer and community lens templates
-- introduced in seeds 41_developer_lens_templates.sql and
-- 42_production_workflow_templates.sql.
-- Idempotent: ON CONFLICT (slug) DO NOTHING.
-- =============================================================================

INSERT INTO content.tags (slug)
VALUES
  ('kind-code'),
  ('kind-data'),
  ('kind-planning'),
  ('kind-community'),
  ('kind-documentation')
ON CONFLICT (slug) DO NOTHING;
