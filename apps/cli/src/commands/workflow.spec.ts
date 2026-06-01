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
  callRest: jest.fn(),
  handleError: jest.fn(),
}))
jest.mock('../utils/workflow-ref', () => ({
  resolveWorkflowId: jest.fn((id: string) => Promise.resolve(id)),
}))
jest.mock('../utils/automation-objects', () => ({
  buildWorkflowSimulationReport: jest.fn().mockReturnValue({ nodes: [], edges: [], summary: 'ok' }),
  parseAutomationDocument: jest.fn(),
  writeWorkflowSimulationArtifacts: jest.fn().mockReturnValue({
    jsonPath: '/tmp/run.json',
    reportPath: '/tmp/run.md',
  }),
}))
jest.mock('../utils/output', () => ({
  printJson: jest.fn(),
  printTable: jest.fn(),
  truncate: jest.fn((s: string) => s),
}))
jest.mock('../utils/lifecycle', () => ({
  makeLifecycleCommand: jest.fn().mockReturnValue({
    meta: { name: 'lifecycle' },
    run: jest.fn(),
  }),
}))
jest.mock('../lib/data-services/ai-generate', () => ({
  generateCreation: jest.fn(),
  resolveProfileId: jest.fn(),
  normalizeFunding: (v: string) => v,
}))

import consola from 'consola'
import { parseAutomationDocument } from '../utils/automation-objects'
import { printJson, printTable } from '../utils/output'
import { callRpc } from '../utils/api'
import { generateCreation, resolveProfileId } from '../lib/data-services/ai-generate'

const mockParseAutomationDocument = parseAutomationDocument as jest.MockedFunction<typeof parseAutomationDocument>
const mockPrintJson = printJson as jest.MockedFunction<typeof printJson>
const mockPrintTable = printTable as jest.MockedFunction<typeof printTable>
const mockCallRpc = callRpc as jest.MockedFunction<typeof callRpc>
const mockGenerateCreation = generateCreation as jest.MockedFunction<typeof generateCreation>
const mockResolveProfileId = resolveProfileId as jest.MockedFunction<typeof resolveProfileId>
const consolaError = (consola as unknown as { error: jest.Mock }).error
const consolaWarn = (consola as unknown as { warn: jest.Mock }).warn
const consolaInfo = (consola as unknown as { info: jest.Mock }).info
const consolaSuccess = (consola as unknown as { success: jest.Mock }).success

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyCmd = { subCommands?: Record<string, AnyCmd>; run?: (ctx: any) => Promise<void> }

let workflowCmd: AnyCmd

beforeAll(async () => {
  workflowCmd = (await import('./workflow')).default as AnyCmd
})

beforeEach(() => {
  jest.clearAllMocks()
  process.exitCode = 0
})

describe('workflow run', () => {
  let runCmd: AnyCmd

  beforeAll(() => {
    runCmd = workflowCmd.subCommands?.run as AnyCmd
  })

  it('errors when file cannot be parsed', async () => {
    mockParseAutomationDocument.mockReturnValue({
      ok: false,
      kind: 'unknown',
      document: null,
      errors: ['invalid frontmatter'],
      issues: [{ path: 'frontmatter', message: 'invalid frontmatter' }],
    } as never)

    await runCmd?.run?.({ args: { file: 'WORKFLOW.md', inputs: '', json: false }, cmd: {}, rawArgs: [] })

    expect(consolaError).toHaveBeenCalled()
    expect(process.exitCode).toBe(1)
  })

  it('outputs JSON when --json flag is set with valid workflow', async () => {
    mockParseAutomationDocument.mockReturnValue({
      ok: true,
      kind: 'workflow',
      document: { frontmatter: { name: 'test', version: '1.0.0' }, steps: [] },
      errors: [],
    } as never)

    await runCmd?.run?.({ args: { file: 'WORKFLOW.md', inputs: '', json: true }, cmd: {}, rawArgs: [] })

    expect(mockPrintJson).toHaveBeenCalled()
  })

  it('reports all steps executable when all types are in EXECUTABLE_NODE_TYPES', async () => {
    mockParseAutomationDocument.mockReturnValue({
      ok: true,
      kind: 'workflow',
      document: {
        frontmatter: {
          name: 'exec-only',
          id: 'exec-only',
          slug: 'exec-only',
          steps: [
            { id: 'step1', type: 'lens' },
            { id: 'step2', type: 'if_condition' },
          ],
        },
      },
      errors: [],
    } as never)

    await runCmd?.run?.({ args: { file: 'WORKFLOW.md', inputs: '', json: false }, cmd: {}, rawArgs: [] })

    expect(consolaSuccess).toHaveBeenCalledWith(expect.stringContaining('All'), expect.anything())
    expect(consolaWarn).not.toHaveBeenCalledWith(
      expect.stringContaining('design-only'),
      expect.anything(),
      expect.anything(),
    )
  })

  it('warns and shows design-only count when non-executable steps are present', async () => {
    mockParseAutomationDocument.mockReturnValue({
      ok: true,
      kind: 'workflow',
      document: {
        frontmatter: {
          name: 'mixed',
          id: 'mixed',
          slug: 'mixed',
          steps: [
            { id: 'step1', type: 'lens' },
            { id: 'step2', type: 'http_request' }, // design-only
            { id: 'step3', type: 'send_email' },   // design-only
          ],
        },
      },
      errors: [],
    } as never)

    await runCmd?.run?.({ args: { file: 'WORKFLOW.md', inputs: '', json: false }, cmd: {}, rawArgs: [] })

    expect(consolaWarn).toHaveBeenCalledWith(
      expect.stringContaining('design-only'),
      2,
      3,
    )
    expect(mockPrintTable).toHaveBeenCalled()
  })

  it('JSON output includes step_details and executable/design-only counts', async () => {
    mockParseAutomationDocument.mockReturnValue({
      ok: true,
      kind: 'workflow',
      document: {
        frontmatter: {
          name: 'counts-test',
          id: 'counts-test',
          slug: 'counts-test',
          steps: [
            { id: 's1', type: 'lens' },
            { id: 's2', type: 'database_query' }, // design-only
          ],
        },
      },
      errors: [],
    } as never)

    await runCmd?.run?.({ args: { file: 'WORKFLOW.md', inputs: '', json: true }, cmd: {}, rawArgs: [] })

    expect(mockPrintJson).toHaveBeenCalled()
    const [jsonArg] = mockPrintJson.mock.calls[0]
    expect(jsonArg).toMatchObject({
      executable_step_count: 1,
      design_only_step_count: 1,
      status: 'partial',
      step_details: expect.arrayContaining([
        expect.objectContaining({ id: 's1', type: 'lens', classification: 'executable' }),
        expect.objectContaining({ id: 's2', type: 'database_query', classification: 'design-only' }),
      ]),
    })
  })

  it('reports status=blocked when workflow has no steps', async () => {
    mockParseAutomationDocument.mockReturnValue({
      ok: true,
      kind: 'workflow',
      document: {
        frontmatter: { name: 'empty', id: 'empty', slug: 'empty', steps: [] },
      },
      errors: [],
    } as never)

    await runCmd?.run?.({ args: { file: 'WORKFLOW.md', inputs: '', json: true }, cmd: {}, rawArgs: [] })

    const [jsonArg] = mockPrintJson.mock.calls[0]
    expect(jsonArg).toMatchObject({ status: 'blocked', step_count: 0 })
  })
})

describe('workflow create', () => {
  let createCmd: AnyCmd

  beforeAll(() => {
    createCmd = workflowCmd.subCommands?.create as AnyCmd
  })

  it('prints the slug without a stray leading colon', async () => {
    mockCallRpc.mockResolvedValueOnce({ id: 'wf-1', slug: 'my-pipeline', title: 'My Pipeline' } as never)

    await createCmd?.run?.({
      args: { name: 'My Pipeline', template: '', description: '', json: false },
      cmd: {},
      rawArgs: [],
    })

    expect(consolaInfo).toHaveBeenCalledWith('Slug: %s', 'my-pipeline')
    expect(consolaInfo).not.toHaveBeenCalledWith('Slug: :%s', expect.anything())
  })

  it('rejects an unknown template before calling the RPC', async () => {
    await createCmd?.run?.({
      args: { name: 'X', template: 'not-a-template', description: '', json: false },
      cmd: {},
      rawArgs: [],
    })

    expect(mockCallRpc).not.toHaveBeenCalled()
    expect(consolaError).toHaveBeenCalled()
    expect(process.exitCode).toBe(1)
  })
})

describe('workflow generate', () => {
  function getSub(key: string): AnyCmd {
    const sub = workflowCmd.subCommands?.[key]
    return (typeof sub === 'function' ? (sub as () => AnyCmd)() : sub) as AnyCmd
  }
  const baseArgs = {
    prompt: 'a flow',
    funding: 'platform_credit',
    'byok-key-ref': '',
    'local-key-id': '',
    provider: 'openai',
    model: 'gpt-4o-mini',
    create: false,
    json: false,
  }

  it('generates without creating when --create is omitted', async () => {
    mockResolveProfileId.mockResolvedValueOnce('user-1')
    mockGenerateCreation.mockResolvedValueOnce({
      type: 'workflow',
      result: { title: 'Flow', description: 'd', suggestedLensIds: [] },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any)

    await getSub('generate').run?.({ args: { ...baseArgs } })

    expect(mockGenerateCreation).toHaveBeenCalledWith(expect.objectContaining({ generationType: 'workflow' }))
    expect(mockCallRpc).not.toHaveBeenCalled()
  })

  it('creates the workflow from the generated result with --create', async () => {
    mockResolveProfileId.mockResolvedValueOnce('user-1')
    mockGenerateCreation.mockResolvedValueOnce({
      type: 'workflow',
      result: { title: 'Flow', description: 'd', suggestedLensIds: [] },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any)
    mockCallRpc.mockResolvedValueOnce({ id: 'wf-1', title: 'Flow' } as never)

    await getSub('generate').run?.({ args: { ...baseArgs, create: true } })

    expect(mockCallRpc).toHaveBeenCalledWith(
      'fn_create_workflow',
      expect.objectContaining({ p_title: 'Flow' }),
      expect.objectContaining({ requireAuth: true }),
    )
  })
})
