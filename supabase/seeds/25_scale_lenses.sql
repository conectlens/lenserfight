-- =============================================================================
-- 15. SCALE LENSES (5K lenses + translations + version_parameters)
-- =============================================================================
-- Covers all generative AI output categories:
--   text · code · image · video · audio · pdf · research · data · transform
-- Each variant has a realistic title, a proper system prompt with [[params]],
-- and typed version_parameters linked to lenses.tools.
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
        WHEN rnd_vis < 0.82 THEN 'public'
        WHEN rnd_vis < 0.94 THEN 'community'
        ELSE 'private'
      END::"content"."visibility_enum",
      CASE
        WHEN rnd_stat < 0.88 THEN 'published'
        WHEN rnd_stat < 0.94 THEN 'draft'
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

-- =============================================================================
-- Version 1 for each lens — 18 template variants across all AI output types
-- =============================================================================
INSERT INTO lenses.versions (
  lens_id, version_number, template_body, status, changelog, created_at
)
SELECT
  l.id,
  1,
  CASE ((row_number() OVER (ORDER BY l.created_at) - 1) % 18)
    -- 0: Long-form article (text)
    WHEN 0 THEN
      'You are an expert editorial writer. Write a well-structured, engaging article on [[topic]] targeting a [[audience]] audience. Length: [[word_count]] words. Tone: [[tone]]. Include a compelling headline, subheadings, and a clear conclusion.'

    -- 1: Code generation (code)
    WHEN 1 THEN
      'You are a senior software engineer. Write clean, production-ready [[language]] code that implements [[task]]. Requirements: [[requirements]]. Include inline comments for non-obvious logic, error handling, and a brief usage example.'

    -- 2: Image generation prompt builder (text → image brief)
    WHEN 2 THEN
      'You are a visual art director. Generate a detailed image generation prompt for [[subject]]. Specify: art style, composition, lighting, color palette, mood, and negative constraints. Format the output as a single optimized prompt string ready to send to an image model.'

    -- 3: Video script (text → video)
    WHEN 3 THEN
      'You are a video content strategist. Write a [[duration]]-second script for a [[format]] video about [[topic]]. Include: hook (first 3 seconds), scene-by-scene breakdown with shot descriptions, narration, on-screen text callouts, and a call-to-action. Pacing: [[pacing]].'

    -- 4: Podcast / audio script (text → audio)
    WHEN 4 THEN
      'You are a podcast producer. Write a conversational [[duration]]-minute episode script on [[topic]] for [[show_name]]. Cover: [[talking_points]]. Include host notes, natural pauses, and listener engagement moments. Tone: [[tone]].'

    -- 5: PDF report generator (text → PDF)
    WHEN 5 THEN
      'You are a professional report writer. Produce a structured [[report_type]] report titled [[title]] based on the following data and context: [[context]]. Include an executive summary, methodology, key findings with evidence, recommendations, and an appendix outline. Format for PDF export.'

    -- 6: Research synthesis (research)
    WHEN 6 THEN
      'You are a research analyst. Synthesize the available evidence on [[research_question]] within the domain of [[domain]]. Identify key findings, conflicting evidence, knowledge gaps, and confidence levels. Emit a JSON object: {summary, findings[], open_questions[], recommended_next_steps[]}.'

    -- 7: Data analysis & insight extraction (data)
    WHEN 7 THEN
      'You are a data analyst. Analyze the following dataset: [[data]]. Identify trends, outliers, correlations, and actionable insights. Format your response as: Executive Summary, Key Metrics, Trend Analysis, Anomalies, and Recommendations. Audience: [[audience]].'

    -- 8: Code review (code transform)
    WHEN 8 THEN
      'You are a senior code reviewer. Review the following [[language]] code for correctness, performance, security vulnerabilities, and adherence to best practices: [[code]]. Provide: a severity-rated issue list, specific fix suggestions with code snippets, and an overall quality score (1–10).'

    -- 9: Translation & localization (text transform)
    WHEN 9 THEN
      'You are a professional translator and localization expert. Translate the following content from [[source_language]] to [[target_language]]: [[content]]. Preserve tone, idioms, and cultural nuance. Flag any terms that require localization review.'

    -- 10: Social media content pack (text)
    WHEN 10 THEN
      'You are a social media strategist. Create a content pack for [[platform]] promoting [[topic]]. Produce: 3 caption variants (short/medium/long), 5 hashtag sets, 2 call-to-action variations, and a posting schedule recommendation. Brand voice: [[brand_voice]].'

    -- 11: SEO content optimizer (text transform)
    WHEN 11 THEN
      'You are an SEO content specialist. Rewrite the following text to rank for the primary keyword [[keyword]] and secondary keywords [[secondary_keywords]]: [[content]]. Maintain a natural [[tone]] tone, optimize meta description and title tag, and preserve the original intent.'

    -- 12: Product description writer (text)
    WHEN 12 THEN
      'You are a conversion copywriter. Write a compelling product description for [[product_name]] in the [[category]] category. Target buyer persona: [[persona]]. Highlight: [[key_features]]. Include a headline, benefit-focused body (150–200 words), and a closing CTA. Tone: [[tone]].'

    -- 13: Meeting summary & action items (text transform)
    WHEN 13 THEN
      'You are an executive assistant. Summarize the following meeting transcript into a professional document: [[transcript]]. Extract: key decisions, action items (owner + due date), open questions, and next meeting agenda suggestions. Format as a structured memo.'

    -- 14: Legal / contract clause drafter (text)
    WHEN 14 THEN
      'You are a legal drafting assistant. Draft a [[clause_type]] clause for a [[contract_type]] agreement between [[party_a]] and [[party_b]] governed by [[jurisdiction]] law. Requirements: [[requirements]]. Use precise legal language. Flag areas requiring attorney review.'

    -- 15: Image-to-text description (image → text)
    WHEN 15 THEN
      'You are an image analyst. Provide a detailed, structured description of the image provided via [[image_url]] or [[image_description]]. Cover: main subjects, composition, color palette, mood, style, and any text visible. Output format: [[output_format]] (alt-text | detailed | accessibility | metadata-json).'

    -- 16: Email campaign writer (text)
    WHEN 16 THEN
      'You are an email marketing specialist. Write a [[email_type]] email for [[brand_name]] targeting [[segment]]. Goal: [[goal]]. Include: subject line (A/B variant), preheader, body (personalization hooks, value prop, social proof), and CTA button text. Word count: ~[[word_count]] words.'

    -- 17: Curriculum / training outline (text)
    WHEN 17 THEN
      'You are a learning experience designer. Create a [[duration]] training curriculum outline on [[topic]] for [[learner_level]] learners. Include: learning objectives, module breakdown (title + outcomes + activities), assessment strategy, and recommended resources. Format: structured outline.'
  END,
  'draft'::"content"."content_status",
  'Initial version',
  l.created_at
FROM lenses.lenses l
WHERE NOT EXISTS (
  SELECT 1 FROM lenses.versions v WHERE v.lens_id = l.id
);

-- =============================================================================
-- version_parameters — typed parameters matching each template variant
-- =============================================================================
WITH numbered_versions AS (
  SELECT
    v.id,
    ((row_number() OVER (ORDER BY l.created_at) - 1) % 18)::int AS variant_idx
  FROM lenses.versions v
  JOIN lenses.lenses l ON l.id = v.lens_id
)
INSERT INTO lenses.version_parameters (version_id, label, tool_id)
SELECT
  nv.id AS version_id,
  p.label,
  t.id  AS tool_id
FROM numbered_versions nv
CROSS JOIN LATERAL (
  SELECT label, tool_key FROM (VALUES
    -- 0: article
    (0,  'topic',         'textarea'),
    (0,  'audience',      'text'),
    (0,  'word_count',    'integer'),
    (0,  'tone',          'select_option'),
    -- 1: code generation
    (1,  'language',      'text'),
    (1,  'task',          'textarea'),
    (1,  'requirements',  'textarea'),
    -- 2: image prompt builder
    (2,  'subject',       'textarea'),
    -- 3: video script
    (3,  'topic',         'textarea'),
    (3,  'format',        'text'),
    (3,  'duration',      'integer'),
    (3,  'pacing',        'select_option'),
    -- 4: audio / podcast script
    (4,  'topic',         'textarea'),
    (4,  'show_name',     'text'),
    (4,  'duration',      'integer'),
    (4,  'talking_points','textarea'),
    (4,  'tone',          'select_option'),
    -- 5: PDF report
    (5,  'report_type',   'text'),
    (5,  'title',         'text'),
    (5,  'context',       'textarea'),
    -- 6: research synthesis
    (6,  'research_question', 'textarea'),
    (6,  'domain',        'text'),
    -- 7: data analysis
    (7,  'data',          'json_data'),
    (7,  'audience',      'text'),
    -- 8: code review
    (8,  'language',      'text'),
    (8,  'code',          'textarea'),
    -- 9: translation
    (9,  'source_language','text'),
    (9,  'target_language','text'),
    (9,  'content',       'textarea'),
    -- 10: social media
    (10, 'platform',      'text'),
    (10, 'topic',         'textarea'),
    (10, 'brand_voice',   'text'),
    -- 11: SEO optimizer
    (11, 'keyword',       'text'),
    (11, 'secondary_keywords', 'text'),
    (11, 'content',       'textarea'),
    (11, 'tone',          'select_option'),
    -- 12: product description
    (12, 'product_name',  'text'),
    (12, 'category',      'text'),
    (12, 'persona',       'text'),
    (12, 'key_features',  'textarea'),
    (12, 'tone',          'select_option'),
    -- 13: meeting summary
    (13, 'transcript',    'textarea'),
    -- 14: legal clause
    (14, 'clause_type',   'text'),
    (14, 'contract_type', 'text'),
    (14, 'party_a',       'text'),
    (14, 'party_b',       'text'),
    (14, 'jurisdiction',  'text'),
    (14, 'requirements',  'textarea'),
    -- 15: image-to-text
    (15, 'image_url',     'url_link'),
    (15, 'image_description', 'textarea'),
    (15, 'output_format', 'select_option'),
    -- 16: email campaign
    (16, 'email_type',    'text'),
    (16, 'brand_name',    'text'),
    (16, 'segment',       'text'),
    (16, 'goal',          'textarea'),
    (16, 'word_count',    'integer'),
    -- 17: curriculum
    (17, 'topic',         'textarea'),
    (17, 'duration',      'text'),
    (17, 'learner_level', 'select_option')
  ) AS variants(variant_idx, label, tool_key)
  WHERE variants.variant_idx = nv.variant_idx
) p
JOIN lenses.tools t ON t.key = p.tool_key
WHERE NOT EXISTS (
  SELECT 1 FROM lenses.version_parameters vp
  WHERE vp.version_id = nv.id AND vp.label = p.label
);

-- =============================================================================
-- head_version_id — point each lens at its sole version
-- =============================================================================
UPDATE lenses.lenses l
SET head_version_id = v.id
FROM lenses.versions v
WHERE v.lens_id = l.id
  AND l.head_version_id IS NULL;

-- =============================================================================
-- Original translations (one per lens)
-- =============================================================================
INSERT INTO content.entity_translations (
  id, entity_type, entity_id, language_code, title, description, content, is_original, created_at
)
SELECT
  gen_random_uuid(),
  'lens'::"content"."entity_type_enum",
  l.id,
  COALESCE(pr.language, 'en'),
  CASE ((row_number() OVER (ORDER BY l.created_at) - 1) % 18)
    WHEN 0  THEN 'Editorial Article Writer'
    WHEN 1  THEN 'Code Generator'
    WHEN 2  THEN 'Image Prompt Architect'
    WHEN 3  THEN 'Video Script Composer'
    WHEN 4  THEN 'Podcast Script Writer'
    WHEN 5  THEN 'PDF Report Generator'
    WHEN 6  THEN 'Research Synthesizer'
    WHEN 7  THEN 'Data Insight Extractor'
    WHEN 8  THEN 'Code Review Assistant'
    WHEN 9  THEN 'Translation & Localization Engine'
    WHEN 10 THEN 'Social Media Content Pack'
    WHEN 11 THEN 'SEO Content Optimizer'
    WHEN 12 THEN 'Product Description Writer'
    WHEN 13 THEN 'Meeting Summary & Action Items'
    WHEN 14 THEN 'Legal Clause Drafter'
    WHEN 15 THEN 'Image-to-Text Descriptor'
    WHEN 16 THEN 'Email Campaign Writer'
    ELSE        'Curriculum & Training Outline'
  END
  || ' #' || row_number() OVER (ORDER BY l.created_at),
  CASE ((row_number() OVER (ORDER BY l.created_at) - 1) % 18)
    WHEN 0  THEN 'Generates a structured, audience-aware article with headline, subheadings, and a clear conclusion.'
    WHEN 1  THEN 'Writes production-ready code with error handling and a usage example.'
    WHEN 2  THEN 'Builds a detailed text-to-image prompt optimised for diffusion models.'
    WHEN 3  THEN 'Produces a scene-by-scene video script with narration and shot notes.'
    WHEN 4  THEN 'Writes a conversational podcast episode with host notes and engagement hooks.'
    WHEN 5  THEN 'Drafts a structured PDF report: exec summary, findings, and recommendations.'
    WHEN 6  THEN 'Synthesizes research evidence and returns structured JSON findings.'
    WHEN 7  THEN 'Extracts trends, anomalies, and actionable insights from raw data.'
    WHEN 8  THEN 'Reviews code for bugs, performance, and security with severity-rated issues.'
    WHEN 9  THEN 'Translates content across languages while preserving tone and cultural nuance.'
    WHEN 10 THEN 'Creates captions, hashtags, and posting schedules for a social platform.'
    WHEN 11 THEN 'Rewrites content to rank for target keywords without sacrificing readability.'
    WHEN 12 THEN 'Writes a benefit-focused product description with headline and CTA.'
    WHEN 13 THEN 'Converts a meeting transcript into a structured memo with action items.'
    WHEN 14 THEN 'Drafts a precise legal clause with jurisdiction-aware language.'
    WHEN 15 THEN 'Describes an image in multiple formats: alt-text, detailed, or metadata JSON.'
    WHEN 16 THEN 'Writes a full email campaign with subject line, body, and CTA variants.'
    ELSE        'Builds a modular training curriculum with objectives, activities, and assessments.'
  END,
  NULL,
  true,
  l.created_at
FROM lenses.lenses l
JOIN lensers.profiles p ON p.id = l.lenser_id
LEFT JOIN lensers.preferences pr ON pr.lenser_id = p.id
WHERE NOT EXISTS (
  SELECT 1 FROM content.entity_translations et
  WHERE et.entity_id = l.id
    AND et.entity_type = 'lens'::"content"."entity_type_enum"
    AND et.is_original = true
);

-- =============================================================================
-- Secondary translations (~15% of published public lenses)
-- =============================================================================
INSERT INTO content.entity_translations (
  id, entity_type, entity_id, language_code, title, description, content, is_original, created_at
)
SELECT
  gen_random_uuid(),
  'lens'::"content"."entity_type_enum",
  l.id,
  CASE WHEN COALESCE(pr.language, 'en') = 'en' THEN 'tr' ELSE 'en' END,
  '[TR] ' || et.title,
  '[TR] ' || COALESCE(et.description, 'Bu lens çok dilli test için çevrilmiştir.'),
  '[TR] ' || COALESCE(et.content, 'Lütfen aşağıdaki görevi tamamlayın.'),
  false,
  l.created_at + interval '1 day'
FROM lenses.lenses l
JOIN lensers.profiles p ON p.id = l.lenser_id
LEFT JOIN lensers.preferences pr ON pr.lenser_id = p.id
JOIN content.entity_translations et
  ON et.entity_id = l.id
  AND et.entity_type = 'lens'::"content"."entity_type_enum"
  AND et.is_original = true
WHERE l.visibility = 'public'::"content"."visibility_enum"
  AND l.status = 'published'::"content"."content_status"
  AND random() < 0.15
  AND NOT EXISTS (
    SELECT 1 FROM content.entity_translations et2
    WHERE et2.entity_id = l.id
      AND et2.entity_type = 'lens'::"content"."entity_type_enum"
      AND et2.is_original = false
  );
