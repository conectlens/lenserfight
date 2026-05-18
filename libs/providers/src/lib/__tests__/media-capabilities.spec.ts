import { getMediaCapabilities } from '../media-capabilities'

describe('media-capabilities', () => {
  it('describes gpt-image-1 with custom sizes and qualities but no style', () => {
    const caps = getMediaCapabilities('dall-e-4')
    expect(caps.kind).toBe('image')
    expect(caps.imageSizes).toEqual(expect.arrayContaining(['1024x1024', '1024x1536', '1536x1024']))
    expect(caps.imageQualities).toEqual(expect.arrayContaining(['low', 'medium', 'high', 'auto']))
    expect(caps.supportsStyle).toBe(false)
    expect(caps.maxBatch).toBeGreaterThan(1)
  })

  it('describes dall-e-3 with style + standard/hd quality + n=1', () => {
    const caps = getMediaCapabilities('dall-e-3')
    expect(caps.supportsStyle).toBe(true)
    expect(caps.imageQualities).toEqual(['standard', 'hd'])
    expect(caps.maxBatch).toBe(1)
  })

  it('describes Imagen with aspect ratios (not free-form sizes)', () => {
    const caps = getMediaCapabilities('imagen-4')
    expect(caps.kind).toBe('image')
    expect(caps.imageSizes).toEqual([])
    expect(caps.aspectRatios).toEqual(expect.arrayContaining(['1:1', '16:9', '9:16']))
  })

  it('marks Google media models as Vertex-project-compatible (opt-in)', () => {
    expect(getMediaCapabilities('imagen-4').supportsVertexProject).toBe(true)
    expect(getMediaCapabilities('veo-3').supportsVertexProject).toBe(true)
    expect(getMediaCapabilities('lyria-2').supportsVertexProject).toBe(true)
  })

  it('non-Google models do NOT advertise Vertex support', () => {
    expect(getMediaCapabilities('dall-e-3').supportsVertexProject).toBe(false)
    expect(getMediaCapabilities('stable-diffusion-4').supportsVertexProject).toBe(false)
  })

  it('describes Veo as video with constrained durations', () => {
    const caps = getMediaCapabilities('veo-3')
    expect(caps.kind).toBe('video')
    expect(caps.durations).toEqual(expect.arrayContaining([5, 6, 7, 8]))
  })

  it('returns kind=null for unknown models', () => {
    const caps = getMediaCapabilities('mystery-llm')
    expect(caps.kind).toBeNull()
  })
})
