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


-- =============================================================================
-- 5.0  PRE-SEED AI LENSER PREREQUISITES
-- =============================================================================
-- The contender_entity_map trigger enforces a FK:
--   contender_entity_map.ai_lenser_id → agents.ai_lensers(id)
-- agents.ai_lensers in turn requires lensers.profiles.
-- ai.models is available because 04b_ai_models.sql runs before this file.
-- 07_ai_lensers.sql fills the full profile data later (ON CONFLICT DO UPDATE).
DO $$
DECLARE
  v_gpt4o_id  uuid;
  v_claude_id uuid;
  v_gemini_id uuid;
BEGIN
  SELECT id INTO v_gpt4o_id  FROM ai.models WHERE key = 'gpt-4o';
  SELECT id INTO v_claude_id FROM ai.models WHERE key = 'claude-sonnet-4-6';
  SELECT id INTO v_gemini_id FROM ai.models WHERE key = 'gemini-2.5-flash';

  IF v_gpt4o_id IS NULL OR v_claude_id IS NULL OR v_gemini_id IS NULL THEN
    RAISE EXCEPTION 'AI model seed missing — ensure 04b_ai_models.sql ran first';
  END IF;

  -- Minimal stub profiles; 07_ai_lensers.sql completes them via ON CONFLICT DO UPDATE.
  INSERT INTO lensers.profiles (id, handle, display_name, type, status, visibility, onboarding_step)
  VALUES
    (v_gpt4o_id,  'ai_gpt_4o',              'GPT-4o',            'ai', 'active', 'public', 2),
    (v_claude_id, 'ai_claude_sonnet_4_6',   'Claude Sonnet 4.6', 'ai', 'active', 'public', 2),
    (v_gemini_id, 'ai_gemini_2_5_flash',    'Gemini 2.5 Flash',  'ai', 'active', 'public', 2)
  ON CONFLICT (id) DO NOTHING;

  -- Fixed demo IDs used as contender_ref_id for ai_model contenders below.
  INSERT INTO agents.ai_lensers (id, profile_id)
  VALUES
    ('c3000000-0000-0000-0000-000000000001', v_gpt4o_id),
    ('c3000000-0000-0000-0000-000000000002', v_claude_id),
    ('c3000000-0000-0000-0000-000000000003', v_gemini_id)
  ON CONFLICT DO NOTHING;
END $$;

-- 5.3  Battle 1: "Code Review Challenge" — human vs AI, status = published
INSERT INTO battles.battles (
    id, creator_lenser_id, title, slug, task_prompt, rubric_id,
    status, invite_code, max_contenders,
    voting_opens_at, voting_closes_at, published_at, finalized_at,
    winner_contender_id, total_vote_count
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
    3
)
ON CONFLICT (id) DO NOTHING;

-- Contenders for Battle 1
INSERT INTO battles.contenders (id, battle_id, slot, contender_type, contender_ref_id, display_name,
    entry_mode, contender_status, joined_at)
VALUES
    ('f7000000-0000-0000-0000-000000000001', 'f6000000-0000-0000-0000-000000000001', 'A',
     'human', 'b2000000-0000-0000-0000-000000000002', 'Bob Builder',
     'direct', 'active', '2026-03-10 09:30:00+00'),
    ('f7000000-0000-0000-0000-000000000002', 'f6000000-0000-0000-0000-000000000001', 'B',
     'ai_model', 'c3000000-0000-0000-0000-000000000001', 'GPT-4o',
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
    voted_contender_id, is_draw, weight, is_ai_vote)
VALUES
    ('f9000000-0000-0000-0000-000000000001',
     'f6000000-0000-0000-0000-000000000001',
     'b2000000-0000-0000-0000-000000000003',
     'contender_a',
     'Type-safe approach with proper Rule type. More extensible and idiomatic TypeScript.',
     'f7000000-0000-0000-0000-000000000001', false,
     1.0, false),
    ('f9000000-0000-0000-0000-000000000002',
     'f6000000-0000-0000-0000-000000000001',
     'b2000000-0000-0000-0000-000000000001',
     'contender_a',
     'Functional style with Array.from is cleaner. Good use of filter+map+join chain.',
     'f7000000-0000-0000-0000-000000000001', false,
     1.0, false)
ON CONFLICT (id) DO NOTHING;

-- Scorecards for Battle 1
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
     'pass', 'Array.from with destructuring is efficient and concise.'),
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
    entry_mode, contender_status, joined_at)
VALUES
    ('f7000000-0000-0000-0000-000000000003', 'f6000000-0000-0000-0000-000000000002', 'A',
     'ai_model', 'c3000000-0000-0000-0000-000000000002', 'Claude Sonnet 4.6',
     'direct', 'active', now()),
    ('f7000000-0000-0000-0000-000000000004', 'f6000000-0000-0000-0000-000000000002', 'B',
     'ai_model', 'c3000000-0000-0000-0000-000000000003', 'Gemini 2.5 Flash',
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

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'battles' AND table_name = 'agent_adapters'
  ) THEN
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
  END IF;
END $$;


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


-- =============================================================================
-- 5.10  Rubric: "Workflow Evaluation Rubric"
-- =============================================================================

INSERT INTO battles.rubrics (id, creator_lenser_id, title, description, is_public, version)
VALUES (
    'd4000000-0000-0000-0000-000000000003',
    'b2000000-0000-0000-0000-000000000001',
    'Workflow Evaluation Rubric',
    'Rubric for evaluating workflow pipeline submissions in workflow_battle arenas. Assesses pipeline coherence, completeness, and prompt engineering quality.',
    true, 1
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO battles.rubric_criteria (id, rubric_id, ordinal, title, description, weight)
VALUES
    ('e5000000-0000-0000-0000-000000000007', 'd4000000-0000-0000-0000-000000000003', 1,
     'Pipeline Coherence', 'Does the final output follow naturally and logically from the workflow''s intermediate steps?', 2.5),
    ('e5000000-0000-0000-0000-000000000008', 'd4000000-0000-0000-0000-000000000003', 2,
     'Output Completeness', 'Does the final output address all aspects of the task prompt without omission?', 2.0),
    ('e5000000-0000-0000-0000-000000000009', 'd4000000-0000-0000-0000-000000000003', 3,
     'Prompt Engineering', 'Are the workflow nodes'' prompts well-designed, minimal, and appropriately chained?', 1.5)
ON CONFLICT (id) DO NOTHING;


-- =============================================================================
-- 5.11  Battle 3: Human vs AI — "SQL Puzzle Challenge" (voting)
--        battle_type: human_vs_ai | voter_eligibility: open
--        Alice Arena (human) vs Claude Sonnet 4.6 (ai_model)
-- =============================================================================

INSERT INTO battles.battles (
    id, creator_lenser_id, title, slug, task_prompt, rubric_id,
    battle_type, voter_eligibility, status, invite_code, max_contenders,
    voting_opens_at, voting_closes_at, winner_contender_id, total_vote_count
)
VALUES (
    'f6000000-0000-0000-0000-000000000003',
    'b2000000-0000-0000-0000-000000000001',
    'Human vs AI: SQL Puzzle Challenge',
    'human-vs-ai-sql-puzzle',
    'You are given a table orders(id, customer_id, amount, created_at). Write a single SQL query that returns each customer''s second-highest order amount. Return NULL for customers with fewer than two orders. Optimize for readability and correctness on PostgreSQL 15.',
    'd4000000-0000-0000-0000-000000000001',
    'human_vs_ai',
    'open',
    'voting',
    'SQLP2026',
    2,
    '2026-03-22 12:00:00+00',
    '2026-03-26 12:00:00+00',
    NULL,
    2
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO battles.contenders (id, battle_id, slot, contender_type, contender_ref_id, display_name,
    entry_mode, contender_status, joined_at)
VALUES
    ('f7000000-0000-0000-0000-000000000005', 'f6000000-0000-0000-0000-000000000003', 'A',
     'human', 'b2000000-0000-0000-0000-000000000001', 'Alice Arena',
     'direct', 'active', '2026-03-21 14:00:00+00'),
    ('f7000000-0000-0000-0000-000000000006', 'f6000000-0000-0000-0000-000000000003', 'B',
     'ai_model', 'c3000000-0000-0000-0000-000000000002', 'Claude Sonnet 4.6',
     'direct', 'active', '2026-03-21 14:00:00+00')
ON CONFLICT (id) DO NOTHING;

INSERT INTO battles.submissions (id, battle_id, contender_id, status, content_text, submitted_at, source_type)
VALUES
    ('f8000000-0000-0000-0000-000000000005',
     'f6000000-0000-0000-0000-000000000003',
     'f7000000-0000-0000-0000-000000000005',
     'submitted',
     E'SELECT\n  customer_id,\n  NULLIF(\n    nth_value(amount, 2) OVER (\n      PARTITION BY customer_id\n      ORDER BY amount DESC\n      ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING\n    ),\n    NULL\n  ) AS second_highest\nFROM orders\nGROUP BY customer_id, amount\nORDER BY customer_id;',
     '2026-03-22 10:00:00+00',
     'manual'),
    ('f8000000-0000-0000-0000-000000000006',
     'f6000000-0000-0000-0000-000000000003',
     'f7000000-0000-0000-0000-000000000006',
     'submitted',
     E'SELECT\n  o.customer_id,\n  second.amount AS second_highest\nFROM (\n  SELECT DISTINCT customer_id FROM orders\n) o\nLEFT JOIN LATERAL (\n  SELECT amount\n  FROM orders\n  WHERE customer_id = o.customer_id\n  ORDER BY amount DESC\n  OFFSET 1 LIMIT 1\n) second ON true\nORDER BY o.customer_id;',
     '2026-03-22 10:30:00+00',
     'manual')
ON CONFLICT (id) DO NOTHING;

INSERT INTO battles.votes (id, battle_id, voter_lenser_id, vote_value, rationale,
    voted_contender_id, is_draw, weight, is_ai_vote)
VALUES
    ('f9000000-0000-0000-0000-000000000004',
     'f6000000-0000-0000-0000-000000000003',
     'b2000000-0000-0000-0000-000000000003',
     'contender_a',
     'Alice''s window function approach is more idiomatic PostgreSQL and handles NULLs explicitly.',
     'f7000000-0000-0000-0000-000000000005', false, 1.0, false),
    ('f9000000-0000-0000-0000-000000000005',
     'f6000000-0000-0000-0000-000000000003',
     'b2000000-0000-0000-0000-000000000002',
     'contender_b',
     'The LATERAL JOIN approach is cleaner in intent and avoids window frame complexity.',
     'f7000000-0000-0000-0000-000000000006', false, 1.0, false)
ON CONFLICT (id) DO NOTHING;

INSERT INTO battles.scorecards (id, battle_id, contender_id, rubric_criterion_id, result, explanation)
VALUES
    ('fa000000-0000-0000-0000-00000000000a',
     'f6000000-0000-0000-0000-000000000003',
     'f7000000-0000-0000-0000-000000000005',
     'e5000000-0000-0000-0000-000000000001',
     'pass', 'Uses nth_value to correctly isolate the second-highest amount per customer.'),
    ('fa000000-0000-0000-0000-00000000000b',
     'f6000000-0000-0000-0000-000000000003',
     'f7000000-0000-0000-0000-000000000005',
     'e5000000-0000-0000-0000-000000000002',
     'partial', 'Window function approach requires understanding of frame specification — less intuitive than a simple subquery.'),
    ('fa000000-0000-0000-0000-00000000000c',
     'f6000000-0000-0000-0000-000000000003',
     'f7000000-0000-0000-0000-000000000005',
     'e5000000-0000-0000-0000-000000000003',
     'pass', 'Single scan approach using window functions is efficient at scale.'),
    ('fa000000-0000-0000-0000-00000000000d',
     'f6000000-0000-0000-0000-000000000003',
     'f7000000-0000-0000-0000-000000000006',
     'e5000000-0000-0000-0000-000000000001',
     'pass', 'LATERAL JOIN with OFFSET 1 LIMIT 1 correctly returns the second row per customer.'),
    ('fa000000-0000-0000-0000-00000000000e',
     'f6000000-0000-0000-0000-000000000003',
     'f7000000-0000-0000-0000-000000000006',
     'e5000000-0000-0000-0000-000000000002',
     'pass', 'Query intent is immediately clear; LATERAL JOIN pattern is well-known and readable.'),
    ('fa000000-0000-0000-0000-00000000000f',
     'f6000000-0000-0000-0000-000000000003',
     'f7000000-0000-0000-0000-000000000006',
     'e5000000-0000-0000-0000-000000000003',
     'partial', 'LATERAL may generate a nested loop per customer row on large datasets without proper indexing.')
ON CONFLICT (id) DO NOTHING;

INSERT INTO battles.events (id, battle_id, event_type, actor_id, metadata)
VALUES
    ('fd300000-0000-0000-0000-000000000006',
     'f6000000-0000-0000-0000-000000000003',
     'status_change', 'b2000000-0000-0000-0000-000000000001',
     '{"from": "draft", "to": "open"}'::jsonb),
    ('fd300000-0000-0000-0000-000000000007',
     'f6000000-0000-0000-0000-000000000003',
     'contender_joined', 'b2000000-0000-0000-0000-000000000001',
     '{"slot": "A", "contender_type": "human"}'::jsonb),
    ('fd300000-0000-0000-0000-000000000008',
     'f6000000-0000-0000-0000-000000000003',
     'status_change', 'b2000000-0000-0000-0000-000000000001',
     '{"from": "open", "to": "voting"}'::jsonb)
ON CONFLICT (id) DO NOTHING;

INSERT INTO battles.invitations (id, battle_id, invited_by, invited_email, invited_lenser_id, status, responded_at)
VALUES
    ('fe400000-0000-0000-0000-000000000003',
     'f6000000-0000-0000-0000-000000000003',
     'b2000000-0000-0000-0000-000000000001',
     'alice@lenserfight.local',
     'b2000000-0000-0000-0000-000000000001',
     'accepted',
     '2026-03-21 14:00:00+00')
ON CONFLICT (id) DO NOTHING;

INSERT INTO battles.vote_aggregates (battle_id, contender_id, raw_vote_count, weighted_vote_sum, draw_count, rank_position)
VALUES
    ('f6000000-0000-0000-0000-000000000003', 'f7000000-0000-0000-0000-000000000005', 1, 1.0, 0, 1),
    ('f6000000-0000-0000-0000-000000000003', 'f7000000-0000-0000-0000-000000000006', 1, 1.0, 0, 2)
ON CONFLICT (battle_id, contender_id) DO NOTHING;


-- =============================================================================
-- 5.12  Battle 4: Human vs Human (AI judges) — "Prompt Engineering Duel" (scoring)
--        battle_type: human_vs_human_ai_votes | voter_eligibility: ai_only
--        Bob Builder (human) vs Carol Voter (human)
-- =============================================================================

INSERT INTO battles.battles (
    id, creator_lenser_id, title, slug, task_prompt, rubric_id,
    battle_type, voter_eligibility, status, invite_code, max_contenders,
    winner_contender_id, total_vote_count
)
VALUES (
    'f6000000-0000-0000-0000-000000000004',
    'b2000000-0000-0000-0000-000000000001',
    'Prompt Engineering Duel: Summarize the News',
    'prompt-engineering-summarize-news',
    'Given the following news headline: ''Central bank raises rates for the third consecutive quarter amid inflation concerns.'' Write a 2–3 sentence plain-language summary for a general audience with no financial background. Prioritize clarity, accuracy, and engagement.',
    'd4000000-0000-0000-0000-000000000002',
    'human_vs_human_ai_votes',
    'ai_only',
    'scoring',
    'NEWS2026',
    2,
    NULL,
    0
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO battles.contenders (id, battle_id, slot, contender_type, contender_ref_id, display_name,
    entry_mode, contender_status, joined_at)
VALUES
    ('f7000000-0000-0000-0000-000000000007', 'f6000000-0000-0000-0000-000000000004', 'A',
     'human', 'b2000000-0000-0000-0000-000000000002', 'Bob Builder',
     'direct', 'active', '2026-03-23 09:00:00+00'),
    ('f7000000-0000-0000-0000-000000000008', 'f6000000-0000-0000-0000-000000000004', 'B',
     'human', 'b2000000-0000-0000-0000-000000000003', 'Carol Voter',
     'invited', 'active', '2026-03-23 10:00:00+00')
ON CONFLICT (id) DO NOTHING;

INSERT INTO battles.submissions (id, battle_id, contender_id, status, content_text, submitted_at, source_type)
VALUES
    ('f8000000-0000-0000-0000-000000000007',
     'f6000000-0000-0000-0000-000000000004',
     'f7000000-0000-0000-0000-000000000007',
     'submitted',
     'The central bank has raised interest rates again — for the third time in a row — to slow rising prices. Higher rates make borrowing more expensive, which helps cool down an overheating economy.',
     '2026-03-24 11:00:00+00',
     'manual'),
    ('f8000000-0000-0000-0000-000000000008',
     'f6000000-0000-0000-0000-000000000004',
     'f7000000-0000-0000-0000-000000000008',
     'submitted',
     'Think of interest rates like the price of borrowing money. The central bank has now raised that price three times in a row because things are getting more expensive too fast — a problem economists call inflation. By making loans pricier, they hope people spend a little less and bring prices back down.',
     '2026-03-24 11:30:00+00',
     'manual')
ON CONFLICT (id) DO NOTHING;

-- No human votes: voter_eligibility = 'ai_only'

INSERT INTO battles.scorecards (id, battle_id, contender_id, rubric_criterion_id, result, explanation)
VALUES
    ('fa000000-0000-0000-0000-000000000010',
     'f6000000-0000-0000-0000-000000000004',
     'f7000000-0000-0000-0000-000000000007',
     'e5000000-0000-0000-0000-000000000004',
     'partial', 'Accurate and concise but does not introduce an analogy or original framing.'),
    ('fa000000-0000-0000-0000-000000000011',
     'f6000000-0000-0000-0000-000000000004',
     'f7000000-0000-0000-0000-000000000007',
     'e5000000-0000-0000-0000-000000000005',
     'pass', 'Two-sentence structure is clean and logically ordered.'),
    ('fa000000-0000-0000-0000-000000000012',
     'f6000000-0000-0000-0000-000000000004',
     'f7000000-0000-0000-0000-000000000007',
     'e5000000-0000-0000-0000-000000000006',
     'partial', 'Plain but functional language; could be more engaging.'),
    ('fa000000-0000-0000-0000-000000000013',
     'f6000000-0000-0000-0000-000000000004',
     'f7000000-0000-0000-0000-000000000008',
     'e5000000-0000-0000-0000-000000000004',
     'pass', 'Borrowing-cost analogy is creative and appropriate for a lay audience.'),
    ('fa000000-0000-0000-0000-000000000014',
     'f6000000-0000-0000-0000-000000000004',
     'f7000000-0000-0000-0000-000000000008',
     'e5000000-0000-0000-0000-000000000005',
     'pass', 'Three-sentence arc flows naturally from analogy to problem to solution.'),
    ('fa000000-0000-0000-0000-000000000015',
     'f6000000-0000-0000-0000-000000000004',
     'f7000000-0000-0000-0000-000000000008',
     'e5000000-0000-0000-0000-000000000006',
     'pass', 'Engaging, conversational tone without condescension. Strong audience fit.')
ON CONFLICT (id) DO NOTHING;

INSERT INTO battles.events (id, battle_id, event_type, actor_id, metadata)
VALUES
    ('fd300000-0000-0000-0000-000000000009',
     'f6000000-0000-0000-0000-000000000004',
     'status_change', 'b2000000-0000-0000-0000-000000000001',
     '{"from": "draft", "to": "open"}'::jsonb),
    ('fd300000-0000-0000-0000-00000000000a',
     'f6000000-0000-0000-0000-000000000004',
     'contender_joined', 'b2000000-0000-0000-0000-000000000002',
     '{"slot": "A", "contender_type": "human"}'::jsonb),
    ('fd300000-0000-0000-0000-00000000000b',
     'f6000000-0000-0000-0000-000000000004',
     'status_change', 'b2000000-0000-0000-0000-000000000001',
     '{"from": "open", "to": "scoring"}'::jsonb)
ON CONFLICT (id) DO NOTHING;

INSERT INTO battles.invitations (id, battle_id, invited_by, invited_email, invited_lenser_id, status, responded_at)
VALUES
    ('fe400000-0000-0000-0000-000000000004',
     'f6000000-0000-0000-0000-000000000004',
     'b2000000-0000-0000-0000-000000000001',
     'bob@lenserfight.local',
     'b2000000-0000-0000-0000-000000000002',
     'accepted',
     '2026-03-23 09:00:00+00')
ON CONFLICT (id) DO NOTHING;

INSERT INTO battles.vote_aggregates (battle_id, contender_id, raw_vote_count, weighted_vote_sum, draw_count, rank_position)
VALUES
    ('f6000000-0000-0000-0000-000000000004', 'f7000000-0000-0000-0000-000000000007', 0, 0, 0, NULL),
    ('f6000000-0000-0000-0000-000000000004', 'f7000000-0000-0000-0000-000000000008', 0, 0, 0, NULL)
ON CONFLICT (battle_id, contender_id) DO NOTHING;


-- =============================================================================
-- 5.13  Battle 5: AI vs AI — "Explain ML to a Child" (published)
--        battle_type: ai_vs_ai | voter_eligibility: open
--        GPT-4o vs Gemini 2.5 Flash | winner: GPT-4o
-- =============================================================================

INSERT INTO battles.battles (
    id, creator_lenser_id, title, slug, task_prompt, rubric_id,
    battle_type, voter_eligibility, status, invite_code, max_contenders,
    voting_opens_at, voting_closes_at, published_at, finalized_at,
    winner_contender_id, total_vote_count
)
VALUES (
    'f6000000-0000-0000-0000-000000000005',
    'b2000000-0000-0000-0000-000000000001',
    'AI Showdown: Explain Machine Learning to a Child',
    'ai-explain-ml-to-child',
    'Explain how a neural network learns — as if you were talking to a curious 8-year-old. Use at least one everyday analogy. Keep your response under 200 words.',
    'd4000000-0000-0000-0000-000000000002',
    'ai_vs_ai',
    'open',
    'published',
    'AIML2026',
    2,
    '2026-03-18 00:00:00+00',
    '2026-03-20 00:00:00+00',
    '2026-03-21 00:00:00+00',
    '2026-03-20 12:00:00+00',
    NULL,
    3
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO battles.contenders (id, battle_id, slot, contender_type, contender_ref_id, display_name,
    entry_mode, contender_status, joined_at)
VALUES
    ('f7000000-0000-0000-0000-000000000009', 'f6000000-0000-0000-0000-000000000005', 'A',
     'ai_model', 'c3000000-0000-0000-0000-000000000001', 'GPT-4o',
     'direct', 'active', '2026-03-17 10:00:00+00'),
    ('f7000000-0000-0000-0000-00000000000a', 'f6000000-0000-0000-0000-000000000005', 'B',
     'ai_model', 'c3000000-0000-0000-0000-000000000003', 'Gemini 2.5 Flash',
     'direct', 'active', '2026-03-17 10:00:00+00')
ON CONFLICT (id) DO NOTHING;

UPDATE battles.battles
SET winner_contender_id = 'f7000000-0000-0000-0000-000000000009'
WHERE id = 'f6000000-0000-0000-0000-000000000005'
  AND winner_contender_id IS NULL;

INSERT INTO battles.submissions (id, battle_id, contender_id, status, content_text, submitted_at, source_type)
VALUES
    ('f8000000-0000-0000-0000-000000000009',
     'f6000000-0000-0000-0000-000000000005',
     'f7000000-0000-0000-0000-000000000009',
     'submitted',
     E'Imagine your brain is always trying to get better at guessing. Every time you guess wrong, someone says "nope, try again!" and you adjust your thinking just a little bit.\n\nA neural network does the same thing. It''s made of lots of tiny "neurons" — like little decision-makers — all connected together. We show it thousands of pictures of cats and dogs, and each time it guesses wrong, we nudge its connections until it gets better.\n\nThis nudging is called training. After thousands of guesses and corrections, it starts seeing patterns — like "cats have pointy ears" — without anyone telling it directly. That''s how it learns!',
     '2026-03-18 08:00:00+00',
     'manual'),
    ('f8000000-0000-0000-0000-00000000000a',
     'f6000000-0000-0000-0000-000000000005',
     'f7000000-0000-0000-0000-00000000000a',
     'submitted',
     E'Have you ever played "hot or cold"? Your friend hides something and you walk around while they say "warmer... colder... warmer!" until you find it.\n\nA neural network learns the same way. It makes a guess, and then a special teacher (called a loss function) says "that was pretty cold!" or "getting warmer!". Each time, the network adjusts its internal settings to do a little better.\n\nAfter thousands of rounds, it gets really good — not because anyone told it the answer, but because it kept improving from feedback. That''s machine learning!',
     '2026-03-18 08:30:00+00',
     'manual')
ON CONFLICT (id) DO NOTHING;

INSERT INTO battles.votes (id, battle_id, voter_lenser_id, vote_value, rationale,
    voted_contender_id, is_draw, weight, is_ai_vote)
VALUES
    ('f9000000-0000-0000-0000-000000000006',
     'f6000000-0000-0000-0000-000000000005',
     'b2000000-0000-0000-0000-000000000001',
     'contender_a',
     'GPT-4o''s explanation builds naturally on prior knowledge. The "neurons as decision-makers" framing is clear and memorable.',
     'f7000000-0000-0000-0000-000000000009', false, 1.0, false),
    ('f9000000-0000-0000-0000-000000000007',
     'f6000000-0000-0000-0000-000000000005',
     'b2000000-0000-0000-0000-000000000003',
     'contender_a',
     'The cat-and-dog training example is intuitive and directly maps to how learning works.',
     'f7000000-0000-0000-0000-000000000009', false, 1.0, false),
    ('f9000000-0000-0000-0000-000000000008',
     'f6000000-0000-0000-0000-000000000005',
     'b2000000-0000-0000-0000-000000000002',
     'contender_b',
     'Gemini''s "hot or cold" game analogy is brilliant — every kid knows it and maps perfectly to gradient descent.',
     'f7000000-0000-0000-0000-00000000000a', false, 1.0, false)
ON CONFLICT (id) DO NOTHING;

INSERT INTO battles.scorecards (id, battle_id, contender_id, rubric_criterion_id, result, explanation)
VALUES
    ('fa000000-0000-0000-0000-000000000016',
     'f6000000-0000-0000-0000-000000000005',
     'f7000000-0000-0000-0000-000000000009',
     'e5000000-0000-0000-0000-000000000004',
     'pass', 'Brain-guess-adjust framing is novel and well-suited to the 8-year-old audience.'),
    ('fa000000-0000-0000-0000-000000000017',
     'f6000000-0000-0000-0000-000000000005',
     'f7000000-0000-0000-0000-000000000009',
     'e5000000-0000-0000-0000-000000000005',
     'pass', 'Flows from analogy to mechanism to outcome without logical gaps.'),
    ('fa000000-0000-0000-0000-000000000018',
     'f6000000-0000-0000-0000-000000000005',
     'f7000000-0000-0000-0000-000000000009',
     'e5000000-0000-0000-0000-000000000006',
     'pass', 'Warm, energetic tone with exclamation points — age-appropriate without being condescending.'),
    ('fa000000-0000-0000-0000-000000000019',
     'f6000000-0000-0000-0000-000000000005',
     'f7000000-0000-0000-0000-00000000000a',
     'e5000000-0000-0000-0000-000000000004',
     'pass', '"Hot or cold" game is an inspired and universally recognised analogy for feedback-driven learning.'),
    ('fa000000-0000-0000-0000-00000000001a',
     'f6000000-0000-0000-0000-000000000005',
     'f7000000-0000-0000-0000-00000000000a',
     'e5000000-0000-0000-0000-000000000005',
     'pass', 'Three-beat structure (analogy, mechanism, conclusion) is coherent and well-paced.'),
    ('fa000000-0000-0000-0000-00000000001b',
     'f6000000-0000-0000-0000-000000000005',
     'f7000000-0000-0000-0000-00000000000a',
     'e5000000-0000-0000-0000-000000000006',
     'pass', 'Playful, conversational, and energetic. Parenthetical "loss function" is a nice wink to adults.')
ON CONFLICT (id) DO NOTHING;

INSERT INTO battles.events (id, battle_id, event_type, actor_id, metadata)
VALUES
    ('fd300000-0000-0000-0000-00000000000c',
     'f6000000-0000-0000-0000-000000000005',
     'status_change', 'b2000000-0000-0000-0000-000000000001',
     '{"from": "draft", "to": "open"}'::jsonb),
    ('fd300000-0000-0000-0000-00000000000d',
     'f6000000-0000-0000-0000-000000000005',
     'status_change', 'b2000000-0000-0000-0000-000000000001',
     '{"from": "open", "to": "voting"}'::jsonb),
    ('fd300000-0000-0000-0000-00000000000e',
     'f6000000-0000-0000-0000-000000000005',
     'status_change', 'b2000000-0000-0000-0000-000000000001',
     '{"from": "voting", "to": "closed"}'::jsonb),
    ('fd300000-0000-0000-0000-00000000000f',
     'f6000000-0000-0000-0000-000000000005',
     'published', 'b2000000-0000-0000-0000-000000000001',
     '{"from": "closed", "to": "published", "winner_slot": "A"}'::jsonb)
ON CONFLICT (id) DO NOTHING;

INSERT INTO battles.vote_aggregates (battle_id, contender_id, raw_vote_count, weighted_vote_sum, draw_count, rank_position)
VALUES
    ('f6000000-0000-0000-0000-000000000005', 'f7000000-0000-0000-0000-000000000009', 2, 2.0, 0, 1),
    ('f6000000-0000-0000-0000-000000000005', 'f7000000-0000-0000-0000-00000000000a', 1, 1.0, 0, 2)
ON CONFLICT (battle_id, contender_id) DO NOTHING;


-- =============================================================================
-- 5.14  Battle 6: Human vs Human (open votes) — "Tailwind CSS Debate" (draft)
--        battle_type: human_vs_human_open_votes | voter_eligibility: open
--        No contenders yet — illustrates the draft lifecycle stage
-- =============================================================================

INSERT INTO battles.battles (
    id, creator_lenser_id, title, slug, task_prompt, rubric_id,
    battle_type, voter_eligibility, status, invite_code, max_contenders,
    winner_contender_id, total_vote_count
)
VALUES (
    'f6000000-0000-0000-0000-000000000006',
    'b2000000-0000-0000-0000-000000000002',
    'Weekend Debate: Is Tailwind CSS Good or Bad?',
    'tailwind-css-debate',
    'Write a 200–300 word persuasive argument either defending or critiquing Tailwind CSS as the future of frontend styling. Contender A defends it; Contender B critiques it.',
    NULL,
    'human_vs_human_open_votes',
    'open',
    'draft',
    'TWND2026',
    2,
    NULL,
    0
)
ON CONFLICT (id) DO NOTHING;

-- No contenders, submissions, votes, scorecards, or vote_aggregates for a draft battle.

INSERT INTO battles.events (id, battle_id, event_type, actor_id, metadata)
VALUES
    ('fd300000-0000-0000-0000-000000000010',
     'f6000000-0000-0000-0000-000000000006',
     'status_change', 'b2000000-0000-0000-0000-000000000002',
     '{"from": null, "to": "draft"}'::jsonb)
ON CONFLICT (id) DO NOTHING;


-- =============================================================================
-- 5.15  Battle 7: Workflow Battle — "Research & Summarize" (open)
--        battle_type: workflow_battle | voter_eligibility: lenser_only
--        Alice Arena (human) vs Bob Builder (human) — workflows not yet executed
-- =============================================================================

INSERT INTO battles.battles (
    id, creator_lenser_id, title, slug, task_prompt, rubric_id,
    battle_type, voter_eligibility, status, invite_code, max_contenders,
    winner_contender_id, total_vote_count
)
VALUES (
    'f6000000-0000-0000-0000-000000000007',
    'b2000000-0000-0000-0000-000000000001',
    'Connected Lens Workflow Duel: Research & Summarize',
    'workflow-research-summarize',
    'Using a Connected Lens workflow, research and summarize the current state of large language model alignment techniques. Your workflow must include at least two chained steps: (1) gather key concepts, (2) synthesize a 300-word executive summary. The final leaf node output is your submission.',
    'd4000000-0000-0000-0000-000000000003',
    'workflow_battle',
    'lenser_only',
    'open',
    'WKFL2026',
    2,
    NULL,
    0
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO battles.contenders (id, battle_id, slot, contender_type, contender_ref_id, display_name,
    entry_mode, contender_status, joined_at)
VALUES
    ('f7000000-0000-0000-0000-00000000000b', 'f6000000-0000-0000-0000-000000000007', 'A',
     'human', 'b2000000-0000-0000-0000-000000000001', 'Alice Arena',
     'direct', 'active', '2026-03-25 10:00:00+00'),
    ('f7000000-0000-0000-0000-00000000000c', 'f6000000-0000-0000-0000-000000000007', 'B',
     'human', 'b2000000-0000-0000-0000-000000000002', 'Bob Builder',
     'invited', 'active', '2026-03-25 11:00:00+00')
ON CONFLICT (id) DO NOTHING;

-- Submissions pending — workflows not yet executed
INSERT INTO battles.submissions (id, battle_id, contender_id, status, source_type)
VALUES
    ('f8000000-0000-0000-0000-00000000000b',
     'f6000000-0000-0000-0000-000000000007',
     'f7000000-0000-0000-0000-00000000000b',
     'pending',
     'manual'),
    ('f8000000-0000-0000-0000-00000000000c',
     'f6000000-0000-0000-0000-000000000007',
     'f7000000-0000-0000-0000-00000000000c',
     'pending',
     'manual')
ON CONFLICT (id) DO NOTHING;

INSERT INTO battles.events (id, battle_id, event_type, actor_id, metadata)
VALUES
    ('fd300000-0000-0000-0000-000000000011',
     'f6000000-0000-0000-0000-000000000007',
     'status_change', 'b2000000-0000-0000-0000-000000000001',
     '{"from": "draft", "to": "open"}'::jsonb),
    ('fd300000-0000-0000-0000-000000000012',
     'f6000000-0000-0000-0000-000000000007',
     'contender_joined', 'b2000000-0000-0000-0000-000000000002',
     '{"slot": "B", "contender_type": "human", "entry_mode": "invited"}'::jsonb)
ON CONFLICT (id) DO NOTHING;

INSERT INTO battles.invitations (id, battle_id, invited_by, invited_email, invited_lenser_id, status, responded_at)
VALUES
    ('fe400000-0000-0000-0000-000000000005',
     'f6000000-0000-0000-0000-000000000007',
     'b2000000-0000-0000-0000-000000000001',
     'bob@lenserfight.local',
     'b2000000-0000-0000-0000-000000000002',
     'accepted',
     '2026-03-25 11:00:00+00')
ON CONFLICT (id) DO NOTHING;

INSERT INTO battles.vote_aggregates (battle_id, contender_id, raw_vote_count, weighted_vote_sum, draw_count, rank_position)
VALUES
    ('f6000000-0000-0000-0000-000000000007', 'f7000000-0000-0000-0000-00000000000b', 0, 0, 0, NULL),
    ('f6000000-0000-0000-0000-000000000007', 'f7000000-0000-0000-0000-00000000000c', 0, 0, 0, NULL)
ON CONFLICT (battle_id, contender_id) DO NOTHING;
