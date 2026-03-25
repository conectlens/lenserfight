import React from 'react'
import { Badge } from '@lenserfight/ui/components'

interface SubmissionViewerProps {
  contentText?: string | null
  contentUrl?: string | null
  contenderName: string
  slot: 'A' | 'B'
}

export function SubmissionViewer({ contentText, contentUrl, contenderName, slot }: SubmissionViewerProps) {
  const borderColor = slot === 'A' ? 'var(--cl-status-blue)' : 'var(--cl-yellow-600)'

  return (
    <div
      className="rounded-xl border-2 p-4 h-full flex flex-col bg-[var(--cl-surface-raised)]"
      style={{ borderColor }}
    >
      <div className="flex items-center gap-2 mb-3">
        <Badge color={slot === 'A' ? 'blue' : 'yellow'} variant="solid" size="sm">
          {slot}
        </Badge>
        <span className="font-medium text-sm text-[var(--cl-surface-text)] truncate">{contenderName}</span>
      </div>
      <div className="flex-1 overflow-auto">
        {contentText ? (
          <pre className="text-sm text-[var(--cl-surface-text)] whitespace-pre-wrap font-sans leading-relaxed">
            {contentText}
          </pre>
        ) : contentUrl ? (
          <a
            href={contentUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[var(--cl-status-blue)] underline text-sm"
          >
            View submission →
          </a>
        ) : (
          <p className="text-[var(--cl-surface-text-disabled)] text-sm italic">No submission yet.</p>
        )}
      </div>
    </div>
  )
}
