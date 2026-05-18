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
jest.mock('@lenserfight/utils/update-check', () => ({
  checkForUpdate: jest.fn(),
  detectChannel: jest.fn().mockReturnValue('stable'),
}))
jest.mock('../lib/version', () => ({
  readCliVersion: jest.fn().mockReturnValue('0.2.0'),
}))

import consola from 'consola'
import { checkForUpdate } from '@lenserfight/utils/update-check'

const mockCheckForUpdate = checkForUpdate as jest.MockedFunction<typeof checkForUpdate>
const consolaSuccess = (consola as unknown as { success: jest.Mock }).success
const consolaInfo = (consola as unknown as { info: jest.Mock }).info

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyCmd = { run?: (ctx: any) => Promise<void> }

let updateCmd: AnyCmd

beforeAll(async () => {
  updateCmd = (await import('./update')).default as AnyCmd
})

beforeEach(() => {
  jest.clearAllMocks()
})

describe('update', () => {
  it('shows up to date message when no update available', async () => {
    mockCheckForUpdate.mockResolvedValue({ current: '0.2.0', latest: '0.2.0', hasUpdate: false } as never)

    await updateCmd.run?.({ args: { check: false, json: false }, cmd: {}, rawArgs: [] })

    expect(consolaSuccess).toHaveBeenCalledWith(expect.stringContaining('latest version'))
  })

  it('shows update available message', async () => {
    mockCheckForUpdate.mockResolvedValue({ current: '0.2.0', latest: '0.3.0', hasUpdate: true } as never)

    await updateCmd.run?.({ args: { check: false, json: false }, cmd: {}, rawArgs: [] })

    expect(consolaInfo).toHaveBeenCalledWith(expect.stringContaining('0.3.0'))
  })

  it('handles offline gracefully', async () => {
    mockCheckForUpdate.mockResolvedValue(null as never)

    await updateCmd.run?.({ args: { check: false, json: false }, cmd: {}, rawArgs: [] })

    expect(consolaInfo).toHaveBeenCalledWith(expect.stringContaining('Unable to reach'))
  })

  it('outputs JSON when --json flag is set', async () => {
    mockCheckForUpdate.mockResolvedValue({ current: '0.2.0', latest: '0.3.0', hasUpdate: true } as never)
    const writeSpy = jest.spyOn(process.stdout, 'write').mockImplementation(() => true)

    await updateCmd.run?.({ args: { check: false, json: true }, cmd: {}, rawArgs: [] })

    expect(writeSpy).toHaveBeenCalledWith(expect.stringContaining('"hasUpdate": true'))
    writeSpy.mockRestore()
  })
})
