-- =============================================================================
-- 48. GENERAL-PURPOSE WORKFLOW TEMPLATES (Phase 11)
-- =============================================================================
-- 8 beginner-friendly, general-purpose workflow templates spanning research,
-- content creation, QA, data, communication, and personal productivity.
-- Distinct from the 6 developer-focused templates in 42_production_workflow_templates.sql.
--
-- UUID convention: 48000000-0002-WWWW-SSSS-000000000001
--   WWWW = workflow index (0001-0008)
--   SSSS = segment (0001 = workflow, 0002 = node, 0003 = phase, 0004 = task)
--
-- Lens UUIDs from 40_lens_chain_templates.sql:
--   Intent     40000000-0001-0001-0001-000000000001
--   Research   40000000-0001-0003-0001-000000000001
--   Text Gen   40000000-0001-0004-0001-000000000001
--   Refine     40000000-0001-0007-0001-000000000001
--   Validate   40000000-0001-0008-0001-000000000001
--   Export PDF 40000000-0001-0009-0001-000000000001
--
-- Lens UUIDs from 41_developer_lens_templates.sql:
--   Meeting Notes  41000000-0001-0009-0001-000000000001
--   Email Draft    41000000-0001-000b-0001-000000000001
--   Thread Starter 41000000-0001-000c-0001-000000000001
--
-- Idempotent: every block is gated with IF NOT EXISTS.
-- Rollback: DELETE FROM lenses.workflows WHERE id IN (<WF UUIDs below>);
-- Dependencies: 07_ai_lensers.sql, 40_lens_chain_templates.sql,
--               41_developer_lens_templates.sql,
--               migration 20260417150000_lens_chain_templates.sql
-- =============================================================================

DO $seed$
DECLARE
  v_author       uuid;
  v_tag_template uuid;

  -- ── 40_ lens constants ─────────────────────────────────────────────────────
  L40_INTENT     uuid := '40000000-0001-0001-0001-000000000001';
  L40_RESEARCH   uuid := '40000000-0001-0003-0001-000000000001';
  L40_GEN_TEXT   uuid := '40000000-0001-0004-0001-000000000001';
  L40_REFINE     uuid := '40000000-0001-0007-0001-000000000001';
  L40_VALIDATE   uuid := '40000000-0001-0008-0001-000000000001';
  L40_EXPORT_PDF uuid := '40000000-0001-0009-0001-000000000001';

  -- ── 41_ lens constants ─────────────────────────────────────────────────────
  L41_MEETING    uuid := '41000000-0001-0009-0001-000000000001';
  L41_EMAIL      uuid := '41000000-0001-000b-0001-000000000001';
  L41_THREAD     uuid := '41000000-0001-000c-0001-000000000001';

  -- ── WF-1: Quick Research Summary (2 nodes) ─────────────────────────────────
  WF1    uuid := '48000000-0002-0001-0001-000000000001';
  WF1_N1 uuid := '48000000-0002-0001-0002-000000000001';
  WF1_N2 uuid := '48000000-0002-0001-0002-000000000002';
  WF1_P1 uuid := '48000000-0002-0001-0003-000000000001';
  WF1_P2 uuid := '48000000-0002-0001-0003-000000000002';
  WF1_T1 uuid := '48000000-0002-0001-0004-000000000001';
  WF1_T2 uuid := '48000000-0002-0001-0004-000000000002';
  WF1_T3 uuid := '48000000-0002-0001-0004-000000000003';
  WF1_T4 uuid := '48000000-0002-0001-0004-000000000004';

  -- ── WF-2: Blog Post Generator (3 nodes) ────────────────────────────────────
  WF2    uuid := '48000000-0002-0002-0001-000000000001';
  WF2_N1 uuid := '48000000-0002-0002-0002-000000000001';
  WF2_N2 uuid := '48000000-0002-0002-0002-000000000002';
  WF2_N3 uuid := '48000000-0002-0002-0002-000000000003';
  WF2_P1 uuid := '48000000-0002-0002-0003-000000000001';
  WF2_P2 uuid := '48000000-0002-0002-0003-000000000002';
  WF2_P3 uuid := '48000000-0002-0002-0003-000000000003';
  WF2_T1 uuid := '48000000-0002-0002-0004-000000000001';
  WF2_T2 uuid := '48000000-0002-0002-0004-000000000002';
  WF2_T3 uuid := '48000000-0002-0002-0004-000000000003';
  WF2_T4 uuid := '48000000-0002-0002-0004-000000000004';
  WF2_T5 uuid := '48000000-0002-0002-0004-000000000005';
  WF2_T6 uuid := '48000000-0002-0002-0004-000000000006';

  -- ── WF-3: Meeting Notes → Action Items (2 nodes) ───────────────────────────
  WF3    uuid := '48000000-0002-0003-0001-000000000001';
  WF3_N1 uuid := '48000000-0002-0003-0002-000000000001';
  WF3_N2 uuid := '48000000-0002-0003-0002-000000000002';
  WF3_P1 uuid := '48000000-0002-0003-0003-000000000001';
  WF3_P2 uuid := '48000000-0002-0003-0003-000000000002';
  WF3_T1 uuid := '48000000-0002-0003-0004-000000000001';
  WF3_T2 uuid := '48000000-0002-0003-0004-000000000002';
  WF3_T3 uuid := '48000000-0002-0003-0004-000000000003';
  WF3_T4 uuid := '48000000-0002-0003-0004-000000000004';

  -- ── WF-4: Email Response Drafting (2 nodes) ────────────────────────────────
  WF4    uuid := '48000000-0002-0004-0001-000000000001';
  WF4_N1 uuid := '48000000-0002-0004-0002-000000000001';
  WF4_N2 uuid := '48000000-0002-0004-0002-000000000002';
  WF4_P1 uuid := '48000000-0002-0004-0003-000000000001';
  WF4_P2 uuid := '48000000-0002-0004-0003-000000000002';
  WF4_T1 uuid := '48000000-0002-0004-0004-000000000001';
  WF4_T2 uuid := '48000000-0002-0004-0004-000000000002';
  WF4_T3 uuid := '48000000-0002-0004-0004-000000000003';
  WF4_T4 uuid := '48000000-0002-0004-0004-000000000004';

  -- ── WF-5: Content Quality Gate (3 nodes) ───────────────────────────────────
  WF5    uuid := '48000000-0002-0005-0001-000000000001';
  WF5_N1 uuid := '48000000-0002-0005-0002-000000000001';
  WF5_N2 uuid := '48000000-0002-0005-0002-000000000002';
  WF5_N3 uuid := '48000000-0002-0005-0002-000000000003';
  WF5_P1 uuid := '48000000-0002-0005-0003-000000000001';
  WF5_P2 uuid := '48000000-0002-0005-0003-000000000002';
  WF5_P3 uuid := '48000000-0002-0005-0003-000000000003';
  WF5_T1 uuid := '48000000-0002-0005-0004-000000000001';
  WF5_T2 uuid := '48000000-0002-0005-0004-000000000002';
  WF5_T3 uuid := '48000000-0002-0005-0004-000000000003';
  WF5_T4 uuid := '48000000-0002-0005-0004-000000000004';
  WF5_T5 uuid := '48000000-0002-0005-0004-000000000005';
  WF5_T6 uuid := '48000000-0002-0005-0004-000000000006';

  -- ── WF-6: Community Thread Starter (2 nodes) ───────────────────────────────
  WF6    uuid := '48000000-0002-0006-0001-000000000001';
  WF6_N1 uuid := '48000000-0002-0006-0002-000000000001';
  WF6_N2 uuid := '48000000-0002-0006-0002-000000000002';
  WF6_P1 uuid := '48000000-0002-0006-0003-000000000001';
  WF6_P2 uuid := '48000000-0002-0006-0003-000000000002';
  WF6_T1 uuid := '48000000-0002-0006-0004-000000000001';
  WF6_T2 uuid := '48000000-0002-0006-0004-000000000002';
  WF6_T3 uuid := '48000000-0002-0006-0004-000000000003';
  WF6_T4 uuid := '48000000-0002-0006-0004-000000000004';

  -- ── WF-7: Research to Report (4 nodes) ─────────────────────────────────────
  WF7    uuid := '48000000-0002-0007-0001-000000000001';
  WF7_N1 uuid := '48000000-0002-0007-0002-000000000001';
  WF7_N2 uuid := '48000000-0002-0007-0002-000000000002';
  WF7_N3 uuid := '48000000-0002-0007-0002-000000000003';
  WF7_N4 uuid := '48000000-0002-0007-0002-000000000004';
  WF7_P1 uuid := '48000000-0002-0007-0003-000000000001';
  WF7_P2 uuid := '48000000-0002-0007-0003-000000000002';
  WF7_P3 uuid := '48000000-0002-0007-0003-000000000003';
  WF7_P4 uuid := '48000000-0002-0007-0003-000000000004';
  WF7_T1 uuid := '48000000-0002-0007-0004-000000000001';
  WF7_T2 uuid := '48000000-0002-0007-0004-000000000002';
  WF7_T3 uuid := '48000000-0002-0007-0004-000000000003';
  WF7_T4 uuid := '48000000-0002-0007-0004-000000000004';
  WF7_T5 uuid := '48000000-0002-0007-0004-000000000005';
  WF7_T6 uuid := '48000000-0002-0007-0004-000000000006';
  WF7_T7 uuid := '48000000-0002-0007-0004-000000000007';
  WF7_T8 uuid := '48000000-0002-0007-0004-000000000008';

  -- ── WF-8: Idea Exploration + Document (3 nodes) ────────────────────────────
  WF8    uuid := '48000000-0002-0008-0001-000000000001';
  WF8_N1 uuid := '48000000-0002-0008-0002-000000000001';
  WF8_N2 uuid := '48000000-0002-0008-0002-000000000002';
  WF8_N3 uuid := '48000000-0002-0008-0002-000000000003';
  WF8_P1 uuid := '48000000-0002-0008-0003-000000000001';
  WF8_P2 uuid := '48000000-0002-0008-0003-000000000002';
  WF8_P3 uuid := '48000000-0002-0008-0003-000000000003';
  WF8_T1 uuid := '48000000-0002-0008-0004-000000000001';
  WF8_T2 uuid := '48000000-0002-0008-0004-000000000002';
  WF8_T3 uuid := '48000000-0002-0008-0004-000000000003';
  WF8_T4 uuid := '48000000-0002-0008-0004-000000000004';
  WF8_T5 uuid := '48000000-0002-0008-0004-000000000005';
  WF8_T6 uuid := '48000000-0002-0008-0004-000000000006';

BEGIN
  -- Resolve author and template tag
  SELECT profile_id INTO v_author FROM agents.ai_lensers LIMIT 1;
  SELECT id INTO v_tag_template FROM content.tags WHERE slug = 'template';

  -- =============================================================================
  -- WF-1: Quick Research Summary
  -- Research → Text Gen
  -- =============================================================================
  IF NOT EXISTS (SELECT 1 FROM lenses.workflows WHERE id = WF1) THEN
    INSERT INTO lenses.workflows (id, lenser_id, title, description, visibility)
    VALUES (
      WF1, v_author,
      'Template · Quick Research Summary',
      'Enter any topic and get a well-structured summary in seconds. Research gathers the key facts; Text Gen formats them into a clean, readable brief.',
      'public'
    );

    INSERT INTO lenses.workflow_nodes (id, workflow_id, lens_id, version_id, position_x, position_y, label, ordinal) VALUES
      (WF1_N1, WF1, L40_RESEARCH,  NULL,   0, 0, 'Research',  1),
      (WF1_N2, WF1, L40_GEN_TEXT,  NULL, 220, 0, 'Summarise', 2);

    INSERT INTO lenses.workflow_edges (workflow_id, source_node_id, target_node_id, source_output_key, target_param_label) VALUES
      (WF1, WF1_N1, WF1_N2, 'output', 'context');

    INSERT INTO lenses.workflow_phases (id, workflow_id, title, description, ordinal) VALUES
      (WF1_P1, WF1, 'Research',  'Gather key facts and context on the topic.',   1),
      (WF1_P2, WF1, 'Summarise', 'Format findings into a clear, structured brief.', 2);

    INSERT INTO lenses.workflow_tasks (id, phase_id, workflow_id, title, prompt_text, output_type, ordinal) VALUES
      (WF1_T1, WF1_P1, WF1, 'Gather key facts',    'Research the topic and collect the most important facts, statistics, and context.', 'text', 1),
      (WF1_T2, WF1_P1, WF1, 'Identify sources',    'Note the main knowledge areas and any significant perspectives on this topic.', 'text', 2),
      (WF1_T3, WF1_P2, WF1, 'Draft summary',       'Write a concise, structured summary with an intro, key points, and conclusion.', 'text', 1),
      (WF1_T4, WF1_P2, WF1, 'Polish for clarity',  'Refine language so the summary is readable by a non-expert audience.', 'text', 2);

    INSERT INTO content.tag_map (entity_type, entity_id, tag_id)
    VALUES ('workflow'::content.entity_type_enum, WF1, v_tag_template)
    ON CONFLICT DO NOTHING;
  END IF;

  -- =============================================================================
  -- WF-2: Blog Post Generator
  -- Intent → Text Gen → Refine
  -- =============================================================================
  IF NOT EXISTS (SELECT 1 FROM lenses.workflows WHERE id = WF2) THEN
    INSERT INTO lenses.workflows (id, lenser_id, title, description, visibility)
    VALUES (
      WF2, v_author,
      'Template · Blog Post Generator',
      'Turn a rough topic idea into a polished blog post. Intent clarifies the angle, Text Gen drafts the post, and Refine tightens the prose for publication.',
      'public'
    );

    INSERT INTO lenses.workflow_nodes (id, workflow_id, lens_id, version_id, position_x, position_y, label, ordinal) VALUES
      (WF2_N1, WF2, L40_INTENT,    NULL,   0, 0, 'Plan',    1),
      (WF2_N2, WF2, L40_GEN_TEXT,  NULL, 220, 0, 'Draft',   2),
      (WF2_N3, WF2, L40_REFINE,    NULL, 440, 0, 'Polish',  3);

    INSERT INTO lenses.workflow_edges (workflow_id, source_node_id, target_node_id, source_output_key, target_param_label) VALUES
      (WF2, WF2_N1, WF2_N2, 'output', 'topic'),
      (WF2, WF2_N2, WF2_N3, 'output', 'draft');

    INSERT INTO lenses.workflow_phases (id, workflow_id, title, description, ordinal) VALUES
      (WF2_P1, WF2, 'Plan',   'Define the post angle, target audience, and key messages.',        1),
      (WF2_P2, WF2, 'Draft',  'Write the full first-draft blog post.',                             2),
      (WF2_P3, WF2, 'Polish', 'Tighten prose, fix tone, and make the post publication-ready.',    3);

    INSERT INTO lenses.workflow_tasks (id, phase_id, workflow_id, title, prompt_text, output_type, ordinal) VALUES
      (WF2_T1, WF2_P1, WF2, 'Define angle',         'Clarify the topic angle, target audience, and 3 key messages the post must convey.', 'text', 1),
      (WF2_T2, WF2_P1, WF2, 'Outline structure',    'Create a section-by-section outline: intro, 3-5 body sections, and conclusion.', 'text', 2),
      (WF2_T3, WF2_P2, WF2, 'Write the draft',      'Write a full blog post (~600 words) following the outline. Conversational but authoritative tone.', 'text', 1),
      (WF2_T4, WF2_P2, WF2, 'Add examples',         'Enrich each section with a concrete example or data point to support the claim.', 'text', 2),
      (WF2_T5, WF2_P3, WF2, 'Tighten prose',        'Cut filler words, shorten sentences over 25 words, and fix passive voice.', 'text', 1),
      (WF2_T6, WF2_P3, WF2, 'Write SEO meta',       'Write a 155-character meta description and suggest 3 title variants for A/B testing.', 'text', 2);

    INSERT INTO content.tag_map (entity_type, entity_id, tag_id)
    VALUES ('workflow'::content.entity_type_enum, WF2, v_tag_template)
    ON CONFLICT DO NOTHING;
  END IF;

  -- =============================================================================
  -- WF-3: Meeting Notes → Action Items
  -- Meeting Notes → Text Gen
  -- =============================================================================
  IF NOT EXISTS (SELECT 1 FROM lenses.workflows WHERE id = WF3) THEN
    INSERT INTO lenses.workflows (id, lenser_id, title, description, visibility)
    VALUES (
      WF3, v_author,
      'Template · Meeting Notes → Action Items',
      'Paste raw meeting notes and get a clean summary plus a formatted action-item list with owners and deadlines extracted automatically.',
      'public'
    );

    INSERT INTO lenses.workflow_nodes (id, workflow_id, lens_id, version_id, position_x, position_y, label, ordinal) VALUES
      (WF3_N1, WF3, L41_MEETING,  NULL,   0, 0, 'Summarise Notes', 1),
      (WF3_N2, WF3, L40_GEN_TEXT, NULL, 220, 0, 'Extract Actions',  2);

    INSERT INTO lenses.workflow_edges (workflow_id, source_node_id, target_node_id, source_output_key, target_param_label) VALUES
      (WF3, WF3_N1, WF3_N2, 'output', 'context');

    INSERT INTO lenses.workflow_phases (id, workflow_id, title, description, ordinal) VALUES
      (WF3_P1, WF3, 'Summarise', 'Condense raw notes into key decisions and discussion points.', 1),
      (WF3_P2, WF3, 'Action Items', 'Extract every action item with owner and due date.',         2);

    INSERT INTO lenses.workflow_tasks (id, phase_id, workflow_id, title, prompt_text, output_type, ordinal) VALUES
      (WF3_T1, WF3_P1, WF3, 'Summarise meeting',   'Condense the meeting notes into: attendees, key decisions, open questions.', 'text', 1),
      (WF3_T2, WF3_P1, WF3, 'Identify decisions',  'List every decision made with its rationale in one sentence per item.', 'text', 2),
      (WF3_T3, WF3_P2, WF3, 'List action items',   'Extract every action item as: [Owner] [Action] [Due date or "ASAP"] in a markdown table.', 'text', 1),
      (WF3_T4, WF3_P2, WF3, 'Draft follow-up email','Write a concise follow-up email summarising the decisions and action items for the attendees.', 'text', 2);

    INSERT INTO content.tag_map (entity_type, entity_id, tag_id)
    VALUES ('workflow'::content.entity_type_enum, WF3, v_tag_template)
    ON CONFLICT DO NOTHING;
  END IF;

  -- =============================================================================
  -- WF-4: Email Response Drafting
  -- Intent → Email Draft
  -- =============================================================================
  IF NOT EXISTS (SELECT 1 FROM lenses.workflows WHERE id = WF4) THEN
    INSERT INTO lenses.workflows (id, lenser_id, title, description, visibility)
    VALUES (
      WF4, v_author,
      'Template · Email Response Drafting',
      'Paste an incoming email and your intended response points, and get a polished, correctly-toned reply ready to send.',
      'public'
    );

    INSERT INTO lenses.workflow_nodes (id, workflow_id, lens_id, version_id, position_x, position_y, label, ordinal) VALUES
      (WF4_N1, WF4, L40_INTENT,  NULL,   0, 0, 'Analyse Intent', 1),
      (WF4_N2, WF4, L41_EMAIL,   NULL, 220, 0, 'Draft Reply',    2);

    INSERT INTO lenses.workflow_edges (workflow_id, source_node_id, target_node_id, source_output_key, target_param_label) VALUES
      (WF4, WF4_N1, WF4_N2, 'output', 'intent');

    INSERT INTO lenses.workflow_phases (id, workflow_id, title, description, ordinal) VALUES
      (WF4_P1, WF4, 'Analyse', 'Understand the intent, tone, and key asks of the incoming email.', 1),
      (WF4_P2, WF4, 'Draft',   'Write the reply with the right tone and all points addressed.',    2);

    INSERT INTO lenses.workflow_tasks (id, phase_id, workflow_id, title, prompt_text, output_type, ordinal) VALUES
      (WF4_T1, WF4_P1, WF4, 'Identify intent',   'What is the sender asking for? List the key questions or requests.', 'text', 1),
      (WF4_T2, WF4_P1, WF4, 'Assess tone',       'What tone is appropriate for the reply — formal, friendly, assertive? Why?', 'text', 2),
      (WF4_T3, WF4_P2, WF4, 'Write draft reply', 'Draft the full email reply addressing every point, matching the required tone.', 'text', 1),
      (WF4_T4, WF4_P2, WF4, 'Review and trim',   'Ensure the reply is concise — cut anything that does not add value for the recipient.', 'text', 2);

    INSERT INTO content.tag_map (entity_type, entity_id, tag_id)
    VALUES ('workflow'::content.entity_type_enum, WF4, v_tag_template)
    ON CONFLICT DO NOTHING;
  END IF;

  -- =============================================================================
  -- WF-5: Content Quality Gate
  -- Text Gen → Refine → Validate
  -- =============================================================================
  IF NOT EXISTS (SELECT 1 FROM lenses.workflows WHERE id = WF5) THEN
    INSERT INTO lenses.workflows (id, lenser_id, title, description, visibility)
    VALUES (
      WF5, v_author,
      'Template · Content Quality Gate',
      'Draft content, refine it for clarity and tone, then validate it against a quality rubric. Three-node pipeline that catches issues before you publish.',
      'public'
    );

    INSERT INTO lenses.workflow_nodes (id, workflow_id, lens_id, version_id, position_x, position_y, label, ordinal) VALUES
      (WF5_N1, WF5, L40_GEN_TEXT,  NULL,   0, 0, 'Draft',    1),
      (WF5_N2, WF5, L40_REFINE,    NULL, 220, 0, 'Refine',   2),
      (WF5_N3, WF5, L40_VALIDATE,  NULL, 440, 0, 'Validate', 3);

    INSERT INTO lenses.workflow_edges (workflow_id, source_node_id, target_node_id, source_output_key, target_param_label) VALUES
      (WF5, WF5_N1, WF5_N2, 'output', 'draft'),
      (WF5, WF5_N2, WF5_N3, 'output', 'output');

    INSERT INTO lenses.workflow_phases (id, workflow_id, title, description, ordinal) VALUES
      (WF5_P1, WF5, 'Draft',    'Generate the first-pass content.',                                   1),
      (WF5_P2, WF5, 'Refine',   'Improve clarity, tone, and structure.',                              2),
      (WF5_P3, WF5, 'Validate', 'Check against requirements before publishing.',                      3);

    INSERT INTO lenses.workflow_tasks (id, phase_id, workflow_id, title, prompt_text, output_type, ordinal) VALUES
      (WF5_T1, WF5_P1, WF5, 'Draft content',          'Write the first version of the content based on the provided topic and requirements.', 'text', 1),
      (WF5_T2, WF5_P1, WF5, 'Check completeness',     'Identify any missing sections or points that should be addressed before refinement.', 'text', 2),
      (WF5_T3, WF5_P2, WF5, 'Improve clarity',        'Rewrite unclear sentences, fix passive voice, and improve paragraph flow.', 'text', 1),
      (WF5_T4, WF5_P2, WF5, 'Align tone',             'Ensure the tone matches the target audience — adjust formality, enthusiasm, or caution.', 'text', 2),
      (WF5_T5, WF5_P3, WF5, 'Validate against rubric','Check: accuracy, tone, readability, completeness. Flag any failures.', 'text', 1),
      (WF5_T6, WF5_P3, WF5, 'Final sign-off notes',   'Summarise whether this content is ready to publish, or list what must change first.', 'text', 2);

    INSERT INTO content.tag_map (entity_type, entity_id, tag_id)
    VALUES ('workflow'::content.entity_type_enum, WF5, v_tag_template)
    ON CONFLICT DO NOTHING;
  END IF;

  -- =============================================================================
  -- WF-6: Community Thread Starter
  -- Intent → Thread Starter
  -- =============================================================================
  IF NOT EXISTS (SELECT 1 FROM lenses.workflows WHERE id = WF6) THEN
    INSERT INTO lenses.workflows (id, lenser_id, title, description, visibility)
    VALUES (
      WF6, v_author,
      'Template · Community Thread Starter',
      'Turn a raw idea or topic into a compelling community discussion thread — hook, context, and an open question that drives replies.',
      'public'
    );

    INSERT INTO lenses.workflow_nodes (id, workflow_id, lens_id, version_id, position_x, position_y, label, ordinal) VALUES
      (WF6_N1, WF6, L40_INTENT,  NULL,   0, 0, 'Frame Topic', 1),
      (WF6_N2, WF6, L41_THREAD,  NULL, 220, 0, 'Write Thread', 2);

    INSERT INTO lenses.workflow_edges (workflow_id, source_node_id, target_node_id, source_output_key, target_param_label) VALUES
      (WF6, WF6_N1, WF6_N2, 'output', 'topic');

    INSERT INTO lenses.workflow_phases (id, workflow_id, title, description, ordinal) VALUES
      (WF6_P1, WF6, 'Frame',  'Clarify the discussion angle and what kind of replies you want.',  1),
      (WF6_P2, WF6, 'Write',  'Craft the opening post with hook, context, and call to engage.',   2);

    INSERT INTO lenses.workflow_tasks (id, phase_id, workflow_id, title, prompt_text, output_type, ordinal) VALUES
      (WF6_T1, WF6_P1, WF6, 'Clarify angle',      'What specific aspect of this topic sparks the most debate or curiosity?', 'text', 1),
      (WF6_T2, WF6_P1, WF6, 'Define audience',    'Who is this thread for? What experience level and interests?', 'text', 2),
      (WF6_T3, WF6_P2, WF6, 'Write opening post', 'Write a 3-paragraph post: hook (1 sentence), context (2-3 sentences), open question to spark discussion.', 'text', 1),
      (WF6_T4, WF6_P2, WF6, 'Add reply prompts',  'Suggest 2-3 follow-up questions to guide the conversation if it slows down.', 'text', 2);

    INSERT INTO content.tag_map (entity_type, entity_id, tag_id)
    VALUES ('workflow'::content.entity_type_enum, WF6, v_tag_template)
    ON CONFLICT DO NOTHING;
  END IF;

  -- =============================================================================
  -- WF-7: Research to Report
  -- Intent → Research → Text Gen → Export PDF
  -- =============================================================================
  IF NOT EXISTS (SELECT 1 FROM lenses.workflows WHERE id = WF7) THEN
    INSERT INTO lenses.workflows (id, lenser_id, title, description, visibility)
    VALUES (
      WF7, v_author,
      'Template · Research to Report',
      'Produce a structured PDF report from any topic. Define the scope, research the subject, draft the report, and export it as a downloadable document.',
      'public'
    );

    INSERT INTO lenses.workflow_nodes (id, workflow_id, lens_id, version_id, position_x, position_y, label, ordinal) VALUES
      (WF7_N1, WF7, L40_INTENT,     NULL,   0, 0, 'Scope',    1),
      (WF7_N2, WF7, L40_RESEARCH,   NULL, 220, 0, 'Research', 2),
      (WF7_N3, WF7, L40_GEN_TEXT,   NULL, 440, 0, 'Draft',    3),
      (WF7_N4, WF7, L40_EXPORT_PDF, NULL, 660, 0, 'Export',   4);

    INSERT INTO lenses.workflow_edges (workflow_id, source_node_id, target_node_id, source_output_key, target_param_label) VALUES
      (WF7, WF7_N1, WF7_N2, 'output', 'topic'),
      (WF7, WF7_N2, WF7_N3, 'output', 'context'),
      (WF7, WF7_N3, WF7_N4, 'output', 'content');

    INSERT INTO lenses.workflow_phases (id, workflow_id, title, description, ordinal) VALUES
      (WF7_P1, WF7, 'Scope',    'Define report boundaries, audience, and required sections.',     1),
      (WF7_P2, WF7, 'Research', 'Gather findings, statistics, and supporting evidence.',          2),
      (WF7_P3, WF7, 'Draft',    'Write the report body with structured sections.',               3),
      (WF7_P4, WF7, 'Export',   'Package the report as a formatted PDF artifact.',               4);

    INSERT INTO lenses.workflow_tasks (id, phase_id, workflow_id, title, prompt_text, output_type, ordinal) VALUES
      (WF7_T1, WF7_P1, WF7, 'Define scope',         'List the 4-6 sections the report must cover and the target audience.', 'text', 1),
      (WF7_T2, WF7_P1, WF7, 'Set success criteria', 'What does a complete, high-quality report look like for this topic?', 'text', 2),
      (WF7_T3, WF7_P2, WF7, 'Research findings',    'Gather key facts, statistics, and evidence for each section.', 'text', 1),
      (WF7_T4, WF7_P2, WF7, 'Identify gaps',        'Note any areas where information is uncertain or missing.', 'text', 2),
      (WF7_T5, WF7_P3, WF7, 'Draft report',         'Write the full report with section headings, findings, and a summary/recommendations section.', 'text', 1),
      (WF7_T6, WF7_P3, WF7, 'Add executive summary','Write a 150-word executive summary for stakeholders who only read the top.', 'text', 2),
      (WF7_T7, WF7_P4, WF7, 'Format for PDF',       'Structure the content with a cover title, section headers, and a references section.', 'text', 1),
      (WF7_T8, WF7_P4, WF7, 'Final check',          'Verify the report is complete, well-structured, and ready to export.', 'text', 2);

    INSERT INTO content.tag_map (entity_type, entity_id, tag_id)
    VALUES ('workflow'::content.entity_type_enum, WF7, v_tag_template)
    ON CONFLICT DO NOTHING;
  END IF;

  -- =============================================================================
  -- WF-8: Idea Exploration + Document
  -- Intent → Research → Refine
  -- =============================================================================
  IF NOT EXISTS (SELECT 1 FROM lenses.workflows WHERE id = WF8) THEN
    INSERT INTO lenses.workflows (id, lenser_id, title, description, visibility)
    VALUES (
      WF8, v_author,
      'Template · Idea Exploration + Document',
      'Turn a rough idea into a documented concept note. Clarify the intent, explore supporting evidence and angles, then refine into a clean one-pager.',
      'public'
    );

    INSERT INTO lenses.workflow_nodes (id, workflow_id, lens_id, version_id, position_x, position_y, label, ordinal) VALUES
      (WF8_N1, WF8, L40_INTENT,   NULL,   0, 0, 'Frame Idea', 1),
      (WF8_N2, WF8, L40_RESEARCH, NULL, 220, 0, 'Explore',    2),
      (WF8_N3, WF8, L40_REFINE,   NULL, 440, 0, 'Document',   3);

    INSERT INTO lenses.workflow_edges (workflow_id, source_node_id, target_node_id, source_output_key, target_param_label) VALUES
      (WF8, WF8_N1, WF8_N2, 'output', 'topic'),
      (WF8, WF8_N2, WF8_N3, 'output', 'draft');

    INSERT INTO lenses.workflow_phases (id, workflow_id, title, description, ordinal) VALUES
      (WF8_P1, WF8, 'Frame',    'Articulate the core idea and what problem it solves.',        1),
      (WF8_P2, WF8, 'Explore',  'Research analogies, prior art, and supporting rationale.',   2),
      (WF8_P3, WF8, 'Document', 'Refine into a clean concept note or one-pager.',             3);

    INSERT INTO lenses.workflow_tasks (id, phase_id, workflow_id, title, prompt_text, output_type, ordinal) VALUES
      (WF8_T1, WF8_P1, WF8, 'Define the idea',       'In 2-3 sentences: what is the idea, what problem does it solve, who benefits?', 'text', 1),
      (WF8_T2, WF8_P1, WF8, 'State assumptions',     'List the key assumptions this idea depends on.', 'text', 2),
      (WF8_T3, WF8_P2, WF8, 'Research analogies',    'Find 2-3 similar ideas or prior art — what worked, what failed, and why.', 'text', 1),
      (WF8_T4, WF8_P2, WF8, 'Identify objections',   'What are the strongest counterarguments or risks? How would you respond?', 'text', 2),
      (WF8_T5, WF8_P3, WF8, 'Write concept note',    'Draft a one-pager: problem, proposed solution, rationale, risks, and next steps.', 'text', 1),
      (WF8_T6, WF8_P3, WF8, 'Sharpen title & hook',  'Write a title and a single-sentence value proposition for the idea.', 'text', 2);

    INSERT INTO content.tag_map (entity_type, entity_id, tag_id)
    VALUES ('workflow'::content.entity_type_enum, WF8, v_tag_template)
    ON CONFLICT DO NOTHING;
  END IF;

END $seed$;
