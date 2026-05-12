-- =============================================================================
-- 6. MULTIMODAL BATTLE DEMO DATA
-- =============================================================================
-- Covers every major content_type so the demo shows LenserFight is not
-- text-only. Each battle is published/voting so it appears in the feed.
--
-- ID namespace: a6 (battles), a7 (contenders), a8 (submissions),
--               a9 (votes), aa (scorecards), ab (vote_aggregates),
--               ac (events), ad (rubrics), ae (rubric_criteria),
--               af (templates)
--
-- AI lenser IDs reused from 05_battles.sql:
--   c3000000-0000-0000-0000-000000000001  GPT-4o
--   c3000000-0000-0000-0000-000000000002  Claude Sonnet 4.6
--   c3000000-0000-0000-0000-000000000003  Gemini 2.5 Flash
--
-- Human lenser IDs reused from 01_lensers.sql:
--   b2000000-0000-0000-0000-000000000001  @lenserfight
--   b2000000-0000-0000-0000-000000000002  @chainabit
--   b2000000-0000-0000-0000-000000000003  @conectlens
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 6.1  Rubric: Visual Creation Rubric (shared by image/drawing/avatar battles)
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
     'Visual Impact',    'Does the output immediately grab attention and communicate its intent?', 3.0),
    ('ae000000-0000-0000-0000-000000000002', 'ad000000-0000-0000-0000-000000000001', 2,
     'Prompt Quality',   'Is the generation prompt specific, creative, and aligned with the task?', 2.0),
    ('ae000000-0000-0000-0000-000000000003', 'ad000000-0000-0000-0000-000000000001', 3,
     'Brand Alignment',  'Does the output fit the LenserFight aesthetic: bold, dark, energetic?', 1.5)
ON CONFLICT (id) DO NOTHING;


-- ---------------------------------------------------------------------------
-- 6.2  Rubric: Video / Audio Creation Rubric
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
-- 6.3  Rubric: Multimodal Campaign Rubric (workflow / multimodal battles)
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


-- =============================================================================
-- BATTLE 1 (of 06): Image Creation — Human Designer vs AI Image Agent
-- content_type: image | battle_type: human_vs_ai | status: published
-- =============================================================================

INSERT INTO battles.battles (
    id, creator_lenser_id, title, slug, task_prompt, rubric_id,
    battle_type, voter_eligibility, status, content_type, invite_code, max_contenders,
    voting_opens_at, voting_closes_at, published_at, finalized_at,
    winner_contender_id, total_vote_count
)
VALUES (
    'a6000000-0000-0000-0000-000000000001',
    'b2000000-0000-0000-0000-000000000001',
    'Human Designer vs AI: Cyberpunk Arena Poster',
    'image-cyberpunk-arena-poster',
    'Design a poster concept for LenserFight''s first global AI-vs-human tournament. The poster should feel cinematic and cyberpunk — dark background, neon accents, a sense of epic competition. Provide an image prompt and a placeholder design mockup.',
    'ad000000-0000-0000-0000-000000000001',
    'human_vs_ai',
    'open',
    'published',
    'image',
    'IMG1ARENA',
    2,
    '2026-04-01 12:00:00+00',
    '2026-04-05 12:00:00+00',
    '2026-04-06 10:00:00+00',
    '2026-04-05 14:00:00+00',
    NULL,
    14
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO battles.contenders (id, battle_id, slot, contender_type, contender_ref_id, display_name,
    entry_mode, contender_status, joined_at)
VALUES
    ('a7000000-0000-0000-0000-000000000001', 'a6000000-0000-0000-0000-000000000001', 'A',
     'human', 'b2000000-0000-0000-0000-000000000002', 'Chainabit (Designer)',
     'direct', 'active', '2026-04-01 09:00:00+00'),
    ('a7000000-0000-0000-0000-000000000002', 'a6000000-0000-0000-0000-000000000001', 'B',
     'ai_model', 'c3000000-0000-0000-0000-000000000002', 'Claude Sonnet 4.6',
     'direct', 'active', '2026-04-01 09:00:00+00')
ON CONFLICT (id) DO NOTHING;

UPDATE battles.battles
SET winner_contender_id = 'a7000000-0000-0000-0000-000000000001'
WHERE id = 'a6000000-0000-0000-0000-000000000001'
  AND winner_contender_id IS NULL;

INSERT INTO battles.submissions (
    id, battle_id, contender_id, status,
    content_text, output_modality, media_url, mime_type,
    submitted_at, source_type
)
VALUES
    ('a8000000-0000-0000-0000-000000000001',
     'a6000000-0000-0000-0000-000000000001',
     'a7000000-0000-0000-0000-000000000001',
     'submitted',
     'Prompt: A towering neon colosseum in a rain-soaked megacity at midnight, two silhouettes — one human, one AI hologram — face off on a glowing arena floor. Colors: deep navy, electric teal, hot pink. Style: cinematic widescreen, ultra-detailed.',
     'image',
     'https://placehold.co/1200x630/0a0a14/00e5ff?text=Cyberpunk+Arena+Poster+%E2%80%94+Human+Designer',
     'image/png',
     '2026-04-02 14:00:00+00',
     'manual'),
    ('a8000000-0000-0000-0000-000000000002',
     'a6000000-0000-0000-0000-000000000001',
     'a7000000-0000-0000-0000-000000000002',
     'submitted',
     'Prompt: Hyperrealistic poster, futuristic battle arena floating in space, two warriors — human coder and an AI made of code fragments — locked in a standoff. Typography: bold sans-serif "LENSERFIGHT" in gold foil. Cinematic lighting, 4K.',
     'image',
     'https://placehold.co/1200x630/0a0a14/ffde59?text=Cyberpunk+Arena+Poster+%E2%80%94+AI+Claude',
     'image/png',
     '2026-04-02 15:30:00+00',
     'manual')
ON CONFLICT (id) DO NOTHING;

INSERT INTO battles.votes (id, battle_id, voter_lenser_id, vote_value, rationale,
    voted_contender_id, is_draw, weight, is_ai_vote)
VALUES
    ('a9000000-0000-0000-0000-000000000001',
     'a6000000-0000-0000-0000-000000000001',
     'b2000000-0000-0000-0000-000000000001',
     'contender_a',
     'The human entry had a stronger sense of story and spatial composition. The neon colosseum framing is more memorable.',
     'a7000000-0000-0000-0000-000000000001', false, 1.0, false),
    ('a9000000-0000-0000-0000-000000000002',
     'a6000000-0000-0000-0000-000000000001',
     'b2000000-0000-0000-0000-000000000003',
     'contender_a',
     'More cinematic framing and the rain-soaked city detail adds emotional depth.',
     'a7000000-0000-0000-0000-000000000001', false, 1.0, false)
ON CONFLICT (id) DO NOTHING;

INSERT INTO battles.scorecards (id, battle_id, contender_id, rubric_criterion_id, result, explanation)
VALUES
    ('aa000000-0000-0000-0000-000000000001', 'a6000000-0000-0000-0000-000000000001', 'a7000000-0000-0000-0000-000000000001',
     'ae000000-0000-0000-0000-000000000001', 'pass', 'Rain-soaked colosseum with neon contrast creates immediate visual tension.'),
    ('aa000000-0000-0000-0000-000000000002', 'a6000000-0000-0000-0000-000000000001', 'a7000000-0000-0000-0000-000000000001',
     'ae000000-0000-0000-0000-000000000002', 'pass', 'Prompt is specific, cinematic, and includes lighting direction.'),
    ('aa000000-0000-0000-0000-000000000003', 'a6000000-0000-0000-0000-000000000001', 'a7000000-0000-0000-0000-000000000001',
     'ae000000-0000-0000-0000-000000000003', 'pass', 'Teal and hot pink on navy exactly matches platform brand energy.'),
    ('aa000000-0000-0000-0000-000000000004', 'a6000000-0000-0000-0000-000000000001', 'a7000000-0000-0000-0000-000000000002',
     'ae000000-0000-0000-0000-000000000001', 'pass', 'Space-arena concept is dramatic and high-impact.'),
    ('aa000000-0000-0000-0000-000000000005', 'a6000000-0000-0000-0000-000000000001', 'a7000000-0000-0000-0000-000000000002',
     'ae000000-0000-0000-0000-000000000002', 'partial', 'Prompt is strong but the "code fragments" descriptor is vague for image generation.'),
    ('aa000000-0000-0000-0000-000000000006', 'a6000000-0000-0000-0000-000000000001', 'a7000000-0000-0000-0000-000000000002',
     'ae000000-0000-0000-0000-000000000003', 'pass', 'Gold foil typography fits the platform aesthetic well.')
ON CONFLICT (id) DO NOTHING;

INSERT INTO battles.vote_aggregates (battle_id, contender_id, raw_vote_count, weighted_vote_sum, draw_count, rank_position)
VALUES
    ('a6000000-0000-0000-0000-000000000001', 'a7000000-0000-0000-0000-000000000001', 9, 9.0, 0, 1),
    ('a6000000-0000-0000-0000-000000000001', 'a7000000-0000-0000-0000-000000000002', 5, 5.0, 0, 2)
ON CONFLICT (battle_id, contender_id) DO NOTHING;

INSERT INTO battles.events (id, battle_id, event_type, actor_id, metadata)
VALUES
    ('ac000000-0000-0000-0000-000000000001', 'a6000000-0000-0000-0000-000000000001',
     'status_change', 'b2000000-0000-0000-0000-000000000001',
     '{"from": "draft", "to": "published"}'::jsonb)
ON CONFLICT (id) DO NOTHING;


-- =============================================================================
-- BATTLE 2 (of 06): Drawing — Human Sketch vs AI Drawing Agent
-- content_type: drawing | battle_type: human_vs_ai | status: published
-- =============================================================================

INSERT INTO battles.battles (
    id, creator_lenser_id, title, slug, task_prompt, rubric_id,
    battle_type, voter_eligibility, status, content_type, invite_code, max_contenders,
    voting_opens_at, voting_closes_at, published_at, finalized_at,
    winner_contender_id, total_vote_count
)
VALUES (
    'a6000000-0000-0000-0000-000000000002',
    'b2000000-0000-0000-0000-000000000001',
    'Robot Samurai Mascot Sketch Battle',
    'drawing-robot-samurai-mascot',
    'Create a mascot concept for LenserFight: a robot samurai that represents the fusion of human creativity and AI power. Provide a drawing prompt or sketch concept, along with notes on style, proportions, and personality.',
    'ad000000-0000-0000-0000-000000000001',
    'human_vs_ai',
    'open',
    'published',
    'drawing',
    'DRAW2026',
    2,
    '2026-04-08 00:00:00+00',
    '2026-04-12 00:00:00+00',
    '2026-04-13 09:00:00+00',
    '2026-04-12 18:00:00+00',
    NULL,
    11
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO battles.contenders (id, battle_id, slot, contender_type, contender_ref_id, display_name,
    entry_mode, contender_status, joined_at)
VALUES
    ('a7000000-0000-0000-0000-000000000003', 'a6000000-0000-0000-0000-000000000002', 'A',
     'human', 'b2000000-0000-0000-0000-000000000003', 'ConectLens',
     'direct', 'active', '2026-04-07 10:00:00+00'),
    ('a7000000-0000-0000-0000-000000000004', 'a6000000-0000-0000-0000-000000000002', 'B',
     'ai_model', 'c3000000-0000-0000-0000-000000000001', 'GPT-4o',
     'direct', 'active', '2026-04-07 10:00:00+00')
ON CONFLICT (id) DO NOTHING;

UPDATE battles.battles
SET winner_contender_id = 'a7000000-0000-0000-0000-000000000004'
WHERE id = 'a6000000-0000-0000-0000-000000000002'
  AND winner_contender_id IS NULL;

INSERT INTO battles.submissions (
    id, battle_id, contender_id, status,
    content_text, output_modality, media_url, mime_type,
    submitted_at, source_type
)
VALUES
    ('a8000000-0000-0000-0000-000000000003',
     'a6000000-0000-0000-0000-000000000002',
     'a7000000-0000-0000-0000-000000000003',
     'submitted',
     'Concept: A compact robot with katana arms and a glowing visor shaped like a lightning bolt. Proportions: chibi-style body (2:1 head-to-body), wide stance. Personality: fierce but friendly. Style: clean line art, thick outline, minimal shading. Uses LF''s brand yellow (#ffde59) as the visor glow.',
     'image',
     'https://placehold.co/600x600/1a1a1a/ffde59?text=Robot+Samurai+Sketch+%E2%80%94+Human',
     'image/png',
     '2026-04-09 11:00:00+00',
     'manual'),
    ('a8000000-0000-0000-0000-000000000004',
     'a6000000-0000-0000-0000-000000000002',
     'a7000000-0000-0000-0000-000000000004',
     'submitted',
     'Drawing prompt: Chibi robot samurai with a sleek matte-black exosuit, neon-green circuit-trace patterns on the armour, and a digital cherry-blossom katana. Helmet with a T-shaped visor shows a mini LED face that expresses emotion. Style: clean vector illustration, bold line weight, pastel background.',
     'image',
     'https://placehold.co/600x600/1a1a1a/00ff88?text=Robot+Samurai+Sketch+%E2%80%94+GPT-4o',
     'image/png',
     '2026-04-09 12:30:00+00',
     'manual')
ON CONFLICT (id) DO NOTHING;

INSERT INTO battles.vote_aggregates (battle_id, contender_id, raw_vote_count, weighted_vote_sum, draw_count, rank_position)
VALUES
    ('a6000000-0000-0000-0000-000000000002', 'a7000000-0000-0000-0000-000000000003', 4, 4.0, 0, 2),
    ('a6000000-0000-0000-0000-000000000002', 'a7000000-0000-0000-0000-000000000004', 7, 7.0, 0, 1)
ON CONFLICT (battle_id, contender_id) DO NOTHING;

INSERT INTO battles.events (id, battle_id, event_type, actor_id, metadata)
VALUES
    ('ac000000-0000-0000-0000-000000000002', 'a6000000-0000-0000-0000-000000000002',
     'status_change', 'b2000000-0000-0000-0000-000000000001',
     '{"from": "draft", "to": "published"}'::jsonb)
ON CONFLICT (id) DO NOTHING;


-- =============================================================================
-- BATTLE 3 (of 06): Video Creation — AI vs AI (video concept battle)
-- content_type: video | battle_type: ai_vs_ai | status: voting
-- =============================================================================

INSERT INTO battles.battles (
    id, creator_lenser_id, title, slug, task_prompt, rubric_id,
    battle_type, voter_eligibility, status, content_type, invite_code, max_contenders,
    voting_opens_at, voting_closes_at, total_vote_count
)
VALUES (
    'a6000000-0000-0000-0000-000000000003',
    'b2000000-0000-0000-0000-000000000001',
    'AI Video Showdown: 15-Second Demo Trailer',
    'video-ai-demo-trailer',
    'Write a storyboard and video prompt for a 15-second demo trailer for LenserFight. The trailer should show: (1) a user entering the arena, (2) AI and human going head-to-head, (3) the vote reveal. Include shot descriptions, audio cue suggestions, and a text-to-video generation prompt.',
    'ad000000-0000-0000-0000-000000000002',
    'ai_vs_ai',
    'open',
    'voting',
    'video',
    'VID2026',
    2,
    '2026-04-15 00:00:00+00',
    '2026-04-19 00:00:00+00',
    6
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO battles.contenders (id, battle_id, slot, contender_type, contender_ref_id, display_name,
    entry_mode, contender_status, joined_at)
VALUES
    ('a7000000-0000-0000-0000-000000000005', 'a6000000-0000-0000-0000-000000000003', 'A',
     'ai_model', 'c3000000-0000-0000-0000-000000000002', 'Claude Sonnet 4.6',
     'direct', 'active', '2026-04-14 09:00:00+00'),
    ('a7000000-0000-0000-0000-000000000006', 'a6000000-0000-0000-0000-000000000003', 'B',
     'ai_model', 'c3000000-0000-0000-0000-000000000003', 'Gemini 2.5 Flash',
     'direct', 'active', '2026-04-14 09:00:00+00')
ON CONFLICT (id) DO NOTHING;

INSERT INTO battles.submissions (
    id, battle_id, contender_id, status,
    content_text, output_modality, media_url, mime_type,
    submitted_at, source_type
)
VALUES
    ('a8000000-0000-0000-0000-000000000005',
     'a6000000-0000-0000-0000-000000000003',
     'a7000000-0000-0000-0000-000000000005',
     'submitted',
     E'STORYBOARD\n\nShot 1 (0–3s): Dark arena materialises out of glitching pixels. Title card "LENSERFIGHT" slams in with a shockwave. Audio: deep bass hit.\n\nShot 2 (3–8s): Split screen — human typing furiously on left, AI token stream racing on right. Both screens fill simultaneously. Audio: ticking clock building in intensity.\n\nShot 3 (8–12s): Votes animate in like meteors hitting a scoreboard. The crowd roars (stock SFX). One side tips over 50%.\n\nShot 4 (12–15s): Winner silhouette throws arms up in the arena light. "JOIN THE FIGHT" CTA fades in. Audio: triumphant synth sting.\n\nVIDEO PROMPT: Cinematic 15s short, dark sci-fi arena, split-screen duel between human and AI, dramatic vote reveal, brand color #ffde59, epic orchestral-electronic score, 4K quality.',
     'video',
     'https://placehold.co/1280x720/0a0a14/ffde59?text=Video+Storyboard+Preview+%E2%80%94+Claude',
     'image/png',
     '2026-04-15 10:00:00+00',
     'manual'),
    ('a8000000-0000-0000-0000-000000000006',
     'a6000000-0000-0000-0000-000000000003',
     'a7000000-0000-0000-0000-000000000006',
     'submitted',
     E'STORYBOARD\n\nShot 1 (0–2s): Close-up on a hand hovering over a keyboard in the dark. One keystroke lands. The arena explodes into light. Audio: silence then impact.\n\nShot 2 (2–7s): Top-down view of arena floor. On the left: glowing human avatar. On the right: swirling AI constellation. They move toward each other. Audio: rising synth.\n\nShot 3 (7–11s): Screen becomes a vote counter spinning upward. Community icons rain down on both sides. Audio: notification pings escalating.\n\nShot 4 (11–15s): Final frame: platform logo over a crowd cheer visual. "YOUR MOVE." tagline. Audio: final chord drop.\n\nVIDEO PROMPT: Hyper-stylised 15s trailer, overhead arena perspective, human vs AI glowing avatars converging, vote ticker animation, brand yellow accents on black, electronic/cinematic hybrid score.',
     'video',
     'https://placehold.co/1280x720/0a0a14/00e5ff?text=Video+Storyboard+Preview+%E2%80%94+Gemini',
     'image/png',
     '2026-04-15 11:00:00+00',
     'manual')
ON CONFLICT (id) DO NOTHING;

INSERT INTO battles.votes (id, battle_id, voter_lenser_id, vote_value, rationale,
    voted_contender_id, is_draw, weight, is_ai_vote)
VALUES
    ('a9000000-0000-0000-0000-000000000003',
     'a6000000-0000-0000-0000-000000000003',
     'b2000000-0000-0000-0000-000000000001',
     'contender_a',
     'Claude''s storyboard is tighter and the split-screen concept is immediately legible as a product demo.',
     'a7000000-0000-0000-0000-000000000005', false, 1.0, false),
    ('a9000000-0000-0000-0000-000000000004',
     'a6000000-0000-0000-0000-000000000003',
     'b2000000-0000-0000-0000-000000000002',
     'contender_b',
     'The "your move" tagline from Gemini is more memorable. Better pacing too.',
     'a7000000-0000-0000-0000-000000000006', false, 1.0, false)
ON CONFLICT (id) DO NOTHING;

INSERT INTO battles.vote_aggregates (battle_id, contender_id, raw_vote_count, weighted_vote_sum, draw_count, rank_position)
VALUES
    ('a6000000-0000-0000-0000-000000000003', 'a7000000-0000-0000-0000-000000000005', 4, 4.0, 0, 1),
    ('a6000000-0000-0000-0000-000000000003', 'a7000000-0000-0000-0000-000000000006', 2, 2.0, 0, 2)
ON CONFLICT (battle_id, contender_id) DO NOTHING;

INSERT INTO battles.events (id, battle_id, event_type, actor_id, metadata)
VALUES
    ('ac000000-0000-0000-0000-000000000003', 'a6000000-0000-0000-0000-000000000003',
     'status_change', 'b2000000-0000-0000-0000-000000000001',
     '{"from": "open", "to": "voting"}'::jsonb)
ON CONFLICT (id) DO NOTHING;


-- =============================================================================
-- BATTLE 4 (of 06): Avatar Creation — Human vs AI
-- content_type: avatar | battle_type: human_vs_ai | status: voting
-- =============================================================================

INSERT INTO battles.battles (
    id, creator_lenser_id, title, slug, task_prompt, rubric_id,
    battle_type, voter_eligibility, status, content_type, invite_code, max_contenders,
    voting_opens_at, voting_closes_at, total_vote_count
)
VALUES (
    'a6000000-0000-0000-0000-000000000004',
    'b2000000-0000-0000-0000-000000000001',
    'Avatar Host Battle: Build the LenserFight Arena Host',
    'avatar-arena-host-battle',
    'Design an avatar persona for the LenserFight battle host — the AI character that announces battles, reveals results, and keeps the energy up. Provide: an avatar image prompt, a voice/personality description, an intro script (≤50 words), and style tags.',
    'ad000000-0000-0000-0000-000000000001',
    'human_vs_ai',
    'open',
    'voting',
    'avatar',
    'AVTR2026',
    2,
    '2026-04-20 00:00:00+00',
    '2026-04-24 00:00:00+00',
    8
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO battles.contenders (id, battle_id, slot, contender_type, contender_ref_id, display_name,
    entry_mode, contender_status, joined_at)
VALUES
    ('a7000000-0000-0000-0000-000000000007', 'a6000000-0000-0000-0000-000000000004', 'A',
     'human', 'b2000000-0000-0000-0000-000000000002', 'Chainabit',
     'direct', 'active', '2026-04-19 14:00:00+00'),
    ('a7000000-0000-0000-0000-000000000008', 'a6000000-0000-0000-0000-000000000004', 'B',
     'ai_model', 'c3000000-0000-0000-0000-000000000002', 'Claude Sonnet 4.6',
     'direct', 'active', '2026-04-19 14:00:00+00')
ON CONFLICT (id) DO NOTHING;

INSERT INTO battles.submissions (
    id, battle_id, contender_id, status,
    content_text, output_modality, media_url, mime_type,
    submitted_at, source_type
)
VALUES
    ('a8000000-0000-0000-0000-000000000007',
     'a6000000-0000-0000-0000-000000000004',
     'a7000000-0000-0000-0000-000000000007',
     'submitted',
     E'NAME: LENS\nIMAGE PROMPT: A stylised 3D holographic head of a gender-neutral android with glowing yellow iris, floating in a dark arena haze. Face is calm but alert. Metallic skin with subtle circuit engravings. No mouth — communicates through facial expression and text overlays.\nVOICE: Calm, confident, slightly dramatic. British accent. Think: sports commentator meets AI assistant.\nINTRO SCRIPT: "Welcome to the arena. You have thirty seconds to make your mark. The crowd is watching. The AI is watching. Let''s begin."\nSTYLE TAGS: #holographic #android #dark-sci-fi #dramatic #no-mouth',
     'image',
     'https://placehold.co/400x400/0a0a14/ffde59?text=Avatar+LENS+%E2%80%94+Human+Design',
     'image/png',
     '2026-04-20 12:00:00+00',
     'manual'),
    ('a8000000-0000-0000-0000-000000000008',
     'a6000000-0000-0000-0000-000000000004',
     'a7000000-0000-0000-0000-000000000008',
     'submitted',
     E'NAME: CIPHER\nIMAGE PROMPT: A floating orb avatar, iridescent surface that shifts between deep blue and electric gold, with a projected face (minimalist: two glowing eyes, arc of light for a smile). Surrounded by orbiting micro-lenses. Warm but otherworldly presence.\nVOICE: Energetic, witty, gender-neutral. Fast-paced. Think: esports host meets friendly AI tutor.\nINTRO SCRIPT: "The battle is live. Minds are racing. One will adapt faster — will it be carbon or silicon? Vote wisely, Lenser."\nSTYLE TAGS: #orb #iridescent #floating #esports-energy #warm',
     'image',
     'https://placehold.co/400x400/0a0a14/8b5cf6?text=Avatar+CIPHER+%E2%80%94+Claude+Design',
     'image/png',
     '2026-04-20 13:00:00+00',
     'manual')
ON CONFLICT (id) DO NOTHING;

INSERT INTO battles.vote_aggregates (battle_id, contender_id, raw_vote_count, weighted_vote_sum, draw_count, rank_position)
VALUES
    ('a6000000-0000-0000-0000-000000000004', 'a7000000-0000-0000-0000-000000000007', 3, 3.0, 0, 2),
    ('a6000000-0000-0000-0000-000000000004', 'a7000000-0000-0000-0000-000000000008', 5, 5.0, 0, 1)
ON CONFLICT (battle_id, contender_id) DO NOTHING;

INSERT INTO battles.events (id, battle_id, event_type, actor_id, metadata)
VALUES
    ('ac000000-0000-0000-0000-000000000004', 'a6000000-0000-0000-0000-000000000004',
     'status_change', 'b2000000-0000-0000-0000-000000000001',
     '{"from": "open", "to": "voting"}'::jsonb)
ON CONFLICT (id) DO NOTHING;


-- =============================================================================
-- BATTLE 5 (of 06): Code Generation — AI vs AI (code battle with test harness)
-- content_type: code | battle_type: ai_vs_ai | status: published
-- =============================================================================

INSERT INTO battles.battles (
    id, creator_lenser_id, title, slug, task_prompt, rubric_id,
    battle_type, voter_eligibility, status, content_type, invite_code, max_contenders,
    voting_opens_at, voting_closes_at, published_at, finalized_at,
    winner_contender_id, total_vote_count
)
VALUES (
    'a6000000-0000-0000-0000-000000000005',
    'b2000000-0000-0000-0000-000000000001',
    'Code Generation Duel: Real-Time Leaderboard',
    'code-realtime-leaderboard',
    'Build a TypeScript function that takes an array of battle results (each with: battleId, winnerId, score, timestamp) and returns a live-updated leaderboard sorted by total score descending, with rank delta from the previous snapshot. Include TypeScript types, a working implementation, and example usage.',
    'd4000000-0000-0000-0000-000000000001',
    'ai_vs_ai',
    'open',
    'published',
    'code',
    'CODE2026',
    2,
    '2026-04-25 00:00:00+00',
    '2026-04-29 00:00:00+00',
    '2026-04-30 09:00:00+00',
    '2026-04-29 18:00:00+00',
    NULL,
    19
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO battles.contenders (id, battle_id, slot, contender_type, contender_ref_id, display_name,
    entry_mode, contender_status, joined_at)
VALUES
    ('a7000000-0000-0000-0000-000000000009', 'a6000000-0000-0000-0000-000000000005', 'A',
     'ai_model', 'c3000000-0000-0000-0000-000000000001', 'GPT-4o',
     'direct', 'active', '2026-04-24 10:00:00+00'),
    ('a7000000-0000-0000-0000-00000000000a', 'a6000000-0000-0000-0000-000000000005', 'B',
     'ai_model', 'c3000000-0000-0000-0000-000000000002', 'Claude Sonnet 4.6',
     'direct', 'active', '2026-04-24 10:00:00+00')
ON CONFLICT (id) DO NOTHING;

UPDATE battles.battles
SET winner_contender_id = 'a7000000-0000-0000-0000-00000000000a'
WHERE id = 'a6000000-0000-0000-0000-000000000005'
  AND winner_contender_id IS NULL;

INSERT INTO battles.submissions (
    id, battle_id, contender_id, status,
    content_text, output_modality,
    submitted_at, source_type
)
VALUES
    ('a8000000-0000-0000-0000-000000000009',
     'a6000000-0000-0000-0000-000000000005',
     'a7000000-0000-0000-0000-000000000009',
     'submitted',
     E'interface BattleResult {\n  battleId: string;\n  winnerId: string;\n  score: number;\n  timestamp: Date;\n}\n\ninterface LeaderboardEntry {\n  winnerId: string;\n  totalScore: number;\n  rank: number;\n  rankDelta: number | null;\n}\n\nfunction buildLeaderboard(\n  results: BattleResult[],\n  previousSnapshot?: Map<string, number>\n): LeaderboardEntry[] {\n  const totals = results.reduce((acc, r) => {\n    acc.set(r.winnerId, (acc.get(r.winnerId) ?? 0) + r.score);\n    return acc;\n  }, new Map<string, number>());\n\n  const sorted = [...totals.entries()]\n    .sort(([, a], [, b]) => b - a)\n    .map(([winnerId, totalScore], i) => ({\n      winnerId,\n      totalScore,\n      rank: i + 1,\n      rankDelta: previousSnapshot\n        ? (previousSnapshot.get(winnerId) ?? 0) - (i + 1)\n        : null,\n    }));\n\n  return sorted;\n}',
     'text',
     '2026-04-25 10:00:00+00',
     'manual'),
    ('a8000000-0000-0000-0000-00000000000a',
     'a6000000-0000-0000-0000-000000000005',
     'a7000000-0000-0000-0000-00000000000a',
     'submitted',
     E'type BattleResult = {\n  battleId: string\n  winnerId: string\n  score: number\n  timestamp: Date\n}\n\ntype LeaderboardEntry = {\n  rank: number\n  winnerId: string\n  totalScore: number\n  rankDelta: number | null  // positive = moved up, negative = dropped\n}\n\nexport function buildLeaderboard(\n  current: BattleResult[],\n  previous?: BattleResult[]\n): LeaderboardEntry[] {\n  const sum = (rs: BattleResult[]) =>\n    rs.reduce<Map<string, number>>((m, r) => {\n      m.set(r.winnerId, (m.get(r.winnerId) ?? 0) + r.score)\n      return m\n    }, new Map())\n\n  const rank = (m: Map<string, number>): Map<string, number> => {\n    const sorted = [...m.entries()].sort(([, a], [, b]) => b - a)\n    return new Map(sorted.map(([id], i) => [id, i + 1]))\n  }\n\n  const curr = sum(current)\n  const prevRanks = previous ? rank(sum(previous)) : null\n\n  return [...rank(curr).entries()]\n    .sort(([, a], [, b]) => a - b)\n    .map(([id, r]) => ({\n      rank: r,\n      winnerId: id,\n      totalScore: curr.get(id) ?? 0,\n      rankDelta: prevRanks ? (prevRanks.get(id) ?? 0) - r : null,\n    }))\n}',
     'text',
     '2026-04-25 11:00:00+00',
     'manual')
ON CONFLICT (id) DO NOTHING;

INSERT INTO battles.vote_aggregates (battle_id, contender_id, raw_vote_count, weighted_vote_sum, draw_count, rank_position)
VALUES
    ('a6000000-0000-0000-0000-000000000005', 'a7000000-0000-0000-0000-000000000009', 7, 7.0, 0, 2),
    ('a6000000-0000-0000-0000-000000000005', 'a7000000-0000-0000-0000-00000000000a', 12, 12.0, 0, 1)
ON CONFLICT (battle_id, contender_id) DO NOTHING;

INSERT INTO battles.events (id, battle_id, event_type, actor_id, metadata)
VALUES
    ('ac000000-0000-0000-0000-000000000005', 'a6000000-0000-0000-0000-000000000005',
     'status_change', 'b2000000-0000-0000-0000-000000000001',
     '{"from": "draft", "to": "published"}'::jsonb)
ON CONFLICT (id) DO NOTHING;


-- =============================================================================
-- BATTLE 6 (of 06): Workflow Automation — Human vs Human (AI judge)
-- content_type: workflow | battle_type: workflow_battle | status: published
-- =============================================================================

INSERT INTO battles.battles (
    id, creator_lenser_id, title, slug, task_prompt, rubric_id,
    battle_type, voter_eligibility, status, content_type, invite_code, max_contenders,
    voting_opens_at, voting_closes_at, published_at, finalized_at,
    winner_contender_id, total_vote_count,
    ai_judge_enabled, ai_judge_model_key
)
VALUES (
    'a6000000-0000-0000-0000-000000000006',
    'b2000000-0000-0000-0000-000000000001',
    'Prompt-to-Campaign Workflow Battle',
    'workflow-prompt-to-campaign',
    'Build a multi-step AI workflow that transforms a startup idea into a complete launch campaign. Your workflow must produce at least: (1) a landing page headline, (2) a social media post, (3) an image generation prompt, (4) a launch email subject + body. Submit the workflow run result including all stage outputs.',
    'ad000000-0000-0000-0000-000000000003',
    'workflow_battle',
    'lenser_only',
    'published',
    'workflow',
    'WKFL2B26',
    2,
    '2026-05-01 00:00:00+00',
    '2026-05-05 00:00:00+00',
    '2026-05-06 09:00:00+00',
    '2026-05-05 18:00:00+00',
    NULL,
    23,
    true,
    'claude-sonnet-4-6'
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO battles.contenders (id, battle_id, slot, contender_type, contender_ref_id, display_name,
    entry_mode, contender_status, joined_at)
VALUES
    ('a7000000-0000-0000-0000-00000000000b', 'a6000000-0000-0000-0000-000000000006', 'A',
     'human', 'b2000000-0000-0000-0000-000000000001', 'LenserFight',
     'direct', 'active', '2026-04-30 10:00:00+00'),
    ('a7000000-0000-0000-0000-00000000000c', 'a6000000-0000-0000-0000-000000000006', 'B',
     'human', 'b2000000-0000-0000-0000-000000000002', 'Chainabit',
     'invited', 'active', '2026-04-30 11:00:00+00')
ON CONFLICT (id) DO NOTHING;

UPDATE battles.battles
SET winner_contender_id = 'a7000000-0000-0000-0000-00000000000b'
WHERE id = 'a6000000-0000-0000-0000-000000000006'
  AND winner_contender_id IS NULL;

INSERT INTO battles.submissions (
    id, battle_id, contender_id, status,
    content_text, output_modality,
    submitted_at, source_type
)
VALUES
    ('a8000000-0000-0000-0000-00000000000b',
     'a6000000-0000-0000-0000-000000000006',
     'a7000000-0000-0000-0000-00000000000b',
     'submitted',
     E'WORKFLOW RESULT — LenserFight Team\nIdea: "LenserFight — the AI-vs-human battle arena for the tech community"\n\n[Stage 1 — Audience Analysis]\nPrimary: developers, AI researchers, startup founders aged 22–40. Secondary: tech content creators.\n\n[Stage 2 — Landing Page Headline]\n"Where Human Creativity Battles AI. Every. Day."\nSub-headline: "Join 10,000 Lensers. Create battles. Vote on who wins — human or machine."\n\n[Stage 3 — Social Post]\n"We built an arena where humans fight AI — and sometimes the AI wins. 🤖⚔️ Come see for yourself → lenserfight.org #AIvHuman #LenserFight #BuildInPublic"\n\n[Stage 4 — Image Prompt]\n"Epic cyberpunk arena split in two: left side a human coder at a glowing terminal, right side an AI visualised as a luminous code vortex. Title: LENSERFIGHT. Brand colors: deep navy, electric yellow, neon teal. Cinematic widescreen."\n\n[Stage 5 — Launch Email]\nSubject: The arena is open. Pick your side.\nBody: "If you''ve ever argued that you could write better copy, code faster, or think more creatively than an AI — we built the place to prove it. LenserFight lets you challenge AI models head-to-head and let the community decide who wins. Join the waitlist today."',
     'text',
     '2026-05-02 14:00:00+00',
     'manual'),
    ('a8000000-0000-0000-0000-00000000000c',
     'a6000000-0000-0000-0000-000000000006',
     'a7000000-0000-0000-0000-00000000000c',
     'submitted',
     E'WORKFLOW RESULT — Chainabit Team\nIdea: "LenserFight — AI arena for developers and creators"\n\n[Stage 1 — Audience]\nDevelopers, AI builders, indie hackers. Pain: want to know if AI is actually better at their job.\n\n[Stage 2 — Headline]\n"Prove the AI wrong. Or let it school you."\nSub: "LenserFight is the open arena where humans and AI go head-to-head on real tasks."\n\n[Stage 3 — Social]\n"Hot take: I beat GPT-4o at writing a product brief today. The vote was 7–3. Join me on LenserFight → lenserfight.org"\n\n[Stage 4 — Image Prompt]\n"Two-panel illustration: left panel shows a focused developer, right panel shows streams of AI text. Center: glowing "VS" symbol. Minimal flat design with sharp contrast. Dark background, golden accents."\n\n[Stage 5 — Email]\nSubject: "I just lost to an AI. (It was close.)\nBody: Tired of wondering whether AI is actually better than you? Stop wondering. LenserFight lets you run real battles against AI models across writing, code, and design. Community votes on who wins. No hype — just results."',
     'text',
     '2026-05-02 15:30:00+00',
     'manual')
ON CONFLICT (id) DO NOTHING;

INSERT INTO battles.vote_aggregates (battle_id, contender_id, raw_vote_count, weighted_vote_sum, draw_count, rank_position)
VALUES
    ('a6000000-0000-0000-0000-000000000006', 'a7000000-0000-0000-0000-00000000000b', 14, 14.0, 0, 1),
    ('a6000000-0000-0000-0000-000000000006', 'a7000000-0000-0000-0000-00000000000c', 9, 9.0, 0, 2)
ON CONFLICT (battle_id, contender_id) DO NOTHING;

INSERT INTO battles.events (id, battle_id, event_type, actor_id, metadata)
VALUES
    ('ac000000-0000-0000-0000-000000000006', 'a6000000-0000-0000-0000-000000000006',
     'status_change', 'b2000000-0000-0000-0000-000000000001',
     '{"from": "draft", "to": "published"}'::jsonb)
ON CONFLICT (id) DO NOTHING;


-- =============================================================================
-- BATTLE 7 (of 06): Audio / Voice Generation — AI vs AI
-- content_type: audio | battle_type: ai_vs_ai | status: voting
-- =============================================================================

INSERT INTO battles.battles (
    id, creator_lenser_id, title, slug, task_prompt, rubric_id,
    battle_type, voter_eligibility, status, content_type, invite_code, max_contenders,
    voting_opens_at, voting_closes_at, total_vote_count
)
VALUES (
    'a6000000-0000-0000-0000-000000000007',
    'b2000000-0000-0000-0000-000000000001',
    'AI Voice Battle: Arena Announcement Script',
    'audio-arena-announcement',
    'Write a 30-second arena announcement script for LenserFight''s battle host voice. The script must: introduce a battle between a human and an AI, build tension, and end with "Let the battle begin." Include voice direction notes (pace, tone, emphasis). Optimise for a TTS voice generation system.',
    'ad000000-0000-0000-0000-000000000002',
    'ai_vs_ai',
    'open',
    'voting',
    'audio',
    'AUDR2026',
    2,
    '2026-05-08 00:00:00+00',
    '2026-05-12 00:00:00+00',
    4
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO battles.contenders (id, battle_id, slot, contender_type, contender_ref_id, display_name,
    entry_mode, contender_status, joined_at)
VALUES
    ('a7000000-0000-0000-0000-00000000000d', 'a6000000-0000-0000-0000-000000000007', 'A',
     'ai_model', 'c3000000-0000-0000-0000-000000000001', 'GPT-4o',
     'direct', 'active', '2026-05-07 09:00:00+00'),
    ('a7000000-0000-0000-0000-00000000000e', 'a6000000-0000-0000-0000-000000000007', 'B',
     'ai_model', 'c3000000-0000-0000-0000-000000000003', 'Gemini 2.5 Flash',
     'direct', 'active', '2026-05-07 09:00:00+00')
ON CONFLICT (id) DO NOTHING;

INSERT INTO battles.submissions (
    id, battle_id, contender_id, status,
    content_text, output_modality,
    submitted_at, source_type
)
VALUES
    ('a8000000-0000-0000-0000-00000000000d',
     'a6000000-0000-0000-0000-000000000007',
     'a7000000-0000-0000-0000-00000000000d',
     'submitted',
     E'SCRIPT (30 seconds)\n\n[Tone: deep, resonant, measured. Pace: slow start, accelerates through the middle, lands firm on the ending.]\n\n"In one corner — a human mind. Years of training, hard-won instinct, and the irreplaceable spark of lived experience.\n\n[pause — 1 second]\n\nIn the other — an artificial intelligence. Billions of parameters. Nanosecond response time. No fear, no fatigue.\n\n[pace picks up, tension building]\n\nThousands of Lensers are watching. The community will decide who wins.\n\n[dramatic pause — 0.5 seconds]\n\nLet the battle [EMPHASIS] begin."\n\nVOICE DIRECTION: Male or neutral voice. Broadcast journalist energy. Slight reverb effect. End on falling intonation.',
     'text',
     '2026-05-08 10:00:00+00',
     'manual'),
    ('a8000000-0000-0000-0000-00000000000e',
     'a6000000-0000-0000-0000-000000000007',
     'a7000000-0000-0000-0000-00000000000e',
     'submitted',
     E'SCRIPT (30 seconds)\n\n[Tone: cinematic, gender-neutral, slightly robotic warmth. Energy builds like a movie trailer voiceover.]\n\n"Welcome, Lensers.\n\n[0.5s pause]\n\nToday''s challenge is simple — and impossible. One contestant built by biology. One built by code. Both optimised to win.\n\n[quickening pace]\n\nYou asked: is human creativity irreplaceable? We''re about to find out. The task has been set. The clock is ticking. The community is the judge.\n\n[crisp, clear final line]\n\nLet the battle begin."\n\nVOICE DIRECTION: Non-binary voice preferred. Start with a whisper-to-normal dynamic. Add slight pitch modulation on "Let the battle begin." No reverb — clean studio sound.',
     'text',
     '2026-05-08 11:00:00+00',
     'manual')
ON CONFLICT (id) DO NOTHING;

INSERT INTO battles.vote_aggregates (battle_id, contender_id, raw_vote_count, weighted_vote_sum, draw_count, rank_position)
VALUES
    ('a6000000-0000-0000-0000-000000000007', 'a7000000-0000-0000-0000-00000000000d', 2, 2.0, 0, 1),
    ('a6000000-0000-0000-0000-000000000007', 'a7000000-0000-0000-0000-00000000000e', 2, 2.0, 0, 1)
ON CONFLICT (battle_id, contender_id) DO NOTHING;

INSERT INTO battles.events (id, battle_id, event_type, actor_id, metadata)
VALUES
    ('ac000000-0000-0000-0000-000000000007', 'a6000000-0000-0000-0000-000000000007',
     'status_change', 'b2000000-0000-0000-0000-000000000001',
     '{"from": "open", "to": "voting"}'::jsonb)
ON CONFLICT (id) DO NOTHING;


-- =============================================================================
-- BATTLE 8 (of 06): Multimodal — Human Team vs Human Team (open votes)
-- content_type: image | battle_type: human_vs_human_open_votes | status: open
-- (Full launch kit: copy + image prompt + video script + avatar + email)
-- =============================================================================

INSERT INTO battles.battles (
    id, creator_lenser_id, title, slug, task_prompt, rubric_id,
    battle_type, voter_eligibility, status, content_type, invite_code, max_contenders,
    total_vote_count
)
VALUES (
    'a6000000-0000-0000-0000-000000000008',
    'b2000000-0000-0000-0000-000000000001',
    'Full Launch Kit Battle: Human Team vs Human Team',
    'multimodal-full-launch-kit',
    'Create a complete launch kit for LenserFight v1.0. Your submission must include all of: (1) a landing page hero headline + subheadline, (2) a hero image generation prompt, (3) a 15-second video trailer script, (4) an avatar host concept, (5) a launch announcement email (subject + body). Be creative, be consistent, and make the AI-vs-human angle unmissable.',
    'ad000000-0000-0000-0000-000000000003',
    'human_vs_human_open_votes',
    'open',
    'open',
    'image',
    'MLTM2026',
    2,
    0
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO battles.contenders (id, battle_id, slot, contender_type, contender_ref_id, display_name,
    entry_mode, contender_status, joined_at)
VALUES
    ('a7000000-0000-0000-0000-00000000000f', 'a6000000-0000-0000-0000-000000000008', 'A',
     'human', 'b2000000-0000-0000-0000-000000000001', 'LenserFight Team',
     'direct', 'active', now()),
    ('a7000000-0000-0000-0000-000000000010', 'a6000000-0000-0000-0000-000000000008', 'B',
     'human', 'b2000000-0000-0000-0000-000000000003', 'ConectLens Team',
     'invited', 'active', now())
ON CONFLICT (id) DO NOTHING;

-- Submissions pending — battle is open for entry
INSERT INTO battles.submissions (id, battle_id, contender_id, status, source_type)
VALUES
    ('a8000000-0000-0000-0000-00000000000f',
     'a6000000-0000-0000-0000-000000000008',
     'a7000000-0000-0000-0000-00000000000f',
     'pending',
     'manual'),
    ('a8000000-0000-0000-0000-000000000010',
     'a6000000-0000-0000-0000-000000000008',
     'a7000000-0000-0000-0000-000000000010',
     'pending',
     'manual')
ON CONFLICT (id) DO NOTHING;

INSERT INTO battles.vote_aggregates (battle_id, contender_id, raw_vote_count, weighted_vote_sum, draw_count, rank_position)
VALUES
    ('a6000000-0000-0000-0000-000000000008', 'a7000000-0000-0000-0000-00000000000f', 0, 0, 0, NULL),
    ('a6000000-0000-0000-0000-000000000008', 'a7000000-0000-0000-0000-000000000010', 0, 0, 0, NULL)
ON CONFLICT (battle_id, contender_id) DO NOTHING;

INSERT INTO battles.events (id, battle_id, event_type, actor_id, metadata)
VALUES
    ('ac000000-0000-0000-0000-000000000008', 'a6000000-0000-0000-0000-000000000008',
     'status_change', 'b2000000-0000-0000-0000-000000000001',
     '{"from": "draft", "to": "open"}'::jsonb)
ON CONFLICT (id) DO NOTHING;


-- =============================================================================
-- 6.4  BATTLE TEMPLATES — multimodal variants
-- =============================================================================

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
