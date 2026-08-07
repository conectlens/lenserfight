import { resolveBearerToken, resolveConfig } from '@lenserfight/cli-client'

/**
 * Checks whether a requireAuth:true RPC call would find a *currently valid*
 * bearer token. Mirrors callRpc's own resolveBearerToken check, plus an
 * expiry check callRpc itself doesn't do up front (it just sends whatever
 * token is stored and lets the server's 401 decide) — a present-but-expired
 * token is exactly as unusable here as no token at all, and either one would
 * otherwise fall through to callRpc's automatic auth-recovery, which on an
 * interactive TTY opens a real browser device-login flow.
 *
 * Callers that poll requireAuth endpoints in the background (status-line
 * data, activity feeds) must check this FIRST and skip the call entirely
 * when it's false: that auto-recovery is fine for a command the user
 * explicitly ran, but never acceptable to trigger from an unattended poll.
 */
export function hasResolvableAuthToken(): boolean {
  try {
    const config = resolveConfig()
    const token = resolveBearerToken(config, { requireAuth: true })
    if (token === undefined) return false
    if (config.authExpiresAt && new Date(config.authExpiresAt).getTime() <= Date.now()) return false
    return true
  } catch {
    return false
  }
}
