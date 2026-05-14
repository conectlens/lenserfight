/**
 * SHA-256 over canonical JSON. Isomorphic across browser, Node 22, and
 * Deno edge runtimes by going through globalThis.crypto.subtle. No fallback
 * to a JS implementation — refusing to run is safer than producing a
 * checksum the verifier rejects.
 *
 * GRASP: Pure Fabrication. Behaviour has no natural domain home.
 */

import { canonicalize } from './canonical'

const HEX = '0123456789abcdef'

function bytesToHex(bytes: Uint8Array): string {
  let out = ''
  for (let i = 0; i < bytes.length; i++) {
    const b = bytes[i]
    out += HEX[(b >> 4) & 0xf] + HEX[b & 0xf]
  }
  return out
}

async function digest(text: string): Promise<string> {
  const subtle = globalThis.crypto?.subtle
  if (!subtle) {
    throw new Error('checksum: WebCrypto subtle is required (Node 22+, modern browsers, Deno)')
  }
  const data = new TextEncoder().encode(text)
  const buf = await subtle.digest('SHA-256', data)
  return bytesToHex(new Uint8Array(buf))
}

export async function sha256OfString(text: string): Promise<string> {
  return digest(text)
}

export async function checksumOf(value: unknown): Promise<string> {
  return digest(canonicalize(value))
}
