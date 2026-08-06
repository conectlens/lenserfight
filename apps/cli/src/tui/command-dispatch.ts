import { runCommand } from 'citty'

/**
 * In-process command dispatch for the TUI dashboard's `:` command bar.
 *
 * Deliberately does NOT shell out via `child_process.spawn` (unlike the
 * removed `run-child.ts`, which re-invoked `lf` as a subprocess) — the issue
 * this restores from explicitly forbids the TUI recursively shelling out to
 * itself. `runCommand(main, ...)` drives citty's own command tree, so every
 * dispatched command gets identical routing, arg parsing, and `--confirm`/
 * safety-gate enforcement to a plain shell invocation — no gate is bypassed
 * or duplicated here.
 *
 * `main` is imported lazily inside `dispatchInProcess()` rather than at
 * module scope — importing it evaluates main.ts, whose top-level side effect
 * is `runMain(main)` (a real CLI invocation against `process.argv`). See the
 * matching comment in ../lib/command-inventory.ts for why that must not fire
 * just from importing this module (e.g. when the dashboard UI is loaded in
 * tests without going through the real CLI entrypoint first).
 *
 * Known limitation: a handful of commands call `process.exit()` directly on
 * error paths rather than throwing. That call cannot be intercepted from
 * here (or from anywhere in-process) and will terminate the whole dashboard
 * session, not just the dispatched command. This is an accepted tradeoff of
 * in-process dispatch versus the forbidden spawn-a-child model.
 */
export interface DispatchResult {
  code: number
}

export interface RecentCommandEntry {
  argv: string[]
  code: number
  timestamp: number
}

const RECENT_LIMIT = 20
const recentCommands: RecentCommandEntry[] = []

export async function dispatchInProcess(argv: string[]): Promise<DispatchResult> {
  let code = 0
  try {
    const { main } = await import('../main')
    await runCommand(main, { rawArgs: argv })
  } catch (err) {
    code = 1
    const message = err instanceof Error ? (err.stack ?? err.message) : String(err)
    process.stderr.write(`${message}\n`)
  }

  recentCommands.unshift({ argv, code, timestamp: Date.now() })
  if (recentCommands.length > RECENT_LIMIT) recentCommands.length = RECENT_LIMIT

  return { code }
}

/** Most-recent-first ring buffer of commands dispatched this session. */
export function getRecentCommands(): RecentCommandEntry[] {
  return [...recentCommands]
}
