jest.mock('citty', () => ({ defineCommand: (opts: unknown) => opts }))
jest.mock('consola', () => ({
  __esModule: true,
  default: { error: jest.fn(), warn: jest.fn(), info: jest.fn(), success: jest.fn(), log: jest.fn() },
}))
jest.mock('../utils/api', () => ({ callRpc: jest.fn(), handleError: jest.fn() }))
jest.mock('node:fs', () => ({ writeFileSync: jest.fn() }))

import consola from 'consola'
import { callRpc } from '../utils/api'
import { writeFileSync } from 'node:fs'

const consolaError = (consola as unknown as { error: jest.Mock }).error
const consolaSuccess = (consola as unknown as { success: jest.Mock }).success
const mockCallRpc = callRpc as jest.MockedFunction<typeof callRpc>
const mockWriteFileSync = writeFileSync as jest.MockedFunction<typeof writeFileSync>

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyCmd = { subCommands?: Record<string, AnyCmd>; run?: (ctx: any) => Promise<void> }

let publishCmd: AnyCmd
let stdoutSpy: jest.SpyInstance

beforeAll(async () => {
  publishCmd = (await import('./publish')).default as AnyCmd
})

beforeEach(() => {
  jest.clearAllMocks()
  process.exitCode = 0
  stdoutSpy = jest.spyOn(process.stdout, 'write').mockImplementation(() => true)
})

afterEach(() => {
  stdoutSpy.mockRestore()
})

describe('lf publish battle', () => {
  it('calls fn_battles_publish with the battle id', async () => {
    mockCallRpc.mockResolvedValueOnce(undefined as never)
    const battleCmd = publishCmd.subCommands?.battle as AnyCmd
    await battleCmd?.run?.({ args: { id: 'b-1' }, cmd: {}, rawArgs: [] })
    expect(mockCallRpc).toHaveBeenCalledWith('fn_battles_publish', { p_battle_id: 'b-1' }, { requireAuth: true })
    expect(consolaSuccess).toHaveBeenCalled()
  })
})

describe('lf publish results', () => {
  let resultsCmd: AnyCmd
  beforeAll(() => {
    resultsCmd = publishCmd.subCommands?.results as AnyCmd
  })

  it('rejects an unsupported --format without calling the RPC', async () => {
    await resultsCmd?.run?.({ args: { id: 'b-1', format: 'xml', out: undefined }, cmd: {}, rawArgs: [] })
    expect(consolaError).toHaveBeenCalledWith(expect.stringContaining('Invalid --format'), 'xml')
    expect(process.exitCode).toBe(1)
    expect(mockCallRpc).not.toHaveBeenCalled()
  })

  it('writes JSON to stdout by default', async () => {
    mockCallRpc.mockResolvedValueOnce([{ a: 1 }] as never)
    await resultsCmd?.run?.({ args: { id: 'b-1', format: 'json', out: undefined }, cmd: {}, rawArgs: [] })
    expect(stdoutSpy).toHaveBeenCalled()
    expect(mockWriteFileSync).not.toHaveBeenCalled()
  })

  it('emits CSV header + rows when --format csv', async () => {
    mockCallRpc.mockResolvedValueOnce([{ a: 1, b: 2 }] as never)
    await resultsCmd?.run?.({ args: { id: 'b-1', format: 'csv', out: undefined }, cmd: {}, rawArgs: [] })
    const written = stdoutSpy.mock.calls[0][0] as string
    expect(written).toContain('a,b')
  })

  it('writes to a file when --out is given', async () => {
    mockCallRpc.mockResolvedValueOnce([{ a: 1 }] as never)
    await resultsCmd?.run?.({ args: { id: 'b-1', format: 'json', out: '/tmp/out.json' }, cmd: {}, rawArgs: [] })
    expect(mockWriteFileSync).toHaveBeenCalledWith('/tmp/out.json', expect.any(String), 'utf-8')
  })
})
