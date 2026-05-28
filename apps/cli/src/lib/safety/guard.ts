import { createInterface } from 'node:readline'
import { A, c, sym } from '../../utils/ansi'
import { isCI, isInteractiveTTY, detectEnvLabel, isProduction } from './env-inspector'
import { writeAuditEntry } from './audit'
import type { SafetyGateOptions, RiskLevel } from './types'

// ─── Visual constants ────────────────────────────────────────────────────────

const RISK_HEADER: Record<RiskLevel, string> = {
  LOW:      `${A.brightBlue}${A.bold}  LOW RISK${A.reset}`,
  MEDIUM:   `${A.brightYellow}${A.bold}  MEDIUM RISK  ${sym.warn}${A.reset}`,
  HIGH:     `${A.brightRed}${A.bold}  HIGH RISK  ${sym.warn}${A.reset}`,
  CRITICAL: `${A.bgRed}${A.bold}${A.brightWhite}  CRITICAL  ${sym.warn}  ${A.reset}`,
}

const BORDER_COLOR: Record<RiskLevel, string> = {
  LOW:      A.brightBlue,
  MEDIUM:   A.brightYellow,
  HIGH:     A.brightRed,
  CRITICAL: A.brightRed,
}

const BOX_WIDTH = 52

function border(risk: RiskLevel, ch: string): string {
  return `${BORDER_COLOR[risk]}${ch.repeat(BOX_WIDTH)}${A.reset}`
}

// ─── Impact summary ──────────────────────────────────────────────────────────

function printImpactSummary(opts: SafetyGateOptions, env: string): void {
  const e = process.stderr
  e.write('\n')
  e.write(border(opts.risk, '─') + '\n')
  e.write(`  DESTRUCTIVE ACTION ${RISK_HEADER[opts.risk]}\n`)
  e.write(border(opts.risk, '─') + '\n')
  e.write('\n')
  e.write(`  ${c.bold('What:')}         ${opts.description}\n`)
  e.write(`  ${c.bold('Risk:')}         ${RISK_HEADER[opts.risk].replace(/\x1b\[[0-9;]*m/g, '')} / ${opts.reversibility}\n`)
  e.write(`  ${c.bold('Environment:')}  ${isProduction() ? c.error(env) : c.warn(env)}\n`)

  if (opts.affectedResources && opts.affectedResources.length > 0) {
    e.write('\n')
    e.write(`  ${c.bold('Affected resources:')}\n`)
    for (const r of opts.affectedResources) {
      e.write(`    ${c.muted(sym.arrow)} ${c.warn(r.name)}  ${c.muted(`[${r.type} · ${r.scope}]`)}\n`)
    }
  }

  if (opts.rollbackAvailable === false) {
    e.write('\n')
    e.write(`  ${c.error(`${sym.warn}  This operation cannot be rolled back.`)}\n`)
  }

  if (opts.dryRunSupported) {
    e.write(`  ${c.muted(`Tip: --dry-run shows what would happen without executing.`)}\n`)
  }

  if (opts.notes && opts.notes.length > 0) {
    e.write('\n')
    for (const note of opts.notes) {
      e.write(`  ${c.muted(note)}\n`)
    }
  }

  e.write('\n')
}

// ─── Interactive helpers ─────────────────────────────────────────────────────

async function promptTyped(phrase: string): Promise<boolean> {
  return new Promise((resolve) => {
    const rl = createInterface({ input: process.stdin, output: process.stderr })
    rl.question(`  Type ${c.warn(`"${phrase}"`)} to confirm: `, (answer) => {
      rl.close()
      resolve(answer.trim() === phrase)
    })
  })
}

async function countdown(seconds: number): Promise<void> {
  for (let i = seconds; i > 0; i--) {
    process.stderr.write(
      `\r  ${c.warn(`Executing in ${i}s…`)}  ${c.muted('Ctrl-C to abort')}   `
    )
    await new Promise<void>((res) => setTimeout(res, 1000))
  }
  process.stderr.write('\r' + ' '.repeat(56) + '\r')
}

// ─── Abort helpers ───────────────────────────────────────────────────────────

function abort(opts: SafetyGateOptions, env: string, message: string, hint?: string): never {
  process.stderr.write(`  ${c.error(`${sym.fail}  ${message}`)}\n`)
  if (hint) process.stderr.write(`  ${c.muted(hint)}\n`)
  process.stderr.write('\n')
  writeAuditEntry(opts, false, env)
  process.exit(1)
}

// ─── Public gate ─────────────────────────────────────────────────────────────

/**
 * Assert that the current invocation is safe to proceed with a destructive operation.
 *
 * Call this at the TOP of a command's run() handler, before any mutations.
 * The function either returns normally (safe to proceed) or hard-exits the process.
 *
 * Confirmation resolution order:
 *   1. hasForce === true → print brief warning, allow (works in CI and non-TTY).
 *   2. CI environment → block unless hasForce.
 *   3. Non-interactive TTY → block unless hasForce.
 *   4. FLAG policy → print flag hint, exit.
 *   5. TYPED policy → prompt for typed phrase.
 *   6. COUNTDOWN policy → 5-second countdown with Ctrl-C window.
 */
export async function assertSafe(opts: SafetyGateOptions): Promise<void> {
  const env = detectEnvLabel()
  const inCI = isCI()
  const isTTY = isInteractiveTTY()
  const flagName = opts.forceFlag ?? '--force'

  if (opts.confirmationPolicy === 'NONE') {
    writeAuditEntry(opts, true, env)
    return
  }

  if (opts.hasForce) {
    process.stderr.write(
      `\n  ${c.warn(`${sym.warn}  Proceeding with ${flagName} — confirmation skipped.`)}\n\n`
    )
    writeAuditEntry(opts, true, env)
    return
  }

  printImpactSummary(opts, env)

  if (inCI) {
    abort(
      opts,
      env,
      'CI environment detected. Destructive commands require an explicit force flag in automated pipelines.',
      `Add ${flagName} to your CI command to allow this operation.`
    )
  }

  if (!isTTY) {
    abort(
      opts,
      env,
      'Non-interactive shell. Cannot prompt for confirmation.',
      `Pass ${flagName} to confirm non-interactively.`
    )
  }

  switch (opts.confirmationPolicy) {
    case 'FLAG': {
      process.stderr.write(`  ${c.warn(`Re-run with ${c.bold(flagName)} to confirm.`)}\n\n`)
      abort(opts, env, `Aborted. Re-run with ${flagName} to confirm.`)
    }

    case 'TYPED': {
      const phrase = opts.typedPhrase ?? 'confirm'
      const ok = await promptTyped(phrase)
      if (!ok) {
        abort(opts, env, `Phrase did not match. Aborted.`)
      }
      break
    }

    case 'COUNTDOWN': {
      const secs = opts.countdownSeconds ?? 5
      process.stderr.write(`  ${c.muted('Press Ctrl-C within the countdown to abort.')}\n\n`)
      await countdown(secs)
      break
    }
  }

  writeAuditEntry(opts, true, env)
}
