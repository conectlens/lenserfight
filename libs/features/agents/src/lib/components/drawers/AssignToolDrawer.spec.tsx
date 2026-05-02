import { fireEvent, render, screen } from '@testing-library/react'
import React from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const { mockAssignTool } = vi.hoisted(() => ({
  mockAssignTool: vi.fn(),
}))

vi.mock('@lenserfight/data/repositories', () => ({
  agentWorkspaceService: {
    assignTool: (...args: unknown[]) => mockAssignTool(...args),
  },
}))

vi.mock('@lenserfight/ui/overlays', () => ({
  Drawer: ({
    open,
    title,
    children,
  }: {
    open: boolean
    onClose: () => void
    side: string
    width: string
    title: string
    children: React.ReactNode
  }) => (open ? <div><h1>{title}</h1>{children}</div> : null),
}))

import { AssignToolDrawer } from './AssignToolDrawer'

const registry = [
  {
    id: 'tool-1',
    key: 'search.web',
    name: 'Web Search',
  },
  {
    id: 'tool-2',
    key: 'github.repo.read',
    name: 'GitHub Reader',
  },
] as any

describe('AssignToolDrawer', () => {
  beforeEach(() => {
    mockAssignTool.mockReset()
    mockAssignTool.mockResolvedValue(undefined)
  })

  it('resets the selected tool when the drawer opens or the preferred tool changes', () => {
    const onClose = vi.fn()
    const { rerender } = render(
      <AssignToolDrawer
        open={true}
        onClose={onClose}
        aiLenserId="ai-1"
        registry={registry}
        preferredToolId="tool-2"
      />
    )

    const select = screen.getByRole('combobox') as HTMLSelectElement
    expect(select.value).toBe('tool-2')

    fireEvent.change(select, { target: { value: 'tool-1' } })
    expect(select.value).toBe('tool-1')

    rerender(
      <AssignToolDrawer
        open={false}
        onClose={onClose}
        aiLenserId="ai-1"
        registry={registry}
        preferredToolId="tool-2"
      />
    )

    rerender(
      <AssignToolDrawer
        open={true}
        onClose={onClose}
        aiLenserId="ai-1"
        registry={registry}
        preferredToolId="tool-2"
      />
    )

    expect((screen.getByRole('combobox') as HTMLSelectElement).value).toBe('tool-2')

    rerender(
      <AssignToolDrawer
        open={true}
        onClose={onClose}
        aiLenserId="ai-1"
        registry={[registry[1], registry[0]]}
        preferredToolId="tool-1"
      />
    )

    expect((screen.getByRole('combobox') as HTMLSelectElement).value).toBe('tool-1')
  })
})
