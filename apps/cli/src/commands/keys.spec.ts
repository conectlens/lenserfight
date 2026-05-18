jest.mock('citty', () => ({ defineCommand: (opts: unknown) => opts }))
jest.mock('../utils/output', () => ({
  printJson: jest.fn(),
  printTable: jest.fn(),
}))
jest.mock('consola', () => ({
  __esModule: true,
  default: {
    success: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
  },
}))

const mockStoreInstance = {
  list: jest.fn(),
  add: jest.fn(),
  update: jest.fn(),
  remove: jest.fn(),
  resolve: jest.fn(),
  doctor: jest.fn(),
}

const mockPassphraseProvider = {
  isConfigured: jest.fn(),
  set: jest.fn(),
}

const mockEnsureKeysDir = jest.fn()
const mockGetKeysDir = jest.fn(() => '/tmp/.lenserfight/keys')

jest.mock('@lenserfight/data/local-keys', () => ({
  LocalKeyStore: jest.fn(() => mockStoreInstance),
  LocalKeyStoreError: class LocalKeyStoreError extends Error {
    code: string
    constructor(code: string, message: string) {
      super(message)
      this.code = code
    }
  },
  defaultPassphraseProvider: mockPassphraseProvider,
  ensureKeysDir: () => mockEnsureKeysDir(),
  getKeysDir: () => mockGetKeysDir(),
  generateKeyId: () => 'generated-id-abcdef1234567890',
}))

import { printJson, printTable } from '../utils/output'
import keysCommand from './keys'

const mockPrintTable = printTable as jest.MockedFunction<typeof printTable>
const mockPrintJson = printJson as jest.MockedFunction<typeof printJson>

let exitCode: number | undefined
const realExit = process.exit
beforeAll(() => {
  // Prevent the test process from terminating when commands call process.exit.
  process.exit = ((code?: number) => {
    exitCode = code
    throw new Error(`__exit__:${code ?? 0}`)
  }) as never
})
afterAll(() => {
  process.exit = realExit
})

beforeEach(() => {
  jest.clearAllMocks()
  exitCode = undefined
})

function runSub(name: string, ctx: { args: Record<string, unknown> }) {
  const cmd = (keysCommand as { subCommands?: Record<string, { run: (c: unknown) => Promise<void> }> })
    .subCommands?.[name]
  if (!cmd) throw new Error(`subcommand not found: ${name}`)
  return cmd.run(ctx)
}

describe('lf keys list', () => {
  it('prints a table when keys exist', async () => {
    mockStoreInstance.list.mockResolvedValueOnce([
      { id: 'id-1', provider: 'openai', label: 'Prod', createdAt: '2026-01-01T00:00:00Z' },
    ])
    await runSub('list', { args: { json: false } })
    expect(mockPrintTable).toHaveBeenCalledWith(
      ['provider', 'label', 'id', 'createdAt'],
      [['openai', 'Prod', 'id-1', '2026-01-01T00:00:00Z']]
    )
  })

  it('prints JSON when --json is passed', async () => {
    const rows = [{ id: 'id-1', provider: 'openai', label: 'P', createdAt: 'x' }]
    mockStoreInstance.list.mockResolvedValueOnce(rows)
    await runSub('list', { args: { json: true } })
    expect(mockPrintJson).toHaveBeenCalledWith(rows)
  })
})

describe('lf keys init', () => {
  it('refuses when a passphrase already exists and --force is not set', async () => {
    mockPassphraseProvider.isConfigured.mockResolvedValueOnce(true)
    await expect(runSub('init', { args: { force: false } })).rejects.toThrow(/__exit__:2/)
    expect(mockPassphraseProvider.set).not.toHaveBeenCalled()
  })

  it('generates and stores a passphrase when not configured', async () => {
    mockPassphraseProvider.isConfigured.mockResolvedValueOnce(false)
    await runSub('init', { args: { force: false } })
    expect(mockPassphraseProvider.set).toHaveBeenCalledTimes(1)
    expect(mockEnsureKeysDir).toHaveBeenCalled()
    const passphrase = mockPassphraseProvider.set.mock.calls[0]?.[0] as string
    expect(typeof passphrase).toBe('string')
    expect(passphrase.length).toBeGreaterThanOrEqual(20)
  })
})

describe('lf keys export', () => {
  it('refuses without --i-understand', async () => {
    await expect(
      runSub('export', { args: { id: 'abcd1234abcd1234abcd1234', 'i-understand': false } })
    ).rejects.toThrow(/__exit__:2/)
    expect(mockStoreInstance.resolve).not.toHaveBeenCalled()
  })

  it('writes plaintext to stdout when --i-understand is set', async () => {
    mockStoreInstance.resolve.mockResolvedValueOnce('sk-plain')
    const writes: string[] = []
    const orig = process.stdout.write
    process.stdout.write = ((chunk: string | Uint8Array) => {
      writes.push(typeof chunk === 'string' ? chunk : Buffer.from(chunk).toString())
      return true
    }) as never
    try {
      await runSub('export', { args: { id: 'abcd1234abcd1234abcd1234', 'i-understand': true } })
    } finally {
      process.stdout.write = orig
    }
    expect(writes.join('')).toContain('sk-plain')
  })
})

describe('lf keys remove', () => {
  it('aborts when confirmation is not "yes"', async () => {
    const stdin = jest.spyOn(require('node:readline'), 'createInterface').mockReturnValueOnce({
      question: (_q: string, cb: (a: string) => void) => cb('no'),
      close: jest.fn(),
    } as never)
    await expect(
      runSub('remove', { args: { id: 'abcd1234abcd1234abcd1234', yes: false } })
    ).rejects.toThrow(/__exit__:2/)
    expect(mockStoreInstance.remove).not.toHaveBeenCalled()
    stdin.mockRestore()
  })

  it('skips confirmation when --yes is set', async () => {
    await runSub('remove', { args: { id: 'abcd1234abcd1234abcd1234', yes: true } })
    expect(mockStoreInstance.remove).toHaveBeenCalledWith('abcd1234abcd1234abcd1234')
  })
})

describe('lf keys doctor', () => {
  it('emits JSON and exits 0 when healthy', async () => {
    mockStoreInstance.doctor.mockResolvedValueOnce({
      passphrasePresent: true,
      keysDirExists: true,
      keysDirMode: 0o700,
      keysDirIsSymlink: false,
      fileIssues: [],
      auditLogWritable: true,
    })
    await expect(runSub('doctor', { args: { json: true } })).rejects.toThrow(/__exit__:0/)
    expect(mockPrintJson).toHaveBeenCalled()
  })

  it('exits nonzero when fileIssues exist', async () => {
    mockStoreInstance.doctor.mockResolvedValueOnce({
      passphrasePresent: true,
      keysDirExists: true,
      keysDirMode: 0o644,
      keysDirIsSymlink: false,
      fileIssues: [{ path: '/x', issue: 'world_readable', mode: 0o644 }],
      auditLogWritable: true,
    })
    await expect(runSub('doctor', { args: { json: false } })).rejects.toThrow(/__exit__:1/)
  })
})
