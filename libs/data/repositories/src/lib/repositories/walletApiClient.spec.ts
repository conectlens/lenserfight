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
        checkout_url: 'https://checkout.test/session',
        checkout_id: 'chk_123',
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

  it('normalizes checkout_url to checkoutUrl', async () => {
    const response = new Response(
      JSON.stringify({
        checkout_url: 'https://checkout.test/session',
        checkout_id: 'chk_123',
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    )
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(response)

    await expect(
      walletApiClient.checkout({
        variantId: 'var_123',
      })
    ).resolves.toEqual({
      checkoutUrl: 'https://checkout.test/session',
      checkout_url: 'https://checkout.test/session',
      checkoutId: 'chk_123',
      checkout_id: 'chk_123',
    })
  })
})

describe('walletApiClient.getProducts', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('normalizes productId to id and preserves variantId', async () => {
    const response = new Response(
      JSON.stringify({
        products: [
          {
            productId: '905584',
            variantId: '1424384',
            name: 'LenserFight Tokens',
            description: '<p>10,000 credits</p>',
            thumb_url: null,
            large_thumb_url: null,
            price: 999,
            price_formatted: '$9.99',
            pay_what_you_want: false,
            test_mode: true,
          },
        ],
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    )
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(response)

    const result = await walletApiClient.getProducts()

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/wallet/products'),
      expect.any(Object)
    )
    expect(result.products).toEqual([
      {
        id: '905584',
        variantId: '1424384',
        name: 'LenserFight Tokens',
        description: '<p>10,000 credits</p>',
        thumb_url: null,
        large_thumb_url: null,
        price: 999,
        price_formatted: '$9.99',
        pay_what_you_want: false,
        test_mode: true,
      },
    ])
  })
})
