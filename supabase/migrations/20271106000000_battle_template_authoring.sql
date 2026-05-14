-- Phase BD — Battle template authoring (create / update / delete).
--
-- Lets an authenticated user manage their own battles.templates rows. Owner
-- model: creator_lenser_id = lensers.get_auth_lenser_id() (lenser profile id,
-- not the raw auth user UUID — templates_creator_fk references lensers.profiles).
--
-- - create: stamps creator_lenser_id from lensers.get_auth_lenser_id(); validates category.
-- - update: only the creator may mutate; COALESCE for optional patches.
-- - delete: soft delete; subsequent calls are no-ops.
-- All four are SECURITY DEFINER + raise 42501 on ownership violation.

-- ── 1. fn_battles_create_template ───────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.fn_battles_create_template(
  p_title          TEXT,
  p_description    TEXT DEFAULT NULL,
  p_task_prompt    TEXT DEFAULT '',
  p_category       TEXT DEFAULT NULL,
  p_max_contenders INT  DEFAULT 2,
  p_is_public      BOOLEAN DEFAULT false
)
RETURNS battles.templates
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, battles, lensers, extensions
AS $$
DECLARE
  v_lenser_id UUID := lensers.get_auth_lenser_id();
  v_row       battles.templates%ROWTYPE;
BEGIN
  IF v_lenser_id IS NULL THEN
    RAISE EXCEPTION 'auth_required' USING ERRCODE = '42501';
  END IF;
  IF p_title IS NULL OR char_length(trim(p_title)) = 0 THEN
    RAISE EXCEPTION 'title_required' USING ERRCODE = '22023';
  END IF;
  IF p_task_prompt IS NULL OR char_length(trim(p_task_prompt)) = 0 THEN
    RAISE EXCEPTION 'task_prompt_required' USING ERRCODE = '22023';
  END IF;
  IF p_category IS NOT NULL
     AND p_category NOT IN ('creative','technical','business','gaming') THEN
    RAISE EXCEPTION 'invalid_category: %', p_category USING ERRCODE = '22023';
  END IF;
  IF p_max_contenders < 2 THEN
    RAISE EXCEPTION 'max_contenders_too_small' USING ERRCODE = '22023';
  END IF;

  INSERT INTO battles.templates (
    creator_lenser_id, title, description, task_prompt,
    category, max_contenders, is_public
  ) VALUES (
    v_lenser_id, p_title, p_description, p_task_prompt,
    p_category, p_max_contenders, COALESCE(p_is_public, false)
  )
  RETURNING * INTO v_row;

  RETURN v_row;
END $$;

ALTER FUNCTION public.fn_battles_create_template(TEXT, TEXT, TEXT, TEXT, INT, BOOLEAN) OWNER TO postgres;
GRANT EXECUTE ON FUNCTION public.fn_battles_create_template(TEXT, TEXT, TEXT, TEXT, INT, BOOLEAN)
  TO authenticated, service_role;

-- ── 2. fn_battles_update_template ───────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.fn_battles_update_template(
  p_template_id    UUID,
  p_title          TEXT    DEFAULT NULL,
  p_description    TEXT    DEFAULT NULL,
  p_task_prompt    TEXT    DEFAULT NULL,
  p_category       TEXT    DEFAULT NULL,
  p_max_contenders INT     DEFAULT NULL,
  p_is_public      BOOLEAN DEFAULT NULL
)
RETURNS battles.templates
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, battles, lensers, extensions
AS $$
DECLARE
  v_lenser_id UUID := lensers.get_auth_lenser_id();
  v_row       battles.templates%ROWTYPE;
BEGIN
  IF v_lenser_id IS NULL THEN
    RAISE EXCEPTION 'auth_required' USING ERRCODE = '42501';
  END IF;
  IF p_category IS NOT NULL
     AND p_category NOT IN ('creative','technical','business','gaming') THEN
    RAISE EXCEPTION 'invalid_category: %', p_category USING ERRCODE = '22023';
  END IF;
  IF p_max_contenders IS NOT NULL AND p_max_contenders < 2 THEN
    RAISE EXCEPTION 'max_contenders_too_small' USING ERRCODE = '22023';
  END IF;

  UPDATE battles.templates t
     SET title          = COALESCE(p_title,          t.title),
         description    = COALESCE(p_description,    t.description),
         task_prompt    = COALESCE(p_task_prompt,    t.task_prompt),
         category       = COALESCE(p_category,       t.category),
         max_contenders = COALESCE(p_max_contenders, t.max_contenders),
         is_public      = COALESCE(p_is_public,      t.is_public),
         updated_at     = now()
   WHERE t.id                = p_template_id
     AND t.creator_lenser_id = v_lenser_id
     AND t.deleted_at IS NULL
   RETURNING * INTO v_row;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'template_not_owned' USING ERRCODE = '42501';
  END IF;

  RETURN v_row;
END $$;

ALTER FUNCTION public.fn_battles_update_template(UUID, TEXT, TEXT, TEXT, TEXT, INT, BOOLEAN) OWNER TO postgres;
GRANT EXECUTE ON FUNCTION public.fn_battles_update_template(UUID, TEXT, TEXT, TEXT, TEXT, INT, BOOLEAN)
  TO authenticated, service_role;

-- ── 3. fn_battles_delete_template ───────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.fn_battles_delete_template(
  p_template_id UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, battles, lensers, extensions
AS $$
DECLARE
  v_lenser_id UUID := lensers.get_auth_lenser_id();
BEGIN
  IF v_lenser_id IS NULL THEN
    RAISE EXCEPTION 'auth_required' USING ERRCODE = '42501';
  END IF;

  UPDATE battles.templates
     SET deleted_at = now(),
         updated_at = now(),
         is_public  = false
   WHERE id                = p_template_id
     AND creator_lenser_id = v_lenser_id
     AND deleted_at IS NULL;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'template_not_owned' USING ERRCODE = '42501';
  END IF;
END $$;

ALTER FUNCTION public.fn_battles_delete_template(UUID) OWNER TO postgres;
GRANT EXECUTE ON FUNCTION public.fn_battles_delete_template(UUID)
  TO authenticated, service_role;

-- ── 4. fn_battles_get_template — owner-scoped fetch for the editor ──────────
CREATE OR REPLACE FUNCTION public.fn_battles_get_template(
  p_template_id UUID
)
RETURNS battles.templates
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, battles, lensers, extensions
AS $$
DECLARE
  v_lenser_id UUID := lensers.get_auth_lenser_id();
  v_row       battles.templates%ROWTYPE;
BEGIN
  IF v_lenser_id IS NULL THEN
    RAISE EXCEPTION 'auth_required' USING ERRCODE = '42501';
  END IF;
  SELECT * INTO v_row
    FROM battles.templates
   WHERE id = p_template_id
     AND deleted_at IS NULL
     AND (creator_lenser_id = v_lenser_id OR is_public = true);

  IF NOT FOUND THEN
    RAISE EXCEPTION 'template_not_found' USING ERRCODE = '42501';
  END IF;
  RETURN v_row;
END $$;

ALTER FUNCTION public.fn_battles_get_template(UUID) OWNER TO postgres;
GRANT EXECUTE ON FUNCTION public.fn_battles_get_template(UUID)
  TO authenticated, service_role;
