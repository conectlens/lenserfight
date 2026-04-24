import React, { useState } from 'react'
import { Copy, Download, MessageSquare, RotateCw, Check } from 'lucide-react'
import { toast } from 'sonner'

/**
 * Output action buttons rendered below a completed workflow node's output.
 *
 * Uses the Protected Variations pattern — wraps the unstable "what to do
 * with output" concern behind a stable prop interface. Callers wire the
 * callbacks; this component only knows about copying, downloading, and signalling.
 */
export interface WorkflowOutputActionsProps {
  outputData: Record<string, unknown>
  nodeLabel: string
  onPostToThread?: (text: string) => void
  onRerunWithContext?: (data: Record<string, unknown>) => void
}

export const WorkflowOutputActions: React.FC<WorkflowOutputActionsProps> = ({
  outputData,
  nodeLabel,
  onPostToThread,
  onRerunWithContext,
}) => {
  const [copied, setCopied] = useState(false)

  const text = (outputData['output'] ?? outputData['text']) as string | undefined
  const url = outputData['url'] as string | undefined
  const mediaType = outputData['mediaType'] as string | undefined
  const mimeType = outputData['mimeType'] as string | undefined

  const hasText = typeof text === 'string' && text.length > 0
  const hasMedia = !!url && (
    mediaType === 'image' || mediaType === 'video' || mediaType === 'audio' ||
    mimeType?.startsWith('image/') || mimeType?.startsWith('video/') || mimeType?.startsWith('audio/')
  )

  const handleCopy = async () => {
    if (!text) return
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      toast.success('Copied to clipboard')
      setTimeout(() => setCopied(false), 2000)
    } catch {
      toast.error('Copy failed')
    }
  }

  const handlePostToThread = () => {
    if (!text || !onPostToThread) return
    onPostToThread(text)
  }

  const handleRerun = () => {
    if (!onRerunWithContext) return
    onRerunWithContext(outputData)
  }

  // Nothing actionable
  if (!hasText && !hasMedia) return null

  return (
    <div className="mt-2 flex flex-wrap gap-1.5">
      {hasText && (
        <button
          type="button"
          onClick={handleCopy}
          title="Copy output"
          className="flex items-center gap-1 px-2 py-1 rounded-lg border border-surface-border bg-surface-raised text-xs text-greyscale-500 hover:text-greyscale-900 hover:bg-surface-border transition-colors dark:hover:text-greyscale-100"
        >
          {copied ? <Check size={11} className="text-status-green" /> : <Copy size={11} />}
          {copied ? 'Copied' : 'Copy'}
        </button>
      )}

      {hasMedia && url && (
        <a
          href={url}
          download
          title="Download media"
          className="flex items-center gap-1 px-2 py-1 rounded-lg border border-surface-border bg-surface-raised text-xs text-greyscale-500 hover:text-greyscale-900 hover:bg-surface-border transition-colors dark:hover:text-greyscale-100"
        >
          <Download size={11} />
          Download
        </a>
      )}

      {hasText && onPostToThread && (
        <button
          type="button"
          onClick={handlePostToThread}
          title={`Post "${nodeLabel}" output to thread`}
          className="flex items-center gap-1 px-2 py-1 rounded-lg border border-surface-border bg-surface-raised text-xs text-greyscale-500 hover:text-greyscale-900 hover:bg-surface-border transition-colors dark:hover:text-greyscale-100"
        >
          <MessageSquare size={11} />
          Post to thread
        </button>
      )}

      {onRerunWithContext && (
        <button
          type="button"
          onClick={handleRerun}
          title="Re-run workflow with this output as context"
          className="flex items-center gap-1 px-2 py-1 rounded-lg border border-surface-border bg-surface-raised text-xs text-greyscale-500 hover:text-greyscale-900 hover:bg-surface-border transition-colors dark:hover:text-greyscale-100"
        >
          <RotateCw size={11} />
          Use as context
        </button>
      )}
    </div>
  )
}
