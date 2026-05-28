import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import os from 'node:os'
import path from 'node:path'

import { detectTailscaleInterfaces, type TailscaleInterface } from '@lenserfight/infra/gateway'

/**
 * Tailscale (or compatible WireGuard mesh) bind support.
 *
 * Bringing up a non-loopback bind is one of the highest-blast-radius things
 * the daemon can do, so we require an *explicit*, file-backed consent record
 * stored under `~/.lenserfight/gateway/tailscale-consent.json`. The file is
 * created by `lf gateway consent grant tailscale`, contains the Lenser id of
 * the granter, the timestamp, and the interface fingerprint that was approved.
 *
 * The daemon refuses `--tailscale` unless:
 *   1. the consent file exists,
 *   2. detectTailscaleInterfaces() returns ≥1 qualifying CGNAT interface, and
 *   3. the consent fingerprint matches one of the live interfaces.
 *
 * Anything else is treated as a misconfiguration and surfaces as a precondition
 * failure with `id: tailscale_consent`.
 */

export interface TailscaleConsentRecord {
  granted_at: string
  granter_lenser_id?: string | null
  fingerprints: string[]
  notes?: string
}

export interface TailscaleConsentResolution {
  ok: boolean
  reason?:
    | 'no_consent_file'
    | 'no_tailscale_interface'
    | 'fingerprint_mismatch'
    | 'malformed_consent'
  consent?: TailscaleConsentRecord
  matched?: TailscaleInterface
  available: TailscaleInterface[]
}

export function consentFilePath(stateDir?: string): string {
  return path.join(
    stateDir ?? path.join(os.homedir(), '.lenserfight', 'gateway'),
    'tailscale-consent.json'
  )
}

/**
 * A stable fingerprint per detected interface — `name:cidr`. We deliberately
 * avoid hashing because the user must be able to inspect their own consent
 * file by hand and verify the bind safely.
 */
export function fingerprintInterface(iface: TailscaleInterface): string {
  return `${iface.name}:${iface.cidr ?? iface.address}`
}

export function readConsent(stateDir?: string): TailscaleConsentRecord | null {
  const file = consentFilePath(stateDir)
  if (!existsSync(file)) return null
  try {
    const parsed = JSON.parse(readFileSync(file, 'utf-8')) as Partial<TailscaleConsentRecord>
    if (!parsed || typeof parsed !== 'object') return null
    if (!Array.isArray(parsed.fingerprints) || !parsed.granted_at) return null
    return {
      granted_at: parsed.granted_at,
      granter_lenser_id: parsed.granter_lenser_id ?? null,
      fingerprints: parsed.fingerprints.map(String),
      notes: parsed.notes,
    }
  } catch {
    return null
  }
}

export interface WriteConsentInput {
  stateDir?: string
  granterLenserId?: string | null
  notes?: string
  /** Override interface detection (used by tests). */
  detector?: () => TailscaleInterface[]
}

export function writeConsent(input: WriteConsentInput = {}): TailscaleConsentRecord {
  const interfaces = (input.detector ?? detectTailscaleInterfaces)()
  if (interfaces.length === 0) {
    throw new Error(
      'no_tailscale_interface: no CGNAT 100.64.0.0/10 interface detected. ' +
        'Bring up Tailscale (or your WireGuard mesh) before granting consent.'
    )
  }
  const record: TailscaleConsentRecord = {
    granted_at: new Date().toISOString(),
    granter_lenser_id: input.granterLenserId ?? null,
    fingerprints: interfaces.map(fingerprintInterface),
    notes: input.notes,
  }
  const file = consentFilePath(input.stateDir)
  mkdirSync(path.dirname(file), { recursive: true, mode: 0o700 })
  writeFileSync(file, JSON.stringify(record, null, 2), { mode: 0o600 })
  return record
}

export function resolveTailscaleConsent(
  options: { stateDir?: string; detector?: () => TailscaleInterface[] } = {}
): TailscaleConsentResolution {
  const available = (options.detector ?? detectTailscaleInterfaces)()
  const consent = readConsent(options.stateDir)
  if (!consent) {
    return {
      ok: false,
      reason: 'no_consent_file',
      available,
    }
  }
  if (available.length === 0) {
    return {
      ok: false,
      reason: 'no_tailscale_interface',
      consent,
      available,
    }
  }
  const matched = available.find((iface) =>
    consent.fingerprints.includes(fingerprintInterface(iface))
  )
  if (!matched) {
    return {
      ok: false,
      reason: 'fingerprint_mismatch',
      consent,
      available,
    }
  }
  return { ok: true, consent, matched, available }
}
