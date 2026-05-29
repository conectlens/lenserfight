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
jest.mock('../utils/output', () => ({
  printJson: jest.fn(),
}))
jest.mock('../utils/ansi', () => ({
  A: { brightCyan: '', bold: '', reset: '', green: '' },
  c: { bold: (s: string) => s, muted: (s: string) => s },
  sym: { fight: '*' },
}))

import consola from 'consola'
import { printJson } from '../utils/output'

const mockPrintJson = printJson as jest.MockedFunction<typeof printJson>
const consolaWarn = (consola as unknown as { warn: jest.Mock }).warn

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyCmd = { run?: (ctx: any) => Promise<void> }

let examplesCmd: AnyCmd

beforeAll(async () => {
  examplesCmd = (await import('./examples')).default as AnyCmd
})

beforeEach(() => {
  jest.clearAllMocks()
})

describe('examples', () => {
  it('prints all examples in human-readable mode', async () => {
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation()

    await examplesCmd.run?.({ args: { json: false, category: undefined }, cmd: {}, rawArgs: [] })

    expect(consoleSpy).toHaveBeenCalled()
    consoleSpy.mockRestore()
  })

  it('outputs JSON when --json flag is set', async () => {
    await examplesCmd.run?.({ args: { json: true, category: undefined }, cmd: {}, rawArgs: [] })

    expect(mockPrintJson).toHaveBeenCalledWith(expect.arrayContaining([
      expect.objectContaining({ category: 'cloud' }),
    ]))
  })

  it('filters by category', async () => {
    await examplesCmd.run?.({ args: { json: true, category: 'file-workspace' }, cmd: {}, rawArgs: [] })

    const jsonArg = mockPrintJson.mock.calls[0][0] as Array<{ category: string }>
    expect(jsonArg.every((e) => e.category === 'file-workspace')).toBe(true)
  })

  it('warns on unknown category', async () => {
    await examplesCmd.run?.({ args: { json: false, category: 'nonexistent' }, cmd: {}, rawArgs: [] })

    expect(consolaWarn).toHaveBeenCalledWith(
      expect.stringContaining('No examples found'),
      'nonexistent'
    )
  })
})
