import { describe, expect, it } from 'vitest'
import { absoluteUrl, entityPath } from './routes'

describe('entityPath', () => {
  it('maps each entity kind to its canonical prefix', () => {
    expect(entityPath('lens', 'abc')).toBe('/lenses/abc')
    expect(entityPath('battle', 'my-battle')).toBe('/battles/my-battle')
    expect(entityPath('lenser', 'ofcskn')).toBe('/lenser/ofcskn')
    expect(entityPath('workflow', 'wf-1')).toBe('/workflows/wf-1')
    expect(entityPath('thread', 't-1')).toBe('/threads/t-1')
    expect(entityPath('ray', 'ai-agents')).toBe('/ray/ai-agents')
  })

  it('encodes unsafe characters in the key', () => {
    expect(entityPath('ray', 'a b')).toBe('/ray/a%20b')
  })
})

describe('absoluteUrl', () => {
  it('joins base and path without double slashes', () => {
    expect(absoluteUrl('https://moon.lenserfight.com', '/lenses/x')).toBe(
      'https://moon.lenserfight.com/lenses/x',
    )
  })

  it('trims trailing base slash and leading path slashes', () => {
    expect(absoluteUrl('https://moon.lenserfight.com/', '//lenses/x')).toBe(
      'https://moon.lenserfight.com/lenses/x',
    )
  })

  it('handles root path', () => {
    expect(absoluteUrl('https://moon.lenserfight.com', '/')).toBe(
      'https://moon.lenserfight.com/',
    )
  })
})
