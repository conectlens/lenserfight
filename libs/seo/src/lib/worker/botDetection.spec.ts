import { describe, expect, it } from 'vitest'
import { isCrawler } from './botDetection'

describe('isCrawler', () => {
  it('detects Googlebot', () => {
    expect(isCrawler('Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)')).toBe(true)
  })

  it('detects AI crawlers', () => {
    expect(isCrawler('ClaudeBot/1.0')).toBe(true)
    expect(isCrawler('GPTBot/1.1')).toBe(true)
    expect(isCrawler('Mozilla/5.0 ... PerplexityBot/1.0')).toBe(true)
  })

  it('detects social unfurlers', () => {
    expect(isCrawler('facebookexternalhit/1.1')).toBe(true)
    expect(isCrawler('Twitterbot/1.0')).toBe(true)
  })

  it('returns false for a normal browser', () => {
    expect(isCrawler('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36')).toBe(false)
  })

  it('returns false for null/empty', () => {
    expect(isCrawler(null)).toBe(false)
    expect(isCrawler(undefined)).toBe(false)
    expect(isCrawler('')).toBe(false)
  })
})
