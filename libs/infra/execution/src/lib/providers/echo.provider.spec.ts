import { describe, it, expect, vi } from 'vitest'

import { EchoProvider } from './echo.provider'

describe('EchoProvider', () => {
  const provider = new EchoProvider()

  it('has id "echo"', () => {
    expect(provider.id).toBe('echo')
  })

  it('supports all 4 media types', () => {
    expect(provider.supportedMediaTypes).toContain('text')
    expect(provider.supportedMediaTypes).toContain('image')
    expect(provider.supportedMediaTypes).toContain('video')
    expect(provider.supportedMediaTypes).toContain('audio')
  })

  it('returns the input prompt as text output', async () => {
    const result = await provider.execute('any-model', { prompt: 'Hello, echo!' })
    expect(result.mediaType).toBe('text')
    expect(result.text).toBe('Hello, echo!')
  })

  it('returns durationMs as a number', async () => {
    const result = await provider.execute('m', { prompt: 'test' })
    expect(typeof result.durationMs).toBe('number')
  })

  it('makes no fetch calls', async () => {
    const spy = vi.spyOn(global, 'fetch')
    await provider.execute('m', { prompt: 'test' })
    expect(spy).not.toHaveBeenCalled()
    spy.mockRestore()
  })
})
