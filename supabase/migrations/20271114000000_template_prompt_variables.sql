-- Phase BN — Structured template prompt variables.
--
-- Template authors declare named slots (e.g. {{topic}}, {{tone}}) that the
-- battle wizard fills in before creating a battle. fn_battles_render_prompt
-- performs the substitution server-side so the wizard, CLI, and API all
-- agree on the canonical rendered prompt.
--
-- Variable key format: ^[a-z][a-z0-9_]{0,29}$ — lowercase, snake_case, max 30.
-- Required variables raise 22023 when missing from p_variables; unknown keys
-- in p_variables are silently ignored.

-- ── 1. table ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS battles.template_prompt_variables (
  template_id   UUID    NOT NULL REFERENCES battles.templates(id) ON DELETE CASCADE,
  variable_key  TEXT    NOT NULL,
  label         TEXT    NOT NULL CHECK (char_length(label) BETWEEN 1 AND 100),
  default_value TEXT,
  required      BOOLEAN NOT NULL DEFAULT false,
  ordinal       INT     NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (template_id, variable_key),
  CONSTRAINT template_prompt_variables_key_format
    CHECK (variable_key ~ '^[a-z][a-z0-9_]{0,29}$')
);

COMMENT ON TABLE battles.template_prompt_variables IS
  'Phase BN: named slots ({{key}}) that fn_battles_render_prompt substitutes '
  'into a template''s task_prompt.';

CREATE INDEX IF NOT EXISTS idx_template_prompt_variables_template
  ON battles.template_prompt_variables (template_id, ordinal);

-- ── 2. RLS ──────────────────────────────────────────────────────────────────
ALTER TABLE battles.template_prompt_variables ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tpl_prompt_vars_select ON battles.template_prompt_variables;
CREATE POLICY tpl_prompt_vars_select ON battles.template_prompt_variables
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM battles.templates t
       WHERE t.id = battles.template_prompt_variables.template_id
         AND (t.is_public = true OR t.creator_lenser_id = auth.uid())
    )
  );

DROP POLICY IF EXISTS tpl_prompt_vars_owner_write ON battles.template_prompt_variables;
CREATE POLICY tpl_prompt_vars_owner_write ON battles.template_prompt_variables
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM battles.templates t
       WHERE t.id = battles.template_prompt_variables.template_id
         AND t.creator_lenser_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM battles.templates t
       WHERE t.id = battles.template_prompt_variables.template_id
         AND t.creator_lenser_id = auth.uid()
    )
  );

GRANT SELECT, INSERT, UPDATE, DELETE ON battles.template_prompt_variables TO authenticated;
GRANT SELECT ON battles.template_prompt_variables TO anon;

-- ── 3. fn_battles_render_prompt ─────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.fn_battles_render_prompt(
  p_template_id UUID,
  p_variables   JSONB DEFAULT '{}'::jsonb
)
RETURNS TEXT
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, battles, extensions
AS $$
DECLARE
  v_template     RECORD;
  v_rendered     TEXT;
  v_var          RECORD;
  v_value        TEXT;
BEGIN
  SELECT id, task_prompt, creator_lenser_id, is_public
    INTO v_template
    FROM battles.templates
   WHERE id = p_template_id
     AND deleted_at IS NULL;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'template_not_found' USING ERRCODE = '42501';
  END IF;

  -- Accessibility: owner OR public template OR anonymous read of public.
  IF NOT v_template.is_public
     AND v_template.creator_lenser_id IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'template_not_accessible' USING ERRCODE = '42501';
  END IF;

  v_rendered := v_template.task_prompt;

  FOR v_var IN
    SELECT variable_key, default_value, required
      FROM battles.template_prompt_variables
     WHERE template_id = p_template_id
     ORDER BY ordinal, variable_key
  LOOP
    v_value := COALESCE(
      NULLIF(p_variables->>v_var.variable_key, ''),
      v_var.default_value
    );

    IF v_value IS NULL THEN
      IF v_var.required THEN
        RAISE EXCEPTION 'missing_required_variable: %', v_var.variable_key
          USING ERRCODE = '22023';
      END IF;
      v_value := '';
    END IF;

    -- Plain text substitution, including the braces.
    v_rendered := REPLACE(
      v_rendered,
      '{{' || v_var.variable_key || '}}',
      v_value
    );
  END LOOP;

  RETURN v_rendered;
END $$;

ALTER FUNCTION public.fn_battles_render_prompt(UUID, JSONB) OWNER TO postgres;
GRANT EXECUTE ON FUNCTION public.fn_battles_render_prompt(UUID, JSONB)
  TO anon, authenticated, service_role;
