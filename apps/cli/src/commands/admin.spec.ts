jest.mock('citty', () => ({ defineCommand: (opts: unknown) => opts }))
jest.mock('../utils/api', () => ({
  callRpc: jest.fn(),
  handleError: jest.fn((err: unknown) => { throw err }),
}))
jest.mock('../utils/output', () => ({
  printTable: jest.fn(),
  printJson: jest.fn(),
}))
jest.mock('../utils/ansi', () => ({
  c: { success: (s: string) => s, warn: (s: string) => s },
}))
jest.mock('consola', () => ({
  __esModule: true,
  default: {
    success: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
  },
}))

import consola from 'consola'
import { callRpc } from '../utils/api'
import { printTable } from '../utils/output'
import adminCommand from './admin'

const mockCallRpc = callRpc as jest.MockedFunction<typeof callRpc>
const mockPrintTable = printTable as jest.MockedFunction<typeof printTable>
const consolaInfo = (consola as unknown as { info: jest.Mock }).info

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyCmd = { run?: (ctx: any) => Promise<void>; subCommands?: Record<string, AnyCmd> }
const voteAnomaliesCmd = (adminCommand as AnyCmd).subCommands?.['vote-anomalies']

beforeEach(() => {
  jest.clearAllMocks()
  process.exitCode = 0
})

describe('lf admin vote-anomalies', () => {
  it('prints table when anomalies are returned', async () => {
    mockCallRpc.mockResolvedValueOnce([
      {
        id: 'aaa-bbb-ccc-ddd-eee',
        battle_id: 'bbb-ccc-ddd-eee-fff',
        voter_lenser_id: 'ccc-ddd-eee-fff-ggg',
        anomaly_type: 'rapid_voting',
        score: 0.92,
        detected_at: new Date('2026-05-12T10:00:00Z').toISOString(),
        resolved_at: null,
      },
    ])

    await (voteAnomaliesCmd as AnyCmd).run?.({ args: { battle: '', status: 'pending', json: false } })

    expect(mockCallRpc).toHaveBeenCalledWith(
      'fn_admin_get_vote_anomalies',
      expect.objectContaining({ p_status: 'pending' }),
      { requireAuth: true }
    )
    expect(mockPrintTable).toHaveBeenCalledWith(
      expect.arrayContaining(['id', 'battle', 'voter']),
      expect.any(Array)
    )
  })

  it('prints "No anomalies found" when result is empty', async () => {
    mockCallRpc.mockResolvedValueOnce([])

    await (voteAnomaliesCmd as AnyCmd).run?.({ args: { battle: '', status: 'pending', json: false } })

    expect(consolaInfo).toHaveBeenCalledWith('No anomalies found.')
    expect(mockPrintTable).not.toHaveBeenCalled()
  })
})
