-- =============================================================================
-- 40. LENS CHAIN TEMPLATES — Open Source Workflows
-- =============================================================================
-- Seeds a canonical library of template lenses (one per `kind`) plus four
-- starter workflows that chain them. The seed is idempotent: it keys every
-- entity by a deterministic UUID and gates inserts with `IF NOT EXISTS`.
--
-- Template convention:
--   • Every template-origin lens is tagged with `template` and its lens-kind tag.
--   • Every template workflow is tagged with `template` via content.tag_map so
--     public.fn_list_template_workflows can surface it in the "Start from
--     template" strip on WorkflowsPage.
--
-- Dependencies:
--   • supabase/migrations/20260417150000_lens_chain_templates.sql (creates tags
--     and the listing RPC).
--   • 04_ai_providers.sql, 04b_ai_models.sql, 07_ai_lensers.sql (provide the AI
--     author profile that owns the templates).
--   • 15_lens_tools.sql (provides text/textarea tools for parameters).
-- =============================================================================

DO $seed$
DECLARE
  v_author           uuid;
  v_tool_text        uuid;
  v_tool_textarea    uuid;

  -- Canonical tags
  v_tag_template     uuid;
  v_tag_routing      uuid;
  v_tag_orchestration uuid;
  v_tag_research     uuid;
  v_tag_text         uuid;
  v_tag_image        uuid;
  v_tag_video        uuid;
  v_tag_transform    uuid;
  v_tag_validation   uuid;
  v_tag_pdf          uuid;

  -- Template lens IDs (deterministic)
  v_lens_intent      uuid := '40000000-0001-0001-0001-000000000001';
  v_ver_intent       uuid := '40000000-0001-0001-0001-00000000000a';
  v_param_intent_request uuid := '40000000-0001-0001-0001-0000000000a1';

  v_lens_plan        uuid := '40000000-0001-0002-0001-000000000001';
  v_ver_plan         uuid := '40000000-0001-0002-0001-00000000000a';
  v_param_plan_context uuid := '40000000-0001-0002-0001-0000000000a1';

  v_lens_research    uuid := '40000000-0001-0003-0001-000000000001';
  v_ver_research     uuid := '40000000-0001-0003-0001-00000000000a';
  v_param_research_topic uuid := '40000000-0001-0003-0001-0000000000a1';
  v_param_research_context uuid := '40000000-0001-0003-0001-0000000000a2';

  v_lens_gen_text    uuid := '40000000-0001-0004-0001-000000000001';
  v_ver_gen_text     uuid := '40000000-0001-0004-0001-00000000000a';
  v_param_gen_text_topic uuid := '40000000-0001-0004-0001-0000000000a1';
  v_param_gen_text_context uuid := '40000000-0001-0004-0001-0000000000a2';

  v_lens_gen_image   uuid := '40000000-0001-0005-0001-000000000001';
  v_ver_gen_image    uuid := '40000000-0001-0005-0001-00000000000a';
  v_param_gen_image_brief uuid := '40000000-0001-0005-0001-0000000000a1';

  v_lens_gen_video   uuid := '40000000-0001-0006-0001-000000000001';
  v_ver_gen_video    uuid := '40000000-0001-0006-0001-00000000000a';
  v_param_gen_video_scene uuid := '40000000-0001-0006-0001-0000000000a1';

  v_lens_refine      uuid := '40000000-0001-0007-0001-000000000001';
  v_ver_refine       uuid := '40000000-0001-0007-0001-00000000000a';
  v_param_refine_draft uuid := '40000000-0001-0007-0001-0000000000a1';

  v_lens_validate    uuid := '40000000-0001-0008-0001-000000000001';
  v_ver_validate     uuid := '40000000-0001-0008-0001-00000000000a';
  v_param_validate_output uuid := '40000000-0001-0008-0001-0000000000a1';
  v_param_validate_requirements uuid := '40000000-0001-0008-0001-0000000000a2';

  v_lens_export_pdf  uuid := '40000000-0001-0009-0001-000000000001';
  v_ver_export_pdf   uuid := '40000000-0001-0009-0001-00000000000a';
  v_param_export_pdf_content uuid := '40000000-0001-0009-0001-0000000000a1';
  v_param_export_pdf_title uuid := '40000000-0001-0009-0001-0000000000a2';

  -- Workflow 1: Article Pipeline
  v_wf_article       uuid := '40000000-0002-0001-0001-000000000001';
  v_n_a_intent       uuid := '40000000-0002-0001-0002-000000000001';
  v_n_a_plan         uuid := '40000000-0002-0001-0002-000000000002';
  v_n_a_research     uuid := '40000000-0002-0001-0002-000000000003';
  v_n_a_gen          uuid := '40000000-0002-0001-0002-000000000004';
  v_n_a_refine       uuid := '40000000-0002-0001-0002-000000000005';
  v_n_a_validate     uuid := '40000000-0002-0001-0002-000000000006';
  v_n_a_export       uuid := '40000000-0002-0001-0002-000000000007';

  -- Workflow 2: Visual Concept Kit
  v_wf_visual        uuid := '40000000-0002-0002-0001-000000000001';
  v_n_v_intent       uuid := '40000000-0002-0002-0002-000000000001';
  v_n_v_plan         uuid := '40000000-0002-0002-0002-000000000002';
  v_n_v_gen          uuid := '40000000-0002-0002-0002-000000000003';
  v_n_v_refine       uuid := '40000000-0002-0002-0002-000000000004';
  v_n_v_validate     uuid := '40000000-0002-0002-0002-000000000005';

  -- Workflow 3: Short-Form Video Brief
  v_wf_video         uuid := '40000000-0002-0003-0001-000000000001';
  v_n_vid_intent     uuid := '40000000-0002-0003-0002-000000000001';
  v_n_vid_plan       uuid := '40000000-0002-0003-0002-000000000002';
  v_n_vid_script     uuid := '40000000-0002-0003-0002-000000000003';
  v_n_vid_render     uuid := '40000000-0002-0003-0002-000000000004';
  v_n_vid_validate   uuid := '40000000-0002-0003-0002-000000000005';

  -- Workflow 4: Research Brief to PDF
  v_wf_research_pdf  uuid := '40000000-0002-0004-0001-000000000001';
  v_n_r_intent       uuid := '40000000-0002-0004-0002-000000000001';
  v_n_r_research     uuid := '40000000-0002-0004-0002-000000000002';
  v_n_r_refine       uuid := '40000000-0002-0004-0002-000000000003';
  v_n_r_validate     uuid := '40000000-0002-0004-0002-000000000004';
  v_n_r_export       uuid := '40000000-0002-0004-0002-000000000005';
BEGIN
  -- ---------------------------------------------------------------------------
  -- Resolve canonical dependencies
  -- ---------------------------------------------------------------------------
  -- Canonical author: @lenserfight (reserved production account).
  -- Fall back to the first active AI lenser if the reserved account is
  -- absent, so partial seeds in CI still produce inspectable data.
  SELECT id INTO v_author
  FROM lensers.profiles
  WHERE handle = 'lenserfight'
  LIMIT 1;

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
    RAISE NOTICE '40_lens_chain_templates: no lensers.profiles row yet — skipping.';
    RETURN;
  END IF;

  SELECT id INTO v_tool_text     FROM lenses.tools WHERE key = 'text';
  SELECT id INTO v_tool_textarea FROM lenses.tools WHERE key = 'textarea';

  IF v_tool_text IS NULL OR v_tool_textarea IS NULL THEN
    RAISE NOTICE '40_lens_chain_templates: lenses.tools not seeded yet — skipping.';
    RETURN;
  END IF;

  SELECT id INTO v_tag_template      FROM content.tags WHERE slug = 'template';
  SELECT id INTO v_tag_routing       FROM content.tags WHERE slug = 'routing';
  SELECT id INTO v_tag_orchestration FROM content.tags WHERE slug = 'orchestration';
  SELECT id INTO v_tag_research      FROM content.tags WHERE slug = 'research';
  SELECT id INTO v_tag_text          FROM content.tags WHERE slug = 'text';
  SELECT id INTO v_tag_image         FROM content.tags WHERE slug = 'image';
  SELECT id INTO v_tag_video         FROM content.tags WHERE slug = 'video';
  SELECT id INTO v_tag_transform     FROM content.tags WHERE slug = 'transform';
  SELECT id INTO v_tag_validation    FROM content.tags WHERE slug = 'validation';
  SELECT id INTO v_tag_pdf           FROM content.tags WHERE slug = 'pdf';

  IF v_tag_template IS NULL THEN
    RAISE NOTICE '40_lens_chain_templates: `template` tag missing — run migration 20260417150000 first.';
    RETURN;
  END IF;

  -- ---------------------------------------------------------------------------
  -- Helper: insert a template lens with one or two parameters
  -- ---------------------------------------------------------------------------
  -- We inline the inserts (no pl/pgsql helper function) to keep the seed flat
  -- and grep-friendly. Every block is wrapped in a `NOT EXISTS` guard.

  -- 1) Intent Lens --------------------------------------------------------------
  IF NOT EXISTS (SELECT 1 FROM lenses.lenses WHERE id = v_lens_intent) THEN
    INSERT INTO lenses.lenses (id, lenser_id, visibility, status)
    VALUES (v_lens_intent, v_author, 'public'::content.visibility_enum,
            'published'::content.content_status);

    INSERT INTO lenses.versions (id, lens_id, version_number, template_body, status, published_at)
    VALUES (
      v_ver_intent, v_lens_intent, 1,
      'You are an Intent Classifier. Read the raw request in [[:' || v_param_intent_request || ']] and emit a structured intent object with these keys: goal, target_media, quality_level, constraints, suggested_kinds. Do not answer the request — only classify it so downstream steps can plan execution.',
      'published'::content.content_status, now()
    );

    UPDATE lenses.lenses SET head_version_id = v_ver_intent WHERE id = v_lens_intent;

    INSERT INTO lenses.version_parameters (id, version_id, label, tool_id)
    VALUES (v_param_intent_request, v_ver_intent, 'user_request', v_tool_textarea);

    INSERT INTO content.entity_translations (entity_type, entity_id, language_code, is_original, title, description, content)
    VALUES (
      'lens'::content.entity_type_enum, v_lens_intent, 'en', true,
      'Intent Lens',
      'Classifies a raw user request into structured intent so downstream lenses can plan.',
      'You are an Intent Classifier. Classify the request in [[user_request]] and emit goal/target_media/quality_level/constraints/suggested_kinds.'
    );

    INSERT INTO content.tag_map (entity_type, entity_id, tag_id)
    VALUES
      ('lens'::content.entity_type_enum, v_lens_intent, v_tag_routing),
      ('lens'::content.entity_type_enum, v_lens_intent, v_tag_template)
    ON CONFLICT DO NOTHING;
  END IF;

  -- 2) Plan Lens --------------------------------------------------------------
  IF NOT EXISTS (SELECT 1 FROM lenses.lenses WHERE id = v_lens_plan) THEN
    INSERT INTO lenses.lenses (id, lenser_id, visibility, status)
    VALUES (v_lens_plan, v_author, 'public', 'published');

    INSERT INTO lenses.versions (id, lens_id, version_number, template_body, status, published_at)
    VALUES (
      v_ver_plan, v_lens_plan, 1,
      'You are an Execution Planner. Given the structured intent in [[:' || v_param_plan_context || ']], produce an ordered execution plan as a JSON array of steps. Each step must declare: id, kind (text|image|video|research|pdf|transform|validation), objective, inputs, and whether it is parallel-safe. Do not perform the steps — only plan them.',
      'published', now()
    );

    UPDATE lenses.lenses SET head_version_id = v_ver_plan WHERE id = v_lens_plan;

    INSERT INTO lenses.version_parameters (id, version_id, label, tool_id)
    VALUES (v_param_plan_context, v_ver_plan, 'context', v_tool_textarea);

    INSERT INTO content.entity_translations (entity_type, entity_id, language_code, is_original, title, description, content)
    VALUES (
      'lens', v_lens_plan, 'en', true,
      'Planning Lens',
      'Turns a structured intent into an ordered execution plan of tagged steps.',
      'You are an Execution Planner. Produce an execution plan from [[context]].'
    );

    INSERT INTO content.tag_map (entity_type, entity_id, tag_id) VALUES
      ('lens', v_lens_plan, v_tag_orchestration),
      ('lens', v_lens_plan, v_tag_template)
    ON CONFLICT DO NOTHING;
  END IF;

  -- 3) Research Lens -----------------------------------------------------------
  IF NOT EXISTS (SELECT 1 FROM lenses.lenses WHERE id = v_lens_research) THEN
    INSERT INTO lenses.lenses (id, lenser_id, visibility, status)
    VALUES (v_lens_research, v_author, 'public', 'published');

    INSERT INTO lenses.versions (id, lens_id, version_number, template_body, status, published_at)
    VALUES (
      v_ver_research, v_lens_research, 1,
      'You are a Research Synthesizer. Using the topic in [[:' || v_param_research_topic || ']] and the upstream context in [[:' || v_param_research_context || ']], gather, rank, and summarize the evidence needed to fulfill the plan. Emit a JSON object with keys: findings (array of {claim, source, confidence}), summary (string), open_questions (array of strings).',
      'published', now()
    );

    UPDATE lenses.lenses SET head_version_id = v_ver_research WHERE id = v_lens_research;

    INSERT INTO lenses.version_parameters (id, version_id, label, tool_id) VALUES
      (v_param_research_topic, v_ver_research, 'topic', v_tool_text),
      (v_param_research_context, v_ver_research, 'context', v_tool_textarea);

    INSERT INTO content.entity_translations (entity_type, entity_id, language_code, is_original, title, description, content)
    VALUES (
      'lens', v_lens_research, 'en', true,
      'Research Lens',
      'Synthesizes evidence for a topic using upstream planning context.',
      'You are a Research Synthesizer. Gather evidence for [[topic]] constrained by [[context]].'
    );

    INSERT INTO content.tag_map (entity_type, entity_id, tag_id) VALUES
      ('lens', v_lens_research, v_tag_research),
      ('lens', v_lens_research, v_tag_template)
    ON CONFLICT DO NOTHING;
  END IF;

  -- 4) Text Generation Lens ----------------------------------------------------
  IF NOT EXISTS (SELECT 1 FROM lenses.lenses WHERE id = v_lens_gen_text) THEN
    INSERT INTO lenses.lenses (id, lenser_id, visibility, status)
    VALUES (v_lens_gen_text, v_author, 'public', 'published');

    INSERT INTO lenses.versions (id, lens_id, version_number, template_body, status, published_at)
    VALUES (
      v_ver_gen_text, v_lens_gen_text, 1,
      'You are a Long-Form Writer. Produce a polished, audience-aware draft about [[:' || v_param_gen_text_topic || ']] grounded in the research synthesis [[:' || v_param_gen_text_context || ']]. Use clear structure (H1/H2/paragraphs). Cite sources inline with [n] markers and preserve every citation from the research step.',
      'published', now()
    );

    UPDATE lenses.lenses SET head_version_id = v_ver_gen_text WHERE id = v_lens_gen_text;

    INSERT INTO lenses.version_parameters (id, version_id, label, tool_id) VALUES
      (v_param_gen_text_topic, v_ver_gen_text, 'topic', v_tool_text),
      (v_param_gen_text_context, v_ver_gen_text, 'context', v_tool_textarea);

    INSERT INTO content.entity_translations (entity_type, entity_id, language_code, is_original, title, description, content)
    VALUES (
      'lens', v_lens_gen_text, 'en', true,
      'Text Generation Lens',
      'Drafts long-form text grounded in upstream research.',
      'You are a Long-Form Writer. Draft content about [[topic]] grounded in [[context]].'
    );

    INSERT INTO content.tag_map (entity_type, entity_id, tag_id) VALUES
      ('lens', v_lens_gen_text, v_tag_text),
      ('lens', v_lens_gen_text, v_tag_template)
    ON CONFLICT DO NOTHING;
  END IF;

  -- 5) Image Generation Lens ---------------------------------------------------
  IF NOT EXISTS (SELECT 1 FROM lenses.lenses WHERE id = v_lens_gen_image) THEN
    INSERT INTO lenses.lenses (id, lenser_id, visibility, status)
    VALUES (v_lens_gen_image, v_author, 'public', 'published');

    INSERT INTO lenses.versions (id, lens_id, version_number, template_body, status, published_at)
    VALUES (
      v_ver_gen_image, v_lens_gen_image, 1,
      'You are an Image Generator. Render a single still image described by the structured visual brief in [[:' || v_param_gen_image_brief || ']]. The brief declares: subject, style, composition, lighting, palette, aspect_ratio, and negative constraints. Honour every field; do not invent subjects beyond the brief.',
      'published', now()
    );

    UPDATE lenses.lenses SET head_version_id = v_ver_gen_image WHERE id = v_lens_gen_image;

    INSERT INTO lenses.version_parameters (id, version_id, label, tool_id)
    VALUES (v_param_gen_image_brief, v_ver_gen_image, 'visual_brief', v_tool_textarea);

    INSERT INTO content.entity_translations (entity_type, entity_id, language_code, is_original, title, description, content)
    VALUES (
      'lens', v_lens_gen_image, 'en', true,
      'Image Generation Lens',
      'Renders a still image from a structured visual brief.',
      'You are an Image Generator. Render the still described in [[visual_brief]].'
    );

    INSERT INTO content.tag_map (entity_type, entity_id, tag_id) VALUES
      ('lens', v_lens_gen_image, v_tag_image),
      ('lens', v_lens_gen_image, v_tag_template)
    ON CONFLICT DO NOTHING;
  END IF;

  -- 6) Video Generation Lens ---------------------------------------------------
  IF NOT EXISTS (SELECT 1 FROM lenses.lenses WHERE id = v_lens_gen_video) THEN
    INSERT INTO lenses.lenses (id, lenser_id, visibility, status)
    VALUES (v_lens_gen_video, v_author, 'public', 'published');

    INSERT INTO lenses.versions (id, lens_id, version_number, template_body, status, published_at)
    VALUES (
      v_ver_gen_video, v_lens_gen_video, 1,
      'You are a Video Producer. Produce a short-form video from the scene plan in [[:' || v_param_gen_video_scene || ']]. The plan declares: script, shots[] with duration, transitions, audio/narration, pacing, and export format. Preserve continuity between shots and honour the declared duration budget.',
      'published', now()
    );

    UPDATE lenses.lenses SET head_version_id = v_ver_gen_video WHERE id = v_lens_gen_video;

    INSERT INTO lenses.version_parameters (id, version_id, label, tool_id)
    VALUES (v_param_gen_video_scene, v_ver_gen_video, 'scene_plan', v_tool_textarea);

    INSERT INTO content.entity_translations (entity_type, entity_id, language_code, is_original, title, description, content)
    VALUES (
      'lens', v_lens_gen_video, 'en', true,
      'Video Generation Lens',
      'Renders a short-form video from a scene plan.',
      'You are a Video Producer. Render the scene plan in [[scene_plan]].'
    );

    INSERT INTO content.tag_map (entity_type, entity_id, tag_id) VALUES
      ('lens', v_lens_gen_video, v_tag_video),
      ('lens', v_lens_gen_video, v_tag_template)
    ON CONFLICT DO NOTHING;
  END IF;

  -- 7) Refine Lens -------------------------------------------------------------
  IF NOT EXISTS (SELECT 1 FROM lenses.lenses WHERE id = v_lens_refine) THEN
    INSERT INTO lenses.lenses (id, lenser_id, visibility, status)
    VALUES (v_lens_refine, v_author, 'public', 'published');

    INSERT INTO lenses.versions (id, lens_id, version_number, template_body, status, published_at)
    VALUES (
      v_ver_refine, v_lens_refine, 1,
      'You are a Draft Editor. Improve the draft in [[:' || v_param_refine_draft || ']] without changing its intent. Fix clarity, tighten pacing, remove redundancy, and enforce the declared style/tone constraints. Return the refined draft only — no commentary.',
      'published', now()
    );

    UPDATE lenses.lenses SET head_version_id = v_ver_refine WHERE id = v_lens_refine;

    INSERT INTO lenses.version_parameters (id, version_id, label, tool_id)
    VALUES (v_param_refine_draft, v_ver_refine, 'draft', v_tool_textarea);

    INSERT INTO content.entity_translations (entity_type, entity_id, language_code, is_original, title, description, content)
    VALUES (
      'lens', v_lens_refine, 'en', true,
      'Refinement Lens',
      'Improves a draft without changing intent.',
      'You are a Draft Editor. Improve [[draft]] while preserving intent.'
    );

    INSERT INTO content.tag_map (entity_type, entity_id, tag_id) VALUES
      ('lens', v_lens_refine, v_tag_transform),
      ('lens', v_lens_refine, v_tag_template)
    ON CONFLICT DO NOTHING;
  END IF;

  -- 8) Validate Lens -----------------------------------------------------------
  IF NOT EXISTS (SELECT 1 FROM lenses.lenses WHERE id = v_lens_validate) THEN
    INSERT INTO lenses.lenses (id, lenser_id, visibility, status)
    VALUES (v_lens_validate, v_author, 'public', 'published');

    INSERT INTO lenses.versions (id, lens_id, version_number, template_body, status, published_at)
    VALUES (
      v_ver_validate, v_lens_validate, 1,
      'You are an Output Validator. Score the [[:' || v_param_validate_output || ']] against the rubric in [[:' || v_param_validate_requirements || ']]. Emit JSON: {passed, score, issues:[], recommendations:[]}. Fail fast if required fields are missing.',
      'published', now()
    );

    UPDATE lenses.lenses SET head_version_id = v_ver_validate WHERE id = v_lens_validate;

    INSERT INTO lenses.version_parameters (id, version_id, label, tool_id) VALUES
      (v_param_validate_output, v_ver_validate, 'output', v_tool_textarea),
      (v_param_validate_requirements, v_ver_validate, 'requirements', v_tool_textarea);

    INSERT INTO content.entity_translations (entity_type, entity_id, language_code, is_original, title, description, content)
    VALUES (
      'lens', v_lens_validate, 'en', true,
      'Validation Lens',
      'Scores an output against a rubric and flags regressions.',
      'You are an Output Validator. Score [[output]] against [[requirements]].'
    );

    INSERT INTO content.tag_map (entity_type, entity_id, tag_id) VALUES
      ('lens', v_lens_validate, v_tag_validation),
      ('lens', v_lens_validate, v_tag_template)
    ON CONFLICT DO NOTHING;
  END IF;

  -- 9) Export PDF Lens ---------------------------------------------------------
  IF NOT EXISTS (SELECT 1 FROM lenses.lenses WHERE id = v_lens_export_pdf) THEN
    INSERT INTO lenses.lenses (id, lenser_id, visibility, status)
    VALUES (v_lens_export_pdf, v_author, 'public', 'published');

    INSERT INTO lenses.versions (id, lens_id, version_number, template_body, status, published_at)
    VALUES (
      v_ver_export_pdf, v_lens_export_pdf, 1,
      'You are a PDF Exporter. Render the validated [[:' || v_param_export_pdf_content || ']] into a production-ready PDF titled [[:' || v_param_export_pdf_title || ']]. Emit a JSON manifest with sections, citations, and page-break hints; the PDF provider serializes the manifest into the final artifact.',
      'published', now()
    );

    UPDATE lenses.lenses SET head_version_id = v_ver_export_pdf WHERE id = v_lens_export_pdf;

    INSERT INTO lenses.version_parameters (id, version_id, label, tool_id) VALUES
      (v_param_export_pdf_content, v_ver_export_pdf, 'content', v_tool_textarea),
      (v_param_export_pdf_title, v_ver_export_pdf, 'title', v_tool_text);

    INSERT INTO content.entity_translations (entity_type, entity_id, language_code, is_original, title, description, content)
    VALUES (
      'lens', v_lens_export_pdf, 'en', true,
      'PDF Export Lens',
      'Serializes validated content into a PDF-ready manifest.',
      'You are a PDF Exporter. Serialize [[content]] to a PDF titled [[title]].'
    );

    INSERT INTO content.tag_map (entity_type, entity_id, tag_id) VALUES
      ('lens', v_lens_export_pdf, v_tag_pdf),
      ('lens', v_lens_export_pdf, v_tag_template)
    ON CONFLICT DO NOTHING;
  END IF;

  -- ---------------------------------------------------------------------------
  -- Workflow 1: Article Pipeline (full 7-stage chain)
  -- ---------------------------------------------------------------------------
  IF NOT EXISTS (SELECT 1 FROM lenses.workflows WHERE id = v_wf_article) THEN
    INSERT INTO lenses.workflows (id, lenser_id, title, description, visibility)
    VALUES (
      v_wf_article, v_author,
      'Template · Article Pipeline',
      'Intent → Plan → Research → Generate → Refine → Validate → Export. The reference 7-stage Connected Lens chain for long-form articles.',
      'public'
    );

    INSERT INTO lenses.workflow_nodes (id, workflow_id, lens_id, version_id, position_x, position_y, label, ordinal) VALUES
      (v_n_a_intent,   v_wf_article, v_lens_intent,     v_ver_intent,     0,    0, 'Intent',    1),
      (v_n_a_plan,     v_wf_article, v_lens_plan,       v_ver_plan,       220,  0, 'Plan',      2),
      (v_n_a_research, v_wf_article, v_lens_research,   v_ver_research,   440,  0, 'Research',  3),
      (v_n_a_gen,      v_wf_article, v_lens_gen_text,   v_ver_gen_text,   660,  0, 'Generate',  4),
      (v_n_a_refine,   v_wf_article, v_lens_refine,     v_ver_refine,     880,  0, 'Refine',    5),
      (v_n_a_validate, v_wf_article, v_lens_validate,   v_ver_validate,   1100, 0, 'Validate',  6),
      (v_n_a_export,   v_wf_article, v_lens_export_pdf, v_ver_export_pdf, 1320, 0, 'Export',    7);

    INSERT INTO lenses.workflow_edges (workflow_id, source_node_id, target_node_id, source_output_key, target_param_label) VALUES
      (v_wf_article, v_n_a_intent,   v_n_a_plan,     'output', 'context'),
      (v_wf_article, v_n_a_plan,     v_n_a_research, 'output', 'context'),
      (v_wf_article, v_n_a_research, v_n_a_gen,      'output', 'context'),
      (v_wf_article, v_n_a_gen,      v_n_a_refine,   'output', 'draft'),
      (v_wf_article, v_n_a_refine,   v_n_a_validate, 'output', 'output'),
      (v_wf_article, v_n_a_validate, v_n_a_export,   'output', 'content');

    INSERT INTO content.tag_map (entity_type, entity_id, tag_id)
    VALUES ('workflow'::content.entity_type_enum, v_wf_article, v_tag_template)
    ON CONFLICT DO NOTHING;
  END IF;

  -- ---------------------------------------------------------------------------
  -- Workflow 2: Visual Concept Kit
  -- ---------------------------------------------------------------------------
  IF NOT EXISTS (SELECT 1 FROM lenses.workflows WHERE id = v_wf_visual) THEN
    INSERT INTO lenses.workflows (id, lenser_id, title, description, visibility)
    VALUES (
      v_wf_visual, v_author,
      'Template · Visual Concept Kit',
      'Intent → Plan → Image Generation → Refine → Validate. Produce a publishable still from a short creative brief.',
      'public'
    );

    INSERT INTO lenses.workflow_nodes (id, workflow_id, lens_id, version_id, position_x, position_y, label, ordinal) VALUES
      (v_n_v_intent,   v_wf_visual, v_lens_intent,    v_ver_intent,    0,   0, 'Intent',   1),
      (v_n_v_plan,     v_wf_visual, v_lens_plan,      v_ver_plan,      220, 0, 'Plan',     2),
      (v_n_v_gen,      v_wf_visual, v_lens_gen_image, v_ver_gen_image, 440, 0, 'Render',   3),
      (v_n_v_refine,   v_wf_visual, v_lens_refine,    v_ver_refine,    660, 0, 'Refine',   4),
      (v_n_v_validate, v_wf_visual, v_lens_validate,  v_ver_validate,  880, 0, 'Validate', 5);

    INSERT INTO lenses.workflow_edges (workflow_id, source_node_id, target_node_id, source_output_key, target_param_label) VALUES
      (v_wf_visual, v_n_v_intent, v_n_v_plan,     'output', 'context'),
      (v_wf_visual, v_n_v_plan,   v_n_v_gen,      'output', 'visual_brief'),
      (v_wf_visual, v_n_v_gen,    v_n_v_refine,   'output', 'draft'),
      (v_wf_visual, v_n_v_refine, v_n_v_validate, 'output', 'output');

    INSERT INTO content.tag_map (entity_type, entity_id, tag_id)
    VALUES ('workflow', v_wf_visual, v_tag_template)
    ON CONFLICT DO NOTHING;
  END IF;

  -- ---------------------------------------------------------------------------
  -- Workflow 3: Short-Form Video Brief
  -- ---------------------------------------------------------------------------
  IF NOT EXISTS (SELECT 1 FROM lenses.workflows WHERE id = v_wf_video) THEN
    INSERT INTO lenses.workflows (id, lenser_id, title, description, visibility)
    VALUES (
      v_wf_video, v_author,
      'Template · Short-Form Video Brief',
      'Intent → Plan → Script → Render → Validate. Goes from creator brief to a rendered short-form video artifact.',
      'public'
    );

    INSERT INTO lenses.workflow_nodes (id, workflow_id, lens_id, version_id, position_x, position_y, label, ordinal) VALUES
      (v_n_vid_intent,   v_wf_video, v_lens_intent,    v_ver_intent,    0,   0, 'Intent',   1),
      (v_n_vid_plan,     v_wf_video, v_lens_plan,      v_ver_plan,      220, 0, 'Plan',     2),
      (v_n_vid_script,   v_wf_video, v_lens_gen_text,  v_ver_gen_text,  440, 0, 'Script',   3),
      (v_n_vid_render,   v_wf_video, v_lens_gen_video, v_ver_gen_video, 660, 0, 'Render',   4),
      (v_n_vid_validate, v_wf_video, v_lens_validate,  v_ver_validate,  880, 0, 'Validate', 5);

    INSERT INTO lenses.workflow_edges (workflow_id, source_node_id, target_node_id, source_output_key, target_param_label) VALUES
      (v_wf_video, v_n_vid_intent, v_n_vid_plan,     'output', 'context'),
      (v_wf_video, v_n_vid_plan,   v_n_vid_script,   'output', 'context'),
      (v_wf_video, v_n_vid_script, v_n_vid_render,   'output', 'scene_plan'),
      (v_wf_video, v_n_vid_render, v_n_vid_validate, 'output', 'output');

    INSERT INTO content.tag_map (entity_type, entity_id, tag_id)
    VALUES ('workflow', v_wf_video, v_tag_template)
    ON CONFLICT DO NOTHING;
  END IF;

  -- ---------------------------------------------------------------------------
  -- Workflow 4: Research Brief to PDF
  -- ---------------------------------------------------------------------------
  IF NOT EXISTS (SELECT 1 FROM lenses.workflows WHERE id = v_wf_research_pdf) THEN
    INSERT INTO lenses.workflows (id, lenser_id, title, description, visibility)
    VALUES (
      v_wf_research_pdf, v_author,
      'Template · Research Brief to PDF',
      'Intent → Research → Refine → Validate → Export. A deep-search pipeline that ships as a production-ready PDF.',
      'public'
    );

    INSERT INTO lenses.workflow_nodes (id, workflow_id, lens_id, version_id, position_x, position_y, label, ordinal) VALUES
      (v_n_r_intent,   v_wf_research_pdf, v_lens_intent,     v_ver_intent,     0,   0, 'Intent',   1),
      (v_n_r_research, v_wf_research_pdf, v_lens_research,   v_ver_research,   220, 0, 'Research', 2),
      (v_n_r_refine,   v_wf_research_pdf, v_lens_refine,     v_ver_refine,     440, 0, 'Refine',   3),
      (v_n_r_validate, v_wf_research_pdf, v_lens_validate,   v_ver_validate,   660, 0, 'Validate', 4),
      (v_n_r_export,   v_wf_research_pdf, v_lens_export_pdf, v_ver_export_pdf, 880, 0, 'Export',   5);

    INSERT INTO lenses.workflow_edges (workflow_id, source_node_id, target_node_id, source_output_key, target_param_label) VALUES
      (v_wf_research_pdf, v_n_r_intent,   v_n_r_research, 'output', 'context'),
      (v_wf_research_pdf, v_n_r_research, v_n_r_refine,   'output', 'draft'),
      (v_wf_research_pdf, v_n_r_refine,   v_n_r_validate, 'output', 'output'),
      (v_wf_research_pdf, v_n_r_validate, v_n_r_export,   'output', 'content');

    INSERT INTO content.tag_map (entity_type, entity_id, tag_id)
    VALUES ('workflow', v_wf_research_pdf, v_tag_template)
    ON CONFLICT DO NOTHING;
  END IF;

  RAISE NOTICE '40_lens_chain_templates: seeded template lenses and starter workflows for author %.', v_author;
END
$seed$;

ANALYZE lenses.lenses;
ANALYZE lenses.versions;
ANALYZE lenses.workflows;
ANALYZE lenses.workflow_nodes;
ANALYZE lenses.workflow_edges;
ANALYZE content.tag_map;
