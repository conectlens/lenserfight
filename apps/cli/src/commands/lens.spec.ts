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
jest.mock('../lib/data-services/ai-generate', () => ({
  generateCreation: jest.fn(),
  resolveProfileId: jest.fn(),
  normalizeFunding: (v: string) => v,
}))

import consola from 'consola'
import { callRpc, handleError } from '../utils/api'
import { generateCreation, resolveProfileId } from '../lib/data-services/ai-generate'
import { printJson } from '../utils/output'

const mockCallRpc = callRpc as jest.MockedFunction<typeof callRpc>
const mockHandleError = handleError as jest.MockedFunction<typeof handleError>
const mockPrintJson = printJson as jest.MockedFunction<typeof printJson>
const mockGenerateCreation = generateCreation as jest.MockedFunction<typeof generateCreation>
const mockResolveProfileId = resolveProfileId as jest.MockedFunction<typeof resolveProfileId>

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

describe('lens version list', () => {
  async function getVersionList(): Promise<AnyCmd> {
    const versionGroup = await getSubCmd('version')
    return versionGroup.subCommands?.list as AnyCmd
  }

  it('emits an empty JSON array (not an info line) when no versions and --json set', async () => {
    mockCallRpc.mockResolvedValueOnce([] as any)

    const cmd = await getVersionList()
    await cmd.run?.({ args: { id: 'lens-1', json: true } })

    expect(mockPrintJson).toHaveBeenCalledWith([])
    expect(consola.info).not.toHaveBeenCalled()
  })
})

describe('lens generate', () => {
  const baseArgs = {
    prompt: 'a lens',
    funding: 'platform_credit',
    'byok-key-ref': '',
    'local-key-id': '',
    provider: 'openai',
    model: 'gpt-4o-mini',
    create: false,
    json: false,
  }

  it('generates and prints without creating when --create is omitted', async () => {
    mockResolveProfileId.mockResolvedValueOnce('user-1')
    mockGenerateCreation.mockResolvedValueOnce({
      type: 'lens',
      result: { title: 'AI Lens', content: 'A'.repeat(60), description: 'desc', suggestedTagSlugs: [], params: [] },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any)

    const cmd = await getSubCmd('generate')
    await cmd.run?.({ args: { ...baseArgs } })

    expect(mockGenerateCreation).toHaveBeenCalledWith(
      expect.objectContaining({ generationType: 'lens', profileId: 'user-1', funding: 'platform_credit' }),
    )
    expect(mockCallRpc).not.toHaveBeenCalled()
  })

  it('creates the lens from the generated content when --create is set', async () => {
    mockResolveProfileId.mockResolvedValueOnce('user-1')
    mockGenerateCreation.mockResolvedValueOnce({
      type: 'lens',
      result: { title: 'AI Lens', content: 'A'.repeat(60), description: 'desc', suggestedTagSlugs: [], params: [] },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any)
    mockCallRpc.mockResolvedValueOnce('lens-99' as never)

    const cmd = await getSubCmd('generate')
    await cmd.run?.({ args: { ...baseArgs, create: true, json: true } })

    expect(mockCallRpc).toHaveBeenCalledWith(
      'fn_create_lens',
      expect.objectContaining({ p_title: 'AI Lens', p_template_body: 'A'.repeat(60) }),
      expect.objectContaining({ requireAuth: true }),
    )
    expect(mockPrintJson).toHaveBeenCalledWith({ id: 'lens-99' })
  })

  it('refuses to create when generated content is too short', async () => {
    mockResolveProfileId.mockResolvedValueOnce('user-1')
    mockGenerateCreation.mockResolvedValueOnce({
      type: 'lens',
      result: { title: 'AI Lens', content: 'short', description: '', suggestedTagSlugs: [], params: [] },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any)

    const cmd = await getSubCmd('generate')
    await cmd.run?.({ args: { ...baseArgs, create: true } })

    expect(mockCallRpc).not.toHaveBeenCalled()
    expect(process.exitCode).toBe(1)
  })
})
