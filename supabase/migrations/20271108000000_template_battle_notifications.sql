-- Phase BF — Notifications for battles created from a template.
--
-- 1. Adds battles.battles.template_id (nullable FK) so we can recognise
--    "started from template <X>" battles for the rest of their lifetime.
-- 2. Patches fn_battles_create_from_template to stamp the new column.
-- 3. Adds a trigger that fires on status transitions to 'open' or
--    'published' and creates a notification for the battle's creator
--    via public.fn_insert_notification.

-- ── 0. extend notifications CHECK to include the new types ─────────────────
ALTER TABLE public.notifications
  DROP CONSTRAINT IF EXISTS notifications_type_check;

ALTER TABLE public.notifications
  ADD CONSTRAINT notifications_type_check
  CHECK (type IN (
    'battle_result',
    'battle_started',
    'vote_reminder',
    'template_battle_open',
    'template_battle_published',
    'vote_received',
    'battle_assigned',
    'battle_vote_cast',
    'follow_new',
    'follow_request',
    'follow_accepted',
    'lens_reaction',
    'lens_comment',
    'agent_update',
    'agent_cron_result',
    'agent_critical',
    'team_run_started',
    'team_run_completed',
    'team_run_failed',
    'cron_run_completed',
    'cron_run_failed',
    'policy_updated',
    'model_binding_changed',
    'requirement_update',
    'badge_awarded',
    'system'
  ));

-- ── 1. column ───────────────────────────────────────────────────────────────
ALTER TABLE battles.battles
  ADD COLUMN IF NOT EXISTS template_id UUID
    REFERENCES battles.templates(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_battles_template_id
  ON battles.battles (template_id)
  WHERE template_id IS NOT NULL;

COMMENT ON COLUMN battles.battles.template_id IS
  'Phase BF: NULL for ad-hoc battles, populated when created via '
  'fn_battles_create_from_template. Used by trg_notify_template_battle_status.';

-- ── 2. patch fn_battles_create_from_template ────────────────────────────────
CREATE OR REPLACE FUNCTION public.fn_battles_create_from_template(
  p_template_id uuid,
  p_title       text,
  p_slug        text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, battles, lensers
AS $$
DECLARE
  v_template RECORD;
  v_lenser_id uuid;
  v_battle_id uuid;
BEGIN
  v_lenser_id := lensers.get_auth_lenser_id();

  SELECT * INTO v_template
    FROM battles.templates
   WHERE id = p_template_id
     AND deleted_at IS NULL
     AND (is_public = true OR creator_lenser_id = v_lenser_id);

  IF v_template IS NULL THEN
    RAISE EXCEPTION 'Template not found or not accessible';
  END IF;

  INSERT INTO battles.battles (
    creator_lenser_id, title, slug, task_prompt, rubric_id,
    status, max_contenders, template_id
  )
  VALUES (
    v_lenser_id, p_title, p_slug, v_template.task_prompt,
    v_template.rubric_id, 'draft', v_template.max_contenders, p_template_id
  )
  RETURNING id INTO v_battle_id;

  RETURN v_battle_id;
END $$;

ALTER FUNCTION public.fn_battles_create_from_template(uuid, text, text) OWNER TO postgres;

-- ── 3. trigger function ─────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION battles.fn_trg_template_battle_status_notify()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = battles, public, lensers
AS $$
DECLARE
  v_type  TEXT;
  v_title TEXT;
  v_body  TEXT;
BEGIN
  IF NEW.template_id IS NULL THEN
    RETURN NEW;
  END IF;
  IF NEW.status::text NOT IN ('open', 'published') THEN
    RETURN NEW;
  END IF;
  IF OLD.status IS NOT DISTINCT FROM NEW.status THEN
    RETURN NEW;
  END IF;
  IF NEW.creator_lenser_id IS NULL THEN
    RETURN NEW;
  END IF;

  v_type  := 'template_battle_' || NEW.status::text;
  v_title := CASE NEW.status::text
               WHEN 'open'      THEN format($f$Your template battle "%s" is now open$f$, NEW.title)
               WHEN 'published' THEN format($f$Your template battle "%s" has been published$f$, NEW.title)
             END;
  v_body  := CASE NEW.status::text
               WHEN 'open'      THEN 'Contenders can now submit entries.'
               WHEN 'published' THEN 'Results are live.'
             END;

  PERFORM public.fn_insert_notification(
    NEW.creator_lenser_id,
    v_type,
    v_title,
    v_body,
    '/battles/' || COALESCE(NEW.slug, NEW.id::text),
    jsonb_build_object(
      'battle_id',   NEW.id,
      'template_id', NEW.template_id,
      'title',       NEW.title,
      'status',      NEW.status::text
    )
  );

  RETURN NEW;
END $$;

ALTER FUNCTION battles.fn_trg_template_battle_status_notify() OWNER TO postgres;

DROP TRIGGER IF EXISTS trg_notify_template_battle_status ON battles.battles;
CREATE TRIGGER trg_notify_template_battle_status
  AFTER UPDATE OF status ON battles.battles
  FOR EACH ROW
  WHEN (NEW.template_id IS NOT NULL)
  EXECUTE FUNCTION battles.fn_trg_template_battle_status_notify();

COMMENT ON TRIGGER trg_notify_template_battle_status ON battles.battles IS
  'Phase BF: notifies the creator when a template-sourced battle opens / is '
  'published. Skips ad-hoc battles where template_id IS NULL.';
