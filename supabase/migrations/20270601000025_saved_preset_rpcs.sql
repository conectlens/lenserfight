-- LIST (returns array of preset objects ordered newest first)
CREATE OR REPLACE FUNCTION public.fn_list_saved_presets(p_lens_version_id uuid)
RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path TO 'lenses', 'lensers', 'public'
AS $$
DECLARE
  v_lenser_id uuid;
  v_result    jsonb;
BEGIN
  v_lenser_id := lensers.get_auth_lenser_id();
  IF v_lenser_id IS NULL THEN
    RETURN '[]'::jsonb;
  END IF;
  SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object(
        'id',              spp.id,
        'lenser_id',       spp.lenser_id,
        'lens_id',         spp.lens_id,
        'lens_version_id', spp.lens_version_id,
        'name',            spp.name,
        'note',            spp.note,
        'values',          spp.values,
        'created_at',      spp.created_at,
        'updated_at',      spp.updated_at
      )
      ORDER BY spp.created_at DESC
    ),
    '[]'::jsonb
  ) INTO v_result
  FROM lenses.saved_parameter_presets spp
  WHERE spp.lens_version_id = p_lens_version_id
    AND spp.lenser_id       = v_lenser_id;
  RETURN v_result;
END;
$$;
ALTER FUNCTION public.fn_list_saved_presets(uuid) OWNER TO postgres;
GRANT EXECUTE ON FUNCTION public.fn_list_saved_presets(uuid) TO authenticated;

-- CREATE
CREATE OR REPLACE FUNCTION public.fn_create_saved_preset(
  p_lens_id         uuid,
  p_lens_version_id uuid,
  p_name            text,
  p_note            text DEFAULT NULL,
  p_values          jsonb DEFAULT '{}'
)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'lenses', 'lensers', 'public'
AS $$
DECLARE
  v_lenser_id uuid;
  v_row       lenses.saved_parameter_presets;
BEGIN
  v_lenser_id := lensers.get_auth_lenser_id();
  IF v_lenser_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;
  INSERT INTO lenses.saved_parameter_presets
    (lenser_id, lens_id, lens_version_id, name, note, values)
  VALUES
    (v_lenser_id, p_lens_id, p_lens_version_id, p_name, p_note, p_values)
  RETURNING * INTO v_row;
  RETURN row_to_json(v_row)::jsonb;
END;
$$;
ALTER FUNCTION public.fn_create_saved_preset(uuid, uuid, text, text, jsonb) OWNER TO postgres;
GRANT EXECUTE ON FUNCTION public.fn_create_saved_preset(uuid, uuid, text, text, jsonb) TO authenticated;

-- UPDATE (caller must own the preset)
CREATE OR REPLACE FUNCTION public.fn_update_saved_preset(
  p_preset_id uuid,
  p_name      text     DEFAULT NULL,
  p_note      text     DEFAULT NULL,
  p_values    jsonb    DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'lenses', 'lensers', 'public'
AS $$
DECLARE
  v_lenser_id uuid;
  v_row       lenses.saved_parameter_presets;
BEGIN
  v_lenser_id := lensers.get_auth_lenser_id();
  IF v_lenser_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;
  UPDATE lenses.saved_parameter_presets
  SET
    name       = COALESCE(p_name, name),
    note       = CASE WHEN p_note IS NOT NULL THEN p_note ELSE note END,
    values     = COALESCE(p_values, values),
    updated_at = now()
  WHERE id        = p_preset_id
    AND lenser_id = v_lenser_id
  RETURNING * INTO v_row;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Preset not found or permission denied';
  END IF;
  RETURN row_to_json(v_row)::jsonb;
END;
$$;
ALTER FUNCTION public.fn_update_saved_preset(uuid, text, text, jsonb) OWNER TO postgres;
GRANT EXECUTE ON FUNCTION public.fn_update_saved_preset(uuid, text, text, jsonb) TO authenticated;

-- DELETE (caller must own the preset)
CREATE OR REPLACE FUNCTION public.fn_delete_saved_preset(p_preset_id uuid)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'lenses', 'lensers', 'public'
AS $$
DECLARE
  v_lenser_id uuid;
BEGIN
  v_lenser_id := lensers.get_auth_lenser_id();
  IF v_lenser_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;
  DELETE FROM lenses.saved_parameter_presets
  WHERE id        = p_preset_id
    AND lenser_id = v_lenser_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Preset not found or permission denied';
  END IF;
END;
$$;
ALTER FUNCTION public.fn_delete_saved_preset(uuid) OWNER TO postgres;
GRANT EXECUTE ON FUNCTION public.fn_delete_saved_preset(uuid) TO authenticated;
