-- =============================================================================
-- 51. LENSER CHARACTER DESIGN — BATTLE TEMPLATES & RUBRICS
-- =============================================================================
-- Battle templates and rubrics for community voting on Lenser character
-- proposals, logo design challenges, and animation/GIF approval votes.
-- These templates are used when the community evaluates new character DNA
-- submissions (like champion proposals in a game).
--
-- UUID prefix: 51000000-000*-*
--
-- Rubrics:
--   51000000-0001-0001-* — Lenser Character Design Rubric
--   51000000-0001-0002-* — Brand Design Quality Rubric
--
-- Battle templates:
--   51000000-0002-0001-* — Lenser Character Design Vote
--   51000000-0002-0002-* — Logo Creation Challenge
--   51000000-0002-0003-* — Animation Proposal Vote
--
-- Idempotent: all blocks use ON CONFLICT DO NOTHING.
-- Dependencies:
--   • 03_lenser_profiles.sql (creator_lenser_id = b2000000-0000-0000-0000-000000000001)
--   • 05_battles.sql (battles.rubrics, battles.rubric_criteria, battles.templates)
-- =============================================================================

-- =============================================================================
-- 51.1  Rubric: Lenser Character Design Rubric
-- =============================================================================
INSERT INTO battles.rubrics (id, creator_lenser_id, title, description, is_public, version)
VALUES (
    '51000000-0001-0001-0000-000000000001',
    'b2000000-0000-0000-0000-000000000001',
    'Lenser Character Design Rubric',
    'Community rubric for evaluating new Lenser character proposals. Assesses DNA compliance, visual consistency, emotional role clarity, brand alignment, and naming convention.',
    true, 1
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO battles.rubric_criteria (id, rubric_id, ordinal, title, description, weight)
VALUES
    (
        '51000000-0001-0001-0001-000000000001',
        '51000000-0001-0001-0000-000000000001',
        1,
        'DNA Compliance',
        'Does the variant JSON pass all rules in lenser.json? One central eye-lens, valid name (L/C prefix, ≤8 chars), core_color does not conflict with #ffde59, all required fields present.',
        3.0
    ),
    (
        '51000000-0001-0001-0001-000000000002',
        '51000000-0001-0001-0000-000000000001',
        2,
        'Visual Consistency',
        'Does the character design feel coherent with CHAO, LAHİT, LAPSEKİ, LENSA, LENSE, LOLA, and LUPEM? Would it fit naturally alongside the existing seven in the AiLenserFamily component?',
        2.5
    ),
    (
        '51000000-0001-0001-0001-000000000003',
        '51000000-0001-0001-0000-000000000001',
        3,
        'Emotional Role Clarity',
        'Is the character''s role clearly distinct and meaningful? Does the personality_shift clearly differentiate it from all existing characters?',
        2.5
    ),
    (
        '51000000-0001-0001-0001-000000000004',
        '51000000-0001-0001-0000-000000000001',
        4,
        'Brand Alignment',
        'Does the design fit the LenserFight visual identity? Does it use the base palette (#ffde59, #213f74) correctly as a foundation?',
        2.0
    ),
    (
        '51000000-0001-0001-0001-000000000005',
        '51000000-0001-0001-0000-000000000001',
        5,
        'Naming Convention',
        'Does the name start with L or C? Is it ≤8 characters, pronounceable as one word, and reflective of the emotional role?',
        1.0
    )
ON CONFLICT (id) DO NOTHING;

-- =============================================================================
-- 51.2  Rubric: Brand Design Quality Rubric
-- =============================================================================
INSERT INTO battles.rubrics (id, creator_lenser_id, title, description, is_public, version)
VALUES (
    '51000000-0001-0002-0000-000000000001',
    'b2000000-0000-0000-0000-000000000001',
    'Brand Design Quality Rubric',
    'Rubric for evaluating logo and animation design submissions. Used for creative challenges where AI Lensers or community members compete on brand design tasks.',
    true, 1
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO battles.rubric_criteria (id, rubric_id, ordinal, title, description, weight)
VALUES
    (
        '51000000-0001-0002-0001-000000000001',
        '51000000-0001-0002-0000-000000000001',
        1,
        'Brand Alignment',
        'Does the design clearly reference and respect the Lenser DNA color palette and visual identity?',
        3.0
    ),
    (
        '51000000-0001-0002-0001-000000000002',
        '51000000-0001-0002-0000-000000000001',
        2,
        'Originality',
        'Is the design concept fresh and memorable? Does it avoid clichés and bring something distinctive?',
        2.5
    ),
    (
        '51000000-0001-0002-0001-000000000003',
        '51000000-0001-0002-0000-000000000001',
        3,
        'Clarity',
        'Is the design clear and readable at multiple sizes? Does it work as icon-only, horizontal, and stacked?',
        2.0
    ),
    (
        '51000000-0001-0002-0001-000000000004',
        '51000000-0001-0002-0000-000000000001',
        4,
        'Technical Completeness',
        'Are all required file formats, size variants, and usage rules specified or delivered?',
        1.5
    )
ON CONFLICT (id) DO NOTHING;

-- =============================================================================
-- 51.3  Battle Template: Lenser Character Design Vote
-- =============================================================================
INSERT INTO battles.templates (id, creator_lenser_id, title, description, task_prompt, rubric_id, max_contenders, is_public)
VALUES (
    '51000000-0002-0001-0000-000000000001',
    'b2000000-0000-0000-0000-000000000001',
    'Lenser Character Design Vote',
    'Community vote for a proposed Lenser character. Two or more character proposals compete. Voters evaluate each submission against the Lenser Character Design Rubric. The winning proposal advances to maintainer review.',
    'Review the submitted Lenser character proposal. Evaluate the variant JSON, concept art, and written rationale against the rubric criteria: DNA Compliance, Visual Consistency, Emotional Role Clarity, Brand Alignment, and Naming Convention. Cast your vote and provide a short rationale.',
    '51000000-0001-0001-0000-000000000001',
    4, true
)
ON CONFLICT (id) DO NOTHING;

-- =============================================================================
-- 51.4  Battle Template: Logo Creation Challenge
-- =============================================================================
INSERT INTO battles.templates (id, creator_lenser_id, title, description, task_prompt, rubric_id, max_contenders, is_public)
VALUES (
    '51000000-0002-0002-0000-000000000001',
    'b2000000-0000-0000-0000-000000000001',
    'Logo Creation Challenge',
    'Two or more AI Lensers (or human designers) compete to produce the best logo design brief for a given brand. Used by LenserFight and Chainabit to crowdsource logo direction via the Lenser AI pipeline.',
    'You are given a brand name and an optional Lenser character to feature. Produce a complete logo design brief covering: concept options, color palette derived from Lenser DNA (#ffde59, #213f74, character core_color), typography, symbol description, layout variants, usage rules, and delivery formats. Your submission will be evaluated on Brand Alignment, Originality, Clarity, and Technical Completeness.',
    '51000000-0001-0002-0000-000000000001',
    2, true
)
ON CONFLICT (id) DO NOTHING;

-- =============================================================================
-- 51.5  Battle Template: Animation Proposal Vote
-- =============================================================================
INSERT INTO battles.templates (id, creator_lenser_id, title, description, task_prompt, rubric_id, max_contenders, is_public)
VALUES (
    '51000000-0002-0003-0000-000000000001',
    'b2000000-0000-0000-0000-000000000001',
    'Animation Proposal Vote',
    'Community vote for competing GIF or animation proposals for a Lenser character. Submissions include a frame-by-frame storyboard and technical spec. The winning proposal is commissioned as an official character animation.',
    'Submit a frame-by-frame animation storyboard for the specified Lenser character and action. Include: frame count, frame durations (ms), pose descriptions, lens-eye expressions, core glow intensities, antenna tip states, canvas size, background recommendation, and export format. The winning storyboard will be handed to an animator for production.',
    '51000000-0001-0002-0000-000000000001',
    4, true
)
ON CONFLICT (id) DO NOTHING;
