import { afterEach, describe, expect, it, vi } from 'vitest'

const { getSession } = vi.hoisted(() => ({
  getSession: vi.fn().mockResolvedValue({
    data: {
      session: {
        access_token: 'test-token',
      },
    },
  }),
}))

vi.mock('@lenserfight/data/supabase', () => ({
  supabase: {
    auth: {
      getSession,
    },
  },
}))

import { walletApiClient } from './walletApiClient'

function envelopeResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify({ data, meta: { requestId: 'req_test', durationMs: 1 } }), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

describe('walletApiClient.getBalance', () => {
  afterEach(() => {
    vi.restoreAllMocks()
    getSession.mockClear()
  })

  it('returns balance from envelope data', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(envelopeResponse({ balance: 499900 }))

    const result = await walletApiClient.getBalance()
    expect(result).toEqual({ balance: 499900 })
  })

  it('throws envelope error when error field is present', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          error: { code: 'wallet.not_found', message: 'Wallet not found' },
          meta: { requestId: 'req_test' },
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      ),
    )

    await expect(walletApiClient.getBalance()).rejects.toMatchObject({
      code: 'wallet.not_found',
      message: 'Wallet not found',
    })
  })
})

describe('walletApiClient.getTransactions', () => {
  afterEach(() => {
    vi.restoreAllMocks()
    getSession.mockClear()
  })

  it('returns transactions with pagination meta', async () => {
    const tx = {
      id: 'uuid-1',
      tx_type: 'spend',
      amount: 188,
      direction: -1,
      balance_after: 499712,
      description: 'AI execution: openai/gpt-4o',
      reference_type: 'execution.runs',
      reference_id: 'run_uuid',
      created_at: '2026-03-20T15:30:00Z',
    }
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          data: [tx],
          meta: { requestId: 'req_test', durationMs: 23, limit: 20, offset: 0, total: 127, hasNextPage: true },
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      ),
    )

    const result = await walletApiClient.getTransactions(1, 20)
    expect(result.transactions).toHaveLength(1)
    expect(result.total).toBe(127)
    expect(result.hasNextPage).toBe(true)
  })
})
