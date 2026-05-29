import { render, screen, fireEvent, act } from '@testing-library/react'
import React from 'react'
import { vi, describe, it, expect, beforeEach } from 'vitest'

// Stub UI package to avoid data/repositories circular SSR init issue
vi.mock('@lenserfight/ui/components', () => ({
  Button: ({ children, onClick, onMouseDown, 'aria-label': ariaLabel, title, ...rest }: React.ButtonHTMLAttributes<HTMLButtonElement> & { children?: React.ReactNode }) =>
    React.createElement('button', { onClick, onMouseDown, 'aria-label': ariaLabel, title, ...rest }, children),
  Tooltip: ({ children }: { children: React.ReactNode }) => children,
  MarkdownRenderer: ({ content }: { content: string }) => React.createElement('div', { 'data-testid': 'md' }, content),
}))

vi.mock('@lenserfight/ui/overlays', () => ({
  Drawer: ({ open, title, children, onClose }: { open: boolean; title?: string; children: React.ReactNode; onClose?: () => void }) =>
    open
      ? React.createElement('div', { 'data-testid': 'docs-panel', role: 'dialog' }, [
          React.createElement('h2', { key: 'title' }, title),
          React.createElement('button', { key: 'close', 'aria-label': 'Close drawer', onClick: onClose }, 'x'),
          React.createElement('div', { key: 'body' }, children),
        ])
      : null,
}))

vi.mock('@lenserfight/shared/i18n-locale', () => ({
  useLocale: vi.fn(() => ({ locale: 'en' })),
}))

vi.mock('@lenserfight/infra/execution', () => ({
  getWorkflowNodeCatalogEntry: (type: string) => {
    if (type === 'manual_trigger') {
      return {
        displayName: 'Manual Trigger',
        description: 'Starts a workflow manually.',
        category: 'trigger',
        inputs: [],
        outputs: [{ name: 'payload', type: 'json', description: 'Trigger payload' }],
        docsPath: '/reference/workflows/nodes/trigger#manual-trigger',
      }
    }
    if (type === 'unknown_node') return undefined
    return undefined
  },
}))

import { WorkflowNodeDocsButton } from './WorkflowNodeDocsButton'

describe('WorkflowNodeDocsButton', () => {
  beforeEach(() => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response('', { status: 404 }),
    )
  })

  it('renders null when catalog entry is not found', () => {
    const { container } = render(<WorkflowNodeDocsButton nodeType="unknown_node" />)
    expect(container.firstChild).toBeNull()
  })

  it('renders a BookOpen button when a catalog entry exists', () => {
    render(<WorkflowNodeDocsButton nodeType="manual_trigger" />)
    expect(screen.getByRole('button', { name: /View Manual Trigger documentation/i })).toBeDefined()
  })

  it('has correct aria-label', () => {
    render(<WorkflowNodeDocsButton nodeType="manual_trigger" />)
    const button = screen.getByRole('button', { name: /View Manual Trigger documentation/i })
    expect(button.getAttribute('aria-label')).toBe('View Manual Trigger documentation')
  })

  it('does not mount the docs panel before being clicked', () => {
    render(<WorkflowNodeDocsButton nodeType="manual_trigger" />)
    expect(screen.queryByTestId('docs-panel')).toBeNull()
  })

  it('opens the inline docs panel on click instead of a new tab', async () => {
    const openSpy = vi.spyOn(window, 'open').mockImplementation(() => null)
    render(<WorkflowNodeDocsButton nodeType="manual_trigger" />)
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /View Manual Trigger documentation/i }))
    })
    expect(screen.getByTestId('docs-panel')).toBeDefined()
    expect(openSpy).not.toHaveBeenCalled()
  })

  it('closes the panel when the panel close button is clicked', async () => {
    render(<WorkflowNodeDocsButton nodeType="manual_trigger" />)
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /View Manual Trigger documentation/i }))
    })
    expect(screen.getByTestId('docs-panel')).toBeDefined()
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /Close drawer/i }))
    })
    expect(screen.queryByTestId('docs-panel')).toBeNull()
  })

  it('stops click event propagation', () => {
    const parentClickHandler = vi.fn()
    render(
      <div onClick={parentClickHandler}>
        <WorkflowNodeDocsButton nodeType="manual_trigger" />
      </div>,
    )
    fireEvent.click(screen.getByRole('button', { name: /View Manual Trigger documentation/i }))
    expect(parentClickHandler).not.toHaveBeenCalled()
  })

  it('stops mousedown event propagation to prevent drag initiation', () => {
    const parentMousedownHandler = vi.fn()
    render(
      <div onMouseDown={parentMousedownHandler}>
        <WorkflowNodeDocsButton nodeType="manual_trigger" />
      </div>,
    )
    fireEvent.mouseDown(screen.getByRole('button', { name: /View Manual Trigger documentation/i }))
    expect(parentMousedownHandler).not.toHaveBeenCalled()
  })
})
