// Worker-safe Supabase anon read layer. Uses a plain `fetch` to the PostgREST
// `/rest/v1/rpc/<fn>` endpoint with the anon key — no `@supabase/supabase-js`
// (too heavy for the edge). RLS is the security boundary: these only ever return
// publicly visible rows. `fetchImpl` is injectable so callers/tests can mock it.

export interface SupabaseAnonConfig {
  supabaseUrl: string
  anonKey: string
  fetchImpl?: typeof fetch
}

/** One row of a fn_list_public_* result — the route key + honest lastmod. */
export interface SitemapRow {
  entity_key: string
  lastmod: string | null
  sort_id: string
}

/** One row of fn_list_recent_public — kind-tagged for the fresh shard. */
export interface RecentRow {
  kind: string
  entity_key: string
  lastmod: string | null
}

/** sitemaps.org per-file URL cap; also the max page size the RPCs accept. */
export const RPC_PAGE_SIZE = 50000

async function callRpc<T>(
  cfg: SupabaseAnonConfig,
  fn: string,
  args: Record<string, unknown>,
): Promise<T[]> {
  const doFetch = cfg.fetchImpl ?? fetch
  const url = `${cfg.supabaseUrl.replace(/\/+$/, '')}/rest/v1/rpc/${fn}`
  const res = await doFetch(url, {
    method: 'POST',
    headers: {
      apikey: cfg.anonKey,
      Authorization: `Bearer ${cfg.anonKey}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify(args),
  })
  // 404 / empty → treat as "no rows" so a missing entity degrades gracefully.
  if (res.status === 404) return []
  if (!res.ok) {
    throw new Error(`Supabase RPC ${fn} failed: ${res.status} ${res.statusText}`)
  }
  // PostgREST returns an array for RETURNS TABLE/SETOF functions, but a bare
  // scalar (object, or the JSON literal null) for a function returning a single
  // jsonb/composite value — several detail RPCs (e.g. fn_get_lens_detail_bootstrap,
  // fn_lensers_get_public_profile) are the latter, so both shapes must be handled.
  const json = (await res.json()) as T[] | T | null
  if (Array.isArray(json)) return json
  return json === null ? [] : [json]
}

/** Calls an RPC expected to return a single row (detail reads); null if empty. */
export async function fetchOne(
  cfg: SupabaseAnonConfig,
  fn: string,
  args: Record<string, unknown>,
): Promise<Record<string, unknown> | null> {
  const rows = await callRpc<Record<string, unknown>>(cfg, fn, args)
  return rows.length > 0 ? rows[0] : null
}

const LIST_FN: Record<string, string> = {
  lens: 'fn_list_public_lenses',
  battle: 'fn_list_public_battles',
  lenser: 'fn_list_public_lensers',
  workflow: 'fn_list_public_workflows',
  thread: 'fn_list_public_threads',
  ray: 'fn_list_public_rays',
}

/**
 * Fetches one keyset page of public entities of `kind`. Pass the previous page's
 * last `sort_id` as `after` to continue. Returns up to `limit` rows ordered by
 * uuid — stable, immutable id-range paging for archive shards.
 */
export function listPublicEntities(
  cfg: SupabaseAnonConfig,
  kind: keyof typeof LIST_FN,
  after: string | null = null,
  limit: number = RPC_PAGE_SIZE,
): Promise<SitemapRow[]> {
  const fn = LIST_FN[kind]
  if (!fn) throw new Error(`No sitemap list function for kind "${kind}"`)
  return callRpc<SitemapRow>(cfg, fn, { p_after: after, p_limit: limit })
}

/**
 * Pages through every public entity of `kind` by keyset until the source is
 * exhausted. Guards against a non-advancing cursor (defensive: a buggy RPC that
 * returns the same page would otherwise loop forever).
 */
export async function listAllPublicEntities(
  cfg: SupabaseAnonConfig,
  kind: keyof typeof LIST_FN,
  pageSize: number = RPC_PAGE_SIZE,
): Promise<SitemapRow[]> {
  const all: SitemapRow[] = []
  let after: string | null = null
  // Hard ceiling: pageSize * this = absolute max URLs walked, prevents a runaway
  // loop against an unbounded/broken source.
  const MAX_PAGES = 1000
  for (let page = 0; page < MAX_PAGES; page++) {
    const rows: SitemapRow[] = await listPublicEntities(cfg, kind, after, pageSize)
    if (rows.length === 0) break
    all.push(...rows)
    const nextAfter = rows[rows.length - 1].sort_id
    if (rows.length < pageSize || nextAfter === after) break
    after = nextAfter
  }
  return all
}

/**
 * Fetches the fresh-shard rows: public entities of every type created/updated
 * since `since`, newest first, capped server-side at 5000.
 */
export function listRecentPublic(
  cfg: SupabaseAnonConfig,
  since: Date,
  limit = 5000,
): Promise<RecentRow[]> {
  return callRpc<RecentRow>(cfg, 'fn_list_recent_public', {
    p_since: since.toISOString(),
    p_limit: limit,
  })
}
