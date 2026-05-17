import { describe, it, expect } from 'vitest'
import {
  SPEC_KINDS,
  SPEC_KIND_META,
  normalizeSpecKind,
  isExecutableKind,
  isHashableKind,
  getSpecKindMeta,
  AUTOMATION_KIND_TO_SPEC_KIND,
} from './spec-kinds'

describe('SPEC_KIND_META completeness', () => {
  it('has metadata for every declared kind', () => {
    for (const kind of SPEC_KINDS) {
      expect(SPEC_KIND_META[kind], `Missing metadata for kind: ${kind}`).toBeDefined()
    }
  })

  it('every meta entry has required fields', () => {
    for (const kind of SPEC_KINDS) {
      const meta = SPEC_KIND_META[kind]
      expect(meta.kind).toBe(kind)
      expect(typeof meta.fileName).toBe('string')
      expect(typeof meta.description).toBe('string')
      expect(Array.isArray(meta.requiredFields)).toBe(true)
      expect(Array.isArray(meta.requiredSections)).toBe(true)
      expect(typeof meta.executable).toBe('boolean')
      expect(typeof meta.hashable).toBe('boolean')
      expect(typeof meta.forkable).toBe('boolean')
    }
  })

  it('all requiredFields include kind and name', () => {
    for (const kind of SPEC_KINDS) {
      const meta = SPEC_KIND_META[kind]
      expect(meta.requiredFields).toContain('kind')
      expect(meta.requiredFields).toContain('name')
    }
  })
})

describe('normalizeSpecKind', () => {
  it('maps lowercase lens to Lens', () => {
    expect(normalizeSpecKind('lens')).toBe('Lens')
  })

  it('maps colens to CoLens', () => {
    expect(normalizeSpecKind('colens')).toBe('CoLens')
  })

  it('maps agent (legacy) to Agent', () => {
    expect(normalizeSpecKind('agent')).toBe('Agent')
  })

  it('maps PascalCase Lens to Lens (pass-through)', () => {
    expect(normalizeSpecKind('Lens')).toBe('Lens')
  })

  it('returns undefined for unknown kinds', () => {
    expect(normalizeSpecKind('unknownkind')).toBeUndefined()
  })
})

describe('AUTOMATION_KIND_TO_SPEC_KIND', () => {
  it('maps all standard automation kinds', () => {
    const legacyKinds = ['lens', 'lenser', 'colens', 'battle', 'ray', 'team', 'agent', 'agent_team', 'tool', 'workflow', 'private_battle', 'skill', 'memory_policy', 'evaluation', 'run_report']
    for (const kind of legacyKinds) {
      expect(
        AUTOMATION_KIND_TO_SPEC_KIND[kind],
        `Missing mapping for automation kind: ${kind}`
      ).toBeDefined()
    }
  })
})

describe('isExecutableKind', () => {
  it('Lens is executable', () => expect(isExecutableKind('Lens')).toBe(true))
  it('CoLens is executable', () => expect(isExecutableKind('CoLens')).toBe(true))
  it('Ray is not executable', () => expect(isExecutableKind('Ray')).toBe(false))
  it('RunReport is not executable', () => expect(isExecutableKind('RunReport')).toBe(false))
})

describe('isHashableKind', () => {
  it('Lens is hashable', () => expect(isHashableKind('Lens')).toBe(true))
  it('Evaluation is hashable', () => expect(isHashableKind('Evaluation')).toBe(true))
  it('RunReport is not hashable', () => expect(isHashableKind('RunReport')).toBe(false))
})

describe('getSpecKindMeta', () => {
  it('returns the correct meta for Lens', () => {
    const meta = getSpecKindMeta('Lens')
    expect(meta.kind).toBe('Lens')
    expect(meta.fileName).toBe('LENS.MD')
    expect(meta.legacyKind).toBe('lens')
  })
})
