import { renderHook } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

// Mock catalog entry lookup so tests don't depend on the full catalog
vi.mock('@lenserfight/infra/execution', () => ({
  getWorkflowNodeCatalogEntry: vi.fn((type: string) => {
    if (type === 'manual_trigger') {
      return { outputs: [{ name: 'params', type: 'json', description: 'Trigger params' }] }
    }
    if (type === 'code') {
      return { outputs: [{ name: 'result', type: 'any', description: 'Code result' }] }
    }
    return undefined
  }),
}))

import type { WorkflowEdgeRecord, WorkflowNodeRecord, WorkflowNodeResultRecord } from '@lenserfight/data/repositories'
import { useUpstreamNodeOutputs } from './useUpstreamNodeOutputs'

// ── Fixture builders ──────────────────────────────────────────────────────────

function edge(overrides: Partial<WorkflowEdgeRecord> & { source_node_id: string; target_node_id: string }): WorkflowEdgeRecord {
  return {
    id: `e-${overrides.source_node_id}-${overrides.target_node_id}`,
    workflow_id: 'wf1',
    source_output_key: 'output',
    target_param_label: 'input',
    ...overrides,
  }
}

function node(overrides: Partial<WorkflowNodeRecord> & { id: string }): WorkflowNodeRecord {
  return {
    workflow_id: 'wf1',
    lens_id: null,
    position_x: 0,
    position_y: 0,
    ordinal: 1,
    created_at: '2024-01-01T00:00:00Z',
    config: { node_type: 'manual_trigger' },
    ...overrides,
  }
}

function result(overrides: Partial<WorkflowNodeResultRecord> & { node_id: string; status: WorkflowNodeResultRecord['status'] }): WorkflowNodeResultRecord {
  return {
    id: `r-${overrides.node_id}`,
    run_id: 'run1',
    ...overrides,
  }
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('useUpstreamNodeOutputs', () => {
  it('returns empty array when no edges target the selected node', () => {
    const { result: hook } = renderHook(() =>
      useUpstreamNodeOutputs({
        nodeId: 'selected',
        edges: [edge({ source_node_id: 'n1', target_node_id: 'n2' })],
        nodes: [node({ id: 'n1' }), node({ id: 'n2' })],
        nodeResults: [],
      }),
    )
    expect(hook.current).toHaveLength(0)
  })

  it('returns the upstream node when one edge targets the selected node', () => {
    const { result: hook } = renderHook(() =>
      useUpstreamNodeOutputs({
        nodeId: 'selected',
        edges: [edge({ source_node_id: 'n1', target_node_id: 'selected' })],
        nodes: [node({ id: 'n1', label: 'Trigger' })],
        nodeResults: [],
      }),
    )
    expect(hook.current).toHaveLength(1)
    expect(hook.current[0].nodeId).toBe('n1')
    expect(hook.current[0].label).toBe('Trigger')
    expect(hook.current[0].status).toBeNull()
    expect(hook.current[0].executedValues).toBeNull()
  })

  it('deduplicates multiple edges from the same source node', () => {
    const { result: hook } = renderHook(() =>
      useUpstreamNodeOutputs({
        nodeId: 'selected',
        edges: [
          edge({ id: 'e1', source_node_id: 'n1', target_node_id: 'selected', target_param_label: 'a' }),
          edge({ id: 'e2', source_node_id: 'n1', target_node_id: 'selected', target_param_label: 'b' }),
        ],
        nodes: [node({ id: 'n1' })],
        nodeResults: [],
      }),
    )
    expect(hook.current).toHaveLength(1)
    expect(hook.current[0].nodeId).toBe('n1')
  })

  it('returns multiple entries for multiple upstream nodes', () => {
    const { result: hook } = renderHook(() =>
      useUpstreamNodeOutputs({
        nodeId: 'selected',
        edges: [
          edge({ source_node_id: 'n1', target_node_id: 'selected' }),
          edge({ source_node_id: 'n2', target_node_id: 'selected' }),
        ],
        nodes: [
          node({ id: 'n1', label: 'A' }),
          node({ id: 'n2', label: 'B' }),
        ],
        nodeResults: [],
      }),
    )
    expect(hook.current).toHaveLength(2)
    expect(hook.current.map((u) => u.nodeId)).toEqual(['n1', 'n2'])
  })

  it('shows executed values when upstream node completed', () => {
    const { result: hook } = renderHook(() =>
      useUpstreamNodeOutputs({
        nodeId: 'selected',
        edges: [edge({ source_node_id: 'n1', target_node_id: 'selected' })],
        nodes: [node({ id: 'n1' })],
        nodeResults: [
          result({ node_id: 'n1', status: 'completed', output_data: { text: 'hello', count: 5 } }),
        ],
      }),
    )
    expect(hook.current[0].status).toBe('completed')
    expect(hook.current[0].executedValues).toEqual({ text: 'hello', count: 5 })
  })

  it('sets executedValues to null when upstream node failed', () => {
    const { result: hook } = renderHook(() =>
      useUpstreamNodeOutputs({
        nodeId: 'selected',
        edges: [edge({ source_node_id: 'n1', target_node_id: 'selected' })],
        nodes: [node({ id: 'n1' })],
        nodeResults: [
          result({ node_id: 'n1', status: 'failed', error_message: 'Provider error' }),
        ],
      }),
    )
    expect(hook.current[0].status).toBe('failed')
    expect(hook.current[0].executedValues).toBeNull()
    expect(hook.current[0].error).toBe('Provider error')
  })

  it('sets executedValues to null when upstream node is skipped', () => {
    const { result: hook } = renderHook(() =>
      useUpstreamNodeOutputs({
        nodeId: 'selected',
        edges: [edge({ source_node_id: 'n1', target_node_id: 'selected' })],
        nodes: [node({ id: 'n1' })],
        nodeResults: [
          result({ node_id: 'n1', status: 'skipped' }),
        ],
      }),
    )
    expect(hook.current[0].status).toBe('skipped')
    expect(hook.current[0].executedValues).toBeNull()
  })

  it('resolves outputSchema from catalog for manual_trigger', () => {
    const { result: hook } = renderHook(() =>
      useUpstreamNodeOutputs({
        nodeId: 'selected',
        edges: [edge({ source_node_id: 'n1', target_node_id: 'selected' })],
        nodes: [node({ id: 'n1', config: { node_type: 'manual_trigger' } })],
        nodeResults: [],
      }),
    )
    const schema = hook.current[0].outputSchema
    expect(schema.length).toBeGreaterThan(0)
    expect(schema[0].name).toBe('params')
  })

  it('resolves outputSchema for lens node (defaults)', () => {
    const { result: hook } = renderHook(() =>
      useUpstreamNodeOutputs({
        nodeId: 'selected',
        edges: [edge({ source_node_id: 'n1', target_node_id: 'selected' })],
        nodes: [node({ id: 'n1', lens_id: 'lens-abc', config: null })],
        nodeResults: [],
      }),
    )
    const schema = hook.current[0].outputSchema
    expect(schema.some((f) => f.name === 'text')).toBe(true)
    expect(schema.some((f) => f.name === 'result')).toBe(true)
  })

  it('skips source nodes that no longer exist in nodes array', () => {
    const { result: hook } = renderHook(() =>
      useUpstreamNodeOutputs({
        nodeId: 'selected',
        edges: [
          edge({ source_node_id: 'deleted', target_node_id: 'selected' }),
          edge({ source_node_id: 'n1', target_node_id: 'selected' }),
        ],
        nodes: [node({ id: 'n1' })], // 'deleted' is absent
        nodeResults: [],
      }),
    )
    expect(hook.current).toHaveLength(1)
    expect(hook.current[0].nodeId).toBe('n1')
  })

  it('returns null status when no nodeResults provided', () => {
    const { result: hook } = renderHook(() =>
      useUpstreamNodeOutputs({
        nodeId: 'selected',
        edges: [edge({ source_node_id: 'n1', target_node_id: 'selected' })],
        nodes: [node({ id: 'n1' })],
        nodeResults: [],
      }),
    )
    expect(hook.current[0].status).toBeNull()
    expect(hook.current[0].executedValues).toBeNull()
    expect(hook.current[0].error).toBeNull()
  })

  it('uses humanised type label when node has no label', () => {
    const { result: hook } = renderHook(() =>
      useUpstreamNodeOutputs({
        nodeId: 'selected',
        edges: [edge({ source_node_id: 'n1', target_node_id: 'selected' })],
        nodes: [node({ id: 'n1', label: null, config: { node_type: 'manual_trigger' }, ordinal: 3 })],
        nodeResults: [],
      }),
    )
    expect(hook.current[0].label).toContain('Manual Trigger')
    expect(hook.current[0].label).toContain('3')
  })
})
