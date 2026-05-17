jest.mock('citty', () => ({ defineCommand: (opts: unknown) => opts }))
jest.mock('consola', () => ({
  __esModule: true,
  default: { error: jest.fn(), warn: jest.fn(), info: jest.fn(), success: jest.fn(), log: jest.fn() },
}))
jest.mock('../utils/api', () => ({ callRpc: jest.fn(), handleError: jest.fn() }))
jest.mock('../utils/output', () => ({ printJson: jest.fn(), printTable: jest.fn(), truncate: jest.fn((s: string) => s) }))

import consola from 'consola'
import { callRpc } from '../utils/api'

const consolaError = (consola as unknown as { error: jest.Mock }).error
const consolaSuccess = (consola as unknown as { success: jest.Mock }).success
const mockCallRpc = callRpc as jest.MockedFunction<typeof callRpc>

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyCmd = { subCommands?: Record<string, AnyCmd>; run?: (ctx: any) => Promise<void> }

let tagCmd: AnyCmd

beforeAll(async () => {
  tagCmd = (await import('./tag')).default as AnyCmd
})

beforeEach(() => {
  jest.clearAllMocks()
  process.exitCode = 0
})

describe('lf tag follow', () => {
  let followCmd: AnyCmd

  beforeAll(() => {
    followCmd = tagCmd.subCommands?.follow as AnyCmd
  })

  it('warns when tag slug is not found', async () => {
    // resolveTagId uses callRpc for search, returns empty → tag not found
    mockCallRpc.mockResolvedValue([] as never)

    await followCmd?.run?.({ args: { slug: 'no-such-tag' }, cmd: {}, rawArgs: [] })

    expect(consolaError).toHaveBeenCalledWith(expect.stringContaining('not found'), 'no-such-tag')
    expect(process.exitCode).toBe(1)
  })

  it('reports success when tag is followed', async () => {
    // First call: resolveTagId search → returns tag row
    mockCallRpc
      .mockResolvedValueOnce([{ id: 'tag-uuid', name: 'typescript', slug: 'typescript' }] as never)
      // Second call: follow action
      .mockResolvedValueOnce({ followed: true } as never)

    await followCmd?.run?.({ args: { slug: 'typescript' }, cmd: {}, rawArgs: [] })

    // 'Now following tag: %s (%s)' — 3 args
    expect(consolaSuccess).toHaveBeenCalledWith(
      expect.stringContaining('following tag'),
      expect.any(String),
      expect.any(String),
    )
  })
})

describe('lf tag unfollow', () => {
  let unfollowCmd: AnyCmd

  beforeAll(() => {
    unfollowCmd = tagCmd.subCommands?.unfollow as AnyCmd
  })

  it('warns when tag slug is not found', async () => {
    mockCallRpc.mockResolvedValue([] as never)

    await unfollowCmd?.run?.({ args: { slug: 'missing-tag' }, cmd: {}, rawArgs: [] })

    expect(consolaError).toHaveBeenCalledWith(expect.stringContaining('not found'), 'missing-tag')
    expect(process.exitCode).toBe(1)
  })
})
