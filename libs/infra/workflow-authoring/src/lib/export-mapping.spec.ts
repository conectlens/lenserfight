import {
  hasBlockingIssue,
  readWorkflowDocument,
  writeWorkflowDocument,
  type WorkflowDocumentFormat,
} from '@lenserfight/domain/workflow-protocol'
import { describe, expect, it } from 'vitest'

import { buildWorkflowDocument, type ExportLensSource } from './export-mapping'
import { validateWorkflowSemantics } from './semantic-validation'

import type { WorkflowEdgeRecord, WorkflowNodeRecord } from '@lenserfight/data/repositories'

const WORKFLOW_ID = 'workflow-1'

const trigger: WorkflowNodeRecord = {
  id: 'node-trigger',
  workflow_id: WORKFLOW_ID,
  lens_id: null,
  ordinal: 0,
  position_x: 0,
  position_y: 0,
  created_at: '2026-01-01T00:00:00Z',
  config: { node_type: 'manual_trigger' },
}

const lensNode: WorkflowNodeRecord = {
  id: 'node-lens',
  workflow_id: WORKFLOW_ID,
  lens_id: 'lens-1',
  label: 'Digest Lens',
  ordinal: 1,
  position_x: 200,
  position_y: 0,
  created_at: '2026-01-01T00:00:00Z',
  config: {
    node_type: 'lens',
    // Non-portable keys the mapping must drop, alongside a real authored value.
    param_overrides: { Topic: 'AI safety', model_id: 'gpt-5', funding_source: 'platform_credit' },
  },
}

const edge: WorkflowEdgeRecord = {
  id: 'edge-1',
  workflow_id: WORKFLOW_ID,
  source_node_id: 'node-trigger',
  target_node_id: 'node-lens',
  source_output_key: 'rootInputs',
  target_param_label: 'Topic',
}

const lensesById: ReadonlyMap<string, ExportLensSource> = new Map([
  [
    'lens-1',
    {
      id: 'lens-1',
      title: 'Digest Lens',
      instructions: 'Summarise [[Topic]] in three bullets.',
      parameterLabels: ['Topic'],
    },
  ],
])

const options = {
  workflow: { title: 'Daily digest', description: 'Summarise the day.' },
  nodes: [trigger, lensNode],
  edges: [edge],
  lensesById,
}

describe('buildWorkflowDocument', () => {
  it('numbers steps from node ordinal and keeps connections addressable', () => {
    const document = buildWorkflowDocument(options)

    expect(document.steps.map((step) => step.step)).toEqual([1, 2])
    expect(document.steps.map((step) => step.nodeType)).toEqual(['manual_trigger', 'lens'])
    expect(document.connections).toEqual([{ from: 'step-1.rootInputs', to: 'step-2.Topic' }])
  })

  it('drops non-portable config and keeps authored parameters', () => {
    const document = buildWorkflowDocument(options)

    expect(document.steps[1]?.parameters).toEqual({ Topic: 'AI safety' })
  })

  it('defines every lens a step references', () => {
    const document = buildWorkflowDocument(options)
    const refs = new Set((document.lenses ?? []).map((lens) => lens.ref))

    for (const step of document.steps) {
      if (!step.lensRef) continue
      expect(refs.has(step.lensRef)).toBe(true)
    }
  })

  it('still defines a lens when only the title is known', () => {
    const document = buildWorkflowDocument({
      ...options,
      lensesById: new Map([['lens-1', { id: 'lens-1', title: 'Digest Lens' }]]),
    })

    expect(document.lenses).toEqual([{ ref: 'digest-lens', title: 'Digest Lens' }])
    expect(document.steps[1]?.lensRef).toBe('digest-lens')
  })

  it('leaves a dangling lensRef when the lens is not supplied', () => {
    // Guards the reason the builder always passes `lensesById`: without a
    // definition the ref points at nothing and semantic validation rejects it.
    const document = buildWorkflowDocument({ ...options, lensesById: undefined })

    expect(document.lenses).toBeUndefined()
    expect(document.steps[1]?.lensRef).toBe('digest-lens')
    expect(hasBlockingIssue(validateWorkflowSemantics(document).issues)).toBe(true)
  })
})

describe('export round trip', () => {
  const formats: WorkflowDocumentFormat[] = ['json', 'yaml']

  for (const format of formats) {
    it(`re-reads its own ${format} output with steps and connections intact`, () => {
      const document = buildWorkflowDocument(options)
      const result = readWorkflowDocument(writeWorkflowDocument(document, format), { format })

      expect(result.ok).toBe(true)
      expect(result.value?.steps).toEqual(document.steps)
      expect(result.value?.connections).toEqual(document.connections)
      expect(result.value?.lenses).toEqual(document.lenses)
      expect(result.value?.title).toBe('Daily digest')
    })
  }

  it('auto-detects the format when none is given', () => {
    const document = buildWorkflowDocument(options)
    const result = readWorkflowDocument(writeWorkflowDocument(document, 'json'))

    expect(result.format).toBe('json')
    expect(result.ok).toBe(true)
  })

  it('produces a document the importer accepts', () => {
    const document = buildWorkflowDocument(options)
    const reread = readWorkflowDocument(writeWorkflowDocument(document, 'json'))
    if (!reread.value) throw new Error('the exported document did not read back')

    const semantics = validateWorkflowSemantics(reread.value)

    expect(semantics.issues.filter((issue) => issue.severity === 'error')).toEqual([])
    expect(semantics.ok).toBe(true)
  })
})
