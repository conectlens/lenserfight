jest.mock('citty', () => ({ defineCommand: (opts: unknown) => opts }))
jest.mock('consola', () => ({
  __esModule: true,
  default: {
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
    success: jest.fn(),
    start: jest.fn(),
    log: jest.fn(),
  },
}))
jest.mock('../utils/api', () => ({
  callRpc: jest.fn(),
  callRest: jest.fn(),
  handleError: jest.fn(),
}))
jest.mock('../utils/output', () => ({
  printTable: jest.fn(),
  printJson: jest.fn(),
  truncate: (s: string, n: number) => (s.length > n ? s.slice(0, n) + '…' : s),
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
  const { default: cmd } = (await import('./media')) as { default: AnyCmd }
  const sub = cmd.subCommands?.[key]
  return typeof sub === 'function' ? sub() : (sub as AnyCmd)
}

describe('media list', () => {
  it('lists media assets via fn_list_media_objects', async () => {
    mockCallRpc.mockResolvedValueOnce([
      { id: 'media-1', filename: 'photo.png', media_type: 'image', byte_size: 1024, created_at: '2026-01-01' },
    ] as any)

    const cmd = await getSubCmd('list')
    await cmd.run?.({ args: { run: '', limit: '20', json: false } })

    expect(mockCallRpc).toHaveBeenCalledWith(
      'fn_list_media_objects',
      expect.objectContaining({ p_limit: 20 }),
      { requireAuth: true },
    )
    expect(mockPrintTable).toHaveBeenCalled()
  })

  it('outputs JSON when --json set', async () => {
    const assets = [{ id: 'media-1', filename: 'a.png', created_at: '2026-01-01' }]
    mockCallRpc.mockResolvedValueOnce(assets as any)

    const cmd = await getSubCmd('list')
    await cmd.run?.({ args: { run: '', limit: '20', json: true } })

    expect(mockPrintJson).toHaveBeenCalledWith(assets)
  })

  it('calls handleError on failure', async () => {
    mockCallRpc.mockRejectedValueOnce(new Error('network'))

    const cmd = await getSubCmd('list')
    await cmd.run?.({ args: { run: '', limit: '20', json: false } })

    expect(mockHandleError).toHaveBeenCalled()
  })
})

describe('media delete', () => {
  it('deletes media by ID with --force flag', async () => {
    mockCallRpc.mockResolvedValueOnce(null as any)

    const cmd = await getSubCmd('delete')
    await cmd.run?.({ args: { id: 'media-123', force: true } })

    expect(mockCallRpc).toHaveBeenCalled()
    expect(consola.success).toHaveBeenCalled()
  })

  it('calls handleError on failure', async () => {
    mockCallRpc.mockRejectedValueOnce(new Error('not found'))

    const cmd = await getSubCmd('delete')
    await cmd.run?.({ args: { id: 'bad-id', force: true } })

    expect(mockHandleError).toHaveBeenCalled()
  })

  it('refuses to delete without --force and sets exit code 1', async () => {
    const cmd = await getSubCmd('delete')
    await cmd.run?.({ args: { id: 'media-123', force: false } })

    expect(mockCallRpc).not.toHaveBeenCalled()
    expect(process.exitCode).toBe(1)
    expect(consola.warn).toHaveBeenCalled()
  })
})

describe('media set-visibility', () => {
  it('rejects an invalid visibility value via handleError', async () => {
    const cmd = await getSubCmd('set-visibility')
    await cmd.run?.({ args: { id: 'media-1', visibility: 'bogus' } })

    expect(mockCallRpc).not.toHaveBeenCalled()
    expect(mockHandleError).toHaveBeenCalled()
  })

  it('calls fn_toggle_media_visibility for a valid value', async () => {
    mockCallRpc.mockResolvedValueOnce(undefined as any)

    const cmd = await getSubCmd('set-visibility')
    await cmd.run?.({ args: { id: 'media-1', visibility: 'public' } })

    expect(mockCallRpc).toHaveBeenCalledWith(
      'fn_toggle_media_visibility',
      { p_object_id: 'media-1', p_visibility: 'public' },
      { requireAuth: true },
    )
  })
})
