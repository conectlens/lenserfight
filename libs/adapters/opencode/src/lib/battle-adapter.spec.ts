import { beforeEach, describe, expect, it, vi } from 'vitest'

const callRpc = vi.fn()

vi.mock('@lenserfight/cli-client', () => ({ callRpc: (...args: unknown[]) => callRpc(...args) }))

import { createBattleCreateAdapter } from './battle-adapter'

beforeEach(() => {
  callRpc.mockReset()
})

describe('createBattleCreateAdapter', () => {
  it('exposes the expected id and metadata', () => {
    const adapter = createBattleCreateAdapter()
    expect(adapter.id()).toBe('lf_battle_create')
    expect(adapter.metadata().mirrorsMcpTool).toBe('create_battle')
  })

  it('creates a battle without a config update when no config fields are given', async () => {
    callRpc.mockResolvedValueOnce('battle-id-1')

    const { execute } = createBattleCreateAdapter().toToolDefinition()
    const result = await execute({ title: 'Test Battle', task_prompt: 'Summarize this.' }, {} as never)

    expect(callRpc).toHaveBeenCalledTimes(1)
    expect(callRpc).toHaveBeenCalledWith(
      'fn_battles_create',
      expect.objectContaining({ p_title: 'Test Battle', p_task_prompt: 'Summarize this.', p_rubric_id: null }),
      { requireAuth: true },
    )
    expect(result).toEqual({
      title: 'Created battle: Test Battle',
      output: 'Battle "Test Battle" created with id battle-id-1.',
      metadata: { id: 'battle-id-1', title: 'Test Battle' },
    })
  })

  it('follows up with a config update RPC when config fields are given', async () => {
    callRpc.mockResolvedValueOnce('battle-id-2')
    callRpc.mockResolvedValueOnce(undefined)

    const { execute } = createBattleCreateAdapter().toToolDefinition()
    await execute(
      { title: 'Configured Battle', task_prompt: 'Do X.', judging_mode: 'rubric_score', max_contenders: 4 },
      {} as never,
    )

    expect(callRpc).toHaveBeenCalledTimes(2)
    expect(callRpc).toHaveBeenNthCalledWith(
      2,
      'fn_mcp_battle_update_config',
      expect.objectContaining({
        p_battle_id: 'battle-id-2',
        p_judging_mode: 'rubric_score',
        p_max_contenders: 4,
      }),
      { requireAuth: true },
    )
  })
})
