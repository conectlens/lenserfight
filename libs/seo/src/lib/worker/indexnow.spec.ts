import { describe, expect, it, vi } from 'vitest'
import { submitToIndexNow } from './indexnow'

describe('submitToIndexNow', () => {
  it('builds the correct body with a derived keyLocation and dedupes URLs', async () => {
    const fetchImpl = vi.fn(async () => new Response(null, { status: 200 })) as unknown as typeof fetch
    const res = await submitToIndexNow(
      {
        host: 'moon.lenserfight.com',
        key: 'abc123',
        urls: ['https://moon.lenserfight.com/lenses/a', 'https://moon.lenserfight.com/lenses/a', 'https://moon.lenserfight.com/lenses/b'],
      },
      fetchImpl,
    )
    expect(res).toEqual({ ok: true, status: 200, submitted: 2 })
    const [, init] = (fetchImpl as unknown as ReturnType<typeof vi.fn>).mock.calls[0]
    const body = JSON.parse((init as RequestInit).body as string)
    expect(body.keyLocation).toBe('https://moon.lenserfight.com/abc123.txt')
    expect(body.urlList).toEqual([
      'https://moon.lenserfight.com/lenses/a',
      'https://moon.lenserfight.com/lenses/b',
    ])
  })

  it('is a no-op for an empty url list', async () => {
    const fetchImpl = vi.fn() as unknown as typeof fetch
    const res = await submitToIndexNow({ host: 'h', key: 'k', urls: [] }, fetchImpl)
    expect(res.submitted).toBe(0)
    expect(fetchImpl).not.toHaveBeenCalled()
  })

  it('resolves { ok:false } instead of throwing on network error', async () => {
    const fetchImpl = (async () => {
      throw new Error('network down')
    }) as unknown as typeof fetch
    const res = await submitToIndexNow({ host: 'h', key: 'k', urls: ['https://h/x'] }, fetchImpl)
    expect(res.ok).toBe(false)
    expect(res.status).toBe(0)
  })

  it('resolves { ok:false } on a 5xx without throwing', async () => {
    const fetchImpl = (async () => new Response(null, { status: 500 })) as unknown as typeof fetch
    const res = await submitToIndexNow({ host: 'h', key: 'k', urls: ['https://h/x'] }, fetchImpl)
    expect(res.ok).toBe(false)
    expect(res.status).toBe(500)
  })
})
