-- =============================================================================
-- 13. SCALE TAGS (2,500 tags + multilingual translations)
-- =============================================================================

-- Base tags
INSERT INTO content.tags (id, slug, visibility, created_at)
SELECT
  gen_random_uuid(),
  'tag-' || lpad(gs::text, 4, '0'),
  'public'::"content"."tag_visibility_enum",
  now() - (random() * interval '180 days')
FROM generate_series(1, 2500) gs
ON CONFLICT (slug) DO NOTHING;

-- English translations for all tags
INSERT INTO content.tag_translations (id, tag_id, language_code, name, created_at)
SELECT
  gen_random_uuid(), t.id, 'en',
  initcap(replace(t.slug, '-', ' ')),
  t.created_at
FROM content.tags t
WHERE t.slug LIKE 'tag-%'
ON CONFLICT DO NOTHING;

-- Turkish translations (~60% of tags)
INSERT INTO content.tag_translations (id, tag_id, language_code, name, created_at)
SELECT
  gen_random_uuid(), t.id, 'tr',
  initcap(replace(t.slug, '-', ' ')) || ' (TR)',
  t.created_at
FROM content.tags t
WHERE t.slug LIKE 'tag-%' AND random() < 0.6
ON CONFLICT DO NOTHING;

-- Spanish translations (~40% of tags)
INSERT INTO content.tag_translations (id, tag_id, language_code, name, created_at)
SELECT
  gen_random_uuid(), t.id, 'es',
  initcap(replace(t.slug, '-', ' ')) || ' (ES)',
  t.created_at
FROM content.tags t
WHERE t.slug LIKE 'tag-%' AND random() < 0.4
ON CONFLICT DO NOTHING;

-- French translations (~30% of tags)
INSERT INTO content.tag_translations (id, tag_id, language_code, name, created_at)
SELECT
  gen_random_uuid(), t.id, 'fr',
  initcap(replace(t.slug, '-', ' ')) || ' (FR)',
  t.created_at
FROM content.tags t
WHERE t.slug LIKE 'tag-%' AND random() < 0.3
ON CONFLICT DO NOTHING;

-- German translations (~25% of tags)
INSERT INTO content.tag_translations (id, tag_id, language_code, name, created_at)
SELECT
  gen_random_uuid(), t.id, 'de',
  initcap(replace(t.slug, '-', ' ')) || ' (DE)',
  t.created_at
FROM content.tags t
WHERE t.slug LIKE 'tag-%' AND random() < 0.25
ON CONFLICT DO NOTHING;
