export {}

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

const writeFileMock = jest.fn().mockResolvedValue(undefined)
const readFileMock = jest.fn()

jest.mock('node:fs', () => {
  const actual = jest.requireActual('node:fs')
  return {
    ...actual,
    existsSync: jest.fn().mockReturnValue(false),
    mkdirSync: jest.fn(),
    promises: {
      writeFile: writeFileMock,
      readFile: readFileMock,
    },
  }
})

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyCmd = { run?: (ctx: any) => Promise<void>; subCommands?: Record<string, AnyCmd | (() => Promise<AnyCmd>)> }

beforeEach(() => {
  jest.clearAllMocks()
  process.exitCode = 0
})

async function getSubCmd(key: string): Promise<AnyCmd> {
  const { default: cmd } = await import('./completion') as { default: AnyCmd }
  const sub = cmd.subCommands?.[key]
  return typeof sub === 'function' ? sub() : (sub as AnyCmd)
}

describe('completion bash', () => {
  it('prints a script that defines an _lf function', async () => {
    const writes: string[] = []
    const stdoutWrite = jest.spyOn(process.stdout, 'write').mockImplementation((chunk: unknown) => {
      writes.push(typeof chunk === 'string' ? chunk : chunk?.toString() ?? '')
      return true
    })

    const cmd = await getSubCmd('bash')
    await cmd.run?.({ args: {}, cmd: {}, rawArgs: [] })

    const out = writes.join('')
    expect(out).toContain('_lf()')
    expect(out).toContain('complete -F _lf lf')
    expect(out).toContain('# lenserfight-completion')

    stdoutWrite.mockRestore()
  })
})

describe('completion install', () => {
  it('writes a zsh script with the sentinel comment', async () => {
    const cmd = await getSubCmd('install')
    await cmd.run?.({ args: { shell: 'zsh', force: true }, cmd: {}, rawArgs: [] })

    expect(writeFileMock).toHaveBeenCalledTimes(1)
    const [filePath, content] = writeFileMock.mock.calls[0]
    expect(filePath).toMatch(/\.zshrc$/)
    expect(content as string).toContain('# lenserfight-completion')
    expect(content as string).toContain('compdef _lf lf')
  })

  it('infers the shell from $SHELL when --shell is auto', async () => {
    const original = process.env['SHELL']
    process.env['SHELL'] = '/usr/bin/bash'
    try {
      const cmd = await getSubCmd('install')
      await cmd.run?.({ args: { shell: 'auto', force: true }, cmd: {}, rawArgs: [] })

      expect(writeFileMock).toHaveBeenCalled()
      const [filePath, content] = writeFileMock.mock.calls[0]
      expect(filePath).toMatch(/\.bashrc$/)
      expect(content as string).toContain('_lf()')
    } finally {
      process.env['SHELL'] = original
    }
  })

  it('rejects an invalid --shell value', async () => {
    const consolaError = (jest.requireMock('consola').default as { error: jest.Mock }).error
    const cmd = await getSubCmd('install')
    await cmd.run?.({ args: { shell: 'tcsh', force: false }, cmd: {}, rawArgs: [] })

    expect(process.exitCode).toBe(1)
    expect(consolaError).toHaveBeenCalled()
    expect(writeFileMock).not.toHaveBeenCalled()
  })
})
