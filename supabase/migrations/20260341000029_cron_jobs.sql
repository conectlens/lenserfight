-- =============================================================================
-- MIGRATION 29: CRON JOBS + BATTLE AUTO-FINALIZE FUNCTION
-- =============================================================================
-- Schedules missing pg_cron jobs:
--   1. battle-auto-finalize  — Every 5 minutes, close battles past voting_closes_at
--   2. account-purge-daily   — Daily at 03:00 UTC (fn_purge_due_accounts already exists)
--
-- Existing cron job (xp-season-check) was added in migration 11 — NOT duplicated here.
--
-- Also creates:
--   battles.fn_auto_finalize_battles() — Called by the cron job
-- =============================================================================


-- ─────────────────────────────────────────────────────────────────────────────
-- SECTION 1: battles.fn_auto_finalize_battles
-- ─────────────────────────────────────────────────────────────────────────────
-- Called every 5 minutes by pg_cron.
-- Phase 1: Move voting → scoring for battles past voting_closes_at
-- Phase 2: Finalize all battles in 'scoring' state (calls existing fn_battles_finalize)
-- Logs to audit.events via audit.log_event().

CREATE OR REPLACE FUNCTION "battles"."fn_auto_finalize_battles"() RETURNS integer
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'battles', 'public', 'audit'
    AS $$
DECLARE
    v_battle_id    uuid;
    v_count        integer := 0;
    v_voting_ids   uuid[];
    v_scoring_ids  uuid[];
BEGIN
    -- ── Phase 1: voting → scoring (voting period has ended) ─────────────────
    SELECT array_agg(id)
    INTO v_voting_ids
    FROM battles.battles
    WHERE status = 'voting'
      AND voting_closes_at IS NOT NULL
      AND voting_closes_at <= now();

    IF v_voting_ids IS NOT NULL THEN
        UPDATE battles.battles
        SET status     = 'scoring',
            updated_at = now()
        WHERE id = ANY(v_voting_ids);

        -- Audit each transition
        FOREACH v_battle_id IN ARRAY v_voting_ids LOOP
            PERFORM audit.log_event(
                'battle.scoring_started',
                'battles', 'battles', v_battle_id,
                NULL, NULL,
                jsonb_build_object('source', 'cron:auto_finalize', 'old_status', 'voting'),
                'info'
            );
        END LOOP;
    END IF;

    -- ── Phase 2: scoring → closed (finalize vote counts + determine winner) ──
    SELECT array_agg(id)
    INTO v_scoring_ids
    FROM battles.battles
    WHERE status = 'scoring';

    IF v_scoring_ids IS NOT NULL THEN
        FOREACH v_battle_id IN ARRAY v_scoring_ids LOOP
            BEGIN
                -- fn_battles_finalize handles vote aggregation and XP awards
                PERFORM public.fn_battles_finalize(v_battle_id);
                v_count := v_count + 1;

                PERFORM audit.log_event(
                    'battle.finalized',
                    'battles', 'battles', v_battle_id,
                    NULL, NULL,
                    jsonb_build_object('source', 'cron:auto_finalize'),
                    'info'
                );
            EXCEPTION WHEN OTHERS THEN
                -- Log but don't abort — continue to next battle
                PERFORM audit.log_event(
                    'battle.finalized',
                    'battles', 'battles', v_battle_id,
                    NULL, NULL,
                    jsonb_build_object(
                        'source',  'cron:auto_finalize',
                        'error',   SQLERRM,
                        'sqlstate', SQLSTATE
                    ),
                    'error'
                );
            END;
        END LOOP;
    END IF;

    RETURN v_count;  -- Returns number of battles finalized in this run
END;
$$;

ALTER FUNCTION "battles"."fn_auto_finalize_battles"() OWNER TO "postgres";

COMMENT ON FUNCTION "battles"."fn_auto_finalize_battles"() IS
    'Called by pg_cron every 5 minutes. Phase 1: voting→scoring for expired battles. '
    'Phase 2: scoring→closed via fn_battles_finalize. Returns count finalized. '
    'Errors per-battle are caught and logged to audit.events.';

GRANT EXECUTE ON FUNCTION "battles"."fn_auto_finalize_battles"() TO "service_role";


-- ─────────────────────────────────────────────────────────────────────────────
-- SECTION 2: SCHEDULE CRON JOBS
-- ─────────────────────────────────────────────────────────────────────────────
-- All scheduling is wrapped in DO $$ BEGIN ... EXCEPTION WHEN ... END; $$
-- to be safe on environments where pg_cron may not be installed.

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN

        -- ── Job 1: battle-auto-finalize ──────────────────────────────────────
        -- Runs every 5 minutes.
        -- Unschedule first in case migration is re-run (idempotent).
        BEGIN
            PERFORM cron.unschedule('battle-auto-finalize');
        EXCEPTION WHEN OTHERS THEN
            NULL;  -- Not yet scheduled — that's fine
        END;

        PERFORM cron.schedule(
            'battle-auto-finalize',
            '*/5 * * * *',
            'SELECT battles.fn_auto_finalize_battles()'
        );

        RAISE NOTICE 'Scheduled cron job: battle-auto-finalize (every 5 minutes)';

        -- ── Job 2: account-purge-daily ───────────────────────────────────────
        -- Runs daily at 03:00 UTC.
        -- fn_purge_due_accounts() was defined in migration 09.
        BEGIN
            PERFORM cron.unschedule('account-purge-daily');
        EXCEPTION WHEN OTHERS THEN
            NULL;  -- Not yet scheduled — that's fine
        END;

        PERFORM cron.schedule(
            'account-purge-daily',
            '0 3 * * *',
            'SELECT fn_purge_due_accounts()'
        );

        RAISE NOTICE 'Scheduled cron job: account-purge-daily (03:00 UTC daily)';

    ELSE
        RAISE NOTICE 'pg_cron not available — skipping cron job scheduling. '
                     'Run manually: SELECT battles.fn_auto_finalize_battles(); '
                     'and: SELECT fn_purge_due_accounts();';
    END IF;
END;
$$;


-- ─────────────────────────────────────────────────────────────────────────────
-- SECTION 3: VERIFICATION QUERY (informational comment)
-- ─────────────────────────────────────────────────────────────────────────────
-- To verify cron jobs are registered after migration:
--
--   SELECT jobname, schedule, command, active
--   FROM cron.job
--   WHERE jobname IN (
--     'battle-auto-finalize',
--     'account-purge-daily',
--     'xp-season-check'
--   )
--   ORDER BY jobname;
--
-- Expected output (3 rows):
--   account-purge-daily  | 0 3 * * *   | SELECT fn_purge_due_accounts()             | t
--   battle-auto-finalize | */5 * * * * | SELECT battles.fn_auto_finalize_battles()  | t
--   xp-season-check      | 0 * * * *   | SELECT xp.check_all_seasons()              | t
