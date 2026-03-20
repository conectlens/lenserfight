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

describe('walletApiClient.checkout', () => {
  afterEach(() => {
    vi.restoreAllMocks()
    getSession.mockClear()
  })

  it('sends variant_id to the checkout API', async () => {
    const response = new Response(
      JSON.stringify({
        checkoutUrl: 'https://checkout.test/session',
        checkoutId: 'chk_123',
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    )
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(response)

    await walletApiClient.checkout({
      variantId: 'var_123',
      email: 'buyer@example.com',
    })

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/wallet/checkout'),
      expect.objectContaining({
        body: JSON.stringify({
          variant_id: 'var_123',
          email: 'buyer@example.com',
        }),
      })
    )
  })
})
