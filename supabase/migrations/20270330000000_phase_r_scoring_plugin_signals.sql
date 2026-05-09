-- Phase R2: Scoring plugin signal sink
--
-- Durable per-(battle, plugin_id) record of arbitrary plugin output. The
-- finalisation pipeline (battles.fn_battles_finalize and friends) is NOT
-- modified here; this migration only provides the storage and a write path
-- callable by the TS plugin host. The host runs under service_role and is
-- responsible for invoking plugins and recording their signals.
--
-- The unique (battle_id, plugin_id) constraint makes the recorder idempotent
-- on retries: the same plugin re-running for the same battle overwrites its
-- previous signals row instead of accumulating duplicates.

-- ─── 1. Table ──────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS battles.scoring_plugin_signals (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  battle_id   uuid        NOT NULL REFERENCES battles.battles(id) ON DELETE CASCADE,
  plugin_id   text        NOT NULL,
  signals     jsonb       NOT NULL DEFAULT '{}'::jsonb,
  recorded_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT scoring_plugin_signals_battle_plugin_uq UNIQUE (battle_id, plugin_id)
);

ALTER TABLE battles.scoring_plugin_signals OWNER TO postgres;

CREATE INDEX IF NOT EXISTS idx_scoring_plugin_signals_battle
  ON battles.scoring_plugin_signals (battle_id, recorded_at DESC);

COMMENT ON TABLE battles.scoring_plugin_signals IS
  'Phase R2: durable sink for scoring plugin outputs. One row per '
  '(battle_id, plugin_id). Written by service_role via '
  'public.fn_record_scoring_plugin_signal. Consumed downstream by the '
  'finaliser/visualisations; no schema-level dependency from finalize is '
  'introduced in this migration.';

-- RLS: writes are service_role only; we still enable RLS so direct
-- authenticated reads/writes are blocked by default.
ALTER TABLE battles.scoring_plugin_signals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS scoring_plugin_signals_battle_creator_select
  ON battles.scoring_plugin_signals;
-- Battle creator may inspect signals attached to their own battles.
CREATE POLICY scoring_plugin_signals_battle_creator_select
  ON battles.scoring_plugin_signals
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM battles.battles b
      WHERE b.id = battle_id
        AND b.creator_lenser_id = lensers.get_auth_lenser_id()
    )
  );

GRANT SELECT ON TABLE battles.scoring_plugin_signals TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE
  ON TABLE battles.scoring_plugin_signals TO service_role;

-- ─── 2. RPC ────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.fn_record_scoring_plugin_signal(
  p_battle_id uuid,
  p_plugin_id text,
  p_signals   jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, battles
AS $$
BEGIN
  IF p_battle_id IS NULL THEN
    RAISE EXCEPTION 'battle_id required' USING ERRCODE = '22023';
  END IF;
  IF p_plugin_id IS NULL OR length(trim(p_plugin_id)) = 0 THEN
    RAISE EXCEPTION 'plugin_id required' USING ERRCODE = '22023';
  END IF;

  INSERT INTO battles.scoring_plugin_signals (battle_id, plugin_id, signals, recorded_at)
  VALUES (p_battle_id, p_plugin_id, COALESCE(p_signals, '{}'::jsonb), now())
  ON CONFLICT (battle_id, plugin_id) DO UPDATE
    SET signals     = EXCLUDED.signals,
        recorded_at = EXCLUDED.recorded_at;
END;
$$;

ALTER FUNCTION public.fn_record_scoring_plugin_signal(uuid, text, jsonb) OWNER TO postgres;

REVOKE ALL ON FUNCTION public.fn_record_scoring_plugin_signal(uuid, text, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.fn_record_scoring_plugin_signal(uuid, text, jsonb)
  TO service_role;

COMMENT ON FUNCTION public.fn_record_scoring_plugin_signal(uuid, text, jsonb) IS
  'Phase R2: upserts a (battle_id, plugin_id) row in '
  'battles.scoring_plugin_signals. Service-role only — plugins run server '
  'side under service_role. battles.fn_battles_finalize is intentionally '
  'left untouched in this migration.';
