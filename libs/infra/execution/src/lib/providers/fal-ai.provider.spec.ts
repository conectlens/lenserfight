// Phase AK — first generative-media provider spec.
//
// Mocks `@fal-ai/client` so we can exercise the three output shapes
// (images[], video, audio_url) plus the unknown-shape failure path
// without hitting the network. Subsequent providers (AN/AO) follow this
// same template — see media-provider-factory in AQ for shared helpers.

const subscribeMock = vi.hoisted(() => vi.fn())

vi.mock('@fal-ai/client', () => ({
  fal: {
    subscribe: (...args: unknown[]) => subscribeMock(...args),
  },
}))

import { FalAIProvider } from './fal-ai.provider'

describe('FalAIProvider', () => {
  let provider: FalAIProvider

  beforeEach(() => {
    subscribeMock.mockReset()
    provider = new FalAIProvider()
  })

  it('declares the expected provider id and supported media types', () => {
    expect(provider.id).toBe('fal-ai')
    expect(provider.supportedMediaTypes).toEqual(['image', 'video', 'audio'])
  })

  it('returns image result when fal returns images[]', async () => {
    subscribeMock.mockResolvedValueOnce({
      data: { images: [{ url: 'https://fal.example/out.png' }] },
    })

    const result = await provider.execute('fal-ai/flux/dev', { prompt: 'a cat' })

    expect(result.mediaType).toBe('image')
    expect(result.url).toBe('https://fal.example/out.png')
    expect(result.mimeType).toBe('image/png')
    expect(result.metadata?.['modelId']).toBe('fal-ai/flux/dev')
    expect(typeof result.durationMs).toBe('number')
    expect(subscribeMock).toHaveBeenCalledWith(
      'fal-ai/flux/dev',
      expect.objectContaining({ input: expect.objectContaining({ prompt: 'a cat' }) }),
    )
  })

  it('forwards extra params alongside the prompt', async () => {
    subscribeMock.mockResolvedValueOnce({
      data: { images: [{ url: 'https://fal.example/out.png' }] },
    })

    await provider.execute('fal-ai/flux/dev', {
      prompt: 'a dog',
      params: { width: 1024, height: 1024 },
    })

    expect(subscribeMock).toHaveBeenCalledWith(
      'fal-ai/flux/dev',
      { input: { prompt: 'a dog', width: 1024, height: 1024 } },
    )
  })

  it('returns video result when fal returns a video object', async () => {
    subscribeMock.mockResolvedValueOnce({
      data: { video: { url: 'https://fal.example/clip.mp4' } },
    })

    const result = await provider.execute('fal-ai/wan/t2v', { prompt: 'a wave' })

    expect(result.mediaType).toBe('video')
    expect(result.url).toBe('https://fal.example/clip.mp4')
    expect(result.mimeType).toBe('video/mp4')
  })

  it('returns audio result when fal returns audio_url', async () => {
    subscribeMock.mockResolvedValueOnce({
      data: { audio_url: 'https://fal.example/song.mp3' },
    })

    const result = await provider.execute('fal-ai/stable-audio', { prompt: 'a riff' })

    expect(result.mediaType).toBe('audio')
    expect(result.url).toBe('https://fal.example/song.mp3')
    expect(result.mimeType).toBe('audio/mpeg')
  })

  it('throws with the model id when output shape is unrecognised', async () => {
    subscribeMock.mockResolvedValueOnce({ data: { weird_field: true } })

    await expect(provider.execute('fal-ai/unknown', { prompt: '?' })).rejects.toThrow(
      /fal-ai\/unknown/,
    )
  })

  it('propagates upstream errors from fal.subscribe', async () => {
    subscribeMock.mockRejectedValueOnce(new Error('rate_limited'))

    await expect(provider.execute('fal-ai/flux/dev', { prompt: 'x' })).rejects.toThrow('rate_limited')
  })
})
