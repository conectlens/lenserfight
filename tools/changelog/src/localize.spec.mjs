import { describe, expect, it } from 'vitest'

import { resolveLocalizedEntry } from './localize.mjs'

describe('resolveLocalizedEntry', () => {
  const en = { summary: 'CSV export added.', userImpact: 'Users can export battle results as CSV.' }

  it('returns the real translation when one exists and is complete', () => {
    const tr = new Map([['100', { summary: 'CSV dışa aktarma eklendi.', userImpact: 'Kullanıcılar artık...' }]])
    const result = resolveLocalizedEntry(en, tr, '100')
    expect(result.status).toBe('translated')
    expect(result.summary).toBe('CSV dışa aktarma eklendi.')
  })

  it('falls back to English honestly when no translation map is provided', () => {
    const result = resolveLocalizedEntry(en, undefined, '100')
    expect(result.status).toBe('fallback-en')
    expect(result.summary).toBe(en.summary)
  })

  it('falls back to English when the key is missing from the translation map', () => {
    const tr = new Map([['999', { summary: 'x', userImpact: 'y' }]])
    const result = resolveLocalizedEntry(en, tr, '100')
    expect(result.status).toBe('fallback-en')
  })

  it('falls back to English when the translation entry is partial (never presents half-translated content as done)', () => {
    const tr = new Map([['100', { summary: 'CSV dışa aktarma eklendi.', userImpact: '' }]])
    const result = resolveLocalizedEntry(en, tr, '100')
    expect(result.status).toBe('fallback-en')
    expect(result.summary).toBe(en.summary)
  })
})
