import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import React from 'react'
import { ArtifactDeleteConfirmDialog } from './ArtifactDeleteConfirmDialog'
import type { ArtifactDependencySummary } from '@lenserfight/data/repositories'

vi.mock('@lenserfight/ui/overlays', () => ({
  Dialog: ({ open, children, footer }: any) =>
    open
      ? React.createElement('div', { 'data-testid': 'dialog' }, children, footer)
      : null,
  ModalFooter: ({ primaryButton, leftButton }: any) =>
    React.createElement('div', null,
      React.createElement('button', { onClick: leftButton?.onClick, disabled: leftButton?.disabled }, leftButton?.label),
      React.createElement('button', { onClick: primaryButton?.onClick, disabled: primaryButton?.disabled }, primaryButton?.label),
    ),
}))

const noDeps: ArtifactDependencySummary = {
  artifact_type: 'lens',
  artifact_id: 'lens-1',
  counts: {},
  total: 0,
  blocking_reasons: [],
  has_dependencies: false,
  can_hard_delete: true,
}

const blockedDeps: ArtifactDependencySummary = {
  artifact_type: 'lens',
  artifact_id: 'lens-1',
  counts: { battles: 3, executions: 12 },
  total: 15,
  blocking_reasons: ['3 battles', '12 execution requests'],
  has_dependencies: true,
  can_hard_delete: false,
}

const softDeps: ArtifactDependencySummary = {
  artifact_type: 'lens',
  artifact_id: 'lens-1',
  counts: { workflow_references: 2 },
  total: 2,
  blocking_reasons: [],
  has_dependencies: true,
  can_hard_delete: false,
}

describe('ArtifactDeleteConfirmDialog', () => {
  it('renders nothing when closed', () => {
    const { container } = render(
      <ArtifactDeleteConfirmDialog
        isOpen={false}
        onClose={vi.fn()}
        onConfirm={vi.fn()}
        artifactType="lens"
        dependencySummary={noDeps}
        isDeleting={false}
      />,
    )
    expect(container.querySelector('[data-testid="dialog"]')).toBeNull()
  })

  it('renders dialog when open with no dependencies — confirm enabled', () => {
    render(
      <ArtifactDeleteConfirmDialog
        isOpen
        onClose={vi.fn()}
        onConfirm={vi.fn()}
        artifactType="lens"
        dependencySummary={noDeps}
        isDeleting={false}
      />,
    )
    expect(screen.getByTestId('dialog')).toBeDefined()
    const deleteBtn = screen.getByRole('button', { name: 'Delete' })
    expect((deleteBtn as HTMLButtonElement).disabled).toBe(false)
  })

  it('renders blocking reasons and disables confirm when blocked', () => {
    render(
      <ArtifactDeleteConfirmDialog
        isOpen
        onClose={vi.fn()}
        onConfirm={vi.fn()}
        artifactType="lens"
        dependencySummary={blockedDeps}
        isDeleting={false}
      />,
    )
    expect(screen.getByText('3 battles')).toBeDefined()
    expect(screen.getByText('12 execution requests')).toBeDefined()
    const cantDelete = screen.getByRole('button', { name: "Can't delete" })
    expect((cantDelete as HTMLButtonElement).disabled).toBe(true)
  })

  it('renders soft dependency warning but enables confirm', () => {
    render(
      <ArtifactDeleteConfirmDialog
        isOpen
        onClose={vi.fn()}
        onConfirm={vi.fn()}
        artifactType="lens"
        dependencySummary={softDeps}
        isDeleting={false}
      />,
    )
    expect(screen.getByText('2 workflow references')).toBeDefined()
    const deleteBtn = screen.getByRole('button', { name: 'Delete' })
    expect((deleteBtn as HTMLButtonElement).disabled).toBe(false)
  })

  it('shows tombstone subtitle when deleteMode is tombstone', () => {
    render(
      <ArtifactDeleteConfirmDialog
        isOpen
        onClose={vi.fn()}
        onConfirm={vi.fn()}
        artifactType="lens"
        dependencySummary={noDeps}
        deleteMode="tombstone"
        isDeleting={false}
      />,
    )
    expect(screen.getByText(/soft-deleted and remain accessible/)).toBeDefined()
  })

  it('shows permanent subtitle when deleteMode is hard_delete', () => {
    render(
      <ArtifactDeleteConfirmDialog
        isOpen
        onClose={vi.fn()}
        onConfirm={vi.fn()}
        artifactType="lens"
        dependencySummary={noDeps}
        deleteMode="hard_delete"
        isDeleting={false}
      />,
    )
    expect(screen.getByText(/permanent and cannot be undone/)).toBeDefined()
  })
})
