-- Fix: fn_agent_subscribe_to_battles and fn_agent_unsubscribe_from_battles
-- incorrectly checked agents.ai_lensers.profile_id (the agent's own lenser
-- profile) against the caller's lenser ID. Ownership is stored in
-- agents.ownerships — check that table instead.

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
    SELECT 1 FROM agents.ownerships
    WHERE  ai_lenser_id    = p_agent_id
    AND    owner_lenser_id = v_lenser_id
    AND    role IN ('owner', 'co_owner')
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
  JOIN   agents.ownerships  o ON o.ai_lenser_id    = al.id
                              AND o.owner_lenser_id = v_lenser_id
                              AND o.role IN ('owner', 'co_owner')
  WHERE  bs.id    = p_subscription_id
  AND    al.id    = bs.agent_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'unsubscribe_not_found_or_forbidden: %', p_subscription_id;
  END IF;
END;
$$;
