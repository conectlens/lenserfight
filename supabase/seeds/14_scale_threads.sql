-- =============================================================================
-- 14. SCALE THREADS (1M threads + translations)
-- Power-law author distribution: top 10% of lensers create ~60% of content.
-- =============================================================================

-- Step 1: Pre-materialize author assignments with power-law distribution
CREATE TEMP TABLE IF NOT EXISTS seed_profile_index AS
SELECT id, preferred_language,
  row_number() OVER (ORDER BY id) - 1 AS idx
FROM lensers.profiles
WHERE handle LIKE 'lenser_%'
ORDER BY id;

CREATE INDEX ON seed_profile_index (idx);

-- Step 2: Insert threads in batches of 50K
DO $$
DECLARE
  batch_start int;
  batch_size  int := 50000;
  total       int := 1000000;
  profile_cnt int;
BEGIN
  SELECT count(*) INTO profile_cnt FROM seed_profile_index;
  IF profile_cnt = 0 THEN
    RAISE EXCEPTION 'No seed profiles found. Run 12_scale_profiles.sql first.';
  END IF;

  FOR batch_start IN 0..total-1 BY batch_size LOOP
    RAISE NOTICE 'content.threads batch %/% ...', batch_start / batch_size + 1, total / batch_size;

    INSERT INTO content.threads (
      id, lenser_id, visibility, status,
      view_count, reply_count, created_at, updated_at
    )
    SELECT
      gen_random_uuid(),
      p.id,
      CASE
        WHEN rnd_vis < 0.85 THEN 'public'
        WHEN rnd_vis < 0.95 THEN 'community'
        ELSE 'private'
      END::"content"."visibility_enum",
      CASE
        WHEN rnd_stat < 0.90 THEN 'published'
        WHEN rnd_stat < 0.95 THEN 'draft'
        ELSE 'archived'
      END::"content"."content_status",
      (random() * 10000)::int,
      0,  -- backfilled later
      ca,
      ca + interval '1 hour'
    FROM (
      SELECT
        gs,
        -- Power-law: author_idx = floor(profile_count * pow(random(), 3))
        floor(profile_cnt * pow(random(), 3))::int AS author_idx,
        random() AS rnd_vis,
        random() AS rnd_stat,
        now() - (pow(random(), 1.5) * interval '365 days') AS ca
      FROM generate_series(batch_start, LEAST(batch_start + batch_size - 1, total - 1)) AS gs
    ) assignments
    JOIN seed_profile_index p ON p.idx = assignments.author_idx;
  END LOOP;
END $$;

-- Step 3: Original translations (one per thread, author's language)
INSERT INTO content.thread_translations (
  id, thread_id, language_code, title, content, is_original, created_at
)
SELECT
  gen_random_uuid(),
  t.id,
  COALESCE(p.preferred_language, 'en'),
  'Thread ' || row_number() OVER (ORDER BY t.created_at) || ': '
    || CASE (row_number() OVER (ORDER BY t.created_at) % 12)
      WHEN 0  THEN 'Exploring AI creativity'
      WHEN 1  THEN 'Building better prompts'
      WHEN 2  THEN 'Code review best practices'
      WHEN 3  THEN 'Machine learning insights'
      WHEN 4  THEN 'Community discussion'
      WHEN 5  THEN 'Creative writing challenge'
      WHEN 6  THEN 'Technology trends'
      WHEN 7  THEN 'Design thinking approach'
      WHEN 8  THEN 'Open source contribution'
      WHEN 9  THEN 'Data science workflow'
      WHEN 10 THEN 'Product development'
      ELSE         'General topic'
    END,
  'This is seed content for thread #' || row_number() OVER (ORDER BY t.created_at)
    || '. ' || repeat(
      CASE (row_number() OVER (ORDER BY t.created_at) % 5)
        WHEN 0 THEN 'Artificial intelligence continues to reshape how we think about creativity and problem solving. '
        WHEN 1 THEN 'The intersection of technology and human expression offers endless possibilities for innovation. '
        WHEN 2 THEN 'Community-driven development helps build more robust and inclusive software ecosystems. '
        WHEN 3 THEN 'Effective prompt engineering requires understanding both the model capabilities and the problem domain. '
        ELSE        'Collaboration across disciplines leads to breakthroughs that no single field could achieve alone. '
      END,
      2 + (random() * 4)::int
    ),
  true,
  t.created_at
FROM content.threads t
JOIN lensers.profiles p ON p.id = t.lenser_id
WHERE NOT EXISTS (
  SELECT 1 FROM content.thread_translations tt WHERE tt.thread_id = t.id
);

-- Step 4: Secondary translations for ~15% of public threads (English if original is not English, Turkish otherwise)
INSERT INTO content.thread_translations (
  id, thread_id, language_code, title, content, is_original, created_at
)
SELECT
  gen_random_uuid(),
  t.id,
  CASE WHEN p.preferred_language = 'en' THEN 'tr' ELSE 'en' END,
  '[Translated] Thread ' || row_number() OVER (ORDER BY t.created_at),
  '[Translated] Seed content for a multilingual thread. '
    || repeat('This translated paragraph provides additional linguistic diversity for feed testing. ', 3),
  false,
  t.created_at + interval '1 day'
FROM content.threads t
JOIN lensers.profiles p ON p.id = t.lenser_id
WHERE t.visibility = 'public'::"content"."visibility_enum"
  AND t.status = 'published'::"content"."content_status"
  AND random() < 0.15;
