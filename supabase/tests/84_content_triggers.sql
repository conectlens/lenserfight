-- =============================================================================
-- pgTAP — Phase CN: Content notification triggers
-- plan(8): 6 triggers exist on correct tables; 2 key functions are SECURITY DEFINER
-- =============================================================================
BEGIN;

SELECT plan(8);

-- 1. trg_notify_lens_comment exists on content.thread_replies
SELECT ok(
  EXISTS (
    SELECT 1 FROM information_schema.triggers
    WHERE trigger_schema     = 'content'
      AND event_object_table = 'thread_replies'
      AND trigger_name       = 'trg_notify_lens_comment'
  ),
  'trg_notify_lens_comment exists on content.thread_replies'
);

-- 2. trg_notify_lens_forked exists on lenses.lenses
SELECT ok(
  EXISTS (
    SELECT 1 FROM information_schema.triggers
    WHERE trigger_schema     = 'lenses'
      AND event_object_table = 'lenses'
      AND trigger_name       = 'trg_notify_lens_forked'
  ),
  'trg_notify_lens_forked exists on lenses.lenses'
);

-- 3. trg_notify_lens_published exists on lenses.lenses
SELECT ok(
  EXISTS (
    SELECT 1 FROM information_schema.triggers
    WHERE trigger_schema     = 'lenses'
      AND event_object_table = 'lenses'
      AND trigger_name       = 'trg_notify_lens_published'
  ),
  'trg_notify_lens_published exists on lenses.lenses'
);

-- 4. trg_notify_lens_featured exists on lenses.lenses
SELECT ok(
  EXISTS (
    SELECT 1 FROM information_schema.triggers
    WHERE trigger_schema     = 'lenses'
      AND event_object_table = 'lenses'
      AND trigger_name       = 'trg_notify_lens_featured'
  ),
  'trg_notify_lens_featured exists on lenses.lenses'
);

-- 5. trg_notify_workflow_published exists on lenses.workflows
SELECT ok(
  EXISTS (
    SELECT 1 FROM information_schema.triggers
    WHERE trigger_schema     = 'lenses'
      AND event_object_table = 'workflows'
      AND trigger_name       = 'trg_notify_workflow_published'
  ),
  'trg_notify_workflow_published exists on lenses.workflows'
);

-- 6. trg_notify_workflow_forked exists on lenses.workflows
SELECT ok(
  EXISTS (
    SELECT 1 FROM information_schema.triggers
    WHERE trigger_schema     = 'lenses'
      AND event_object_table = 'workflows'
      AND trigger_name       = 'trg_notify_workflow_forked'
  ),
  'trg_notify_workflow_forked exists on lenses.workflows'
);

-- 7. content.fn_trg_notify_lens_comment is SECURITY DEFINER
SELECT ok(
  EXISTS (
    SELECT 1 FROM pg_catalog.pg_proc p
    JOIN pg_catalog.pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname  = 'content'
      AND p.proname  = 'fn_trg_notify_lens_comment'
      AND p.prosecdef = true
  ),
  'content.fn_trg_notify_lens_comment is SECURITY DEFINER'
);

-- 8. lenses.fn_trg_notify_lens_published is SECURITY DEFINER
SELECT ok(
  EXISTS (
    SELECT 1 FROM pg_catalog.pg_proc p
    JOIN pg_catalog.pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname   = 'lenses'
      AND p.proname   = 'fn_trg_notify_lens_published'
      AND p.prosecdef = true
  ),
  'lenses.fn_trg_notify_lens_published is SECURITY DEFINER'
);

SELECT * FROM finish();
ROLLBACK;
