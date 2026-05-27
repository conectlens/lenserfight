import { WEB_BASE_URL, readEnv } from '@lenserfight/utils/env'
import { DEFAULT_MEDIA_INLINE_MAX_BYTES } from './types'

/** Public Supabase API origin for rewriting signed storage URLs (e.g. ngrok → :54321). */
export function getSupabasePublicUrl(): string {
  return readEnv('SUPABASE_PUBLIC_URL').replace(/\/$/, '')
}

/** When true, clipboard_external may use the media-content edge proxy. */
export function isMediaContentProxyEnabled(): boolean {
  const flag = readEnv('MEDIA_CONTENT_PROXY_ENABLED')
  if (flag === '1' || flag === 'true') return true
  if (flag === '0' || flag === 'false') return false
  // Default: enabled when we have a non-loopback public Supabase URL or WEB_BASE_URL
  const pub = getSupabasePublicUrl()
  if (pub && !isLoopbackOrigin(pub)) return true
  return !isLoopbackOrigin(WEB_BASE_URL)
}

function isLoopbackOrigin(origin: string): boolean {
  try {
    const h = new URL(origin).hostname.toLowerCase()
    return h === 'localhost' || h === '127.0.0.1' || h === '0.0.0.0'
  } catch {
    return true
  }
}

export function getMediaInlineMaxBytes(): number {
  const raw = readEnv('MEDIA_INLINE_MAX_BYTES')
  if (!raw) return DEFAULT_MEDIA_INLINE_MAX_BYTES
  const n = parseInt(raw, 10)
  return Number.isFinite(n) && n > 0 ? n : DEFAULT_MEDIA_INLINE_MAX_BYTES
}

/** Base URL for edge function media-content (public Supabase or SUPABASE_URL). */
export function getMediaContentProxyBase(): string {
  const pub = getSupabasePublicUrl()
  if (pub) return pub
  const supabase = readEnv('SUPABASE_URL').replace(/\/$/, '')
  return supabase
}

export function buildMediaContentProxyUrl(objectId: string, accessToken: string): string {
  const base = getMediaContentProxyBase().replace(/\/$/, '')
  const params = new URLSearchParams({ object_id: objectId, token: accessToken })
  return `${base}/functions/v1/media-content?${params.toString()}`
}
