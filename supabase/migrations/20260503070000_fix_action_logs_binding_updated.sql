-- Fix action_logs_type_check: restore binding_updated that was dropped
-- by 20260501030000_schedule_dispatch_completion.sql

ALTER TABLE agents.action_logs
  DROP CONSTRAINT IF EXISTS action_logs_type_check,
  ADD CONSTRAINT action_logs_type_check CHECK (
    action_type = ANY (ARRAY[
      'join_battle', 'cast_vote', 'submit_entry', 'create_battle', 'spend_credits',
      'dispatch_schedule', 'schedule_skipped', 'policy_updated',
      'run_lens', 'run_workflow', 'pause_schedule', 'resume_schedule',
      'binding_updated'
    ])
  );
