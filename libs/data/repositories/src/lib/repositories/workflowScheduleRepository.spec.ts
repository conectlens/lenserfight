import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const rpcMigrationPath = join(
  process.cwd(),
  'supabase/migrations/20260501025000_fix_workflow_schedule_rpc.sql'
)
const rpcSql = readFileSync(rpcMigrationPath, 'utf8')

const completionPath = join(
  process.cwd(),
  'supabase/migrations/20260501030000_schedule_dispatch_completion.sql'
)
const completionSql = readFileSync(completionPath, 'utf8')

const approvalGatePath = join(
  process.cwd(),
  'supabase/migrations/20270301000000_phase2_schedule_approval_gate_enforce.sql'
)
const approvalGateSql = readFileSync(approvalGatePath, 'utf8')

const rlsPath = join(
  process.cwd(),
  'supabase/migrations/20270301100000_phase2_schedule_rls_owner_filter.sql'
)
const rlsSql = readFileSync(rlsPath, 'utf8')

describe('fn_upsert_workflow_schedule — CRUD invariants', () => {
  it('is a SECURITY DEFINER function (owner check is server-side)', () => {
    expect(rpcSql).toContain('SECURITY DEFINER')
  })

  it('rejects callers who do not own the workflow', () => {
    expect(rpcSql).toContain('v_owner_id <> lensers.get_auth_lenser_id()')
    expect(rpcSql).toMatch(/RAISE EXCEPTION.*not owned/i)
  })

  it('validates cron expression — expects exactly 5 fields', () => {
    expect(rpcSql).toContain("regexp_split_to_array(trim(COALESCE(p_cron_expr, '')), '\\s+')")
    expect(rpcSql).toMatch(/array_length.*<>.*5/)
  })

  it('blocks activation when the workflow has a cycle', () => {
    expect(rpcSql).toContain('lenses.fn_workflow_has_cycle(p_workflow_id)')
    expect(rpcSql).toContain('Cannot activate schedule for a workflow with cycles')
  })

  it('supports deactivation via p_is_active = false', () => {
    expect(rpcSql).toContain('p_is_active boolean DEFAULT true')
    expect(rpcSql).toContain('is_active = p_is_active')
  })

  it('scopes read query to the authenticated lenser (owner isolation)', () => {
    // The final SELECT returns only schedules belonging to the auth lenser
    expect(rpcSql).toContain('AND w.lenser_id = lensers.get_auth_lenser_id()')
  })

  it('grants execution to authenticated role only (no anon access)', () => {
    expect(rpcSql).toContain('GRANT EXECUTE ON FUNCTION public.fn_upsert_workflow_schedule')
    expect(rpcSql).toContain('authenticated')
    expect(rpcSql).not.toContain('TO anon')
  })
})

describe('fn_dispatch_scheduled_workflows — idempotency and slot deduplication', () => {
  it('uses a unique index to prevent duplicate slot dispatches', () => {
    expect(rpcSql).toContain('idx_workflow_runs_schedule_slot')
    expect(rpcSql).toContain('scheduled_for')
  })

  it('skips over locked schedule rows (SKIP LOCKED prevents double dispatch)', () => {
    expect(rpcSql).toContain('FOR UPDATE OF s SKIP LOCKED')
  })
})

describe('fn_dispatch_scheduled_workflows_with_approval — approval integration', () => {
  it('creates team_runs with blocked status when approval is required', () => {
    expect(completionSql).toContain("v_requires_approval THEN 'blocked' ELSE 'queued'")
  })

  it('sets approval_status to pending when requiresApproval is true', () => {
    expect(completionSql).toContain("v_requires_approval THEN 'pending' ELSE 'not_required'")
  })

  it('emits an approval_requested event so the UI can surface the gate', () => {
    expect(completionSql).toContain("'approval_requested'")
  })
})

describe('Phase 2 approval gate enforcement migration', () => {
  it('redirects pg_cron to the approval-aware dispatcher', () => {
    expect(approvalGateSql).toContain('fn_dispatch_scheduled_workflows_with_approval')
    expect(approvalGateSql).toMatch(/cron\.(un)?schedule/)
  })

  it('guards against unlimited spending on schedules with no approval required', () => {
    expect(approvalGateSql).toMatch(/spending_limit_credits.*IS NULL|requiresApproval.*false/i)
  })
})

describe('Phase 2 RLS owner filter migration', () => {
  it('creates a SELECT policy on lenses.workflow_schedules restricting to the owner', () => {
    expect(rlsSql).toContain('CREATE POLICY')
    expect(rlsSql).toContain('lenses.workflow_schedules')
    expect(rlsSql).toContain('lensers.get_auth_lenser_id()')
  })

  it('enables row level security on the workflow_schedules table', () => {
    expect(rlsSql).toContain('ENABLE ROW LEVEL SECURITY')
  })

  it('policy targets the authenticated role only', () => {
    expect(rlsSql).toContain('TO authenticated')
  })
})
