-- =============================================================================
-- 5. BATTLE DEMO DATA
-- =============================================================================

-- 5.1  Rubric: "Code Quality Rubric"
INSERT INTO battles.rubrics (id, creator_lenser_id, title, description, is_public, version)
VALUES (
    'd4000000-0000-0000-0000-000000000001',
    'b2000000-0000-0000-0000-000000000001',
    'Code Quality Rubric',
    'Standard rubric for evaluating code submissions in battle arenas.',
    true, 1
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO battles.rubric_criteria (id, rubric_id, ordinal, title, description, weight)
VALUES
    ('e5000000-0000-0000-0000-000000000001', 'd4000000-0000-0000-0000-000000000001', 1,
     'Correctness', 'Does the solution produce the correct output for all inputs?', 3.0),
    ('e5000000-0000-0000-0000-000000000002', 'd4000000-0000-0000-0000-000000000001', 2,
     'Clarity', 'Is the code readable, well-structured, and easy to understand?', 2.0),
    ('e5000000-0000-0000-0000-000000000003', 'd4000000-0000-0000-0000-000000000001', 3,
     'Efficiency', 'Does the solution use resources wisely and avoid unnecessary complexity?', 1.5)
ON CONFLICT (id) DO NOTHING;

-- 5.2  Rubric: "Creative Writing Rubric"
INSERT INTO battles.rubrics (id, creator_lenser_id, title, description, is_public, version)
VALUES (
    'd4000000-0000-0000-0000-000000000002',
    'b2000000-0000-0000-0000-000000000001',
    'Creative Writing Rubric',
    'Rubric for evaluating creative writing and storytelling submissions.',
    true, 1
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO battles.rubric_criteria (id, rubric_id, ordinal, title, description, weight)
VALUES
    ('e5000000-0000-0000-0000-000000000004', 'd4000000-0000-0000-0000-000000000002', 1,
     'Creativity', 'How original and imaginative is the response?', 3.0),
    ('e5000000-0000-0000-0000-000000000005', 'd4000000-0000-0000-0000-000000000002', 2,
     'Coherence', 'Does the narrative flow logically and maintain consistency?', 2.0),
    ('e5000000-0000-0000-0000-000000000006', 'd4000000-0000-0000-0000-000000000002', 3,
     'Style', 'Is the language engaging, polished, and appropriate for the audience?', 2.0)
ON CONFLICT (id) DO NOTHING;


-- 5.3  Battle 1: "Code Review Challenge" — human vs AI, status = published
INSERT INTO battles.battles (
    id, creator_lenser_id, title, slug, task_prompt, rubric_id,
    status, invite_code, max_contenders,
    voting_opens_at, voting_closes_at, published_at, finalized_at,
    winner_contender_id, vote_count_a, vote_count_b, vote_count_draw
)
VALUES (
    'f6000000-0000-0000-0000-000000000001',
    'b2000000-0000-0000-0000-000000000001',
    'Code Review Challenge: FizzBuzz Reimagined',
    'code-review-fizzbuzz',
    'Write a FizzBuzz implementation in TypeScript that is both elegant and efficient. The solution should handle numbers 1 to 100 and support custom divisor-word pairs passed as configuration.',
    'd4000000-0000-0000-0000-000000000001',
    'published',
    'CRVW2026',
    2,
    '2026-03-10 00:00:00+00',
    '2026-03-12 00:00:00+00',
    '2026-03-13 00:00:00+00',
    '2026-03-12 12:00:00+00',
    NULL, -- winner set below after contenders exist
    2, 1, 0
)
ON CONFLICT (id) DO NOTHING;

-- Contenders for Battle 1
INSERT INTO battles.contenders (id, battle_id, slot, contender_type, contender_ref_id, display_name,
    actor_id, entry_mode, contender_status, joined_at)
VALUES
    ('f7000000-0000-0000-0000-000000000001', 'f6000000-0000-0000-0000-000000000001', 'A',
     'human', 'b2000000-0000-0000-0000-000000000002', 'Bob Builder',
     (SELECT id FROM actors.actors WHERE profile_id = 'b2000000-0000-0000-0000-000000000002' LIMIT 1),
     'direct', 'active', '2026-03-10 09:30:00+00'),
    ('f7000000-0000-0000-0000-000000000002', 'f6000000-0000-0000-0000-000000000001', 'B',
     'ai_model', 'c3000000-0000-0000-0000-000000000001', 'GPT-4o',
     (SELECT id FROM actors.actors WHERE ai_model_id = 'c3000000-0000-0000-0000-000000000001' LIMIT 1),
     'direct', 'active', '2026-03-10 09:30:00+00')
ON CONFLICT (id) DO NOTHING;

-- Set winner (contender A won with 2 votes)
UPDATE battles.battles
SET winner_contender_id = 'f7000000-0000-0000-0000-000000000001'
WHERE id = 'f6000000-0000-0000-0000-000000000001'
  AND winner_contender_id IS NULL;

-- Submissions for Battle 1
INSERT INTO battles.submissions (id, battle_id, contender_id, status, content_text, submitted_at)
VALUES
    ('f8000000-0000-0000-0000-000000000001',
     'f6000000-0000-0000-0000-000000000001',
     'f7000000-0000-0000-0000-000000000001',
     'submitted',
     E'type Rule = { divisor: number; word: string };\n\nfunction fizzBuzz(n: number, rules: Rule[] = [{ divisor: 3, word: ''Fizz'' }, { divisor: 5, word: ''Buzz'' }]): string[] {\n  return Array.from({ length: n }, (_, i) => {\n    const num = i + 1;\n    const result = rules\n      .filter(r => num % r.divisor === 0)\n      .map(r => r.word)\n      .join('''');\n    return result || String(num);\n  });\n}',
     '2026-03-11 10:00:00+00'),
    ('f8000000-0000-0000-0000-000000000002',
     'f6000000-0000-0000-0000-000000000001',
     'f7000000-0000-0000-0000-000000000002',
     'submitted',
     E'function fizzBuzz(n: number, config: Record<number, string> = { 3: ''Fizz'', 5: ''Buzz'' }): string[] {\n  const results: string[] = [];\n  for (let i = 1; i <= n; i++) {\n    let output = '''';\n    for (const [div, word] of Object.entries(config)) {\n      if (i % Number(div) === 0) output += word;\n    }\n    results.push(output || String(i));\n  }\n  return results;\n}',
     '2026-03-11 11:00:00+00')
ON CONFLICT (id) DO NOTHING;

-- Votes for Battle 1
INSERT INTO battles.votes (id, battle_id, voter_lenser_id, vote_value, rationale,
    voted_contender_id, is_draw, voter_actor_id, weight, is_ai_vote)
VALUES
    ('f9000000-0000-0000-0000-000000000001',
     'f6000000-0000-0000-0000-000000000001',
     'b2000000-0000-0000-0000-000000000003',
     'contender_a',
     'Type-safe approach with proper Rule type. More extensible and idiomatic TypeScript.',
     'f7000000-0000-0000-0000-000000000001', false,
     (SELECT id FROM actors.actors WHERE profile_id = 'b2000000-0000-0000-0000-000000000003' LIMIT 1),
     1.0, false),
    ('f9000000-0000-0000-0000-000000000002',
     'f6000000-0000-0000-0000-000000000001',
     'b2000000-0000-0000-0000-000000000001',
     'contender_a',
     'Functional style with Array.from is cleaner. Good use of filter+map+join chain.',
     'f7000000-0000-0000-0000-000000000001', false,
     (SELECT id FROM actors.actors WHERE profile_id = 'b2000000-0000-0000-0000-000000000001' LIMIT 1),
     1.0, false),
    ('f9000000-0000-0000-0000-000000000003',
     'f6000000-0000-0000-0000-000000000001',
     'b2000000-0000-0000-0000-000000000002',
     'contender_b',
     'Simpler Record-based config is more practical for quick use.',
     'f7000000-0000-0000-0000-000000000002', false,
     (SELECT id FROM actors.actors WHERE profile_id = 'b2000000-0000-0000-0000-000000000002' LIMIT 1),
     1.0, false)
ON CONFLICT (id) DO NOTHING;

-- Scorecards for Battle 1, Contender A (Bob)
INSERT INTO battles.scorecards (id, battle_id, contender_id, rubric_criterion_id, result, explanation)
VALUES
    ('fa000000-0000-0000-0000-000000000001',
     'f6000000-0000-0000-0000-000000000001',
     'f7000000-0000-0000-0000-000000000001',
     'e5000000-0000-0000-0000-000000000001',
     'pass', 'Solution correctly handles all FizzBuzz cases with custom rules.'),
    ('fa000000-0000-0000-0000-000000000002',
     'f6000000-0000-0000-0000-000000000001',
     'f7000000-0000-0000-0000-000000000001',
     'e5000000-0000-0000-0000-000000000002',
     'pass', 'Clean functional style with proper TypeScript types.'),
    ('fa000000-0000-0000-0000-000000000003',
     'f6000000-0000-0000-0000-000000000001',
     'f7000000-0000-0000-0000-000000000001',
     'e5000000-0000-0000-0000-000000000003',
     'pass', 'Array.from with destructuring is efficient and concise.')
ON CONFLICT (id) DO NOTHING;

-- Scorecards for Battle 1, Contender B (GPT-4o)
INSERT INTO battles.scorecards (id, battle_id, contender_id, rubric_criterion_id, result, explanation)
VALUES
    ('fa000000-0000-0000-0000-000000000004',
     'f6000000-0000-0000-0000-000000000001',
     'f7000000-0000-0000-0000-000000000002',
     'e5000000-0000-0000-0000-000000000001',
     'pass', 'Solution correctly handles FizzBuzz with config object.'),
    ('fa000000-0000-0000-0000-000000000005',
     'f6000000-0000-0000-0000-000000000001',
     'f7000000-0000-0000-0000-000000000002',
     'e5000000-0000-0000-0000-000000000002',
     'partial', 'Uses Record<number, string> which loses type safety compared to a named type.'),
    ('fa000000-0000-0000-0000-000000000006',
     'f6000000-0000-0000-0000-000000000001',
     'f7000000-0000-0000-0000-000000000002',
     'e5000000-0000-0000-0000-000000000003',
     'pass', 'Imperative loop is straightforward and efficient.')
ON CONFLICT (id) DO NOTHING;


-- 5.4  Battle 2: "Creative Writing Arena" — AI vs AI, status = open (for CLI demos)
INSERT INTO battles.battles (
    id, creator_lenser_id, title, slug, task_prompt, rubric_id,
    status, invite_code, max_contenders
)
VALUES (
    'f6000000-0000-0000-0000-000000000002',
    'b2000000-0000-0000-0000-000000000001',
    'Creative Writing Arena: The Last Lighthouse',
    'creative-writing-lighthouse',
    'Write a short story (300-500 words) about the last lighthouse keeper in a world where all navigation has become digital. Explore themes of purpose, obsolescence, and human connection.',
    'd4000000-0000-0000-0000-000000000002',
    'open',
    'CWRT2026',
    2
)
ON CONFLICT (id) DO NOTHING;

-- Contenders for Battle 2 (two AI models)
INSERT INTO battles.contenders (id, battle_id, slot, contender_type, contender_ref_id, display_name,
    actor_id, entry_mode, contender_status, joined_at)
VALUES
    ('f7000000-0000-0000-0000-000000000003', 'f6000000-0000-0000-0000-000000000002', 'A',
     'ai_model', 'c3000000-0000-0000-0000-000000000002', 'Claude Sonnet 4.6',
     (SELECT id FROM actors.actors WHERE ai_model_id = 'c3000000-0000-0000-0000-000000000002' LIMIT 1),
     'direct', 'active', now()),
    ('f7000000-0000-0000-0000-000000000004', 'f6000000-0000-0000-0000-000000000002', 'B',
     'ai_model', 'c3000000-0000-0000-0000-000000000003', 'Gemini 2.5 Flash',
     (SELECT id FROM actors.actors WHERE ai_model_id = 'c3000000-0000-0000-0000-000000000003' LIMIT 1),
     'direct', 'active', now())
ON CONFLICT (id) DO NOTHING;

-- Pending submissions for Battle 2 (awaiting AI generation)
INSERT INTO battles.submissions (id, battle_id, contender_id, status)
VALUES
    ('f8000000-0000-0000-0000-000000000003',
     'f6000000-0000-0000-0000-000000000002',
     'f7000000-0000-0000-0000-000000000003',
     'pending'),
    ('f8000000-0000-0000-0000-000000000004',
     'f6000000-0000-0000-0000-000000000002',
     'f7000000-0000-0000-0000-000000000004',
     'pending')
ON CONFLICT (id) DO NOTHING;


-- =============================================================================
-- 5.5  BATTLE TEMPLATES
-- =============================================================================

INSERT INTO battles.templates (id, creator_lenser_id, title, description, task_prompt, rubric_id, max_contenders, is_public)
VALUES
    (
        'fb100000-0000-0000-0000-000000000001',
        'b2000000-0000-0000-0000-000000000001',
        'Code Challenge Template',
        'Standard template for coding challenge battles. Includes code quality rubric.',
        'Write a solution to the following programming challenge. Your code should be correct, readable, and efficient.',
        'd4000000-0000-0000-0000-000000000001',
        2, true
    ),
    (
        'fb100000-0000-0000-0000-000000000002',
        'b2000000-0000-0000-0000-000000000001',
        'Creative Writing Template',
        'Standard template for creative writing battles. Includes creative writing rubric.',
        'Write a short story (300-500 words) on the given theme. Focus on creativity, coherence, and style.',
        'd4000000-0000-0000-0000-000000000002',
        2, true
    )
ON CONFLICT (id) DO NOTHING;


-- =============================================================================
-- 5.6  AGENT ADAPTERS
-- =============================================================================

INSERT INTO battles.agent_adapters (id, owner_lenser_id, name, adapter_type, config, is_active)
VALUES
    (
        'fc200000-0000-0000-0000-000000000001',
        'b2000000-0000-0000-0000-000000000001',
        'GPT-4o Default Adapter',
        'openai-agents',
        '{"model": "gpt-4o", "temperature": 0.7}'::jsonb,
        true
    ),
    (
        'fc200000-0000-0000-0000-000000000002',
        'b2000000-0000-0000-0000-000000000001',
        'Claude Sonnet HTTP Adapter',
        'http',
        '{"endpoint": "https://api.anthropic.com/v1/messages", "model": "claude-sonnet-4-6"}'::jsonb,
        true
    ),
    (
        'fc200000-0000-0000-0000-000000000003',
        'b2000000-0000-0000-0000-000000000002',
        'Local Ollama Adapter',
        'ollama',
        '{"model": "llama3", "host": "http://localhost:11434"}'::jsonb,
        true
    )
ON CONFLICT (id) DO NOTHING;


-- =============================================================================
-- 5.7  BATTLE EVENTS (audit trail for seed battles)
-- =============================================================================

INSERT INTO battles.events (id, battle_id, event_type, actor_id, metadata)
VALUES
    (
        'fd300000-0000-0000-0000-000000000001',
        'f6000000-0000-0000-0000-000000000001',
        'status_change',
        'b2000000-0000-0000-0000-000000000001',
        '{"from": "draft", "to": "open"}'::jsonb
    ),
    (
        'fd300000-0000-0000-0000-000000000002',
        'f6000000-0000-0000-0000-000000000001',
        'contender_joined',
        'b2000000-0000-0000-0000-000000000002',
        '{"slot": "A", "contender_type": "human"}'::jsonb
    ),
    (
        'fd300000-0000-0000-0000-000000000003',
        'f6000000-0000-0000-0000-000000000001',
        'status_change',
        'b2000000-0000-0000-0000-000000000001',
        '{"from": "voting", "to": "closed"}'::jsonb
    ),
    (
        'fd300000-0000-0000-0000-000000000004',
        'f6000000-0000-0000-0000-000000000001',
        'published',
        'b2000000-0000-0000-0000-000000000001',
        '{"from": "closed", "to": "published"}'::jsonb
    ),
    (
        'fd300000-0000-0000-0000-000000000005',
        'f6000000-0000-0000-0000-000000000002',
        'status_change',
        'b2000000-0000-0000-0000-000000000001',
        '{"from": "draft", "to": "open"}'::jsonb
    )
ON CONFLICT (id) DO NOTHING;


-- =============================================================================
-- 5.8  BATTLE INVITATIONS
-- =============================================================================

INSERT INTO battles.invitations (id, battle_id, invited_by, invited_email, invited_lenser_id, status, responded_at)
VALUES
    (
        'fe400000-0000-0000-0000-000000000001',
        'f6000000-0000-0000-0000-000000000001',
        'b2000000-0000-0000-0000-000000000001',
        'bob@lenserfight.local',
        'b2000000-0000-0000-0000-000000000002',
        'accepted',
        '2026-03-10 09:00:00+00'
    ),
    (
        'fe400000-0000-0000-0000-000000000002',
        'f6000000-0000-0000-0000-000000000002',
        'b2000000-0000-0000-0000-000000000001',
        'carol@lenserfight.local',
        'b2000000-0000-0000-0000-000000000003',
        'pending',
        NULL
    )
ON CONFLICT (id) DO NOTHING;


-- =============================================================================
-- 5.9  VOTE AGGREGATES (materialized vote summaries)
-- =============================================================================

INSERT INTO battles.vote_aggregates (battle_id, contender_id, raw_vote_count, weighted_vote_sum, draw_count, rank_position)
VALUES
    -- Battle 1: Contender A (Bob) — 2 votes, winner
    ('f6000000-0000-0000-0000-000000000001', 'f7000000-0000-0000-0000-000000000001', 2, 2.0, 0, 1),
    -- Battle 1: Contender B (GPT-4o) — 1 vote
    ('f6000000-0000-0000-0000-000000000001', 'f7000000-0000-0000-0000-000000000002', 1, 1.0, 0, 2),
    -- Battle 2: Contender A (Claude) — no votes yet
    ('f6000000-0000-0000-0000-000000000002', 'f7000000-0000-0000-0000-000000000003', 0, 0, 0, NULL),
    -- Battle 2: Contender B (Gemini) — no votes yet
    ('f6000000-0000-0000-0000-000000000002', 'f7000000-0000-0000-0000-000000000004', 0, 0, 0, NULL)
ON CONFLICT (battle_id, contender_id) DO NOTHING;
