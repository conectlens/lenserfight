-- Fix: fn_agent_list_subscriptions used the old ai_lensers.profile_id ownership
-- check, which was superseded by agents.ownerships in migration 20270515000001.
-- Subscribe succeeds via ownerships but list always returned empty because the
-- profile_id join never matched. Updated to mirror the ownerships-based guard.

CREATE OR REPLACE FUNCTION public.fn_agent_list_subscriptions(p_agent_id UUID)
RETURNS TABLE (
  id                     UUID,
  category               TEXT,
  execution_mode         TEXT,
  workflow_id            UUID,
  require_owner_approval BOOLEAN,
  max_joins_per_day      INT,
  active                 BOOLEAN,
  daily_count            INT,
  created_at             TIMESTAMPTZ
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
  JOIN  agents.ownerships o ON o.ai_lenser_id = bs.agent_id
  JOIN  lensers.profiles   p ON p.id           = o.owner_lenser_id
  WHERE bs.agent_id = p_agent_id
  AND   o.role IN ('owner', 'co_owner')
  AND   (o.revoked_at IS NULL OR o.revoked_at > now())
  AND   p.user_id = auth.uid()
  ORDER BY bs.created_at DESC;
$$;
