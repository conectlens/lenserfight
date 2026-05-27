import { describe, expect, it, vi, beforeEach } from 'vitest'

const { mockGetSession, mockGetCachedAccessToken } = vi.hoisted(() => ({
  mockGetSession: vi.fn(),
  mockGetCachedAccessToken: vi.fn(),
}))

vi.mock('@lenserfight/data/supabase', () => ({
  supabase: {
    auth: { getSession: mockGetSession },
  },
  getCachedAccessToken: mockGetCachedAccessToken,
}))

vi.mock('@lenserfight/utils/env', () => ({
  readEnv: vi.fn((key: string, fallback?: string) => fallback ?? ''),
}))

import { HttpExecutionApiClient } from './executionApiClient'

describe('HttpExecutionApiClient', () => {
  let client: HttpExecutionApiClient
  const mockFetch = vi.fn()

  beforeEach(() => {
    client = new HttpExecutionApiClient()
    vi.clearAllMocks()
    mockGetCachedAccessToken.mockReturnValue(null)
    mockGetSession.mockResolvedValue({ data: { session: { access_token: 'jwt-token-123' } } })
    mockFetch.mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({ executionId: 'exec-1' }),
      text: vi.fn().mockResolvedValue(''),
    })
    vi.stubGlobal('fetch', mockFetch)
  })

  describe('triggerExecution', () => {
    it('fetches session and posts to edge function with bearer token', async () => {
      const dto = { workflowId: 'wf-1', inputs: { key: 'val' } } as any
      await client.triggerExecution(dto)
      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:54321/functions/v1/trigger-execution',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            Authorization: 'Bearer jwt-token-123',
          }),
          body: JSON.stringify(dto),
        }),
      )
    })

    it('uses cached access token when available', async () => {
      mockGetCachedAccessToken.mockReturnValue('cached-token')
      await client.triggerExecution({} as any)
      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: 'Bearer cached-token',
          }),
        }),
      )
      expect(mockGetSession).not.toHaveBeenCalled()
    })

    it('throws "Unauthenticated" when no session', async () => {
      mockGetCachedAccessToken.mockReturnValue(null)
      mockGetSession.mockResolvedValue({ data: { session: null } })
      await expect(client.triggerExecution({} as any)).rejects.toThrow('Unauthenticated')
    })

    it('returns parsed JSON response', async () => {
      const mockJson = vi.fn().mockResolvedValue({ executionId: 'exec-1', status: 'queued' })
      mockFetch.mockResolvedValue({ ok: true, json: mockJson, text: vi.fn() })
      const result = await client.triggerExecution({ workflowId: 'wf-1' } as any)
      expect(result).toEqual({ executionId: 'exec-1', status: 'queued' })
    })

    it('propagates fetch errors', async () => {
      mockFetch.mockRejectedValue(new Error('network error'))
      await expect(client.triggerExecution({} as any)).rejects.toThrow('network error')
    })
  })
})
