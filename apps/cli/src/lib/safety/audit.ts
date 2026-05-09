import { appendFileSync, mkdirSync } from 'node:fs'
import { homedir } from 'node:os'
import { resolve, dirname } from 'node:path'
import type { SafetyGateOptions, RiskLevel, Reversibility } from './types'

const AUDIT_PATH = resolve(homedir(), '.lenserfight', 'audit.log')

let auditDirEnsured = false

interface AuditEntry {
  ts: string
  risk: RiskLevel
  reversibility: Reversibility
  env: string
  confirmed: boolean
  description: string
  resources: SafetyGateOptions['affectedResources']
}

/**
 * Append one JSONL entry to ~/.lenserfight/audit.log.
 * Failures are silently swallowed — audit logging must never block execution.
 */
export function writeAuditEntry(
  opts: SafetyGateOptions,
  confirmed: boolean,
  env: string
): void {
  try {
    if (!auditDirEnsured) {
      mkdirSync(dirname(AUDIT_PATH), { recursive: true })
      auditDirEnsured = true
    }
    const entry: AuditEntry = {
      ts: new Date().toISOString(),
      risk: opts.risk,
      reversibility: opts.reversibility,
      env,
      confirmed,
      description: opts.description,
      resources: opts.affectedResources ?? [],
    }
    appendFileSync(AUDIT_PATH, JSON.stringify(entry) + '\n', { encoding: 'utf8' })
  } catch {
    // Non-fatal: audit log write failure must not block the operation.
  }
}
