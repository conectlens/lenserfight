import { openaiImageAdapter } from '../openai-image'
import { mockFetch, resetFetchMock } from '../../../../../../../infra/execution/src/lib/testing'

describe('openaiImageAdapter', () => {
  let spy: jest.SpyInstance

  afterEach(() => {
    if (spy) resetFetchMock(spy)
  })

  it('returns completed result with image URL on success', async () => {
    spy = mockFetch([
      {
        url: /api\.openai\.com\/v1\/images\/generations/,
        response: { data: [{ url: 'https://cdn.openai.com/img.png' }] },
      },
    ])

    const result = await openaiImageAdapter.generate('sk-test', 'dall-e-3', 'a cat', {})
    expect(result.status).toBe('completed')
    if (result.status === 'completed') {
      expect(result.urls[0]).toBe('https://cdn.openai.com/img.png')
    }
  })

  it('throws on content policy error (400)', async () => {
    spy = mockFetch([
      {
        url: /api\.openai\.com\/v1\/images\/generations/,
        response: { error: { code: 'content_policy_violation', message: 'flagged' } },
        status: 400,
      },
    ])

    await expect(
      openaiImageAdapter.generate('sk-test', 'dall-e-3', 'bad prompt', {}),
    ).rejects.toThrow()
  })
})
