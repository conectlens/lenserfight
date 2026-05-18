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
  resolveConfig: jest.fn(),
  getOnboardingState: jest.fn(),
}))
jest.mock('../lib/onboarding/detect', () => ({
  detectNode: jest.fn(),
  detectDocker: jest.fn(),
  detectSupabaseCli: jest.fn(),
  detectOllama: jest.fn(),
  detectCloudApi: jest.fn(),
}))
jest.mock('../utils/auth', () => ({
  isAuthenticated: jest.fn(),
  getUserInfo: jest.fn(),
}))
jest.mock('../utils/api', () => ({
  callRpc: jest.fn(),
}))
jest.mock('../utils/output', () => ({
  formatCheck: jest.fn((_s: string, label: string, detail: string) => `${label}: ${detail}`),
  printJson: jest.fn(),
  printSuccess: jest.fn(),
  printWarn: jest.fn(),
  printError: jest.fn(),
}))
jest.mock('@lenserfight/providers', () => ({
  byokKeyResolver: { has: jest.fn() },
}))

import { configExists, loadConfig, resolveConfig, getOnboardingState } from '../config/project-config'
import { detectNode, detectDocker, detectSupabaseCli, detectOllama, detectCloudApi } from '../lib/onboarding/detect'
import { isAuthenticated, getUserInfo } from '../utils/auth'
import { callRpc } from '../utils/api'
import { printJson, printSuccess, printWarn, printError } from '../utils/output'
import { byokKeyResolver } from '@lenserfight/providers'

const mockResolveConfig = resolveConfig as jest.MockedFunction<typeof resolveConfig>
const mockConfigExists = configExists as jest.MockedFunction<typeof configExists>
const mockLoadConfig = loadConfig as jest.MockedFunction<typeof loadConfig>
const mockGetOnboardingState = getOnboardingState as jest.MockedFunction<typeof getOnboardingState>
const mockDetectNode = detectNode as jest.MockedFunction<typeof detectNode>
const mockDetectDocker = detectDocker as jest.MockedFunction<typeof detectDocker>
const mockDetectSupabaseCli = detectSupabaseCli as jest.MockedFunction<typeof detectSupabaseCli>
const mockDetectOllama = detectOllama as jest.MockedFunction<typeof detectOllama>
const mockDetectCloudApi = detectCloudApi as jest.MockedFunction<typeof detectCloudApi>
const mockIsAuthenticated = isAuthenticated as jest.MockedFunction<typeof isAuthenticated>
const mockGetUserInfo = getUserInfo as jest.MockedFunction<typeof getUserInfo>
const mockCallRpc = callRpc as jest.MockedFunction<typeof callRpc>
const mockPrintJson = printJson as jest.MockedFunction<typeof printJson>
const mockPrintSuccess = printSuccess as jest.MockedFunction<typeof printSuccess>
const mockPrintError = printError as jest.MockedFunction<typeof printError>
const mockPrintWarn = printWarn as jest.MockedFunction<typeof printWarn>
const mockByokHas = (byokKeyResolver as unknown as { has: jest.Mock }).has

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyCmd = { run?: (ctx: any) => Promise<void> }

let doctorCmd: AnyCmd

beforeAll(async () => {
  doctorCmd = (await import('./doctor')).default as AnyCmd
})

afterEach(() => {
  process.exitCode = 0
})

beforeEach(() => {
  jest.clearAllMocks()
  process.exitCode = 0
  mockResolveConfig.mockReturnValue({ mode: 'cloud', cloudApiUrl: 'https://api.example.com' } as ReturnType<typeof resolveConfig>)
  mockDetectNode.mockReturnValue({ ok: true, detail: 'v22.0.0' })
  mockConfigExists.mockReturnValue(false)
  mockGetOnboardingState.mockReturnValue(null)
  mockIsAuthenticated.mockReturnValue(false)
  mockDetectCloudApi.mockResolvedValue({ ok: true, detail: 'https://api.example.com responded 200' })
})

describe('doctor', () => {
  it('passes when all core checks succeed', async () => {
    mockConfigExists.mockReturnValue(true)
    mockLoadConfig.mockReturnValue({ mode: 'cloud' } as ReturnType<typeof loadConfig>)
    mockIsAuthenticated.mockReturnValue(true)
    mockGetUserInfo.mockResolvedValue({ email: 'user@example.com' })

    await doctorCmd.run?.({ args: { json: false }, cmd: {}, rawArgs: [] })

    expect(mockPrintSuccess).toHaveBeenCalledWith(expect.stringContaining('All requested checks passed'))
    expect(process.exitCode).toBe(0)
  })

  it('fails when node version check fails', async () => {
    mockDetectNode.mockReturnValue({ ok: false, detail: 'v16.0.0 (requires >= 20)' })

    await doctorCmd.run?.({ args: { json: false }, cmd: {}, rawArgs: [] })

    expect(mockPrintError).toHaveBeenCalledWith(expect.stringContaining('node'))
    expect(process.exitCode).toBe(1)
  })

  it('adds supabase_cli and docker checks in local mode', async () => {
    mockDetectSupabaseCli.mockReturnValue({ ok: true, detail: '1.100.0' })
    mockDetectDocker.mockReturnValue({ ok: true, detail: 'running' })

    await doctorCmd.run?.({ args: { mode: 'local', json: false }, cmd: {}, rawArgs: [] })

    expect(mockDetectSupabaseCli).toHaveBeenCalled()
    expect(mockDetectDocker).toHaveBeenCalled()
  })

  it('checks BYOK providers with --check byok', async () => {
    mockByokHas.mockReturnValue(true)

    await doctorCmd.run?.({ args: { check: 'byok', json: false }, cmd: {}, rawArgs: [] })

    expect(mockByokHas).toHaveBeenCalledWith('openai')
    expect(mockByokHas).toHaveBeenCalledWith('anthropic')
    expect(mockByokHas).toHaveBeenCalledWith('google')
    expect(mockByokHas).toHaveBeenCalledWith('mistral')
  })

  it('checks ollama with --check ollama', async () => {
    mockDetectOllama.mockResolvedValue({ ok: true, detail: 'http://localhost:11434/api/tags' })

    await doctorCmd.run?.({ args: { check: 'ollama', json: false }, cmd: {}, rawArgs: [] })

    expect(mockDetectOllama).toHaveBeenCalled()
    expect(mockPrintSuccess).toHaveBeenCalled()
  })

  it('checks journey when authenticated with --check journey', async () => {
    mockIsAuthenticated.mockReturnValue(true)
    mockCallRpc.mockResolvedValue({})

    await doctorCmd.run?.({ args: { check: 'journey', json: false }, cmd: {}, rawArgs: [] })

    expect(mockCallRpc).toHaveBeenCalledWith('fn_journey_state_get', {}, { requireAuth: true })
    expect(mockPrintSuccess).toHaveBeenCalled()
  })

  it('warns for journey when not authenticated', async () => {
    mockIsAuthenticated.mockReturnValue(false)

    await doctorCmd.run?.({ args: { check: 'journey', json: false }, cmd: {}, rawArgs: [] })

    expect(mockPrintWarn).toHaveBeenCalledWith(expect.stringContaining('journey_state'))
  })

  it('warns for auth when not authenticated', async () => {
    mockIsAuthenticated.mockReturnValue(false)

    await doctorCmd.run?.({ args: { check: 'auth', json: false }, cmd: {}, rawArgs: [] })

    expect(mockPrintWarn).toHaveBeenCalledWith(expect.stringContaining('auth'))
  })

  it('fails for auth when getUserInfo throws', async () => {
    mockIsAuthenticated.mockReturnValue(true)
    mockGetUserInfo.mockRejectedValue(new Error('token expired'))

    await doctorCmd.run?.({ args: { check: 'auth', json: false }, cmd: {}, rawArgs: [] })

    expect(mockPrintError).toHaveBeenCalledWith(expect.stringContaining('auth'))
  })

  it('emits structured JSON with --json including error codes', async () => {
    mockDetectNode.mockReturnValue({ ok: false, detail: 'v16.0.0' })

    await doctorCmd.run?.({ args: { json: true }, cmd: {}, rawArgs: [] })

    expect(mockPrintJson).toHaveBeenCalledTimes(1)
    const payload = mockPrintJson.mock.calls[0][0] as Record<string, unknown>
    expect(payload.status).toBe('failed')
    expect(payload.checks).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: 'node', status: 'fail', code: 'NODE_VERSION_UNSUPPORTED' }),
      ])
    )
    expect(process.exitCode).toBe(1)
  })

  it('warns when no project config exists', async () => {
    mockConfigExists.mockReturnValue(false)

    await doctorCmd.run?.({ args: { json: false }, cmd: {}, rawArgs: [] })

    expect(mockPrintWarn).toHaveBeenCalledWith(expect.stringContaining('project_config'))
  })
})
