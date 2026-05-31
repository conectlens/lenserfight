jest.mock('citty', () => ({ defineCommand: (opts: unknown) => opts }))
jest.mock('node:fs', () => ({
  readFileSync: jest.fn(() => 'support_level developer_summary'),
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

import { callRpc, handleError } from '../utils/api'
import { printJson, printSuccess, printWarn } from '../utils/output'

const mockCallRpc = callRpc as jest.MockedFunction<typeof callRpc>
const mockHandleError = handleError as jest.MockedFunction<typeof handleError>
const mockPrintJson = printJson as jest.MockedFunction<typeof printJson>
const mockPrintSuccess = printSuccess as jest.MockedFunction<typeof printSuccess>
const mockPrintWarn = printWarn as jest.MockedFunction<typeof printWarn>

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyCmd = { run?: (ctx: any) => Promise<void> }

beforeEach(() => {
  jest.clearAllMocks()
  process.exitCode = 0
})

async function getCmd(): Promise<AnyCmd> {
  const { default: cmd } = (await import('./ai')) as { default: AnyCmd }
  return cmd
}

function mockCatalog(providers: unknown[], models: unknown[]): void {
  mockCallRpc.mockResolvedValueOnce(providers as never).mockResolvedValueOnce(models as never)
}

describe('lf ai catalog validation', () => {
  it('passes and exits 0 when providers and models are well-formed', async () => {
    mockCatalog(
      [{ key: 'anthropic', support_level: 'runnable', docs_url: 'https://x' }],
      [
        {
          provider_key: 'anthropic',
          key: 'claude',
          support_level: 'runnable',
          capabilities: ['chat'],
          docs_url: 'https://x',
        },
      ],
    )

    const cmd = await getCmd()
    await cmd.run?.({ args: { json: false } })

    expect(mockPrintSuccess).toHaveBeenCalled()
    expect(process.exitCode).toBe(0)
    expect(mockHandleError).not.toHaveBeenCalled()
  })

  it('flags a model whose provider is missing from the catalog and exits 1', async () => {
    mockCatalog(
      [{ key: 'anthropic', support_level: 'runnable', docs_url: 'https://x' }],
      [
        {
          provider_key: 'ghost',
          key: 'm',
          support_level: 'runnable',
          capabilities: ['chat'],
          docs_url: 'https://x',
        },
      ],
    )

    const cmd = await getCmd()
    await cmd.run?.({ args: { json: false } })

    expect(mockPrintWarn).toHaveBeenCalled()
    expect(process.exitCode).toBe(1)
  })

  it('flags invalid support_level and unknown capability', async () => {
    mockCatalog(
      [{ key: 'p', support_level: 'bogus', docs_url: 'https://x' }],
      [
        {
          provider_key: 'p',
          key: 'm',
          support_level: 'runnable',
          capabilities: ['telepathy'],
          docs_url: 'https://x',
        },
      ],
    )

    const cmd = await getCmd()
    await cmd.run?.({ args: { json: true } })

    const payload = mockPrintJson.mock.calls[0][0] as {
      valid: boolean
      issues: Array<{ issue: string }>
    }
    expect(payload.valid).toBe(false)
    expect(payload.issues.some((i) => i.issue === 'invalid support_level')).toBe(true)
    expect(payload.issues.some((i) => i.issue.includes('unknown capability'))).toBe(true)
    expect(process.exitCode).toBe(1)
  })

  it('--json on a clean catalog prints payload and exits 0', async () => {
    mockCatalog(
      [{ key: 'p', support_level: 'runnable', docs_url: 'https://x' }],
      [
        {
          provider_key: 'p',
          key: 'm',
          support_level: 'runnable',
          capabilities: ['chat'],
          docs_url: 'https://x',
        },
      ],
    )

    const cmd = await getCmd()
    await cmd.run?.({ args: { json: true } })

    const payload = mockPrintJson.mock.calls[0][0] as { valid: boolean }
    expect(payload.valid).toBe(true)
    expect(process.exitCode).toBe(0)
  })
})
