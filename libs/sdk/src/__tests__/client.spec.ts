import { describe, expect, it, vi } from 'vitest'

import { createClient, createClientFromRpc, SDK_VERSION } from '../index'
import type { SupabaseLikeRpcClient } from '../lib/client'

describe('createClient', () => {
  it('throws when url is missing', () => {
    expect(() =>
      createClient({ url: '', anonKey: 'a' } as never),
    ).toThrowError(/requires `url`/)
  })

  it('throws when anonKey is missing', () => {
    expect(() =>
      createClient({ url: 'http://localhost:54321', anonKey: '' } as never),
    ).toThrowError(/requires `anonKey`/)
  })

  it('returns a client with battles and templates clients', () => {
    const lf = createClient({
      url: 'http://localhost:54321',
      anonKey: 'anon-key',
      fetch: vi.fn() as unknown as typeof fetch,
    })
    expect(lf.battles).toBeDefined()
    expect(lf.templates).toBeDefined()
    expect(typeof lf.rpcCall).toBe('function')
  })

  it('trims trailing slashes from url', async () => {
    const fakeFetch = vi.fn(async () =>
      new Response(JSON.stringify([]), { status: 200 }),
    ) as unknown as typeof fetch
    const lf = createClient({
      url: 'http://localhost:54321/',
      anonKey: 'anon-key',
      fetch: fakeFetch,
    })
    await lf.battles.browse({ status: 'open' })
    const called = (fakeFetch as unknown as ReturnType<typeof vi.fn>).mock.calls[0][0] as string
    expect(called).toBe('http://localhost:54321/rest/v1/rpc/fn_browse_battles')
  })

  it('exports SDK_VERSION matching the package.json alpha line', () => {
    expect(SDK_VERSION).toMatch(/^0\.\d+\.\d+-alpha\.\d+$/)
  })
})

describe('createClientFromRpc', () => {
  it('accepts a custom RPC client and routes calls through it', async () => {
    const fakeRpc: SupabaseLikeRpcClient = {
      rpc: vi.fn(async () => ({ data: 'rendered', error: null })),
    }
    const lf = createClientFromRpc(fakeRpc)
    const rendered = await lf.templates.renderPrompt('tpl-id', { topic: 'x' })
    expect(rendered).toBe('rendered')
    expect(fakeRpc.rpc).toHaveBeenCalledWith('fn_battles_render_prompt', {
      p_template_id: 'tpl-id',
      p_variables: { topic: 'x' },
    })
  })

  it('battles.browse clamps limit to [1, 100]', async () => {
    const fakeRpc: SupabaseLikeRpcClient = {
      rpc: vi.fn(async () => ({ data: [], error: null })),
    }
    const lf = createClientFromRpc(fakeRpc)
    await lf.battles.browse({}, undefined, 9999)
    const params = (fakeRpc.rpc as ReturnType<typeof vi.fn>).mock.calls[0][1] as Record<
      string,
      unknown
    >
    expect(params['p_limit']).toBe(100)

    await lf.battles.browse({}, undefined, 0)
    const params2 = (fakeRpc.rpc as ReturnType<typeof vi.fn>).mock.calls[1][1] as Record<
      string,
      unknown
    >
    expect(params2['p_limit']).toBe(1)
  })

  it('surfaces RPC errors as thrown errors', async () => {
    const fakeRpc: SupabaseLikeRpcClient = {
      rpc: vi.fn(async () => ({ data: null, error: { code: '42501', message: 'denied' } })),
    }
    const lf = createClientFromRpc(fakeRpc)
    await expect(lf.battles.browse({ status: 'open' })).rejects.toThrowError(
      /browse failed/,
    )
  })

  it('integration probe is skipped when SUPABASE_URL is unset', async () => {
    // skipIf — runs as a no-op assertion when env is missing. This pattern lets
    // CI exercise the real path when SUPABASE_URL is set and our local Supabase
    // is running, without flapping otherwise.
    if (!process.env['SUPABASE_URL'] || !process.env['SUPABASE_ANON_KEY']) {
      expect(true).toBe(true)
      return
    }
    const lf = createClient({
      url: process.env['SUPABASE_URL']!,
      anonKey: process.env['SUPABASE_ANON_KEY']!,
    })
    const rows = await lf.battles.browse({ status: 'open' }, undefined, 1)
    expect(Array.isArray(rows)).toBe(true)
  })
})
