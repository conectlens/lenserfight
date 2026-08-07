-- battles.execution_configs already had RLS + grants but was completely
-- unusable end-to-end:
--   1. execution_configs_insert/_update compared b.creator_lenser_id
--      (lensers.profiles.id space) directly to auth.uid() (auth.users.id
--      space) — the same wrong-id-space bug fixed repeatedly elsewhere this
--      session. These two conditions can never be true, so no authenticated
--      user could ever insert or update a row, regardless of ownership.
--   2. No RPC existed to write to it at all — battles/agents schemas aren't
--      PostgREST-exposed, so even with correct RLS there was no reachable
--      write path.
--   3. fn_get_battle_execution_configs, which apps/cli/src/commands/battle.ts
--      already calls (battle.ts:3233), was never created server-side; the
--      call has always silently failed via its .catch(() => []).
-- Net effect: battles.battle_execution_jobs → fn_claim_battle_execution_job
-- LEFT JOINs battles.execution_configs and gets NULL provider_key/model_key
-- for every battle ever created, so the real automated worker pipeline
-- (apps/worker battle-worker.ts) has never had a usable model to execute
-- with for any battle that didn't rely on defaults.

-- 1. Fix the id-space bug in the existing RLS policies.
DROP POLICY IF EXISTS "execution_configs_insert" ON "battles"."execution_configs";
CREATE POLICY "execution_configs_insert" ON "battles"."execution_configs"
  FOR INSERT TO "authenticated"
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM battles.battles b
      WHERE b.id = execution_configs.battle_id
        AND b.creator_lenser_id = lensers.get_auth_human_lenser_id()
    )
  );

DROP POLICY IF EXISTS "execution_configs_update" ON "battles"."execution_configs";
CREATE POLICY "execution_configs_update" ON "battles"."execution_configs"
  FOR UPDATE TO "authenticated"
  USING (
    EXISTS (
      SELECT 1 FROM battles.battles b
      WHERE b.id = execution_configs.battle_id
        AND b.creator_lenser_id = lensers.get_auth_human_lenser_id()
    )
  );

-- 2. Owner-checked write RPC (schema not PostgREST-exposed, so a public
--    wrapper is the only reachable write path — same pattern as every other
--    battles.* mutation in this codebase).
CREATE OR REPLACE FUNCTION "public"."fn_battles_set_execution_config"(
  "p_battle_id" "uuid",
  "p_contender_id" "uuid",
  "p_provider_key" "text",
  "p_model_key" "text",
  "p_max_tokens" integer DEFAULT NULL,
  "p_temperature" numeric DEFAULT NULL
) RETURNS "battles"."execution_configs"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'battles', 'lensers'
    AS $$
DECLARE
  v_row battles.execution_configs%ROWTYPE;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM battles.battles b
    WHERE b.id = p_battle_id
      AND b.creator_lenser_id = lensers.get_auth_human_lenser_id()
  ) THEN
    RAISE EXCEPTION 'Only the battle creator can set execution config' USING ERRCODE = '42501';
  END IF;

  IF p_contender_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM battles.contenders c
    WHERE c.id = p_contender_id AND c.battle_id = p_battle_id
  ) THEN
    RAISE EXCEPTION 'Contender % does not belong to battle %', p_contender_id, p_battle_id
      USING ERRCODE = '22023';
  END IF;

  INSERT INTO battles.execution_configs (
    battle_id, contender_id, provider_key, model_key, max_tokens, temperature
  ) VALUES (
    p_battle_id, p_contender_id, p_provider_key, p_model_key,
    COALESCE(p_max_tokens, 4096), COALESCE(p_temperature, 0.70)
  )
  ON CONFLICT (battle_id, contender_id) DO UPDATE
    SET provider_key = EXCLUDED.provider_key,
        model_key    = EXCLUDED.model_key,
        max_tokens   = EXCLUDED.max_tokens,
        temperature  = EXCLUDED.temperature,
        updated_at   = now()
  RETURNING * INTO v_row;

  RETURN v_row;
END;
$$;

COMMENT ON FUNCTION "public"."fn_battles_set_execution_config"("uuid", "uuid", "text", "text", integer, numeric)
  IS 'Owner-only: set the provider/model a contender executes with when the worker auto-runs the battle. Upserts on (battle_id, contender_id).';

GRANT ALL ON FUNCTION "public"."fn_battles_set_execution_config"("uuid", "uuid", "text", "text", integer, numeric) TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_battles_set_execution_config"("uuid", "uuid", "text", "text", integer, numeric) TO "service_role";

-- 3. Reader RPC that apps/cli/src/commands/battle.ts already expects.
CREATE OR REPLACE FUNCTION "public"."fn_get_battle_execution_configs"("p_battle_id" "uuid")
  RETURNS SETOF "battles"."execution_configs"
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public', 'battles'
    AS $$
  SELECT ec.*
  FROM battles.execution_configs ec
  JOIN battles.battles b ON b.id = ec.battle_id
  WHERE ec.battle_id = p_battle_id
    AND b.status <> 'draft'
  ORDER BY ec.contender_id NULLS LAST;
$$;

COMMENT ON FUNCTION "public"."fn_get_battle_execution_configs"("uuid")
  IS 'Public read of a non-draft battle''s per-contender execution config (provider/model). Mirrors execution_configs_select RLS visibility.';

GRANT ALL ON FUNCTION "public"."fn_get_battle_execution_configs"("uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."fn_get_battle_execution_configs"("uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_get_battle_execution_configs"("uuid") TO "service_role";
