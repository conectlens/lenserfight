import { describe, expect, it } from 'vitest'
import { fetchOne, listPublicEntities, type SupabaseAnonConfig } from './fetchers'

function fetchReturning(body: unknown, status = 200): typeof fetch {
  return (async () =>
    new Response(body === undefined ? undefined : JSON.stringify(body), {
      status,
      headers: { 'content-type': 'application/json' },
    })) as unknown as typeof fetch
}

function cfg(fetchImpl: typeof fetch): SupabaseAnonConfig {
  return { supabaseUrl: 'https://db.example.co', anonKey: 'anon', fetchImpl }
}

describe('fetchOne', () => {
  it('unwraps an array response (RETURNS TABLE/SETOF functions)', async () => {
    const row = await fetchOne(cfg(fetchReturning([{ id: 1 }])), 'fn_get_thread_public', {})
    expect(row).toEqual({ id: 1 })
  })

  it('wraps a bare object response (RETURNS jsonb/composite functions)', async () => {
    const row = await fetchOne(cfg(fetchReturning({ id: 1 })), 'fn_get_lens_detail_bootstrap', {})
    expect(row).toEqual({ id: 1 })
  })

  it('returns null for an empty array', async () => {
    const row = await fetchOne(cfg(fetchReturning([])), 'fn_get_thread_public', {})
    expect(row).toBeNull()
  })

  it('returns null for a JSON null response', async () => {
    const row = await fetchOne(cfg(fetchReturning(null)), 'fn_lensers_get_public_profile', {})
    expect(row).toBeNull()
  })

  it('returns null for a 404', async () => {
    const row = await fetchOne(cfg(fetchReturning(undefined, 404)), 'fn_get_thread_public', {})
    expect(row).toBeNull()
  })
})

describe('listPublicEntities', () => {
  it('still parses the array shape used by fn_list_public_* functions', async () => {
    const rows = await listPublicEntities(
      cfg(fetchReturning([{ entity_key: 'a', lastmod: null, sort_id: '1' }])),
      'lens',
    )
    expect(rows).toEqual([{ entity_key: 'a', lastmod: null, sort_id: '1' }])
  })
})
