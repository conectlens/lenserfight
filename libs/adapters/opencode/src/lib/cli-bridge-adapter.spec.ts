import { beforeEach, describe, expect, it, vi } from 'vitest'

const execFileMock = vi.fn()

vi.mock('node:child_process', () => ({ execFile: (...args: unknown[]) => execFileMock(...args) }))

import { createCliBridgeAdapter, type CliToolManifestEntry } from './cli-bridge-adapter'

const ENTRY: CliToolManifestEntry = {
  id: 'lf_lens_create',
  description: 'Create a lens',
  commandPath: ['lens', 'create'],
  args: [
    { name: 'title', type: 'positional', required: true, description: 'Lens title' },
    { name: 'confirm', type: 'boolean', description: 'Confirm destructive action' },
    { name: 'mode', type: 'enum', options: ['ai_vs_ai', 'human_vs_ai'], description: 'Mode' },
  ],
}

function mockExecFileResult(result: { error?: Error; stdout?: string; stderr?: string }) {
  execFileMock.mockImplementationOnce(
    (
      _cmd: string,
      _args: string[],
      _opts: unknown,
      cb: (err: Error | null, res: { stdout: string; stderr: string }) => void,
    ) => {
      cb(result.error ?? null, { stdout: result.stdout ?? '', stderr: result.stderr ?? '' })
    },
  )
}

beforeEach(() => {
  execFileMock.mockReset()
})

describe('createCliBridgeAdapter', () => {
  it('exposes the manifest id and description', () => {
    const adapter = createCliBridgeAdapter(ENTRY, '/bin/lf-main.js')
    expect(adapter.id()).toBe('lf_lens_create')
    expect(adapter.metadata().mirrorsMcpTool).toBe('lf lens create')
  })

  it('builds argv as positional + flags and shells out via execFile (no shell)', async () => {
    mockExecFileResult({ stdout: 'created!' })

    const { execute } = createCliBridgeAdapter(ENTRY, '/bin/lf-main.js').toToolDefinition()
    const result = await execute({ title: 'My Lens', confirm: true, mode: 'ai_vs_ai' }, {} as never)

    expect(execFileMock).toHaveBeenCalledWith(
      process.execPath,
      ['/bin/lf-main.js', 'lens', 'create', 'My Lens', '--confirm', '--mode', 'ai_vs_ai'],
      expect.objectContaining({ timeout: expect.any(Number) }),
      expect.any(Function),
    )
    expect(result).toEqual({ title: 'lf lens create My Lens --confirm --mode ai_vs_ai', output: 'created!' })
  })

  it('omits a boolean flag entirely when false, and skips undefined args', async () => {
    mockExecFileResult({ stdout: 'ok' })

    const { execute } = createCliBridgeAdapter(ENTRY, '/bin/lf-main.js').toToolDefinition()
    await execute({ title: 'X', confirm: false }, {} as never)

    const argv = execFileMock.mock.calls[0]?.[1] as string[]
    expect(argv).toEqual(['/bin/lf-main.js', 'lens', 'create', 'X'])
  })

  it('reports a timeout distinctly from a generic failure', async () => {
    mockExecFileResult({ error: Object.assign(new Error('killed'), { killed: true }) })

    const { execute } = createCliBridgeAdapter(ENTRY, '/bin/lf-main.js').toToolDefinition()
    const result = await execute({ title: 'X' }, {} as never)

    expect(result).toContain('timed out')
  })

  it('surfaces stderr on a non-timeout failure', async () => {
    mockExecFileResult({ error: Object.assign(new Error('exit 1'), { stderr: 'boom: invalid input' }) })

    const { execute } = createCliBridgeAdapter(ENTRY, '/bin/lf-main.js').toToolDefinition()
    const result = await execute({ title: 'X' }, {} as never)

    expect(result).toContain('boom: invalid input')
  })
})
