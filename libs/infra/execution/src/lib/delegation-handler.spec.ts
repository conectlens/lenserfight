import { describe, it, expect, vi } from 'vitest'

import { NullDelegationHandler, SupabaseDelegationHandler } from './delegation-handler'

describe('NullDelegationHandler', () => {
  it('throws delegation_not_configured on any dispatch attempt', async () => {
    const handler = new NullDelegationHandler()
    await expect(
      handler.dispatchTeamRun({
        aiLenserId: 'ai-1',
        workflowId: 'wf-1',
        inputs: {},
        policy: 'auto',
      }),
    ).rejects.toThrow('delegation_not_configured')
  })
})

describe('SupabaseDelegationHandler', () => {
  function buildClient(rpcResult: { data: unknown; error: { message: string } | null }) {
    const rpc = vi.fn().mockResolvedValue(rpcResult)
    return { rpc }
  }

  it('returns the new team_run id on success', async () => {
    const { rpc } = buildClient({ data: 'team-run-1', error: null })
    const handler = new SupabaseDelegationHandler({ rpc } as never)

    const result = await handler.dispatchTeamRun({
      aiLenserId: 'ai-1',
      workflowId:  'wf-1',
      inputs:      { topic: 'roadmap' },
      policy:      'auto',
    })

    expect(result.teamRunId).toBe('team-run-1')
    expect(rpc).toHaveBeenCalledWith('fn_start_team_run', expect.objectContaining({
      p_ai_lenser_id: 'ai-1',
      p_workflow_id:  'wf-1',
      p_inputs:       { topic: 'roadmap' },
      p_policy:       'auto',
    }))
  })

  it('forwards approval_required policy unchanged', async () => {
    const { rpc } = buildClient({ data: 'team-run-2', error: null })
    const handler = new SupabaseDelegationHandler({ rpc } as never)

    await handler.dispatchTeamRun({
      aiLenserId: 'ai-1',
      workflowId:  'wf-1',
      inputs:      {},
      policy:      'approval_required',
    })

    expect(rpc).toHaveBeenCalledWith('fn_start_team_run', expect.objectContaining({
      p_policy: 'approval_required',
    }))
  })

  it('throws when the RPC raises (e.g. policy=forbidden)', async () => {
    const { rpc } = buildClient({ data: null, error: { message: 'delegation_forbidden' } })
    const handler = new SupabaseDelegationHandler({ rpc } as never)

    await expect(
      handler.dispatchTeamRun({
        aiLenserId: 'ai-1',
        workflowId: 'wf-1',
        inputs: {},
        policy: 'forbidden',
      }),
    ).rejects.toThrow('delegation_forbidden')
  })

  it('throws when the RPC returns no team_run id', async () => {
    const { rpc } = buildClient({ data: null, error: null })
    const handler = new SupabaseDelegationHandler({ rpc } as never)

    await expect(
      handler.dispatchTeamRun({
        aiLenserId: 'ai-1',
        workflowId: 'wf-1',
        inputs: {},
        policy: 'auto',
      }),
    ).rejects.toThrow('missing team_run_id')
  })
})
