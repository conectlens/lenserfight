-- =============================================================================
-- 06 (production subset). MULTIMODAL RUBRICS AND TEMPLATES ONLY
-- =============================================================================
-- Extracted from 06_multimodal_battles.sql for the production seed manifest.
-- NOTHING in this file creates battles, contenders, submissions, votes,
-- scorecards, vote_aggregates, or events.
--
-- Includes:
--   rubrics:    Visual Creation, Video & Audio Creation, Multimodal Campaign
--   criteria:   all criteria for the three rubrics above
--   templates:  Image Creation, Video & Audio Concept, Multimodal Campaign
-- =============================================================================


-- ---------------------------------------------------------------------------
-- Rubric: Visual Creation (image, drawing, avatar battles)
-- ---------------------------------------------------------------------------
INSERT INTO battles.rubrics (id, creator_lenser_id, title, description, is_public, version)
VALUES (
    'ad000000-0000-0000-0000-000000000001',
    'b2000000-0000-0000-0000-000000000001',
    'Visual Creation Rubric',
    'Rubric for evaluating image, drawing, and avatar creation battles.',
    true, 1
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO battles.rubric_criteria (id, rubric_id, ordinal, title, description, weight)
VALUES
    ('ae000000-0000-0000-0000-000000000001', 'ad000000-0000-0000-0000-000000000001', 1,
     'Visual Impact',   'Does the output immediately grab attention and communicate its intent?', 3.0),
    ('ae000000-0000-0000-0000-000000000002', 'ad000000-0000-0000-0000-000000000001', 2,
     'Prompt Quality',  'Is the generation prompt specific, creative, and aligned with the task?', 2.0),
    ('ae000000-0000-0000-0000-000000000003', 'ad000000-0000-0000-0000-000000000001', 3,
     'Brand Alignment', 'Does the output fit the LenserFight aesthetic: bold, dark, energetic?', 1.5)
ON CONFLICT (id) DO NOTHING;


-- ---------------------------------------------------------------------------
-- Rubric: Video & Audio Creation
-- ---------------------------------------------------------------------------
INSERT INTO battles.rubrics (id, creator_lenser_id, title, description, is_public, version)
VALUES (
    'ad000000-0000-0000-0000-000000000002',
    'b2000000-0000-0000-0000-000000000001',
    'Video & Audio Creation Rubric',
    'Rubric for evaluating video concept and audio generation battles.',
    true, 1
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO battles.rubric_criteria (id, rubric_id, ordinal, title, description, weight)
VALUES
    ('ae000000-0000-0000-0000-000000000004', 'ad000000-0000-0000-0000-000000000002', 1,
     'Narrative Clarity', 'Does the concept or audio tell a clear, engaging story?', 3.0),
    ('ae000000-0000-0000-0000-000000000005', 'ad000000-0000-0000-0000-000000000002', 2,
     'Demo Value',        'Would this clip work in an actual product demo or launch video?', 2.5),
    ('ae000000-0000-0000-0000-000000000006', 'ad000000-0000-0000-0000-000000000002', 3,
     'Shareability',      'Would someone share this on social media unprompted?', 1.5)
ON CONFLICT (id) DO NOTHING;


-- ---------------------------------------------------------------------------
-- Rubric: Multimodal Campaign (workflow / multimodal battles)
-- ---------------------------------------------------------------------------
INSERT INTO battles.rubrics (id, creator_lenser_id, title, description, is_public, version)
VALUES (
    'ad000000-0000-0000-0000-000000000003',
    'b2000000-0000-0000-0000-000000000001',
    'Multimodal Campaign Rubric',
    'Rubric for workflow and multimodal creation battles that produce multiple artifact types.',
    true, 1
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO battles.rubric_criteria (id, rubric_id, ordinal, title, description, weight)
VALUES
    ('ae000000-0000-0000-0000-000000000007', 'ad000000-0000-0000-0000-000000000003', 1,
     'Completeness',  'Does the submission cover all required output types in the task?', 3.0),
    ('ae000000-0000-0000-0000-000000000008', 'ad000000-0000-0000-0000-000000000003', 2,
     'Consistency',   'Are the text, image, and other outputs stylistically coherent?', 2.5),
    ('ae000000-0000-0000-0000-000000000009', 'ad000000-0000-0000-0000-000000000003', 3,
     'Creative Lift', 'Does the output go beyond the task brief with original ideas?', 2.0)
ON CONFLICT (id) DO NOTHING;


-- ---------------------------------------------------------------------------
-- Battle templates
-- ---------------------------------------------------------------------------
INSERT INTO battles.templates (id, creator_lenser_id, title, description, task_prompt, rubric_id, max_contenders, is_public, category)
VALUES
    (
        'af000000-0000-0000-0000-000000000001',
        'b2000000-0000-0000-0000-000000000001',
        'Image Creation Template',
        'Template for image and visual creation battles. Includes visual creation rubric.',
        'Create a visual concept for the given task. Provide an image generation prompt, a style description, and a placeholder mockup image URL.',
        'ad000000-0000-0000-0000-000000000001',
        2, true, 'creative'
    ),
    (
        'af000000-0000-0000-0000-000000000002',
        'b2000000-0000-0000-0000-000000000001',
        'Video & Audio Concept Template',
        'Template for video storyboard and audio script battles. Includes video/audio rubric.',
        'Create a storyboard or audio script for the given task. Include shot descriptions or voice direction notes and a text-to-media generation prompt.',
        'ad000000-0000-0000-0000-000000000002',
        2, true, 'creative'
    ),
    (
        'af000000-0000-0000-0000-000000000003',
        'b2000000-0000-0000-0000-000000000001',
        'Multimodal Campaign Template',
        'Template for multi-output battles: produce text copy, an image prompt, a video concept, and an email. Includes multimodal rubric.',
        'Produce a complete campaign kit for the given startup or product idea. Minimum outputs: headline, image prompt, video script, launch email.',
        'ad000000-0000-0000-0000-000000000003',
        2, true, 'business'
    )
ON CONFLICT (id) DO NOTHING;
