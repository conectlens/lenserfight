-- =============================================================================
-- 16. SCALE TAG MAP (~3M tag associations)
-- Each thread/prompt gets 1-5 tags with power-law tag popularity.
-- =============================================================================

-- Pre-index tags for fast lookup
DROP TABLE IF EXISTS seed_tag_index;
CREATE UNLOGGED TABLE seed_tag_index AS
SELECT id AS tag_id, row_number() OVER (ORDER BY id) - 1 AS tidx
FROM content.tags
WHERE slug LIKE 'tag-%';

CREATE INDEX ON seed_tag_index (tidx);

-- Tag assignments for threads (~1.5M mappings, avg 1.5 tags per thread)
DO $$
DECLARE
  batch_start int;
  batch_size  int := 100000;
  total_threads int;
  tag_cnt int;
BEGIN
  SELECT count(*) INTO total_threads FROM content.threads;
  SELECT count(*) INTO tag_cnt FROM seed_tag_index;

  RAISE NOTICE 'Tagging % threads with % available tags...', total_threads, tag_cnt;

  -- Process threads in batches
  FOR batch_start IN 0..total_threads-1 BY batch_size LOOP
    RAISE NOTICE 'tag_map threads batch starting at %...', batch_start;

    INSERT INTO content.tag_map (id, entity_type, entity_id, tag_id, language_detected, created_at)
    SELECT DISTINCT ON (t.id, ti.tag_id)
      gen_random_uuid(),
      'thread'::"content"."entity_type_enum",
      t.id,
      ti.tag_id,
      NULL,
      t.created_at
    FROM (
      SELECT id, created_at, row_number() OVER (ORDER BY id) - 1 AS rn
      FROM content.threads
      ORDER BY id
      OFFSET batch_start LIMIT batch_size
    ) t
    CROSS JOIN LATERAL (
      -- 1-3 tags per thread, power-law tag selection
      SELECT (floor(tag_cnt * pow(random(), 2))::int) AS tidx
      FROM generate_series(1, 1 + (random() * 2)::int)
    ) tag_picks
    JOIN seed_tag_index ti ON ti.tidx = tag_picks.tidx
    ON CONFLICT DO NOTHING;
  END LOOP;
END $$;

-- Tag assignments for prompts (~1.5M mappings)
DO $$
DECLARE
  batch_start int;
  batch_size  int := 100000;
  total_prompts int;
  tag_cnt int;
BEGIN
  SELECT count(*) INTO total_prompts FROM content.prompt_templates;
  SELECT count(*) INTO tag_cnt FROM seed_tag_index;

  FOR batch_start IN 0..total_prompts-1 BY batch_size LOOP
    RAISE NOTICE 'tag_map prompts batch starting at %...', batch_start;

    INSERT INTO content.tag_map (id, entity_type, entity_id, tag_id, language_detected, created_at)
    SELECT DISTINCT ON (pt.id, ti.tag_id)
      gen_random_uuid(),
      'prompt_template'::"content"."entity_type_enum",
      pt.id,
      ti.tag_id,
      NULL,
      pt.created_at
    FROM (
      SELECT id, created_at, row_number() OVER (ORDER BY id) - 1 AS rn
      FROM content.prompt_templates
      ORDER BY id
      OFFSET batch_start LIMIT batch_size
    ) pt
    CROSS JOIN LATERAL (
      SELECT (floor(tag_cnt * pow(random(), 2))::int) AS tidx
      FROM generate_series(1, 1 + (random() * 2)::int)
    ) tag_picks
    JOIN seed_tag_index ti ON ti.tidx = tag_picks.tidx
    ON CONFLICT DO NOTHING;
  END LOOP;
END $$;
