import { afterEach, describe, expect, it, vi } from 'vitest'

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

const readFileSyncMock = vi.fn()
vi.mock('node:fs', () => ({ readFileSync: (...args: unknown[]) => readFileSyncMock(...args) }))

afterEach(() => {
  delete process.env['LF_OPENCODE_MANIFEST_PATH']
  vi.resetModules()
})

describe('LenserFightPlugin', () => {
  it('exposes every statically-registered adapter when no manifest env var is set', async () => {
    const { LenserFightPlugin } = await import('./lf-plugin')
    const hooks = await LenserFightPlugin({} as never)
    expect(Object.keys(hooks.tool ?? {}).sort()).toEqual(['lf_battle_create', 'lf_lens_run'])
    await expect(hooks.tool?.['lf_lens_run']?.execute({}, {} as never)).resolves.toBe('lens-result')
  })

  it('also registers cli-bridge tools from LF_OPENCODE_MANIFEST_PATH when set', async () => {
    process.env['LF_OPENCODE_MANIFEST_PATH'] = '/fake/manifest.json'
    readFileSyncMock.mockReturnValue(
      JSON.stringify({
        cliBinaryPath: '/bin/lf-main.js',
        tools: [{ id: 'lf_doctor', description: 'Health check', commandPath: ['doctor'], args: [] }],
      }),
    )

    const { LenserFightPlugin } = await import('./lf-plugin')
    const hooks = await LenserFightPlugin({} as never)
    expect(Object.keys(hooks.tool ?? {}).sort()).toEqual(['lf_battle_create', 'lf_doctor', 'lf_lens_run'])
  })

  it('falls back to the static adapters when the manifest is unreadable', async () => {
    process.env['LF_OPENCODE_MANIFEST_PATH'] = '/missing/manifest.json'
    readFileSyncMock.mockImplementation(() => {
      throw new Error('ENOENT')
    })

    const { LenserFightPlugin } = await import('./lf-plugin')
    const hooks = await LenserFightPlugin({} as never)
    expect(Object.keys(hooks.tool ?? {}).sort()).toEqual(['lf_battle_create', 'lf_lens_run'])
  })
})
