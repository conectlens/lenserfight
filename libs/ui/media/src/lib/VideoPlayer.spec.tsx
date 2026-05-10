import React from 'react'
import { render, screen } from '@testing-library/react'
import { VideoPlayer } from './VideoPlayer'

describe('VideoPlayer', () => {
  it('renders a video element', () => {
    render(<VideoPlayer src="https://example.com/test.mp4" />)
    expect(screen.getByRole('video', { hidden: true }) ?? document.querySelector('video')).toBeTruthy()
  })

  it('renders with correct source', () => {
    const { container } = render(
      <VideoPlayer src="https://example.com/clip.mp4" mimeType="video/mp4" />,
    )
    const source = container.querySelector('source')
    expect(source?.getAttribute('src')).toBe('https://example.com/clip.mp4')
    expect(source?.getAttribute('type')).toBe('video/mp4')
  })

  it('shows duration badge when durationSeconds provided', () => {
    render(<VideoPlayer src="https://example.com/test.mp4" durationSeconds={90} />)
    expect(screen.getByText('1:30')).toBeTruthy()
  })

  it('does not show duration badge when durationSeconds is null', () => {
    const { container } = render(
      <VideoPlayer src="https://example.com/test.mp4" durationSeconds={null} />,
    )
    // No duration badge span with colons
    const spans = container.querySelectorAll('span')
    const hasDurationBadge = Array.from(spans).some((s) => /\d:\d\d/.test(s.textContent ?? ''))
    expect(hasDurationBadge).toBe(false)
  })

  it('formats duration correctly for times >= 60 seconds', () => {
    render(<VideoPlayer src="https://example.com/test.mp4" durationSeconds={125} />)
    expect(screen.getByText('2:05')).toBeTruthy()
  })

  it('applies className to wrapper', () => {
    const { container } = render(
      <VideoPlayer src="https://example.com/test.mp4" className="my-custom-class" />,
    )
    expect(container.firstChild).toHaveClass('my-custom-class')
  })
})
