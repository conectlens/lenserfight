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
    box: jest.fn(),
  },
}))
jest.mock('../utils/auth', () => ({
  loginWithIdentifier: jest.fn(),
  loginWithEmail: jest.fn(),
  clearAuthTokens: jest.fn(),
  getUserInfo: jest.fn(),
  isAuthenticated: jest.fn(),
  refreshAuthToken: jest.fn(),
  getAuthToken: jest.fn(),
  registerUser: jest.fn(),
  buildAuthAppUrl: jest.fn(),
  clearDeveloperToken: jest.fn(),
  getDeveloperTokenMetadata: jest.fn(),
  isDeveloperTokenActive: jest.fn(),
  listDeveloperTokens: jest.fn(),
  openBrowser: jest.fn(),
  requestDeviceApproval: jest.fn(),
  requestDeviceLogin: jest.fn(),
  revokeDeveloperToken: jest.fn(),
  saveDeveloperToken: jest.fn(),
  waitForDeveloperToken: jest.fn(),
  waitForSessionLogin: jest.fn(),
}))
jest.mock('../utils/output', () => ({
  printJson: jest.fn(),
  printTable: jest.fn(),
}))

import consola from 'consola'
import {
  isAuthenticated,
  loginWithIdentifier,
  clearAuthTokens,
  getUserInfo,
  refreshAuthToken,
  getAuthToken,
  requestDeviceLogin,
  buildAuthAppUrl,
  openBrowser,
  waitForSessionLogin,
} from '../utils/auth'

const mockIsAuthenticated = isAuthenticated as jest.MockedFunction<typeof isAuthenticated>
const mockLoginWithIdentifier = loginWithIdentifier as jest.MockedFunction<typeof loginWithIdentifier>
const mockClearAuthTokens = clearAuthTokens as jest.MockedFunction<typeof clearAuthTokens>
const mockGetUserInfo = getUserInfo as jest.MockedFunction<typeof getUserInfo>
const mockRefreshAuthToken = refreshAuthToken as jest.MockedFunction<typeof refreshAuthToken>
const mockGetAuthToken = getAuthToken as jest.MockedFunction<typeof getAuthToken>
const mockRequestDeviceLogin = requestDeviceLogin as jest.MockedFunction<typeof requestDeviceLogin>
const mockBuildAuthAppUrl = buildAuthAppUrl as jest.MockedFunction<typeof buildAuthAppUrl>
const mockOpenBrowser = openBrowser as jest.MockedFunction<typeof openBrowser>
const mockWaitForSessionLogin = waitForSessionLogin as jest.MockedFunction<typeof waitForSessionLogin>
const consolaWarn = (consola as unknown as { warn: jest.Mock }).warn
const consolaSuccess = (consola as unknown as { success: jest.Mock }).success
const consolaInfo = (consola as unknown as { info: jest.Mock }).info

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyCmd = { subCommands?: Record<string, AnyCmd>; run?: (ctx: any) => Promise<void> }

let authCmd: AnyCmd

beforeAll(async () => {
  authCmd = (await import('./auth')).default as AnyCmd
})

beforeEach(() => {
  jest.clearAllMocks()
  mockIsAuthenticated.mockReturnValue(false)
})

describe('auth login', () => {
  let loginCmd: AnyCmd

  beforeAll(() => {
    loginCmd = authCmd.subCommands?.login as AnyCmd
  })

  it('warns if already authenticated', async () => {
    mockIsAuthenticated.mockReturnValue(true)

    await loginCmd.run?.({ args: {}, cmd: {}, rawArgs: [] })

    expect(consolaWarn).toHaveBeenCalledWith(expect.stringContaining('already signed in'))
  })

  it('uses headless login with email + password', async () => {
    mockLoginWithIdentifier.mockResolvedValue({ expiresAt: '2026-12-01T00:00:00Z' } as never)

    await loginCmd.run?.({ args: { email: 'test@example.com', password: 'pass123' }, cmd: {}, rawArgs: [] })

    expect(mockLoginWithIdentifier).toHaveBeenCalledWith('test@example.com', 'pass123')
    expect(consolaSuccess).toHaveBeenCalledWith(
      expect.stringContaining('Logged in'),
      expect.anything()
    )
  })

  it('falls back to browser login when no credentials provided', async () => {
    mockRequestDeviceLogin.mockResolvedValue({ verificationUri: '/auth/device/verify?code=ABC', deviceCode: 'dev123', interval: 5, expiresIn: 300 } as never)
    mockBuildAuthAppUrl.mockReturnValue('https://app.lenserfight.com/auth/device/verify?code=ABC')
    mockWaitForSessionLogin.mockResolvedValue({ expiresAt: '2026-12-01T00:00:00Z' } as never)

    await loginCmd.run?.({ args: {}, cmd: {}, rawArgs: [] })

    expect(mockRequestDeviceLogin).toHaveBeenCalled()
    expect(mockOpenBrowser).toHaveBeenCalled()
  })
})

describe('auth logout', () => {
  let logoutCmd: AnyCmd

  beforeAll(() => {
    logoutCmd = authCmd.subCommands?.logout as AnyCmd
  })

  it('clears tokens and confirms', async () => {
    await logoutCmd?.run?.({ args: {}, cmd: {}, rawArgs: [] })

    expect(mockClearAuthTokens).toHaveBeenCalled()
    expect(consolaSuccess).toHaveBeenCalledWith(expect.stringContaining('Logged out'))
  })
})

describe('auth whoami', () => {
  let whoamiCmd: AnyCmd

  beforeAll(() => {
    whoamiCmd = authCmd.subCommands?.whoami as AnyCmd
  })

  it('shows not authenticated when no token', async () => {
    mockIsAuthenticated.mockReturnValue(false)

    await whoamiCmd?.run?.({ args: {}, cmd: {}, rawArgs: [] })

    expect(consolaWarn).toHaveBeenCalledWith(expect.stringContaining('Not authenticated'))
  })

  it('shows user info when authenticated', async () => {
    mockIsAuthenticated.mockReturnValue(true)
    mockGetUserInfo.mockResolvedValue({ email: 'test@lenserfight.com', id: 'u1' } as never)

    await whoamiCmd?.run?.({ args: {}, cmd: {}, rawArgs: [] })

    expect(consolaInfo).toHaveBeenCalledWith('Email: %s', 'test@lenserfight.com')
  })
})

describe('auth refresh', () => {
  let refreshCmd: AnyCmd

  beforeAll(() => {
    refreshCmd = authCmd.subCommands?.refresh as AnyCmd
  })

  it('refreshes token and confirms', async () => {
    mockRefreshAuthToken.mockResolvedValue({ expiresAt: '2026-12-01T00:00:00Z' } as never)

    await refreshCmd?.run?.({ args: {}, cmd: {}, rawArgs: [] })

    expect(mockRefreshAuthToken).toHaveBeenCalled()
    expect(consolaSuccess).toHaveBeenCalled()
  })
})

describe('auth token', () => {
  let tokenCmd: AnyCmd

  beforeAll(() => {
    tokenCmd = authCmd.subCommands?.token as AnyCmd
  })

  it('prints raw token to stdout', async () => {
    mockGetAuthToken.mockReturnValue('my-secret-token')
    const writeSpy = jest.spyOn(process.stdout, 'write').mockImplementation(() => true)

    await tokenCmd?.run?.({ args: {}, cmd: {}, rawArgs: [] })

    expect(writeSpy).toHaveBeenCalledWith(expect.stringContaining('my-secret-token'))
    writeSpy.mockRestore()
  })
})
