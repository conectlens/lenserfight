-- Phase BK — Generative media quality gates.
--
-- Template authors declare per-modality quality floors (resolution, length,
-- aspect ratio). fn_check_media_quality reads a submission's media metadata
-- (battles.submissions.metadata->'media') and the template rules, then writes
-- a pass/fail row with structured violations to battles.media_quality_results.
--
-- Idempotent: re-running fn_check_media_quality for the same submission_id
-- replaces the previous result. media_quality_rules PK enforces one rule per
-- (template_id, modality) pair.

-- ── 1. rules table ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS battles.media_quality_rules (
  template_id            UUID NOT NULL REFERENCES battles.templates(id) ON DELETE CASCADE,
  modality               TEXT NOT NULL CHECK (modality IN ('image','video','audio')),
  min_width              INT CHECK (min_width IS NULL OR min_width > 0),
  min_height             INT CHECK (min_height IS NULL OR min_height > 0),
  max_duration_seconds   INT CHECK (max_duration_seconds IS NULL OR max_duration_seconds > 0),
  required_aspect_ratio  TEXT CHECK (
    required_aspect_ratio IS NULL OR required_aspect_ratio ~ '^[0-9]+:[0-9]+$'
  ),
  max_file_size_mb       INT CHECK (max_file_size_mb IS NULL OR max_file_size_mb > 0),
  created_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (template_id, modality)
);

COMMENT ON TABLE battles.media_quality_rules IS
  'Phase BK per-(template, modality) quality floors enforced by '
  'fn_check_media_quality.';

ALTER TABLE battles.media_quality_rules ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS media_quality_rules_select ON battles.media_quality_rules;
CREATE POLICY media_quality_rules_select ON battles.media_quality_rules
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM battles.templates t
       WHERE t.id = battles.media_quality_rules.template_id
         AND (t.is_public = true OR t.creator_lenser_id = auth.uid())
    )
  );

DROP POLICY IF EXISTS media_quality_rules_owner_write ON battles.media_quality_rules;
CREATE POLICY media_quality_rules_owner_write ON battles.media_quality_rules
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM battles.templates t
       WHERE t.id = battles.media_quality_rules.template_id
         AND t.creator_lenser_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM battles.templates t
       WHERE t.id = battles.media_quality_rules.template_id
         AND t.creator_lenser_id = auth.uid()
    )
  );

GRANT SELECT, INSERT, UPDATE, DELETE ON battles.media_quality_rules TO authenticated;

-- ── 2. results table ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS battles.media_quality_results (
  submission_id UUID PRIMARY KEY REFERENCES battles.submissions(id) ON DELETE CASCADE,
  passed        BOOLEAN     NOT NULL,
  violations    JSONB       NOT NULL DEFAULT '[]'::jsonb,
  checked_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE battles.media_quality_results ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS media_quality_results_select ON battles.media_quality_results;
CREATE POLICY media_quality_results_select ON battles.media_quality_results
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
        FROM battles.submissions s
        JOIN battles.battles b ON b.id = s.battle_id
       WHERE s.id = battles.media_quality_results.submission_id
         AND (
           b.creator_lenser_id = auth.uid()
           OR EXISTS (
             SELECT 1 FROM battles.contenders c
              WHERE c.id = s.contender_id
                AND c.contender_ref_id = auth.uid()
           )
         )
    )
  );

GRANT SELECT ON battles.media_quality_results TO authenticated;

-- ── 3. fn_check_media_quality ───────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.fn_check_media_quality(
  p_submission_id UUID
)
RETURNS battles.media_quality_results
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, battles, extensions
AS $$
DECLARE
  v_submission  RECORD;
  v_template_id UUID;
  v_modality    TEXT;
  v_meta        JSONB;
  v_rule        RECORD;
  v_violations  TEXT[] := ARRAY[]::TEXT[];
  v_width       INT;
  v_height      INT;
  v_duration    INT;
  v_aspect      TEXT;
  v_size_mb     NUMERIC;
  v_result      battles.media_quality_results%ROWTYPE;
BEGIN
  SELECT s.*, b.template_id AS battle_template_id
    INTO v_submission
    FROM battles.submissions s
    JOIN battles.battles b ON b.id = s.battle_id
   WHERE s.id = p_submission_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'submission_not_found' USING ERRCODE = '42501';
  END IF;

  v_template_id := v_submission.battle_template_id;
  v_meta        := COALESCE(v_submission.metadata->'media', '{}'::jsonb);
  v_modality    := COALESCE(v_meta->>'modality', v_submission.metadata->>'output_modality');

  IF v_modality IS NULL OR v_modality NOT IN ('image','video','audio') THEN
    RAISE EXCEPTION 'unknown_modality: %', COALESCE(v_modality, '<null>')
      USING ERRCODE = '22023';
  END IF;

  -- Lookup the rule. Absence of a rule = pass (no floor declared).
  -- NOTE: a plpgsql record-typed `v_rule IS NOT NULL` is only true when EVERY
  -- column is non-NULL — wrong test for a row with optional fields. Use FOUND
  -- so we only enforce when a row was actually selected.
  SELECT * INTO v_rule
    FROM battles.media_quality_rules
   WHERE template_id = v_template_id
     AND modality    = v_modality;

  IF FOUND THEN
    v_width    := NULLIF(v_meta->>'width', '')::INT;
    v_height   := NULLIF(v_meta->>'height', '')::INT;
    v_duration := NULLIF(v_meta->>'duration_seconds', '')::INT;
    v_aspect   := v_meta->>'aspect_ratio';
    v_size_mb  := NULLIF(v_meta->>'size_mb', '')::NUMERIC;

    IF v_rule.min_width IS NOT NULL
       AND (v_width IS NULL OR v_width < v_rule.min_width) THEN
      v_violations := array_append(v_violations,
        format('min_width:%s<%s', COALESCE(v_width::text, 'null'), v_rule.min_width));
    END IF;
    IF v_rule.min_height IS NOT NULL
       AND (v_height IS NULL OR v_height < v_rule.min_height) THEN
      v_violations := array_append(v_violations,
        format('min_height:%s<%s', COALESCE(v_height::text, 'null'), v_rule.min_height));
    END IF;
    IF v_rule.max_duration_seconds IS NOT NULL
       AND v_duration IS NOT NULL
       AND v_duration > v_rule.max_duration_seconds THEN
      v_violations := array_append(v_violations,
        format('max_duration_seconds:%s>%s', v_duration, v_rule.max_duration_seconds));
    END IF;
    IF v_rule.required_aspect_ratio IS NOT NULL
       AND v_aspect IS DISTINCT FROM v_rule.required_aspect_ratio THEN
      v_violations := array_append(v_violations,
        format('aspect_ratio:%s!=%s', COALESCE(v_aspect, 'null'), v_rule.required_aspect_ratio));
    END IF;
    IF v_rule.max_file_size_mb IS NOT NULL
       AND v_size_mb IS NOT NULL
       AND v_size_mb > v_rule.max_file_size_mb THEN
      v_violations := array_append(v_violations,
        format('max_file_size_mb:%s>%s', v_size_mb, v_rule.max_file_size_mb));
    END IF;
  END IF;

  INSERT INTO battles.media_quality_results (
    submission_id, passed, violations, checked_at
  ) VALUES (
    p_submission_id,
    cardinality(v_violations) = 0,
    to_jsonb(v_violations),
    now()
  )
  ON CONFLICT (submission_id) DO UPDATE SET
    passed     = EXCLUDED.passed,
    violations = EXCLUDED.violations,
    checked_at = EXCLUDED.checked_at
  RETURNING * INTO v_result;

  RETURN v_result;
END $$;

ALTER FUNCTION public.fn_check_media_quality(UUID) OWNER TO postgres;
GRANT EXECUTE ON FUNCTION public.fn_check_media_quality(UUID)
  TO authenticated, service_role;
