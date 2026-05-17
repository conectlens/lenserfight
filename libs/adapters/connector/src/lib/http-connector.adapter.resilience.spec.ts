// HttpConnectorAdapter — resilience tests for timeout, retry, and error scenarios.
import { describe, it, expect, vi } from 'vitest'
import { HttpConnectorAdapter } from './http-connector.adapter'
import type { ConnectorMetadata, DispatchEvent } from './connector.types'

// ── Helpers ──────────────────────────────────────────────────────────────────

const testMetadata: ConnectorMetadata = {
  slug: 'test-connector',
  name: 'Test Connector',
  kind: 'api',
  scopes: ['read', 'write'],
  description: 'Test',
}

function makeAdapter(fetchImpl: typeof fetch, opts = {}): HttpConnectorAdapter {
  return new HttpConnectorAdapter({
    metadata: testMetadata,
    endpoint: 'https://api.example.com/webhook',
    serviceToken: 'token-123',
    fetchImpl,
    ...opts,
  })
}

const testEvent: DispatchEvent = {
  type: 'battle.completed',
  payload: { battleId: 'b-1', winner: 'contender-A' },
}

// ── Tests ────────────────────────────────────────────────────────────────────

describe('HttpConnectorAdapter — resilience', () => {
  describe('verify', () => {
    it('returns ok:false with reason token_missing when token is empty', async () => {
      const adapter = makeAdapter(vi.fn())
      const result = await adapter.verify('')
      expect(result.ok).toBe(false)
      expect(result.reason).toBe('token_missing')
    })

    it('returns ok:false with reason token_revoked when token mismatches', async () => {
      const adapter = makeAdapter(vi.fn())
      const result = await adapter.verify('wrong-token')
      expect(result.ok).toBe(false)
      expect(result.reason).toBe('token_revoked')
    })

    it('returns ok:true with scopes when token matches', async () => {
      const adapter = makeAdapter(vi.fn())
      const result = await adapter.verify('token-123')
      expect(result.ok).toBe(true)
    })
  })

  describe('dispatch', () => {
    it('returns ok:true on successful HTTP response', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
      })
      const adapter = makeAdapter(mockFetch as any)

      const result = await adapter.dispatch(testEvent)

      expect(result.ok).toBe(true)
      expect(result.status).toBe(200)
      expect(result.latencyMs).toBeGreaterThanOrEqual(0)
    })

    it('returns ok:false with status on HTTP error response', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
      })
      const adapter = makeAdapter(mockFetch as any)

      const result = await adapter.dispatch(testEvent)

      expect(result.ok).toBe(false)
      expect(result.status).toBe(500)
      expect(result.error).toBe('http_500')
    })

    it('returns ok:false on network error', async () => {
      const mockFetch = vi.fn().mockRejectedValue(new Error('ECONNREFUSED'))
      const adapter = makeAdapter(mockFetch as any)

      const result = await adapter.dispatch(testEvent)

      expect(result.ok).toBe(false)
      expect(result.error).toBe('ECONNREFUSED')
      expect(result.latencyMs).toBeGreaterThanOrEqual(0)
    })

    it('sends correct headers including event type', async () => {
      const mockFetch = vi.fn().mockResolvedValue({ ok: true, status: 200 })
      const adapter = makeAdapter(mockFetch as any)

      await adapter.dispatch(testEvent)

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.example.com/webhook',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'content-type': 'application/json',
            'authorization': 'Bearer token-123',
            'x-lenserfight-event': 'battle.completed',
          }),
        }),
      )
    })

    it('serializes event payload as JSON body', async () => {
      const mockFetch = vi.fn().mockResolvedValue({ ok: true, status: 200 })
      const adapter = makeAdapter(mockFetch as any)

      await adapter.dispatch(testEvent)

      const callArgs = mockFetch.mock.calls[0][1]
      expect(JSON.parse(callArgs.body)).toEqual({ battleId: 'b-1', winner: 'contender-A' })
    })

    it('aborts after timeout', async () => {
      const mockFetch = vi.fn().mockImplementation((_url, opts) => {
        return new Promise((_, reject) => {
          opts?.signal?.addEventListener('abort', () => {
            reject(new Error('The operation was aborted'))
          })
        })
      })

      const adapter = makeAdapter(mockFetch as any, { timeoutMs: 10 })
      const result = await adapter.dispatch(testEvent)

      expect(result.ok).toBe(false)
      expect(result.error).toContain('aborted')
    })

    it('returns ok:false on 401 unauthorized', async () => {
      const mockFetch = vi.fn().mockResolvedValue({ ok: false, status: 401 })
      const adapter = makeAdapter(mockFetch as any)

      const result = await adapter.dispatch(testEvent)

      expect(result.ok).toBe(false)
      expect(result.error).toBe('http_401')
    })

    it('returns ok:false on 429 rate limit', async () => {
      const mockFetch = vi.fn().mockResolvedValue({ ok: false, status: 429 })
      const adapter = makeAdapter(mockFetch as any)

      const result = await adapter.dispatch(testEvent)

      expect(result.ok).toBe(false)
      expect(result.error).toBe('http_429')
    })
  })

  describe('id and metadata', () => {
    it('returns slug as id', () => {
      const adapter = makeAdapter(vi.fn())
      expect(adapter.id()).toBe('test-connector')
    })

    it('returns full metadata', () => {
      const adapter = makeAdapter(vi.fn())
      expect(adapter.metadata()).toEqual(testMetadata)
    })
  })
})
