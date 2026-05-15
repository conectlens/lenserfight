-- =============================================================================
-- 45. CREATOR / BUSINESS / LEGAL / STARTUP LENS TEMPLATES
-- =============================================================================
-- Seeds 10 production-ready lens templates that round out the public template
-- library for creators, daily AI users, finance/business users, legal-adjacent
-- users, startup operators, and deep-thinking planners.
--
-- Every template is owned by @lenserfight and rayed with the canonical
-- production rays introduced in 20270812000000_canonical_production_tags.sql.
--
-- Legal- and finance-related templates carry an explicit disclaimer inside
-- the prompt body: outputs are analysis aids only, not professional advice.
--
-- UUID convention:  45000000-0001-LLLL-0001-… where LLLL = lens index (hex)
-- Idempotent: every block is gated with IF NOT EXISTS.
--
-- Dependencies:
--   • migration 20270812000000_canonical_production_tags.sql (canonical rays)
--   • migration 20260417150000_lens_chain_templates.sql      (template ray)
--   • 03_lenser_profiles.sql                                 (@lenserfight)
--   • 15_lens_tools.sql                                      (text/textarea)
-- =============================================================================

DO $seed$
DECLARE
  v_author        uuid;
  v_tool_text     uuid;
  v_tool_textarea uuid;

  v_tag_template     uuid;
  v_tag_youtube      uuid;
  v_tag_blog         uuid;
  v_tag_image        uuid;
  v_tag_finance      uuid;
  v_tag_excel        uuid;
  v_tag_legal        uuid;
  v_tag_startup      uuid;
  v_tag_planning     uuid;
  v_tag_deepthinking uuid;
  v_tag_productivity uuid;
  v_tag_content      uuid;
  v_tag_creator      uuid;
  v_tag_ai           uuid;
  v_tag_analysis     uuid;
  v_tag_text         uuid;
  v_tag_checklist    uuid;
  v_tag_script       uuid;
  v_tag_table        uuid;
  v_tag_claude       uuid;
  v_tag_openai       uuid;
  v_tag_gemini       uuid;

  -- Lens 1: YouTube Script Generator
  v_lens_yt_script  uuid := '45000000-0001-0001-0001-000000000001';
  v_ver_yt_script   uuid := '45000000-0001-0001-0001-00000000000a';
  v_p_yt_topic      uuid := '45000000-0001-0001-0001-0000000000a1';
  v_p_yt_audience   uuid := '45000000-0001-0001-0001-0000000000a2';
  v_p_yt_duration   uuid := '45000000-0001-0001-0001-0000000000a3';

  -- Lens 2: Blog Outline Generator
  v_lens_blog       uuid := '45000000-0001-0002-0001-000000000001';
  v_ver_blog        uuid := '45000000-0001-0002-0001-00000000000a';
  v_p_blog_topic    uuid := '45000000-0001-0002-0001-0000000000a1';
  v_p_blog_angle    uuid := '45000000-0001-0002-0001-0000000000a2';

  -- Lens 3: AI Image Prompt Builder
  v_lens_image      uuid := '45000000-0001-0003-0001-000000000001';
  v_ver_image       uuid := '45000000-0001-0003-0001-00000000000a';
  v_p_img_subject   uuid := '45000000-0001-0003-0001-0000000000a1';
  v_p_img_style     uuid := '45000000-0001-0003-0001-0000000000a2';

  -- Lens 4: Finance Report Explainer
  v_lens_finance    uuid := '45000000-0001-0004-0001-000000000001';
  v_ver_finance     uuid := '45000000-0001-0004-0001-00000000000a';
  v_p_fin_data      uuid := '45000000-0001-0004-0001-0000000000a1';
  v_p_fin_audience  uuid := '45000000-0001-0004-0001-0000000000a2';

  -- Lens 5: Excel Formula Assistant
  v_lens_excel      uuid := '45000000-0001-0005-0001-000000000001';
  v_ver_excel       uuid := '45000000-0001-0005-0001-00000000000a';
  v_p_xl_goal       uuid := '45000000-0001-0005-0001-0000000000a1';
  v_p_xl_columns    uuid := '45000000-0001-0005-0001-0000000000a2';

  -- Lens 6: Legal Contract Reviewer
  v_lens_legal      uuid := '45000000-0001-0006-0001-000000000001';
  v_ver_legal       uuid := '45000000-0001-0006-0001-00000000000a';
  v_p_lg_text       uuid := '45000000-0001-0006-0001-0000000000a1';
  v_p_lg_role       uuid := '45000000-0001-0006-0001-0000000000a2';

  -- Lens 7: Startup Roadmap Designer
  v_lens_startup    uuid := '45000000-0001-0007-0001-000000000001';
  v_ver_startup     uuid := '45000000-0001-0007-0001-00000000000a';
  v_p_su_idea       uuid := '45000000-0001-0007-0001-0000000000a1';
  v_p_su_stage      uuid := '45000000-0001-0007-0001-0000000000a2';

  -- Lens 8: Deep Thinking Decision Helper
  v_lens_deep       uuid := '45000000-0001-0008-0001-000000000001';
  v_ver_deep        uuid := '45000000-0001-0008-0001-00000000000a';
  v_p_dp_decision   uuid := '45000000-0001-0008-0001-0000000000a1';
  v_p_dp_constraints uuid := '45000000-0001-0008-0001-0000000000a2';

  -- Lens 9: Daily Productivity Planner
  v_lens_daily      uuid := '45000000-0001-0009-0001-000000000001';
  v_ver_daily       uuid := '45000000-0001-0009-0001-00000000000a';
  v_p_dy_goals      uuid := '45000000-0001-0009-0001-0000000000a1';
  v_p_dy_calendar   uuid := '45000000-0001-0009-0001-0000000000a2';

  -- Lens 10: AI Output Comparator (Claude / OpenAI / Gemini)
  v_lens_compare    uuid := '45000000-0001-000a-0001-000000000001';
  v_ver_compare     uuid := '45000000-0001-000a-0001-00000000000a';
  v_p_cp_task       uuid := '45000000-0001-000a-0001-0000000000a1';
  v_p_cp_outputs    uuid := '45000000-0001-000a-0001-0000000000a2';

BEGIN
  -- ── Resolve dependencies ────────────────────────────────────────────────
  SELECT id INTO v_author FROM lensers.profiles WHERE handle = 'lenserfight' LIMIT 1;
  IF v_author IS NULL THEN
    SELECT id INTO v_author
    FROM lensers.profiles
    WHERE type = 'ai'::lensers.lenser_type AND status = 'active'::lensers.lenser_status
    ORDER BY created_at ASC LIMIT 1;
  END IF;
  IF v_author IS NULL THEN
    RAISE NOTICE '45_creator_business_lens_templates: no @lenserfight or AI profile yet — skipping.';
    RETURN;
  END IF;

  SELECT id INTO v_tool_text     FROM lenses.tools WHERE key = 'text';
  SELECT id INTO v_tool_textarea FROM lenses.tools WHERE key = 'textarea';
  IF v_tool_text IS NULL OR v_tool_textarea IS NULL THEN
    RAISE NOTICE '45_creator_business_lens_templates: lenses.tools missing — skipping.';
    RETURN;
  END IF;

  SELECT id INTO v_tag_template     FROM content.tags WHERE slug = 'template';
  SELECT id INTO v_tag_youtube      FROM content.tags WHERE slug = 'youtube';
  SELECT id INTO v_tag_blog         FROM content.tags WHERE slug = 'blog';
  SELECT id INTO v_tag_image        FROM content.tags WHERE slug = 'image';
  SELECT id INTO v_tag_finance      FROM content.tags WHERE slug = 'finance';
  SELECT id INTO v_tag_excel        FROM content.tags WHERE slug = 'excel';
  SELECT id INTO v_tag_legal        FROM content.tags WHERE slug = 'legal';
  SELECT id INTO v_tag_startup      FROM content.tags WHERE slug = 'startup';
  SELECT id INTO v_tag_planning     FROM content.tags WHERE slug = 'planning';
  SELECT id INTO v_tag_deepthinking FROM content.tags WHERE slug = 'deep-thinking';
  SELECT id INTO v_tag_productivity FROM content.tags WHERE slug = 'productivity';
  SELECT id INTO v_tag_content      FROM content.tags WHERE slug = 'content';
  SELECT id INTO v_tag_creator      FROM content.tags WHERE slug = 'creator';
  SELECT id INTO v_tag_ai           FROM content.tags WHERE slug = 'ai';
  SELECT id INTO v_tag_analysis     FROM content.tags WHERE slug = 'analysis';
  SELECT id INTO v_tag_text         FROM content.tags WHERE slug = 'text';
  SELECT id INTO v_tag_checklist    FROM content.tags WHERE slug = 'checklist';
  SELECT id INTO v_tag_script       FROM content.tags WHERE slug = 'script';
  SELECT id INTO v_tag_table        FROM content.tags WHERE slug = 'table';
  SELECT id INTO v_tag_claude       FROM content.tags WHERE slug = 'claude';
  SELECT id INTO v_tag_openai       FROM content.tags WHERE slug = 'openai';
  SELECT id INTO v_tag_gemini       FROM content.tags WHERE slug = 'gemini';

  IF v_tag_template IS NULL OR v_tag_youtube IS NULL OR v_tag_legal IS NULL THEN
    RAISE NOTICE '45_creator_business_lens_templates: canonical tags missing — run migration 20270812000000 first.';
    RETURN;
  END IF;

  -- ─── 1) YouTube Script Generator ────────────────────────────────────────
  IF NOT EXISTS (SELECT 1 FROM lenses.lenses WHERE id = v_lens_yt_script) THEN
    INSERT INTO lenses.lenses (id, lenser_id, visibility, status)
    VALUES (v_lens_yt_script, v_author, 'public', 'published');

    INSERT INTO lenses.versions (id, lens_id, version_number, template_body, status, published_at)
    VALUES (
      v_ver_yt_script, v_lens_yt_script, 1,
      'You are a YouTube Script Generator. Write a script for a video on [[:' || v_p_yt_topic || ']] '
      'aimed at [[:' || v_p_yt_audience || ']] with a target length of [[:' || v_p_yt_duration || ']] minutes. '
      'Structure: (1) 5-second hook designed to stop the scroll; '
      '(2) value promise — what viewers will learn or feel; '
      '(3) three to five main beats with concrete examples; '
      '(4) pattern interrupts every 30-45 seconds (b-roll cue, visual prompt, question to viewer); '
      '(5) CTA — subscribe / next-video tease. '
      'Output as a numbered script with timestamps and parenthetical visual cues. Do not write generic platitudes.',
      'published', now()
    );
    UPDATE lenses.lenses SET head_version_id = v_ver_yt_script WHERE id = v_lens_yt_script;

    INSERT INTO lenses.version_parameters (id, version_id, label, tool_id) VALUES
      (v_p_yt_topic,    v_ver_yt_script, 'topic',    v_tool_text),
      (v_p_yt_audience, v_ver_yt_script, 'audience', v_tool_text),
      (v_p_yt_duration, v_ver_yt_script, 'duration', v_tool_text);

    INSERT INTO content.entity_translations (entity_type, entity_id, language_code, is_original, title, description, content)
    VALUES
      ('lens', v_lens_yt_script, 'en', true,
       'YouTube Script Generator',
       'Writes a structured YouTube video script with hook, value beats, pattern interrupts, and CTA.',
       'You are a YouTube Script Generator. Write a script for [[topic]] aimed at [[audience]] over [[duration]] minutes.');

    INSERT INTO content.tag_map (entity_type, entity_id, tag_id) VALUES
      ('lens', v_lens_yt_script, v_tag_youtube),
      ('lens', v_lens_yt_script, v_tag_content),
      ('lens', v_lens_yt_script, v_tag_creator),
      ('lens', v_lens_yt_script, v_tag_script),
      ('lens', v_lens_yt_script, v_tag_template)
    ON CONFLICT DO NOTHING;
  END IF;

  -- ─── 2) Blog Outline Generator ──────────────────────────────────────────
  IF NOT EXISTS (SELECT 1 FROM lenses.lenses WHERE id = v_lens_blog) THEN
    INSERT INTO lenses.lenses (id, lenser_id, visibility, status)
    VALUES (v_lens_blog, v_author, 'public', 'published');

    INSERT INTO lenses.versions (id, lens_id, version_number, template_body, status, published_at)
    VALUES (
      v_ver_blog, v_lens_blog, 1,
      'You are a Blog Outline Generator. Build a complete blog outline for [[:' || v_p_blog_topic || ']] '
      'with the editorial angle [[:' || v_p_blog_angle || ']]. '
      'Emit: (1) a working title and three SEO-friendly alternates; (2) a meta description ≤ 155 chars; '
      '(3) target reader profile in one sentence; (4) H2 outline with three to seven sections — each with two to four bullet H3s and one supporting example, statistic, or quote slot; '
      '(5) the single biggest objection the reader will have and how the post addresses it; '
      '(6) a closing CTA aligned with the angle. Be specific. Avoid generic "what is X" framing.',
      'published', now()
    );
    UPDATE lenses.lenses SET head_version_id = v_ver_blog WHERE id = v_lens_blog;

    INSERT INTO lenses.version_parameters (id, version_id, label, tool_id) VALUES
      (v_p_blog_topic, v_ver_blog, 'topic',           v_tool_text),
      (v_p_blog_angle, v_ver_blog, 'editorial_angle', v_tool_text);

    INSERT INTO content.entity_translations (entity_type, entity_id, language_code, is_original, title, description, content)
    VALUES
      ('lens', v_lens_blog, 'en', true,
       'Blog Outline Generator',
       'Produces a complete blog outline with titles, meta description, H2/H3 structure, and SEO-aware angles.',
       'You are a Blog Outline Generator. Build an outline for [[topic]] with angle [[editorial_angle]].');

    INSERT INTO content.tag_map (entity_type, entity_id, tag_id) VALUES
      ('lens', v_lens_blog, v_tag_blog),
      ('lens', v_lens_blog, v_tag_content),
      ('lens', v_lens_blog, v_tag_creator),
      ('lens', v_lens_blog, v_tag_text),
      ('lens', v_lens_blog, v_tag_template)
    ON CONFLICT DO NOTHING;
  END IF;

  -- ─── 3) AI Image Prompt Builder ────────────────────────────────────────
  IF NOT EXISTS (SELECT 1 FROM lenses.lenses WHERE id = v_lens_image) THEN
    INSERT INTO lenses.lenses (id, lenser_id, visibility, status)
    VALUES (v_lens_image, v_author, 'public', 'published');

    INSERT INTO lenses.versions (id, lens_id, version_number, template_body, status, published_at)
    VALUES (
      v_ver_image, v_lens_image, 1,
      'You are an AI Image Prompt Builder. Turn the subject [[:' || v_p_img_subject || ']] and visual style [[:' || v_p_img_style || ']] '
      'into three production-grade prompts for text-to-image models. '
      'Each prompt MUST include: subject anchor, composition (camera distance, framing), lighting, color palette, mood adjectives, '
      'medium / rendering style, aspect-ratio hint, and at least one negative constraint (--no <thing>). '
      'After the prompts, list two A/B variant ideas a creator could explore next. Avoid clichés like "highly detailed, 8k".',
      'published', now()
    );
    UPDATE lenses.lenses SET head_version_id = v_ver_image WHERE id = v_lens_image;

    INSERT INTO lenses.version_parameters (id, version_id, label, tool_id) VALUES
      (v_p_img_subject, v_ver_image, 'subject', v_tool_text),
      (v_p_img_style,   v_ver_image, 'style',   v_tool_text);

    INSERT INTO content.entity_translations (entity_type, entity_id, language_code, is_original, title, description, content)
    VALUES
      ('lens', v_lens_image, 'en', true,
       'AI Image Prompt Builder',
       'Crafts three structured text-to-image prompts with composition, lighting, palette, and negative constraints.',
       'You are an AI Image Prompt Builder. Generate three prompts for [[subject]] in [[style]].');

    INSERT INTO content.tag_map (entity_type, entity_id, tag_id) VALUES
      ('lens', v_lens_image, v_tag_image),
      ('lens', v_lens_image, v_tag_creator),
      ('lens', v_lens_image, v_tag_ai),
      ('lens', v_lens_image, v_tag_template)
    ON CONFLICT DO NOTHING;
  END IF;

  -- ─── 4) Finance Report Explainer ────────────────────────────────────────
  IF NOT EXISTS (SELECT 1 FROM lenses.lenses WHERE id = v_lens_finance) THEN
    INSERT INTO lenses.lenses (id, lenser_id, visibility, status)
    VALUES (v_lens_finance, v_author, 'public', 'published');

    INSERT INTO lenses.versions (id, lens_id, version_number, template_body, status, published_at)
    VALUES (
      v_ver_finance, v_lens_finance, 1,
      'You are a Finance Report Explainer. Translate the financial data in [[:' || v_p_fin_data || ']] '
      'into a plain-language explanation for [[:' || v_p_fin_audience || ']]. '
      'Output: (1) one-paragraph executive summary; (2) three numbered "what changed and why" insights with the underlying numbers cited; '
      '(3) a short table comparing this period vs. prior period for the top metrics; (4) two questions a careful reader should ask next. '
      'IMPORTANT DISCLAIMER (always include verbatim in the output): "This explanation is an analysis aid only and is not certified financial '
      'advice, audit work, investment recommendation, or tax guidance. Verify all figures against source records and consult a qualified '
      'professional before acting on this material."',
      'published', now()
    );
    UPDATE lenses.lenses SET head_version_id = v_ver_finance WHERE id = v_lens_finance;

    INSERT INTO lenses.version_parameters (id, version_id, label, tool_id) VALUES
      (v_p_fin_data,     v_ver_finance, 'financial_data', v_tool_textarea),
      (v_p_fin_audience, v_ver_finance, 'audience',       v_tool_text);

    INSERT INTO content.entity_translations (entity_type, entity_id, language_code, is_original, title, description, content)
    VALUES
      ('lens', v_lens_finance, 'en', true,
       'Finance Report Explainer',
       'Plain-language explanation of a finance report with audience-aware framing. Analysis only — not certified advice.',
       'You are a Finance Report Explainer. Explain [[financial_data]] for [[audience]] with mandatory disclaimer.');

    INSERT INTO content.tag_map (entity_type, entity_id, tag_id) VALUES
      ('lens', v_lens_finance, v_tag_finance),
      ('lens', v_lens_finance, v_tag_analysis),
      ('lens', v_lens_finance, v_tag_table),
      ('lens', v_lens_finance, v_tag_template)
    ON CONFLICT DO NOTHING;
  END IF;

  -- ─── 5) Excel Formula Assistant ─────────────────────────────────────────
  IF NOT EXISTS (SELECT 1 FROM lenses.lenses WHERE id = v_lens_excel) THEN
    INSERT INTO lenses.lenses (id, lenser_id, visibility, status)
    VALUES (v_lens_excel, v_author, 'public', 'published');

    INSERT INTO lenses.versions (id, lens_id, version_number, template_body, status, published_at)
    VALUES (
      v_ver_excel, v_lens_excel, 1,
      'You are an Excel Formula Assistant. The user wants to achieve: [[:' || v_p_xl_goal || ']]. '
      'The data is shaped as follows (column letters and a few sample rows): [[:' || v_p_xl_columns || ']]. '
      'Return: (1) the recommended formula in Excel-365 syntax with cell references made concrete; '
      '(2) an equivalent Google Sheets variant if it differs; '
      '(3) a one-line plain-English description of what the formula does; '
      '(4) one common pitfall (e.g. relative vs. absolute references, blank cells, locale-specific separators) and how to avoid it; '
      '(5) one validation step the user can run to confirm the result. Prefer LET / LAMBDA / dynamic-array formulas when they improve clarity.',
      'published', now()
    );
    UPDATE lenses.lenses SET head_version_id = v_ver_excel WHERE id = v_lens_excel;

    INSERT INTO lenses.version_parameters (id, version_id, label, tool_id) VALUES
      (v_p_xl_goal,    v_ver_excel, 'goal',    v_tool_textarea),
      (v_p_xl_columns, v_ver_excel, 'columns', v_tool_textarea);

    INSERT INTO content.entity_translations (entity_type, entity_id, language_code, is_original, title, description, content)
    VALUES
      ('lens', v_lens_excel, 'en', true,
       'Excel Formula Assistant',
       'Builds Excel-365 and Google Sheets formulas with pitfalls, validation, and plain-English explanation.',
       'You are an Excel Formula Assistant. Build a formula for [[goal]] over [[columns]].');

    INSERT INTO content.tag_map (entity_type, entity_id, tag_id) VALUES
      ('lens', v_lens_excel, v_tag_excel),
      ('lens', v_lens_excel, v_tag_productivity),
      ('lens', v_lens_excel, v_tag_analysis),
      ('lens', v_lens_excel, v_tag_template)
    ON CONFLICT DO NOTHING;
  END IF;

  -- ─── 6) Legal Contract Reviewer ─────────────────────────────────────────
  IF NOT EXISTS (SELECT 1 FROM lenses.lenses WHERE id = v_lens_legal) THEN
    INSERT INTO lenses.lenses (id, lenser_id, visibility, status)
    VALUES (v_lens_legal, v_author, 'public', 'published');

    INSERT INTO lenses.versions (id, lens_id, version_number, template_body, status, published_at)
    VALUES (
      v_ver_legal, v_lens_legal, 1,
      'You are a Legal Contract Reviewer. Read the document in [[:' || v_p_lg_text || ']] from the perspective of [[:' || v_p_lg_role || ']]. '
      'Produce: (1) a one-paragraph plain-language summary of what the document obligates each party to do; '
      '(2) a risk table with columns Clause / Plain-language meaning / Risk severity (low|medium|high) / Why it matters / Question to ask a lawyer; '
      '(3) three to five concrete clarifying questions the reader should bring to a qualified attorney; '
      '(4) any unusual terms not typically seen in this class of document. '
      'IMPORTANT DISCLAIMER (always include verbatim, prominently, at the top and bottom of the output): "This review is an analysis aid only '
      'and is NOT legal advice. It does not establish an attorney-client relationship. Always have a qualified, licensed lawyer in your '
      'jurisdiction review the actual document before signing, negotiating, or relying on it."',
      'published', now()
    );
    UPDATE lenses.lenses SET head_version_id = v_ver_legal WHERE id = v_lens_legal;

    INSERT INTO lenses.version_parameters (id, version_id, label, tool_id) VALUES
      (v_p_lg_text, v_ver_legal, 'contract_text', v_tool_textarea),
      (v_p_lg_role, v_ver_legal, 'your_role',     v_tool_text);

    INSERT INTO content.entity_translations (entity_type, entity_id, language_code, is_original, title, description, content)
    VALUES
      ('lens', v_lens_legal, 'en', true,
       'Legal Contract Reviewer',
       'Plain-language contract summary, clause-risk table, and questions to ask a lawyer. Analysis only — NOT legal advice.',
       'You are a Legal Contract Reviewer. Review [[contract_text]] from the perspective of [[your_role]] with mandatory disclaimer.');

    INSERT INTO content.tag_map (entity_type, entity_id, tag_id) VALUES
      ('lens', v_lens_legal, v_tag_legal),
      ('lens', v_lens_legal, v_tag_analysis),
      ('lens', v_lens_legal, v_tag_table),
      ('lens', v_lens_legal, v_tag_template)
    ON CONFLICT DO NOTHING;
  END IF;

  -- ─── 7) Startup Roadmap Designer ───────────────────────────────────────
  IF NOT EXISTS (SELECT 1 FROM lenses.lenses WHERE id = v_lens_startup) THEN
    INSERT INTO lenses.lenses (id, lenser_id, visibility, status)
    VALUES (v_lens_startup, v_author, 'public', 'published');

    INSERT INTO lenses.versions (id, lens_id, version_number, template_body, status, published_at)
    VALUES (
      v_ver_startup, v_lens_startup, 1,
      'You are a Startup Roadmap Designer. The product idea is [[:' || v_p_su_idea || ']]. The current stage is [[:' || v_p_su_stage || ']]. '
      'Produce a 12-week roadmap with these sections: '
      '(1) refined problem statement and the single user we are building for first; '
      '(2) three success metrics with target numbers and how each will be measured; '
      '(3) week-by-week milestone table with owner placeholders; '
      '(4) top three risks and a one-line mitigation each; '
      '(5) one explicit "kill criteria" — the signal that says stop or pivot. '
      'Be specific. Replace generic startup advice with decisions tied to the supplied stage.',
      'published', now()
    );
    UPDATE lenses.lenses SET head_version_id = v_ver_startup WHERE id = v_lens_startup;

    INSERT INTO lenses.version_parameters (id, version_id, label, tool_id) VALUES
      (v_p_su_idea,  v_ver_startup, 'idea',          v_tool_textarea),
      (v_p_su_stage, v_ver_startup, 'current_stage', v_tool_text);

    INSERT INTO content.entity_translations (entity_type, entity_id, language_code, is_original, title, description, content)
    VALUES
      ('lens', v_lens_startup, 'en', true,
       'Startup Roadmap Designer',
       'Builds a 12-week startup roadmap with metrics, milestones, risks, and kill criteria — calibrated to current stage.',
       'You are a Startup Roadmap Designer. Build a roadmap for [[idea]] at [[current_stage]].');

    INSERT INTO content.tag_map (entity_type, entity_id, tag_id) VALUES
      ('lens', v_lens_startup, v_tag_startup),
      ('lens', v_lens_startup, v_tag_planning),
      ('lens', v_lens_startup, v_tag_table),
      ('lens', v_lens_startup, v_tag_template)
    ON CONFLICT DO NOTHING;
  END IF;

  -- ─── 8) Deep Thinking Decision Helper ──────────────────────────────────
  IF NOT EXISTS (SELECT 1 FROM lenses.lenses WHERE id = v_lens_deep) THEN
    INSERT INTO lenses.lenses (id, lenser_id, visibility, status)
    VALUES (v_lens_deep, v_author, 'public', 'published');

    INSERT INTO lenses.versions (id, lens_id, version_number, template_body, status, published_at)
    VALUES (
      v_ver_deep, v_lens_deep, 1,
      'You are a Deep Thinking Decision Helper. The decision under consideration is [[:' || v_p_dp_decision || ']]. '
      'Hard constraints: [[:' || v_p_dp_constraints || ']]. '
      'Walk through this structure exactly: '
      '(1) reframe the decision in one sentence; '
      '(2) list the implicit assumptions the question is carrying — call out the ones you suspect may not hold; '
      '(3) generate three substantively different options (NOT three flavours of the same answer); '
      '(4) for each option, surface a second-order effect (what becomes true 6-12 months after the decision); '
      '(5) recommend a decision criterion (not the decision itself) the user can apply confidently in five minutes; '
      '(6) what evidence would change your recommendation. Avoid hedged platitudes — be willing to disagree with the framing.',
      'published', now()
    );
    UPDATE lenses.lenses SET head_version_id = v_ver_deep WHERE id = v_lens_deep;

    INSERT INTO lenses.version_parameters (id, version_id, label, tool_id) VALUES
      (v_p_dp_decision,    v_ver_deep, 'decision',    v_tool_textarea),
      (v_p_dp_constraints, v_ver_deep, 'constraints', v_tool_textarea);

    INSERT INTO content.entity_translations (entity_type, entity_id, language_code, is_original, title, description, content)
    VALUES
      ('lens', v_lens_deep, 'en', true,
       'Deep Thinking Decision Helper',
       'Reframes a decision, surfaces assumptions and second-order effects, and recommends a decision criterion.',
       'You are a Deep Thinking Decision Helper. Work through [[decision]] under [[constraints]].');

    INSERT INTO content.tag_map (entity_type, entity_id, tag_id) VALUES
      ('lens', v_lens_deep, v_tag_deepthinking),
      ('lens', v_lens_deep, v_tag_planning),
      ('lens', v_lens_deep, v_tag_analysis),
      ('lens', v_lens_deep, v_tag_template)
    ON CONFLICT DO NOTHING;
  END IF;

  -- ─── 9) Daily Productivity Planner ─────────────────────────────────────
  IF NOT EXISTS (SELECT 1 FROM lenses.lenses WHERE id = v_lens_daily) THEN
    INSERT INTO lenses.lenses (id, lenser_id, visibility, status)
    VALUES (v_lens_daily, v_author, 'public', 'published');

    INSERT INTO lenses.versions (id, lens_id, version_number, template_body, status, published_at)
    VALUES (
      v_ver_daily, v_lens_daily, 1,
      ‘You are a Daily Productivity Planner. The user’’s open goals are [[:’ || v_p_dy_goals || ‘]]. ‘
      ‘Today’’s calendar (existing commitments, in chronological order): [[:’ || v_p_dy_calendar || ‘]]. ‘
      'Produce: (1) the single most important outcome for today and the reason it beats the alternatives; '
      '(2) a time-blocked plan that fits between the existing commitments, including focus blocks and at least one buffer block; '
      '(3) a "won’t do today" list — items the user is consciously deferring; '
      '(4) a 3-bullet end-of-day reflection prompt. Format the plan as a checklist with realistic durations.',
      'published', now()
    );
    UPDATE lenses.lenses SET head_version_id = v_ver_daily WHERE id = v_lens_daily;

    INSERT INTO lenses.version_parameters (id, version_id, label, tool_id) VALUES
      (v_p_dy_goals,    v_ver_daily, 'open_goals', v_tool_textarea),
      (v_p_dy_calendar, v_ver_daily, 'calendar',   v_tool_textarea);

    INSERT INTO content.entity_translations (entity_type, entity_id, language_code, is_original, title, description, content)
    VALUES
      ('lens', v_lens_daily, 'en', true,
       'Daily Productivity Planner',
       'Picks the highest-leverage outcome of the day, time-blocks around existing commitments, and surfaces a "won''t do" list.',
       'You are a Daily Productivity Planner. Plan today around [[open_goals]] and [[calendar]].');

    INSERT INTO content.tag_map (entity_type, entity_id, tag_id) VALUES
      ('lens', v_lens_daily, v_tag_productivity),
      ('lens', v_lens_daily, v_tag_planning),
      ('lens', v_lens_daily, v_tag_checklist),
      ('lens', v_lens_daily, v_tag_template)
    ON CONFLICT DO NOTHING;
  END IF;

  -- ─── 10) AI Output Comparator (Claude vs OpenAI vs Gemini) ─────────────
  IF NOT EXISTS (SELECT 1 FROM lenses.lenses WHERE id = v_lens_compare) THEN
    INSERT INTO lenses.lenses (id, lenser_id, visibility, status)
    VALUES (v_lens_compare, v_author, 'public', 'published');

    INSERT INTO lenses.versions (id, lens_id, version_number, template_body, status, published_at)
    VALUES (
      v_ver_compare, v_lens_compare, 1,
      'You are an AI Output Comparator. The task that was given to several models was: [[:' || v_p_cp_task || ']]. '
      'The candidate outputs (clearly labelled with model name) are: [[:' || v_p_cp_outputs || ']]. '
      'Compare them on four axes: (a) factual correctness; (b) usefulness for the stated task; '
      '(c) tone and audience fit; (d) failure modes (hallucinations, hedging, missing constraints). '
      'Output a comparison table, then a one-paragraph verdict naming the strongest output and why. '
      'Surface at least one weakness even in the winner. Do not flatten differences — be willing to call out clear losers.',
      'published', now()
    );
    UPDATE lenses.lenses SET head_version_id = v_ver_compare WHERE id = v_lens_compare;

    INSERT INTO lenses.version_parameters (id, version_id, label, tool_id) VALUES
      (v_p_cp_task,    v_ver_compare, 'task',    v_tool_textarea),
      (v_p_cp_outputs, v_ver_compare, 'outputs', v_tool_textarea);

    INSERT INTO content.entity_translations (entity_type, entity_id, language_code, is_original, title, description, content)
    VALUES
      ('lens', v_lens_compare, 'en', true,
       'AI Output Comparator (Claude / OpenAI / Gemini)',
       'Compares multiple AI outputs on the same task with a four-axis rubric and a willing-to-lose verdict.',
       'You are an AI Output Comparator. Compare [[outputs]] for task [[task]] across Claude/OpenAI/Gemini.');

    INSERT INTO content.tag_map (entity_type, entity_id, tag_id) VALUES
      ('lens', v_lens_compare, v_tag_ai),
      ('lens', v_lens_compare, v_tag_claude),
      ('lens', v_lens_compare, v_tag_openai),
      ('lens', v_lens_compare, v_tag_gemini),
      ('lens', v_lens_compare, v_tag_analysis),
      ('lens', v_lens_compare, v_tag_template)
    ON CONFLICT DO NOTHING;
  END IF;

END
$seed$;

ANALYZE lenses.lenses;
ANALYZE lenses.versions;
