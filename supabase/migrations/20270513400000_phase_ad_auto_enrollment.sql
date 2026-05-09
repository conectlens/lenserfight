-- Phase AD: Agent Auto-Enrollment
-- agents.battle_subscriptions lets agents subscribe to battle categories.
-- When fn_battle_lifecycle_tick opens a battle (draft → open), matching
-- subscriptions trigger fn_battles_join for each active subscription.
-- Rate limit: max_joins_per_day prevents spam. require_owner_approval
-- creates a pending notification instead of an immediate join.

-- ─── agents.battle_subscriptions ────────────────────────────────────────────

CREATE TABLE agents.battle_subscriptions (
  id                    UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id              UUID        NOT NULL REFERENCES agents.ai_lensers(id) ON DELETE CASCADE,
  category              TEXT,                    -- NULL = subscribe to all categories
  execution_mode        TEXT        NOT NULL DEFAULT 'cloud'
    CHECK (execution_mode IN ('local', 'cloud', 'hybrid')),
  workflow_id           UUID        REFERENCES lenses.workflows(id),
  require_owner_approval BOOLEAN   NOT NULL DEFAULT false,
  max_joins_per_day     INT         NOT NULL DEFAULT 5 CHECK (max_joins_per_day BETWEEN 1 AND 20),
  active                BOOLEAN     NOT NULL DEFAULT true,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_battle_subscriptions_agent
  ON agents.battle_subscriptions (agent_id)
  WHERE active = true;

ALTER TABLE agents.battle_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "sub_owner_all" ON agents.battle_subscriptions
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM agents.ai_lensers al
      JOIN   lensers.profiles p ON p.id = al.profile_id
      WHERE  al.id = agent_id
      AND    p.user_id = auth.uid()
    )
  );

-- ─── fn_agent_daily_join_count ───────────────────────────────────────────────
-- Returns how many battles this agent has joined today (UTC day).

CREATE OR REPLACE FUNCTION public.fn_agent_daily_join_count(p_agent_id UUID)
RETURNS INT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = battles, agents, lensers, audit, public
AS $$
  SELECT count(*)::INT
  FROM   audit.events
  WHERE  event_type = 'battle.joined'
  AND    payload->>'agent_id' = p_agent_id::TEXT
  AND    occurred_at >= date_trunc('day', now() AT TIME ZONE 'UTC');
$$;

GRANT EXECUTE ON FUNCTION public.fn_agent_daily_join_count(UUID) TO service_role;

-- ─── fn_agent_subscribe_to_battles ──────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.fn_agent_subscribe_to_battles(
  p_agent_id             UUID,
  p_category             TEXT    DEFAULT NULL,
  p_execution_mode       TEXT    DEFAULT 'cloud',
  p_workflow_id          UUID    DEFAULT NULL,
  p_require_approval     BOOLEAN DEFAULT false,
  p_max_joins_per_day    INT     DEFAULT 5
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = agents, lensers, public
AS $$
DECLARE
  v_lenser_id UUID;
  v_sub_id    UUID;
BEGIN
  SELECT p.id INTO v_lenser_id
  FROM   lensers.profiles p
  WHERE  p.user_id = auth.uid();

  IF NOT EXISTS (
    SELECT 1 FROM agents.ai_lensers
    WHERE  id = p_agent_id AND profile_id = v_lenser_id
  ) THEN
    RAISE EXCEPTION 'subscribe_forbidden: agent not owned by caller';
  END IF;

  INSERT INTO agents.battle_subscriptions (
    agent_id, category, execution_mode, workflow_id,
    require_owner_approval, max_joins_per_day
  )
  VALUES (
    p_agent_id, p_category, p_execution_mode, p_workflow_id,
    p_require_approval, p_max_joins_per_day
  )
  RETURNING id INTO v_sub_id;

  RETURN v_sub_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.fn_agent_subscribe_to_battles(UUID, TEXT, TEXT, UUID, BOOLEAN, INT) TO authenticated;

-- ─── fn_agent_unsubscribe_from_battles ──────────────────────────────────────

CREATE OR REPLACE FUNCTION public.fn_agent_unsubscribe_from_battles(p_subscription_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = agents, lensers, public
AS $$
DECLARE
  v_lenser_id UUID;
BEGIN
  SELECT p.id INTO v_lenser_id
  FROM   lensers.profiles p
  WHERE  p.user_id = auth.uid();

  UPDATE agents.battle_subscriptions bs
  SET    active     = false,
         updated_at = now()
  FROM   agents.ai_lensers al
  WHERE  bs.id       = p_subscription_id
  AND    al.id       = bs.agent_id
  AND    al.profile_id = v_lenser_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'unsubscribe_not_found_or_forbidden: %', p_subscription_id;
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.fn_agent_unsubscribe_from_battles(UUID) TO authenticated;

-- ─── fn_agent_list_subscriptions ────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.fn_agent_list_subscriptions(p_agent_id UUID)
RETURNS TABLE (
  id                    UUID,
  category              TEXT,
  execution_mode        TEXT,
  workflow_id           UUID,
  require_owner_approval BOOLEAN,
  max_joins_per_day     INT,
  active                BOOLEAN,
  daily_count           INT,
  created_at            TIMESTAMPTZ
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = agents, lensers, public
AS $$
  SELECT
    bs.id,
    bs.category,
    bs.execution_mode,
    bs.workflow_id,
    bs.require_owner_approval,
    bs.max_joins_per_day,
    bs.active,
    public.fn_agent_daily_join_count(p_agent_id) AS daily_count,
    bs.created_at
  FROM  agents.battle_subscriptions bs
  JOIN  agents.ai_lensers al ON al.id = bs.agent_id
  JOIN  lensers.profiles   p  ON p.id  = al.profile_id
  WHERE bs.agent_id    = p_agent_id
  AND   p.user_id = auth.uid()
  ORDER BY bs.created_at DESC;
$$;

GRANT EXECUTE ON FUNCTION public.fn_agent_list_subscriptions(UUID) TO authenticated;

-- ─── Extend fn_battle_lifecycle_tick for auto-enrollment ────────────────────
-- Replaces the Phase AC version, adding auto-enrollment on draft→open.

CREATE OR REPLACE FUNCTION battles.fn_battle_lifecycle_tick()
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = battles, agents, admin, audit, public, lensers
AS $$
DECLARE
  r         RECORD;
  sub       RECORD;
  processed INT := 0;
  daily_cnt INT;
BEGIN
  IF public.fn_kill_switch_active('system', NULL) THEN
    RAISE NOTICE 'fn_battle_lifecycle_tick: system kill switch active — skipping';
    RETURN 0;
  END IF;

  -- 1. draft → open + auto-enrollment
  FOR r IN
    SELECT b.id, b.status, b.battle_type
    FROM   battles.battles b
    JOIN   battles.schedules s ON s.battle_id = b.id
    WHERE  b.status      = 'draft'
    AND    s.open_at    <= now()
    AND    b.deleted_at IS NULL
    FOR UPDATE SKIP LOCKED
  LOOP
    BEGIN
      CONTINUE WHEN public.fn_kill_switch_active('battle', r.id);

      UPDATE battles.battles
      SET    status = 'open', updated_at = now()
      WHERE  id = r.id;

      INSERT INTO audit.events (event_type, actor_type, severity, payload)
      VALUES ('battle.lifecycle.auto_opened', 'system', 'info',
              jsonb_build_object('battle_id', r.id, 'tick', now()));

      -- Auto-enroll matching subscriptions
      FOR sub IN
        SELECT
          bs.id          AS sub_id,
          bs.agent_id,
          bs.execution_mode,
          bs.workflow_id,
          bs.require_owner_approval,
          bs.max_joins_per_day,
          al.profile_id  AS lenser_id
        FROM   agents.battle_subscriptions bs
        JOIN   agents.ai_lensers al ON al.id = bs.agent_id
        WHERE  bs.active = true
        AND    al.is_active = true
        AND    al.suspended_at IS NULL
        AND    (bs.category IS NULL)  -- TODO: match battle category when field added
      LOOP
        BEGIN
          -- Per-agent kill switch
          CONTINUE WHEN public.fn_kill_switch_active('agent', sub.agent_id);

          -- Daily rate limit
          daily_cnt := public.fn_agent_daily_join_count(sub.agent_id);
          IF daily_cnt >= sub.max_joins_per_day THEN
            INSERT INTO audit.events (event_type, actor_type, severity, payload)
            VALUES ('battle.auto_enroll.rate_limited', 'system', 'info',
                    jsonb_build_object('battle_id', r.id, 'agent_id', sub.agent_id,
                                       'daily_count', daily_cnt, 'max', sub.max_joins_per_day));
            CONTINUE;
          END IF;

          IF sub.require_owner_approval THEN
            -- Create a notification for the owner to approve
            INSERT INTO audit.events (event_type, actor_type, severity, payload)
            VALUES ('battle.auto_enroll.pending_approval', 'system', 'info',
                    jsonb_build_object('battle_id', r.id, 'agent_id', sub.agent_id,
                                       'subscription_id', sub.sub_id));
            CONTINUE;
          END IF;

          -- Auto-join: insert contender if not already registered
          INSERT INTO battles.contenders (battle_id, lenser_id, contender_status)
          SELECT r.id, sub.lenser_id, 'active'
          WHERE NOT EXISTS (
            SELECT 1 FROM battles.contenders
            WHERE battle_id = r.id AND lenser_id = sub.lenser_id
          )
          AND (SELECT count(*) FROM battles.contenders WHERE battle_id = r.id) <
              (SELECT max_contenders FROM battles.battles WHERE id = r.id);

          INSERT INTO audit.events (event_type, actor_type, severity, payload)
          VALUES ('battle.auto_enrolled', 'system', 'info',
                  jsonb_build_object('battle_id', r.id, 'agent_id', sub.agent_id,
                                     'lenser_id', sub.lenser_id));
        EXCEPTION WHEN OTHERS THEN
          RAISE WARNING 'lifecycle_tick.enroll: agent % battle % failed: %', sub.agent_id, r.id, SQLERRM;
        END;
      END LOOP;

      processed := processed + 1;
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'lifecycle_tick.open: battle % failed: %', r.id, SQLERRM;
    END;
  END LOOP;

  -- 2. scoring → closed (auto-judge)
  FOR r IN
    SELECT b.id
    FROM   battles.battles b
    JOIN   battles.schedules s ON s.battle_id = b.id
    WHERE  b.status     = 'scoring'
    AND    s.auto_judge = true
    AND    s.judge_at  <= now()
    AND    b.deleted_at IS NULL
    FOR UPDATE SKIP LOCKED
  LOOP
    BEGIN
      CONTINUE WHEN public.fn_kill_switch_active('battle', r.id);
      UPDATE battles.battles SET status = 'closed', updated_at = now() WHERE id = r.id;
      INSERT INTO audit.events (event_type, actor_type, severity, payload)
      VALUES ('battle.lifecycle.auto_judged', 'system', 'info',
              jsonb_build_object('battle_id', r.id, 'tick', now()));
      processed := processed + 1;
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'lifecycle_tick.judge: battle % failed: %', r.id, SQLERRM;
    END;
  END LOOP;

  -- 3. closed → published
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
      VALUES ('battle.lifecycle.auto_published', 'system', 'info',
              jsonb_build_object('battle_id', r.id, 'tick', now()));
      processed := processed + 1;
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'lifecycle_tick.publish: battle % failed: %', r.id, SQLERRM;
    END;
  END LOOP;

  RETURN processed;
END;
$$;
