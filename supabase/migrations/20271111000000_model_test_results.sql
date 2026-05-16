-- Phase BJ — AI Model conformance test results.
--
-- Append-only ledger of model conformance runs. Each row captures the
-- provider + model + prompt hash + pass/fail + raw output.
--
-- Append-only — UPDATE / DELETE are blocked by a structural trigger so the
-- ledger is research-grade (append-only invalidation-style semantics).
--
-- RLS:
--   - service_role: full INSERT/SELECT (the harness writes here)
--   - authenticated: SELECT own battle's runs only
--   - anon: no access

CREATE TABLE IF NOT EXISTS battles.model_test_runs (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  battle_id       UUID            REFERENCES battles.battles(id) ON DELETE CASCADE,
  template_id     UUID            REFERENCES battles.templates(id) ON DELETE SET NULL,
  model_provider  TEXT        NOT NULL CHECK (char_length(model_provider) BETWEEN 1 AND 64),
  model_id        TEXT        NOT NULL CHECK (char_length(model_id)       BETWEEN 1 AND 128),
  prompt_hash     TEXT        NOT NULL CHECK (char_length(prompt_hash) BETWEEN 8 AND 128),
  passed          BOOLEAN     NOT NULL,
  duration_ms     INT             CHECK (duration_ms IS NULL OR duration_ms >= 0),
  raw_output      JSONB           DEFAULT NULL,
  violations      JSONB           NOT NULL DEFAULT '[]'::jsonb,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT model_test_runs_target_required
    CHECK (battle_id IS NOT NULL OR template_id IS NOT NULL)
);

COMMENT ON TABLE battles.model_test_runs IS
  'Phase BJ append-only ledger of model conformance runs. Either battle_id or '
  'template_id must be set so each row anchors to an owned object for RLS.';

CREATE INDEX IF NOT EXISTS idx_model_test_runs_battle
  ON battles.model_test_runs (battle_id) WHERE battle_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_model_test_runs_template
  ON battles.model_test_runs (template_id) WHERE template_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_model_test_runs_model
  ON battles.model_test_runs (model_provider, model_id, created_at DESC);

-- ── append-only trigger ─────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION battles.fn_model_test_runs_immutable()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION 'model_test_runs is append-only' USING ERRCODE = '42501';
END $$;

ALTER FUNCTION battles.fn_model_test_runs_immutable() OWNER TO postgres;

DROP TRIGGER IF EXISTS trg_model_test_runs_no_update ON battles.model_test_runs;
CREATE TRIGGER trg_model_test_runs_no_update
  BEFORE UPDATE OR DELETE ON battles.model_test_runs
  FOR EACH ROW EXECUTE FUNCTION battles.fn_model_test_runs_immutable();

-- ── RLS ─────────────────────────────────────────────────────────────────────
ALTER TABLE battles.model_test_runs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS model_test_runs_select ON battles.model_test_runs;
CREATE POLICY model_test_runs_select ON battles.model_test_runs
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM battles.battles b
       WHERE b.id = battles.model_test_runs.battle_id
         AND b.creator_lenser_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM battles.templates t
       WHERE t.id = battles.model_test_runs.template_id
         AND t.creator_lenser_id = auth.uid()
    )
  );

-- service_role bypasses RLS for INSERT. Authenticated INSERT is blocked.

GRANT SELECT ON battles.model_test_runs TO authenticated;
-- service_role is implicit via bypass; no explicit GRANT needed.

-- ── RPCs ────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.fn_log_model_test_run(
  p_battle_id      UUID,
  p_template_id    UUID,
  p_model_provider TEXT,
  p_model_id       TEXT,
  p_prompt_hash    TEXT,
  p_passed         BOOLEAN,
  p_duration_ms    INT,
  p_raw_output     JSONB DEFAULT NULL,
  p_violations     JSONB DEFAULT '[]'::jsonb
)
RETURNS battles.model_test_runs
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, battles, extensions
AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_row battles.model_test_runs%ROWTYPE;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'auth_required' USING ERRCODE = '42501';
  END IF;
  IF p_battle_id IS NULL AND p_template_id IS NULL THEN
    RAISE EXCEPTION 'battle_or_template_required' USING ERRCODE = '22023';
  END IF;

  -- Caller must own the anchor row.
  IF p_battle_id IS NOT NULL
     AND NOT EXISTS (
       SELECT 1 FROM battles.battles
        WHERE id = p_battle_id AND creator_lenser_id = v_uid
     ) THEN
    RAISE EXCEPTION 'battle_not_owned' USING ERRCODE = '42501';
  END IF;
  IF p_template_id IS NOT NULL
     AND NOT EXISTS (
       SELECT 1 FROM battles.templates
        WHERE id = p_template_id AND creator_lenser_id = v_uid
     ) THEN
    RAISE EXCEPTION 'template_not_owned' USING ERRCODE = '42501';
  END IF;

  INSERT INTO battles.model_test_runs (
    battle_id, template_id, model_provider, model_id,
    prompt_hash, passed, duration_ms, raw_output, violations
  ) VALUES (
    p_battle_id, p_template_id, p_model_provider, p_model_id,
    p_prompt_hash, p_passed, p_duration_ms, p_raw_output,
    COALESCE(p_violations, '[]'::jsonb)
  )
  RETURNING * INTO v_row;

  RETURN v_row;
END $$;

ALTER FUNCTION public.fn_log_model_test_run(UUID,UUID,TEXT,TEXT,TEXT,BOOLEAN,INT,JSONB,JSONB)
  OWNER TO postgres;
GRANT EXECUTE ON FUNCTION public.fn_log_model_test_run(UUID,UUID,TEXT,TEXT,TEXT,BOOLEAN,INT,JSONB,JSONB)
  TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.fn_get_model_test_runs(
  p_battle_id UUID DEFAULT NULL,
  p_limit     INT  DEFAULT 50
)
RETURNS SETOF battles.model_test_runs
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, battles, extensions
AS $$
  SELECT *
    FROM battles.model_test_runs
   WHERE p_battle_id IS NULL OR battle_id = p_battle_id
   ORDER BY created_at DESC
   LIMIT LEAST(GREATEST(p_limit, 1), 200)
$$;

ALTER FUNCTION public.fn_get_model_test_runs(UUID, INT) OWNER TO postgres;
GRANT EXECUTE ON FUNCTION public.fn_get_model_test_runs(UUID, INT)
  TO authenticated, service_role;
