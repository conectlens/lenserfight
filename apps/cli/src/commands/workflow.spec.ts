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
jest.mock('../utils/automation-objects', () => ({
  buildWorkflowSimulationReport: jest.fn().mockReturnValue({ nodes: [], edges: [], summary: 'ok' }),
  parseAutomationDocument: jest.fn(),
  writeWorkflowSimulationArtifacts: jest.fn(),
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

import consola from 'consola'
import { parseAutomationDocument } from '../utils/automation-objects'
import { printJson } from '../utils/output'

const mockParseAutomationDocument = parseAutomationDocument as jest.MockedFunction<typeof parseAutomationDocument>
const mockPrintJson = printJson as jest.MockedFunction<typeof printJson>
const consolaError = (consola as unknown as { error: jest.Mock }).error

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
})
