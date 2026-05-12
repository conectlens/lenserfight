import React from 'react'
import { AudioPlayer, VideoPlayer } from '@lenserfight/ui/media'

import type { SubmissionOutputModality } from '@lenserfight/data/repositories'

// Phase AY — direct media-by-modality renderer used by the battle pages when
// a submission carries `output_modality` + `media_url`. This is a leaner path
// than MediaOutputCard (which is workflow-context-aware) and is the one the
// battle detail/result pages call.

export interface MediaRendererProps {
  modality: SubmissionOutputModality | null | undefined
  mediaUrl: string | null | undefined
  mimeType?: string | null
  altText?: string
  className?: string
}

export function MediaRenderer({ modality, mediaUrl, mimeType, altText, className }: MediaRendererProps) {
  if (!modality || modality === 'text' || !mediaUrl) return null

  if (modality === 'image') {
    return (
      <img
        src={mediaUrl}
        alt={altText ?? 'Battle submission'}
        className={['rounded-xl w-full max-h-96 object-contain', className ?? ''].join(' ')}
      />
    )
  }

  if (modality === 'video') {
    return <VideoPlayer src={mediaUrl} mimeType={mimeType ?? null} className={className} />
  }

  if (modality === 'audio') {
    return <AudioPlayer src={mediaUrl} mimeType={mimeType ?? null} className={className} />
  }

  return null
}
