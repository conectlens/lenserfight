import React from 'react'
import { render, screen } from '@testing-library/react'
import { AudioPlayer } from './AudioPlayer'

describe('AudioPlayer', () => {
  it('renders an audio element', () => {
    const { container } = render(<AudioPlayer src="https://example.com/clip.mp3" />)
    expect(container.querySelector('audio')).toBeTruthy()
  })

  it('renders with correct source and MIME type', () => {
    const { container } = render(
      <AudioPlayer src="https://example.com/clip.mp3" mimeType="audio/mpeg" />,
    )
    const source = container.querySelector('source')
    expect(source?.getAttribute('src')).toBe('https://example.com/clip.mp3')
    expect(source?.getAttribute('type')).toBe('audio/mpeg')
  })

  it('shows the name label', () => {
    render(<AudioPlayer src="https://example.com/clip.mp3" name="My Audio" />)
    expect(screen.getByText('My Audio')).toBeTruthy()
  })

  it('shows duration when provided', () => {
    render(<AudioPlayer src="https://example.com/clip.mp3" durationSeconds={65} />)
    expect(screen.getByText('1:05')).toBeTruthy()
  })

  it('does not show duration when durationSeconds is null', () => {
    const { container } = render(
      <AudioPlayer src="https://example.com/clip.mp3" durationSeconds={null} />,
    )
    const spans = container.querySelectorAll('span')
    const hasDurationSpan = Array.from(spans).some((s) => /\d:\d\d/.test(s.textContent ?? ''))
    expect(hasDurationSpan).toBe(false)
  })

  it('falls back to "Audio output" label when name is not provided', () => {
    const { container } = render(<AudioPlayer src="https://example.com/clip.mp3" />)
    const audio = container.querySelector('audio')
    expect(audio?.getAttribute('aria-label')).toBe('Audio output')
  })
})
