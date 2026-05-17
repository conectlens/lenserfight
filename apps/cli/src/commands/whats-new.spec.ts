jest.mock('citty', () => ({ defineCommand: (opts: unknown) => opts }))
jest.mock('consola', () => ({
  __esModule: true,
  default: { error: jest.fn(), warn: jest.fn(), info: jest.fn(), success: jest.fn(), log: jest.fn() },
}))
jest.mock('node:fs', () => ({
  readFileSync: jest.fn(),
  existsSync: jest.fn(),
}))

import consola from 'consola'
import { readFileSync, existsSync } from 'node:fs'

const consolaInfo = (consola as unknown as { info: jest.Mock }).info
const consolaWarn = (consola as unknown as { warn: jest.Mock }).warn
const mockExistsSync = existsSync as jest.MockedFunction<typeof existsSync>
const mockReadFileSync = readFileSync as jest.MockedFunction<typeof readFileSync>

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyCmd = { run?: (ctx: any) => Promise<void> }

let whatsNewCmd: AnyCmd

beforeAll(async () => {
  whatsNewCmd = (await import('./whats-new')).default as AnyCmd
})

beforeEach(() => {
  jest.clearAllMocks()
  process.exitCode = 0
})

describe('lf whats-new', () => {
  it('shows changelog link when no CHANGELOG.md is found', async () => {
    mockExistsSync.mockReturnValue(false)

    await whatsNewCmd?.run?.({ args: { releases: '3', json: false }, cmd: {}, rawArgs: [] })

    // Should direct user to the docs changelog
    const allInfoCalls = consolaInfo.mock.calls.map((c) => String(c[0])).join(' ')
    const allWarnCalls = consolaWarn.mock.calls.map((c) => String(c[0])).join(' ')
    expect(allInfoCalls + allWarnCalls).toMatch(/changelog|docs\.lenserfight\.com/i)
  })

  it('parses and displays releases when CHANGELOG.md exists', async () => {
    mockExistsSync.mockReturnValue(true)
    mockReadFileSync.mockReturnValue(
      `## [1.2.0] - 2026-05-01\n### Added\n- New feature A\n\n## [1.1.0] - 2026-04-01\n### Fixed\n- Bug fix B\n` as never,
    )

    await whatsNewCmd?.run?.({ args: { releases: '2', json: false }, cmd: {}, rawArgs: [] })

    // Should print version headers
    const consoleLogs = (console.log as jest.Mock)?.mock?.calls?.map((c) => String(c[0])).join(' ') ?? ''
    const infoLogs = consolaInfo.mock.calls.map((c) => String(c[0])).join(' ')
    expect(consoleLogs + infoLogs).toMatch(/1\.2\.0|1\.1\.0/)
  })
})
