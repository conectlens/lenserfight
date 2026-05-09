import { mkdtempSync, rmSync } from 'node:fs'
import os from 'node:os'
import path from 'node:path'

import { afterEach, describe, expect, it } from 'vitest'

import {
  fingerprintInterface,
  readConsent,
  resolveTailscaleConsent,
  writeConsent,
} from './tailscale'

const iface = {
  name: 'tailscale0',
  address: '100.64.10.20',
  cidr: '100.64.10.20/32',
  family: 'IPv4' as const,
}

let dirs: string[] = []

function tempDir(): string {
  const dir = mkdtempSync(path.join(os.tmpdir(), 'lf-gateway-ts-'))
  dirs.push(dir)
  return dir
}

afterEach(() => {
  for (const dir of dirs) rmSync(dir, { recursive: true, force: true })
  dirs = []
})

describe('tailscale consent', () => {
  it('fingerprints interface by name and cidr', () => {
    expect(fingerprintInterface(iface)).toBe('tailscale0:100.64.10.20/32')
  })

  it('writes and resolves matching consent', () => {
    const stateDir = tempDir()
    const record = writeConsent({ stateDir, detector: () => [iface], notes: 'ci' })

    expect(record.fingerprints).toEqual(['tailscale0:100.64.10.20/32'])
    expect(readConsent(stateDir)?.notes).toBe('ci')
    expect(resolveTailscaleConsent({ stateDir, detector: () => [iface] })).toMatchObject({
      ok: true,
      matched: iface,
    })
  })

  it('rejects consent when the live interface fingerprint changes', () => {
    const stateDir = tempDir()
    writeConsent({ stateDir, detector: () => [iface] })

    expect(
      resolveTailscaleConsent({
        stateDir,
        detector: () => [{ ...iface, cidr: '100.64.10.21/32', address: '100.64.10.21' }],
      })
    ).toMatchObject({
      ok: false,
      reason: 'fingerprint_mismatch',
    })
  })
})
