import { describe, expect, it, vi } from 'vitest'
import { callRpc } from './fetchers'

const config = { supabaseUrl: 'https://db.example', anonKey: 'anon-key' }

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

describe('callRpc', () => {
  it('sends the anon key and unwraps a single-row result', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse([{ id: 'x', title: 'Lens' }]))
    const row = await callRpc({ ...config, fetchImpl }, 'fn_get_x', { p: 1 })
    expect(row).toEqual({ id: 'x', title: 'Lens' })
    const [, init] = fetchImpl.mock.calls[0]
    expect(init.headers.apikey).toBe('anon-key')
    expect(init.headers.Authorization).toBe('Bearer anon-key')
    expect(JSON.parse(init.body)).toEqual({ p: 1 })
  })

  it('returns null for an empty set', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse([]))
    expect(await callRpc({ ...config, fetchImpl }, 'fn_get_x')).toBeNull()
  })

  it('returns null on 404', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse(null, 404))
    expect(await callRpc({ ...config, fetchImpl }, 'fn_get_x')).toBeNull()
  })

  it('throws on a server error so the Worker can fall back', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse({ message: 'boom' }, 500))
    await expect(callRpc({ ...config, fetchImpl }, 'fn_get_x')).rejects.toThrow('failed: 500')
  })
})
