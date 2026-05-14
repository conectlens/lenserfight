import { LensVersionParam } from '@lenserfight/types'
import { copyTextToClipboard, renderLensContentForCopy } from '@lenserfight/utils/text'
import { Check, Copy, Terminal } from 'lucide-react'
import React from 'react'

import { LensContentReadonly } from './LensContentReadonly'

interface LensBodyViewerProps {
  content?: string | null
  /** Rich version params — forwarded to LensContentReadonly for tooltip display. */
  versionParams?: LensVersionParam[]
  onCopy?: () => Promise<void>
  onFork?: () => void
  canFork?: boolean
  isForking?: boolean
}

export const LensBodyViewer: React.FC<LensBodyViewerProps> = ({
  content,
  versionParams,
  onCopy,
}) => {
  const safeContent = content ?? ''
  const [copied, setCopied] = React.useState(false)
  const canCopy = Boolean(onCopy || safeContent)

  const handleCopy = async () => {
    try {
      if (onCopy) {
        await onCopy()
      } else {
        await copyTextToClipboard(renderLensContentForCopy(safeContent, versionParams ?? []))
      }
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // clipboard write failed — don't show success state
    }
  }

  return (
    <div className="w-full relative group">
      {/* Container */}
      <div className="relative overflow-hidden rounded-3xl border border-surface-border bg-surface-base shadow-neu-1 transition-shadow hover:shadow-neu-2">
        <div className="block max-h-[70vh] overflow-y-auto bg-surface-base p-6 pt-10 text-sm font-mono leading-7 text-greyscale-700 md:p-8 md:pt-8 scrollbar-thin scrollbar-track-transparent scrollbar-thumb-gray-200 dark:scrollbar-thumb-gray-700">
          <div className="absolute left-4 top-4 select-none text-greyscale-400 opacity-30 pointer-events-none">
            <Terminal size={16} />
          </div>
          {canCopy && (
            <button
              type="button"
              onClick={handleCopy}
              className={`absolute right-3 top-3 z-10 rounded-xl border p-1.5 transition-colors ${
                copied
                  ? 'border-status-green/30 bg-status-green/10 text-status-green'
                  : 'border-surface-border bg-surface-base text-greyscale-400 hover:border-primary-yellow-500 hover:text-primary-yellow-600'
              }`}
              aria-label="Copy lens content"
              title="Copy content"
            >
              {copied ? <Check size={14} strokeWidth={3} /> : <Copy size={14} />}
            </button>
          )}
          <div className="pl-6">
            {safeContent ? (
              <LensContentReadonly
                content={safeContent}
                versionParams={versionParams}
                className="break-words text-greyscale-700 dark:text-greyscale-200"
              />
            ) : (
              <span className="text-greyscale-400">No lens content available.</span>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
