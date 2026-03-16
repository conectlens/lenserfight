-- Migration: Advanced Enhancements — Phase 4
-- Adds: content.reports (anti-spam), content.vw_tag_cross_lang (cross-language
-- tag equivalence), time-windowed leaderboard RPC, and quality-aware versions
-- of the Phase 3 personalized feed RPCs.
-- Entirely additive — existing tables and views are not dropped.
-- Rollback: DROP TABLE content.reports, DROP VIEW content.vw_tag_cross_lang,
--           DROP FUNCTION for each RPC created/replaced here.

-- ──────────────────────────────────────────────────────────────────────────────
-- TABLE: content.reports
-- User-submitted content reports for anti-spam / quality filtering.
-- A content item is considered low-quality when its report count exceeds the
-- threshold used in the quality filter view below (default: 3 unique reporters).
-- ──────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS content.reports (
  id          uuid        DEFAULT gen_random_uuid() NOT NULL,
  reporter_id uuid        NOT NULL REFERENCES lensers.profiles(id) ON DELETE CASCADE,
  target_type "content"."entity_type_enum"  NOT NULL,
  target_id   uuid        NOT NULL,
  reason      text        NOT NULL,
  created_at  timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT reports_pk     PRIMARY KEY (id),
  CONSTRAINT reports_unique UNIQUE (reporter_id, target_type, target_id),
  CONSTRAINT reports_reason_check CHECK (
    reason IN ('spam', 'harassment', 'misinformation', 'off_topic', 'other')
  )
);

CREATE INDEX IF NOT EXISTS idx_reports_target ON content.reports(target_type, target_id);
CREATE INDEX IF NOT EXISTS idx_reports_reporter_id ON content.reports(reporter_id);

-- ──────────────────────────────────────────────────────────────────────────────
-- RLS: content.reports
-- Reporters can see and delete their own reports; mods see all (service_role).
-- ──────────────────────────────────────────────────────────────────────────────
ALTER TABLE content.reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "reports_select_own"
  ON content.reports FOR SELECT
  USING (
    reporter_id = (SELECT id FROM lensers.profiles WHERE user_id = auth.uid() LIMIT 1)
  );

CREATE POLICY "reports_insert_self"
  ON content.reports FOR INSERT
  WITH CHECK (
    reporter_id = (SELECT id FROM lensers.profiles WHERE user_id = auth.uid() LIMIT 1)
  );

CREATE POLICY "reports_delete_own"
  ON content.reports FOR DELETE
  USING (
    reporter_id = (SELECT id FROM lensers.profiles WHERE user_id = auth.uid() LIMIT 1)
  );

-- ──────────────────────────────────────────────────────────────────────────────
-- RPC: fn_content_report
-- Submit a content report. Idempotent — updates the reason if already reported.
-- ──────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION "public"."fn_content_report"(
  "p_target_type" text,
  "p_target_id"   uuid,
  "p_reason"      text DEFAULT 'other'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'lensers', 'content', 'auth'
AS $$
DECLARE
  v_lenser_id  uuid;
  v_target_type "content"."entity_type_enum";
BEGIN
  SELECT id INTO v_lenser_id
  FROM lensers.profiles
  WHERE user_id = auth.uid();

  IF v_lenser_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required or profile not found';
  END IF;

  -- Validate target_type against the enum
  BEGIN
    v_target_type := p_target_type::"content"."entity_type_enum";
  EXCEPTION WHEN invalid_text_representation THEN
    RAISE EXCEPTION 'Invalid target_type: %', p_target_type;
  END;

  -- Validate reason
  IF p_reason NOT IN ('spam', 'harassment', 'misinformation', 'off_topic', 'other') THEN
    RAISE EXCEPTION 'Invalid reason: %', p_reason;
  END IF;

  INSERT INTO content.reports (reporter_id, target_type, target_id, reason)
  VALUES (v_lenser_id, v_target_type, p_target_id, p_reason)
  ON CONFLICT (reporter_id, target_type, target_id)
  DO UPDATE SET reason = EXCLUDED.reason;

  RETURN jsonb_build_object('reported', true);
END;
$$;

ALTER FUNCTION "public"."fn_content_report"(text, uuid, text) OWNER TO postgres;
REVOKE ALL ON FUNCTION "public"."fn_content_report"(text, uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION "public"."fn_content_report"(text, uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION "public"."fn_content_report"(text, uuid, text) TO service_role;

-- ──────────────────────────────────────────────────────────────────────────────
-- VIEW: content.vw_tag_cross_lang
-- Cross-language tag equivalence: maps each tag to all tags that share the
-- same normalized translation name in any language.
-- Used in Phase 4 personalized feed to expand the interest tag set across
-- language boundaries (e.g., "ai" ↔ "yapay-zeka" if both share a translation).
-- ──────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE VIEW content.vw_tag_cross_lang AS
SELECT DISTINCT
  tt1.tag_id AS source_tag_id,
  tt2.tag_id AS equivalent_tag_id
FROM content.tag_translations tt1
JOIN content.tag_translations tt2
  ON lower(trim(tt1.name)) = lower(trim(tt2.name))
  AND tt1.tag_id <> tt2.tag_id
JOIN content.tags t1 ON t1.id = tt1.tag_id AND t1.visibility = 'public'::"content"."tag_visibility_enum"
JOIN content.tags t2 ON t2.id = tt2.tag_id AND t2.visibility = 'public'::"content"."tag_visibility_enum";

-- ──────────────────────────────────────────────────────────────────────────────
-- RPC: fn_lensers_get_leaderboard
-- Time-windowed XP leaderboard.
-- p_period: 'weekly' | 'monthly' | 'all_time'
-- Weekly/monthly windows use xp.totals (which tracks current accumulated XP).
-- For granular time-window deltas a separate xp_events table would be needed;
-- as an approximation, weekly/monthly windows filter lensers who were active
-- (last_active_at) within the window and rank by total XP.
-- ──────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION "public"."fn_lensers_get_leaderboard"(
  "p_period" text DEFAULT 'all_time',
  "p_limit"  int  DEFAULT 20
)
RETURNS TABLE(
  lenser_id     uuid,
  handle        text,
  display_name  text,
  avatar_url    text,
  total_xp      bigint,
  current_level int,
  lenser_score  float8,
  rank          bigint
)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path TO 'public', 'lensers', 'xp'
AS $$
  SELECT
    ls.lenser_id,
    ls.handle,
    ls.display_name,
    ls.avatar_url,
    ls.total_xp,
    ls.current_level,
    ls.lenser_score,
    ROW_NUMBER() OVER (ORDER BY ls.total_xp DESC) AS rank
  FROM lensers.vw_lensers_score ls
  JOIN lensers.profiles          lp ON lp.id = ls.lenser_id
  WHERE
    CASE p_period
      WHEN 'weekly'  THEN lp.last_active_at > now() - interval '7 days'
      WHEN 'monthly' THEN lp.last_active_at > now() - interval '30 days'
      ELSE true  -- all_time: no activity filter
    END
  ORDER BY ls.total_xp DESC
  LIMIT LEAST(p_limit, 100);
$$;

ALTER FUNCTION "public"."fn_lensers_get_leaderboard"(text, int) OWNER TO postgres;
REVOKE ALL ON FUNCTION "public"."fn_lensers_get_leaderboard"(text, int) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION "public"."fn_lensers_get_leaderboard"(text, int) TO anon;
GRANT EXECUTE ON FUNCTION "public"."fn_lensers_get_leaderboard"(text, int) TO authenticated;
GRANT EXECUTE ON FUNCTION "public"."fn_lensers_get_leaderboard"(text, int) TO service_role;

-- ──────────────────────────────────────────────────────────────────────────────
-- RPC: fn_content_get_personal_threads (Phase 4 — quality-filtered + cross-lang)
-- Replaces the Phase 3 version with two enhancements:
--   1. Quality filter: threads with ≥ 3 distinct reports are excluded.
--   2. Cross-language interest tags: expands the interest_tags set to include
--      tags that share a translation name with explicitly followed tags,
--      so a user following "ai" also sees content tagged "yapay-zeka" (if equivalent).
-- ──────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION "public"."fn_content_get_personal_threads"(
  "p_lenser_id" uuid,
  "p_limit"     int DEFAULT 20,
  "p_offset"    int DEFAULT 0
)
RETURNS TABLE(
  id               uuid,
  personal_score   float8,
  hot_score        float8,
  primary_language text,
  author_profile   jsonb,
  tags             jsonb,
  reaction_totals  jsonb,
  title            text,
  reply_count      int,
  created_at       timestamptz
)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path TO 'public', 'content', 'lensers'
AS $$
WITH
  user_pref AS (
    SELECT preferred_language, user_id
    FROM lensers.profiles
    WHERE id = p_lenser_id
  ),
  -- Explicitly followed tags + cross-language equivalents + recent reaction tags
  interest_tags AS (
    -- Directly followed
    SELECT tag_id
    FROM lensers.tag_follows
    WHERE lenser_id = p_lenser_id
    UNION
    -- Cross-language equivalents of directly followed tags
    SELECT xcl.equivalent_tag_id AS tag_id
    FROM lensers.tag_follows      tf
    JOIN content.vw_tag_cross_lang xcl ON xcl.source_tag_id = tf.tag_id
    WHERE tf.lenser_id = p_lenser_id
    UNION
    -- Tags inferred from recent thread reactions
    SELECT DISTINCT tm.tag_id
    FROM content.thread_reactions tr
    JOIN content.threads           t2 ON t2.id = tr.thread_id
    JOIN content.tag_map           tm ON tm.entity_id = t2.id
                                      AND tm.entity_type = 'thread'
    WHERE tr.user_id    = (SELECT user_id FROM user_pref)
      AND tr.created_at > now() - interval '30 days'
  ),
  thread_tag_sim AS (
    SELECT
      tm.entity_id                                                        AS thread_id,
      COUNT(*)::float / GREATEST((SELECT COUNT(*) FROM interest_tags), 1) AS tag_sim
    FROM content.tag_map tm
    JOIN interest_tags   it ON it.tag_id = tm.tag_id
    WHERE tm.entity_type = 'thread'
    GROUP BY tm.entity_id
  ),
  -- Threads with 3+ distinct reporters are excluded (quality filter)
  reported_threads AS (
    SELECT target_id
    FROM content.reports
    WHERE target_type = 'thread'::"content"."entity_type_enum"
    GROUP BY target_id
    HAVING COUNT(DISTINCT reporter_id) >= 3
  ),
  followed_authors AS (
    SELECT following_id AS lenser_id
    FROM lensers.follows
    WHERE follower_id = p_lenser_id
  )
SELECT
  v.id,
  (
    0.30 * COALESCE(ts.tag_sim, 0.0)
    + 0.25 * CASE
        WHEN hs.primary_language = (SELECT preferred_language FROM user_pref) THEN 1.0
        ELSE 0.0
      END
    + 0.20 * LEAST(hs.hot_score / 2.0, 1.0)
    + 0.15 * LEAST(COALESCE(ls.lenser_score, 0.0) / 5.0, 1.0)
    + 0.10 * CASE WHEN fa.lenser_id IS NOT NULL THEN 1.0 ELSE 0.0 END
  )                                                                  AS personal_score,
  hs.hot_score,
  hs.primary_language,
  v.author_profile,
  v.tags,
  v.reaction_totals,
  v.title,
  v.reply_count,
  v.created_at
FROM public.vw_content_threads_public       v
JOIN content.vw_threads_hot_scores           hs ON hs.id = v.id
LEFT JOIN thread_tag_sim                     ts ON ts.thread_id = v.id
LEFT JOIN lensers.vw_lensers_score           ls ON ls.lenser_id = (v.author_profile->>'id')::uuid
LEFT JOIN followed_authors                   fa ON fa.lenser_id = (v.author_profile->>'id')::uuid
WHERE v.id NOT IN (SELECT target_id FROM reported_threads)
ORDER BY personal_score DESC
LIMIT  LEAST(p_limit,  50)
OFFSET GREATEST(p_offset, 0);
$$;

ALTER FUNCTION "public"."fn_content_get_personal_threads"(uuid, int, int) OWNER TO postgres;
REVOKE ALL ON FUNCTION "public"."fn_content_get_personal_threads"(uuid, int, int) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION "public"."fn_content_get_personal_threads"(uuid, int, int) TO authenticated;
GRANT EXECUTE ON FUNCTION "public"."fn_content_get_personal_threads"(uuid, int, int) TO service_role;

-- ──────────────────────────────────────────────────────────────────────────────
-- RPC: fn_content_get_personal_prompts (Phase 4 — quality-filtered + cross-lang)
-- ──────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION "public"."fn_content_get_personal_prompts"(
  "p_lenser_id" uuid,
  "p_limit"     int DEFAULT 20,
  "p_offset"    int DEFAULT 0
)
RETURNS TABLE(
  id               uuid,
  personal_score   float8,
  hot_score        float8,
  primary_language text,
  author_profile   jsonb,
  tags             jsonb,
  reaction_totals  jsonb,
  title            text,
  description      text,
  created_at       timestamptz
)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path TO 'public', 'content', 'lensers'
AS $$
WITH
  user_pref AS (
    SELECT preferred_language, user_id
    FROM lensers.profiles
    WHERE id = p_lenser_id
  ),
  interest_tags AS (
    SELECT tag_id
    FROM lensers.tag_follows
    WHERE lenser_id = p_lenser_id
    UNION
    SELECT xcl.equivalent_tag_id AS tag_id
    FROM lensers.tag_follows       tf
    JOIN content.vw_tag_cross_lang xcl ON xcl.source_tag_id = tf.tag_id
    WHERE tf.lenser_id = p_lenser_id
    UNION
    SELECT DISTINCT tm.tag_id
    FROM content.prompt_reactions pr
    JOIN content.prompt_templates  pt2 ON pt2.id = pr.prompt_id
    JOIN content.tag_map           tm  ON tm.entity_id = pt2.id
                                       AND tm.entity_type = 'prompt_template'
    WHERE pr.user_id    = (SELECT user_id FROM user_pref)
      AND pr.created_at > now() - interval '30 days'
  ),
  prompt_tag_sim AS (
    SELECT
      tm.entity_id                                                        AS prompt_id,
      COUNT(*)::float / GREATEST((SELECT COUNT(*) FROM interest_tags), 1) AS tag_sim
    FROM content.tag_map tm
    JOIN interest_tags   it ON it.tag_id = tm.tag_id
    WHERE tm.entity_type = 'prompt_template'
    GROUP BY tm.entity_id
  ),
  reported_prompts AS (
    SELECT target_id
    FROM content.reports
    WHERE target_type = 'prompt_template'::"content"."entity_type_enum"
    GROUP BY target_id
    HAVING COUNT(DISTINCT reporter_id) >= 3
  ),
  followed_authors AS (
    SELECT following_id AS lenser_id
    FROM lensers.follows
    WHERE follower_id = p_lenser_id
  )
SELECT
  v.id,
  (
    0.30 * COALESCE(ps.tag_sim, 0.0)
    + 0.25 * CASE
        WHEN hs.primary_language = (SELECT preferred_language FROM user_pref) THEN 1.0
        ELSE 0.0
      END
    + 0.20 * LEAST(hs.hot_score / 2.0, 1.0)
    + 0.15 * LEAST(COALESCE(ls.lenser_score, 0.0) / 5.0, 1.0)
    + 0.10 * CASE WHEN fa.lenser_id IS NOT NULL THEN 1.0 ELSE 0.0 END
  )                                                                  AS personal_score,
  hs.hot_score,
  hs.primary_language,
  v.author_profile,
  v.tags,
  v.reaction_totals,
  v.title,
  v.description,
  v.created_at
FROM public.vw_prompt_templates_public       v
JOIN content.vw_prompts_hot_scores            hs ON hs.id = v.id
LEFT JOIN prompt_tag_sim                      ps ON ps.prompt_id = v.id
LEFT JOIN lensers.vw_lensers_score            ls ON ls.lenser_id = (v.author_profile->>'id')::uuid
LEFT JOIN followed_authors                    fa ON fa.lenser_id = (v.author_profile->>'id')::uuid
WHERE v.id NOT IN (SELECT target_id FROM reported_prompts)
ORDER BY personal_score DESC
LIMIT  LEAST(p_limit,  50)
OFFSET GREATEST(p_offset, 0);
$$;

ALTER FUNCTION "public"."fn_content_get_personal_prompts"(uuid, int, int) OWNER TO postgres;
REVOKE ALL ON FUNCTION "public"."fn_content_get_personal_prompts"(uuid, int, int) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION "public"."fn_content_get_personal_prompts"(uuid, int, int) TO authenticated;
GRANT EXECUTE ON FUNCTION "public"."fn_content_get_personal_prompts"(uuid, int, int) TO service_role;

-- ──────────────────────────────────────────────────────────────────────────────
-- Grant SELECT on new objects to PostgREST roles where needed
-- ──────────────────────────────────────────────────────────────────────────────
GRANT SELECT ON content.vw_tag_cross_lang TO anon, authenticated, service_role;
