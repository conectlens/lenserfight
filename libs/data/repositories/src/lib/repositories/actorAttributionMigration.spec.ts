import { existsSync, readFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const workspaceRoot = existsSync(join(process.cwd(), 'supabase'))
  ? process.cwd()
  : resolve(process.cwd(), '../../..')

const migrationSql = readFileSync(
  join(workspaceRoot, 'supabase/migration-guards/20260501040000_actor_attribution.sql'),
  'utf8'
)

const manualRunSql = readFileSync(
  join(workspaceRoot, 'supabase/migration-guards/20260501050000_manual_run_attribution.sql'),
  'utf8'
)

const switchIdentifierSql = readFileSync(
  join(workspaceRoot, 'supabase/migration-guards/20270701000001_fix_switch_active_lenser_identifier.sql'),
  'utf8'
)

describe('actor attribution migration guard (20260501040000)', () => {
  it('adds ai_lenser_id column to lenses.workflow_runs', () => {
    expect(migrationSql).toContain('ALTER TABLE lenses.workflow_runs')
    expect(migrationSql).toContain('ADD COLUMN IF NOT EXISTS ai_lenser_id')
    expect(migrationSql).toContain('REFERENCES agents.ai_lensers(id)')
  })

  it('creates agents.workspace_switches audit table', () => {
    expect(migrationSql).toContain('CREATE TABLE IF NOT EXISTS agents.workspace_switches')
    expect(migrationSql).toContain('human_lenser_id')
    expect(migrationSql).toContain('from_ai_lenser_id')
    expect(migrationSql).toContain('to_ai_lenser_id')
    expect(migrationSql).toContain('switched_at')
  })

  it('enables RLS on workspace_switches', () => {
    expect(migrationSql).toContain('ALTER TABLE agents.workspace_switches ENABLE ROW LEVEL SECURITY')
    expect(migrationSql).toContain('ws_select_own ON agents.workspace_switches')
    expect(migrationSql).toContain('lensers.get_auth_lenser_id()')
  })

  it('updates fn_switch_active_lenser to log switches', () => {
    expect(migrationSql).toContain('CREATE OR REPLACE FUNCTION public.fn_switch_active_lenser')
    expect(migrationSql).toContain('INSERT INTO agents.workspace_switches')
    expect(migrationSql).toContain('v_from_ai_lenser_id')
    expect(migrationSql).toContain('v_to_ai_lenser_id')
  })

  it('populates ai_lenser_id on workflow_runs insert in the dispatcher', () => {
    expect(migrationSql).toContain('ai_lenser_id,')
    expect(migrationSql).toContain('v_assignee_ai_lenser_id,')
  })
})

describe('manual run attribution migration guard (20260501050000)', () => {
  it('replaces fn_start_workflow_run in lenses schema', () => {
    expect(manualRunSql).toContain('CREATE OR REPLACE FUNCTION lenses.fn_start_workflow_run')
  })

  it('auto-resolves v_ai_lenser_id from the active profile', () => {
    expect(manualRunSql).toContain('v_ai_lenser_id')
    expect(manualRunSql).toContain("p.type = 'ai'")
    expect(manualRunSql).toContain('agents.ai_lensers al')
  })

  it('writes ai_lenser_id onto workflow_runs insert', () => {
    expect(manualRunSql).toContain('ai_lenser_id, status')
    expect(manualRunSql).toContain('v_ai_lenser_id,')
  })

  it('retains idempotency and rate-limit logic', () => {
    expect(manualRunSql).toContain('p_idempotency_key')
    expect(manualRunSql).toContain('fn_count_recent_runs')
    expect(manualRunSql).toContain('rate_limited')
  })

  it('updates the public wrapper to forward unchanged signature', () => {
    expect(manualRunSql).toContain('CREATE OR REPLACE FUNCTION public.fn_start_workflow_run')
    expect(manualRunSql).toContain('lenses.fn_start_workflow_run(p_workflow_id, p_inputs, p_global_model_id, p_idempotency_key)')
  })

  it('grants execute on public wrapper to authenticated callers', () => {
    expect(manualRunSql).toContain('GRANT EXECUTE ON FUNCTION public.fn_start_workflow_run')
    expect(manualRunSql).toContain('authenticated')
  })
})

describe('switch active lenser identifier hotfix (20270701000001)', () => {
  it('accepts an owned AI profile id or runtime AI lenser id', () => {
    expect(switchIdentifierSql).toContain('CREATE OR REPLACE FUNCTION public.fn_switch_active_lenser')
    expect(switchIdentifierSql).toContain('(ai_p.id = p_lenser_id OR al.id = p_lenser_id)')
    expect(switchIdentifierSql).toContain('o.owner_lenser_id = v_human_id')
    expect(switchIdentifierSql).toContain("o.role = 'owner'")
  })

  it('stores the canonical AI profile id in preferences', () => {
    expect(switchIdentifierSql).toContain('SET active_lenser_id = v_target_profile_id')
    expect(switchIdentifierSql).toContain('VALUES (v_human_id, v_from_ai_lenser_id, v_to_ai_lenser_id)')
  })
})
