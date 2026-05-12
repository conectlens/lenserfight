-- Phase BH — Battle series & multi-round templates.
--
-- A series defines a best-of-N tournament played as a sequence of full battles
-- all derived from the same template. fn_advance_series promotes the winner
-- of the current round and seeds the next battle; once round_count battles
-- complete it stamps the series 'complete'.
--
-- Tables:
--   battles.series         - the series itself (1 row per N-round event)
--   battles.series_rounds  - one row per round, FK to a battles.battles row
--
-- RPCs:
--   public.fn_create_battle_series  - owner creates a series + round 1 battle
--   public.fn_advance_series        - owner promotes winner / closes series
--   public.fn_get_series            - anyone reads basic + per-round summary

-- ── 1. tables ───────────────────────────────────────────────────────────────
-- Drop the Phase-V cron-dispatch series table (and any dependents) so we can
-- replace it with the round-based tournament schema introduced here.
DROP TABLE IF EXISTS battles.series_battles CASCADE;
DROP TABLE IF EXISTS battles.series CASCADE;

CREATE TABLE IF NOT EXISTS battles.series (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  title             TEXT        NOT NULL
                      CHECK (char_length(title) BETWEEN 1 AND 200),
  template_id       UUID        NOT NULL REFERENCES battles.templates(id) ON DELETE CASCADE,
  creator_lenser_id UUID        NOT NULL,
  round_count       INT         NOT NULL DEFAULT 3
                      CHECK (round_count BETWEEN 1 AND 16),
  current_round     INT         NOT NULL DEFAULT 1
                      CHECK (current_round >= 1),
  status            TEXT        NOT NULL DEFAULT 'active'
                      CHECK (status IN ('active', 'complete')),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_battles_series_creator
  ON battles.series (creator_lenser_id);

CREATE TABLE IF NOT EXISTS battles.series_rounds (
  id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  series_id           UUID        NOT NULL REFERENCES battles.series(id) ON DELETE CASCADE,
  round_number        INT         NOT NULL CHECK (round_number >= 1),
  battle_id           UUID        NOT NULL REFERENCES battles.battles(id) ON DELETE CASCADE,
  winner_contender_id UUID        REFERENCES battles.contenders(id) ON DELETE SET NULL,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (series_id, round_number)
);

CREATE INDEX IF NOT EXISTS idx_series_rounds_battle
  ON battles.series_rounds (battle_id);

-- ── 2. RLS ──────────────────────────────────────────────────────────────────
ALTER TABLE battles.series          ENABLE ROW LEVEL SECURITY;
ALTER TABLE battles.series_rounds   ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS series_select ON battles.series;
CREATE POLICY series_select ON battles.series
  FOR SELECT
  USING (
    creator_lenser_id = auth.uid()
    OR EXISTS (
      SELECT 1
        FROM battles.series_rounds sr
        JOIN battles.battles b ON b.id = sr.battle_id
       WHERE sr.series_id = battles.series.id
         AND b.status::text = 'published'
    )
  );

DROP POLICY IF EXISTS series_rounds_select ON battles.series_rounds;
CREATE POLICY series_rounds_select ON battles.series_rounds
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM battles.series s
       WHERE s.id = battles.series_rounds.series_id
         AND s.creator_lenser_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM battles.battles b
       WHERE b.id = battles.series_rounds.battle_id
         AND b.status::text = 'published'
    )
  );

-- ── 3. fn_create_battle_series ──────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.fn_create_battle_series(
  p_template_id UUID,
  p_title       TEXT,
  p_round_count INT DEFAULT 3
)
RETURNS battles.series
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, battles, extensions
AS $$
DECLARE
  v_uid       UUID := auth.uid();
  v_template  battles.templates%ROWTYPE;
  v_series    battles.series%ROWTYPE;
  v_battle_id UUID;
  v_slug      TEXT;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'auth_required' USING ERRCODE = '42501';
  END IF;
  IF p_round_count IS NULL OR p_round_count < 1 OR p_round_count > 16 THEN
    RAISE EXCEPTION 'invalid_round_count' USING ERRCODE = '22023';
  END IF;

  SELECT * INTO v_template
    FROM battles.templates
   WHERE id = p_template_id
     AND deleted_at IS NULL
     AND (is_public = true OR creator_lenser_id = v_uid);
  IF v_template IS NULL THEN
    RAISE EXCEPTION 'template_not_accessible' USING ERRCODE = '42501';
  END IF;

  INSERT INTO battles.series (title, template_id, creator_lenser_id, round_count)
  VALUES (p_title, p_template_id, v_uid, p_round_count)
  RETURNING * INTO v_series;

  v_slug := lower(regexp_replace(p_title, '[^a-zA-Z0-9]+', '-', 'g'))
            || '-r1-' || substr(v_series.id::text, 1, 8);

  v_battle_id := public.fn_battles_create_from_template(
    p_template_id, p_title || ' — Round 1', v_slug
  );

  INSERT INTO battles.series_rounds (series_id, round_number, battle_id)
  VALUES (v_series.id, 1, v_battle_id);

  RETURN v_series;
END $$;

ALTER FUNCTION public.fn_create_battle_series(UUID, TEXT, INT) OWNER TO postgres;
GRANT EXECUTE ON FUNCTION public.fn_create_battle_series(UUID, TEXT, INT)
  TO authenticated, service_role;

-- ── 4. fn_advance_series ────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.fn_advance_series(
  p_series_id UUID
)
RETURNS battles.series
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, battles, extensions
AS $$
DECLARE
  v_uid       UUID := auth.uid();
  v_series    battles.series%ROWTYPE;
  v_current   battles.series_rounds%ROWTYPE;
  v_winner    UUID;
  v_battle_id UUID;
  v_slug      TEXT;
  v_next      INT;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'auth_required' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO v_series FROM battles.series WHERE id = p_series_id;
  IF v_series IS NULL THEN
    RAISE EXCEPTION 'series_not_found' USING ERRCODE = '42501';
  END IF;
  IF v_series.creator_lenser_id <> v_uid THEN
    RAISE EXCEPTION 'series_not_owned' USING ERRCODE = '42501';
  END IF;
  IF v_series.status = 'complete' THEN
    RETURN v_series;
  END IF;

  SELECT * INTO v_current
    FROM battles.series_rounds
   WHERE series_id    = p_series_id
     AND round_number = v_series.current_round;

  -- Resolve the winner from battles.battles.winner_contender_id; stamp it
  -- on the series_rounds row as the canonical record.
  SELECT b.winner_contender_id INTO v_winner
    FROM battles.battles b
   WHERE b.id = v_current.battle_id;
  IF v_winner IS NULL THEN
    RAISE EXCEPTION 'current_round_has_no_winner' USING ERRCODE = '22023';
  END IF;

  UPDATE battles.series_rounds
     SET winner_contender_id = v_winner
   WHERE id = v_current.id;

  v_next := v_series.current_round + 1;
  IF v_next > v_series.round_count THEN
    UPDATE battles.series
       SET status     = 'complete',
           updated_at = now()
     WHERE id = p_series_id
     RETURNING * INTO v_series;
    RETURN v_series;
  END IF;

  v_slug := lower(regexp_replace(v_series.title, '[^a-zA-Z0-9]+', '-', 'g'))
            || '-r' || v_next::text || '-' || substr(p_series_id::text, 1, 8);

  v_battle_id := public.fn_battles_create_from_template(
    v_series.template_id,
    v_series.title || ' — Round ' || v_next::text,
    v_slug
  );

  INSERT INTO battles.series_rounds (series_id, round_number, battle_id)
  VALUES (p_series_id, v_next, v_battle_id);

  UPDATE battles.series
     SET current_round = v_next,
         updated_at    = now()
   WHERE id = p_series_id
   RETURNING * INTO v_series;

  RETURN v_series;
END $$;

ALTER FUNCTION public.fn_advance_series(UUID) OWNER TO postgres;
GRANT EXECUTE ON FUNCTION public.fn_advance_series(UUID)
  TO authenticated, service_role;

-- ── 5. fn_get_series ────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.fn_get_series(
  p_series_id UUID
)
RETURNS TABLE (
  series_id           UUID,
  title               TEXT,
  template_id         UUID,
  creator_lenser_id   UUID,
  round_count         INT,
  current_round       INT,
  status              TEXT,
  round_number        INT,
  battle_id           UUID,
  battle_slug         TEXT,
  battle_status       TEXT,
  winner_contender_id UUID
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, battles, extensions
AS $$
  SELECT s.id, s.title, s.template_id, s.creator_lenser_id, s.round_count,
         s.current_round, s.status,
         sr.round_number, sr.battle_id, b.slug, b.status::text, sr.winner_contender_id
    FROM battles.series s
    LEFT JOIN battles.series_rounds sr ON sr.series_id = s.id
    LEFT JOIN battles.battles b ON b.id = sr.battle_id
   WHERE s.id = p_series_id
     AND (
       s.creator_lenser_id = auth.uid()
       OR b.status::text = 'published'
     )
   ORDER BY sr.round_number;
$$;

ALTER FUNCTION public.fn_get_series(UUID) OWNER TO postgres;
GRANT EXECUTE ON FUNCTION public.fn_get_series(UUID)
  TO authenticated, service_role;
