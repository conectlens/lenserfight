import { LensVersionParam } from '@lenserfight/types'
import { copyTextToClipboard, renderLensContentForCopy } from '@lenserfight/utils/text'
import { Check, Copy, GitFork, Loader2, Pencil } from 'lucide-react'
import React from 'react'

import { LensContentReadonly } from './LensContentReadonly'

interface LensDetailContentProps {
  content: string
  /** Rich version params — forwarded to LensContentReadonly for tooltip display. */
  versionParams?: LensVersionParam[]
  canEdit?: boolean
  onEdit?: () => void
  /** Optional override. If omitted, the component copies its own rendered content. */
  onCopy?: () => Promise<void>
  /** When true, render the copy button even without an `onCopy` override. Defaults to true. */
  showCopy?: boolean
  onFork?: () => void
  canFork?: boolean
  isForking?: boolean
}

export const LensDetailContent: React.FC<LensDetailContentProps> = ({
  content,
  versionParams,
  canEdit = false,
  onEdit,
  onCopy,
  showCopy = true,
  onFork,
  canFork = false,
  isForking = false,
}) => {
  const [copied, setCopied] = React.useState(false)

  const handleCopy = async () => {
    try {
      if (onCopy) {
        await onCopy()
      } else {
        await copyTextToClipboard(renderLensContentForCopy(content, versionParams ?? []))
      }
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // clipboard write failed — don't show success state
    }
  }

  return (
    <div className="w-full max-w-[860px] mx-auto bg-white dark:bg-gray-900 rounded-2xl border border-gray-200/70 dark:border-gray-700/70 shadow-neu-1 p-6 md:p-10 transition-all duration-200">
      {(canEdit && onEdit) || showCopy || onFork ? (
        <div className="mb-4 flex flex-wrap justify-end gap-2">
          {onFork && (
            <button
              type="button"
              onClick={canFork ? onFork : undefined}
              disabled={isForking || !canFork}
              className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold uppercase tracking-wide transition-colors disabled:opacity-50 ${canFork
                  ? 'border-gray-200 text-gray-600 hover:border-primary/40 hover:text-primary-700 dark:border-gray-700 dark:text-gray-300 dark:hover:text-primary-400'
                  : 'cursor-not-allowed border-gray-200 text-gray-400 dark:border-gray-700 dark:text-gray-500'
                }`}
              aria-label="Fork lens"
              title={canFork ? 'Fork lens' : 'Sign in or register to fork'}
            >
              {isForking ? <Loader2 size={13} className="animate-spin" /> : <GitFork size={13} />}
              Fork
            </button>
          )}
          {showCopy && (
            <button
              type="button"
              onClick={handleCopy}
              className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold uppercase tracking-wide transition-colors ${copied
                  ? 'border-status-green/30 bg-status-green/10 text-status-green'
                  : 'border-gray-200 text-gray-600 hover:border-primary/40 hover:text-primary-700 dark:border-gray-700 dark:text-gray-300 dark:hover:text-primary-400'
                }`}
              aria-label="Copy lens content"
              title="Copy"
            >
              {copied ? <Check size={13} /> : <Copy size={13} />}
              {copied ? 'Copied' : 'Copy'}
            </button>
          )}
          {canEdit && onEdit && (
            <button
              type="button"
              onClick={onEdit}
              className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-gray-600 transition-colors hover:border-primary/40 hover:text-primary-700 dark:border-gray-700 dark:text-gray-300 dark:hover:text-primary-400"
              aria-label="Edit lens"
              title="Edit lens"
            >
              <Pencil size={13} />
              Edit
            </button>
          )}
        </div>
      ) : null}
      <LensContentReadonly
        content={content}
        versionParams={versionParams}
        className="prose prose-lg md:prose-xl max-w-none leading-loose"
      />
    </div>
  )
}
