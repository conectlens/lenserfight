-- =============================================================================
-- LenserFight Seed Data
-- Idempotent: safe to re-run via ON CONFLICT patterns.
-- Runs after all migrations during `supabase db reset`.
-- =============================================================================

-- ============================================================
-- 1. TEST AUTH USERS
-- Fixed UUIDs for reproducible local development.
-- ============================================================

INSERT INTO auth.users (
    instance_id, id, aud, role, email, encrypted_password,
    email_confirmed_at, created_at, updated_at,
    confirmation_token, recovery_token,
    raw_app_meta_data, raw_user_meta_data
)
VALUES
    (
        '00000000-0000-0000-0000-000000000000',
        'a1000000-0000-0000-0000-000000000001',
        'authenticated', 'authenticated',
        'alice@lenserfight.local',
        crypt('password123', gen_salt('bf')),
        now(), now(), now(), '', '',
        '{"provider":"email","providers":["email"]}',
        '{"display_name":"Alice Arena"}'
    ),
    (
        '00000000-0000-0000-0000-000000000000',
        'a1000000-0000-0000-0000-000000000002',
        'authenticated', 'authenticated',
        'bob@lenserfight.local',
        crypt('password123', gen_salt('bf')),
        now(), now(), now(), '', '',
        '{"provider":"email","providers":["email"]}',
        '{"display_name":"Bob Builder"}'
    ),
    (
        '00000000-0000-0000-0000-000000000000',
        'a1000000-0000-0000-0000-000000000003',
        'authenticated', 'authenticated',
        'carol@lenserfight.local',
        crypt('password123', gen_salt('bf')),
        now(), now(), now(), '', '',
        '{"provider":"email","providers":["email"]}',
        '{"display_name":"Carol Voter"}'
    )
ON CONFLICT (id) DO NOTHING;

-- Identity records (required by Supabase auth)
INSERT INTO auth.identities (
    id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at
)
VALUES
    (
        'a1000000-0000-0000-0000-000000000001',
        'a1000000-0000-0000-0000-000000000001',
        'a1000000-0000-0000-0000-000000000001',
        jsonb_build_object('sub', 'a1000000-0000-0000-0000-000000000001', 'email', 'alice@lenserfight.local'),
        'email', now(), now(), now()
    ),
    (
        'a1000000-0000-0000-0000-000000000002',
        'a1000000-0000-0000-0000-000000000002',
        'a1000000-0000-0000-0000-000000000002',
        jsonb_build_object('sub', 'a1000000-0000-0000-0000-000000000002', 'email', 'bob@lenserfight.local'),
        'email', now(), now(), now()
    ),
    (
        'a1000000-0000-0000-0000-000000000003',
        'a1000000-0000-0000-0000-000000000003',
        'a1000000-0000-0000-0000-000000000003',
        jsonb_build_object('sub', 'a1000000-0000-0000-0000-000000000003', 'email', 'carol@lenserfight.local'),
        'email', now(), now(), now()
    )
ON CONFLICT (provider_id, provider) DO NOTHING;


-- ============================================================
-- 2. CORE LANGUAGES
-- Must be seeded before lensers.profiles (preferred_language FK).
-- ============================================================

INSERT INTO core.languages (code, name, native_name, direction, is_active)
VALUES
  ('ar', 'Arabic', 'العربية', 'rtl', true),
  ('de', 'German', 'Deutsch', 'ltr', true),
  ('en', 'English', 'English', 'ltr', true),
  ('es', 'Spanish', 'Español', 'ltr', true),
  ('fr', 'French', 'Français', 'ltr', true),
  ('it', 'Italian', 'Italiano', 'ltr', true),
  ('ja', 'Japanese', '日本語', 'ltr', true),
  ('ko', 'Korean', '한국어', 'ltr', true),
  ('pt', 'Portuguese', 'Português', 'ltr', true),
  ('tr', 'Turkish', 'Türkçe', 'ltr', true),
  ('zh', 'Chinese', '中文', 'ltr', true),
  ('zh-CN', 'Chinese (Simplified)', '简体中文', 'ltr', true),
  ('zh-TW', 'Chinese (Traditional)', '繁體中文', 'ltr', true)
ON CONFLICT (code) DO UPDATE
SET name = EXCLUDED.name,
    native_name = EXCLUDED.native_name,
    direction = EXCLUDED.direction,
    is_active = EXCLUDED.is_active;


-- ============================================================
-- 3. LENSER PROFILES
-- ============================================================

INSERT INTO lensers.profiles (
    id, user_id, handle, display_name, bio, status, visibility
)
VALUES
    (
        'b2000000-0000-0000-0000-000000000001',
        'a1000000-0000-0000-0000-000000000001',
        'alice_arena', 'Alice Arena',
        'Battle arena enthusiast and prompt engineer.',
        'active', 'public'
    ),
    (
        'b2000000-0000-0000-0000-000000000002',
        'a1000000-0000-0000-0000-000000000002',
        'bob_builder', 'Bob Builder',
        'AI researcher and competitive coder.',
        'active', 'public'
    ),
    (
        'b2000000-0000-0000-0000-000000000003',
        'a1000000-0000-0000-0000-000000000003',
        'carol_voter', 'Carol Voter',
        'Community judge and feedback specialist.',
        'active', 'public'
    )
ON CONFLICT (id) DO NOTHING;


-- ============================================================
-- 3. AI MODELS (matches initial migration schema)
-- ============================================================

INSERT INTO ai.models (
    id, slug, name, provider, description, capabilities, temperature, max_tokens, is_public
)
VALUES
    (
        'c3000000-0000-0000-0000-000000000001',
        'gpt-4o-seed',
        'GPT-4o',
        'openai',
        'OpenAI multimodal flagship model.',
        ARRAY['text', 'code', 'image']::ai.ai_capability_enum[],
        0.7, 4096, true
    ),
    (
        'c3000000-0000-0000-0000-000000000002',
        'claude-sonnet-seed',
        'Claude Sonnet 4.6',
        'anthropic',
        'Anthropic reasoning and coding model.',
        ARRAY['text', 'code']::ai.ai_capability_enum[],
        0.7, 4096, true
    ),
    (
        'c3000000-0000-0000-0000-000000000003',
        'gemini-flash-seed',
        'Gemini 2.5 Flash',
        'google',
        'Google fast multimodal model.',
        ARRAY['text', 'code', 'image']::ai.ai_capability_enum[],
        0.7, 4096, true
    )
ON CONFLICT (slug) DO UPDATE
SET
    name = EXCLUDED.name,
    provider = EXCLUDED.provider,
    description = EXCLUDED.description,
    capabilities = EXCLUDED.capabilities,
    is_public = EXCLUDED.is_public;


-- ============================================================
-- 4. PLATFORM SEEDS (advanced — requires schema beyond initial migration)
--    These seeds match the production schema and will be activated
--    once ai.providers, ai.model_pricing, core.features, core.languages
--    tables exist via future migrations.
-- ============================================================

DO $$
BEGIN

-- Only run if the ai.providers table exists (newer schema)
IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'ai' AND table_name = 'providers'
) THEN

    INSERT INTO ai.providers (key, display_name, is_active)
    VALUES
      ('openai', 'OpenAI', true),
      ('anthropic', 'Anthropic', true),
      ('google', 'Google', true)
    ON CONFLICT (key) DO UPDATE
    SET
      display_name = EXCLUDED.display_name,
      is_active = EXCLUDED.is_active;

    -- OpenAI models
    INSERT INTO ai.models (
      name, capabilities, model_key, provider_id,
      context_window_tokens, supports_tools, supports_json_schema,
      supports_vision, is_active
    )
    SELECT
      'GPT-5.2',
      ARRAY['chat', 'reasoning', 'tools', 'vision', 'json_schema']::text[],
      'gpt-5.2', p.id, 400000, true, true, true, false
    FROM ai.providers p WHERE p.key = 'openai'
    ON CONFLICT (model_key) DO UPDATE
    SET name = EXCLUDED.name, capabilities = EXCLUDED.capabilities,
        provider_id = EXCLUDED.provider_id,
        context_window_tokens = EXCLUDED.context_window_tokens,
        supports_tools = EXCLUDED.supports_tools,
        supports_json_schema = EXCLUDED.supports_json_schema,
        supports_vision = EXCLUDED.supports_vision, is_active = false;

    INSERT INTO ai.models (
      name, capabilities, model_key, provider_id,
      context_window_tokens, supports_tools, supports_json_schema,
      supports_vision, is_active
    )
    SELECT
      'GPT-4o',
      ARRAY['chat', 'tools', 'vision', 'json_schema']::text[],
      'gpt-4o', p.id, 128000, true, true, true, false
    FROM ai.providers p WHERE p.key = 'openai'
    ON CONFLICT (model_key) DO UPDATE
    SET name = EXCLUDED.name, capabilities = EXCLUDED.capabilities,
        provider_id = EXCLUDED.provider_id,
        context_window_tokens = EXCLUDED.context_window_tokens,
        supports_tools = EXCLUDED.supports_tools,
        supports_json_schema = EXCLUDED.supports_json_schema,
        supports_vision = EXCLUDED.supports_vision, is_active = false;

    -- Anthropic models
    INSERT INTO ai.models (name, capabilities, model_key, provider_id, context_window_tokens, is_active)
    SELECT 'Claude Opus 4.6', ARRAY['chat', 'reasoning', 'tools']::text[], 'claude-opus-4-6', p.id, 200000, false
    FROM ai.providers p WHERE p.key = 'anthropic'
    ON CONFLICT (model_key) DO UPDATE
    SET name = EXCLUDED.name, capabilities = EXCLUDED.capabilities,
        provider_id = EXCLUDED.provider_id,
        context_window_tokens = EXCLUDED.context_window_tokens, is_active = false;

    INSERT INTO ai.models (name, capabilities, model_key, provider_id, context_window_tokens, is_active)
    SELECT 'Claude Sonnet 4.6', ARRAY['chat', 'reasoning', 'tools']::text[], 'claude-sonnet-4-6', p.id, 200000, false
    FROM ai.providers p WHERE p.key = 'anthropic'
    ON CONFLICT (model_key) DO UPDATE
    SET name = EXCLUDED.name, capabilities = EXCLUDED.capabilities,
        provider_id = EXCLUDED.provider_id,
        context_window_tokens = EXCLUDED.context_window_tokens, is_active = false;

    INSERT INTO ai.models (name, capabilities, model_key, provider_id, context_window_tokens, is_active)
    SELECT 'Claude Haiku 4.5', ARRAY['chat']::text[], 'claude-haiku-4-5', p.id, 200000, false
    FROM ai.providers p WHERE p.key = 'anthropic'
    ON CONFLICT (model_key) DO UPDATE
    SET name = EXCLUDED.name, capabilities = EXCLUDED.capabilities,
        provider_id = EXCLUDED.provider_id,
        context_window_tokens = EXCLUDED.context_window_tokens, is_active = false;

    -- Google models
    INSERT INTO ai.models (name, capabilities, model_key, provider_id, context_window_tokens, is_active)
    SELECT 'Gemini 2.5 Pro', ARRAY['chat', 'reasoning', 'tools', 'vision']::text[], 'gemini-2.5-pro', p.id, 2000000, false
    FROM ai.providers p WHERE p.key = 'google'
    ON CONFLICT (model_key) DO UPDATE
    SET name = EXCLUDED.name, capabilities = EXCLUDED.capabilities,
        provider_id = EXCLUDED.provider_id,
        context_window_tokens = EXCLUDED.context_window_tokens, is_active = false;

    INSERT INTO ai.models (name, capabilities, model_key, provider_id, context_window_tokens, is_active)
    SELECT 'Gemini 2.5 Flash', ARRAY['chat', 'tools', 'vision']::text[], 'gemini-2.5-flash', p.id, 1000000, false
    FROM ai.providers p WHERE p.key = 'google'
    ON CONFLICT (model_key) DO UPDATE
    SET name = EXCLUDED.name, capabilities = EXCLUDED.capabilities,
        provider_id = EXCLUDED.provider_id,
        context_window_tokens = EXCLUDED.context_window_tokens, is_active = false;

    INSERT INTO ai.models (name, capabilities, model_key, provider_id, context_window_tokens, is_active)
    SELECT 'Gemini 3 Pro Preview', ARRAY['chat', 'reasoning', 'tools', 'vision']::text[], 'gemini-3-pro-preview', p.id, 2000000, false
    FROM ai.providers p WHERE p.key = 'google'
    ON CONFLICT (model_key) DO UPDATE
    SET name = EXCLUDED.name, capabilities = EXCLUDED.capabilities,
        provider_id = EXCLUDED.provider_id,
        context_window_tokens = EXCLUDED.context_window_tokens, is_active = false;

    INSERT INTO ai.models (name, capabilities, model_key, provider_id, context_window_tokens, is_active)
    SELECT 'Gemini 3 Flash Preview', ARRAY['chat', 'tools', 'vision']::text[], 'gemini-3-flash-preview', p.id, 1000000, false
    FROM ai.providers p WHERE p.key = 'google'
    ON CONFLICT (model_key) DO UPDATE
    SET name = EXCLUDED.name, capabilities = EXCLUDED.capabilities,
        provider_id = EXCLUDED.provider_id,
        context_window_tokens = EXCLUDED.context_window_tokens, is_active = false;

    -- Model pricing
    IF EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'ai' AND table_name = 'model_pricing'
    ) THEN
        INSERT INTO ai.model_pricing (model_id, input_cost_per_1k_tokens, output_cost_per_1k_tokens)
        SELECT id, 0.00175, 0.01400 FROM ai.models WHERE model_key = 'gpt-5.2' ON CONFLICT DO NOTHING;

        INSERT INTO ai.model_pricing (model_id, input_cost_per_1k_tokens, output_cost_per_1k_tokens)
        SELECT id, 0.00250, 0.01000 FROM ai.models WHERE model_key = 'gpt-4o' ON CONFLICT DO NOTHING;

        INSERT INTO ai.model_pricing (model_id, input_cost_per_1k_tokens, output_cost_per_1k_tokens)
        SELECT id, 0.00500, 0.02500 FROM ai.models WHERE model_key = 'claude-opus-4-6' ON CONFLICT DO NOTHING;

        INSERT INTO ai.model_pricing (model_id, input_cost_per_1k_tokens, output_cost_per_1k_tokens)
        SELECT id, 0.00300, 0.01500 FROM ai.models WHERE model_key = 'claude-sonnet-4-6' ON CONFLICT DO NOTHING;

        INSERT INTO ai.model_pricing (model_id, input_cost_per_1k_tokens, output_cost_per_1k_tokens)
        SELECT id, 0.00100, 0.00500 FROM ai.models WHERE model_key = 'claude-haiku-4-5' ON CONFLICT DO NOTHING;

        INSERT INTO ai.model_pricing (model_id, input_cost_per_1k_tokens, output_cost_per_1k_tokens)
        SELECT id, 0.00125, 0.01000 FROM ai.models WHERE model_key = 'gemini-2.5-pro' ON CONFLICT DO NOTHING;

        INSERT INTO ai.model_pricing (model_id, input_cost_per_1k_tokens, output_cost_per_1k_tokens)
        SELECT id, 0.00030, 0.00250 FROM ai.models WHERE model_key = 'gemini-2.5-flash' ON CONFLICT DO NOTHING;

        INSERT INTO ai.model_pricing (model_id, input_cost_per_1k_tokens, output_cost_per_1k_tokens)
        SELECT id, 0.00200, 0.01200 FROM ai.models WHERE model_key = 'gemini-3-pro-preview' ON CONFLICT DO NOTHING;

        INSERT INTO ai.model_pricing (model_id, input_cost_per_1k_tokens, output_cost_per_1k_tokens)
        SELECT id, 0.00050, 0.00300 FROM ai.models WHERE model_key = 'gemini-3-flash-preview' ON CONFLICT DO NOTHING;

        -- Activate models after pricing exists
        UPDATE ai.models SET is_active = true
        WHERE model_key IN (
            'gpt-5.2', 'gpt-4o',
            'claude-opus-4-6', 'claude-sonnet-4-6', 'claude-haiku-4-5',
            'gemini-2.5-pro', 'gemini-2.5-flash',
            'gemini-3-pro-preview', 'gemini-3-flash-preview'
        );
    END IF;

    -- Execution margin policy
    IF EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'ai' AND table_name = 'execution_margin_policies'
    ) THEN
        UPDATE ai.execution_margin_policies
        SET markup_percent = 20, fixed_fee_usd = 0, rounding_mode = 'ceil',
            min_charge_credits = 1, max_charge_credits = NULL,
            effective_from = TIMESTAMPTZ '2026-03-09 00:00:00+00',
            metadata = jsonb_build_object('source', 'seed'), updated_at = now()
        WHERE model_id IS NULL AND is_active = true AND effective_to IS NULL;

        INSERT INTO ai.execution_margin_policies (
            model_id, markup_percent, fixed_fee_usd, rounding_mode,
            min_charge_credits, max_charge_credits,
            effective_from, effective_to, is_active, metadata
        )
        SELECT NULL::uuid, 20, 0, 'ceil', 1, NULL,
               TIMESTAMPTZ '2026-03-09 00:00:00+00', NULL, true,
               jsonb_build_object('source', 'seed')
        WHERE NOT EXISTS (
            SELECT 1 FROM ai.execution_margin_policies
            WHERE model_id IS NULL AND is_active = true AND effective_to IS NULL
        );
    END IF;

    -- Feature model routing policies
    IF EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'ai' AND table_name = 'feature_model_policies'
    ) AND EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'core' AND table_name = 'features'
    ) THEN
        DELETE FROM ai.feature_model_policies
        WHERE account_id IS NULL AND chainer_id IS NULL
          AND feature_key IN (
            'ai.chat.basic', 'ai.chat.streaming', 'ai.chat.multi_agent',
            'ai.chat.model.switch', 'ai.reasoning.standard', 'ai.reasoning.advanced',
            'ai.reasoning.super', 'ai.memory.short_term', 'ai.memory.long_term',
            'ai.memory.vector_depth', 'ai.memory.read', 'ai.memory.write',
            'ai.files.upload', 'ai.documents.ingest', 'ai.twins.manage',
            'ai.agents.manage', 'ai.agents.run', 'ai.tools.manage',
            'ai.workflows.manage', 'ai.promptlab.use', 'ai.analytics.read',
            'ai.cost.visibility', 'ai.agent.system', 'ai.agent.custom',
            'ai.agent.marketplace'
          );

        WITH feature_policy_seed(feature_key, model_key, priority) AS (
          VALUES
            ('ai.chat.basic', 'gemini-3-flash-preview', 100),
            ('ai.chat.streaming', 'gemini-3-flash-preview', 100),
            ('ai.chat.multi_agent', 'claude-sonnet-4-6', 90),
            ('ai.chat.model.switch', 'gpt-4o', 90),
            ('ai.reasoning.standard', 'claude-sonnet-4-6', 80),
            ('ai.reasoning.advanced', 'gpt-5.2', 70),
            ('ai.reasoning.super', 'gpt-5.2', 60),
            ('ai.memory.short_term', 'gemini-3-flash-preview', 100),
            ('ai.memory.long_term', 'claude-sonnet-4-6', 85),
            ('ai.memory.vector_depth', 'claude-sonnet-4-6', 85),
            ('ai.memory.read', 'gemini-3-flash-preview', 95),
            ('ai.memory.write', 'gemini-3-flash-preview', 95),
            ('ai.files.upload', 'gemini-2.5-flash', 100),
            ('ai.documents.ingest', 'gpt-4o', 85),
            ('ai.twins.manage', 'claude-sonnet-4-6', 85),
            ('ai.agents.manage', 'claude-sonnet-4-6', 85),
            ('ai.agents.run', 'gpt-4o', 80),
            ('ai.tools.manage', 'gemini-3-flash-preview', 95),
            ('ai.workflows.manage', 'claude-sonnet-4-6', 85),
            ('ai.promptlab.use', 'gpt-4o', 85),
            ('ai.analytics.read', 'gemini-3-flash-preview', 95),
            ('ai.cost.visibility', 'gemini-3-flash-preview', 95),
            ('ai.agent.system', 'claude-sonnet-4-6', 80),
            ('ai.agent.custom', 'gpt-4o', 80),
            ('ai.agent.marketplace', 'claude-sonnet-4-6', 85)
        )
        INSERT INTO ai.feature_model_policies (
          feature_key, model_id, priority, is_default, is_active, account_id, chainer_id
        )
        SELECT seed.feature_key, model.id, seed.priority, true, true, NULL::uuid, NULL::uuid
        FROM feature_policy_seed seed
        JOIN core.features feature ON feature.key = seed.feature_key
        JOIN ai.models model ON model.model_key = seed.model_key;
    END IF;

END IF;  -- end ai.providers check

-- Languages
IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'core' AND table_name = 'languages'
) THEN
    -- Disable triggers if they exist
    IF EXISTS (
        SELECT 1 FROM pg_trigger t
        JOIN pg_class c ON c.oid = t.tgrelid
        JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE n.nspname = 'core' AND c.relname = 'features'
          AND t.tgname = 'trg_feature_seed_plan_entitlements'
          AND NOT t.tgisinternal
    ) THEN
        ALTER TABLE core.features DISABLE TRIGGER trg_feature_seed_plan_entitlements;
    END IF;

    IF EXISTS (
        SELECT 1 FROM pg_trigger t
        JOIN pg_class c ON c.oid = t.tgrelid
        JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE n.nspname = 'billing' AND c.relname = 'product_entitlements'
          AND t.tgname = 'trg_product_entitlements_feature_active'
          AND NOT t.tgisinternal
    ) THEN
        ALTER TABLE billing.product_entitlements DISABLE TRIGGER trg_product_entitlements_feature_active;
    END IF;

    -- core.languages already seeded before lensers.profiles above; no-op here.
END IF;

END $$;


-- ============================================================
-- 5. BATTLE DEMO DATA
-- ============================================================

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
INSERT INTO battles.contenders (id, battle_id, slot, contender_type, contender_ref_id, display_name)
VALUES
    ('f7000000-0000-0000-0000-000000000001', 'f6000000-0000-0000-0000-000000000001', 'A',
     'human', 'b2000000-0000-0000-0000-000000000002', 'Bob Builder'),
    ('f7000000-0000-0000-0000-000000000002', 'f6000000-0000-0000-0000-000000000001', 'B',
     'ai_model', 'c3000000-0000-0000-0000-000000000001', 'GPT-4o')
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
INSERT INTO battles.votes (id, battle_id, voter_lenser_id, vote_value, rationale)
VALUES
    ('f9000000-0000-0000-0000-000000000001',
     'f6000000-0000-0000-0000-000000000001',
     'b2000000-0000-0000-0000-000000000003',
     'contender_a',
     'Type-safe approach with proper Rule type. More extensible and idiomatic TypeScript.'),
    ('f9000000-0000-0000-0000-000000000002',
     'f6000000-0000-0000-0000-000000000001',
     'b2000000-0000-0000-0000-000000000001',
     'contender_a',
     'Functional style with Array.from is cleaner. Good use of filter+map+join chain.'),
    ('f9000000-0000-0000-0000-000000000003',
     'f6000000-0000-0000-0000-000000000001',
     -- Use a generated UUID for an extra voter (no profile needed since FK is to profiles which exist)
     'b2000000-0000-0000-0000-000000000002',
     'contender_b',
     'Simpler Record-based config is more practical for quick use.')
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
INSERT INTO battles.contenders (id, battle_id, slot, contender_type, contender_ref_id, display_name)
VALUES
    ('f7000000-0000-0000-0000-000000000003', 'f6000000-0000-0000-0000-000000000002', 'A',
     'ai_model', 'c3000000-0000-0000-0000-000000000002', 'Claude Sonnet 4.6'),
    ('f7000000-0000-0000-0000-000000000004', 'f6000000-0000-0000-0000-000000000002', 'B',
     'ai_model', 'c3000000-0000-0000-0000-000000000003', 'Gemini 2.5 Flash')
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


-- ============================================================
-- 5.5  BATTLE TEMPLATES
-- ============================================================

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


-- ============================================================
-- 5.6  AGENT ADAPTERS
-- ============================================================

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


-- ============================================================
-- 5.7  BATTLE EVENTS (audit trail for seed battles)
-- ============================================================

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


-- ============================================================
-- 5.8  BATTLE INVITATIONS
-- ============================================================

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


-- ============================================================
-- 6. LENSER STATS (analytics)
-- ============================================================

INSERT INTO analytics.lenser_stats (lenser_id)
VALUES
    ('b2000000-0000-0000-0000-000000000001'),
    ('b2000000-0000-0000-0000-000000000002'),
    ('b2000000-0000-0000-0000-000000000003')
ON CONFLICT (lenser_id) DO NOTHING;


-- =============================================================================
-- END OF SEED
-- =============================================================================
