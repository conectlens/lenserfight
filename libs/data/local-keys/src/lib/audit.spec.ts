import { existsSync, mkdtempSync, readFileSync, statSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

import { appendAuditEvent, MAX_AUDIT_LOG_BYTES } from './audit'

describe('appendAuditEvent', () => {
  it('rotates the log once it reaches the size cap', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'lf-audit-'))
    const env = { LENSERFIGHT_KEYS_DIR: dir } as NodeJS.ProcessEnv
    await appendAuditEvent({ kind: 'list', ok: true }, env)

    const log = join(dir, 'audit.log')
    writeFileSync(log, 'x'.repeat(MAX_AUDIT_LOG_BYTES))

    await appendAuditEvent({ kind: 'auth_failure', ok: false, reason: 'bad_token' }, env)

    expect(existsSync(`${log}.1`)).toBe(true)
    expect(statSync(`${log}.1`).size).toBe(MAX_AUDIT_LOG_BYTES)
    const fresh = readFileSync(log, 'utf-8')
    expect(fresh).toContain('"auth_failure"')
    expect(fresh.length).toBeLessThan(1024)
  })
})
