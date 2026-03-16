-- Migration: Personalized Feed — Phase 3
-- Adds lenser follows, tag follows, personal feed RPCs, and suggested lensers RPC.
-- Entirely additive — no existing tables, views, or RPCs are modified.
-- Rollback: DROP TABLE lensers.follows, DROP TABLE lensers.tag_follows,
--           DROP FUNCTION for each RPC created here.

-- ──────────────────────────────────────────────────────────────────────────────
-- TABLE: lensers.follows
-- Lenser-to-lenser follow relationships. Powers follow graph and feed boosts.
-- ──────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS lensers.follows (
  id           uuid        DEFAULT gen_random_uuid() NOT NULL,
  follower_id  uuid        NOT NULL REFERENCES lensers.profiles(id) ON DELETE CASCADE,
  following_id uuid        NOT NULL REFERENCES lensers.profiles(id) ON DELETE CASCADE,
  created_at   timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT follows_pk            PRIMARY KEY (id),
  CONSTRAINT follows_no_self_follow CHECK (follower_id <> following_id),
  CONSTRAINT follows_unique         UNIQUE (follower_id, following_id)
);

CREATE INDEX IF NOT EXISTS idx_follows_follower_id  ON lensers.follows(follower_id);
CREATE INDEX IF NOT EXISTS idx_follows_following_id ON lensers.follows(following_id);

-- ──────────────────────────────────────────────────────────────────────────────
-- TABLE: lensers.tag_follows
-- Tag interest tracking — used as primary signal in personalized feed.
-- ──────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS lensers.tag_follows (
  id         uuid        DEFAULT gen_random_uuid() NOT NULL,
  lenser_id  uuid        NOT NULL REFERENCES lensers.profiles(id) ON DELETE CASCADE,
  tag_id     uuid        NOT NULL REFERENCES content.tags(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT tag_follows_pk     PRIMARY KEY (id),
  CONSTRAINT tag_follows_unique UNIQUE (lenser_id, tag_id)
);

CREATE INDEX IF NOT EXISTS idx_tag_follows_lenser_id ON lensers.tag_follows(lenser_id);
CREATE INDEX IF NOT EXISTS idx_tag_follows_tag_id    ON lensers.tag_follows(tag_id);

-- ──────────────────────────────────────────────────────────────────────────────
-- TRIGGER: Sync analytics.lenser_stats follower_count / following_count
-- Keeps the denormalized counters consistent without a SELECT COUNT(*) on reads.
-- ──────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION lensers.fn_sync_follow_counts()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path TO 'lensers', 'analytics'
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO analytics.lenser_stats (lenser_id, follower_count)
      VALUES (NEW.following_id, 1)
      ON CONFLICT (lenser_id) DO UPDATE
        SET follower_count = analytics.lenser_stats.follower_count + 1,
            updated_at     = now();

    INSERT INTO analytics.lenser_stats (lenser_id, following_count)
      VALUES (NEW.follower_id, 1)
      ON CONFLICT (lenser_id) DO UPDATE
        SET following_count = analytics.lenser_stats.following_count + 1,
            updated_at      = now();

  ELSIF TG_OP = 'DELETE' THEN
    UPDATE analytics.lenser_stats
       SET follower_count = GREATEST(0, follower_count - 1),
           updated_at     = now()
     WHERE lenser_id = OLD.following_id;

    UPDATE analytics.lenser_stats
       SET following_count = GREATEST(0, following_count - 1),
           updated_at      = now()
     WHERE lenser_id = OLD.follower_id;
  END IF;

  RETURN NULL;
END;
$$;

CREATE OR REPLACE TRIGGER trg_follows_sync_counts
  AFTER INSERT OR DELETE ON lensers.follows
  FOR EACH ROW EXECUTE FUNCTION lensers.fn_sync_follow_counts();

-- ──────────────────────────────────────────────────────────────────────────────
-- RLS: lensers.follows
-- Social graph is public-readable; inserts/deletes are scoped to the owner.
-- ──────────────────────────────────────────────────────────────────────────────
ALTER TABLE lensers.follows ENABLE ROW LEVEL SECURITY;

CREATE POLICY "follows_select_public"
  ON lensers.follows FOR SELECT
  USING (true);

CREATE POLICY "follows_insert_self"
  ON lensers.follows FOR INSERT
  WITH CHECK (
    follower_id = (SELECT id FROM lensers.profiles WHERE user_id = auth.uid() LIMIT 1)
  );

CREATE POLICY "follows_delete_self"
  ON lensers.follows FOR DELETE
  USING (
    follower_id = (SELECT id FROM lensers.profiles WHERE user_id = auth.uid() LIMIT 1)
  );

-- ──────────────────────────────────────────────────────────────────────────────
-- RLS: lensers.tag_follows
-- ──────────────────────────────────────────────────────────────────────────────
ALTER TABLE lensers.tag_follows ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tag_follows_select_public"
  ON lensers.tag_follows FOR SELECT
  USING (true);

CREATE POLICY "tag_follows_insert_self"
  ON lensers.tag_follows FOR INSERT
  WITH CHECK (
    lenser_id = (SELECT id FROM lensers.profiles WHERE user_id = auth.uid() LIMIT 1)
  );

CREATE POLICY "tag_follows_delete_self"
  ON lensers.tag_follows FOR DELETE
  USING (
    lenser_id = (SELECT id FROM lensers.profiles WHERE user_id = auth.uid() LIMIT 1)
  );

-- ──────────────────────────────────────────────────────────────────────────────
-- RPC: fn_lensers_follow
-- Follow a lenser. Idempotent — does nothing if the follow already exists.
-- Resolves the follower from auth.uid() so the client cannot spoof it.
-- ──────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION "public"."fn_lensers_follow"(
  "p_following_id" uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'lensers', 'auth'
AS $$
DECLARE
  v_follower_id uuid;
BEGIN
  SELECT id INTO v_follower_id
  FROM lensers.profiles
  WHERE user_id = auth.uid();

  IF v_follower_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required or profile not found';
  END IF;

  IF v_follower_id = p_following_id THEN
    RAISE EXCEPTION 'Cannot follow yourself';
  END IF;

  INSERT INTO lensers.follows (follower_id, following_id)
  VALUES (v_follower_id, p_following_id)
  ON CONFLICT (follower_id, following_id) DO NOTHING;

  RETURN jsonb_build_object('following', true);
END;
$$;

ALTER FUNCTION "public"."fn_lensers_follow"(uuid) OWNER TO postgres;
REVOKE ALL ON FUNCTION "public"."fn_lensers_follow"(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION "public"."fn_lensers_follow"(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION "public"."fn_lensers_follow"(uuid) TO service_role;

-- ──────────────────────────────────────────────────────────────────────────────
-- RPC: fn_lensers_unfollow
-- Unfollow a lenser. Idempotent — does nothing if the follow does not exist.
-- ──────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION "public"."fn_lensers_unfollow"(
  "p_following_id" uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'lensers', 'auth'
AS $$
DECLARE
  v_follower_id uuid;
BEGIN
  SELECT id INTO v_follower_id
  FROM lensers.profiles
  WHERE user_id = auth.uid();

  IF v_follower_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required or profile not found';
  END IF;

  DELETE FROM lensers.follows
  WHERE follower_id = v_follower_id AND following_id = p_following_id;

  RETURN jsonb_build_object('following', false);
END;
$$;

ALTER FUNCTION "public"."fn_lensers_unfollow"(uuid) OWNER TO postgres;
REVOKE ALL ON FUNCTION "public"."fn_lensers_unfollow"(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION "public"."fn_lensers_unfollow"(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION "public"."fn_lensers_unfollow"(uuid) TO service_role;

-- ──────────────────────────────────────────────────────────────────────────────
-- RPC: fn_lensers_is_following
-- Returns true if the authenticated user follows the given lenser.
-- ──────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION "public"."fn_lensers_is_following"(
  "p_target_id" uuid
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path TO 'public', 'lensers', 'auth'
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM lensers.follows f
    JOIN lensers.profiles p ON p.id = f.follower_id AND p.user_id = auth.uid()
    WHERE f.following_id = p_target_id
  );
$$;

ALTER FUNCTION "public"."fn_lensers_is_following"(uuid) OWNER TO postgres;
REVOKE ALL ON FUNCTION "public"."fn_lensers_is_following"(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION "public"."fn_lensers_is_following"(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION "public"."fn_lensers_is_following"(uuid) TO service_role;

-- ──────────────────────────────────────────────────────────────────────────────
-- RPC: fn_lensers_get_follows
-- Returns paginated followers or following list for any lenser.
-- p_type: 'followers' | 'following'
-- is_following reflects whether the *caller* (auth.uid()) follows each result.
-- ──────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION "public"."fn_lensers_get_follows"(
  "p_lenser_id" uuid,
  "p_type"      text    DEFAULT 'following',
  "p_limit"     int     DEFAULT 20,
  "p_offset"    int     DEFAULT 0
)
RETURNS TABLE(
  lenser_id    uuid,
  handle       text,
  display_name text,
  avatar_url   text,
  is_following boolean
)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path TO 'public', 'lensers', 'auth'
AS $$
  SELECT
    lp.id,
    lp.handle,
    lp.display_name,
    lp.avatar_url,
    EXISTS (
      SELECT 1 FROM lensers.follows f2
      JOIN lensers.profiles me ON me.user_id = auth.uid()
      WHERE f2.follower_id = me.id AND f2.following_id = lp.id
    ) AS is_following
  FROM lensers.follows f
  JOIN lensers.profiles lp ON lp.id = CASE
    WHEN p_type = 'followers' THEN f.follower_id
    ELSE                           f.following_id
  END
  WHERE CASE
    WHEN p_type = 'followers' THEN f.following_id = p_lenser_id
    ELSE                           f.follower_id  = p_lenser_id
  END
    AND lp.status              = 'active'::"lensers"."lenser_status"
    AND lp.visibility          = 'public'::"lensers"."lenser_visibility"
    AND lp.deletion_requested_at IS NULL
  ORDER BY f.created_at DESC
  LIMIT  LEAST(p_limit, 100)
  OFFSET GREATEST(p_offset, 0);
$$;

ALTER FUNCTION "public"."fn_lensers_get_follows"(uuid, text, int, int) OWNER TO postgres;
REVOKE ALL ON FUNCTION "public"."fn_lensers_get_follows"(uuid, text, int, int) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION "public"."fn_lensers_get_follows"(uuid, text, int, int) TO anon;
GRANT EXECUTE ON FUNCTION "public"."fn_lensers_get_follows"(uuid, text, int, int) TO authenticated;
GRANT EXECUTE ON FUNCTION "public"."fn_lensers_get_follows"(uuid, text, int, int) TO service_role;

-- ──────────────────────────────────────────────────────────────────────────────
-- RPC: fn_content_follow_tag
-- Follow a tag. Idempotent.
-- ──────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION "public"."fn_content_follow_tag"(
  "p_tag_id" uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'lensers', 'content', 'auth'
AS $$
DECLARE
  v_lenser_id uuid;
BEGIN
  SELECT id INTO v_lenser_id
  FROM lensers.profiles
  WHERE user_id = auth.uid();

  IF v_lenser_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required or profile not found';
  END IF;

  -- Verify the tag is public
  IF NOT EXISTS (
    SELECT 1 FROM content.tags
    WHERE id = p_tag_id AND visibility = 'public'::"content"."tag_visibility_enum"
  ) THEN
    RAISE EXCEPTION 'Tag not found';
  END IF;

  INSERT INTO lensers.tag_follows (lenser_id, tag_id)
  VALUES (v_lenser_id, p_tag_id)
  ON CONFLICT (lenser_id, tag_id) DO NOTHING;

  RETURN jsonb_build_object('following', true);
END;
$$;

ALTER FUNCTION "public"."fn_content_follow_tag"(uuid) OWNER TO postgres;
REVOKE ALL ON FUNCTION "public"."fn_content_follow_tag"(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION "public"."fn_content_follow_tag"(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION "public"."fn_content_follow_tag"(uuid) TO service_role;

-- ──────────────────────────────────────────────────────────────────────────────
-- RPC: fn_content_unfollow_tag
-- Unfollow a tag. Idempotent.
-- ──────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION "public"."fn_content_unfollow_tag"(
  "p_tag_id" uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'lensers', 'content', 'auth'
AS $$
DECLARE
  v_lenser_id uuid;
BEGIN
  SELECT id INTO v_lenser_id
  FROM lensers.profiles
  WHERE user_id = auth.uid();

  IF v_lenser_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required or profile not found';
  END IF;

  DELETE FROM lensers.tag_follows
  WHERE lenser_id = v_lenser_id AND tag_id = p_tag_id;

  RETURN jsonb_build_object('following', false);
END;
$$;

ALTER FUNCTION "public"."fn_content_unfollow_tag"(uuid) OWNER TO postgres;
REVOKE ALL ON FUNCTION "public"."fn_content_unfollow_tag"(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION "public"."fn_content_unfollow_tag"(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION "public"."fn_content_unfollow_tag"(uuid) TO service_role;

-- ──────────────────────────────────────────────────────────────────────────────
-- RPC: fn_content_get_followed_tags
-- Returns tags the user follows with resolved display names.
-- ──────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION "public"."fn_content_get_followed_tags"(
  "p_lenser_id" uuid
)
RETURNS TABLE(
  tag_id      uuid,
  slug        text,
  name        text,
  followed_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path TO 'public', 'lensers', 'content'
AS $$
  SELECT
    t.id,
    t.slug,
    COALESCE(
      tt_pref.name,   -- preferred language first
      tt_en.name,     -- English fallback
      t.slug          -- final fallback: slug
    ) AS name,
    tf.created_at AS followed_at
  FROM lensers.tag_follows tf
  JOIN content.tags t ON t.id = tf.tag_id
  LEFT JOIN content.tag_translations tt_en
    ON tt_en.tag_id = t.id AND tt_en.language_code = 'en'
  LEFT JOIN content.tag_translations tt_pref
    ON tt_pref.tag_id = t.id
    AND tt_pref.language_code = (
      SELECT preferred_language FROM lensers.profiles WHERE id = p_lenser_id
    )
  WHERE tf.lenser_id = p_lenser_id
    AND t.visibility = 'public'::"content"."tag_visibility_enum"
  ORDER BY tf.created_at DESC;
$$;

ALTER FUNCTION "public"."fn_content_get_followed_tags"(uuid) OWNER TO postgres;
REVOKE ALL ON FUNCTION "public"."fn_content_get_followed_tags"(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION "public"."fn_content_get_followed_tags"(uuid) TO anon;
GRANT EXECUTE ON FUNCTION "public"."fn_content_get_followed_tags"(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION "public"."fn_content_get_followed_tags"(uuid) TO service_role;

-- ──────────────────────────────────────────────────────────────────────────────
-- RPC: fn_content_get_personal_threads
-- Personalized thread feed for an authenticated lenser.
--
-- Score formula (normalized weights summing to 1.0):
--   0.30 × tag_similarity      (Jaccard-style: matched tags / total interest tags)
--   0.25 × language_match      (1.0 if content lang = user preferred lang, else 0)
--   0.20 × normalized_hot_score (hot_score / 2.0, capped at 1.0)
--   0.15 × author_reputation   (lenser_score / 5.0, capped at 1.0)
--   0.10 × followed_author     (1.0 if content author is a followed lenser, else 0)
--
-- Interest tags = explicitly followed tags UNION tags from content liked in last 30 days.
-- SECURITY INVOKER: RLS on underlying tables applies; only public threads are visible.
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
  -- Explicit tag follows + tags inferred from recent reactions (30-day window)
  interest_tags AS (
    SELECT tag_id
    FROM lensers.tag_follows
    WHERE lenser_id = p_lenser_id
    UNION
    SELECT DISTINCT tm.tag_id
    FROM content.thread_reactions tr
    JOIN content.threads          t2 ON t2.id = tr.thread_id
    JOIN content.tag_map          tm ON tm.entity_id = t2.id
                                     AND tm.entity_type = 'thread'
    WHERE tr.user_id       = (SELECT user_id FROM user_pref)
      AND tr.created_at    > now() - interval '30 days'
  ),
  -- Fraction of interest tags present in each thread
  thread_tag_sim AS (
    SELECT
      tm.entity_id                                                  AS thread_id,
      COUNT(*)::float / GREATEST((SELECT COUNT(*) FROM interest_tags), 1) AS tag_sim
    FROM content.tag_map tm
    JOIN interest_tags   it ON it.tag_id = tm.tag_id
    WHERE tm.entity_type = 'thread'
    GROUP BY tm.entity_id
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
ORDER BY personal_score DESC
LIMIT  LEAST(p_limit,  50)
OFFSET GREATEST(p_offset, 0);
$$;

ALTER FUNCTION "public"."fn_content_get_personal_threads"(uuid, int, int) OWNER TO postgres;
REVOKE ALL ON FUNCTION "public"."fn_content_get_personal_threads"(uuid, int, int) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION "public"."fn_content_get_personal_threads"(uuid, int, int) TO authenticated;
GRANT EXECUTE ON FUNCTION "public"."fn_content_get_personal_threads"(uuid, int, int) TO service_role;

-- ──────────────────────────────────────────────────────────────────────────────
-- RPC: fn_content_get_personal_prompts
-- Personalized prompt feed. Same signal mix as fn_content_get_personal_threads.
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
      tm.entity_id                                                       AS prompt_id,
      COUNT(*)::float / GREATEST((SELECT COUNT(*) FROM interest_tags), 1) AS tag_sim
    FROM content.tag_map tm
    JOIN interest_tags   it ON it.tag_id = tm.tag_id
    WHERE tm.entity_type = 'prompt_template'
    GROUP BY tm.entity_id
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
ORDER BY personal_score DESC
LIMIT  LEAST(p_limit,  50)
OFFSET GREATEST(p_offset, 0);
$$;

ALTER FUNCTION "public"."fn_content_get_personal_prompts"(uuid, int, int) OWNER TO postgres;
REVOKE ALL ON FUNCTION "public"."fn_content_get_personal_prompts"(uuid, int, int) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION "public"."fn_content_get_personal_prompts"(uuid, int, int) TO authenticated;
GRANT EXECUTE ON FUNCTION "public"."fn_content_get_personal_prompts"(uuid, int, int) TO service_role;

-- ──────────────────────────────────────────────────────────────────────────────
-- RPC: fn_lensers_get_suggested
-- "Lensers You Should Follow" — ranks unfollowed lensers by:
--   0.60 × tag_overlap_score  (fraction of user interest tags they post under)
--   0.40 × normalized lenser_score
-- Only returns active, public lensers not already followed by the caller.
-- ──────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION "public"."fn_lensers_get_suggested"(
  "p_lenser_id" uuid,
  "p_limit"     int DEFAULT 10
)
RETURNS TABLE(
  lenser_id         uuid,
  handle            text,
  display_name      text,
  avatar_url        text,
  total_xp          bigint,
  current_level     int,
  lenser_score      float8,
  tag_overlap_score float8
)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path TO 'public', 'lensers', 'content'
AS $$
WITH
  interest_tags AS (
    SELECT tag_id FROM lensers.tag_follows WHERE lenser_id = p_lenser_id
  ),
  already_following AS (
    SELECT following_id FROM lensers.follows WHERE follower_id = p_lenser_id
  ),
  -- Per-author tag overlap: how many of the user's interest tags does this author post under?
  thread_author_tags AS (
    SELECT
      t.lenser_id,
      COUNT(DISTINCT it.tag_id)::float
        / GREATEST((SELECT COUNT(*) FROM interest_tags), 1) AS tag_score
    FROM content.threads    t
    JOIN content.tag_map    tm ON tm.entity_id = t.id AND tm.entity_type = 'thread'
    JOIN interest_tags      it ON it.tag_id = tm.tag_id
    WHERE t.visibility = 'public'::"content"."visibility_enum"
    GROUP BY t.lenser_id
  ),
  prompt_author_tags AS (
    SELECT
      pt.lenser_id,
      COUNT(DISTINCT it.tag_id)::float
        / GREATEST((SELECT COUNT(*) FROM interest_tags), 1) AS tag_score
    FROM content.prompt_templates pt
    JOIN content.tag_map           tm ON tm.entity_id = pt.id AND tm.entity_type = 'prompt_template'
    JOIN interest_tags             it ON it.tag_id = tm.tag_id
    WHERE pt.visibility = 'public'::"content"."visibility_enum"
    GROUP BY pt.lenser_id
  ),
  author_tag_agg AS (
    SELECT lenser_id, AVG(tag_score) AS tag_overlap_score
    FROM (
      SELECT lenser_id, tag_score FROM thread_author_tags
      UNION ALL
      SELECT lenser_id, tag_score FROM prompt_author_tags
    ) combined
    GROUP BY lenser_id
  )
SELECT
  ls.lenser_id,
  ls.handle,
  ls.display_name,
  ls.avatar_url,
  ls.total_xp,
  ls.current_level,
  ls.lenser_score,
  COALESCE(agg.tag_overlap_score, 0.0) AS tag_overlap_score
FROM lensers.vw_lensers_score      ls
LEFT JOIN author_tag_agg           agg ON agg.lenser_id = ls.lenser_id
WHERE ls.lenser_id <> p_lenser_id
  AND ls.lenser_id NOT IN (SELECT following_id FROM already_following)
ORDER BY (
  0.60 * COALESCE(agg.tag_overlap_score, 0.0)
  + 0.40 * LEAST(ls.lenser_score / 5.0, 1.0)
) DESC
LIMIT LEAST(p_limit, 50);
$$;

ALTER FUNCTION "public"."fn_lensers_get_suggested"(uuid, int) OWNER TO postgres;
REVOKE ALL ON FUNCTION "public"."fn_lensers_get_suggested"(uuid, int) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION "public"."fn_lensers_get_suggested"(uuid, int) TO authenticated;
GRANT EXECUTE ON FUNCTION "public"."fn_lensers_get_suggested"(uuid, int) TO service_role;
