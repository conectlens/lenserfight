import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const { copyTextToClipboard } = vi.hoisted(() => ({
  copyTextToClipboard: vi.fn(),
}))

vi.mock('@lenserfight/utils/text', () => ({
  copyTextToClipboard,
}))

import { readWorkflowDocument } from '@lenserfight/domain/workflow-protocol'

import {
  WorkflowDocumentCopyButton,
  type WorkflowDocumentCopyButtonProps,
} from './WorkflowDocumentCopyButton'

import type { WorkflowEdgeRecord, WorkflowNodeRecord } from '@lenserfight/data/repositories'

const WORKFLOW_ID = 'workflow-1'

const nodes: WorkflowNodeRecord[] = [
  {
    id: 'node-trigger',
    workflow_id: WORKFLOW_ID,
    lens_id: null,
    ordinal: 0,
    position_x: 0,
    position_y: 0,
    created_at: '2026-01-01T00:00:00Z',
    config: { node_type: 'manual_trigger' },
  },
  {
    id: 'node-lens',
    workflow_id: WORKFLOW_ID,
    lens_id: 'lens-1',
    label: 'Digest Lens',
    ordinal: 1,
    position_x: 200,
    position_y: 0,
    created_at: '2026-01-01T00:00:00Z',
    config: { node_type: 'lens', param_overrides: { Topic: 'AI safety', model_id: 'gpt-5' } },
  },
]

const edges: WorkflowEdgeRecord[] = [
  {
    id: 'edge-1',
    workflow_id: WORKFLOW_ID,
    source_node_id: 'node-trigger',
    target_node_id: 'node-lens',
    source_output_key: 'rootInputs',
    target_param_label: 'Topic',
  },
]

const workflow = { title: 'Daily digest', description: 'Summarise the day.' }

function renderButton(overrides: Partial<WorkflowDocumentCopyButtonProps> = {}) {
  return render(
    <WorkflowDocumentCopyButton workflow={workflow} nodes={nodes} edges={edges} {...overrides} />,
  )
}

async function copiedText(): Promise<string> {
  await waitFor(() => {
    expect(copyTextToClipboard).toHaveBeenCalled()
  })
  return copyTextToClipboard.mock.calls[0]?.[0] as string
}

describe('WorkflowDocumentCopyButton', () => {
  beforeEach(() => {
    copyTextToClipboard.mockReset()
    copyTextToClipboard.mockResolvedValue(undefined)
  })

  it('copies a JSON document the importer can read back', async () => {
    renderButton()

    fireEvent.click(screen.getByRole('button', { name: 'Copy as JSON workflow document' }))
    const result = readWorkflowDocument(await copiedText())

    expect(result.format).toBe('json')
    expect(result.ok).toBe(true)
    expect(result.value?.title).toBe('Daily digest')
    expect(result.value?.steps.map((step) => step.nodeType)).toEqual(['manual_trigger', 'lens'])
    expect(result.value?.connections).toEqual([{ from: 'step-1.rootInputs', to: 'step-2.Topic' }])
  })

  it('copies YAML when the YAML action is used', async () => {
    renderButton()

    fireEvent.click(screen.getByRole('button', { name: 'Copy as YAML workflow document' }))
    const result = readWorkflowDocument(await copiedText())

    expect(result.format).toBe('yaml')
    expect(result.ok).toBe(true)
  })

  it('defines every lens a step references', async () => {
    renderButton()

    fireEvent.click(screen.getByRole('button', { name: 'Copy as JSON workflow document' }))
    const parsed = readWorkflowDocument(await copiedText()).value

    expect(parsed?.lenses).toEqual([{ ref: 'digest-lens', title: 'Digest Lens' }])
    expect(parsed?.steps[1]?.lensRef).toBe('digest-lens')
  })

  it('omits internal identifiers and funding config', async () => {
    renderButton()

    fireEvent.click(screen.getByRole('button', { name: 'Copy as JSON workflow document' }))
    const text = await copiedText()

    expect(text).not.toContain('node-lens')
    expect(text).not.toContain('lens-1')
    expect(text).not.toContain('model_id')
  })

  it('confirms the copy', async () => {
    renderButton()

    fireEvent.click(screen.getByRole('button', { name: 'Copy as JSON workflow document' }))

    await waitFor(() => {
      expect(screen.getByText('JSON workflow document copied')).toBeTruthy()
    })
  })

  it('stays silent when the clipboard is unavailable', async () => {
    copyTextToClipboard.mockRejectedValue(new Error('clipboard unavailable'))
    renderButton()

    fireEvent.click(screen.getByRole('button', { name: 'Copy as JSON workflow document' }))

    await waitFor(() => {
      expect(copyTextToClipboard).toHaveBeenCalled()
    })
    expect(screen.queryByText('JSON workflow document copied')).toBeNull()
  })

  it('disables copying an empty canvas', () => {
    renderButton({ nodes: [], edges: [] })

    const button = screen.getByRole('button', { name: 'Copy as JSON workflow document' })
    expect((button as HTMLButtonElement).disabled).toBe(true)
  })
})
