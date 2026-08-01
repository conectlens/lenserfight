import { describe, expect, it } from 'vitest'

import {
  LENS_NODE_TYPE,
  catalogOutputKeys,
  isLensCatalogEntry,
  resolveWorkflowNode,
} from './node-resolution'

describe('resolveWorkflowNode', () => {
  it('resolves an explicit node type', () => {
    const outcome = resolveWorkflowNode({
      kind: 'trigger',
      name: 'anything',
      nodeType: 'manual_trigger',
    })
    expect(outcome.ok).toBe(true)
    if (outcome.ok) {
      expect(outcome.resolution.entry.type).toBe('manual_trigger')
      expect(outcome.resolution.resolvedByName).toBe(false)
    }
  })

  it('resolves by display name when no node type is given', () => {
    const outcome = resolveWorkflowNode({ kind: 'trigger', name: 'Manual Trigger' })
    expect(outcome.ok).toBe(true)
    if (outcome.ok) {
      expect(outcome.resolution.entry.type).toBe('manual_trigger')
      expect(outcome.resolution.resolvedByName).toBe(true)
    }
  })

  it('matches names case- and punctuation-insensitively', () => {
    const outcome = resolveWorkflowNode({ kind: 'trigger', name: 'manual   trigger' })
    expect(outcome.ok).toBe(true)
  })

  it('resolves a snake_case type used as the name', () => {
    const outcome = resolveWorkflowNode({ kind: 'trigger', name: 'form_input_trigger' })
    expect(outcome.ok).toBe(true)
    if (outcome.ok) expect(outcome.resolution.entry.type).toBe('form_input_trigger')
  })

  it('rejects an invented node type instead of substituting a no-op', () => {
    const outcome = resolveWorkflowNode({
      kind: 'tool',
      name: 'Human Approval',
      nodeType: 'human_approval',
    })
    expect(outcome.ok).toBe(false)
    if (!outcome.ok) expect(outcome.message).toContain('human_approval')
  })

  it('rejects an unmatched display name', () => {
    const outcome = resolveWorkflowNode({ kind: 'tool', name: 'Totally Made Up Node' })
    expect(outcome.ok).toBe(false)
  })

  it('refuses a node used under the wrong kind', () => {
    const outcome = resolveWorkflowNode({
      kind: 'trigger',
      name: 'Lens',
      nodeType: LENS_NODE_TYPE,
    })
    expect(outcome.ok).toBe(false)
    if (!outcome.ok) expect(outcome.message).toContain('cannot be used')
  })

  it('offers suggestions scoped to the requested kind', () => {
    const outcome = resolveWorkflowNode({ kind: 'trigger', name: 'trigger' })
    if (!outcome.ok) {
      expect(outcome.suggestions.length).toBeGreaterThan(0)
    }
  })

  it('resolves the lens node under the lens kind', () => {
    const outcome = resolveWorkflowNode({ kind: 'lens', name: 'Lens' })
    expect(outcome.ok).toBe(true)
    if (outcome.ok) expect(isLensCatalogEntry(outcome.resolution.entry)).toBe(true)
  })
})

describe('catalogOutputKeys', () => {
  it('lists the output names the catalog declares', () => {
    const outcome = resolveWorkflowNode({ kind: 'trigger', name: 'Event Trigger' })
    expect(outcome.ok).toBe(true)
    if (outcome.ok) {
      expect(catalogOutputKeys(outcome.resolution.entry)).toContain('event')
    }
  })
})
