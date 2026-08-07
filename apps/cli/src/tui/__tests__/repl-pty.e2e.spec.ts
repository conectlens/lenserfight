// PTY end-to-end coverage for the redesigned interactive REPL — runs the
// actually-built dist/apps/cli/main.js inside a real pseudo-terminal
// (node-pty / ConPTY on Windows, a real pty on Unix), so it exercises raw
// terminal semantics no in-process Jest/Ink test can reach: real keypress
// bytes, real ANSI rendering, real alt-screen toggling, real process exit.
//
// Skipped when node-pty isn't installed, or the CLI hasn't been built yet —
// mirrors battle.e2e.spec.ts's `describeIfLocal` gating pattern so
// `pnpm nx test cli` stays green without extra setup.

import { existsSync } from 'node:fs'
import { resolve } from 'node:path'

import { isPtyAvailable, spawnPty, type PtySession } from './pty-harness'

const CLI_BIN = resolve(__dirname, '../../../../../dist/apps/cli/main.js')
const HAS_PTY = isPtyAvailable()
const HAS_BIN = existsSync(CLI_BIN)

const describeIfPty = HAS_PTY && HAS_BIN ? describe : describe.skip

function launchRepl(): PtySession {
  return spawnPty(process.execPath, [CLI_BIN], {
    cols: 100,
    rows: 30,
    env: { NO_COLOR: '', LF_DEBUG: '' },
  })
}

describeIfPty('lf interactive REPL (PTY e2e)', () => {
  jest.setTimeout(30000)

  if (!HAS_PTY) {
    // eslint-disable-next-line jest/no-focused-tests
    it.skip('node-pty not installed', () => undefined)
  }
  if (HAS_PTY && !HAS_BIN) {
    // eslint-disable-next-line jest/no-focused-tests
    it.skip(`CLI binary missing at ${CLI_BIN}. Run: pnpm nx build cli`, () => undefined)
  }

  let session: PtySession

  afterEach(() => {
    session?.kill()
  })

  it('boots into the transcript REPL and shows the welcome banner', async () => {
    session = launchRepl()
    const out = await session.waitFor('LenserFight CLI', 15000)
    expect(out).toContain('LenserFight CLI')
  })

  it('accepts an uppercase command name without "unknown command" (the reported lf AGENTS bug)', async () => {
    session = launchRepl()
    await session.waitFor('LenserFight CLI', 15000)
    await session.typeLine('AGENTS')
    // Give the dispatched command a moment to run and print something, then
    // assert the resolver never produced an unknown-command error for it.
    await new Promise((r) => setTimeout(r, 2500))
    const out = session.output()
    expect(out).not.toMatch(/unknown command/i)
  })

  it('/quit exits the process cleanly', async () => {
    session = launchRepl()
    await session.waitFor('LenserFight CLI', 15000)
    await session.typeLine('/quit')
    // Poll both node-pty's own exit callback and an OS-level liveness check —
    // on some Windows/ConPTY combinations the console-list-agent helper
    // process node-pty spawns internally can itself crash (a node-pty/ConPTY
    // quirk unrelated to this app), which can delay/skip the onExit callback
    // even though the actual child process has already terminated.
    await new Promise((resolvePromise, reject) => {
      const timer = setTimeout(() => reject(new Error(`Process still alive after /quit.\nOutput:\n${session.output()}`)), 12000)
      const check = setInterval(() => {
        if (session.exitCode !== null || !session.isAlive()) {
          clearInterval(check)
          clearTimeout(timer)
          resolvePromise(undefined)
        }
      }, 150)
    })
    expect(session.isAlive()).toBe(false)
    if (session.exitCode !== null) expect(session.exitCode).toBe(0)
  })

  it('runs a local shell command via the ! prefix and streams its output', async () => {
    session = launchRepl()
    await session.waitFor('LenserFight CLI', 15000)
    const marker = 'pty-shell-marker-9f3a'
    await session.typeLine(`!echo ${marker}`)
    const out = await session.waitFor(marker, 10000)
    expect(out).toContain(marker)
  })
})
