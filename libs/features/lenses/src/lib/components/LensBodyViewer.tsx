import { LensVersionParam } from '@lenserfight/types'
import { Copy, Check, Terminal, GitFork, Loader2 } from 'lucide-react'
import React, { useState } from 'react'

import { LensContentReadonly } from './LensContentReadonly'

interface LensBodyViewerProps {
  content?: string | null
  /** Rich version params — forwarded to LensContentReadonly for tooltip display. */
  versionParams?: LensVersionParam[]
  onCopy?: () => void
  onFork?: () => void
  isForking?: boolean
}

export const LensBodyViewer: React.FC<LensBodyViewerProps> = ({ content, versionParams, onCopy, onFork, isForking }) => {
  const [copied, setCopied] = useState(false)
  const safeContent = content ?? ''

  const handleCopy = async () => {
    if (!safeContent) return
    try {
      if (onCopy) {
        onCopy()
      } else {
        await navigator.clipboard.writeText(safeContent)
      }
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy text: ', err)
    }
  }

  return (
    <div className="w-full relative group">
      {/* Container */}
      <div className="relative overflow-hidden rounded-3xl border border-surface-border bg-surface-base shadow-neu-1 transition-shadow hover:shadow-neu-2">
        {/* Floating Actions */}
        <div className="absolute top-3 right-3 flex gap-2">
          {onFork && (
            <button
              onClick={onFork}
              disabled={isForking}
              className="group/fork relative rounded-2xl border border-surface-border bg-surface-base p-2 text-greyscale-500 shadow-sm transition-colors hover:border-primary-yellow-500 hover:text-primary-yellow-600 disabled:cursor-not-allowed disabled:opacity-60"
              aria-label="Fork lens"
            >
              {isForking ? <Loader2 size={16} className="animate-spin" /> : <GitFork size={16} />}
              {!isForking && (
                <span className="absolute right-full top-1/2 -translate-y-1/2 mr-2 px-2 py-1 bg-gray-900 text-white text-[10px] font-bold rounded opacity-0 pointer-events-none group-hover/fork:opacity-100 transition-opacity duration-200 whitespace-nowrap">
                  Fork
                </span>
              )}
            </button>
          )}
          <button
            onClick={handleCopy}
            className={`
                group/btn relative rounded-2xl border p-2 shadow-sm transition-colors
                ${copied
                ? 'border-status-green/30 bg-status-green/10 text-status-green'
                : 'border-surface-border bg-surface-base text-greyscale-500 hover:border-primary-yellow-500 hover:text-primary-yellow-600'
              }
              `}
            aria-label="Copy lens content"
          >
            {copied ? <Check size={16} strokeWidth={3} /> : <Copy size={16} />}

            {/* Tooltip */}
            {!copied && (
              <span
                className="
                absolute right-full top-1/2 -translate-y-1/2 mr-2 px-2 py-1
                  bg-greyscale-900 text-white text-[10px] font-bold rounded opacity-0 pointer-events-none
                  group-hover/btn:opacity-100 transition-opacity duration-200 whitespace-nowrap
                "
              >
                Copy
              </span>
            )}
          </button>
        </div>

        {/* Content */}
        <div className="block max-h-[70vh] overflow-y-auto bg-surface-base p-6 pt-10 text-sm font-mono leading-7 text-greyscale-700 md:p-8 md:pt-8 scrollbar-thin scrollbar-track-transparent scrollbar-thumb-gray-200 dark:scrollbar-thumb-gray-700">
          <div className="absolute left-4 top-4 select-none text-greyscale-400 opacity-30 pointer-events-none">
            <Terminal size={16} />
          </div>
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
