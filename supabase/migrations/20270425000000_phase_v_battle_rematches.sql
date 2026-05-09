-- Phase V1: Battle rematches with parent lineage
--
-- Adds a single self-referential pointer on `battles.battles` so that any
-- battle created as a rematch of another battle carries its lineage. The
-- column is NULL for organic battles. ON DELETE SET NULL keeps history
-- viewable even after the parent is hard-deleted (rare; soft-delete is the
-- normal path via deleted_at).
--
-- The rematch RPC clones the parent's structural fields (task_prompt, rubric,
-- max_contenders, battle_type, voter_eligibility, handicap_config, workflow,
-- lens, content_type) and reproduces the contender list with a slot rotation
-- (see V1.2 for the rotation contract).
--
-- Two function variants are provided:
--   * `public.fn_battles_create_rematch(p_parent_id)` — caller-facing,
--     enforces ownership of the parent battle.
--   * `battles.fn_create_rematch_internal(p_parent_id)` — service-role only,
--     used by the Phase V4 series dispatcher to chain rematches without an
--     authenticated user context.
-- Both share a single private helper `battles.fn_clone_battle_for_rematch`
-- so the contender-rotation logic lives in one place.
--
-- This migration does not introduce new RLS policies on `battles.battles` —
-- existing battles policies cover SELECT/INSERT/UPDATE on the new column
-- because policies are row-scoped, not column-scoped.

-- ─── 1. Lineage column ──────────────────────────────────────────────────────

ALTER TABLE battles.battles
  ADD COLUMN IF NOT EXISTS parent_battle_id uuid NULL
    REFERENCES battles.battles(id) ON DELETE SET NULL;

COMMENT ON COLUMN battles.battles.parent_battle_id IS
  'Phase V1: when this battle was created as a rematch of another battle, '
  'this points to the parent. NULL for organic battles. ON DELETE SET NULL '
  'preserves rematch history when an upstream parent is hard-deleted.';

CREATE INDEX IF NOT EXISTS idx_battles_parent_battle_id
  ON battles.battles (parent_battle_id)
  WHERE parent_battle_id IS NOT NULL;

-- ─── 2. Private clone helper ────────────────────────────────────────────────
--
-- Clones a parent battle row + its contenders into a fresh draft battle. Slot
-- rotation contract:
--
--   * 2 contenders: A↔B (swap).
--   * 3+ contenders: rotate by 1 slot — the contender currently in slot N
--     moves to slot N-1; the contender currently in slot A wraps to the last
--     slot. This guarantees no contender keeps the same slot, which is what
--     "rematch" is meant to express. See note in the report: 3+ contender
--     rotation is best-effort and the UX may want a different policy
--     (e.g. random shuffle) — revisit when the multi-contender UI is built.
--
--   * Withdrawn / disqualified / eliminated parent contenders are NOT
--     cloned. Only contender_status='active' rows are carried forward.
--
-- This is a SECURITY DEFINER helper restricted to postgres / service_role; it
-- intentionally performs no ownership check. Callers must enforce ownership.

CREATE OR REPLACE FUNCTION battles.fn_clone_battle_for_rematch(
  p_parent_id uuid
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, battles, lensers
AS $$
DECLARE
  v_parent          battles.battles%ROWTYPE;
  v_new_id          uuid;
  v_new_slug        text;
  v_invite_code     text;
  v_active_count    int;
  v_slot_count      int;
BEGIN
  SELECT * INTO v_parent
    FROM battles.battles
   WHERE id = p_parent_id
     AND deleted_at IS NULL;

  IF v_parent.id IS NULL THEN
    RAISE EXCEPTION 'parent_battle_not_found: %', p_parent_id
      USING ERRCODE = 'P0002';
  END IF;

  IF v_parent.status NOT IN ('closed','published','archived') THEN
    RAISE EXCEPTION
      'parent_battle_not_terminal: status=% (must be closed/published/archived)',
      v_parent.status
      USING ERRCODE = '22023';
  END IF;

  -- Slug: parent slug + '-r' + 6 random hex chars. Truncate parent prefix to
  -- 200 chars to keep the result well under any reasonable length cap.
  v_new_slug := substr(v_parent.slug, 1, 200) || '-r' ||
                substr(replace(gen_random_uuid()::text, '-', ''), 1, 6);

  v_invite_code := substr(replace(gen_random_uuid()::text, '-', ''), 1, 12);

  INSERT INTO battles.battles (
    creator_lenser_id, title, slug, task_prompt, rubric_id,
    status, invite_code, max_contenders,
    battle_type, voter_eligibility, handicap_config,
    workflow_id, lens_id, content_type,
    parent_battle_id
  )
  VALUES (
    v_parent.creator_lenser_id,
    'Rematch: ' || v_parent.title,
    v_new_slug,
    v_parent.task_prompt,
    v_parent.rubric_id,
    'draft'::battles.battle_status_enum,
    v_invite_code,
    v_parent.max_contenders,
    v_parent.battle_type,
    v_parent.voter_eligibility,
    v_parent.handicap_config,
    v_parent.workflow_id,
    v_parent.lens_id,
    v_parent.content_type,
    v_parent.id
  )
  RETURNING id INTO v_new_id;

  -- Count active parent contenders so we can compute the rotation modulus.
  SELECT count(*) INTO v_active_count
    FROM battles.contenders
   WHERE battle_id = v_parent.id
     AND contender_status = 'active';

  IF v_active_count = 0 THEN
    RETURN v_new_id;
  END IF;

  -- Distinct slots across active contenders (used as rotation modulus).
  -- We rotate within the *occupied* slots, sorted ascending.
  WITH active AS (
    SELECT id, slot, contender_type, contender_ref_id, display_name,
           team_id, entry_mode,
           ROW_NUMBER() OVER (ORDER BY slot ASC) - 1 AS idx,
           COUNT(*)     OVER ()                       AS total
      FROM battles.contenders
     WHERE battle_id = v_parent.id
       AND contender_status = 'active'
  ),
  slot_order AS (
    SELECT slot,
           ROW_NUMBER() OVER (ORDER BY slot ASC) - 1 AS slot_idx
      FROM (
        SELECT DISTINCT slot
          FROM battles.contenders
         WHERE battle_id = v_parent.id
           AND contender_status = 'active'
      ) s
  )
  INSERT INTO battles.contenders (
    battle_id, slot, contender_type, contender_ref_id,
    display_name, team_id, entry_mode, contender_status
  )
  SELECT
    v_new_id,
    -- Rotation: contender at idx i is reseated into the slot at position
    -- (i - 1) mod total, taken from slot_order. For total=2 this is a swap;
    -- for total>=3 this is a left rotation by one position.
    (SELECT slot FROM slot_order
       WHERE slot_idx = ((a.idx - 1 + a.total) % a.total)),
    a.contender_type,
    a.contender_ref_id,
    a.display_name,
    a.team_id,
    a.entry_mode,
    -- Reset lifecycle: the rematch starts fresh, so reseated contenders
    -- enter as 'pending' rather than inheriting 'active'. The owner must
    -- re-open / re-publish the rematch.
    'pending'::text
  FROM active a;

  RETURN v_new_id;
END;
$$;

ALTER FUNCTION battles.fn_clone_battle_for_rematch(uuid) OWNER TO postgres;
REVOKE ALL ON FUNCTION battles.fn_clone_battle_for_rematch(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION battles.fn_clone_battle_for_rematch(uuid) TO service_role;

COMMENT ON FUNCTION battles.fn_clone_battle_for_rematch(uuid) IS
  'Phase V1 internal helper. Clones a terminal-state parent battle (closed/'
  'published/archived) into a fresh draft, copies the structural columns, '
  'rotates contender slots by one position, and links parent_battle_id. '
  'Performs NO ownership check — callers must enforce that. Service role '
  'only; the public-facing wrapper is public.fn_battles_create_rematch.';

-- ─── 3. Service-role-only internal entry point (V4 dispatcher) ──────────────

CREATE OR REPLACE FUNCTION battles.fn_create_rematch_internal(
  p_parent_id uuid
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, battles, lensers
AS $$
BEGIN
  RETURN battles.fn_clone_battle_for_rematch(p_parent_id);
END;
$$;

ALTER FUNCTION battles.fn_create_rematch_internal(uuid) OWNER TO postgres;
REVOKE ALL ON FUNCTION battles.fn_create_rematch_internal(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION battles.fn_create_rematch_internal(uuid) FROM authenticated;
GRANT EXECUTE ON FUNCTION battles.fn_create_rematch_internal(uuid) TO service_role;

COMMENT ON FUNCTION battles.fn_create_rematch_internal(uuid) IS
  'Phase V1/V4: service-role-only entry point that bypasses caller ownership. '
  'Used by battles.fn_dispatch_series_rematches to chain a series. NEVER '
  'grant this to authenticated.';

-- ─── 4. Authenticated rematch RPC ───────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.fn_battles_create_rematch(
  p_parent_id uuid
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, battles, lensers
AS $$
DECLARE
  v_caller   uuid;
  v_owner    uuid;
BEGIN
  v_caller := lensers.get_auth_lenser_id();
  IF v_caller IS NULL THEN
    RAISE EXCEPTION 'authentication_required' USING ERRCODE = '42501';
  END IF;

  SELECT creator_lenser_id INTO v_owner
    FROM battles.battles
   WHERE id = p_parent_id
     AND deleted_at IS NULL;

  IF v_owner IS NULL THEN
    RAISE EXCEPTION 'parent_battle_not_found: %', p_parent_id
      USING ERRCODE = 'P0002';
  END IF;

  IF v_owner IS DISTINCT FROM v_caller THEN
    RAISE EXCEPTION 'not_battle_owner' USING ERRCODE = '42501';
  END IF;

  RETURN battles.fn_clone_battle_for_rematch(p_parent_id);
END;
$$;

ALTER FUNCTION public.fn_battles_create_rematch(uuid) OWNER TO postgres;
REVOKE ALL ON FUNCTION public.fn_battles_create_rematch(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.fn_battles_create_rematch(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.fn_battles_create_rematch(uuid) TO service_role;

COMMENT ON FUNCTION public.fn_battles_create_rematch(uuid) IS
  'Phase V1: authenticated wrapper. Creates a draft rematch of a terminal '
  'parent battle the caller owns. Clones structural fields and rotates '
  'contender slots. Returns the new battle id.';
