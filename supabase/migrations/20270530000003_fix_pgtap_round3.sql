-- ─────────────────────────────────────────────────────────────────────────────
-- Fix pgTAP smoke test failures (round 3)
--
-- Tests fixed:
--   32  tests 12-13  fn_dispatch_scheduled_workflows_with_approval kill-switch
--                    tests fail because platform.system_flags has no seed row
--                    for autonomy_dispatch_enabled.  The UPDATE in the test is
--                    a no-op when the row is absent, so v_dispatch_enabled stays
--                    NULL, NULL IS NOT DISTINCT FROM false = false, and the
--                    function dispatches instead of returning 0.
--                    Fix: seed all three core system_flags rows to TRUE (the
--                    correct production default) so the test UPDATE can toggle
--                    the flag to false.
-- ─────────────────────────────────────────────────────────────────────────────

INSERT INTO platform.system_flags (key, value, updated_at)
VALUES
  ('autonomy_dispatch_enabled', 'true'::jsonb, now()),
  ('public_battles_enabled',    'true'::jsonb, now()),
  ('webhook_outbox_enabled',    'true'::jsonb, now())
ON CONFLICT (key) DO NOTHING;
