jest.mock('citty', () => ({ defineCommand: (opts: unknown) => opts }))
jest.mock('consola', () => ({
  __esModule: true,
  default: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    success: jest.fn(),
    log: jest.fn(),
  },
}))
jest.mock('node:child_process', () => ({
  spawnSync: jest.fn().mockReturnValue({ error: null }),
}))

import consola from 'consola'
import { spawnSync } from 'node:child_process'

const consolaInfo = (consola as unknown as { info: jest.Mock }).info
const mockSpawnSync = spawnSync as jest.MockedFunction<typeof spawnSync>

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyCmd = { subCommands?: Record<string, AnyCmd>; run?: (ctx: any) => Promise<void> }

let docsCmd: AnyCmd

beforeAll(async () => {
  docsCmd = (await import('./docs')).default as AnyCmd
})

beforeEach(() => {
  jest.clearAllMocks()
  process.exitCode = 0
})

describe('docs open', () => {
  let openCmd: AnyCmd

  beforeAll(() => {
    openCmd = docsCmd.subCommands?.open as AnyCmd
  })

  it('opens the CLI index when no topic is given', async () => {
    await openCmd?.run?.({ args: {}, cmd: {}, rawArgs: [] })

    expect(consolaInfo).toHaveBeenCalledWith('Opening docs: %s', expect.stringContaining('/reference/cli/index'))
    expect(mockSpawnSync).toHaveBeenCalled()
  })

  it('maps a known topic shortcut to the correct URL', async () => {
    await openCmd?.run?.({ args: { topic: 'workflow' }, cmd: {}, rawArgs: [] })

    expect(consolaInfo).toHaveBeenCalledWith('Opening docs: %s', expect.stringContaining('/reference/cli/workflow'))
    expect(mockSpawnSync).toHaveBeenCalled()
  })

  it('uses an absolute path as-is when topic starts with /', async () => {
    await openCmd?.run?.({ args: { topic: '/reference/internals/dag-runner' }, cmd: {}, rawArgs: [] })

    expect(consolaInfo).toHaveBeenCalledWith(
      'Opening docs: %s',
      expect.stringContaining('/reference/internals/dag-runner'),
    )
  })

  it('prefixes unknown relative topic with /', async () => {
    await openCmd?.run?.({ args: { topic: 'custom-topic' }, cmd: {}, rawArgs: [] })

    expect(consolaInfo).toHaveBeenCalledWith('Opening docs: %s', expect.stringContaining('/custom-topic'))
  })

  it('falls back to printing the URL if spawnSync returns an error', async () => {
    mockSpawnSync.mockReturnValueOnce({ error: new Error('xdg-open not found') } as ReturnType<typeof spawnSync>)

    await openCmd?.run?.({ args: { topic: 'doctor' }, cmd: {}, rawArgs: [] })

    // Should still log the "Open manually" fallback info
    expect(consolaInfo).toHaveBeenCalledWith('Open manually: %s', expect.stringContaining('docs.lenserfight.com'))
  })

  it('resolves all known topic shortcuts to valid doc URLs', async () => {
    // Spot-check a few shortcuts to ensure no unresolved undefined paths
    const shortcuts = ['getting-started', 'byok', 'ollama', 'troubleshoot', 'completion', 'auth']
    for (const topic of shortcuts) {
      jest.clearAllMocks()
      await openCmd?.run?.({ args: { topic }, cmd: {}, rawArgs: [] })
      const call = consolaInfo.mock.calls.find((c) => c[0] === 'Opening docs: %s')
      expect(call).toBeDefined()
      expect(typeof call![1]).toBe('string')
      expect((call![1] as string).startsWith('https://')).toBe(true)
    }
  })
})

describe('docs list', () => {
  let listCmd: AnyCmd
  let consoleSpy: jest.SpyInstance

  beforeAll(() => {
    listCmd = docsCmd.subCommands?.list as AnyCmd
  })

  beforeEach(() => {
    consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => undefined)
  })

  afterEach(() => {
    consoleSpy.mockRestore()
  })

  it('prints topic shortcuts', async () => {
    await listCmd?.run?.({ args: {}, cmd: {}, rawArgs: [] })

    const output = consoleSpy.mock.calls.map((c) => String(c[0])).join('\n')
    expect(output).toContain('workflow')
    expect(output).toContain('getting-started')
    expect(output).toContain('troubleshoot')
    expect(output).toContain('docs.lenserfight.com')
  })

  it('includes usage hint in output', async () => {
    await listCmd?.run?.({ args: {}, cmd: {}, rawArgs: [] })

    const output = consoleSpy.mock.calls.map((c) => String(c[0])).join('\n')
    expect(output).toContain('lf docs open')
  })
})
