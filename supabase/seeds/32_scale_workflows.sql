-- =============================================================================
-- 32. SCALE WORKFLOWS
-- =============================================================================
-- Seeds 500 realistic workflows across all generative AI output categories:
--   text · code · image · video · audio · pdf · research · data · transform
--
-- Each workflow gets:
--   • A professional title and description
--   • 2–5 workflow_nodes wired in a linear DAG (workflow_edges)
--   • 2–4 workflow_phases with ordered workflow_tasks (phases/tasks model)
--
-- Authors: ~80% human lensers, ~20% AI lenser profiles.
-- Nodes reuse lenses from the pool seeded in 25_scale_lenses.sql.
-- =============================================================================

DO $$
DECLARE
  total            int := 500;
  i                int;
  wf_id            uuid;
  lenser_id_val    uuid;
  node_count       int;
  node_ids         uuid[];
  lens_ids         uuid[];
  all_lens_count   int;
  all_lenser_ids   uuid[];
  all_lenser_cnt   int;
  node_idx         int;
  curr_node_id     uuid;
  lens_id_val      uuid;
  version_id_val   uuid;
  vis              text;
  ca               timestamptz;
  variant_idx      int;
  phase_id_1       uuid;
  phase_id_2       uuid;
  phase_id_3       uuid;
  phase_id_4       uuid;
  task_id          uuid;
  node_label       text;

  -- ---------------------------------------------------------------------------
  -- 12 professional workflow categories
  -- ---------------------------------------------------------------------------
  wf_titles text[][] := ARRAY[
    -- 0: Long-form content pipeline
    ARRAY[
      'Long-Form Article Pipeline',
      'Researches a topic, builds an outline, drafts and refines a publication-ready article, then exports a PDF.',
      'ARRAY[''Research & Brief'', ''Draft'', ''Refine'', ''Export'']'
    ],
    -- 1: Code generation & review loop
    ARRAY[
      'Code Generation & Review Loop',
      'Generates implementation code, runs a security and quality review, applies fixes, and produces final documentation.',
      'ARRAY[''Generate'', ''Review'', ''Fix'', ''Document'']'
    ],
    -- 2: Text-to-image campaign
    ARRAY[
      'Text-to-Image Campaign Builder',
      'Translates a creative brief into optimised image prompts, renders stills, refines them, and packages a visual kit.',
      'ARRAY[''Brief'', ''Prompt Engineering'', ''Render'', ''Package'']'
    ],
    -- 3: Short-form video production
    ARRAY[
      'Short-Form Video Production',
      'Builds a hook-driven script, generates scene descriptions, renders a video draft, and validates pacing and CTA.',
      'ARRAY[''Script'', ''Scene Plan'', ''Render'', ''QA'']'
    ],
    -- 4: Podcast episode pipeline
    ARRAY[
      'Podcast Episode Pipeline',
      'Outlines episode beats, writes host dialogue and transitions, produces an audio-ready script, and drafts show notes.',
      'ARRAY[''Outline'', ''Script'', ''Show Notes'', ''Distribution'']'
    ],
    -- 5: Research-to-PDF report
    ARRAY[
      'Research Brief to PDF Report',
      'Synthesises evidence for a research question, structures findings, drafts a report, validates it, and exports a PDF.',
      'ARRAY[''Research'', ''Structure'', ''Draft'', ''Validate'', ''Export'']'
    ],
    -- 6: Data analysis & insight report
    ARRAY[
      'Data Analysis & Insight Pipeline',
      'Ingests raw data, extracts statistical insights, writes an executive summary, and generates a shareable report.',
      'ARRAY[''Ingest'', ''Analyse'', ''Summarise'', ''Report'']'
    ],
    -- 7: SEO content optimisation
    ARRAY[
      'SEO Content Optimisation Flow',
      'Audits existing content, rewrites it for target keywords, validates readability and structure, and produces final copy.',
      'ARRAY[''Audit'', ''Rewrite'', ''Validate'', ''Publish'']'
    ],
    -- 8: Multilingual localisation
    ARRAY[
      'Multilingual Localisation Pipeline',
      'Translates source content into multiple locales, checks cultural fluency, and outputs a locale-keyed content pack.',
      'ARRAY[''Extract'', ''Translate'', ''Review'', ''Package'']'
    ],
    -- 9: Email campaign factory
    ARRAY[
      'Email Campaign Factory',
      'Generates subject lines, body copy, and CTA variants for a full drip campaign, then validates deliverability signals.',
      'ARRAY[''Strategy'', ''Copywriting'', ''A/B Variants'', ''QA'']'
    ],
    -- 10: Legal document drafter
    ARRAY[
      'Legal Document Drafting Flow',
      'Drafts contract clauses, reviews for compliance gaps, adds jurisdiction-specific language, and flags review items.',
      'ARRAY[''Draft'', ''Compliance Review'', ''Localise'', ''Flag'']'
    ],
    -- 11: Product launch content kit
    ARRAY[
      'Product Launch Content Kit',
      'Produces launch copy, social posts, press release, product descriptions, and a visual brief from a single product spec.',
      'ARRAY[''Brief'', ''Copy'', ''Social'', ''Press Release'', ''Visual Brief'']'
    ]
  ];

BEGIN
  -- ---------------------------------------------------------------------------
  -- Build lenser pool: 80% human / 20% AI
  -- ---------------------------------------------------------------------------
  SELECT array_agg(id) INTO all_lenser_ids
  FROM (
    SELECT id FROM (
      SELECT id FROM lensers.profiles
      WHERE handle LIKE 'lenser_%' AND status = 'active'::"lensers"."lenser_status"
      ORDER BY random() LIMIT 400
    ) h
    UNION ALL
    SELECT id FROM (
      SELECT id FROM lensers.profiles
      WHERE type = 'ai'::"lensers"."lenser_type" AND status = 'active'::"lensers"."lenser_status"
      ORDER BY random() LIMIT 100
    ) a
  ) combined;

  all_lenser_cnt := COALESCE(array_length(all_lenser_ids, 1), 0);

  IF all_lenser_cnt = 0 THEN
    RAISE NOTICE '32_scale_workflows: no lenser profiles found — skipping.';
    RETURN;
  END IF;

  -- Build lens pool for nodes
  SELECT array_agg(id) INTO lens_ids
  FROM (
    SELECT id FROM lenses.lenses
    WHERE status = 'published'::"content"."content_status"
    ORDER BY random() LIMIT 3000
  ) l;

  all_lens_count := COALESCE(array_length(lens_ids, 1), 0);

  IF all_lens_count = 0 THEN
    RAISE NOTICE '32_scale_workflows: no published lenses found — skipping nodes.';
  END IF;

  -- ---------------------------------------------------------------------------
  -- Main loop
  -- ---------------------------------------------------------------------------
  FOR i IN 1..total LOOP
    lenser_id_val := all_lenser_ids[ 1 + (floor(random() * all_lenser_cnt))::int ];
    variant_idx   := (i - 1) % 12;

    vis := CASE
      WHEN random() < 0.78 THEN 'public'
      WHEN random() < 0.92 THEN 'unlisted'
      ELSE 'private'
    END;

    ca := now() - (pow(random(), 1.5) * interval '365 days');

    -- -------------------------------------------------------------------------
    -- Insert workflow
    -- -------------------------------------------------------------------------
    wf_id := gen_random_uuid();
    INSERT INTO lenses.workflows (
      id, lenser_id, title, description, visibility, created_at, updated_at
    ) VALUES (
      wf_id,
      lenser_id_val,
      wf_titles[variant_idx + 1][1] || ' #' || i,
      wf_titles[variant_idx + 1][2],
      vis,
      ca,
      ca + interval '10 minutes'
    );

    -- -------------------------------------------------------------------------
    -- Nodes: 2–5, linear DAG
    -- -------------------------------------------------------------------------
    IF all_lens_count > 0 THEN
      node_count := 2 + (floor(random() * 4))::int;   -- 2..5
      node_ids   := ARRAY[]::uuid[];

      FOR node_idx IN 1..node_count LOOP
        lens_id_val := lens_ids[ 1 + (floor(random() * all_lens_count))::int ];

        SELECT v.id INTO version_id_val
        FROM lenses.versions v
        WHERE v.lens_id = lens_id_val
        ORDER BY v.version_number DESC
        LIMIT 1;

        node_label := CASE node_idx
          WHEN 1 THEN 'Input'
          WHEN 2 THEN 'Process'
          WHEN 3 THEN 'Transform'
          WHEN 4 THEN 'Validate'
          ELSE        'Output'
        END;

        curr_node_id := gen_random_uuid();
        INSERT INTO lenses.workflow_nodes (
          id, workflow_id, lens_id, version_id,
          position_x, position_y, label, ordinal, created_at
        ) VALUES (
          curr_node_id,
          wf_id,
          lens_id_val,
          version_id_val,
          (node_idx - 1) * 260.0,
          0.0,
          node_label,
          node_idx,
          ca + (node_idx * interval '1 minute')
        );

        node_ids := node_ids || curr_node_id;
      END LOOP;

      -- Wire nodes in a linear chain
      FOR node_idx IN 1..node_count - 1 LOOP
        INSERT INTO lenses.workflow_edges (
          id, workflow_id, source_node_id, target_node_id,
          source_output_key, target_param_label
        ) VALUES (
          gen_random_uuid(),
          wf_id,
          node_ids[node_idx],
          node_ids[node_idx + 1],
          'output',
          CASE ((node_idx - 1) % 6)
            WHEN 0 THEN 'context'
            WHEN 1 THEN 'content'
            WHEN 2 THEN 'data'
            WHEN 3 THEN 'draft'
            WHEN 4 THEN 'topic'
            ELSE        'requirements'
          END
        ) ON CONFLICT DO NOTHING;
      END LOOP;
    END IF;

    -- -------------------------------------------------------------------------
    -- Phases & Tasks — hierarchical authoring model
    -- -------------------------------------------------------------------------
    CASE variant_idx

      -- 0: Long-form article
      WHEN 0 THEN
        phase_id_1 := gen_random_uuid();
        INSERT INTO lenses.workflow_phases (id, workflow_id, title, description, ordinal, created_at, updated_at)
        VALUES (phase_id_1, wf_id, 'Research & Brief', 'Gather evidence and define scope.', 1, ca, ca);

        INSERT INTO lenses.workflow_tasks (id, phase_id, workflow_id, title, prompt_text, output_type, model_hint, ordinal, created_at, updated_at) VALUES
          (gen_random_uuid(), phase_id_1, wf_id, 'Define Research Question', 'Identify the core research question, target audience, desired length, and tone for the article. Output a structured brief in JSON.', 'text', NULL, 1, ca, ca),
          (gen_random_uuid(), phase_id_1, wf_id, 'Synthesise Evidence', 'Search for primary sources, statistics, and expert opinions that support the research question. Rank findings by relevance and credibility.', 'text', NULL, 2, ca, ca);

        phase_id_2 := gen_random_uuid();
        INSERT INTO lenses.workflow_phases (id, workflow_id, title, description, ordinal, created_at, updated_at)
        VALUES (phase_id_2, wf_id, 'Draft', 'Write the initial article draft.', 2, ca, ca);

        INSERT INTO lenses.workflow_tasks (id, phase_id, workflow_id, title, prompt_text, output_type, model_hint, ordinal, created_at, updated_at) VALUES
          (gen_random_uuid(), phase_id_2, wf_id, 'Write Full Draft', 'Using the research brief and evidence, write a complete article with H1 headline, structured subheadings, engaging intro, body, and conclusion. Cite sources inline.', 'text', NULL, 1, ca, ca);

        phase_id_3 := gen_random_uuid();
        INSERT INTO lenses.workflow_phases (id, workflow_id, title, description, ordinal, created_at, updated_at)
        VALUES (phase_id_3, wf_id, 'Refine & Export', 'Polish the draft and export.', 3, ca, ca);

        INSERT INTO lenses.workflow_tasks (id, phase_id, workflow_id, title, prompt_text, output_type, model_hint, ordinal, created_at, updated_at) VALUES
          (gen_random_uuid(), phase_id_3, wf_id, 'Editorial Polish', 'Improve clarity, tighten pacing, fix grammar, and ensure tone consistency. Return the refined draft only.', 'text', NULL, 1, ca, ca),
          (gen_random_uuid(), phase_id_3, wf_id, 'Export to PDF', 'Render the refined article into a PDF-ready manifest with sections, page-break hints, and a cover page.', 'file', NULL, 2, ca, ca);

      -- 1: Code generation & review
      WHEN 1 THEN
        phase_id_1 := gen_random_uuid();
        INSERT INTO lenses.workflow_phases (id, workflow_id, title, description, ordinal, created_at, updated_at)
        VALUES (phase_id_1, wf_id, 'Generate', 'Write the initial implementation.', 1, ca, ca);

        INSERT INTO lenses.workflow_tasks (id, phase_id, workflow_id, title, prompt_text, output_type, model_hint, ordinal, created_at, updated_at) VALUES
          (gen_random_uuid(), phase_id_1, wf_id, 'Write Implementation', 'Generate clean, production-ready code that fulfils the specification. Include error handling, type annotations, and a brief usage example.', 'text', NULL, 1, ca, ca);

        phase_id_2 := gen_random_uuid();
        INSERT INTO lenses.workflow_phases (id, workflow_id, title, description, ordinal, created_at, updated_at)
        VALUES (phase_id_2, wf_id, 'Review', 'Security and quality audit.', 2, ca, ca);

        INSERT INTO lenses.workflow_tasks (id, phase_id, workflow_id, title, prompt_text, output_type, model_hint, ordinal, created_at, updated_at) VALUES
          (gen_random_uuid(), phase_id_2, wf_id, 'Security Review', 'Audit the generated code for OWASP Top 10 vulnerabilities, injection risks, and insecure defaults. Return a severity-rated issue list.', 'text', NULL, 1, ca, ca),
          (gen_random_uuid(), phase_id_2, wf_id, 'Quality Review', 'Check for performance anti-patterns, dead code, naming clarity, and adherence to language conventions. Score 1–10 and list improvements.', 'text', NULL, 2, ca, ca);

        phase_id_3 := gen_random_uuid();
        INSERT INTO lenses.workflow_phases (id, workflow_id, title, description, ordinal, created_at, updated_at)
        VALUES (phase_id_3, wf_id, 'Fix & Document', 'Apply fixes and write docs.', 3, ca, ca);

        INSERT INTO lenses.workflow_tasks (id, phase_id, workflow_id, title, prompt_text, output_type, model_hint, ordinal, created_at, updated_at) VALUES
          (gen_random_uuid(), phase_id_3, wf_id, 'Apply Fixes', 'Rewrite the implementation incorporating all review findings. Highlight changed sections with inline comments.', 'text', NULL, 1, ca, ca),
          (gen_random_uuid(), phase_id_3, wf_id, 'Generate Documentation', 'Write API documentation, parameter descriptions, return value specs, and code examples for the final implementation.', 'text', NULL, 2, ca, ca);

      -- 2: Text-to-image campaign
      WHEN 2 THEN
        phase_id_1 := gen_random_uuid();
        INSERT INTO lenses.workflow_phases (id, workflow_id, title, description, ordinal, created_at, updated_at)
        VALUES (phase_id_1, wf_id, 'Creative Brief', 'Define visual direction.', 1, ca, ca);

        INSERT INTO lenses.workflow_tasks (id, phase_id, workflow_id, title, prompt_text, output_type, model_hint, ordinal, created_at, updated_at) VALUES
          (gen_random_uuid(), phase_id_1, wf_id, 'Analyse Brand Brief', 'Extract subject, style, mood, colour palette, and target platform from the creative brief. Emit a structured visual spec JSON.', 'text', NULL, 1, ca, ca);

        phase_id_2 := gen_random_uuid();
        INSERT INTO lenses.workflow_phases (id, workflow_id, title, description, ordinal, created_at, updated_at)
        VALUES (phase_id_2, wf_id, 'Prompt Engineering', 'Build optimised image prompts.', 2, ca, ca);

        INSERT INTO lenses.workflow_tasks (id, phase_id, workflow_id, title, prompt_text, output_type, model_hint, ordinal, created_at, updated_at) VALUES
          (gen_random_uuid(), phase_id_2, wf_id, 'Generate Image Prompts', 'From the visual spec, produce 5 distinct image generation prompts. Each prompt must specify: subject, art style, composition, lighting, colour palette, aspect ratio, and negative constraints.', 'text', NULL, 1, ca, ca);

        phase_id_3 := gen_random_uuid();
        INSERT INTO lenses.workflow_phases (id, workflow_id, title, description, ordinal, created_at, updated_at)
        VALUES (phase_id_3, wf_id, 'Render & Package', 'Generate and package visuals.', 3, ca, ca);

        INSERT INTO lenses.workflow_tasks (id, phase_id, workflow_id, title, prompt_text, output_type, model_hint, ordinal, created_at, updated_at) VALUES
          (gen_random_uuid(), phase_id_3, wf_id, 'Render Still Images', 'Send each optimised prompt to the image generation model. Return the rendered images as a gallery.', 'image', NULL, 1, ca, ca),
          (gen_random_uuid(), phase_id_3, wf_id, 'Package Visual Kit', 'Compile rendered images, prompts used, and visual spec into a downloadable asset package with naming conventions.', 'file', NULL, 2, ca, ca);

      -- 3: Short-form video
      WHEN 3 THEN
        phase_id_1 := gen_random_uuid();
        INSERT INTO lenses.workflow_phases (id, workflow_id, title, description, ordinal, created_at, updated_at)
        VALUES (phase_id_1, wf_id, 'Script', 'Write the video script.', 1, ca, ca);

        INSERT INTO lenses.workflow_tasks (id, phase_id, workflow_id, title, prompt_text, output_type, model_hint, ordinal, created_at, updated_at) VALUES
          (gen_random_uuid(), phase_id_1, wf_id, 'Write Hook & Script', 'Write a hook-driven script for a 60-second social video. Include: 3-second hook, scene breakdown with shot types, narration, on-screen text callouts, and a CTA.', 'text', NULL, 1, ca, ca);

        phase_id_2 := gen_random_uuid();
        INSERT INTO lenses.workflow_phases (id, workflow_id, title, description, ordinal, created_at, updated_at)
        VALUES (phase_id_2, wf_id, 'Scene Plan', 'Convert script into production instructions.', 2, ca, ca);

        INSERT INTO lenses.workflow_tasks (id, phase_id, workflow_id, title, prompt_text, output_type, model_hint, ordinal, created_at, updated_at) VALUES
          (gen_random_uuid(), phase_id_2, wf_id, 'Build Scene Plan', 'Convert the script into a shot-by-shot scene plan. Each scene must declare: duration, shot description, visual style, audio/narration, transitions, and export format.', 'text', NULL, 1, ca, ca);

        phase_id_3 := gen_random_uuid();
        INSERT INTO lenses.workflow_phases (id, workflow_id, title, description, ordinal, created_at, updated_at)
        VALUES (phase_id_3, wf_id, 'Render & QA', 'Render video and validate output.', 3, ca, ca);

        INSERT INTO lenses.workflow_tasks (id, phase_id, workflow_id, title, prompt_text, output_type, model_hint, ordinal, created_at, updated_at) VALUES
          (gen_random_uuid(), phase_id_3, wf_id, 'Render Video', 'Render the video from the scene plan. Preserve continuity between shots and honour the declared duration budget.', 'video', NULL, 1, ca, ca),
          (gen_random_uuid(), phase_id_3, wf_id, 'QA & Pacing Check', 'Review the rendered video for pacing, CTA clarity, caption accuracy, and platform-specific requirements. Return a pass/fail report.', 'text', NULL, 2, ca, ca);

      -- 4: Podcast episode
      WHEN 4 THEN
        phase_id_1 := gen_random_uuid();
        INSERT INTO lenses.workflow_phases (id, workflow_id, title, description, ordinal, created_at, updated_at)
        VALUES (phase_id_1, wf_id, 'Episode Outline', 'Plan the episode structure.', 1, ca, ca);

        INSERT INTO lenses.workflow_tasks (id, phase_id, workflow_id, title, prompt_text, output_type, model_hint, ordinal, created_at, updated_at) VALUES
          (gen_random_uuid(), phase_id_1, wf_id, 'Plan Episode Beats', 'Create a beat-by-beat episode outline: hook, context, 3 talking points, expert insights, listener engagement, and outro.', 'text', NULL, 1, ca, ca);

        phase_id_2 := gen_random_uuid();
        INSERT INTO lenses.workflow_phases (id, workflow_id, title, description, ordinal, created_at, updated_at)
        VALUES (phase_id_2, wf_id, 'Script & Audio', 'Write dialogue and produce audio.', 2, ca, ca);

        INSERT INTO lenses.workflow_tasks (id, phase_id, workflow_id, title, prompt_text, output_type, model_hint, ordinal, created_at, updated_at) VALUES
          (gen_random_uuid(), phase_id_2, wf_id, 'Write Host Dialogue', 'Write the full host dialogue with natural transitions, pauses, listener engagement prompts, and sponsor reads if applicable.', 'text', NULL, 1, ca, ca),
          (gen_random_uuid(), phase_id_2, wf_id, 'Generate Audio', 'Render the script into audio using a text-to-speech model. Output an audio file ready for post-production.', 'audio', NULL, 2, ca, ca);

        phase_id_3 := gen_random_uuid();
        INSERT INTO lenses.workflow_phases (id, workflow_id, title, description, ordinal, created_at, updated_at)
        VALUES (phase_id_3, wf_id, 'Distribution Assets', 'Prepare show notes and metadata.', 3, ca, ca);

        INSERT INTO lenses.workflow_tasks (id, phase_id, workflow_id, title, prompt_text, output_type, model_hint, ordinal, created_at, updated_at) VALUES
          (gen_random_uuid(), phase_id_3, wf_id, 'Write Show Notes', 'Write SEO-optimised show notes with episode summary, timestamps, key quotes, guest bios, and resource links.', 'text', NULL, 1, ca, ca);

      -- 5: Research-to-PDF
      WHEN 5 THEN
        phase_id_1 := gen_random_uuid();
        INSERT INTO lenses.workflow_phases (id, workflow_id, title, description, ordinal, created_at, updated_at)
        VALUES (phase_id_1, wf_id, 'Research', 'Gather and synthesise evidence.', 1, ca, ca);

        INSERT INTO lenses.workflow_tasks (id, phase_id, workflow_id, title, prompt_text, output_type, model_hint, ordinal, created_at, updated_at) VALUES
          (gen_random_uuid(), phase_id_1, wf_id, 'Gather Evidence', 'Identify, rank, and summarise primary sources, statistics, and expert opinions relevant to the research question. Emit JSON: {findings[], summary, open_questions[]}.', 'text', NULL, 1, ca, ca);

        phase_id_2 := gen_random_uuid();
        INSERT INTO lenses.workflow_phases (id, workflow_id, title, description, ordinal, created_at, updated_at)
        VALUES (phase_id_2, wf_id, 'Draft Report', 'Structure and write the report.', 2, ca, ca);

        INSERT INTO lenses.workflow_tasks (id, phase_id, workflow_id, title, prompt_text, output_type, model_hint, ordinal, created_at, updated_at) VALUES
          (gen_random_uuid(), phase_id_2, wf_id, 'Draft Executive Summary', 'Write a 200-word executive summary covering: objective, key findings, and top 3 recommendations.', 'text', NULL, 1, ca, ca),
          (gen_random_uuid(), phase_id_2, wf_id, 'Write Full Report Body', 'Expand the research findings into a structured report: methodology, findings with evidence, analysis, and recommendations.', 'text', NULL, 2, ca, ca);

        phase_id_3 := gen_random_uuid();
        INSERT INTO lenses.workflow_phases (id, workflow_id, title, description, ordinal, created_at, updated_at)
        VALUES (phase_id_3, wf_id, 'Validate & Export', 'Review quality and export.', 3, ca, ca);

        INSERT INTO lenses.workflow_tasks (id, phase_id, workflow_id, title, prompt_text, output_type, model_hint, ordinal, created_at, updated_at) VALUES
          (gen_random_uuid(), phase_id_3, wf_id, 'Validate Report', 'Score the report against: accuracy, completeness, clarity, and citation quality. Emit: {passed, score, issues[], recommendations[]}.', 'text', NULL, 1, ca, ca),
          (gen_random_uuid(), phase_id_3, wf_id, 'Export PDF', 'Render the validated report into a PDF manifest with sections, citations, cover page, and page-break hints.', 'file', NULL, 2, ca, ca);

      -- 6: Data analysis
      WHEN 6 THEN
        phase_id_1 := gen_random_uuid();
        INSERT INTO lenses.workflow_phases (id, workflow_id, title, description, ordinal, created_at, updated_at)
        VALUES (phase_id_1, wf_id, 'Ingest & Profile', 'Load and profile the dataset.', 1, ca, ca);

        INSERT INTO lenses.workflow_tasks (id, phase_id, workflow_id, title, prompt_text, output_type, model_hint, ordinal, created_at, updated_at) VALUES
          (gen_random_uuid(), phase_id_1, wf_id, 'Profile Dataset', 'Analyse the dataset schema, row count, null rates, value distributions, and data quality issues. Return a JSON profile object.', 'text', NULL, 1, ca, ca);

        phase_id_2 := gen_random_uuid();
        INSERT INTO lenses.workflow_phases (id, workflow_id, title, description, ordinal, created_at, updated_at)
        VALUES (phase_id_2, wf_id, 'Analyse', 'Extract insights and detect anomalies.', 2, ca, ca);

        INSERT INTO lenses.workflow_tasks (id, phase_id, workflow_id, title, prompt_text, output_type, model_hint, ordinal, created_at, updated_at) VALUES
          (gen_random_uuid(), phase_id_2, wf_id, 'Trend & Correlation Analysis', 'Identify trends, seasonality, correlations, and leading indicators in the dataset. Rank by business impact.', 'text', NULL, 1, ca, ca),
          (gen_random_uuid(), phase_id_2, wf_id, 'Anomaly Detection', 'Flag statistical outliers and data quality anomalies. For each anomaly: describe it, assess severity, and recommend whether to exclude or investigate.', 'text', NULL, 2, ca, ca);

        phase_id_3 := gen_random_uuid();
        INSERT INTO lenses.workflow_phases (id, workflow_id, title, description, ordinal, created_at, updated_at)
        VALUES (phase_id_3, wf_id, 'Report', 'Write and deliver the insight report.', 3, ca, ca);

        INSERT INTO lenses.workflow_tasks (id, phase_id, workflow_id, title, prompt_text, output_type, model_hint, ordinal, created_at, updated_at) VALUES
          (gen_random_uuid(), phase_id_3, wf_id, 'Write Insight Report', 'Produce an executive-ready report: key metrics dashboard, trend narrative, anomaly summary, and top 5 actionable recommendations.', 'text', NULL, 1, ca, ca);

      -- 7: SEO content optimisation
      WHEN 7 THEN
        phase_id_1 := gen_random_uuid();
        INSERT INTO lenses.workflow_phases (id, workflow_id, title, description, ordinal, created_at, updated_at)
        VALUES (phase_id_1, wf_id, 'Audit', 'Assess the existing content.', 1, ca, ca);

        INSERT INTO lenses.workflow_tasks (id, phase_id, workflow_id, title, prompt_text, output_type, model_hint, ordinal, created_at, updated_at) VALUES
          (gen_random_uuid(), phase_id_1, wf_id, 'Content SEO Audit', 'Audit the content for: keyword density, semantic coverage, title/meta quality, heading structure, internal link opportunities, and readability score. Emit a prioritised issue list.', 'text', NULL, 1, ca, ca);

        phase_id_2 := gen_random_uuid();
        INSERT INTO lenses.workflow_phases (id, workflow_id, title, description, ordinal, created_at, updated_at)
        VALUES (phase_id_2, wf_id, 'Rewrite', 'Optimise the content copy.', 2, ca, ca);

        INSERT INTO lenses.workflow_tasks (id, phase_id, workflow_id, title, prompt_text, output_type, model_hint, ordinal, created_at, updated_at) VALUES
          (gen_random_uuid(), phase_id_2, wf_id, 'Keyword-Optimised Rewrite', 'Rewrite the content to naturally integrate the primary keyword and secondary keywords. Maintain the original intent and a Flesch reading ease above 60.', 'text', NULL, 1, ca, ca),
          (gen_random_uuid(), phase_id_2, wf_id, 'Optimise Meta Tags', 'Write an SEO title tag (≤60 chars) and meta description (≤155 chars) that include the primary keyword and drive click-through.', 'text', NULL, 2, ca, ca);

        phase_id_3 := gen_random_uuid();
        INSERT INTO lenses.workflow_phases (id, workflow_id, title, description, ordinal, created_at, updated_at)
        VALUES (phase_id_3, wf_id, 'Validate', 'Confirm quality and readiness.', 3, ca, ca);

        INSERT INTO lenses.workflow_tasks (id, phase_id, workflow_id, title, prompt_text, output_type, model_hint, ordinal, created_at, updated_at) VALUES
          (gen_random_uuid(), phase_id_3, wf_id, 'Final Quality Check', 'Validate the rewritten content: keyword prominence, heading hierarchy, internal links, readability, and E-E-A-T signals. Return {passed, score, notes[]}.', 'text', NULL, 1, ca, ca);

      -- 8: Multilingual localisation
      WHEN 8 THEN
        phase_id_1 := gen_random_uuid();
        INSERT INTO lenses.workflow_phases (id, workflow_id, title, description, ordinal, created_at, updated_at)
        VALUES (phase_id_1, wf_id, 'Extract', 'Prepare source strings.', 1, ca, ca);

        INSERT INTO lenses.workflow_tasks (id, phase_id, workflow_id, title, prompt_text, output_type, model_hint, ordinal, created_at, updated_at) VALUES
          (gen_random_uuid(), phase_id_1, wf_id, 'Extract Translatable Strings', 'Parse the source content and extract all user-facing strings. Annotate each string with: context, tone, max-length constraint, and whether it contains placeholders.', 'text', NULL, 1, ca, ca);

        phase_id_2 := gen_random_uuid();
        INSERT INTO lenses.workflow_phases (id, workflow_id, title, description, ordinal, created_at, updated_at)
        VALUES (phase_id_2, wf_id, 'Translate', 'Localise strings for each target locale.', 2, ca, ca);

        INSERT INTO lenses.workflow_tasks (id, phase_id, workflow_id, title, prompt_text, output_type, model_hint, ordinal, created_at, updated_at) VALUES
          (gen_random_uuid(), phase_id_2, wf_id, 'Translate Strings', 'Translate all extracted strings into the target locale. Preserve placeholders, respect max-length constraints, and adapt idioms for cultural fit.', 'text', NULL, 1, ca, ca),
          (gen_random_uuid(), phase_id_2, wf_id, 'Fluency & Tone Review', 'Review translated strings for fluency, grammatical correctness, and tone consistency. Flag strings that require human review and suggest alternatives.', 'text', NULL, 2, ca, ca);

        phase_id_3 := gen_random_uuid();
        INSERT INTO lenses.workflow_phases (id, workflow_id, title, description, ordinal, created_at, updated_at)
        VALUES (phase_id_3, wf_id, 'Package', 'Deliver locale-keyed output.', 3, ca, ca);

        INSERT INTO lenses.workflow_tasks (id, phase_id, workflow_id, title, prompt_text, output_type, model_hint, ordinal, created_at, updated_at) VALUES
          (gen_random_uuid(), phase_id_3, wf_id, 'Package Locale Files', 'Compile reviewed translations into a locale-keyed JSON file ready for import into the i18n system. Include a change log of flagged items.', 'file', NULL, 1, ca, ca);

      -- 9: Email campaign factory
      WHEN 9 THEN
        phase_id_1 := gen_random_uuid();
        INSERT INTO lenses.workflow_phases (id, workflow_id, title, description, ordinal, created_at, updated_at)
        VALUES (phase_id_1, wf_id, 'Strategy', 'Define campaign goals and audience.', 1, ca, ca);

        INSERT INTO lenses.workflow_tasks (id, phase_id, workflow_id, title, prompt_text, output_type, model_hint, ordinal, created_at, updated_at) VALUES
          (gen_random_uuid(), phase_id_1, wf_id, 'Campaign Strategy Brief', 'Define: campaign goal, audience segment, pain points, value proposition, email sequence type (drip/broadcast), and success metrics.', 'text', NULL, 1, ca, ca);

        phase_id_2 := gen_random_uuid();
        INSERT INTO lenses.workflow_phases (id, workflow_id, title, description, ordinal, created_at, updated_at)
        VALUES (phase_id_2, wf_id, 'Copywriting', 'Write email copy and variants.', 2, ca, ca);

        INSERT INTO lenses.workflow_tasks (id, phase_id, workflow_id, title, prompt_text, output_type, model_hint, ordinal, created_at, updated_at) VALUES
          (gen_random_uuid(), phase_id_2, wf_id, 'Write Email Sequence', 'Write a 4-email drip sequence. Each email must include: subject line, preheader, personalised greeting, body (value prop + story + social proof), and CTA button text.', 'text', NULL, 1, ca, ca),
          (gen_random_uuid(), phase_id_2, wf_id, 'Generate A/B Variants', 'For each email, produce 2 subject line variants and 2 CTA variants optimised for different psychological triggers (urgency vs. curiosity).', 'text', NULL, 2, ca, ca);

        phase_id_3 := gen_random_uuid();
        INSERT INTO lenses.workflow_phases (id, workflow_id, title, description, ordinal, created_at, updated_at)
        VALUES (phase_id_3, wf_id, 'QA', 'Validate deliverability and compliance.', 3, ca, ca);

        INSERT INTO lenses.workflow_tasks (id, phase_id, workflow_id, title, prompt_text, output_type, model_hint, ordinal, created_at, updated_at) VALUES
          (gen_random_uuid(), phase_id_3, wf_id, 'Deliverability & Compliance Check', 'Review each email for: spam trigger words, CAN-SPAM/GDPR compliance (unsubscribe, sender identity), link count, image-to-text ratio, and mobile preview length. Return a pass/fail report.', 'text', NULL, 1, ca, ca);

      -- 10: Legal document drafter
      WHEN 10 THEN
        phase_id_1 := gen_random_uuid();
        INSERT INTO lenses.workflow_phases (id, workflow_id, title, description, ordinal, created_at, updated_at)
        VALUES (phase_id_1, wf_id, 'Draft', 'Write the initial document.', 1, ca, ca);

        INSERT INTO lenses.workflow_tasks (id, phase_id, workflow_id, title, prompt_text, output_type, model_hint, ordinal, created_at, updated_at) VALUES
          (gen_random_uuid(), phase_id_1, wf_id, 'Draft Contract Clauses', 'Draft the specified contract clauses using precise legal language. For each clause: state the obligation, define key terms, specify remedies for breach, and note any carve-outs.', 'text', NULL, 1, ca, ca);

        phase_id_2 := gen_random_uuid();
        INSERT INTO lenses.workflow_phases (id, workflow_id, title, description, ordinal, created_at, updated_at)
        VALUES (phase_id_2, wf_id, 'Review', 'Compliance and jurisdiction review.', 2, ca, ca);

        INSERT INTO lenses.workflow_tasks (id, phase_id, workflow_id, title, prompt_text, output_type, model_hint, ordinal, created_at, updated_at) VALUES
          (gen_random_uuid(), phase_id_2, wf_id, 'Compliance Gap Analysis', 'Identify clauses that may conflict with applicable law, regulatory requirements, or standard market practice. Flag gaps and suggest compliant alternatives.', 'text', NULL, 1, ca, ca),
          (gen_random_uuid(), phase_id_2, wf_id, 'Jurisdiction Localisation', 'Adapt flagged clauses to the governing jurisdiction. Note any terms that require mandatory local language under applicable law.', 'text', NULL, 2, ca, ca);

        phase_id_3 := gen_random_uuid();
        INSERT INTO lenses.workflow_phases (id, workflow_id, title, description, ordinal, created_at, updated_at)
        VALUES (phase_id_3, wf_id, 'Final Review', 'Flag items for attorney review.', 3, ca, ca);

        INSERT INTO lenses.workflow_tasks (id, phase_id, workflow_id, title, prompt_text, output_type, model_hint, ordinal, created_at, updated_at) VALUES
          (gen_random_uuid(), phase_id_3, wf_id, 'Attorney Review Flag', 'Produce a final checklist of clauses and provisions that must be reviewed by a qualified attorney before execution. Explain the risk for each flagged item.', 'text', NULL, 1, ca, ca);

      -- 11: Product launch content kit
      ELSE
        phase_id_1 := gen_random_uuid();
        INSERT INTO lenses.workflow_phases (id, workflow_id, title, description, ordinal, created_at, updated_at)
        VALUES (phase_id_1, wf_id, 'Brief', 'Analyse product spec and define messaging.', 1, ca, ca);

        INSERT INTO lenses.workflow_tasks (id, phase_id, workflow_id, title, prompt_text, output_type, model_hint, ordinal, created_at, updated_at) VALUES
          (gen_random_uuid(), phase_id_1, wf_id, 'Messaging Framework', 'Analyse the product spec and define: value proposition, primary differentiators, buyer personas, key messages, and positioning statement.', 'text', NULL, 1, ca, ca);

        phase_id_2 := gen_random_uuid();
        INSERT INTO lenses.workflow_phases (id, workflow_id, title, description, ordinal, created_at, updated_at)
        VALUES (phase_id_2, wf_id, 'Content Production', 'Write all launch assets.', 2, ca, ca);

        INSERT INTO lenses.workflow_tasks (id, phase_id, workflow_id, title, prompt_text, output_type, model_hint, ordinal, created_at, updated_at) VALUES
          (gen_random_uuid(), phase_id_2, wf_id, 'Write Launch Copy', 'Write: hero headline, sub-headline, 3 feature sections, social proof block, and primary CTA.', 'text', NULL, 1, ca, ca),
          (gen_random_uuid(), phase_id_2, wf_id, 'Social Media Posts', 'Create a 7-day social media post calendar with platform-specific copy (LinkedIn, X, Instagram) and hashtag sets.', 'text', NULL, 2, ca, ca),
          (gen_random_uuid(), phase_id_2, wf_id, 'Press Release', 'Draft a structured press release: headline, dateline, lead paragraph, body (3 paragraphs), executive quote, and boilerplate.', 'text', NULL, 3, ca, ca);

        phase_id_3 := gen_random_uuid();
        INSERT INTO lenses.workflow_phases (id, workflow_id, title, description, ordinal, created_at, updated_at)
        VALUES (phase_id_3, wf_id, 'Visual Brief', 'Define imagery and design direction.', 3, ca, ca);

        INSERT INTO lenses.workflow_tasks (id, phase_id, workflow_id, title, prompt_text, output_type, model_hint, ordinal, created_at, updated_at) VALUES
          (gen_random_uuid(), phase_id_3, wf_id, 'Visual Direction Brief', 'Write a visual brief for the design team: brand mood, colour palette, typography direction, hero image concept, and icon style.', 'text', NULL, 1, ca, ca),
          (gen_random_uuid(), phase_id_3, wf_id, 'Generate Hero Image', 'Render a hero image from the visual brief using an image generation model. Aspect ratio: 16:9. Style: photorealistic product marketing.', 'image', NULL, 2, ca, ca);

    END CASE;

  END LOOP;

  RAISE NOTICE '32_scale_workflows: inserted % workflows with nodes, edges, phases, and tasks.', total;
END $$;

ANALYZE lenses.workflows;
ANALYZE lenses.workflow_nodes;
ANALYZE lenses.workflow_edges;
ANALYZE lenses.workflow_phases;
ANALYZE lenses.workflow_tasks;
