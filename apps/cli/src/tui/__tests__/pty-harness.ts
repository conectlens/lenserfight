/**
 * Minimal PTY driver for end-to-end REPL tests: spawns a real shell (or the
 * CLI binary directly) inside a pseudo-terminal via node-pty, so the tests
 * exercise real terminal semantics (raw mode, ANSI rendering, resize) instead
 * of the in-process Jest/Ink mocks used elsewhere. This is the only layer in
 * the test suite that runs the actually-built `dist/apps/cli/main.js`.
 */
import { stripAnsi } from '@lenserfight/cli-client'

// node-pty is an optional-at-test-time native dependency (prebuilt binaries,
// no compiler needed on Windows/macOS/Linux — see apps/cli/README.md's PTY
// testing note). Loaded lazily so importing this module never fails in an
// environment where it isn't installed; callers check isPtyAvailable() first.
type PtyModule = typeof import('node-pty')

let ptyModule: PtyModule | null | undefined

export function isPtyAvailable(): boolean {
  if (ptyModule !== undefined) return ptyModule !== null
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    ptyModule = require('node-pty') as PtyModule
  } catch {
    ptyModule = null
  }
  return ptyModule !== null
}

export interface PtySession {
  write(data: string): void
  /**
   * Writes `text` then, after a short delay, a carriage return — separate
   * writes, not one combined string. On Windows/ConPTY, a single write
   * containing both printable text and a trailing "\r" can be coalesced by
   * the console host in a way the target app never observes as two distinct
   * input events, so Enter is silently dropped. Splitting them (matching how
   * a human actually types) avoids that; it does not indicate any problem in
   * the app being tested.
   */
  typeLine(text: string, delayMs?: number): Promise<void>
  /** ANSI-stripped accumulated output so far. */
  output(): string
  /** Resolves once `pattern` appears in the ANSI-stripped output, or rejects after timeoutMs. */
  waitFor(pattern: string | RegExp, timeoutMs?: number): Promise<string>
  kill(): void
  exitCode: number | null
  pid: number
  /**
   * OS-level liveness check independent of node-pty's onExit callback, which
   * is backed by a console-list-agent helper process on Windows/ConPTY that
   * can itself crash under some Node/terminal combinations without that
   * necessarily meaning the pty's child process is still alive.
   */
  isAlive(): boolean
}

export interface SpawnPtyOptions {
  cwd?: string
  env?: NodeJS.ProcessEnv
  cols?: number
  rows?: number
}

/** Default shell per platform, matching the request's "Windows PowerShell and representative Unix terminals". */
export function defaultShell(): { file: string; args: string[] } {
  if (process.platform === 'win32') {
    return { file: 'powershell.exe', args: ['-NoLogo', '-NoProfile'] }
  }
  return { file: process.env['SHELL'] || '/bin/bash', args: [] }
}

export function spawnPty(file: string, args: string[], opts: SpawnPtyOptions = {}): PtySession {
  if (!isPtyAvailable()) throw new Error('node-pty is not installed/available in this environment.')
  const pty = ptyModule as PtyModule

  const proc = pty.spawn(file, args, {
    name: 'xterm-256color',
    cols: opts.cols ?? 100,
    rows: opts.rows ?? 30,
    cwd: opts.cwd ?? process.cwd(),
    env: { ...process.env, ...opts.env } as { [key: string]: string },
  })

  let raw = ''
  const session: PtySession = {
    exitCode: null,
    pid: proc.pid,
    isAlive: () => {
      try {
        process.kill(proc.pid, 0)
        return true
      } catch {
        return false
      }
    },
    write: (data: string) => proc.write(data),
    typeLine: async (text: string, delayMs = 250) => {
      proc.write(text)
      await new Promise((r) => setTimeout(r, delayMs))
      proc.write('\r')
    },
    output: () => stripAnsi(raw),
    waitFor: (pattern, timeoutMs = 10000) => {
      return new Promise((resolve, reject) => {
        const matches = (text: string) => (typeof pattern === 'string' ? text.includes(pattern) : pattern.test(text))
        if (matches(session.output())) {
          resolve(session.output())
          return
        }
        const timer = setTimeout(() => {
          disposable.dispose()
          reject(new Error(`Timed out after ${timeoutMs}ms waiting for ${String(pattern)}.\nOutput so far:\n${session.output()}`))
        }, timeoutMs)
        const disposable = proc.onData(() => {
          if (matches(session.output())) {
            clearTimeout(timer)
            disposable.dispose()
            resolve(session.output())
          }
        })
      })
    },
    kill: () => {
      try {
        proc.kill()
      } catch {
        /* already dead */
      }
    },
  }

  proc.onData((d) => {
    raw += d
  })
  proc.onExit(({ exitCode }) => {
    session.exitCode = exitCode
  })

  return session
}
