import { beforeEach, describe, expect, it, vi } from 'vitest'

const rpcMock = vi.fn()
const getSessionMock = vi.fn()
const getCachedSessionMock = vi.fn()
const maybeSingleMock = vi.fn()
const eqMock = vi.fn(() => ({ maybeSingle: maybeSingleMock }))
const selectMock = vi.fn(() => ({ eq: eqMock }))
const fromMock = vi.fn(() => ({ select: selectMock }))
const schemaMock = vi.fn(() => ({ from: fromMock }))

vi.mock('@lenserfight/data/supabase', () => ({
  supabase: {
    rpc: (...args: unknown[]) => rpcMock(...args),
    schema: (...args: unknown[]) => schemaMock(...args),
    auth: {
      getSession: (...args: unknown[]) => getSessionMock(...args),
    },
  },
  getCachedSession: (...args: unknown[]) => getCachedSessionMock(...args),
}))

import { SupabaseAgentsRepository } from './agentsRepository'
import { SupabaseLenserRepository } from './lenserRepository'
import { SupabaseWorkflowsRepository } from './workflowsRepository'

describe('AI workspace repository contracts', () => {
  beforeEach(() => {
    rpcMock.mockReset()
    getSessionMock.mockReset()
    maybeSingleMock.mockReset()
    eqMock.mockClear()
    selectMock.mockClear()
    fromMock.mockClear()
    schemaMock.mockClear()
  })

  it('resolves the authenticated lenser through the active-workspace RPC', async () => {
    getSessionMock.mockResolvedValue({
      data: { session: { user: { id: 'user-1' } } },
    })
    getCachedSessionMock.mockReturnValue({ user: { id: 'user-1' } })
    rpcMock.mockResolvedValue({
      data: [
        {
          id: 'ai-profile-1',
          handle: 'owner-bot',
          display_name: 'Owner Bot',
          type: 'ai',
        },
      ],
      error: null,
    })

    const repo = new SupabaseLenserRepository()
    const profile = await repo.getAuthenticatedLenser()

    expect(rpcMock).toHaveBeenCalledWith('fn_lensers_get_active_profile')
    expect(profile?.id).toBe('ai-profile-1')
  })

  it('looks up AI profiles by workspace profile id instead of runtime id', async () => {
    rpcMock.mockResolvedValue({
      data: {
        id: 'ai-runtime-1',
        ai_lenser_id: 'ai-runtime-1',
        profile_id: 'ai-profile-1',
        handle: 'owner-bot',
        display_name: 'Owner Bot',
      },
      error: null,
    })

    const repo = new SupabaseAgentsRepository()
    const agent = await repo.getAgentProfileByProfileId('ai-profile-1')

    expect(rpcMock).toHaveBeenCalledWith('fn_get_agent_profile_by_profile_id', {
      p_profile_id: 'ai-profile-1',
    })
    expect(agent?.profile_id).toBe('ai-profile-1')
  })

  it('uses the schedule RPCs for AI workflow automation', async () => {
    rpcMock
      .mockResolvedValueOnce({
        data: [
          {
            id: 'schedule-1',
            workflow_id: 'workflow-1',
            workflow_title: 'Nightly research',
            cron_expr: '0 * * * *',
            timezone: 'UTC',
            global_model_id: null,
            inputs_template: {},
            is_active: true,
            assignee_type: 'agent',
            assignee_id: 'ai-runtime-1',
            workflow_assignment_id: null,
            approval_policy: { requiresApproval: true },
            retry_policy: { maxRetries: 1 },
            failure_policy: { mode: 'isolate' },
            queue_policy: { mode: 'parallel' },
            next_run_at: '2026-04-23T01:00:00.000Z',
            last_run_at: null,
            last_run_id: null,
            last_dispatch_status: 'dispatched',
            last_error_at: null,
            last_error_message: null,
            last_completed_at: null,
            last_result: {},
            created_at: '2026-04-23T00:00:00.000Z',
          },
        ],
        error: null,
      })
      .mockResolvedValueOnce({
        data: [
          {
            id: 'schedule-2',
            workflow_id: 'workflow-1',
            workflow_title: 'Nightly research',
            cron_expr: '*/15 * * * *',
            timezone: 'UTC',
            global_model_id: 'model-1',
            inputs_template: { topic: 'security' },
            is_active: true,
            assignee_type: 'agent',
            assignee_id: 'ai-runtime-1',
            workflow_assignment_id: null,
            approval_policy: { requiresApproval: true },
            retry_policy: { maxRetries: 1 },
            failure_policy: { mode: 'isolate' },
            queue_policy: { mode: 'parallel' },
            next_run_at: '2026-04-23T00:15:00.000Z',
            last_run_at: null,
            last_run_id: null,
            last_dispatch_status: null,
            last_error_at: null,
            last_error_message: null,
            last_completed_at: null,
            last_result: {},
            created_at: '2026-04-23T00:00:00.000Z',
          },
        ],
        error: null,
      })

    const repo = new SupabaseWorkflowsRepository()
    const schedules = await repo.getSchedules()
    const created = await repo.upsertSchedule({
      workflow_id: 'workflow-1',
      cron_expr: '*/15 * * * *',
      global_model_id: 'model-1',
      inputs_template: { topic: 'security' },
      is_active: true,
    })

    expect(rpcMock).toHaveBeenNthCalledWith(1, 'fn_get_workflow_schedules', {})
    expect(rpcMock).toHaveBeenNthCalledWith(2, 'fn_upsert_workflow_schedule', {
      p_workflow_id: 'workflow-1',
      p_schedule_id: null,
      p_cron_expr: '*/15 * * * *',
      p_timezone: 'UTC',
      p_global_model_id: 'model-1',
      p_inputs_template: { topic: 'security' },
      p_is_active: true,
      p_description: null,
      p_assignee_id: null,
      p_workflow_assignment_id: null,
      p_approval_policy: { requiresApproval: true },
      p_retry_policy: { maxRetries: 1 },
      p_failure_policy: { mode: 'isolate' },
      p_queue_policy: { mode: 'parallel' },
    })
    expect(schedules[0].workflow_title).toBe('Nightly research')
    expect(created?.id).toBe('schedule-2')
  })

  it('passes the workflow filter through the schedule listing RPC', async () => {
    rpcMock.mockResolvedValue({
      data: [],
      error: null,
    })

    const repo = new SupabaseWorkflowsRepository()
    await repo.getSchedules('workflow-1')

    expect(rpcMock).toHaveBeenCalledWith('fn_get_workflow_schedules', {
      p_workflow_id: 'workflow-1',
    })
  })

  it('fetches schedule run history via fn_get_workflow_schedule_history', async () => {
    const historyRows = [
      {
        id: 'run-1',
        workflow_id: 'workflow-1',
        status: 'completed',
        scheduled_for: '2026-05-01T09:00:00.000Z',
        started_at: '2026-05-01T09:00:05.000Z',
        completed_at: '2026-05-01T09:01:00.000Z',
        error_message: null,
        created_at: '2026-05-01T09:00:00.000Z',
      },
      {
        id: 'run-2',
        workflow_id: 'workflow-1',
        status: 'failed',
        scheduled_for: '2026-04-30T09:00:00.000Z',
        started_at: null,
        completed_at: null,
        error_message: 'Provider timeout',
        created_at: '2026-04-30T09:00:00.000Z',
      },
    ]

    rpcMock.mockResolvedValue({ data: historyRows, error: null })

    const repo = new SupabaseWorkflowsRepository()
    const result = await repo.getScheduleHistory('schedule-1')

    expect(rpcMock).toHaveBeenCalledWith('fn_get_workflow_schedule_history', {
      p_schedule_id: 'schedule-1',
    })
    expect(result).toHaveLength(2)
    expect(result[0].scheduled_for).toBe('2026-05-01T09:00:00.000Z')
    expect(result[1].error_message).toBe('Provider timeout')
  })
})
