-- =============================================================================
-- Phase CI: Profile social XP events + profile completion score RPC
-- Adds: fn_xp_on_follow trigger, trg_xp_on_follow, fn_profile_completion_score
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. XP trigger function: award INVITE_ACCEPTED XP when a follow is accepted
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION lensers.fn_xp_on_follow()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'lensers', 'xp', 'public'
AS $$
DECLARE
  v_app_id uuid;
BEGIN
  -- Only award XP when the relationship status becomes 'accepted'
  IF NEW.status != 'accepted' THEN
    RETURN NEW;
  END IF;
  -- Skip if this is an UPDATE and the status was already 'accepted'
  IF TG_OP = 'UPDATE' AND OLD.status = 'accepted' THEN
    RETURN NEW;
  END IF;

  -- Resolve platform app_id; fall back to forum app
  SELECT id INTO v_app_id FROM xp.apps WHERE slug = 'platform' LIMIT 1;
  IF v_app_id IS NULL THEN
    SELECT id INTO v_app_id FROM xp.apps WHERE slug = 'forum' LIMIT 1;
  END IF;
  IF v_app_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Award XP to the follower (source). xp.apply enforces daily cap idempotently.
  BEGIN
    PERFORM xp.apply(
      NEW.source_profile_id,
      'INVITE_ACCEPTED',
      'social'::xp.source_enum,
      'relationship',
      NEW.id,
      v_app_id
    );
  EXCEPTION WHEN OTHERS THEN
    NULL; -- non-fatal; never block the follow
  END;

  RETURN NEW;
END;
$$;

ALTER FUNCTION lensers.fn_xp_on_follow() OWNER TO postgres;

-- ---------------------------------------------------------------------------
-- 2. Trigger on lensers.relationships
-- ---------------------------------------------------------------------------
DROP TRIGGER IF EXISTS trg_xp_on_follow ON lensers.relationships;
CREATE TRIGGER trg_xp_on_follow
  AFTER INSERT OR UPDATE OF status
  ON lensers.relationships
  FOR EACH ROW
  EXECUTE FUNCTION lensers.fn_xp_on_follow();

-- ---------------------------------------------------------------------------
-- 3. Profile completion score RPC (0–100)
--    Scoring: bio +25, avatar_url +25, location +15, website_url +15,
--             has_battles +10, has_xp +10
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.fn_profile_completion_score(p_lenser_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'lensers', 'xp', 'battles', 'public'
AS $$
DECLARE
  v_score     integer := 0;
  v_bio       text;
  v_avatar    text;
  v_location  text;
  v_website   text;
  v_battles   bigint;
  v_total_xp  bigint;
BEGIN
  SELECT
    p.bio,
    p.avatar_url,
    p.location,
    p.website_url
  INTO v_bio, v_avatar, v_location, v_website
  FROM lensers.profiles p
  WHERE p.id = p_lenser_id;

  IF NOT FOUND THEN
    RETURN 0;
  END IF;

  IF v_bio IS NOT NULL AND length(trim(v_bio)) > 0 THEN
    v_score := v_score + 25;
  END IF;
  IF v_avatar IS NOT NULL AND length(trim(v_avatar)) > 0 THEN
    v_score := v_score + 25;
  END IF;
  IF v_location IS NOT NULL AND length(trim(v_location)) > 0 THEN
    v_score := v_score + 15;
  END IF;
  IF v_website IS NOT NULL AND length(trim(v_website)) > 0 THEN
    v_score := v_score + 15;
  END IF;

  -- Battle participation ('cancelled' is not a valid battles.battle_status_enum value)
  SELECT COUNT(*) INTO v_battles
  FROM battles.contenders bc
  JOIN battles.battles b ON b.id = bc.battle_id
  WHERE bc.contender_ref_id = p_lenser_id
    AND b.status <> 'draft'::battles.battle_status_enum;

  IF v_battles > 0 THEN
    v_score := v_score + 10;
  END IF;

  -- XP earned (any positive amount)
  SELECT COALESCE(SUM(xp), 0) INTO v_total_xp
  FROM xp.events
  WHERE lenser_id = p_lenser_id;

  IF v_total_xp > 0 THEN
    v_score := v_score + 10;
  END IF;

  RETURN LEAST(v_score, 100);
END;
$$;

ALTER FUNCTION public.fn_profile_completion_score(uuid) OWNER TO postgres;

GRANT EXECUTE ON FUNCTION public.fn_profile_completion_score(uuid)
  TO authenticated, anon;

COMMENT ON FUNCTION public.fn_profile_completion_score(uuid) IS
  'Returns a 0–100 profile completion score. Breakdown: bio +25, avatar +25, location +15, website +15, battles >0 +10, XP >0 +10.';
