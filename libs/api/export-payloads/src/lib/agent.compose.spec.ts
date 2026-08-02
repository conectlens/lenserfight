import { describe, expect, it, vi } from 'vitest'

import { composeAgentPayload } from './agent.compose'

import type { RpcCaller } from './rpc-caller'

describe('composeAgentPayload', () => {
  it('passes through fn_get_agent_profile as an AgentExportPayload', async () => {
    const profile = {
      id: 'agent-1',
      ai_lenser_id: 'agent-1',
      handle: 'research-bot',
      display_name: 'Research Bot',
      is_active: true,
      can_join_battles: true,
      model_binding_mode: 'single',
    }
    const rpc: RpcCaller = vi.fn().mockResolvedValue(profile)

    const payload = await composeAgentPayload(rpc, 'agent-1')

    expect(rpc).toHaveBeenCalledWith('fn_get_agent_profile', { p_ai_lenser_id: 'agent-1' })
    expect(payload).toEqual(profile)
  })

  it('throws when the agent does not exist', async () => {
    const rpc: RpcCaller = vi.fn().mockResolvedValue(null)
    await expect(composeAgentPayload(rpc, 'missing')).rejects.toThrow('Agent not found: missing')
  })
})
