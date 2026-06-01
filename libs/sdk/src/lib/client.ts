import type { CreateClientOptions } from './types'

export interface SupabaseLikeRpcClient {
  rpc: (
    fn: string,
    params?: Record<string, unknown>,
  ) => Promise<{ data: unknown; error: unknown }>
}

/**
 * Minimal Supabase-shaped RPC client. We intentionally do NOT pull
 * @supabase/supabase-js into the SDK runtime — peers can use any client
 * conforming to the SupabaseLikeRpcClient shape, which makes Node, browser,
 * and test environments equally easy.
 *
 * The default client used by createClient() POSTs to `${url}/rest/v1/rpc/${fn}`
 * with the anon key as the `apikey` header — i.e. the exact wire format
 * Supabase PostgREST exposes.
 */
export function createFetchRpcClient(opts: CreateClientOptions): SupabaseLikeRpcClient {
  if (!opts.url) {
    throw new Error('@lenserfight/sdk: createClient requires `url`')
  }
  if (!opts.anonKey) {
    throw new Error('@lenserfight/sdk: createClient requires `anonKey`')
  }
  const fetchImpl = opts.fetch ?? globalThis.fetch
  if (typeof fetchImpl !== 'function') {
    throw new Error('@lenserfight/sdk: global fetch unavailable — pass `fetch` in options')
  }
  // Trim trailing slash for predictable URL construction.
  const baseUrl = opts.url.replace(/\/+$/, '')
  // When a developer token / API key is provided, use it as the Bearer token
  // so requests are authenticated as the token holder rather than anon.
  const authToken = opts.apiKey ?? opts.anonKey
  return {
    async rpc(fn, params) {
      const res = await fetchImpl(`${baseUrl}/rest/v1/rpc/${fn}`, {
        method: 'POST',
        headers: {
          apikey: opts.anonKey,
          authorization: `Bearer ${authToken}`,
          'content-type': 'application/json',
        },
        body: JSON.stringify(params ?? {}),
      })
      if (!res.ok) {
        const body = await res.text().catch(() => '')
        return {
          data: null,
          error: { status: res.status, message: body || res.statusText },
        }
      }
      const data = (await res.json().catch(() => null)) as unknown
      return { data, error: null }
    },
  }
}
