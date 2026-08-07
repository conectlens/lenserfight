-- Consolidates the battle join/submit pipeline, which had drifted into four
-- independent, partly-broken implementations (see GitHub issue #495):
--
--   1. fn_battles_join(uuid)                — human-only, correct schema,
--      auto-creates a pending submissions row.
--   2. fn_battles_join(uuid, uuid, ...)      — human OR agent, was broken
--      (dead lenser_id column, fixed in a prior migration), but never
--      created the submissions row and never validated contender_type
--      against battle_type.
--   3. fn_battle_lifecycle_tick()'s auto-enroll block — dead lenser_id
--      column, never worked.
--   4. fn_battles_submit — required the caller to literally BE the
--      contender (contender_ref_id = caller's own profile id), so a human
--      who owns an AI agent contender could never submit on its behalf.
--      This is the block that matters most: it made "join two owned agents,
--      run them with your own BYOK key, submit their output" impossible.
--
-- This migration:
--   - Replaces (1) and (2) with a single fn_battles_join(uuid, uuid, ...)
--     that handles both human and agent joins, validates contender_type
--     against battle_type (previously only enforced by fn_invite_battle_contender),
--     and always creates the pending submissions row.
--   - Fixes fn_battles_submit to accept submissions from either the
--     contender itself or an owner of the contending AI agent
--     (agents.ownerships), and makes it an idempotent upsert instead of a
--     blind UPDATE that could silently affect zero rows.
--   - Fixes the auto-enroll block inside fn_battle_lifecycle_tick() to use
--     the real battles.contenders columns.
--
-- Old fn_battles_join(uuid) is dropped: fn_battles_join(uuid, uuid, ...)
-- with p_agent_id omitted is a strict superset of its behavior.

DROP FUNCTION IF EXISTS "public"."fn_battles_join"("p_battle_id" "uuid");

CREATE OR REPLACE FUNCTION "public"."fn_battles_join"(
  "p_battle_id" "uuid",
  "p_agent_id" "uuid" DEFAULT NULL::"uuid",
  "p_runner_mode" "text" DEFAULT 'cloud'::"text",
  "p_device_id" "uuid" DEFAULT NULL::"uuid",
  "p_workflow_id" "uuid" DEFAULT NULL::"uuid"
) RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'battles', 'agents', 'lensers', 'public'
    AS $$
DECLARE
  v_lenser_id      UUID;
  v_ref_id         UUID;
  v_contender_type battles.contender_type_enum;
  v_display_name   TEXT;
  v_slot           CHAR(1);
  v_contender_id   UUID;
  v_battle         battles.battles%ROWTYPE;
BEGIN
  v_lenser_id := lensers.get_auth_lenser_id();
  IF v_lenser_id IS NULL THEN
    RAISE EXCEPTION 'battles_join_unauthenticated';
  END IF;

  SELECT * INTO v_battle FROM battles.battles WHERE id = p_battle_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'battles_join_not_found: %', p_battle_id;
  END IF;

  IF v_battle.status NOT IN ('open', 'executing') THEN
    RAISE EXCEPTION 'battles_join_not_open: status=%', v_battle.status;
  END IF;

  -- Resolve the contender identity: an owned AI agent (by its profile id)
  -- or the caller's own human profile.
  IF p_agent_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM agents.ownerships o
      WHERE o.ai_lenser_id = p_agent_id
        AND o.owner_lenser_id = v_lenser_id
        AND o.revoked_at IS NULL
    ) THEN
      RAISE EXCEPTION 'battles_join_agent_not_owned: %', p_agent_id;
    END IF;

    SELECT al.profile_id, p.display_name
      INTO v_ref_id, v_display_name
    FROM agents.ai_lensers al
    JOIN lensers.profiles p ON p.id = al.profile_id
    WHERE al.id = p_agent_id;

    IF v_ref_id IS NULL THEN
      RAISE EXCEPTION 'battles_join_agent_not_found: %', p_agent_id;
    END IF;

    v_contender_type := 'ai_agent';
  ELSE
    SELECT p.id, p.display_name INTO v_ref_id, v_display_name
    FROM lensers.profiles p
    WHERE p.id = v_lenser_id;

    v_contender_type := 'human';
  END IF;

  -- Type validation against the battle's declared type. Mirrors
  -- fn_invite_battle_contender's rule table, which was previously the only
  -- entry point that enforced this.
  CASE v_battle.battle_type
    WHEN 'ai_vs_ai' THEN
      IF v_contender_type <> 'ai_agent' THEN
        RAISE EXCEPTION 'battles_join_type_mismatch: this battle requires an AI agent contender';
      END IF;
    WHEN 'human_vs_human_ai_votes', 'human_vs_human_open_votes' THEN
      IF v_contender_type <> 'human' THEN
        RAISE EXCEPTION 'battles_join_type_mismatch: this battle requires a human contender';
      END IF;
    ELSE
      -- human_vs_ai (slot-dependent, checked after slot assignment below),
      -- lenser_battle, workflow_battle: any type allowed at this stage.
      NULL;
  END CASE;

  -- Idempotent: return existing contender if this identity already joined
  SELECT id INTO v_contender_id
  FROM   battles.contenders
  WHERE  battle_id = p_battle_id
  AND    contender_ref_id = v_ref_id
  LIMIT  1;

  IF v_contender_id IS NOT NULL THEN
    RETURN v_contender_id;
  END IF;

  -- Check max contenders, then pick the next free slot letter (A, B, C, ...)
  IF (SELECT count(*) FROM battles.contenders WHERE battle_id = p_battle_id) >= v_battle.max_contenders THEN
    RAISE EXCEPTION 'battles_join_full: max_contenders=%', v_battle.max_contenders;
  END IF;

  SELECT chr(65 + count(*)::int) INTO v_slot
  FROM battles.contenders
  WHERE battle_id = p_battle_id;

  IF v_battle.battle_type = 'human_vs_ai' THEN
    IF v_slot = 'A' AND v_contender_type <> 'human' THEN
      RAISE EXCEPTION 'battles_join_type_mismatch: slot A in a human_vs_ai battle must be human';
    ELSIF v_slot = 'B' AND v_contender_type <> 'ai_agent' THEN
      RAISE EXCEPTION 'battles_join_type_mismatch: slot B in a human_vs_ai battle must be an AI agent';
    END IF;
  END IF;

  INSERT INTO battles.contenders (
    battle_id, slot, contender_type, contender_ref_id, display_name,
    entry_mode, contender_status, joined_at
  )
  VALUES (
    p_battle_id,
    v_slot,
    v_contender_type,
    v_ref_id,
    v_display_name,
    'direct',
    'active',
    now()
  )
  RETURNING id INTO v_contender_id;

  -- Auto-create the pending submission, matching the behavior the old
  -- human-only fn_battles_join(uuid) already had — fn_battles_submit's
  -- upsert no longer strictly needs this row to pre-exist, but keeping it
  -- means `lf battle jobs` / submission listings show every contender from
  -- the moment they join, not just after they submit.
  INSERT INTO battles.submissions (battle_id, contender_id, status)
  VALUES (p_battle_id, v_contender_id, 'pending')
  ON CONFLICT (battle_id, contender_id) DO NOTHING;

  INSERT INTO audit.events (event_type, actor_type, actor_id, payload)
  VALUES (
    'battle.joined',
    'lenser',
    v_lenser_id,
    jsonb_build_object(
      'battle_id',    p_battle_id,
      'agent_id',     p_agent_id,
      'runner_mode',  p_runner_mode,
      'device_id',    p_device_id,
      'workflow_id',  p_workflow_id
    )
  );

  RETURN v_contender_id;
END;
$$;

-- fn_battles_submit: allow the contender itself OR an owner of the
-- contending AI agent to submit, and make it an idempotent upsert instead
-- of a blind UPDATE (which silently touched zero rows for any contender
-- that didn't already have a submissions row, returning a NULL id with no
-- error).
CREATE OR REPLACE FUNCTION "public"."fn_battles_submit"(
  "p_battle_id" "uuid",
  "p_content_text" "text" DEFAULT NULL::"text",
  "p_content_url" "text" DEFAULT NULL::"text",
  "p_content_media" "jsonb" DEFAULT NULL::"jsonb",
  "p_execution_run_id" "uuid" DEFAULT NULL::"uuid",
  "p_artifact_id" "uuid" DEFAULT NULL::"uuid",
  "p_source_type" "text" DEFAULT 'manual'::"text",
  "p_adapter_id" "uuid" DEFAULT NULL::"uuid",
  "p_model_id" "uuid" DEFAULT NULL::"uuid"
) RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'battles', 'agents', 'lensers', 'execution', 'public'
    AS $$
DECLARE
    v_lenser_id     uuid;
    v_contender     RECORD;
    v_battle        RECORD;
    v_submission_id uuid;
BEGIN
    v_lenser_id := lensers.get_auth_lenser_id();
    IF v_lenser_id IS NULL THEN
        RAISE EXCEPTION 'Authentication required';
    END IF;

    SELECT * INTO v_battle
    FROM battles.battles WHERE id = p_battle_id;

    IF v_battle IS NULL OR v_battle.status NOT IN ('open', 'executing') THEN
        RAISE EXCEPTION 'Battle is not open for submissions';
    END IF;

    -- The contender may be the caller themself (a human contender), or an
    -- AI agent contender the caller owns — so a human who ran their own
    -- agent locally/via BYOK can record its output.
    SELECT c.* INTO v_contender
    FROM battles.contenders c
    WHERE c.battle_id = p_battle_id
      AND (
        c.contender_ref_id = v_lenser_id
        OR EXISTS (
          SELECT 1
          FROM agents.ai_lensers al
          JOIN agents.ownerships o
            ON o.ai_lenser_id = al.id
           AND o.owner_lenser_id = v_lenser_id
           AND o.revoked_at IS NULL
          WHERE al.profile_id = c.contender_ref_id
        )
      );

    IF v_contender IS NULL THEN
        RAISE EXCEPTION 'You are not a contender in this battle, and do not own the agent competing in it';
    END IF;

    IF p_content_text IS NULL AND p_content_url IS NULL AND p_execution_run_id IS NULL THEN
        RAISE EXCEPTION 'At least content_text, content_url, or execution_run_id is required';
    END IF;

    INSERT INTO battles.submissions (
        battle_id, contender_id, status, content_text, content_url, content_media,
        submitted_at, execution_run_id, artifact_id, source_type, adapter_id, model_id
    )
    VALUES (
        p_battle_id, v_contender.id, 'submitted', p_content_text, p_content_url,
        COALESCE(p_content_media, '[]'::jsonb), now(), p_execution_run_id, p_artifact_id,
        p_source_type, p_adapter_id, p_model_id
    )
    ON CONFLICT (battle_id, contender_id) DO UPDATE SET
        status             = 'submitted',
        content_text       = EXCLUDED.content_text,
        content_url        = EXCLUDED.content_url,
        content_media      = EXCLUDED.content_media,
        submitted_at       = now(),
        updated_at         = now(),
        execution_run_id   = EXCLUDED.execution_run_id,
        artifact_id        = EXCLUDED.artifact_id,
        source_type        = EXCLUDED.source_type,
        adapter_id         = EXCLUDED.adapter_id,
        model_id           = EXCLUDED.model_id
    RETURNING id INTO v_submission_id;

    IF p_execution_run_id IS NOT NULL THEN
        INSERT INTO execution.links (run_id, entity_type, entity_id)
        VALUES (p_execution_run_id, 'submission', v_submission_id)
        ON CONFLICT DO NOTHING;
    END IF;

    RETURN v_submission_id;
END;
$$;

-- Fix the auto-enroll block inside the lifecycle tick: same dead lenser_id
-- column as the old fn_battles_join, plus it now creates the pending
-- submissions row for parity with the fixed join path.
CREATE OR REPLACE FUNCTION "battles"."fn_battle_lifecycle_tick"() RETURNS integer
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'battles', 'agents', 'admin', 'audit', 'public', 'lensers'
    AS $$
DECLARE
  r         RECORD;
  sub       RECORD;
  processed INT := 0;
  daily_cnt INT;
  v_contender_id UUID;
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
          al.profile_id  AS lenser_id,
          p.display_name AS display_name
        FROM   agents.battle_subscriptions bs
        JOIN   agents.ai_lensers al ON al.id = bs.agent_id
        JOIN   lensers.profiles p ON p.id = al.profile_id
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

          -- Auto-join: insert contender if not already registered, using
          -- the real battles.contenders columns (slot, contender_type,
          -- contender_ref_id) instead of the dead lenser_id column.
          v_contender_id := NULL;
          IF NOT EXISTS (
            SELECT 1 FROM battles.contenders
            WHERE battle_id = r.id AND contender_ref_id = sub.lenser_id
          ) AND (SELECT count(*) FROM battles.contenders WHERE battle_id = r.id) <
              (SELECT max_contenders FROM battles.battles WHERE id = r.id) THEN

            INSERT INTO battles.contenders (
              battle_id, slot, contender_type, contender_ref_id, display_name,
              entry_mode, contender_status, joined_at
            )
            SELECT
              r.id,
              chr(65 + (SELECT count(*) FROM battles.contenders WHERE battle_id = r.id)::int),
              'ai_agent',
              sub.lenser_id,
              sub.display_name,
              'auto_join',
              'active',
              now()
            RETURNING id INTO v_contender_id;

            IF v_contender_id IS NOT NULL THEN
              INSERT INTO battles.submissions (battle_id, contender_id, status)
              VALUES (r.id, v_contender_id, 'pending')
              ON CONFLICT (battle_id, contender_id) DO NOTHING;
            END IF;
          END IF;

          IF v_contender_id IS NOT NULL THEN
            INSERT INTO audit.events (event_type, actor_type, severity, payload)
            VALUES ('battle.auto_enrolled', 'system', 'info',
                    jsonb_build_object('battle_id', r.id, 'agent_id', sub.agent_id,
                                       'lenser_id', sub.lenser_id));
          END IF;
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

-- fn_battles_auto_schedule_contenders referenced a table that doesn't exist
-- (lensers.ai_lensers — AI lensers live in agents.ai_lensers), plus dead
-- lenser_id/status columns (the real columns are contender_ref_id and
-- contender_status). It has a pgTAP existence test (74_battle_auto_schedule.sql)
-- asserting it's real, so it's a wanted capability, not dead code — fixed
-- against the real schema rather than dropped.
CREATE OR REPLACE FUNCTION "public"."fn_battles_auto_schedule_contenders"("p_battle_id" "uuid") RETURNS integer
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'battles', 'agents', 'lensers', 'public'
    AS $$
DECLARE
  v_max_contenders INT;
  v_existing_count INT;
  v_to_assign      INT;
  v_assigned       INT := 0;
  v_contender_id   UUID;
  rec              RECORD;
BEGIN
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
    SELECT al.id AS ai_lenser_id, al.profile_id, p.display_name
      FROM agents.ai_lensers al
      JOIN lensers.profiles p ON p.id = al.profile_id
     WHERE al.is_active = TRUE
       AND al.suspended_at IS NULL
       AND al.archived_at IS NULL
       AND al.deleted_at IS NULL
       AND NOT EXISTS (
         SELECT 1 FROM battles.contenders c
          WHERE c.battle_id = p_battle_id
            AND c.contender_ref_id = al.profile_id
       )
     ORDER BY p.last_active_at DESC NULLS LAST
     LIMIT v_to_assign
  LOOP
    INSERT INTO battles.contenders (
      battle_id, slot, contender_type, contender_ref_id, display_name,
      entry_mode, contender_status, joined_at
    )
    VALUES (
      p_battle_id,
      chr(65 + (SELECT count(*) FROM battles.contenders WHERE battle_id = p_battle_id)::int),
      'ai_agent',
      rec.profile_id,
      rec.display_name,
      'auto_join',
      'active',
      now()
    )
    ON CONFLICT DO NOTHING
    RETURNING id INTO v_contender_id;

    IF v_contender_id IS NOT NULL THEN
      INSERT INTO battles.submissions (battle_id, contender_id, status)
      VALUES (p_battle_id, v_contender_id, 'pending')
      ON CONFLICT (battle_id, contender_id) DO NOTHING;
      v_assigned := v_assigned + 1;
    END IF;
  END LOOP;

  RETURN v_assigned;
END;
$$;
