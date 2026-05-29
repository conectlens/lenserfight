jest.mock('citty', () => ({ defineCommand: (opts: unknown) => opts }))
jest.mock('consola', () => ({
  __esModule: true,
  default: {
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
    start: jest.fn(),
    success: jest.fn(),
    log: jest.fn(),
  },
}))
jest.mock('../config/project-config', () => ({
  configExists: jest.fn(),
  projectConfigExists: jest.fn(),
  loadConfig: jest.fn(),
  saveConfig: jest.fn(),
  saveUserPreferences: jest.fn(),
  userPreferencesExist: jest.fn(),
  ensureUserConfigDir: jest.fn(),
  loadEnvConfig: jest.fn(),
  getDeviceConfigPath: jest.fn().mockReturnValue('/home/user/.config/lenserfight/config.json'),
  getUserPreferencesPath: jest.fn().mockReturnValue('/home/user/.config/lenserfight/lenserfight.json'),
}))

import consola from 'consola'
import {
  configExists,
  loadConfig,
  saveConfig,
  saveUserPreferences,
  userPreferencesExist,
  ensureUserConfigDir,
  loadEnvConfig,
  getUserPreferencesPath,
} from '../config/project-config'

const mockConfigExists = configExists as jest.MockedFunction<typeof configExists>
const mockUserPreferencesExist = userPreferencesExist as jest.MockedFunction<typeof userPreferencesExist>
const mockLoadConfig = loadConfig as jest.MockedFunction<typeof loadConfig>
const mockSaveConfig = saveConfig as jest.MockedFunction<typeof saveConfig>
const mockSaveUserPreferences = saveUserPreferences as jest.MockedFunction<typeof saveUserPreferences>
const mockEnsureUserConfigDir = ensureUserConfigDir as jest.MockedFunction<typeof ensureUserConfigDir>
const mockLoadEnvConfig = loadEnvConfig as jest.MockedFunction<typeof loadEnvConfig>
const consolaWarn = (consola as unknown as { warn: jest.Mock }).warn
const consolaSuccess = (consola as unknown as { success: jest.Mock }).success
const consolaInfo = (consola as unknown as { info: jest.Mock }).info

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyCmd = { run?: (ctx: any) => Promise<void> }

let initCmd: AnyCmd

beforeAll(async () => {
  initCmd = (await import('./init')).default as AnyCmd
})

beforeEach(() => {
  jest.clearAllMocks()
  process.exitCode = 0
  mockConfigExists.mockReturnValue(false)
  mockUserPreferencesExist.mockReturnValue(false)
  mockEnsureUserConfigDir.mockReturnValue(true)
  mockLoadEnvConfig.mockReturnValue({} as ReturnType<typeof loadEnvConfig>)
})

describe('init', () => {
  it('creates user config with cloud by default', async () => {
    await initCmd.run?.({ args: { mode: 'cloud', source: 'auto', project: false }, cmd: {}, rawArgs: [] })

    expect(mockSaveUserPreferences).toHaveBeenCalledWith(
      expect.objectContaining({ mode: 'cloud' }),
    )
    expect(mockSaveConfig).not.toHaveBeenCalled()
  })

  it('creates user config with local when --mode local', async () => {
    await initCmd.run?.({ args: { mode: 'local', source: 'auto', project: false }, cmd: {}, rawArgs: [] })

    expect(mockSaveUserPreferences).toHaveBeenCalledWith(
      expect.objectContaining({
        mode: 'local',
        supabaseUrl: 'http://127.0.0.1:54321',
        dbPort: 54322,
        apiPort: 54321,
      }),
    )
    expect(consolaSuccess).toHaveBeenCalledWith(
      expect.stringContaining('Created user config'),
      getUserPreferencesPath(),
      expect.anything(),
    )
  })

  it('writes project config when --project is set', async () => {
    await initCmd.run?.({ args: { mode: 'cloud', source: 'auto', project: true }, cmd: {}, rawArgs: [] })

    expect(mockSaveConfig).toHaveBeenCalledWith(expect.objectContaining({ mode: 'cloud' }))
    expect(mockSaveUserPreferences).not.toHaveBeenCalled()
  })

  it('uses custom URL when --url is provided', async () => {
    await initCmd.run?.({
      args: { mode: 'cloud', url: 'https://my.supabase.co', source: 'auto', project: false },
      cmd: {},
      rawArgs: [],
    })

    expect(mockSaveUserPreferences).toHaveBeenCalledWith(
      expect.objectContaining({ supabaseUrl: 'https://my.supabase.co' }),
    )
  })

  it('warns when user config already exists', async () => {
    mockUserPreferencesExist.mockReturnValue(true)
    mockLoadConfig.mockReturnValue({ mode: 'local' } as ReturnType<typeof loadConfig>)

    await initCmd.run?.({ args: { mode: 'local', source: 'auto', project: false }, cmd: {}, rawArgs: [] })

    expect(consolaWarn).toHaveBeenCalledWith(expect.stringContaining('already exists'), 'local')
  })

  it('shows success when user config dir is created', async () => {
    mockEnsureUserConfigDir.mockReturnValue(true)

    await initCmd.run?.({ args: { mode: 'local', source: 'auto', project: false }, cmd: {}, rawArgs: [] })

    expect(consolaSuccess).toHaveBeenCalledWith(
      expect.stringContaining('tokens stored here'),
      expect.stringContaining('config.json'),
    )
  })

  it('warns about missing anon key in cloud mode', async () => {
    mockLoadEnvConfig.mockReturnValue({ supabaseAnonKey: undefined } as ReturnType<typeof loadEnvConfig>)

    await initCmd.run?.({ args: { mode: 'cloud', source: 'auto', project: false }, cmd: {}, rawArgs: [] })

    expect(consolaWarn).toHaveBeenCalledWith(expect.stringContaining('SUPABASE_ANON_KEY'))
  })

  it('defaults to cloud mode in metadata', () => {
    const rawInitCmd = require('./init').default
    expect(rawInitCmd.args.mode.default).toBe('cloud')
  })
})
