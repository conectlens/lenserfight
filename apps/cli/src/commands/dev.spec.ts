jest.mock('citty', () => ({ defineCommand: (opts: unknown) => opts }))
jest.mock('consola', () => ({
  __esModule: true,
  default: {
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
    success: jest.fn(),
    log: jest.fn(),
  },
}))
jest.mock('node:child_process', () => ({
  execSync: jest.fn(),
  spawn: jest.fn().mockReturnValue({
    on: jest.fn(),
    stdout: null,
    stderr: null,
  }),
}))
jest.mock('../lib/combine-seeds', () => ({
  runCombineSeedsIfPresent: jest.fn(),
}))

import consola from 'consola'
import { execSync, spawn } from 'node:child_process'
import { runCombineSeedsIfPresent } from '../lib/combine-seeds'

const mockExecSync = execSync as jest.MockedFunction<typeof execSync>
const mockSpawn = spawn as jest.MockedFunction<typeof spawn>
const mockCombineSeeds = runCombineSeedsIfPresent as jest.MockedFunction<typeof runCombineSeedsIfPresent>
const consolaSuccess = (consola as unknown as { success: jest.Mock }).success
const consolaError = (consola as unknown as { error: jest.Mock }).error
const consolaWarn = (consola as unknown as { warn: jest.Mock }).warn
const consolaInfo = (consola as unknown as { info: jest.Mock }).info

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyCmd = { run?: (ctx: any) => Promise<void> }

let devCmd: AnyCmd

beforeAll(async () => {
  devCmd = (await import('./dev')).default as AnyCmd
})

beforeEach(() => {
  jest.clearAllMocks()
  process.exitCode = 0
})

describe('dev', () => {
  it('starts supabase when no --reset flag', async () => {
    await devCmd.run?.({ args: { reset: false, echo: false }, cmd: {}, rawArgs: [] })

    expect(mockSpawn).toHaveBeenCalledWith('supabase', ['start'], expect.anything())
    expect(consolaInfo).toHaveBeenCalledWith(expect.stringContaining('Starting local Supabase'))
  })

  it('runs db reset when --reset flag is set', async () => {
    await devCmd.run?.({ args: { reset: true, echo: false }, cmd: {}, rawArgs: [] })

    expect(mockCombineSeeds).toHaveBeenCalled()
    expect(mockExecSync).toHaveBeenCalledWith('supabase db reset', expect.anything())
    expect(consolaSuccess).toHaveBeenCalledWith(expect.stringContaining('reset complete'))
  })

  it('sets exitCode=1 when db reset fails', async () => {
    mockExecSync.mockImplementation(() => { throw new Error('reset failed') })

    await devCmd.run?.({ args: { reset: true, echo: false }, cmd: {}, rawArgs: [] })

    expect(consolaError).toHaveBeenCalledWith(expect.stringContaining('reset failed'))
    expect(process.exitCode).toBe(1)
  })

  it('sets USE_ECHO_PROVIDER when --echo flag is set', async () => {
    await devCmd.run?.({ args: { reset: false, echo: true }, cmd: {}, rawArgs: [] })

    expect(process.env['USE_ECHO_PROVIDER']).toBe('true')
    expect(consolaWarn).toHaveBeenCalledWith(expect.stringContaining('ECHO MODE'))
  })
})
