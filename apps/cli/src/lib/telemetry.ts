/**
 * AB-4: Opt-in anonymous CLI telemetry.
 *
 * Default: OFF. Enabled only when LF_TELEMETRY=opt-in is explicitly set.
 * First-run: prompts the user once; writes their choice to ~/.lenserfight/telemetry.json.
 *
 * Collected fields (no user content, no PII):
 *   - command: string       top-level command name
 *   - exitCode: number      process exit code
 *   - durationMs: number    wall-clock time
 *   - schemaVersion: string lenserfight package.json version
 *   - nodeVersion: string   Node.js version
 *   - platform: string      linux | darwin | win32
 *
 * The collector is a noop in Community Edition (no remote endpoint configured).
 * When a telemetry endpoint is configured via LF_TELEMETRY_ENDPOINT, events are
 * sent as a single fire-and-forget POST. No retry, no queuing, no persistence.
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'
import consola from 'consola'
import { getExecContext } from './exec-context'

export type TelemetryEvent = {
  command: string
  exitCode: number
  durationMs: number
  schemaVersion: string
  nodeVersion: string
  platform: string
}

type TelemetryConfig = { optIn: boolean; promptedAt: string }

const CONFIG_PATH = join(homedir(), '.lenserfight', 'telemetry.json')
const ENDPOINT = process.env['LF_TELEMETRY_ENDPOINT'] ?? ''

function isEnabled(): boolean {
  const env = process.env['LF_TELEMETRY']
  if (!env) return false
  if (env === 'opt-in') {
    try {
      const cfg = JSON.parse(readFileSync(CONFIG_PATH, 'utf-8')) as TelemetryConfig
      return cfg.optIn === true
    } catch {
      return false
    }
  }
  return false
}

export async function promptTelemetryConsent(): Promise<void> {
  if (getExecContext().isLocal) return
  if (process.env['LF_TELEMETRY'] !== 'opt-in') return
  if (existsSync(CONFIG_PATH)) return
  if (!process.stdin.isTTY) return

  const { createInterface } = await import('readline')
  const rl = createInterface({ input: process.stdin, output: process.stdout })
  const answer = await new Promise<string>((resolve) =>
    rl.question(
      '\n  LenserFight can collect anonymous usage data to improve the CLI.\n' +
      '  This includes only: command name, exit code, duration, schema version.\n' +
      '  No prompts, outputs, or personal data are ever sent.\n' +
      '  Opt in? (y/n) ',
      (a) => { rl.close(); resolve(a.trim().toLowerCase()) }
    )
  )

  const optIn = answer === 'y' || answer === 'yes'
  const dir = join(homedir(), '.lenserfight')
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
  const cfg: TelemetryConfig = { optIn, promptedAt: new Date().toISOString() }
  writeFileSync(CONFIG_PATH, JSON.stringify(cfg, null, 2) + '\n', 'utf-8')

  if (optIn) {
    console.log('  Telemetry enabled. Thank you.')
  } else {
    console.log('  Telemetry disabled. Set LF_TELEMETRY=opt-in to re-prompt.')
  }
}

export async function recordEvent(event: TelemetryEvent): Promise<void> {
  const { isLocal, isDebug } = getExecContext()
  if (isLocal) {
    if (isDebug) consola.debug(`[${new Date().toISOString().slice(11, 23)}] telemetry skipped: local mode`)
    return
  }
  if (!isEnabled() || !ENDPOINT) return
  try {
    await fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(event),
      signal: AbortSignal.timeout(3000),
    })
  } catch {
    // fire-and-forget — never surface telemetry errors to the user
  }
}
