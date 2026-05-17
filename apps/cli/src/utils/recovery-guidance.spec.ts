import {
  getRecoveryGuidance,
  compactHints,
  allHints,
  buildContextLabel,
} from './recovery-guidance'
import type { CliErrorKind } from './error-taxonomy'

const ALL_KINDS: CliErrorKind[] = [
  'unauthorized', 'forbidden', 'not_found', 'rate_limited',
  'network', 'gateway', 'provider', 'multimodal', 'workflow',
  'battle', 'schema', 'config', 'local_model', 'unknown',
]

// ─── getRecoveryGuidance ──────────────────────────────────────────────────────

describe('getRecoveryGuidance', () => {
  it.each(ALL_KINDS)('returns guidance for kind: %s', (kind) => {
    const g = getRecoveryGuidance(kind)
    expect(g).toBeDefined()
    expect(typeof g.strategy).toBe('string')
    expect(g.strategy.length).toBeGreaterThan(0)
  })

  it.each(ALL_KINDS)('has at least one hint for kind: %s', (kind) => {
    const g = getRecoveryGuidance(kind)
    expect(g.hints.length).toBeGreaterThan(0)
  })

  it.each(ALL_KINDS)('has a non-empty inspectArea for kind: %s', (kind) => {
    const g = getRecoveryGuidance(kind)
    expect(g.inspectArea.length).toBeGreaterThan(0)
  })

  it.each(ALL_KINDS)('has a valid docsKey for kind: %s', (kind) => {
    const g = getRecoveryGuidance(kind)
    expect(typeof g.docsKey).toBe('string')
    expect(g.docsKey.length).toBeGreaterThan(0)
  })

  it('unauthorized strategy mentions signing in', () => {
    const g = getRecoveryGuidance('unauthorized')
    expect(g.strategy.toLowerCase()).toMatch(/sign in|login|session/)
  })

  it('gateway strategy mentions starting the gateway', () => {
    const g = getRecoveryGuidance('gateway')
    expect(g.hints.some((h) => h.includes('gateway start'))).toBe(true)
  })

  it('network strategy mentions --local mode or doctor', () => {
    const g = getRecoveryGuidance('network')
    const text = [g.strategy, ...g.hints].join(' ').toLowerCase()
    expect(text).toMatch(/--local|doctor/)
  })

  it('local_model strategy mentions Ollama', () => {
    const g = getRecoveryGuidance('local_model')
    const text = [g.strategy, ...g.hints].join(' ').toLowerCase()
    expect(text).toContain('ollama')
  })

  it('multimodal strategy mentions modality or provider', () => {
    const g = getRecoveryGuidance('multimodal')
    const text = [g.strategy, ...g.hints].join(' ').toLowerCase()
    expect(text).toMatch(/modali|provider/)
  })

  it('workflow strategy mentions inspecting the workflow', () => {
    const g = getRecoveryGuidance('workflow')
    expect(g.hints.some((h) => h.includes('workflow inspect'))).toBe(true)
  })

  it('battle strategy mentions inspecting the battle', () => {
    const g = getRecoveryGuidance('battle')
    expect(g.hints.some((h) => h.includes('battle inspect'))).toBe(true)
  })
})

// ─── compactHints ─────────────────────────────────────────────────────────────

describe('compactHints', () => {
  it('returns exactly 2 hints by default', () => {
    const hints = compactHints('unauthorized')
    expect(hints).toHaveLength(2)
  })

  it('returns n hints when n is specified', () => {
    const hints = compactHints('network', 3)
    expect(hints).toHaveLength(3)
  })

  it('returns fewer than n when there are not enough hints', () => {
    // All kinds have at least 1 hint, so this should not throw.
    const hints = compactHints('unknown', 100)
    expect(hints.length).toBeLessThanOrEqual(getRecoveryGuidance('unknown').hints.length)
  })

  it('compact hints are a prefix of all hints', () => {
    for (const kind of ALL_KINDS) {
      const compact = compactHints(kind)
      const all = allHints(kind)
      for (let i = 0; i < compact.length; i++) {
        expect(compact[i]).toBe(all[i])
      }
    }
  })
})

// ─── allHints ────────────────────────────────────────────────────────────────

describe('allHints', () => {
  it('returns all hints, more than compact when available', () => {
    const kinds = ALL_KINDS.filter((k) => getRecoveryGuidance(k).hints.length > 2)
    for (const kind of kinds) {
      expect(allHints(kind).length).toBeGreaterThan(compactHints(kind).length)
    }
  })
})

// ─── buildContextLabel ────────────────────────────────────────────────────────

describe('buildContextLabel', () => {
  it('returns undefined for errors without structured metadata', () => {
    expect(buildContextLabel(new Error('plain error'))).toBeUndefined()
  })

  it('returns undefined for null', () => {
    expect(buildContextLabel(null)).toBeUndefined()
  })

  it('includes battleId when present', () => {
    const err = Object.assign(new Error('failed'), { battleId: 'abc-123' })
    expect(buildContextLabel(err)).toContain('battle:abc-123')
  })

  it('includes workflowId when present', () => {
    const err = Object.assign(new Error('failed'), { workflowId: 'wf-456' })
    expect(buildContextLabel(err)).toContain('workflow:wf-456')
  })

  it('includes nodeId when present', () => {
    const err = Object.assign(new Error('failed'), { nodeId: 'node-1' })
    expect(buildContextLabel(err)).toContain('node:node-1')
  })

  it('includes provider when present', () => {
    const err = Object.assign(new Error('failed'), { provider: 'openai' })
    expect(buildContextLabel(err)).toContain('provider:openai')
  })

  it('includes phase when present', () => {
    const err = Object.assign(new Error('failed'), { phase: 'scoring' })
    expect(buildContextLabel(err)).toContain('phase:scoring')
  })

  it('includes modality when present', () => {
    const err = Object.assign(new Error('failed'), { modality: 'text-to-image' })
    expect(buildContextLabel(err)).toContain('modality:text-to-image')
  })

  it('combines multiple context fields', () => {
    const err = Object.assign(new Error('failed'), {
      battleId: 'b-1',
      provider: 'openai',
      phase: 'finalize',
    })
    const label = buildContextLabel(err)!
    expect(label).toContain('battle:b-1')
    expect(label).toContain('provider:openai')
    expect(label).toContain('phase:finalize')
  })

  it('ignores non-string metadata fields', () => {
    const err = Object.assign(new Error('failed'), { battleId: 123 })
    expect(buildContextLabel(err)).toBeUndefined()
  })
})
