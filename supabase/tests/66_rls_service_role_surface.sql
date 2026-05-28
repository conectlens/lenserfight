-- =============================================================================
-- pgTAP — Phase BY: Service role bypass surface enumeration
-- plan(3): enumerate intentional service_role bypasses; fail if new unexpected
--          ones appear in security-sensitive schemas
-- =============================================================================
BEGIN;

SELECT plan(3);

-- 1. execution.byok_keys is accessible to service_role (intentional bypass)
SELECT lives_ok(
  $$SELECT count(*) FROM execution.byok_keys$$,
  'service_role can SELECT from execution.byok_keys'
);

-- 2. audit.events is accessible to service_role (intentional — workers write events)
SELECT lives_ok(
  $$SELECT count(*) FROM audit.events$$,
  'service_role can SELECT from audit.events'
);

-- 3. The number of tables with open service_role SELECT (USING true) in
--    security-sensitive schemas must not exceed the known intentional count.
--    Phase BZ count: 21 policies across audit.* (11) + execution.* (10).
--    New since Phase BY: artifact_medias, execution_tags, origin_types,
--    request_attachments, stream_sessions, and duplicate webhook_outbox/
--    security_events policies added by CA/CC migrations.
--    Increment this threshold only with an explicit audit of the new policies.
SELECT ok(
  (
    SELECT count(*)
    FROM pg_policies
    WHERE schemaname IN ('execution', 'audit', 'admin', 'connectors', 'devices')
      AND roles @> ARRAY['service_role']::name[]
      AND qual = 'true'
  ) <= 21,
  'No unexpected expansion of open service_role bypass policies in sensitive schemas'
);

SELECT finish();
ROLLBACK;
