-- =============================================================================
-- 41. DEVELOPER & COMMUNITY LENS TEMPLATES
-- =============================================================================
-- Seeds 13 production-ready lens templates covering developer productivity
-- (code review, testing, docs, SQL) and community engagement (threads,
-- challenges, email). All are tagged 'template' and a specific lens-kind tag.
--
-- UUID convention:  41000000-0001-LLLL-0001-… where LLLL = lens index (hex)
-- Idempotent: every block is gated with IF NOT EXISTS.
--
-- Dependencies:
--   • migration 20260426020000_developer_kind_tags.sql  (code, data, etc. tags)
--   • migration 20260417150000_lens_chain_templates.sql (template tag + RPC)
--   • 04_ai_providers.sql, 04b_ai_models.sql, 07_ai_lensers.sql (AI author)
--   • 15_lens_tools.sql (text / textarea tools)
-- =============================================================================

DO $seed$
DECLARE
  v_author        uuid;
  v_tool_text     uuid;
  v_tool_textarea uuid;

  -- Canonical tags
  v_tag_template      uuid;
  v_tag_code          uuid;
  v_tag_data          uuid;
  v_tag_planning      uuid;
  v_tag_community     uuid;
  v_tag_documentation uuid;

  -- ── Lens 1: Code Reviewer ──────────────────────────────────────────────────
  v_lens_code_reviewer  uuid := '41000000-0001-0001-0001-000000000001';
  v_ver_code_reviewer   uuid := '41000000-0001-0001-0001-00000000000a';
  v_p_cr_code           uuid := '41000000-0001-0001-0001-0000000000a1';
  v_p_cr_language       uuid := '41000000-0001-0001-0001-0000000000a2';

  -- ── Lens 2: Unit Test Generator ────────────────────────────────────────────
  v_lens_unit_test      uuid := '41000000-0001-0002-0001-000000000001';
  v_ver_unit_test       uuid := '41000000-0001-0002-0001-00000000000a';
  v_p_ut_code           uuid := '41000000-0001-0002-0001-0000000000a1';
  v_p_ut_framework      uuid := '41000000-0001-0002-0001-0000000000a2';

  -- ── Lens 3: Bug Report Analyzer ────────────────────────────────────────────
  v_lens_bug_analyzer   uuid := '41000000-0001-0003-0001-000000000001';
  v_ver_bug_analyzer    uuid := '41000000-0001-0003-0001-00000000000a';
  v_p_ba_error_log      uuid := '41000000-0001-0003-0001-0000000000a1';
  v_p_ba_context        uuid := '41000000-0001-0003-0001-0000000000a2';

  -- ── Lens 4: PR Description Writer ──────────────────────────────────────────
  v_lens_pr_writer      uuid := '41000000-0001-0004-0001-000000000001';
  v_ver_pr_writer       uuid := '41000000-0001-0004-0001-00000000000a';
  v_p_pw_diff           uuid := '41000000-0001-0004-0001-0000000000a1';
  v_p_pw_context        uuid := '41000000-0001-0004-0001-0000000000a2';

  -- ── Lens 5: SQL Query Builder ──────────────────────────────────────────────
  v_lens_sql_builder    uuid := '41000000-0001-0005-0001-000000000001';
  v_ver_sql_builder     uuid := '41000000-0001-0005-0001-00000000000a';
  v_p_sq_requirements   uuid := '41000000-0001-0005-0001-0000000000a1';
  v_p_sq_schema         uuid := '41000000-0001-0005-0001-0000000000a2';

  -- ── Lens 6: API Doc Generator ─────────────────────────────────────────────
  v_lens_api_doc        uuid := '41000000-0001-0006-0001-000000000001';
  v_ver_api_doc         uuid := '41000000-0001-0006-0001-00000000000a';
  v_p_ad_code           uuid := '41000000-0001-0006-0001-0000000000a1';
  v_p_ad_format         uuid := '41000000-0001-0006-0001-0000000000a2';

  -- ── Lens 7: Code Explainer ────────────────────────────────────────────────
  v_lens_code_explainer uuid := '41000000-0001-0007-0001-000000000001';
  v_ver_code_explainer  uuid := '41000000-0001-0007-0001-00000000000a';
  v_p_ce_code           uuid := '41000000-0001-0007-0001-0000000000a1';
  v_p_ce_audience       uuid := '41000000-0001-0007-0001-0000000000a2';

  -- ── Lens 8: Refactoring Advisor ───────────────────────────────────────────
  v_lens_refactor       uuid := '41000000-0001-0008-0001-000000000001';
  v_ver_refactor        uuid := '41000000-0001-0008-0001-00000000000a';
  v_p_ra_code           uuid := '41000000-0001-0008-0001-0000000000a1';
  v_p_ra_goals          uuid := '41000000-0001-0008-0001-0000000000a2';

  -- ── Lens 9: Meeting Notes Summarizer ──────────────────────────────────────
  v_lens_meeting        uuid := '41000000-0001-0009-0001-000000000001';
  v_ver_meeting         uuid := '41000000-0001-0009-0001-00000000000a';
  v_p_mn_notes          uuid := '41000000-0001-0009-0001-0000000000a1';
  v_p_mn_attendees      uuid := '41000000-0001-0009-0001-0000000000a2';

  -- ── Lens 10: User Story Generator ─────────────────────────────────────────
  v_lens_user_story     uuid := '41000000-0001-000a-0001-000000000001';
  v_ver_user_story      uuid := '41000000-0001-000a-0001-00000000000a';
  v_p_us_feature        uuid := '41000000-0001-000a-0001-0000000000a1';
  v_p_us_persona        uuid := '41000000-0001-000a-0001-0000000000a2';

  -- ── Lens 11: Email Draft Writer ───────────────────────────────────────────
  v_lens_email          uuid := '41000000-0001-000b-0001-000000000001';
  v_ver_email           uuid := '41000000-0001-000b-0001-00000000000a';
  v_p_em_intent         uuid := '41000000-0001-000b-0001-0000000000a1';
  v_p_em_tone           uuid := '41000000-0001-000b-0001-0000000000a2';

  -- ── Lens 12: Thread Starter ───────────────────────────────────────────────
  v_lens_thread         uuid := '41000000-0001-000c-0001-000000000001';
  v_ver_thread          uuid := '41000000-0001-000c-0001-00000000000a';
  v_p_th_topic          uuid := '41000000-0001-000c-0001-0000000000a1';
  v_p_th_context        uuid := '41000000-0001-000c-0001-0000000000a2';

  -- ── Lens 13: Challenge Creator ────────────────────────────────────────────
  v_lens_challenge      uuid := '41000000-0001-000d-0001-000000000001';
  v_ver_challenge       uuid := '41000000-0001-000d-0001-00000000000a';
  v_p_ch_subject        uuid := '41000000-0001-000d-0001-0000000000a1';
  v_p_ch_difficulty     uuid := '41000000-0001-000d-0001-0000000000a2';

BEGIN
  -- ── Resolve dependencies ───────────────────────────────────────────────────
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
    RAISE NOTICE '41_developer_lens_templates: no lensers.profiles row yet — skipping.';
    RETURN;
  END IF;

  SELECT id INTO v_tool_text     FROM lenses.tools WHERE key = 'text';
  SELECT id INTO v_tool_textarea FROM lenses.tools WHERE key = 'textarea';

  IF v_tool_text IS NULL OR v_tool_textarea IS NULL THEN
    RAISE NOTICE '41_developer_lens_templates: lenses.tools not seeded yet — skipping.';
    RETURN;
  END IF;

  SELECT id INTO v_tag_template      FROM content.tags WHERE slug = 'template';
  SELECT id INTO v_tag_code          FROM content.tags WHERE slug = 'code';
  SELECT id INTO v_tag_data          FROM content.tags WHERE slug = 'data';
  SELECT id INTO v_tag_planning      FROM content.tags WHERE slug = 'planning';
  SELECT id INTO v_tag_community     FROM content.tags WHERE slug = 'community';
  SELECT id INTO v_tag_documentation FROM content.tags WHERE slug = 'documentation';

  IF v_tag_template IS NULL OR v_tag_code IS NULL THEN
    RAISE NOTICE '41_developer_lens_templates: required tags missing — run migration 20260426020000 first.';
    RETURN;
  END IF;

  -- ─────────────────────────────────────────────────────────────────────────
  -- 1) Code Reviewer
  -- ─────────────────────────────────────────────────────────────────────────
  IF NOT EXISTS (SELECT 1 FROM lenses.lenses WHERE id = v_lens_code_reviewer) THEN
    INSERT INTO lenses.lenses (id, lenser_id, visibility, status)
    VALUES (v_lens_code_reviewer, v_author, 'public', 'published');

    INSERT INTO lenses.versions (id, lens_id, version_number, template_body, status, published_at)
    VALUES (
      v_ver_code_reviewer, v_lens_code_reviewer, 1,
      'You are a Code Reviewer. Analyze the code in [[code]] written in [[language]]. '
      'Produce a structured review with four sections: (1) Bugs — logic errors, null dereferences, edge cases; '
      '(2) Security — injection risks, auth bypasses, insecure defaults; '
      '(3) Style — naming, formatting, dead code; '
      '(4) Suggestions — concrete refactors with before/after snippets. '
      'Rate overall quality 1-10. Be direct. Do not rewrite the entire file.',
      'published', now()
    );

    UPDATE lenses.lenses SET head_version_id = v_ver_code_reviewer WHERE id = v_lens_code_reviewer;

    INSERT INTO lenses.version_parameters (id, version_id, label, tool_id) VALUES
      (v_p_cr_code,     v_ver_code_reviewer, 'code',     v_tool_textarea),
      (v_p_cr_language, v_ver_code_reviewer, 'language', v_tool_text);

    INSERT INTO content.entity_translations (entity_type, entity_id, language_code, is_original, title, description, content)
    VALUES
      ('lens', v_lens_code_reviewer, 'en', true,
       'Code Reviewer',
       'Reviews code for bugs, security issues, and style — with concrete before/after suggestions.',
       'You are a Code Reviewer. Review [[code]] written in [[language]] for bugs, security, and style.'),
      ('lens', v_lens_code_reviewer, 'tr', false,
       'Kod İnceleyici (şablon)',
       'Kodu hata, güvenlik sorunu ve stil açısından inceler; somut öneriler sunar.',
       'Bir kod inceleyicisin. [[language]] dilinde yazılmış [[code]] kodunu incele.');

    INSERT INTO content.tag_map (entity_type, entity_id, tag_id) VALUES
      ('lens', v_lens_code_reviewer, v_tag_code),
      ('lens', v_lens_code_reviewer, v_tag_template)
    ON CONFLICT DO NOTHING;
  END IF;

  -- ─────────────────────────────────────────────────────────────────────────
  -- 2) Unit Test Generator
  -- ─────────────────────────────────────────────────────────────────────────
  IF NOT EXISTS (SELECT 1 FROM lenses.lenses WHERE id = v_lens_unit_test) THEN
    INSERT INTO lenses.lenses (id, lenser_id, visibility, status)
    VALUES (v_lens_unit_test, v_author, 'public', 'published');

    INSERT INTO lenses.versions (id, lens_id, version_number, template_body, status, published_at)
    VALUES (
      v_ver_unit_test, v_lens_unit_test, 1,
      'You are a Unit Test Generator. Given the function or module in [[function_code]], '
      'generate a complete test suite using [[framework]]. '
      'Cover: happy path, boundary values, error cases, null/empty inputs, and any side effects. '
      'Each test must have a descriptive name following the "should_<behaviour>_when_<condition>" convention. '
      'Include import statements and any required mocks. Output only runnable test code with inline comments.',
      'published', now()
    );

    UPDATE lenses.lenses SET head_version_id = v_ver_unit_test WHERE id = v_lens_unit_test;

    INSERT INTO lenses.version_parameters (id, version_id, label, tool_id) VALUES
      (v_p_ut_code,      v_ver_unit_test, 'function_code', v_tool_textarea),
      (v_p_ut_framework, v_ver_unit_test, 'framework',     v_tool_text);

    INSERT INTO content.entity_translations (entity_type, entity_id, language_code, is_original, title, description, content)
    VALUES
      ('lens', v_lens_unit_test, 'en', true,
       'Unit Test Generator',
       'Generates a complete test suite for a function or module — happy path, edge cases, and error scenarios.',
       'You are a Unit Test Generator. Generate tests for [[function_code]] using [[framework]].'),
      ('lens', v_lens_unit_test, 'tr', false,
       'Birim Test Üreteci (şablon)',
       'Bir fonksiyon veya modül için tam test paketi üretir; başarılı yol, sınır değerleri ve hata senaryoları.',
       'Bir birim test üreticisin. [[function_code]] için [[framework]] kullanarak testler üret.');

    INSERT INTO content.tag_map (entity_type, entity_id, tag_id) VALUES
      ('lens', v_lens_unit_test, v_tag_code),
      ('lens', v_lens_unit_test, v_tag_template)
    ON CONFLICT DO NOTHING;
  END IF;

  -- ─────────────────────────────────────────────────────────────────────────
  -- 3) Bug Report Analyzer
  -- ─────────────────────────────────────────────────────────────────────────
  IF NOT EXISTS (SELECT 1 FROM lenses.lenses WHERE id = v_lens_bug_analyzer) THEN
    INSERT INTO lenses.lenses (id, lenser_id, visibility, status)
    VALUES (v_lens_bug_analyzer, v_author, 'public', 'published');

    INSERT INTO lenses.versions (id, lens_id, version_number, template_body, status, published_at)
    VALUES (
      v_ver_bug_analyzer, v_lens_bug_analyzer, 1,
      'You are a Bug Report Analyzer. Examine the error log or stack trace in [[error_log]] '
      'and the surrounding context in [[context]]. '
      'Emit a JSON object with: root_cause (string), affected_component (string), '
      'severity (critical|high|medium|low), reproduction_steps (array of strings), '
      'likely_fix (string with code snippet if applicable), '
      'and prevention (string describing how to avoid this class of bug). '
      'If the log is ambiguous, list the top three candidate causes ranked by probability.',
      'published', now()
    );

    UPDATE lenses.lenses SET head_version_id = v_ver_bug_analyzer WHERE id = v_lens_bug_analyzer;

    INSERT INTO lenses.version_parameters (id, version_id, label, tool_id) VALUES
      (v_p_ba_error_log, v_ver_bug_analyzer, 'error_log', v_tool_textarea),
      (v_p_ba_context,   v_ver_bug_analyzer, 'context',   v_tool_textarea);

    INSERT INTO content.entity_translations (entity_type, entity_id, language_code, is_original, title, description, content)
    VALUES
      ('lens', v_lens_bug_analyzer, 'en', true,
       'Bug Report Analyzer',
       'Diagnoses root cause from a stack trace or error log and suggests a concrete fix.',
       'You are a Bug Report Analyzer. Find the root cause of [[error_log]] given [[context]].'),
      ('lens', v_lens_bug_analyzer, 'tr', false,
       'Hata Raporu Analizci (şablon)',
       'Yığın izinden kök nedeni tespit eder ve somut bir düzeltme önerir.',
       'Bir hata raporu analizcisisin. [[context]] bağlamında [[error_log]] hatasının kök nedenini bul.');

    INSERT INTO content.tag_map (entity_type, entity_id, tag_id) VALUES
      ('lens', v_lens_bug_analyzer, v_tag_code),
      ('lens', v_lens_bug_analyzer, v_tag_template)
    ON CONFLICT DO NOTHING;
  END IF;

  -- ─────────────────────────────────────────────────────────────────────────
  -- 4) PR Description Writer
  -- ─────────────────────────────────────────────────────────────────────────
  IF NOT EXISTS (SELECT 1 FROM lenses.lenses WHERE id = v_lens_pr_writer) THEN
    INSERT INTO lenses.lenses (id, lenser_id, visibility, status)
    VALUES (v_lens_pr_writer, v_author, 'public', 'published');

    INSERT INTO lenses.versions (id, lens_id, version_number, template_body, status, published_at)
    VALUES (
      v_ver_pr_writer, v_lens_pr_writer, 1,
      'You are a PR Description Writer. Given the diff summary in [[diff_summary]] '
      'and background context in [[context]], write a professional pull request description. '
      'Structure: ## Summary (2-3 bullets on what changed and why), '
      '## Test Plan (bulleted checklist of manual steps to verify the change), '
      '## Breaking Changes (if any, else omit), '
      '## Related Issues (placeholder links). '
      'Focus on the WHY not the WHAT. Tone: concise, professional, peer-reviewable.',
      'published', now()
    );

    UPDATE lenses.lenses SET head_version_id = v_ver_pr_writer WHERE id = v_lens_pr_writer;

    INSERT INTO lenses.version_parameters (id, version_id, label, tool_id) VALUES
      (v_p_pw_diff,    v_ver_pr_writer, 'diff_summary', v_tool_textarea),
      (v_p_pw_context, v_ver_pr_writer, 'context',      v_tool_text);

    INSERT INTO content.entity_translations (entity_type, entity_id, language_code, is_original, title, description, content)
    VALUES
      ('lens', v_lens_pr_writer, 'en', true,
       'PR Description Writer',
       'Writes a structured, professional pull request description from a diff summary — why, test plan, breaking changes.',
       'You are a PR Description Writer. Write a PR description for [[diff_summary]] with context [[context]].'),
      ('lens', v_lens_pr_writer, 'tr', false,
       'PR Açıklaması Yazıcı (şablon)',
       'Diff özetinden yapılandırılmış, profesyonel bir pull request açıklaması yazar.',
       'Bir PR açıklaması yazarısın. [[diff_summary]] için [[context]] bağlamında PR açıklaması yaz.');

    INSERT INTO content.tag_map (entity_type, entity_id, tag_id) VALUES
      ('lens', v_lens_pr_writer, v_tag_documentation),
      ('lens', v_lens_pr_writer, v_tag_template)
    ON CONFLICT DO NOTHING;
  END IF;

  -- ─────────────────────────────────────────────────────────────────────────
  -- 5) SQL Query Builder
  -- ─────────────────────────────────────────────────────────────────────────
  IF NOT EXISTS (SELECT 1 FROM lenses.lenses WHERE id = v_lens_sql_builder) THEN
    INSERT INTO lenses.lenses (id, lenser_id, visibility, status)
    VALUES (v_lens_sql_builder, v_author, 'public', 'published');

    INSERT INTO lenses.versions (id, lens_id, version_number, template_body, status, published_at)
    VALUES (
      v_ver_sql_builder, v_lens_sql_builder, 1,
      'You are a SQL Query Builder. Translate the natural language requirements in [[requirements]] '
      'into a correct, optimized SQL query using the schema hints in [[schema_hint]]. '
      'Output: (1) the SQL query formatted and commented; '
      '(2) a brief explanation of the approach (JOINs used, index assumptions, aggregation strategy); '
      '(3) any caveats — NULLs, performance concerns for large tables, missing indexes. '
      'Default to PostgreSQL syntax unless the schema hints specify another dialect. '
      'Do not use SELECT * in production queries.',
      'published', now()
    );

    UPDATE lenses.lenses SET head_version_id = v_ver_sql_builder WHERE id = v_lens_sql_builder;

    INSERT INTO lenses.version_parameters (id, version_id, label, tool_id) VALUES
      (v_p_sq_requirements, v_ver_sql_builder, 'requirements', v_tool_textarea),
      (v_p_sq_schema,       v_ver_sql_builder, 'schema_hint',  v_tool_textarea);

    INSERT INTO content.entity_translations (entity_type, entity_id, language_code, is_original, title, description, content)
    VALUES
      ('lens', v_lens_sql_builder, 'en', true,
       'SQL Query Builder',
       'Converts natural language requirements into optimized PostgreSQL queries with explanations.',
       'You are a SQL Query Builder. Build a SQL query for [[requirements]] using schema [[schema_hint]].'),
      ('lens', v_lens_sql_builder, 'tr', false,
       'SQL Sorgu Oluşturucu (şablon)',
       'Doğal dil gereksinimlerini optimize edilmiş PostgreSQL sorgularına dönüştürür.',
       'Bir SQL sorgu oluşturucusun. [[schema_hint]] şemasını kullanarak [[requirements]] için SQL sorgusu oluştur.');

    INSERT INTO content.tag_map (entity_type, entity_id, tag_id) VALUES
      ('lens', v_lens_sql_builder, v_tag_data),
      ('lens', v_lens_sql_builder, v_tag_template)
    ON CONFLICT DO NOTHING;
  END IF;

  -- ─────────────────────────────────────────────────────────────────────────
  -- 6) API Documentation Generator
  -- ─────────────────────────────────────────────────────────────────────────
  IF NOT EXISTS (SELECT 1 FROM lenses.lenses WHERE id = v_lens_api_doc) THEN
    INSERT INTO lenses.lenses (id, lenser_id, visibility, status)
    VALUES (v_lens_api_doc, v_author, 'public', 'published');

    INSERT INTO lenses.versions (id, lens_id, version_number, template_body, status, published_at)
    VALUES (
      v_ver_api_doc, v_lens_api_doc, 1,
      'You are an API Documentation Generator. Analyze the code or endpoint definition in [[code]] '
      'and produce documentation in the format specified by [[format_hint]] (e.g. OpenAPI 3.1, JSDoc, tsdoc, Markdown). '
      'Include for each endpoint/function: description, parameters (name, type, required, default, description), '
      'return type with example payload, possible error codes and their meaning, and a usage example. '
      'Infer types from code; mark ambiguous fields with a TODO comment. '
      'Output only the documentation — no prose wrapper.',
      'published', now()
    );

    UPDATE lenses.lenses SET head_version_id = v_ver_api_doc WHERE id = v_lens_api_doc;

    INSERT INTO lenses.version_parameters (id, version_id, label, tool_id) VALUES
      (v_p_ad_code,   v_ver_api_doc, 'code',        v_tool_textarea),
      (v_p_ad_format, v_ver_api_doc, 'format_hint', v_tool_text);

    INSERT INTO content.entity_translations (entity_type, entity_id, language_code, is_original, title, description, content)
    VALUES
      ('lens', v_lens_api_doc, 'en', true,
       'API Documentation Generator',
       'Produces OpenAPI, JSDoc, or Markdown API docs from code — parameters, return types, errors, examples.',
       'You are an API Documentation Generator. Document [[code]] in [[format_hint]] format.'),
      ('lens', v_lens_api_doc, 'tr', false,
       'API Dokümantasyon Üreteci (şablon)',
       'Koddan OpenAPI, JSDoc veya Markdown API dokümantasyonu üretir.',
       'Bir API dokümantasyon üreticisin. [[code]] kodunu [[format_hint]] formatında belgele.');

    INSERT INTO content.tag_map (entity_type, entity_id, tag_id) VALUES
      ('lens', v_lens_api_doc, v_tag_documentation),
      ('lens', v_lens_api_doc, v_tag_template)
    ON CONFLICT DO NOTHING;
  END IF;

  -- ─────────────────────────────────────────────────────────────────────────
  -- 7) Code Explainer
  -- ─────────────────────────────────────────────────────────────────────────
  IF NOT EXISTS (SELECT 1 FROM lenses.lenses WHERE id = v_lens_code_explainer) THEN
    INSERT INTO lenses.lenses (id, lenser_id, visibility, status)
    VALUES (v_lens_code_explainer, v_author, 'public', 'published');

    INSERT INTO lenses.versions (id, lens_id, version_number, template_body, status, published_at)
    VALUES (
      v_ver_code_explainer, v_lens_code_explainer, 1,
      'You are a Code Explainer. Explain the code in [[code]] '
      'to an audience described as [[audience]]. '
      'Structure your explanation as: (1) What it does in one sentence; '
      '(2) How it works — walk through the key steps in plain language, analogies encouraged; '
      '(3) Why it is designed this way — the intent or constraint behind the approach; '
      '(4) Gotchas — any subtle behavior or edge case the reader should know. '
      'Calibrate vocabulary and depth strictly to the stated audience.',
      'published', now()
    );

    UPDATE lenses.lenses SET head_version_id = v_ver_code_explainer WHERE id = v_lens_code_explainer;

    INSERT INTO lenses.version_parameters (id, version_id, label, tool_id) VALUES
      (v_p_ce_code,     v_ver_code_explainer, 'code',     v_tool_textarea),
      (v_p_ce_audience, v_ver_code_explainer, 'audience', v_tool_text);

    INSERT INTO content.entity_translations (entity_type, entity_id, language_code, is_original, title, description, content)
    VALUES
      ('lens', v_lens_code_explainer, 'en', true,
       'Code Explainer',
       'Explains complex code in plain language calibrated to a stated audience — what, how, why, and gotchas.',
       'You are a Code Explainer. Explain [[code]] to [[audience]] — what, how, why, and gotchas.'),
      ('lens', v_lens_code_explainer, 'tr', false,
       'Kod Açıklayıcı (şablon)',
       'Karmaşık kodu belirtilen kitleye uygun sade bir dille açıklar.',
       'Bir kod açıklayıcısısın. [[code]] kodunu [[audience]] kitlesine açıkla.');

    INSERT INTO content.tag_map (entity_type, entity_id, tag_id) VALUES
      ('lens', v_lens_code_explainer, v_tag_code),
      ('lens', v_lens_code_explainer, v_tag_template)
    ON CONFLICT DO NOTHING;
  END IF;

  -- ─────────────────────────────────────────────────────────────────────────
  -- 8) Refactoring Advisor
  -- ─────────────────────────────────────────────────────────────────────────
  IF NOT EXISTS (SELECT 1 FROM lenses.lenses WHERE id = v_lens_refactor) THEN
    INSERT INTO lenses.lenses (id, lenser_id, visibility, status)
    VALUES (v_lens_refactor, v_author, 'public', 'published');

    INSERT INTO lenses.versions (id, lens_id, version_number, template_body, status, published_at)
    VALUES (
      v_ver_refactor, v_lens_refactor, 1,
      'You are a Refactoring Advisor. Review the code in [[code]] '
      'against the stated goals in [[goals]]. '
      'Produce a prioritized list of refactoring opportunities. For each: '
      'name the pattern (Extract Function, Replace Conditional with Polymorphism, etc.), '
      'explain the benefit, show a before/after snippet, and rate effort (low/medium/high). '
      'Preserve existing behavior — do not introduce new features. '
      'Flag any refactor that changes the public API or has breaking implications.',
      'published', now()
    );

    UPDATE lenses.lenses SET head_version_id = v_ver_refactor WHERE id = v_lens_refactor;

    INSERT INTO lenses.version_parameters (id, version_id, label, tool_id) VALUES
      (v_p_ra_code,  v_ver_refactor, 'code',  v_tool_textarea),
      (v_p_ra_goals, v_ver_refactor, 'goals', v_tool_text);

    INSERT INTO content.entity_translations (entity_type, entity_id, language_code, is_original, title, description, content)
    VALUES
      ('lens', v_lens_refactor, 'en', true,
       'Refactoring Advisor',
       'Identifies prioritized refactoring opportunities with before/after snippets — without changing behavior.',
       'You are a Refactoring Advisor. Suggest refactors for [[code]] toward goals [[goals]].'),
      ('lens', v_lens_refactor, 'tr', false,
       'Yeniden Yapılandırma Danışmanı (şablon)',
       'Davranışı değiştirmeden önce/sonra kod parçacıklarıyla önceliklendirilmiş yeniden yapılandırma önerileri sunar.',
       'Bir yeniden yapılandırma danışmanısın. [[goals]] hedefleri için [[code]] koduna yönelik öneriler sun.');

    INSERT INTO content.tag_map (entity_type, entity_id, tag_id) VALUES
      ('lens', v_lens_refactor, v_tag_code),
      ('lens', v_lens_refactor, v_tag_template)
    ON CONFLICT DO NOTHING;
  END IF;

  -- ─────────────────────────────────────────────────────────────────────────
  -- 9) Meeting Notes Summarizer
  -- ─────────────────────────────────────────────────────────────────────────
  IF NOT EXISTS (SELECT 1 FROM lenses.lenses WHERE id = v_lens_meeting) THEN
    INSERT INTO lenses.lenses (id, lenser_id, visibility, status)
    VALUES (v_lens_meeting, v_author, 'public', 'published');

    INSERT INTO lenses.versions (id, lens_id, version_number, template_body, status, published_at)
    VALUES (
      v_ver_meeting, v_lens_meeting, 1,
      'You are a Meeting Notes Summarizer. Convert the raw meeting notes in [[raw_notes]] '
      'for a meeting attended by [[attendees]] into a structured summary. '
      'Output sections: ## TL;DR (two sentences max), '
      '## Decisions (bullet list of decisions made with owner), '
      '## Action Items (table: Task | Owner | Due Date), '
      '## Open Questions (items deferred or unresolved), '
      '## Next Steps. '
      'Infer due dates from context if mentioned. Do not invent information not in the notes.',
      'published', now()
    );

    UPDATE lenses.lenses SET head_version_id = v_ver_meeting WHERE id = v_lens_meeting;

    INSERT INTO lenses.version_parameters (id, version_id, label, tool_id) VALUES
      (v_p_mn_notes,     v_ver_meeting, 'raw_notes',  v_tool_textarea),
      (v_p_mn_attendees, v_ver_meeting, 'attendees',  v_tool_text);

    INSERT INTO content.entity_translations (entity_type, entity_id, language_code, is_original, title, description, content)
    VALUES
      ('lens', v_lens_meeting, 'en', true,
       'Meeting Notes Summarizer',
       'Converts raw meeting notes into TL;DR, decisions, action items, open questions, and next steps.',
       'You are a Meeting Notes Summarizer. Summarize [[raw_notes]] for attendees [[attendees]].'),
      ('lens', v_lens_meeting, 'tr', false,
       'Toplantı Notu Özetleyici (şablon)',
       'Ham toplantı notlarını TL;DR, kararlar, eylem maddeleri ve açık sorulara dönüştürür.',
       'Bir toplantı notu özetleyicisin. [[attendees]] katılımcıları için [[raw_notes]] notlarını özetle.');

    INSERT INTO content.tag_map (entity_type, entity_id, tag_id) VALUES
      ('lens', v_lens_meeting, v_tag_planning),
      ('lens', v_lens_meeting, v_tag_template)
    ON CONFLICT DO NOTHING;
  END IF;

  -- ─────────────────────────────────────────────────────────────────────────
  -- 10) User Story Generator
  -- ─────────────────────────────────────────────────────────────────────────
  IF NOT EXISTS (SELECT 1 FROM lenses.lenses WHERE id = v_lens_user_story) THEN
    INSERT INTO lenses.lenses (id, lenser_id, visibility, status)
    VALUES (v_lens_user_story, v_author, 'public', 'published');

    INSERT INTO lenses.versions (id, lens_id, version_number, template_body, status, published_at)
    VALUES (
      v_ver_user_story, v_lens_user_story, 1,
      'You are a User Story Generator. Given the feature description in [[feature_description]] '
      'for the persona [[persona]], produce a set of well-formed user stories. '
      'Each story follows: "As a <persona>, I want <goal>, so that <benefit>." '
      'For each story also provide: Acceptance Criteria (Given/When/Then format, 2-4 scenarios), '
      'Story Points estimate (Fibonacci: 1/2/3/5/8/13), and priority (Must/Should/Could). '
      'Group stories by epic if the feature is large. Flag any ambiguities that need clarification.',
      'published', now()
    );

    UPDATE lenses.lenses SET head_version_id = v_ver_user_story WHERE id = v_lens_user_story;

    INSERT INTO lenses.version_parameters (id, version_id, label, tool_id) VALUES
      (v_p_us_feature, v_ver_user_story, 'feature_description', v_tool_textarea),
      (v_p_us_persona, v_ver_user_story, 'persona',             v_tool_text);

    INSERT INTO content.entity_translations (entity_type, entity_id, language_code, is_original, title, description, content)
    VALUES
      ('lens', v_lens_user_story, 'en', true,
       'User Story Generator',
       'Generates user stories with acceptance criteria, story points, and priority from a feature description.',
       'You are a User Story Generator. Generate user stories for [[feature_description]] as [[persona]].'),
      ('lens', v_lens_user_story, 'tr', false,
       'Kullanıcı Hikayesi Üreteci (şablon)',
       'Özellik açıklamasından kabul kriterleri, hikaye puanları ve öncelik içeren kullanıcı hikayeleri üretir.',
       'Bir kullanıcı hikayesi üreticisin. [[persona]] olarak [[feature_description]] için kullanıcı hikayeleri üret.');

    INSERT INTO content.tag_map (entity_type, entity_id, tag_id) VALUES
      ('lens', v_lens_user_story, v_tag_planning),
      ('lens', v_lens_user_story, v_tag_template)
    ON CONFLICT DO NOTHING;
  END IF;

  -- ─────────────────────────────────────────────────────────────────────────
  -- 11) Email Draft Writer
  -- ─────────────────────────────────────────────────────────────────────────
  IF NOT EXISTS (SELECT 1 FROM lenses.lenses WHERE id = v_lens_email) THEN
    INSERT INTO lenses.lenses (id, lenser_id, visibility, status)
    VALUES (v_lens_email, v_author, 'public', 'published');

    INSERT INTO lenses.versions (id, lens_id, version_number, template_body, status, published_at)
    VALUES (
      v_ver_email, v_lens_email, 1,
      'You are an Email Draft Writer. Draft a professional email based on the intent in [[intent]] '
      'using the tone specified in [[tone]] (e.g. formal, friendly, assertive, empathetic). '
      'Produce: Subject line (≤60 chars), Body (greeting, context, core ask or update, closing), '
      'and a one-line suggested follow-up action. '
      'Calibrate length to urgency — urgent emails are concise, nuanced situations may need more context. '
      'Do not use hollow filler phrases like "I hope this email finds you well."',
      'published', now()
    );

    UPDATE lenses.lenses SET head_version_id = v_ver_email WHERE id = v_lens_email;

    INSERT INTO lenses.version_parameters (id, version_id, label, tool_id) VALUES
      (v_p_em_intent, v_ver_email, 'intent', v_tool_textarea),
      (v_p_em_tone,   v_ver_email, 'tone',   v_tool_text);

    INSERT INTO content.entity_translations (entity_type, entity_id, language_code, is_original, title, description, content)
    VALUES
      ('lens', v_lens_email, 'en', true,
       'Email Draft Writer',
       'Drafts a professional email with subject line and suggested follow-up from an intent description.',
       'You are an Email Draft Writer. Write an email for [[intent]] in [[tone]] tone.'),
      ('lens', v_lens_email, 'tr', false,
       'E-posta Taslağı Yazıcı (şablon)',
       'Niyet açıklamasından konu satırı ve önerilen takip ile profesyonel e-posta taslağı oluşturur.',
       'Bir e-posta taslağı yazarısın. [[intent]] için [[tone]] tonunda e-posta yaz.');

    INSERT INTO content.tag_map (entity_type, entity_id, tag_id) VALUES
      ('lens', v_lens_email, v_tag_community),
      ('lens', v_lens_email, v_tag_template)
    ON CONFLICT DO NOTHING;
  END IF;

  -- ─────────────────────────────────────────────────────────────────────────
  -- 12) Thread Starter
  -- ─────────────────────────────────────────────────────────────────────────
  IF NOT EXISTS (SELECT 1 FROM lenses.lenses WHERE id = v_lens_thread) THEN
    INSERT INTO lenses.lenses (id, lenser_id, visibility, status)
    VALUES (v_lens_thread, v_author, 'public', 'published');

    INSERT INTO lenses.versions (id, lens_id, version_number, template_body, status, published_at)
    VALUES (
      v_ver_thread, v_lens_thread, 1,
      'You are a Discussion Thread Starter. Create an engaging discussion post on the topic in [[topic]] '
      'informed by the background in [[context]]. '
      'Structure: a compelling opening hook (1-2 sentences), the core idea or question clearly stated, '
      '2-3 framing sub-questions to invite different angles of response, '
      'and a closing invitation to participate. '
      'Tone should be curious, inclusive, and direct — not promotional. '
      'Avoid clickbait; the hook should earn its intrigue through substance.',
      'published', now()
    );

    UPDATE lenses.lenses SET head_version_id = v_ver_thread WHERE id = v_lens_thread;

    INSERT INTO lenses.version_parameters (id, version_id, label, tool_id) VALUES
      (v_p_th_topic,   v_ver_thread, 'topic',   v_tool_text),
      (v_p_th_context, v_ver_thread, 'context', v_tool_textarea);

    INSERT INTO content.entity_translations (entity_type, entity_id, language_code, is_original, title, description, content)
    VALUES
      ('lens', v_lens_thread, 'en', true,
       'Thread Starter',
       'Crafts an engaging community discussion post — hook, core question, sub-questions, and participation invite.',
       'You are a Discussion Thread Starter. Start a discussion on [[topic]] using context [[context]].'),
      ('lens', v_lens_thread, 'tr', false,
       'Konu Başlatıcı (şablon)',
       'İlgi çekici bir topluluk tartışma gönderisi oluşturur — kanca, ana soru, alt sorular ve katılım daveti.',
       'Bir tartışma konusu başlatıcısısın. [[context]] bağlamında [[topic]] üzerine tartışma başlat.');

    INSERT INTO content.tag_map (entity_type, entity_id, tag_id) VALUES
      ('lens', v_lens_thread, v_tag_community),
      ('lens', v_lens_thread, v_tag_template)
    ON CONFLICT DO NOTHING;
  END IF;

  -- ─────────────────────────────────────────────────────────────────────────
  -- 13) Challenge Creator
  -- ─────────────────────────────────────────────────────────────────────────
  IF NOT EXISTS (SELECT 1 FROM lenses.lenses WHERE id = v_lens_challenge) THEN
    INSERT INTO lenses.lenses (id, lenser_id, visibility, status)
    VALUES (v_lens_challenge, v_author, 'public', 'published');

    INSERT INTO lenses.versions (id, lens_id, version_number, template_body, status, published_at)
    VALUES (
      v_ver_challenge, v_lens_challenge, 1,
      'You are a Battle Challenge Designer. Design an AI battle challenge on the subject in [[subject]] '
      'at difficulty level [[difficulty]] (beginner / intermediate / advanced / expert). '
      'Output a JSON object with: title (string, ≤80 chars), '
      'prompt (string — the exact challenge statement given to contestants), '
      'evaluation_rubric (array of {criterion, weight_pct, description}), '
      'time_limit_minutes (int), '
      'example_strong_response (string — what a top answer looks like), '
      'and tags (array of relevant topic tags). '
      'The rubric weights must sum to 100. Challenges should be fair, unambiguous, and learnable.',
      'published', now()
    );

    UPDATE lenses.lenses SET head_version_id = v_ver_challenge WHERE id = v_lens_challenge;

    INSERT INTO lenses.version_parameters (id, version_id, label, tool_id) VALUES
      (v_p_ch_subject,    v_ver_challenge, 'subject',    v_tool_text),
      (v_p_ch_difficulty, v_ver_challenge, 'difficulty', v_tool_text);

    INSERT INTO content.entity_translations (entity_type, entity_id, language_code, is_original, title, description, content)
    VALUES
      ('lens', v_lens_challenge, 'en', true,
       'Challenge Creator',
       'Designs a LenserFight battle challenge with prompt, evaluation rubric, and example strong response.',
       'You are a Battle Challenge Designer. Design a [[difficulty]] challenge on [[subject]].'),
      ('lens', v_lens_challenge, 'tr', false,
       'Meydan Okuma Oluşturucu (şablon)',
       'Soru, değerlendirme rubriki ve örnek güçlü yanıtla mücadele zorluğu tasarlar.',
       'Bir meydan okuma tasarımcısısın. [[subject]] konusunda [[difficulty]] zorluğunda bir meydan okuma tasarla.');

    INSERT INTO content.tag_map (entity_type, entity_id, tag_id) VALUES
      ('lens', v_lens_challenge, v_tag_community),
      ('lens', v_lens_challenge, v_tag_template)
    ON CONFLICT DO NOTHING;
  END IF;

  RAISE NOTICE '41_developer_lens_templates: seeded 13 developer/community lens templates for author %.', v_author;
END
$seed$;

ANALYZE lenses.lenses;
ANALYZE lenses.versions;
ANALYZE lenses.version_parameters;
ANALYZE content.entity_translations;
ANALYZE content.tag_map;
