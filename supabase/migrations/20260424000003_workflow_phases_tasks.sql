-- =============================================================================
-- 20260424000003_workflow_phases_tasks.sql
-- -----------------------------------------------------------------------------
-- Introduces a hierarchical Phases → Tasks authoring model for workflows.
-- Each workflow can have ordered phases; each phase has ordered tasks with a
-- paragraph prompt that describes what the AI should produce for that task.
--
-- Tables live in the `lenses` schema alongside `workflows`, `workflow_nodes`,
-- and `workflow_runs`.
-- =============================================================================

-- ─── 1. workflow_phases ──────────────────────────────────────────────────────

CREATE TABLE lenses.workflow_phases (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id uuid        NOT NULL REFERENCES lenses.workflows(id) ON DELETE CASCADE,
  title       text        NOT NULL,
  description text,
  ordinal     integer     NOT NULL DEFAULT 0,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_workflow_phases_workflow_id ON lenses.workflow_phases (workflow_id, ordinal);

COMMENT ON TABLE lenses.workflow_phases IS
  'Ordered grouping of tasks within a workflow. Each phase represents a logical stage of execution.';

-- ─── 2. workflow_tasks ───────────────────────────────────────────────────────

CREATE TABLE lenses.workflow_tasks (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  phase_id    uuid        NOT NULL REFERENCES lenses.workflow_phases(id) ON DELETE CASCADE,
  workflow_id uuid        NOT NULL REFERENCES lenses.workflows(id) ON DELETE CASCADE,
  title       text        NOT NULL,
  prompt_text text,
  output_type text        NOT NULL DEFAULT 'text'
                          CHECK (output_type IN ('text','image','video','audio','file')),
  model_hint  text,
  ordinal     integer     NOT NULL DEFAULT 0,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_workflow_tasks_phase_id ON lenses.workflow_tasks (phase_id, ordinal);
CREATE INDEX idx_workflow_tasks_workflow_id ON lenses.workflow_tasks (workflow_id);

COMMENT ON TABLE lenses.workflow_tasks IS
  'Atomic AI step within a workflow phase. prompt_text is the paragraph instruction injected into the AI context for this task.';
COMMENT ON COLUMN lenses.workflow_tasks.output_type IS
  'Expected output artifact kind: text | image | video | audio | file';
COMMENT ON COLUMN lenses.workflow_tasks.model_hint IS
  'Optional preferred model ID for this task (overrides the workflow global model).';
COMMENT ON COLUMN lenses.workflow_tasks.prompt_text IS
  'Paragraph prompt authored by the workflow owner. Injected as system instruction for this task step.';

-- ─── 3. Updated-at triggers ──────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION lenses.set_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_workflow_phases_updated_at
  BEFORE UPDATE ON lenses.workflow_phases
  FOR EACH ROW EXECUTE FUNCTION lenses.set_updated_at();

CREATE TRIGGER trg_workflow_tasks_updated_at
  BEFORE UPDATE ON lenses.workflow_tasks
  FOR EACH ROW EXECUTE FUNCTION lenses.set_updated_at();

-- ─── 4. RLS ──────────────────────────────────────────────────────────────────

ALTER TABLE lenses.workflow_phases ENABLE ROW LEVEL SECURITY;
ALTER TABLE lenses.workflow_tasks  ENABLE ROW LEVEL SECURITY;

-- SELECT: same visibility as the parent workflow (public or owner)
CREATE POLICY "phases_read" ON lenses.workflow_phases
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM lenses.workflows w
      WHERE w.id = workflow_phases.workflow_id
        AND (w.visibility = 'public' OR w.lenser_id = lensers.get_auth_lenser_id())
    )
  );

CREATE POLICY "tasks_read" ON lenses.workflow_tasks
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM lenses.workflows w
      WHERE w.id = workflow_tasks.workflow_id
        AND (w.visibility = 'public' OR w.lenser_id = lensers.get_auth_lenser_id())
    )
  );

-- INSERT / UPDATE / DELETE: workflow owner only
CREATE POLICY "phases_owner_write" ON lenses.workflow_phases
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM lenses.workflows w
      WHERE w.id = workflow_phases.workflow_id
        AND w.lenser_id = lensers.get_auth_lenser_id()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM lenses.workflows w
      WHERE w.id = workflow_phases.workflow_id
        AND w.lenser_id = lensers.get_auth_lenser_id()
    )
  );

CREATE POLICY "tasks_owner_write" ON lenses.workflow_tasks
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM lenses.workflows w
      WHERE w.id = workflow_tasks.workflow_id
        AND w.lenser_id = lensers.get_auth_lenser_id()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM lenses.workflows w
      WHERE w.id = workflow_tasks.workflow_id
        AND w.lenser_id = lensers.get_auth_lenser_id()
    )
  );

-- ─── 5. Grants ───────────────────────────────────────────────────────────────

GRANT SELECT, INSERT, UPDATE, DELETE ON lenses.workflow_phases TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON lenses.workflow_tasks  TO authenticated;
GRANT SELECT ON lenses.workflow_phases TO service_role;
GRANT SELECT ON lenses.workflow_tasks  TO service_role;
