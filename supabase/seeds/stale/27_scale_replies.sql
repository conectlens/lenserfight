-- =============================================================================
-- 17. SCALE THREAD REPLIES (10K replies)
-- =============================================================================

DO $$
DECLARE
  batch_start int;
  batch_size  int := 10000;
  total       int := 10000;
  thread_cnt  int;
  profile_cnt int;
BEGIN
  SELECT count(*) INTO thread_cnt
  FROM content.threads
  WHERE visibility = 'public'::"content"."visibility_enum"
    AND status = 'published'::"content"."content_status";

  SELECT count(*) INTO profile_cnt FROM seed_profile_index;

  RAISE NOTICE 'Creating % replies across % public threads...', total, thread_cnt;

  FOR batch_start IN 0..total-1 BY batch_size LOOP
    RAISE NOTICE 'thread_replies batch %/% ...', batch_start / batch_size + 1, total / batch_size;

    INSERT INTO content.thread_replies (
      id, thread_id, parent_reply_id, lenser_id,
      content, status, created_at, updated_at
    )
    SELECT
      gen_random_uuid(),
      t.id,
      NULL,  -- top-level replies (no nesting for scale seed)
      p.id,
      'Reply #' || (batch_start + gs) || ': '
        || CASE (gs % 8)
          WHEN 0 THEN 'Great point! I agree with this perspective.'
          WHEN 1 THEN 'Interesting take. Have you considered the alternative approach?'
          WHEN 2 THEN 'Thanks for sharing. This helped me understand the concept better.'
          WHEN 3 THEN 'I disagree respectfully. Here is my reasoning...'
          WHEN 4 THEN 'Could you elaborate more on this? I find it fascinating.'
          WHEN 5 THEN 'This reminds me of a similar discussion from last week.'
          WHEN 6 THEN 'Well explained! The examples really make it clear.'
          ELSE        'Adding to the discussion: there are several nuances worth exploring here.'
        END,
      'published'::"content"."thread_reply_status",
      t.created_at + (random() * interval '30 days'),
      t.created_at + (random() * interval '30 days')
    FROM generate_series(0, LEAST(batch_size - 1, total - batch_start - 1)) AS gs
    -- Power-law thread selection: popular threads get more replies
    JOIN LATERAL (
      SELECT id, created_at
      FROM content.threads
      WHERE visibility = 'public'::"content"."visibility_enum"
        AND status = 'published'::"content"."content_status"
      ORDER BY view_count DESC
      OFFSET floor(thread_cnt * pow(random(), 2))::int
      LIMIT 1
    ) t ON true
    -- Random replier
    JOIN seed_profile_index p ON p.idx = floor(random() * profile_cnt)::int;
  END LOOP;
END $$;
