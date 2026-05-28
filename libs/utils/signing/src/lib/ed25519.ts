import {
  createPrivateKey,
  createPublicKey,
  generateKeyPairSync,
  KeyObject,
  sign as cryptoSign,
  verify as cryptoVerify,
} from 'node:crypto'

export interface Ed25519Keypair {
  /** Base64-encoded raw 32-byte public key. */
  publicKey: string
  /** Base64-encoded raw 32-byte private key seed. */
  privateKey: string
}

const ED25519_OID_PUBLIC_PREFIX = Buffer.from('302a300506032b6570032100', 'hex')
const ED25519_OID_PRIVATE_PREFIX = Buffer.from('302e020100300506032b657004220420', 'hex')

/**
 * Generate a new Ed25519 keypair using the platform CSPRNG.
 *
 * Both keys are returned as base64-encoded raw 32-byte values, suitable for
 * persistence in the OS keychain ([`@lenserfight/utils/keychain`]) and for
 * sending the public key over the wire to Supabase.
 */
export function generateEd25519Keypair(): Ed25519Keypair {
  const { publicKey, privateKey } = generateKeyPairSync('ed25519')
  return {
    publicKey: extractRawPublic(publicKey),
    privateKey: extractRawPrivate(privateKey),
  }
}

export function publicKeyToBase64Raw(publicKey: KeyObject): string {
  return extractRawPublic(publicKey)
}

export function rawPrivateKeyFromBase64(base64: string): KeyObject {
  const raw = Buffer.from(base64, 'base64')
  if (raw.length !== 32) {
    throw new RangeError('Ed25519 private key must be 32 raw bytes')
  }
  const der = Buffer.concat([ED25519_OID_PRIVATE_PREFIX, raw])
  return createPrivateKey({ key: der, format: 'der', type: 'pkcs8' })
}

export function rawPublicKeyFromBase64(base64: string): KeyObject {
  const raw = Buffer.from(base64, 'base64')
  if (raw.length !== 32) {
    throw new RangeError('Ed25519 public key must be 32 raw bytes')
  }
  const der = Buffer.concat([ED25519_OID_PUBLIC_PREFIX, raw])
  return createPublicKey({ key: der, format: 'der', type: 'spki' })
}

export function ed25519Sign(privateKeyB64: string, message: Buffer): string {
  const key = rawPrivateKeyFromBase64(privateKeyB64)
  const sig = cryptoSign(null, message, key)
  return sig.toString('base64url')
}

export function ed25519Verify(
  publicKeyB64: string,
  message: Buffer,
  signatureB64Url: string
): boolean {
  const key = rawPublicKeyFromBase64(publicKeyB64)
  let signature: Buffer
  try {
    signature = Buffer.from(signatureB64Url, 'base64url')
  } catch {
    return false
  }
  if (signature.length !== 64) return false
  return cryptoVerify(null, message, key, signature)
}

function extractRawPublic(key: KeyObject): string {
  const der = key.export({ format: 'der', type: 'spki' }) as Buffer
  // SPKI DER for Ed25519 has a 12-byte algorithm prefix; raw key follows.
  return der.subarray(der.length - 32).toString('base64')
}

function extractRawPrivate(key: KeyObject): string {
  const der = key.export({ format: 'der', type: 'pkcs8' }) as Buffer
  // PKCS#8 DER for Ed25519 has a fixed 16-byte prefix followed by an OCTET
  // STRING wrapping the 32-byte raw seed: 04 20 <seed>.
  return der.subarray(der.length - 32).toString('base64')
}
