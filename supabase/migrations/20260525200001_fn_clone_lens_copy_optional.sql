-- fn_clone_lens: copy version_parameters.optional when forking

CREATE OR REPLACE FUNCTION lenses.fn_clone_lens(
  p_source_lens_id uuid,
  p_version_id uuid DEFAULT NULL
) RETURNS uuid
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO lenses, content, lensers, public
AS $$
DECLARE
  v_caller_id       uuid;
  v_src_vis         content.visibility_enum;
  v_src_status      content.content_status;
  v_template        text;
  v_title           text;
  v_description     text;
  v_language        text;
  v_resolved_ver_id uuid;
  v_new_lens_id     uuid;
  v_new_version     lenses.versions;
BEGIN
  v_caller_id := lensers.get_auth_lenser_id();
  IF v_caller_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated' USING ERRCODE = 'insufficient_privilege';
  END IF;

  IF EXISTS (
    SELECT 1 FROM lenses.lenses
    WHERE lenser_id = v_caller_id
      AND parent_lens_id IS NOT NULL
      AND created_at > NOW() - INTERVAL '5 minutes'
  ) THEN
    RAISE EXCEPTION 'rate_limit_exceeded'
      USING DETAIL = 'You can only fork a lens once every 5 minutes.',
            ERRCODE = 'P0429';
  END IF;

  SELECT l.visibility, l.status
    INTO v_src_vis, v_src_status
    FROM lenses.lenses l
   WHERE l.id = p_source_lens_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Source lens % not found', p_source_lens_id USING ERRCODE = 'no_data_found';
  END IF;

  IF v_src_vis <> 'public'::content.visibility_enum
     OR v_src_status <> 'published'::content.content_status THEN
    RAISE EXCEPTION 'Cannot clone: source lens must be public and published'
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  IF p_version_id IS NOT NULL THEN
    SELECT v.id, v.template_body
      INTO v_resolved_ver_id, v_template
      FROM lenses.versions v
     WHERE v.id = p_version_id
       AND v.lens_id = p_source_lens_id
       AND v.status = 'published'::content.content_status;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Published version % not found for lens %', p_version_id, p_source_lens_id
        USING ERRCODE = 'no_data_found';
    END IF;
  ELSE
    SELECT v.id, v.template_body
      INTO v_resolved_ver_id, v_template
      FROM lenses.versions v
     WHERE v.lens_id = p_source_lens_id
       AND v.status = 'published'::content.content_status
     ORDER BY v.version_number DESC
     LIMIT 1;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'No published version found for lens %', p_source_lens_id
        USING ERRCODE = 'no_data_found';
    END IF;
  END IF;

  SELECT t.title, t.description, t.language_code
    INTO v_title, v_description, v_language
    FROM content.entity_translations t
   WHERE t.entity_id = p_source_lens_id
     AND t.entity_type = 'lens'::content.entity_type_enum
     AND t.is_original = true
   LIMIT 1;

  INSERT INTO lenses.lenses (
    lenser_id, visibility, status,
    parent_lens_id, forked_from_version_id
  ) VALUES (
    v_caller_id,
    'private'::content.visibility_enum,
    'published'::content.content_status,
    p_source_lens_id,
    v_resolved_ver_id
  )
  RETURNING id INTO v_new_lens_id;

  v_new_version := lenses.fn_upsert_draft_version(
    v_new_lens_id,
    v_template,
    'Cloned from ' || COALESCE(v_title, 'Untitled')
  );

  UPDATE lenses.lenses
     SET head_version_id = v_new_version.id
   WHERE id = v_new_lens_id;

  INSERT INTO lenses.version_parameters (version_id, label, tool_id, optional)
  SELECT v_new_version.id, vp.label, vp.tool_id, COALESCE(vp.optional, false)
  FROM lenses.version_parameters vp
  WHERE vp.version_id = v_resolved_ver_id
  LIMIT 200;

  INSERT INTO lenses.steps (
    lens_id, version_id,
    ordinal, step_type, instruction,
    model_id, input_map, output_key, sub_lens_id
  )
  SELECT
    v_new_lens_id,
    v_new_version.id,
    s.ordinal, s.step_type, s.instruction,
    s.model_id, s.input_map, s.output_key, s.sub_lens_id
  FROM lenses.steps s
  WHERE s.lens_id = p_source_lens_id
    AND (
      p_version_id IS NULL
      OR s.version_id = p_version_id
      OR s.version_id IS NULL
    )
  LIMIT 500;

  INSERT INTO content.entity_translations (
    entity_type, entity_id, language_code, is_original,
    title, description, content
  ) VALUES (
    'lens'::content.entity_type_enum,
    v_new_lens_id,
    COALESCE(v_language, 'en'),
    true,
    'Fork of ' || COALESCE(v_title, 'Untitled'),
    v_description,
    v_template
  );

  INSERT INTO content.tag_map (entity_type, entity_id, tag_id)
  SELECT
    'lens'::content.entity_type_enum,
    v_new_lens_id,
    tm.tag_id
  FROM content.tag_map tm
  WHERE tm.entity_type = 'lens'::content.entity_type_enum
    AND tm.entity_id = p_source_lens_id
  LIMIT 50;

  RETURN v_new_lens_id;
END;
$$;
