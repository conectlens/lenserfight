import { render, screen } from '@testing-library/react'
import React from 'react'
import { describe, expect, it, vi } from 'vitest'

vi.mock('@lenserfight/ui/components', () => ({
  Badge: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <span className={className}>{children}</span>
  ),
}))

import { ContentTypeBadge } from './ContentTypeBadge'

describe('ContentTypeBadge', () => {
  it('renders nothing for null contentType', () => {
    const { container } = render(<ContentTypeBadge contentType={null} />)
    expect(container.firstChild).toBeNull()
  })

  it('renders nothing for undefined contentType', () => {
    const { container } = render(<ContentTypeBadge contentType={undefined} />)
    expect(container.firstChild).toBeNull()
  })

  it('renders nothing for unknown contentType', () => {
    const { container } = render(<ContentTypeBadge contentType="unknown_type" />)
    expect(container.firstChild).toBeNull()
  })

  it('renders "Image" label for image contentType', () => {
    render(<ContentTypeBadge contentType="image" />)
    expect(screen.getByText('Image')).toBeTruthy()
  })

  it('renders "Video" label for video contentType', () => {
    render(<ContentTypeBadge contentType="video" />)
    expect(screen.getByText('Video')).toBeTruthy()
  })

  it('renders "Audio" label for audio contentType', () => {
    render(<ContentTypeBadge contentType="audio" />)
    expect(screen.getByText('Audio')).toBeTruthy()
  })

  it('renders "Code" label for code contentType', () => {
    render(<ContentTypeBadge contentType="code" />)
    expect(screen.getByText('Code')).toBeTruthy()
  })

  it('renders "Drawing" label for drawing contentType', () => {
    render(<ContentTypeBadge contentType="drawing" />)
    expect(screen.getByText('Drawing')).toBeTruthy()
  })

  it('renders "Avatar" label for avatar contentType', () => {
    render(<ContentTypeBadge contentType="avatar" />)
    expect(screen.getByText('Avatar')).toBeTruthy()
  })

  it('renders "Workflow" label for workflow contentType', () => {
    render(<ContentTypeBadge contentType="workflow" />)
    expect(screen.getByText('Workflow')).toBeTruthy()
  })

  it('renders "Text" label for text contentType', () => {
    render(<ContentTypeBadge contentType="text" />)
    expect(screen.getByText('Text')).toBeTruthy()
  })

  it('renders "Image Edit" label for image_edit contentType', () => {
    render(<ContentTypeBadge contentType="image_edit" />)
    expect(screen.getByText('Image Edit')).toBeTruthy()
  })

  it('renders badge span element', () => {
    const { container } = render(<ContentTypeBadge contentType="image" />)
    expect(container.querySelector('span')).not.toBeNull()
  })
})
