-- =============================================================================
-- Phase CB — Battle Automation v3
-- =============================================================================
-- 1. battles.battles automation columns (auto_assign_contenders, auto_promote)
-- 2. battles.battle_event_subscriptions table
-- 3. audit.webhook_outbox table
-- 4. fn_battles_auto_schedule_contenders
-- 5. fn_battles_check_readiness
-- 6. fn_battles_auto_promote
-- 7. fn_battles_subscribe_webhook
-- 8. fn_battles_notify_webhooks
-- 9. trg_battles_status_webhook AFTER UPDATE OF status
-- 10. pg_cron job: auto-promote every 5 min
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. battles.battles automation columns
-- ---------------------------------------------------------------------------

ALTER TABLE battles.battles
  ADD COLUMN IF NOT EXISTS auto_assign_contenders BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS auto_promote           BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN battles.battles.auto_assign_contenders IS
  'CB: When true, fn_battles_auto_schedule_contenders assigns AI lensers up to max_contenders.';
COMMENT ON COLUMN battles.battles.auto_promote IS
  'CB: When true, fn_battles_auto_promote transitions draft→open when readiness check passes.';

-- ---------------------------------------------------------------------------
-- 2. battles.battle_event_subscriptions
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS battles.battle_event_subscriptions (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  battle_id   UUID        NOT NULL REFERENCES battles.battles(id)  ON DELETE CASCADE,
  owner_id    UUID        NOT NULL REFERENCES auth.users(id)        ON DELETE CASCADE,
  webhook_url TEXT        NOT NULL,
  event_types TEXT[]      NOT NULL,
  secret_hmac TEXT        NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  revoked_at  TIMESTAMPTZ
);

ALTER TABLE battles.battle_event_subscriptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS battle_subscriptions_owner ON battles.battle_event_subscriptions;
CREATE POLICY battle_subscriptions_owner
  ON battles.battle_event_subscriptions
  FOR ALL
  TO authenticated
  USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());

DROP POLICY IF EXISTS battle_subscriptions_service ON battles.battle_event_subscriptions;
CREATE POLICY battle_subscriptions_service
  ON battles.battle_event_subscriptions
  FOR ALL
  TO service_role
  USING (TRUE)
  WITH CHECK (TRUE);

COMMENT ON TABLE battles.battle_event_subscriptions IS
  'CB: Webhook subscriptions for battle events. Owner manages own; service_role processes.';

-- ---------------------------------------------------------------------------
-- 3. audit.webhook_outbox
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS audit.webhook_outbox (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_id UUID     NOT NULL REFERENCES battles.battle_event_subscriptions(id) ON DELETE CASCADE,
  battle_id    UUID        NOT NULL,
  event_type   TEXT        NOT NULL,
  payload      JSONB       NOT NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  acked_at     TIMESTAMPTZ,
  retry_count  INT         NOT NULL DEFAULT 0
);

ALTER TABLE audit.webhook_outbox ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS webhook_outbox_service ON audit.webhook_outbox;
CREATE POLICY webhook_outbox_service
  ON audit.webhook_outbox
  FOR ALL
  TO service_role
  USING (TRUE)
  WITH CHECK (TRUE);

REVOKE ALL   ON TABLE audit.webhook_outbox FROM PUBLIC;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE audit.webhook_outbox TO service_role;

COMMENT ON TABLE audit.webhook_outbox IS
  'CB: Pending webhook deliveries. Drained by webhook-drain-worker.';

-- ---------------------------------------------------------------------------
-- 4. fn_battles_auto_schedule_contenders
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.fn_battles_auto_schedule_contenders(
  p_battle_id UUID
)
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = battles, lensers, public
AS $$
DECLARE
  v_max_contenders INT;
  v_existing_count INT;
  v_to_assign      INT;
  v_assigned       INT := 0;
  rec              RECORD;
BEGIN
  -- Read max_contenders; default to 2
  SELECT COALESCE(max_contenders, 2)
    INTO v_max_contenders
    FROM battles.battles
   WHERE id = p_battle_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Battle not found' USING ERRCODE = 'P0002';
  END IF;

  SELECT COUNT(*)
    INTO v_existing_count
    FROM battles.contenders
   WHERE battle_id = p_battle_id;

  v_to_assign := v_max_contenders - v_existing_count;
  IF v_to_assign <= 0 THEN
    RETURN 0;
  END IF;

  FOR rec IN
    SELECT al.id AS lenser_id
      FROM lensers.ai_lensers al
     WHERE al.is_available = TRUE
       AND NOT EXISTS (
         SELECT 1 FROM battles.contenders c
          WHERE c.battle_id = p_battle_id
            AND c.lenser_id = al.id
       )
     ORDER BY al.last_active_at DESC NULLS LAST
     LIMIT v_to_assign
  LOOP
    INSERT INTO battles.contenders (battle_id, lenser_id, slot, status)
    VALUES (p_battle_id, rec.lenser_id,
      CASE WHEN v_assigned = 0 THEN 'A' ELSE 'B' END,
      'pending')
    ON CONFLICT DO NOTHING;
    v_assigned := v_assigned + 1;
  END LOOP;

  RETURN v_assigned;
END;
$$;

ALTER FUNCTION public.fn_battles_auto_schedule_contenders(UUID)
  OWNER TO postgres;

GRANT EXECUTE ON FUNCTION public.fn_battles_auto_schedule_contenders(UUID)
  TO authenticated, service_role;

COMMENT ON FUNCTION public.fn_battles_auto_schedule_contenders(UUID) IS
  'CB: Assigns available AI lensers up to max_contenders for auto-assign battles.';

-- ---------------------------------------------------------------------------
-- 5. fn_battles_check_readiness
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.fn_battles_check_readiness(
  p_battle_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = battles, public
AS $$
DECLARE
  v_battle         RECORD;
  v_contender_cnt  INT;
  v_blockers       TEXT[] := '{}';
  v_render_ok      BOOLEAN := TRUE;
  v_byok_ok        BOOLEAN := TRUE;
  v_byok_result    JSONB;
  rec              RECORD;
BEGIN
  SELECT * INTO v_battle FROM battles.battles WHERE id = p_battle_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ready', false, 'blockers', ARRAY['battle_not_found']);
  END IF;

  -- Check template valid (template_id set)
  IF v_battle.template_id IS NULL AND (v_battle.task_prompt IS NULL OR v_battle.task_prompt = '') THEN
    v_blockers := v_blockers || ARRAY['no_template_or_task_prompt'];
  END IF;

  -- Check render prompt succeeds (only if template_id set)
  IF v_battle.template_id IS NOT NULL THEN
    BEGIN
      PERFORM public.fn_battles_render_prompt(p_battle_id, '{}'::JSONB);
    EXCEPTION WHEN OTHERS THEN
      v_render_ok := FALSE;
      v_blockers  := v_blockers || ARRAY[CONCAT('prompt_render_failed:', SQLERRM)];
    END;
  END IF;

  -- Check ≥2 contenders assigned
  SELECT COUNT(*) INTO v_contender_cnt
    FROM battles.contenders
   WHERE battle_id = p_battle_id;

  IF v_contender_cnt < 2 THEN
    v_blockers := v_blockers || ARRAY[CONCAT('insufficient_contenders:', v_contender_cnt::TEXT)];
  END IF;

  -- Check BYOK valid for AI contenders
  FOR rec IN
    SELECT c.id AS contender_id
      FROM battles.contenders c
     WHERE c.battle_id = p_battle_id
       AND c.contender_type IN ('ai_model', 'ai_agent')
  LOOP
    v_byok_result := public.fn_byok_validate_for_battle(p_battle_id, rec.contender_id);
    IF NOT (v_byok_result ->> 'valid')::BOOLEAN THEN
      v_blockers := v_blockers || ARRAY[
        CONCAT('byok_invalid:contender=', rec.contender_id,
               ':reason=', v_byok_result ->> 'reason')
      ];
      v_byok_ok := FALSE;
    END IF;
  END LOOP;

  RETURN jsonb_build_object(
    'ready',    array_length(v_blockers, 1) IS NULL,
    'blockers', v_blockers
  );
END;
$$;

ALTER FUNCTION public.fn_battles_check_readiness(UUID)
  OWNER TO postgres;

GRANT EXECUTE ON FUNCTION public.fn_battles_check_readiness(UUID)
  TO authenticated, service_role;

COMMENT ON FUNCTION public.fn_battles_check_readiness(UUID) IS
  'CB: Returns {ready, blockers[]} for a battle. Used before auto-promote.';

-- ---------------------------------------------------------------------------
-- 6. fn_battles_auto_promote
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.fn_battles_auto_promote(
  p_battle_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = battles, audit, public
AS $$
DECLARE
  v_readiness JSONB;
  v_battle    RECORD;
BEGIN
  SELECT * INTO v_battle FROM battles.battles WHERE id = p_battle_id AND status = 'draft';
  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;

  v_readiness := public.fn_battles_check_readiness(p_battle_id);

  IF NOT (v_readiness ->> 'ready')::BOOLEAN THEN
    RETURN FALSE;
  END IF;

  UPDATE battles.battles
     SET status = 'open',
         updated_at = now()
   WHERE id = p_battle_id
     AND status = 'draft';

  IF FOUND THEN
    INSERT INTO audit.events (actor_id, event_type, resource_type, resource_id, meta)
    VALUES (
      NULL,
      'battle.auto_promoted',
      'battle',
      p_battle_id,
      jsonb_build_object('readiness', v_readiness)
    );
    RETURN TRUE;
  END IF;

  RETURN FALSE;
END;
$$;

ALTER FUNCTION public.fn_battles_auto_promote(UUID)
  OWNER TO postgres;

GRANT EXECUTE ON FUNCTION public.fn_battles_auto_promote(UUID)
  TO service_role;

COMMENT ON FUNCTION public.fn_battles_auto_promote(UUID) IS
  'CB: Promotes draft→open when readiness check passes. service_role only.';

-- ---------------------------------------------------------------------------
-- 7. fn_battles_subscribe_webhook
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.fn_battles_subscribe_webhook(
  p_battle_id   UUID,
  p_webhook_url TEXT,
  p_event_types TEXT[]
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = battles, public
AS $$
DECLARE
  v_actor UUID;
  v_sub_id UUID;
  v_secret TEXT;
BEGIN
  v_actor := auth.uid();
  IF v_actor IS NULL THEN
    RAISE EXCEPTION 'Authentication required' USING ERRCODE = 'P0001';
  END IF;

  -- Generate HMAC-style secret (random 32 bytes hex-encoded)
  v_secret := encode(gen_random_bytes(32), 'hex');

  INSERT INTO battles.battle_event_subscriptions
    (battle_id, owner_id, webhook_url, event_types, secret_hmac)
  VALUES
    (p_battle_id, v_actor, p_webhook_url, p_event_types, v_secret)
  RETURNING id INTO v_sub_id;

  RETURN v_sub_id;
END;
$$;

ALTER FUNCTION public.fn_battles_subscribe_webhook(UUID, TEXT, TEXT[])
  OWNER TO postgres;

GRANT EXECUTE ON FUNCTION public.fn_battles_subscribe_webhook(UUID, TEXT, TEXT[])
  TO authenticated, service_role;

COMMENT ON FUNCTION public.fn_battles_subscribe_webhook(UUID, TEXT, TEXT[]) IS
  'CB: Creates a webhook subscription with generated HMAC secret. Owner-only.';

-- ---------------------------------------------------------------------------
-- 8. fn_battles_notify_webhooks
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.fn_battles_notify_webhooks(
  p_battle_id  UUID,
  p_event_type TEXT,
  p_payload    JSONB
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = battles, audit, public
AS $$
DECLARE
  rec RECORD;
BEGIN
  FOR rec IN
    SELECT id
      FROM battles.battle_event_subscriptions
     WHERE battle_id  = p_battle_id
       AND revoked_at IS NULL
       AND p_event_type = ANY(event_types)
  LOOP
    INSERT INTO audit.webhook_outbox (subscription_id, battle_id, event_type, payload)
    VALUES (rec.id, p_battle_id, p_event_type, p_payload);
  END LOOP;
END;
$$;

ALTER FUNCTION public.fn_battles_notify_webhooks(UUID, TEXT, JSONB)
  OWNER TO postgres;

GRANT EXECUTE ON FUNCTION public.fn_battles_notify_webhooks(UUID, TEXT, JSONB)
  TO service_role;

COMMENT ON FUNCTION public.fn_battles_notify_webhooks(UUID, TEXT, JSONB) IS
  'CB: Inserts webhook_outbox entries for matching active subscriptions.';

-- ---------------------------------------------------------------------------
-- 9. Trigger: trg_battles_status_webhook
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.fn_trg_battles_status_webhook()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = battles, public
AS $$
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    PERFORM public.fn_battles_notify_webhooks(
      NEW.id,
      'status_change',
      row_to_json(NEW)::JSONB
    );
  END IF;
  RETURN NEW;
END;
$$;

ALTER FUNCTION public.fn_trg_battles_status_webhook()
  OWNER TO postgres;

DROP TRIGGER IF EXISTS trg_battles_status_webhook ON battles.battles;
CREATE TRIGGER trg_battles_status_webhook
  AFTER UPDATE OF status ON battles.battles
  FOR EACH ROW EXECUTE FUNCTION public.fn_trg_battles_status_webhook();

-- ---------------------------------------------------------------------------
-- 10. pg_cron: auto-promote every 5 min
-- ---------------------------------------------------------------------------

SELECT cron.schedule(
  'cb-battle-auto-promote',
  '*/5 * * * *',
  $$
    SELECT public.fn_battles_auto_promote(id)
      FROM battles.battles
     WHERE status = 'draft'
       AND auto_promote = TRUE;
  $$
);
