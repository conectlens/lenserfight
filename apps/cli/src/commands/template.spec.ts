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
  printTable: jest.fn(),
  printJson: jest.fn(),
  truncate: (s: string, n: number) => (s.length > n ? s.slice(0, n) + '…' : s),
}))
jest.mock('../utils/automation-objects', () => ({
  parseAutomationDocument: jest.fn(),
}))

import consola from 'consola'
import { callRpc, handleError } from '../utils/api'
import { printJson, printTable } from '../utils/output'

const mockCallRpc = callRpc as jest.MockedFunction<typeof callRpc>
const mockHandleError = handleError as jest.MockedFunction<typeof handleError>
const mockPrintJson = printJson as jest.MockedFunction<typeof printJson>
const mockPrintTable = printTable as jest.MockedFunction<typeof printTable>

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyCmd = { run?: (ctx: any) => Promise<void>; subCommands?: Record<string, any> }

beforeEach(() => {
  jest.clearAllMocks()
  process.exitCode = 0
})

async function getSubCmd(key: string): Promise<AnyCmd> {
  const { default: cmd } = (await import('./template')) as { default: AnyCmd }
  const sub = cmd.subCommands?.[key]
  return typeof sub === 'function' ? sub() : (sub as AnyCmd)
}

describe('template create', () => {
  it('creates a template from a battle', async () => {
    mockCallRpc.mockResolvedValueOnce('tpl-new-123' as any)

    const cmd = await getSubCmd('create')
    await cmd.run?.({ args: { 'battle-id': 'battle-1', title: 'My Template', description: 'desc' } })

    expect(mockCallRpc).toHaveBeenCalledWith(
      'fn_templates_create_from_battle',
      { p_battle_id: 'battle-1', p_title: 'My Template', p_description: 'desc' },
      expect.objectContaining({ requireAuth: true }),
    )
    expect(consola.success).toHaveBeenCalledWith(expect.stringContaining('Template created'), expect.anything())
  })

  it('calls handleError on API failure', async () => {
    mockCallRpc.mockRejectedValueOnce(new Error('not found'))

    const cmd = await getSubCmd('create')
    await cmd.run?.({ args: { 'battle-id': 'bad-id', title: 'T', description: '' } })

    expect(mockHandleError).toHaveBeenCalled()
  })
})

describe('template list', () => {
  it('lists available templates', async () => {
    mockCallRpc.mockResolvedValueOnce([
      { id: 'tpl-1', title: 'Quick Battle', created_at: '2026-01-01' },
    ] as any)

    const cmd = await getSubCmd('list')
    await cmd.run?.({ args: { limit: '10', json: false } })

    expect(mockCallRpc).toHaveBeenCalledWith(
      'fn_templates_list',
      { p_limit: 10 },
      expect.objectContaining({ requireAuth: true }),
    )
    expect(mockPrintTable).toHaveBeenCalled()
  })

  it('outputs JSON when --json set', async () => {
    const templates = [{ id: 'tpl-1', title: 'T' }]
    mockCallRpc.mockResolvedValueOnce(templates as any)

    const cmd = await getSubCmd('list')
    await cmd.run?.({ args: { limit: '20', json: true } })

    expect(mockPrintJson).toHaveBeenCalledWith(templates)
  })

  it('reports no templates found', async () => {
    mockCallRpc.mockResolvedValueOnce([] as any)

    const cmd = await getSubCmd('list')
    await cmd.run?.({ args: { limit: '20', json: false } })

    expect(consola.info).toHaveBeenCalledWith('No templates found.')
  })
})
