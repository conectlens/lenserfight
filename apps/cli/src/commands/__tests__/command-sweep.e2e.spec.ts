// Phase 13 — full command CSV sweep.
//
// Walks the CLI's entire leaf command inventory (the same canonical registry
// the TUI's resolver/completion/help all use) and runs every one of them
// through the actually-built dist/apps/cli/main.js against a local Supabase
// instance with a real authenticated session, recording
// {command, exit_code, status, duration_ms, error_summary} to CSV.
//
// Every command — including fetching the inventory itself — runs as its own
// `node dist/apps/cli/main.js ...` subprocess, never imported in-process:
// citty's bundled dependency chain is ESM-only and chokes under ts-jest's
// CommonJS transform, and separately, a handful of commands call
// process.exit() on some paths, which would otherwise kill this entire sweep
// mid-run. Matches the existing battle.e2e.spec.ts convention of always
// spawning the built binary.
//
// Opt-in only (RUN_COMMAND_SWEEP=1) — this is slow (~500+ real subprocess
// spawns, many hitting the network) and mutates local Supabase state, so it
// must never run as part of the routine `pnpm nx test cli`.

import { spawnSync } from 'node:child_process'
import { existsSync, mkdirSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface CommandInventoryEntry {
  name: string
  path: string[]
  description: string
  args: Array<{ name: string; type: string; required?: boolean }>
  deprecated: boolean
}

const RUN_SWEEP = process.env['RUN_COMMAND_SWEEP'] === '1'
const SUPABASE_URL = process.env['SUPABASE_URL'] ?? 'http://127.0.0.1:54321'
const SUPABASE_ANON_KEY = process.env['SUPABASE_ANON_KEY'] ?? ''
const CLI_BIN = resolve(__dirname, '../../../../../dist/apps/cli/main.js')
const CSV_PATH = resolve(__dirname, '../../../../../reports/cli-command-sweep.csv')
const PER_COMMAND_TIMEOUT_MS = 6000

// Refuse anything that doesn't look like a local instance — this sweep runs
// real mutating commands (create/update/vote/etc.).
const IS_LOCAL = /127\.0\.0\.1|localhost/.test(SUPABASE_URL)

const describeIfSweep = RUN_SWEEP && IS_LOCAL ? describe : describe.skip

interface SweepRow {
  command: string
  exit_code: number | null
  status: 'ok' | 'clean_error' | 'timeout' | 'crash' | 'killed'
  duration_ms: number
  error_summary: string
}

/** Known local fixtures from supabase/seeds/52_battle_e2e_seed.sql, applied before running this sweep. */
const FIXTURES = { battleSlug: 'e2e-open-battle' }

const SWEEP_ENV = {
  ...process.env,
  LF_LOCAL: '1',
  SUPABASE_URL,
  SUPABASE_ANON_KEY,
  LF_PROFILE: 'e2e-sweep',
  NO_COLOR: '1',
}

interface CliRunResult {
  status: number | null
  signal: NodeJS.Signals | null
  stdout: string
  stderr: string
  error?: NodeJS.ErrnoException
}

function runCli(args: string[], timeoutMs = PER_COMMAND_TIMEOUT_MS): CliRunResult {
  const result = spawnSync(process.execPath, [CLI_BIN, ...args], { encoding: 'utf8', timeout: timeoutMs, env: SWEEP_ENV })
  return {
    status: result.status,
    signal: result.signal,
    stdout: String(result.stdout ?? ''),
    stderr: String(result.stderr ?? ''),
    error: result.error as NodeJS.ErrnoException | undefined,
  }
}

/** Best-effort: fill a command's first required positional arg with a fixture when the arg name suggests what it wants. Everything else is deliberately left unfilled — that's a legitimate "clean validation error" outcome, not a gap to hide. */
function buildArgs(entry: CommandInventoryEntry): string[] {
  const args = [...entry.path]
  const firstPositional = entry.args.find((a) => a.type === 'positional' && a.required)
  if (firstPositional && entry.path[0] === 'battle') {
    args.push(FIXTURES.battleSlug)
  }
  return args
}

function looksLikeRawCrash(output: string): boolean {
  // citty/app errors are short, human-readable lines. A raw crash leaves
  // Node/V8 stack-frame markers or a TypeError/ReferenceError class name in
  // the output — exactly what lib/error-format.ts exists to prevent
  // reaching a user by default.
  return /at .*\(.*:\d+:\d+\)|node_modules[\\/].*\.js:\d+|TypeError:|ReferenceError:|is not a function|Cannot read propert/i.test(output)
}

function classify(code: number | null, signal: string | null, timedOut: boolean, combined: string): SweepRow['status'] {
  if (timedOut) return 'timeout'
  if (signal) return 'killed'
  if (code === 0) return 'ok'
  if (looksLikeRawCrash(combined)) return 'crash'
  return 'clean_error'
}

function firstMeaningfulLine(text: string): string {
  const line = text
    .split('\n')
    .map((l) => l.trim())
    .find((l) => l.length > 0)
  return (line ?? '').slice(0, 200)
}

describeIfSweep('lf full command sweep (CSV report)', () => {
  jest.setTimeout(60 * 60 * 1000) // this is a long, deliberately-opted-into run

  let inventory: CommandInventoryEntry[] = []

  beforeAll(() => {
    if (!existsSync(CLI_BIN)) {
      throw new Error(`CLI binary missing at ${CLI_BIN}. Run: pnpm nx build cli`)
    }
    // __inventory is a hidden diagnostic command (commands/__inventory.ts)
    // that dumps buildCommandInventory()'s output as JSON — run for real
    // inside the built binary (a plain Node process) rather than imported
    // into this Jest/ts-jest process, sidestepping citty's ESM-only
    // dependency chain entirely.
    const result = runCli(['__inventory'], 30000)
    if (result.status !== 0) {
      throw new Error(`Failed to fetch command inventory: ${result.stderr || result.stdout}`)
    }
    const all = JSON.parse(result.stdout) as CommandInventoryEntry[]
    inventory = all.filter((e) => e.path[0] !== '__inventory')
  })

  it('runs every leaf command and writes a CSV report', () => {
    expect(inventory.length).toBeGreaterThan(0)

    const limit = Number(process.env['SWEEP_LIMIT'] ?? '0')
    const entries = limit > 0 ? inventory.slice(0, limit) : inventory

    const rows: SweepRow[] = []
    const crashes: SweepRow[] = []

    for (const entry of entries) {
      const args = buildArgs(entry)
      const start = Date.now()
      const result = runCli(args)
      const duration_ms = Date.now() - start
      const combined = `${result.stdout ?? ''}\n${result.stderr ?? ''}`
      const timedOut = result.error?.code === 'ETIMEDOUT'
      const status = classify(result.status, result.signal, timedOut, combined)

      const row: SweepRow = {
        command: `lf ${entry.name}`,
        exit_code: result.status,
        status,
        duration_ms,
        error_summary: status === 'ok' ? '' : firstMeaningfulLine(result.stderr || result.stdout || String(result.error ?? '')),
      }
      rows.push(row)
      if (status === 'crash') crashes.push(row)
    }

    mkdirSync(resolve(CSV_PATH, '..'), { recursive: true })
    const header = 'command,exit_code,status,duration_ms,error_summary\n'
    const csvEscape = (v: string) => `"${v.replace(/"/g, '""')}"`
    const body = rows
      .map((r) => [csvEscape(r.command), r.exit_code ?? '', r.status, r.duration_ms, csvEscape(r.error_summary)].join(','))
      .join('\n')
    writeFileSync(CSV_PATH, header + body + '\n')

    const counts = rows.reduce<Record<string, number>>((acc, r) => {
      acc[r.status] = (acc[r.status] ?? 0) + 1
      return acc
    }, {})
    // eslint-disable-next-line no-console
    console.log(`[command-sweep] ${rows.length} commands — ${JSON.stringify(counts)} — report: ${CSV_PATH}`)
    if (crashes.length > 0) {
      // eslint-disable-next-line no-console
      console.log('[command-sweep] CRASHES:\n' + crashes.map((c) => `  ${c.command}: ${c.error_summary}`).join('\n'))
    }

    // The bar this sweep actually enforces: no command may leak a raw
    // stack/crash to the user. Clean validation errors (missing args, not
    // found, auth required) are expected and fine — this repo has ~90
    // top-level domains and this sweep only seeds fixtures for `battle`.
    expect(crashes).toEqual([])
  })
})
