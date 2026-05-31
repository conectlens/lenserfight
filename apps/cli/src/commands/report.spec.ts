jest.mock('citty', () => ({ defineCommand: (opts: unknown) => opts }))
jest.mock('consola', () => ({
  __esModule: true,
  default: { error: jest.fn(), warn: jest.fn(), info: jest.fn(), success: jest.fn(), log: jest.fn() },
}))
jest.mock('../utils/api', () => ({ callRpc: jest.fn(), callRest: jest.fn(), handleError: jest.fn() }))
jest.mock('../utils/output', () => ({ printTable: jest.fn(), printJson: jest.fn() }))

import consola from 'consola'
import { callRpc, callRest } from '../utils/api'
import { printJson } from '../utils/output'

const consolaError = (consola as unknown as { error: jest.Mock }).error
const consolaSuccess = (consola as unknown as { success: jest.Mock }).success
const consolaInfo = (consola as unknown as { info: jest.Mock }).info
const consolaLog = (consola as unknown as { log: jest.Mock }).log
const mockCallRpc = callRpc as jest.MockedFunction<typeof callRpc>
const mockCallRest = callRest as jest.MockedFunction<typeof callRest>
const mockPrintJson = printJson as jest.MockedFunction<typeof printJson>

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyCmd = { subCommands?: Record<string, AnyCmd>; run?: (ctx: any) => Promise<void> }

let reportCmd: AnyCmd

beforeAll(async () => {
  reportCmd = (await import('./report')).default as AnyCmd
})

beforeEach(() => {
  jest.clearAllMocks()
  process.exitCode = 0
})

describe('lf report content', () => {
  let contentCmd: AnyCmd

  beforeAll(() => {
    contentCmd = reportCmd.subCommands?.content as AnyCmd
  })

  it('rejects an invalid content type', async () => {
    await contentCmd?.run?.({
      args: { type: 'comment', id: 'some-uuid', reason: 'spam' },
      cmd: {},
      rawArgs: [],
    })

    expect(consolaError).toHaveBeenCalledWith(expect.stringContaining('Invalid type'), 'comment', expect.any(String))
    expect(process.exitCode).toBe(1)
  })

  it('rejects an invalid report reason', async () => {
    await contentCmd?.run?.({
      args: { type: 'thread', id: 'some-uuid', reason: 'fake-news' },
      cmd: {},
      rawArgs: [],
    })

    expect(consolaError).toHaveBeenCalledWith(expect.stringContaining('Invalid reason'), 'fake-news', expect.any(String))
    expect(process.exitCode).toBe(1)
  })

  it('reports success when content is reported', async () => {
    mockCallRpc.mockResolvedValue({ reported: true } as never)

    await contentCmd?.run?.({
      args: { type: 'thread', id: 'thread-uuid', reason: 'spam' },
      cmd: {},
      rawArgs: [],
    })

    expect(consolaSuccess).toHaveBeenCalledWith(expect.stringContaining('reported'))
  })

  it('shows already-reported message when duplicate', async () => {
    mockCallRpc.mockResolvedValue({ reported: false } as never)

    await contentCmd?.run?.({
      args: { type: 'lens', id: 'lens-uuid', reason: 'harassment' },
      cmd: {},
      rawArgs: [],
    })

    expect(consolaInfo).toHaveBeenCalledWith(expect.stringContaining('already reported'))
  })
})

describe('lf report show', () => {
  let showCmd: AnyCmd

  beforeAll(() => {
    showCmd = reportCmd.subCommands?.show as AnyCmd
  })

  it('emits machine-parseable JSON via printJson (not consola.log) with --json', async () => {
    mockCallRest.mockResolvedValueOnce([{ id: 'rep-1', title: 'Run' }] as never)

    await showCmd?.run?.({ args: { id: 'rep-1', json: true }, cmd: {}, rawArgs: [] })

    expect(mockPrintJson).toHaveBeenCalledWith(expect.objectContaining({ id: 'rep-1' }))
    expect(consolaLog).not.toHaveBeenCalled()
  })

  it('sets exitCode 1 when the report is not found', async () => {
    mockCallRest.mockResolvedValueOnce([] as never)

    await showCmd?.run?.({ args: { id: 'ghost', json: false }, cmd: {}, rawArgs: [] })

    expect(process.exitCode).toBe(1)
    expect(consolaError).toHaveBeenCalledWith(expect.stringContaining('No run report'), 'ghost')
  })
})

describe('lf report incidents', () => {
  let incidentsCmd: AnyCmd

  beforeAll(() => {
    incidentsCmd = reportCmd.subCommands?.incidents as AnyCmd
  })

  it('emits [] via printJson when empty and --json is set', async () => {
    mockCallRest.mockResolvedValueOnce([] as never)

    await incidentsCmd?.run?.({ args: { id: 'rep-1', json: true }, cmd: {}, rawArgs: [] })

    expect(mockPrintJson).toHaveBeenCalledWith([])
    expect(consolaInfo).not.toHaveBeenCalled()
  })
})
