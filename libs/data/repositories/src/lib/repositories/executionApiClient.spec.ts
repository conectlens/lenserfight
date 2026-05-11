import { describe, expect, it, vi, beforeEach } from 'vitest'

const { mockGetSession, mockApiFetch } = vi.hoisted(() => ({
  mockGetSession: vi.fn(),
  mockApiFetch: vi.fn(),
}))

vi.mock('@lenserfight/data/supabase', () => ({
  supabase: {
    auth: { getSession: mockGetSession },
  },
}))

vi.mock('../apiFetch', () => ({
  apiFetch: mockApiFetch,
}))

vi.mock('@lenserfight/utils/env', () => ({
  API_BASE_URL: 'https://api.example.com',
}))

import { HttpExecutionApiClient } from './executionApiClient'

describe('HttpExecutionApiClient', () => {
  let client: HttpExecutionApiClient

  beforeEach(() => {
    client = new HttpExecutionApiClient()
    vi.clearAllMocks()
    mockGetSession.mockResolvedValue({ data: { session: { access_token: 'jwt-token-123' } } })
    mockApiFetch.mockResolvedValue({ json: vi.fn().mockResolvedValue({ executionId: 'exec-1' }) })
  })

  describe('triggerExecution', () => {
    it('fetches session and posts to /v1/executions with bearer token', async () => {
      const dto = { workflowId: 'wf-1', inputs: { key: 'val' } } as any
      await client.triggerExecution(dto)
      expect(mockApiFetch).toHaveBeenCalledWith('https://api.example.com/v1/executions', {
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
      const mockJson = vi.fn().mockResolvedValue({ executionId: 'exec-1', status: 'queued' })
      mockApiFetch.mockResolvedValue({ json: mockJson })
      const result = await client.triggerExecution({ workflowId: 'wf-1' } as any)
      expect(result).toEqual({ executionId: 'exec-1', status: 'queued' })
    })

    it('propagates fetch errors', async () => {
      mockApiFetch.mockRejectedValue(new Error('network error'))
      await expect(client.triggerExecution({} as any)).rejects.toThrow('network error')
    })
  })
})
