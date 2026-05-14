import { LensDetailViewModel } from '@lenserfight/types'
import { Avatar } from '@lenserfight/ui/components'
import { Button } from '@lenserfight/ui/components'
import { timeAgo } from '@lenserfight/utils/date'
import { copyTextToClipboard } from '@lenserfight/utils/text'
import { Check, Copy, Eye, GitFork, Loader2, Lock, Pencil } from 'lucide-react'
import React from 'react'
import { Link } from 'react-router-dom'

import { LensReactionBar } from './LensReactionBar'
import { LensTagsBar } from './LensTagsBar'

interface LensDetailCardProps {
  lens: LensDetailViewModel
  onUse: () => void
  canEdit?: boolean
  onEdit?: () => void
  onCopy?: () => Promise<void>
  onFork?: () => void
  canFork?: boolean
  isForking?: boolean
}

export const LensDetailCard: React.FC<LensDetailCardProps> = ({
  lens,
  onUse,
  canEdit = false,
  onEdit,
  onCopy,
  onFork,
  canFork = false,
  isForking = false,
}) => {
  const [copied, setCopied] = React.useState(false)
  const canCopy = Boolean(onCopy || lens.content)

  const handleCopy = async () => {
    try {
      if (onCopy) {
        await onCopy()
      } else {
        await copyTextToClipboard(lens.content)
      }
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // clipboard write failed — don't show success state
    }
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden transition-colors">
      <div className="p-8 border-b border-gray-100 dark:border-gray-700">
        {/* Header */}
        <Link
          to={`/lenser/${lens.author.handle}`}
          className="flex items-center gap-4 mb-6 w-fit hover:opacity-80 transition-opacity"
        >
          <Avatar src={lens.author.avatarUrl} alt={lens.author.displayName} size="md" />
          <div>
            <h3 className="text-base font-semibold text-gray-900 dark:text-white">
              {lens.author.displayName}
            </h3>
            <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
              <span>@{lens.author.handle}</span>
              <span>•</span>
              <span>{timeAgo(lens.createdAt)}</span>
            </div>
          </div>
        </Link>

        {/* Title & Desc */}
        <div className="flex items-start justify-between gap-3 mb-4">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">{lens.title}</h1>
          <div className="flex items-center gap-2">
            {lens.visibility === 'private' && (
              <span
                className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2 py-1 text-[11px] font-semibold uppercase tracking-wide text-amber-700 dark:border-amber-800 dark:bg-amber-900/30 dark:text-amber-300"
                title="Private lens"
              >
                <Lock size={12} />
                Private
              </span>
            )}
            {canEdit && onEdit && (
              <button
                type="button"
                onClick={onEdit}
                className="p-2 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 text-gray-500 dark:text-gray-300 hover:text-primary-700 hover:border-primary/40 dark:hover:text-primary-400 rounded-lg shadow-sm transition-colors"
                title="Edit Lens"
                aria-label="Edit lens"
              >
                <Pencil size={14} />
              </button>
            )}
          </div>
        </div>
        {lens.description && (
          <p className="text-lg text-gray-600 dark:text-gray-300 leading-relaxed mb-6">
            {lens.description}
          </p>
        )}

        {/* Tags & Stats */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <LensTagsBar tags={lens.tags} />
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-1.5 text-gray-500 dark:text-gray-400">
              <Eye size={18} />
              <span className="text-sm font-medium">{lens.usageCount} uses</span>
            </div>
            <LensReactionBar counts={lens.reactionCounts} />
          </div>
        </div>

        {/* Parameters */}
        {lens.params && lens.params.length > 0 && (
          <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">
            <p className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-2">
              Parameters
            </p>
            <div className="flex flex-wrap gap-1.5">
              {lens.params.map((p) => (
                <span
                  key={p.name}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full border border-gray-200 dark:border-gray-700 text-xs bg-gray-50 dark:bg-gray-800"
                >
                  <code className="font-mono text-primary-700 dark:text-primary-400">{`{{${p.name}}}`}</code>
                  <span className="text-gray-400">{p.type}</span>
                  {p.required ? (
                    <span className="text-red-500 font-semibold">*</span>
                  ) : (
                    <span className="text-gray-400">opt</span>
                  )}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Main Content Area */}
      <div className="bg-gray-50 dark:bg-gray-900 p-8 transition-colors">
        <div className="mb-3 flex items-center justify-between gap-3">
          <h3 className="text-sm font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
            Lens Template
          </h3>
          <div className="flex items-center gap-2">
            {onFork && (
              <button
                type="button"
                onClick={canFork ? onFork : undefined}
                disabled={isForking || !canFork}
                title={canFork ? 'Fork lens' : 'Sign in or register to fork'}
                className={`flex items-center gap-1 text-sm font-medium transition-colors disabled:opacity-50 ${
                  canFork
                    ? 'text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white'
                    : 'cursor-not-allowed text-gray-400 dark:text-gray-500'
                }`}
              >
                {isForking ? <Loader2 size={16} className="animate-spin" /> : <GitFork size={16} />}
                Fork
              </button>
            )}
            {canCopy && (
              <button
                type="button"
                onClick={handleCopy}
                className={`flex items-center gap-1 text-sm font-medium transition-colors ${
                  copied
                    ? 'text-status-green'
                    : 'text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white'
                }`}
              >
                {copied ? <Check size={16} /> : <Copy size={16} />}
                {copied ? 'Copied' : 'Copy'}
              </button>
            )}
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 shadow-sm transition-colors">
          <pre className="whitespace-pre-wrap font-sans text-base text-gray-800 dark:text-gray-200 leading-relaxed">
            {lens.content}
          </pre>
        </div>

        <div className="mt-8 flex justify-end">
          <Button onClick={onUse} className="w-auto px-8">
            Use This Lens
          </Button>
        </div>
      </div>
    </div>
  )
}
