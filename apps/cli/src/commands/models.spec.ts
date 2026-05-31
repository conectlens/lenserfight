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
  byokKeyResolver: {
    resolve: jest.fn(() => {
      throw new Error('no BYOK key')
    }),
  },
  getAdapter: jest.fn(),
  getStreamAdapter: jest.fn(),
  OLLAMA_DEFAULT_BASE_URL: 'http://localhost:11434',
}))

import { callRpc, handleError } from '../utils/api'
import { printJson, printTable } from '../utils/output'

const mockCallRpc = callRpc as jest.MockedFunction<typeof callRpc>
const mockHandleError = handleError as jest.MockedFunction<typeof handleError>
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

    it('parses provider/model filters into RPC params', async () => {
      mockCallRpc.mockResolvedValue([] as never)

      await listCmd?.run?.({
        args: { json: false, provider: 'anthropic', capability: 'vision', 'support-level': 'native', modality: 'text' },
        cmd: {},
        rawArgs: [],
      })

      expect(mockCallRpc).toHaveBeenCalledWith(
        'fn_ai_catalog_models',
        {
          p_provider_key: 'anthropic',
          p_support_level: 'native',
          p_capability: 'vision',
          p_modality: 'text',
        },
        { noAuth: true }
      )
    })
  })

  describe('models run', () => {
    let runCmd: AnyCmd

    beforeAll(() => {
      runCmd = modelsCmd.subCommands?.run as AnyCmd
    })

    it('routes unsupported providers to handleError without hitting the network', async () => {
      const fetchSpy = jest.spyOn(global, 'fetch' as never)
      mockCallRpc.mockResolvedValue({
        provider_key: 'cohere',
        key: 'command-r',
        supports_streaming: false,
      } as never)

      await runCmd?.run?.({
        args: { model: 'cohere/command-r', prompt: 'hi', system: '', 'input-file': '', tool: '', 'tool-args': '', stream: false, json: false },
        cmd: {},
        rawArgs: [],
      })

      expect(mockHandleError).toHaveBeenCalledTimes(1)
      const err = mockHandleError.mock.calls[0][0] as Error
      expect(err.message).toContain('cohere')
      expect(fetchSpy).not.toHaveBeenCalled()
      fetchSpy.mockRestore()
    })

    it('rejects an empty prompt before resolving a route', async () => {
      mockCallRpc.mockResolvedValue({
        provider_key: 'openai',
        key: 'gpt-4o',
        supports_streaming: true,
      } as never)

      await runCmd?.run?.({
        args: { model: 'openai/gpt-4o', prompt: '', system: '', 'input-file': '', tool: '', 'tool-args': '', stream: false, json: false },
        cmd: {},
        rawArgs: [],
      })

      expect(mockHandleError).toHaveBeenCalledTimes(1)
      const err = mockHandleError.mock.calls[0][0] as Error
      expect(err.message).toContain('--prompt')
    })
  })
})
