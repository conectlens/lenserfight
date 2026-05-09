-- =============================================================================
-- 43. AI AGENT LENS BINDINGS
-- =============================================================================
-- Connects the three demo AI lensers to the developer (41_) and chain-template
-- (40_) lenses according to each model's strengths:
--
--   GPT-4o        (c3000000-…-0001) → code review, testing, SQL, PR writing
--   Claude Sonnet (c3000000-…-0002) → analysis, documentation, bug diagnosis
--   Gemini Flash  (c3000000-…-0003) → community, planning, multimodal
--
-- AI model profiles in ai.models (GPT-5.4 Pro etc.) and their lenser rows
-- in lensers.profiles are NOT touched — only new agents.lens_bindings rows.
--
-- Idempotent: ON CONFLICT (ai_lenser_id, lens_id) DO NOTHING.
--
-- Dependencies:
--   • 07_ai_lensers.sql             (provides the three deterministic agent IDs)
--   • 40_lens_chain_templates.sql   (40_ lens UUIDs)
--   • 41_developer_lens_templates.sql (41_ lens UUIDs)
-- =============================================================================

DO $seed$
DECLARE
  -- Demo agent IDs (deterministic from 07_ai_lensers.sql)
  AGENT_GPT4O    uuid := 'c3000000-0000-0000-0000-000000000001';
  AGENT_CLAUDE   uuid := 'c3000000-0000-0000-0000-000000000002';
  AGENT_GEMINI   uuid := 'c3000000-0000-0000-0000-000000000003';

  -- 40_ lens IDs
  L40_INTENT     uuid := '40000000-0001-0001-0001-000000000001';
  L40_PLAN       uuid := '40000000-0001-0002-0001-000000000001';
  L40_RESEARCH   uuid := '40000000-0001-0003-0001-000000000001';
  L40_GEN_TEXT   uuid := '40000000-0001-0004-0001-000000000001';
  L40_GEN_IMAGE  uuid := '40000000-0001-0005-0001-000000000001';
  L40_GEN_VIDEO  uuid := '40000000-0001-0006-0001-000000000001';
  L40_REFINE     uuid := '40000000-0001-0007-0001-000000000001';
  L40_VALIDATE   uuid := '40000000-0001-0008-0001-000000000001';
  L40_EXPORT_PDF uuid := '40000000-0001-0009-0001-000000000001';

  -- 41_ lens IDs
  L41_CODE_REVIEWER  uuid := '41000000-0001-0001-0001-000000000001';
  L41_UNIT_TEST      uuid := '41000000-0001-0002-0001-000000000001';
  L41_BUG_ANALYZER   uuid := '41000000-0001-0003-0001-000000000001';
  L41_PR_WRITER      uuid := '41000000-0001-0004-0001-000000000001';
  L41_SQL_BUILDER    uuid := '41000000-0001-0005-0001-000000000001';
  L41_API_DOC        uuid := '41000000-0001-0006-0001-000000000001';
  L41_CODE_EXPLAINER uuid := '41000000-0001-0007-0001-000000000001';
  L41_REFACTOR       uuid := '41000000-0001-0008-0001-000000000001';
  L41_MEETING        uuid := '41000000-0001-0009-0001-000000000001';
  L41_USER_STORY     uuid := '41000000-0001-000a-0001-000000000001';
  L41_EMAIL          uuid := '41000000-0001-000b-0001-000000000001';
  L41_THREAD         uuid := '41000000-0001-000c-0001-000000000001';
  L41_CHALLENGE      uuid := '41000000-0001-000d-0001-000000000001';

BEGIN
  -- Guard: 41_ lenses must exist
  IF NOT EXISTS (SELECT 1 FROM lenses.lenses WHERE id = L41_CODE_REVIEWER) THEN
    RAISE NOTICE '43_ai_agent_lens_bindings: 41_ lenses not seeded yet — skipping.';
    RETURN;
  END IF;

  -- Guard: agent rows must exist
  IF NOT EXISTS (SELECT 1 FROM agents.ai_lensers WHERE id = AGENT_GPT4O) THEN
    RAISE NOTICE '43_ai_agent_lens_bindings: demo AI lensers not seeded yet — skipping.';
    RETURN;
  END IF;

  -- ===========================================================================
  -- GPT-4o — structured output, tool-calling, code generation
  -- Default: Code Reviewer (most used capability for developer workflows)
  -- ===========================================================================
  INSERT INTO agents.lens_bindings (id, ai_lenser_id, lens_id, version_id, is_default, category_tags)
  VALUES
    ('43000000-0001-0001-0001-000000000001', AGENT_GPT4O, L41_CODE_REVIEWER,  NULL, true,  ARRAY['code','review']),
    ('43000000-0001-0001-0001-000000000002', AGENT_GPT4O, L41_UNIT_TEST,      NULL, false, ARRAY['code','testing']),
    ('43000000-0001-0001-0001-000000000003', AGENT_GPT4O, L41_SQL_BUILDER,    NULL, false, ARRAY['data','sql']),
    ('43000000-0001-0001-0001-000000000004', AGENT_GPT4O, L41_PR_WRITER,      NULL, false, ARRAY['documentation','code']),
    -- 40_ lenses: text generation and PDF export (structured, tool-like)
    ('43000000-0001-0001-0001-000000000005', AGENT_GPT4O, L40_GEN_TEXT,       NULL, false, ARRAY['text','generation']),
    ('43000000-0001-0001-0001-000000000006', AGENT_GPT4O, L40_EXPORT_PDF,     NULL, false, ARRAY['export','pdf'])
  ON CONFLICT (ai_lenser_id, lens_id) DO NOTHING;

  -- ===========================================================================
  -- Claude Sonnet 4.6 — deep reasoning, long context, nuanced analysis
  -- Default: Bug Analyzer (requires careful multi-step reasoning)
  -- ===========================================================================
  INSERT INTO agents.lens_bindings (id, ai_lenser_id, lens_id, version_id, is_default, category_tags)
  VALUES
    ('43000000-0001-0002-0001-000000000001', AGENT_CLAUDE, L41_BUG_ANALYZER,   NULL, true,  ARRAY['code','debugging']),
    ('43000000-0001-0002-0001-000000000002', AGENT_CLAUDE, L41_CODE_EXPLAINER, NULL, false, ARRAY['code','education']),
    ('43000000-0001-0002-0001-000000000003', AGENT_CLAUDE, L41_REFACTOR,       NULL, false, ARRAY['code','refactoring']),
    ('43000000-0001-0002-0001-000000000004', AGENT_CLAUDE, L41_API_DOC,        NULL, false, ARRAY['documentation']),
    ('43000000-0001-0002-0001-000000000005', AGENT_CLAUDE, L41_MEETING,        NULL, false, ARRAY['planning','summarization']),
    -- 40_ lenses: intent classification, research, validation (analysis-heavy)
    ('43000000-0001-0002-0001-000000000006', AGENT_CLAUDE, L40_INTENT,         NULL, false, ARRAY['routing','orchestration']),
    ('43000000-0001-0002-0001-000000000007', AGENT_CLAUDE, L40_RESEARCH,       NULL, false, ARRAY['research','synthesis']),
    ('43000000-0001-0002-0001-000000000008', AGENT_CLAUDE, L40_VALIDATE,       NULL, false, ARRAY['validation','quality'])
  ON CONFLICT (ai_lenser_id, lens_id) DO NOTHING;

  -- ===========================================================================
  -- Gemini 2.5 Flash — speed, multimodal, community and planning tasks
  -- Default: Thread Starter (fast, engaging, community-facing)
  -- ===========================================================================
  INSERT INTO agents.lens_bindings (id, ai_lenser_id, lens_id, version_id, is_default, category_tags)
  VALUES
    ('43000000-0001-0003-0001-000000000001', AGENT_GEMINI, L41_THREAD,      NULL, true,  ARRAY['community','engagement']),
    ('43000000-0001-0003-0001-000000000002', AGENT_GEMINI, L41_CHALLENGE,   NULL, false, ARRAY['community','challenges']),
    ('43000000-0001-0003-0001-000000000003', AGENT_GEMINI, L41_EMAIL,       NULL, false, ARRAY['community','email']),
    ('43000000-0001-0003-0001-000000000004', AGENT_GEMINI, L41_USER_STORY,  NULL, false, ARRAY['planning','stories']),
    -- 40_ lenses: planning, image/video generation (multimodal strengths)
    ('43000000-0001-0003-0001-000000000005', AGENT_GEMINI, L40_PLAN,        NULL, false, ARRAY['orchestration','planning']),
    ('43000000-0001-0003-0001-000000000006', AGENT_GEMINI, L40_GEN_IMAGE,   NULL, false, ARRAY['image','generation']),
    ('43000000-0001-0003-0001-000000000007', AGENT_GEMINI, L40_GEN_VIDEO,   NULL, false, ARRAY['video','generation']),
    ('43000000-0001-0003-0001-000000000008', AGENT_GEMINI, L40_REFINE,      NULL, false, ARRAY['transform','refinement'])
  ON CONFLICT (ai_lenser_id, lens_id) DO NOTHING;

  RAISE NOTICE '43_ai_agent_lens_bindings: seeded lens bindings for GPT-4o, Claude Sonnet 4.6, and Gemini 2.5 Flash.';
END
$seed$;

ANALYZE agents.lens_bindings;
