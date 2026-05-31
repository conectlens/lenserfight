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
jest.mock('../utils/automation-objects', () => ({
  parseAutomationDocument: jest.fn(),
}))
jest.mock('../utils/output', () => ({
  printJson: jest.fn(),
  printTable: jest.fn(),
  truncate: (s: string, n: number) => (s.length > n ? s.slice(0, n) + '…' : s),
}))

import { callRpc, handleError } from '../utils/api'
import { parseAutomationDocument } from '../utils/automation-objects'
import { printJson } from '../utils/output'

const mockCallRpc = callRpc as jest.MockedFunction<typeof callRpc>
const mockHandleError = handleError as jest.MockedFunction<typeof handleError>
const mockParse = parseAutomationDocument as jest.MockedFunction<typeof parseAutomationDocument>
const mockPrintJson = printJson as jest.MockedFunction<typeof printJson>

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyCmd = { run?: (ctx: any) => Promise<void>; subCommands?: Record<string, any> }

beforeEach(() => {
  jest.clearAllMocks()
  process.exitCode = 0
})

async function getSubCmd(key: string): Promise<AnyCmd> {
  const { default: cmd } = (await import('./tool')) as { default: AnyCmd }
  return cmd.subCommands?.[key] as AnyCmd
}

describe('lf tool register', () => {
  it('sends the parameter names fn_register_tool actually accepts', async () => {
    mockParse.mockReturnValue({
      ok: true,
      kind: 'tool',
      issues: [],
      document: {
        frontmatter: {
          id: 'send-email',
          name: 'Send Email',
          kind: 'tool',
          category: 'comms',
          risk_level: 'destructive',
          approval_rules: ['owner-approval'],
          input_schema: { type: 'object' },
          output_schema: { type: 'object', properties: {} },
        },
        body: 'Sends an email.',
      },
    } as never)
    mockCallRpc.mockResolvedValueOnce({ id: 'tool-uuid' } as never)

    const cmd = await getSubCmd('register')
    await cmd.run?.({ args: { file: 'TOOL.md', apply: true, json: false }, cmd: {}, rawArgs: [] })

    expect(mockCallRpc).toHaveBeenCalledWith(
      'fn_register_tool',
      {
        p_key: 'send-email',
        p_name: 'Send Email',
        p_description: 'Sends an email.',
        p_category: 'comms',
        p_schema_input: { type: 'object' },
        p_schema_output: { type: 'object', properties: {} },
        p_requires_approval: true,
        p_is_dangerous: true,
      },
      { requireAuth: true },
    )
    expect(mockHandleError).not.toHaveBeenCalled()
  })

  it('defaults category, schemas, approval and danger flags when absent', async () => {
    mockParse.mockReturnValue({
      ok: true,
      kind: 'tool',
      issues: [],
      document: {
        frontmatter: { id: 'read-doc', name: 'Read Doc', kind: 'tool', risk_level: 'safe' },
        body: '',
      },
    } as never)
    mockCallRpc.mockResolvedValueOnce({ id: 'tool-2' } as never)

    const cmd = await getSubCmd('register')
    await cmd.run?.({ args: { file: 'TOOL.md', apply: true, json: false }, cmd: {}, rawArgs: [] })

    expect(mockCallRpc).toHaveBeenCalledWith(
      'fn_register_tool',
      expect.objectContaining({
        p_category: 'general',
        p_schema_input: {},
        p_schema_output: {},
        p_requires_approval: false,
        p_is_dangerous: false,
      }),
      { requireAuth: true },
    )
  })

  it('does not call the RPC in dry-run mode', async () => {
    mockParse.mockReturnValue({
      ok: true,
      kind: 'tool',
      issues: [],
      document: { frontmatter: { id: 't', name: 'T', kind: 'tool' }, body: '' },
    } as never)

    const cmd = await getSubCmd('register')
    await cmd.run?.({ args: { file: 'TOOL.md', apply: false, json: false }, cmd: {}, rawArgs: [] })

    expect(mockCallRpc).not.toHaveBeenCalled()
  })

  it('exits 1 without calling the RPC when validation fails', async () => {
    mockParse.mockReturnValue({
      ok: false,
      kind: 'tool',
      issues: [{ path: 'id', message: 'required' }],
      document: undefined,
    } as never)

    const cmd = await getSubCmd('register')
    await cmd.run?.({ args: { file: 'bad.md', apply: true, json: false }, cmd: {}, rawArgs: [] })

    expect(process.exitCode).toBe(1)
    expect(mockCallRpc).not.toHaveBeenCalled()
  })

  it('prints the registry row as JSON with --json', async () => {
    mockParse.mockReturnValue({
      ok: true,
      kind: 'tool',
      issues: [],
      document: { frontmatter: { id: 't', name: 'T', kind: 'tool' }, body: '' },
    } as never)
    mockCallRpc.mockResolvedValueOnce({ id: 'row-id', key: 't' } as never)

    const cmd = await getSubCmd('register')
    await cmd.run?.({ args: { file: 'TOOL.md', apply: true, json: true }, cmd: {}, rawArgs: [] })

    expect(mockPrintJson).toHaveBeenCalledWith({ id: 'row-id', key: 't' })
  })
})

describe('lf tool list', () => {
  it('queries the registry RPC by default', async () => {
    mockCallRpc.mockResolvedValueOnce([{ id: 'a', key: 'k', name: 'n' }] as never)
    const cmd = await getSubCmd('list')
    await cmd.run?.({
      args: { registry: false, assignments: false, profiles: false, agent: '', json: true },
      cmd: {},
      rawArgs: [],
    })
    expect(mockCallRpc).toHaveBeenCalledWith(
      'fn_list_tools_registry',
      { p_owner_lenser_id: null },
      { requireAuth: true },
    )
  })

  it('routes to the assignments RPC when --assignments is set', async () => {
    mockCallRpc.mockResolvedValueOnce([{ id: 'a' }] as never)
    const cmd = await getSubCmd('list')
    await cmd.run?.({
      args: { registry: false, assignments: true, profiles: false, agent: 'agent-1', json: true },
      cmd: {},
      rawArgs: [],
    })
    expect(mockCallRpc).toHaveBeenCalledWith(
      'fn_list_tool_assignments',
      { p_ai_lenser_id: 'agent-1' },
      { requireAuth: true },
    )
  })
})
