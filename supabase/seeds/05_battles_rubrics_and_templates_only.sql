-- =============================================================================
-- 05 (production subset). BATTLE RUBRICS, CRITERIA, TEMPLATES & ADAPTERS ONLY
-- =============================================================================
-- Extracted from 05_battles.sql for the production seed manifest.
-- NOTHING in this file creates battles, contenders, submissions, votes,
-- scorecards, vote_aggregates, events, or AI lenser profiles.
--
-- Includes:
--   rubrics:         Code Quality, Creative Writing, Workflow Evaluation
--   rubric_criteria: all criteria for the three rubrics above
--   templates:       Code Challenge, Creative Writing
--   agent_adapters:  GPT-4o Default, Claude Sonnet HTTP, Local Ollama
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Rubric: Code Quality
-- ---------------------------------------------------------------------------
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


-- ---------------------------------------------------------------------------
-- Rubric: Creative Writing
-- ---------------------------------------------------------------------------
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


-- ---------------------------------------------------------------------------
-- Rubric: Workflow Evaluation
-- ---------------------------------------------------------------------------
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


-- ---------------------------------------------------------------------------
-- Battle templates
-- ---------------------------------------------------------------------------
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


-- ---------------------------------------------------------------------------
-- Agent adapters (adapter config only — no battle or contender references)
-- ---------------------------------------------------------------------------
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
