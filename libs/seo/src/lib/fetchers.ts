/**
 * Lightweight Supabase RPC access for the edge Worker. Uses plain `fetch`
 * against PostgREST rather than the full `@supabase/supabase-js` client to keep
 * the Worker bundle small. The anon key is the only credential — RLS is the
 * security boundary, so a fetcher can never read a non-public row.
 */

export interface SupabaseRestConfig {
  supabaseUrl: string
  anonKey: string
  /** Injectable for tests; defaults to the runtime `fetch`. */
  fetchImpl?: typeof fetch
}

export interface RpcOptions {
  /**
   * When true (default), a SETOF result is unwrapped: `[]` → `null`, `[row]` →
   * `row`. Set false to receive the raw array.
   */
  single?: boolean
}

/**
 * Call a Postgres function via PostgREST with the anon key.
 *
 * @returns the row (or unwrapped scalar) on success, `null` when not found /
 *   not public (empty set or 404). Throws on transport or server errors so the
 *   Worker can fall back to the SPA shell rather than serving a wrong page.
 */
export async function callRpc<T = unknown>(
  config: SupabaseRestConfig,
  fnName: string,
  params: Record<string, unknown> = {},
  options: RpcOptions = {},
): Promise<T | null> {
  const { single = true } = options
  const doFetch = config.fetchImpl ?? fetch
  const res = await doFetch(`${config.supabaseUrl}/rest/v1/rpc/${fnName}`, {
    method: 'POST',
    headers: {
      apikey: config.anonKey,
      Authorization: `Bearer ${config.anonKey}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify(params),
  })

  if (res.status === 404) return null
  if (!res.ok) {
    throw new Error(`RPC ${fnName} failed: ${res.status}`)
  }

  const data = (await res.json()) as unknown
  if (!single) return data as T
  if (Array.isArray(data)) return (data.length ? (data[0] as T) : null)
  return (data ?? null) as T | null
}

/**
 * Bind a config to the per-entity read functions. Each returns the raw public
 * row (or `null`); Phase 2 maps rows into the builder input shapes once the
 * anon read functions' columns are finalized (see Phase 0 audit).
 */
export function makeSeoFetchers(config: SupabaseRestConfig) {
  return {
    getLens: (id: string) => callRpc(config, 'fn_get_lens_detail_bootstrap', { p_lens_id: id }),
    getBattle: (slug: string) => callRpc(config, 'fn_get_battle_by_slug', { p_slug: slug }),
    getLenser: (handle: string) => callRpc(config, 'fn_get_lenser_profile_full', { p_handle: handle }),
    getWorkflow: (id: string) => callRpc(config, 'fn_get_workflow_public', { p_workflow_id: id }),
    getThread: (id: string) => callRpc(config, 'fn_get_thread_public', { p_thread_id: id }),
    getRay: (slug: string) => callRpc(config, 'fn_get_ray_public', { p_slug: slug }),
  }
}
