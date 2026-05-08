jest.mock('citty', () => ({ defineCommand: (opts: unknown) => opts }))
jest.mock('consola', () => ({
  __esModule: true,
  default: {
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
    start: jest.fn(),
    success: jest.fn(),
    log: jest.fn(),
  },
}))
jest.mock('../utils/api', () => ({
  callRpc: jest.fn(),
  callRest: jest.fn(),
  handleError: jest.fn(),
}))
jest.mock('../utils/output', () => ({
  printTable: jest.fn(),
  printJson: jest.fn(),
  truncate: (s: string, n: number) => (s.length > n ? s.slice(0, n) + '…' : s),
}))

const writeFileMock = jest.fn().mockResolvedValue(undefined)
const readFileMock = jest.fn()
const unlinkMock = jest.fn().mockResolvedValue(undefined)
const readdirMock = jest.fn()
const chmodMock = jest.fn().mockResolvedValue(undefined)

jest.mock('node:fs', () => {
  const actual = jest.requireActual('node:fs')
  return {
    ...actual,
    existsSync: jest.fn().mockReturnValue(true),
    mkdirSync: jest.fn(),
    promises: {
      writeFile: writeFileMock,
      readFile: readFileMock,
      unlink: unlinkMock,
      readdir: readdirMock,
      chmod: chmodMock,
    },
  }
})

import consola from 'consola'
import { printTable } from '../utils/output'

const consolaSuccess = (consola as unknown as { success: jest.Mock }).success
const mockPrintTable = printTable as jest.MockedFunction<typeof printTable>

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyCmd = { run?: (ctx: any) => Promise<void>; subCommands?: Record<string, AnyCmd | (() => Promise<AnyCmd>)> }

beforeEach(() => {
  jest.clearAllMocks()
  process.exitCode = 0
})

async function getSubCmd(key: string): Promise<AnyCmd> {
  const { default: profileCmd } = await import('./profile') as { default: AnyCmd }
  const sub = profileCmd.subCommands?.[key]
  return typeof sub === 'function' ? sub() : (sub as AnyCmd)
}

describe('profile list', () => {
  it('lists multiple profiles with the active one flagged', async () => {
    readdirMock.mockResolvedValueOnce(['default.json', 'staging.json', 'prod.json'])
    readFileMock.mockResolvedValueOnce('staging\n') // .active

    const cmd = await getSubCmd('list')
    await cmd.run?.({ args: { json: false }, cmd: {}, rawArgs: [] })

    expect(mockPrintTable).toHaveBeenCalled()
    const rows = mockPrintTable.mock.calls[0][1] as string[][]
    expect(rows).toEqual(
      expect.arrayContaining([
        ['default', ''],
        ['staging', 'yes'],
        ['prod', ''],
      ]),
    )
  })
})

describe('profile create', () => {
  it('writes the JSON file with mode 0o600', async () => {
    const cmd = await getSubCmd('create')
    await cmd.run?.({
      args: {
        name: 'staging',
        url: 'https://staging.supabase.co',
        'anon-key': 'anon-key-xyz',
        token: '',
        'default-workflow': '',
      },
      cmd: {},
      rawArgs: [],
    })

    expect(writeFileMock).toHaveBeenCalledTimes(1)
    const [filePath, content, opts] = writeFileMock.mock.calls[0]
    expect(filePath).toMatch(/profiles\/staging\.json$/)
    expect(JSON.parse(content as string)).toMatchObject({
      name: 'staging',
      supabase_url: 'https://staging.supabase.co',
      supabase_anon_key: 'anon-key-xyz',
    })
    expect(opts).toEqual(expect.objectContaining({ mode: 0o600 }))
    expect(consolaSuccess).toHaveBeenCalled()
  })
})

describe('profile use', () => {
  it('writes .active with the chosen name', async () => {
    const cmd = await getSubCmd('use')
    await cmd.run?.({ args: { name: 'prod' }, cmd: {}, rawArgs: [] })

    expect(writeFileMock).toHaveBeenCalled()
    const lastCall = writeFileMock.mock.calls.find(([p]) => /\.active$/.test(p as string))
    expect(lastCall).toBeDefined()
    expect(lastCall?.[1]).toMatch(/^prod/)
    expect(consolaSuccess).toHaveBeenCalled()
  })
})

describe('profile delete', () => {
  it('refuses to delete the only remaining active profile without --force', async () => {
    readdirMock.mockResolvedValueOnce(['default.json'])
    readFileMock.mockResolvedValueOnce('default\n') // .active

    const { handleError } = await import('../utils/api')
    const mockHandleError = handleError as jest.MockedFunction<typeof handleError>

    const cmd = await getSubCmd('delete')
    await cmd.run?.({ args: { name: 'default', force: false }, cmd: {}, rawArgs: [] })

    expect(unlinkMock).not.toHaveBeenCalled()
    expect(mockHandleError).toHaveBeenCalledWith(
      expect.objectContaining({ message: expect.stringContaining('Cannot delete the active profile') }),
    )
  })

  it('deletes when --force is passed even if it is the only profile', async () => {
    readdirMock.mockResolvedValueOnce(['default.json'])
    readFileMock.mockResolvedValueOnce('default\n')

    const cmd = await getSubCmd('delete')
    await cmd.run?.({ args: { name: 'default', force: true }, cmd: {}, rawArgs: [] })

    expect(unlinkMock).toHaveBeenCalledTimes(1)
    expect(consolaSuccess).toHaveBeenCalled()
  })
})

describe('profile show', () => {
  it('prints the resolved profile (with tokens redacted)', async () => {
    readFileMock.mockResolvedValueOnce(
      JSON.stringify({
        name: 'staging',
        supabase_url: 'https://staging.supabase.co',
        supabase_anon_key: 'anon-key-12345678901234',
        access_token: 'secret-token',
        created_at: '2026-05-08T00:00:00.000Z',
      }),
    )

    const consolaInfo = (consola as unknown as { info: jest.Mock }).info
    const cmd = await getSubCmd('show')
    await cmd.run?.({ args: { name: 'staging', json: false }, cmd: {}, rawArgs: [] })

    expect(consolaInfo).toHaveBeenCalledWith('Name:                %s', 'staging')
    // Access token must be redacted, never printed verbatim.
    const allInfoArgs = consolaInfo.mock.calls.flat().join(' ')
    expect(allInfoArgs).not.toContain('secret-token')
    expect(allInfoArgs).toContain('••••••')
  })
})
