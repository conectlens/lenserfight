import { beforeEach, describe, expect, it, vi } from 'vitest'

const rpcMock = vi.fn()
const getSessionMock = vi.fn()
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
    maybeSingleMock.mockResolvedValue({
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

    expect(schemaMock).toHaveBeenCalledWith('agents')
    expect(fromMock).toHaveBeenCalledWith('v_agent_profile')
    expect(eqMock).toHaveBeenCalledWith('profile_id', 'ai-profile-1')
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
            global_model_id: null,
            inputs_template: {},
            is_active: true,
            last_run_at: null,
            last_run_id: null,
            last_dispatch_status: 'dispatched',
            last_error_at: null,
            last_error_message: null,
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
            global_model_id: 'model-1',
            inputs_template: { topic: 'security' },
            is_active: true,
            last_run_at: null,
            last_run_id: null,
            last_dispatch_status: null,
            last_error_at: null,
            last_error_message: null,
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
      p_global_model_id: 'model-1',
      p_inputs_template: { topic: 'security' },
      p_is_active: true,
    })
    expect(schedules[0].workflow_title).toBe('Nightly research')
    expect(created?.id).toBe('schedule-2')
  })
})
