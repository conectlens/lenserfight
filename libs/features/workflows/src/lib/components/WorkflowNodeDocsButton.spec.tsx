import { render, screen, fireEvent } from '@testing-library/react'
import React from 'react'
import { vi, describe, it, expect, beforeEach, type MockedFunction } from 'vitest'

// Stub UI package to avoid data/repositories circular SSR init issue
vi.mock('@lenserfight/ui/components', () => ({
  Button: ({ children, onClick, onMouseDown, 'aria-label': ariaLabel, title, ...rest }: React.ButtonHTMLAttributes<HTMLButtonElement> & { children?: React.ReactNode }) =>
    React.createElement('button', { onClick, onMouseDown, 'aria-label': ariaLabel, title, ...rest }, children),
  Tooltip: ({ children }: { children: React.ReactNode }) => children,
}))

// Mock the docs URL builder so we don't need to resolve the env module graph
vi.mock('../utils/workflow-node-docs', () => ({
  getWorkflowNodeDocsHref: (docsPath: string | null | undefined, locale: string) => {
    if (!docsPath) return null
    if (docsPath.startsWith('/docs/workflows/nodes/')) return null
    return `https://docs.lenserfight.com/${locale}${docsPath}`
  },
}))

vi.mock('@lenserfight/shared/i18n-locale', () => ({
  useLocale: vi.fn(() => ({ locale: 'en' })),
}))

vi.mock('@lenserfight/infra/execution', () => ({
  getWorkflowNodeCatalogEntry: (type: string) => {
    if (type === 'manual_trigger') {
      return {
        displayName: 'Manual Trigger',
        docsPath: '/reference/workflows/nodes/trigger#manual-trigger',
      }
    }
    if (type === 'unknown_node') return undefined
    if (type === 'placeholder_node') {
      return {
        displayName: 'Placeholder',
        docsPath: '/docs/workflows/nodes/placeholder_node',
      }
    }
    return undefined
  },
}))

import { WorkflowNodeDocsButton } from './WorkflowNodeDocsButton'
import { useLocale } from '@lenserfight/shared/i18n-locale'

describe('WorkflowNodeDocsButton', () => {
  beforeEach(() => {
    vi.spyOn(window, 'open').mockImplementation(() => null)
    // Reset useLocale to default 'en' before each test
    ;(useLocale as MockedFunction<typeof useLocale>).mockReturnValue({ locale: 'en' })
  })

  it('renders null when catalog entry is not found', () => {
    const { container } = render(<WorkflowNodeDocsButton nodeType="unknown_node" />)
    expect(container.firstChild).toBeNull()
  })

  it('renders null when docsPath is a placeholder path', () => {
    const { container } = render(<WorkflowNodeDocsButton nodeType="placeholder_node" />)
    expect(container.firstChild).toBeNull()
  })

  it('renders a BookOpen button when a valid href resolves', () => {
    render(<WorkflowNodeDocsButton nodeType="manual_trigger" />)
    expect(screen.getByRole('button', { name: /View Manual Trigger documentation/i })).toBeDefined()
  })

  it('has correct aria-label', () => {
    render(<WorkflowNodeDocsButton nodeType="manual_trigger" />)
    const button = screen.getByRole('button', { name: /View Manual Trigger documentation/i })
    expect(button.getAttribute('aria-label')).toBe('View Manual Trigger documentation')
  })

  it('calls window.open with correct locale URL on click', () => {
    render(<WorkflowNodeDocsButton nodeType="manual_trigger" />)
    const button = screen.getByRole('button', { name: /View Manual Trigger documentation/i })
    fireEvent.click(button)
    expect(window.open).toHaveBeenCalledWith(
      'https://docs.lenserfight.com/en/reference/workflows/nodes/trigger#manual-trigger',
      '_blank',
      'noreferrer',
    )
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

  it('uses tr locale from useLocale when building the URL', () => {
    ;(useLocale as MockedFunction<typeof useLocale>).mockReturnValueOnce({ locale: 'tr' })
    render(<WorkflowNodeDocsButton nodeType="manual_trigger" />)
    fireEvent.click(screen.getByRole('button', { name: /View Manual Trigger documentation/i }))
    expect(window.open).toHaveBeenCalledWith(
      'https://docs.lenserfight.com/tr/reference/workflows/nodes/trigger#manual-trigger',
      '_blank',
      'noreferrer',
    )
  })
})
