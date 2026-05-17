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
  handleError: jest.fn(),
}))
jest.mock('../utils/output', () => ({
  printTable: jest.fn(),
  printJson: jest.fn(),
  truncate: (s: string, n: number) => (s.length > n ? s.slice(0, n) + '…' : s),
}))
jest.mock('../lib/onboarding/journey', () => ({
  markJourneyStep: jest.fn(),
}))
jest.mock('../utils/lifecycle', () => ({
  makeLifecycleCommand: jest.fn(() => ({ meta: { name: 'mock' }, run: jest.fn() })),
}))

import consola from 'consola'
import { callRpc, handleError } from '../utils/api'
import { printJson } from '../utils/output'

const mockCallRpc = callRpc as jest.MockedFunction<typeof callRpc>
const mockHandleError = handleError as jest.MockedFunction<typeof handleError>
const mockPrintJson = printJson as jest.MockedFunction<typeof printJson>

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyCmd = { run?: (ctx: any) => Promise<void>; subCommands?: Record<string, any> }

beforeEach(() => {
  jest.clearAllMocks()
  process.exitCode = 0
})

async function getSubCmd(key: string): Promise<AnyCmd> {
  const { default: cmd } = (await import('./lens')) as { default: AnyCmd }
  const sub = cmd.subCommands?.[key]
  return typeof sub === 'function' ? sub() : (sub as AnyCmd)
}

describe('lens create', () => {
  it('rejects invalid visibility', async () => {
    const cmd = await getSubCmd('create')
    await cmd.run?.({ args: { title: 'Test', body: 'x'.repeat(60), 'from-file': '', visibility: 'invalid', language: 'en', json: false, description: '' } })

    expect(consola.error).toHaveBeenCalledWith(expect.stringContaining('Invalid --visibility'), expect.anything(), expect.anything())
    expect(process.exitCode).toBe(1)
  })

  it('rejects when both --body and --from-file provided', async () => {
    const cmd = await getSubCmd('create')
    await cmd.run?.({ args: { title: 'Test', body: 'stuff', 'from-file': 'file.md', visibility: 'public', language: 'en', json: false, description: '' } })

    expect(consola.error).toHaveBeenCalledWith(expect.stringContaining('only one of'))
    expect(process.exitCode).toBe(1)
  })

  it('creates lens with valid inline body', async () => {
    mockCallRpc.mockResolvedValueOnce({ lens_id: 'lens-new' } as any)

    const body = 'A'.repeat(60) // exceeds MIN_TEMPLATE_LENGTH
    const cmd = await getSubCmd('create')
    await cmd.run?.({ args: { title: 'My Lens', body, 'from-file': '', visibility: 'public', language: 'en', json: false, description: 'desc' } })

    expect(mockCallRpc).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ p_title: 'My Lens' }),
      expect.objectContaining({ requireAuth: true }),
    )
  })

  it('calls handleError on API failure', async () => {
    mockCallRpc.mockRejectedValueOnce(new Error('failed'))

    const cmd = await getSubCmd('create')
    await cmd.run?.({ args: { title: 'Fail', body: 'B'.repeat(60), 'from-file': '', visibility: 'public', language: 'en', json: false, description: '' } })

    expect(mockHandleError).toHaveBeenCalled()
  })
})
