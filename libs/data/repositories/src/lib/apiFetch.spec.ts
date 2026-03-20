import { afterEach, describe, expect, it, vi } from 'vitest'
import { createApiFetch, normalizeJsonRequestBody } from './apiFetch'

describe('normalizeJsonRequestBody', () => {
  it('normalizes nested camelCase JSON strings to snake_case', () => {
    expect(
      normalizeJsonRequestBody(
        JSON.stringify({
          variantId: 123,
          productData: {
            productSKU: 'sku-1',
            itemList: [{ itemId: 1 }],
          },
        })
      )
    ).toBe(
      JSON.stringify({
        variant_id: 123,
        product_data: {
          product_sku: 'sku-1',
          item_list: [{ item_id: 1 }],
        },
      })
    )
  })

  it('leaves invalid JSON and non-string bodies untouched', () => {
    expect(normalizeJsonRequestBody('{invalid')).toBe('{invalid')

    const body = new URLSearchParams({ variantId: '123' })
    expect(normalizeJsonRequestBody(body)).toBe(body)
  })
})

describe('createApiFetch', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('normalizes JSON request bodies before fetch', async () => {
    const response = new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(response)
    const apiFetch = createApiFetch()

    await apiFetch('/v1/executions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        variantId: 123,
        productData: { productSKU: 'sku-1' },
      }),
    })

    expect(fetchMock).toHaveBeenCalledWith(
      '/v1/executions',
      expect.objectContaining({
        body: JSON.stringify({
          variant_id: 123,
          product_data: { product_sku: 'sku-1' },
        }),
      })
    )
  })

  it('can disable request normalization via config', async () => {
    const response = new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(response)
    const apiFetch = createApiFetch({ transformRequest: false })
    const body = JSON.stringify({ variantId: 123 })

    await apiFetch('/v1/executions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
    })

    expect(fetchMock).toHaveBeenCalledWith(
      '/v1/executions',
      expect.objectContaining({ body })
    )
  })
})
