-- =============================================================================
-- 18. SCALE FOLLOWS (10K lenser follows + 2K tag follows)
-- =============================================================================

-- Lenser follows (~10K) — inserted into lensers.relationships (status='accepted')
DO $$
DECLARE
  batch_start int;
  batch_size  int := 10000;
  total       int := 10000;
  profile_cnt int;
BEGIN
  SELECT count(*) INTO profile_cnt FROM seed_profile_index;

  FOR batch_start IN 0..total-1 BY batch_size LOOP
    RAISE NOTICE 'lensers.relationships batch %/% ...', batch_start / batch_size + 1, total / batch_size;

    INSERT INTO lensers.relationships (
        id, source_profile_id, target_profile_id,
        status, accepted_at, requested_at
    )
    SELECT
      gen_random_uuid(),
      follower.id,
      following.id,
      'accepted',
      GREATEST(follower.created_at, following.created_at) + (random() * interval '30 days'),
      GREATEST(follower.created_at, following.created_at) + (random() * interval '30 days')
    FROM (
      -- Random follower
      SELECT p.id, (SELECT created_at FROM lensers.profiles WHERE id = p.id) AS created_at
      FROM seed_profile_index p
      WHERE p.idx = floor(random() * profile_cnt)::int
      LIMIT 1
    ) follower
    CROSS JOIN LATERAL (
      -- Power-law following: popular lensers followed more
      SELECT p.id, (SELECT created_at FROM lensers.profiles WHERE id = p.id) AS created_at
      FROM seed_profile_index p
      WHERE p.idx = floor(profile_cnt * pow(random(), 2))::int
        AND p.id <> follower.id
      LIMIT 1
    ) following
    CROSS JOIN generate_series(0, LEAST(batch_size - 1, total - batch_start - 1)) AS gs
    ON CONFLICT DO NOTHING;
  END LOOP;
END $$;

-- Tag follows (~2K)
DO $$
DECLARE
  profile_cnt int;
  tag_cnt int;
BEGIN
  SELECT count(*) INTO profile_cnt FROM seed_profile_index;
  SELECT count(*) INTO tag_cnt FROM seed_tag_index;

  RAISE NOTICE 'Creating ~2K tag follows...';

  INSERT INTO lensers.tag_follows (id, lenser_id, tag_id, created_at)
  SELECT * FROM (
    SELECT
      gen_random_uuid(),
      p.id,
      ti.tag_id,
      now() - (random() * interval '180 days')
    FROM seed_profile_index p
    CROSS JOIN LATERAL (
      -- 1-7 tags per lenser, power-law tag popularity
      SELECT (floor(tag_cnt * pow(random(), 2))::int) AS tidx
      FROM generate_series(1, 1 + (random() * 6)::int)
    ) tag_picks
    JOIN seed_tag_index ti ON ti.tidx = tag_picks.tidx
    WHERE random() < 0.75  -- throttle to ~500K total
    LIMIT 2000
  ) sub
  ON CONFLICT DO NOTHING;
END $$;
