import { ForkNode, LensDetailViewModel } from '@lenserfight/types'
import { Avatar, HelpButton } from '@lenserfight/ui/components'
import { TagBadge } from '@lenserfight/ui/components'
import { formatCount } from '@lenserfight/utils/number'
import { GitFork, Lock, Bookmark, Pencil, Copy, Check, Loader2, Download, Plus } from 'lucide-react'
import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'


interface LensDetailHeaderProps {
  lens: LensDetailViewModel
  onSave: () => void
  onEdit?: () => void
  canEdit?: boolean
  isSaved: boolean
  isSaving: boolean
  saveCount: number
  forkTree?: ForkNode[]
  onCopy?: () => Promise<void>
  onFork?: () => void
  canFork?: boolean
  isForking?: boolean
  onExport?: () => void
  exportModal?: React.ReactNode
  onCreate?: () => void
}

export const LensDetailHeader: React.FC<LensDetailHeaderProps> = ({
  lens,
  onSave,
  onEdit,
  canEdit = false,
  isSaved,
  isSaving,
  saveCount,
  forkTree,
  onCopy,
  onFork,
  canFork = false,
  isForking = false,
  onExport,
  exportModal,
  onCreate,
}) => {
  const navigate = useNavigate()
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    if (!onCopy) return
    try {
      await onCopy()
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // clipboard write failed — don't show success state
    }
  }
  const formattedDate = new Date(lens.createdAt).toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })

  const hasTags = lens.tags && lens.tags.length > 0
  const safeSaveCount = saveCount || 0

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-start gap-4">
        {/* Unified Title Hierarchy */}
        <h1 className="flex-1 text-2xl font-black leading-tight tracking-tight text-greyscale-900 dark:text-greyscale-0 md:text-3xl">
          {lens.title}
        </h1>

        <div className="flex items-center gap-2">
          <HelpButton
            path="/explanation/lenses/what-is-a-lens"
            label="What is a Lens?"
          />
          <HelpButton
            path="/tutorials/walkthroughs/create-a-lens"
            label="How to create?"
          />
          <button
            type="button"
            onClick={onCreate}
            className="group flex-shrink-0 rounded-2xl border border-surface-border bg-surface-base p-2.5 text-greyscale-500 transition-colors hover:border-primary-yellow-500 hover:text-primary-yellow-600"
            aria-label="Create new lens"
            title="Create Lens"
          >
            <Plus size={18} className="transition-transform duration-200 group-active:scale-95" />
          </button>

          {canEdit && onEdit && (
            <button
              type="button"
              onClick={onEdit}
              className="group flex-shrink-0 rounded-2xl border border-surface-border bg-surface-base p-2.5 text-greyscale-500 transition-colors hover:border-primary-yellow-500 hover:text-primary-yellow-600"
              aria-label="Edit lens"
              title="Edit lens"
            >
              <Pencil size={18} className="transition-transform duration-200 group-active:scale-95" />
            </button>
          )}

          {/* Copy Action — visible to everyone */}
          {onCopy && (
            <button
              type="button"
              onClick={handleCopy}
              className={`group flex-shrink-0 rounded-2xl border p-2.5 transition-colors ${
                copied
                  ? 'border-status-green/30 bg-status-green/10 text-status-green'
                  : 'border-surface-border bg-surface-base text-greyscale-500 hover:border-primary-yellow-500 hover:text-primary-yellow-600'
              }`}
              aria-label="Copy lens content"
              title="Copy"
            >
              {copied ? (
                <Check size={18} strokeWidth={3} className="transition-transform duration-200 group-active:scale-95" />
              ) : (
                <Copy size={18} className="transition-transform duration-200 group-active:scale-95" />
              )}
            </button>
          )}

          {onExport && (
            <button
              type="button"
              onClick={onExport}
              className="group flex-shrink-0 rounded-2xl border border-surface-border bg-surface-base p-2.5 text-greyscale-500 transition-colors hover:border-primary-yellow-500 hover:text-primary-yellow-600"
              aria-label="Export lens"
              title="Export"
            >
              <Download size={18} className="transition-transform duration-200 group-active:scale-95" />
            </button>
          )}
          {exportModal}

          {/* Fork — authenticated users with lenser profile */}
          {onFork && (
            <button
              type="button"
              onClick={canFork ? onFork : undefined}
              disabled={isForking || !canFork}
              aria-label="Fork this lens"
              title={canFork ? 'Fork lens' : 'Sign in or register to fork'}
              className={`group flex-shrink-0 rounded-2xl border p-2.5 transition-colors disabled:opacity-50 ${
                canFork
                  ? 'border-surface-border bg-surface-base text-greyscale-500 hover:border-primary-yellow-500 hover:text-primary-yellow-600'
                  : 'cursor-not-allowed border-surface-border bg-surface-base text-greyscale-400'
              }`}
            >
              {isForking ? (
                <Loader2 size={18} className="animate-spin" />
              ) : (
                <GitFork size={18} className="transition-transform duration-200 group-active:scale-95" />
              )}
            </button>
          )}

          {/* Save Action - Top Right */}
          <button
            type="button"
            onClick={onSave}
            disabled={isSaving}
            className={`
              group relative flex-shrink-0 rounded-2xl border p-2.5 transition-colors
              ${
                isSaved
                  ? 'border-primary-yellow-500/40 bg-primary-yellow-500/10 text-primary-yellow-800 dark:text-primary-yellow-400'
                  : 'border-surface-border bg-surface-base text-greyscale-500 hover:border-primary-yellow-500 hover:text-primary-yellow-600'
              }
            `}
            aria-label={isSaved ? 'Unsave lens' : 'Save lens'}
            title={isSaved ? 'Unsave' : 'Save'}
          >
            <Bookmark
              size={20}
              className={`transition-transform duration-200 ${isSaved ? 'fill-current' : ''} group-active:scale-95`}
            />

            {/* Compact Corner Badge */}
            {safeSaveCount > 0 && (
              <span
                className={`
                absolute -top-2 -right-2 min-w-[18px] h-[18px] flex items-center justify-center 
                text-[10px] font-bold rounded-full border-2 border-white dark:border-gray-900 px-1 shadow-sm
                ${isSaved ? 'bg-primary-yellow-500 text-greyscale-900' : 'bg-surface-raised text-greyscale-500 dark:text-greyscale-400'}
              `}
              >
                {formatCount(safeSaveCount)}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Metadata Row */}
      <div className="flex flex-wrap items-center gap-y-3 text-sm text-greyscale-500 dark:text-greyscale-400">
        <div
          className="flex items-center gap-2 group cursor-pointer mr-4"
          onClick={() => navigate(`/lenser/${lens.author.handle}`)}
        >
          <Avatar
            src={lens.author.avatarUrl}
            alt={lens.author.displayName}
            size="sm"
            className="!w-6 !h-6"
          />
          <span className="font-semibold text-greyscale-900 transition-colors group-hover:text-primary-yellow-600 dark:text-greyscale-200">
            {lens.author.displayName}
          </span>
        </div>

        {lens.parentLensId && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              const handle = forkTree?.[0]?.forkedFromLenserHandle
              if (handle) navigate(`/lenser/${handle}`)
              else if (lens.parentLensId) navigate(`/lenses/${lens.parentLensId}`)
            }}
            className="group mr-4 flex items-center gap-1.5 text-greyscale-500 transition-colors hover:text-primary-yellow-600 dark:text-greyscale-400"
            title={forkTree?.[0]?.forkedFromLenserHandle ? `Forked from @${forkTree[0].forkedFromLenserHandle}` : 'Forked lens'}
            aria-label="Forked from"
          >
            <GitFork size={14} className="shrink-0" />
            {forkTree?.[0]?.forkedFromLenserAvatarUrl && (
              <img
                src={forkTree[0].forkedFromLenserAvatarUrl}
                alt={forkTree[0].forkedFromLenserHandle}
                className="w-5 h-5 rounded-full object-cover"
              />
            )}
            <span className="text-xs font-medium">
              {forkTree?.[0]?.forkedFromLenserHandle ? `@${forkTree[0].forkedFromLenserHandle}` : 'Forked'}
            </span>
          </button>
        )}

        <span className="mr-4 hidden text-greyscale-300 dark:text-greyscale-600 sm:inline">|</span>

        {hasTags && (
          <>
            <div className="flex flex-wrap gap-2 mr-4">
              {lens.tags.map((tag) => (
                <TagBadge
                  key={tag.id}
                  label={tag.name}
                  className="bg-surface-raised px-2.5 py-0.5 text-xs font-medium text-greyscale-700 dark:text-greyscale-300"
                  onClick={() => navigate(`/ray/${tag.slug}`)}
                />
              ))}
            </div>
            <span className="mr-4 hidden text-greyscale-300 dark:text-greyscale-600 sm:inline">|</span>
          </>
        )}

        <div className="flex items-center gap-4">
          {lens.visibility === 'private' && (
            <>
              <div className="flex items-center gap-1.5">
                <Lock size={14} />
                <span className="capitalize text-xs">{lens.visibility}</span>
              </div>
              <span className="text-gray-300 dark:text-gray-600">•</span>
            </>
          )}
          <span className="text-xs">{formattedDate}</span>
        </div>
      </div>

      {/* Fork breadcrumb — only shown for forked lenses */}
      {forkTree && forkTree.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5 text-xs text-greyscale-500 dark:text-greyscale-400">
          <GitFork size={12} className="shrink-0" />
          <span>Forked from</span>
          {forkTree.slice(0, 3).map((node, i) => (
            <React.Fragment key={node.forkedFromLensId}>
              {i > 0 && <span className="text-greyscale-300 dark:text-greyscale-600">→</span>}
              <button
                type="button"
                onClick={() => navigate(`/lenses/${node.forkedFromLensId}`)}
                className="flex items-center gap-1 transition-colors hover:text-primary-yellow-600"
              >
                {node.forkedFromLenserAvatarUrl && (
                  <img
                    src={node.forkedFromLenserAvatarUrl}
                    className="w-4 h-4 rounded-full object-cover"
                    alt={node.forkedFromLenserHandle}
                  />
                )}
                <span className="font-medium text-greyscale-600 transition-colors hover:text-primary-yellow-600 dark:text-greyscale-400">
                  {node.forkedFromTitle}
                </span>
                {node.forkedFromVersionNumber != null && (
                  <span className="rounded border border-surface-border bg-surface-raised px-1 py-0.5 font-mono text-[10px] text-greyscale-500 dark:text-greyscale-400">
                    v{node.forkedFromVersionNumber}
                  </span>
                )}
                <span className="text-greyscale-400 dark:text-greyscale-500">
                  by {node.forkedFromLenserHandle}
                </span>
              </button>
            </React.Fragment>
          ))}
          {forkTree.length > 3 && <span className="text-greyscale-400 dark:text-greyscale-500">… +{forkTree.length - 3} more</span>}
        </div>
      )}
    </div>
  )
}
