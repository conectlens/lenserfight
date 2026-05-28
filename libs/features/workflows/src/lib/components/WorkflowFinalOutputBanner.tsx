import React from 'react'
import { Sparkles } from 'lucide-react'

import type { WorkflowNodeResultRecord } from '@lenserfight/data/repositories'
import { WorkflowOutputActions } from './WorkflowOutputActions'

export interface WorkflowFinalOutputBannerProps {
  terminalNodeResult: WorkflowNodeResultRecord | undefined
  nodeLabel: string
  onPostToThread?: (text: string) => void
  onRerunWithContext?: (data: Record<string, unknown>) => void
}

/**
 * Highlighted summary shown when the terminal workflow node completes.
 * Renders the final output with action buttons prominently.
 */
export const WorkflowFinalOutputBanner: React.FC<WorkflowFinalOutputBannerProps> = ({
  terminalNodeResult,
  nodeLabel,
  onPostToThread,
  onRerunWithContext,
}) => {
  if (!terminalNodeResult || terminalNodeResult.status !== 'completed') return null

  const data = (terminalNodeResult.output_data ?? {}) as Record<string, unknown>
  const text = (data['output'] ?? data['text']) as string | undefined
  const url = data['url'] as string | undefined
  const mediaType = data['mediaType'] as string | undefined
  const mimeType = data['mimeType'] as string | undefined

  return (
    <div className="mx-4 mt-3 mb-1 rounded-2xl border-2 border-primary-yellow-500/40 bg-primary-yellow-500/5 p-4">
      <div className="flex items-center gap-2 mb-3">
        <Sparkles size={14} className="text-primary-yellow-600 dark:text-primary-yellow-400 flex-shrink-0" />
        <p className="text-xs font-bold text-primary-yellow-700 dark:text-primary-yellow-300 uppercase tracking-wide">
          Workflow Result
        </p>
        <span className="text-[10px] text-greyscale-400 ml-auto truncate max-w-[120px]">{nodeLabel}</span>
      </div>

      {/* Image */}
      {(mediaType === 'image' || mimeType?.startsWith('image/')) && url && (
        <img
          src={url}
          alt="Workflow output"
          className="w-full rounded-xl border border-surface-border object-contain max-h-56 mb-2"
          loading="lazy"
        />
      )}

      {/* Video */}
      {(mediaType === 'video' || mimeType?.startsWith('video/')) && url && (
        <video
          src={url}
          controls
          className="w-full rounded-xl border border-surface-border max-h-48 mb-2"
          preload="metadata"
        />
      )}

      {/* Audio */}
      {(mediaType === 'audio' || mimeType?.startsWith('audio/')) && url && (
        <audio src={url} controls className="w-full mb-2" preload="metadata" />
      )}

      {/* Text */}
      {text && typeof text === 'string' && (
        <div className="rounded-xl bg-surface-base p-3 text-xs text-greyscale-700 dark:text-greyscale-300 font-mono whitespace-pre-wrap break-words leading-relaxed max-h-40 overflow-y-auto">
          {text}
        </div>
      )}

      <WorkflowOutputActions
        outputData={data}
        nodeLabel={nodeLabel}
        onPostToThread={onPostToThread}
        onRerunWithContext={onRerunWithContext}
      />
    </div>
  )
}
