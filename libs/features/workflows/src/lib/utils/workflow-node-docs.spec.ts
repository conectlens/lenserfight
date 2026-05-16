import { describe, expect, it, vi } from 'vitest'

vi.mock('@lenserfight/utils/env', () => ({
  DOCS_BASE_URL: 'https://docs.lenserfight.com',
}))

import { getWorkflowNodeDocsHref } from './workflow-node-docs'

describe('getWorkflowNodeDocsHref', () => {
  it('returns null for null', () => {
    expect(getWorkflowNodeDocsHref(null, 'en')).toBeNull()
  })

  it('returns null for undefined', () => {
    expect(getWorkflowNodeDocsHref(undefined, 'en')).toBeNull()
  })

  it('returns null for empty string', () => {
    expect(getWorkflowNodeDocsHref('', 'en')).toBeNull()
  })

  it('returns null for old placeholder paths', () => {
    expect(getWorkflowNodeDocsHref('/docs/workflows/nodes/manual_trigger', 'en')).toBeNull()
    expect(getWorkflowNodeDocsHref('/docs/workflows/nodes/code', 'tr')).toBeNull()
  })

  it('builds a full URL for a locale-agnostic path', () => {
    expect(
      getWorkflowNodeDocsHref('/reference/workflows/nodes/trigger#manual-trigger', 'en'),
    ).toBe('https://docs.lenserfight.com/en/reference/workflows/nodes/trigger#manual-trigger')
  })

  it('strips embedded /en/ prefix and replaces with caller locale', () => {
    expect(
      getWorkflowNodeDocsHref('/en/reference/workflows/nodes/trigger#manual-trigger', 'tr'),
    ).toBe('https://docs.lenserfight.com/tr/reference/workflows/nodes/trigger#manual-trigger')
  })

  it('strips embedded /tr/ prefix and replaces with caller locale', () => {
    expect(
      getWorkflowNodeDocsHref('/tr/reference/workflows/nodes/logic#code', 'en'),
    ).toBe('https://docs.lenserfight.com/en/reference/workflows/nodes/logic#code')
  })

  it('preserves anchor fragment in the result', () => {
    const href = getWorkflowNodeDocsHref('/reference/workflows/nodes/utility#logger', 'en')
    expect(href).toContain('#logger')
  })

  it('uses DOCS_BASE_URL from env', () => {
    const href = getWorkflowNodeDocsHref('/reference/workflows/nodes/data#json-transform', 'en')
    expect(href).toMatch(/^https:\/\/docs\.lenserfight\.com/)
  })

  it('handles zh-CN style locale prefix', () => {
    expect(
      getWorkflowNodeDocsHref('/zh-CN/reference/workflows/nodes/media#text-to-image', 'en'),
    ).toBe('https://docs.lenserfight.com/en/reference/workflows/nodes/media#text-to-image')
  })
})
