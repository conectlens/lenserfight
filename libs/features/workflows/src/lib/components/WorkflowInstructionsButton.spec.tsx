import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const { copyTextToClipboard } = vi.hoisted(() => ({
  copyTextToClipboard: vi.fn(),
}))

vi.mock('@lenserfight/utils/text', () => ({
  copyTextToClipboard,
}))

import {
  WORKFLOW_CREATION_INSTRUCTIONS,
  WorkflowInstructionsButton,
} from './WorkflowInstructionsButton'

describe('WorkflowInstructionsButton', () => {
  beforeEach(() => {
    copyTextToClipboard.mockReset()
    copyTextToClipboard.mockResolvedValue(undefined)
  })

  it('copies the workflow planning contract and confirms success', async () => {
    render(<WorkflowInstructionsButton />)

    const button = screen.getByRole('button', { name: 'Workflow Instructions' })
    expect(button.getAttribute('type')).toBe('button')
    expect(button.getAttribute('title')).toContain('AI assistant')
    fireEvent.click(button)

    await waitFor(() => {
      expect(copyTextToClipboard).toHaveBeenCalledWith(WORKFLOW_CREATION_INSTRUCTIONS)
    })
    expect(screen.getByText('Instructions copied')).toBeTruthy()
  })

  it('keeps the original accessible label when clipboard access fails', async () => {
    copyTextToClipboard.mockRejectedValue(new Error('clipboard unavailable'))
    render(<WorkflowInstructionsButton />)

    fireEvent.click(screen.getByRole('button', { name: 'Workflow Instructions' }))

    await waitFor(() => {
      expect(copyTextToClipboard).toHaveBeenCalled()
    })
    expect(screen.getByRole('button', { name: 'Workflow Instructions' })).toBeTruthy()
  })

  it('constrains AI suggestions to usable workflow building blocks', () => {
    expect(WORKFLOW_CREATION_INSTRUCTIONS).toContain('exactly one trigger')
    expect(WORKFLOW_CREATION_INSTRUCTIONS).toContain('Use a Lens for AI reasoning')
    expect(WORKFLOW_CREATION_INSTRUCTIONS).toContain('Use a tool node for deterministic work')
    expect(WORKFLOW_CREATION_INSTRUCTIONS).toContain('current workflow palette')
    expect(WORKFLOW_CREATION_INSTRUCTIONS).toContain('Do not invent Lens IDs')
    expect(WORKFLOW_CREATION_INSTRUCTIONS).toContain('"kind": "trigger | lens | tool"')
  })
})
