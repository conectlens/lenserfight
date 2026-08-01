import { describe, expect, it, vi } from 'vitest'

import { importWorkflow, previewWorkflowImport } from './workflow-import.service'

import type { WorkflowImportDeps } from './workflow-import.service'

const VALID = {
  protocol: 'lenserfight.workflow/v1',
  title: 'Digest workflow',
  description: 'Summarise the week.',
  steps: [
    { step: 1, kind: 'trigger', name: 'Manual Trigger', outputs: ['payload'] },
    {
      step: 2,
      kind: 'lens',
      name: 'Weekly Digest',
      lensRef: 'weekly-digest',
      parameters: { Tone: 'concise' },
    },
  ],
  lenses: [
    {
      ref: 'weekly-digest',
      title: 'Weekly Digest',
      instructions:
        'Write a concise weekly digest of [[Topic]] using a [[Tone]] tone for the arena audience.',
      parameters: [{ label: 'Topic' }, { label: 'Tone' }],
    },
  ],
  connections: [{ from: 'step-1.payload', to: 'step-2.Topic' }],
}

const validText = JSON.stringify(VALID)

function makeDeps(overrides: Partial<WorkflowImportDeps> = {}): WorkflowImportDeps {
  return {
    listOwnedLenses: vi.fn().mockResolvedValue([]),
    createLens: vi.fn().mockResolvedValue({ id: 'lens-new', title: 'Weekly Digest' }),
    textToolId: 'tool-text',
    createWorkflow: vi.fn().mockResolvedValue({ id: 'wf-1', title: 'Digest workflow' }),
    upsertNodes: vi.fn().mockResolvedValue([{ id: 'node-1' }, { id: 'node-2' }]),
    upsertEdges: vi.fn().mockResolvedValue([]),
    upsertSchedule: vi.fn().mockResolvedValue(null),
    deleteWorkflow: vi.fn().mockResolvedValue(undefined),
    deleteLens: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  }
}

describe('previewWorkflowImport', () => {
  it('describes a valid document without writing anything', () => {
    const preview = previewWorkflowImport(validText)
    expect(preview.ok).toBe(true)
    expect(preview.steps).toHaveLength(2)
    expect(preview.connectionCount).toBe(1)
    expect(preview.lensDefinitionCount).toBe(1)
  })

  it('reports parse failures without a document', () => {
    const preview = previewWorkflowImport('{ broken')
    expect(preview.ok).toBe(false)
    expect(preview.document).toBeNull()
    expect(preview.issues[0]?.stage).toBe('parse')
  })

  it('accepts the same workflow written as YAML', () => {
    const yaml = [
      'protocol: lenserfight.workflow/v1',
      'title: Digest workflow',
      'steps:',
      '  - step: 1',
      '    kind: trigger',
      '    name: Manual Trigger',
      '    outputs: [payload]',
      'connections: []',
    ].join('\n')
    expect(previewWorkflowImport(yaml).ok).toBe(true)
  })
})

describe('importWorkflow', () => {
  it('creates workflow, nodes, and edges for a valid document', async () => {
    const deps = makeDeps()
    const result = await importWorkflow(validText, deps)

    expect(result.ok).toBe(true)
    expect(result.workflowId).toBe('wf-1')
    expect(result.nodeCount).toBe(2)
    expect(result.edgeCount).toBe(1)
    expect(deps.createWorkflow).toHaveBeenCalledTimes(1)
    expect(deps.upsertNodes).toHaveBeenCalledTimes(1)
    expect(deps.upsertEdges).toHaveBeenCalledTimes(1)
  })

  it('writes nothing when the document is invalid', async () => {
    const deps = makeDeps()
    const result = await importWorkflow('{ broken', deps)

    expect(result.ok).toBe(false)
    expect(deps.createWorkflow).not.toHaveBeenCalled()
    expect(deps.createLens).not.toHaveBeenCalled()
    expect(result.rolledBack).toBe(false)
  })

  it('never sends visibility from the document', async () => {
    const deps = makeDeps()
    await importWorkflow(validText, deps, { visibility: 'private' })

    expect(deps.createWorkflow).toHaveBeenCalledWith(
      expect.objectContaining({ visibility: 'private' }),
    )
  })

  it('reuses a compatible lens the user already owns', async () => {
    const deps = makeDeps({
      listOwnedLenses: vi.fn().mockResolvedValue([
        { id: 'lens-existing', title: 'Weekly Digest', parameterLabels: ['Topic', 'Tone'] },
      ]),
    })
    const result = await importWorkflow(validText, deps)

    expect(deps.createLens).not.toHaveBeenCalled()
    expect(result.lenses[0]).toMatchObject({ lensId: 'lens-existing', action: 'reused' })
  })

  it('creates a separate lens rather than overwriting an incompatible same-title lens', async () => {
    const deps = makeDeps({
      listOwnedLenses: vi
        .fn()
        .mockResolvedValue([
          { id: 'lens-existing', title: 'Weekly Digest', parameterLabels: ['SomethingElse'] },
        ]),
    })
    const result = await importWorkflow(validText, deps)

    expect(deps.createLens).toHaveBeenCalledTimes(1)
    expect(result.lenses[0]).toMatchObject({ action: 'created' })
    expect(result.warnings.some((warning) => warning.includes('not modified'))).toBe(true)
  })

  it('rolls back the workflow and created lenses when node creation fails', async () => {
    const deps = makeDeps({
      upsertNodes: vi.fn().mockRejectedValue(new Error('node insert failed')),
    })
    const result = await importWorkflow(validText, deps)

    expect(result.ok).toBe(false)
    expect(result.rolledBack).toBe(true)
    expect(result.workflowId).toBeNull()
    expect(deps.deleteWorkflow).toHaveBeenCalledWith('wf-1')
    expect(deps.deleteLens).toHaveBeenCalledWith('lens-new')
  })

  it('does not delete a reused lens during rollback', async () => {
    const deps = makeDeps({
      listOwnedLenses: vi.fn().mockResolvedValue([
        { id: 'lens-existing', title: 'Weekly Digest', parameterLabels: ['Topic', 'Tone'] },
      ]),
      upsertNodes: vi.fn().mockRejectedValue(new Error('boom')),
    })
    await importWorkflow(validText, deps)

    expect(deps.deleteLens).not.toHaveBeenCalled()
    expect(deps.deleteWorkflow).toHaveBeenCalledWith('wf-1')
  })

  it('reports a persistence-stage error when saving fails', async () => {
    const deps = makeDeps({
      createWorkflow: vi.fn().mockRejectedValue(new Error('permission denied')),
    })
    const result = await importWorkflow(validText, deps)

    expect(result.issues.some((issue) => issue.stage === 'persistence')).toBe(true)
    expect(result.issues.some((issue) => issue.message.includes('permission denied'))).toBe(true)
  })

  it('surfaces a warning when cleanup itself fails', async () => {
    const deps = makeDeps({
      upsertNodes: vi.fn().mockRejectedValue(new Error('boom')),
      deleteWorkflow: vi.fn().mockRejectedValue(new Error('cleanup failed')),
    })
    const result = await importWorkflow(validText, deps)

    expect(result.warnings.some((warning) => warning.includes('Delete it manually'))).toBe(true)
  })

  it('fails when fewer nodes come back than were sent', async () => {
    const deps = makeDeps({ upsertNodes: vi.fn().mockResolvedValue([{ id: 'node-1' }]) })
    const result = await importWorkflow(validText, deps)

    expect(result.ok).toBe(false)
    expect(result.rolledBack).toBe(true)
  })

  describe('schedules', () => {
    const scheduled = JSON.stringify({
      ...VALID,
      schedule: { cron: '0 9 * * 1', isActive: true },
    })

    it('creates an imported schedule paused by default', async () => {
      const deps = makeDeps()
      const result = await importWorkflow(scheduled, deps)

      expect(deps.upsertSchedule).toHaveBeenCalledWith(
        expect.objectContaining({ cron_expr: '0 9 * * 1', is_active: false }),
      )
      expect(result.warnings.some((warning) => warning.includes('paused'))).toBe(true)
    })

    it('activates the schedule only when the user opts in', async () => {
      const deps = makeDeps()
      await importWorkflow(scheduled, deps, { activateSchedule: true })

      expect(deps.upsertSchedule).toHaveBeenCalledWith(
        expect.objectContaining({ is_active: true }),
      )
    })

    it('will not activate a schedule the document marked inactive', async () => {
      const deps = makeDeps()
      await importWorkflow(
        JSON.stringify({ ...VALID, schedule: { cron: '0 9 * * 1', isActive: false } }),
        deps,
        { activateSchedule: true },
      )

      expect(deps.upsertSchedule).toHaveBeenCalledWith(
        expect.objectContaining({ is_active: false }),
      )
    })
  })
})
