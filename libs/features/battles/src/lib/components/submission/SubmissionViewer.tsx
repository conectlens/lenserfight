import { Badge } from '@lenserfight/ui/components'
import { Card } from '@lenserfight/ui/components'
import React from 'react'

interface SubmissionViewerProps {
  contentText?: string | null
  contentUrl?: string | null
  contenderName: string
  slot: 'A' | 'B'
}

export function SubmissionViewer({ contentText, contentUrl, contenderName, slot }: SubmissionViewerProps) {
  return (
    <Card className="flex h-full flex-col gap-4 p-5">
      <div className="flex items-center gap-2">
        <Badge color={slot === 'A' ? 'blue' : 'yellow'} variant="outline" size="sm">
          {slot}
        </Badge>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-greyscale-900 dark:text-greyscale-50">{contenderName}</p>
          <p className="text-xs text-greyscale-500 dark:text-greyscale-400">Contender output</p>
        </div>
      </div>

      <div className="min-h-[11rem] flex-1 overflow-auto">
        {contentText ? (
          <pre className="whitespace-pre-wrap text-sm leading-7 text-greyscale-700 dark:text-greyscale-300">
            {contentText}
          </pre>
        ) : contentUrl ? (
          <a
            href={contentUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm font-medium text-status-blue underline decoration-status-blue/30 underline-offset-4"
          >
            View submission →
          </a>
        ) : (
          <p className="text-sm italic text-greyscale-400">No submission yet.</p>
        )}
      </div>
    </Card>
  )
}
