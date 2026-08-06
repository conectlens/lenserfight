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
jest.mock('@lenserfight/cli-client', () => ({
  ...jest.requireActual('@lenserfight/cli-client'),
  callRpc: jest.fn(),
  callRest: jest.fn(),
  handleError: jest.fn(),
  isAuthenticated: jest.fn(() => false),
  getUserInfo: jest.fn(),
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

import { callRpc } from '@lenserfight/cli-client'
import consola from 'consola'

import { WORKFLOW_NODE_CATALOG, getWorkflowNodeCatalogEntry } from '@lenserfight/infra/execution/catalog'

import { generateCreation, resolveProfileId } from '../lib/data-services/ai-generate'
import { parseAutomationDocument } from '../utils/automation-objects'
import { printJson, printTable } from '../utils/output'

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
let LOCAL_EXECUTABLE_NODE_TYPES: readonly string[]

beforeAll(async () => {
  const mod = await import('./workflow')
  workflowCmd = mod.default as AnyCmd
  LOCAL_EXECUTABLE_NODE_TYPES = mod.LOCAL_EXECUTABLE_NODE_TYPES
})

beforeEach(() => {
  jest.clearAllMocks()
  process.exitCode = 0
})

afterEach(() => {
  // Guard against a test that sets process.exitCode = 1 (e.g. an error path)
  // leaking into the real Jest process exit code when it's the last test to run.
  process.exitCode = 0
})

describe('workflow export', () => {
  let exportCmd: AnyCmd

  beforeAll(() => {
    exportCmd = workflowCmd.subCommands?.export as AnyCmd
  })

  it('renders the fetched workflow as YAML and writes it to stdout', async () => {
    mockCallRpc.mockResolvedValueOnce([
      {
        workflow: {
          id: 'wf-1',
          title: 'Research pipeline',
          description: 'Two-step flow',
          visibility: 'private',
        },
        nodes: [],
        edges: [],
      },
    ] as never)

    const stdoutSpy = jest.spyOn(process.stdout, 'write').mockImplementation(() => true)
    await exportCmd.run?.({ args: { id: 'wf-1', format: 'yaml', out: '' } })
    const written = stdoutSpy.mock.calls.map((c) => c[0]).join('')
    stdoutSpy.mockRestore()

    expect(mockCallRpc).toHaveBeenCalledWith('fn_get_workflow_bootstrap', { p_workflow_id: 'wf-1' }, expect.objectContaining({ requireAuth: true }))
    expect(written).toContain('kind: "workflow"')
    expect(written).toContain('id: "wf-1"')
  })
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

describe('EXECUTABLE_NODE_TYPES catalog drift guard', () => {
  it('every locally-executable node type exists in the canonical catalog', () => {
    for (const type of LOCAL_EXECUTABLE_NODE_TYPES) {
      expect(getWorkflowNodeCatalogEntry(type)).toBeDefined()
    }
  })
})

describe('workflow node-types', () => {
  let nodeTypesCmd: AnyCmd

  beforeAll(() => {
    nodeTypesCmd = workflowCmd.subCommands?.['node-types'] as AnyCmd
  })

  it('lists every catalog node type as a table by default', async () => {
    await nodeTypesCmd?.run?.({ args: { category: '', json: false } })

    expect(mockPrintTable).toHaveBeenCalledWith(
      ['Type', 'Category', 'Name', 'Description'],
      expect.any(Array),
    )
    const [, rows] = mockPrintTable.mock.calls[0]
    expect(rows).toHaveLength(WORKFLOW_NODE_CATALOG.length)
  })

  it('filters by category', async () => {
    await nodeTypesCmd?.run?.({ args: { category: 'trigger', json: false } })

    const [, rows] = mockPrintTable.mock.calls[0]
    const expectedCount = WORKFLOW_NODE_CATALOG.filter((e) => e.category === 'trigger').length
    expect(rows).toHaveLength(expectedCount)
    expect(expectedCount).toBeGreaterThan(0)
  })

  it('outputs JSON matching the catalog when --json is set', async () => {
    await nodeTypesCmd?.run?.({ args: { category: '', json: true } })

    expect(mockPrintJson).toHaveBeenCalled()
    const [jsonArg] = mockPrintJson.mock.calls[0] as [Array<{ type: string }>]
    expect(jsonArg).toHaveLength(WORKFLOW_NODE_CATALOG.length)
    expect(jsonArg.map((e) => e.type).sort()).toEqual(WORKFLOW_NODE_CATALOG.map((e) => e.type).sort())
  })

  it('warns when a filter matches nothing', async () => {
    await nodeTypesCmd?.run?.({ args: { category: 'not-a-real-category', json: false } })

    expect(consolaWarn).toHaveBeenCalled()
    expect(mockPrintTable).not.toHaveBeenCalled()
  })
})

describe('workflow node-type', () => {
  let nodeTypeCmd: AnyCmd

  beforeAll(() => {
    nodeTypeCmd = workflowCmd.subCommands?.['node-type'] as AnyCmd
  })

  it('describes a known node type', async () => {
    await nodeTypeCmd?.run?.({ args: { type: 'lens_execute', json: false } })

    expect(consolaSuccess).toHaveBeenCalledWith('%s (%s)', expect.any(String), 'lens_execute')
    expect(process.exitCode).toBe(0)
  })

  it('outputs the full catalog entry as JSON when --json is set', async () => {
    await nodeTypeCmd?.run?.({ args: { type: 'lens_execute', json: true } })

    expect(mockPrintJson).toHaveBeenCalledWith(getWorkflowNodeCatalogEntry('lens_execute'))
  })

  it('exits non-zero with a clear error for an unknown type', async () => {
    await nodeTypeCmd?.run?.({ args: { type: 'not_a_real_node_type', json: false } })

    expect(consolaError).toHaveBeenCalledWith('Unknown node type: %s', 'not_a_real_node_type')
    expect(process.exitCode).toBe(1)
    expect(mockPrintJson).not.toHaveBeenCalled()
  })
})
