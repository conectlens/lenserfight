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
  projectConfigExists: jest.fn(),
  findConfigPath: jest.fn(() => '/project/.lenserfight/lenserfight.json'),
  getUserPreferencesPath: jest.fn(() => '/home/user/.config/lenserfight/lenserfight.json'),
  readProjectConfigAt: jest.fn(),
  saveConfig: jest.fn(),
  saveUserPreferences: jest.fn(),
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
  projectConfigExists,
  findConfigPath,
  getEffectiveMode,
  saveConfig,
  saveUserPreferences,
} from '../config/project-config'

const mockProjectConfigExists = projectConfigExists as jest.MockedFunction<typeof projectConfigExists>
const mockGetEffectiveMode = getEffectiveMode as jest.MockedFunction<typeof getEffectiveMode>
const mockFindConfigPath = findConfigPath as jest.MockedFunction<typeof findConfigPath>
const mockSaveConfig = saveConfig as jest.MockedFunction<typeof saveConfig>
const mockSaveUserPreferences = saveUserPreferences as jest.MockedFunction<typeof saveUserPreferences>
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
    mockProjectConfigExists.mockReturnValue(false)
    const logSpy = jest.spyOn(console, 'log').mockImplementation()

    await useCmd.run?.({ args: { mode: undefined, json: false } })

    const output = logSpy.mock.calls.map((c) => c.join(' ')).join('\n')
    expect(output).toContain('Cloud')
    logSpy.mockRestore()
  })

  it('shows local mode when user config is local', async () => {
    mockProjectConfigExists.mockReturnValue(false)
    mockGetEffectiveMode.mockReturnValue({ mode: 'local', source: 'user' })
    const logSpy = jest.spyOn(console, 'log').mockImplementation()

    await useCmd.run?.({ args: { mode: undefined, json: false } })

    const output = logSpy.mock.calls.map((c) => c.join(' ')).join('\n')
    expect(output).toContain('Supabase local')
    logSpy.mockRestore()
  })

  it('emits JSON when --json passed', async () => {
    mockProjectConfigExists.mockReturnValue(true)
    mockGetEffectiveMode.mockReturnValue({ mode: 'cloud', source: 'user' })
    const writeSpy = jest.spyOn(process.stdout, 'write').mockImplementation(() => true)

    await useCmd.run?.({ args: { mode: undefined, json: true } })

    const raw = writeSpy.mock.calls[0][0] as string
    const parsed = JSON.parse(raw)
    expect(parsed.mode).toBe('cloud')
    expect(parsed).toHaveProperty('source')
    expect(parsed.configPath).toContain('lenserfight.json')
    writeSpy.mockRestore()
  })

  it('notes env override in JSON output when LF_CLOUD is set', async () => {
    process.env['LF_CLOUD'] = '1'
    mockProjectConfigExists.mockReturnValue(false)
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
  it('switches from cloud to local via user config only', async () => {
    mockProjectConfigExists.mockReturnValue(true)
    mockGetEffectiveMode.mockReturnValue({ mode: 'cloud', source: 'user' })

    await useCmd.run?.({ args: { mode: 'local', json: false, project: false } })

    expect(mockSaveUserPreferences).toHaveBeenCalledWith({ mode: 'local' })
    expect(mockSaveConfig).not.toHaveBeenCalled()
    expect(mockConsolaSuccess).toHaveBeenCalledWith(expect.stringContaining('Supabase local'))
  })

  it('switches from local to cloud via user config only', async () => {
    mockProjectConfigExists.mockReturnValue(true)
    mockGetEffectiveMode.mockReturnValue({ mode: 'local', source: 'user' })

    await useCmd.run?.({ args: { mode: 'cloud', json: false, project: false } })

    expect(mockSaveUserPreferences).toHaveBeenCalledWith({ mode: 'cloud' })
    expect(mockSaveConfig).not.toHaveBeenCalled()
    expect(mockConsolaSuccess).toHaveBeenCalledWith(expect.stringContaining('Cloud'))
  })

  it('also updates project file when --project is set', async () => {
    mockProjectConfigExists.mockReturnValue(true)
    mockGetEffectiveMode.mockReturnValue({ mode: 'cloud', source: 'user' })

    await useCmd.run?.({ args: { mode: 'local', json: false, project: true } })

    expect(mockSaveUserPreferences).toHaveBeenCalledWith({ mode: 'local' })
    expect(mockSaveConfig).toHaveBeenCalledWith({ mode: 'local' })
  })

  it('prints info tip after switching to local', async () => {
    mockProjectConfigExists.mockReturnValue(false)
    mockGetEffectiveMode.mockReturnValue({ mode: 'cloud', source: 'user' })

    await useCmd.run?.({ args: { mode: 'local', json: false, project: false } })

    const calls = mockConsolaInfo.mock.calls.map((c) => c[0] as string)
    expect(calls.some((s) => s.includes('lf setup'))).toBe(true)
  })

  it('prints info tip after switching to cloud', async () => {
    mockProjectConfigExists.mockReturnValue(false)
    mockGetEffectiveMode.mockReturnValue({ mode: 'local', source: 'user' })

    await useCmd.run?.({ args: { mode: 'cloud', json: false, project: false } })

    const calls = mockConsolaInfo.mock.calls.map((c) => c[0] as string)
    expect(calls.some((s) => s.includes('lf auth login'))).toBe(true)
  })

  it('is a no-op when already in the requested mode', async () => {
    mockGetEffectiveMode.mockReturnValue({ mode: 'cloud', source: 'user' })

    await useCmd.run?.({ args: { mode: 'cloud', json: false, project: false } })

    expect(mockSaveConfig).not.toHaveBeenCalled()
    expect(mockConsolaInfo).toHaveBeenCalledWith(expect.stringContaining('Already'))
  })

  it('rejects unknown mode values', async () => {
    await useCmd.run?.({ args: { mode: 'staging', json: false, project: false } })

    expect(mockConsolaError).toHaveBeenCalledWith(expect.stringContaining('"staging"'))
    expect(process.exitCode).toBe(1)
    process.exitCode = 0
  })
})
