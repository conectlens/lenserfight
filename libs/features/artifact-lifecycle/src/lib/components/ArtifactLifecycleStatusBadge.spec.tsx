import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import React from 'react'

vi.mock('@lenserfight/ui/components', () => ({
  Badge: ({ children }: { children: React.ReactNode }) =>
    React.createElement('span', { 'data-testid': 'badge' }, children),
}))

import { ArtifactLifecycleStatusBadge } from './ArtifactLifecycleStatusBadge'

describe('ArtifactLifecycleStatusBadge', () => {
  it('renders nothing when all inactive', () => {
    const { container } = render(
      <ArtifactLifecycleStatusBadge archivedAt={null} deletedAt={null} pinned={false} />,
    )
    expect(container.firstChild).toBeNull()
  })

  it('renders Archived badge when archivedAt is set', () => {
    render(
      <ArtifactLifecycleStatusBadge
        archivedAt="2026-01-01T00:00:00Z"
        deletedAt={null}
        pinned={false}
      />,
    )
    expect(screen.getByText('Archived')).toBeDefined()
  })

  it('renders Deleted badge when deletedAt is set', () => {
    render(
      <ArtifactLifecycleStatusBadge
        archivedAt={null}
        deletedAt="2026-01-01T00:00:00Z"
        pinned={false}
      />,
    )
    expect(screen.getByText('Deleted')).toBeDefined()
  })

  it('renders Deleted (not Archived) when both are set — deleted takes priority', () => {
    render(
      <ArtifactLifecycleStatusBadge
        archivedAt="2026-01-01T00:00:00Z"
        deletedAt="2026-01-01T00:00:00Z"
        pinned={false}
      />,
    )
    expect(screen.getByText('Deleted')).toBeDefined()
    expect(screen.queryByText('Archived')).toBeNull()
  })

  it('renders Pinned badge when pinned is true', () => {
    render(
      <ArtifactLifecycleStatusBadge archivedAt={null} deletedAt={null} pinned />,
    )
    expect(screen.getByText('Pinned')).toBeDefined()
  })

  it('renders both Archived and Pinned when archived and pinned', () => {
    render(
      <ArtifactLifecycleStatusBadge
        archivedAt="2026-01-01T00:00:00Z"
        deletedAt={null}
        pinned
      />,
    )
    expect(screen.getByText('Archived')).toBeDefined()
    expect(screen.getByText('Pinned')).toBeDefined()
  })
})
