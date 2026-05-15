-- Fix fn_upsert_agent_lens_binding: allow binding public+published lenses.
--
-- Previous check only accepted lenses owned by the AI workspace profile or the
-- calling human.  Platform/system lenses (e.g. @lenserfight-owned "Research")
-- are public and published, so any agent owner must be able to bind them.

DROP FUNCTION IF EXISTS public.fn_upsert_agent_lens_binding(
  uuid, uuid, uuid, boolean, text[]
);

CREATE OR REPLACE FUNCTION public.fn_upsert_agent_lens_binding(
  p_ai_lenser_id  uuid,
  p_lens_id       uuid,
  p_version_id    uuid    DEFAULT NULL,
  p_is_default    boolean DEFAULT true,
  p_category_tags text[]  DEFAULT '{}'
) RETURNS SETOF agents.lens_bindings
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'agents', 'lensers', 'lenses'
AS $$
DECLARE
  v_caller_human_id uuid;
  v_profile_id      uuid;
  v_binding_id      uuid;
  v_is_personality  boolean;
BEGIN
  v_caller_human_id := lensers.get_auth_human_lenser_id();
  IF v_caller_human_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  SELECT al.profile_id INTO v_profile_id
  FROM agents.ai_lensers al
  JOIN agents.ownerships o ON o.ai_lenser_id = al.id
  WHERE al.id = p_ai_lenser_id
    AND o.owner_lenser_id = v_caller_human_id
    AND o.role IN ('owner', 'co_owner')
    AND o.revoked_at IS NULL
  LIMIT 1;

  IF v_profile_id IS NULL THEN
    RAISE EXCEPTION 'Forbidden: you do not own this AI lenser'
      USING ERRCODE = '42501';
  END IF;

  -- Accept lenses that are:
  --   a) owned by the AI workspace profile, OR
  --   b) owned by the calling human co-owner, OR
  --   c) public + published (platform/system lenses accessible to everyone)
  IF NOT EXISTS (
    SELECT 1 FROM lenses.lenses l
    WHERE l.id = p_lens_id
      AND (
        l.lenser_id = v_profile_id
        OR l.lenser_id = v_caller_human_id
        OR (l.visibility = 'public' AND l.status = 'published')
      )
  ) THEN
    RAISE EXCEPTION 'Lens must be owned by the AI workspace, its co-owner, or be a public published lens'
      USING ERRCODE = '42501';
  END IF;

  v_is_personality := 'personality' = ANY(p_category_tags);

  -- Clear the default flag only within the same category scope
  IF p_is_default THEN
    IF v_is_personality THEN
      UPDATE agents.lens_bindings
        SET is_default = false
        WHERE ai_lenser_id = p_ai_lenser_id
          AND is_default = true
          AND 'personality' = ANY(category_tags);
    ELSE
      UPDATE agents.lens_bindings
        SET is_default = false
        WHERE ai_lenser_id = p_ai_lenser_id
          AND is_default = true
          AND NOT ('personality' = ANY(category_tags));
    END IF;
  END IF;

  INSERT INTO agents.lens_bindings
    (ai_lenser_id, lens_id, version_id, is_default, category_tags)
  VALUES
    (p_ai_lenser_id, p_lens_id, p_version_id, p_is_default, p_category_tags)
  ON CONFLICT (ai_lenser_id, lens_id) DO UPDATE
    SET version_id    = EXCLUDED.version_id,
        is_default    = EXCLUDED.is_default,
        category_tags = EXCLUDED.category_tags
  RETURNING id INTO v_binding_id;

  INSERT INTO agents.action_logs (ai_lenser_id, action_type, result, metadata)
  VALUES (
    p_ai_lenser_id,
    'binding_updated',
    'success',
    jsonb_build_object(
      'binding_kind',  'lens',
      'binding_id',    v_binding_id,
      'lens_id',       p_lens_id,
      'version_id',    p_version_id,
      'is_default',    p_is_default,
      'category_tags', p_category_tags
    )
  );

  RETURN QUERY SELECT lb.* FROM agents.lens_bindings lb WHERE lb.id = v_binding_id LIMIT 1;
END;
$$;

ALTER FUNCTION public.fn_upsert_agent_lens_binding(uuid, uuid, uuid, boolean, text[])
  OWNER TO postgres;

GRANT EXECUTE
  ON FUNCTION public.fn_upsert_agent_lens_binding(uuid, uuid, uuid, boolean, text[])
  TO authenticated, service_role;
