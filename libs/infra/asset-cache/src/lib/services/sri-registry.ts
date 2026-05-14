import { AssetIntegrityError } from '../types/errors'

function bufferToBase64(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf)
  let binary = ''
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i])
  if (typeof btoa === 'function') return btoa(binary)
  const g = globalThis as { Buffer?: { from(s: string, enc: string): { toString(enc: string): string } } }
  if (g.Buffer) return g.Buffer.from(binary, 'binary').toString('base64')
  throw new Error('No base64 encoder available')
}

function algorithmFromIntegrity(integrity: string): 'SHA-256' | 'SHA-384' | 'SHA-512' | null {
  if (integrity.startsWith('sha256-')) return 'SHA-256'
  if (integrity.startsWith('sha384-')) return 'SHA-384'
  if (integrity.startsWith('sha512-')) return 'SHA-512'
  return null
}

export class SRIRegistry {
  private readonly map = new Map<string, string>()

  register(assetId: string, integrity: string): void {
    if (integrity) this.map.set(assetId, integrity)
  }

  get(assetId: string): string | undefined {
    return this.map.get(assetId)
  }

  has(assetId: string): boolean {
    return this.map.has(assetId)
  }

  async validateResponse(
    assetId: string,
    url: string,
    response: Response,
    expectedIntegrity?: string,
  ): Promise<boolean> {
    const expected = expectedIntegrity ?? this.get(assetId)
    if (!expected) return true
    const algo = algorithmFromIntegrity(expected)
    if (!algo) return true
    if (typeof crypto === 'undefined' || !crypto.subtle) return true

    const buf = await response.clone().arrayBuffer()
    const hashBuf = await crypto.subtle.digest(algo, buf)
    const prefix = algo === 'SHA-256' ? 'sha256-' : algo === 'SHA-384' ? 'sha384-' : 'sha512-'
    const actual = `${prefix}${bufferToBase64(hashBuf)}`
    if (actual !== expected) {
      throw new AssetIntegrityError(assetId, url, expected, actual)
    }
    return true
  }
}
