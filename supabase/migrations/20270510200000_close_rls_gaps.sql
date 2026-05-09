-- Phase Z3: Close RLS gaps surfaced by supabase-security-auditor.
--   * reputation.elo_battle_log     — no RLS at all
--   * audit.webhook_outbox          — RLS on but zero policies (opaque)
--   * reputation.contender_ratings  — public USING(true) read
--   * reputation.lenser_scores      — public USING(true) read
--
-- Strategy: enable RLS where missing, add explicit service_role policies
-- (so intent is auditable), and replace blanket public read on reputation
-- tables with a service-role-only policy. Public consumers must go through
-- a paginated SECURITY DEFINER fn_get_leaderboard added in a later phase.
-- All operations are idempotent.

-- ---------------------------------------------------------------------------
-- reputation.elo_battle_log
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  IF to_regclass('reputation.elo_battle_log') IS NULL THEN RETURN; END IF;
  EXECUTE 'ALTER TABLE reputation.elo_battle_log ENABLE ROW LEVEL SECURITY';
  EXECUTE 'ALTER TABLE reputation.elo_battle_log FORCE ROW LEVEL SECURITY';

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'reputation' AND tablename = 'elo_battle_log'
      AND policyname = 'elo_battle_log_service_role_all'
  ) THEN
    EXECUTE $p$
      CREATE POLICY elo_battle_log_service_role_all
      ON reputation.elo_battle_log
      FOR ALL TO service_role
      USING (true) WITH CHECK (true)
    $p$;
  END IF;

  EXECUTE 'REVOKE ALL ON reputation.elo_battle_log FROM anon, authenticated';
END $$;

-- ---------------------------------------------------------------------------
-- audit.webhook_outbox  — make service-role-only intent explicit
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  IF to_regclass('audit.webhook_outbox') IS NULL THEN RETURN; END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'audit' AND tablename = 'webhook_outbox'
      AND policyname = 'webhook_outbox_service_role_all'
  ) THEN
    EXECUTE $p$
      CREATE POLICY webhook_outbox_service_role_all
      ON audit.webhook_outbox
      FOR ALL TO service_role
      USING (true) WITH CHECK (true)
    $p$;
  END IF;

  EXECUTE 'REVOKE ALL ON audit.webhook_outbox FROM anon, authenticated';
END $$;

-- ---------------------------------------------------------------------------
-- reputation.contender_ratings & reputation.lenser_scores
-- Replace public read with service-role-only access. Public consumers
-- should be migrated to a paginated SECURITY DEFINER leaderboard RPC.
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  rel text;
BEGIN
  FOREACH rel IN ARRAY ARRAY['reputation.contender_ratings','reputation.lenser_scores'] LOOP
    IF to_regclass(rel) IS NULL THEN CONTINUE; END IF;

    -- Drop the permissive public read policies if present (names from audit).
    EXECUTE format('DROP POLICY IF EXISTS %I ON %s',
                   split_part(rel,'.',2) || '_public_read', rel);

    -- Ensure RLS stays enabled.
    EXECUTE format('ALTER TABLE %s ENABLE ROW LEVEL SECURITY', rel);

    -- Service-role full access (writes from triggers/functions running as service_role).
    IF NOT EXISTS (
      SELECT 1 FROM pg_policies
      WHERE schemaname = split_part(rel,'.',1)
        AND tablename  = split_part(rel,'.',2)
        AND policyname = 'service_role_all'
    ) THEN
      EXECUTE format($p$
        CREATE POLICY service_role_all ON %s
        FOR ALL TO service_role USING (true) WITH CHECK (true)
      $p$, rel);
    END IF;

    EXECUTE format('REVOKE ALL ON %s FROM anon, authenticated', rel);
  END LOOP;
END $$;
