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
  configExists: jest.fn(),
  loadConfig: jest.fn(),
  resolveConfig: jest.fn(),
  getEffectiveMode: jest.fn().mockReturnValue({ mode: 'cloud', source: 'default' }),
  getOnboardingState: jest.fn(),
}))
jest.mock('../utils/auth', () => ({
  isAuthenticated: jest.fn(),
}))
jest.mock('../lib/onboarding/journey', () => ({
  fetchJourneyState: jest.fn(),
  JOURNEY_STEPS: [],
  nextRequiredStep: jest.fn(),
  countCompleted: jest.fn().mockReturnValue({ done: 0, total: 0 }),
}))
jest.mock('../lib/onboarding/detect', () => ({
  detectNode: jest.fn().mockReturnValue({ ok: true, detail: 'v22.0.0' }),
  detectSupabaseCli: jest.fn().mockReturnValue({ ok: true, detail: '1.0.0' }),
  detectDocker: jest.fn().mockReturnValue({ ok: true, detail: '24.0.0' }),
}))
jest.mock('../utils/output', () => ({
  printJson: jest.fn(),
  printWarn: jest.fn(),
  truncate: jest.fn((s: string) => s),
}))

import {
  configExists,
  resolveConfig,
  getEffectiveMode,
  getOnboardingState,
  loadConfig,
} from '../config/project-config'
import { isAuthenticated } from '../utils/auth'
import { fetchJourneyState } from '../lib/onboarding/journey'
import { printJson } from '../utils/output'

const mockGetEffectiveMode = getEffectiveMode as jest.MockedFunction<typeof getEffectiveMode>
const mockConfigExists = configExists as jest.MockedFunction<typeof configExists>
const mockResolveConfig = resolveConfig as jest.MockedFunction<typeof resolveConfig>
const mockGetOnboardingState = getOnboardingState as jest.MockedFunction<typeof getOnboardingState>
const mockLoadConfig = loadConfig as jest.MockedFunction<typeof loadConfig>
const mockIsAuthenticated = isAuthenticated as jest.MockedFunction<typeof isAuthenticated>
const mockFetchJourneyState = fetchJourneyState as jest.MockedFunction<typeof fetchJourneyState>
const mockPrintJson = printJson as jest.MockedFunction<typeof printJson>

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyCmd = { run?: (ctx: any) => Promise<void> }

let statusCmd: AnyCmd

beforeAll(async () => {
  statusCmd = (await import('./status')).default as AnyCmd
})

beforeEach(() => {
  jest.clearAllMocks()
  mockConfigExists.mockReturnValue(true)
  mockLoadConfig.mockReturnValue({ mode: 'local' } as ReturnType<typeof loadConfig>)
  mockResolveConfig.mockReturnValue({
    mode: 'local',
    supabaseUrl: 'http://127.0.0.1:54321',
    cloudApiUrl: null,
    supabaseAnonKey: '',
    supabaseServiceRoleKey: '',
  } as ReturnType<typeof resolveConfig>)
  mockGetOnboardingState.mockReturnValue(null)
  mockIsAuthenticated.mockReturnValue(false)
  mockFetchJourneyState.mockResolvedValue(null)
  mockGetEffectiveMode.mockReturnValue({ mode: 'local', source: 'project' })
})

describe('status', () => {
  it('outputs JSON when --json flag is set', async () => {
    await statusCmd.run?.({ args: { json: true, journey: false }, cmd: {}, rawArgs: [] })

    expect(mockPrintJson).toHaveBeenCalledWith(
      expect.objectContaining({
        projectConfigPresent: true,
        mode: 'local',
        modeSource: 'project',
        authStatus: 'not_authenticated',
      })
    )
  })

  it('includes journey data in JSON when authenticated', async () => {
    mockIsAuthenticated.mockReturnValue(true)
    const mockJourney = {
      lens_created: true,
      workflow_created: false,
      agent_created: false,
      team_created: false,
      battle_created: false,
      battle_joined: false,
      invite_sent: false,
      battle_result_shared: false,
      profile_published: false,
    }
    mockFetchJourneyState.mockResolvedValue(mockJourney)

    await statusCmd.run?.({ args: { json: true, journey: false }, cmd: {}, rawArgs: [] })

    expect(mockPrintJson).toHaveBeenCalledWith(
      expect.objectContaining({
        authStatus: 'authenticated',
      })
    )
  })

  it('runs without error in human-readable mode', async () => {
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation()

    await statusCmd.run?.({ args: { json: false, journey: false }, cmd: {}, rawArgs: [] })

    consoleSpy.mockRestore()
    // No throw = success
  })
})
