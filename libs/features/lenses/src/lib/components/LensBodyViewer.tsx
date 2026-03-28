import { LensVersionParam } from '@lenserfight/types'
import { Check, Copy, GitFork, Loader2, Terminal } from 'lucide-react'
import React from 'react'

import { LensContentReadonly } from './LensContentReadonly'

interface LensBodyViewerProps {
  content?: string | null
  /** Rich version params — forwarded to LensContentReadonly for tooltip display. */
  versionParams?: LensVersionParam[]
  onCopy?: () => void
  onFork?: () => void
  canFork?: boolean
  isForking?: boolean
}

export const LensBodyViewer: React.FC<LensBodyViewerProps> = ({
  content,
  versionParams,
  onCopy,
  onFork,
  canFork = false,
  isForking = false,
}) => {
  const safeContent = content ?? ''
  const [copied, setCopied] = React.useState(false)

  const handleCopy = () => {
    if (!onCopy) return
    onCopy()
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="w-full relative group">
      {/* Container */}
      <div className="relative overflow-hidden rounded-3xl border border-surface-border bg-surface-base shadow-neu-1 transition-shadow hover:shadow-neu-2">
        {(onCopy || onFork) && (
          <div className="absolute right-4 top-4 z-10 flex items-center gap-2">
            {onFork && (
              <button
                type="button"
                onClick={canFork ? onFork : undefined}
                disabled={isForking || !canFork}
                title={canFork ? 'Fork lens' : 'Sign in or register to fork'}
                className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors disabled:opacity-50 ${
                  canFork
                    ? 'border-surface-border bg-surface-base text-greyscale-500 hover:border-primary-yellow-500 hover:text-primary-yellow-600'
                    : 'cursor-not-allowed border-surface-border bg-surface-base text-greyscale-400'
                }`}
              >
                {isForking ? <Loader2 size={12} className="animate-spin" /> : <GitFork size={12} />}
                Fork
              </button>
            )}
            {onCopy && (
              <button
                type="button"
                onClick={handleCopy}
                className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                  copied
                    ? 'border-status-green/30 bg-status-green/10 text-status-green'
                    : 'border-surface-border bg-surface-base text-greyscale-500 hover:border-primary-yellow-500 hover:text-primary-yellow-600'
                }`}
              >
                {copied ? <Check size={12} /> : <Copy size={12} />}
                {copied ? 'Copied' : 'Copy'}
              </button>
            )}
          </div>
        )}

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
