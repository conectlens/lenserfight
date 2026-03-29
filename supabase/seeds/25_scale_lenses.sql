-- =============================================================================
-- 15. SCALE LENSES (5K lenses + translations + version_parameters)
-- =============================================================================

DO $$
DECLARE
  batch_start int;
  batch_size  int := 5000;
  total       int := 5000;
  profile_cnt int;
BEGIN
  SELECT count(*) INTO profile_cnt FROM seed_profile_index;

  FOR batch_start IN 0..total-1 BY batch_size LOOP
    RAISE NOTICE 'lenses.lenses batch %/% ...', batch_start / batch_size + 1, total / batch_size;

    INSERT INTO lenses.lenses (
      id, lenser_id, visibility, status, created_at, updated_at
    )
    SELECT
      gen_random_uuid(),
      p.id,
      CASE
        WHEN rnd_vis < 0.85 THEN 'public'
        WHEN rnd_vis < 0.95 THEN 'community'
        ELSE 'private'
      END::"content"."visibility_enum",
      CASE
        WHEN rnd_stat < 0.90 THEN 'published'
        WHEN rnd_stat < 0.95 THEN 'draft'
        ELSE 'archived'
      END::"content"."content_status",
      ca,
      ca + interval '30 minutes'
    FROM (
      SELECT
        gs,
        floor(profile_cnt * pow(random(), 3))::int AS author_idx,
        random() AS rnd_vis,
        random() AS rnd_stat,
        now() - (pow(random(), 1.5) * interval '365 days') AS ca
      FROM generate_series(batch_start, LEAST(batch_start + batch_size - 1, total - 1)) AS gs
    ) assignments
    JOIN seed_profile_index p ON p.idx = assignments.author_idx;
  END LOOP;
END $$;

-- Create version 1 for each lens
INSERT INTO lenses.versions (
  lens_id, version_number, template_body, status, changelog, created_at
)
SELECT
  pt.id,
  1,
  'You are a helpful assistant. ' || CASE (row_number() OVER (ORDER BY pt.created_at) % 6)
    WHEN 0 THEN 'Generate a creative short story based on the following theme: [[theme]]. Include vivid descriptions and compelling characters.'
    WHEN 1 THEN 'Review the following code for bugs, performance issues, and best practices: [[code]]. Provide specific suggestions for improvement.'
    WHEN 2 THEN 'Analyze the following dataset and provide key insights: [[data]]. Include trends, anomalies, and actionable recommendations.'
    WHEN 3 THEN 'Draft a professional email for the following situation: [[context]]. Maintain a [[tone]] tone and keep it concise.'
    WHEN 4 THEN 'Write technical documentation for the following API endpoint: [[endpoint]]. Include request/response examples and error handling.'
    ELSE        'Help me brainstorm ideas for: [[topic]]. Generate at least [[num_ideas]] creative and practical suggestions with brief explanations.'
  END,
  'draft'::"content"."content_status",
  'Initial version',
  pt.created_at
FROM lenses.lenses pt
WHERE NOT EXISTS (
  SELECT 1 FROM lenses.versions v WHERE v.lens_id = pt.id
);

-- Seed version_parameters for each version, keyed to the tools seeded in 15_lens_tools.sql
-- Each template variant gets its own set of typed parameters.
WITH numbered_versions AS (
  SELECT
    v.id,
    ((row_number() OVER (ORDER BY l.created_at) - 1) % 6)::int AS variant_idx
  FROM lenses.versions v
  JOIN lenses.lenses l ON l.id = v.lens_id
)
INSERT INTO lenses.version_parameters (version_id, label, tool_id)
SELECT
  nv.id AS version_id,
  p.label,
  t.id AS tool_id
FROM numbered_versions nv
CROSS JOIN LATERAL (
  SELECT label, tool_key FROM (VALUES
    -- variant 0: [[theme]] → textarea
    (0, 'theme',      'textarea'),
    -- variant 1: [[code]] → textarea
    (1, 'code',       'textarea'),
    -- variant 2: [[data]] → json_data
    (2, 'data',       'json_data'),
    -- variant 3: [[context]] + [[tone]] → textarea + select_option
    (3, 'context',    'textarea'),
    (3, 'tone',       'select_option'),
    -- variant 4: [[endpoint]] → text
    (4, 'endpoint',   'text'),
    -- variant 5: [[topic]] + [[num_ideas]] → textarea + integer
    (5, 'topic',      'textarea'),
    (5, 'num_ideas',  'integer')
  ) AS variants(variant_idx, label, tool_key)
  WHERE variants.variant_idx = nv.variant_idx
) p
JOIN lenses.tools t ON t.key = p.tool_key
WHERE NOT EXISTS (
  SELECT 1 FROM lenses.version_parameters vp
  WHERE vp.version_id = nv.id AND vp.label = p.label
);

-- Original translations (one per lens)
INSERT INTO content.entity_translations (
  id, entity_type, entity_id, language_code, title, description, content, is_original, created_at
)
SELECT
  gen_random_uuid(),
  'lens'::"content"."entity_type_enum",
  pt.id,
  COALESCE(pr.language, 'en'),
  'Prompt ' || row_number() OVER (ORDER BY pt.created_at) || ': '
    || CASE (row_number() OVER (ORDER BY pt.created_at) % 10)
      WHEN 0 THEN 'Generate creative story'
      WHEN 1 THEN 'Code review assistant'
      WHEN 2 THEN 'Data analysis helper'
      WHEN 3 THEN 'Email draft writer'
      WHEN 4 THEN 'Technical documentation'
      WHEN 5 THEN 'Brainstorm ideas'
      WHEN 6 THEN 'Language translator'
      WHEN 7 THEN 'Summarize article'
      WHEN 8 THEN 'Debug code snippet'
      ELSE        'Custom task lens'
    END,
  CASE WHEN random() < 0.7
    THEN 'A helpful lens for AI-assisted tasks. Use this to get started quickly.'
    ELSE NULL
  END,
  'You are a helpful assistant. ' || CASE (row_number() OVER (ORDER BY pt.created_at) % 6)
    WHEN 0 THEN 'Generate a creative short story based on the following theme: [[theme]]. Include vivid descriptions and compelling characters.'
    WHEN 1 THEN 'Review the following code for bugs, performance issues, and best practices: [[code]]. Provide specific suggestions for improvement.'
    WHEN 2 THEN 'Analyze the following dataset and provide key insights: [[data]]. Include trends, anomalies, and actionable recommendations.'
    WHEN 3 THEN 'Draft a professional email for the following situation: [[context]]. Maintain a [[tone]] tone and keep it concise.'
    WHEN 4 THEN 'Write technical documentation for the following API endpoint: [[endpoint]]. Include request/response examples and error handling.'
    ELSE        'Help me brainstorm ideas for: [[topic]]. Generate at least [[num_ideas]] creative and practical suggestions with brief explanations.'
  END,
  true,
  pt.created_at
FROM lenses.lenses pt
JOIN lensers.profiles p ON p.id = pt.lenser_id
LEFT JOIN lensers.preferences pr ON pr.lenser_id = p.id
WHERE NOT EXISTS (
  SELECT 1 FROM content.entity_translations et WHERE et.entity_id = pt.id AND et.entity_type = 'lens'::"content"."entity_type_enum" AND et.is_original = true
);

-- Secondary translations for ~15% of public lenses
INSERT INTO content.entity_translations (
  id, entity_type, entity_id, language_code, title, description, content, is_original, created_at
)
SELECT
  gen_random_uuid(),
  'lens'::"content"."entity_type_enum",
  pt.id,
  CASE WHEN COALESCE(pr.language, 'en') = 'en' THEN 'tr' ELSE 'en' END,
  '[Translated] Prompt ' || row_number() OVER (ORDER BY pt.created_at),
  '[Translated] A lens for multilingual testing.',
  '[Translated] You are a helpful assistant. Help with the following task in a clear and organized manner.',
  false,
  pt.created_at + interval '1 day'
FROM lenses.lenses pt
JOIN lensers.profiles p ON p.id = pt.lenser_id
LEFT JOIN lensers.preferences pr ON pr.lenser_id = p.id
WHERE pt.visibility = 'public'::"content"."visibility_enum"
  AND pt.status = 'published'::"content"."content_status"
  AND random() < 0.15;
