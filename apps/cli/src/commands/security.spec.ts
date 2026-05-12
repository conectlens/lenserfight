jest.mock('citty', () => ({ defineCommand: (opts: unknown) => opts }))
jest.mock('../utils/api', () => ({
  callRpc: jest.fn(),
  handleError: jest.fn((err: unknown) => { throw err }),
}))
jest.mock('../utils/output', () => ({
  printTable: jest.fn(),
}))
jest.mock('consola', () => ({
  __esModule: true,
  default: {
    success: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
  },
}))

import { callRpc } from '../utils/api'
import securityCommand from './security'

const mockCallRpc = callRpc as jest.MockedFunction<typeof callRpc>

beforeEach(() => {
  jest.clearAllMocks()
  process.exitCode = 0
})

describe('lf security rls-audit', () => {
  const rlsAuditCmd = securityCommand.subCommands?.['rls-audit']

  it('exits 0 when schema is clean (no unprotected tables, no missing search_path)', async () => {
    mockCallRpc
      .mockResolvedValueOnce([])  // fn_rls_unprotected_tables
      .mockResolvedValueOnce([])  // fn_security_definer_no_search_path

    await (rlsAuditCmd as { run: (ctx: unknown) => Promise<void> }).run({ args: { json: false } })

    expect(process.exitCode).toBeFalsy()
  })

  it('exits 1 and reports table name when an unprotected table is found', async () => {
    mockCallRpc
      .mockResolvedValueOnce([{ schema_name: 'agents', table_name: 'leaked_table' }])
      .mockResolvedValueOnce([])

    await (rlsAuditCmd as { run: (ctx: unknown) => Promise<void> }).run({ args: { json: false } })

    expect(process.exitCode).toBe(1)
  })

  it('exits 1 when a SECURITY DEFINER function is missing search_path', async () => {
    mockCallRpc
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([{
        schema_name: 'public',
        function_name: 'fn_bad_definer',
        full_signature: 'p_x uuid',
      }])

    await (rlsAuditCmd as { run: (ctx: unknown) => Promise<void> }).run({ args: { json: false } })

    expect(process.exitCode).toBe(1)
  })
})
