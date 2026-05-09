-- =============================================================================
-- 4. ORGANIZATIONS 
-- =============================================================================

WITH seed_creator AS (
  SELECT id AS created_by
  FROM lensers.profiles
  ORDER BY created_at
  LIMIT 1
)
INSERT INTO organizations.organizations (
  slug,
  display_name,
  org_type,
  status,
  created_by
)
SELECT v.slug, v.display_name, v.org_type, v.status, sc.created_by
FROM (
  VALUES
    ('openai', 'OpenAI', 'commercial'::organizations.org_type_enum, 'active'::organizations.status_enum),
    ('anthropic', 'Anthropic', 'commercial'::organizations.org_type_enum, 'active'::organizations.status_enum),
    ('google', 'Google', 'commercial'::organizations.org_type_enum, 'active'::organizations.status_enum),
    ('mistral', 'Mistral AI', 'commercial'::organizations.org_type_enum, 'active'::organizations.status_enum),
    ('local-ollama', 'Local / Ollama', 'commercial'::organizations.org_type_enum, 'active'::organizations.status_enum)
) AS v(slug, display_name, org_type, status)
CROSS JOIN seed_creator sc
ON CONFLICT (slug) DO UPDATE
SET
  display_name = EXCLUDED.display_name,
  org_type = EXCLUDED.org_type,
  status = EXCLUDED.status;
