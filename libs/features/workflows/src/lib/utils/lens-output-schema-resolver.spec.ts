import { describe, expect, it, vi } from 'vitest'

vi.mock('@lenserfight/infra/execution', () => ({
  getWorkflowNodeCatalogEntry: vi.fn((type: string) => {
    if (type === 'manual_trigger') {
      return {
        outputs: [
          { name: 'params', type: 'json', description: 'Trigger params' },
        ],
      }
    }
    if (type === 'embedding') {
      return {
        outputs: [
          { name: 'vector', type: 'embedding', description: 'Embedding vector' },
        ],
      }
    }
    if (type === 'unknown_type') {
      return { outputs: [] } // empty outputs list
    }
    return undefined
  }),
}))

import { resolveLensOutputSchema } from './lens-output-schema-resolver'
import type { LensOutputContract } from '@lenserfight/types'

describe('resolveLensOutputSchema', () => {
  // ── Lens node — no contract ──────────────────────────────────────────────

  it('returns default lens outputs when node_type is lens and no contract provided', () => {
    const fields = resolveLensOutputSchema('lens', null)
    const names = fields.map((f) => f.name)
    expect(names).toContain('text')
    expect(names).toContain('result')
    expect(fields.find((f) => f.name === 'text')?.type).toBe('text')
    expect(fields.find((f) => f.name === 'result')?.type).toBe('lens_result')
  })

  it('returns default lens outputs when contract has no schema', () => {
    const contract: LensOutputContract = {
      kind: 'text',
      artifactKind: 'text',
    }
    const fields = resolveLensOutputSchema('lens', contract)
    expect(fields.some((f) => f.name === 'text')).toBe(true)
    expect(fields.some((f) => f.name === 'result')).toBe(true)
  })

  it('adds media field for non-text artifactKind', () => {
    const contract: LensOutputContract = {
      kind: 'image',
      artifactKind: 'image',
    }
    const fields = resolveLensOutputSchema('lens', contract)
    const mediaField = fields.find((f) => f.name === 'media')
    expect(mediaField).toBeDefined()
    expect(mediaField?.type).toBe('image')
  })

  // ── Lens node — with schema ──────────────────────────────────────────────

  it('exposes structured contract schema fields', () => {
    const contract: LensOutputContract = {
      kind: 'text',
      artifactKind: 'text',
      schema: {
        summary: { type: 'string', required: true, description: 'Summary text' },
        confidence: { type: 'number', description: 'Confidence score' },
        tags: { type: 'array', description: 'Tag list' },
      },
    }
    const fields = resolveLensOutputSchema('lens', contract)
    const names = fields.map((f) => f.name)
    expect(names).toContain('summary')
    expect(names).toContain('confidence')
    expect(names).toContain('tags')
  })

  it('maps ContractFieldType string→text, integer/number→number, boolean, json, array', () => {
    const contract: LensOutputContract = {
      kind: 'text',
      artifactKind: 'text',
      schema: {
        title: { type: 'string' },
        count: { type: 'integer' },
        active: { type: 'boolean' },
        meta: { type: 'json' },
        items: { type: 'array' },
        misc: { type: 'any' },
      },
    }
    const fields = resolveLensOutputSchema('lens', contract)
    const byName = Object.fromEntries(fields.map((f) => [f.name, f]))
    expect(byName['title'].type).toBe('text')
    expect(byName['count'].type).toBe('number')
    expect(byName['active'].type).toBe('boolean')
    expect(byName['meta'].type).toBe('json')
    expect(byName['items'].type).toBe('array')
    expect(byName['misc'].type).toBe('any')
  })

  it('always includes text and result fields even when contract schema is present', () => {
    const contract: LensOutputContract = {
      kind: 'text',
      artifactKind: 'text',
      schema: { sentiment: { type: 'string' } },
    }
    const fields = resolveLensOutputSchema('lens', contract)
    expect(fields.some((f) => f.name === 'text')).toBe(true)
    expect(fields.some((f) => f.name === 'result')).toBe(true)
  })

  // ── Non-lens node types ──────────────────────────────────────────────────

  it('returns catalog outputs for manual_trigger', () => {
    const fields = resolveLensOutputSchema('manual_trigger')
    expect(fields).toHaveLength(1)
    expect(fields[0].name).toBe('params')
    expect(fields[0].type).toBe('json')
  })

  it('returns catalog outputs for embedding node', () => {
    const fields = resolveLensOutputSchema('embedding')
    expect(fields[0].name).toBe('vector')
    expect(fields[0].type).toBe('embedding')
  })

  // ── Fallback ─────────────────────────────────────────────────────────────

  it('returns fallback output for completely unknown type', () => {
    const fields = resolveLensOutputSchema('totally_unknown_xyz')
    expect(fields).toHaveLength(1)
    expect(fields[0].name).toBe('output')
    expect(fields[0].type).toBe('any')
  })

  it('returns fallback when catalog entry has empty outputs', () => {
    const fields = resolveLensOutputSchema('unknown_type')
    expect(fields).toHaveLength(1)
    expect(fields[0].name).toBe('output')
  })

  it('never returns an empty array', () => {
    const cases = ['lens', 'manual_trigger', 'embedding', 'unknown_type', 'totally_unknown']
    for (const type of cases) {
      expect(resolveLensOutputSchema(type).length).toBeGreaterThan(0)
    }
  })
})
