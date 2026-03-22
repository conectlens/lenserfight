import React from 'react'

interface SubmissionViewerProps {
  contentText?: string | null
  contentUrl?: string | null
  contenderName: string
  slot: 'A' | 'B'
}

export function SubmissionViewer({ contentText, contentUrl, contenderName, slot }: SubmissionViewerProps) {
  const slotColor = slot === 'A' ? 'border-blue-200 bg-blue-50' : 'border-orange-200 bg-orange-50'
  const slotBadge = slot === 'A' ? 'bg-blue-100 text-blue-700' : 'bg-orange-100 text-orange-700'

  return (
    <div className={`rounded-xl border-2 ${slotColor} p-4 h-full flex flex-col`}>
      <div className="flex items-center gap-2 mb-3">
        <span className={`text-xs font-bold px-2 py-0.5 rounded ${slotBadge}`}>
          {slot}
        </span>
        <span className="font-medium text-sm text-gray-700 truncate">{contenderName}</span>
      </div>
      <div className="flex-1 overflow-auto">
        {contentText ? (
          <pre className="text-sm text-gray-800 whitespace-pre-wrap font-sans leading-relaxed">
            {contentText}
          </pre>
        ) : contentUrl ? (
          <a href={contentUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline text-sm">
            View submission →
          </a>
        ) : (
          <p className="text-gray-400 text-sm italic">No submission yet.</p>
        )}
      </div>
    </div>
  )
}
