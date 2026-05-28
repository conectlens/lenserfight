import { createHash } from 'node:crypto'

import { canonicalize } from './canonicalize'
import { ed25519Sign, ed25519Verify } from './ed25519'
import { generateNonce, nowIat } from './nonce'

export interface SignedEnvelope<TBody = unknown> {
  v: 1
  alg: 'ed25519'
  /** Device id (UUID) — must equal a devices.registered_devices.id. */
  kid: string
  /** Unix seconds at sign time. */
  iat: number
  /** 128-bit base64url nonce. */
  nonce: string
  body: TBody
  /** Detached Ed25519 signature over SHA-256(JCS({v,alg,kid,iat,nonce,body})). */
  sig: string
}

export type VerifyFailureReason =
  | 'malformed_envelope'
  | 'unsupported_version'
  | 'unsupported_algorithm'
  | 'signature_mismatch'
  | 'iat_window'
  | 'nonce_invalid'
  | 'kid_mismatch'

export type VerifyResult =
  | { ok: true }
  | { ok: false; reason: VerifyFailureReason }

export interface SignOptions {
  /** Override `iat` (test only). */
  iat?: number
  /** Override `nonce` (test only). */
  nonce?: string
}

export interface VerifyOptions {
  /** Allowed clock skew in seconds (default ±300). */
  iatWindowSeconds?: number
  /** Source of truth for "now" (test only). */
  now?: number
  /** Optional kid to match against (e.g. a known device id). */
  expectedKid?: string
}

const DEFAULT_IAT_WINDOW = 300

/**
 * Sign a body and produce a SignedEnvelope. The hashed payload is
 * SHA-256(JCS({v,alg,kid,iat,nonce,body})). Mirrors RFC-0003 §3.
 */
export function signEnvelope<TBody>(
  privateKeyB64: string,
  kid: string,
  body: TBody,
  options: SignOptions = {}
): SignedEnvelope<TBody> {
  const envelope: Omit<SignedEnvelope<TBody>, 'sig'> = {
    v: 1,
    alg: 'ed25519',
    kid,
    iat: options.iat ?? nowIat(),
    nonce: options.nonce ?? generateNonce(),
    body,
  }
  const digest = digestEnvelope(envelope)
  const sig = ed25519Sign(privateKeyB64, digest)
  return { ...envelope, sig }
}

/**
 * Verify a SignedEnvelope. Returns a structured result; never throws.
 */
export function verifyEnvelope<TBody>(
  publicKeyB64: string,
  envelope: SignedEnvelope<TBody>,
  options: VerifyOptions = {}
): VerifyResult {
  if (!isWellFormedEnvelope(envelope)) {
    return { ok: false, reason: 'malformed_envelope' }
  }
  if (envelope.v !== 1) return { ok: false, reason: 'unsupported_version' }
  if (envelope.alg !== 'ed25519') {
    return { ok: false, reason: 'unsupported_algorithm' }
  }
  if (options.expectedKid && envelope.kid !== options.expectedKid) {
    return { ok: false, reason: 'kid_mismatch' }
  }

  const now = options.now ?? nowIat()
  const window = options.iatWindowSeconds ?? DEFAULT_IAT_WINDOW
  if (Math.abs(now - envelope.iat) > window) {
    return { ok: false, reason: 'iat_window' }
  }

  if (!isValidNonce(envelope.nonce)) {
    return { ok: false, reason: 'nonce_invalid' }
  }

  const digest = digestEnvelope({
    v: envelope.v,
    alg: envelope.alg,
    kid: envelope.kid,
    iat: envelope.iat,
    nonce: envelope.nonce,
    body: envelope.body,
  })
  const ok = ed25519Verify(publicKeyB64, digest, envelope.sig)
  return ok ? { ok: true } : { ok: false, reason: 'signature_mismatch' }
}

function digestEnvelope<TBody>(envelope: Omit<SignedEnvelope<TBody>, 'sig'>): Buffer {
  const canonical = canonicalize({
    v: envelope.v,
    alg: envelope.alg,
    kid: envelope.kid,
    iat: envelope.iat,
    nonce: envelope.nonce,
    body: envelope.body,
  })
  return createHash('sha256').update(canonical, 'utf-8').digest()
}

function isWellFormedEnvelope(value: unknown): value is SignedEnvelope {
  if (!value || typeof value !== 'object') return false
  const e = value as Partial<SignedEnvelope>
  if (typeof e.v !== 'number') return false
  if (typeof e.alg !== 'string') return false
  if (typeof e.kid !== 'string' || e.kid.length === 0) return false
  if (typeof e.iat !== 'number' || !Number.isFinite(e.iat)) return false
  if (typeof e.nonce !== 'string') return false
  if (typeof e.sig !== 'string' || e.sig.length === 0) return false
  return true
}

function isValidNonce(nonce: string): boolean {
  if (nonce.length < 10 || nonce.length > 128) return false
  return /^[A-Za-z0-9_-]+$/.test(nonce)
}
