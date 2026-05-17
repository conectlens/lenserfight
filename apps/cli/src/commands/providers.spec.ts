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
jest.mock('../utils/api', () => ({
  callRpc: jest.fn(),
  handleError: jest.fn(),
}))
jest.mock('../utils/output', () => ({
  printJson: jest.fn(),
  printSuccess: jest.fn(),
  printTable: jest.fn(),
  printWarn: jest.fn(),
}))
jest.mock('node:readline/promises', () => ({
  createInterface: jest.fn().mockReturnValue({
    question: jest.fn().mockResolvedValue('openai'),
    close: jest.fn(),
  }),
}))

import { callRpc } from '../utils/api'
import { printJson, printTable } from '../utils/output'

const mockCallRpc = callRpc as jest.MockedFunction<typeof callRpc>
const mockPrintJson = printJson as jest.MockedFunction<typeof printJson>
const mockPrintTable = printTable as jest.MockedFunction<typeof printTable>

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyCmd = { subCommands?: Record<string, AnyCmd>; run?: (ctx: any) => Promise<void> }

let providersCmd: AnyCmd

beforeAll(async () => {
  providersCmd = (await import('./providers')).default as AnyCmd
})

beforeEach(() => {
  jest.clearAllMocks()
})

describe('providers list', () => {
  let listCmd: AnyCmd

  beforeAll(() => {
    listCmd = providersCmd.subCommands?.list as AnyCmd
  })

  it('outputs provider table in human-readable mode', async () => {
    mockCallRpc.mockResolvedValue([
      { id: '1', key: 'openai', display_name: 'OpenAI', support_level: 'native', is_active: true },
      { id: '2', key: 'anthropic', display_name: 'Anthropic', support_level: 'native', is_active: true },
    ] as never)

    await listCmd.run?.({ args: { json: false }, cmd: {}, rawArgs: [] })

    expect(mockCallRpc).toHaveBeenCalledWith('fn_ai_catalog_providers', {}, expect.anything())
    expect(mockPrintTable).toHaveBeenCalled()
  })

  it('outputs JSON when --json flag is set', async () => {
    const providers = [
      { id: '1', key: 'openai', display_name: 'OpenAI', support_level: 'native', is_active: true },
    ]
    mockCallRpc.mockResolvedValue(providers as never)

    await listCmd.run?.({ args: { json: true }, cmd: {}, rawArgs: [] })

    expect(mockPrintJson).toHaveBeenCalledWith(providers)
  })
})
