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
  loadConfig: jest.fn().mockReturnValue({ mode: 'cloud' }),
  resolveConfig: jest.fn().mockReturnValue({
    mode: 'cloud',
    supabaseUrl: 'https://cloud-project.supabase.co',
    cloudApiUrl: 'https://api.lenserfight.com',
    supabaseAnonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSJ9.sig',
    supabaseServiceRoleKey: undefined,
    ollamaBaseUrl: undefined,
  }),
  getEffectiveMode: jest.fn().mockReturnValue({ mode: 'cloud', source: 'default' }),
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

import { printJson, printTable } from '../utils/output'

const mockPrintJson = printJson as jest.MockedFunction<typeof printJson>
const mockPrintTable = printTable as jest.MockedFunction<typeof printTable>

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyCmd = { run?: (ctx: any) => Promise<void> }

let envCmd: AnyCmd

beforeAll(async () => {
  envCmd = (await import('./env')).default as AnyCmd
})

beforeEach(() => {
  jest.clearAllMocks()
  for (const key of Object.keys(process.env)) {
    if (key.startsWith('SUPABASE_') || key.startsWith('LENSERFIGHT_') || key.startsWith('OPENAI_')) {
      delete process.env[key]
    }
  }
})

describe('env', () => {
  it('outputs JSON with variable statuses', async () => {
    await envCmd.run?.({ args: { json: true, reveal: false }, cmd: {}, rawArgs: [] })

    expect(mockPrintJson).toHaveBeenCalledWith(
      expect.objectContaining({
        variables: expect.arrayContaining([
          expect.objectContaining({ name: 'SUPABASE_URL', status: 'set', source: 'config' }),
          expect.objectContaining({
            name: 'SUPABASE_ANON_KEY',
            status: 'set',
            source: 'config',
            value: '••••••',
          }),
        ]),
        config: expect.objectContaining({ present: true }),
        byok: expect.objectContaining({ openai: true }),
      }),
    )
  })

  it('masks secrets in the table output and shows config-sourced values', async () => {
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation()

    await envCmd.run?.({ args: { json: false, reveal: false }, cmd: {}, rawArgs: [] })

    expect(mockPrintTable).toHaveBeenCalled()
    const rows = mockPrintTable.mock.calls[0]?.[1] as string[][]
    const anonRow = rows.find((row) => row[0] === 'SUPABASE_ANON_KEY')
    expect(anonRow?.[3]).toBe('••••••')
    expect(anonRow?.[2]).toBe('config')
    consoleSpy.mockRestore()
  })

  it('prefers process.env over resolved config', async () => {
    process.env['SUPABASE_URL'] = 'https://from-env.supabase.co'

    await envCmd.run?.({ args: { json: true, reveal: false }, cmd: {}, rawArgs: [] })

    const payload = mockPrintJson.mock.calls[0]?.[0] as {
      variables: Array<{ name: string; source: string; value: string }>
    }
    const urlEntry = payload.variables.find((v) => v.name === 'SUPABASE_URL')
    expect(urlEntry?.source).toBe('env')
    expect(urlEntry?.value).toBe('https://from-env.supabase.co')
  })
})
