-- =============================================================================
-- 30. BENCHMARK & RECOMMENDATION VALIDATION
-- Performance benchmarks and recommendation correctness tests.
-- Run after all seed data is loaded.
-- =============================================================================

-- ============================================================
-- BENCHMARK: Row counts
-- ============================================================

SELECT 'auth.users' AS entity, count(*) AS cnt FROM auth.users
UNION ALL SELECT 'lensers.profiles', count(*) FROM lensers.profiles
UNION ALL SELECT 'content.threads', count(*) FROM content.threads
UNION ALL SELECT 'content.prompt_templates', count(*) FROM content.prompt_templates
UNION ALL SELECT 'content.tags', count(*) FROM content.tags
UNION ALL SELECT 'content.tag_map', count(*) FROM content.tag_map
UNION ALL SELECT 'content.thread_translations', count(*) FROM content.thread_translations
UNION ALL SELECT 'content.prompt_translations', count(*) FROM content.prompt_translations
UNION ALL SELECT 'content.thread_replies', count(*) FROM content.thread_replies
UNION ALL SELECT 'content.thread_reactions', count(*) FROM content.thread_reactions
UNION ALL SELECT 'content.prompt_reactions', count(*) FROM content.prompt_reactions
UNION ALL SELECT 'content.thread_reply_reactions', count(*) FROM content.thread_reply_reactions
UNION ALL SELECT 'lensers.follows', count(*) FROM lensers.follows
UNION ALL SELECT 'lensers.tag_follows', count(*) FROM lensers.tag_follows
UNION ALL SELECT 'xp.totals', count(*) FROM xp.totals
ORDER BY entity;

-- =============================================================================
-- BENCHMARK 1: Hot score views
-- =============================================================================
-- 
-- ============================================================
-- BENCHMARK 1: vw_threads_hot_scores (top 50)
-- ============================================================

EXPLAIN (FORMAT TEXT)
SELECT * FROM content.vw_threads_hot_scores
ORDER BY hot_score DESC LIMIT 50;

-- 
-- ============================================================
-- BENCHMARK 2: vw_prompts_hot_scores (top 50)
-- ============================================================

EXPLAIN (FORMAT TEXT)
SELECT * FROM content.vw_prompts_hot_scores
ORDER BY hot_score DESC LIMIT 50;

-- =============================================================================
-- BENCHMARK 3-4: Public content views
-- =============================================================================
-- 
-- ============================================================
-- BENCHMARK 3: vw_content_threads_public (latest 50)
-- ============================================================

EXPLAIN (FORMAT TEXT)
SELECT * FROM public.vw_content_threads_public
ORDER BY created_at DESC LIMIT 50;

-- 
-- ============================================================
-- BENCHMARK 4: vw_content_threads_public (full count)
-- ============================================================

EXPLAIN (FORMAT TEXT)
SELECT count(*) FROM public.vw_content_threads_public;

-- =============================================================================
-- BENCHMARK 5-8: Trending feeds
-- =============================================================================
-- 
-- ============================================================
-- BENCHMARK 5: Trending threads (English)
-- ============================================================

EXPLAIN (FORMAT TEXT)
SELECT * FROM public.fn_content_get_trending_threads('en', 20, 0);

-- 
-- ============================================================
-- BENCHMARK 6: Trending threads (Turkish)
-- ============================================================

EXPLAIN (FORMAT TEXT)
SELECT * FROM public.fn_content_get_trending_threads('tr', 20, 0);

-- 
-- ============================================================
-- BENCHMARK 7: Trending threads deep pagination
-- ============================================================

EXPLAIN (FORMAT TEXT)
SELECT * FROM public.fn_content_get_trending_threads('en', 20, 500);

-- =============================================================================
-- BENCHMARK 8: Lenser score view
-- =============================================================================
-- 
-- ============================================================
-- BENCHMARK 8: vw_lensers_score (top 50)
-- ============================================================

EXPLAIN (FORMAT TEXT)
SELECT * FROM lensers.vw_lensers_score
ORDER BY lenser_score DESC LIMIT 50;

-- =============================================================================
-- BENCHMARK 9: Thread replies for a popular thread
-- =============================================================================
-- 
-- ============================================================
-- BENCHMARK 9: Replies for most popular thread
-- ============================================================

EXPLAIN (FORMAT TEXT)
SELECT * FROM public.vw_content_thread_replies_public
WHERE thread_id = (
  SELECT id FROM content.threads
  WHERE visibility = 'public'::"content"."visibility_enum"
    AND status = 'published'::"content"."content_status"
  ORDER BY reply_count DESC LIMIT 1
)
ORDER BY created_at LIMIT 50;

-- =============================================================================
-- BENCHMARK 10: Cross-language tag view
-- =============================================================================
-- 
-- ============================================================
-- BENCHMARK 10: vw_tag_cross_lang
-- ============================================================

EXPLAIN (FORMAT TEXT)
SELECT * FROM content.vw_tag_cross_lang LIMIT 100;

-- =============================================================================
-- RECOMMENDATION VALIDATION
-- =============================================================================

-- 
-- ============================================================
-- VALIDATION: Language distribution in content
-- ============================================================

SELECT
  tt.language_code,
  count(*) AS thread_count,
  round(100.0 * count(*) / sum(count(*)) OVER (), 1) AS pct
FROM content.thread_translations tt
WHERE tt.is_original = true
GROUP BY tt.language_code
ORDER BY thread_count DESC;

-- 
-- ============================================================
-- VALIDATION: Language distribution in profiles
-- ============================================================

SELECT
  preferred_language,
  count(*) AS profile_count,
  round(100.0 * count(*) / sum(count(*)) OVER (), 1) AS pct
FROM lensers.profiles
GROUP BY preferred_language
ORDER BY profile_count DESC;

-- 
-- ============================================================
-- VALIDATION: Tag follow distribution (top 20 tags)
-- ============================================================

SELECT
  t.slug,
  count(*) AS follower_count
FROM lensers.tag_follows tf
JOIN content.tags t ON t.id = tf.tag_id
GROUP BY t.slug
ORDER BY follower_count DESC
LIMIT 20;

-- 
-- ============================================================
-- VALIDATION: Creator distribution (top 20 by thread count)
-- ============================================================

SELECT
  p.handle,
  p.preferred_language,
  ls.thread_count,
  ls.prompt_count,
  ls.follower_count
FROM analytics.lenser_stats ls
JOIN lensers.profiles p ON p.id = ls.lenser_id
ORDER BY ls.thread_count DESC
LIMIT 20;

-- 
-- ============================================================
-- VALIDATION: Reaction distribution per type
-- ============================================================

SELECT 'thread_reactions' AS source, reaction::text, count(*) AS cnt
FROM content.thread_reactions GROUP BY reaction
UNION ALL
SELECT 'prompt_reactions', reaction::text, count(*)
FROM content.prompt_reactions GROUP BY reaction
ORDER BY source, cnt DESC;

-- 
-- ============================================================
-- VALIDATION: Hot score distribution (threads)
-- ============================================================

SELECT
  CASE
    WHEN hot_score >= 1.0 THEN 'hot (>=1.0)'
    WHEN hot_score >= 0.1 THEN 'warm (0.1-1.0)'
    WHEN hot_score >= 0.01 THEN 'mild (0.01-0.1)'
    ELSE 'cold (<0.01)'
  END AS score_bucket,
  count(*) AS thread_count,
  round(avg(hot_score)::numeric, 4) AS avg_score
FROM content.vw_threads_hot_scores
GROUP BY 1
ORDER BY avg_score DESC;

-- 
-- ============================================================
-- VALIDATION: Index usage (check for seq scans on large tables)
-- ============================================================

SELECT
  schemaname || '.' || relname AS table_name,
  seq_scan,
  idx_scan,
  CASE WHEN seq_scan + idx_scan > 0
    THEN round(100.0 * idx_scan / (seq_scan + idx_scan), 1)
    ELSE 0
  END AS idx_hit_pct,
  n_live_tup AS row_count
FROM pg_stat_user_tables
WHERE n_live_tup > 10000
ORDER BY n_live_tup DESC;

-- 
-- ============================================================
-- BENCHMARK COMPLETE
-- ============================================================
