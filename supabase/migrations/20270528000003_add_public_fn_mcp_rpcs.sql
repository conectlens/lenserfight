-- Public MCP RPC wrappers.
--
-- PostgREST exposes only the public schema, so the MCP server (apps/mcp-server)
-- cannot reach battles/lenses/lensers tables with .schema('x').from('y'). All
-- data access must go through public.fn_mcp_* wrappers defined here.
--
-- Convention:
--   - SECURITY DEFINER, owner postgres (bypasses RLS).
--   - REVOKE from PUBLIC + anon, GRANT to authenticated + service_role.
--   - Authenticated callers are scoped via lensers.get_auth_lenser_id();
--     service_role (stdio MCP) sees NULL and bypasses ownership checks.
--   - Reads return jsonb; writes return jsonb with { id, ... }.

-- ============================================================================
-- AUTH RESOLUTION (middleware/auth.ts)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.fn_mcp_resolve_lenser_id(p_auth_user_id uuid)
RETURNS uuid
LANGUAGE sql SECURITY DEFINER STABLE
SET search_path TO 'lensers', 'public'
AS $$
  SELECT id FROM lensers.profiles WHERE user_id = p_auth_user_id LIMIT 1;
$$;
ALTER FUNCTION public.fn_mcp_resolve_lenser_id(uuid) OWNER TO postgres;
REVOKE ALL ON FUNCTION public.fn_mcp_resolve_lenser_id(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.fn_mcp_resolve_lenser_id(uuid) TO service_role;

CREATE OR REPLACE FUNCTION public.fn_mcp_resolve_token(p_token text)
RETURNS TABLE(lenser_id uuid, supabase_refresh_token text)
LANGUAGE sql SECURITY DEFINER STABLE
SET search_path TO 'lensers', 'public'
AS $$
  SELECT t.lenser_id, t.supabase_refresh_token
    FROM lensers.mcp_tokens t
   WHERE t.token = p_token AND t.is_active = true
   LIMIT 1;
$$;
ALTER FUNCTION public.fn_mcp_resolve_token(text) OWNER TO postgres;
REVOKE ALL ON FUNCTION public.fn_mcp_resolve_token(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.fn_mcp_resolve_token(text) TO service_role;

-- ============================================================================
-- BATTLES
-- ============================================================================

CREATE OR REPLACE FUNCTION public.fn_mcp_battle_get(p_battle_id uuid)
RETURNS jsonb
LANGUAGE sql SECURITY DEFINER STABLE
SET search_path TO 'battles', 'public'
AS $$
  SELECT jsonb_build_object(
    'id', b.id,
    'title', b.title,
    'slug', b.slug,
    'status', b.status::text,
    'battle_type', b.battle_type::text,
    'judging_mode', b.judging_mode::text,
    'task_prompt', b.task_prompt,
    'max_contenders', b.max_contenders,
    'total_vote_count', b.total_vote_count,
    'ai_judge_enabled', b.ai_judge_enabled,
    'ai_judge_model_key', b.ai_judge_model_key,
    'created_at', b.created_at,
    'updated_at', b.updated_at,
    'voting_opens_at', b.voting_opens_at,
    'voting_closes_at', b.voting_closes_at,
    'creator_lenser_id', b.creator_lenser_id,
    'winner_contender_id', b.winner_contender_id,
    'lens_id', b.lens_id,
    'workflow_id', b.workflow_id,
    'contenders', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'id', c.id, 'slot', c.slot, 'contender_type', c.contender_type,
        'display_name', c.display_name, 'contender_status', c.contender_status,
        'joined_at', c.joined_at
      ) ORDER BY c.slot)
      FROM battles.contenders c WHERE c.battle_id = b.id
    ), '[]'::jsonb),
    'vote_aggregates', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'contender_id', va.contender_id, 'raw_vote_count', va.raw_vote_count,
        'weighted_vote_sum', va.weighted_vote_sum, 'draw_count', va.draw_count,
        'rank_position', va.rank_position
      ))
      FROM battles.vote_aggregates va WHERE va.battle_id = b.id
    ), '[]'::jsonb),
    'submissions', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'id', s.id, 'contender_id', s.contender_id, 'status', s.status::text,
        'content_text', s.content_text, 'created_at', s.created_at
      ))
      FROM battles.submissions s WHERE s.battle_id = b.id
    ), '[]'::jsonb)
  )
  FROM battles.battles b
  WHERE b.id = p_battle_id AND b.deleted_at IS NULL
  LIMIT 1;
$$;
ALTER FUNCTION public.fn_mcp_battle_get(uuid) OWNER TO postgres;
REVOKE ALL ON FUNCTION public.fn_mcp_battle_get(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.fn_mcp_battle_get(uuid) TO authenticated, service_role;


CREATE OR REPLACE FUNCTION public.fn_mcp_battle_list(
  p_limit             integer DEFAULT 20,
  p_offset            integer DEFAULT 0,
  p_status            text    DEFAULT NULL,
  p_battle_type       text    DEFAULT NULL,
  p_creator_lenser_id uuid    DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER STABLE
SET search_path TO 'battles', 'public'
AS $$
DECLARE
  v_total bigint;
  v_rows  jsonb;
BEGIN
  SELECT count(*)
    INTO v_total
    FROM battles.battles b
   WHERE b.deleted_at IS NULL
     AND (p_status IS NULL OR b.status::text = p_status)
     AND (p_battle_type IS NULL OR b.battle_type::text = p_battle_type)
     AND (p_creator_lenser_id IS NULL OR b.creator_lenser_id = p_creator_lenser_id);

  SELECT COALESCE(jsonb_agg(jsonb_build_object(
            'id', b.id, 'title', b.title, 'slug', b.slug,
            'status', b.status::text, 'battle_type', b.battle_type::text,
            'judging_mode', b.judging_mode::text,
            'created_at', b.created_at, 'updated_at', b.updated_at,
            'creator_lenser_id', b.creator_lenser_id,
            'total_vote_count', b.total_vote_count
          ) ORDER BY b.created_at DESC), '[]'::jsonb)
    INTO v_rows
    FROM (
      SELECT *
        FROM battles.battles
       WHERE deleted_at IS NULL
         AND (p_status IS NULL OR status::text = p_status)
         AND (p_battle_type IS NULL OR battle_type::text = p_battle_type)
         AND (p_creator_lenser_id IS NULL OR creator_lenser_id = p_creator_lenser_id)
       ORDER BY created_at DESC
       LIMIT GREATEST(p_limit, 0) OFFSET GREATEST(p_offset, 0)
    ) b;

  RETURN jsonb_build_object('data', v_rows, 'count', v_total);
END;
$$;
ALTER FUNCTION public.fn_mcp_battle_list(integer, integer, text, text, uuid) OWNER TO postgres;
REVOKE ALL ON FUNCTION public.fn_mcp_battle_list(integer, integer, text, text, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.fn_mcp_battle_list(integer, integer, text, text, uuid) TO authenticated, service_role;


CREATE OR REPLACE FUNCTION public.fn_mcp_battle_history(
  p_lenser_id uuid    DEFAULT NULL,
  p_limit     integer DEFAULT 20,
  p_offset    integer DEFAULT 0,
  p_status    text    DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER STABLE
SET search_path TO 'battles', 'lensers', 'public'
AS $$
DECLARE
  v_lenser uuid;
  v_total  bigint;
  v_rows   jsonb;
BEGIN
  v_lenser := COALESCE(p_lenser_id, lensers.get_auth_lenser_id());

  SELECT count(*)
    INTO v_total
    FROM battles.battles b
   WHERE b.deleted_at IS NULL
     AND (v_lenser IS NULL OR b.creator_lenser_id = v_lenser)
     AND (p_status IS NULL OR b.status::text = p_status);

  SELECT COALESCE(jsonb_agg(jsonb_build_object(
            'id', b.id, 'title', b.title, 'slug', b.slug,
            'status', b.status::text, 'battle_type', b.battle_type::text,
            'judging_mode', b.judging_mode::text,
            'total_vote_count', b.total_vote_count,
            'winner_contender_id', b.winner_contender_id,
            'created_at', b.created_at, 'finalized_at', b.finalized_at
          ) ORDER BY b.created_at DESC), '[]'::jsonb)
    INTO v_rows
    FROM (
      SELECT *
        FROM battles.battles
       WHERE deleted_at IS NULL
         AND (v_lenser IS NULL OR creator_lenser_id = v_lenser)
         AND (p_status IS NULL OR status::text = p_status)
       ORDER BY created_at DESC
       LIMIT GREATEST(p_limit, 0) OFFSET GREATEST(p_offset, 0)
    ) b;

  RETURN jsonb_build_object('data', v_rows, 'count', v_total);
END;
$$;
ALTER FUNCTION public.fn_mcp_battle_history(uuid, integer, integer, text) OWNER TO postgres;
REVOKE ALL ON FUNCTION public.fn_mcp_battle_history(uuid, integer, integer, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.fn_mcp_battle_history(uuid, integer, integer, text) TO authenticated, service_role;


CREATE OR REPLACE FUNCTION public.fn_mcp_battle_score(p_battle_id uuid)
RETURNS jsonb
LANGUAGE sql SECURITY DEFINER STABLE
SET search_path TO 'battles', 'public'
AS $$
  SELECT jsonb_build_object(
    'battle_id', p_battle_id,
    'vote_aggregates', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'contender_id', va.contender_id,
        'raw_vote_count', va.raw_vote_count,
        'weighted_vote_sum', va.weighted_vote_sum,
        'draw_count', va.draw_count,
        'rank_position', va.rank_position
      ))
      FROM battles.vote_aggregates va WHERE va.battle_id = p_battle_id
    ), '[]'::jsonb),
    'ai_judge_verdicts', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'id', v.id,
        'contender_id', v.contender_id,
        'criterion_id', v.criterion_id,
        'score', v.score,
        'rationale', v.rationale,
        'model_key', v.model_key,
        'created_at', v.created_at
      ))
      FROM battles.ai_judge_verdicts v WHERE v.battle_id = p_battle_id
    ), '[]'::jsonb)
  );
$$;
ALTER FUNCTION public.fn_mcp_battle_score(uuid) OWNER TO postgres;
REVOKE ALL ON FUNCTION public.fn_mcp_battle_score(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.fn_mcp_battle_score(uuid) TO authenticated, service_role;


CREATE OR REPLACE FUNCTION public.fn_mcp_battle_set_status(
  p_battle_id uuid,
  p_status    text
)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'battles', 'lensers', 'public'
AS $$
DECLARE
  v_caller uuid;
  v_row    record;
BEGIN
  v_caller := lensers.get_auth_lenser_id();

  IF v_caller IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM battles.battles
       WHERE id = p_battle_id
         AND deleted_at IS NULL
         AND creator_lenser_id = v_caller
    ) THEN
      RAISE EXCEPTION 'access_denied' USING HINT = 'p0403';
    END IF;
  END IF;

  UPDATE battles.battles
     SET status = p_status::battles.battle_status_enum,
         updated_at = now()
   WHERE id = p_battle_id
     AND deleted_at IS NULL
  RETURNING id, status INTO v_row;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'battle_not_found' USING HINT = 'p0404';
  END IF;

  RETURN jsonb_build_object('id', v_row.id, 'status', v_row.status::text);
END;
$$;
ALTER FUNCTION public.fn_mcp_battle_set_status(uuid, text) OWNER TO postgres;
REVOKE ALL ON FUNCTION public.fn_mcp_battle_set_status(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.fn_mcp_battle_set_status(uuid, text) TO authenticated, service_role;


CREATE OR REPLACE FUNCTION public.fn_mcp_battle_add_contender(
  p_battle_id        uuid,
  p_display_name     text,
  p_contender_type   text,
  p_contender_ref_id uuid,
  p_slot             text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'battles', 'lensers', 'public'
AS $$
DECLARE
  v_caller   uuid;
  v_slot     text;
  v_letter   text;
  v_taken    text[];
  v_new      record;
BEGIN
  v_caller := lensers.get_auth_lenser_id();

  IF v_caller IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM battles.battles
       WHERE id = p_battle_id
         AND deleted_at IS NULL
         AND creator_lenser_id = v_caller
    ) THEN
      RAISE EXCEPTION 'access_denied' USING HINT = 'p0403';
    END IF;
  END IF;

  IF p_slot IS NOT NULL THEN
    v_slot := p_slot;
  ELSE
    SELECT array_agg(slot::text)
      INTO v_taken
      FROM battles.contenders
     WHERE battle_id = p_battle_id;

    FOR i IN 0..25 LOOP
      v_letter := chr(65 + i);
      IF v_taken IS NULL OR NOT (v_letter = ANY(v_taken)) THEN
        v_slot := v_letter;
        EXIT;
      END IF;
    END LOOP;

    IF v_slot IS NULL THEN
      RAISE EXCEPTION 'slots_full';
    END IF;
  END IF;

  -- battles.contender_entity_map is populated automatically by
  -- trg_populate_contender_entity_map AFTER INSERT.
  INSERT INTO battles.contenders (
    battle_id, slot, contender_type, contender_ref_id,
    display_name, contender_status, entry_mode
  )
  VALUES (
    p_battle_id, v_slot::bpchar, p_contender_type::battles.contender_type_enum,
    p_contender_ref_id, p_display_name, 'active', 'direct'
  )
  RETURNING id, slot::text AS slot, display_name INTO v_new;

  RETURN jsonb_build_object(
    'contender_id', v_new.id,
    'slot', v_new.slot,
    'display_name', v_new.display_name
  );
END;
$$;
ALTER FUNCTION public.fn_mcp_battle_add_contender(uuid, text, text, uuid, text) OWNER TO postgres;
REVOKE ALL ON FUNCTION public.fn_mcp_battle_add_contender(uuid, text, text, uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.fn_mcp_battle_add_contender(uuid, text, text, uuid, text) TO authenticated, service_role;


CREATE OR REPLACE FUNCTION public.fn_mcp_battle_update_config(
  p_battle_id          uuid,
  p_battle_type        text DEFAULT NULL,
  p_judging_mode       text DEFAULT NULL,
  p_max_contenders     integer DEFAULT NULL,
  p_ai_judge_model_key text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'battles', 'lensers', 'public'
AS $$
DECLARE
  v_caller uuid;
  v_row    record;
BEGIN
  v_caller := lensers.get_auth_lenser_id();

  IF v_caller IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM battles.battles
       WHERE id = p_battle_id
         AND deleted_at IS NULL
         AND creator_lenser_id = v_caller
    ) THEN
      RAISE EXCEPTION 'access_denied' USING HINT = 'p0403';
    END IF;
  END IF;

  UPDATE battles.battles
     SET battle_type        = COALESCE(p_battle_type::battles.battle_type_enum, battle_type),
         judging_mode       = COALESCE(p_judging_mode::battles.judging_mode_enum, judging_mode),
         max_contenders     = COALESCE(p_max_contenders, max_contenders),
         ai_judge_model_key = COALESCE(p_ai_judge_model_key, ai_judge_model_key),
         ai_judge_enabled   = CASE WHEN p_ai_judge_model_key IS NOT NULL THEN true ELSE ai_judge_enabled END,
         updated_at         = now()
   WHERE id = p_battle_id
     AND deleted_at IS NULL
  RETURNING id, title INTO v_row;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'battle_not_found' USING HINT = 'p0404';
  END IF;

  RETURN jsonb_build_object('id', v_row.id, 'title', v_row.title);
END;
$$;
ALTER FUNCTION public.fn_mcp_battle_update_config(uuid, text, text, integer, text) OWNER TO postgres;
REVOKE ALL ON FUNCTION public.fn_mcp_battle_update_config(uuid, text, text, integer, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.fn_mcp_battle_update_config(uuid, text, text, integer, text) TO authenticated, service_role;


-- ============================================================================
-- LENSES
-- ============================================================================

CREATE OR REPLACE FUNCTION public.fn_mcp_lens_get(p_lens_id uuid)
RETURNS jsonb
LANGUAGE sql SECURITY DEFINER STABLE
SET search_path TO 'lenses', 'public'
AS $$
  SELECT jsonb_build_object(
    'id', l.id,
    'lenser_id', l.lenser_id,
    'visibility', l.visibility::text,
    'status', l.status::text,
    'is_featured', l.is_featured,
    'created_at', l.created_at,
    'updated_at', l.updated_at,
    'head_version_id', l.head_version_id,
    'parent_lens_id', l.parent_lens_id,
    'head_version', (
      SELECT jsonb_build_object(
        'id', v.id,
        'semver', v.semver,
        'template_body', v.template_body,
        'input_contract', v.input_contract,
        'output_contract', v.output_contract,
        'created_at', v.created_at,
        'parameters', COALESCE((
          SELECT jsonb_agg(jsonb_build_object(
            'id', vp.id, 'label', vp.label, 'optional', vp.optional
          ) ORDER BY vp.label)
          FROM lenses.version_parameters vp WHERE vp.version_id = v.id
        ), '[]'::jsonb)
      )
      FROM lenses.versions v WHERE v.id = l.head_version_id
    )
  )
  FROM lenses.lenses l
  WHERE l.id = p_lens_id AND l.deleted_at IS NULL
  LIMIT 1;
$$;
ALTER FUNCTION public.fn_mcp_lens_get(uuid) OWNER TO postgres;
REVOKE ALL ON FUNCTION public.fn_mcp_lens_get(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.fn_mcp_lens_get(uuid) TO authenticated, service_role;


CREATE OR REPLACE FUNCTION public.fn_mcp_lens_list(
  p_limit            integer DEFAULT 20,
  p_offset           integer DEFAULT 0,
  p_visibility       text    DEFAULT NULL,
  p_status           text    DEFAULT NULL,
  p_lenser_id        uuid    DEFAULT NULL,
  p_include_archived boolean DEFAULT false
)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER STABLE
SET search_path TO 'lenses', 'public'
AS $$
DECLARE
  v_total bigint;
  v_rows  jsonb;
BEGIN
  SELECT count(*)
    INTO v_total
    FROM lenses.lenses l
   WHERE l.deleted_at IS NULL
     AND (p_include_archived OR l.status::text <> 'archived')
     AND (p_visibility IS NULL OR l.visibility::text = p_visibility)
     AND (p_status IS NULL OR l.status::text = p_status)
     AND (p_lenser_id IS NULL OR l.lenser_id = p_lenser_id);

  SELECT COALESCE(jsonb_agg(jsonb_build_object(
            'id', l.id, 'lenser_id', l.lenser_id,
            'visibility', l.visibility::text, 'status', l.status::text,
            'is_featured', l.is_featured,
            'created_at', l.created_at, 'updated_at', l.updated_at,
            'head_version_id', l.head_version_id
          ) ORDER BY l.created_at DESC), '[]'::jsonb)
    INTO v_rows
    FROM (
      SELECT *
        FROM lenses.lenses
       WHERE deleted_at IS NULL
         AND (p_include_archived OR status::text <> 'archived')
         AND (p_visibility IS NULL OR visibility::text = p_visibility)
         AND (p_status IS NULL OR status::text = p_status)
         AND (p_lenser_id IS NULL OR lenser_id = p_lenser_id)
       ORDER BY created_at DESC
       LIMIT GREATEST(p_limit, 0) OFFSET GREATEST(p_offset, 0)
    ) l;

  RETURN jsonb_build_object('data', v_rows, 'count', v_total);
END;
$$;
ALTER FUNCTION public.fn_mcp_lens_list(integer, integer, text, text, uuid, boolean) OWNER TO postgres;
REVOKE ALL ON FUNCTION public.fn_mcp_lens_list(integer, integer, text, text, uuid, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.fn_mcp_lens_list(integer, integer, text, text, uuid, boolean) TO authenticated, service_role;


CREATE OR REPLACE FUNCTION public.fn_mcp_lens_versions(p_lens_id uuid)
RETURNS jsonb
LANGUAGE sql SECURITY DEFINER STABLE
SET search_path TO 'lenses', 'public'
AS $$
  WITH ver AS (
    SELECT v.id, v.lens_id, v.semver, v.content_hash, v.created_at,
           COALESCE((
             SELECT jsonb_agg(jsonb_build_object(
               'id', vp.id, 'label', vp.label, 'optional', vp.optional
             ) ORDER BY vp.label)
             FROM lenses.version_parameters vp WHERE vp.version_id = v.id
           ), '[]'::jsonb) AS parameters
      FROM lenses.versions v
     WHERE v.lens_id = p_lens_id
     ORDER BY v.created_at DESC
  )
  SELECT jsonb_build_object(
    'lens_id', p_lens_id,
    'versions', COALESCE(jsonb_agg(jsonb_build_object(
      'id', ver.id, 'lens_id', ver.lens_id, 'semver', ver.semver,
      'content_hash', ver.content_hash, 'created_at', ver.created_at,
      'parameters', ver.parameters
    )), '[]'::jsonb),
    'count', (SELECT count(*) FROM ver)
  )
  FROM ver;
$$;
ALTER FUNCTION public.fn_mcp_lens_versions(uuid) OWNER TO postgres;
REVOKE ALL ON FUNCTION public.fn_mcp_lens_versions(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.fn_mcp_lens_versions(uuid) TO authenticated, service_role;


CREATE OR REPLACE FUNCTION public.fn_mcp_lens_get_version(
  p_lens_id    uuid,
  p_version_id uuid DEFAULT NULL,
  p_semver     text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE sql SECURITY DEFINER STABLE
SET search_path TO 'lenses', 'public'
AS $$
  SELECT jsonb_build_object(
    'id', v.id, 'lens_id', v.lens_id, 'semver', v.semver,
    'template_body', v.template_body,
    'input_contract', v.input_contract,
    'output_contract', v.output_contract,
    'content_hash', v.content_hash,
    'created_at', v.created_at,
    'parameters', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'id', vp.id, 'label', vp.label, 'optional', vp.optional
      ) ORDER BY vp.label)
      FROM lenses.version_parameters vp WHERE vp.version_id = v.id
    ), '[]'::jsonb)
  )
  FROM lenses.versions v
  WHERE v.lens_id = p_lens_id
    AND (
      (p_version_id IS NOT NULL AND v.id = p_version_id)
      OR (p_version_id IS NULL AND p_semver IS NOT NULL AND v.semver = p_semver)
    )
  LIMIT 1;
$$;
ALTER FUNCTION public.fn_mcp_lens_get_version(uuid, uuid, text) OWNER TO postgres;
REVOKE ALL ON FUNCTION public.fn_mcp_lens_get_version(uuid, uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.fn_mcp_lens_get_version(uuid, uuid, text) TO authenticated, service_role;


-- Consolidated head-version + template + parameter resolver used by
-- lens_run, lens_fork (template fallback), lens_extract_params, lens_validate_params.
CREATE OR REPLACE FUNCTION public.fn_mcp_lens_resolve_template(
  p_lens_id    uuid,
  p_version_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER STABLE
SET search_path TO 'lenses', 'public'
AS $$
DECLARE
  v_version_id uuid;
  v_body       text;
  v_params     jsonb;
BEGIN
  IF p_version_id IS NOT NULL THEN
    v_version_id := p_version_id;
  ELSE
    SELECT head_version_id INTO v_version_id
      FROM lenses.lenses
     WHERE id = p_lens_id AND deleted_at IS NULL;
    IF v_version_id IS NULL THEN
      RETURN NULL;
    END IF;
  END IF;

  SELECT template_body INTO v_body
    FROM lenses.versions WHERE id = v_version_id;
  IF v_body IS NULL THEN
    RETURN NULL;
  END IF;

  SELECT COALESCE(jsonb_agg(jsonb_build_object(
           'id', vp.id, 'label', vp.label, 'optional', vp.optional
         ) ORDER BY vp.label), '[]'::jsonb)
    INTO v_params
    FROM lenses.version_parameters vp
   WHERE vp.version_id = v_version_id;

  RETURN jsonb_build_object(
    'lens_id', p_lens_id,
    'version_id', v_version_id,
    'template_body', v_body,
    'parameters', v_params
  );
END;
$$;
ALTER FUNCTION public.fn_mcp_lens_resolve_template(uuid, uuid) OWNER TO postgres;
REVOKE ALL ON FUNCTION public.fn_mcp_lens_resolve_template(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.fn_mcp_lens_resolve_template(uuid, uuid) TO authenticated, service_role;


CREATE OR REPLACE FUNCTION public.fn_mcp_lens_archive(p_lens_id uuid)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'lenses', 'lensers', 'public'
AS $$
DECLARE
  v_caller uuid;
  v_row    record;
BEGIN
  v_caller := lensers.get_auth_lenser_id();
  IF v_caller IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM lenses.lenses
       WHERE id = p_lens_id AND deleted_at IS NULL AND lenser_id = v_caller
    ) THEN
      RAISE EXCEPTION 'access_denied' USING HINT = 'p0403';
    END IF;
  END IF;

  UPDATE lenses.lenses
     SET status      = 'archived'::content.content_status,
         archived_at = now(),
         updated_at  = now()
   WHERE id = p_lens_id AND deleted_at IS NULL
  RETURNING id, status::text, archived_at INTO v_row;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'lens_not_found' USING HINT = 'p0404';
  END IF;

  RETURN jsonb_build_object(
    'id', v_row.id, 'status', v_row.status, 'archived_at', v_row.archived_at
  );
END;
$$;
ALTER FUNCTION public.fn_mcp_lens_archive(uuid) OWNER TO postgres;
REVOKE ALL ON FUNCTION public.fn_mcp_lens_archive(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.fn_mcp_lens_archive(uuid) TO authenticated, service_role;


CREATE OR REPLACE FUNCTION public.fn_mcp_lens_delete(p_lens_id uuid)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'lenses', 'lensers', 'public'
AS $$
DECLARE
  v_caller uuid;
  v_row    record;
BEGIN
  v_caller := lensers.get_auth_lenser_id();
  IF v_caller IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM lenses.lenses
       WHERE id = p_lens_id AND deleted_at IS NULL AND lenser_id = v_caller
    ) THEN
      RAISE EXCEPTION 'access_denied' USING HINT = 'p0403';
    END IF;
  END IF;

  UPDATE lenses.lenses
     SET deleted_at = now(),
         updated_at = now()
   WHERE id = p_lens_id AND deleted_at IS NULL
  RETURNING id, deleted_at INTO v_row;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'lens_not_found' USING HINT = 'p0404';
  END IF;

  RETURN jsonb_build_object('id', v_row.id, 'deleted_at', v_row.deleted_at);
END;
$$;
ALTER FUNCTION public.fn_mcp_lens_delete(uuid) OWNER TO postgres;
REVOKE ALL ON FUNCTION public.fn_mcp_lens_delete(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.fn_mcp_lens_delete(uuid) TO authenticated, service_role;


CREATE OR REPLACE FUNCTION public.fn_mcp_lens_set_visibility(
  p_lens_id    uuid,
  p_visibility text
)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'lenses', 'lensers', 'content', 'public'
AS $$
DECLARE
  v_caller uuid;
  v_row    record;
BEGIN
  v_caller := lensers.get_auth_lenser_id();
  IF v_caller IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM lenses.lenses
       WHERE id = p_lens_id AND deleted_at IS NULL AND lenser_id = v_caller
    ) THEN
      RAISE EXCEPTION 'access_denied' USING HINT = 'p0403';
    END IF;
  END IF;

  UPDATE lenses.lenses
     SET visibility = p_visibility::content.visibility_enum,
         updated_at = now()
   WHERE id = p_lens_id AND deleted_at IS NULL
  RETURNING id, visibility::text INTO v_row;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'lens_not_found' USING HINT = 'p0404';
  END IF;

  RETURN jsonb_build_object('id', v_row.id, 'visibility', v_row.visibility);
END;
$$;
ALTER FUNCTION public.fn_mcp_lens_set_visibility(uuid, text) OWNER TO postgres;
REVOKE ALL ON FUNCTION public.fn_mcp_lens_set_visibility(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.fn_mcp_lens_set_visibility(uuid, text) TO authenticated, service_role;


CREATE OR REPLACE FUNCTION public.fn_mcp_lens_search(
  p_query      text,
  p_visibility text    DEFAULT NULL,
  p_limit      integer DEFAULT 20,
  p_offset     integer DEFAULT 0
)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER STABLE
SET search_path TO 'lenses', 'public'
AS $$
DECLARE
  v_total bigint;
  v_rows  jsonb;
  v_q     text := lower(trim(p_query));
BEGIN
  SELECT count(*)
    INTO v_total
    FROM lenses.lenses l
    LEFT JOIN lenses.versions v ON v.id = l.head_version_id
   WHERE l.deleted_at IS NULL
     AND (p_visibility IS NULL OR l.visibility::text = p_visibility)
     AND (
       l.id::text ILIKE '%' || v_q || '%'
       OR (v.template_body IS NOT NULL AND lower(v.template_body) LIKE '%' || v_q || '%')
     );

  SELECT COALESCE(jsonb_agg(jsonb_build_object(
            'id', l.id, 'lenser_id', l.lenser_id,
            'visibility', l.visibility::text, 'status', l.status::text,
            'created_at', l.created_at, 'head_version_id', l.head_version_id
          ) ORDER BY l.created_at DESC), '[]'::jsonb)
    INTO v_rows
    FROM (
      SELECT l.*
        FROM lenses.lenses l
        LEFT JOIN lenses.versions v ON v.id = l.head_version_id
       WHERE l.deleted_at IS NULL
         AND (p_visibility IS NULL OR l.visibility::text = p_visibility)
         AND (
           l.id::text ILIKE '%' || v_q || '%'
           OR (v.template_body IS NOT NULL AND lower(v.template_body) LIKE '%' || v_q || '%')
         )
       ORDER BY l.created_at DESC
       LIMIT GREATEST(p_limit, 0) OFFSET GREATEST(p_offset, 0)
    ) l;

  RETURN jsonb_build_object('data', v_rows, 'count', v_total);
END;
$$;
ALTER FUNCTION public.fn_mcp_lens_search(text, text, integer, integer) OWNER TO postgres;
REVOKE ALL ON FUNCTION public.fn_mcp_lens_search(text, text, integer, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.fn_mcp_lens_search(text, text, integer, integer) TO authenticated, service_role;


-- ============================================================================
-- WORKFLOWS
-- ============================================================================

CREATE OR REPLACE FUNCTION public.fn_mcp_workflow_get(p_workflow_id uuid)
RETURNS jsonb
LANGUAGE sql SECURITY DEFINER STABLE
SET search_path TO 'lenses', 'public'
AS $$
  SELECT jsonb_build_object(
    'id', w.id, 'lenser_id', w.lenser_id,
    'title', w.title, 'description', w.description,
    'visibility', w.visibility,
    'battle_count', w.battle_count, 'fork_count', w.fork_count,
    'head_version_id', w.head_version_id,
    'created_at', w.created_at, 'updated_at', w.updated_at
  )
  FROM lenses.workflows w
  WHERE w.id = p_workflow_id AND w.deleted_at IS NULL
  LIMIT 1;
$$;
ALTER FUNCTION public.fn_mcp_workflow_get(uuid) OWNER TO postgres;
REVOKE ALL ON FUNCTION public.fn_mcp_workflow_get(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.fn_mcp_workflow_get(uuid) TO authenticated, service_role;


CREATE OR REPLACE FUNCTION public.fn_mcp_workflow_list(
  p_limit      integer DEFAULT 20,
  p_offset     integer DEFAULT 0,
  p_visibility text    DEFAULT NULL,
  p_lenser_id  uuid    DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER STABLE
SET search_path TO 'lenses', 'public'
AS $$
DECLARE
  v_total bigint;
  v_rows  jsonb;
BEGIN
  SELECT count(*)
    INTO v_total
    FROM lenses.workflows w
   WHERE w.deleted_at IS NULL
     AND (p_visibility IS NULL OR w.visibility = p_visibility)
     AND (p_lenser_id IS NULL OR w.lenser_id = p_lenser_id);

  SELECT COALESCE(jsonb_agg(jsonb_build_object(
            'id', w.id, 'lenser_id', w.lenser_id,
            'title', w.title, 'description', w.description,
            'visibility', w.visibility,
            'battle_count', w.battle_count, 'fork_count', w.fork_count,
            'created_at', w.created_at, 'updated_at', w.updated_at
          ) ORDER BY w.created_at DESC), '[]'::jsonb)
    INTO v_rows
    FROM (
      SELECT *
        FROM lenses.workflows
       WHERE deleted_at IS NULL
         AND (p_visibility IS NULL OR visibility = p_visibility)
         AND (p_lenser_id IS NULL OR lenser_id = p_lenser_id)
       ORDER BY created_at DESC
       LIMIT GREATEST(p_limit, 0) OFFSET GREATEST(p_offset, 0)
    ) w;

  RETURN jsonb_build_object('data', v_rows, 'count', v_total);
END;
$$;
ALTER FUNCTION public.fn_mcp_workflow_list(integer, integer, text, uuid) OWNER TO postgres;
REVOKE ALL ON FUNCTION public.fn_mcp_workflow_list(integer, integer, text, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.fn_mcp_workflow_list(integer, integer, text, uuid) TO authenticated, service_role;


CREATE OR REPLACE FUNCTION public.fn_mcp_workflow_create(
  p_title       text,
  p_description text DEFAULT NULL,
  p_visibility  text DEFAULT 'private',
  p_lenser_id   uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'lenses', 'lensers', 'public'
AS $$
DECLARE
  v_owner uuid;
  v_row   record;
BEGIN
  v_owner := COALESCE(p_lenser_id, lensers.get_auth_lenser_id());
  IF v_owner IS NULL THEN
    RAISE EXCEPTION 'missing_lenser_id';
  END IF;

  INSERT INTO lenses.workflows (lenser_id, title, description, visibility)
  VALUES (v_owner, p_title, p_description, p_visibility)
  RETURNING id, title, visibility, created_at INTO v_row;

  RETURN jsonb_build_object(
    'id', v_row.id, 'title', v_row.title,
    'visibility', v_row.visibility, 'created_at', v_row.created_at
  );
END;
$$;
ALTER FUNCTION public.fn_mcp_workflow_create(text, text, text, uuid) OWNER TO postgres;
REVOKE ALL ON FUNCTION public.fn_mcp_workflow_create(text, text, text, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.fn_mcp_workflow_create(text, text, text, uuid) TO authenticated, service_role;


CREATE OR REPLACE FUNCTION public.fn_mcp_workflow_run_start(
  p_workflow_id     uuid,
  p_inputs          jsonb   DEFAULT '{}'::jsonb,
  p_global_model_id text    DEFAULT NULL,
  p_idempotency_key text    DEFAULT NULL,
  p_metadata        jsonb   DEFAULT '{}'::jsonb
)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'lenses', 'lensers', 'public'
AS $$
DECLARE
  v_row record;
BEGIN
  INSERT INTO lenses.workflow_runs (
    workflow_id, status, trigger_mode, context_inputs,
    global_model_id, idempotency_key, metadata, triggered_by
  )
  VALUES (
    p_workflow_id, 'pending', 'manual', COALESCE(p_inputs, '{}'::jsonb),
    p_global_model_id, p_idempotency_key, COALESCE(p_metadata, '{}'::jsonb),
    lensers.get_auth_lenser_id()
  )
  RETURNING id, status, created_at INTO v_row;

  RETURN jsonb_build_object(
    'id', v_row.id, 'status', v_row.status, 'created_at', v_row.created_at
  );
END;
$$;
ALTER FUNCTION public.fn_mcp_workflow_run_start(uuid, jsonb, text, text, jsonb) OWNER TO postgres;
REVOKE ALL ON FUNCTION public.fn_mcp_workflow_run_start(uuid, jsonb, text, text, jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.fn_mcp_workflow_run_start(uuid, jsonb, text, text, jsonb) TO authenticated, service_role;


CREATE OR REPLACE FUNCTION public.fn_mcp_workflow_run_status(p_run_id uuid)
RETURNS jsonb
LANGUAGE sql SECURITY DEFINER STABLE
SET search_path TO 'lenses', 'public'
AS $$
  SELECT jsonb_build_object(
    'id', r.id, 'workflow_id', r.workflow_id, 'status', r.status,
    'trigger_mode', r.trigger_mode, 'context_inputs', r.context_inputs,
    'started_at', r.started_at, 'completed_at', r.completed_at,
    'active_node_id', r.active_node_id,
    'spent_credits', r.spent_credits, 'budget_credits', r.budget_credits,
    'cost_metadata', r.cost_metadata, 'metadata', r.metadata,
    'created_at', r.created_at
  )
  FROM lenses.workflow_runs r
  WHERE r.id = p_run_id
  LIMIT 1;
$$;
ALTER FUNCTION public.fn_mcp_workflow_run_status(uuid) OWNER TO postgres;
REVOKE ALL ON FUNCTION public.fn_mcp_workflow_run_status(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.fn_mcp_workflow_run_status(uuid) TO authenticated, service_role;


CREATE OR REPLACE FUNCTION public.fn_mcp_workflow_run_logs(p_run_id uuid)
RETURNS jsonb
LANGUAGE sql SECURITY DEFINER STABLE
SET search_path TO 'lenses', 'public'
AS $$
  SELECT jsonb_build_object(
    'run', (
      SELECT jsonb_build_object(
        'id', r.id, 'status', r.status, 'metadata', r.metadata,
        'cost_metadata', r.cost_metadata,
        'started_at', r.started_at, 'completed_at', r.completed_at
      )
      FROM lenses.workflow_runs r WHERE r.id = p_run_id
    ),
    'node_results', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'id', nr.id, 'node_id', nr.node_id, 'status', nr.status,
        'output_data', nr.output_data, 'error_message', nr.error_message,
        'started_at', nr.started_at, 'completed_at', nr.completed_at,
        'input_tokens', nr.input_tokens, 'output_tokens', nr.output_tokens,
        'cost_credits', nr.cost_credits
      ) ORDER BY nr.started_at NULLS LAST)
      FROM lenses.workflow_node_results nr WHERE nr.run_id = p_run_id
    ), '[]'::jsonb)
  );
$$;
ALTER FUNCTION public.fn_mcp_workflow_run_logs(uuid) OWNER TO postgres;
REVOKE ALL ON FUNCTION public.fn_mcp_workflow_run_logs(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.fn_mcp_workflow_run_logs(uuid) TO authenticated, service_role;


CREATE OR REPLACE FUNCTION public.fn_mcp_workflow_summarize(p_run_id uuid)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER STABLE
SET search_path TO 'lenses', 'public'
AS $$
DECLARE
  v_run        record;
  v_total      bigint;
  v_completed  bigint;
  v_failed     bigint;
  v_skipped    bigint;
  v_duration   bigint;
BEGIN
  SELECT id, workflow_id, status, started_at, completed_at,
         spent_credits, budget_credits, cost_metadata
    INTO v_run
    FROM lenses.workflow_runs WHERE id = p_run_id;

  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  SELECT
    count(*) FILTER (WHERE true),
    count(*) FILTER (WHERE status = 'completed'),
    count(*) FILTER (WHERE status = 'failed'),
    count(*) FILTER (WHERE status = 'skipped')
    INTO v_total, v_completed, v_failed, v_skipped
    FROM lenses.workflow_node_results
   WHERE run_id = p_run_id;

  v_duration := CASE
    WHEN v_run.started_at IS NOT NULL AND v_run.completed_at IS NOT NULL
      THEN EXTRACT(epoch FROM (v_run.completed_at - v_run.started_at))::bigint * 1000
    ELSE NULL
  END;

  RETURN jsonb_build_object(
    'run_id', v_run.id,
    'workflow_id', v_run.workflow_id,
    'status', v_run.status,
    'duration_ms', v_duration,
    'spent_credits', v_run.spent_credits,
    'budget_credits', v_run.budget_credits,
    'cost_metadata', v_run.cost_metadata,
    'nodes', jsonb_build_object(
      'total', v_total, 'completed', v_completed,
      'failed', v_failed, 'skipped', v_skipped
    )
  );
END;
$$;
ALTER FUNCTION public.fn_mcp_workflow_summarize(uuid) OWNER TO postgres;
REVOKE ALL ON FUNCTION public.fn_mcp_workflow_summarize(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.fn_mcp_workflow_summarize(uuid) TO authenticated, service_role;


CREATE OR REPLACE FUNCTION public.fn_mcp_workflow_retry(p_run_id uuid)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'lenses', 'lensers', 'public'
AS $$
DECLARE
  v_orig record;
  v_new  record;
BEGIN
  SELECT id, workflow_id, context_inputs, global_model_id, status
    INTO v_orig
    FROM lenses.workflow_runs WHERE id = p_run_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'run_not_found' USING HINT = 'p0404';
  END IF;

  INSERT INTO lenses.workflow_runs (
    workflow_id, status, trigger_mode, context_inputs,
    global_model_id, parent_run_id, metadata, triggered_by
  )
  VALUES (
    v_orig.workflow_id, 'pending', 'manual', v_orig.context_inputs,
    v_orig.global_model_id, p_run_id,
    jsonb_build_object('mcp_tool', 'workflow_retry', 'retried_from', p_run_id),
    lensers.get_auth_lenser_id()
  )
  RETURNING id, status, created_at INTO v_new;

  RETURN jsonb_build_object(
    'new_run', jsonb_build_object(
      'id', v_new.id, 'status', v_new.status, 'created_at', v_new.created_at
    ),
    'original_run_id', p_run_id
  );
END;
$$;
ALTER FUNCTION public.fn_mcp_workflow_retry(uuid) OWNER TO postgres;
REVOKE ALL ON FUNCTION public.fn_mcp_workflow_retry(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.fn_mcp_workflow_retry(uuid) TO authenticated, service_role;
