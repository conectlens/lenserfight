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
jest.mock('../utils/automation-objects', () => ({
  parseAutomationDocument: jest.fn(),
}))
jest.mock('../utils/output', () => ({
  printJson: jest.fn(),
}))

import consola from 'consola'
import { parseAutomationDocument } from '../utils/automation-objects'
import { printJson } from '../utils/output'

const mockParse = parseAutomationDocument as jest.MockedFunction<typeof parseAutomationDocument>
const mockPrintJson = printJson as jest.MockedFunction<typeof printJson>

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyCmd = { run?: (ctx: any) => Promise<void> }

beforeEach(() => {
  jest.clearAllMocks()
  process.exitCode = 0
})

async function getCmd(): Promise<AnyCmd> {
  const { default: cmd } = await import('./evaluate')
  return cmd as unknown as AnyCmd
}

describe('evaluate command', () => {
  it('exits 1 on invalid evaluation file', async () => {
    mockParse.mockReturnValue({
      ok: false,
      kind: 'evaluation',
      issues: [{ path: 'id', message: 'required' }],
      document: null,
    } as any)

    const cmd = await getCmd()
    await cmd.run?.({ args: { file: 'EVAL.md', json: false } })

    expect(consola.error).toHaveBeenCalledWith(expect.stringContaining('Evaluation validation failed'), expect.anything())
    expect(process.exitCode).toBe(1)
  })

  it('exits 1 when kind is not evaluation', async () => {
    mockParse.mockReturnValue({
      ok: true,
      kind: 'lens',
      issues: [],
      document: { frontmatter: {} },
    } as any)

    const cmd = await getCmd()
    await cmd.run?.({ args: { file: 'EVAL.md', json: false } })

    expect(process.exitCode).toBe(1)
  })

  it('prints success message for valid evaluation', async () => {
    mockParse.mockReturnValue({
      ok: true,
      kind: 'evaluation',
      issues: [],
      document: {
        frontmatter: {
          id: 'eval-1',
          name: 'My Eval',
          rubric_ref: 'rubric-1',
          dataset_ref: null,
          metrics: ['accuracy', 'fluency'],
          judge_agent_ref: 'judge-1',
        },
      },
    } as any)

    const cmd = await getCmd()
    await cmd.run?.({ args: { file: 'EVAL.md', json: false } })

    expect(consola.success).toHaveBeenCalledWith('Evaluation spec is valid.')
    expect(process.exitCode).toBe(0)
  })

  it('outputs JSON when --json flag is set', async () => {
    mockParse.mockReturnValue({
      ok: true,
      kind: 'evaluation',
      issues: [],
      document: {
        frontmatter: {
          id: 'eval-2',
          name: 'JSON Test',
          rubric_ref: null,
          dataset_ref: null,
          metrics: [],
          judge_agent_ref: null,
        },
      },
    } as any)

    const cmd = await getCmd()
    await cmd.run?.({ args: { file: 'EVAL.md', json: true } })

    expect(mockPrintJson).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'eval-2', name: 'JSON Test' }),
    )
  })
})
