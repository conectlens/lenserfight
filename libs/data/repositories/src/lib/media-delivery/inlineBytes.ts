import { DEFAULT_MEDIA_INLINE_MAX_BYTES } from './types'

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer)
  let binary = ''
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]!)
  }
  return btoa(binary)
}

/**
 * Fetches a URL in the browser and returns a data URI when under the size cap.
 * Returns null on failure, oversize, or non-image mime (caller may still use URL).
 */
export async function fetchAsDataUriIfSmall(
  url: string,
  mimeType: string,
  maxBytes = DEFAULT_MEDIA_INLINE_MAX_BYTES,
): Promise<string | null> {
  if (typeof fetch === 'undefined') return null
  if (!mimeType.startsWith('image/')) return null

  try {
    const res = await fetch(url)
    if (!res.ok) return null
    const buf = await res.arrayBuffer()
    if (buf.byteLength > maxBytes) return null
    const b64 = arrayBufferToBase64(buf)
    return `data:${mimeType};base64,${b64}`
  } catch {
    return null
  }
}
