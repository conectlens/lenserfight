import { describe, expect, it } from 'vitest'
import { renderEntity } from './renderEntity'
import type { SupabaseAnonConfig } from '../fetchers'

function mockFetch(bodyByFn: Record<string, unknown>): typeof fetch {
  return (async (url: string | URL) => {
    const fn = String(url).split('/rpc/')[1]
    const body = bodyByFn[fn]
    return new Response(body === undefined ? 'null' : JSON.stringify(body), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    })
  }) as unknown as typeof fetch
}

function cfg(bodyByFn: Record<string, unknown>): { anon: SupabaseAnonConfig } {
  return { anon: { supabaseUrl: 'https://db.example.co', anonKey: 'anon', fetchImpl: mockFetch(bodyByFn) } }
}

describe('renderEntity — lens', () => {
  it('maps the nested author_profile shape returned by fn_get_lens_detail_bootstrap', async () => {
    const html = await renderEntity(
      'lens',
      'lens-1',
      cfg({
        fn_get_lens_detail_bootstrap: {
          id: 'lens-1',
          title: 'My Lens',
          author_profile: { handle: 'ada', display_name: 'Ada Lovelace' },
          tags: [{ name: 'code', slug: 'code' }],
        },
      }),
    )
    expect(html).toContain('Ada Lovelace')
    expect(html).toContain('/lenser/ada')
  })

  it('treats the {"error":"not_found"} sentinel as missing (404), not a blank page', async () => {
    const html = await renderEntity(
      'lens',
      'missing',
      cfg({ fn_get_lens_detail_bootstrap: { error: 'not_found' } }),
    )
    expect(html).toBeNull()
  })
})

describe('renderEntity — lenser', () => {
  it('calls fn_lensers_get_public_profile and maps lens_count into the Lenses stat', async () => {
    const html = await renderEntity(
      'lenser',
      'ada',
      cfg({
        fn_lensers_get_public_profile: {
          handle: 'ada',
          display_name: 'Ada Lovelace',
          lens_count: 7,
          thread_count: 2,
          follower_count: 100,
        },
      }),
    )
    expect(html).toContain('Ada Lovelace')
    expect(html).toContain('7')
  })

  it('returns null (→ 404) when the profile is not public', async () => {
    const html = await renderEntity(
      'lenser',
      'private-user',
      cfg({ fn_lensers_get_public_profile: null }),
    )
    expect(html).toBeNull()
  })
})

describe('renderEntity — unchanged entities still resolve', () => {
  it('battle via fn_get_battle_by_slug (array-returning)', async () => {
    const html = await renderEntity(
      'battle',
      'battle-slug',
      cfg({ fn_get_battle_by_slug: [{ id: '1', slug: 'battle-slug', title: 'Battle Title' }] }),
    )
    expect(html).toContain('Battle Title')
  })
})
