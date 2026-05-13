-- Phase: Battle webhook subscription public RPCs
--
-- battle_event_subscriptions lives in the battles schema which is not in
-- PostgREST's exposed_schemas, so direct .from('battle_event_subscriptions')
-- calls from the client fail with PGRST205.
--
-- Fix: replace direct REST table access with two SECURITY DEFINER RPCs in
-- the public schema:
--   fn_battles_get_subscriptions  – owner-scoped list for a battle
--   fn_battles_revoke_webhook     – soft-delete a single subscription
--
-- Both enforce auth.uid() ownership; secret_hmac is excluded from the
-- get function return to avoid leaking HMAC secrets to the client.

-- ---------------------------------------------------------------------------
-- 1. fn_battles_get_subscriptions
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.fn_battles_get_subscriptions(
  p_battle_id UUID
)
RETURNS TABLE (
  id          UUID,
  battle_id   UUID,
  owner_id    UUID,
  webhook_url TEXT,
  event_types TEXT[],
  created_at  TIMESTAMPTZ,
  revoked_at  TIMESTAMPTZ
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = battles, public
AS $$
DECLARE
  v_actor UUID;
BEGIN
  v_actor := auth.uid();
  IF v_actor IS NULL THEN
    RAISE EXCEPTION 'Authentication required' USING ERRCODE = 'P0001';
  END IF;

  RETURN QUERY
    SELECT
      s.id,
      s.battle_id,
      s.owner_id,
      s.webhook_url,
      s.event_types,
      s.created_at,
      s.revoked_at
    FROM battles.battle_event_subscriptions s
   WHERE s.battle_id = p_battle_id
     AND s.owner_id  = v_actor
   ORDER BY s.created_at DESC;
END;
$$;

ALTER FUNCTION public.fn_battles_get_subscriptions(UUID)
  OWNER TO postgres;

GRANT EXECUTE ON FUNCTION public.fn_battles_get_subscriptions(UUID)
  TO authenticated;

COMMENT ON FUNCTION public.fn_battles_get_subscriptions(UUID) IS
  'Returns caller-owned webhook subscriptions for a battle. secret_hmac excluded.';

-- ---------------------------------------------------------------------------
-- 2. fn_battles_revoke_webhook
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.fn_battles_revoke_webhook(
  p_subscription_id UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = battles, public
AS $$
DECLARE
  v_actor UUID;
  v_rows  INT;
BEGIN
  v_actor := auth.uid();
  IF v_actor IS NULL THEN
    RAISE EXCEPTION 'Authentication required' USING ERRCODE = 'P0001';
  END IF;

  UPDATE battles.battle_event_subscriptions
     SET revoked_at = now()
   WHERE id       = p_subscription_id
     AND owner_id = v_actor
     AND revoked_at IS NULL;

  GET DIAGNOSTICS v_rows = ROW_COUNT;

  IF v_rows = 0 THEN
    RAISE EXCEPTION 'Subscription not found or already revoked'
      USING ERRCODE = 'P0002';
  END IF;
END;
$$;

ALTER FUNCTION public.fn_battles_revoke_webhook(UUID)
  OWNER TO postgres;

GRANT EXECUTE ON FUNCTION public.fn_battles_revoke_webhook(UUID)
  TO authenticated;

COMMENT ON FUNCTION public.fn_battles_revoke_webhook(UUID) IS
  'Soft-revokes a caller-owned webhook subscription. Idempotent-safe (raises P0002 if already revoked).';
