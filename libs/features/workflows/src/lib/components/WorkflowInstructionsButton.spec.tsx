import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const { copyTextToClipboard } = vi.hoisted(() => ({
  copyTextToClipboard: vi.fn(),
}))

vi.mock('@lenserfight/utils/text', () => ({
  copyTextToClipboard,
}))

import { buildWorkflowInstructionsText } from '../utils/workflow-instructions'

import { WorkflowInstructionsButton } from './WorkflowInstructionsButton'

describe('WorkflowInstructionsButton', () => {
  beforeEach(() => {
    copyTextToClipboard.mockReset()
    copyTextToClipboard.mockResolvedValue(undefined)
  })

  it('copies the generated instructions and confirms success', async () => {
    render(<WorkflowInstructionsButton />)

    const button = screen.getByRole('button', { name: 'Workflow Instructions' })
    expect(button.getAttribute('type')).toBe('button')
    expect(button.getAttribute('title')).toContain('AI assistant')
    fireEvent.click(button)

    await waitFor(() => {
      expect(copyTextToClipboard).toHaveBeenCalledWith(buildWorkflowInstructionsText('json'))
    })
    expect(screen.getByText('Instructions copied')).toBeTruthy()
  })

  it('copies the YAML variant when asked', async () => {
    render(<WorkflowInstructionsButton format="yaml" />)

    fireEvent.click(screen.getByRole('button', { name: 'Workflow Instructions' }))

    await waitFor(() => {
      expect(copyTextToClipboard).toHaveBeenCalledWith(buildWorkflowInstructionsText('yaml'))
    })
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
})
