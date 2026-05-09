-- Phase V4: Battle series — recurring rematch chains driven by pg_cron
--
-- Builds on Phase V1 (20270425000000_phase_v_battle_rematches.sql) which
-- introduced battles.battles.parent_battle_id, the clone helper
-- battles.fn_clone_battle_for_rematch, and the service-role internal entry
-- point battles.fn_create_rematch_internal.
--
-- A "series" is an owner-curated chain of battles. The most recent battle
-- in the chain is used as the parent for the next rematch when the cron
-- expression matches the current hour. Each series carries:
--
--   * seed_battle_id  — the original battle the chain was forked from. The
--                       dispatcher falls back to this when the chain has no
--                       members yet (defensive — V4.3 always seeds position=1).
--   * cron_expr       — 5-field cron expression evaluated by
--                       lenses.fn_cron_matches_now (existing helper).
--   * next_dispatch_at — a coarse advisory pointer used to skip series that
--                        clearly aren't due. The cron expression is the
--                        authoritative gate; next_dispatch_at is just an
--                        index-friendly cheap filter.
--
-- The dispatcher is registered with pg_cron at `0 * * * *` (top of every
-- hour). That cadence is the upper bound on series granularity; sub-hourly
-- cron_expr values will still only fire hourly.

-- ─── 1. battles.series ──────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS battles.series (
  id                   uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_lenser_id    uuid        NOT NULL,
  name                 text        NOT NULL,
  slug                 text        NOT NULL UNIQUE,
  seed_battle_id       uuid        NOT NULL REFERENCES battles.battles(id) ON DELETE CASCADE,
  cron_expr            text        NOT NULL,
  next_dispatch_at     timestamptz NOT NULL DEFAULT now(),
  is_active            boolean     NOT NULL DEFAULT true,
  created_at           timestamptz NOT NULL DEFAULT now(),
  updated_at           timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT series_name_nonempty CHECK (length(btrim(name)) > 0),
  CONSTRAINT series_slug_shape    CHECK (slug ~ '^[a-z0-9][a-z0-9-]{0,127}$'),
  CONSTRAINT series_cron_5fields  CHECK (array_length(regexp_split_to_array(btrim(cron_expr), '\s+'), 1) = 5)
);

ALTER TABLE battles.series OWNER TO postgres;

COMMENT ON TABLE battles.series IS
  'Phase V4: owner-curated chains of battles. Each tick of the dispatcher '
  'spawns a rematch from the most recent member (or seed_battle_id when the '
  'chain is empty). Owner-only RLS.';

COMMENT ON COLUMN battles.series.seed_battle_id IS
  'The original battle the chain was forked from. Defensive fallback only — '
  'V4.3 always inserts the seed at position=1 in series_battles.';

COMMENT ON COLUMN battles.series.cron_expr IS
  'Standard 5-field cron expression evaluated hourly by '
  'lenses.fn_cron_matches_now. Granularity is bounded by the dispatcher '
  'cadence (top-of-hour); sub-hourly values still fire at most hourly.';

COMMENT ON COLUMN battles.series.next_dispatch_at IS
  'Cheap index-friendly filter. The cron expression is authoritative; this '
  'is only used to skip series that are clearly not due yet.';

CREATE INDEX IF NOT EXISTS idx_battles_series_next_dispatch_active
  ON battles.series (next_dispatch_at)
  WHERE is_active;

CREATE INDEX IF NOT EXISTS idx_battles_series_creator
  ON battles.series (creator_lenser_id);

-- updated_at trigger (mirrors lenses.fn_schedule_calendars_touch_updated style)
CREATE OR REPLACE FUNCTION battles.fn_series_touch_updated()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

ALTER FUNCTION battles.fn_series_touch_updated() OWNER TO postgres;

DROP TRIGGER IF EXISTS trg_series_touch_updated ON battles.series;
CREATE TRIGGER trg_series_touch_updated
  BEFORE UPDATE ON battles.series
  FOR EACH ROW
  EXECUTE FUNCTION battles.fn_series_touch_updated();

-- RLS: owner-only across all verbs
ALTER TABLE battles.series ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS series_select ON battles.series;
CREATE POLICY series_select
  ON battles.series
  FOR SELECT
  TO authenticated
  USING (creator_lenser_id = lensers.get_auth_lenser_id());

DROP POLICY IF EXISTS series_insert ON battles.series;
CREATE POLICY series_insert
  ON battles.series
  FOR INSERT
  TO authenticated
  WITH CHECK (creator_lenser_id = lensers.get_auth_lenser_id());

DROP POLICY IF EXISTS series_update ON battles.series;
CREATE POLICY series_update
  ON battles.series
  FOR UPDATE
  TO authenticated
  USING (creator_lenser_id = lensers.get_auth_lenser_id())
  WITH CHECK (creator_lenser_id = lensers.get_auth_lenser_id());

DROP POLICY IF EXISTS series_delete ON battles.series;
CREATE POLICY series_delete
  ON battles.series
  FOR DELETE
  TO authenticated
  USING (creator_lenser_id = lensers.get_auth_lenser_id());

GRANT SELECT, INSERT, UPDATE, DELETE ON battles.series TO authenticated;
GRANT ALL ON battles.series TO service_role;

-- ─── 2. battles.series_battles ──────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS battles.series_battles (
  series_id   uuid NOT NULL REFERENCES battles.series(id)  ON DELETE CASCADE,
  battle_id   uuid NOT NULL REFERENCES battles.battles(id) ON DELETE CASCADE,
  position    int  NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (series_id, battle_id),
  CONSTRAINT series_battles_position_positive CHECK (position >= 1)
);

ALTER TABLE battles.series_battles OWNER TO postgres;

COMMENT ON TABLE battles.series_battles IS
  'Phase V4: ordered membership of a battle in a series. position=1 is the '
  'seed; the dispatcher appends position=max+1 on each rematch tick. '
  'Owner-only RLS via the parent series.';

CREATE UNIQUE INDEX IF NOT EXISTS uq_series_battles_series_position
  ON battles.series_battles (series_id, position);

CREATE INDEX IF NOT EXISTS idx_series_battles_series_position
  ON battles.series_battles (series_id, position);

CREATE INDEX IF NOT EXISTS idx_series_battles_battle
  ON battles.series_battles (battle_id);

ALTER TABLE battles.series_battles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS series_battles_select ON battles.series_battles;
CREATE POLICY series_battles_select
  ON battles.series_battles
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
        FROM battles.series s
       WHERE s.id = series_battles.series_id
         AND s.creator_lenser_id = lensers.get_auth_lenser_id()
    )
  );

DROP POLICY IF EXISTS series_battles_insert ON battles.series_battles;
CREATE POLICY series_battles_insert
  ON battles.series_battles
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1
        FROM battles.series s
       WHERE s.id = series_battles.series_id
         AND s.creator_lenser_id = lensers.get_auth_lenser_id()
    )
  );

DROP POLICY IF EXISTS series_battles_update ON battles.series_battles;
CREATE POLICY series_battles_update
  ON battles.series_battles
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
        FROM battles.series s
       WHERE s.id = series_battles.series_id
         AND s.creator_lenser_id = lensers.get_auth_lenser_id()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
        FROM battles.series s
       WHERE s.id = series_battles.series_id
         AND s.creator_lenser_id = lensers.get_auth_lenser_id()
    )
  );

DROP POLICY IF EXISTS series_battles_delete ON battles.series_battles;
CREATE POLICY series_battles_delete
  ON battles.series_battles
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
        FROM battles.series s
       WHERE s.id = series_battles.series_id
         AND s.creator_lenser_id = lensers.get_auth_lenser_id()
    )
  );

GRANT SELECT, INSERT, UPDATE, DELETE ON battles.series_battles TO authenticated;
GRANT ALL ON battles.series_battles TO service_role;

-- ─── 3. Series creation helper ─────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.fn_battles_series_create(
  p_name           text,
  p_seed_battle_id uuid,
  p_cron_expr      text
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, battles, lensers
AS $$
DECLARE
  v_caller    uuid;
  v_owner     uuid;
  v_series_id uuid;
  v_slug      text;
  v_parts     text[];
BEGIN
  v_caller := lensers.get_auth_lenser_id();
  IF v_caller IS NULL THEN
    RAISE EXCEPTION 'authentication_required' USING ERRCODE = '42501';
  END IF;

  IF p_name IS NULL OR length(btrim(p_name)) = 0 THEN
    RAISE EXCEPTION 'series_name_required' USING ERRCODE = '22023';
  END IF;

  v_parts := regexp_split_to_array(btrim(COALESCE(p_cron_expr, '')), '\s+');
  IF array_length(v_parts, 1) <> 5 THEN
    RAISE EXCEPTION 'invalid_cron_expression: expected 5 fields'
      USING ERRCODE = '22023';
  END IF;

  SELECT creator_lenser_id INTO v_owner
    FROM battles.battles
   WHERE id = p_seed_battle_id
     AND deleted_at IS NULL;

  IF v_owner IS NULL THEN
    RAISE EXCEPTION 'seed_battle_not_found: %', p_seed_battle_id
      USING ERRCODE = 'P0002';
  END IF;

  IF v_owner IS DISTINCT FROM v_caller THEN
    RAISE EXCEPTION 'not_battle_owner' USING ERRCODE = '42501';
  END IF;

  -- Slug: kebab-case from name + 6 random hex; bounded to <= 128 chars.
  v_slug := substr(
    regexp_replace(
      regexp_replace(lower(p_name), '[^a-z0-9]+', '-', 'g'),
      '(^-+|-+$)', '', 'g'
    ),
    1, 110
  );
  IF length(v_slug) = 0 THEN
    v_slug := 'series';
  END IF;
  v_slug := v_slug || '-' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 6);

  INSERT INTO battles.series (
    creator_lenser_id, name, slug, seed_battle_id, cron_expr,
    next_dispatch_at, is_active
  )
  VALUES (
    v_caller, btrim(p_name), v_slug, p_seed_battle_id, btrim(p_cron_expr),
    -- Earliest the dispatcher can pick it up: the next top-of-hour tick.
    date_trunc('hour', now()) + interval '1 hour',
    true
  )
  RETURNING id INTO v_series_id;

  -- Seed at position=1.
  INSERT INTO battles.series_battles (series_id, battle_id, position)
  VALUES (v_series_id, p_seed_battle_id, 1);

  RETURN v_series_id;
END;
$$;

ALTER FUNCTION public.fn_battles_series_create(text, uuid, text) OWNER TO postgres;
REVOKE ALL ON FUNCTION public.fn_battles_series_create(text, uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.fn_battles_series_create(text, uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.fn_battles_series_create(text, uuid, text) TO service_role;

COMMENT ON FUNCTION public.fn_battles_series_create(text, uuid, text) IS
  'Phase V4: create a battle series anchored to a seed battle the caller '
  'owns. Inserts the seed at position=1 and primes next_dispatch_at to the '
  'next top-of-hour tick. Returns the new series id.';

-- ─── 4. Series dispatcher RPC ──────────────────────────────────────────────
--
-- Iterates active series whose next_dispatch_at has been reached, evaluates
-- the cron expression against now() via lenses.fn_cron_matches_now, and
-- spawns a rematch via the service-role internal entry point.
--
-- The dispatcher always advances next_dispatch_at by one hour regardless of
-- whether the cron matched, because the dispatcher itself runs hourly.
-- A non-matching tick is therefore "checked but skipped".

CREATE OR REPLACE FUNCTION battles.fn_dispatch_series_rematches()
RETURNS int
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, battles, lensers, lenses
AS $$
DECLARE
  v_series       record;
  v_parent_id    uuid;
  v_new_id       uuid;
  v_next_pos     int;
  v_count        int := 0;
  v_now          timestamptz := now();
BEGIN
  FOR v_series IN
    SELECT id, seed_battle_id, cron_expr
      FROM battles.series
     WHERE is_active = true
       AND next_dispatch_at <= v_now
     ORDER BY next_dispatch_at ASC
  LOOP
    BEGIN
      -- Cron-gate. If the expression doesn't match this hour, advance the
      -- pointer and move on.
      IF NOT lenses.fn_cron_matches_now(v_series.cron_expr, v_now) THEN
        UPDATE battles.series
           SET next_dispatch_at = date_trunc('hour', v_now) + interval '1 hour'
         WHERE id = v_series.id;
        CONTINUE;
      END IF;

      -- Find the parent: most recent member of the chain, fallback to seed.
      SELECT sb.battle_id, sb.position + 1
        INTO v_parent_id, v_next_pos
        FROM battles.series_battles sb
       WHERE sb.series_id = v_series.id
       ORDER BY sb.position DESC
       LIMIT 1;

      IF v_parent_id IS NULL THEN
        v_parent_id := v_series.seed_battle_id;
        v_next_pos  := 1;
      END IF;

      -- Spawn the rematch via the service-role internal entry point. This
      -- bypasses the caller-ownership check, which is correct here because
      -- the dispatcher runs as service_role and only iterates series that
      -- their owners explicitly created.
      v_new_id := battles.fn_create_rematch_internal(v_parent_id);

      INSERT INTO battles.series_battles (series_id, battle_id, position)
      VALUES (v_series.id, v_new_id, v_next_pos);

      UPDATE battles.series
         SET next_dispatch_at = date_trunc('hour', v_now) + interval '1 hour'
       WHERE id = v_series.id;

      v_count := v_count + 1;

    EXCEPTION WHEN OTHERS THEN
      -- Per-series isolation: never let one bad series block the rest.
      -- Advance the pointer so we don't busy-loop on a permanently broken
      -- series at every dispatcher tick.
      UPDATE battles.series
         SET next_dispatch_at = date_trunc('hour', v_now) + interval '1 hour'
       WHERE id = v_series.id;
      RAISE WARNING 'series_dispatch_failed: series_id=%, sqlstate=%, message=%',
        v_series.id, SQLSTATE, SQLERRM;
    END;
  END LOOP;

  RETURN v_count;
END;
$$;

ALTER FUNCTION battles.fn_dispatch_series_rematches() OWNER TO postgres;
REVOKE ALL ON FUNCTION battles.fn_dispatch_series_rematches() FROM PUBLIC;
REVOKE ALL ON FUNCTION battles.fn_dispatch_series_rematches() FROM authenticated;
GRANT EXECUTE ON FUNCTION battles.fn_dispatch_series_rematches() TO service_role;

COMMENT ON FUNCTION battles.fn_dispatch_series_rematches() IS
  'Phase V4 dispatcher. Hourly cron entry point. Advances every active '
  'series whose cron expression matches now(), spawning a rematch via '
  'battles.fn_create_rematch_internal. Per-series errors are swallowed '
  'and logged as WARNING so one bad series cannot block the rest. '
  'Service role only.';

-- ─── 5. pg_cron registration ───────────────────────────────────────────────

DO $do$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    RETURN;
  END IF;

  PERFORM cron.unschedule('series-rematch-dispatcher')
    WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'series-rematch-dispatcher');

  PERFORM cron.schedule(
    'series-rematch-dispatcher',
    '0 * * * *',
    $$SELECT battles.fn_dispatch_series_rematches()$$
  );
END;
$do$;
