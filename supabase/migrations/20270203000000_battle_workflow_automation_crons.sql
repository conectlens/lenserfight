-- Automation gaps: register missing pg_cron jobs and add helper functions
-- that were defined but never scheduled.
--
-- Adds:
--   1. battles.fn_auto_close_voting()        — voting → scoring when voting_closes_at passes
--   2. battles.fn_submit_agent_vote()         — internal vote path for service-role (no auth.uid())
--   3. cron: auto-close-voting               (every 1 min)
--   4. cron: auto-finalize-battles           (every 1 min, fn already existed)
--   5. cron: dispatch-scheduled-workflows    (every 1 min, fn already existed)
--   6. cron: vote-eligible-agents            (every 5 min, via net.http_post to edge function)

-- ─── 1. fn_auto_close_voting ─────────────────────────────────────────────────
-- Transitions all battles from voting → scoring once voting_closes_at has passed.
-- Runs every minute via cron. Mirrors the safety pattern of fn_auto_start_battles.

CREATE OR REPLACE FUNCTION battles.fn_auto_close_voting()
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = battles, public
AS $$
DECLARE
  r      RECORD;
  closed INT := 0;
BEGIN
  FOR r IN
    SELECT id
    FROM   battles.battles
    WHERE  status          = 'voting'
    AND    voting_closes_at < now()
    FOR UPDATE SKIP LOCKED
  LOOP
    BEGIN
      UPDATE battles.battles
      SET    status = 'scoring'
      WHERE  id = r.id;

      INSERT INTO audit.events (event_type, payload)
      VALUES ('battle.voting_auto_closed', jsonb_build_object('battle_id', r.id));

      closed := closed + 1;
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'fn_auto_close_voting: battle % failed: %', r.id, SQLERRM;
    END;
  END LOOP;

  RETURN closed;
END;
$$;

-- ─── 2. fn_submit_agent_vote ─────────────────────────────────────────────────
-- Internal vote-submission path for AI agent voters running in edge functions.
-- Unlike public.fn_submit_vote, the voter identity is passed explicitly (no
-- auth.uid()) so the service-role caller controls which lenser is recorded.
-- Mirrors the atomic logic of public.fn_submit_vote exactly.

CREATE OR REPLACE FUNCTION battles.fn_submit_agent_vote(
  p_battle_id          UUID,
  p_voter_lenser_id    UUID,    -- agent's lensers.profiles id
  p_voted_contender_id UUID,
  p_vote_value         TEXT,    -- 'contender_a' | 'contender_b' | 'draw'
  p_is_draw            BOOLEAN  DEFAULT FALSE,
  p_rationale          TEXT     DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = battles, public
AS $$
DECLARE
  v_vote_id UUID;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM battles.battles WHERE id = p_battle_id AND status = 'voting'
  ) THEN
    RAISE EXCEPTION 'battle_not_in_voting_phase: %', p_battle_id;
  END IF;

  IF NOT p_is_draw AND NOT EXISTS (
    SELECT 1 FROM battles.contenders
    WHERE  id = p_voted_contender_id AND battle_id = p_battle_id
  ) THEN
    RAISE EXCEPTION 'contender_not_in_battle: %', p_voted_contender_id;
  END IF;

  INSERT INTO battles.votes
    (battle_id, voter_lenser_id, vote_value, voted_contender_id, is_draw, rationale)
  VALUES
    (p_battle_id, p_voter_lenser_id,
     p_vote_value::battles.vote_value_enum,
     p_voted_contender_id, p_is_draw, p_rationale)
  RETURNING id INTO v_vote_id;

  INSERT INTO battles.vote_aggregates
    (battle_id, contender_id, raw_vote_count, weighted_vote_sum, draw_count)
  VALUES
    (p_battle_id, p_voted_contender_id, 1, 1, CASE WHEN p_is_draw THEN 1 ELSE 0 END)
  ON CONFLICT (battle_id, contender_id) DO UPDATE SET
    raw_vote_count    = battles.vote_aggregates.raw_vote_count + 1,
    weighted_vote_sum = battles.vote_aggregates.weighted_vote_sum + 1,
    draw_count        = battles.vote_aggregates.draw_count
                          + CASE WHEN p_is_draw THEN 1 ELSE 0 END,
    updated_at        = now();

  UPDATE battles.battles
  SET    total_vote_count = total_vote_count + 1
  WHERE  id = p_battle_id;

  INSERT INTO audit.events (event_type, payload)
  VALUES ('battle.agent_vote_submitted', jsonb_build_object(
    'vote_id',     v_vote_id,
    'battle_id',   p_battle_id,
    'voter_id',    p_voter_lenser_id,
    'vote_value',  p_vote_value
  ));

  RETURN jsonb_build_object(
    'vote_id',   v_vote_id,
    'status',    'success',
    'battle_id', p_battle_id
  );
END;
$$;

GRANT EXECUTE
  ON FUNCTION battles.fn_submit_agent_vote(UUID, UUID, UUID, TEXT, BOOLEAN, TEXT)
  TO service_role;

-- ─── 3. pg_cron registrations ────────────────────────────────────────────────

DO $do$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    RETURN;
  END IF;

  -- Idempotent: unschedule before re-scheduling so migration can be re-applied.
  PERFORM cron.unschedule('auto-close-voting')          WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'auto-close-voting');
  PERFORM cron.unschedule('auto-finalize-battles')      WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'auto-finalize-battles');
  PERFORM cron.unschedule('dispatch-scheduled-workflows')
    WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'dispatch-scheduled-workflows');
  PERFORM cron.unschedule('vote-eligible-agents')       WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'vote-eligible-agents');

  -- Closes voting when the voting window has passed (voting → scoring).
  PERFORM cron.schedule(
    'auto-close-voting',
    '*/1 * * * *',
    $$SELECT battles.fn_auto_close_voting()$$
  );

  -- Finalises battles in scoring state: direct finalization or routes to the
  -- ai-judge-battle edge function when ai_judge_enabled = TRUE.
  PERFORM cron.schedule(
    'auto-finalize-battles',
    '*/1 * * * *',
    $$SELECT battles.fn_auto_finalize_battles()$$
  );

  -- Dispatches scheduled workflow runs that are due according to their
  -- cron_expr. The function was defined in earlier migrations but never
  -- registered with pg_cron.
  PERFORM cron.schedule(
    'dispatch-scheduled-workflows',
    '*/1 * * * *',
    $$SELECT lenses.fn_dispatch_scheduled_workflows()$$
  );

  -- Triggers the vote-eligible-agents edge function every 5 minutes.
  -- The function fetches active-voting battles, finds eligible AI agents,
  -- calls Claude to generate vote decisions, and submits them.
  -- Requires pg_net extension and app.supabase_url / app.service_role_key
  -- settings to be configured in the database.
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_net')
     AND current_setting('app.supabase_url', true) IS NOT NULL
     AND current_setting('app.supabase_url', true) <> ''
  THEN
    PERFORM cron.schedule(
      'vote-eligible-agents',
      '*/5 * * * *',
      $$SELECT net.http_post(
          url     := current_setting('app.supabase_url') || '/functions/v1/vote-eligible-agents',
          headers := jsonb_build_object(
            'Content-Type',  'application/json',
            'Authorization', 'Bearer ' || current_setting('app.service_role_key', true)
          ),
          body    := '{}'::jsonb
      )$$
    );
  END IF;

END;
$do$;
