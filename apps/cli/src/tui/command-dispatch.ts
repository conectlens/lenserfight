import { setExecContext } from '@lenserfight/cli-client'
import { runCommand } from 'citty'

import { buildCommandInventory } from '../lib/command-inventory'
import { resolveCommandPath, type ResolveResult } from '../lib/command-resolve'

import { captureStd, type TranscriptLine } from './stream-capture'

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
  error?: unknown
  /** Did-you-mean alternatives when the argv's command token didn't resolve to anything. */
  suggestions?: string[]
}

export interface RecentCommandEntry {
  argv: string[]
  code: number
  timestamp: number
}

const RECENT_LIMIT = 20
const recentCommands: RecentCommandEntry[] = []

/**
 * Resolves a REPL-typed argv against the full command inventory (accepts
 * `agents`, `lf agents`, `lenserfight agents`, `/agents`, `AGENTS`, and
 * multi-level case variants like `agents TEAM inspect`) before it ever
 * reaches citty. This is the one canonical resolution path — dispatchInProcess
 * is the only caller of runCommand from the TUI, so there is no separate,
 * drift-prone dashboard dispatch logic.
 */
export async function resolveDispatchArgv(argv: string[]): Promise<ResolveResult> {
  const inventory = await buildCommandInventory()
  return resolveCommandPath(argv, inventory.map((e) => e.path))
}

export interface DispatchOptions {
  /** When provided, stdout/stderr are captured line-by-line instead of writing to the real terminal. */
  onLine?: (line: TranscriptLine) => void
  /** Exposed via getExecContext().cancelSignal for the duration of the dispatch, for cooperative cancellation. */
  signal?: AbortSignal
}

export async function dispatchInProcess(argv: string[], opts: DispatchOptions = {}): Promise<DispatchResult> {
  let code = 0
  let error: unknown
  let suggestions: string[] | undefined
  const restore = opts.onLine ? captureStd(opts.onLine) : null
  if (opts.signal) setExecContext({ cancelSignal: opts.signal })

  try {
    const resolved = await resolveDispatchArgv(argv)
    suggestions = resolved.suggestions
    const { main } = await import('../main')
    await runCommand(main, { rawArgs: resolved.argv })
  } catch (err) {
    code = 1
    error = err
    // Only the raw-passthrough (no onLine) callers need this printed directly —
    // the REPL's capturing caller formats `error` itself (lib/error-format.ts)
    // instead of dumping a raw stack.
    if (!opts.onLine) {
      const message = err instanceof Error ? (err.stack ?? err.message) : String(err)
      process.stderr.write(`${message}\n`)
    }
  } finally {
    restore?.()
    if (opts.signal) setExecContext({ cancelSignal: null })
  }

  recentCommands.unshift({ argv, code, timestamp: Date.now() })
  if (recentCommands.length > RECENT_LIMIT) recentCommands.length = RECENT_LIMIT

  return { code, error, suggestions }
}

/** Most-recent-first ring buffer of commands dispatched this session. */
export function getRecentCommands(): RecentCommandEntry[] {
  return [...recentCommands]
}
