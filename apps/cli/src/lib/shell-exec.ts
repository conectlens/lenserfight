import { spawn, type ChildProcess } from 'node:child_process'
import path from 'node:path'

export interface ShellStreamLine {
  stream: 'stdout' | 'stderr'
  text: string
}

export interface ShellExecResult {
  exitCode: number | null
  cancelled: boolean
}

export interface ShellExecOptions {
  cwd: string
  onLine: (line: ShellStreamLine) => void
  signal?: AbortSignal
}

/**
 * Parses a `cd` invocation for cwd tracking. A spawned shell's own `cd` never
 * persists back to this process, so the REPL intercepts it and updates its
 * own tracked cwd directly instead of spawning a child for it.
 */
export function parseCd(command: string, cwd: string): string | null {
  const m = command.trim().match(/^cd(?:\s+(.*))?$/i)
  if (!m) return null
  const target = (m[1] ?? '').trim().replace(/^["']|["']$/g, '')
  if (!target || target === '~') {
    return process.env['HOME'] || process.env['USERPROFILE'] || cwd
  }
  return path.resolve(cwd, target)
}

let activeChild: ChildProcess | null = null

/** Kills whatever `!`-spawned child is currently running, if any. Called on session exit / SIGINT cleanup. */
export function killActiveShellChild(): void {
  activeChild?.kill()
  activeChild = null
}

/** Spawns `command` in a shell, streaming stdout/stderr as separate line-tagged chunks. */
export function execShell(command: string, opts: ShellExecOptions): Promise<ShellExecResult> {
  return new Promise((resolve) => {
    const child = spawn(command, { cwd: opts.cwd, shell: true })
    activeChild = child
    let cancelled = false

    const buffers: Record<'stdout' | 'stderr', string> = { stdout: '', stderr: '' }
    const feed = (stream: 'stdout' | 'stderr', chunk: Buffer) => {
      buffers[stream] += chunk.toString()
      const parts = buffers[stream].split(/\r?\n/)
      buffers[stream] = parts.pop() ?? ''
      for (const line of parts) opts.onLine({ stream, text: line })
    }
    const flush = () => {
      for (const stream of ['stdout', 'stderr'] as const) {
        if (buffers[stream]) {
          opts.onLine({ stream, text: buffers[stream] })
          buffers[stream] = ''
        }
      }
    }

    const onAbort = () => {
      cancelled = true
      child.kill()
    }
    opts.signal?.addEventListener('abort', onAbort, { once: true })

    child.stdout?.on('data', (b: Buffer) => feed('stdout', b))
    child.stderr?.on('data', (b: Buffer) => feed('stderr', b))

    const settle = (exitCode: number | null) => {
      flush()
      opts.signal?.removeEventListener('abort', onAbort)
      if (activeChild === child) activeChild = null
      resolve({ exitCode, cancelled })
    }

    child.on('close', (code) => settle(code))
    child.on('error', (err) => {
      opts.onLine({ stream: 'stderr', text: String(err) })
      settle(1)
    })
  })
}
