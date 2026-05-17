-- =============================================================================
-- 50. LENSER CHARACTER DESIGN — LENS & WORKFLOW TEMPLATES
-- =============================================================================
-- Seeds lens templates for Lenser DNA design tasks and workflow templates for
-- logo creation, mascot proposals, animation storyboards, and Chainabit brand
-- content flows. These are the first-party design workflows used by LenserFight
-- and Chainabit — the two founding ecosystems of the platform.
--
-- UUID convention: 50000000-0001-LLLL-0001-… where LLLL = lens index (hex)
--                 50000000-0002-WWWW-SSSS-… where WWWW = workflow index
--
-- Lens templates (50000000-0001-*):
--   0001 lenser-dna-spec-generator
--   0002 lenser-dna-validator
--   0003 lenser-concept-brief
--   0004 lenser-animation-storyboard
--   0005 lenser-logo-brief
--
-- Workflow templates (50000000-0002-*):
--   0001 lenser-mascot-creation-pipeline
--   0002 lenserfight-logo-design-flow
--   0003 lenserfight-animation-proposal
--   0004 chainabit-brand-content-flow
--
-- Idempotent: every block is gated with IF NOT EXISTS.
-- Dependencies:
--   • 15_lens_tools.sql (text / textarea tools)
--   • 07_ai_lensers.sql (AI author profile)
--   • migration 20260417150000_lens_chain_templates.sql (template tag + RPC)
--   • migration 20260426020000_developer_kind_tags.sql (planning, community, etc. tags)
-- =============================================================================

DO $seed$
DECLARE
  v_author        uuid;
  v_tool_text     uuid;
  v_tool_textarea uuid;

  -- Canonical tags
  v_tag_template   uuid;
  v_tag_planning   uuid;
  v_tag_image      uuid;
  v_tag_video      uuid;
  v_tag_validation uuid;
  v_tag_text       uuid;
  v_tag_community  uuid;

  -- ── Lens 1: Lenser DNA Spec Generator ─────────────────────────────────────
  v_lens_dna_gen   uuid := '50000000-0001-0001-0001-000000000001';
  v_ver_dna_gen    uuid := '50000000-0001-0001-0001-00000000000a';
  v_p_dg_concept   uuid := '50000000-0001-0001-0001-0000000000a1';
  v_p_dg_role      uuid := '50000000-0001-0001-0001-0000000000a2';

  -- ── Lens 2: Lenser DNA Validator ──────────────────────────────────────────
  v_lens_dna_val   uuid := '50000000-0001-0002-0001-000000000001';
  v_ver_dna_val    uuid := '50000000-0001-0002-0001-00000000000a';
  v_p_dv_json      uuid := '50000000-0001-0002-0001-0000000000a1';

  -- ── Lens 3: Lenser Concept Brief ──────────────────────────────────────────
  v_lens_concept   uuid := '50000000-0001-0003-0001-000000000001';
  v_ver_concept    uuid := '50000000-0001-0003-0001-00000000000a';
  v_p_cb_idea      uuid := '50000000-0001-0003-0001-0000000000a1';
  v_p_cb_ecosystem uuid := '50000000-0001-0003-0001-0000000000a2';

  -- ── Lens 4: Lenser Animation Storyboard ───────────────────────────────────
  v_lens_storyboard uuid := '50000000-0001-0004-0001-000000000001';
  v_ver_storyboard  uuid := '50000000-0001-0004-0001-00000000000a';
  v_p_sb_character  uuid := '50000000-0001-0004-0001-0000000000a1';
  v_p_sb_action     uuid := '50000000-0001-0004-0001-0000000000a2';

  -- ── Lens 5: Lenser Logo Brief ─────────────────────────────────────────────
  v_lens_logo      uuid := '50000000-0001-0005-0001-000000000001';
  v_ver_logo       uuid := '50000000-0001-0005-0001-00000000000a';
  v_p_lb_brand     uuid := '50000000-0001-0005-0001-0000000000a1';
  v_p_lb_character uuid := '50000000-0001-0005-0001-0000000000a2';

  -- ── Workflow UUIDs ────────────────────────────────────────────────────────
  -- WF-1: Lenser Mascot Creation Pipeline (3 nodes)
  WF1    uuid := '50000000-0002-0001-0001-000000000001';
  WF1_N1 uuid := '50000000-0002-0001-0002-000000000001';
  WF1_N2 uuid := '50000000-0002-0001-0002-000000000002';
  WF1_N3 uuid := '50000000-0002-0001-0002-000000000003';
  WF1_P1 uuid := '50000000-0002-0001-0003-000000000001';
  WF1_P2 uuid := '50000000-0002-0001-0003-000000000002';
  WF1_P3 uuid := '50000000-0002-0001-0003-000000000003';
  WF1_T1 uuid := '50000000-0002-0001-0004-000000000001';
  WF1_T2 uuid := '50000000-0002-0001-0004-000000000002';
  WF1_T3 uuid := '50000000-0002-0001-0004-000000000003';
  WF1_T4 uuid := '50000000-0002-0001-0004-000000000004';
  WF1_T5 uuid := '50000000-0002-0001-0004-000000000005';
  WF1_T6 uuid := '50000000-0002-0001-0004-000000000006';

  -- WF-2: LenserFight Logo Design Flow (3 nodes)
  WF2    uuid := '50000000-0002-0002-0001-000000000001';
  WF2_N1 uuid := '50000000-0002-0002-0002-000000000001';
  WF2_N2 uuid := '50000000-0002-0002-0002-000000000002';
  WF2_N3 uuid := '50000000-0002-0002-0002-000000000003';
  WF2_P1 uuid := '50000000-0002-0002-0003-000000000001';
  WF2_P2 uuid := '50000000-0002-0002-0003-000000000002';
  WF2_P3 uuid := '50000000-0002-0002-0003-000000000003';
  WF2_T1 uuid := '50000000-0002-0002-0004-000000000001';
  WF2_T2 uuid := '50000000-0002-0002-0004-000000000002';
  WF2_T3 uuid := '50000000-0002-0002-0004-000000000003';
  WF2_T4 uuid := '50000000-0002-0002-0004-000000000004';
  WF2_T5 uuid := '50000000-0002-0002-0004-000000000005';

  -- WF-3: LenserFight Animation Proposal (3 nodes)
  WF3    uuid := '50000000-0002-0003-0001-000000000001';
  WF3_N1 uuid := '50000000-0002-0003-0002-000000000001';
  WF3_N2 uuid := '50000000-0002-0003-0002-000000000002';
  WF3_N3 uuid := '50000000-0002-0003-0002-000000000003';
  WF3_P1 uuid := '50000000-0002-0003-0003-000000000001';
  WF3_P2 uuid := '50000000-0002-0003-0003-000000000002';
  WF3_T1 uuid := '50000000-0002-0003-0004-000000000001';
  WF3_T2 uuid := '50000000-0002-0003-0004-000000000002';
  WF3_T3 uuid := '50000000-0002-0003-0004-000000000003';
  WF3_T4 uuid := '50000000-0002-0003-0004-000000000004';

  -- WF-4: Chainabit Brand Content Flow (2 nodes)
  WF4    uuid := '50000000-0002-0004-0001-000000000001';
  WF4_N1 uuid := '50000000-0002-0004-0002-000000000001';
  WF4_N2 uuid := '50000000-0002-0004-0002-000000000002';
  WF4_P1 uuid := '50000000-0002-0004-0003-000000000001';
  WF4_P2 uuid := '50000000-0002-0004-0003-000000000002';
  WF4_T1 uuid := '50000000-0002-0004-0004-000000000001';
  WF4_T2 uuid := '50000000-0002-0004-0004-000000000002';
  WF4_T3 uuid := '50000000-0002-0004-0004-000000000003';
  WF4_T4 uuid := '50000000-0002-0004-0004-000000000004';

  -- 40_ lens constants (used as workflow nodes)
  L40_INTENT   uuid := '40000000-0001-0001-0001-000000000001';
  L40_RESEARCH uuid := '40000000-0001-0003-0001-000000000001';
  L40_GEN_TEXT uuid := '40000000-0001-0004-0001-000000000001';
  L40_REFINE   uuid := '40000000-0001-0007-0001-000000000001';
  L40_VALIDATE uuid := '40000000-0001-0008-0001-000000000001';

BEGIN
  -- ── Resolve dependencies ──────────────────────────────────────────────────
  -- Canonical author: @lenserfight (reserved production account).
  SELECT id INTO v_author FROM lensers.profiles WHERE handle = 'lenserfight' LIMIT 1;

  IF v_author IS NULL THEN
    SELECT profile_id INTO v_author FROM agents.ai_lensers
    ORDER BY (SELECT created_at FROM lensers.profiles WHERE id = profile_id) ASC
    LIMIT 1;
  END IF;

  IF v_author IS NULL THEN
    SELECT id INTO v_author FROM lensers.profiles ORDER BY created_at ASC LIMIT 1;
  END IF;

  IF v_author IS NULL THEN
    RAISE NOTICE '50_lenser_design_workflows: no lensers.profiles row yet — skipping.';
    RETURN;
  END IF;

  SELECT id INTO v_tool_text     FROM lenses.tools WHERE key = 'text';
  SELECT id INTO v_tool_textarea FROM lenses.tools WHERE key = 'textarea';

  IF v_tool_text IS NULL OR v_tool_textarea IS NULL THEN
    RAISE NOTICE '50_lenser_design_workflows: lenses.tools not seeded yet — skipping.';
    RETURN;
  END IF;

  SELECT id INTO v_tag_template   FROM content.tags WHERE slug = 'template';
  SELECT id INTO v_tag_planning   FROM content.tags WHERE slug = 'planning';
  SELECT id INTO v_tag_image      FROM content.tags WHERE slug = 'image';
  SELECT id INTO v_tag_video      FROM content.tags WHERE slug = 'video';
  SELECT id INTO v_tag_validation FROM content.tags WHERE slug = 'validation';
  SELECT id INTO v_tag_text       FROM content.tags WHERE slug = 'text';
  SELECT id INTO v_tag_community  FROM content.tags WHERE slug = 'community';

  IF v_tag_template IS NULL THEN
    RAISE NOTICE '50_lenser_design_workflows: template tag missing — run migration 20260417150000 first.';
    RETURN;
  END IF;

  -- ==========================================================================
  -- LENS TEMPLATES
  -- ==========================================================================

  -- ── 1) Lenser DNA Spec Generator ──────────────────────────────────────────
  IF NOT EXISTS (SELECT 1 FROM lenses.lenses WHERE id = v_lens_dna_gen) THEN
    INSERT INTO lenses.lenses (id, lenser_id, visibility, status)
    VALUES (v_lens_dna_gen, v_author, 'public', 'published');

    INSERT INTO lenses.versions (id, lens_id, version_number, template_body, status, published_at)
    VALUES (
      v_ver_dna_gen, v_lens_dna_gen, 1,
      'You are the Lenser DNA Spec Generator. '
      'The user wants to create a new Lenser character named or described as [[concept]] '
      'with the emotional role of [[emotional_role]]. '
      'Output a valid lenser.json variant block (JSON only, no markdown wrapper) that: '
      '(1) sets "inherits_from": "lenser.json", "status": "proposed"; '
      '(2) defines body_modifications including height_cm, body_shape, antenna_tip, and lens_frame; '
      '(3) defines clothing with cape and bodysuit overrides; '
      '(4) sets chest_core_override.core_color to a hex that fits the role and does not conflict with #ffde59; '
      '(5) defines facial_expression.style and emotional_focus; '
      '(6) lists 3 primary_traits and 2 secondary_traits; '
      '(7) includes symbolism_extension for 2–3 visual elements; '
      '(8) provides views_delta for front and top. '
      'Output only the JSON object. No explanation.',
      'published', now()
    );

    UPDATE lenses.lenses SET head_version_id = v_ver_dna_gen WHERE id = v_lens_dna_gen;

    INSERT INTO lenses.version_parameters (id, version_id, label, tool_id) VALUES
      (v_p_dg_concept, v_ver_dna_gen, 'concept',       v_tool_text),
      (v_p_dg_role,    v_ver_dna_gen, 'emotional_role', v_tool_text);

    INSERT INTO content.entity_translations (entity_type, entity_id, language_code, is_original, title, description, content)
    VALUES
      ('lens', v_lens_dna_gen, 'en', true,
       'Lenser DNA Spec Generator',
       'Turns a character concept and emotional role into a valid lenser.json variant block.',
       'Generate a Lenser DNA variant JSON from [[concept]] and [[emotional_role]].'),
      ('lens', v_lens_dna_gen, 'tr', false,
       'Lenser DNA Spec Üretici (şablon)',
       'Karakter konseptini ve duygusal rolü geçerli bir lenser.json varyant bloğuna dönüştürür.',
       '[[concept]] ve [[emotional_role]] üzerinden Lenser DNA varyant JSON''u üret.');

    INSERT INTO content.tag_map (entity_type, entity_id, tag_id)
    VALUES
      ('lens'::content.entity_type_enum, v_lens_dna_gen, v_tag_template),
      ('lens'::content.entity_type_enum, v_lens_dna_gen, v_tag_planning)
    ON CONFLICT DO NOTHING;
  END IF;

  -- ── 2) Lenser DNA Validator ────────────────────────────────────────────────
  IF NOT EXISTS (SELECT 1 FROM lenses.lenses WHERE id = v_lens_dna_val) THEN
    INSERT INTO lenses.lenses (id, lenser_id, visibility, status)
    VALUES (v_lens_dna_val, v_author, 'public', 'published');

    INSERT INTO lenses.versions (id, lens_id, version_number, template_body, status, published_at)
    VALUES (
      v_ver_dna_val, v_lens_dna_val, 1,
      'You are the Lenser DNA Validator. '
      'Review the following Lenser variant JSON: [[variant_json]]. '
      'Check all rules from the lenser.json spec: '
      '(1) Name starts with L or C, max 8 characters; '
      '(2) No additional eyes or optical elements are defined (visual_rule); '
      '(3) core_color does not conflict with #ffde59 (yellow) — must differ by more than 30 hue degrees; '
      '(4) All required fields present: variant_name, role, body_modifications, clothing, chest_core_override, personality_shift; '
      '(5) height_cm is between 50 and 70; '
      '(6) At least 2 primary_traits and 1 secondary_trait listed. '
      'For each check: output PASS or FAIL with a one-line reason. '
      'At the end output OVERALL: PASS or OVERALL: FAIL.',
      'published', now()
    );

    UPDATE lenses.lenses SET head_version_id = v_ver_dna_val WHERE id = v_lens_dna_val;

    INSERT INTO lenses.version_parameters (id, version_id, label, tool_id) VALUES
      (v_p_dv_json, v_ver_dna_val, 'variant_json', v_tool_textarea);

    INSERT INTO content.entity_translations (entity_type, entity_id, language_code, is_original, title, description, content)
    VALUES
      ('lens', v_lens_dna_val, 'en', true,
       'Lenser DNA Validator',
       'Validates a Lenser variant JSON against all base DNA rules. Returns PASS/FAIL per check.',
       'Validate [[variant_json]] against Lenser DNA rules.'),
      ('lens', v_lens_dna_val, 'tr', false,
       'Lenser DNA Doğrulayıcı (şablon)',
       'Lenser varyant JSON dosyasını tüm DNA kurallarına göre doğrular.',
       '[[variant_json]] dosyasını Lenser DNA kurallarına göre doğrula.');

    INSERT INTO content.tag_map (entity_type, entity_id, tag_id)
    VALUES
      ('lens'::content.entity_type_enum, v_lens_dna_val, v_tag_template),
      ('lens'::content.entity_type_enum, v_lens_dna_val, v_tag_validation)
    ON CONFLICT DO NOTHING;
  END IF;

  -- ── 3) Lenser Concept Brief ────────────────────────────────────────────────
  IF NOT EXISTS (SELECT 1 FROM lenses.lenses WHERE id = v_lens_concept) THEN
    INSERT INTO lenses.lenses (id, lenser_id, visibility, status)
    VALUES (v_lens_concept, v_author, 'public', 'published');

    INSERT INTO lenses.versions (id, lens_id, version_number, template_body, status, published_at)
    VALUES (
      v_ver_concept, v_lens_concept, 1,
      'You are the Lenser Concept Brief generator. '
      'The designer has this one-line character idea: [[character_idea]]. '
      'It may be used by the ecosystem: [[ecosystem]]. '
      'Expand this into a structured creative brief with these sections: '
      '(1) Character Name (must start with L or C, max 8 chars); '
      '(2) Emotional Role — a short phrase describing the character''s primary function; '
      '(3) Target Audience — who will most relate to or use this character; '
      '(4) Core Color — one hex with a 1-sentence justification; '
      '(5) Personality — 3 primary traits and 2 secondary traits; '
      '(6) Visual Signature — the one feature that makes this character instantly recognizable; '
      '(7) Symbolism — what 2 design elements represent; '
      '(8) Differentiation — one paragraph on how this differs from LENSO (Autonomous), LENSA (Creative), LENSE (Strategic), and LOLA (Social). '
      'Be specific and actionable. The brief will be handed to a 3D designer.',
      'published', now()
    );

    UPDATE lenses.lenses SET head_version_id = v_ver_concept WHERE id = v_lens_concept;

    INSERT INTO lenses.version_parameters (id, version_id, label, tool_id) VALUES
      (v_p_cb_idea,      v_ver_concept, 'character_idea', v_tool_text),
      (v_p_cb_ecosystem, v_ver_concept, 'ecosystem',      v_tool_text);

    INSERT INTO content.entity_translations (entity_type, entity_id, language_code, is_original, title, description, content)
    VALUES
      ('lens', v_lens_concept, 'en', true,
       'Lenser Concept Brief',
       'Expands a one-line character idea into a full creative brief for designers.',
       'Generate a creative brief from [[character_idea]] for ecosystem [[ecosystem]].'),
      ('lens', v_lens_concept, 'tr', false,
       'Lenser Konsept Brifing (şablon)',
       'Tek satır bir karakter fikrini tasarımcılar için tam bir yaratıcı brifinge dönüştürür.',
       '[[character_idea]] fikrini [[ecosystem]] için yaratıcı bir brifinge dönüştür.');

    INSERT INTO content.tag_map (entity_type, entity_id, tag_id)
    VALUES
      ('lens'::content.entity_type_enum, v_lens_concept, v_tag_template),
      ('lens'::content.entity_type_enum, v_lens_concept, v_tag_planning)
    ON CONFLICT DO NOTHING;
  END IF;

  -- ── 4) Lenser Animation Storyboard ────────────────────────────────────────
  IF NOT EXISTS (SELECT 1 FROM lenses.lenses WHERE id = v_lens_storyboard) THEN
    INSERT INTO lenses.lenses (id, lenser_id, visibility, status)
    VALUES (v_lens_storyboard, v_author, 'public', 'published');

    INSERT INTO lenses.versions (id, lens_id, version_number, template_body, status, published_at)
    VALUES (
      v_ver_storyboard, v_lens_storyboard, 1,
      'You are the Lenser Animation Storyboard generator. '
      'Character: [[character]]. '
      'Action or emotion to animate: [[action]]. '
      'Produce a frame-by-frame storyboard for a short looping GIF animation (6–12 frames at 24fps). '
      'For each frame provide: Frame number, Duration (ms), Pose description, Lens-eye expression, Core glow intensity (%), Antenna tip state. '
      'Use the character DNA constraints: one central eye-lens, yellow body #ffde59, no additional optical elements. '
      'End with a Technical Notes section covering: canvas size, background recommendation, export format (GIF/APNG/WebM), and loop behavior.',
      'published', now()
    );

    UPDATE lenses.lenses SET head_version_id = v_ver_storyboard WHERE id = v_lens_storyboard;

    INSERT INTO lenses.version_parameters (id, version_id, label, tool_id) VALUES
      (v_p_sb_character, v_ver_storyboard, 'character', v_tool_text),
      (v_p_sb_action,    v_ver_storyboard, 'action',    v_tool_text);

    INSERT INTO content.entity_translations (entity_type, entity_id, language_code, is_original, title, description, content)
    VALUES
      ('lens', v_lens_storyboard, 'en', true,
       'Lenser Animation Storyboard',
       'Generates a frame-by-frame GIF animation storyboard for a Lenser character.',
       'Generate an animation storyboard for [[character]] performing [[action]].'),
      ('lens', v_lens_storyboard, 'tr', false,
       'Lenser Animasyon Storyboard (şablon)',
       'Lenser karakteri için kare kare GIF animasyon storyboard''u üretir.',
       '[[character]] karakterinin [[action]] eylemini gerçekleştirdiği animasyon storyboard''u üret.');

    INSERT INTO content.tag_map (entity_type, entity_id, tag_id)
    VALUES
      ('lens'::content.entity_type_enum, v_lens_storyboard, v_tag_template),
      ('lens'::content.entity_type_enum, v_lens_storyboard, v_tag_image)
    ON CONFLICT DO NOTHING;
  END IF;

  -- ── 5) Lenser Logo Brief ──────────────────────────────────────────────────
  IF NOT EXISTS (SELECT 1 FROM lenses.lenses WHERE id = v_lens_logo) THEN
    INSERT INTO lenses.lenses (id, lenser_id, visibility, status)
    VALUES (v_lens_logo, v_author, 'public', 'published');

    INSERT INTO lenses.versions (id, lens_id, version_number, template_body, status, published_at)
    VALUES (
      v_ver_logo, v_lens_logo, 1,
      'You are the Lenser Logo Brief generator. '
      'Brand or product: [[brand]]. '
      'Featured Lenser character (optional): [[character]]. '
      'Generate a design brief for a logo. Include: '
      '(1) Logo concept — primary and secondary concept options (2 sentences each); '
      '(2) Color palette — hex values with roles (primary, secondary, accent) derived from the Lenser DNA palette (#ffde59, #213f74, character core_color if specified); '
      '(3) Typography — font style recommendation and weight; '
      '(4) Symbol or icon — description of the graphic mark; '
      '(5) Layout variants — horizontal, stacked, icon-only; '
      '(6) Usage rules — minimum size, clear space, backgrounds to avoid; '
      '(7) File formats to deliver — SVG, PNG@2x, dark mode variant. '
      'If no character is specified, base the brief on the generic Lenser DNA identity.',
      'published', now()
    );

    UPDATE lenses.lenses SET head_version_id = v_ver_logo WHERE id = v_lens_logo;

    INSERT INTO lenses.version_parameters (id, version_id, label, tool_id) VALUES
      (v_p_lb_brand,     v_ver_logo, 'brand',     v_tool_text),
      (v_p_lb_character, v_ver_logo, 'character', v_tool_text);

    INSERT INTO content.entity_translations (entity_type, entity_id, language_code, is_original, title, description, content)
    VALUES
      ('lens', v_lens_logo, 'en', true,
       'Lenser Logo Brief',
       'Generates a complete logo design brief for a brand referencing Lenser DNA colors and identity.',
       'Generate a logo brief for [[brand]] featuring [[character]].'),
      ('lens', v_lens_logo, 'tr', false,
       'Lenser Logo Brifing (şablon)',
       'Lenser DNA renkleri ve kimliğine referans veren bir marka için eksiksiz logo tasarım brifing üretir.',
       '[[brand]] için [[character]] ile logo brifing üret.');

    INSERT INTO content.tag_map (entity_type, entity_id, tag_id)
    VALUES
      ('lens'::content.entity_type_enum, v_lens_logo, v_tag_template),
      ('lens'::content.entity_type_enum, v_lens_logo, v_tag_image)
    ON CONFLICT DO NOTHING;
  END IF;

  -- ==========================================================================
  -- WORKFLOW TEMPLATES
  -- ==========================================================================

  -- ── WF-1: Lenser Mascot Creation Pipeline ─────────────────────────────────
  -- Concept Brief → DNA Spec Generator → DNA Validator
  IF NOT EXISTS (SELECT 1 FROM lenses.workflows WHERE id = WF1) THEN
    INSERT INTO lenses.workflows (id, lenser_id, title, description, visibility)
    VALUES (
      WF1, v_author,
      'Template · Lenser Mascot Creation Pipeline',
      'Design a new Lenser character from scratch. A concept brief is expanded into a full DNA spec, then validated against base rules before submission.',
      'public'
    );

    INSERT INTO lenses.workflow_nodes (id, workflow_id, lens_id, version_id, position_x, position_y, label, ordinal) VALUES
      (WF1_N1, WF1, v_lens_concept,   NULL,   0, 0, 'Concept Brief', 1),
      (WF1_N2, WF1, v_lens_dna_gen,   NULL, 240, 0, 'DNA Spec',      2),
      (WF1_N3, WF1, v_lens_dna_val,   NULL, 480, 0, 'Validate',      3);

    INSERT INTO lenses.workflow_edges (workflow_id, source_node_id, target_node_id, source_output_key, target_param_label) VALUES
      (WF1, WF1_N1, WF1_N2, 'output', 'concept'),
      (WF1, WF1_N2, WF1_N3, 'output', 'variant_json');

    INSERT INTO lenses.workflow_phases (id, workflow_id, title, description, ordinal) VALUES
      (WF1_P1, WF1, 'Concept',    'Define the character concept, role, and visual direction.',          1),
      (WF1_P2, WF1, 'DNA Design', 'Generate a structured DNA variant JSON from the concept brief.',    2),
      (WF1_P3, WF1, 'Validation', 'Validate the DNA against base rules before community submission.',  3);

    INSERT INTO lenses.workflow_tasks (id, phase_id, workflow_id, title, prompt_text, output_type, ordinal) VALUES
      (WF1_T1, WF1_P1, WF1, 'Write character idea',    'In one sentence: what is this character''s name, emotional role, and one defining trait?',             'text', 1),
      (WF1_T2, WF1_P1, WF1, 'Identify ecosystem',      'Which ecosystem will use this character? (LenserFight, Chainabit, or your own project)',               'text', 2),
      (WF1_T3, WF1_P2, WF1, 'Review DNA spec output',  'Check the generated JSON: does the core_color feel right for the role? Adjust the concept if needed.', 'text', 1),
      (WF1_T4, WF1_P2, WF1, 'Confirm personality',     'Do the personality_shift traits accurately reflect the character? Revise the prompt and re-run if not.','text', 2),
      (WF1_T5, WF1_P3, WF1, 'Review validation result','Check each PASS/FAIL line. Fix any FAIL by adjusting the DNA spec and re-running the validator.',       'text', 1),
      (WF1_T6, WF1_P3, WF1, 'Prepare PR',              'Once OVERALL: PASS — open a PR with the JSON + concept art as described in the Create a Lenser guide.', 'text', 2);

    INSERT INTO content.tag_map (entity_type, entity_id, tag_id)
    VALUES ('workflow'::content.entity_type_enum, WF1, v_tag_template)
    ON CONFLICT DO NOTHING;
  END IF;

  -- ── WF-2: LenserFight Logo Design Flow ────────────────────────────────────
  -- Logo Brief → Refine → Validate output
  IF NOT EXISTS (SELECT 1 FROM lenses.workflows WHERE id = WF2) THEN
    INSERT INTO lenses.workflows (id, lenser_id, title, description, visibility)
    VALUES (
      WF2, v_author,
      'Template · LenserFight Logo Design Flow',
      'Generate a complete logo design brief for LenserFight or any product in the ecosystem. The brief is refined for clarity and reviewed for brand alignment before handoff to a designer.',
      'public'
    );

    INSERT INTO lenses.workflow_nodes (id, workflow_id, lens_id, version_id, position_x, position_y, label, ordinal) VALUES
      (WF2_N1, WF2, v_lens_logo,  NULL,   0, 0, 'Logo Brief', 1),
      (WF2_N2, WF2, L40_REFINE,   NULL, 240, 0, 'Refine',     2),
      (WF2_N3, WF2, L40_VALIDATE, NULL, 480, 0, 'Brand Check',3);

    INSERT INTO lenses.workflow_edges (workflow_id, source_node_id, target_node_id, source_output_key, target_param_label) VALUES
      (WF2, WF2_N1, WF2_N2, 'output', 'draft'),
      (WF2, WF2_N2, WF2_N3, 'output', 'content');

    INSERT INTO lenses.workflow_phases (id, workflow_id, title, description, ordinal) VALUES
      (WF2_P1, WF2, 'Brief Generation', 'Create the initial logo design brief.',              1),
      (WF2_P2, WF2, 'Refinement',       'Polish the brief for clarity and completeness.',     2),
      (WF2_P3, WF2, 'Brand Review',     'Validate the brief aligns with Lenser DNA palette.', 3);

    INSERT INTO lenses.workflow_tasks (id, phase_id, workflow_id, title, prompt_text, output_type, ordinal) VALUES
      (WF2_T1, WF2_P1, WF2, 'Enter brand name',      'What brand or product is this logo for?',                                          'text', 1),
      (WF2_T2, WF2_P1, WF2, 'Pick Lenser character', 'Which Lenser character should feature? (LENSO, LENSA, LENSE, LOLA, or leave blank)',  'text', 2),
      (WF2_T3, WF2_P2, WF2, 'Check color palette',   'Are the hex values in the brief derived from #ffde59 and #213f74? Confirm or adjust.','text', 1),
      (WF2_T4, WF2_P2, WF2, 'Review typography',     'Does the font style match the character''s personality (e.g. sharp for LENSE)?',      'text', 2),
      (WF2_T5, WF2_P3, WF2, 'Approve and export',    'Sign off on the brief and hand it to a designer with the file format requirements.',   'text', 1);

    INSERT INTO content.tag_map (entity_type, entity_id, tag_id)
    VALUES ('workflow'::content.entity_type_enum, WF2, v_tag_template)
    ON CONFLICT DO NOTHING;
  END IF;

  -- ── WF-3: LenserFight Animation Proposal ──────────────────────────────────
  -- Storyboard → Refine
  IF NOT EXISTS (SELECT 1 FROM lenses.workflows WHERE id = WF3) THEN
    INSERT INTO lenses.workflows (id, lenser_id, title, description, visibility)
    VALUES (
      WF3, v_author,
      'Template · LenserFight Animation Proposal',
      'Generate a looping GIF or animation proposal for a Lenser character. Outputs a frame-by-frame storyboard and technical notes, refined for handoff to an animator.',
      'public'
    );

    INSERT INTO lenses.workflow_nodes (id, workflow_id, lens_id, version_id, position_x, position_y, label, ordinal) VALUES
      (WF3_N1, WF3, v_lens_storyboard, NULL,   0, 0, 'Storyboard', 1),
      (WF3_N2, WF3, L40_REFINE,        NULL, 240, 0, 'Refine',     2),
      (WF3_N3, WF3, L40_VALIDATE,      NULL, 480, 0, 'Tech Check', 3);

    INSERT INTO lenses.workflow_edges (workflow_id, source_node_id, target_node_id, source_output_key, target_param_label) VALUES
      (WF3, WF3_N1, WF3_N2, 'output', 'draft'),
      (WF3, WF3_N2, WF3_N3, 'output', 'content');

    INSERT INTO lenses.workflow_phases (id, workflow_id, title, description, ordinal) VALUES
      (WF3_P1, WF3, 'Storyboard',  'Generate the frame-by-frame animation plan.', 1),
      (WF3_P2, WF3, 'Polish',      'Refine and validate the animation spec.',     2);

    INSERT INTO lenses.workflow_tasks (id, phase_id, workflow_id, title, prompt_text, output_type, ordinal) VALUES
      (WF3_T1, WF3_P1, WF3, 'Pick character',    'Which Lenser? (LENSO, LENSA, LENSE, LOLA, or proposed name)',                         'text', 1),
      (WF3_T2, WF3_P1, WF3, 'Describe action',   'What emotion or action should the animation show? (e.g. celebrating a win, thinking)', 'text', 2),
      (WF3_T3, WF3_P2, WF3, 'Review frame count','Are 6–12 frames sufficient for the action? Adjust the storyboard if needed.',          'text', 1),
      (WF3_T4, WF3_P2, WF3, 'Confirm tech spec', 'Verify canvas size, loop behavior, and export format. Approve for animator handoff.',  'text', 2);

    INSERT INTO content.tag_map (entity_type, entity_id, tag_id)
    VALUES ('workflow'::content.entity_type_enum, WF3, v_tag_template)
    ON CONFLICT DO NOTHING;
  END IF;

  -- ── WF-4: Chainabit Brand Content Flow ────────────────────────────────────
  -- Research context → Text Gen → Refine
  -- Chainabit uses the Lenser AI pipeline to improve text quality across its
  -- ecosystem (documentation, copy, community posts). Chao (C-prefix Lenser)
  -- is Chainabit's brand character and participates in this workflow.
  IF NOT EXISTS (SELECT 1 FROM lenses.workflows WHERE id = WF4) THEN
    INSERT INTO lenses.workflows (id, lenser_id, title, description, visibility)
    VALUES (
      WF4, v_author,
      'Template · Chainabit Brand Content Flow',
      'Improve text quality for Chainabit ecosystem content using Lenser AI. Research the context, generate polished copy, and refine to brand tone. Chainabit''s Chao character is the face of this workflow.',
      'public'
    );

    INSERT INTO lenses.workflow_nodes (id, workflow_id, lens_id, version_id, position_x, position_y, label, ordinal) VALUES
      (WF4_N1, WF4, L40_RESEARCH, NULL,   0, 0, 'Context',    1),
      (WF4_N2, WF4, L40_GEN_TEXT, NULL, 240, 0, 'Generate',   2);

    INSERT INTO lenses.workflow_edges (workflow_id, source_node_id, target_node_id, source_output_key, target_param_label) VALUES
      (WF4, WF4_N1, WF4_N2, 'output', 'context');

    INSERT INTO lenses.workflow_phases (id, workflow_id, title, description, ordinal) VALUES
      (WF4_P1, WF4, 'Context Research', 'Gather the context for the content piece.',        1),
      (WF4_P2, WF4, 'Content Gen',      'Generate polished copy aligned to Chainabit tone.', 2);

    INSERT INTO lenses.workflow_tasks (id, phase_id, workflow_id, title, prompt_text, output_type, ordinal) VALUES
      (WF4_T1, WF4_P1, WF4, 'Describe content goal',    'What should this content piece accomplish? (e.g. explain a feature, announce a release)',        'text', 1),
      (WF4_T2, WF4_P1, WF4, 'Provide source material',  'Paste any raw notes, docs, or references to research from.',                                     'text', 2),
      (WF4_T3, WF4_P2, WF4, 'Specify format and length','What format? (tweet thread, blog post, changelog entry, docs page) and approximate word count.', 'text', 1),
      (WF4_T4, WF4_P2, WF4, 'Review and approve',       'Read the generated content. Does it reflect the Chainabit BUILD ethos? Approve or iterate.',     'text', 2);

    INSERT INTO content.tag_map (entity_type, entity_id, tag_id)
    VALUES ('workflow'::content.entity_type_enum, WF4, v_tag_template)
    ON CONFLICT DO NOTHING;

    IF v_tag_community IS NOT NULL THEN
      INSERT INTO content.tag_map (entity_type, entity_id, tag_id)
      VALUES ('workflow'::content.entity_type_enum, WF4, v_tag_community)
      ON CONFLICT DO NOTHING;
    END IF;
  END IF;

END $seed$;
