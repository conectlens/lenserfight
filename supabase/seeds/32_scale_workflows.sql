-- =============================================================================
-- 22. SCALE WORKFLOWS (1000 workflows by seeded Lensers + AI Lensers)
-- =============================================================================
-- Inserts 1000 lenses.workflows, their workflow_nodes (2-4 nodes each),
-- and workflow_edges connecting those nodes in a linear chain.
-- Authors are drawn from seeded human lensers (handle LIKE 'lenser_%') and
-- AI lenser profiles (type = 'ai'), weighted ~80% human / ~20% AI.
-- =============================================================================

DO $$
DECLARE
  total           int := 1000;
  i               int;
  wf_id           uuid;
  lenser_id_val   uuid;
  node_count      int;
  node_ids        uuid[];
  lens_ids        uuid[];
  all_lens_count  int;
  all_lenser_ids  uuid[];
  all_lenser_cnt  int;
  node_idx        int;
  prev_node_id    uuid;
  curr_node_id    uuid;
  lens_id_val     uuid;
  version_id_val  uuid;
  vis             text;
  ca              timestamptz;

  -- Workflow title templates (10 variants)
  titles text[] := ARRAY[
    'Creative Writing Pipeline',
    'Code Review & Refactor Flow',
    'Data Analysis Chain',
    'Email Drafting Workflow',
    'Technical Doc Generator',
    'Brainstorm → Outline → Draft',
    'Translation & Localization Flow',
    'Research Summarizer Pipeline',
    'Bug Triage Assistant',
    'Content Strategy Planner'
  ];

  -- Description templates matching titles
  descs text[] := ARRAY[
    'A multi-step workflow that generates stories, refines tone, and produces final copy.',
    'Reviews code, identifies issues, suggests fixes, and produces a clean diff summary.',
    'Ingests raw data, extracts insights, and formats a shareable report.',
    'Drafts context-aware emails, adapts tone, and outputs ready-to-send copy.',
    'Generates structured API docs, adds examples, and formats for publication.',
    'Turns a seed idea into a full outline, then expands it into a polished draft.',
    'Translates content, checks fluency, and produces multilingual output.',
    'Fetches sources, summarizes key points, and ranks them by relevance.',
    'Triages a bug report, proposes root causes, and drafts a fix plan.',
    'Analyzes a topic, identifies audience segments, and maps a content calendar.'
  ];
BEGIN
  -- -------------------------------------------------------------------------
  -- Build a flat array of candidate lenser IDs:
  --   ~80% from seeded human profiles, ~20% from AI profiles
  -- -------------------------------------------------------------------------
  SELECT array_agg(id) INTO all_lenser_ids
  FROM (
    SELECT id FROM (
      SELECT id FROM lensers.profiles
      WHERE handle LIKE 'lenser_%' AND status = 'active'::"lensers"."lenser_status"
      ORDER BY random()
      LIMIT 800
    ) h
    UNION ALL
    SELECT id FROM (
      SELECT id FROM lensers.profiles
      WHERE type = 'ai'::"lensers"."lenser_type" AND status = 'active'::"lensers"."lenser_status"
      ORDER BY random()
      LIMIT 200
    ) a
  ) combined;

  all_lenser_cnt := array_length(all_lenser_ids, 1);

  -- Build a flat array of available lens IDs to distribute across nodes
  SELECT array_agg(id) INTO lens_ids
  FROM (
    SELECT id FROM lenses.lenses
    WHERE status = 'published'::"content"."content_status"
    ORDER BY random()
    LIMIT 4000
  ) l;

  all_lens_count := array_length(lens_ids, 1);

  FOR i IN 1..total LOOP
    -- Pick a random lenser
    lenser_id_val := all_lenser_ids[ 1 + (floor(random() * all_lenser_cnt))::int ];

    -- Pick visibility: 80% public, 12% unlisted, 8% private
    vis := CASE
      WHEN random() < 0.80 THEN 'public'
      WHEN random() < 0.92 THEN 'unlisted'
      ELSE 'private'
    END;

    -- Spread created_at over the past year, power-law skewed toward recent
    ca := now() - (pow(random(), 1.5) * interval '365 days');

    -- Insert workflow
    wf_id := gen_random_uuid();
    INSERT INTO lenses.workflows (
      id, lenser_id, title, description, visibility, created_at, updated_at
    ) VALUES (
      wf_id,
      lenser_id_val,
      titles[ 1 + ((i - 1) % 10) ] || ' #' || i,
      descs[  1 + ((i - 1) % 10) ],
      vis,
      ca,
      ca + interval '5 minutes'
    );

    -- Each workflow gets 2–4 nodes
    node_count := 2 + (floor(random() * 3))::int;  -- 2, 3, or 4
    node_ids   := ARRAY[]::uuid[];

    FOR node_idx IN 1..node_count LOOP
      -- Pick a lens for this node (cycle through the available pool)
      lens_id_val := lens_ids[ 1 + (floor(random() * all_lens_count))::int ];

      -- Try to find the latest version for this lens
      SELECT v.id INTO version_id_val
      FROM lenses.versions v
      WHERE v.lens_id = lens_id_val
      ORDER BY v.version_number DESC
      LIMIT 1;

      curr_node_id := gen_random_uuid();

      INSERT INTO lenses.workflow_nodes (
        id, workflow_id, lens_id, version_id,
        position_x, position_y, label, ordinal, created_at
      ) VALUES (
        curr_node_id,
        wf_id,
        lens_id_val,
        version_id_val,
        (node_idx - 1) * 280.0,   -- horizontal layout, 280px per step
        0.0,
        'Step ' || node_idx,
        node_idx,
        ca + (node_idx * interval '1 minute')
      );

      node_ids := node_ids || curr_node_id;
    END LOOP;

    -- Wire nodes in a linear chain: node[k] → node[k+1]
    FOR node_idx IN 1..node_count - 1 LOOP
      prev_node_id := node_ids[node_idx];
      curr_node_id := node_ids[node_idx + 1];

      INSERT INTO lenses.workflow_edges (
        id, workflow_id, source_node_id, target_node_id,
        source_output_key, target_param_label
      ) VALUES (
        gen_random_uuid(),
        wf_id,
        prev_node_id,
        curr_node_id,
        'output',
        CASE ((node_idx - 1) % 4)
          WHEN 0 THEN 'context'
          WHEN 1 THEN 'data'
          WHEN 2 THEN 'code'
          ELSE 'topic'
        END
      )
      ON CONFLICT DO NOTHING;
    END LOOP;

  END LOOP;

  RAISE NOTICE 'Inserted % workflows with nodes and edges.', total;
END $$;

-- ---------------------------------------------------------------------------
-- ---------------------------------------------------------------------------
SELECT
  p.id,
  COALESCE(tc.cnt, 0),
  COALESCE(pc.cnt, 0),
  COALESCE(frc.cnt, 0),
  COALESCE(fgc.cnt, 0),
  now()
FROM lensers.profiles p
JOIN (
  SELECT DISTINCT lenser_id FROM lenses.workflows
) wf ON wf.lenser_id = p.id
LEFT JOIN (
  SELECT lenser_id, count(*)::int AS cnt FROM content.threads GROUP BY lenser_id
) tc ON tc.lenser_id = p.id
LEFT JOIN (
  SELECT lenser_id, count(*)::int AS cnt FROM lenses.lenses GROUP BY lenser_id
) pc ON pc.lenser_id = p.id
LEFT JOIN (
  SELECT target_profile_id AS lenser_id, count(*)::int AS cnt FROM lensers.relationships WHERE status = 'accepted' GROUP BY target_profile_id
) frc ON frc.lenser_id = p.id
LEFT JOIN (
  SELECT source_profile_id AS lenser_id, count(*)::int AS cnt FROM lensers.relationships WHERE status = 'accepted' GROUP BY source_profile_id
) fgc ON fgc.lenser_id = p.id
ON CONFLICT (lenser_id) DO UPDATE SET
  thread_count   = EXCLUDED.thread_count,
  lens_count     = EXCLUDED.lens_count,
  follower_count = EXCLUDED.follower_count,
  following_count = EXCLUDED.following_count,
  updated_at     = now();

ANALYZE lenses.workflows;
ANALYZE lenses.workflow_nodes;
ANALYZE lenses.workflow_edges;
