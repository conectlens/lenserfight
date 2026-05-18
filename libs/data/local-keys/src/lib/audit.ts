/**
 * Append-only audit log for local-key access.
 *
 * One line per event, JSON. Lives at `~/.lenserfight/keys/audit.log` with
 * mode 0600. Records every resolve(), add(), update(), remove() — both
 * success and failure — plus gateway auth failures.
 *
 * Tampering is not prevented (a same-user attacker can rewrite the file),
 * but the log is helpful for forensics and for `lf keys doctor` to surface
 * unexpected access patterns.
 */

import { constants as fsConstants, openSync, closeSync, writeSync } from 'node:fs'
import { mkdir } from 'node:fs/promises'
import { dirname } from 'node:path'

import { getAuditLogPath, KEYS_FILE_MODE } from './paths'

export type AuditEventKind =
  | 'list'
  | 'add'
  | 'update'
  | 'remove'
  | 'resolve'
  | 'export'
  | 'auth_failure'
  | 'rate_limited'

export interface AuditEvent {
  ts: string
  kind: AuditEventKind
  /** Key id when applicable. Never plaintext or ciphertext. */
  keyId?: string
  ok: boolean
  /** Short reason code for failures (matches LocalKeyStoreErrorCode). */
  reason?: string
  /** Free-form context, e.g. caller user-agent. Never sensitive material. */
  context?: Record<string, string | number | boolean>
}

let lastInit = ''

async function ensureDir(path: string): Promise<void> {
  await mkdir(dirname(path), { recursive: true, mode: 0o700 })
}

export async function appendAuditEvent(
  event: Omit<AuditEvent, 'ts'>,
  env?: NodeJS.ProcessEnv
): Promise<void> {
  const target = getAuditLogPath(env)
  if (lastInit !== target) {
    await ensureDir(target)
    lastInit = target
  }
  const line = JSON.stringify({ ts: new Date().toISOString(), ...event }) + '\n'
  let fd: number | null = null
  try {
    fd = openSync(
      target,
      fsConstants.O_WRONLY | fsConstants.O_CREAT | fsConstants.O_APPEND | fsConstants.O_NOFOLLOW,
      KEYS_FILE_MODE
    )
    writeSync(fd, line)
  } catch {
    // Audit log failures must NEVER block the primary operation. Swallow.
  } finally {
    if (fd !== null) {
      try {
        closeSync(fd)
      } catch {
        // ignore
      }
    }
  }
}
