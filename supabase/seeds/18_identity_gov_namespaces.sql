-- =============================================================================
-- Phase NG-P1: Namespace Governance — Canonical Seed Data
--
-- Populates identity_gov.reserved_namespaces with the authoritative set of
-- protected handles, prefix/suffix rules, protected tokens, and composition
-- guards. All values are pre-normalized (lowercase, ASCII-clean).
--
-- Class hierarchy and default deny_score:
--   system       100  — platform identity, impossible to claim
--   security      95  — moderation/abuse/trust ops
--   provider      90  — AI provider companies
--   model         85  — AI model names
--   future        80  — roadmap/unreleased product namespaces
--   verified_only 70  — notable public figures / brand accounts
--   restricted    50  — pattern-flagged, appeal-only
--
-- Row count is intentionally lean. Combinatorial coverage comes from:
--   - prefix entries that block <token>* variants
--   - token entries that combine with fn_validate_handle's modifier list
--   - suffix entries that block *<modifier> patterns
--
-- To add a new provider/model: INSERT a row. No code change required.
-- =============================================================================

BEGIN;

INSERT INTO "identity_gov"."reserved_namespaces"
  ("entry_kind", "value", "class", "deny_score", "reason", "source")
VALUES

-- ==========================================================================
-- EXACT — system / platform identities
-- ==========================================================================
('exact', 'lenserfight',    'system', 100, 'Platform canonical identity', 'canonical'),
('exact', 'chainabit',      'system', 100, 'Chainabit ecosystem identity', 'canonical'),
('exact', 'conectlens',     'system', 100, 'ConectLens parent brand',     'canonical'),
('exact', 'lenserfight-hq', 'system', 100, 'Platform HQ handle',          'canonical'),

-- ==========================================================================
-- EXACT — security / moderation identities
-- ==========================================================================
('exact', 'admin',       'security', 95, 'Platform admin namespace',          'canonical'),
('exact', 'root',        'security', 95, 'System root namespace',             'canonical'),
('exact', 'system',      'security', 95, 'System identity namespace',         'canonical'),
('exact', 'moderator',   'security', 95, 'Moderation team namespace',         'canonical'),
('exact', 'mod',         'security', 95, 'Short moderation namespace',        'canonical'),
('exact', 'trust',       'security', 95, 'Trust & Safety namespace',          'canonical'),
('exact', 'safety',      'security', 95, 'Safety team namespace',             'canonical'),
('exact', 'abuse',       'security', 95, 'Abuse reporting namespace',         'canonical'),
('exact', 'report',      'security', 95, 'Report namespace',                  'canonical'),
('exact', 'security',    'security', 95, 'Security team namespace',           'canonical'),
('exact', 'support',     'security', 95, 'Platform support namespace',        'canonical'),
('exact', 'help',        'security', 90, 'Help namespace',                    'canonical'),
('exact', 'policy',      'security', 90, 'Policy namespace',                  'canonical'),
('exact', 'legal',       'security', 90, 'Legal namespace',                   'canonical'),
('exact', 'dmca',        'security', 90, 'DMCA reporting namespace',          'canonical'),
('exact', 'null',        'security', 95, 'Null/undefined guard',              'canonical'),
('exact', 'undefined',   'security', 95, 'Undefined guard',                   'canonical'),
('exact', 'anonymous',   'security', 90, 'Anonymous identity guard',          'canonical'),

-- ==========================================================================
-- EXACT — LenserFight brand family
-- ==========================================================================
('exact', 'lenser',      'future', 80, 'LenserFight core brand token',    'canonical'),
('exact', 'lenso',       'future', 80, 'LenserFight AI family — @lenso',  'canonical'),
('exact', 'lensa',       'future', 80, 'LenserFight AI family — @lensa',  'canonical'),
('exact', 'lense',       'future', 80, 'LenserFight AI family — @lense',  'canonical'),
('exact', 'lola',        'future', 80, 'LenserFight AI family — @lola',   'canonical'),
('exact', 'lens',        'future', 80, 'Core brand token',                'canonical'),
('exact', 'lenscore',    'future', 80, 'Future product: LensCore',        'canonical'),
('exact', 'lensruntime', 'future', 80, 'Future product: LensRuntime',     'canonical'),
('exact', 'lensagent',   'future', 80, 'Future product: LensAgent',       'canonical'),
('exact', 'lensos',      'future', 80, 'Future product: LensOS',          'canonical'),
('exact', 'lensai',      'future', 80, 'Future product: LensAI',          'canonical'),
('exact', 'lensinfra',   'future', 80, 'Future product: LensInfra',       'canonical'),
('exact', 'lensizm',     'future', 80, 'Legacy reserved handle',          'canonical'),

-- Chainabit ecosystem
('exact', 'chaina',        'future', 80, 'Chainabit brand token',            'canonical'),
('exact', 'chaincore',     'future', 80, 'Future: ChainCore',                'canonical'),
('exact', 'chainagent',    'future', 80, 'Future: ChainAgent',               'canonical'),
('exact', 'chainruntime',  'future', 80, 'Future: ChainRuntime',             'canonical'),
('exact', 'chainnode',     'future', 80, 'Future: ChainNode',                'canonical'),
('exact', 'chainlabs',     'future', 80, 'Future: ChainLabs',                'canonical'),
('exact', 'chaininfra',    'future', 80, 'Future: ChainInfra',               'canonical'),

-- ==========================================================================
-- EXACT — AI provider companies
-- ==========================================================================
('exact', 'openai',        'provider', 90, 'OpenAI (trademark)',        'manifest'),
('exact', 'anthropic',     'provider', 90, 'Anthropic PBC (trademark)', 'manifest'),
('exact', 'google',        'provider', 90, 'Google LLC (trademark)',    'manifest'),
('exact', 'deepmind',      'provider', 90, 'Google DeepMind',           'manifest'),
('exact', 'meta',          'provider', 90, 'Meta Platforms',            'manifest'),
('exact', 'xai',           'provider', 90, 'xAI (Elon Musk)',           'manifest'),
('exact', 'mistral',       'provider', 90, 'Mistral AI',                'manifest'),
('exact', 'deepseek',      'provider', 90, 'DeepSeek AI',               'manifest'),
('exact', 'together',      'provider', 85, 'Together AI',               'manifest'),
('exact', 'togetherai',    'provider', 90, 'Together AI (long form)',   'manifest'),
('exact', 'groq',          'provider', 90, 'Groq Inc.',                 'manifest'),
('exact', 'cohere',        'provider', 90, 'Cohere Inc.',               'manifest'),
('exact', 'perplexity',    'provider', 90, 'Perplexity AI',             'manifest'),
('exact', 'huggingface',   'provider', 90, 'HuggingFace Inc.',          'manifest'),
('exact', 'stability',     'provider', 85, 'Stability AI',              'manifest'),
('exact', 'stabilityai',   'provider', 90, 'Stability AI (long form)',  'manifest'),
('exact', 'elevenlabs',    'provider', 90, 'ElevenLabs',                'manifest'),
('exact', 'replicate',     'provider', 85, 'Replicate Inc.',            'manifest'),
('exact', 'nvidia',        'provider', 90, 'NVIDIA Corp.',              'manifest'),
('exact', 'microsoft',     'provider', 90, 'Microsoft Corp.',           'manifest'),
('exact', 'amazon',        'provider', 90, 'Amazon/AWS',                'manifest'),
('exact', 'bedrock',       'provider', 85, 'AWS Bedrock',               'manifest'),
('exact', 'sagemaker',     'provider', 85, 'AWS SageMaker',             'manifest'),
('exact', 'vertexai',      'provider', 90, 'Google Vertex AI',          'manifest'),
('exact', 'geminiapi',     'provider', 90, 'Google Gemini API',         'manifest'),
('exact', 'fireworks',     'provider', 85, 'Fireworks AI',              'manifest'),
('exact', 'octoai',        'provider', 85, 'OctoAI',                   'manifest'),
('exact', 'anyscale',      'provider', 85, 'Anyscale',                  'manifest'),
('exact', 'cerebras',      'provider', 85, 'Cerebras Systems',          'manifest'),

-- ==========================================================================
-- EXACT — AI model names
-- ==========================================================================
('exact', 'gpt',        'model', 85, 'OpenAI GPT model family', 'manifest'),
('exact', 'chatgpt',    'model', 90, 'ChatGPT product name',    'manifest'),
('exact', 'gpt4',       'model', 85, 'GPT-4 model name',        'manifest'),
('exact', 'gpt4o',      'model', 85, 'GPT-4o model name',       'manifest'),
('exact', 'gpt3',       'model', 85, 'GPT-3 model name',        'manifest'),
('exact', 'o1',         'model', 80, 'OpenAI o1 model',         'manifest'),
('exact', 'claude',     'model', 90, 'Anthropic Claude',        'manifest'),
('exact', 'gemini',     'model', 90, 'Google Gemini',           'manifest'),
('exact', 'llama',      'model', 85, 'Meta Llama model family', 'manifest'),
('exact', 'grok',       'model', 90, 'xAI Grok',                'manifest'),
('exact', 'mistral7b',  'model', 80, 'Mistral 7B',              'manifest'),
('exact', 'deepseekr1', 'model', 85, 'DeepSeek-R1',             'manifest'),
('exact', 'commandr',   'model', 80, 'Cohere Command-R',        'manifest'),
('exact', 'qwen',       'model', 80, 'Alibaba Qwen',            'manifest'),
('exact', 'phi',        'model', 80, 'Microsoft Phi',           'manifest'),
('exact', 'sonnet',     'model', 85, 'Claude Sonnet tier',      'manifest'),
('exact', 'opus',       'model', 85, 'Claude Opus tier',        'manifest'),
('exact', 'haiku',      'model', 80, 'Claude Haiku tier',       'manifest'),
('exact', 'gemma',      'model', 80, 'Google Gemma',            'manifest'),
('exact', 'falcon',     'model', 75, 'TII Falcon',              'manifest'),
('exact', 'mixtral',    'model', 80, 'Mistral Mixtral',         'manifest'),
('exact', 'codex',      'model', 80, 'OpenAI Codex',            'manifest'),
('exact', 'dall-e',     'model', 80, 'OpenAI DALL-E',           'manifest'),
('exact', 'dalle',      'model', 80, 'OpenAI DALL-E (slug)',    'manifest'),
('exact', 'stable-diffusion', 'model', 80, 'Stability AI SD',  'manifest'),
('exact', 'sdxl',       'model', 75, 'Stable Diffusion XL',    'manifest'),
('exact', 'sora',       'model', 85, 'OpenAI Sora',             'manifest'),
('exact', 'whisper',    'model', 80, 'OpenAI Whisper',          'manifest'),

-- ==========================================================================
-- PREFIX — block <brand>* squatting
--   e.g. "lenserfight-support", "openai-help", "anthropic2"
-- ==========================================================================
('prefix', 'lenserfight', 'system',   100, 'LenserFight prefix guard',  'canonical'),
('prefix', 'chainabit',   'system',   100, 'Chainabit prefix guard',    'canonical'),
('prefix', 'conectlens',  'system',   100, 'ConectLens prefix guard',   'canonical'),
('prefix', 'openai',      'provider',  90, 'OpenAI prefix guard',       'manifest'),
('prefix', 'anthropic',   'provider',  90, 'Anthropic prefix guard',    'manifest'),
('prefix', 'chatgpt',     'model',     90, 'ChatGPT prefix guard',      'manifest'),
('prefix', 'gemini',      'model',     90, 'Gemini prefix guard',       'manifest'),
('prefix', 'claude',      'model',     90, 'Claude prefix guard',       'manifest'),

-- ==========================================================================
-- SUFFIX — block *<modifier> impersonation patterns
--   e.g. "mybot-official", "something-admin"
-- These are lower-score because some are legitimate (e.g. "alice-ai").
-- The composition check in fn_validate_handle handles the high-risk cases.
-- ==========================================================================
('suffix', 'official',   'restricted', 50, 'Impersonation suffix guard', 'manifest'),
('suffix', 'verified',   'restricted', 50, 'Impersonation suffix guard', 'manifest'),
('suffix', 'iam',        'restricted', 50, 'Identity claim suffix guard', 'manifest'),

-- ==========================================================================
-- TOKEN — protected tokens that trigger composition check in fn_validate_handle
--   When a handle contains one of these tokens AND a modifier (ai, bot, admin, …)
--   the handle is denied as a composition impersonation.
-- ==========================================================================
('token', 'lens',        'future',   80, 'LenserFight brand token',  'canonical'),
('token', 'lenser',      'future',   80, 'LenserFight brand token',  'canonical'),
('token', 'lola',        'future',   80, 'Lenser family token',      'canonical'),
('token', 'chain',       'future',   75, 'Chainabit brand token',    'canonical'),
('token', 'openai',      'provider', 90, 'OpenAI composition token', 'manifest'),
('token', 'anthropic',   'provider', 90, 'Anthropic composition token', 'manifest'),
('token', 'claude',      'model',    90, 'Claude composition token', 'manifest'),
('token', 'gemini',      'model',    90, 'Gemini composition token', 'manifest'),
('token', 'chatgpt',     'model',    90, 'ChatGPT composition token','manifest'),
('token', 'gpt',         'model',    85, 'GPT composition token',    'manifest'),
('token', 'llama',       'model',    80, 'Llama composition token',  'manifest'),
('token', 'mistral',     'provider', 80, 'Mistral composition token','manifest')

ON CONFLICT ("entry_kind", "value") DO UPDATE
  SET "class"      = EXCLUDED."class",
      "deny_score" = EXCLUDED."deny_score",
      "reason"     = EXCLUDED."reason";

COMMIT;
