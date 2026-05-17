jest.mock('citty', () => ({ defineCommand: (opts: unknown) => opts }))
jest.mock('consola', () => ({
  __esModule: true,
  default: {
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
    success: jest.fn(),
    log: jest.fn(),
    box: jest.fn(),
  },
}))
jest.mock('../utils/api', () => ({
  callRpc: jest.fn(),
  handleError: jest.fn(),
}))
jest.mock('../utils/output', () => ({
  printJson: jest.fn(),
  printTable: jest.fn(),
}))
jest.mock('../config/project-config', () => ({
  resolveConfig: jest.fn().mockReturnValue({ ollamaBaseUrl: undefined }),
}))
jest.mock('@lenserfight/providers', () => ({
  byokKeyResolver: { has: jest.fn().mockReturnValue(false) },
  getAdapter: jest.fn(),
  getStreamAdapter: jest.fn(),
  OLLAMA_DEFAULT_BASE_URL: 'http://localhost:11434',
}))

import { callRpc } from '../utils/api'
import { printJson, printTable } from '../utils/output'

const mockCallRpc = callRpc as jest.MockedFunction<typeof callRpc>
const mockPrintJson = printJson as jest.MockedFunction<typeof printJson>
const mockPrintTable = printTable as jest.MockedFunction<typeof printTable>

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyCmd = { subCommands?: Record<string, AnyCmd>; run?: (ctx: any) => Promise<void> }

let modelsCmd: AnyCmd

beforeAll(async () => {
  modelsCmd = (await import('./models')).default as AnyCmd
})

beforeEach(() => {
  jest.clearAllMocks()
})

describe('models', () => {
  it('has list subcommand', () => {
    expect(modelsCmd.subCommands?.list).toBeDefined()
  })

  it('has show subcommand', () => {
    expect(modelsCmd.subCommands?.show).toBeDefined()
  })

  it('has capabilities subcommand', () => {
    expect(modelsCmd.subCommands?.capabilities).toBeDefined()
  })

  it('has run subcommand', () => {
    expect(modelsCmd.subCommands?.run).toBeDefined()
  })

  describe('models list', () => {
    let listCmd: AnyCmd

    beforeAll(() => {
      listCmd = modelsCmd.subCommands?.list as AnyCmd
    })

    it('calls fn_ai_catalog_models and outputs JSON', async () => {
      const models = [{ id: '1', key: 'claude-4', name: 'Claude 4', provider_key: 'anthropic' }]
      mockCallRpc.mockResolvedValue(models as never)

      await listCmd?.run?.({ args: { json: true, provider: undefined, capability: undefined, 'support-level': undefined, modality: undefined }, cmd: {}, rawArgs: [] })

      expect(mockCallRpc).toHaveBeenCalledWith(
        'fn_ai_catalog_models',
        expect.anything(),
        expect.anything()
      )
      expect(mockPrintJson).toHaveBeenCalledWith(models)
    })
  })
})
