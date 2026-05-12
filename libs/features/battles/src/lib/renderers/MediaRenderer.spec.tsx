import { render } from '@testing-library/react'
import React from 'react'
import { describe, expect, it } from 'vitest'

import { MediaRenderer } from './MediaRenderer'

describe('MediaRenderer', () => {
  it('renders nothing for text or null modality', () => {
    const { container: a } = render(
      <MediaRenderer modality={null} mediaUrl="https://example.com/x" />
    )
    expect(a).toBeEmptyDOMElement()

    const { container: b } = render(
      <MediaRenderer modality="text" mediaUrl="https://example.com/x" />
    )
    expect(b).toBeEmptyDOMElement()
  })

  it('renders an <img> for image modality', () => {
    const { container } = render(
      <MediaRenderer
        modality="image"
        mediaUrl="https://example.com/cat.png"
        altText="Cat"
      />
    )
    const img = container.querySelector('img')
    expect(img).not.toBeNull()
    expect(img?.getAttribute('src')).toBe('https://example.com/cat.png')
    expect(img?.getAttribute('alt')).toBe('Cat')
  })

  it('renders a <video> for video modality', () => {
    const { container } = render(
      <MediaRenderer
        modality="video"
        mediaUrl="https://example.com/clip.mp4"
        mimeType="video/mp4"
      />
    )
    expect(container.querySelector('video')).not.toBeNull()
  })

  it('renders an <audio> for audio modality', () => {
    const { container } = render(
      <MediaRenderer
        modality="audio"
        mediaUrl="https://example.com/song.mp3"
        mimeType="audio/mpeg"
      />
    )
    expect(container.querySelector('audio')).not.toBeNull()
  })
})
