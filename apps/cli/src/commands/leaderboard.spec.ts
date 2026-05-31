jest.mock('citty', () => ({ defineCommand: (opts: unknown) => opts }))
jest.mock('consola', () => ({
  __esModule: true,
  default: { error: jest.fn(), warn: jest.fn(), info: jest.fn(), success: jest.fn(), log: jest.fn() },
}))
jest.mock('../utils/api', () => ({ callRpc: jest.fn(), handleError: jest.fn() }))
jest.mock('../utils/output', () => ({ printJson: jest.fn(), printTable: jest.fn(), truncate: jest.fn((s: string) => s) }))

import consola from 'consola'
import { callRpc } from '../utils/api'
import { printJson } from '../utils/output'

const consolaError = (consola as unknown as { error: jest.Mock }).error
const consolaInfo = (consola as unknown as { info: jest.Mock }).info
const mockCallRpc = callRpc as jest.MockedFunction<typeof callRpc>
const mockPrintJson = printJson as jest.MockedFunction<typeof printJson>

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyCmd = { run?: (ctx: any) => Promise<void> }

let leaderboardCmd: AnyCmd

beforeAll(async () => {
  leaderboardCmd = (await import('./leaderboard')).default as AnyCmd
})

beforeEach(() => {
  jest.clearAllMocks()
  process.exitCode = 0
})

describe('lf leaderboard', () => {
  it('rejects an invalid time period', async () => {
    await leaderboardCmd?.run?.({ args: { period: 'daily', limit: '10', json: false }, cmd: {}, rawArgs: [] })

    expect(consolaError).toHaveBeenCalledWith(expect.stringContaining('Invalid period'), expect.any(String), expect.any(String))
    expect(process.exitCode).toBe(1)
  })

  it('rejects a non-numeric --limit without calling the RPC', async () => {
    await leaderboardCmd?.run?.({ args: { period: 'weekly', limit: 'lots', json: false }, cmd: {}, rawArgs: [] })

    expect(consolaError).toHaveBeenCalledWith(expect.stringContaining('Invalid --limit'), 'lots')
    expect(process.exitCode).toBe(1)
    expect(mockCallRpc).not.toHaveBeenCalled()
  })

  it('outputs JSON when results are returned with --json', async () => {
    mockCallRpc.mockResolvedValue([
      { handle: 'alice', rank: 1, total_xp: 9000 },
      { handle: 'bob', rank: 2, total_xp: 8500 },
    ] as never)

    await leaderboardCmd?.run?.({ args: { period: 'weekly', limit: '10', json: true }, cmd: {}, rawArgs: [] })

    expect(mockPrintJson).toHaveBeenCalled()
  })

  it('shows empty message when no entries are found', async () => {
    mockCallRpc.mockResolvedValue([] as never)

    await leaderboardCmd?.run?.({ args: { period: 'monthly', limit: '10', json: false }, cmd: {}, rawArgs: [] })

    // 'No leaderboard data for period: %s' — matches stringContaining('No')
    expect(consolaInfo).toHaveBeenCalledWith(expect.stringContaining('No leaderboard'), expect.any(String))
  })
})
