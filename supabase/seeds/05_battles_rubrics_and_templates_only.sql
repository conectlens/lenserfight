-- =============================================================================
-- 05 (production subset). BATTLE RUBRICS, CRITERIA, TEMPLATES & ADAPTERS ONLY
-- =============================================================================
-- Extracted from 05_battles.sql for the production seed manifest.
-- NOTHING in this file creates battles, contenders, submissions, votes,
-- scorecards, vote_aggregates, or events.
--
-- Includes:
--   rubrics:          Code Quality, Creative Writing, Workflow Evaluation
--   rubric_criteria:  all criteria for the three rubrics above
--   templates:        Code Challenge, Creative Writing
--   agent_adapters:   GPT-4o Default, Claude Sonnet HTTP, Local Ollama
--   ai_lenser stubs:  minimal profile rows required by contender_entity_map FK
--                     (completed by 07_ai_lensers.sql via ON CONFLICT DO UPDATE)
-- =============================================================================

-- ---------------------------------------------------------------------------
-- AI lenser stub profiles (FK prerequisite for contender_entity_map trigger)
-- ---------------------------------------------------------------------------
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

  INSERT INTO lensers.profiles (id, handle, display_name, type, status, visibility, onboarding_step)
  VALUES
    (v_gpt4o_id,  'ai_gpt_4o',            'GPT-4o',            'ai', 'active', 'public', 2),
    (v_claude_id, 'ai_claude_sonnet_4_6', 'Claude Sonnet 4.6', 'ai', 'active', 'public', 2),
    (v_gemini_id, 'ai_gemini_2_5_flash',  'Gemini 2.5 Flash',  'ai', 'active', 'public', 2)
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO agents.ai_lensers (id, profile_id)
  VALUES
    ('c3000000-0000-0000-0000-000000000001', v_gpt4o_id),
    ('c3000000-0000-0000-0000-000000000002', v_claude_id),
    ('c3000000-0000-0000-0000-000000000003', v_gemini_id)
  ON CONFLICT DO NOTHING;
END $$;


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
