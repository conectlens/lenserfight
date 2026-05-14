-- Replace single-default partial index with two category-scoped indexes,
-- extend fn_upsert_agent_lens_binding with optional p_category_tags.
-- OCP: existing 4-arg callers continue to work — p_category_tags defaults to '{}',
-- which satisfies the instruction partial index unchanged.
--
-- Also fixes lens-ownership check: accept lenses owned by the AI workspace profile
-- OR by the calling human co-owner. The wizard flow (AgentManageWizard) does not
-- switch the active workspace before binding, so human-owned lenses are valid when
-- the caller has ownership of the AI workspace.

-- 1. Drop the old single-default partial index
DROP INDEX IF EXISTS agents.idx_agent_lens_one_default;

-- 2. Two scoped partial unique indexes
--    At most one instruction (non-personality) default per agent
CREATE UNIQUE INDEX IF NOT EXISTS idx_agent_lens_default_instruction
  ON agents.lens_bindings (ai_lenser_id)
  WHERE is_default = true
    AND NOT ('personality' = ANY(category_tags));

--    At most one personality default per agent
CREATE UNIQUE INDEX IF NOT EXISTS idx_agent_lens_default_personality
  ON agents.lens_bindings (ai_lenser_id)
  WHERE is_default = true
    AND 'personality' = ANY(category_tags);

-- 3. Replace fn_upsert_agent_lens_binding with extended signature
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

  IF NOT EXISTS (
    SELECT 1 FROM lenses.lenses l
    WHERE l.id = p_lens_id
      AND (l.lenser_id = v_profile_id OR l.lenser_id = v_caller_human_id)
  ) THEN
    RAISE EXCEPTION 'Lens must be owned by the AI workspace or its co-owner'
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
