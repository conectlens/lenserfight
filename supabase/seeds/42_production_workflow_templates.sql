-- =============================================================================
-- 42. PRODUCTION WORKFLOW TEMPLATES
-- =============================================================================
-- 6 end-to-end workflows chaining lenses from both 40_ (chain templates) and
-- 41_ (developer/community templates). Every workflow is tagged 'template' so
-- fn_list_template_workflows() surfaces it on the WorkflowsPage strip.
--
-- Lens UUID constants from 40_lens_chain_templates.sql:
--   Intent      40000000-0001-0001-0001-000000000001
--   Research    40000000-0001-0003-0001-000000000001
--   Text Gen    40000000-0001-0004-0001-000000000001
--   Refine      40000000-0001-0007-0001-000000000001
--   Validate    40000000-0001-0008-0001-000000000001
--   Export PDF  40000000-0001-0009-0001-000000000001
--
-- Lens UUID constants from 41_developer_lens_templates.sql:
--   Code Reviewer      41000000-0001-0001-0001-000000000001
--   Unit Test Gen      41000000-0001-0002-0001-000000000001
--   Bug Analyzer       41000000-0001-0003-0001-000000000001
--   PR Writer          41000000-0001-0004-0001-000000000001
--   SQL Builder        41000000-0001-0005-0001-000000000001
--   API Doc Gen        41000000-0001-0006-0001-000000000001
--   Code Explainer     41000000-0001-0007-0001-000000000001
--   Refactor Advisor   41000000-0001-0008-0001-000000000001
--   Thread Starter     41000000-0001-000c-0001-000000000001
--   Challenge Creator  41000000-0001-000d-0001-000000000001
--
-- Idempotent: every block is gated with IF NOT EXISTS.
-- version_id is NULL on all nodes → always executes against the lens HEAD.
--
-- Dependencies:
--   • 07_ai_lensers.sql          (provides v_author)
--   • 40_lens_chain_templates.sql (lens IDs above)
--   • 41_developer_lens_templates.sql (lens IDs above)
--   • migration 20260417150000   (template tag + RPC)
-- =============================================================================

DO $seed$
DECLARE
  v_author    uuid;
  v_tag_template uuid;

  -- ── 40_ lens constants ──────────────────────────────────────────────────────
  L40_INTENT      uuid := '40000000-0001-0001-0001-000000000001';
  L40_RESEARCH    uuid := '40000000-0001-0003-0001-000000000001';
  L40_GEN_TEXT    uuid := '40000000-0001-0004-0001-000000000001';
  L40_REFINE      uuid := '40000000-0001-0007-0001-000000000001';
  L40_VALIDATE    uuid := '40000000-0001-0008-0001-000000000001';
  L40_EXPORT_PDF  uuid := '40000000-0001-0009-0001-000000000001';

  -- ── 41_ lens constants ──────────────────────────────────────────────────────
  L41_CODE_REVIEWER  uuid := '41000000-0001-0001-0001-000000000001';
  L41_UNIT_TEST      uuid := '41000000-0001-0002-0001-000000000001';
  L41_BUG_ANALYZER   uuid := '41000000-0001-0003-0001-000000000001';
  L41_PR_WRITER      uuid := '41000000-0001-0004-0001-000000000001';
  L41_SQL_BUILDER    uuid := '41000000-0001-0005-0001-000000000001';
  L41_API_DOC        uuid := '41000000-0001-0006-0001-000000000001';
  L41_CODE_EXPLAINER uuid := '41000000-0001-0007-0001-000000000001';
  L41_REFACTOR       uuid := '41000000-0001-0008-0001-000000000001';
  L41_USER_STORY     uuid := '41000000-0001-000a-0001-000000000001';
  L41_EMAIL          uuid := '41000000-0001-000b-0001-000000000001';
  L41_THREAD         uuid := '41000000-0001-000c-0001-000000000001';
  L41_CHALLENGE      uuid := '41000000-0001-000d-0001-000000000001';

  -- ── WF-1: Developer Code Review Suite (3 nodes, 3 phases) ──────────────────
  WF1 uuid := '42000000-0002-0001-0001-000000000001';
  WF1_N1 uuid := '42000000-0002-0001-0002-000000000001';  -- Code Reviewer
  WF1_N2 uuid := '42000000-0002-0001-0002-000000000002';  -- Unit Test Gen
  WF1_N3 uuid := '42000000-0002-0001-0002-000000000003';  -- PR Writer
  WF1_P1 uuid := '42000000-0002-0001-0003-000000000001';  -- Phase: Review
  WF1_P2 uuid := '42000000-0002-0001-0003-000000000002';  -- Phase: Test
  WF1_P3 uuid := '42000000-0002-0001-0003-000000000003';  -- Phase: Ship
  WF1_T1 uuid := '42000000-0002-0001-0004-000000000001';
  WF1_T2 uuid := '42000000-0002-0001-0004-000000000002';
  WF1_T3 uuid := '42000000-0002-0001-0004-000000000003';
  WF1_T4 uuid := '42000000-0002-0001-0004-000000000004';
  WF1_T5 uuid := '42000000-0002-0001-0004-000000000005';
  WF1_T6 uuid := '42000000-0002-0001-0004-000000000006';

  -- ── WF-2: Bug Investigation & Fix Pipeline (4 nodes, 4 phases) ─────────────
  WF2 uuid := '42000000-0002-0002-0001-000000000001';
  WF2_N1 uuid := '42000000-0002-0002-0002-000000000001';  -- Bug Analyzer
  WF2_N2 uuid := '42000000-0002-0002-0002-000000000002';  -- Code Explainer
  WF2_N3 uuid := '42000000-0002-0002-0002-000000000003';  -- Refactor Advisor
  WF2_N4 uuid := '42000000-0002-0002-0002-000000000004';  -- PR Writer
  WF2_P1 uuid := '42000000-0002-0002-0003-000000000001';  -- Phase: Diagnose
  WF2_P2 uuid := '42000000-0002-0002-0003-000000000002';  -- Phase: Understand
  WF2_P3 uuid := '42000000-0002-0002-0003-000000000003';  -- Phase: Fix
  WF2_P4 uuid := '42000000-0002-0002-0003-000000000004';  -- Phase: Document
  WF2_T1 uuid := '42000000-0002-0002-0004-000000000001';
  WF2_T2 uuid := '42000000-0002-0002-0004-000000000002';
  WF2_T3 uuid := '42000000-0002-0002-0004-000000000003';
  WF2_T4 uuid := '42000000-0002-0002-0004-000000000004';
  WF2_T5 uuid := '42000000-0002-0002-0004-000000000005';
  WF2_T6 uuid := '42000000-0002-0002-0004-000000000006';
  WF2_T7 uuid := '42000000-0002-0002-0004-000000000007';
  WF2_T8 uuid := '42000000-0002-0002-0004-000000000008';

  -- ── WF-3: API Documentation Suite (4 nodes, 4 phases) ──────────────────────
  WF3 uuid := '42000000-0002-0003-0001-000000000001';
  WF3_N1 uuid := '42000000-0002-0003-0002-000000000001';  -- API Doc Gen
  WF3_N2 uuid := '42000000-0002-0003-0002-000000000002';  -- Refine (40_)
  WF3_N3 uuid := '42000000-0002-0003-0002-000000000003';  -- Validate (40_)
  WF3_N4 uuid := '42000000-0002-0003-0002-000000000004';  -- Export PDF (40_)
  WF3_P1 uuid := '42000000-0002-0003-0003-000000000001';  -- Phase: Analyze
  WF3_P2 uuid := '42000000-0002-0003-0003-000000000002';  -- Phase: Document
  WF3_P3 uuid := '42000000-0002-0003-0003-000000000003';  -- Phase: Quality Gate
  WF3_P4 uuid := '42000000-0002-0003-0003-000000000004';  -- Phase: Publish
  WF3_T1 uuid := '42000000-0002-0003-0004-000000000001';
  WF3_T2 uuid := '42000000-0002-0003-0004-000000000002';
  WF3_T3 uuid := '42000000-0002-0003-0004-000000000003';
  WF3_T4 uuid := '42000000-0002-0003-0004-000000000004';
  WF3_T5 uuid := '42000000-0002-0003-0004-000000000005';
  WF3_T6 uuid := '42000000-0002-0003-0004-000000000006';
  WF3_T7 uuid := '42000000-0002-0003-0004-000000000007';
  WF3_T8 uuid := '42000000-0002-0003-0004-000000000008';

  -- ── WF-4: Sprint Story to SQL (3 nodes, 3 phases) ──────────────────────────
  WF4 uuid := '42000000-0002-0004-0001-000000000001';
  WF4_N1 uuid := '42000000-0002-0004-0002-000000000001';  -- User Story Gen
  WF4_N2 uuid := '42000000-0002-0004-0002-000000000002';  -- SQL Builder
  WF4_N3 uuid := '42000000-0002-0004-0002-000000000003';  -- PR Writer
  WF4_P1 uuid := '42000000-0002-0004-0003-000000000001';  -- Phase: Define
  WF4_P2 uuid := '42000000-0002-0004-0003-000000000002';  -- Phase: Model
  WF4_P3 uuid := '42000000-0002-0004-0003-000000000003';  -- Phase: Deliver
  WF4_T1 uuid := '42000000-0002-0004-0004-000000000001';
  WF4_T2 uuid := '42000000-0002-0004-0004-000000000002';
  WF4_T3 uuid := '42000000-0002-0004-0004-000000000003';
  WF4_T4 uuid := '42000000-0002-0004-0004-000000000004';
  WF4_T5 uuid := '42000000-0002-0004-0004-000000000005';
  WF4_T6 uuid := '42000000-0002-0004-0004-000000000006';

  -- ── WF-5: Community Engagement Pipeline (3 nodes, 3 phases) ────────────────
  WF5 uuid := '42000000-0002-0005-0001-000000000001';
  WF5_N1 uuid := '42000000-0002-0005-0002-000000000001';  -- Thread Starter
  WF5_N2 uuid := '42000000-0002-0005-0002-000000000002';  -- Challenge Creator
  WF5_N3 uuid := '42000000-0002-0005-0002-000000000003';  -- Email Draft Writer
  WF5_P1 uuid := '42000000-0002-0005-0003-000000000001';  -- Phase: Engage
  WF5_P2 uuid := '42000000-0002-0005-0003-000000000002';  -- Phase: Challenge
  WF5_P3 uuid := '42000000-0002-0005-0003-000000000003';  -- Phase: Announce
  WF5_T1 uuid := '42000000-0002-0005-0004-000000000001';
  WF5_T2 uuid := '42000000-0002-0005-0004-000000000002';
  WF5_T3 uuid := '42000000-0002-0005-0004-000000000003';
  WF5_T4 uuid := '42000000-0002-0005-0004-000000000004';
  WF5_T5 uuid := '42000000-0002-0005-0004-000000000005';
  WF5_T6 uuid := '42000000-0002-0005-0004-000000000006';

  -- ── WF-6: Research to Community Thread (5 nodes, 5 phases) ─────────────────
  WF6 uuid := '42000000-0002-0006-0001-000000000001';
  WF6_N1 uuid := '42000000-0002-0006-0002-000000000001';  -- Intent (40_)
  WF6_N2 uuid := '42000000-0002-0006-0002-000000000002';  -- Research (40_)
  WF6_N3 uuid := '42000000-0002-0006-0002-000000000003';  -- Text Gen (40_)
  WF6_N4 uuid := '42000000-0002-0006-0002-000000000004';  -- Refine (40_)
  WF6_N5 uuid := '42000000-0002-0006-0002-000000000005';  -- Thread Starter (41_)
  WF6_P1 uuid := '42000000-0002-0006-0003-000000000001';  -- Phase: Understand
  WF6_P2 uuid := '42000000-0002-0006-0003-000000000002';  -- Phase: Research
  WF6_P3 uuid := '42000000-0002-0006-0003-000000000003';  -- Phase: Draft
  WF6_P4 uuid := '42000000-0002-0006-0003-000000000004';  -- Phase: Polish
  WF6_P5 uuid := '42000000-0002-0006-0003-000000000005';  -- Phase: Publish
  WF6_T1  uuid := '42000000-0002-0006-0004-000000000001';
  WF6_T2  uuid := '42000000-0002-0006-0004-000000000002';
  WF6_T3  uuid := '42000000-0002-0006-0004-000000000003';
  WF6_T4  uuid := '42000000-0002-0006-0004-000000000004';
  WF6_T5  uuid := '42000000-0002-0006-0004-000000000005';
  WF6_T6  uuid := '42000000-0002-0006-0004-000000000006';
  WF6_T7  uuid := '42000000-0002-0006-0004-000000000007';
  WF6_T8  uuid := '42000000-0002-0006-0004-000000000008';
  WF6_T9  uuid := '42000000-0002-0006-0004-000000000009';
  WF6_T10 uuid := '42000000-0002-0006-0004-00000000000a';

BEGIN
  -- ── Resolve shared dependencies ─────────────────────────────────────────────
  -- Canonical author: @lenserfight (reserved production account).
  SELECT id INTO v_author FROM lensers.profiles WHERE handle = 'lenserfight' LIMIT 1;

  IF v_author IS NULL THEN
    SELECT id INTO v_author
    FROM lensers.profiles
    WHERE type = 'ai'::lensers.lenser_type AND status = 'active'::lensers.lenser_status
    ORDER BY created_at ASC LIMIT 1;
  END IF;

  IF v_author IS NULL THEN
    SELECT id INTO v_author FROM lensers.profiles ORDER BY created_at ASC LIMIT 1;
  END IF;

  IF v_author IS NULL THEN
    RAISE NOTICE '42_production_workflow_templates: no lensers.profiles row yet — skipping.';
    RETURN;
  END IF;

  SELECT id INTO v_tag_template FROM content.tags WHERE slug = 'template';

  IF v_tag_template IS NULL THEN
    RAISE NOTICE '42_production_workflow_templates: template tag missing — run migration 20260417150000 first.';
    RETURN;
  END IF;

  -- Guard: 41_ lenses must exist before we can reference them
  IF NOT EXISTS (SELECT 1 FROM lenses.lenses WHERE id = L41_CODE_REVIEWER) THEN
    RAISE NOTICE '42_production_workflow_templates: 41_ developer lenses not seeded yet — skipping.';
    RETURN;
  END IF;

  -- =============================================================================
  -- WF-1: Developer Code Review Suite
  -- Code Reviewer → Unit Test Generator → PR Description Writer
  -- =============================================================================
  IF NOT EXISTS (SELECT 1 FROM lenses.workflows WHERE id = WF1) THEN
    INSERT INTO lenses.workflows (id, lenser_id, title, description, visibility)
    VALUES (
      WF1, v_author,
      'Template · Developer Code Review Suite',
      'Review code for bugs and style, auto-generate a test suite for the flagged areas, then produce a ready-to-submit PR description. Three-step quality gate for any code change.',
      'public'
    );

    INSERT INTO lenses.workflow_nodes (id, workflow_id, lens_id, version_id, position_x, position_y, label, ordinal) VALUES
      (WF1_N1, WF1, L41_CODE_REVIEWER,  NULL,  0,   0, 'Code Review',    1),
      (WF1_N2, WF1, L41_UNIT_TEST,      NULL,  220, 0, 'Unit Tests',     2),
      (WF1_N3, WF1, L41_PR_WRITER,      NULL,  440, 0, 'PR Description', 3);

    INSERT INTO lenses.workflow_edges (workflow_id, source_node_id, target_node_id, source_output_key, target_param_label) VALUES
      (WF1, WF1_N1, WF1_N2, 'output', 'function_code'),
      (WF1, WF1_N2, WF1_N3, 'output', 'diff_summary');

    INSERT INTO lenses.workflow_phases (id, workflow_id, title, description, ordinal) VALUES
      (WF1_P1, WF1, 'Code Review',    'Analyze the code for bugs, security, and style issues.',     1),
      (WF1_P2, WF1, 'Test Coverage',  'Generate unit tests covering flagged scenarios.',             2),
      (WF1_P3, WF1, 'Ship',           'Write a structured PR description ready for peer review.',   3);

    INSERT INTO lenses.workflow_tasks (id, phase_id, workflow_id, title, prompt_text, output_type, ordinal) VALUES
      (WF1_T1, WF1_P1, WF1, 'Review code quality',     'Identify bugs, security issues, and style violations in the submitted code.', 'text', 1),
      (WF1_T2, WF1_P1, WF1, 'Rate overall quality',    'Score the code 1-10 and summarize the top 3 issues to fix.', 'text', 2),
      (WF1_T3, WF1_P2, WF1, 'Generate test cases',     'Create unit tests for the happy path, boundary values, and error cases identified in the review.', 'text', 1),
      (WF1_T4, WF1_P2, WF1, 'Add mocks and imports',   'Include all required imports, mocks, and test runner setup so tests can run immediately.', 'text', 2),
      (WF1_T5, WF1_P3, WF1, 'Draft PR description',    'Summarize the change, test plan, and any breaking changes for reviewers.', 'text', 1),
      (WF1_T6, WF1_P3, WF1, 'Finalize PR body',        'Polish the PR description to be concise, professional, and review-ready.', 'text', 2);

    INSERT INTO content.tag_map (entity_type, entity_id, tag_id)
    VALUES ('workflow'::content.entity_type_enum, WF1, v_tag_template)
    ON CONFLICT DO NOTHING;
  END IF;

  -- =============================================================================
  -- WF-2: Bug Investigation & Fix Pipeline
  -- Bug Analyzer → Code Explainer → Refactoring Advisor → PR Writer
  -- =============================================================================
  IF NOT EXISTS (SELECT 1 FROM lenses.workflows WHERE id = WF2) THEN
    INSERT INTO lenses.workflows (id, lenser_id, title, description, visibility)
    VALUES (
      WF2, v_author,
      'Template · Bug Investigation & Fix Pipeline',
      'Diagnose a bug from error logs, explain the root cause in plain language, propose concrete refactoring to fix it, then write the PR description. End-to-end from stack trace to ship.',
      'public'
    );

    INSERT INTO lenses.workflow_nodes (id, workflow_id, lens_id, version_id, position_x, position_y, label, ordinal) VALUES
      (WF2_N1, WF2, L41_BUG_ANALYZER,   NULL,  0,   0, 'Diagnose',  1),
      (WF2_N2, WF2, L41_CODE_EXPLAINER, NULL,  220, 0, 'Explain',   2),
      (WF2_N3, WF2, L41_REFACTOR,       NULL,  440, 0, 'Fix',       3),
      (WF2_N4, WF2, L41_PR_WRITER,      NULL,  660, 0, 'Document',  4);

    INSERT INTO lenses.workflow_edges (workflow_id, source_node_id, target_node_id, source_output_key, target_param_label) VALUES
      (WF2, WF2_N1, WF2_N2, 'output', 'code'),
      (WF2, WF2_N2, WF2_N3, 'output', 'code'),
      (WF2, WF2_N3, WF2_N4, 'output', 'diff_summary');

    INSERT INTO lenses.workflow_phases (id, workflow_id, title, description, ordinal) VALUES
      (WF2_P1, WF2, 'Diagnose',    'Identify root cause, affected component, and severity from the error log.',   1),
      (WF2_P2, WF2, 'Understand',  'Explain the bug and its context to the team in plain language.',              2),
      (WF2_P3, WF2, 'Fix',         'Propose concrete code changes with before/after snippets.',                  3),
      (WF2_P4, WF2, 'Document',    'Write the PR description for the fix including test plan.',                   4);

    INSERT INTO lenses.workflow_tasks (id, phase_id, workflow_id, title, prompt_text, output_type, ordinal) VALUES
      (WF2_T1, WF2_P1, WF2, 'Classify root cause',      'Determine whether the bug is a logic error, null dereference, concurrency issue, or external dependency failure.', 'text', 1),
      (WF2_T2, WF2_P1, WF2, 'Assess severity',           'Rate severity (critical/high/medium/low) and list reproduction steps.', 'text', 2),
      (WF2_T3, WF2_P2, WF2, 'Explain the bug',           'Describe what went wrong in terms a junior developer can understand.', 'text', 1),
      (WF2_T4, WF2_P2, WF2, 'Identify gotchas',          'Surface any subtle invariants or assumptions the bug violated.', 'text', 2),
      (WF2_T5, WF2_P3, WF2, 'Propose refactoring',       'Suggest the minimal code change that fixes the root cause without introducing regressions.', 'text', 1),
      (WF2_T6, WF2_P3, WF2, 'Flag breaking implications','Note if the fix changes any public API, database schema, or external contract.', 'text', 2),
      (WF2_T7, WF2_P4, WF2, 'Write PR summary',          'Summarize the bug, root cause, and fix approach in 2-3 bullets.', 'text', 1),
      (WF2_T8, WF2_P4, WF2, 'Define test plan',          'List the manual steps a reviewer should follow to verify the fix.', 'text', 2);

    INSERT INTO content.tag_map (entity_type, entity_id, tag_id)
    VALUES ('workflow', WF2, v_tag_template)
    ON CONFLICT DO NOTHING;
  END IF;

  -- =============================================================================
  -- WF-3: API Documentation Suite
  -- API Doc Generator → Refine (40_) → Validate (40_) → Export PDF (40_)
  -- =============================================================================
  IF NOT EXISTS (SELECT 1 FROM lenses.workflows WHERE id = WF3) THEN
    INSERT INTO lenses.workflows (id, lenser_id, title, description, visibility)
    VALUES (
      WF3, v_author,
      'Template · API Documentation Suite',
      'Generate API docs from code, refine for clarity and completeness, validate against a spec rubric, then export as a production-ready PDF artifact.',
      'public'
    );

    INSERT INTO lenses.workflow_nodes (id, workflow_id, lens_id, version_id, position_x, position_y, label, ordinal) VALUES
      (WF3_N1, WF3, L41_API_DOC,     NULL,  0,   0, 'Generate Docs', 1),
      (WF3_N2, WF3, L40_REFINE,      NULL,  220, 0, 'Refine',        2),
      (WF3_N3, WF3, L40_VALIDATE,    NULL,  440, 0, 'Validate',      3),
      (WF3_N4, WF3, L40_EXPORT_PDF,  NULL,  660, 0, 'Export PDF',    4);

    INSERT INTO lenses.workflow_edges (workflow_id, source_node_id, target_node_id, source_output_key, target_param_label) VALUES
      (WF3, WF3_N1, WF3_N2, 'output', 'draft'),
      (WF3, WF3_N2, WF3_N3, 'output', 'output'),
      (WF3, WF3_N3, WF3_N4, 'output', 'content');

    INSERT INTO lenses.workflow_phases (id, workflow_id, title, description, ordinal) VALUES
      (WF3_P1, WF3, 'Analyze',       'Inspect the source code and identify all public APIs to document.',          1),
      (WF3_P2, WF3, 'Document',      'Generate and refine structured API documentation for each endpoint.',        2),
      (WF3_P3, WF3, 'Quality Gate',  'Validate the docs against completeness and accuracy requirements.',          3),
      (WF3_P4, WF3, 'Publish',       'Export a production-ready PDF for distribution or developer portal upload.', 4);

    INSERT INTO lenses.workflow_tasks (id, phase_id, workflow_id, title, prompt_text, output_type, ordinal) VALUES
      (WF3_T1, WF3_P1, WF3, 'Identify public APIs',       'List all exported functions, endpoints, or methods that require documentation.', 'text', 1),
      (WF3_T2, WF3_P1, WF3, 'Infer parameter types',      'Extract parameter names, types, and required/optional status from the code.', 'text', 2),
      (WF3_T3, WF3_P2, WF3, 'Generate API docs draft',    'Produce structured documentation including descriptions, parameters, return types, errors, and usage examples.', 'text', 1),
      (WF3_T4, WF3_P2, WF3, 'Refine for clarity',         'Improve readability, fix ambiguous phrasing, and ensure consistent terminology.', 'text', 2),
      (WF3_T5, WF3_P3, WF3, 'Validate completeness',      'Check that every public API has a description, all parameters are documented, and at least one example is present.', 'text', 1),
      (WF3_T6, WF3_P3, WF3, 'Flag gaps',                  'List any undocumented endpoints, missing return types, or TODO placeholders.', 'text', 2),
      (WF3_T7, WF3_P4, WF3, 'Prepare PDF manifest',       'Structure the validated docs into sections with proper headings and page-break hints.', 'text', 1),
      (WF3_T8, WF3_P4, WF3, 'Export and verify',          'Confirm the exported PDF contains all sections, citations, and is ready for the developer portal.', 'text', 2);

    INSERT INTO content.tag_map (entity_type, entity_id, tag_id)
    VALUES ('workflow', WF3, v_tag_template)
    ON CONFLICT DO NOTHING;
  END IF;

  -- =============================================================================
  -- WF-4: Sprint Story to SQL
  -- User Story Generator → SQL Query Builder → PR Description Writer
  -- =============================================================================
  IF NOT EXISTS (SELECT 1 FROM lenses.workflows WHERE id = WF4) THEN
    INSERT INTO lenses.workflows (id, lenser_id, title, description, visibility)
    VALUES (
      WF4, v_author,
      'Template · Sprint Story to SQL',
      'Convert a feature idea into user stories with acceptance criteria, derive the SQL schema or queries needed, then write a PR description — from product brief to database migration ready.',
      'public'
    );

    INSERT INTO lenses.workflow_nodes (id, workflow_id, lens_id, version_id, position_x, position_y, label, ordinal) VALUES
      (WF4_N1, WF4, L41_USER_STORY,  NULL,  0,   0, 'User Stories', 1),
      (WF4_N2, WF4, L41_SQL_BUILDER, NULL,  220, 0, 'SQL Query',    2),
      (WF4_N3, WF4, L41_PR_WRITER,   NULL,  440, 0, 'PR Body',      3);

    INSERT INTO lenses.workflow_edges (workflow_id, source_node_id, target_node_id, source_output_key, target_param_label) VALUES
      (WF4, WF4_N1, WF4_N2, 'output', 'requirements'),
      (WF4, WF4_N2, WF4_N3, 'output', 'diff_summary');

    INSERT INTO lenses.workflow_phases (id, workflow_id, title, description, ordinal) VALUES
      (WF4_P1, WF4, 'Define',   'Break the feature down into INVEST-compliant user stories.',                1),
      (WF4_P2, WF4, 'Model',    'Derive the SQL queries or schema changes required to fulfill the stories.',  2),
      (WF4_P3, WF4, 'Deliver',  'Write a PR description that links stories to the SQL implementation.',      3);

    INSERT INTO lenses.workflow_tasks (id, phase_id, workflow_id, title, prompt_text, output_type, ordinal) VALUES
      (WF4_T1, WF4_P1, WF4, 'Draft user stories',       'Write user stories in the "As a / I want / So that" format with Given/When/Then acceptance criteria.', 'text', 1),
      (WF4_T2, WF4_P1, WF4, 'Estimate story points',    'Assign Fibonacci story points and priority (Must/Should/Could) to each story.', 'text', 2),
      (WF4_T3, WF4_P2, WF4, 'Build SQL queries',        'Write the PostgreSQL queries or CREATE TABLE / ALTER TABLE statements needed to implement the stories.', 'text', 1),
      (WF4_T4, WF4_P2, WF4, 'Annotate with caveats',    'Flag NULL handling, index requirements, and any performance concerns for large tables.', 'text', 2),
      (WF4_T5, WF4_P3, WF4, 'Write PR summary',         'Summarize which stories are addressed and what SQL changes are included.', 'text', 1),
      (WF4_T6, WF4_P3, WF4, 'Define migration test plan','List steps to test the migration in staging before applying to production.', 'text', 2);

    INSERT INTO content.tag_map (entity_type, entity_id, tag_id)
    VALUES ('workflow', WF4, v_tag_template)
    ON CONFLICT DO NOTHING;
  END IF;

  -- =============================================================================
  -- WF-5: Community Engagement Pipeline
  -- Thread Starter → Challenge Creator → Email Draft Writer
  -- =============================================================================
  IF NOT EXISTS (SELECT 1 FROM lenses.workflows WHERE id = WF5) THEN
    INSERT INTO lenses.workflows (id, lenser_id, title, description, visibility)
    VALUES (
      WF5, v_author,
      'Template · Community Engagement Pipeline',
      'Kick off a community topic with an engaging thread, design a LenserFight challenge around it, then announce the challenge to participants via a professional email. Full community activation loop.',
      'public'
    );

    INSERT INTO lenses.workflow_nodes (id, workflow_id, lens_id, version_id, position_x, position_y, label, ordinal) VALUES
      (WF5_N1, WF5, L41_THREAD,     NULL,  0,   0, 'Open Thread',  1),
      (WF5_N2, WF5, L41_CHALLENGE,  NULL,  220, 0, 'Challenge',    2),
      (WF5_N3, WF5, L41_EMAIL, NULL, 440, 0, 'Announce', 3);

    INSERT INTO lenses.workflow_edges (workflow_id, source_node_id, target_node_id, source_output_key, target_param_label) VALUES
      (WF5, WF5_N1, WF5_N2, 'output', 'subject'),
      (WF5, WF5_N2, WF5_N3, 'output', 'intent');

    INSERT INTO lenses.workflow_phases (id, workflow_id, title, description, ordinal) VALUES
      (WF5_P1, WF5, 'Engage',     'Launch an engaging discussion thread to seed community interest.',                  1),
      (WF5_P2, WF5, 'Challenge',  'Design a fair, learnable LenserFight challenge on the thread topic.',              2),
      (WF5_P3, WF5, 'Announce',   'Draft a clear announcement email inviting community members to participate.',       3);

    INSERT INTO lenses.workflow_tasks (id, phase_id, workflow_id, title, prompt_text, output_type, ordinal) VALUES
      (WF5_T1, WF5_P1, WF5, 'Write thread hook',           'Craft a compelling opening sentence that earns curiosity through substance, not clickbait.', 'text', 1),
      (WF5_T2, WF5_P1, WF5, 'Add discussion sub-questions','Write 2-3 framing questions that invite different perspectives on the topic.', 'text', 2),
      (WF5_T3, WF5_P2, WF5, 'Design challenge prompt',     'Write a clear, unambiguous challenge statement that participants can attempt within the time limit.', 'text', 1),
      (WF5_T4, WF5_P2, WF5, 'Define evaluation rubric',    'Create a rubric with 3-5 criteria whose weights sum to 100%.', 'text', 2),
      (WF5_T5, WF5_P3, WF5, 'Draft announcement email',    'Write a subject line and body that explain the challenge, how to participate, and the deadline.', 'text', 1),
      (WF5_T6, WF5_P3, WF5, 'Add participation CTA',       'Include a clear call-to-action link and follow-up suggestion for recipients.', 'text', 2);

    INSERT INTO content.tag_map (entity_type, entity_id, tag_id)
    VALUES ('workflow', WF5, v_tag_template)
    ON CONFLICT DO NOTHING;
  END IF;

  -- =============================================================================
  -- WF-6: Research to Community Thread (cross-template)
  -- Intent (40_) → Research (40_) → Text Gen (40_) → Refine (40_) → Thread Starter (41_)
  -- =============================================================================
  IF NOT EXISTS (SELECT 1 FROM lenses.workflows WHERE id = WF6) THEN
    INSERT INTO lenses.workflows (id, lenser_id, title, description, visibility)
    VALUES (
      WF6, v_author,
      'Template · Research to Community Thread',
      'Classify a user request, conduct deep research, draft a long-form text, refine it for quality, then publish as an engaging community thread. Bridges the Connected Lens research pipeline with community distribution.',
      'public'
    );

    INSERT INTO lenses.workflow_nodes (id, workflow_id, lens_id, version_id, position_x, position_y, label, ordinal) VALUES
      (WF6_N1, WF6, L40_INTENT,    NULL,  0,    0, 'Intent',   1),
      (WF6_N2, WF6, L40_RESEARCH,  NULL,  220,  0, 'Research', 2),
      (WF6_N3, WF6, L40_GEN_TEXT,  NULL,  440,  0, 'Draft',    3),
      (WF6_N4, WF6, L40_REFINE,    NULL,  660,  0, 'Refine',   4),
      (WF6_N5, WF6, L41_THREAD,    NULL,  880,  0, 'Publish',  5);

    INSERT INTO lenses.workflow_edges (workflow_id, source_node_id, target_node_id, source_output_key, target_param_label) VALUES
      (WF6, WF6_N1, WF6_N2, 'output', 'context'),
      (WF6, WF6_N2, WF6_N3, 'output', 'context'),
      (WF6, WF6_N3, WF6_N4, 'output', 'draft'),
      (WF6, WF6_N4, WF6_N5, 'output', 'context');

    INSERT INTO lenses.workflow_phases (id, workflow_id, title, description, ordinal) VALUES
      (WF6_P1, WF6, 'Understand', 'Classify the user request into structured intent for downstream lenses.',           1),
      (WF6_P2, WF6, 'Research',   'Gather, rank, and synthesize the evidence needed to fulfill the plan.',            2),
      (WF6_P3, WF6, 'Draft',      'Generate a polished, research-grounded long-form text.',                           3),
      (WF6_P4, WF6, 'Polish',     'Refine the draft for clarity, pacing, and tone without altering intent.',         4),
      (WF6_P5, WF6, 'Publish',    'Shape the refined content into an engaging community discussion thread.',           5);

    INSERT INTO lenses.workflow_tasks (id, phase_id, workflow_id, title, prompt_text, output_type, ordinal) VALUES
      (WF6_T1,  WF6_P1, WF6, 'Classify request intent',    'Identify the goal, target media, quality level, and constraints from the raw user request.', 'text', 1),
      (WF6_T2,  WF6_P1, WF6, 'Suggest downstream kinds',   'Recommend which lens kinds (text, research, image, etc.) are needed to fulfill the request.', 'text', 2),
      (WF6_T3,  WF6_P2, WF6, 'Gather evidence',            'Collect relevant facts, data, and source references for the research topic.', 'text', 1),
      (WF6_T4,  WF6_P2, WF6, 'Rank and synthesize',        'Rank findings by confidence and produce a concise synthesis with open questions.', 'text', 2),
      (WF6_T5,  WF6_P3, WF6, 'Draft long-form content',    'Write a structured, audience-aware article grounded in the research findings.', 'text', 1),
      (WF6_T6,  WF6_P3, WF6, 'Cite sources inline',        'Add [n] citation markers for every claim sourced from the Research Lens output.', 'text', 2),
      (WF6_T7,  WF6_P4, WF6, 'Tighten and clarify',        'Improve sentence clarity, remove redundancy, and enforce consistent tone.', 'text', 1),
      (WF6_T8,  WF6_P4, WF6, 'Verify citations intact',    'Confirm all [n] citation markers are preserved and correctly attributed.', 'text', 2),
      (WF6_T9,  WF6_P5, WF6, 'Craft discussion hook',      'Write a hook and 2-3 sub-questions that invite community engagement on the research topic.', 'text', 1),
      (WF6_T10, WF6_P5, WF6, 'Add participation invite',   'Close the thread with a question that encourages replies from both experts and beginners.', 'text', 2);

    INSERT INTO content.tag_map (entity_type, entity_id, tag_id)
    VALUES ('workflow', WF6, v_tag_template)
    ON CONFLICT DO NOTHING;
  END IF;

  RAISE NOTICE '42_production_workflow_templates: seeded 6 production workflow templates for author %.', v_author;
END
$seed$;

ANALYZE lenses.workflows;
ANALYZE lenses.workflow_nodes;
ANALYZE lenses.workflow_edges;
ANALYZE lenses.workflow_phases;
ANALYZE lenses.workflow_tasks;
ANALYZE content.tag_map;
