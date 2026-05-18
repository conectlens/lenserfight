// Comprehensive tests for validateWorkflow() — Blueprint §4 rules.
// Covers all 6 rule groups: cycles, orphan/self edges, bindings, routing shape,
// validation-node policy, and orchestration caps.
import { describe, it, expect } from 'vitest'

import { validateWorkflow, detectCycle, TRIGGER_NODE_TYPES } from './validator'
import type { ValidationNodeShape, ValidationEdgeShape } from './validator'

// ── Helpers ───────────────────────────────────────────────────────────────────

function node(id: string, overrides: Partial<ValidationNodeShape> = {}): ValidationNodeShape {
  return { id, lensId: 'lens-1', ...overrides }
}

function edge(
  sourceNodeId: string,
  targetNodeId: string,
  overrides: Partial<ValidationEdgeShape> = {},
): ValidationEdgeShape {
  return { sourceNodeId, targetNodeId, ...overrides }
}

// ── detectCycle ───────────────────────────────────────────────────────────────

describe('detectCycle', () => {
  it('returns null for a single node with no edges', () => {
    expect(detectCycle([{ id: 'a' }], [])).toBeNull()
  })

  it('returns null for a linear chain A→B→C', () => {
    const nodes = [{ id: 'a' }, { id: 'b' }, { id: 'c' }]
    const edges = [
      { sourceNodeId: 'a', targetNodeId: 'b' },
      { sourceNodeId: 'b', targetNodeId: 'c' },
    ]
    expect(detectCycle(nodes, edges)).toBeNull()
  })

  it('returns null for a diamond A→B, A→C, B→D, C→D', () => {
    const nodes = [{ id: 'a' }, { id: 'b' }, { id: 'c' }, { id: 'd' }]
    const edges = [
      { sourceNodeId: 'a', targetNodeId: 'b' },
      { sourceNodeId: 'a', targetNodeId: 'c' },
      { sourceNodeId: 'b', targetNodeId: 'd' },
      { sourceNodeId: 'c', targetNodeId: 'd' },
    ]
    expect(detectCycle(nodes, edges)).toBeNull()
  })

  it('detects a direct 2-node cycle A→B→A', () => {
    const nodes = [{ id: 'a' }, { id: 'b' }]
    const edges = [
      { sourceNodeId: 'a', targetNodeId: 'b' },
      { sourceNodeId: 'b', targetNodeId: 'a' },
    ]
    const result = detectCycle(nodes, edges)
    expect(result).not.toBeNull()
    expect(result).toEqual(expect.arrayContaining(['a', 'b']))
  })

  it('detects a 3-node cycle A→B→C→A', () => {
    const nodes = [{ id: 'a' }, { id: 'b' }, { id: 'c' }]
    const edges = [
      { sourceNodeId: 'a', targetNodeId: 'b' },
      { sourceNodeId: 'b', targetNodeId: 'c' },
      { sourceNodeId: 'c', targetNodeId: 'a' },
    ]
    const result = detectCycle(nodes, edges)
    expect(result).not.toBeNull()
    expect(result!.length).toBe(3)
  })

  it('returns nodes in the cycle only, not unreachable nodes outside it', () => {
    // Node 'd' has no edges so it is acyclic
    const nodes = [{ id: 'a' }, { id: 'b' }, { id: 'c' }, { id: 'd' }]
    const edges = [
      { sourceNodeId: 'a', targetNodeId: 'b' },
      { sourceNodeId: 'b', targetNodeId: 'c' },
      { sourceNodeId: 'c', targetNodeId: 'a' },
    ]
    const result = detectCycle(nodes, edges)
    expect(result).not.toBeNull()
    expect(result).not.toContain('d')
  })

  it('returns null for an empty graph', () => {
    expect(detectCycle([], [])).toBeNull()
  })
})

// ── validateWorkflow — structural checks ─────────────────────────────────────

describe('validateWorkflow — valid graphs', () => {
  it('accepts a single node with no edges', () => {
    const result = validateWorkflow([node('a')], [])
    expect(result.ok).toBe(true)
    expect(result.errors).toHaveLength(0)
  })

  it('accepts a two-node linear chain', () => {
    const result = validateWorkflow(
      [node('a'), node('b')],
      [edge('a', 'b')],
    )
    expect(result.ok).toBe(true)
  })

  it('accepts a diamond graph', () => {
    const nodes = [node('a'), node('b'), node('c'), node('d')]
    const edges = [
      edge('a', 'b'),
      edge('a', 'c'),
      edge('b', 'd'),
      edge('c', 'd'),
    ]
    expect(validateWorkflow(nodes, edges).ok).toBe(true)
  })

  it('returns ok=false only when there is at least one error-severity issue', () => {
    const result = validateWorkflow([node('a'), node('a')], [])
    expect(result.ok).toBe(false)
    expect(result.errors.some((e) => e.code === 'duplicate_node_id')).toBe(true)
  })
})

// ── Rule 0: duplicate node IDs ─────────────────────────────────────────────

describe('validateWorkflow — duplicate node IDs', () => {
  it('reports error for two nodes with the same id', () => {
    const result = validateWorkflow([node('a'), node('a')], [])
    expect(result.ok).toBe(false)
    expect(result.errors).toHaveLength(1)
    expect(result.errors[0].code).toBe('duplicate_node_id')
    expect(result.errors[0].nodeId).toBe('a')
  })

  it('reports one error per duplicate (three nodes, two with same id)', () => {
    const result = validateWorkflow([node('a'), node('b'), node('a')], [])
    const dupes = result.errors.filter((e) => e.code === 'duplicate_node_id')
    expect(dupes).toHaveLength(1)
  })

  it('does not flag when all node IDs are unique', () => {
    const result = validateWorkflow([node('a'), node('b'), node('c')], [])
    expect(result.errors.filter((e) => e.code === 'duplicate_node_id')).toHaveLength(0)
  })
})

// ── Rule 1: orphan / self edges ─────────────────────────────────────────────

describe('validateWorkflow — orphan edges', () => {
  it('reports orphan_source when edge source is not a node', () => {
    const result = validateWorkflow(
      [node('b')],
      [edge('ghost', 'b', { id: 'e1' })],
    )
    const orphans = result.errors.filter((e) => e.code === 'orphan_source')
    expect(orphans).toHaveLength(1)
    expect(orphans[0].edgeId).toBe('e1')
    expect(orphans[0].message).toContain('ghost')
  })

  it('reports orphan_target when edge target is not a node', () => {
    const result = validateWorkflow(
      [node('a')],
      [edge('a', 'ghost', { id: 'e2' })],
    )
    const orphans = result.errors.filter((e) => e.code === 'orphan_target')
    expect(orphans).toHaveLength(1)
    expect(orphans[0].edgeId).toBe('e2')
  })

  it('reports both orphan_source and orphan_target when both ends are missing', () => {
    const result = validateWorkflow(
      [],
      [edge('x', 'y', { id: 'e3' })],
    )
    expect(result.errors.some((e) => e.code === 'orphan_source')).toBe(true)
    expect(result.errors.some((e) => e.code === 'orphan_target')).toBe(true)
  })
})

describe('validateWorkflow — self-edges', () => {
  it('reports self_edge when source and target are the same node', () => {
    const result = validateWorkflow(
      [node('a')],
      [edge('a', 'a', { id: 'loop' })],
    )
    expect(result.ok).toBe(false)
    const selfEdges = result.errors.filter((e) => e.code === 'self_edge')
    expect(selfEdges).toHaveLength(1)
    expect(selfEdges[0].nodeId).toBe('a')
  })
})

// ── Rule 2: cycle detection ─────────────────────────────────────────────────

describe('validateWorkflow — cycle detection', () => {
  it('reports cycle_detected for a direct 2-node cycle', () => {
    const nodes = [node('a'), node('b')]
    const edges = [edge('a', 'b'), edge('b', 'a')]
    const result = validateWorkflow(nodes, edges)
    expect(result.ok).toBe(false)
    const cycles = result.errors.filter((e) => e.code === 'cycle_detected')
    expect(cycles).toHaveLength(1)
    expect(result.cycleNodes).toEqual(expect.arrayContaining(['a', 'b']))
  })

  it('reports cycle_detected for a 3-node cycle', () => {
    const nodes = [node('a'), node('b'), node('c')]
    const edges = [edge('a', 'b'), edge('b', 'c'), edge('c', 'a')]
    const result = validateWorkflow(nodes, edges)
    expect(result.cycleNodes).not.toBeNull()
    expect(result.cycleNodes!.length).toBe(3)
  })

  it('sets cycleNodes=null when the graph is acyclic', () => {
    const nodes = [node('a'), node('b')]
    const edges = [edge('a', 'b')]
    expect(validateWorkflow(nodes, edges).cycleNodes).toBeNull()
  })

  it('includes cycle nodes in the error details', () => {
    const nodes = [node('x'), node('y')]
    const edges = [edge('x', 'y'), edge('y', 'x')]
    const result = validateWorkflow(nodes, edges)
    const cycleErr = result.errors.find((e) => e.code === 'cycle_detected')!
    expect(Array.isArray(cycleErr.details?.['nodeIds'])).toBe(true)
    expect((cycleErr.details!['nodeIds'] as string[])).toEqual(expect.arrayContaining(['x', 'y']))
  })
})

// ── Rule 3: binding completeness ─────────────────────────────────────────────

describe('validateWorkflow — binding completeness', () => {
  it('accepts a node whose paramLabels are satisfied by incoming edges', () => {
    const nodeB = node('b', { paramLabels: ['topic'] })
    const result = validateWorkflow(
      [node('a'), nodeB],
      [edge('a', 'b', { targetParamLabel: 'topic' })],
    )
    expect(result.errors.filter((e) => e.code === 'missing_binding')).toHaveLength(0)
  })

  it('reports missing_binding when a paramLabel has no incoming edge', () => {
    const nodeA = node('a', { paramLabels: ['topic'] })
    const result = validateWorkflow([nodeA], [])
    const missing = result.errors.filter((e) => e.code === 'missing_binding')
    expect(missing).toHaveLength(1)
    expect(missing[0].nodeId).toBe('a')
    expect(missing[0].details?.['label']).toBe('topic')
  })

  it('satisfies a binding via rootInputs', () => {
    const nodeA = node('a', { paramLabels: ['topic'] })
    const result = validateWorkflow([nodeA], [], { rootInputs: { topic: 'AI trends' } })
    expect(result.errors.filter((e) => e.code === 'missing_binding')).toHaveLength(0)
  })

  it('does not report missing_binding when the field is optional in the contract', () => {
    const nodeA = node('a', {
      paramLabels: ['optional_hint'],
      inputContract: {
        fields: { optional_hint: { type: 'string', required: false } },
      },
    })
    const result = validateWorkflow([nodeA], [])
    expect(result.errors.filter((e) => e.code === 'missing_binding')).toHaveLength(0)
  })

  it('reports missing_binding when the contract marks the field required', () => {
    const nodeA = node('a', {
      paramLabels: ['required_hint'],
      inputContract: {
        fields: { required_hint: { type: 'string', required: true } },
      },
    })
    const result = validateWorkflow([nodeA], [])
    const missing = result.errors.filter((e) => e.code === 'missing_binding')
    expect(missing).toHaveLength(1)
  })

  it('ignores empty paramLabels arrays', () => {
    const result = validateWorkflow([node('a', { paramLabels: [] })], [])
    expect(result.errors).toHaveLength(0)
  })

  it('normalises whitespace when matching rootInputs', () => {
    const nodeA = node('a', { paramLabels: ['My Topic'] })
    const result = validateWorkflow([nodeA], [], { rootInputs: { my_topic: 'value' } })
    expect(result.errors.filter((e) => e.code === 'missing_binding')).toHaveLength(0)
  })
})

// ── Rule 4: routing node shape ─────────────────────────────────────────────

describe('validateWorkflow — routing node shape', () => {
  it('accepts a routing node with ≥2 equals-condition edges and unique routes', () => {
    const nodes = [
      node('router', { kind: 'routing' }),
      node('branch-a'),
      node('branch-b'),
    ]
    const edges = [
      edge('router', 'branch-a', {
        id: 'e1',
        condition: { type: 'equals', value: 'A' },
        sourceOutputKey: 'route',
        targetParamLabel: 'input',
      }),
      edge('router', 'branch-b', {
        id: 'e2',
        condition: { type: 'equals', value: 'B' },
        sourceOutputKey: 'route',
        targetParamLabel: 'input',
      }),
    ]
    const result = validateWorkflow(nodes, edges)
    expect(result.errors.filter((e) => e.nodeId === 'router')).toHaveLength(0)
  })

  it('reports routing_insufficient_edges when there is only 1 outbound edge', () => {
    const nodes = [node('router', { kind: 'routing' }), node('b')]
    const edges = [edge('router', 'b', { condition: { type: 'equals', value: 'X' } })]
    const result = validateWorkflow(nodes, edges)
    const errs = result.errors.filter((e) => e.code === 'routing_insufficient_edges')
    expect(errs).toHaveLength(1)
    expect(errs[0].nodeId).toBe('router')
  })

  it('reports routing_insufficient_edges when a routing node has 0 outbound edges', () => {
    const result = validateWorkflow([node('router', { kind: 'routing' })], [])
    expect(result.errors.some((e) => e.code === 'routing_insufficient_edges')).toBe(true)
  })

  it('reports routing_missing_equals when an edge has no condition', () => {
    const nodes = [node('router', { kind: 'routing' }), node('b'), node('c')]
    const edges = [
      edge('router', 'b'),
      edge('router', 'c', { condition: { type: 'equals', value: 'X' } }),
    ]
    const result = validateWorkflow(nodes, edges)
    expect(result.errors.some((e) => e.code === 'routing_missing_equals')).toBe(true)
  })

  it('reports routing_missing_equals when condition type is not equals', () => {
    const nodes = [node('router', { kind: 'routing' }), node('b'), node('c')]
    const edges = [
      edge('router', 'b', { condition: { type: 'truthy' } }),
      edge('router', 'c', { condition: { type: 'equals', value: 'X' } }),
    ]
    const result = validateWorkflow(nodes, edges)
    expect(result.errors.some((e) => e.code === 'routing_missing_equals')).toBe(true)
  })

  it('warns (not errors) on duplicate route values', () => {
    const nodes = [node('router', { kind: 'routing' }), node('b'), node('c')]
    const edges = [
      edge('router', 'b', { condition: { type: 'equals', value: 'X' } }),
      edge('router', 'c', { condition: { type: 'equals', value: 'X' } }),
    ]
    const result = validateWorkflow(nodes, edges)
    const dupeWarns = result.warnings.filter((w) => w.code === 'routing_duplicate_route')
    expect(dupeWarns).toHaveLength(1)
    expect(result.errors.filter((e) => e.code === 'routing_duplicate_route')).toHaveLength(0)
  })

  it('does not apply routing rules to non-routing nodes', () => {
    const nodes = [node('plain'), node('b')]
    const edges = [edge('plain', 'b')]
    const result = validateWorkflow(nodes, edges)
    expect(result.errors.some((e) => e.code === 'routing_insufficient_edges')).toBe(false)
  })
})

// ── Rule 5: validation-node outbound edge policy ────────────────────────────

describe('validateWorkflow — validation node edge policy', () => {
  it('accepts a validation node with an outbound edge that has an onFail policy', () => {
    const nodes = [node('vnode', { kind: 'validation' }), node('next')]
    const edges = [edge('vnode', 'next', { onFail: 'skip_downstream' })]
    const result = validateWorkflow(nodes, edges)
    expect(result.errors.filter((e) => e.code === 'validation_missing_policy')).toHaveLength(0)
  })

  it('accepts a validation node with no outbound edges (terminal)', () => {
    const result = validateWorkflow([node('vnode', { kind: 'validation' })], [])
    expect(result.errors.filter((e) => e.code === 'validation_missing_policy')).toHaveLength(0)
  })

  it('reports validation_missing_policy when no outbound edge has onFail', () => {
    const nodes = [node('vnode', { kind: 'validation' }), node('next')]
    const edges = [edge('vnode', 'next')]
    const result = validateWorkflow(nodes, edges)
    const errs = result.errors.filter((e) => e.code === 'validation_missing_policy')
    expect(errs).toHaveLength(1)
    expect(errs[0].nodeId).toBe('vnode')
  })

  it('accepts all three valid onFail policy values', () => {
    const policies: Array<'skip_downstream' | 'fail_run' | 'divert_to_branch'> = [
      'skip_downstream',
      'fail_run',
      'divert_to_branch',
    ]
    for (const policy of policies) {
      const nodes = [node('vnode', { kind: 'validation' }), node('next')]
      const edges = [edge('vnode', 'next', { onFail: policy })]
      const result = validateWorkflow(nodes, edges)
      expect(result.errors.filter((e) => e.code === 'validation_missing_policy')).toHaveLength(0)
    }
  })

  it('does not apply validation-node rules to plain nodes', () => {
    const nodes = [node('plain'), node('next')]
    const edges = [edge('plain', 'next')]
    const result = validateWorkflow(nodes, edges)
    expect(result.errors.some((e) => e.code === 'validation_missing_policy')).toBe(false)
  })
})

// ── Rule 6: orchestration caps ─────────────────────────────────────────────

describe('validateWorkflow — orchestration node caps', () => {
  it('accepts an orchestration node with both maxDepth and maxGeneratedNodes', () => {
    const n = node('orch', {
      kind: 'orchestration',
      config: { maxDepth: 3, maxGeneratedNodes: 20 },
    })
    const result = validateWorkflow([n], [])
    expect(result.warnings.filter((w) => w.code === 'orchestration_missing_caps')).toHaveLength(0)
  })

  it('warns when maxDepth is missing', () => {
    const n = node('orch', {
      kind: 'orchestration',
      config: { maxGeneratedNodes: 20 },
    })
    const result = validateWorkflow([n], [])
    const warns = result.warnings.filter((w) => w.code === 'orchestration_missing_caps')
    expect(warns).toHaveLength(1)
    expect(warns[0].nodeId).toBe('orch')
  })

  it('warns when maxGeneratedNodes is missing', () => {
    const n = node('orch', {
      kind: 'orchestration',
      config: { maxDepth: 5 },
    })
    const result = validateWorkflow([n], [])
    expect(result.warnings.filter((w) => w.code === 'orchestration_missing_caps')).toHaveLength(1)
  })

  it('warns when config is null', () => {
    const n = node('orch', { kind: 'orchestration', config: null })
    const result = validateWorkflow([n], [])
    expect(result.warnings.filter((w) => w.code === 'orchestration_missing_caps')).toHaveLength(1)
  })

  it('caps warning does not degrade ok=true when no errors are present', () => {
    const n = node('orch', { kind: 'orchestration', config: {} })
    const result = validateWorkflow([n], [])
    expect(result.ok).toBe(true)
    expect(result.warnings.length).toBeGreaterThan(0)
  })

  it('does not apply orchestration rules to plain nodes', () => {
    const n = node('plain', { config: {} })
    const result = validateWorkflow([n], [])
    expect(result.warnings.some((w) => w.code === 'orchestration_missing_caps')).toBe(false)
  })
})

// ── Error structure ────────────────────────────────────────────────────────

describe('validateWorkflow — result structure', () => {
  it('errors and warnings are disjoint', () => {
    const n = node('a', { kind: 'orchestration', config: {} })
    const result = validateWorkflow([n, n], [])
    const errCodes = new Set(result.errors.map((e) => e.code))
    const warnCodes = new Set(result.warnings.map((w) => w.code))
    for (const c of errCodes) expect(warnCodes).not.toContain(c)
  })

  it('all issues have severity=error in errors, severity!=error in warnings', () => {
    const n = node('a', { kind: 'orchestration', config: {} })
    const result = validateWorkflow([n, n], [])
    for (const e of result.errors) expect(e.severity).toBe('error')
    for (const w of result.warnings) expect(w.severity).not.toBe('error')
  })

  it('never throws — returns a result even on pathological input', () => {
    const weirdNode = { id: '', lensId: undefined as never }
    expect(() => validateWorkflow([weirdNode], [])).not.toThrow()
  })
})

// ── Rule 7: trigger/input node presence ──────────────────────────────────────

describe('validateWorkflow — no_trigger_node rule', () => {
  it('TRIGGER_NODE_TYPES contains all 5 expected trigger types', () => {
    expect(TRIGGER_NODE_TYPES.has('manual_trigger')).toBe(true)
    expect(TRIGGER_NODE_TYPES.has('event_trigger')).toBe(true)
    expect(TRIGGER_NODE_TYPES.has('form_input_trigger')).toBe(true)
    expect(TRIGGER_NODE_TYPES.has('webhook_trigger')).toBe(true)
    expect(TRIGGER_NODE_TYPES.has('schedule_trigger')).toBe(true)
  })

  it('emits no_trigger_node warn when all root nodes are non-trigger types', () => {
    const nodes = [node('a', { kind: 'code' }), node('b')]
    const edges = [edge('a', 'b')]
    const result = validateWorkflow(nodes, edges)
    const warn = result.warnings.find((w) => w.code === 'no_trigger_node')
    expect(warn).toBeDefined()
    expect(warn?.severity).toBe('warn')
  })

  it('does NOT emit no_trigger_node when a manual_trigger root is present', () => {
    const nodes = [node('trigger', { kind: 'manual_trigger' }), node('processor')]
    const edges = [edge('trigger', 'processor')]
    const result = validateWorkflow(nodes, edges)
    expect(result.warnings.find((w) => w.code === 'no_trigger_node')).toBeUndefined()
  })

  it('does NOT emit no_trigger_node when any trigger type is a root', () => {
    for (const triggerKind of TRIGGER_NODE_TYPES) {
      const nodes = [node('entry', { kind: triggerKind }), node('sink')]
      const edges = [edge('entry', 'sink')]
      const result = validateWorkflow(nodes, edges)
      const warn = result.warnings.find((w) => w.code === 'no_trigger_node')
      expect(warn).toBeUndefined()
    }
  })

  it('promotes no_trigger_node to error when requireTriggerNode:true', () => {
    const nodes = [node('a', { kind: 'code' })]
    const result = validateWorkflow(nodes, [], { requireTriggerNode: true })
    const err = result.errors.find((e) => e.code === 'no_trigger_node')
    expect(err).toBeDefined()
    expect(err?.severity).toBe('error')
    expect(result.ok).toBe(false)
  })

  it('emits no error when requireTriggerNode:true and trigger is present', () => {
    const nodes = [node('trigger', { kind: 'webhook_trigger' }), node('sink')]
    const edges = [edge('trigger', 'sink')]
    const result = validateWorkflow(nodes, edges, { requireTriggerNode: true })
    expect(result.errors.find((e) => e.code === 'no_trigger_node')).toBeUndefined()
    expect(result.ok).toBe(true)
  })

  it('warns when a non-trigger node is a disconnected root alongside a trigger', () => {
    // Two roots: one trigger, one non-trigger — trigger satisfies the rule
    const nodes = [
      node('trigger', { kind: 'schedule_trigger' }),
      node('orphan', { kind: 'code' }),
      node('sink'),
    ]
    const edges = [edge('trigger', 'sink')]
    const result = validateWorkflow(nodes, edges)
    // Trigger is present, so no_trigger_node should NOT fire
    expect(result.warnings.find((w) => w.code === 'no_trigger_node')).toBeUndefined()
  })

  it('does not emit no_trigger_node for an empty graph', () => {
    const result = validateWorkflow([], [])
    expect(result.warnings.find((w) => w.code === 'no_trigger_node')).toBeUndefined()
  })
})
