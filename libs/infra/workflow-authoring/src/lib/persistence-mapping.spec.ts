import { validateWorkflowDocument, type WorkflowDocument } from '@lenserfight/domain/workflow-protocol'
import { describe, expect, it } from 'vitest'

import {
  buildWorkflowEdgeInputs,
  buildWorkflowNodeInputs,
  serializeParameterValue,
} from './persistence-mapping'
import { validateWorkflowSemantics } from './semantic-validation'

function documentOf(overrides: Record<string, unknown>): WorkflowDocument {
  const result = validateWorkflowDocument({
    protocol: 'lenserfight.workflow/v1',
    title: 'Test workflow',
    steps: [{ step: 1, kind: 'trigger', name: 'Manual Trigger' }],
    connections: [],
    ...overrides,
  })
  if (!result.value) throw new Error('fixture is not structurally valid')
  return result.value
}

describe('serializeParameterValue', () => {
  it('passes strings through unchanged', () => {
    expect(serializeParameterValue('hello')).toBe('hello')
  })

  it('stringifies scalars', () => {
    expect(serializeParameterValue(42)).toBe('42')
    expect(serializeParameterValue(true)).toBe('true')
  })

  it('JSON-encodes structured values', () => {
    expect(serializeParameterValue({ a: 1 })).toBe('{"a":1}')
    expect(serializeParameterValue([1, 2])).toBe('[1,2]')
  })

  it('maps null and undefined to empty string', () => {
    expect(serializeParameterValue(null)).toBe('')
    expect(serializeParameterValue(undefined)).toBe('')
  })
})

describe('buildWorkflowNodeInputs', () => {
  const withTwoSteps = documentOf({
    steps: [
      { step: 1, kind: 'trigger', name: 'Manual Trigger' },
      { step: 2, kind: 'tool', name: 'Logger', parameters: { message: 'hi' } },
    ],
    connections: [{ from: 'step-1.rootInputs', to: 'step-2.message' }],
  })

  const resolvedOf = (document: WorkflowDocument) => {
    const semantics = validateWorkflowSemantics(document)
    if (!semantics.resolvedSteps) throw new Error('steps did not resolve')
    return semantics.resolvedSteps
  }

  it('emits one node per step in step order', () => {
    const plan = buildWorkflowNodeInputs(withTwoSteps, resolvedOf(withTwoSteps), {
      lensIdByStep: new Map(),
    })
    expect(plan.inputs).toHaveLength(2)
    expect(plan.inputs.map((input) => input.ordinal)).toEqual([0, 1])
    expect(plan.nodeKeys).toEqual(['step-1', 'step-2'])
  })

  it('stamps the resolved node type into config', () => {
    const plan = buildWorkflowNodeInputs(withTwoSteps, resolvedOf(withTwoSteps), {
      lensIdByStep: new Map(),
    })
    expect(plan.inputs[0]?.config?.['node_type']).toBe('manual_trigger')
  })

  it('prefixes descriptor parameters so runners receive them', () => {
    const plan = buildWorkflowNodeInputs(withTwoSteps, resolvedOf(withTwoSteps), {
      lensIdByStep: new Map(),
    })
    const overrides = plan.inputs[1]?.config?.['param_overrides'] as Record<string, string>
    expect(Object.keys(overrides).every((key) => key.startsWith('__'))).toBe(true)
  })

  it('leaves lens parameters unprefixed and binds the lens id', () => {
    const document = documentOf({
      lenses: [{ ref: 'a', title: 'Digest Lens' }],
      steps: [
        { step: 1, kind: 'trigger', name: 'Manual Trigger' },
        { step: 2, kind: 'lens', name: 'Lens', lensRef: 'a', parameters: { Tone: 'concise' } },
      ],
    })
    const plan = buildWorkflowNodeInputs(document, resolvedOf(document), {
      lensIdByStep: new Map([[2, 'lens-123']]),
    })

    expect(plan.inputs[1]?.lens_id).toBe('lens-123')
    expect(plan.inputs[1]?.config?.['param_overrides']).toEqual({ Tone: 'concise' })
  })

  it('leaves lens_id null for non-lens nodes', () => {
    const plan = buildWorkflowNodeInputs(withTwoSteps, resolvedOf(withTwoSteps), {
      lensIdByStep: new Map(),
    })
    expect(plan.inputs[0]?.lens_id).toBeNull()
  })

  it('gives connected steps distinct positions', () => {
    const plan = buildWorkflowNodeInputs(withTwoSteps, resolvedOf(withTwoSteps), {
      lensIdByStep: new Map(),
    })
    expect(plan.inputs[0]?.position_x).not.toBe(plan.inputs[1]?.position_x)
  })

  it('drops empty parameter values instead of storing blanks', () => {
    const document = documentOf({
      steps: [
        { step: 1, kind: 'trigger', name: 'Manual Trigger' },
        { step: 2, kind: 'tool', name: 'Logger', parameters: { message: '', level: 'info' } },
      ],
    })
    const plan = buildWorkflowNodeInputs(document, resolvedOf(document), {
      lensIdByStep: new Map(),
    })
    const overrides = plan.inputs[1]?.config?.['param_overrides'] as Record<string, string>
    expect(Object.keys(overrides)).not.toContain('__message')
  })
})

describe('buildWorkflowEdgeInputs', () => {
  const document = documentOf({
    steps: [
      { step: 1, kind: 'trigger', name: 'Manual Trigger' },
      { step: 2, kind: 'tool', name: 'Logger' },
    ],
    connections: [{ from: 'step-1.rootInputs', to: 'step-2.message' }],
  })

  it('maps step keys onto persisted node ids', () => {
    const edges = buildWorkflowEdgeInputs(document, {
      nodeIdByKey: new Map([
        ['step-1', 'node-a'],
        ['step-2', 'node-b'],
      ]),
    })
    expect(edges).toEqual([
      {
        source_node_id: 'node-a',
        target_node_id: 'node-b',
        source_output_key: 'rootInputs',
        target_param_label: 'message',
      },
    ])
  })

  it('skips connections whose nodes are missing rather than sending dangling ids', () => {
    const edges = buildWorkflowEdgeInputs(document, {
      nodeIdByKey: new Map([['step-1', 'node-a']]),
    })
    expect(edges).toEqual([])
  })
})
