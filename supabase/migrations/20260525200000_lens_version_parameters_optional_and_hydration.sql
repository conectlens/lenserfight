-- Lens parameter types E2E: optional flag, tools-hydrated param RPCs, case-insensitive token replace.

-- 1. Optional column on version_parameters
ALTER TABLE lenses.version_parameters
  ADD COLUMN IF NOT EXISTS optional boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN lenses.version_parameters.optional IS
  'When true, parameter was declared with [[label!]] and is not required at execution.';

-- 2. Case-insensitive [[label]] / [[label!]] → replacement (e.g. [[:uuid]])
CREATE OR REPLACE FUNCTION lenses.fn_replace_param_label_token(
  p_body text,
  p_label text,
  p_replacement text
) RETURNS text
  LANGUAGE plpgsql
  IMMUTABLE
AS $$
DECLARE
  v_escaped text;
  v_pattern text;
BEGIN
  IF p_body IS NULL OR p_label IS NULL OR length(trim(p_label)) = 0 THEN
    RETURN p_body;
  END IF;

  v_escaped := regexp_replace(trim(p_label), '([.*+?^${}()|\[\]\\-])', E'\\\\\\1', 'g');
  v_pattern := '\[\[\s*' || v_escaped || '\s*!?\s*\]\]';

  RETURN regexp_replace(p_body, v_pattern, p_replacement, 'gi');
END;
$$;

-- 3. fn_create_lens — persist optional + case-insensitive token rewrite
CREATE OR REPLACE FUNCTION lenses.fn_create_lens(
  p_visibility content.visibility_enum,
  p_template_body text,
  p_title text,
  p_description text DEFAULT NULL,
  p_language_code text DEFAULT 'en',
  p_params jsonb DEFAULT '[]'::jsonb,
  p_tag_ids uuid[] DEFAULT '{}'::uuid[],
  p_parent_lens_id uuid DEFAULT NULL,
  p_forked_from_execution_id uuid DEFAULT NULL
) RETURNS uuid
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO lenses, content, lensers, public
AS $$
DECLARE
  v_caller_id   uuid;
  v_new_lens_id uuid;
  v_new_version lenses.versions;
  v_tag_id      uuid;
  v_param       jsonb;
  v_param_id    uuid;
  v_text_tool   uuid;
  v_uuid_body   text;
  v_optional    boolean;
BEGIN
  v_caller_id := lensers.get_auth_lenser_id();
  IF v_caller_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated' USING ERRCODE = 'insufficient_privilege';
  END IF;

  IF length(trim(p_template_body)) < 50 THEN
    RAISE EXCEPTION 'template_body must be at least 50 characters (got %)',
      length(trim(p_template_body)) USING ERRCODE = 'check_violation';
  END IF;

  INSERT INTO lenses.lenses (
    lenser_id, visibility, status,
    parent_lens_id, forked_from_execution_id
  ) VALUES (
    v_caller_id, p_visibility, 'published'::content.content_status,
    p_parent_lens_id, p_forked_from_execution_id
  )
  RETURNING id INTO v_new_lens_id;

  v_new_version := lenses.fn_create_draft_version(
    v_new_lens_id, p_template_body, 'Initial version'
  );

  UPDATE lenses.lenses
  SET head_version_id = v_new_version.id
  WHERE id = v_new_lens_id;

  v_uuid_body := p_template_body;

  IF p_params IS NOT NULL AND jsonb_array_length(p_params) > 0 THEN
    SELECT id INTO v_text_tool FROM lenses.tools WHERE key = 'text' LIMIT 1;

    FOR v_param IN SELECT * FROM jsonb_array_elements(p_params) LOOP
      v_optional := COALESCE((v_param->>'optional')::boolean, false);

      INSERT INTO lenses.version_parameters (version_id, label, tool_id, optional)
      VALUES (
        v_new_version.id,
        v_param->>'label',
        COALESCE(NULLIF(v_param->>'tool_id', '')::uuid, v_text_tool),
        v_optional
      )
      RETURNING id INTO v_param_id;

      v_uuid_body := lenses.fn_replace_param_label_token(
        v_uuid_body,
        v_param->>'label',
        '[[:' || v_param_id::text || ']]'
      );
    END LOOP;

    UPDATE lenses.versions
    SET template_body = v_uuid_body
    WHERE id = v_new_version.id;
  END IF;

  INSERT INTO content.entity_translations (
    entity_type, entity_id, language_code, is_original,
    title, description, content
  ) VALUES (
    'lens'::content.entity_type_enum,
    v_new_lens_id,
    COALESCE(p_language_code, 'en'),
    true,
    p_title,
    p_description,
    p_template_body
  );

  IF p_tag_ids IS NOT NULL AND array_length(p_tag_ids, 1) > 0 THEN
    FOREACH v_tag_id IN ARRAY p_tag_ids LOOP
      INSERT INTO content.tag_map (entity_type, entity_id, tag_id)
      VALUES ('lens'::content.entity_type_enum, v_new_lens_id, v_tag_id)
      ON CONFLICT DO NOTHING;
    END LOOP;
  END IF;

  RETURN v_new_lens_id;
END;
$$;

-- 4. fn_update_lens — case-insensitive token rewrite (optional already inserted in prior migration)
CREATE OR REPLACE FUNCTION lenses.fn_update_lens(
  p_lens_id uuid,
  p_template_body text DEFAULT NULL,
  p_visibility content.visibility_enum DEFAULT NULL,
  p_title text DEFAULT NULL,
  p_description text DEFAULT NULL,
  p_tag_ids uuid[] DEFAULT NULL,
  p_params jsonb DEFAULT NULL
) RETURNS void
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO lenses, content, lensers, public
AS $$
DECLARE
  v_caller_id   uuid;
  v_owner_id    uuid;
  v_tag_id      uuid;
  v_new_version lenses.versions;
  v_param       jsonb;
  v_param_id    uuid;
  v_text_tool   uuid;
  v_uuid_body   text;
  v_optional    boolean;
BEGIN
  v_caller_id := lensers.get_auth_lenser_id();
  IF v_caller_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated' USING ERRCODE = 'insufficient_privilege';
  END IF;

  SELECT lenser_id INTO v_owner_id FROM lenses.lenses WHERE id = p_lens_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Lens not found: %', p_lens_id USING ERRCODE = 'no_data_found';
  END IF;
  IF v_owner_id <> v_caller_id THEN
    RAISE EXCEPTION 'Permission denied: you do not own this lens'
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  IF p_visibility IS NOT NULL THEN
    UPDATE lenses.lenses SET visibility = p_visibility WHERE id = p_lens_id;
  END IF;

  IF p_template_body IS NOT NULL THEN
    IF length(trim(p_template_body)) < 50 THEN
      RAISE EXCEPTION 'template_body must be at least 50 characters (got %)',
        length(trim(p_template_body)) USING ERRCODE = 'check_violation';
    END IF;

    v_new_version := lenses.fn_create_draft_version(
      p_lens_id, p_template_body, 'Updated via lens edit'
    );

    v_uuid_body := p_template_body;

    IF p_params IS NOT NULL AND jsonb_array_length(p_params) > 0 THEN
      SELECT id INTO v_text_tool FROM lenses.tools WHERE key = 'text' LIMIT 1;

      FOR v_param IN SELECT * FROM jsonb_array_elements(p_params) LOOP
        v_optional := COALESCE((v_param->>'optional')::boolean, false);

        INSERT INTO lenses.version_parameters (version_id, label, tool_id, optional)
        VALUES (
          v_new_version.id,
          v_param->>'label',
          COALESCE(NULLIF(v_param->>'tool_id', '')::uuid, v_text_tool),
          v_optional
        )
        RETURNING id INTO v_param_id;

        v_uuid_body := lenses.fn_replace_param_label_token(
          v_uuid_body,
          v_param->>'label',
          '[[:' || v_param_id::text || ']]'
        );
      END LOOP;

      UPDATE lenses.versions
      SET template_body = v_uuid_body
      WHERE id = v_new_version.id;
    END IF;

    UPDATE lenses.lenses
    SET head_version_id = v_new_version.id
    WHERE id = p_lens_id;
  END IF;

  IF p_title IS NOT NULL OR p_description IS NOT NULL OR p_template_body IS NOT NULL THEN
    UPDATE content.entity_translations
    SET
      title       = COALESCE(p_title, title),
      description = COALESCE(p_description, description),
      content     = COALESCE(p_template_body, content)
    WHERE entity_type = 'lens'::content.entity_type_enum
      AND entity_id   = p_lens_id
      AND is_original = true;
  END IF;

  IF p_tag_ids IS NOT NULL THEN
    DELETE FROM content.tag_map
    WHERE entity_type = 'lens'::content.entity_type_enum AND entity_id = p_lens_id;

    IF array_length(p_tag_ids, 1) > 0 THEN
      FOREACH v_tag_id IN ARRAY p_tag_ids LOOP
        INSERT INTO content.tag_map (entity_type, entity_id, tag_id)
        VALUES ('lens'::content.entity_type_enum, p_lens_id, v_tag_id)
        ON CONFLICT DO NOTHING;
      END LOOP;
    END IF;
  END IF;
END;
$$;

-- 5. fn_get_lens_detail_bootstrap — include optional in embedded parameters
-- Patch only the parameters aggregation block (full function redefined in follow-up migration
-- if bootstrap drifted). For now, consumers use fn_get_version_params_with_tools via repository.

-- 6. Hydrated parameters with tools (public wrapper used by repository)
CREATE OR REPLACE FUNCTION public.fn_get_lens_version_parameters(p_version_id uuid)
  RETURNS jsonb
  LANGUAGE sql
  STABLE
  SECURITY DEFINER
  SET search_path TO public, lenses, lensers
AS $$
  SELECT lenses.fn_get_version_params_with_tools(p_version_id);
$$;

-- 7. fn_get_version_params_with_tools — include optional
CREATE OR REPLACE FUNCTION lenses.fn_get_version_params_with_tools(p_version_id uuid)
  RETURNS jsonb
  LANGUAGE sql
  SECURITY DEFINER
  SET search_path TO lenses, public
AS $$
  SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object(
        'id',         vp.id,
        'version_id', vp.version_id,
        'label',      vp.label,
        'tool_id',    vp.tool_id,
        'optional',   COALESCE(vp.optional, false),
        'tool', jsonb_build_object(
          'id',                t.id,
          'key',               t.key,
          'label',             t.label,
          'description',       t.description,
          'category',          t.category,
          'type',              t.type,
          'required',          t.required,
          'min_length',        t.min_length,
          'max_length',        t.max_length,
          'placeholder',       t.placeholder,
          'help_text',         t.help_text,
          'validation_schema', t.validation_schema,
          'options',           t.options,
          'sort_order',        t.sort_order,
          'is_system',         t.is_system,
          'icon',              t.icon,
          'color',             t.color
        )
      )
      ORDER BY t.sort_order, vp.label
    ),
    '[]'::jsonb
  )
  FROM lenses.version_parameters vp
  JOIN lenses.tools t ON t.id = vp.tool_id
  WHERE vp.version_id = p_version_id;
$$;

-- 8. fn_validate_inputs — respect version_parameters.optional (required check only)
-- Patch: replace tools.required-only check with (required AND NOT optional).
-- Full function body preserved from remote_schema; only the SELECT and IF changed.
CREATE OR REPLACE FUNCTION lenses.fn_validate_inputs(p_version_id uuid, p_inputs jsonb)
  RETURNS void
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO lenses, media, lensers, public
AS $_$
DECLARE
  vp          RECORD;
  v_raw       text;
  v_schema    jsonb;
  v_min       numeric;
  v_max       numeric;
  v_num       numeric;
  v_caller_id uuid;
  v_required  boolean;
BEGIN
  IF p_version_id IS NULL THEN
    RETURN;
  END IF;

  v_caller_id := lensers.get_auth_lenser_id();

  FOR vp IN
    SELECT
      vp_row.label                        AS "key",
      t.type                              AS "type",
      t.required                          AS "required",
      COALESCE(vp_row.optional, false)    AS "param_optional",
      t.options                           AS "options",
      t.validation_schema                 AS "validation_schema"
    FROM lenses.version_parameters vp_row
    JOIN lenses.tools t ON t.id = vp_row.tool_id
    WHERE vp_row.version_id = p_version_id
    ORDER BY t.sort_order, vp_row.label
    LIMIT 200
  LOOP
    v_raw := p_inputs->>vp."key";
    v_schema := vp."validation_schema";
    v_required := vp."required" AND NOT vp."param_optional";

    IF v_required AND (v_raw IS NULL OR trim(v_raw) = '') THEN
      RAISE EXCEPTION 'Required parameter "%" is missing or empty', vp."key"
        USING ERRCODE = 'check_violation';
    END IF;

    CONTINUE WHEN v_raw IS NULL OR trim(v_raw) = '';

    BEGIN
      CASE vp."type"
        WHEN 'number' THEN
          v_num := v_raw::numeric;
          IF v_schema IS NOT NULL THEN
            IF v_schema->>'min' IS NOT NULL THEN
              v_min := (v_schema->>'min')::numeric;
              IF v_num < v_min THEN
                RAISE EXCEPTION 'Parameter "%" value % is below minimum %',
                  vp."key", v_num, v_min USING ERRCODE = 'check_violation';
              END IF;
            END IF;
            IF v_schema->>'max' IS NOT NULL THEN
              v_max := (v_schema->>'max')::numeric;
              IF v_num > v_max THEN
                RAISE EXCEPTION 'Parameter "%" value % exceeds maximum %',
                  vp."key", v_num, v_max USING ERRCODE = 'check_violation';
              END IF;
            END IF;
          END IF;
        WHEN 'integer' THEN
          v_num := v_raw::bigint;
          IF v_schema IS NOT NULL THEN
            IF v_schema->>'min' IS NOT NULL THEN
              v_min := (v_schema->>'min')::numeric;
              IF v_num < v_min THEN
                RAISE EXCEPTION 'Parameter "%" value % is below minimum %',
                  vp."key", v_num, v_min USING ERRCODE = 'check_violation';
              END IF;
            END IF;
            IF v_schema->>'max' IS NOT NULL THEN
              v_max := (v_schema->>'max')::numeric;
              IF v_num > v_max THEN
                RAISE EXCEPTION 'Parameter "%" value % exceeds maximum %',
                  vp."key", v_num, v_max USING ERRCODE = 'check_violation';
              END IF;
            END IF;
          END IF;
        WHEN 'float' THEN
          v_num := v_raw::double precision;
          IF v_schema IS NOT NULL THEN
            IF v_schema->>'min' IS NOT NULL THEN
              v_min := (v_schema->>'min')::numeric;
              IF v_num < v_min THEN
                RAISE EXCEPTION 'Parameter "%" value % is below minimum %',
                  vp."key", v_num, v_min USING ERRCODE = 'check_violation';
              END IF;
            END IF;
            IF v_schema->>'max' IS NOT NULL THEN
              v_max := (v_schema->>'max')::numeric;
              IF v_num > v_max THEN
                RAISE EXCEPTION 'Parameter "%" value % exceeds maximum %',
                  vp."key", v_num, v_max USING ERRCODE = 'check_violation';
              END IF;
            END IF;
          END IF;
        WHEN 'decimal' THEN
          v_num := v_raw::numeric;
          IF v_schema IS NOT NULL THEN
            IF v_schema->>'min' IS NOT NULL THEN
              v_min := (v_schema->>'min')::numeric;
              IF v_num < v_min THEN
                RAISE EXCEPTION 'Parameter "%" value % is below minimum %',
                  vp."key", v_num, v_min USING ERRCODE = 'check_violation';
              END IF;
            END IF;
            IF v_schema->>'max' IS NOT NULL THEN
              v_max := (v_schema->>'max')::numeric;
              IF v_num > v_max THEN
                RAISE EXCEPTION 'Parameter "%" value % exceeds maximum %',
                  vp."key", v_num, v_max USING ERRCODE = 'check_violation';
              END IF;
            END IF;
          END IF;
        WHEN 'boolean' THEN
          IF lower(v_raw) NOT IN ('true', 'false', '1', '0') THEN
            RAISE EXCEPTION
              'Parameter "%" must be a boolean value (true/false), got: %',
              vp."key", v_raw
              USING ERRCODE = 'check_violation';
          END IF;
        WHEN 'json' THEN
          PERFORM v_raw::jsonb;
        WHEN 'select' THEN
          IF vp."options" IS NOT NULL
             AND jsonb_typeof(vp."options") = 'array'
             AND NOT EXISTS (
               SELECT 1
               FROM jsonb_array_elements(vp."options") opt
               WHERE opt->>'value' = v_raw
             ) THEN
            RAISE EXCEPTION
              'Parameter "%" value "%" is not in the allowed options list',
              vp."key", v_raw
              USING ERRCODE = 'check_violation';
          END IF;
        WHEN 'url' THEN
          IF v_raw !~ '^https?://' THEN
            RAISE EXCEPTION
              'Parameter "%" must be a valid URL starting with http:// or https://, got: %',
              vp."key", left(v_raw, 100)
              USING ERRCODE = 'check_violation';
          END IF;
          IF v_schema IS NOT NULL AND v_schema->'urlScheme' IS NOT NULL
             AND jsonb_typeof(v_schema->'urlScheme') = 'array'
             AND NOT EXISTS (
               SELECT 1
               FROM jsonb_array_elements_text(v_schema->'urlScheme') scheme
               WHERE lower(v_raw) LIKE lower(scheme) || '://%'
             ) THEN
            RAISE EXCEPTION
              'Parameter "%" URL scheme is not allowed',
              vp."key"
              USING ERRCODE = 'check_violation';
          END IF;
        WHEN 'date' THEN
          PERFORM v_raw::date;
        WHEN 'datetime' THEN
          PERFORM v_raw::timestamptz;
        WHEN 'file' THEN
          IF v_raw !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
            RAISE EXCEPTION
              'Parameter "%" must be a media object UUID, got invalid value',
              vp."key"
              USING ERRCODE = 'check_violation';
          END IF;
          IF v_caller_id IS NOT NULL THEN
            IF NOT EXISTS (
              SELECT 1
              FROM media.objects mo
              WHERE mo.id = v_raw::uuid
                AND mo.owner_lenser_id = v_caller_id
                AND mo.lifecycle_state IN ('pending', 'active')
            ) THEN
              RAISE EXCEPTION
                'Parameter "%" references a media object that does not exist or is not accessible',
                vp."key"
                USING ERRCODE = 'check_violation';
            END IF;
          END IF;
        ELSE
          NULL;
      END CASE;
    EXCEPTION
      WHEN invalid_text_representation
        OR numeric_value_out_of_range
        OR invalid_parameter_value
        OR invalid_datetime_format
      THEN
        RAISE EXCEPTION
          'Parameter "%" has an invalid value for type "%": %',
          vp."key", vp."type", left(v_raw, 200)
          USING ERRCODE = 'check_violation';
    END;
  END LOOP;
END;
$_$;
