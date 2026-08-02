import { describe, expect, it, vi } from 'vitest'

vi.mock('./lens-adapter', () => ({
  createLensRunAdapter: () => ({
    id: () => 'lf_lens_run',
    metadata: () => ({ description: 'lens', mirrorsMcpTool: 'run_lens' }),
    toToolDefinition: () => ({ description: 'lens', args: {}, execute: async () => 'lens-result' }),
  }),
}))

vi.mock('./battle-adapter', () => ({
  createBattleCreateAdapter: () => ({
    id: () => 'lf_battle_create',
    metadata: () => ({ description: 'battle', mirrorsMcpTool: 'create_battle' }),
    toToolDefinition: () => ({ description: 'battle', args: {}, execute: async () => 'battle-result' }),
  }),
}))

describe('LenserFightPlugin', () => {
  it('exposes every registered adapter as an OpenCode tool', async () => {
    const { LenserFightPlugin } = await import('./lf-plugin')
    const hooks = await LenserFightPlugin({} as never)
    expect(Object.keys(hooks.tool ?? {}).sort()).toEqual(['lf_battle_create', 'lf_lens_run'])
    await expect(hooks.tool?.['lf_lens_run']?.execute({}, {} as never)).resolves.toBe('lens-result')
  })
})
