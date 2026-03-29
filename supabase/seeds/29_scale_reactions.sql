-- =============================================================================
-- 19. SCALE REACTIONS (5K thread + 3K prompt + 2K reply reactions)
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Thread reactions (~5K)
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  batch_start int;
  batch_size  int := 5000;
  total       int := 5000;
  thread_cnt  int;
  user_cnt    int;
BEGIN
  SELECT count(*) INTO thread_cnt
  FROM content.threads
  WHERE visibility = 'public'::"content"."visibility_enum"
    AND status = 'published'::"content"."content_status";

  SELECT count(*) INTO user_cnt
  FROM auth.users WHERE email LIKE '%@lenserfight.seed';

  RAISE NOTICE 'Creating % thread reactions across % threads...', total, thread_cnt;

  FOR batch_start IN 0..total-1 BY batch_size LOOP
    RAISE NOTICE 'thread_reactions batch %/% ...', batch_start / batch_size + 1, total / batch_size;

    INSERT INTO content.reactions (id, entity_type, entity_id, lenser_id, reaction, created_at)
    SELECT
      gen_random_uuid(),
      'thread'::"content"."entity_type_enum",
      t.id,
      u.id,
      (ARRAY['like','love','clap','saved','copy','dislike'])[1 + floor(random() * 6)::int]::"content"."reaction_enum",
      t.created_at + (random() * interval '60 days')
    FROM generate_series(0, LEAST(batch_size - 1, total - batch_start - 1)) AS gs
    -- Power-law thread selection by view_count
    JOIN LATERAL (
      SELECT id, created_at FROM content.threads
      WHERE visibility = 'public'::"content"."visibility_enum"
        AND status = 'published'::"content"."content_status"
      ORDER BY view_count DESC
      OFFSET floor(thread_cnt * pow(random(), 3))::int
      LIMIT 1
    ) t ON true
    -- Random user
    JOIN LATERAL (
      SELECT id FROM auth.users
      WHERE email LIKE '%@lenserfight.seed'
      OFFSET floor(random() * user_cnt)::int
      LIMIT 1
    ) u ON true
    ON CONFLICT DO NOTHING;
  END LOOP;
END $$;

-- ---------------------------------------------------------------------------
-- Lens reactions (~3K)
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  batch_start int;
  batch_size  int := 3000;
  total       int := 3000;
  lens_cnt  int;
  user_cnt    int;
BEGIN
  SELECT count(*) INTO lens_cnt
  FROM lenses.lenses
  WHERE visibility = 'public'::"content"."visibility_enum"
    AND status = 'published'::"content"."content_status";

  SELECT count(*) INTO user_cnt
  FROM auth.users WHERE email LIKE '%@lenserfight.seed';

  RAISE NOTICE 'Creating % lens reactions across % lenses...', total, lens_cnt;

  FOR batch_start IN 0..total-1 BY batch_size LOOP
    RAISE NOTICE 'lens_reactions batch %/% ...', batch_start / batch_size + 1, total / batch_size;

    INSERT INTO content.reactions (id, entity_type, entity_id, lenser_id, reaction, created_at)
    SELECT
      gen_random_uuid(),
      'lens'::"content"."entity_type_enum",
      pt.id,
      u.id,
      (ARRAY['like','love','clap','saved','copy','dislike'])[1 + floor(random() * 6)::int]::"content"."reaction_enum",
      pt.created_at + (random() * interval '60 days')
    FROM generate_series(0, LEAST(batch_size - 1, total - batch_start - 1)) AS gs
    JOIN LATERAL (
      SELECT id, created_at FROM lenses.lenses
      WHERE visibility = 'public'::"content"."visibility_enum"
        AND status = 'published'::"content"."content_status"
      OFFSET floor(lens_cnt * pow(random(), 3))::int
      LIMIT 1
    ) pt ON true
    JOIN LATERAL (
      SELECT id FROM auth.users
      WHERE email LIKE '%@lenserfight.seed'
      OFFSET floor(random() * user_cnt)::int
      LIMIT 1
    ) u ON true
    ON CONFLICT DO NOTHING;
  END LOOP;
END $$;

-- ---------------------------------------------------------------------------
-- Thread reply reactions (~2K)
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  batch_start int;
  batch_size  int := 2000;
  total       int := 2000;
  reply_cnt   int;
  user_cnt    int;
BEGIN
  SELECT count(*) INTO reply_cnt FROM content.thread_replies;
  SELECT count(*) INTO user_cnt
  FROM auth.users WHERE email LIKE '%@lenserfight.seed';

  RAISE NOTICE 'Creating % reply reactions across % replies...', total, reply_cnt;

  FOR batch_start IN 0..total-1 BY batch_size LOOP
    RAISE NOTICE 'reply_reactions batch %/% ...', batch_start / batch_size + 1, total / batch_size;

    INSERT INTO content.reactions (id, entity_type, entity_id, lenser_id, reaction, created_at)
    SELECT
      gen_random_uuid(),
      'thread_reply'::"content"."entity_type_enum",
      r.id,
      u.id,
      (ARRAY['like','love','clap','dislike'])[1 + floor(random() * 4)::int]::"content"."reaction_enum",
      r.created_at + (random() * interval '30 days')
    FROM generate_series(0, LEAST(batch_size - 1, total - batch_start - 1)) AS gs
    JOIN LATERAL (
      SELECT id, created_at FROM content.thread_replies
      OFFSET floor(reply_cnt * pow(random(), 2))::int
      LIMIT 1
    ) r ON true
    JOIN LATERAL (
      SELECT id FROM auth.users
      WHERE email LIKE '%@lenserfight.seed'
      OFFSET floor(random() * user_cnt)::int
      LIMIT 1
    ) u ON true
    ON CONFLICT DO NOTHING;
  END LOOP;
END $$;
