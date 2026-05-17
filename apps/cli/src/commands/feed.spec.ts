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
const consolaWarn = (consola as unknown as { warn: jest.Mock }).warn
const consolaInfo = (consola as unknown as { info: jest.Mock }).info
const mockCallRpc = callRpc as jest.MockedFunction<typeof callRpc>
const mockPrintJson = printJson as jest.MockedFunction<typeof printJson>

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyCmd = { run?: (ctx: any) => Promise<void> }

let feedCmd: AnyCmd

beforeAll(async () => {
  feedCmd = (await import('./feed')).default as AnyCmd
})

beforeEach(() => {
  jest.clearAllMocks()
  process.exitCode = 0
})

describe('lf feed', () => {
  it('rejects an invalid content type', async () => {
    await feedCmd?.run?.({ args: { type: 'videos', limit: '10', json: false }, cmd: {}, rawArgs: [] })

    expect(consolaError).toHaveBeenCalledWith(expect.stringContaining('Invalid type'), 'videos', expect.any(String))
    expect(process.exitCode).toBe(1)
  })

  it('warns when no lenser profile is found', async () => {
    // fn_lensers_get_active_profile returns null/empty
    mockCallRpc.mockResolvedValueOnce(null as never)

    await feedCmd?.run?.({ args: { type: 'threads', limit: '5', json: false }, cmd: {}, rawArgs: [] })

    expect(consolaWarn).toHaveBeenCalledWith(expect.stringContaining('No lenser profile'))
  })

  it('outputs JSON when feed returns items and --json is set', async () => {
    // First: profile resolution → returns an object with id
    mockCallRpc.mockResolvedValueOnce({ id: 'self-uuid' } as never)
    // Second: feed items
    mockCallRpc.mockResolvedValueOnce([{ id: 'item-1', title: 'Hello' }] as never)

    await feedCmd?.run?.({ args: { type: 'threads', limit: '5', json: true }, cmd: {}, rawArgs: [] })

    expect(mockPrintJson).toHaveBeenCalled()
  })

  it('shows empty message when feed returns no items', async () => {
    mockCallRpc.mockResolvedValueOnce({ id: 'self-uuid' } as never)
    mockCallRpc.mockResolvedValueOnce([] as never)

    await feedCmd?.run?.({ args: { type: 'threads', limit: '10', json: false }, cmd: {}, rawArgs: [] })

    expect(consolaInfo).toHaveBeenCalledWith(expect.stringContaining('empty'))
  })
})
