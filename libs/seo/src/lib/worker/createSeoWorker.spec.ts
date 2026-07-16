import { afterEach, describe, expect, it, vi } from 'vitest'
import { createSeoWorker, type SeoWorkerEnv } from './createSeoWorker'

const ASSETS_SENTINEL = 'ASSETS_SHELL'

function makeEnv(): SeoWorkerEnv {
  return {
    ASSETS: { fetch: vi.fn(async () => new Response(ASSETS_SENTINEL, { status: 200 })) },
    SUPABASE_URL: 'https://db.example.co',
    SUPABASE_PUBLISHABLE_KEY: 'anon',
    INDEXNOW_KEY: 'key123',
  }
}

const baseConfig = {
  sitemap: {
    canonicalBase: 'https://moon.lenserfight.com',
    staticRoutes: [{ loc: 'https://moon.lenserfight.com/' }],
  },
}

const CHROME =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/120 Safari/537.36'
const GOOGLEBOT = 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)'

function req(path: string, ua: string, method = 'GET'): Request {
  return new Request(`https://moon.lenserfight.com${path}`, {
    method,
    headers: { 'user-agent': ua },
  })
}

afterEach(() => vi.unstubAllGlobals())

describe('createSeoWorker', () => {
  it('passes a human request straight to ASSETS', async () => {
    const env = makeEnv()
    const worker = createSeoWorker(baseConfig)
    const res = await worker.fetch(req('/lenses/abc', CHROME), env)
    expect(await res.text()).toBe(ASSETS_SENTINEL)
  })

  it('serves the IndexNow key file', async () => {
    const env = makeEnv()
    const worker = createSeoWorker(baseConfig)
    const res = await worker.fetch(req('/key123.txt', CHROME), env)
    expect(res.headers.get('content-type')).toContain('text/plain')
    expect(await res.text()).toBe('key123')
  })

  it('serves a sitemap route without touching ASSETS', async () => {
    vi.stubGlobal('fetch', async () => new Response('[]', { status: 200 }))
    const env = makeEnv()
    const worker = createSeoWorker(baseConfig)
    const res = await worker.fetch(req('/sitemap.xml', GOOGLEBOT), env)
    expect(res.headers.get('content-type')).toContain('application/xml')
    expect(await res.text()).toContain('<sitemapindex')
    expect(env.ASSETS.fetch).not.toHaveBeenCalled()
  })

  it('bot-renders a matched entity when renderEntity yields HTML', async () => {
    const env = makeEnv()
    const worker = createSeoWorker({
      ...baseConfig,
      renderEntity: async (kind, key) => `<html><h1>${kind}:${key}</h1></html>`,
    })
    const res = await worker.fetch(req('/lenses/abc', GOOGLEBOT), env)
    expect(res.status).toBe(200)
    expect(await res.text()).toContain('lens:abc')
  })

  it('404s when renderEntity returns null (missing/private)', async () => {
    const env = makeEnv()
    const worker = createSeoWorker({ ...baseConfig, renderEntity: async () => null })
    const res = await worker.fetch(req('/lenses/missing', GOOGLEBOT), env)
    expect(res.status).toBe(404)
  })

  it('falls through to ASSETS when renderEntity throws', async () => {
    const env = makeEnv()
    const worker = createSeoWorker({
      ...baseConfig,
      renderEntity: async () => {
        throw new Error('supabase down')
      },
    })
    const res = await worker.fetch(req('/lenses/abc', GOOGLEBOT), env)
    expect(await res.text()).toBe(ASSETS_SENTINEL)
  })

  it('passes non-GET requests to ASSETS', async () => {
    const env = makeEnv()
    const worker = createSeoWorker(baseConfig)
    const res = await worker.fetch(req('/sitemap.xml', GOOGLEBOT, 'POST'), env)
    expect(await res.text()).toBe(ASSETS_SENTINEL)
  })

  it('serves .xml.gz shards as application/xml + Content-Encoding: gzip, with no-transform', async () => {
    vi.stubGlobal(
      'fetch',
      async () =>
        new Response(JSON.stringify([{ entity_key: 'a', lastmod: null, sort_id: '1' }]), {
          status: 200,
        }),
    )
    const env = makeEnv()
    const worker = createSeoWorker(baseConfig)
    const res = await worker.fetch(req('/sitemaps/lenses-1.xml.gz', GOOGLEBOT), env)
    expect(res.headers.get('content-type')).toContain('application/xml')
    expect(res.headers.get('content-encoding')).toBe('gzip')
    expect(res.headers.get('cache-control')).toContain('no-transform')
  })

  it('constructs the gzip shard Response with encodeBody: manual so the Workers runtime does not re-compress an already-gzip body', async () => {
    // Node's Response never auto-recompresses (that's Cloudflare-Workers-
    // runtime-specific behavior Miniflare/Node can't reproduce), so the only
    // way to pin this invariant in a unit test is to check what init options
    // the code actually passes to the Response constructor.
    vi.stubGlobal(
      'fetch',
      async () =>
        new Response(JSON.stringify([{ entity_key: 'a', lastmod: null, sort_id: '1' }]), {
          status: 200,
        }),
    )
    const RealResponse = Response
    const responseSpy = vi.fn(function (this: unknown, body: BodyInit | null, init?: ResponseInit) {
      return new RealResponse(body, init)
    })
    vi.stubGlobal('Response', responseSpy)
    const env = makeEnv()
    const worker = createSeoWorker(baseConfig)
    await worker.fetch(req('/sitemaps/lenses-1.xml.gz', GOOGLEBOT), env)
    const gzipCall = responseSpy.mock.calls.find(
      ([, init]) => (init as { encodeBody?: string } | undefined)?.encodeBody !== undefined,
    )
    expect(gzipCall?.[1]).toMatchObject({ encodeBody: 'manual' })
  })

  it('does not add no-transform to the non-gzip index route', async () => {
    vi.stubGlobal('fetch', async () => new Response('[]', { status: 200 }))
    const env = makeEnv()
    const worker = createSeoWorker(baseConfig)
    const res = await worker.fetch(req('/sitemap.xml', GOOGLEBOT), env)
    expect(res.headers.get('cache-control')).not.toContain('no-transform')
  })
})
