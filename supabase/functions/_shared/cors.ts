// Shared CORS helpers for Supabase Edge Functions.
//
// SECURITY: this module does NOT echo `Access-Control-Allow-Origin: *` for
// responses that carry user-scoped data. Browsers reject `*` + `Authorization`
// only when `credentials` mode is used by the client; the SSE/JSON responses
// here travel back to the same JWT-authenticated origin and were previously
// readable cross-origin via `*`. We now allow ONLY explicitly whitelisted
// origins (env var ALLOWED_ORIGINS, comma-separated) and echo the request's
// Origin when it matches.
//
// Non-browser callers (CLI, server-to-server) do not send an Origin header and
// receive a response with no Allow-Origin header — that is fine because CORS
// only matters for browsers.

declare const Deno: { env: { get(key: string): string | undefined } }

const DEFAULT_ALLOWED_ORIGINS: readonly string[] = [
  'http://localhost:3000',
  'http://localhost:4200',
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'https://lenserfight.com',
  'https://www.lenserfight.com',
  'https://moon.lenserfight.com',
]

function getAllowedOrigins(): readonly string[] {
  const env = Deno.env.get('ALLOWED_ORIGINS')
  if (!env) return DEFAULT_ALLOWED_ORIGINS
  return env.split(',').map((s) => s.trim()).filter(Boolean)
}

function pickAllowedOrigin(req: Request): string | null {
  const origin = req.headers.get('Origin')
  if (!origin) return null
  const allowed = getAllowedOrigins()
  return allowed.includes(origin) ? origin : null
}

/**
 * Compute CORS headers for a specific request. When `req` is provided we echo
 * the matching whitelisted Origin; otherwise we emit no Allow-Origin header.
 */
export function corsHeaders(req?: Request): Record<string, string> {
  const headers: Record<string, string> = {
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Authorization, Content-Type',
    'Vary': 'Origin',
  }
  if (req) {
    const origin = pickAllowedOrigin(req)
    if (origin) headers['Access-Control-Allow-Origin'] = origin
  }
  return headers
}

/**
 * Back-compat constant for legacy callers (partner-* endpoints) that don't
 * yet plumb the Request object through. Keeps `*` so existing same-origin
 * web traffic continues working unchanged. NEW endpoints, and any endpoint
 * carrying sensitive streamed user data, MUST use `corsHeaders(req)` so the
 * Origin is verified against the allow-list.
 */
export const CORS_HEADERS: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Authorization, Content-Type',
  'Vary': 'Origin',
}

export function handleCors(req: Request): Response | null {
  if (req.method === 'OPTIONS') {
    // Preflight: echo the request's Origin when whitelisted; fall back to `*`
    // for legacy callers (server-to-server, tests). Preflights never carry
    // sensitive bodies, so `*` here is safe.
    const origin = pickAllowedOrigin(req)
    const headers = origin ? corsHeaders(req) : CORS_HEADERS
    return new Response(null, { status: 204, headers })
  }
  return null
}

export function jsonResponse(body: unknown, status = 200, req?: Request): Response {
  // When `req` is provided we use the strict per-origin headers (preferred).
  // Without it we fall back to legacy `*` so existing partner endpoints keep
  // working unchanged.
  const headers = req ? corsHeaders(req) : CORS_HEADERS
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...headers, 'Content-Type': 'application/json' },
  })
}

export function errResponse(code: string, message: string, status = 400, req?: Request): Response {
  return jsonResponse({ error: { code, message } }, status, req)
}
