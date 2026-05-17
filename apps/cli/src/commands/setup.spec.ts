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
    box: jest.fn(),
    prompt: jest.fn(),
  },
}))
jest.mock('../utils/auth', () => ({
  isAuthenticated: jest.fn(),
  openBrowser: jest.fn(),
}))
jest.mock('../utils/api', () => ({
  callRpc: jest.fn(),
}))
jest.mock('../utils/output', () => ({
  printInfo: jest.fn(),
  printJson: jest.fn(),
  printSuccess: jest.fn(),
  printWarn: jest.fn(),
  printError: jest.fn(),
}))
jest.mock('../utils/ansi', () => ({
  A: { gray: '', reset: '', bold: '', brightCyan: '', brightGreen: '', brightYellow: '', brightRed: '', brightBlue: '' },
  c: {
    brand: (s: string) => s,
    accent: (s: string) => s,
    success: (s: string) => s,
    muted: (s: string) => s,
    bold: (s: string) => s,
  },
  sym: { pass: '✓', fail: '✗', warn: '⚠', info: '●', arrow: '→' },
}))
jest.mock('../config/project-config', () => ({
  resolveConfig: jest.fn(),
  configExists: jest.fn(),
  loadUserConfig: jest.fn(),
}))
jest.mock('../lib/onboarding/state', () => ({
  loadOnboardingSnapshot: jest.fn(),
  markOnboardingStarted: jest.fn(),
  markOnboardingStep: jest.fn(),
  markOnboardingComplete: jest.fn(),
  markOnboardingFailed: jest.fn(),
}))

const mockPrerequisitesStep = { id: 'detect_prerequisites', label: 'Prerequisites', run: jest.fn(), shouldSkip: jest.fn() }
const mockVerifyWorkspaceStep = { id: 'verify_workspace', label: 'Verify workspace', run: jest.fn() }
const mockConfigureProjectStep = { id: 'configure_project', label: 'Configure project', run: jest.fn() }
const mockStartServicesStep = { id: 'start_services', label: 'Start services', run: jest.fn() }
const mockHandoffStep = { id: 'handoff', label: 'Handoff', run: jest.fn() }

jest.mock('../lib/onboarding/steps/prerequisites', () => ({
  detectPrerequisitesStep: mockPrerequisitesStep,
}))
jest.mock('../lib/onboarding/steps/verify-workspace', () => ({
  verifyWorkspaceStep: mockVerifyWorkspaceStep,
}))
jest.mock('../lib/onboarding/steps/configure-project', () => ({
  configureProjectStep: mockConfigureProjectStep,
}))
jest.mock('../lib/onboarding/steps/start-services', () => ({
  startServicesStep: mockStartServicesStep,
}))
jest.mock('../lib/onboarding/steps/handoff', () => ({
  handoffStep: mockHandoffStep,
}))

const mockJourneyState = {
  lens_created: false,
  workflow_created: false,
  agent_created: false,
  team_created: false,
  battle_created: false,
  battle_joined: false,
  invite_sent: false,
  battle_result_shared: false,
  profile_published: false,
}

jest.mock('../lib/onboarding/journey', () => ({
  JOURNEY_STEPS: [
    { id: 'lens_created', label: 'Create a Lens', required: true, command: 'lf lens create', webPath: '/lenses/new' },
    { id: 'battle_created', label: 'Create a Battle', required: true, command: 'lf battle create', webPath: '/arena' },
  ],
  fetchJourneyState: jest.fn(),
  countCompleted: jest.fn(),
  nextRequiredStep: jest.fn(),
}))
jest.mock('node:child_process', () => ({
  spawn: jest.fn(),
}))

import { isAuthenticated } from '../utils/auth'
import { printJson, printInfo, printSuccess, printWarn, printError } from '../utils/output'
import { configExists, loadUserConfig } from '../config/project-config'
import {
  loadOnboardingSnapshot,
  markOnboardingStarted,
  markOnboardingComplete,
  markOnboardingFailed,
  markOnboardingStep,
} from '../lib/onboarding/state'
import { fetchJourneyState, countCompleted, nextRequiredStep } from '../lib/onboarding/journey'
import { spawn } from 'node:child_process'
import consola from 'consola'

const mockIsAuthenticated = isAuthenticated as jest.MockedFunction<typeof isAuthenticated>
const mockPrintJson = printJson as jest.MockedFunction<typeof printJson>
const mockPrintInfo = printInfo as jest.MockedFunction<typeof printInfo>
const mockPrintSuccess = printSuccess as jest.MockedFunction<typeof printSuccess>
const mockPrintWarn = printWarn as jest.MockedFunction<typeof printWarn>
const mockPrintError = printError as jest.MockedFunction<typeof printError>
const mockConfigExists = configExists as jest.MockedFunction<typeof configExists>
const mockLoadOnboardingSnapshot = loadOnboardingSnapshot as jest.MockedFunction<typeof loadOnboardingSnapshot>
const mockMarkOnboardingComplete = markOnboardingComplete as jest.MockedFunction<typeof markOnboardingComplete>
const mockMarkOnboardingFailed = markOnboardingFailed as jest.MockedFunction<typeof markOnboardingFailed>
const mockMarkOnboardingStep = markOnboardingStep as jest.MockedFunction<typeof markOnboardingStep>
const mockFetchJourneyState = fetchJourneyState as jest.MockedFunction<typeof fetchJourneyState>
const mockCountCompleted = countCompleted as jest.MockedFunction<typeof countCompleted>
const mockNextRequiredStep = nextRequiredStep as jest.MockedFunction<typeof nextRequiredStep>
const mockSpawn = spawn as unknown as jest.Mock
const mockLoadUserConfig = loadUserConfig as jest.MockedFunction<typeof loadUserConfig>

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyCmd = { run?: (ctx: any) => Promise<void> }

let setupCmd: AnyCmd

beforeAll(async () => {
  setupCmd = (await import('./setup')).default as AnyCmd
})

afterEach(() => {
  process.exitCode = 0
})

beforeEach(() => {
  jest.clearAllMocks()
  process.exitCode = 0
  mockIsAuthenticated.mockReturnValue(false)
  mockConfigExists.mockReturnValue(false)
  mockLoadOnboardingSnapshot.mockReturnValue(null)
  mockPrerequisitesStep.shouldSkip.mockReturnValue(false)

  // Default step success
  for (const step of [mockPrerequisitesStep, mockVerifyWorkspaceStep, mockConfigureProjectStep, mockStartServicesStep, mockHandoffStep]) {
    step.run.mockResolvedValue({ id: step.id, status: 'completed', detail: 'ok' })
  }
})

describe('setup env mode', () => {
  it('completes all 5 steps successfully', async () => {
    await setupCmd.run?.({ args: { mode: 'local', json: false, 'skip-open': true }, cmd: {}, rawArgs: [] })

    expect(mockMarkOnboardingComplete).toHaveBeenCalledWith('local')
    expect(mockPrintSuccess).toHaveBeenCalledWith(expect.stringContaining('Environment setup complete'))
    expect(process.exitCode).toBe(0)
  })

  it('marks failed when a step throws', async () => {
    mockVerifyWorkspaceStep.run.mockRejectedValue(new Error('workspace broken'))

    await setupCmd.run?.({ args: { mode: 'local', json: false, 'skip-open': true }, cmd: {}, rawArgs: [] })

    expect(mockMarkOnboardingFailed).toHaveBeenCalledWith('workspace broken')
    expect(process.exitCode).toBe(1)
  })

  it('skips already-completed steps on --resume', async () => {
    mockLoadOnboardingSnapshot.mockReturnValue({
      status: 'partial',
      completedSteps: ['detect_prerequisites', 'verify_workspace'],
      skippedSteps: [],
      updatedAt: '2026-01-01T00:00:00Z',
    } as ReturnType<typeof loadOnboardingSnapshot>)

    await setupCmd.run?.({ args: { mode: 'local', resume: true, json: false, 'skip-open': true }, cmd: {}, rawArgs: [] })

    expect(mockPrerequisitesStep.run).not.toHaveBeenCalled()
    expect(mockVerifyWorkspaceStep.run).not.toHaveBeenCalled()
    expect(mockConfigureProjectStep.run).toHaveBeenCalled()
    expect(mockMarkOnboardingComplete).toHaveBeenCalled()
  })

  it('skips steps when shouldSkip returns true', async () => {
    mockPrerequisitesStep.shouldSkip.mockReturnValue(true)

    await setupCmd.run?.({ args: { mode: 'local', json: false, 'skip-open': true }, cmd: {}, rawArgs: [] })

    expect(mockPrerequisitesStep.run).not.toHaveBeenCalled()
    expect(mockMarkOnboardingStep).toHaveBeenCalledWith('detect_prerequisites', 'skipped')
  })

  it('emits JSON on success with --json', async () => {
    await setupCmd.run?.({ args: { mode: 'local', json: true, 'skip-open': true }, cmd: {}, rawArgs: [] })

    expect(mockPrintJson).toHaveBeenCalledWith(
      expect.objectContaining({ mode: 'local', status: 'complete' })
    )
  })

  it('emits JSON on error with --json', async () => {
    mockVerifyWorkspaceStep.run.mockRejectedValue(new Error('boom'))

    await setupCmd.run?.({ args: { mode: 'local', json: true, 'skip-open': true }, cmd: {}, rawArgs: [] })

    expect(mockPrintJson).toHaveBeenCalledWith(
      expect.objectContaining({ mode: 'local', status: 'partial', error: 'boom' })
    )
    expect(process.exitCode).toBe(1)
  })

  it('does not spawn when --skip-open', async () => {
    await setupCmd.run?.({ args: { mode: 'local', json: false, 'skip-open': true }, cmd: {}, rawArgs: [] })

    expect(mockSpawn).not.toHaveBeenCalled()
  })

  it('spawns web:serve in local mode without --skip-open', async () => {
    await setupCmd.run?.({ args: { mode: 'local', json: false, 'skip-open': false }, cmd: {}, rawArgs: [] })

    expect(mockSpawn).toHaveBeenCalledWith(
      'pnpm', ['nx', 'run', 'web:serve'],
      expect.objectContaining({ shell: true })
    )
  })
})

describe('setup journey mode', () => {
  it('renders journey checklist when authenticated', async () => {
    mockIsAuthenticated.mockReturnValue(true)
    mockConfigExists.mockReturnValue(true)
    mockFetchJourneyState.mockResolvedValue(mockJourneyState)
    mockCountCompleted.mockReturnValue({ done: 0, total: 2 })
    mockNextRequiredStep.mockReturnValue({ id: 'lens_created', label: 'Create a Lens', required: true, command: 'lf lens create', webPath: '/lenses/new' })
    mockLoadUserConfig.mockReturnValue({})

    await setupCmd.run?.({ args: { mode: '', json: false }, cmd: {}, rawArgs: [] })

    expect(mockFetchJourneyState).toHaveBeenCalled()
    expect(mockCountCompleted).toHaveBeenCalledWith(mockJourneyState)
  })

  it('shows error when not authenticated', async () => {
    mockIsAuthenticated.mockReturnValue(false)
    mockConfigExists.mockReturnValue(true)

    await setupCmd.run?.({ args: { mode: 'journey', json: false }, cmd: {}, rawArgs: [] })

    expect(mockPrintError).toHaveBeenCalledWith(expect.stringContaining('Not authenticated'))
  })

  it('warns when journey state is null', async () => {
    mockIsAuthenticated.mockReturnValue(true)
    mockConfigExists.mockReturnValue(true)
    mockFetchJourneyState.mockResolvedValue(null)

    await setupCmd.run?.({ args: { mode: 'journey', json: false }, cmd: {}, rawArgs: [] })

    expect(mockPrintWarn).toHaveBeenCalledWith(expect.stringContaining('unavailable'))
  })

  it('emits JSON for journey with --json', async () => {
    mockIsAuthenticated.mockReturnValue(true)
    mockConfigExists.mockReturnValue(true)
    mockFetchJourneyState.mockResolvedValue(mockJourneyState)
    mockCountCompleted.mockReturnValue({ done: 1, total: 2 })

    await setupCmd.run?.({ args: { mode: 'journey', json: true }, cmd: {}, rawArgs: [] })

    expect(mockPrintJson).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'ok', progress: { done: 1, total: 2 } })
    )
  })
})

describe('setup auto-detection', () => {
  it('falls back to --mode local when no config and not authenticated', async () => {
    mockConfigExists.mockReturnValue(false)
    mockIsAuthenticated.mockReturnValue(false)

    await setupCmd.run?.({ args: { mode: '', json: false, 'skip-open': true }, cmd: {}, rawArgs: [] })

    expect(mockPrintInfo).toHaveBeenCalledWith(expect.stringContaining('environment setup'))
    expect(mockMarkOnboardingComplete).toHaveBeenCalledWith('local')
  })

  it('errors on unknown mode', async () => {
    await setupCmd.run?.({ args: { mode: 'foobar', json: false }, cmd: {}, rawArgs: [] })

    expect(mockPrintError).toHaveBeenCalledWith(expect.stringContaining('Unknown mode'), 'foobar')
    expect(process.exitCode).toBe(1)
  })

  it('calls consola.prompt in interactive journey mode', async () => {
    mockIsAuthenticated.mockReturnValue(true)
    mockConfigExists.mockReturnValue(true)
    mockFetchJourneyState.mockResolvedValue(mockJourneyState)
    mockCountCompleted.mockReturnValue({ done: 0, total: 2 })
    mockNextRequiredStep.mockReturnValue(null)
    mockLoadUserConfig.mockReturnValue({});
    (consola as unknown as { prompt: jest.Mock }).prompt.mockResolvedValue('__skip__')

    await setupCmd.run?.({ args: { mode: '', json: false, interactive: true }, cmd: {}, rawArgs: [] })

    expect((consola as unknown as { prompt: jest.Mock }).prompt).toHaveBeenCalled()
  })
})
