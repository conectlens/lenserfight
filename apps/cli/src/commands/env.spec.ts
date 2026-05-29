jest.mock('citty', () => ({ defineCommand: (opts: unknown) => opts }))
jest.mock('consola', () => ({
  __esModule: true,
  default: {
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
    success: jest.fn(),
    log: jest.fn(),
  },
}))
jest.mock('../config/project-config', () => ({
  configExists: jest.fn().mockReturnValue(true),
  loadConfig: jest.fn().mockReturnValue({ mode: 'local' }),
  resolveConfig: jest.fn().mockReturnValue({
    mode: 'local',
    supabaseUrl: 'http://127.0.0.1:54321',
    cloudApiUrl: null,
  }),
  getEffectiveMode: jest.fn().mockReturnValue({ mode: 'local', source: 'project' }),
}))
jest.mock('../utils/output', () => ({
  printJson: jest.fn(),
  printTable: jest.fn(),
}))
jest.mock('../utils/ansi', () => ({
  c: { bold: (s: string) => s, success: (s: string) => s, muted: (s: string) => s, warn: (s: string) => s },
  sym: { pass: 'v', warn: '!', dot: '.' },
}))
jest.mock('@lenserfight/providers', () => ({
  byokKeyResolver: {
    has: jest.fn((provider: string) => provider === 'openai'),
  },
}))

import { printJson } from '../utils/output'

const mockPrintJson = printJson as jest.MockedFunction<typeof printJson>

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyCmd = { run?: (ctx: any) => Promise<void> }

let envCmd: AnyCmd

beforeAll(async () => {
  envCmd = (await import('./env')).default as AnyCmd
})

beforeEach(() => {
  jest.clearAllMocks()
})

describe('env', () => {
  it('outputs JSON with variable statuses', async () => {
    await envCmd.run?.({ args: { json: true, reveal: false }, cmd: {}, rawArgs: [] })

    expect(mockPrintJson).toHaveBeenCalledWith(
      expect.objectContaining({
        variables: expect.arrayContaining([
          expect.objectContaining({ name: 'SUPABASE_URL' }),
        ]),
        config: expect.objectContaining({ present: true }),
        byok: expect.objectContaining({ openai: true }),
      })
    )
  })

  it('prints human-readable table', async () => {
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation()

    await envCmd.run?.({ args: { json: false, reveal: false }, cmd: {}, rawArgs: [] })

    expect(consoleSpy).toHaveBeenCalled()
    consoleSpy.mockRestore()
  })
})
