import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const migrationPath = join(
  process.cwd(),
  'supabase/migration-guards/20260501025000_fix_workflow_schedule_rpc.sql'
)
const migrationSql = readFileSync(migrationPath, 'utf8')

const completionPath = join(
  process.cwd(),
  'supabase/migration-guards/20260501030000_schedule_dispatch_completion.sql'
)
const completionSql = readFileSync(completionPath, 'utf8')

describe('workflow schedule migration guard', () => {
  it('removes the broken function-name table reference from the upsert RPC', () => {
    expect(migrationSql).not.toContain('FROM public.fn_get_workflow_schedules(p_workflow_id)')
    expect(migrationSql).not.toContain('WHERE public.fn_get_workflow_schedules.id = v_schedule_id')
    expect(migrationSql).toContain('FROM lenses.workflow_schedules s')
    expect(migrationSql).toContain('AND w.lenser_id = lensers.get_auth_lenser_id();')
  })

  it('adds schedule-slot dedupe guards to the dispatcher migration', () => {
    expect(migrationSql).toContain(
      'CREATE UNIQUE INDEX IF NOT EXISTS idx_workflow_runs_schedule_slot'
    )
    expect(migrationSql).toContain('ADD COLUMN IF NOT EXISTS scheduled_for')
    expect(migrationSql).toContain('FOR UPDATE OF s SKIP LOCKED')
  })
})

describe('schedule dispatch completion migration guard', () => {
  it('expands the action_logs constraint to include dispatch action types', () => {
    expect(completionSql).toContain('DROP CONSTRAINT IF EXISTS action_logs_type_check')
    expect(completionSql).toContain("'dispatch_schedule'")
    expect(completionSql).toContain("'schedule_skipped'")
    expect(completionSql).toContain("'join_battle'")
    expect(completionSql).toContain("'spend_credits'")
  })

  it('adds fn_get_workflow_schedule_history RPC', () => {
    expect(completionSql).toContain('fn_get_workflow_schedule_history')
    expect(completionSql).toContain('p_schedule_id uuid')
    expect(completionSql).toContain('wr.scheduled_for IS NOT NULL')
    expect(completionSql).toContain('ORDER BY wr.scheduled_for DESC')
    expect(completionSql).toContain('LIMIT 50')
  })

  it('creates team_runs with approval-aware status on dispatch', () => {
    expect(completionSql).toContain('INSERT INTO agents.team_runs')
    expect(completionSql).toContain('v_assignee_ai_lenser_id')
    expect(completionSql).toContain("v_requires_approval THEN 'blocked' ELSE 'queued'")
    expect(completionSql).toContain("v_requires_approval THEN 'pending' ELSE 'not_required'")
  })

  it('emits agent_run_events on dispatch', () => {
    expect(completionSql).toContain('INSERT INTO agents.agent_run_events')
    expect(completionSql).toContain("'approval_requested'")
    expect(completionSql).toContain("'dispatch_queued'")
  })

  it('resolves assignee ai_lenser_id from both agent and team assignee types', () => {
    expect(completionSql).toContain("v_schedule.assignee_type = 'agent'")
    expect(completionSql).toContain("v_schedule.assignee_type = 'team'")
    expect(completionSql).toContain('FROM agents.teams t')
    expect(completionSql).toContain('t.ai_lenser_id')
  })
})
