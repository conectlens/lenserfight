jest.mock('citty', () => ({ defineCommand: (opts: unknown) => opts }))
jest.mock('node:child_process', () => ({
  spawnSync: jest.fn(),
}))
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
jest.mock('@lenserfight/utils/update-check', () => ({
  checkForUpdate: jest.fn(),
  detectChannel: jest.fn().mockReturnValue('stable'),
  invalidateUpdateCache: jest.fn(),
}))
jest.mock('../lib/version', () => ({
  readCliVersion: jest.fn().mockReturnValue('0.2.0'),
}))

import { spawnSync } from 'node:child_process'
import consola from 'consola'
import { checkForUpdate, detectChannel, invalidateUpdateCache } from '@lenserfight/utils/update-check'

const mockCheckForUpdate = checkForUpdate as jest.MockedFunction<typeof checkForUpdate>
const mockDetectChannel = detectChannel as jest.MockedFunction<typeof detectChannel>
const mockSpawnSync = spawnSync as jest.MockedFunction<typeof spawnSync>
const mockInvalidateUpdateCache = invalidateUpdateCache as jest.MockedFunction<
  typeof invalidateUpdateCache
>
const consolaSuccess = (consola as unknown as { success: jest.Mock }).success
const consolaInfo = (consola as unknown as { info: jest.Mock }).info
const consolaStart = (consola as unknown as { start: jest.Mock }).start
const consolaError = (consola as unknown as { error: jest.Mock }).error

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyCmd = { run?: (ctx: any) => Promise<void> }

let updateCmd: AnyCmd

beforeAll(async () => {
  updateCmd = (await import('./update')).default as AnyCmd
})

beforeEach(() => {
  jest.clearAllMocks()
  process.exitCode = 0
  mockSpawnSync.mockReturnValue({ status: 0 } as never)
  process.argv[1] = '/usr/lib/node_modules/npm/bin/lf.js'
  delete process.env['npm_config_user_agent']
})

describe('update', () => {
  it('shows up to date message when no update available', async () => {
    mockCheckForUpdate.mockResolvedValue({ current: '0.2.0', latest: '0.2.0', hasUpdate: false } as never)

    await updateCmd.run?.({
      args: { check: false, instructions: false, json: false },
      cmd: {},
      rawArgs: [],
    })

    expect(consolaSuccess).toHaveBeenCalledWith(expect.stringContaining('latest version'))
    expect(mockSpawnSync).not.toHaveBeenCalled()
  })

  it('installs automatically when an update is available', async () => {
    mockCheckForUpdate.mockResolvedValue({
      current: '0.2.0',
      latest: '0.3.0',
      hasUpdate: true,
    } as never)

    await updateCmd.run?.({
      args: { check: false, instructions: false, json: false },
      cmd: {},
      rawArgs: [],
    })

    expect(consolaStart).toHaveBeenCalledWith(expect.stringContaining('Installing'))
    expect(mockSpawnSync).toHaveBeenCalledWith(
      'npm',
      ['install', '-g', '@lenserfight/cli@latest'],
      expect.objectContaining({ stdio: 'inherit' }),
    )
    expect(mockInvalidateUpdateCache).toHaveBeenCalled()
    expect(consolaSuccess).toHaveBeenCalledWith(expect.stringContaining('Updated'))
  })

  it('prints instructions when --instructions is set', async () => {
    mockCheckForUpdate.mockResolvedValue({
      current: '0.2.0',
      latest: '0.3.0',
      hasUpdate: true,
    } as never)
    const writeSpy = jest.spyOn(process.stdout, 'write').mockImplementation(() => true)

    await updateCmd.run?.({
      args: { check: false, instructions: true, json: false },
      cmd: {},
      rawArgs: [],
    })

    expect(mockSpawnSync).not.toHaveBeenCalled()
    expect(writeSpy).toHaveBeenCalledWith(expect.stringContaining('npm install -g'))
    writeSpy.mockRestore()
  })

  it('handles offline gracefully', async () => {
    mockCheckForUpdate.mockResolvedValue(null as never)

    await updateCmd.run?.({
      args: { check: false, instructions: false, json: false },
      cmd: {},
      rawArgs: [],
    })

    expect(consolaInfo).toHaveBeenCalledWith(expect.stringContaining('Unable to reach'))
  })

  it('sets exit code when install fails', async () => {
    mockCheckForUpdate.mockResolvedValue({
      current: '0.2.0',
      latest: '0.3.0',
      hasUpdate: true,
    } as never)
    mockSpawnSync.mockReturnValue({ status: 1 } as never)
    const writeSpy = jest.spyOn(process.stdout, 'write').mockImplementation(() => true)

    await updateCmd.run?.({
      args: { check: false, instructions: false, json: false },
      cmd: {},
      rawArgs: [],
    })

    expect(consolaError).toHaveBeenCalled()
    expect(process.exitCode).toBe(1)
    writeSpy.mockRestore()
  })

  it('prints instructions (exit 0) when the install method is undetectable', async () => {
    mockCheckForUpdate.mockResolvedValue({
      current: '0.2.0',
      latest: '0.3.0',
      hasUpdate: true,
    } as never)
    // Realistic globally-installed path: contains the package name, not /npm/.
    process.argv[1] = '/usr/local/lib/node_modules/@lenserfight/cli/dist/main.mjs'
    const writeSpy = jest.spyOn(process.stdout, 'write').mockImplementation(() => true)

    await updateCmd.run?.({
      args: { check: false, instructions: false, json: false },
      cmd: {},
      rawArgs: [],
    })

    expect(mockSpawnSync).not.toHaveBeenCalled()
    expect(consolaError).not.toHaveBeenCalled()
    expect(process.exitCode).toBe(0)
    expect(writeSpy).toHaveBeenCalledWith(expect.stringContaining('npm install -g'))
    writeSpy.mockRestore()
  })

  it('installs the exact version for a valid pre-release on a non-stable channel', async () => {
    mockDetectChannel.mockReturnValueOnce('beta')
    mockCheckForUpdate.mockResolvedValue({
      current: '0.2.0',
      latest: '0.3.0-beta.1',
      hasUpdate: true,
    } as never)

    await updateCmd.run?.({
      args: { check: false, instructions: false, json: false },
      cmd: {},
      rawArgs: [],
    })

    expect(mockSpawnSync).toHaveBeenCalledWith(
      'npm',
      ['install', '-g', '@lenserfight/cli@0.3.0-beta.1'],
      expect.objectContaining({ stdio: 'inherit' }),
    )
  })

  it('falls back to the channel dist-tag when the registry version is malformed', async () => {
    mockDetectChannel.mockReturnValueOnce('beta')
    mockCheckForUpdate.mockResolvedValue({
      current: '0.2.0',
      latest: 'latest && rm -rf ~',
      hasUpdate: true,
    } as never)

    await updateCmd.run?.({
      args: { check: false, instructions: false, json: false },
      cmd: {},
      rawArgs: [],
    })

    expect(mockSpawnSync).toHaveBeenCalledWith(
      'npm',
      ['install', '-g', '@lenserfight/cli@beta'],
      expect.objectContaining({ stdio: 'inherit' }),
    )
  })

  it('outputs JSON when --json flag is set', async () => {
    mockCheckForUpdate.mockResolvedValue({ current: '0.2.0', latest: '0.3.0', hasUpdate: true } as never)
    const writeSpy = jest.spyOn(process.stdout, 'write').mockImplementation(() => true)

    await updateCmd.run?.({
      args: { check: false, instructions: false, json: true },
      cmd: {},
      rawArgs: [],
    })

    expect(writeSpy).toHaveBeenCalledWith(expect.stringContaining('"hasUpdate": true'))
    expect(mockSpawnSync).not.toHaveBeenCalled()
    writeSpy.mockRestore()
  })
})
