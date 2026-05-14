import type { AssetManifestEntryLike } from './types'

const SRI_PREFIX = /^sha(?:256|384|512)-[A-Za-z0-9+/=_-]+$/

export function resolveSRIHash(entry: AssetManifestEntryLike): string {
  if (entry.integrity && SRI_PREFIX.test(entry.integrity)) {
    return entry.integrity
  }
  if (entry.contentHash) {
    return `sha384-${entry.contentHash}`
  }
  return ''
}

export function isValidSRIString(s: string | undefined | null): boolean {
  if (!s) return false
  return SRI_PREFIX.test(s)
}
