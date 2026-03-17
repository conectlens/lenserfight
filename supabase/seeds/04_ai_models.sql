-- =============================================================================
-- 4. AI MODELS (matches initial migration schema)
-- =============================================================================

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


-- =============================================================================
-- PLATFORM SEEDS (advanced — requires schema beyond initial migration)
-- =============================================================================

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

-- Languages conditional trigger handling
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

    -- core.languages already seeded in 01_core_languages.sql; no-op here.
END IF;

END $$;
