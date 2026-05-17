/**
 * CLI error reporter — the single rendering surface for all CLI failures.
 *
 * Every error that reaches the user goes through `reportCliError()`. This
 * function wires together the error taxonomy, recovery guidance, and docs
 * registry into a structured, recovery-oriented output.
 *
 * ## Output modes
 *
 * | Mode        | Trigger              | Output                             |
 * |-------------|----------------------|------------------------------------|
 * | Default     | interactive TTY      | Color-coded banner + recovery hints|
 * | Plain text  | NO_COLOR / non-TTY   | Same structure, no ANSI            |
 * | JSON        | `json: true` option  | Structured JSON to stderr          |
 * | Debug       | --debug flag         | All hints + full stack trace       |
 *
 * ## Progressive disclosure
 * - Default: headline + detail + 2 recovery hints + docs link
 * - Debug: all hints + stack trace + context label
 */

import { A, isPlainText } from './ansi'
import { classifyError, serializeTaxonomyEntry } from './error-taxonomy'
import { renderDocsLine } from './docs-registry'
import { compactHints, allHints, buildContextLabel } from './recovery-guidance'
import { getExecContext } from '../lib/exec-context'

// ─── Colors (always raw — we gate them via isPlainText()) ────────────────────

const RESET = A.reset
const BOLD  = A.bold
const DIM   = A.dim

const COLOR: Record<string, string> = {
  unauthorized: A.brightRed,
  forbidden:    A.brightRed,
  not_found:    A.yellow,
  rate_limited: A.brightYellow,
  network:      A.brightYellow,
  gateway:      A.brightYellow,
  provider:     A.brightYellow,
  multimodal:   A.cyan,
  workflow:     A.cyan,
  battle:       A.brightRed,
  schema:       A.cyan,
  config:       A.brightYellow,
  local_model:  A.yellow,
  unknown:      A.gray,
}

// ─── Public options ───────────────────────────────────────────────────────────

export interface ReportOptions {
  /** Emit structured JSON to stderr instead of the decorated banner. */
  json?: boolean
}

// ─── Core reporter ────────────────────────────────────────────────────────────

/**
 * Classify, format, and write an error to stderr.
 *
 * Call this from command catch blocks via `handleError()` in `api.ts`.
 * Do not call `process.exit()` here — the exit code is set by the caller.
 */
export function reportCliError(error: unknown, options: ReportOptions = {}): void {
  const entry = classifyError(error)
  const { isDebug } = getExecContext()

  // ── JSON mode ─────────────────────────────────────────────────────────────
  if (options.json) {
    const payload = serializeTaxonomyEntry(entry, error)
    process.stderr.write(JSON.stringify(payload, null, 2) + '\n')
    return
  }

  // ── Plain text / color mode ───────────────────────────────────────────────
  const plain = isPlainText()

  const color    = plain ? '' : (COLOR[entry.kind] ?? A.gray)
  const bold     = plain ? '' : BOLD
  const dim      = plain ? '' : DIM
  const reset    = plain ? '' : RESET

  const sep = plain
    ? '─'.repeat(50)
    : `${A.gray}${'─'.repeat(50)}${RESET}`

  const write = (s: string) => process.stderr.write(s)

  write('\n')

  // Banner: " HEADLINE "
  if (plain) {
    write(`[${entry.kind.toUpperCase()}] ${entry.headline}\n`)
  } else {
    write(`${A.bgBlack}${color}${bold} ${entry.headline} ${reset}`)
    write(`  ${A.gray}[${entry.component}]${RESET}\n`)
  }

  write(`${sep}\n`)

  // Detail
  write(`${dim}  ${entry.detail}${reset}\n`)

  // Context label (workflow, battle, provider, phase …)
  const contextLabel = buildContextLabel(error)
  if (contextLabel) {
    write(`${dim}  ${contextLabel}${reset}\n`)
  }

  write('\n')

  // Recovery hints
  const hints = isDebug ? allHints(entry.kind) : compactHints(entry.kind)
  if (hints.length > 0) {
    write(`${plain ? '' : `${A.gray}`}  next steps:${reset}\n`)
    for (const hint of hints) {
      if (plain) {
        write(`    → ${hint}\n`)
      } else {
        write(`  ${A.gray}→${RESET}  ${hint}\n`)
      }
    }
    write('\n')
  }

  // Docs link (only when confusion risk is high — not for every error)
  if (shouldShowDocs(entry.kind)) {
    const docsLine = renderDocsLine(entry.docsKey)
    if (docsLine) {
      write(`${docsLine}\n`)
      write('\n')
    }
  }

  // Debug extras
  if (isDebug) {
    // Inspect area
    write(`${dim}  inspect: ${entry.inspectArea}${reset}\n`)

    // Stack trace
    if (error instanceof Error && error.stack) {
      write(`\n${dim}  Stack trace:${reset}\n`)
      for (const line of error.stack.split('\n').slice(1)) {
        write(`${plain ? '' : A.gray}  ${line}${reset}\n`)
      }
    }

    // Raw structured entry
    write(`\n${dim}  taxonomy: ${entry.kind} | recoverable=${entry.recoverable}${reset}\n`)
  }

  write(`${sep}\n\n`)
}

/**
 * Report an error and set process.exitCode = 1.
 * Does NOT call process.exit() — allows cleanup handlers to run.
 */
export function handleCliError(error: unknown, options: ReportOptions = {}): void {
  reportCliError(error, options)
  process.exitCode = 1
}

/**
 * Report an error and immediately exit.
 * Use only when continuing is impossible (e.g., missing critical config).
 */
export function exitWithError(error: unknown, options: ReportOptions = {}): never {
  reportCliError(error, options)
  process.exit(1)
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Decide whether to show a docs link for a given error kind.
 *
 * Links are shown only when the developer is likely confused or needs setup
 * guidance. Routine errors (rate_limited, not_found) skip the link to avoid
 * noise. The link is always shown in --debug mode.
 */
function shouldShowDocs(kind: string): boolean {
  const { isDebug } = getExecContext()
  if (isDebug) return true

  const highConfusionKinds = new Set([
    'unauthorized',
    'gateway',
    'config',
    'local_model',
    'provider',
    'multimodal',
    'workflow',
    'schema',
    'unknown',
  ])
  return highConfusionKinds.has(kind)
}
