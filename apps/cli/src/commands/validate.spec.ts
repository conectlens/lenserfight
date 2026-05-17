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
  discoverLenserfightWorkspace: jest.fn(),
  findAutomationFiles: jest.fn(),
  parseAutomationDocument: jest.fn(),
}))
jest.mock('../utils/output', () => ({
  printTable: jest.fn(),
  printJson: jest.fn(),
}))

import consola from 'consola'
import { discoverLenserfightWorkspace, findAutomationFiles, parseAutomationDocument } from '../utils/automation-objects'
import { printJson, printTable } from '../utils/output'

const mockDiscoverWorkspace = discoverLenserfightWorkspace as jest.MockedFunction<typeof discoverLenserfightWorkspace>
const mockFindFiles = findAutomationFiles as jest.MockedFunction<typeof findAutomationFiles>
const mockParse = parseAutomationDocument as jest.MockedFunction<typeof parseAutomationDocument>
const mockPrintJson = printJson as jest.MockedFunction<typeof printJson>
const mockPrintTable = printTable as jest.MockedFunction<typeof printTable>

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyCmd = { run?: (ctx: any) => Promise<void> }

beforeEach(() => {
  jest.clearAllMocks()
  process.exitCode = 0
})

async function getCmd(): Promise<AnyCmd> {
  const { default: cmd } = await import('./validate')
  return cmd as unknown as AnyCmd
}

describe('validate command', () => {
  it('warns and exits 1 when no files found', async () => {
    mockDiscoverWorkspace.mockReturnValue({
      winners: [],
      conflicts: [],
      warnings: [],
    } as any)

    const cmd = await getCmd()
    await cmd.run?.({ args: { path: '.', json: false, 'no-global': false, 'no-recursive': false } })

    expect(consola.warn).toHaveBeenCalledWith(expect.stringContaining('No automation markdown files'), expect.anything())
    expect(process.exitCode).toBe(1)
  })

  it('prints table for valid files', async () => {
    mockDiscoverWorkspace.mockReturnValue({
      winners: [
        { filePath: 'LENS.MD', sourceScope: 'project', result: { ok: true, kind: 'lens', issues: [] } },
      ],
      conflicts: [],
      warnings: [],
    } as any)

    const cmd = await getCmd()
    await cmd.run?.({ args: { path: '.', json: false, 'no-global': false, 'no-recursive': false } })

    expect(mockPrintTable).toHaveBeenCalled()
    expect(process.exitCode).toBe(0)
  })

  it('outputs JSON when --json flag is set', async () => {
    mockDiscoverWorkspace.mockReturnValue({
      winners: [
        { filePath: 'WF.MD', sourceScope: 'project', result: { ok: true, kind: 'workflow', issues: [] } },
      ],
      conflicts: [],
      warnings: [],
    } as any)

    const cmd = await getCmd()
    await cmd.run?.({ args: { path: '.', json: true, 'no-global': false, 'no-recursive': false } })

    expect(mockPrintJson).toHaveBeenCalled()
  })

  it('exits 1 when any file is invalid', async () => {
    mockDiscoverWorkspace.mockReturnValue({
      winners: [
        { filePath: 'BAD.MD', sourceScope: 'project', result: { ok: false, kind: 'lens', issues: [{ path: 'id', message: 'required' }] } },
      ],
      conflicts: [],
      warnings: [],
    } as any)

    const cmd = await getCmd()
    await cmd.run?.({ args: { path: '.', json: false, 'no-global': false, 'no-recursive': false } })

    expect(process.exitCode).toBe(1)
  })

  it('uses findAutomationFiles when explicit path is given', async () => {
    mockFindFiles.mockReturnValue(['my-lens.md'])
    mockParse.mockReturnValue({ ok: true, kind: 'lens', issues: [], document: {} } as any)

    const cmd = await getCmd()
    await cmd.run?.({ args: { path: 'my-lens.md', json: false, 'no-global': false, 'no-recursive': false } })

    expect(mockFindFiles).toHaveBeenCalledWith('my-lens.md')
    expect(mockPrintTable).toHaveBeenCalled()
  })
})
