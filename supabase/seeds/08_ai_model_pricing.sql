-- =============================================================================
-- 8. AI MODEL PRICING
-- =============================================================================

-- OpenAI
INSERT INTO ai.model_pricing (model_id, input_cost_per_1k_tokens, output_cost_per_1k_tokens)
SELECT m.id, 0.00175, 0.01400
FROM ai.models m WHERE m.key = 'gpt-5.2'
AND NOT EXISTS (SELECT 1 FROM ai.model_pricing mp WHERE mp.model_id = m.id AND mp.effective_to IS NULL);

INSERT INTO ai.model_pricing (model_id, input_cost_per_1k_tokens, output_cost_per_1k_tokens)
SELECT m.id, 0.00250, 0.01000
FROM ai.models m WHERE m.key = 'gpt-4o'
AND NOT EXISTS (SELECT 1 FROM ai.model_pricing mp WHERE mp.model_id = m.id AND mp.effective_to IS NULL);

INSERT INTO ai.model_pricing (model_id, input_cost_per_1k_tokens, output_cost_per_1k_tokens)
SELECT m.id, 0.00250, 0.01500
FROM ai.models m WHERE m.key = 'gpt-5.4'
AND NOT EXISTS (SELECT 1 FROM ai.model_pricing mp WHERE mp.model_id = m.id AND mp.effective_to IS NULL);

INSERT INTO ai.model_pricing (model_id, input_cost_per_1k_tokens, output_cost_per_1k_tokens)
SELECT m.id, 0.00075, 0.00450
FROM ai.models m WHERE m.key = 'gpt-5.4-mini'
AND NOT EXISTS (SELECT 1 FROM ai.model_pricing mp WHERE mp.model_id = m.id AND mp.effective_to IS NULL);

INSERT INTO ai.model_pricing (model_id, input_cost_per_1k_tokens, output_cost_per_1k_tokens)
SELECT m.id, 0.00020, 0.00125
FROM ai.models m WHERE m.key = 'gpt-5.4-nano'
AND NOT EXISTS (SELECT 1 FROM ai.model_pricing mp WHERE mp.model_id = m.id AND mp.effective_to IS NULL);

INSERT INTO ai.model_pricing (model_id, input_cost_per_1k_tokens, output_cost_per_1k_tokens)
SELECT m.id, 0.03000, 0.18000
FROM ai.models m WHERE m.key = 'gpt-5.4-pro'
AND NOT EXISTS (SELECT 1 FROM ai.model_pricing mp WHERE mp.model_id = m.id AND mp.effective_to IS NULL);

-- Anthropic
INSERT INTO ai.model_pricing (model_id, input_cost_per_1k_tokens, output_cost_per_1k_tokens)
SELECT m.id, 0.00500, 0.02500
FROM ai.models m WHERE m.key = 'claude-opus-4-6'
AND NOT EXISTS (SELECT 1 FROM ai.model_pricing mp WHERE mp.model_id = m.id AND mp.effective_to IS NULL);

INSERT INTO ai.model_pricing (model_id, input_cost_per_1k_tokens, output_cost_per_1k_tokens)
SELECT m.id, 0.00300, 0.01500
FROM ai.models m WHERE m.key = 'claude-sonnet-4-6'
AND NOT EXISTS (SELECT 1 FROM ai.model_pricing mp WHERE mp.model_id = m.id AND mp.effective_to IS NULL);

INSERT INTO ai.model_pricing (model_id, input_cost_per_1k_tokens, output_cost_per_1k_tokens)
SELECT m.id, 0.00100, 0.00500
FROM ai.models m WHERE m.key = 'claude-haiku-4-5'
AND NOT EXISTS (SELECT 1 FROM ai.model_pricing mp WHERE mp.model_id = m.id AND mp.effective_to IS NULL);

INSERT INTO ai.model_pricing (model_id, input_cost_per_1k_tokens, output_cost_per_1k_tokens)
SELECT m.id, 0.00300, 0.01500
FROM ai.models m WHERE m.key = 'claude-sonnet-4-5'
AND NOT EXISTS (SELECT 1 FROM ai.model_pricing mp WHERE mp.model_id = m.id AND mp.effective_to IS NULL);

INSERT INTO ai.model_pricing (model_id, input_cost_per_1k_tokens, output_cost_per_1k_tokens)
SELECT m.id, 0.00300, 0.01500
FROM ai.models m WHERE m.key = 'claude-sonnet-4-0'
AND NOT EXISTS (SELECT 1 FROM ai.model_pricing mp WHERE mp.model_id = m.id AND mp.effective_to IS NULL);

INSERT INTO ai.model_pricing (model_id, input_cost_per_1k_tokens, output_cost_per_1k_tokens)
SELECT m.id, 0.00080, 0.00400
FROM ai.models m WHERE m.key = 'claude-haiku-3-5'
AND NOT EXISTS (SELECT 1 FROM ai.model_pricing mp WHERE mp.model_id = m.id AND mp.effective_to IS NULL);

-- Google
INSERT INTO ai.model_pricing (model_id, input_cost_per_1k_tokens, output_cost_per_1k_tokens)
SELECT m.id, 0.00125, 0.01000
FROM ai.models m WHERE m.key = 'gemini-2.5-pro'
AND NOT EXISTS (SELECT 1 FROM ai.model_pricing mp WHERE mp.model_id = m.id AND mp.effective_to IS NULL);

INSERT INTO ai.model_pricing (model_id, input_cost_per_1k_tokens, output_cost_per_1k_tokens)
SELECT m.id, 0.00030, 0.00250
FROM ai.models m WHERE m.key = 'gemini-2.5-flash'
AND NOT EXISTS (SELECT 1 FROM ai.model_pricing mp WHERE mp.model_id = m.id AND mp.effective_to IS NULL);

INSERT INTO ai.model_pricing (model_id, input_cost_per_1k_tokens, output_cost_per_1k_tokens)
SELECT m.id, 0.00200, 0.01200
FROM ai.models m WHERE m.key = 'gemini-3-pro-preview'
AND NOT EXISTS (SELECT 1 FROM ai.model_pricing mp WHERE mp.model_id = m.id AND mp.effective_to IS NULL);

INSERT INTO ai.model_pricing (model_id, input_cost_per_1k_tokens, output_cost_per_1k_tokens)
SELECT m.id, 0.00050, 0.00300
FROM ai.models m WHERE m.key = 'gemini-3-flash-preview'
AND NOT EXISTS (SELECT 1 FROM ai.model_pricing mp WHERE mp.model_id = m.id AND mp.effective_to IS NULL);

INSERT INTO ai.model_pricing (model_id, input_cost_per_1k_tokens, output_cost_per_1k_tokens)
SELECT m.id, 0.00010, 0.00040
FROM ai.models m WHERE m.key = 'gemini-2.5-flash-lite'
AND NOT EXISTS (SELECT 1 FROM ai.model_pricing mp WHERE mp.model_id = m.id AND mp.effective_to IS NULL);

INSERT INTO ai.model_pricing (model_id, input_cost_per_1k_tokens, output_cost_per_1k_tokens)
SELECT m.id, 0.00200, 0.01200
FROM ai.models m WHERE m.key = 'gemini-3.1-pro-preview'
AND NOT EXISTS (SELECT 1 FROM ai.model_pricing mp WHERE mp.model_id = m.id AND mp.effective_to IS NULL);

INSERT INTO ai.model_pricing (model_id, input_cost_per_1k_tokens, output_cost_per_1k_tokens)
SELECT m.id, 0.00025, 0.00150
FROM ai.models m WHERE m.key = 'gemini-3.1-flash-lite-preview'
AND NOT EXISTS (SELECT 1 FROM ai.model_pricing mp WHERE mp.model_id = m.id AND mp.effective_to IS NULL);

-- Mistral
INSERT INTO ai.model_pricing (model_id, input_cost_per_1k_tokens, output_cost_per_1k_tokens)
SELECT m.id, 0.00200, 0.00600
FROM ai.models m WHERE m.key = 'mistral-large-3'
AND NOT EXISTS (SELECT 1 FROM ai.model_pricing mp WHERE mp.model_id = m.id AND mp.effective_to IS NULL);

INSERT INTO ai.model_pricing (model_id, input_cost_per_1k_tokens, output_cost_per_1k_tokens)
SELECT m.id, 0.00200, 0.00500
FROM ai.models m WHERE m.key = 'magistral-medium-1.2'
AND NOT EXISTS (SELECT 1 FROM ai.model_pricing mp WHERE mp.model_id = m.id AND mp.effective_to IS NULL);

INSERT INTO ai.model_pricing (model_id, input_cost_per_1k_tokens, output_cost_per_1k_tokens)
SELECT m.id, 0.00050, 0.00150
FROM ai.models m WHERE m.key = 'magistral-small-1.2'
AND NOT EXISTS (SELECT 1 FROM ai.model_pricing mp WHERE mp.model_id = m.id AND mp.effective_to IS NULL);
