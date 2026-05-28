import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'

const { mockGetSession, mockGetCachedAccessToken } = vi.hoisted(() => ({
  mockGetSession: vi.fn(),
  mockGetCachedAccessToken: vi.fn().mockReturnValue(null),
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

const EDGE_URL = 'http://localhost:54321/functions/v1/trigger-execution'

describe('HttpExecutionApiClient', () => {
  let client: HttpExecutionApiClient
  let fetchSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    client = new HttpExecutionApiClient()
    vi.clearAllMocks()
    mockGetSession.mockResolvedValue({ data: { session: { access_token: 'jwt-token-123' } } })
    fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ executionId: 'exec-1' }), { status: 200 })
    )
  })

  afterEach(() => {
    fetchSpy.mockRestore()
  })

  describe('triggerExecution', () => {
    it('posts to trigger-execution edge function with bearer token', async () => {
      const dto = { workflowId: 'wf-1', inputs: { key: 'val' } } as any
      await client.triggerExecution(dto)
      expect(fetchSpy).toHaveBeenCalledWith(EDGE_URL, {
        method: 'POST',
        headers: expect.objectContaining({
          'Content-Type': 'application/json',
          Authorization: 'Bearer jwt-token-123',
        }),
        body: JSON.stringify(dto),
      })
    })

    it('throws "Unauthenticated" when no session', async () => {
      mockGetSession.mockResolvedValue({ data: { session: null } })
      await expect(client.triggerExecution({} as any)).rejects.toThrow('Unauthenticated')
    })

    it('returns parsed JSON response', async () => {
      fetchSpy.mockResolvedValue(
        new Response(JSON.stringify({ executionId: 'exec-1', status: 'queued' }), { status: 200 })
      )
      const result = await client.triggerExecution({ workflowId: 'wf-1' } as any)
      expect(result).toEqual({ executionId: 'exec-1', status: 'queued' })
    })

    it('throws when response is not ok', async () => {
      fetchSpy.mockResolvedValue(new Response('Internal Server Error', { status: 500 }))
      await expect(client.triggerExecution({} as any)).rejects.toThrow('trigger-execution failed')
    })
  })
})
