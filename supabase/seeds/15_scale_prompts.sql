-- =============================================================================
-- 15. SCALE PROMPTS (1M prompt_templates + translations)
-- Same power-law author distribution as threads.
-- =============================================================================

DO $$
DECLARE
  batch_start int;
  batch_size  int := 50000;
  total       int := 1000000;
  profile_cnt int;
BEGIN
  SELECT count(*) INTO profile_cnt FROM seed_profile_index;

  FOR batch_start IN 0..total-1 BY batch_size LOOP
    RAISE NOTICE 'content.prompt_templates batch %/% ...', batch_start / batch_size + 1, total / batch_size;

    INSERT INTO content.prompt_templates (
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

-- Original translations (one per prompt)
INSERT INTO content.prompt_translations (
  id, prompt_id, language_code, title, description, content, is_original, created_at
)
SELECT
  gen_random_uuid(),
  pt.id,
  COALESCE(p.preferred_language, 'en'),
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
      ELSE        'Custom task prompt'
    END,
  CASE WHEN random() < 0.7
    THEN 'A helpful prompt template for AI-assisted tasks. Use this to get started quickly.'
    ELSE NULL
  END,
  'You are a helpful assistant. ' || CASE (row_number() OVER (ORDER BY pt.created_at) % 6)
    WHEN 0 THEN 'Generate a creative short story based on the following theme: {{theme}}. Include vivid descriptions and compelling characters.'
    WHEN 1 THEN 'Review the following code for bugs, performance issues, and best practices: {{code}}. Provide specific suggestions for improvement.'
    WHEN 2 THEN 'Analyze the following dataset and provide key insights: {{data}}. Include trends, anomalies, and actionable recommendations.'
    WHEN 3 THEN 'Draft a professional email for the following situation: {{context}}. Maintain a {{tone}} tone and keep it concise.'
    WHEN 4 THEN 'Write technical documentation for the following API endpoint: {{endpoint}}. Include request/response examples and error handling.'
    ELSE        'Help me brainstorm ideas for: {{topic}}. Generate at least 5 creative and practical suggestions with brief explanations.'
  END,
  true,
  pt.created_at
FROM content.prompt_templates pt
JOIN lensers.profiles p ON p.id = pt.lenser_id
WHERE NOT EXISTS (
  SELECT 1 FROM content.prompt_translations ptt WHERE ptt.prompt_id = pt.id
);

-- Secondary translations for ~15% of public prompts
INSERT INTO content.prompt_translations (
  id, prompt_id, language_code, title, description, content, is_original, created_at
)
SELECT
  gen_random_uuid(),
  pt.id,
  CASE WHEN p.preferred_language = 'en' THEN 'tr' ELSE 'en' END,
  '[Translated] Prompt ' || row_number() OVER (ORDER BY pt.created_at),
  '[Translated] A prompt template for multilingual testing.',
  '[Translated] You are a helpful assistant. Help with the following task in a clear and organized manner.',
  false,
  pt.created_at + interval '1 day'
FROM content.prompt_templates pt
JOIN lensers.profiles p ON p.id = pt.lenser_id
WHERE pt.visibility = 'public'::"content"."visibility_enum"
  AND pt.status = 'published'::"content"."content_status"
  AND random() < 0.15;
