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
  loadConfig: jest.fn(),
  saveConfig: jest.fn(),
  ensureUserConfigDir: jest.fn(),
  loadEnvConfig: jest.fn(),
}))

import consola from 'consola'
import {
  configExists,
  loadConfig,
  saveConfig,
  ensureUserConfigDir,
  loadEnvConfig,
} from '../config/project-config'

const mockConfigExists = configExists as jest.MockedFunction<typeof configExists>
const mockLoadConfig = loadConfig as jest.MockedFunction<typeof loadConfig>
const mockSaveConfig = saveConfig as jest.MockedFunction<typeof saveConfig>
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
  mockEnsureUserConfigDir.mockReturnValue(true)
  mockLoadEnvConfig.mockReturnValue({} as ReturnType<typeof loadEnvConfig>)
})

describe('init', () => {
  it('creates config with local defaults on fresh init', async () => {
    await initCmd.run?.({ args: { mode: 'local', source: 'auto' }, cmd: {}, rawArgs: [] })

    expect(mockSaveConfig).toHaveBeenCalledWith(
      expect.objectContaining({
        mode: 'local',
        supabaseUrl: 'http://127.0.0.1:54321',
        dbPort: 54322,
        apiPort: 54321,
      })
    )
    expect(consolaSuccess).toHaveBeenCalledWith(
      expect.stringContaining('.lenserfight.json'),
      expect.anything(),
    )
  })

  it('saves cloud mode when --mode cloud', async () => {
    await initCmd.run?.({ args: { mode: 'cloud', source: 'auto' }, cmd: {}, rawArgs: [] })

    expect(mockSaveConfig).toHaveBeenCalledWith(
      expect.objectContaining({ mode: 'cloud' })
    )
  })

  it('uses custom URL when --url is provided', async () => {
    await initCmd.run?.({ args: { mode: 'cloud', url: 'https://my.supabase.co', source: 'auto' }, cmd: {}, rawArgs: [] })

    expect(mockSaveConfig).toHaveBeenCalledWith(
      expect.objectContaining({ supabaseUrl: 'https://my.supabase.co' })
    )
  })

  it('warns when config already exists', async () => {
    mockConfigExists.mockReturnValue(true)
    mockLoadConfig.mockReturnValue({ mode: 'local' } as ReturnType<typeof loadConfig>)

    await initCmd.run?.({ args: { mode: 'local', source: 'auto' }, cmd: {}, rawArgs: [] })

    expect(consolaWarn).toHaveBeenCalledWith(expect.stringContaining('already exists'), 'local')
  })

  it('shows success when user config dir is created', async () => {
    mockEnsureUserConfigDir.mockReturnValue(true)

    await initCmd.run?.({ args: { mode: 'local', source: 'auto' }, cmd: {}, rawArgs: [] })

    expect(consolaSuccess).toHaveBeenCalledWith(expect.stringContaining('~/.lenserfight/config.json'))
  })

  it('shows info when user config dir already exists', async () => {
    mockEnsureUserConfigDir.mockReturnValue(false)

    await initCmd.run?.({ args: { mode: 'local', source: 'auto' }, cmd: {}, rawArgs: [] })

    expect(consolaInfo).toHaveBeenCalledWith(expect.stringContaining('~/.lenserfight/config.json already exists'))
  })

  it('warns about missing anon key in cloud mode', async () => {
    mockLoadEnvConfig.mockReturnValue({ supabaseAnonKey: undefined } as ReturnType<typeof loadEnvConfig>)

    await initCmd.run?.({ args: { mode: 'cloud', source: 'auto' }, cmd: {}, rawArgs: [] })

    expect(consolaWarn).toHaveBeenCalledWith(expect.stringContaining('SUPABASE_ANON_KEY'))
  })
})
