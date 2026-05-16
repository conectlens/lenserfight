import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import React from 'react'

import { WorkflowExpressionInput } from './WorkflowExpressionInput'

function makeDragEvent(text: string, outputType?: string): Partial<DragEvent> {
  const data: Record<string, string> = { 'text/plain': text }
  if (outputType) data['application/x-workflow-output-type'] = outputType
  return {
    dataTransfer: {
      types: Object.keys(data),
      getData: (key: string) => data[key] ?? '',
      setData: vi.fn(),
      dropEffect: 'copy',
    } as unknown as DataTransfer,
    preventDefault: vi.fn(),
    stopPropagation: vi.fn(),
  } as Partial<DragEvent>
}

describe('WorkflowExpressionInput', () => {
  // ── Static values ──────────────────────────────────────────────────────────

  it('renders an input with the provided value', () => {
    render(
      <WorkflowExpressionInput value="hello" onChange={vi.fn()} fieldType="text" />,
    )
    const input = screen.getByRole('textbox')
    expect((input as HTMLInputElement).value).toBe('hello')
  })

  it('calls onChange when the user types', () => {
    const onChange = vi.fn()
    render(<WorkflowExpressionInput value="" onChange={onChange} fieldType="text" />)
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'new value' } })
    expect(onChange).toHaveBeenCalledWith('new value')
  })

  it('does not show expression chip when value has no refs', () => {
    render(<WorkflowExpressionInput value="static text" onChange={vi.fn()} fieldType="text" />)
    expect(screen.queryByTestId('expression-chip')).toBeNull()
  })

  // ── Expression indicator ───────────────────────────────────────────────────

  it('shows expression chip when value contains [[nodeId.field]]', () => {
    render(
      <WorkflowExpressionInput
        value="Use [[nodeA.text]] here"
        onChange={vi.fn()}
        fieldType="text"
      />,
    )
    // Look for the "1" count next to the Braces icon
    const chip = document.querySelector('.bg-deep-lens-navy-400\\/10, .bg-primary-yellow-500\\/10')
    expect(chip).not.toBeNull()
  })

  // ── Drop handling ──────────────────────────────────────────────────────────

  it('replaces value on drop for single-line input', () => {
    const onChange = vi.fn()
    render(
      <WorkflowExpressionInput value="existing" onChange={onChange} fieldType="text" />,
    )
    const container = screen.getByRole('textbox').parentElement!

    fireEvent.dragOver(container, {
      dataTransfer: { types: ['text/plain'], getData: () => '[[n1.text]]', dropEffect: 'copy' },
    })
    fireEvent.drop(container, {
      dataTransfer: {
        types: ['text/plain'],
        getData: (key: string) => key === 'text/plain' ? '[[n1.text]]' : '',
      },
    })

    expect(onChange).toHaveBeenCalledWith('[[n1.text]]')
  })

  it('does not accept drop when dataTransfer lacks text/plain', () => {
    const onChange = vi.fn()
    render(<WorkflowExpressionInput value="existing" onChange={onChange} fieldType="text" />)
    const container = screen.getByRole('textbox').parentElement!

    fireEvent.drop(container, {
      dataTransfer: {
        types: ['application/reactflow'],
        getData: vi.fn(() => ''),
      },
    })

    expect(onChange).not.toHaveBeenCalled()
  })

  it('shows warning compatibility indicator after drop with type mismatch', () => {
    const onChange = vi.fn()
    render(<WorkflowExpressionInput value="" onChange={onChange} fieldType="text" />)
    const container = screen.getByRole('textbox').parentElement!

    fireEvent.dragOver(container, {
      dataTransfer: { types: ['text/plain'], getData: () => '[[n1.text]]', dropEffect: 'copy' },
    })
    fireEvent.drop(container, {
      dataTransfer: {
        types: ['text/plain', 'application/x-workflow-output-type'],
        getData: (key: string) => key === 'text/plain' ? '[[n1.text]]' : 'json',
      },
    })

    expect(screen.getByText(/type mismatch/i)).toBeDefined()
  })

  it('shows incompatible indicator when embedding → text', () => {
    const onChange = vi.fn()
    render(<WorkflowExpressionInput value="" onChange={onChange} fieldType="text" />)
    const container = screen.getByRole('textbox').parentElement!

    fireEvent.dragOver(container, {
      dataTransfer: { types: ['text/plain'], getData: () => '[[n1.vec]]', dropEffect: 'copy' },
    })
    fireEvent.drop(container, {
      dataTransfer: {
        types: ['text/plain', 'application/x-workflow-output-type'],
        getData: (key: string) => key === 'text/plain' ? '[[n1.vec]]' : 'embedding',
      },
    })

    expect(screen.getByText(/incompatible/i)).toBeDefined()
  })

  // ── Multiline ──────────────────────────────────────────────────────────────

  it('renders textarea when multiline is true', () => {
    render(
      <WorkflowExpressionInput value="line1\nline2" onChange={vi.fn()} fieldType="textarea" multiline />,
    )
    expect(screen.getByRole('textbox').tagName).toBe('TEXTAREA')
  })

  // ── Backward compatibility ────────────────────────────────────────────────

  it('static value with no expression works unchanged', () => {
    const onChange = vi.fn()
    render(<WorkflowExpressionInput value="static" onChange={onChange} fieldType="text" />)
    expect(screen.getByRole('textbox')).toBeDefined()
    expect(screen.queryByText(/type mismatch/i)).toBeNull()
  })
})
