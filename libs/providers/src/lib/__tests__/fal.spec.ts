import { falStableVideoAdapter } from '../fal-stable-video'
import { mockFetch, resetFetchMock } from '../testing'

describe('falStableVideoAdapter', () => {
  let spy: jest.SpyInstance

  afterEach(() => {
    if (spy) resetFetchMock(spy)
  })

  it('returns completed video URL on success', async () => {
    spy = mockFetch([
      {
        url: /fal\.run\/fal-ai\/stable-video-diffusion/,
        response: { video: { url: 'https://fal.media/files/output.mp4' } },
      },
    ])

    const result = await falStableVideoAdapter.generate(
      'fal-key',
      'fal-ai/stable-video-diffusion',
      '',
      { image_url: 'https://example.com/frame.png' },
    )
    expect(result.status).toBe('completed')
    if (result.status === 'completed') {
      expect(result.urls[0]).toBe('https://fal.media/files/output.mp4')
      expect(result.mimeType).toBe('video/mp4')
    }
  })

  it('throws when image_url is missing', async () => {
    await expect(
      falStableVideoAdapter.generate('fal-key', 'fal-ai/stable-video-diffusion', '', {}),
    ).rejects.toThrow('fal-stable-video requires params.image_url')
  })

  it('throws when fal returns no video URL', async () => {
    spy = mockFetch([
      {
        url: /fal\.run\/fal-ai\/stable-video-diffusion/,
        response: { video: null },
      },
    ])

    await expect(
      falStableVideoAdapter.generate('fal-key', 'fal-ai/stable-video-diffusion', '', {
        image_url: 'https://example.com/frame.png',
      }),
    ).rejects.toThrow('fal stable-video returned no video URL')
  })
})
