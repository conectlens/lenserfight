-- Phase 20: Public Result Showcase & Discovery
-- Adds vote_velocity and og_image_url to battles, trending feed RPC,
-- and wires fn_battles_publish_internal to trigger OG image generation.

-- ─── 1. Schema columns ──────────────────────────────────────────────────────

ALTER TABLE battles.battles
  ADD COLUMN IF NOT EXISTS vote_velocity  NUMERIC(8,4) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS og_image_url   TEXT;

CREATE INDEX IF NOT EXISTS idx_battles_trending
  ON battles.battles (vote_velocity DESC, total_vote_count DESC)
  WHERE status = 'published';

-- ─── 2. fn_refresh_vote_velocity ─────────────────────────────────────────────

CREATE OR REPLACE FUNCTION battles.fn_refresh_vote_velocity(p_battle_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = battles
AS $$
DECLARE
  v_published_at TIMESTAMPTZ;
  v_hours        NUMERIC;
  v_votes_24h    INT;
BEGIN
  SELECT published_at INTO v_published_at FROM battles.battles WHERE id = p_battle_id;
  IF v_published_at IS NULL THEN RETURN; END IF;

  v_hours := GREATEST(1, EXTRACT(EPOCH FROM (now() - v_published_at)) / 3600.0);

  SELECT COUNT(*) INTO v_votes_24h
  FROM   battles.votes
  WHERE  battle_id  = p_battle_id
  AND    created_at >= now() - INTERVAL '24 hours';

  UPDATE battles.battles
  SET    vote_velocity = ROUND((v_votes_24h / v_hours)::NUMERIC, 4)
  WHERE  id = p_battle_id;
END;
$$;

-- Trigger to refresh velocity on each new vote
CREATE OR REPLACE FUNCTION battles.trg_refresh_vote_velocity()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  PERFORM battles.fn_refresh_vote_velocity(NEW.battle_id);
  RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER trg_vote_refresh_velocity
AFTER INSERT ON battles.votes
FOR EACH ROW EXECUTE FUNCTION battles.trg_refresh_vote_velocity();

-- ─── 3. fn_refresh_all_vote_velocities (pg_cron) ─────────────────────────────

CREATE OR REPLACE FUNCTION battles.fn_refresh_all_vote_velocities()
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = battles
AS $$
DECLARE
  r        RECORD;
  refreshed INT := 0;
BEGIN
  FOR r IN
    SELECT DISTINCT b.id
    FROM   battles.battles b
    JOIN   battles.votes v ON v.battle_id = b.id
    WHERE  b.status = 'published'
    AND    v.created_at >= now() - INTERVAL '48 hours'
  LOOP
    PERFORM battles.fn_refresh_vote_velocity(r.id);
    refreshed := refreshed + 1;
  END LOOP;
  RETURN refreshed;
END;
$$;

DO $do$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    PERFORM cron.schedule(
      'refresh-vote-velocities',
      '*/15 * * * *',
      $$SELECT battles.fn_refresh_all_vote_velocities()$$
    );
  END IF;
END;
$do$;

-- ─── 4. fn_get_trending_battles ──────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.fn_get_trending_battles(
  p_limit  INT     DEFAULT 20,
  p_cursor NUMERIC DEFAULT NULL
)
RETURNS TABLE (
  id                UUID,
  slug              TEXT,
  title             TEXT,
  status            TEXT,
  published_at      TIMESTAMPTZ,
  battle_type       TEXT,
  total_vote_count  INT,
  vote_velocity     NUMERIC,
  og_image_url      TEXT,
  contender_a_name  TEXT,
  contender_b_name  TEXT,
  winner_slot       TEXT
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = battles, public
AS $$
  SELECT
    b.id, b.slug, b.title, b.status::TEXT, b.published_at,
    b.battle_type::TEXT, b.total_vote_count, b.vote_velocity, b.og_image_url,
    ca.display_name AS contender_a_name,
    cb.display_name AS contender_b_name,
    CASE
      WHEN b.winner_contender_id = ca.id THEN 'A'
      WHEN b.winner_contender_id = cb.id THEN 'B'
      ELSE NULL
    END AS winner_slot
  FROM battles.battles b
  LEFT JOIN battles.contenders ca ON ca.battle_id = b.id AND ca.slot = 'A'
  LEFT JOIN battles.contenders cb ON cb.battle_id = b.id AND cb.slot = 'B'
  WHERE b.status = 'published'
  AND   b.published_at >= now() - INTERVAL '7 days'
  AND   (p_cursor IS NULL OR b.vote_velocity < p_cursor)
  ORDER BY b.vote_velocity DESC, b.total_vote_count DESC
  LIMIT p_limit;
$$;

-- ─── 5. Wire og_image_url update from fn_battles_publish_internal ─────────────
-- fn_battles_publish_internal (Phase 17) fires pg_net to the edge function.
-- Update it to pass the og_image payload.

CREATE OR REPLACE FUNCTION battles.fn_battles_publish_internal(p_battle_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = battles, public
AS $$
DECLARE
  v_battle  battles.battles;
  v_winner  battles.contenders;
  v_ca      battles.contenders;
  v_cb      battles.contenders;
BEGIN
  UPDATE battles.battles
  SET    status       = 'published',
         published_at = now()
  WHERE  id     = p_battle_id
  AND    status = 'closed';

  SELECT * INTO v_battle FROM battles.battles WHERE id = p_battle_id;

  SELECT * INTO v_ca FROM battles.contenders WHERE battle_id = p_battle_id AND slot = 'A' LIMIT 1;
  SELECT * INTO v_cb FROM battles.contenders WHERE battle_id = p_battle_id AND slot = 'B' LIMIT 1;

  IF v_battle.winner_contender_id IS NOT NULL THEN
    SELECT * INTO v_winner FROM battles.contenders WHERE id = v_battle.winner_contender_id;
  END IF;

  -- Fire OG image generation (pg_net, graceful degradation)
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_net')
     AND current_setting('app.supabase_url', true) IS NOT NULL
  THEN
    PERFORM net.http_post(
      url     := current_setting('app.supabase_url') || '/functions/v1/generate-battle-og-image',
      headers := jsonb_build_object(
        'Content-Type',  'application/json',
        'Authorization', 'Bearer ' || current_setting('app.service_role_key', true)
      ),
      body    := jsonb_build_object(
        'battle_id',          p_battle_id,
        'title',              v_battle.title,
        'winner_name',        COALESCE(v_winner.display_name, null),
        'contender_a_name',   COALESCE(v_ca.display_name, 'Contender A'),
        'contender_b_name',   COALESCE(v_cb.display_name, 'Contender B')
      )
    );
  END IF;

  -- Notify participants
  IF EXISTS (
    SELECT 1 FROM pg_proc
    WHERE  proname = 'fn_notify_battle_result'
    AND    pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
  ) THEN
    PERFORM public.fn_notify_battle_result(p_battle_id);
  END IF;

  INSERT INTO audit.events (event_type, payload)
  VALUES ('battle.auto_published', jsonb_build_object('battle_id', p_battle_id));
END;
$$;
