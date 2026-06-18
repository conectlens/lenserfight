-- Create lenses.saved_parameter_presets: per-user saved parameter value sets for a
-- specific lens version. Owner-only access via RLS.

CREATE TABLE lenses.saved_parameter_presets (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  lenser_id       uuid        NOT NULL REFERENCES lensers.profiles(id)  ON DELETE CASCADE,
  lens_id         uuid        NOT NULL REFERENCES lenses.lenses(id)     ON DELETE CASCADE,
  lens_version_id uuid        NOT NULL REFERENCES lenses.versions(id)   ON DELETE CASCADE,
  name            text        NOT NULL,
  note            text,
  values          jsonb       NOT NULL DEFAULT '{}',
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT spp_name_not_blank   CHECK (length(trim(name)) > 0),
  CONSTRAINT spp_values_is_object CHECK (jsonb_typeof(values) = 'object')
);
ALTER TABLE lenses.saved_parameter_presets OWNER TO postgres;

-- Validation trigger: lens_version_id must belong to lens_id.
-- Cannot use a correlated subquery in a CHECK constraint, so we use a trigger.
CREATE OR REPLACE FUNCTION lenses.fn_check_spp_version_belongs_to_lens()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM lenses.versions
    WHERE id = NEW.lens_version_id AND lens_id = NEW.lens_id
  ) THEN
    RAISE EXCEPTION 'lens_version_id % does not belong to lens_id %',
      NEW.lens_version_id, NEW.lens_id;
  END IF;
  RETURN NEW;
END;
$$;
ALTER FUNCTION lenses.fn_check_spp_version_belongs_to_lens() OWNER TO postgres;

CREATE TRIGGER trg_spp_version_check
  BEFORE INSERT OR UPDATE ON lenses.saved_parameter_presets
  FOR EACH ROW EXECUTE FUNCTION lenses.fn_check_spp_version_belongs_to_lens();

CREATE TRIGGER trg_spp_updated_at
  BEFORE UPDATE ON lenses.saved_parameter_presets
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Indexes
CREATE INDEX idx_spp_lens_id         ON lenses.saved_parameter_presets (lens_id);
CREATE INDEX idx_spp_lens_version_id ON lenses.saved_parameter_presets (lens_version_id);
CREATE INDEX idx_spp_lenser_id       ON lenses.saved_parameter_presets (lenser_id);
CREATE INDEX idx_spp_lenser_lens     ON lenses.saved_parameter_presets (lenser_id, lens_id);
CREATE INDEX idx_spp_created_at      ON lenses.saved_parameter_presets (created_at);

-- RLS: owner-only
ALTER TABLE lenses.saved_parameter_presets ENABLE ROW LEVEL SECURITY;
ALTER TABLE lenses.saved_parameter_presets FORCE ROW LEVEL SECURITY;

CREATE POLICY "spp_owner_select" ON lenses.saved_parameter_presets FOR SELECT
  USING (lenser_id = lensers.get_auth_lenser_id());
CREATE POLICY "spp_owner_insert" ON lenses.saved_parameter_presets FOR INSERT
  WITH CHECK (lenser_id = lensers.get_auth_lenser_id());
CREATE POLICY "spp_owner_update" ON lenses.saved_parameter_presets FOR UPDATE
  USING  (lenser_id = lensers.get_auth_lenser_id())
  WITH CHECK (lenser_id = lensers.get_auth_lenser_id());
CREATE POLICY "spp_owner_delete" ON lenses.saved_parameter_presets FOR DELETE
  USING (lenser_id = lensers.get_auth_lenser_id());

GRANT SELECT, INSERT, UPDATE, DELETE ON lenses.saved_parameter_presets TO authenticated;
