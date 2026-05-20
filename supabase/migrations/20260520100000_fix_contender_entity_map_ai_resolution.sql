-- ─────────────────────────────────────────────────────────────────────────────
-- Migration: fix contender entity map AI resolution + revoke anon snapshot grants
--
-- Bug fixed:
--   fn_invite_battle_contender receives p_contender_ref_id as lensers.profiles.id
--   (the profile UUID). The old trigger blindly stored that as ai_lenser_id, which
--   is a FK to agents.ai_lensers.id — a DIFFERENT UUID. The downstream snapshot
--   trigger then called fn_redacted_agent_snapshot(<profile UUID>) and raised
--   agent_not_found because agents.ai_lensers.id ≠ lensers.profiles.id.
--
-- Fix:
--   fn_populate_contender_entity_map now resolves contender_ref_id to the
--   canonical agents.ai_lensers.id for AI contender types, accepting either:
--     (a) agents.ai_lensers.id directly   — backward-compat for any existing callers
--     (b) lensers.profiles.id             — frontend convention via LenserSearchResult.id
--
-- Security:
--   fn_redacted_agent_snapshot / fn_redacted_agent_snapshot_hash expose AI agent
--   internal state. Removed the overly-permissive GRANT to anon role.
-- ─────────────────────────────────────────────────────────────────────────────

-- ── Block A: Fix fn_populate_contender_entity_map ────────────────────────────

DROP FUNCTION IF EXISTS "battles"."fn_populate_contender_entity_map"() CASCADE;

CREATE FUNCTION "battles"."fn_populate_contender_entity_map"()
  RETURNS "trigger"
  LANGUAGE "plpgsql" SECURITY DEFINER
  SET "search_path" TO 'battles', 'agents'
AS $$
DECLARE
  v_ai_lenser_id uuid;
BEGIN
  -- Resolve contender_ref_id for AI contender types.
  -- Accepts EITHER agents.ai_lensers.id (direct agent UUID — backward-compat)
  -- OR lensers.profiles.id (frontend convention via fn_invite_battle_contender).
  -- A profile-based ref_id is resolved to the canonical agents.ai_lensers.id via fallback.
  IF NEW.contender_type IN ('ai_model', 'ai_agent') THEN
    -- Try direct match: caller already has the agent UUID
    SELECT al.id INTO v_ai_lenser_id
      FROM agents.ai_lensers al
     WHERE al.id = NEW.contender_ref_id;

    -- Fallback: caller supplied the lenser profile UUID
    IF v_ai_lenser_id IS NULL THEN
      SELECT al.id INTO v_ai_lenser_id
        FROM agents.ai_lensers al
       WHERE al.profile_id = NEW.contender_ref_id;
    END IF;
  END IF;

  INSERT INTO battles.contender_entity_map (contender_id, profile_id, ai_lenser_id)
  VALUES (
    NEW.id,
    CASE WHEN NEW.contender_type = 'human' THEN NEW.contender_ref_id ELSE NULL END,
    v_ai_lenser_id   -- NULL for human; resolved agent UUID for AI types
  )
  ON CONFLICT (contender_id) DO NOTHING;

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION "battles"."fn_populate_contender_entity_map"() IS
  'AFTER INSERT trigger on battles.contenders. Populates battles.contender_entity_map. '
  'For AI contender types (ai_model, ai_agent): resolves contender_ref_id to the canonical '
  'agents.ai_lensers.id, accepting either the agent UUID directly (backward-compat) or the '
  'lenser profile UUID (frontend convention via fn_invite_battle_contender).';

ALTER FUNCTION "battles"."fn_populate_contender_entity_map"() OWNER TO "postgres";

GRANT ALL ON FUNCTION "battles"."fn_populate_contender_entity_map"() TO "service_role";

-- Re-create the trigger dropped by CASCADE above.
CREATE OR REPLACE TRIGGER "trg_populate_contender_entity_map"
  AFTER INSERT ON "battles"."contenders"
  FOR EACH ROW EXECUTE FUNCTION "battles"."fn_populate_contender_entity_map"();


-- ── Block B: Revoke anon grants on AI snapshot functions ─────────────────────
-- These functions expose AI agent internals (memory, model bindings, personality).
-- Unauthenticated callers must not be able to enumerate or snapshot agent state.

REVOKE ALL ON FUNCTION "public"."fn_redacted_agent_snapshot"("p_ai_lenser_id" "uuid") FROM "anon";
REVOKE ALL ON FUNCTION "public"."fn_redacted_agent_snapshot_hash"("p_ai_lenser_id" "uuid") FROM "anon";
