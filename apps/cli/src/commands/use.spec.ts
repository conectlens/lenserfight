jest.mock('citty', () => ({ defineCommand: (opts: unknown) => opts }))
jest.mock('consola', () => ({
  __esModule: true,
  default: {
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
    success: jest.fn(),
    log: jest.fn(),
    start: jest.fn(),
  },
}))
jest.mock('../config/project-config', () => ({
  configExists: jest.fn(),
  findConfigPath: jest.fn(() => '/project/.lenserfight/lenserfight.json'),
  loadConfig: jest.fn(),
  saveConfig: jest.fn(),
  getEffectiveMode: jest.fn(),
}))
jest.mock('../utils/ansi', () => ({
  c: {
    localhost: (s: string) => s,
    cloud: (s: string) => s,
    bold: (s: string) => s,
    accent: (s: string) => s,
    muted: (s: string) => s,
    warn: (s: string) => s,
    success: (s: string) => s,
  },
  sym: { info: '●' },
  A: { gray: '', reset: '' },
}))

import consola from 'consola'
import {
  configExists,
  findConfigPath,
  getEffectiveMode,
  loadConfig,
  saveConfig,
} from '../config/project-config'

const mockConfigExists = configExists as jest.MockedFunction<typeof configExists>
const mockGetEffectiveMode = getEffectiveMode as jest.MockedFunction<typeof getEffectiveMode>
const mockFindConfigPath = findConfigPath as jest.MockedFunction<typeof findConfigPath>
const mockLoadConfig = loadConfig as jest.MockedFunction<typeof loadConfig>
const mockSaveConfig = saveConfig as jest.MockedFunction<typeof saveConfig>
const mockConsolaSuccess = (consola as unknown as { success: jest.Mock }).success
const mockConsolaInfo = (consola as unknown as { info: jest.Mock }).info
const mockConsolaError = (consola as unknown as { error: jest.Mock }).error

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyCmd = { run?: (ctx: any) => Promise<void> }
let useCmd: AnyCmd

beforeAll(async () => {
  useCmd = (await import('./use')).default as AnyCmd
})

beforeEach(() => {
  jest.clearAllMocks()
  delete process.env['LF_LOCAL']
  delete process.env['LF_CLOUD']
  mockFindConfigPath.mockReturnValue('/project/.lenserfight/lenserfight.json')
  mockGetEffectiveMode.mockReturnValue({ mode: 'cloud', source: 'default' })
})

// ── Show current mode (no args) ────────────────────────────────────────────

describe('lf use (no args)', () => {
  it('shows default cloud mode when no project config exists', async () => {
    mockConfigExists.mockReturnValue(false)
    const logSpy = jest.spyOn(console, 'log').mockImplementation()

    await useCmd.run?.({ args: { mode: undefined, json: false } })

    const output = logSpy.mock.calls.map((c) => c.join(' ')).join('\n')
    expect(output).toContain('Cloud')
    logSpy.mockRestore()
  })

  it('shows local mode when project config is set to local', async () => {
    mockConfigExists.mockReturnValue(true)
    mockLoadConfig.mockReturnValue({ mode: 'local', dbPort: 54322, apiPort: 54321 })
    mockGetEffectiveMode.mockReturnValue({ mode: 'local', source: 'project' })
    const logSpy = jest.spyOn(console, 'log').mockImplementation()

    await useCmd.run?.({ args: { mode: undefined, json: false } })

    const output = logSpy.mock.calls.map((c) => c.join(' ')).join('\n')
    expect(output).toContain('Supabase local')
    logSpy.mockRestore()
  })

  it('emits JSON when --json passed', async () => {
    mockConfigExists.mockReturnValue(true)
    mockLoadConfig.mockReturnValue({ mode: 'cloud', dbPort: 54322, apiPort: 54321 })
    mockGetEffectiveMode.mockReturnValue({ mode: 'cloud', source: 'project' })
    const writeSpy = jest.spyOn(process.stdout, 'write').mockImplementation(() => true)

    await useCmd.run?.({ args: { mode: undefined, json: true } })

    const raw = writeSpy.mock.calls[0][0] as string
    const parsed = JSON.parse(raw)
    expect(parsed.mode).toBe('cloud')
    expect(parsed).toHaveProperty('source')
    writeSpy.mockRestore()
  })

  it('notes env override in JSON output when LF_CLOUD is set', async () => {
    process.env['LF_CLOUD'] = '1'
    mockConfigExists.mockReturnValue(false)
    mockGetEffectiveMode.mockReturnValue({ mode: 'cloud', source: 'env-cloud' })
    const writeSpy = jest.spyOn(process.stdout, 'write').mockImplementation(() => true)

    await useCmd.run?.({ args: { mode: undefined, json: true } })

    const parsed = JSON.parse(writeSpy.mock.calls[0][0] as string)
    expect(parsed.mode).toBe('cloud')
    expect(parsed.source).toContain('LF_CLOUD')
    writeSpy.mockRestore()
  })
})

// ── Switch mode ────────────────────────────────────────────────────────────

describe('lf use <mode>', () => {
  it('switches from cloud to local and saves config', async () => {
    mockConfigExists.mockReturnValue(true)
    mockLoadConfig.mockReturnValue({ mode: 'cloud', dbPort: 54322, apiPort: 54321 })

    await useCmd.run?.({ args: { mode: 'local', json: false } })

    expect(mockSaveConfig).toHaveBeenCalledWith({ mode: 'local' })
    expect(mockConsolaSuccess).toHaveBeenCalledWith(expect.stringContaining('Supabase local'))
  })

  it('switches from local to cloud and saves config', async () => {
    mockConfigExists.mockReturnValue(true)
    mockLoadConfig.mockReturnValue({ mode: 'local', dbPort: 54322, apiPort: 54321 })

    await useCmd.run?.({ args: { mode: 'cloud', json: false } })

    expect(mockSaveConfig).toHaveBeenCalledWith({ mode: 'cloud' })
    expect(mockConsolaSuccess).toHaveBeenCalledWith(expect.stringContaining('Cloud'))
  })

  it('creates config when no project config exists', async () => {
    mockConfigExists.mockReturnValue(false)

    await useCmd.run?.({ args: { mode: 'local', json: false } })

    expect(mockSaveConfig).toHaveBeenCalledWith({ mode: 'local' })
    expect(mockConsolaSuccess).toHaveBeenCalled()
  })

  it('prints info tip after switching to local', async () => {
    mockConfigExists.mockReturnValue(false)

    await useCmd.run?.({ args: { mode: 'local', json: false } })

    const calls = mockConsolaInfo.mock.calls.map((c) => c[0] as string)
    expect(calls.some((s) => s.includes('lf setup'))).toBe(true)
  })

  it('prints info tip after switching to cloud', async () => {
    mockConfigExists.mockReturnValue(false)

    await useCmd.run?.({ args: { mode: 'cloud', json: false } })

    const calls = mockConsolaInfo.mock.calls.map((c) => c[0] as string)
    expect(calls.some((s) => s.includes('lf auth login'))).toBe(true)
  })

  it('is a no-op when already in the requested mode', async () => {
    mockConfigExists.mockReturnValue(true)
    mockLoadConfig.mockReturnValue({ mode: 'cloud', dbPort: 54322, apiPort: 54321 })

    await useCmd.run?.({ args: { mode: 'cloud', json: false } })

    expect(mockSaveConfig).not.toHaveBeenCalled()
    expect(mockConsolaInfo).toHaveBeenCalledWith(expect.stringContaining('Already'))
  })

  it('rejects unknown mode values', async () => {
    await useCmd.run?.({ args: { mode: 'staging', json: false } })

    expect(mockConsolaError).toHaveBeenCalledWith(expect.stringContaining('"staging"'))
    expect(process.exitCode).toBe(1)
    process.exitCode = 0
  })
})
