jest.mock('citty', () => ({ defineCommand: (opts: unknown) => opts }))
jest.mock('consola', () => ({
  __esModule: true,
  default: { error: jest.fn(), warn: jest.fn(), info: jest.fn(), success: jest.fn(), log: jest.fn() },
}))
jest.mock('../lib/data-services', () => ({
  getPersonalContentFeed: jest.fn(),
  isContentFeedType: jest.fn((t: string) => ['threads', 'prompts', 'lenses'].includes(t)),
}))
jest.mock('../utils/api', () => ({ handleError: jest.fn() }))
jest.mock('../utils/output', () => ({ printJson: jest.fn(), printTable: jest.fn(), truncate: jest.fn((s: string) => s) }))

import consola from 'consola'
import { getPersonalContentFeed } from '../lib/data-services'
import { printJson } from '../utils/output'

const consolaError = (consola as unknown as { error: jest.Mock }).error
const consolaInfo = (consola as unknown as { info: jest.Mock }).info
const mockGetPersonalContentFeed = getPersonalContentFeed as jest.MockedFunction<typeof getPersonalContentFeed>
const mockPrintJson = printJson as jest.MockedFunction<typeof printJson>

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyCmd = { run?: (ctx: any) => Promise<void> }

let feedCmd: AnyCmd

beforeAll(async () => {
  feedCmd = (await import('./feed')).default as AnyCmd
})

beforeEach(() => {
  jest.clearAllMocks()
  process.exitCode = 0
})

describe('lf feed', () => {
  it('rejects an invalid content type', async () => {
    await feedCmd?.run?.({ args: { type: 'videos', limit: '10', json: false }, cmd: {}, rawArgs: [] })

    expect(consolaError).toHaveBeenCalledWith(
      expect.stringContaining('Invalid type'),
      'videos',
    )
    expect(process.exitCode).toBe(1)
  })

  it('outputs JSON when feed returns items and --json is set', async () => {
    mockGetPersonalContentFeed.mockResolvedValueOnce([{ id: 'item-1', title: 'Hello' }])

    await feedCmd?.run?.({ args: { type: 'threads', limit: '5', json: true }, cmd: {}, rawArgs: [] })

    expect(mockGetPersonalContentFeed).toHaveBeenCalledWith('threads', 5)
    expect(mockPrintJson).toHaveBeenCalled()
  })

  it('shows empty message when feed returns no items', async () => {
    mockGetPersonalContentFeed.mockResolvedValueOnce([])

    await feedCmd?.run?.({ args: { type: 'threads', limit: '10', json: false }, cmd: {}, rawArgs: [] })

    expect(consolaInfo).toHaveBeenCalledWith(expect.stringContaining('empty'))
  })
})
