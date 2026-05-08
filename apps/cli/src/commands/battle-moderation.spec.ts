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
jest.mock('../utils/api', () => ({
  callRpc: jest.fn(),
  callRest: jest.fn(),
  handleError: jest.fn(),
}))
jest.mock('../utils/output', () => ({
  printTable: jest.fn(),
  printJson: jest.fn(),
  truncate: (s: string, n: number) => (s.length > n ? s.slice(0, n) + '…' : s),
}))

import consola from 'consola'
import { callRpc, handleError } from '../utils/api'
import { printTable } from '../utils/output'

const mockCallRpc = callRpc as jest.MockedFunction<typeof callRpc>
const mockHandleError = handleError as jest.MockedFunction<typeof handleError>
const mockPrintTable = printTable as jest.MockedFunction<typeof printTable>
const consolaSuccess = (consola as unknown as { success: jest.Mock }).success
const consolaError = (consola as unknown as { error: jest.Mock }).error
const consolaInfo = (consola as unknown as { info: jest.Mock }).info

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyCmd = { run?: (ctx: any) => Promise<void>; subCommands?: Record<string, AnyCmd | (() => Promise<AnyCmd>)> }

beforeEach(() => {
  jest.resetAllMocks()
  process.exitCode = 0
})

async function getSub(key: string): Promise<AnyCmd> {
  const { default: cmd } = (await import('./battle-moderation')) as { default: AnyCmd }
  const sub = cmd.subCommands?.[key]
  return typeof sub === 'function' ? sub() : (sub as AnyCmd)
}

function makeRow(over: Partial<Record<string, unknown>> = {}) {
  return {
    decision_id: 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
    occurred_at: '2026-05-01T10:00:00Z',
    target_entity_id: 'tgt-1',
    decision_type: 'flagged',
    reason: 'inappropriate',
    is_ai_moderated: true,
    battle_id: 'btl-1',
    battle_title: 'My Battle',
    battle_slug: 'my-battle',
    ai_confidence: 0.93,
    ...over,
  }
}

describe('battle-moderation list', () => {
  it('passes the --status filter through to fn_get_moderation_decisions_for_owner', async () => {
    mockCallRpc.mockResolvedValueOnce([makeRow()])
    const list = await getSub('list')

    await list.run?.({
      args: { status: 'flagged', limit: '10', json: false },
      cmd: {},
      rawArgs: [],
    })

    expect(mockCallRpc).toHaveBeenCalledWith(
      'fn_get_moderation_decisions_for_owner',
      { p_status: 'flagged', p_limit: 10 },
      { requireAuth: true }
    )
    expect(mockPrintTable).toHaveBeenCalled()
    const rows = mockPrintTable.mock.calls[0][1] as string[][]
    expect(rows[0][2]).toBe('flagged')
    expect(rows[0][3]).toBe('yes')
    expect(rows[0][4]).toBe('0.93')
  })

  it('passes p_status=null when --status is omitted', async () => {
    mockCallRpc.mockResolvedValueOnce([])
    const list = await getSub('list')

    await list.run?.({
      args: { status: '', limit: '50', json: false },
      cmd: {},
      rawArgs: [],
    })

    expect(mockCallRpc).toHaveBeenCalledWith(
      'fn_get_moderation_decisions_for_owner',
      { p_status: null, p_limit: 50 },
      { requireAuth: true }
    )
    expect(consolaInfo).toHaveBeenCalledWith('No moderation decisions found.')
  })

  it('rejects an invalid --status with exit code 1', async () => {
    const list = await getSub('list')
    await list.run?.({
      args: { status: 'bogus', limit: '50', json: false },
      cmd: {},
      rawArgs: [],
    })
    expect(process.exitCode).toBe(1)
    expect(consolaError).toHaveBeenCalled()
    expect(mockCallRpc).not.toHaveBeenCalled()
  })
})

describe('battle-moderation override', () => {
  it('calls fn_decide_moderation_override and reports success', async () => {
    mockCallRpc.mockResolvedValueOnce(undefined)
    const override = await getSub('override')

    await override.run?.({
      args: {
        'decision-id': 'dec-uuid',
        decision: 'restored',
        reason: 'False positive on benign content',
      },
      cmd: {},
      rawArgs: [],
    })

    expect(mockCallRpc).toHaveBeenCalledWith(
      'fn_decide_moderation_override',
      {
        p_decision_id: 'dec-uuid',
        p_override_decision_type: 'restored',
        p_reason: 'False positive on benign content',
      },
      { requireAuth: true }
    )
    expect(consolaSuccess).toHaveBeenCalled()
    expect(process.exitCode).toBe(0)
  })

  it('routes RPC failures through handleError', async () => {
    mockCallRpc.mockRejectedValueOnce(
      Object.assign(new Error('RLS denied'), { status: 403 })
    )
    const override = await getSub('override')

    await override.run?.({
      args: {
        'decision-id': 'dec-uuid',
        decision: 'approved',
        reason: 'on review',
      },
      cmd: {},
      rawArgs: [],
    })

    expect(mockHandleError).toHaveBeenCalled()
  })
})
