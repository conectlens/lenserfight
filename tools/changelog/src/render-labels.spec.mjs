import { describe, expect, it } from 'vitest'

import {
  formatCategory,
  formatVerification,
  formatUserImpact,
  formatPrTitle,
  NOT_DECLARED,
  VERIFICATION_UNAVAILABLE,
} from './render-labels.mjs'

describe('render-labels (missing-metadata honesty)', () => {
  it('formatCategory falls back to "Not declared" when there is no fragment', () => {
    expect(formatCategory({})).toBe(NOT_DECLARED)
  })

  it('formatCategory reflects the fragment category when present', () => {
    expect(formatCategory({ fragment: { category: 'fix' } })).toBe('fix')
  })

  it('formatVerification falls back to "Verification unavailable" when absent', () => {
    expect(formatVerification({})).toBe(VERIFICATION_UNAVAILABLE)
    expect(formatVerification({ fragment: { verification: null } })).toBe(VERIFICATION_UNAVAILABLE)
    expect(formatVerification({ fragment: { verification: { tests: null, ci: null } } })).toBe(
      VERIFICATION_UNAVAILABLE
    )
  })

  it('formatVerification joins declared evidence', () => {
    expect(
      formatVerification({ fragment: { verification: { tests: 'vitest +3', ci: null } } })
    ).toBe('vitest +3')
    expect(
      formatVerification({
        fragment: { verification: { tests: 'vitest +3', ci: 'run #42 passed' } },
      })
    ).toBe('vitest +3 · run #42 passed')
  })

  it('formatUserImpact falls back to "Not declared" absent a fragment', () => {
    expect(formatUserImpact({})).toBe(NOT_DECLARED)
  })

  it('formatUserImpact flags reverted entries instead of repeating the withdrawn claim', () => {
    expect(
      formatUserImpact({
        revertedBy: '1234567890abcdef',
        fragment: { userImpact: 'Users can export CSV.' },
      })
    ).toMatch(/Reverted by 1234567/)
  })

  it('formatPrTitle falls back to "Not declared" absent GitHub metadata', () => {
    expect(formatPrTitle({})).toBe(NOT_DECLARED)
    expect(formatPrTitle({ github: { title: 'Add CSV export' } })).toBe('Add CSV export')
  })
})
