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
  },
}))
jest.mock('../utils/auth', () => ({
  isAuthenticated: jest.fn(),
}))
jest.mock('../utils/api', () => ({
  callRpc: jest.fn(),
}))
jest.mock('../utils/output', () => ({
  printJson: jest.fn(),
}))
jest.mock('./setup', () => ({
  __esModule: true,
  default: { run: jest.fn() },
}))

import consola from 'consola'
import { isAuthenticated } from '../utils/auth'
import { callRpc } from '../utils/api'
import { printJson } from '../utils/output'
import setupCommand from './setup'

const mockIsAuthenticated = isAuthenticated as jest.MockedFunction<typeof isAuthenticated>
const mockCallRpc = callRpc as jest.MockedFunction<typeof callRpc>
const mockPrintJson = printJson as jest.MockedFunction<typeof printJson>
const mockSetupRun = (setupCommand as unknown as { run: jest.Mock }).run
const consolaWarn = (consola as unknown as { warn: jest.Mock }).warn
const consolaInfo = (consola as unknown as { info: jest.Mock }).info
const consolaSuccess = (consola as unknown as { success: jest.Mock }).success
const consolaBox = (consola as unknown as { box: jest.Mock }).box

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyCmd = { run?: (ctx: any) => Promise<void> }

let onboardCmd: AnyCmd

beforeAll(async () => {
  onboardCmd = (await import('./onboard')).default as AnyCmd
})

beforeEach(() => {
  jest.clearAllMocks()
  process.exitCode = 0
  mockIsAuthenticated.mockReturnValue(false)
})

afterEach(() => {
  process.exitCode = 0
})

describe('onboard', () => {
  it('warns and exits 1 when not authenticated', async () => {
    await onboardCmd.run?.({ args: { full: false, json: false }, cmd: {}, rawArgs: [] })

    expect(consolaWarn).toHaveBeenCalledWith('You are not signed in.')
    expect(consolaInfo).toHaveBeenCalledWith('Run: lf auth login')
    expect(process.exitCode).toBe(1)
  })

  it('shows full success flow when authenticated with complete profile and templates', async () => {
    mockIsAuthenticated.mockReturnValue(true)
    // First call: fetchProfile → fn_get_my_lenser_profile
    mockCallRpc.mockResolvedValueOnce({ handle: 'testuser', display_name: 'Test User' })
    // Second call: fetchTopTemplates → fn_list_public_battle_templates
    mockCallRpc.mockResolvedValueOnce([
      { id: '1', title: 'Quick Duel', description: 'A quick battle', category: 'competition' },
    ])

    await onboardCmd.run?.({ args: { full: false, json: false }, cmd: {}, rawArgs: [] })

    expect(consolaSuccess).toHaveBeenCalledWith(
      'Profile ready: @%s (%s)', 'testuser', 'Test User'
    )
    expect(consolaBox).toHaveBeenCalledTimes(2) // template box + ready box
    expect(process.exitCode).toBe(0)
  })

  it('warns when profile is incomplete (no handle)', async () => {
    mockIsAuthenticated.mockReturnValue(true)
    mockCallRpc.mockResolvedValueOnce({ handle: null, display_name: null })
    mockCallRpc.mockResolvedValueOnce([])

    await onboardCmd.run?.({ args: { full: false, json: false }, cmd: {}, rawArgs: [] })

    expect(consolaWarn).toHaveBeenCalledWith(expect.stringContaining('Profile incomplete'))
  })

  it('handles profile fetch failure gracefully', async () => {
    mockIsAuthenticated.mockReturnValue(true)
    mockCallRpc.mockRejectedValueOnce(new Error('network error'))
    mockCallRpc.mockResolvedValueOnce([])

    await onboardCmd.run?.({ args: { full: false, json: false }, cmd: {}, rawArgs: [] })

    // Profile is null → incomplete warning
    expect(consolaWarn).toHaveBeenCalledWith(expect.stringContaining('Profile incomplete'))
    expect(process.exitCode).toBe(0)
  })

  it('shows info when template fetch returns empty array', async () => {
    mockIsAuthenticated.mockReturnValue(true)
    mockCallRpc.mockResolvedValueOnce({ handle: 'user', display_name: 'User' })
    mockCallRpc.mockResolvedValueOnce([])

    await onboardCmd.run?.({ args: { full: false, json: false }, cmd: {}, rawArgs: [] })

    expect(consolaInfo).toHaveBeenCalledWith(expect.stringContaining('No public templates'))
  })

  it('handles template fetch failure gracefully', async () => {
    mockIsAuthenticated.mockReturnValue(true)
    mockCallRpc.mockResolvedValueOnce({ handle: 'user', display_name: 'User' })
    mockCallRpc.mockRejectedValueOnce(new Error('timeout'))

    await onboardCmd.run?.({ args: { full: false, json: false }, cmd: {}, rawArgs: [] })

    // Empty templates → info message
    expect(consolaInfo).toHaveBeenCalledWith(expect.stringContaining('No public templates'))
    expect(process.exitCode).toBe(0)
  })

  it('delegates to setup command when --full is passed', async () => {
    const ctx = { args: { full: true, json: false }, cmd: {}, rawArgs: [] }
    await onboardCmd.run?.(ctx)

    expect(mockSetupRun).toHaveBeenCalledWith(ctx)
    expect(consolaWarn).not.toHaveBeenCalled()
  })

  it('emits JSON output when --json and authenticated', async () => {
    mockIsAuthenticated.mockReturnValue(true)
    mockCallRpc.mockResolvedValueOnce({ handle: 'user', display_name: 'User' })
    mockCallRpc.mockResolvedValueOnce([
      { id: '1', title: 'My Battle!', description: null, category: 'fun' },
    ])

    await onboardCmd.run?.({ args: { full: false, json: true }, cmd: {}, rawArgs: [] })

    expect(mockPrintJson).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'ok',
        profileComplete: true,
        templates: [{ title: 'My Battle!', slug: 'my-battle', category: 'fun' }],
      })
    )
  })

  it('emits JSON error when --json and unauthenticated', async () => {
    await onboardCmd.run?.({ args: { full: false, json: true }, cmd: {}, rawArgs: [] })

    expect(mockPrintJson).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'unauthenticated' })
    )
    expect(process.exitCode).toBe(1)
  })
})
