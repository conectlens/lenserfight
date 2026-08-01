import { validateWorkflowDocument, type WorkflowDocument } from '@lenserfight/domain/workflow-protocol'
import { describe, expect, it } from 'vitest'

import { validateWorkflowSemantics } from './semantic-validation'

function build(overrides: Record<string, unknown>): WorkflowDocument {
  const result = validateWorkflowDocument({
    protocol: 'lenserfight.workflow/v1',
    title: 'Test workflow',
    steps: [{ step: 1, kind: 'trigger', name: 'Manual Trigger' }],
    connections: [],
    ...overrides,
  })
  if (!result.value) {
    throw new Error(
      `fixture is not structurally valid: ${result.issues.map((i) => i.message).join('; ')}`,
    )
  }
  return result.value
}

const errorsOf = (document: WorkflowDocument) =>
  validateWorkflowSemantics(document).issues.filter((issue) => issue.severity === 'error')

describe('validateWorkflowSemantics', () => {
  it('accepts a single-trigger workflow', () => {
    const result = validateWorkflowSemantics(build({}))
    expect(result.ok).toBe(true)
    expect(result.resolvedSteps).toHaveLength(1)
  })

  it('rejects duplicate step numbers', () => {
    const document = build({
      steps: [
        { step: 1, kind: 'trigger', name: 'Manual Trigger' },
        { step: 1, kind: 'tool', name: 'Logger' },
      ],
    })
    expect(errorsOf(document).some((issue) => issue.message.includes('Duplicate step number'))).toBe(
      true,
    )
  })

  it('rejects a step naming a node that is not in the palette', () => {
    const document = build({
      steps: [
        { step: 1, kind: 'trigger', name: 'Manual Trigger' },
        { step: 2, kind: 'tool', name: 'Human Approval' },
      ],
    })
    const errors = errorsOf(document)
    expect(errors.some((issue) => issue.message.includes('Human Approval'))).toBe(true)
  })

  it('rejects a connection whose source step does not exist', () => {
    const document = build({
      steps: [{ step: 1, kind: 'trigger', name: 'Manual Trigger' }],
      connections: [{ from: 'step-9.payload', to: 'step-1.x' }],
    })
    expect(errorsOf(document).some((issue) => issue.message.includes('step 9'))).toBe(true)
  })

  it('rejects a self-referencing connection', () => {
    const document = build({
      steps: [{ step: 1, kind: 'trigger', name: 'Manual Trigger' }],
      connections: [{ from: 'step-1.payload', to: 'step-1.payload' }],
    })
    expect(errorsOf(document).some((issue) => issue.message.includes('cannot feed itself'))).toBe(
      true,
    )
  })

  it('rejects a backwards connection', () => {
    const document = build({
      steps: [
        { step: 1, kind: 'trigger', name: 'Manual Trigger' },
        { step: 2, kind: 'tool', name: 'Logger' },
      ],
      connections: [{ from: 'step-2.out', to: 'step-1.in' }],
    })
    expect(errorsOf(document).some((issue) => issue.message.includes('backwards'))).toBe(true)
  })

  it('rejects a lensRef that is not defined', () => {
    const document = build({
      steps: [
        { step: 1, kind: 'trigger', name: 'Manual Trigger' },
        { step: 2, kind: 'lens', name: 'Lens', lensRef: 'ghost' },
      ],
    })
    expect(errorsOf(document).some((issue) => issue.message.includes('ghost'))).toBe(true)
  })

  it('rejects lensRef on a non-lens step', () => {
    const document = build({
      lenses: [{ ref: 'a', title: 'Lens A' }],
      steps: [
        { step: 1, kind: 'trigger', name: 'Manual Trigger' },
        { step: 2, kind: 'tool', name: 'Logger', lensRef: 'a' },
      ],
    })
    expect(errorsOf(document).some((issue) => issue.message.includes('Only lens steps'))).toBe(true)
  })

  it('warns rather than fails when a lens definition is unused', () => {
    const result = validateWorkflowSemantics(
      build({ lenses: [{ ref: 'unused', title: 'Unused Lens' }] }),
    )
    expect(result.ok).toBe(true)
    expect(
      result.issues.some(
        (issue) => issue.severity === 'warning' && issue.message.includes('never used'),
      ),
    ).toBe(true)
  })

  it('warns rather than fails on an unrecognised output key', () => {
    // The catalog's declared outputs disagree with some runners, so an unknown
    // key must not block an import.
    const result = validateWorkflowSemantics(
      build({
        steps: [
          { step: 1, kind: 'trigger', name: 'Manual Trigger', outputs: ['payload'] },
          { step: 2, kind: 'tool', name: 'Logger' },
        ],
        connections: [{ from: 'step-1.notAThing', to: 'step-2.message' }],
      }),
    )
    expect(result.issues.some((issue) => issue.severity === 'warning')).toBe(true)
    expect(
      result.issues.some(
        (issue) => issue.severity === 'error' && issue.message.includes('notAThing'),
      ),
    ).toBe(false)
  })

  it('warns when a parameter is both connected and hardcoded', () => {
    const result = validateWorkflowSemantics(
      build({
        steps: [
          { step: 1, kind: 'trigger', name: 'Manual Trigger', outputs: ['payload'] },
          { step: 2, kind: 'tool', name: 'Logger', parameters: { message: 'literal' } },
        ],
        connections: [{ from: 'step-1.payload', to: 'step-2.message' }],
      }),
    )
    expect(
      result.issues.some(
        (issue) => issue.severity === 'warning' && issue.message.includes('literal is ignored'),
      ),
    ).toBe(true)
  })

  it('flags a workflow with no trigger as an error', () => {
    const document = build({
      steps: [{ step: 1, kind: 'tool', name: 'Logger' }],
    })
    expect(errorsOf(document).some((issue) => issue.message.includes('trigger'))).toBe(true)
  })

  it('reports every issue at the semantic stage', () => {
    const document = build({
      steps: [
        { step: 1, kind: 'trigger', name: 'Manual Trigger' },
        { step: 1, kind: 'tool', name: 'Logger' },
      ],
    })
    const result = validateWorkflowSemantics(document)
    expect(result.issues.every((issue) => issue.stage === 'semantic')).toBe(true)
  })
})
