-- Phase AC: Autonomous battle lifecycle
-- Adds battles.schedules for per-battle timing, fn_battle_lifecycle_tick as
-- the pg_cron state machine, and fn_battle_force_transition for admin overrides.
--
-- Maps to existing battle_status_enum:
--   draft → open       (when open_at <= now())
--   scoring → closed   (when judge_at <= now(), auto_judge = true)
--   closed → published (when publish_at <= now(), auto_publish = true)
--
-- All transitions check fn_kill_switch_active('system', NULL) and
-- fn_kill_switch_active('battle', battle_id) before proceeding.

-- ─── battles.schedules ──────────────────────────────────────────────────────

CREATE TABLE battles.schedules (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  battle_id    UUID        NOT NULL UNIQUE REFERENCES battles.battles(id) ON DELETE CASCADE,
  open_at      TIMESTAMPTZ,          -- draft → open
  judge_at     TIMESTAMPTZ,          -- scoring → closed (AI judge)
  publish_at   TIMESTAMPTZ,          -- closed → published
  auto_judge   BOOLEAN     NOT NULL DEFAULT true,
  auto_publish BOOLEAN     NOT NULL DEFAULT true,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT schedule_open_before_judge
    CHECK (open_at IS NULL OR judge_at IS NULL OR open_at < judge_at),
  CONSTRAINT schedule_judge_before_publish
    CHECK (judge_at IS NULL OR publish_at IS NULL OR judge_at < publish_at)
);

CREATE INDEX idx_schedules_open_at    ON battles.schedules (open_at)    WHERE open_at IS NOT NULL;
CREATE INDEX idx_schedules_judge_at   ON battles.schedules (judge_at)   WHERE judge_at IS NOT NULL;
CREATE INDEX idx_schedules_publish_at ON battles.schedules (publish_at) WHERE publish_at IS NOT NULL;

ALTER TABLE battles.schedules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "schedule_owner_select" ON battles.schedules
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM battles.battles b
      WHERE b.id = battle_id
      AND b.creator_lenser_id = (
        SELECT id FROM lensers.profiles WHERE user_id = auth.uid()
      )
    )
  );

-- ─── fn_battle_set_schedule ──────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.fn_battle_set_schedule(
  p_battle_id    UUID,
  p_open_at      TIMESTAMPTZ DEFAULT NULL,
  p_judge_at     TIMESTAMPTZ DEFAULT NULL,
  p_publish_at   TIMESTAMPTZ DEFAULT NULL,
  p_auto_judge   BOOLEAN     DEFAULT true,
  p_auto_publish BOOLEAN     DEFAULT true
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = battles, lensers, public
AS $$
DECLARE
  v_lenser_id UUID;
  v_sched_id  UUID;
BEGIN
  SELECT id INTO v_lenser_id
  FROM   lensers.profiles
  WHERE  user_id = auth.uid();

  IF NOT EXISTS (
    SELECT 1 FROM battles.battles
    WHERE id = p_battle_id AND creator_lenser_id = v_lenser_id
  ) AND NOT public.is_admin() THEN
    RAISE EXCEPTION 'set_schedule_forbidden: must be battle creator or admin';
  END IF;

  INSERT INTO battles.schedules (battle_id, open_at, judge_at, publish_at, auto_judge, auto_publish)
  VALUES (p_battle_id, p_open_at, p_judge_at, p_publish_at, p_auto_judge, p_auto_publish)
  ON CONFLICT (battle_id) DO UPDATE
    SET open_at      = EXCLUDED.open_at,
        judge_at     = EXCLUDED.judge_at,
        publish_at   = EXCLUDED.publish_at,
        auto_judge   = EXCLUDED.auto_judge,
        auto_publish = EXCLUDED.auto_publish,
        updated_at   = now()
  RETURNING id INTO v_sched_id;

  RETURN v_sched_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.fn_battle_set_schedule(UUID, TIMESTAMPTZ, TIMESTAMPTZ, TIMESTAMPTZ, BOOLEAN, BOOLEAN) TO authenticated;

-- ─── fn_battle_lifecycle_tick ────────────────────────────────────────────────
-- Processes all scheduled transitions in a single pass.
-- Called by pg_cron every minute. Uses advisory locks for safety.

CREATE OR REPLACE FUNCTION battles.fn_battle_lifecycle_tick()
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = battles, admin, audit, public
AS $$
DECLARE
  r         RECORD;
  processed INT := 0;
BEGIN
  -- System kill switch — halt all autonomous operations
  IF public.fn_kill_switch_active('system', NULL) THEN
    RAISE NOTICE 'fn_battle_lifecycle_tick: system kill switch active — skipping';
    RETURN 0;
  END IF;

  -- 1. draft → open (when open_at <= now())
  FOR r IN
    SELECT b.id, b.status
    FROM   battles.battles b
    JOIN   battles.schedules s ON s.battle_id = b.id
    WHERE  b.status      = 'draft'
    AND    s.open_at    <= now()
    AND    b.deleted_at IS NULL
    FOR UPDATE SKIP LOCKED
  LOOP
    BEGIN
      -- Per-battle kill switch
      CONTINUE WHEN public.fn_kill_switch_active('battle', r.id);

      UPDATE battles.battles
      SET    status     = 'open',
             updated_at = now()
      WHERE  id = r.id;

      INSERT INTO audit.events (event_type, actor_type, severity, payload)
      VALUES (
        'battle.lifecycle.auto_opened', 'system', 'info',
        jsonb_build_object('battle_id', r.id, 'tick', now())
      );

      processed := processed + 1;
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'lifecycle_tick.open: battle % failed: %', r.id, SQLERRM;
    END;
  END LOOP;

  -- 2. scoring → closed (auto-judge when judge_at <= now())
  FOR r IN
    SELECT b.id
    FROM   battles.battles b
    JOIN   battles.schedules s ON s.battle_id = b.id
    WHERE  b.status      = 'scoring'
    AND    s.auto_judge  = true
    AND    s.judge_at   <= now()
    AND    b.deleted_at IS NULL
    FOR UPDATE SKIP LOCKED
  LOOP
    BEGIN
      CONTINUE WHEN public.fn_kill_switch_active('battle', r.id);

      -- Transition to closed; AI judge result can be attached by a separate worker.
      -- When fn_ai_judge_evaluate is implemented, call it here before closing.
      UPDATE battles.battles
      SET    status     = 'closed',
             updated_at = now()
      WHERE  id = r.id;

      INSERT INTO audit.events (event_type, actor_type, severity, payload)
      VALUES (
        'battle.lifecycle.auto_judged', 'system', 'info',
        jsonb_build_object('battle_id', r.id, 'tick', now())
      );

      processed := processed + 1;
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'lifecycle_tick.judge: battle % failed: %', r.id, SQLERRM;
    END;
  END LOOP;

  -- 3. closed → published (when publish_at <= now())
  FOR r IN
    SELECT b.id
    FROM   battles.battles b
    JOIN   battles.schedules s ON s.battle_id = b.id
    WHERE  b.status        = 'closed'
    AND    s.auto_publish  = true
    AND    s.publish_at   <= now()
    AND    b.deleted_at   IS NULL
    FOR UPDATE SKIP LOCKED
  LOOP
    BEGIN
      CONTINUE WHEN public.fn_kill_switch_active('battle', r.id);

      UPDATE battles.battles
      SET    status       = 'published',
             published_at = now(),
             updated_at   = now()
      WHERE  id = r.id;

      INSERT INTO audit.events (event_type, actor_type, severity, payload)
      VALUES (
        'battle.lifecycle.auto_published', 'system', 'info',
        jsonb_build_object('battle_id', r.id, 'tick', now())
      );

      processed := processed + 1;
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'lifecycle_tick.publish: battle % failed: %', r.id, SQLERRM;
    END;
  END LOOP;

  RETURN processed;
END;
$$;

-- ─── fn_battle_force_transition ──────────────────────────────────────────────
-- Admin override: force any battle into a target status with reason audit log.

CREATE OR REPLACE FUNCTION public.fn_battle_force_transition(
  p_battle_id     UUID,
  p_target_status TEXT,
  p_reason        TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = battles, lensers, audit, public
AS $$
DECLARE
  v_operator_id UUID;
  v_old_status  TEXT;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'force_transition_forbidden: admin role required';
  END IF;

  SELECT p.id INTO v_operator_id
  FROM   lensers.profiles p
  WHERE  p.user_id = auth.uid();

  SELECT status::TEXT INTO v_old_status
  FROM   battles.battles
  WHERE  id = p_battle_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'force_transition_battle_not_found: %', p_battle_id;
  END IF;

  IF p_target_status NOT IN ('draft', 'open', 'executing', 'voting', 'scoring', 'closed', 'published', 'archived') THEN
    RAISE EXCEPTION 'force_transition_invalid_status: %', p_target_status;
  END IF;

  UPDATE battles.battles
  SET    status       = p_target_status::battles.battle_status_enum,
         updated_at   = now(),
         published_at = CASE WHEN p_target_status = 'published' THEN now() ELSE published_at END,
         finalized_at = CASE WHEN p_target_status IN ('closed', 'published') THEN now() ELSE finalized_at END
  WHERE  id = p_battle_id;

  INSERT INTO audit.events (event_type, actor_type, actor_id, severity, payload)
  VALUES (
    'battle.admin.force_transition',
    'lenser',
    v_operator_id,
    'warn',
    jsonb_build_object(
      'battle_id',     p_battle_id,
      'from_status',   v_old_status,
      'to_status',     p_target_status,
      'reason',        p_reason
    )
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.fn_battle_force_transition(UUID, TEXT, TEXT) TO authenticated;

-- ─── pg_cron: battle-lifecycle-tick ─────────────────────────────────────────

SELECT cron.schedule(
  'battle-lifecycle-tick',
  '*/1 * * * *',
  $$SELECT battles.fn_battle_lifecycle_tick()$$
);
